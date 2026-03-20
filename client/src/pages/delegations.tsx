import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Network,
  Plus,
  Play,
  Eye,
  Trash2,
  Loader2,
  Target,
  CheckCircle2,
  XCircle,
  Clock,
  Brain,
  ChevronDown,
  ChevronUp,
  Users,
  ArrowRight,
  RotateCcw,
  Copy,
  Check,
  Search,
  Timer,
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AIStaff {
  id: string;
  name: string;
  roleType: string;
  isManager: boolean;
  status: string;
}

interface DelegationSubtask {
  id: string;
  title: string;
  instructions: string;
  orderIndex: number;
  status: string;
  output: string | null;
  tokensUsed: number;
  costUsd: number;
  durationMs: number;
  assignee: { id: string; name: string; roleType: string } | null;
}

interface SubtaskSummary {
  id: string;
  status: string;
  title: string;
}

interface Delegation {
  id: string;
  goal: string;
  context: string | null;
  status: string;
  finalOutput: string | null;
  totalTokensUsed: number;
  totalCostUsd: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  manager: { id: string; name: string; roleType: string };
  subtasks?: (DelegationSubtask | SubtaskSummary)[];
  _count?: { subtasks: number };
}

// ─── Schemas ────────────────────────────────────────────────────────────────

const createDelegationSchema = z.object({
  managerId: z.string().min(1, "Select a manager"),
  goal: z.string().min(1, "Goal is required").max(5000),
  context: z.string().max(10000).optional(),
});

