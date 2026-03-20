import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ScrollText,
  User,
  Bot,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiGet } from "@/lib/api";

interface AuditLog {
  id: string;
  actorType: string;
  actorId: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
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

function actorIcon(type: string) {
  switch (type) {
    case "USER":
      return <User className="h-3.5 w-3.5" />;
    case "AI_STAFF":
      return <Bot className="h-3.5 w-3.5" />;
    default:
      return <Settings className="h-3.5 w-3.5" />;
  }
}

function actorColor(type: string) {
  switch (type) {
    case "USER":
      return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    case "AI_STAFF":
      return "bg-violet-500/10 text-violet-400 border-violet-500/30";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/30";
  }
}

export default function AuditLogsPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageSize = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", wsId, page],
    queryFn: () =>
      apiGet<AuditLogsResponse>(
        `/api/workspaces/${wsId}/audit-logs?limit=${pageSize}&offset=${page * pageSize}`
      ),
    enabled: !!wsId,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          Track all activity in your workspace
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ScrollText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              No Activity Yet
            </h3>
            <p className="text-sm text-muted-foreground">
              Actions taken in your workspace will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-1.5">
            {logs.map((log) => {
              const isExpanded = expandedId === log.id;
              const hasMetadata =
                log.metadata &&
                Object.keys(log.metadata).length > 0;

              return (
                <Card key={log.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${actorColor(log.actorType).split(" ").slice(0, 1).join(" ")}`}
                      >
                        {actorIcon(log.actorType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-foreground font-medium truncate">
                            {log.action}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${actorColor(log.actorType)}`}
                          >
                            {log.actorType}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(log.createdAt)} ·{" "}
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {hasMetadata && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : log.id)
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                    {isExpanded && hasMetadata && (
                      <div className="mt-2 rounded-md bg-secondary/50 border border-border p-2">
                        <pre className="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {page * pageSize + 1}-
                {Math.min((page + 1) * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
