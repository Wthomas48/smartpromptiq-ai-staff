/**
 * API Key Routes — Programmatic access key management
 */

import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import crypto from "crypto";
import { authenticateToken } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = Router({ mergeParams: true });

router.use(authenticateToken);

const createKeySchema = z.object({
  label: z.string().min(1).max(100),
  scopes: z.array(z.string()).optional().default(["read", "write"]),
});

// ─── POST / — Create API key ───────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;
    const parsed = createKeySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.errors });
      return;
    }

    const { label, scopes } = parsed.data;

    // Generate a random API key
    const rawKey = `spiq_${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    await prisma.aPIKey.create({
      data: {
        workspaceId,
        keyHash,
        label,
        scopes: scopes as any,
      },
    });

    // Return the raw key ONCE — it won't be retrievable after this
    res.status(201).json({
      key: rawKey,
      label,
      scopes,
      message: "Save this key — it won't be shown again.",
    });
  } catch (err) {
    console.error("Create API key error:", err);
    res.status(500).json({ error: "Failed to create API key" });
  }
});

// ─── GET / — List API keys (hashed, not raw) ───────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId;

    const keys = await prisma.aPIKey.findMany({
      where: { workspaceId },
      select: {
        id: true,
        label: true,
        scopes: true,
        createdAt: true,
        lastUsedAt: true,
        keyHash: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Mask the hash — show only prefix
    const masked = keys.map((k) => ({
      ...k,
      keyPrefix: `spiq_...${k.keyHash.slice(-8)}`,
      keyHash: undefined,
    }));

    res.json(masked);
  } catch (err) {
    console.error("List API keys error:", err);
    res.status(500).json({ error: "Failed to list API keys" });
  }
});

// ─── DELETE /:keyId — Revoke API key ────────────────────────────────────────

router.delete("/:keyId", async (req: Request, res: Response) => {
  try {
    const { workspaceId, keyId } = req.params;

    const key = await prisma.aPIKey.findFirst({
      where: { id: keyId, workspaceId },
    });

    if (!key) {
      res.status(404).json({ error: "API key not found" });
      return;
    }

    await prisma.aPIKey.delete({ where: { id: keyId } });

    res.json({ message: "API key revoked" });
  } catch (err) {
    console.error("Delete API key error:", err);
    res.status(500).json({ error: "Failed to revoke API key" });
  }
});

export default router;
