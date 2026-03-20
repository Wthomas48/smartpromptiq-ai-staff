import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth.js";

const prisma = new PrismaClient();

// ─── Templates Router (public-ish, still needs auth) ────────────────────────

const aiStaffTemplatesRouter = Router();
aiStaffTemplatesRouter.use(authenticateToken);

// GET /api/ai-staff-templates
aiStaffTemplatesRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const templates = await prisma.aIStaffRoleTemplate.findMany({
      orderBy: { name: "asc" },
    });

    res.json({ templates });
  } catch (err) {
    console.error("List templates error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── AI Staff Router (workspace-scoped) ─────────────────────────────────────

const aiStaffRouter = Router({ mergeParams: true });
aiStaffRouter.use(authenticateToken);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createAIStaffSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  roleType: z.string().min(1, "Role type is required"),
  description: z.string().optional(),
  avatarImageUrl: z.string().url().optional().or(z.literal("")),
  modelConfig: z.record(z.unknown()).optional(),
  isManager: z.boolean().optional(),
});

const updateAIStaffSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  roleType: z.string().min(1).optional(),
  description: z.string().optional(),
  avatarImageUrl: z.string().url().optional().or(z.literal("")),
  modelConfig: z.record(z.unknown()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "TRAINING"]).optional(),
  isManager: z.boolean().optional(),
  systemPrompt: z.string().optional(),
  modelProvider: z.string().optional(),
  modelName: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(32000).optional(),
});

const createFromTemplateSchema = z.object({
  templateId: z.string().uuid("Invalid template ID"),
  name: z.string().min(1, "Name is required").max(100),
});

// ─── GET / ──────────────────────────────────────────────────────────────────

aiStaffRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const staff = await prisma.aIStaff.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { workflows: true, tasks: true, messageThreads: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ staff });
  } catch (err) {
    console.error("List AI staff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST / ─────────────────────────────────────────────────────────────────

aiStaffRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const parsed = createAIStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, roleType, description, avatarImageUrl, modelConfig, isManager } =
      parsed.data;

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    const staff = await prisma.aIStaff.create({
      data: {
        workspaceId,
        name,
        roleType,
        description,
        avatarImageUrl: avatarImageUrl || null,
        modelConfig: (modelConfig || {}) as Prisma.InputJsonValue,
        isManager: isManager || false,
      },
    });

    res.status(201).json({ staff });
  } catch (err) {
    console.error("Create AI staff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /from-template ───────────────────────────────────────────────────

aiStaffRouter.post(
  "/from-template",
  async (req: Request, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const parsed = createFromTemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { templateId, name } = parsed.data;

      // Verify workspace
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      // Fetch template
      const template = await prisma.aIStaffRoleTemplate.findUnique({
        where: { id: templateId },
      });
      if (!template) {
        res.status(404).json({ error: "Template not found" });
        return;
      }

      const staff = await prisma.aIStaff.create({
        data: {
          workspaceId,
          name,
          roleType: template.name,
          description: template.description,
          personality: template.defaultPersonality,
          tone: template.defaultTone,
          systemPrompt: template.defaultSystemPrompt,
          avatarConfig: template.defaultAvatarConfig as Prisma.InputJsonValue,
          tools: template.defaultTools as Prisma.InputJsonValue,
          modelConfig: {
            defaultPrompts: template.defaultPrompts,
            defaultWorkflows: template.defaultWorkflows,
          } as Prisma.InputJsonValue,
        },
      });

      res.status(201).json({ staff, templateUsed: template.name });
    } catch (err) {
      console.error("Create AI staff from template error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /:staffId ──────────────────────────────────────────────────────────

aiStaffRouter.get("/:staffId", async (req: Request, res: Response) => {
  try {
    const { workspaceId, staffId } = req.params;

    const staff = await prisma.aIStaff.findFirst({
      where: { id: staffId, workspaceId },
      include: {
        workflows: {
          orderBy: { createdAt: "desc" },
        },
        tasks: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!staff) {
      res.status(404).json({ error: "AI staff not found" });
      return;
    }

    res.json({ staff });
  } catch (err) {
    console.error("Get AI staff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /:staffId ──────────────────────────────────────────────────────────

aiStaffRouter.put("/:staffId", async (req: Request, res: Response) => {
  try {
    const { workspaceId, staffId } = req.params;
    const parsed = updateAIStaffSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const existing = await prisma.aIStaff.findFirst({
      where: { id: staffId, workspaceId },
    });
    if (!existing) {
      res.status(404).json({ error: "AI staff not found" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.roleType !== undefined)
      updateData.roleType = parsed.data.roleType;
    if (parsed.data.description !== undefined)
      updateData.description = parsed.data.description;
    if (parsed.data.avatarImageUrl !== undefined)
      updateData.avatarImageUrl = parsed.data.avatarImageUrl || null;
    if (parsed.data.modelConfig !== undefined)
      updateData.modelConfig = parsed.data.modelConfig;
    if (parsed.data.status !== undefined)
      updateData.status = parsed.data.status;
    if (parsed.data.isManager !== undefined)
      updateData.isManager = parsed.data.isManager;
    if (parsed.data.systemPrompt !== undefined)
      updateData.systemPrompt = parsed.data.systemPrompt;
    if (parsed.data.modelProvider !== undefined)
      updateData.modelProvider = parsed.data.modelProvider;
    if (parsed.data.modelName !== undefined)
      updateData.modelName = parsed.data.modelName;
    if (parsed.data.temperature !== undefined)
      updateData.temperature = parsed.data.temperature;
    if (parsed.data.maxTokens !== undefined)
      updateData.maxTokens = parsed.data.maxTokens;

    const staff = await prisma.aIStaff.update({
      where: { id: staffId },
      data: updateData,
    });

    res.json({ staff });
  } catch (err) {
    console.error("Update AI staff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /:staffId ───────────────────────────────────────────────────────

aiStaffRouter.delete("/:staffId", async (req: Request, res: Response) => {
  try {
    const { workspaceId, staffId } = req.params;

    const existing = await prisma.aIStaff.findFirst({
      where: { id: staffId, workspaceId },
    });
    if (!existing) {
      res.status(404).json({ error: "AI staff not found" });
      return;
    }

    await prisma.aIStaff.delete({ where: { id: staffId } });

    res.json({ message: "AI staff deleted successfully" });
  } catch (err) {
    console.error("Delete AI staff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { aiStaffTemplatesRouter, aiStaffRouter };
