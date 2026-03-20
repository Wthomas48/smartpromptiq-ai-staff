/**
 * Knowledge Base Routes — Workspace knowledge management
 *
 * Stores and retrieves knowledge entries that AI staff can reference
 * during delegations and conversations.
 */

import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = Router({ mergeParams: true });

router.use(authenticateToken);

const createEntrySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  category: z.string().max(50).optional().default("general"),
  tags: z.array(z.string()).optional().default([]),
});

const updateEntrySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
});

// ─── POST / — Create knowledge entry ───────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const parsed = createEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
      return;
    }

    const entry = await prisma.knowledgeEntry.create({
      data: {
        workspaceId,
        title: parsed.data.title,
        content: parsed.data.content,
        category: parsed.data.category || "general",
        tags: parsed.data.tags as unknown as Prisma.InputJsonValue,
      },
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error("Create knowledge entry error:", err);
    res.status(500).json({ error: "Failed to create knowledge entry" });
  }
});

// ─── GET / — List/search knowledge entries ──────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { search, category } = req.query;

    const where: any = { workspaceId };
    if (category) where.category = category;

    // Simple text search using contains
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { content: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const entries = await prisma.knowledgeEntry.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    res.json(entries);
  } catch (err) {
    console.error("List knowledge entries error:", err);
    res.status(500).json({ error: "Failed to list knowledge entries" });
  }
});

// ─── GET /search — Search for relevant knowledge (used by delegation engine)

router.get("/search", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const { query, limit = "5" } = req.query;

    if (!query) {
      res.status(400).json({ error: "Query parameter required" });
      return;
    }

    const limitNum = Math.min(parseInt(limit as string, 10) || 5, 20);

    // Search by keywords in title and content
    const keywords = (query as string).split(/\s+/).filter(Boolean).slice(0, 5);
    const entries = await prisma.knowledgeEntry.findMany({
      where: {
        workspaceId,
        OR: keywords.flatMap((kw) => [
          { title: { contains: kw, mode: "insensitive" as const } },
          { content: { contains: kw, mode: "insensitive" as const } },
        ]),
      },
      take: limitNum,
      orderBy: { updatedAt: "desc" },
    });

    res.json(entries);
  } catch (err) {
    console.error("Search knowledge error:", err);
    res.status(500).json({ error: "Failed to search knowledge" });
  }
});

// ─── GET /:entryId — Get single entry ───────────────────────────────────────

router.get("/:entryId", async (req: Request, res: Response) => {
  try {
    const { workspaceId, entryId } = req.params;

    const entry = await prisma.knowledgeEntry.findFirst({
      where: { id: entryId, workspaceId },
    });

    if (!entry) {
      res.status(404).json({ error: "Knowledge entry not found" });
      return;
    }

    res.json(entry);
  } catch (err) {
    console.error("Get knowledge entry error:", err);
    res.status(500).json({ error: "Failed to get knowledge entry" });
  }
});

// ─── PUT /:entryId — Update entry ───────────────────────────────────────────

router.put("/:entryId", async (req: Request, res: Response) => {
  try {
    const { workspaceId, entryId } = req.params;
    const parsed = updateEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
      return;
    }

    const existing = await prisma.knowledgeEntry.findFirst({
      where: { id: entryId, workspaceId },
    });

    if (!existing) {
      res.status(404).json({ error: "Knowledge entry not found" });
      return;
    }

    const updateData: any = {};
    if (parsed.data.title) updateData.title = parsed.data.title;
    if (parsed.data.content) updateData.content = parsed.data.content;
    if (parsed.data.category) updateData.category = parsed.data.category;
    if (parsed.data.tags) updateData.tags = parsed.data.tags;

    const entry = await prisma.knowledgeEntry.update({
      where: { id: entryId },
      data: updateData,
    });

    res.json(entry);
  } catch (err) {
    console.error("Update knowledge entry error:", err);
    res.status(500).json({ error: "Failed to update knowledge entry" });
  }
});

// ─── DELETE /:entryId — Delete entry ────────────────────────────────────────

router.delete("/:entryId", async (req: Request, res: Response) => {
  try {
    const { workspaceId, entryId } = req.params;

    const existing = await prisma.knowledgeEntry.findFirst({
      where: { id: entryId, workspaceId },
    });

    if (!existing) {
      res.status(404).json({ error: "Knowledge entry not found" });
      return;
    }

    await prisma.knowledgeEntry.delete({ where: { id: entryId } });

    res.json({ message: "Knowledge entry deleted" });
  } catch (err) {
    console.error("Delete knowledge entry error:", err);
    res.status(500).json({ error: "Failed to delete knowledge entry" });
  }
});

export default router;
