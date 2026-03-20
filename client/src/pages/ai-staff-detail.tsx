import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit2, Save, X, Trash2, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
// Avatar components no longer needed – using AvatarGenerator instead
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiGet, apiPut, apiDelete } from "@/lib/api";
import AvatarGenerator, { getAvatarGradient } from "@/components/ai-staff/AvatarGenerator";
import type { AvatarColorTheme } from "@/components/ai-staff/AvatarGenerator";

/** Deterministic color theme for staff based on name hash */
function staffColorTheme(name: string): AvatarColorTheme {
  const themes: AvatarColorTheme[] = ["purple", "blue", "green", "orange", "pink", "cyan"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return themes[Math.abs(h) % themes.length];
}

interface AIStaffDetail {
  id: number;
  name: string;
  roleType: string;
  status: string;
  description?: string;
  avatarImageUrl?: string;
  modelConfig?: Record<string, unknown>;
  isManager?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Workflow {
  id: number;
  name: string;
  status: string;
  triggerType: string;
}

interface MessageThread {
  id: number;
  title: string;
  messageCount: number;
  createdAt: string;
}

export default function AIStaffDetailPage() {
  const params = useParams<{ id: string }>();
  const staffId = params.id;
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editModelConfig, setEditModelConfig] = useState("");
  const [editIsManager, setEditIsManager] = useState(false);

  const { data: staff, isLoading } = useQuery({
    queryKey: ["ai-staff-detail", wsId, staffId],
    queryFn: () =>
      apiGet<AIStaffDetail>(`/api/workspaces/${wsId}/ai-staff/${staffId}`),
    enabled: !!wsId && !!staffId,
  });

  const { data: workflows } = useQuery({
    queryKey: ["staff-workflows", wsId, staffId],
    queryFn: () =>
      apiGet<Workflow[]>(`/api/workspaces/${wsId}/workflows?aiStaffId=${staffId}`),
    enabled: !!wsId && !!staffId,
  });

  const { data: threads } = useQuery({
    queryKey: ["staff-threads", wsId, staffId],
    queryFn: () =>
      apiGet<MessageThread[]>(
        `/api/workspaces/${wsId}/messages/threads?aiStaffId=${staffId}`
      ),
    enabled: !!wsId && !!staffId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      modelConfig?: Record<string, unknown>;
      isManager?: boolean;
    }) => apiPut(`/api/workspaces/${wsId}/ai-staff/${staffId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ai-staff-detail", wsId, staffId],
      });
      queryClient.invalidateQueries({ queryKey: ["ai-staff", wsId] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiDelete(`/api/workspaces/${wsId}/ai-staff/${staffId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-staff", wsId] });
      navigate("/ai-staff");
    },
  });

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this AI staff member? This action cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  const startEditing = () => {
    if (staff) {
      setEditName(staff.name);
      setEditDescription(staff.description || "");
      setEditModelConfig(
        staff.modelConfig ? JSON.stringify(staff.modelConfig, null, 2) : ""
      );
      setEditIsManager(staff.isManager || false);
      setEditing(true);
    }
  };

  const handleSave = () => {
    let modelConfig: Record<string, unknown> | undefined;
    if (editModelConfig) {
      try {
        modelConfig = JSON.parse(editModelConfig);
      } catch {
        return;
      }
    }
    updateMutation.mutate({
      name: editName,
      description: editDescription || undefined,
      modelConfig,
      isManager: editIsManager,
    });
  };

  const workflowList = Array.isArray(workflows) ? workflows : [];
  const threadList = Array.isArray(threads) ? threads : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="space-y-6">
        <Link href="/ai-staff">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to AI Staff
          </Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              AI Staff Not Found
            </h3>
            <p className="text-sm text-muted-foreground">
              This AI staff member could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-center justify-between">
        <Link href="/ai-staff">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to AI Staff
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Badge
            variant={staff.status === "ACTIVE" ? "default" : "secondary"}
          >
            {staff.status}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      {/* Staff header card */}
      <Card className="overflow-hidden">
        {/* Gradient accent bar */}
        <div
          className="h-1"
          style={{ background: getAvatarGradient(staffColorTheme(staff.name)) }}
        />
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <AvatarGenerator
              name={staff.name}
              role={staff.roleType}
              size={80}
              colorTheme={staffColorTheme(staff.name)}
            />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">
                {staff.name}
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{staff.roleType}</p>
                {staff.isManager && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 bg-violet-500/10 text-violet-400 border-violet-500/30">
                    <Network className="h-2.5 w-2.5" />
                    Manager
                  </Badge>
                )}
              </div>
              {staff.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {staff.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workflows">
            Workflows ({workflowList.length})
          </TabsTrigger>
          <TabsTrigger value="messages">
            Messages ({threadList.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Details</CardTitle>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(false)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Manager Agent</Label>
                    <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-secondary/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={editIsManager}
                        onChange={(e) => setEditIsManager(e.target.checked)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <Network className="h-3.5 w-3.5 text-violet-400" />
                          Enable as Manager
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Managers can decompose goals and delegate subtasks to other AI staff
                        </p>
                      </div>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Label>Model Config (JSON)</Label>
                    <Textarea
                      value={editModelConfig}
                      onChange={(e) => setEditModelConfig(e.target.value)}
                      rows={6}
                      className="font-mono text-xs"
                    />
                  </div>
                  {updateMutation.isError && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                      {updateMutation.error instanceof Error
                        ? updateMutation.error.message
                        : "Failed to update"}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Name</p>
                      <p className="text-sm text-foreground">{staff.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Role Type
                      </p>
                      <p className="text-sm text-foreground">
                        {staff.roleType}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Status
                      </p>
                      <Badge
                        variant={
                          staff.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {staff.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Created
                      </p>
                      <p className="text-sm text-foreground">
                        {new Date(staff.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {staff.description && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Description
                        </p>
                        <p className="text-sm text-foreground">
                          {staff.description}
                        </p>
                      </div>
                    </>
                  )}

                  {staff.modelConfig && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          Model Configuration
                        </p>
                        <pre className="rounded-lg bg-secondary p-4 text-xs text-foreground overflow-x-auto">
                          {JSON.stringify(staff.modelConfig, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows tab */}
        <TabsContent value="workflows">
          <Card>
            <CardContent className="p-6">
              {workflowList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No workflows linked to this AI staff member.
                </p>
              ) : (
                <div className="space-y-3">
                  {workflowList.map((wf) => (
                    <div
                      key={wf.id}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {wf.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Trigger: {wf.triggerType}
                        </p>
                      </div>
                      <Badge
                        variant={
                          wf.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {wf.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages tab */}
        <TabsContent value="messages">
          <Card>
            <CardContent className="p-6">
              {threadList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No message threads for this AI staff member.
                </p>
              ) : (
                <div className="space-y-3">
                  {threadList.map((thread) => (
                    <Link
                      key={thread.id}
                      href={`/messages?thread=${thread.id}`}
                    >
                      <div className="flex items-center justify-between rounded-lg border border-border p-4 cursor-pointer hover:bg-secondary transition-colors">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {thread.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {thread.messageCount} messages
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(thread.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
