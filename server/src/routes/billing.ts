import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import Stripe from "stripe";
import express from "express";
import { authenticateToken } from "../middleware/auth.js";

// ─── Stripe & Prisma Initialization ────────────────────────────────────────

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeInstance = new Stripe(key, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return stripeInstance;
}

const router = Router({ mergeParams: true });
const webhookRouter = Router();
const prisma = new PrismaClient();

// ─── Validation Schemas ─────────────────────────────────────────────────────

const subscribeSchema = z.object({
  planId: z.string().uuid("Invalid plan ID"),
  successUrl: z.string().url("Invalid success URL"),
  cancelUrl: z.string().url("Invalid cancel URL"),
});

const updateSubscriptionSchema = z.object({
  status: z.enum(["ACTIVE", "PAST_DUE", "CANCELLED", "TRIALING"]),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Resolve a Stripe Price ID from a BillingPlan.
 *
 * The plan's `featuresJson` column may contain a `stripePriceId` field.
 * If it does, we use it directly; otherwise we fall back to looking up the
 * first active price on the Stripe product whose name matches the plan name.
 */
async function resolveStripePriceId(plan: {
  id: string;
  name: string;
  featuresJson: Prisma.JsonValue;
  priceMonthly: Prisma.Decimal;
}): Promise<string> {
  // Try extracting from the JSON column first
  if (
    plan.featuresJson &&
    typeof plan.featuresJson === "object" &&
    !Array.isArray(plan.featuresJson)
  ) {
    const json = plan.featuresJson as Record<string, unknown>;
    if (typeof json["stripePriceId"] === "string" && json["stripePriceId"]) {
      return json["stripePriceId"];
    }
  }

  // Fallback: search Stripe for a product whose name matches the plan name
  const products = await getStripe().products.search({
    query: `name~"${plan.name}"`,
    limit: 1,
  });

  if (products.data.length === 0) {
    throw new Error(
      `No Stripe product found matching plan "${plan.name}" (${plan.id}). ` +
        `Create the product in Stripe or add a "stripePriceId" to the plan's featuresJson.`
    );
  }

  const prices = await getStripe().prices.list({
    product: products.data[0].id,
    active: true,
    limit: 1,
  });

  if (prices.data.length === 0) {
    throw new Error(
      `Stripe product "${products.data[0].name}" has no active prices.`
    );
  }

  return prices.data[0].id;
}

/**
 * Retrieve or create a Stripe customer for the given workspace.
 */
async function getOrCreateStripeCustomer(
  workspaceId: string,
  email?: string
): Promise<string> {
  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
  });

  if (subscription?.stripeCustomerId) {
    return subscription.stripeCustomerId;
  }

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
  });

  const customer = await getStripe().customers.create({
    name: workspace.name,
    email: email ?? undefined,
    metadata: { workspaceId },
  });

  return customer.id;
}

// ─── GET /plans (public) ────────────────────────────────────────────────────

