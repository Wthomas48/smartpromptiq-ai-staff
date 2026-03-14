import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth.js";
import {
  generateCompletion,
  streamCompletion,
  buildConversationMessages,
  buildSystemPrompt,
  getConfiguredProvider,
  estimateCost,
  type LLMConfig,
} from "../services/llm.js";

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticateToken);

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createThreadSchema = z.object({
  aiStaffId: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").max(200),
});

const createMessageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
  attachments: z.array(z.record(z.unknown())).optional(),
  stream: z.boolean().optional().default(false),
});

// ─── GET /threads ───────────────────────────────────────────────────────────

router.get("/threads", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const threads = await prisma.messageThread.findMany({
      where: { workspaceId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        aiStaff: { select: { id: true, name: true, roleType: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ threads });
  } catch (err) {
    console.error("List threads error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /threads ──────────────────────────────────────────────────────────

router.post("/threads", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const parsed = createThreadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { aiStaffId, title } = parsed.data;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    if (aiStaffId) {
      const staff = await prisma.aIStaff.findFirst({
        where: { id: aiStaffId, workspaceId },
      });
      if (!staff) {
        res.status(404).json({ error: "AI staff not found in this workspace" });
        return;
      }
    }

    const thread = await prisma.messageThread.create({
      data: {
        workspaceId,
        aiStaffId: aiStaffId || null,
        createdByUserId: req.user!.id,
        title,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        aiStaff: { select: { id: true, name: true, roleType: true } },
      },
    });

    res.status(201).json({ thread });
  } catch (err) {
    console.error("Create thread error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /threads/:threadId ─────────────────────────────────────────────────

router.get("/threads/:threadId", async (req: Request, res: Response) => {
  try {
    const { workspaceId, threadId } = req.params;

    const thread = await prisma.messageThread.findFirst({
      where: { id: threadId, workspaceId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        aiStaff: { select: { id: true, name: true, roleType: true } },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!thread) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }

    res.json({ thread });
  } catch (err) {
    console.error("Get thread error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /threads/:threadId/messages ───────────────────────────────────────

router.post(
  "/threads/:threadId/messages",
  async (req: Request, res: Response) => {
    try {
      const { workspaceId, threadId } = req.params;
      const parsed = createMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { content, attachments, stream: useStreaming } = parsed.data;

      // Verify thread + load AI staff details
      const thread = await prisma.messageThread.findFirst({
        where: { id: threadId, workspaceId },
        include: {
          aiStaff: true,
          messages: { orderBy: { createdAt: "asc" } },
        },
      });
      if (!thread) {
        res.status(404).json({ error: "Thread not found" });
        return;
      }

      // Get workspace for name substitution
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      });

      // Save user message
      const userMessage = await prisma.message.create({
        data: {
          threadId,
          senderType: "USER",
          content,
          attachments: (attachments || []) as Prisma.InputJsonValue,
        },
      });

      // Check if any AI provider is configured
      const provider = getConfiguredProvider();
      const aiStaff = thread.aiStaff;

      if (!provider || !aiStaff) {
        // Fallback: no provider configured or no AI staff linked
        const fallbackReply = await prisma.message.create({
          data: {
            threadId,
            senderType: "AI_STAFF",
            content: !provider
              ? "AI providers are not configured yet. Please add your OpenAI or Anthropic API key in the server .env file to enable AI responses."
              : "No AI staff is linked to this conversation. Please create a thread with an AI staff member.",
            attachments: [] as Prisma.InputJsonValue,
          },
        });

        res.status(201).json({ userMessage, aiReply: fallbackReply });
        return;
      }

      // Build the system prompt from AI staff config
      const systemPrompt = buildSystemPrompt(
        aiStaff.systemPrompt || "",
        workspace?.name || "Workspace",
        aiStaff.name,
        aiStaff.roleType,
        aiStaff.tone
      );

      // Build conversation with history
      const llmMessages = buildConversationMessages(
        systemPrompt,
        thread.messages.map((m) => ({
          senderType: m.senderType,
          content: m.content,
        })),
        content
      );

      const llmConfig: LLMConfig = {
        provider: (aiStaff.modelProvider as "openai" | "anthropic") || provider,
        model: aiStaff.modelName || process.env.DEFAULT_AI_MODEL || "gpt-4o-mini",
        temperature: aiStaff.temperature ?? 0.7,
        maxTokens: aiStaff.maxTokens ?? 2048,
      };

      // Ensure we use a configured provider
      if (!isProviderActuallyConfigured(llmConfig.provider)) {
        llmConfig.provider = provider;
      }

      // ─── Streaming response ────────────────────────────────────
      if (useStreaming) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        // Send user message event
        res.write(`data: ${JSON.stringify({ type: "user_message", message: userMessage })}\n\n`);

        let fullContent = "";

        try {
          for await (const chunk of streamCompletion(llmMessages, llmConfig)) {
            if (chunk.content) {
              fullContent += chunk.content;
              res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk.content })}\n\n`);
            }
            if (chunk.done) {
              // Save the complete AI reply
              const aiReply = await prisma.message.create({
                data: {
                  threadId,
                  senderType: "AI_STAFF",
                  content: fullContent,
                  attachments: [] as Prisma.InputJsonValue,
                },
              });

              // Log usage (approximate for streaming)
              const approxTokens = Math.ceil(fullContent.length / 4);
              await logUsage(workspaceId, aiStaff.id, llmConfig, 0, approxTokens);

              res.write(`data: ${JSON.stringify({ type: "done", message: aiReply })}\n\n`);
            }
          }
        } catch (aiError) {
          console.error("AI streaming error:", aiError);
          const errorContent = "I encountered an error processing your request. Please try again.";
          const errorReply = await prisma.message.create({
            data: { threadId, senderType: "AI_STAFF", content: errorContent, attachments: [] },
          });
          res.write(`data: ${JSON.stringify({ type: "error", message: errorReply })}\n\n`);
        }

        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      // ─── Non-streaming response ────────────────────────────────
      try {
        const response = await generateCompletion(llmMessages, llmConfig);

        const aiReply = await prisma.message.create({
          data: {
            threadId,
            senderType: "AI_STAFF",
            content: response.content,
            attachments: [] as Prisma.InputJsonValue,
          },
        });

        // Log usage
        await logUsage(
          workspaceId,
          aiStaff.id,
          llmConfig,
          response.usage.promptTokens,
          response.usage.completionTokens,
          response.durationMs
        );

        res.status(201).json({
          userMessage,
          aiReply,
          usage: response.usage,
          model: response.model,
          durationMs: response.durationMs,
        });
      } catch (aiError: unknown) {
        console.error("AI completion error:", aiError);

        // Save error as AI message so user sees feedback
        const errorMessage = aiError instanceof Error ? aiError.message : "Unknown AI error";
        const aiReply = await prisma.message.create({
          data: {
            threadId,
            senderType: "AI_STAFF",
            content: `I encountered an error: ${errorMessage}. Please check your AI provider configuration.`,
            attachments: [] as Prisma.InputJsonValue,
          },
        });

        res.status(201).json({ userMessage, aiReply, error: errorMessage });
      }
    } catch (err) {
      console.error("Create message error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── Helper: check if a specific provider is configured ──────────────────────

function isProviderActuallyConfigured(provider: string): boolean {
  if (provider === "openai") return !!process.env.OPENAI_API_KEY;
  if (provider === "anthropic") return !!process.env.ANTHROPIC_API_KEY;
  return false;
}

// ─── Helper: log usage to database ──────────────────────────────────────────

async function logUsage(
  workspaceId: string,
  aiStaffId: string,
  config: LLMConfig,
  promptTokens: number,
  completionTokens: number,
  durationMs: number = 0
) {
  try {
    const totalTokens = promptTokens + completionTokens;
    const costUsd = estimateCost(config.model, promptTokens, completionTokens);

    await prisma.usageLog.create({
      data: {
        workspaceId,
        aiStaffId,
        provider: config.provider,
        model: config.model,
        promptTokens,
        completionTokens,
        totalTokens,
        costUsd,
        durationMs,
        endpoint: "chat",
      },
    });
  } catch (err) {
    console.error("Usage log error (non-fatal):", err);
  }
}

export default router;
