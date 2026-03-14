/**
 * Workflow Execution Engine
 *
 * Executes workflow steps sequentially using the LLM abstraction layer.
 * Each step in a workflow is processed by the assigned AI staff member.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import {
  generateCompletion,
  buildSystemPrompt,
  estimateCost,
  type LLMConfig,
  type LLMMessage,
} from "./llm.js";

const prisma = new PrismaClient();

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  prompt?: string;
  type?: "ai_generate" | "ai_analyze" | "ai_summarize" | "transform" | "condition";
  config?: Record<string, unknown>;
}

export interface StepResult {
  stepId: string;
  stepName: string;
  status: "completed" | "failed" | "skipped";
  output: string;
  durationMs: number;
  tokensUsed: number;
}

export interface WorkflowResult {
  status: "completed" | "failed";
  steps: StepResult[];
  totalDurationMs: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  error?: string;
}

/**
 * Execute a workflow by running each step through the AI staff's LLM
 */
export async function executeWorkflow(
  workflowId: string,
  taskId: string,
  workspaceId: string
): Promise<WorkflowResult> {
  const start = Date.now();

  // Load workflow with AI staff
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: { aiStaff: true },
  });

  if (!workflow) {
    throw new Error(`Workflow ${workflowId} not found`);
  }

  // Update task to RUNNING
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const aiStaff = workflow.aiStaff;
  const steps = (workflow.stepsJson as unknown as WorkflowStep[]) || [];
  const stepResults: StepResult[] = [];
  let totalTokens = 0;
  let totalCost = 0;

  // Get workspace name for prompt substitution
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  // Build LLM config from AI staff settings
  const llmConfig: LLMConfig = {
    provider: (aiStaff?.modelProvider as "openai" | "anthropic") || "openai",
    model: aiStaff?.modelName || process.env.DEFAULT_AI_MODEL || "gpt-4o-mini",
    temperature: aiStaff?.temperature ?? 0.7,
    maxTokens: aiStaff?.maxTokens ?? 2048,
  };

  // Check if provider is configured
  const { getConfiguredProvider } = await import("./llm.js");
  const configuredProvider = getConfiguredProvider();

  if (!configuredProvider) {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        outputPayload: {
          error: "No AI provider configured. Add OPENAI_API_KEY or ANTHROPIC_API_KEY to .env",
          steps: [],
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      status: "failed",
      steps: [],
      totalDurationMs: Date.now() - start,
      totalTokensUsed: 0,
      totalCostUsd: 0,
      error: "No AI provider configured",
    };
  }

  // Ensure we use a configured provider
  if (!isProviderAvailable(llmConfig.provider)) {
    llmConfig.provider = configuredProvider;
  }

  // Build system prompt
  const systemPrompt = aiStaff
    ? buildSystemPrompt(
        aiStaff.systemPrompt || "",
        workspace?.name || "Workspace",
        aiStaff.name,
        aiStaff.roleType,
        aiStaff.tone
      )
    : "You are a helpful AI assistant executing workflow steps.";

  try {
    // Execute each step sequentially, passing previous results as context
    let previousOutputs = "";

    for (const step of steps) {
      const stepStart = Date.now();

      try {
        const stepPrompt = buildStepPrompt(step, previousOutputs, workflow.name);

        const messages: LLMMessage[] = [
          { role: "system", content: systemPrompt },
          { role: "user", content: stepPrompt },
        ];

        const response = await generateCompletion(messages, llmConfig);

        const stepTokens = response.usage.totalTokens;
        const stepCost = estimateCost(
          llmConfig.model,
          response.usage.promptTokens,
          response.usage.completionTokens
        );

        totalTokens += stepTokens;
        totalCost += stepCost;

        const result: StepResult = {
          stepId: step.id || `step-${stepResults.length + 1}`,
          stepName: step.name,
          status: "completed",
          output: response.content,
          durationMs: Date.now() - stepStart,
          tokensUsed: stepTokens,
        };

        stepResults.push(result);
        previousOutputs += `\n\n--- ${step.name} Result ---\n${response.content}`;

        // Log usage for each step
        if (aiStaff) {
          await logStepUsage(
            workspaceId,
            aiStaff.id,
            llmConfig,
            response.usage.promptTokens,
            response.usage.completionTokens,
            response.durationMs
          );
        }
      } catch (stepError) {
        const result: StepResult = {
          stepId: step.id || `step-${stepResults.length + 1}`,
          stepName: step.name,
          status: "failed",
          output: stepError instanceof Error ? stepError.message : "Unknown error",
          durationMs: Date.now() - stepStart,
          tokensUsed: 0,
        };

        stepResults.push(result);

        // Stop execution on failure
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: "FAILED",
            finishedAt: new Date(),
            outputPayload: {
              steps: stepResults,
              totalTokensUsed: totalTokens,
              totalCostUsd: totalCost,
              error: `Step "${step.name}" failed: ${result.output}`,
            } as unknown as Prisma.InputJsonValue,
          },
        });

        return {
          status: "failed",
          steps: stepResults,
          totalDurationMs: Date.now() - start,
          totalTokensUsed: totalTokens,
          totalCostUsd: totalCost,
          error: `Step "${step.name}" failed`,
        };
      }
    }

    // All steps completed successfully
    const totalDuration = Date.now() - start;

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        outputPayload: {
          steps: stepResults,
          totalTokensUsed: totalTokens,
          totalCostUsd: totalCost,
          totalDurationMs: totalDuration,
          summary: stepResults.map((s) => `${s.stepName}: ${s.status}`).join(", "),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      status: "completed",
      steps: stepResults,
      totalDurationMs: totalDuration,
      totalTokensUsed: totalTokens,
      totalCostUsd: totalCost,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown execution error";

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        outputPayload: {
          steps: stepResults,
          error: errorMsg,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      status: "failed",
      steps: stepResults,
      totalDurationMs: Date.now() - start,
      totalTokensUsed: totalTokens,
      totalCostUsd: totalCost,
      error: errorMsg,
    };
  }
}

