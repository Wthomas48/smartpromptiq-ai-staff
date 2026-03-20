/**
 * Delegation Routes — Manager-Agent Task Delegation API
 *
 * Endpoints for creating delegations, planning, executing, and viewing results.
 */

import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth.js";
import {
  executeDelegation,
  planDelegation,
} from "../services/delegationEngine.js";
import { createAuditLog } from "./auditLogs.js";

const prisma = new PrismaClient();
const router = Router({ mergeParams: true });

router.use(authenticateToken);

// ─── Schemas ────────────────────────────────────────────────────────────────

const createDelegationSchema = z.object({
  managerId: z.string().uuid(),
  goal: z.string().min(1).max(5000),
  context: z.string().max(10000).optional(),
  autoExecute: z.boolean().optional().default(false),
  isRecurring: z.boolean().optional().default(false),
  scheduleCron: z.string().optional(),
  requireApproval: z.boolean().optional().default(false),
});

const updatePlanSchema = z.object({
  subtasks: z.array(
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().min(1),
      instructions: z.string().min(1),
      assigneeId: z.string().uuid().nullable(),
      orderIndex: z.number().int().min(0),
      dependsOn: z.array(z.string()).default([]),
    })
  ),
});

// ─── POST / — Create a new delegation ───────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const parsed = createDelegationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
      return;
    }

    const { managerId, goal, context, autoExecute, isRecurring, scheduleCron, requireApproval } = parsed.data;

    // Verify manager exists in workspace and is a manager
    const manager = await prisma.aIStaff.findFirst({
      where: { id: managerId, workspaceId, isManager: true, status: "ACTIVE" },
    });

    if (!manager) {
      res.status(404).json({
        error: "Manager not found. Ensure the AI staff member exists, is active, and has isManager enabled.",
      });
      return;
    }

    const delegation = await prisma.delegation.create({
      data: {
        workspaceId,
        managerId,
        createdByUserId: (req as any).user.id,
        goal,
        context,
        isRecurring: isRecurring || false,
        scheduleCron: scheduleCron || null,
        requireApproval: requireApproval || false,
      },
      include: { manager: { select: { id: true, name: true, roleType: true } } },
    });

    // If autoExecute, kick off in background
    if (autoExecute) {
      executeDelegation(delegation.id, workspaceId).catch((err) => {
        console.error(`Delegation ${delegation.id} execution error:`, err);
      });
    }

    createAuditLog(workspaceId, "USER", (req as any).user.id, "delegation.created", {
      delegationId: delegation.id,
      goal: goal.slice(0, 100),
      managerId,
    });

    res.status(201).json(delegation);
  } catch (err) {
    console.error("Create delegation error:", err);
    res.status(500).json({ error: "Failed to create delegation" });
  }
});

// ─── GET / — List delegations ───────────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { status, managerId } = req.query;

    const where: any = { workspaceId };
    if (status) where.status = status;
    if (managerId) where.managerId = managerId;

    const delegations = await prisma.delegation.findMany({
      where,
      include: {
        manager: { select: { id: true, name: true, roleType: true } },
        subtasks: {
          select: { id: true, status: true, title: true },
          orderBy: { orderIndex: "asc" },
        },
        _count: { select: { subtasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(delegations);
  } catch (err) {
    console.error("List delegations error:", err);
    res.status(500).json({ error: "Failed to list delegations" });
  }
});

// ─── GET /:delegationId — Get delegation details ────────────────────────────

router.get("/:delegationId", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { delegationId } = req.params;

    const delegation = await prisma.delegation.findFirst({
      where: { id: delegationId, workspaceId },
      include: {
        manager: { select: { id: true, name: true, roleType: true, modelProvider: true, modelName: true } },
        subtasks: {
          orderBy: { orderIndex: "asc" },
          include: {
            assignee: { select: { id: true, name: true, roleType: true } },
          },
        },
      },
    });

    if (!delegation) {
      res.status(404).json({ error: "Delegation not found" });
      return;
    }

    res.json(delegation);
  } catch (err) {
    console.error("Get delegation error:", err);
    res.status(500).json({ error: "Failed to get delegation" });
  }
});

// ─── POST /:delegationId/plan — Plan only (decompose without executing) ────

