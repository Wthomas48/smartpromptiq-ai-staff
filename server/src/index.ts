import dotenv from "dotenv";
dotenv.config();

console.log("Starting SmartPromptIQ server...");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("DATABASE_URL set:", !!process.env.DATABASE_URL);

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRouter from "./routes/auth.js";
import workspacesRouter from "./routes/workspaces.js";
import { aiStaffTemplatesRouter, aiStaffRouter } from "./routes/aiStaff.js";
import workflowsRouter, { tasksRouter } from "./routes/workflows.js";
import messagesRouter from "./routes/messages.js";
import integrationsRouter from "./routes/integrations.js";
import billingRouter, { webhookRouter } from "./routes/billing.js";
import analyticsRouter from "./routes/analytics.js";
import uploadsRouter from "./routes/uploads.js";
import delegationRouter from "./routes/delegation.js";
import auditLogsRouter from "./routes/auditLogs.js";
import apiKeysRouter from "./routes/apiKeys.js";
import webhooksRouter from "./routes/webhooks.js";
import knowledgeRouter from "./routes/knowledge.js";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// ─── Security Middleware ─────────────────────────────────────────────────────

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5180",
      process.env.CLIENT_URL || "",
    ].filter(Boolean),
    credentials: true,
  })
);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", apiLimiter);

// Stricter rate limit for AI/delegation endpoints (10 per minute per IP)
const aiLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI request rate limit exceeded. Please wait before creating more delegations." },
});
app.use("/api/webhooks/trigger", aiLimiter);

// Stripe webhook must be mounted BEFORE express.json() to receive raw body
app.use("/api/billing", webhookRouter);

app.use(express.json({ limit: "10mb" }));

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use("/api/auth", authRouter);
app.use("/api/workspaces", workspacesRouter);
app.use("/api/ai-staff-templates", aiStaffTemplatesRouter);
app.use("/api/workspaces/:workspaceId/ai-staff", aiStaffRouter);
app.use("/api/workspaces/:workspaceId/workflows", workflowsRouter);
app.use("/api/workspaces/:workspaceId/tasks", tasksRouter);
app.use("/api/workspaces/:workspaceId/messages", messagesRouter);
app.use("/api/workspaces/:workspaceId/integrations", integrationsRouter);
app.use("/api/workspaces/:workspaceId/billing", billingRouter);
app.use("/api/workspaces/:workspaceId/analytics", analyticsRouter);
app.use("/api/workspaces/:workspaceId/uploads", uploadsRouter);
app.use("/api/workspaces/:workspaceId/delegations", delegationRouter);
app.use("/api/workspaces/:workspaceId/audit-logs", auditLogsRouter);
app.use("/api/workspaces/:workspaceId/api-keys", apiKeysRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/workspaces/:workspaceId/knowledge", knowledgeRouter);

// ─── Static file serving for uploads ───────────────────────────────────────

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
app.use("/uploads", express.static(UPLOAD_DIR));

// ─── Health Check ───────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Serve Client in Production ─────────────────────────────────────────────

if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ─── Global Error Handler ───────────────────────────────────────────────────

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

// ─── Start Server ───────────────────────────────────────────────────────────

import { startScheduler } from "./services/scheduler.js";

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SmartPromptIQ AI Staff server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);

  // Start the delegation scheduler
  startScheduler();
});

export default app;
