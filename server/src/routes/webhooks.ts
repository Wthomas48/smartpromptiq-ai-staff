/**
 * Webhook Routes — External triggers for delegations
 *
 * Allows external systems to create and trigger delegations via webhook.
 * Authenticates via API key in the Authorization header.
 */

import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import crypto from "crypto";
import { executeDelegation } from "../services/delegationEngine.js";

const prisma = new PrismaClient();
const router = Router({ mergeParams: true });

const webhookDelegationSchema = z.object({
  managerId: z.string().uuid(),
  goal: z.string().min(1).max(5000),
  context: z.string().max(10000).optional(),
});

/**
 * Authenticate via API key: Authorization: Bearer spiq_...
 */
async function authenticateApiKey(req: Request, res: Response): Promise<{ workspaceId: string } | null> {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer spiq_")) {
    res.status(401).json({ error: "Missing or invalid API key" });
    return null;
  }

  const rawKey = auth.slice(7); // Remove "Bearer "
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await prisma.aPIKey.findFirst({
    where: { keyHash },
  });

  if (!apiKey) {
    res.status(401).json({ error: "Invalid API key" });
    return null;
  }

  // Update last used
  await prisma.aPIKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return { workspaceId: apiKey.workspaceId };
}

// ─── POST /trigger — Create and run a delegation via webhook ────────────────

router.post("/trigger", async (req: Request, res: Response) => {
  try {
    const auth = await authenticateApiKey(req, res);
    if (!auth) return;

    const { workspaceId } = auth;
    const parsed = webhookDelegationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
      return;
    }

    const { managerId, goal, context } = parsed.data;

    // Verify manager exists
    const manager = await prisma.aIStaff.findFirst({
      where: { id: managerId, workspaceId, isManager: true, status: "ACTIVE" },
    });

    if (!manager) {
      res.status(404).json({ error: "Manager not found or not active" });
      return;
    }

    // Get workspace owner for createdByUserId
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    const delegation = await prisma.delegation.create({
      data: {
        workspaceId,
        managerId,
        createdByUserId: workspace.ownerId,
        goal,
        context,
      },
    });

    // Execute in background
    executeDelegation(delegation.id, workspaceId).catch((err) => {
      console.error(`Webhook delegation ${delegation.id} error:`, err);
    });

    res.status(201).json({
      delegationId: delegation.id,
      status: "PLANNING",
      message: "Delegation created and execution started",
    });
  } catch (err) {
    console.error("Webhook trigger error:", err);
    res.status(500).json({ error: "Failed to trigger delegation" });
  }
});

// ─── GET /status/:delegationId — Check delegation status ────────────────────

router.get("/status/:delegationId", async (req: Request, res: Response) => {
  try {
    const auth = await authenticateApiKey(req, res);
    if (!auth) return;

    const { delegationId } = req.params;

    const delegation = await prisma.delegation.findFirst({
      where: { id: delegationId, workspaceId: auth.workspaceId },
      include: {
        manager: { select: { id: true, name: true } },
        _count: { select: { subtasks: true } },
      },
    });

    if (!delegation) {
      res.status(404).json({ error: "Delegation not found" });
      return;
    }

    res.json({
      id: delegation.id,
      goal: delegation.goal,
      status: delegation.status,
      manager: delegation.manager.name,
      subtasks: delegation._count.subtasks,
      finalOutput: delegation.finalOutput,
      totalTokensUsed: delegation.totalTokensUsed,
      totalCostUsd: delegation.totalCostUsd,
      createdAt: delegation.createdAt,
      finishedAt: delegation.finishedAt,
    });
  } catch (err) {
    console.error("Webhook status error:", err);
    res.status(500).json({ error: "Failed to get delegation status" });
  }
});

export default router;