router.get("/plans", async (_req: Request, res: Response) => {
  try {
    const plans = await prisma.billingPlan.findMany({
      orderBy: { priceMonthly: "asc" },
    });

    res.json({ plans });
  } catch (err) {
    console.error("List plans error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// All remaining routes require authentication
router.use(authenticateToken);

// ─── GET /subscription ──────────────────────────────────────────────────────

router.get("/subscription", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });

    if (!subscription) {
      res.json({ subscription: null, message: "No active subscription" });
      return;
    }

    res.json({ subscription });
  } catch (err) {
    console.error("Get subscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /subscribe ────────────────────────────────────────────────────────

router.post("/subscribe", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { planId, successUrl, cancelUrl } = parsed.data;

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    // Verify plan exists
    const plan = await prisma.billingPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      res.status(404).json({ error: "Billing plan not found" });
      return;
    }

    // Resolve the Stripe price
    const stripePriceId = await resolveStripePriceId(plan);

    // Get or create Stripe customer
    const stripeCustomerId = await getOrCreateStripeCustomer(workspaceId);

    // Create a Stripe Checkout Session
    const session = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        workspaceId,
        planId,
      },
      subscription_data: {
        metadata: {
          workspaceId,
          planId,
        },
      },
    });

    res.status(200).json({ checkoutUrl: session.url });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /subscription ──────────────────────────────────────────────────────

router.put("/subscription", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const parsed = updateSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { status } = parsed.data;

    const existing = await prisma.subscription.findUnique({
      where: { workspaceId },
    });
    if (!existing) {
      res
        .status(404)
        .json({ error: "No subscription found for this workspace" });
      return;
    }

    // If cancelling, also cancel on Stripe
    if (status === "CANCELLED" && existing.stripeSubscriptionId) {
      await getStripe().subscriptions.update(existing.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    const subscription = await prisma.subscription.update({
      where: { workspaceId },
      data: { status },
      include: { plan: true },
    });

    res.json({ subscription });
  } catch (err) {
    console.error("Update subscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /webhook (Stripe webhooks – raw body, no auth) ────────────────────

webhookRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }

    let event: Stripe.Event;
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        res.status(500).json({ error: "Stripe webhook secret not configured" });
        return;
      }
      event = getStripe().webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Webhook signature verification failed:", message);
      res.status(400).json({ error: `Webhook Error: ${message}` });
      return;
    }

    try {
      switch (event.type) {
        // ── Checkout completed: provision the subscription ──────────────
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const workspaceId = session.metadata?.workspaceId;
          const planId = session.metadata?.planId;
          const stripeCustomerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id ?? null;
          const stripeSubscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id ?? null;

          if (!workspaceId || !planId) {
            console.error(
              "checkout.session.completed missing metadata",
              session.id
            );
            break;
          }

          // Fetch the Stripe subscription to get current_period_end
          let renewsAt: Date | null = null;
          if (stripeSubscriptionId) {
            const stripeSub = await getStripe().subscriptions.retrieve(
              stripeSubscriptionId
            );
            const periodEnd = (stripeSub as unknown as { current_period_end: number }).current_period_end;
            if (periodEnd) renewsAt = new Date(periodEnd * 1000);
          }

          await prisma.subscription.upsert({
            where: { workspaceId },
            update: {
              planId,
              status: "ACTIVE",
              stripeCustomerId,
              stripeSubscriptionId,
              renewsAt,
            },
            create: {
              workspaceId,
              planId,
              status: "ACTIVE",
              stripeCustomerId,
              stripeSubscriptionId,
              renewsAt,
            },
          });

          console.log(
            `Subscription provisioned for workspace ${workspaceId}`
          );
          break;
        }

        // ── Subscription updated (plan change, renewal, etc.) ──────────
        case "customer.subscription.updated": {
          const stripeSub = event.data.object as Stripe.Subscription;
          const workspaceId = stripeSub.metadata?.workspaceId;

          if (!workspaceId) {
            console.error(
              "customer.subscription.updated missing workspaceId metadata",
              stripeSub.id
            );
            break;
          }

          let status: "ACTIVE" | "PAST_DUE" | "CANCELLED" | "TRIALING";
          switch (stripeSub.status) {
            case "active":
              status = "ACTIVE";
              break;
            case "past_due":
              status = "PAST_DUE";
              break;
            case "canceled":
            case "unpaid":
              status = "CANCELLED";
              break;
            case "trialing":
              status = "TRIALING";
              break;
            default:
              status = "ACTIVE";
          }

          await prisma.subscription.update({
            where: { workspaceId },
            data: {
              status,
              renewsAt: new Date(((stripeSub as unknown as { current_period_end: number }).current_period_end || 0) * 1000),
            },
          });

          console.log(
            `Subscription updated for workspace ${workspaceId}: ${status}`
          );
          break;
        }

        // ── Subscription deleted ────────────────────────────────────────
        case "customer.subscription.deleted": {
          const stripeSub = event.data.object as Stripe.Subscription;
          const workspaceId = stripeSub.metadata?.workspaceId;

          if (!workspaceId) {
            console.error(
              "customer.subscription.deleted missing workspaceId metadata",
              stripeSub.id
            );
            break;
          }

          await prisma.subscription.update({
            where: { workspaceId },
            data: {
              status: "CANCELLED",
              stripeSubscriptionId: null,
              renewsAt: null,
            },
          });

          console.log(
            `Subscription cancelled for workspace ${workspaceId}`
          );
          break;
        }

        // ── Invoice payment failed ──────────────────────────────────────
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const invoiceSub = (invoice as unknown as { subscription: string | { id: string } | null }).subscription;
          const stripeSubscriptionId =
            typeof invoiceSub === "string"
              ? invoiceSub
              : invoiceSub?.id ?? null;

          if (!stripeSubscriptionId) break;

          // Look up the subscription by stripeSubscriptionId
          const sub = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId },
          });

          if (sub) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { status: "PAST_DUE" },
            });

            console.log(
              `Payment failed for workspace ${sub.workspaceId}, marked PAST_DUE`
            );
          }
          break;
        }

        default:
          // Unhandled event type – log and acknowledge
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook handler error:", err);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  }
);

// ─── Exports ────────────────────────────────────────────────────────────────

export default router;
export { webhookRouter };