router.post("/:delegationId/plan", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { delegationId } = req.params;

    const delegation = await prisma.delegation.findFirst({
      where: { id: delegationId, workspaceId },
    });

    if (!delegation) {
      res.status(404).json({ error: "Delegation not found" });
      return;
    }

    if (delegation.status !== "PLANNING") {
      res.status(400).json({ error: `Cannot plan a delegation with status: ${delegation.status}` });
      return;
    }

    const result = await planDelegation(delegationId, workspaceId);

    // Reload with subtasks
    const updated = await prisma.delegation.findUnique({
      where: { id: delegationId },
      include: {
        subtasks: {
          orderBy: { orderIndex: "asc" },
          include: { assignee: { select: { id: true, name: true, roleType: true } } },
        },
      },
    });

    res.json({ plan: result.plan, delegation: updated });
  } catch (err) {
    console.error("Plan delegation error:", err);
    res.status(500).json({ error: "Failed to plan delegation" });
  }
});

// ─── PUT /:delegationId/plan — Edit the plan before execution ───────────────

router.put("/:delegationId/plan", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { delegationId } = req.params;
    const parsed = updatePlanSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
      return;
    }

    const delegation = await prisma.delegation.findFirst({
      where: { id: delegationId, workspaceId },
      include: { subtasks: true },
    });

    if (!delegation) {
      res.status(404).json({ error: "Delegation not found" });
      return;
    }

    // Only allow editing if no subtasks have started running
    const hasStarted = delegation.subtasks.some((s: any) => s.status !== "PENDING");
    if (hasStarted) {
      res.status(400).json({ error: "Cannot edit plan — subtasks have already started executing" });
      return;
    }

    // Delete existing subtasks and create new ones
    await prisma.delegationSubtask.deleteMany({ where: { delegationId } });

    for (const subtask of parsed.data.subtasks) {
      await prisma.delegationSubtask.create({
        data: {
          delegationId,
          assigneeId: subtask.assigneeId,
          orderIndex: subtask.orderIndex,
          title: subtask.title,
          instructions: subtask.instructions,
          dependsOn: subtask.dependsOn as any,
        },
      });
    }

    // Update plan JSON on delegation
    await prisma.delegation.update({
      where: { id: delegationId },
      data: { plan: parsed.data.subtasks as any },
    });

    const updated = await prisma.delegation.findUnique({
      where: { id: delegationId },
      include: {
        subtasks: {
          orderBy: { orderIndex: "asc" },
          include: { assignee: { select: { id: true, name: true, roleType: true } } },
        },
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Update plan error:", err);
    res.status(500).json({ error: "Failed to update plan" });
  }
});

// ─── POST /:delegationId/execute — Execute a planned delegation ─────────────

router.post("/:delegationId/execute", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { delegationId } = req.params;

    const delegation = await prisma.delegation.findFirst({
      where: { id: delegationId, workspaceId },
      include: { subtasks: true },
    });

    if (!delegation) {
      res.status(404).json({ error: "Delegation not found" });
      return;
    }

    if (delegation.subtasks.length === 0) {
      res.status(400).json({ error: "No subtasks to execute. Run /plan first." });
      return;
    }

    const hasNonPending = delegation.subtasks.some((s: any) => s.status !== "PENDING");
    if (hasNonPending && delegation.status === "COMPLETED") {
      res.status(400).json({ error: "Delegation already completed" });
      return;
    }

    // Execute in background
    executeDelegation(delegationId, workspaceId).catch((err) => {
      console.error(`Delegation ${delegationId} execution error:`, err);
    });

    res.json({ message: "Delegation execution started", delegationId });
  } catch (err) {
    console.error("Execute delegation error:", err);
    res.status(500).json({ error: "Failed to execute delegation" });
  }
});

// ─── POST /:delegationId/run — Plan + Execute in one step ───────────────────

router.post("/:delegationId/run", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { delegationId } = req.params;

    const delegation = await prisma.delegation.findFirst({
      where: { id: delegationId, workspaceId },
    });

    if (!delegation) {
      res.status(404).json({ error: "Delegation not found" });
      return;
    }

    // Execute full pipeline in background
    executeDelegation(delegationId, workspaceId).catch((err) => {
      console.error(`Delegation ${delegationId} run error:`, err);
    });

    res.json({ message: "Delegation started (plan + execute)", delegationId });
  } catch (err) {
    console.error("Run delegation error:", err);
    res.status(500).json({ error: "Failed to run delegation" });
  }
});

// ─── POST /:delegationId/rerun — Reset a failed delegation and run again ────

