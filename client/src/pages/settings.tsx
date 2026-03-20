import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, CreditCard, Building2, Check, Brain, Eye, EyeOff, Save, Users, Trash2, Plus, Edit2, X, Key, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface Subscription {
  id: number;
  planId: number;
  planName: string;
  status: string;
  price: number;
  interval: string;
  currentPeriodEnd?: string;
}

interface Plan {
  id: number;
  name: string;
  price: number;
  interval: string;
  features: string[];
  maxAiStaff: number;
  maxWorkflows: number;
}

const defaultPlans: Plan[] = [
  {
    id: 1,
    name: "Starter",
    price: 29,
    interval: "month",
    features: [
      "Up to 3 AI Staff",
      "5 Workflows",
      "1,000 messages/month",
      "Email support",
    ],
    maxAiStaff: 3,
    maxWorkflows: 5,
  },
  {
    id: 2,
    name: "Pro",
    price: 79,
    interval: "month",
    features: [
      "Up to 10 AI Staff",
      "Unlimited Workflows",
      "10,000 messages/month",
      "Priority support",
      "Custom integrations",
    ],
    maxAiStaff: 10,
    maxWorkflows: -1,
  },
  {
    id: 3,
    name: "Agency",
    price: 199,
    interval: "month",
    features: [
      "Unlimited AI Staff",
      "Unlimited Workflows",
      "Unlimited messages",
      "24/7 support",
      "Custom integrations",
      "White-label option",
      "API access",
    ],
    maxAiStaff: -1,
    maxWorkflows: -1,
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription", wsId],
    queryFn: () =>
      apiGet<Subscription>(`/api/workspaces/${wsId}/billing/subscription`),
    enabled: !!wsId,
  });

  const { data: plans } = useQuery({
    queryKey: ["plans", wsId],
    queryFn: () => apiGet<Plan[]>(`/api/workspaces/${wsId}/billing/plans`),
    enabled: !!wsId,
  });

  const subscribeMutation = useMutation({
    mutationFn: (planId: number) =>
      apiPost(`/api/workspaces/${wsId}/billing/subscribe`, { planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", wsId] });
    },
  });

  const availablePlans =
    Array.isArray(plans) && plans.length > 0 ? plans : defaultPlans;

  const currentPlanId = subscription?.planId;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and workspace settings
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Profile</CardTitle>
          </div>
          <CardDescription>Your personal account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Full Name</p>
              <p className="text-sm text-foreground font-medium">
                {user?.name || "---"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Email</p>
              <p className="text-sm text-foreground font-medium">
                {user?.email || "---"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Role</p>
              <Badge variant="secondary">{user?.role || "USER"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Section */}
      <WorkspaceSection />

      {/* Members Section */}
      <MembersSection />

      {/* API Keys Section */}
      <APIKeysSection />

      {/* AI Providers Section */}
      <AIProvidersSection />

      {/* Billing Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Billing & Plans</CardTitle>
          </div>
          <CardDescription>
            Manage your subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current plan */}
          {subLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : subscription ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Current Plan: {subscription.planName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${subscription.price}/{subscription.interval}
                    {subscription.currentPeriodEnd &&
                      ` | Renews ${new Date(
                        subscription.currentPeriodEnd
                      ).toLocaleDateString()}`}
                  </p>
                </div>
                <Badge
                  variant={
                    subscription.status === "ACTIVE"
                      ? "default"
                      : "secondary"
                  }
                >
                  {subscription.status}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-secondary/50 p-4">
              <p className="text-sm text-muted-foreground">
                No active subscription. Choose a plan below to get started.
              </p>
            </div>
          )}

          <Separator />

          {/* Plans grid */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Available Plans
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {availablePlans.map((plan) => {
                const isCurrent = currentPlanId === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border p-5 transition-colors ${
                      isCurrent
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <h4 className="text-base font-bold text-foreground">
                      {plan.name}
                    </h4>
                    <div className="mt-2 mb-4">
                      <span className="text-2xl font-bold text-foreground">
                        ${plan.price}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        /{plan.interval}
                      </span>
                    </div>
                    <ul className="space-y-2 mb-5">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled
                      >
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        variant={
                          plan.name === "Pro" ? "default" : "outline"
                        }
                        onClick={() => subscribeMutation.mutate(plan.id)}
                        disabled={subscribeMutation.isPending}
                      >
                        {subscribeMutation.isPending
                          ? "Processing..."
                          : "Subscribe"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {subscribeMutation.isError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {subscribeMutation.error instanceof Error
                ? subscribeMutation.error.message
                : "Failed to subscribe"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── API Keys Section ───────────────────────────────────────────────────────

interface APIKeyItem {
  id: string;
  label: string;
  scopes: string[];
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

function APIKeysSection() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys", wsId],
    queryFn: () => apiGet<APIKeyItem[]>(`/api/workspaces/${wsId}/api-keys`),
    enabled: !!wsId,
  });

  const createMutation = useMutation({
    mutationFn: (label: string) =>
      apiPost<{ key: string }>(`/api/workspaces/${wsId}/api-keys`, { label }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys", wsId] });
      setNewKey(data.key);
      setNewLabel("");
      toast({ title: "API key created" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (keyId: string) =>
      apiDelete(`/api/workspaces/${wsId}/api-keys/${keyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys", wsId] });
      toast({ title: "API key revoked" });
    },
  });

  const keyList = Array.isArray(keys) ? keys : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">API Keys</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => { setShowCreate(!showCreate); setNewKey(null); }}
          >
            <Plus className="h-3.5 w-3.5" />
            New Key
          </Button>
        </div>
        <CardDescription>
          API keys for programmatic access to your workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New key display */}
        {newKey && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-emerald-400">
              New API Key — copy it now, it won't be shown again
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-md bg-background border border-border text-xs font-mono text-foreground break-all">
                {newKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 flex-shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(newKey);
                  toast({ title: "API key copied" });
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
          </div>
        )}

        {/* Create form */}
        {showCreate && !newKey && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Key label (e.g., Production, CI/CD)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="h-9"
            />
            <Button
              size="sm"
              onClick={() => createMutation.mutate(newLabel)}
              disabled={createMutation.isPending || !newLabel.trim()}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        )}

        {/* Key list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : keyList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No API keys yet. Create one to access your workspace programmatically.
          </p>
        ) : (
          <div className="space-y-2">
            {keyList.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{key.label}</p>
                    <code className="text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">
                      {key.keyPrefix}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                  onClick={() => {
                    if (window.confirm(`Revoke API key "${key.label}"? This cannot be undone.`)) {
                      deleteMutation.mutate(key.id);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Workspace Section ──────────────────────────────────────────────────────

function WorkspaceSection() {
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

  const updateMutation = useMutation({
    mutationFn: (data: { name: string }) =>
      apiPut(`/api/workspaces/${wsId}`, data),
    onSuccess: () => {
      refreshWorkspaces();
      setEditing(false);
      toast({ title: "Workspace updated" });
    },
  });

  const startEdit = () => {
    setEditName(currentWorkspace?.name || "");
    setEditing(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Workspace</CardTitle>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={startEdit} className="gap-1">
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
        <CardDescription>Current workspace configuration</CardDescription>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Workspace Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => updateMutation.mutate({ name: editName })}
                disabled={updateMutation.isPending || !editName.trim()}
                className="gap-1"
              >
                <Save className="h-3.5 w-3.5" />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Workspace Name</p>
              <p className="text-sm text-foreground font-medium">
                {currentWorkspace?.name || "No workspace selected"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Workspace ID</p>
              <p className="text-sm text-foreground font-mono text-xs">
                {currentWorkspace?.id || "---"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Members Section ────────────────────────────────────────────────────────

interface Member {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

function MembersSection() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  const { data: membersData, isLoading } = useQuery({
    queryKey: ["workspace-members", wsId],
    queryFn: () =>
      apiGet<{ members: Member[] }>(`/api/workspaces/${wsId}/members`),
    enabled: !!wsId,
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) =>
      apiPost(`/api/workspaces/${wsId}/members/invite`, { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", wsId] });
      setInviteEmail("");
      setShowInvite(false);
      toast({ title: "Member invited successfully" });
    },
    onError: (err: any) => {
      toast({
        title: "Invite failed",
        description: err.message || "Could not invite user",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      apiDelete(`/api/workspaces/${wsId}/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", wsId] });
      toast({ title: "Member removed" });
    },
  });

  const members = membersData?.members || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Team Members</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{members.length} members</Badge>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setShowInvite(!showInvite)}
            >
              <Plus className="h-3.5 w-3.5" />
              Invite
            </Button>
          </div>
        </div>
        <CardDescription>People with access to this workspace</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Invite form */}
        {showInvite && (
          <div className="flex items-center gap-2">
            <Input
              type="email"
              placeholder="Enter email address..."
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="h-9"
            />
            <Button
              size="sm"
              onClick={() => inviteMutation.mutate(inviteEmail)}
              disabled={inviteMutation.isPending || !inviteEmail.trim()}
            >
              {inviteMutation.isPending ? "Inviting..." : "Add"}
            </Button>
          </div>
        )}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No members found.
          </p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {member.user.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={member.role === "WORKSPACE_OWNER" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {member.role === "WORKSPACE_OWNER" ? "Owner" : "Member"}
                  </Badge>
                  {member.role !== "WORKSPACE_OWNER" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                      onClick={() => {
                        if (window.confirm(`Remove ${member.user.name} from this workspace?`)) {
                          removeMutation.mutate(member.id);
                        }
                      }}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── AI Providers Section ───────────────────────────────────────────────────

function AIProvidersSection() {
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [defaultProvider, setDefaultProvider] = useState("openai");
  const [defaultModel, setDefaultModel] = useState("gpt-4o-mini");

  const providers = [
    {
      id: "openai",
      name: "OpenAI",
      description: "GPT-4o, GPT-4o-mini, GPT-4 Turbo",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
      keyValue: openaiKey,
      setKey: setOpenaiKey,
      show: showOpenAI,
      setShow: setShowOpenAI,
      placeholder: "sk-...",
      models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    },
    {
      id: "anthropic",
      name: "Anthropic",
      description: "Claude Opus, Sonnet, Haiku",
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30",
      keyValue: anthropicKey,
      setKey: setAnthropicKey,
      show: showAnthropic,
      setShow: setShowAnthropic,
      placeholder: "sk-ant-...",
      models: ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-haiku-4-5-20251001"],
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">AI Providers</CardTitle>
        </div>
        <CardDescription>
          Configure your AI provider API keys. Keys are stored in your server environment variables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-300">
            API keys are configured via server environment variables (OPENAI_API_KEY, ANTHROPIC_API_KEY).
            Update them in your Railway dashboard or .env file, then restart the server.
          </p>
        </div>

        <div className="space-y-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={`rounded-lg border ${provider.borderColor} p-4`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg ${provider.bgColor} flex items-center justify-center`}>
                    <Brain className={`h-4 w-4 ${provider.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{provider.name}</p>
                    <p className="text-xs text-muted-foreground">{provider.description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-3">
                <Label className="text-xs text-muted-foreground">Environment Variable</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-md bg-secondary/50 border border-border text-xs font-mono text-foreground">
                    {provider.id === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"}
                  </code>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1.5">Available Models</p>
                <div className="flex flex-wrap gap-1.5">
                  {provider.models.map((model) => (
                    <Badge key={model} variant="secondary" className="text-[10px]">
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Default provider and model can be set via environment variables:
          </p>
          <div className="space-y-1.5">
            <code className="block px-3 py-2 rounded-md bg-secondary/50 border border-border text-xs font-mono text-foreground">
              DEFAULT_AI_PROVIDER=openai
            </code>
            <code className="block px-3 py-2 rounded-md bg-secondary/50 border border-border text-xs font-mono text-foreground">
              DEFAULT_AI_MODEL=gpt-4o-mini
            </code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
