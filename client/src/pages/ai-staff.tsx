import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Network, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiGet, apiPut } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface AIStaff {
  id: number;
  name: string;
  roleType: string;
  status: string;
  description?: string;
  avatarImageUrl?: string;
  modelConfig?: Record<string, unknown>;
  isManager?: boolean;
}

export default function AIStaffPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiPut(`/api/workspaces/${wsId}/ai-staff/${id}`, {
        status: status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-staff", wsId] });
      toast({ title: "Staff status updated" });
    },
  });

  const { data: aiStaff, isLoading } = useQuery({
    queryKey: ["ai-staff", wsId],
    queryFn: () => apiGet<AIStaff[]>(`/api/workspaces/${wsId}/ai-staff`),
    enabled: !!wsId,
  });

  const staffList = Array.isArray(aiStaff) ? aiStaff : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Staff</h1>
          <p className="text-muted-foreground mt-1">
            Manage your AI workforce members
          </p>
        </div>
        <Button onClick={() => navigate("/ai-staff/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Create AI Staff
        </Button>
      </div>

      {/* Staff grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24 mb-3" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : staffList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              No AI Staff Yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Create your first AI staff member to start building your AI
              workforce.
            </p>
            <Button onClick={() => navigate("/ai-staff/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Create AI Staff
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staffList.map((staff) => (
            <Link key={staff.id} href={`/ai-staff/${staff.id}`}>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      {staff.avatarImageUrl && (
                        <AvatarImage src={staff.avatarImageUrl} alt={staff.name} />
                      )}
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {staff.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {staff.name}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge
                            variant={
                              staff.status === "ACTIVE" ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {staff.status}
                          </Badge>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleStatusMutation.mutate({ id: staff.id, status: staff.status });
                            }}
                            className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors ${
                              staff.status === "ACTIVE"
                                ? "text-emerald-400 hover:bg-emerald-500/10"
                                : "text-muted-foreground hover:bg-secondary"
                            }`}
                            title={staff.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          >
                            <Power className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-muted-foreground">
                          {staff.roleType}
                        </p>
                        {staff.isManager && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 bg-violet-500/10 text-violet-400 border-violet-500/30">
                            <Network className="h-2.5 w-2.5" />
                            Manager
                          </Badge>
                        )}
                      </div>
                      {staff.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {staff.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
