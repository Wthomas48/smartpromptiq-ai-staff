import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Plug, Trash2 } from "lucide-react";
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

interface Integration {
  id: number;
  type: string;
  status: string;
  credentials?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export default function IntegrationsPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formType, setFormType] = useState("EMAIL");
  const [formStatus, setFormStatus] = useState("ACTIVE");
  const [formCredentials, setFormCredentials] = useState("");

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["integrations", wsId],
    queryFn: () =>
      apiGet<Integration[]>(`/api/workspaces/${wsId}/integrations`),
    enabled: !!wsId,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      let credentials: Record<string, unknown> | undefined;
      if (formCredentials.trim()) {
        try {
          credentials = JSON.parse(formCredentials);
        } catch {
          credentials = undefined;
        }
      }
      return apiPost(`/api/workspaces/${wsId}/integrations`, {
        type: formType,
        status: formStatus,
        credentials,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", wsId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      let credentials: Record<string, unknown> | undefined;
      if (formCredentials.trim()) {
        try {
          credentials = JSON.parse(formCredentials);
        } catch {
          credentials = undefined;
        }
      }
      return apiPut(`/api/workspaces/${wsId}/integrations/${editingId}`, {
        type: formType,
        status: formStatus,
        credentials,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", wsId] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiDelete(`/api/workspaces/${wsId}/integrations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations", wsId] });
    },
  });

  const resetForm = () => {
    setCreateOpen(false);
    setEditingId(null);
    setFormType("EMAIL");
    setFormStatus("ACTIVE");
    setFormCredentials("");
  };

  const startEdit = (integration: Integration) => {
    setEditingId(integration.id);
    setFormType(integration.type);
    setFormStatus(integration.status);
    setFormCredentials(
      integration.credentials
        ? JSON.stringify(integration.credentials, null, 2)
        : ""
    );
    setCreateOpen(true);
  };

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const integrationList = Array.isArray(integrations) ? integrations : [];

  const typeBadgeColor = (type: string) => {
    switch (type) {
      case "EMAIL":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "WEBHOOK":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "SMARTPROMPTIQ_API":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-secondary text-foreground";
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isError = createMutation.isError || updateMutation.isError;
  const mutationError = createMutation.error || updateMutation.error;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect external services to your AI workforce
          </p>
        </div>

        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            if (!open) resetForm();
            else setCreateOpen(true);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Integration" : "Add Integration"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update integration settings."
                  : "Connect a new external service."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="WEBHOOK">Webhook</SelectItem>
                    <SelectItem value="SMARTPROMPTIQ_API">
                      SmartPromptIQ API
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="credentials">Credentials (JSON)</Label>
                <Textarea
                  id="credentials"
                  placeholder='{"apiKey": "...", "endpoint": "..."}'
                  rows={5}
                  className="font-mono text-xs"
                  value={formCredentials}
                  onChange={(e) => setFormCredentials(e.target.value)}
                />
              </div>

              {isError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {mutationError instanceof Error
                    ? mutationError.message
                    : "Operation failed"}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending
                  ? "Saving..."
                  : editingId
                  ? "Update"
                  : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Integrations list */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-24 mb-3" />
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : integrationList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plug className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              No Integrations Yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Connect external services to enhance your AI workforce
              capabilities.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrationList.map((integration) => (
            <Card key={integration.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <Badge
                    className={typeBadgeColor(integration.type)}
                    variant="outline"
                  >
                    {integration.type}
                  </Badge>
                  <Badge
                    variant={
                      integration.status === "ACTIVE"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {integration.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Created{" "}
                  {new Date(integration.createdAt).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => startEdit(integration)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(integration.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
