/**
 * Delegation Scheduler — Runs recurring delegations on their cron schedule
 *
 * Checks every 60 seconds for delegations that are due to run.
 * Uses a simple interval-based approach (no external cron library needed).
 */

import { PrismaClient } from "@prisma/client";
import { executeDelegation } from "./delegationEngine.js";

const prisma = new PrismaClient();

/**
 * Parse a cron expression and check if it matches the current time (minute-level).
 * Supports: minute hour day-of-month month day-of-week
 */
function cronMatchesNow(cron: string): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return false;

  const now = new Date();
  const [cronMin, cronHour, cronDom, cronMonth, cronDow] = parts;

  return (
    matchField(cronMin, now.getMinutes()) &&
    matchField(cronHour, now.getHours()) &&
    matchField(cronDom, now.getDate()) &&
    matchField(cronMonth, now.getMonth() + 1) &&
    matchField(cronDow, now.getDay())
  );
}

function matchField(field: string, value: number): boolean {
  if (field === "*") return true;

  // Handle ranges like 1-5
  if (field.includes("-")) {
    const [start, end] = field.split("-").map(Number);
    return value >= start && value <= end;
  }

  // Handle lists like 1,15
  if (field.includes(",")) {
    return field.split(",").map(Number).includes(value);
  }

  // Handle step values like */5
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2));
    return step > 0 && value % step === 0;
  }

  // Exact match
  return parseInt(field) === value;
}

/**
 * Check for and execute any due scheduled delegations
 */
async function checkScheduledDelegations() {
  try {
    const recurringDelegations = await prisma.delegation.findMany({
      where: {
        isRecurring: true,
        scheduleCron: { not: null },
        status: { in: ["COMPLETED", "FAILED"] },
      },
      include: {
        manager: { select: { id: true, status: true } },
      },
    });

    for (const delegation of recurringDelegations) {
      if (!delegation.scheduleCron) continue;
      if (delegation.manager.status !== "ACTIVE") continue;

      // Check if cron matches current time
      if (!cronMatchesNow(delegation.scheduleCron)) continue;

      // Check if already run this minute (prevent double execution)
      if (delegation.lastRunAt) {
        const lastRunMinute = Math.floor(delegation.lastRunAt.getTime() / 60000);
        const nowMinute = Math.floor(Date.now() / 60000);
        if (lastRunMinute === nowMinute) continue;
      }

      console.log(`[Scheduler] Running scheduled delegation: ${delegation.id} (${delegation.goal.slice(0, 50)}...)`);

      // Reset and re-run
      await prisma.delegationSubtask.deleteMany({ where: { delegationId: delegation.id } });
      await prisma.delegation.update({
        where: { id: delegation.id },
        data: {
          status: "PLANNING",
          plan: [],
          finalOutput: null,
          totalTokensUsed: 0,
          totalCostUsd: 0,
          startedAt: null,
          finishedAt: null,
          lastRunAt: new Date(),
          runCount: { increment: 1 },
        },
      });

      // Execute in background (don't await)
      executeDelegation(delegation.id, delegation.workspaceId).catch((err) => {
        console.error(`[Scheduler] Delegation ${delegation.id} failed:`, err);
      });
    }
  } catch (err) {
    console.error("[Scheduler] Error checking scheduled delegations:", err);
  }
}

/**
 * Start the scheduler (runs every 60 seconds)
 */
export function startScheduler() {
  console.log("[Scheduler] Started — checking for scheduled delegations every 60s");

  // Run immediately on startup
  checkScheduledDelegations();

  // Then every 60 seconds
  setInterval(checkScheduledDelegations, 60_000);
}
