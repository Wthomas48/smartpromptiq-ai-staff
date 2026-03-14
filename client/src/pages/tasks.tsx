import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  Check,
  X,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiGet, apiPut } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TaskAIStaff {
  id: string;
  name: string;
  roleType: string;
  avatarConfig: Record<string, unknown>;
}

interface TaskWorkflow {
  id: string;
  name: string;
}

interface Task {
  id: string;
  status: string;
  approvalStatus: string;
  approvalNote: string | null;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  aiStaff: TaskAIStaff | null;
  workflow: TaskWorkflow | null;
}

type FilterTab = "ALL" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

// ─── Helpers ────────────────────────────────────────────────────────────────

const roleGradients: Record<string, string> = {
  "Content Writer": "from-violet-500 to-purple-600",
  "SEO Specialist": "from-emerald-500 to-teal-600",
  "Social Media Manager": "from-pink-500 to-rose-600",
  "Data Analyst": "from-cyan-500 to-blue-600",
  "Customer Support": "from-amber-500 to-orange-600",
  "Sales Rep": "from-red-500 to-pink-600",
  "Marketing Strategist": "from-indigo-500 to-violet-600",
  "Project Manager": "from-sky-500 to-cyan-600",
  default: "from-slate-500 to-zinc-600",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getGradient(roleType: string): string {
  return roleGradients[roleType] || roleGradients.default;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOutputPreview(payload: Record<string, unknown>): string {
  if (!payload || Object.keys(payload).length === 0) return "No output yet";
  const text =
    typeof payload.message === "string"
      ? payload.message
      : JSON.stringify(payload);
  return text.length > 200 ? text.slice(0, 200) + "..." : text;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const [activeFilter, setActiveFilter] = useState<FilterTab>("ALL");
  const [actionTaskId, setActionTaskId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [noteText, setNoteText] = useState("");
  const [rerunOnReject, setRerunOnReject] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // ─── Query ──────────────────────────────────────────────────────────────

  const queryParams =
    activeFilter === "ALL" ? "" : `?approvalStatus=${activeFilter}`;

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", wsId, activeFilter],
    queryFn: () =>
      apiGet<{ tasks: Task[] }>(
        `/api/workspaces/${wsId}/tasks${queryParams}`
      ),
    enabled: !!wsId,
  });

  const tasks = data?.tasks ?? [];

  // ─── Mutations ──────────────────────────────────────────────────────────

  const approveMutation = useMutation({
    mutationFn: ({ taskId, note }: { taskId: string; note?: string }) =>
      apiPut(`/api/workspaces/${wsId}/tasks/${taskId}/approve`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", wsId] });
      resetAction();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      taskId,
      note,
      rerun,
    }: {
      taskId: string;
      note?: string;
      rerun?: boolean;
    }) =>
      apiPut(`/api/workspaces/${wsId}/tasks/${taskId}/reject`, { note, rerun }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", wsId] });
      resetAction();
    },
  });

  function resetAction() {
    setActionTaskId(null);
    setActionType(null);
    setNoteText("");
    setRerunOnReject(false);
  }

  function openAction(taskId: string, type: "approve" | "reject") {
    if (actionTaskId === taskId && actionType === type) {
      resetAction();
      return;
    }
    setActionTaskId(taskId);
    setActionType(type);
    setNoteText("");
    setRerunOnReject(false);
  }

  function submitAction() {
    if (!actionTaskId || !actionType) return;
    if (actionType === "approve") {
      approveMutation.mutate({
        taskId: actionTaskId,
        note: noteText || undefined,
      });
    } else {
      rejectMutation.mutate({
        taskId: actionTaskId,
        note: noteText || undefined,
        rerun: rerunOnReject,
      });
    }
  }

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  // ─── Status badges ─────────────────────────────────────────────────────

  function statusBadge(status: string) {
    const map: Record<string, { label: string; className: string }> = {
      PENDING: {
        label: "Pending",
        className:
          "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      },
      RUNNING: {
        label: "Running",
        className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      },
      COMPLETED: {
        label: "Completed",
        className:
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      },
      FAILED: {
        label: "Failed",
        className: "bg-red-500/10 text-red-400 border-red-500/20",
      },
    };
    const info = map[status] || {
      label: status,
      className: "bg-muted text-muted-foreground",
    };
    return (
      <Badge variant="outline" className={info.className}>
        {info.label}
      </Badge>
    );
  }

  function approvalBadge(approvalStatus: string) {
    const map: Record<string, { label: string; className: string }> = {
      NONE: {
        label: "No Review",
        className: "bg-muted text-muted-foreground border-border",
      },
      PENDING_APPROVAL: {
        label: "Awaiting Review",
        className:
          "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse",
      },
      APPROVED: {
        label: "Approved",
        className:
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      },
      REJECTED: {
        label: "Rejected",
        className: "bg-red-500/10 text-red-400 border-red-500/20",
      },
    };
    const info = map[approvalStatus] || {
      label: approvalStatus,
      className: "bg-muted text-muted-foreground",
    };
    return (
      <Badge variant="outline" className={info.className}>
        {info.label}
      </Badge>
    );
  }

  // ─── Filter tabs ────────────────────────────────────────────────────────

  const filters: { key: FilterTab; label: string; count?: number }[] = [
    { key: "ALL", label: "All" },
    { key: "PENDING_APPROVAL", label: "Pending Approval" },
    { key: "APPROVED", label: "Approved" },
    { key: "REJECTED", label: "Rejected" },
  ];

  // ─── Empty state messages ──────────────────────────────────────────────

  function emptyMessage(): { title: string; subtitle: string } {
    switch (activeFilter) {
      case "PENDING_APPROVAL":
        return {
          title: "No Tasks Awaiting Approval",
          subtitle:
            "When your AI staff completes work, it will appear here for your review.",
        };
      case "APPROVED":
        return {
          title: "No Approved Tasks",
          subtitle:
            "Tasks you approve will show up here. Run a workflow to get started.",
        };
      case "REJECTED":
        return {
          title: "No Rejected Tasks",
          subtitle: "Tasks you reject will appear here for reference.",
        };
      default:
        return {
          title: "No Tasks Yet",
          subtitle:
            "Run a workflow to create tasks for your AI staff. You will review and control their output here.",
        };
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="h-7 w-7 text-primary" />
            Task Queue
          </h1>
          <p className="text-muted-foreground mt-1">
            Review, approve, or reject your AI team's output
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-card border border-border p-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              activeFilter === f.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {emptyMessage().title}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {emptyMessage().subtitle}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const isExpanded = expandedTaskId === task.id;
            const isActioning = actionTaskId === task.id;

            return (
              <Card
                key={task.id}
                className="border-border bg-card hover:border-primary/30 transition-colors"
              >
                <CardContent className="p-5">
                  {/* Main row */}
                  <div className="flex items-start gap-4">
                    {/* AI Staff avatar */}
                    <div
                      className={`h-10 w-10 rounded-full bg-gradient-to-br ${getGradient(
                        task.aiStaff?.roleType || ""
                      )} flex items-center justify-center flex-shrink-0 shadow-lg`}
                    >
                      <span className="text-xs font-bold text-white">
                        {task.aiStaff
                          ? getInitials(task.aiStaff.name)
                          : "??"}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">
                          {task.aiStaff?.name || "Unknown Staff"}
                        </h3>
                        {task.aiStaff?.roleType && (
                          <span className="text-xs text-muted-foreground">
                            {task.aiStaff.roleType}
                          </span>
                        )}
                      </div>

                      {task.workflow && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Workflow: {task.workflow.name}
                        </p>
                      )}

                      {/* Badges */}
                      <div className="flex items-center gap-2 mt-2">
                        {statusBadge(task.status)}
                        {approvalBadge(task.approvalStatus)}
                      </div>

                      {/* Output preview */}
                      <div className="mt-3">
                        <button
                          onClick={() =>
                            setExpandedTaskId(isExpanded ? null : task.id)
                          }
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                          Output
                        </button>
                        {isExpanded && (
                          <div className="mt-2 rounded-md bg-secondary/50 border border-border p-3">
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                              {getOutputPreview(task.outputPayload)}
                            </pre>
                          </div>
                        )}
                      </div>

                      {/* Timestamps */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created {formatDate(task.createdAt)}
                        </span>
                        {task.startedAt && (
                          <span>Started {formatDate(task.startedAt)}</span>
                        )}
                        {task.finishedAt && (
                          <span>Finished {formatDate(task.finishedAt)}</span>
                        )}
                      </div>

                      {/* Approval note if exists */}
                      {task.approvalNote && (
                        <div className="mt-2 rounded-md bg-secondary/30 border border-border px-3 py-2">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              Note:
                            </span>{" "}
                            {task.approvalNote}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {task.approvalStatus === "PENDING_APPROVAL" && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant={
                            isActioning && actionType === "approve"
                              ? "default"
                              : "outline"
                          }
                          className={
                            isActioning && actionType === "approve"
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                              : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                          }
                          onClick={() => openAction(task.id, "approve")}
                          disabled={isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            isActioning && actionType === "reject"
                              ? "default"
                              : "outline"
                          }
                          className={
                            isActioning && actionType === "reject"
                              ? "bg-red-600 hover:bg-red-700 text-white border-red-600"
                              : "border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          }
                          onClick={() => openAction(task.id, "reject")}
                          disabled={isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Action panel (note input) */}
                  {isActioning && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="space-y-3">
                        <Textarea
                          placeholder={
                            actionType === "approve"
                              ? "Add an approval note (optional)..."
                              : "Add a rejection reason (optional)..."
                          }
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          rows={2}
                          className="text-sm"
                        />

                        {actionType === "reject" && task.workflow && (
                          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rerunOnReject}
                              onChange={(e) =>
                                setRerunOnReject(e.target.checked)
                              }
                              className="rounded border-border"
                            />
                            <RefreshCw className="h-3.5 w-3.5" />
                            Re-run this workflow after rejecting
                          </label>
                        )}

                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={resetAction}
                            disabled={isPending}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={submitAction}
                            disabled={isPending}
                            className={
                              actionType === "approve"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                            }
                          >
                            {isPending ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : actionType === "approve" ? (
                              <Check className="h-4 w-4 mr-1" />
                            ) : (
                              <X className="h-4 w-4 mr-1" />
                            )}
                            {actionType === "approve"
                              ? "Confirm Approval"
                              : "Confirm Rejection"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