router.post("/:delegationId/rerun", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { delegationId } = req.params;

    const delegation = await prisma.delegation.findFirst({
      where: { id: delegationId, workspaceId },
    });

    if (!delegation) {
      res.status(404).json({ error: "Delegation not found" });
      return;
    }

    if (delegation.status !== "FAILED" && delegation.status !== "COMPLETED") {
      res.status(400).json({ error: "Can only re-run failed or completed delegations" });
      return;
    }

    // Reset delegation state
    await prisma.delegationSubtask.deleteMany({ where: { delegationId } });
    await prisma.delegation.update({
      where: { id: delegationId },
      data: {
        status: "PLANNING",
        plan: [],
        finalOutput: null,
        totalTokensUsed: 0,
        totalCostUsd: 0,
        startedAt: null,
        finishedAt: null,
      },
    });

    // Execute in background
    executeDelegation(delegationId, workspaceId).catch((err) => {
      console.error(`Delegation ${delegationId} rerun error:`, err);
    });

    res.json({ message: "Delegation re-run started", delegationId });
  } catch (err) {
    console.error("Rerun delegation error:", err);
    res.status(500).json({ error: "Failed to re-run delegation" });
  }
});

// ─── POST /:delegationId/approve — Approve a pending delegation ─────────────

router.post("/:delegationId/approve", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { delegationId } = req.params;

    const delegation = await prisma.delegation.findFirst({
      where: { id: delegationId, workspaceId },
    });

    if (!delegation) {
      res.status(404).json({ error: "Delegation not found" });
      return;
    }

    if (delegation.status !== "PENDING_APPROVAL") {
      res.status(400).json({ error: "Delegation is not pending approval" });
      return;
    }

    await prisma.delegation.update({
      where: { id: delegationId },
      data: {
        status: "COMPLETED",
        approvalNote: req.body.note || null,
        finishedAt: new Date(),
      },
    });

    res.json({ message: "Delegation approved" });
  } catch (err) {
    console.error("Approve delegation error:", err);
    res.status(500).json({ error: "Failed to approve delegation" });
  }
});

// ─── POST /:delegationId/reject — Reject a pending delegation ──────────────

router.post("/:delegationId/reject", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { delegationId } = req.params;

    const delegation = await prisma.delegation.findFirst({
      where: { id: delegationId, workspaceId },
    });

    if (!delegation) {
      res.status(404).json({ error: "Delegation not found" });
      return;
    }

    if (delegation.status !== "PENDING_APPROVAL") {
      res.status(400).json({ error: "Delegation is not pending approval" });
      return;
    }

    await prisma.delegation.update({
      where: { id: delegationId },
      data: {
        status: "FAILED",
        approvalNote: req.body.note || "Rejected by user",
        finishedAt: new Date(),
      },
    });

    res.json({ message: "Delegation rejected" });
  } catch (err) {
    console.error("Reject delegation error:", err);
    res.status(500).json({ error: "Failed to reject delegation" });
  }
});

// ─── GET /:delegationId/subtasks — List subtasks ────────────────────────────

router.get("/:delegationId/subtasks", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { delegationId } = req.params;

    const delegation = await prisma.delegation.findFirst({
      where: { id: delegationId, workspaceId },
    });

    if (!delegation) {
      res.status(404).json({ error: "Delegation not found" });
      return;
    }

    const subtasks = await prisma.delegationSubtask.findMany({
      where: { delegationId },
      include: {
        assignee: { select: { id: true, name: true, roleType: true } },
      },
      orderBy: { orderIndex: "asc" },
    });

    res.json(subtasks);
  } catch (err) {
    console.error("List subtasks error:", err);
    res.status(500).json({ error: "Failed to list subtasks" });
  }
});

// ─── DELETE /:delegationId — Cancel/delete a delegation ─────────────────────

router.delete("/:delegationId", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { delegationId } = req.params;

    const delegation = await prisma.delegation.findFirst({
      where: { id: delegationId, workspaceId },
    });

    if (!delegation) {
      res.status(404).json({ error: "Delegation not found" });
      return;
    }

    if (delegation.status === "EXECUTING" || delegation.status === "REVIEWING") {
      res.status(400).json({ error: "Cannot delete a delegation that is currently running" });
      return;
    }

    await prisma.delegation.delete({ where: { id: delegationId } });

    res.json({ message: "Delegation deleted" });
  } catch (err) {
    console.error("Delete delegation error:", err);
    res.status(500).json({ error: "Failed to delete delegation" });
  }
});

export default router;
