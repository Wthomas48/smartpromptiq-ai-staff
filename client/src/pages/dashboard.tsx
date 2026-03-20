import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users,
  GitBranch,
  MessageSquare,
  CheckCircle2,
  Plus,
  ArrowRight,
  Clock,
  MessageCircle,
  Zap,
  Calendar,
  Settings2,
  TrendingUp,
  Activity,
  Workflow,
  Send,
  Plug,
  ChevronRight,
  DollarSign,
  BarChart3,
  Network,
  Target,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiGet } from "@/lib/api";
import AvatarGenerator from "@/components/ai-staff/AvatarGenerator";

/* ─── Types ────────────────────────────────────────────────────────── */

interface AIStaff {
  id: string;
  name: string;
  roleType: string;
  status: string;
  description?: string;
  avatarImageUrl?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface WorkflowItem {
  id: string;
  name: string;
  status: string;
  triggerType: string;
  scheduleCron?: string;
  aiStaffId?: string;
  aiStaff?: { id: string; name: string; roleType: string } | null;
}

interface AnalyticsOverview {
  staff: { total: number; active: number };
  workflows: { total: number; active: number };
  tasks: { total: number; completed: number; failed: number; pendingApprovals: number; successRate: number };
  conversations: { threads: number; messages: number };
  delegations?: { total: number; completed: number; active: number; failed: number; successRate: number };
}

interface AnalyticsUsage {
  totals: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number;
    requests: number;
  };
  byStaff: {
    aiStaffId: string;
    name: string;
    roleType: string;
    totalTokens: number;
    costUsd: number;
    requests: number;
  }[];
  daily: { date: string; tokens: number; cost: number; requests: number }[];
}

interface ActivityItem {
  type: "task" | "message";
  id: string;
  timestamp: string;
  staffName: string;
  staffRole: string;
  description: string;
  status?: string;
}

interface DelegationItem {
  id: string;
  goal: string;
  status: string;
  totalCostUsd: number;
  createdAt: string;
  manager: { id: string; name: string; roleType: string };
  _count?: { subtasks: number };
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "Just now";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function cronToHuman(cron?: string | null): string {
  if (!cron) return "Custom schedule";
  const parts = cron.split(" ");
  if (parts.length < 5) return cron;
  const [min, hour, , , dayOfWeek] = parts;
  if (dayOfWeek === "1-5") return `Weekdays at ${hour}:${min.padStart(2, "0")}`;
  if (dayOfWeek === "*" && hour !== "*") return `Daily at ${hour}:${min.padStart(2, "0")}`;
  if (dayOfWeek === "1") return `Mondays at ${hour}:${min.padStart(2, "0")}`;
  return `Scheduled`;
}

function staffColorTheme(name: string): "purple" | "blue" | "green" | "orange" | "pink" | "cyan" {
  const themes = ["purple", "blue", "green", "orange", "pink", "cyan"] as const;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return themes[Math.abs(h) % themes.length];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

/* ─── Stat Card Configs ───────────────────────────────────────────── */

const STAT_CONFIGS = [
  {
    key: "aiStaff",
    title: "AI Staff",
    icon: Users,
    bgGlow: "bg-blue-500/5",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    borderColor: "border-l-blue-500",
  },
  {
    key: "workflows",
    title: "Active Workflows",
    icon: GitBranch,
    bgGlow: "bg-emerald-500/5",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    borderColor: "border-l-emerald-500",
  },
  {
    key: "messages",
    title: "Messages",
    icon: MessageSquare,
    bgGlow: "bg-purple-500/5",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
    borderColor: "border-l-purple-500",
  },
  {
    key: "tasks",
    title: "Tasks Completed",
    icon: CheckCircle2,
    bgGlow: "bg-orange-500/5",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-400",
    borderColor: "border-l-orange-500",
  },
  {
    key: "delegations",
    title: "Delegations",
    icon: Network,
    bgGlow: "bg-violet-500/5",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-400",
    borderColor: "border-l-violet-500",
  },
] as const;

const ACTIVITY_ICONS: Record<string, any> = {
  message: MessageCircle,
  task: CheckCircle2,
  delegation: Network,
};

const ACTIVITY_COLORS: Record<string, string> = {
  message: "text-blue-400 bg-blue-400/10",
  task: "text-orange-400 bg-orange-400/10",
  delegation: "text-violet-400 bg-violet-400/10",
};

const QUICK_ACTIONS = [
  { label: "New Staff", icon: Plus, href: "/ai-staff/create", color: "from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30" },
  { label: "New Workflow", icon: Workflow, href: "/workflows", color: "from-emerald-500/20 to-green-500/20 hover:from-emerald-500/30 hover:to-green-500/30" },
  { label: "Delegate", icon: Network, href: "/delegations", color: "from-violet-500/20 to-purple-500/20 hover:from-violet-500/30 hover:to-purple-500/30" },
  { label: "Messages", icon: Send, href: "/messages", color: "from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30" },
] as const;

/* ─── Skeleton Components ─────────────────────────────────────────── */

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 border-l-4 border-l-white/10">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3.5 w-24 bg-white/[0.06]" />
          <Skeleton className="h-8 w-14 bg-white/[0.06]" />
          <Skeleton className="h-3 w-16 bg-white/[0.06]" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg bg-white/[0.06]" />
      </div>
    </div>
  );
}

function StaffCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-56 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full bg-white/[0.06]" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-24 bg-white/[0.06]" />
          <Skeleton className="h-3 w-16 bg-white/[0.06]" />
        </div>
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <Skeleton className="h-8 w-8 rounded-lg bg-white/[0.06]" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-48 bg-white/[0.06]" />
            <Skeleton className="h-3 w-20 bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  DASHBOARD PAGE                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  /* ── Data fetching ─────────────────────────────────────────────── */

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ["ai-staff", wsId],
    queryFn: () => apiGet<{ staff: AIStaff[] }>(`/api/workspaces/${wsId}/ai-staff`),
    enabled: !!wsId,
  });

  const { data: workflowsData, isLoading: workflowsLoading } = useQuery({
    queryKey: ["workflows", wsId],
    queryFn: () => apiGet<{ workflows: WorkflowItem[] }>(`/api/workspaces/${wsId}/workflows`),
    enabled: !!wsId,
  });

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["analytics-overview", wsId],
    queryFn: () => apiGet<AnalyticsOverview>(`/api/workspaces/${wsId}/analytics/overview`),
    enabled: !!wsId,
    refetchInterval: 30000,
  });

  const { data: usage } = useQuery({
    queryKey: ["analytics-usage", wsId],
    queryFn: () => apiGet<AnalyticsUsage>(`/api/workspaces/${wsId}/analytics/usage?days=30`),
    enabled: !!wsId,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["analytics-activity", wsId],
    queryFn: () => apiGet<{ activities: ActivityItem[] }>(`/api/workspaces/${wsId}/analytics/activity?limit=8`),
    enabled: !!wsId,
    refetchInterval: 15000,
  });

  const { data: delegationsData, isLoading: delegationsLoading } = useQuery({
    queryKey: ["delegations", wsId],
    queryFn: () => apiGet<DelegationItem[]>(`/api/workspaces/${wsId}/delegations`),
    enabled: !!wsId,
    refetchInterval: 15000,
  });

  const recentDelegations = (delegationsData || []).slice(0, 4);

  const staffList = staffData?.staff || [];
  const workflowList = workflowsData?.workflows || [];
  const scheduledWorkflows = useMemo(
    () => workflowList.filter((w) => w.triggerType === "SCHEDULED"),
    [workflowList]
  );
  const activityItems = activityData?.activities || [];

  const isLoading = staffLoading || workflowsLoading || overviewLoading;

  const statValues: Record<string, { value: number; sub?: string }> = {
    aiStaff: {
      value: overview?.staff.total ?? staffList.length,
      sub: `${overview?.staff.active ?? 0} active`,
    },
    workflows: {
      value: overview?.workflows.active ?? workflowList.filter((w) => w.status === "ACTIVE").length,
      sub: `${overview?.workflows.total ?? 0} total`,
    },
    messages: {
      value: overview?.conversations.messages ?? 0,
      sub: `${overview?.conversations.threads ?? 0} threads`,
    },
    tasks: {
      value: overview?.tasks.completed ?? 0,
      sub: overview ? `${overview.tasks.successRate}% success` : undefined,
    },
    delegations: {
      value: overview?.delegations?.total ?? 0,
      sub: overview?.delegations ? `${overview.delegations.completed} completed` : undefined,
    },
  };

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="space-y-8 pb-12 relative">
      {/* Background ambient glows */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/[0.04] rounded-full blur-[120px] pointer-events-none" />

      {/* ─── 1. Welcome Header ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {getGreeting()},{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              {user?.name?.split(" ")[0] || "there"}
            </span>
          </h1>
          <p className="text-sm text-white/40 mt-1.5 flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            {currentWorkspace?.name || "Your workspace"}
          </p>
        </div>
        <Link href="/ai-staff/create">
          <button className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-200 hover:scale-[1.02] cursor-pointer">
            <Plus className="h-4 w-4" />
            Create AI Staff
            <ArrowRight className="h-3.5 w-3.5 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
          </button>
        </Link>
      </div>

      {/* ─── 1.5 Getting Started (shows when workspace is new) ──── */}
      {!isLoading && staffList.length < 3 && (
        <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-blue-500/5 p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <Rocket className="h-4 w-4 text-purple-400" />
            Getting Started
          </h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              {
                done: staffList.length > 0,
                label: "Create AI Staff",
                desc: "Add your first AI team members",
                href: "/ai-staff/create",
              },
              {
                done: staffList.some((s: any) => s.isManager),
                label: "Enable a Manager",
                desc: "Mark a staff member as a manager agent",
                href: "/ai-staff",
              },
              {
                done: (overview?.delegations?.total ?? 0) > 0,
                label: "Run a Delegation",
                desc: "Give your manager a goal to accomplish",
                href: "/delegations",
              },
            ].map((step) => (
              <Link key={step.label} href={step.href}>
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 transition-all cursor-pointer",
                    step.done
                      ? "border-emerald-500/30 bg-emerald-500/5 opacity-60"
                      : "border-white/10 bg-white/[0.02] hover:border-purple-500/30 hover:bg-purple-500/5"
                  )}
                >
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      step.done ? "bg-emerald-500" : "border-2 border-white/20"
                    )}
                  >
                    {step.done && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <p className={cn("text-sm font-medium", step.done ? "text-white/50 line-through" : "text-white/80")}>
                      {step.label}
                    </p>
                    <p className="text-xs text-white/30">{step.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ─── 2. Stats Row ───────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {isLoading
          ? [1, 2, 3, 4, 5].map((i) => <StatCardSkeleton key={i} />)
          : STAT_CONFIGS.map((stat) => {
              const Icon = stat.icon;
              const data = statValues[stat.key];
              return (
                <div
                  key={stat.key}
                  className={`group relative rounded-xl border border-white/[0.06] ${stat.bgGlow} p-5 border-l-4 ${stat.borderColor} transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.03]`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-white mt-2 tabular-nums">
                        {data?.value ?? 0}
                      </p>
                      {data?.sub && (
                        <p className="text-xs text-white/30 mt-1.5">
                          {data.sub}
                        </p>
                      )}
                    </div>
                    <div className={`rounded-lg p-2.5 ${stat.iconBg} transition-colors duration-200 group-hover:bg-white/[0.08]`}>
                      <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* ─── 2.5 Usage Stats Row ────────────────────────────────── */}
      {usage && usage.totals.requests > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Tokens Used</p>
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">
              {formatTokens(usage.totals.totalTokens)}
            </p>
            <p className="text-xs text-white/30 mt-1">
              {usage.totals.requests} requests (30d)
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">AI Cost</p>
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">
              {formatCost(usage.totals.costUsd)}
            </p>
            <p className="text-xs text-white/30 mt-1">Estimated (30d)</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Top Staff</p>
            </div>
            {usage.byStaff.length > 0 ? (
              <>
                <p className="text-lg font-bold text-white truncate">
                  {usage.byStaff[0].name}
                </p>
                <p className="text-xs text-white/30 mt-1">
                  {formatTokens(usage.byStaff[0].totalTokens)} tokens &middot; {usage.byStaff[0].requests} req
                </p>
              </>
            ) : (
              <p className="text-sm text-white/30">No usage yet</p>
            )}
          </div>
        </div>
      )}

      {/* ─── 3. AI Staff Team Section ───────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Your AI Team
          </h2>
          <Link href="/ai-staff">
            <span className="text-xs font-medium text-white/40 hover:text-purple-400 transition-colors duration-200 flex items-center gap-1 cursor-pointer">
              View All
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>

        <div className="overflow-x-auto -mx-1 px-1 pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          <div className="flex gap-4 min-w-0">
            {isLoading ? (
              [1, 2, 3, 4].map((i) => <StaffCardSkeleton key={i} />)
            ) : staffList.length === 0 ? (
              <div className="w-full rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] p-8 text-center">
                <div className="mx-auto h-14 w-14 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
                <p className="text-sm font-medium text-white/60 mb-1">
                  Add your first AI Staff member
                </p>
                <p className="text-xs text-white/30 mb-4">
                  Build your AI-powered team and automate your workflow
                </p>
                <Link href="/ai-staff/create">
                  <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all duration-200 cursor-pointer">
                    <Plus className="h-3.5 w-3.5" />
                    Create Staff
                  </button>
                </Link>
              </div>
            ) : (
              staffList.map((staff) => {
                const statusColor =
                  staff.status === "ACTIVE"
                    ? "bg-emerald-400"
                    : staff.status === "TRAINING"
                      ? "bg-yellow-400"
                      : "bg-white/20";
                const statusLabel =
                  staff.status === "ACTIVE"
                    ? "Active"
                    : staff.status === "TRAINING"
                      ? "Training"
                      : "Inactive";
                return (
                  <div
                    key={staff.id}
                    className="flex-shrink-0 w-60 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] p-4 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <AvatarGenerator
                        name={staff.name}
                        role={staff.roleType}
                        size={48}
                        colorTheme={staffColorTheme(staff.name)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {staff.name}
                        </p>
                        <p className="text-xs text-white/40 truncate">
                          {staff.roleType}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                        <span className="text-[11px] text-white/40">{statusLabel}</span>
                        <span className="text-[11px] text-white/25 ml-1">
                          {timeAgo(staff.updatedAt || staff.createdAt)}
                        </span>
                      </div>
                      <Link href="/messages">
                        <button className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 transition-all duration-200 cursor-pointer">
                          <MessageCircle className="h-3 w-3" />
                          Chat
                        </button>
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ─── 4. Two-Column Layout ───────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* ── Left: Activity Feed ─────────────────────────────── */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" />
              Recent Activity
            </h3>
            <span className="text-[11px] text-white/25 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Live
            </span>
          </div>
          <div className="p-3">
            {activityLoading ? (
              <ActivitySkeleton />
            ) : activityItems.length === 0 ? (
              <div className="py-10 text-center">
                <Activity className="h-8 w-8 text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/30">
                  No activity yet. Create your first AI Staff to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {activityItems.map((item) => {
                  const Icon = ACTIVITY_ICONS[item.type] || CheckCircle2;
                  const colorClass = ACTIVITY_COLORS[item.type] || "text-white/40 bg-white/5";
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors duration-200"
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/70 truncate">
                          <span className="font-medium text-white/80">{item.staffName}</span>{" "}
                          {item.description}
                        </p>
                      </div>
                      <span className="text-[11px] text-white/25 flex-shrink-0">
                        {timeAgo(item.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column ────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Pending Approvals */}
          {overview && overview.tasks.pendingApprovals > 0 && (
            <Link href="/tasks">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3 cursor-pointer hover:bg-amber-500/10 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-300">
                    {overview.tasks.pendingApprovals} Pending Approval{overview.tasks.pendingApprovals > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-amber-300/60">Click to review tasks</p>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-400 ml-auto" />
              </div>
            </Link>
          )}

          {/* Recent Delegations */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Network className="h-4 w-4 text-violet-400" />
                Recent Delegations
              </h3>
              <Link href="/delegations">
                <span className="text-[11px] text-white/40 hover:text-violet-400 transition-colors duration-200 flex items-center gap-1 cursor-pointer">
                  View All
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </div>
            <div className="p-3">
              {delegationsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-3 rounded-lg space-y-2">
                      <Skeleton className="h-4 w-48 bg-white/[0.06]" />
                      <Skeleton className="h-3 w-24 bg-white/[0.06]" />
                    </div>
                  ))}
                </div>
              ) : recentDelegations.length === 0 ? (
                <div className="py-8 text-center">
                  <Target className="h-7 w-7 text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-white/30">No delegations yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentDelegations.map((d) => {
                    const statusStyle =
                      d.status === "COMPLETED"
                        ? "bg-emerald-400/10 text-emerald-400"
                        : d.status === "FAILED"
                          ? "bg-red-400/10 text-red-400"
                          : d.status === "EXECUTING" || d.status === "REVIEWING"
                            ? "bg-blue-400/10 text-blue-400"
                            : "bg-amber-400/10 text-amber-400";
                    return (
                      <Link key={d.id} href="/delegations">
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors duration-200 cursor-pointer">
                          <div className="h-8 w-8 rounded-lg bg-violet-400/10 flex items-center justify-center flex-shrink-0">
                            <Network className="h-4 w-4 text-violet-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/70 truncate">
                              {d.goal.length > 40 ? d.goal.slice(0, 40) + "..." : d.goal}
                            </p>
                            <p className="text-[11px] text-white/30">
                              {d.manager.name} &middot; {timeAgo(d.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyle}`}
                          >
                            {d.status}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Workflows */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-400" />
                Scheduled Workflows
              </h3>
            </div>
            <div className="p-3">
              {workflowsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-3 rounded-lg space-y-2">
                      <Skeleton className="h-4 w-32 bg-white/[0.06]" />
                      <Skeleton className="h-3 w-24 bg-white/[0.06]" />
                    </div>
                  ))}
                </div>
              ) : scheduledWorkflows.length === 0 ? (
                <div className="py-8 text-center">
                  <Calendar className="h-7 w-7 text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-white/30">No scheduled workflows yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {scheduledWorkflows.slice(0, 4).map((wf) => (
                    <div
                      key={wf.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors duration-200"
                    >
                      <div className="h-8 w-8 rounded-lg bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
                        <Zap className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/70 truncate">{wf.name}</p>
                        <p className="text-[11px] text-white/30">
                          {wf.aiStaff?.name || "Unassigned"} &middot; {cronToHuman(wf.scheduleCron)}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          wf.status === "ACTIVE"
                            ? "bg-emerald-400/10 text-emerald-400"
                            : "bg-white/[0.06] text-white/30"
                        }`}
                      >
                        {wf.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                Quick Actions
              </h3>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.label} href={action.href}>
                    <button
                      className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-lg bg-gradient-to-br ${action.color} border border-white/[0.04] transition-all duration-200 hover:border-white/[0.1] hover:scale-[1.02] cursor-pointer group`}
                    >
                      <Icon className="h-4 w-4 text-white/60 group-hover:text-white/80 transition-colors" />
                      <span className="text-xs font-medium text-white/60 group-hover:text-white/80 transition-colors">
                        {action.label}
                      </span>
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