type CreateDelegationForm = z.infer<typeof createDelegationSchema>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "FAILED":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "EXECUTING":
    case "REVIEWING":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "PLANNING":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle2 className="h-4 w-4" />;
    case "FAILED":
      return <XCircle className="h-4 w-4" />;
    case "EXECUTING":
    case "REVIEWING":
      return <Loader2 className="h-4 w-4 animate-spin" />;
    case "PLANNING":
      return <Brain className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function subtaskStatusColor(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-500/15 border-emerald-500/30";
    case "FAILED":
      return "bg-red-500/15 border-red-500/30";
    case "RUNNING":
      return "bg-blue-500/15 border-blue-500/30";
    case "PENDING":
      return "bg-gray-500/10 border-gray-500/20";
    default:
      return "bg-gray-500/10 border-gray-500/20";
  }
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DelegationsPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDelegation, setSelectedDelegation] = useState<Delegation | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  // ── Data Fetching ───────────────────────────────────────────────────────

  const { data: delegationsData, isLoading } = useQuery({
    queryKey: ["delegations", wsId],
    queryFn: () =>
      apiGet<Delegation[]>(`/api/workspaces/${wsId}/delegations`),
    enabled: !!wsId,
    refetchInterval: 10000,
  });

  const { data: staffData } = useQuery({
    queryKey: ["ai-staff", wsId],
    queryFn: async () => {
      const res = await apiGet<{ staff: AIStaff[] }>(
        `/api/workspaces/${wsId}/ai-staff`
      );
      return res.staff;
    },
    enabled: !!wsId,
  });

  const delegations = delegationsData || [];

  // Track status changes for toast notifications
  const prevStatusRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const prevMap = prevStatusRef.current;
    for (const d of delegations) {
      const prev = prevMap.get(d.id);
      if (prev && prev !== d.status) {
        if (d.status === "COMPLETED") {
          toast({
            title: "Delegation completed",
            description: d.goal.length > 60 ? d.goal.slice(0, 60) + "..." : d.goal,
          });
        } else if (d.status === "FAILED") {
          toast({
            title: "Delegation failed",
            description: d.goal.length > 60 ? d.goal.slice(0, 60) + "..." : d.goal,
            variant: "destructive",
          });
        }
      }
    }
    const newMap = new Map<string, string>();
    for (const d of delegations) newMap.set(d.id, d.status);
    prevStatusRef.current = newMap;
  }, [delegations]);
  const staff = staffData || [];
  const managers = staff.filter((s) => s.isManager && s.status === "ACTIVE");

  const filteredDelegations = delegations
    .filter((d) => activeFilter === "ALL" || d.status === activeFilter)
    .filter((d) =>
      searchQuery === "" ||
      d.goal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.manager.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // ── Form ────────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateDelegationForm>({
    resolver: zodResolver(createDelegationSchema),
  });

  // ── Mutations ───────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: CreateDelegationForm) =>
      apiPost(`/api/workspaces/${wsId}/delegations`, {
        managerId: data.managerId,
        goal: data.goal,
        context: data.context || undefined,
        autoExecute: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegations", wsId] });
      setCreateOpen(false);
      reset();
      toast({ title: "Delegation created", description: "Manager agent is planning and executing..." });
    },
  });

  const runMutation = useMutation({
    mutationFn: (delegationId: string) =>
      apiPost(`/api/workspaces/${wsId}/delegations/${delegationId}/run`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegations", wsId] });
    },
  });

  const rerunMutation = useMutation({
    mutationFn: (delegationId: string) =>
      apiPost(`/api/workspaces/${wsId}/delegations/${delegationId}/rerun`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegations", wsId] });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (delegation: Delegation) =>
      apiPost(`/api/workspaces/${wsId}/delegations`, {
        managerId: delegation.manager.id,
        goal: delegation.goal,
        context: delegation.context || undefined,
        autoExecute: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegations", wsId] });
      toast({ title: "Delegation cloned", description: "Running again with the same goal..." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (delegationId: string) =>
      apiDelete(`/api/workspaces/${wsId}/delegations/${delegationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegations", wsId] });
    },
  });

  // ── Detail View ─────────────────────────────────────────────────────────

  const { data: delegationDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["delegation-detail", wsId, selectedDelegation?.id],
    queryFn: () =>
      apiGet<Delegation>(
        `/api/workspaces/${wsId}/delegations/${selectedDelegation?.id}`
      ),
    enabled: !!wsId && !!selectedDelegation?.id && detailOpen,
    refetchInterval: selectedDelegation?.status === "EXECUTING" || selectedDelegation?.status === "REVIEWING" || selectedDelegation?.status === "PLANNING" ? 3000 : false,
  });

  // ── Handlers ────────────────────────────────────────────────────────────

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDuration(startStr: string | null, endStr: string | null): string {
    if (!startStr || !endStr) return "";
    const ms = new Date(endStr).getTime() - new Date(startStr).getTime();
    if (ms < 1000) return `${ms}ms`;
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}m ${remSecs}s`;
  }

  function onSubmit(data: CreateDelegationForm) {
    createMutation.mutate(data);
  }

  function openDetail(delegation: Delegation) {
    setSelectedDelegation(delegation);
    setDetailOpen(true);
  }

  // ── Filter Tabs ─────────────────────────────────────────────────────────

  const filters = [
    { key: "ALL", label: "All" },
    { key: "PLANNING", label: "Planning" },
    { key: "EXECUTING", label: "Executing" },
    { key: "COMPLETED", label: "Completed" },
    { key: "FAILED", label: "Failed" },
  ];

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Delegations</h1>
          <p className="text-muted-foreground mt-1">
            Assign goals to manager agents who delegate work to your AI team
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Delegation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Delegation</DialogTitle>
              <DialogDescription>
                Give a manager agent a goal. They'll decompose it into subtasks,
                delegate to specialists, and synthesize the results.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Manager Agent</Label>
                {managers.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-secondary/50 rounded-md p-3">
                    No manager agents found. Mark an AI staff member as a manager
                    first (edit staff → enable "Manager" toggle).
                  </p>
                ) : (
                  <Select onValueChange={(val) => setValue("managerId", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a manager..." />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-2">
                            <Network className="h-3.5 w-3.5 text-primary" />
                            <span>{m.name}</span>
                            <span className="text-muted-foreground">
                              — {m.roleType}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.managerId && (
                  <p className="text-xs text-red-400">
                    {errors.managerId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">Goal</Label>
                <Textarea
                  id="goal"
                  placeholder="e.g., Prepare a quarterly marketing report with competitor analysis and recommendations"
                  className="min-h-[100px]"
                  {...register("goal")}
                />
                {errors.goal && (
                  <p className="text-xs text-red-400">{errors.goal.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="context">
                  Additional Context{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="context"
                  placeholder="Any extra info, data, or constraints the manager should know about..."
                  className="min-h-[60px]"
                  {...register("context")}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || managers.length === 0}
                  className="gap-2"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Delegate & Run
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg bg-card border border-border p-1 w-fit">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeFilter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search goals or managers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Delegation List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDelegations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Network className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {activeFilter === "ALL"
                ? "No Delegations Yet"
                : `No ${activeFilter.toLowerCase()} delegations`}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Create a delegation to give a manager agent a goal. They'll
              coordinate your AI team to complete it.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Delegation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDelegations.map((delegation) => {
            const isExpanded = expandedId === delegation.id;
            return (
              <Card key={delegation.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Main Row */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="mt-0.5">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {delegation.manager.name.charAt(0)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground truncate max-w-md">
                            {delegation.goal.length > 80
                              ? delegation.goal.slice(0, 80) + "..."
                              : delegation.goal}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            Manager:{" "}
                            <span className="text-foreground font-medium">
                              {delegation.manager.name}
                            </span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ·
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(delegation.createdAt)}
                          </span>
                          {delegation._count && (
                            <>
                              <span className="text-xs text-muted-foreground">
                                ·
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {delegation._count.subtasks} subtasks
                              </span>
                            </>
                          )}
                          {delegation.totalCostUsd > 0 && (
                            <>
                              <span className="text-xs text-muted-foreground">
                                ·
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatCost(delegation.totalCostUsd)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant="outline"
                        className={`gap-1 ${statusColor(delegation.status)}`}
                      >
                        {statusIcon(delegation.status)}
                        {delegation.status}
                      </Badge>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDetail(delegation)}
                        className="gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>

                      {delegation.status === "PLANNING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runMutation.mutate(delegation.id)}
                          disabled={runMutation.isPending}
                          className="gap-1"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Run
                        </Button>
                      )}

                      {delegation.status === "FAILED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rerunMutation.mutate(delegation.id)}
                          disabled={rerunMutation.isPending}
                          className="gap-1"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Re-run
                        </Button>
                      )}

                      {delegation.status === "COMPLETED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cloneMutation.mutate(delegation)}
                          disabled={cloneMutation.isPending}
                          className="gap-1"
                          title="Clone & re-run with same goal"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Clone
                        </Button>
                      )}

                      {(delegation.status === "COMPLETED" ||
                        delegation.status === "FAILED") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(delegation.id)}
                          disabled={deleteMutation.isPending}
                          className="text-muted-foreground hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : delegation.id)
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {delegation.subtasks && delegation.subtasks.length > 0 && delegation.status !== "PLANNING" && (
                    <ProgressBar subtasks={delegation.subtasks} />
                  )}

                  {/* Expanded: show final output preview */}
                  {isExpanded && delegation.finalOutput && (
                    <div className="mt-3 rounded-md bg-secondary/50 border border-border p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Final Output
                      </p>
                      <pre className="text-xs text-foreground whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                        {delegation.finalOutput.length > 500
                          ? delegation.finalOutput.slice(0, 500) + "..."
                          : delegation.finalOutput}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailLoading ? (
            <div className="space-y-4 py-8">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : delegationDetail ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`gap-1 ${statusColor(delegationDetail.status)}`}
                  >
                    {statusIcon(delegationDetail.status)}
                    {delegationDetail.status}
                  </Badge>
                  {delegationDetail.totalCostUsd > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {formatCost(delegationDetail.totalCostUsd)} ·{" "}
                      {delegationDetail.totalTokensUsed.toLocaleString()} tokens
                    </span>
                  )}
                  {delegationDetail.startedAt && delegationDetail.finishedAt && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {formatDuration(delegationDetail.startedAt, delegationDetail.finishedAt)}
                    </span>
                  )}
                </div>
                <DialogTitle className="text-left mt-2">
                  {delegationDetail.goal}
                </DialogTitle>
                {delegationDetail.context && (
                  <DialogDescription className="text-left">
                    {delegationDetail.context}
                  </DialogDescription>
                )}
              </DialogHeader>

              {/* Manager Info */}
              <div className="flex items-center gap-2 py-2 px-3 rounded-md bg-secondary/30 border border-border">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                  {delegationDetail.manager.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {delegationDetail.manager.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {delegationDetail.manager.roleType} · Manager Agent
                  </p>
                </div>
              </div>

              {/* Subtasks */}
              {delegationDetail.subtasks &&
                delegationDetail.subtasks.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Subtasks ({delegationDetail.subtasks.length})
                    </h3>
                    <div className="space-y-2">
                      {delegationDetail.subtasks.map((subtask, idx) => (
                        <SubtaskCard
                          key={subtask.id}
                          subtask={subtask as DelegationSubtask}
                          index={idx}
                        />
                      ))}
                    </div>
                  </div>
                )}

              {/* Final Output */}
              {delegationDetail.finalOutput && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Final Deliverable
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 h-7 text-xs"
                      onClick={() => copyToClipboard(delegationDetail.finalOutput!)}
                    >
                      {copied ? (
                        <><Check className="h-3 w-3 text-emerald-400" /> Copied</>
                      ) : (
                        <><Copy className="h-3 w-3" /> Copy</>
                      )}
                    </Button>
                  </div>
                  <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-4">
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                      {delegationDetail.finalOutput}
                    </pre>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Delegation not found.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Progress Bar ───────────────────────────────────────────────────────────

function ProgressBar({ subtasks }: { subtasks: Array<{ status: string; title: string }> }) {
  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.status === "COMPLETED").length;
  const failed = subtasks.filter((s) => s.status === "FAILED").length;
  const running = subtasks.filter((s) => s.status === "RUNNING").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {completed}/{total} subtasks complete
          {running > 0 && ` · ${running} running`}
          {failed > 0 && ` · ${failed} failed`}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden flex">
        {completed > 0 && (
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        )}
        {running > 0 && (
          <div
            className="h-full bg-blue-500 animate-pulse transition-all duration-500"
            style={{ width: `${(running / total) * 100}%` }}
          />
        )}
        {failed > 0 && (
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${(failed / total) * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Subtask Card ───────────────────────────────────────────────────────────

function SubtaskCard({
  subtask,
  index,
}: {
  subtask: DelegationSubtask;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${subtaskStatusColor(subtask.status)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <span className="text-xs text-muted-foreground font-mono mt-0.5">
            #{index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">
                {subtask.title}
              </p>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${statusColor(subtask.status)}`}
              >
                {subtask.status}
              </Badge>
            </div>
            {subtask.assignee && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {subtask.assignee.name}{" "}
                <span className="text-muted-foreground/60">
                  ({subtask.assignee.roleType})
                </span>
              </p>
            )}
          </div>
        </div>

        {subtask.output && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>

      {/* Expanded output */}
      {expanded && subtask.output && (
        <div className="mt-2 rounded-md bg-background/50 border border-border p-2">
          <div className="flex items-center gap-3 mb-1">
            {subtask.tokensUsed > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {subtask.tokensUsed.toLocaleString()} tokens
              </span>
            )}
            {subtask.costUsd > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {formatCost(subtask.costUsd)}
              </span>
            )}
            {subtask.durationMs > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {(subtask.durationMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          <pre className="text-xs text-foreground whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
            {subtask.output}
          </pre>
        </div>
      )}
    </div>
  );
}
