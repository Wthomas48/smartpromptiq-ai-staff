import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100),
  settings: z.record(z.unknown()).optional(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100).optional(),
  settings: z.record(z.unknown()).optional(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.enum(["WORKSPACE_OWNER", "MEMBER"]).optional().default("MEMBER"),
});

// ─── GET / ──────────────────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        _count: { select: { members: true, aiStaff: true } },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ workspaces });
  } catch (err) {
    console.error("List workspaces error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST / ─────────────────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = createWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, settings } = parsed.data;
    const userId = req.user!.id;

    const workspace = await prisma.workspace.create({
      data: {
        name,
        ownerId: userId,
        settings: (settings || {}) as Prisma.InputJsonValue,
        members: {
          create: {
            userId,
            role: "WORKSPACE_OWNER",
          },
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true } },
      },
    });

    res.status(201).json({ workspace });
  } catch (err) {
    console.error("Create workspace error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /:workspaceId ──────────────────────────────────────────────────────

router.get("/:workspaceId", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user!.id;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: {
          select: { members: true, aiStaff: true, workflows: true, tasks: true },
        },
      },
    });

    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    res.json({ workspace });
  } catch (err) {
    console.error("Get workspace error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /:workspaceId/members ─────────────────────────────────────────────

router.post(
  "/:workspaceId/members",
  async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const parsed = addMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { userId, role } = parsed.data;

      // Verify workspace exists
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      // Verify target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!targetUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Check for existing membership
      const existingMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      });
      if (existingMember) {
        res.status(400).json({ error: "User is already a member of this workspace" });
        return;
      }

      const member = await prisma.workspaceMember.create({
        data: { workspaceId, userId, role },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      res.status(201).json({ member });
    } catch (err) {
      console.error("Add member error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /:workspaceId/members ──────────────────────────────────────────────

router.get(
  "/:workspaceId/members",
  async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, status: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      res.json({ members });
    } catch (err) {
      console.error("List members error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── PUT /:workspaceId ────────────────────────────────────────────────────

router.put("/:workspaceId", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user!.id;

    const parsed = updateWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    // Only the owner can update the workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }
    if (workspace.ownerId !== userId) {
      res.status(403).json({ error: "Only the workspace owner can update this workspace" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.settings !== undefined) updateData.settings = parsed.data.settings;

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, aiStaff: true } },
      },
    });

    res.json({ workspace: updated });
  } catch (err) {
    console.error("Update workspace error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /:workspaceId ─────────────────────────────────────────────────

router.delete("/:workspaceId", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user!.id;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }
    if (workspace.ownerId !== userId) {
      res.status(403).json({ error: "Only the workspace owner can delete this workspace" });
      return;
    }

    await prisma.workspace.delete({ where: { id: workspaceId } });

    res.json({ message: "Workspace deleted successfully" });
  } catch (err) {
    console.error("Delete workspace error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /:workspaceId/members/:memberId ───────────────────────────────

router.delete(
  "/:workspaceId/members/:memberId",
  async (req: Request, res: Response) => {
    try {
      const { workspaceId, memberId } = req.params;
      const userId = req.user!.id;

      // Only the owner can remove members
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }
      if (workspace.ownerId !== userId) {
        res.status(403).json({ error: "Only the workspace owner can remove members" });
        return;
      }

      // Find the membership record
      const member = await prisma.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
      });
      if (!member) {
        res.status(404).json({ error: "Member not found" });
        return;
      }

      // Prevent owner from removing themselves
      if (member.userId === workspace.ownerId) {
        res.status(400).json({ error: "Cannot remove the workspace owner" });
        return;
      }

      await prisma.workspaceMember.delete({ where: { id: memberId } });

      res.json({ message: "Member removed successfully" });
    } catch (err) {
      console.error("Remove member error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /:workspaceId/stats ──────────────────────────────────────────────

router.get("/:workspaceId/stats", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user!.id;

    // Verify user has access to the workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    });
    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalAiStaff, activeWorkflows, messagesToday, tasksCompleted] =
      await Promise.all([
        prisma.aIStaff.count({ where: { workspaceId } }),
        prisma.workflow.count({ where: { workspaceId, status: "ACTIVE" } }),
        prisma.message.count({
          where: {
            thread: { workspaceId },
            createdAt: { gte: todayStart },
          },
        }),
        prisma.task.count({ where: { workspaceId, status: "COMPLETED" } }),
      ]);

    res.json({
      stats: {
        totalAiStaff,
        activeWorkflows,
        messagesToday,
        tasksCompleted,
      },
    });
  } catch (err) {
    console.error("Get workspace stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
