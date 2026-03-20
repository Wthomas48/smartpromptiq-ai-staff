/**
 * Audit Log Routes — Workspace activity history
 */

import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = Router({ mergeParams: true });

router.use(authenticateToken);

// ─── GET / — List audit logs ────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { limit = "50", offset = "0", action, actorType } = req.query;

    const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);
    const offsetNum = parseInt(offset as string, 10) || 0;

    const where: any = { workspaceId };
    if (action) where.action = { contains: action as string };
    if (actorType) where.actorType = actorType;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limitNum,
        skip: offsetNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total, limit: limitNum, offset: offsetNum });
  } catch (err) {
    console.error("Audit logs error:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

export default router;

// ─── Helper: Create audit log entry ─────────────────────────────────────────

export async function createAuditLog(
  workspaceId: string,
  actorType: "USER" | "AI_STAFF" | "SYSTEM",
  actorId: string,
  action: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId,
        actorType,
        actorId,
        action,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("Audit log write error (non-fatal):", err);
  }
}
