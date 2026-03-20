import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.js";

const router = Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticateToken);

// ─── GET /overview — Dashboard summary stats ─────────────────────────────────

router.get("/overview", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const [
      totalStaff,
      activeStaff,
      totalManagers,
      totalWorkflows,
      activeWorkflows,
      totalTasks,
      completedTasks,
      failedTasks,
      pendingApprovals,
      totalThreads,
      totalMessages,
      totalDelegations,
      completedDelegations,
      activeDelegations,
      failedDelegations,
    ] = await Promise.all([
      prisma.aIStaff.count({ where: { workspaceId } }),
      prisma.aIStaff.count({ where: { workspaceId, status: "ACTIVE" } }),
      prisma.aIStaff.count({ where: { workspaceId, isManager: true } }),
      prisma.workflow.count({ where: { workspaceId } }),
      prisma.workflow.count({ where: { workspaceId, status: "ACTIVE" } }),
      prisma.task.count({ where: { workspaceId } }),
      prisma.task.count({ where: { workspaceId, status: "COMPLETED" } }),
      prisma.task.count({ where: { workspaceId, status: "FAILED" } }),
      prisma.task.count({ where: { workspaceId, approvalStatus: "PENDING_APPROVAL" } }),
      prisma.messageThread.count({ where: { workspaceId } }),
      prisma.message.count({
        where: { thread: { workspaceId } },
      }),
      prisma.delegation.count({ where: { workspaceId } }),
      prisma.delegation.count({ where: { workspaceId, status: "COMPLETED" } }),
      prisma.delegation.count({ where: { workspaceId, status: { in: ["PLANNING", "EXECUTING", "REVIEWING"] } } }),
      prisma.delegation.count({ where: { workspaceId, status: "FAILED" } }),
    ]);

    res.json({
      staff: { total: totalStaff, active: activeStaff, managers: totalManagers },
      workflows: { total: totalWorkflows, active: activeWorkflows },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        failed: failedTasks,
        pendingApprovals,
        successRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      conversations: { threads: totalThreads, messages: totalMessages },
      delegations: {
        total: totalDelegations,
        completed: completedDelegations,
        active: activeDelegations,
        failed: failedDelegations,
        successRate: totalDelegations > 0 ? Math.round((completedDelegations / totalDelegations) * 100) : 0,
      },
    });
  } catch (err) {
    console.error("Analytics overview error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /usage — Token usage and cost metrics ───────────────────────────────

router.get("/usage", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { days = "30" } = req.query;
    const daysNum = parseInt(days as string, 10) || 30;

    const since = new Date();
    since.setDate(since.getDate() - daysNum);

    // Aggregate usage
    const usage = await prisma.usageLog.aggregate({
      where: { workspaceId, createdAt: { gte: since } },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        costUsd: true,
      },
      _count: true,
    });

    // Usage by provider
    const byProvider = await prisma.usageLog.groupBy({
      by: ["provider"],
      where: { workspaceId, createdAt: { gte: since } },
      _sum: { totalTokens: true, costUsd: true },
      _count: true,
    });

    // Usage by model
    const byModel = await prisma.usageLog.groupBy({
      by: ["model"],
      where: { workspaceId, createdAt: { gte: since } },
      _sum: { totalTokens: true, costUsd: true },
      _count: true,
    });

    // Usage by AI staff
    const byStaff = await prisma.usageLog.groupBy({
      by: ["aiStaffId"],
      where: { workspaceId, createdAt: { gte: since }, aiStaffId: { not: null } },
      _sum: { totalTokens: true, costUsd: true },
      _count: true,
    });

    // Get staff names for the IDs
    const staffIds = byStaff
      .map((s) => s.aiStaffId)
      .filter((id): id is string => id !== null);
    const staffMembers = staffIds.length > 0
      ? await prisma.aIStaff.findMany({
          where: { id: { in: staffIds } },
          select: { id: true, name: true, roleType: true },
        })
      : [];

    const staffMap = new Map(staffMembers.map((s) => [s.id, s]));

    // Daily usage for chart (last N days)
    const dailyUsage = await prisma.usageLog.groupBy({
      by: ["createdAt"],
      where: { workspaceId, createdAt: { gte: since } },
      _sum: { totalTokens: true, costUsd: true },
      _count: true,
    });

    // Aggregate daily usage by date string
    const dailyMap = new Map<string, { tokens: number; cost: number; requests: number }>();
    for (const entry of dailyUsage) {
      const dateKey = new Date(entry.createdAt).toISOString().split("T")[0];
      const existing = dailyMap.get(dateKey) || { tokens: 0, cost: 0, requests: 0 };
      existing.tokens += entry._sum.totalTokens || 0;
      existing.cost += entry._sum.costUsd || 0;
      existing.requests += entry._count;
      dailyMap.set(dateKey, existing);
    }

    const daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      period: { days: daysNum, since: since.toISOString() },
      totals: {
        promptTokens: usage._sum.promptTokens || 0,
        completionTokens: usage._sum.completionTokens || 0,
        totalTokens: usage._sum.totalTokens || 0,
        costUsd: Math.round((usage._sum.costUsd || 0) * 10000) / 10000,
        requests: usage._count,
      },
      byProvider: byProvider.map((p) => ({
        provider: p.provider,
        totalTokens: p._sum.totalTokens || 0,
        costUsd: Math.round((p._sum.costUsd || 0) * 10000) / 10000,
        requests: p._count,
      })),
      byModel: byModel.map((m) => ({
        model: m.model,
        totalTokens: m._sum.totalTokens || 0,
        costUsd: Math.round((m._sum.costUsd || 0) * 10000) / 10000,
        requests: m._count,
      })),
      byStaff: byStaff.map((s) => ({
        aiStaffId: s.aiStaffId,
        name: staffMap.get(s.aiStaffId!)?.name || "Unknown",
        roleType: staffMap.get(s.aiStaffId!)?.roleType || "unknown",
        totalTokens: s._sum.totalTokens || 0,
        costUsd: Math.round((s._sum.costUsd || 0) * 10000) / 10000,
        requests: s._count,
      })),
      daily,
    });
  } catch (err) {
    console.error("Analytics usage error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /activity — Recent activity feed ────────────────────────────────────

router.get("/activity", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50);

    // Get recent tasks
    const recentTasks = await prisma.task.findMany({
      where: { workspaceId },
      include: {
        aiStaff: { select: { id: true, name: true, roleType: true } },
        workflow: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Get recent messages
    const recentMessages = await prisma.message.findMany({
      where: { thread: { workspaceId }, senderType: "AI_STAFF" },
      include: {
        thread: {
          select: {
            id: true,
            title: true,
            aiStaff: { select: { id: true, name: true, roleType: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Get recent delegations
    const recentDelegations = await prisma.delegation.findMany({
      where: { workspaceId },
      include: {
        manager: { select: { id: true, name: true, roleType: true } },
        _count: { select: { subtasks: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Merge into unified activity feed
    type ActivityItem = {
      type: "task" | "message" | "delegation";
      id: string;
      timestamp: Date;
      staffName: string;
      staffRole: string;
      description: string;
      status?: string;
    };

    const activities: ActivityItem[] = [
      ...recentTasks.map((t) => ({
        type: "task" as const,
        id: t.id,
        timestamp: t.createdAt,
        staffName: t.aiStaff?.name || "Unknown",
        staffRole: t.aiStaff?.roleType || "assistant",
        description: `Workflow "${t.workflow?.name || "Manual"}" — ${t.status.toLowerCase()}`,
        status: t.status,
      })),
      ...recentMessages.map((m) => ({
        type: "message" as const,
        id: m.id,
        timestamp: m.createdAt,
        staffName: m.thread.aiStaff?.name || "Unknown",
        staffRole: m.thread.aiStaff?.roleType || "assistant",
        description: `Replied in "${m.thread.title}"`,
      })),
      ...recentDelegations.map((d) => ({
        type: "delegation" as const,
        id: d.id,
        timestamp: d.createdAt,
        staffName: d.manager.name,
        staffRole: d.manager.roleType,
        description: `Delegation "${d.goal.slice(0, 50)}${d.goal.length > 50 ? "..." : ""}" — ${d.status.toLowerCase()} (${d._count.subtasks} subtasks)`,
        status: d.status,
      })),
    ];

    // Sort by timestamp descending
    activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json({ activities: activities.slice(0, limit) });
  } catch (err) {
    console.error("Analytics activity error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
