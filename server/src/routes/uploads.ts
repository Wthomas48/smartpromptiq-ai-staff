import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { authenticateToken } from "../middleware/auth.js";

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticateToken);

// ─── Configuration ─────────────────────────────────────────────────────────

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "10", 10);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_MIMETYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
  ".txt",
  ".csv",
  ".json",
  ".docx",
]);

// ─── Multer Storage ────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination(_req: Request, _file, cb) {
    const workspaceId = _req.params.workspaceId;
    const dest = path.join(UPLOAD_DIR, workspaceId);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename(_req, file, cb) {
    const uniqueSuffix = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIMETYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.originalname}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

// ─── POST / — Upload a single file ────────────────────────────────────────

router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const fileType = resolveFileType(ext);

    const document = await prisma.document.create({
      data: {
        workspaceId,
        title: file.originalname,
        type: fileType,
        storageUrl: file.path,
        tags: [] as Prisma.InputJsonValue,
      },
    });

    res.status(201).json({ document });
  } catch (err) {
    console.error("Upload file error:", err);
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res
          .status(413)
          .json({ error: `File too large. Max size is ${MAX_FILE_SIZE_MB}MB.` });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.message.startsWith("File type not allowed")) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET / — List documents for workspace ──────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const typeFilter = req.query.type as string | undefined;

    const where: Prisma.DocumentWhereInput = { workspaceId };
    if (typeFilter) {
      where.type = typeFilter;
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({ documents });
  } catch (err) {
    console.error("List documents error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /:documentId/download — Serve file for download ──────────────────

router.get("/:documentId/download", async (req: Request, res: Response) => {
  try {
    const { workspaceId, documentId } = req.params;

    const document = await prisma.document.findFirst({
      where: { id: documentId, workspaceId },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const filePath = path.resolve(document.storageUrl);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File not found on disk" });
      return;
    }

    res.download(filePath, document.title);
  } catch (err) {
    console.error("Download file error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /:documentId — Delete document and file from disk ──────────────

router.delete("/:documentId", async (req: Request, res: Response) => {
  try {
    const { workspaceId, documentId } = req.params;

    const document = await prisma.document.findFirst({
      where: { id: documentId, workspaceId },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // Delete file from disk
    const filePath = path.resolve(document.storageUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database record
    await prisma.document.delete({ where: { id: documentId } });

    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    console.error("Delete document error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function resolveFileType(ext: string): string {
  switch (ext) {
    case ".jpg":
    case ".jpeg":
    case ".png":
    case ".gif":
    case ".webp":
      return "image";
    case ".pdf":
      return "pdf";
    case ".txt":
      return "text";
    case ".csv":
      return "csv";
    case ".json":
      return "json";
    case ".docx":
      return "docx";
    default:
      return "other";
  }
}

export default router;
