import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth.js";
import { executeWorkflow } from "../services/workflowEngine.js";

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticateToken);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  aiStaffId: z.string().uuid().optional(),
  triggerType: z.enum(["MANUAL", "SCHEDULED"]).optional().default("MANUAL"),
  scheduleCron: z.string().optional(),
  stepsJson: z.array(z.record(z.unknown())).optional(),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  aiStaffId: z.string().uuid().nullable().optional(),
  triggerType: z.enum(["MANUAL", "SCHEDULED"]).optional(),
  scheduleCron: z.string().nullable().optional(),
  stepsJson: z.array(z.record(z.unknown())).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]).optional(),
});

// ─── GET / ──────────────────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const workflows = await prisma.workflow.findMany({
      where: { workspaceId },
      include: {
        aiStaff: { select: { id: true, name: true, roleType: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ workflows });
  } catch (err) {
    console.error("List workflows error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST / ─────────────────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const parsed = createWorkflowSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, aiStaffId, triggerType, scheduleCron, stepsJson } =
      parsed.data;

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    // Verify AI staff if provided
    if (aiStaffId) {
      const staff = await prisma.aIStaff.findFirst({
        where: { id: aiStaffId, workspaceId },
      });
      if (!staff) {
        res.status(404).json({ error: "AI staff not found in this workspace" });
        return;
      }
    }

    const workflow = await prisma.workflow.create({
      data: {
        workspaceId,
        aiStaffId: aiStaffId || null,
        name,
        triggerType,
        scheduleCron: scheduleCron || null,
        stepsJson: (stepsJson || []) as Prisma.InputJsonValue,
      },
      include: {
        aiStaff: { select: { id: true, name: true, roleType: true } },
      },
    });

    res.status(201).json({ workflow });
  } catch (err) {
    console.error("Create workflow error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /:workflowId ───────────────────────────────────────────────────────

router.get("/:workflowId", async (req: Request, res: Response) => {
  try {
    const { workspaceId, workflowId } = req.params;

    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
      include: {
        aiStaff: { select: { id: true, name: true, roleType: true } },
        tasks: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!workflow) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }

    res.json({ workflow });
  } catch (err) {
    console.error("Get workflow error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /:workflowId ──────────────────────────────────────────────────────

router.put("/:workflowId", async (req: Request, res: Response) => {
  try {
    const { workspaceId, workflowId } = req.params;
    const parsed = updateWorkflowSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const existing = await prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
    });
    if (!existing) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.aiStaffId !== undefined)
      updateData.aiStaffId = parsed.data.aiStaffId;
    if (parsed.data.triggerType !== undefined)
      updateData.triggerType = parsed.data.triggerType;
    if (parsed.data.scheduleCron !== undefined)
      updateData.scheduleCron = parsed.data.scheduleCron;
    if (parsed.data.stepsJson !== undefined)
      updateData.stepsJson = parsed.data.stepsJson;
    if (parsed.data.status !== undefined)
      updateData.status = parsed.data.status;

    const workflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: updateData,
      include: {
        aiStaff: { select: { id: true, name: true, roleType: true } },
      },
    });

    res.json({ workflow });
  } catch (err) {
    console.error("Update workflow error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /:workflowId ────────────────────────────────────────────────────

router.delete("/:workflowId", async (req: Request, res: Response) => {
  try {
    const { workspaceId, workflowId } = req.params;

    const existing = await prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
    });
    if (!existing) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }

    await prisma.workflow.delete({ where: { id: workflowId } });

    res.json({ message: "Workflow deleted successfully" });
  } catch (err) {
    console.error("Delete workflow error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /:workflowId/run ─────────────────────────────────────────────────

router.post("/:workflowId/run", async (req: Request, res: Response) => {
  try {
    const { workspaceId, workflowId } = req.params;

    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
    });
    if (!workflow) {
      res.status(404).json({ error: "Workflow not found" });
      return;
    }

    // Create task with PENDING status
    const task = await prisma.task.create({
      data: {
        workspaceId,
        aiStaffId: workflow.aiStaffId,
        workflowId: workflow.id,
        status: "PENDING",
        approvalStatus: "PENDING_APPROVAL",
        inputPayload: {
          workflowName: workflow.name,
          stepsJson: workflow.stepsJson,
          triggeredBy: req.user!.id,
          triggeredAt: new Date().toISOString(),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Execute workflow asynchronously — respond immediately with the task
    res.status(201).json({
      task,
      message: "Workflow execution started",
    });

    // Run in background (non-blocking)
    executeWorkflow(workflow.id, task.id, workspaceId).catch((err) => {
      console.error(`Workflow ${workflow.id} execution failed:`, err);
    });
  } catch (err) {
    console.error("Run workflow error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /tasks (workspace-level) ──────────────────────────────────────────
// Note: This is mounted at /api/workspaces/:workspaceId/tasks in index.ts

export const tasksRouter = Router({ mergeParams: true });
tasksRouter.use(authenticateToken);

tasksRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { status, approvalStatus } = req.query;

    const where: Record<string, unknown> = { workspaceId };
    if (status && typeof status === "string") {
      where.status = status;
    }
    if (approvalStatus && typeof approvalStatus === "string") {
      where.approvalStatus = approvalStatus;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        aiStaff: { select: { id: true, name: true, roleType: true, avatarConfig: true } },
        workflow: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ tasks });
  } catch (err) {
    console.error("List tasks error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /tasks/:taskId/approve ────────────────────────────────────────────

tasksRouter.put("/:taskId/approve", async (req: Request, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    const { note } = req.body || {};

    const existing = await prisma.task.findFirst({
      where: { id: taskId, workspaceId },
    });
    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        approvalStatus: "APPROVED",
        approvalNote: note || null,
      },
      include: {
        aiStaff: { select: { id: true, name: true, roleType: true, avatarConfig: true } },
        workflow: { select: { id: true, name: true } },
      },
    });

    res.json({ task });
  } catch (err) {
    console.error("Approve task error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /tasks/:taskId/reject ─────────────────────────────────────────────

tasksRouter.put("/:taskId/reject", async (req: Request, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    const { note, rerun } = req.body || {};

    const existing = await prisma.task.findFirst({
      where: { id: taskId, workspaceId },
      include: { workflow: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        approvalStatus: "REJECTED",
        approvalNote: note || null,
      },
      include: {
        aiStaff: { select: { id: true, name: true, roleType: true, avatarConfig: true } },
        workflow: { select: { id: true, name: true } },
      },
    });

    let newTask = null;
    if (rerun && existing.workflowId) {
      newTask = await prisma.task.create({
        data: {
          workspaceId,
          aiStaffId: existing.aiStaffId,
          workflowId: existing.workflowId,
          status: "PENDING",
          approvalStatus: "PENDING_APPROVAL",
          inputPayload: existing.inputPayload || {},
        },
        include: {
          aiStaff: { select: { id: true, name: true, roleType: true, avatarConfig: true } },
          workflow: { select: { id: true, name: true } },
        },
      });
    }

    res.json({ task, newTask });
  } catch (err) {
    console.error("Reject task error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
