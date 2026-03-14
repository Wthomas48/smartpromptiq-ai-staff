import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Play, GitBranch, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

interface Workflow {
  id: number;
  name: string;
  status: string;
  triggerType: string;
  scheduleCron?: string;
  aiStaffId: number;
  stepsJson?: unknown;
  createdAt: string;
}

interface AIStaff {
  id: number;
  name: string;
  roleType: string;
}

const createWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  aiStaffId: z.string().min(1, "AI Staff is required"),
  triggerType: z.string().min(1, "Trigger type is required"),
  scheduleCron: z.string().optional(),
  stepsJson: z.string().optional(),
});

type CreateWorkflowForm = z.infer<typeof createWorkflowSchema>;

export default function WorkflowsPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [triggerType, setTriggerType] = useState("MANUAL");
  const [editOpen, setEditOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [editName, setEditName] = useState("");
  const [editAiStaffId, setEditAiStaffId] = useState("");
  const [editTriggerType, setEditTriggerType] = useState("MANUAL");
  const [editScheduleCron, setEditScheduleCron] = useState("");
  const [editStepsJson, setEditStepsJson] = useState("");

  const { data: workflows, isLoading } = useQuery({
    queryKey: ["workflows", wsId],
    queryFn: () => apiGet<Workflow[]>(`/api/workspaces/${wsId}/workflows`),
    enabled: !!wsId,
  });

  const { data: aiStaff } = useQuery({
    queryKey: ["ai-staff", wsId],
    queryFn: () => apiGet<AIStaff[]>(`/api/workspaces/${wsId}/ai-staff`),
    enabled: !!wsId,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateWorkflowForm>({
    resolver: zodResolver(createWorkflowSchema),
    defaultValues: { triggerType: "MANUAL" },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateWorkflowForm) => {
      let steps: unknown;
      if (data.stepsJson) {
        try {
          steps = JSON.parse(data.stepsJson);
        } catch {
          steps = undefined;
        }
      }
      return apiPost(`/api/workspaces/${wsId}/workflows`, {
        name: data.name,
        aiStaffId: Number(data.aiStaffId),
        triggerType: data.triggerType,
        scheduleCron: data.scheduleCron || undefined,
        stepsJson: steps,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", wsId] });
      setCreateOpen(false);
      reset();
      setTriggerType("MANUAL");
    },
  });

  const runMutation = useMutation({
    mutationFn: (workflowId: number) =>
      apiPost(`/api/workspaces/${wsId}/workflows/${workflowId}/run`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", wsId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      let steps: unknown;
      if (editStepsJson) {
        try {
          steps = JSON.parse(editStepsJson);
        } catch {
          steps = undefined;
        }
      }
      return apiPut(`/api/workspaces/${wsId}/workflows/${editingWorkflow?.id}`, {
        name: editName,
        aiStaffId: Number(editAiStaffId),
        triggerType: editTriggerType,
        scheduleCron: editScheduleCron || undefined,
        stepsJson: steps,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", wsId] });
      setEditOpen(false);
      setEditingWorkflow(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiDelete(`/api/workspaces/${wsId}/workflows/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows", wsId] });
    },
  });

  const startEdit = (wf: Workflow) => {
    setEditingWorkflow(wf);
    setEditName(wf.name);
    setEditAiStaffId(String(wf.aiStaffId));
    setEditTriggerType(wf.triggerType);
    setEditScheduleCron(wf.scheduleCron || "");
    setEditStepsJson(wf.stepsJson ? JSON.stringify(wf.stepsJson, null, 2) : "");
    setEditOpen(true);
  };

  const handleDelete = (wf: Workflow) => {
    if (window.confirm(`Are you sure you want to delete the workflow "${wf.name}"?`)) {
      deleteMutation.mutate(wf.id);
    }
  };

  const onSubmit = (data: CreateWorkflowForm) => {
    createMutation.mutate(data);
  };

  const workflowList = Array.isArray(workflows) ? workflows : [];
  const staffList = Array.isArray(aiStaff) ? aiStaff : [];

  const getStaffName = (aiStaffId: number) => {
    const staff = staffList.find((s) => s.id === aiStaffId);
    return staff?.name || "Unknown";
  };

  const triggerBadgeColor = (type: string) => {
    switch (type) {
      case "MANUAL":
        return "secondary";
      case "SCHEDULED":
        return "outline";
      default:
        return "secondary" as const;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Automate tasks with AI-powered workflows
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
              <DialogDescription>
                Set up a new automated workflow for your AI staff.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wf-name">Workflow Name</Label>
                <Input
                  id="wf-name"
                  placeholder="e.g., Daily Report Generation"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>AI Staff Member</Label>
                <Select
                  onValueChange={(val) => setValue("aiStaffId", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} ({s.roleType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.aiStaffId && (
                  <p className="text-xs text-destructive">
                    {errors.aiStaffId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select
                  value={triggerType}
                  onValueChange={(val) => {
                    setTriggerType(val);
                    setValue("triggerType", val);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {triggerType === "SCHEDULED" && (
                <div className="space-y-2">
                  <Label htmlFor="scheduleCron">Cron Schedule</Label>
                  <Input
                    id="scheduleCron"
                    placeholder="e.g., 0 9 * * * (daily at 9am)"
                    {...register("scheduleCron")}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="stepsJson">Steps (JSON)</Label>
                <Textarea
                  id="stepsJson"
                  placeholder='[{"action": "analyze", "params": {}}]'
                  rows={4}
                  className="font-mono text-xs"
                  {...register("stepsJson")}
                />
              </div>

              {createMutation.isError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : "Failed to create workflow"}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workflows list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-5" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-48 mb-1" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : workflowList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              No Workflows Yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Create your first workflow to automate tasks with your AI staff.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workflowList.map((wf) => (
            <Card key={wf.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <GitBranch className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {wf.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Assigned to: {getStaffName(wf.aiStaffId)}
                        {wf.scheduleCron && ` | Cron: ${wf.scheduleCron}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={triggerBadgeColor(wf.triggerType) as "secondary" | "outline"}>
                      {wf.triggerType}
                    </Badge>
                    <Badge
                      variant={
                        wf.status === "ACTIVE" ? "default" : "secondary"
                      }
                    >
                      {wf.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runMutation.mutate(wf.id)}
                      disabled={runMutation.isPending}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Run
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(wf)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(wf)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Workflow Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => {
        if (!open) {
          setEditOpen(false);
          setEditingWorkflow(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
            <DialogDescription>
              Update workflow settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-wf-name">Workflow Name</Label>
              <Input
                id="edit-wf-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>AI Staff Member</Label>
              <Select
                value={editAiStaffId}
                onValueChange={setEditAiStaffId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select AI Staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name} ({s.roleType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select
                value={editTriggerType}
                onValueChange={setEditTriggerType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editTriggerType === "SCHEDULED" && (
              <div className="space-y-2">
                <Label htmlFor="edit-scheduleCron">Cron Schedule</Label>
                <Input
                  id="edit-scheduleCron"
                  placeholder="e.g., 0 9 * * * (daily at 9am)"
                  value={editScheduleCron}
                  onChange={(e) => setEditScheduleCron(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-stepsJson">Steps (JSON)</Label>
              <Textarea
                id="edit-stepsJson"
                rows={4}
                className="font-mono text-xs"
                value={editStepsJson}
                onChange={(e) => setEditStepsJson(e.target.value)}
              />
            </div>

            {updateMutation.isError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {updateMutation.error instanceof Error
                  ? updateMutation.error.message
                  : "Failed to update workflow"}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditingWorkflow(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