/**
 * Build a prompt for a specific workflow step
 */
function buildStepPrompt(
  step: WorkflowStep,
  previousOutputs: string,
  workflowName: string
): string {
  let prompt = `You are executing step "${step.name}" of the workflow "${workflowName}".\n\n`;

  if (step.description) {
    prompt += `Step Description: ${step.description}\n\n`;
  }

  if (step.prompt) {
    prompt += `Instructions: ${step.prompt}\n\n`;
  }

  if (step.type) {
    switch (step.type) {
      case "ai_generate":
        prompt += "Task Type: Generate new content based on the instructions above.\n\n";
        break;
      case "ai_analyze":
        prompt += "Task Type: Analyze the provided information and give insights.\n\n";
        break;
      case "ai_summarize":
        prompt += "Task Type: Summarize the key findings and outputs.\n\n";
        break;
      case "transform":
        prompt += "Task Type: Transform the input data according to the instructions.\n\n";
        break;
    }
  }

  if (previousOutputs) {
    prompt += `Previous step results for context:\n${previousOutputs}\n\n`;
  }

  prompt += "Please complete this step thoroughly and provide a clear, actionable output.";

  return prompt;
}

function isProviderAvailable(provider: string): boolean {
  if (provider === "openai") return !!process.env.OPENAI_API_KEY;
  if (provider === "anthropic") return !!process.env.ANTHROPIC_API_KEY;
  return false;
}

async function logStepUsage(
  workspaceId: string,
  aiStaffId: string,
  config: LLMConfig,
  promptTokens: number,
  completionTokens: number,
  durationMs: number
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
        endpoint: "workflow",
      },
    });
  } catch (err) {
    console.error("Workflow usage log error (non-fatal):", err);
  }
}
