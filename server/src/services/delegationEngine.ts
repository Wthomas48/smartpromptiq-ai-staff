/**
 * Delegation Engine — Manager-Agent Orchestration System
 *
 * Enables a "manager" AI staff member to decompose high-level goals into
 * subtasks, delegate them to specialist AI staff, and synthesize results.
 *
 * Flow: Goal → Planning → Execution (with dependency resolution) → Review → Final Output
 */

import { PrismaClient, Prisma } from "@prisma/client";
import {
  generateCompletion,
  buildSystemPrompt,
  estimateCost,
  getConfiguredProvider,
  type LLMConfig,
  type LLMMessage,
} from "./llm.js";

const prisma = new PrismaClient();

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SubtaskPlan {
  title: string;
  instructions: string;
  assigneeId: string | null;
  assigneeName: string;
  dependsOn: number[];
  orderIndex: number;
}

export interface SubtaskResult {
  subtaskId: string;
  title: string;
  assigneeName: string;
  status: "completed" | "failed" | "skipped";
  output: string;
  durationMs: number;
  tokensUsed: number;
  costUsd: number;
}

export interface DelegationResult {
  status: "completed" | "failed";
  plan: SubtaskPlan[];
  subtaskResults: SubtaskResult[];
  finalOutput: string | null;
  totalDurationMs: number;
  totalTokensUsed: number;
  totalCostUsd: number;
  error?: string;
}

// ─── Main Orchestration ─────────────────────────────────────────────────────

/**
 * Execute a full delegation: plan → execute subtasks → synthesize results
 */
