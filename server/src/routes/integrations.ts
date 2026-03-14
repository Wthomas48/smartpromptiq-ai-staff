import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth.js";

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticateToken);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createIntegrationSchema = z.object({
  type: z.enum(["EMAIL", "WEBHOOK", "SMARTPROMPTIQ_API"]),
  credentials: z.record(z.unknown()).optional(),
  label: z.string().min(1, "Label is required").max(100).optional(),
});

const updateIntegrationSchema = z.object({
  type: z.enum(["EMAIL", "WEBHOOK", "SMARTPROMPTIQ_API"]).optional(),
  credentials: z.record(z.unknown()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ERROR"]).optional(),
});

// ─── GET / ──────────────────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const integrations = await prisma.toolIntegration.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    // Strip sensitive credential data from response
    const sanitized = integrations.map((integration) => ({
      ...integration,
      credentials: Object.keys(
        integration.credentials as Record<string, unknown>
      ).reduce(
        (acc, key) => {
          acc[key] = "••••••••";
          return acc;
        },
        {} as Record<string, string>
      ),
    }));

    res.json({ integrations: sanitized });
  } catch (err) {
    console.error("List integrations error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST / ─────────────────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const parsed = createIntegrationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { type, credentials } = parsed.data;

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    const integration = await prisma.toolIntegration.create({
      data: {
        workspaceId,
        type,
        credentials: (credentials || {}) as Prisma.InputJsonValue,
      },
    });

    res.status(201).json({ integration });
  } catch (err) {
    console.error("Create integration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /:integrationId ───────────────────────────────────────────────────

router.put("/:integrationId", async (req: Request, res: Response) => {
  try {
    const { workspaceId, integrationId } = req.params;
    const parsed = updateIntegrationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const existing = await prisma.toolIntegration.findFirst({
      where: { id: integrationId, workspaceId },
    });
    if (!existing) {
      res.status(404).json({ error: "Integration not found" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
    if (parsed.data.credentials !== undefined)
      updateData.credentials = parsed.data.credentials;
    if (parsed.data.status !== undefined)
      updateData.status = parsed.data.status;

    const integration = await prisma.toolIntegration.update({
      where: { id: integrationId },
      data: updateData,
    });

    res.json({ integration });
  } catch (err) {
    console.error("Update integration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /:integrationId ─────────────────────────────────────────────────

router.delete("/:integrationId", async (req: Request, res: Response) => {
  try {
    const { workspaceId, integrationId } = req.params;

    const existing = await prisma.toolIntegration.findFirst({
      where: { id: integrationId, workspaceId },
    });
    if (!existing) {
      res.status(404).json({ error: "Integration not found" });
      return;
    }

    await prisma.toolIntegration.delete({ where: { id: integrationId } });

    res.json({ message: "Integration deleted successfully" });
  } catch (err) {
    console.error("Delete integration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