export async function executeDelegation(
  delegationId: string,
  workspaceId: string
): Promise<DelegationResult> {
  const start = Date.now();

  const delegation = await prisma.delegation.findUnique({
    where: { id: delegationId },
    include: {
      manager: true,
      subtasks: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!delegation) throw new Error(`Delegation ${delegationId} not found`);

  const configuredProvider = getConfiguredProvider();
  if (!configuredProvider) {
    await prisma.delegation.update({
      where: { id: delegationId },
      data: { status: "FAILED" },
    });
    return {
      status: "failed",
      plan: [],
      subtaskResults: [],
      finalOutput: null,
      totalDurationMs: Date.now() - start,
      totalTokensUsed: 0,
      totalCostUsd: 0,
      error: "No AI provider configured. Add OPENAI_API_KEY or ANTHROPIC_API_KEY to .env",
    };
  }

  let totalTokens = 0;
  let totalCost = 0;

  try {
    // ── Phase 1: Planning ──────────────────────────────────────────────
    let subtasks = delegation.subtasks;

    if (delegation.status === "PLANNING" || subtasks.length === 0) {
      await prisma.delegation.update({
        where: { id: delegationId },
        data: { status: "PLANNING", startedAt: new Date() },
      });

      const planResult = await planDelegation(delegationId, workspaceId);
      totalTokens += planResult.tokensUsed;
      totalCost += planResult.costUsd;

      // Reload subtasks after planning
      subtasks = await prisma.delegationSubtask.findMany({
        where: { delegationId },
        orderBy: { orderIndex: "asc" },
      });
    }

    // ── Phase 2: Execution ─────────────────────────────────────────────
    await prisma.delegation.update({
      where: { id: delegationId },
      data: { status: "EXECUTING" },
    });

    const subtaskResults = await executeSubtasks(
      delegationId,
      workspaceId,
      subtasks,
      delegation.manager,
      delegation.goal
    );

    for (const r of subtaskResults) {
      totalTokens += r.tokensUsed;
      totalCost += r.costUsd;
    }

    // Check if any subtask failed
    const hasFailed = subtaskResults.some((r) => r.status === "failed");
    if (hasFailed) {
      await prisma.delegation.update({
        where: { id: delegationId },
        data: {
          status: "FAILED",
          totalTokensUsed: totalTokens,
          totalCostUsd: totalCost,
          finishedAt: new Date(),
        },
      });
      return {
        status: "failed",
        plan: delegation.plan as unknown as SubtaskPlan[],
        subtaskResults,
        finalOutput: null,
        totalDurationMs: Date.now() - start,
        totalTokensUsed: totalTokens,
        totalCostUsd: totalCost,
        error: "One or more subtasks failed",
      };
    }

    // ── Phase 3: Review & Synthesis ────────────────────────────────────
    await prisma.delegation.update({
      where: { id: delegationId },
      data: { status: "REVIEWING" },
    });

    const synthesisResult = await synthesizeResults(
      delegationId,
      workspaceId,
      delegation.manager,
      delegation.goal,
      subtaskResults
    );

    totalTokens += synthesisResult.tokensUsed;
    totalCost += synthesisResult.costUsd;

    // ── Done (or pending approval) ─────────────────────────────────────
    // Reload to check requireApproval flag
    const updatedDelegation = await prisma.delegation.findUnique({
      where: { id: delegationId },
    });

    const finalStatus = updatedDelegation?.requireApproval ? "PENDING_APPROVAL" : "COMPLETED";

    await prisma.delegation.update({
      where: { id: delegationId },
      data: {
        status: finalStatus,
        finalOutput: synthesisResult.content,
        totalTokensUsed: totalTokens,
        totalCostUsd: totalCost,
        finishedAt: finalStatus === "COMPLETED" ? new Date() : undefined,
      },
    });

    return {
      status: finalStatus === "COMPLETED" ? "completed" : "completed",
      plan: delegation.plan as unknown as SubtaskPlan[],
      subtaskResults,
      finalOutput: synthesisResult.content,
      totalDurationMs: Date.now() - start,
      totalTokensUsed: totalTokens,
      totalCostUsd: totalCost,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await prisma.delegation.update({
      where: { id: delegationId },
      data: {
        status: "FAILED",
        totalTokensUsed: totalTokens,
        totalCostUsd: totalCost,
        finishedAt: new Date(),
      },
    });

    return {
      status: "failed",
      plan: delegation.plan as unknown as SubtaskPlan[],
      subtaskResults: [],
      finalOutput: null,
      totalDurationMs: Date.now() - start,
      totalTokensUsed: totalTokens,
      totalCostUsd: totalCost,
      error: errorMsg,
    };
  }
}

// ─── Planning Phase ─────────────────────────────────────────────────────────

/**
 * Have the manager LLM decompose a goal into subtasks
 */
export async function planDelegation(
  delegationId: string,
  workspaceId: string
): Promise<{ plan: SubtaskPlan[]; tokensUsed: number; costUsd: number }> {
  const delegation = await prisma.delegation.findUnique({
    where: { id: delegationId },
    include: { manager: true },
  });

  if (!delegation) throw new Error(`Delegation ${delegationId} not found`);

  const manager = delegation.manager;

  // Get all active specialists in the workspace (excluding the manager)
  const specialists = await prisma.aIStaff.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
      id: { not: manager.id },
    },
    select: { id: true, name: true, roleType: true, description: true },
  });

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  // Search knowledge base for relevant context
  const goalKeywords = delegation.goal.split(/\s+/).filter((w) => w.length > 3).slice(0, 5);
  let knowledgeContext = "";
  if (goalKeywords.length > 0) {
    try {
      const knowledgeEntries = await prisma.knowledgeEntry.findMany({
        where: {
          workspaceId,
          OR: goalKeywords.flatMap((kw) => [
            { title: { contains: kw, mode: "insensitive" as const } },
            { content: { contains: kw, mode: "insensitive" as const } },
          ]),
        },
        take: 3,
        orderBy: { updatedAt: "desc" },
      });
      if (knowledgeEntries.length > 0) {
        knowledgeContext = "\n\nRelevant knowledge from the workspace:\n" +
          knowledgeEntries.map((e) => `### ${e.title}\n${e.content.slice(0, 500)}`).join("\n\n");
      }
    } catch {
      // Non-fatal: knowledge search failed
    }
  }

  // Build the planning prompt
  const specialistList = specialists
    .map((s) => `- ${s.name} (ID: ${s.id}, Role: ${s.roleType}): ${s.description || "No description"}`)
    .join("\n");

  const planningPrompt = `You are ${manager.name}, a ${manager.roleType} managing a team of AI specialists.

Your goal: ${delegation.goal}
${delegation.context ? `Additional context: ${delegation.context}` : ""}${knowledgeContext}

Available team members:
${specialistList || "No specialists available — you will handle all subtasks yourself."}

Decompose this goal into concrete subtasks. For each subtask, specify:
1. "title": short descriptive name
2. "instructions": detailed instructions for the specialist to complete this task
3. "assigneeId": the ID of the best specialist for this task (or null if you should handle it yourself)
4. "assigneeName": name of the assigned specialist (or "Self" if you handle it)
5. "dependsOn": array of subtask indices (0-based) that must complete before this one starts
6. "orderIndex": execution priority (0 = first)

Rules:
- Keep subtasks focused and actionable (2-7 subtasks)
- Only assign to specialists whose role matches the task
- Use dependency chains when a subtask needs output from a previous one
- Independent subtasks can share the same orderIndex (they run in parallel)

Return ONLY a valid JSON array of subtask objects. No markdown, no explanation.`;

  const managerConfig = buildManagerLLMConfig(manager);
  const systemPrompt = buildSystemPrompt(
    manager.systemPrompt || "",
    workspace?.name || "Workspace",
    manager.name,
    manager.roleType,
    manager.tone
  );

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: planningPrompt },
  ];

  const response = await generateCompletion(messages, managerConfig);
  const cost = estimateCost(
    managerConfig.model,
    response.usage.promptTokens,
    response.usage.completionTokens
  );

  // Log usage
  await logDelegationUsage(workspaceId, manager.id, managerConfig, response, "delegation-plan");

  // Parse the plan from LLM response
  let plan: SubtaskPlan[];
  try {
    const cleaned = response.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    plan = JSON.parse(cleaned);
  } catch {
    throw new Error(`Manager failed to produce valid plan JSON: ${response.content.slice(0, 200)}`);
  }

  // Validate assigneeIds exist
  const validIds = new Set(specialists.map((s) => s.id));
  for (const step of plan) {
    if (step.assigneeId && !validIds.has(step.assigneeId)) {
      step.assigneeId = null;
      step.assigneeName = "Self";
    }
  }

  // Save plan to delegation and create subtask records
  await prisma.delegation.update({
    where: { id: delegationId },
    data: { plan: plan as unknown as Prisma.InputJsonValue },
  });

  // Delete any existing subtasks (in case of re-planning)
  await prisma.delegationSubtask.deleteMany({ where: { delegationId } });

  // Create subtask records
  for (let i = 0; i < plan.length; i++) {
    const step = plan[i];
    await prisma.delegationSubtask.create({
      data: {
        delegationId,
        assigneeId: step.assigneeId,
        orderIndex: step.orderIndex ?? i,
        title: step.title,
        instructions: step.instructions,
        dependsOn: step.dependsOn.map((idx) => idx.toString()) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return { plan, tokensUsed: response.usage.totalTokens, costUsd: cost };
}

// ─── Execution Phase ────────────────────────────────────────────────────────

/**
 * Execute subtasks in dependency order with parallelism within each batch
 */
async function executeSubtasks(
  delegationId: string,
  workspaceId: string,
  subtasks: Array<Record<string, any>>,
  manager: {
    id: string;
    name: string;
    roleType: string;
    systemPrompt: string | null;
    tone: string | null;
    modelProvider: string;
    modelName: string;
    temperature: number;
    maxTokens: number;
  },
  goal: string
): Promise<SubtaskResult[]> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  const results: Map<string, SubtaskResult> = new Map();

  // Build dependency graph: group subtasks by resolved batches
  const batches = buildExecutionBatches(subtasks);

  for (const batch of batches) {
    // Execute all subtasks in this batch in parallel
    const batchPromises = batch.map(async (subtask) => {
      const subtaskStart = Date.now();

      await prisma.delegationSubtask.update({
        where: { id: subtask.id },
        data: { status: "RUNNING", startedAt: new Date() },
      });

      try {
        // Get the assignee (specialist) or fall back to manager
        let agent = manager;
        let agentName = manager.name;

        if (subtask.assigneeId) {
          const specialist = await prisma.aIStaff.findUnique({
            where: { id: subtask.assigneeId },
          });
          if (specialist) {
            agent = specialist;
            agentName = specialist.name;
          }
        }

        // Build context from dependency outputs
        const depIds = (subtask.dependsOn as string[]) || [];
        let dependencyContext = "";
        for (const depIdx of depIds) {
          // depIdx is a string index, find the subtask at that index
          const depSubtask = subtasks[parseInt(depIdx)];
          if (depSubtask) {
            const depResult = results.get(depSubtask.id);
            if (depResult) {
              dependencyContext += `\n--- Output from "${depResult.title}" ---\n${depResult.output}\n`;
            }
          }
        }

        const agentConfig = buildManagerLLMConfig(agent);
        const systemPrompt = buildSystemPrompt(
          agent.systemPrompt || "",
          workspace?.name || "Workspace",
          agent.name,
          agent.roleType,
          agent.tone
        );

        const userPrompt = `You are working on a team project. The overall goal is: ${goal}

Your specific task: ${subtask.title}

Instructions: ${subtask.instructions}
${dependencyContext ? `\nContext from previous tasks:\n${dependencyContext}` : ""}

Complete this task thoroughly and provide clear, actionable output.`;

        const messages: LLMMessage[] = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ];

        const response = await generateCompletion(messages, agentConfig);
        const cost = estimateCost(
          agentConfig.model,
          response.usage.promptTokens,
          response.usage.completionTokens
        );

        await prisma.delegationSubtask.update({
          where: { id: subtask.id },
          data: {
            status: "COMPLETED",
            output: response.content,
            tokensUsed: response.usage.totalTokens,
            costUsd: cost,
            durationMs: Date.now() - subtaskStart,
            finishedAt: new Date(),
          },
        });

        await logDelegationUsage(workspaceId, agent.id, agentConfig, response, "delegation-subtask");

        const result: SubtaskResult = {
          subtaskId: subtask.id,
          title: subtask.title,
          assigneeName: agentName,
          status: "completed",
          output: response.content,
          durationMs: Date.now() - subtaskStart,
          tokensUsed: response.usage.totalTokens,
          costUsd: cost,
        };
        results.set(subtask.id, result);
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";

        await prisma.delegationSubtask.update({
          where: { id: subtask.id },
          data: {
            status: "FAILED",
            output: errorMsg,
            durationMs: Date.now() - subtaskStart,
            finishedAt: new Date(),
          },
        });

        const result: SubtaskResult = {
          subtaskId: subtask.id,
          title: subtask.title,
          assigneeName: subtask.assigneeId ? "Specialist" : manager.name,
          status: "failed",
          output: errorMsg,
          durationMs: Date.now() - subtaskStart,
          tokensUsed: 0,
          costUsd: 0,
        };
        results.set(subtask.id, result);
        return result;
      }
    });

    await Promise.all(batchPromises);
  }

  return Array.from(results.values());
}

/**
 * Group subtasks into execution batches based on dependencies.
 * Subtasks in the same batch can run in parallel.
 */
function buildExecutionBatches(
  subtasks: Array<Record<string, any>>
): Array<typeof subtasks> {
  const resolved = new Set<number>();
  const batches: Array<typeof subtasks> = [];
  const remaining: Array<Record<string, any>> = subtasks.map((s, i) => ({ ...s, originalIndex: i }));

  let safety = 0;
  while (remaining.length > 0 && safety < 20) {
    safety++;
    const batch: Array<Record<string, any>> = [];
    const stillRemaining: Array<Record<string, any>> = [];

    for (const subtask of remaining) {
      const deps = (subtask.dependsOn as string[]) || [];
      const allDepsResolved = deps.every((d) => resolved.has(parseInt(d)));

      if (allDepsResolved) {
        batch.push(subtask);
      } else {
        stillRemaining.push(subtask);
      }
    }

    if (batch.length === 0) {
      // Circular dependency or broken deps — force remaining into one batch
      batches.push(stillRemaining);
      break;
    }

    batches.push(batch);
    for (const s of batch) {
      resolved.add(s.originalIndex);
    }
    remaining.length = 0;
    remaining.push(...stillRemaining);
  }

  return batches;
}

// ─── Synthesis Phase ────────────────────────────────────────────────────────

/**
 * Manager reviews all subtask outputs and produces a final deliverable
 */
async function synthesizeResults(
  delegationId: string,
  workspaceId: string,
  manager: {
    id: string;
    name: string;
    roleType: string;
    systemPrompt: string | null;
    tone: string | null;
    modelProvider: string;
    modelName: string;
    temperature: number;
    maxTokens: number;
  },
  goal: string,
  subtaskResults: SubtaskResult[]
): Promise<{ content: string; tokensUsed: number; costUsd: number }> {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });

  const resultsSummary = subtaskResults
    .map((r) => `### ${r.title} (by ${r.assigneeName})\nStatus: ${r.status}\n\n${r.output}`)
    .join("\n\n---\n\n");

  const synthesisPrompt = `You are ${manager.name}, a ${manager.roleType}. Your team has completed all subtasks for the following goal:

**Goal:** ${goal}

**Team Results:**

${resultsSummary}

Now synthesize all results into a polished, comprehensive final deliverable. Combine insights, resolve any inconsistencies, and present a cohesive output that fully addresses the original goal.`;

  const managerConfig = buildManagerLLMConfig(manager);
  const systemPrompt = buildSystemPrompt(
    manager.systemPrompt || "",
    workspace?.name || "Workspace",
    manager.name,
    manager.roleType,
    manager.tone
  );

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: synthesisPrompt },
  ];

  const response = await generateCompletion(messages, managerConfig);
  const cost = estimateCost(
    managerConfig.model,
    response.usage.promptTokens,
    response.usage.completionTokens
  );

  await logDelegationUsage(workspaceId, manager.id, managerConfig, response, "delegation-synthesis");

  return {
    content: response.content,
    tokensUsed: response.usage.totalTokens,
    costUsd: cost,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildManagerLLMConfig(agent: {
  modelProvider: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
}): LLMConfig {
  const configuredProvider = getConfiguredProvider();
  let provider = agent.modelProvider as "openai" | "anthropic";

  // Fall back to whatever provider is configured
  if (!isProviderAvailable(provider) && configuredProvider) {
    provider = configuredProvider;
  }

  return {
    provider,
    model: agent.modelName || process.env.DEFAULT_AI_MODEL || "gpt-4o-mini",
    temperature: agent.temperature ?? 0.7,
    maxTokens: agent.maxTokens ?? 4096,
  };
}

function isProviderAvailable(provider: string): boolean {
  if (provider === "openai") return !!process.env.OPENAI_API_KEY;
  if (provider === "anthropic") return !!process.env.ANTHROPIC_API_KEY;
  return false;
}

async function logDelegationUsage(
  workspaceId: string,
  aiStaffId: string,
  config: LLMConfig,
  response: { usage: { promptTokens: number; completionTokens: number; totalTokens: number }; durationMs: number },
  endpoint: string
) {
  try {
    const cost = estimateCost(config.model, response.usage.promptTokens, response.usage.completionTokens);
    await prisma.usageLog.create({
      data: {
        workspaceId,
        aiStaffId,
        provider: config.provider,
        model: config.model,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        costUsd: cost,
        durationMs: response.durationMs,
        endpoint,
      },
    });
  } catch (err) {
    console.error("Delegation usage log error (non-fatal):", err);
  }
}
