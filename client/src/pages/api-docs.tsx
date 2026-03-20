import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

interface Endpoint {
  method: string;
  path: string;
  description: string;
  auth: string;
  body?: string;
  response?: string;
}

interface Section {
  title: string;
  base: string;
  endpoints: Endpoint[];
}

const apiSections: Section[] = [
  {
    title: "Authentication",
    base: "/api/auth",
    endpoints: [
      { method: "POST", path: "/register", description: "Create a new account", auth: "None", body: '{ "name": "...", "email": "...", "password": "..." }' },
      { method: "POST", path: "/login", description: "Login and get tokens", auth: "None", body: '{ "email": "...", "password": "..." }', response: '{ "accessToken": "...", "refreshToken": "..." }' },
      { method: "POST", path: "/refresh", description: "Refresh access token", auth: "Refresh Token" },
      { method: "GET", path: "/me", description: "Get current user profile", auth: "Bearer Token" },
    ],
  },
  {
    title: "Workspaces",
    base: "/api/workspaces",
    endpoints: [
      { method: "GET", path: "/", description: "List your workspaces", auth: "Bearer Token" },
      { method: "POST", path: "/", description: "Create workspace", auth: "Bearer Token", body: '{ "name": "..." }' },
      { method: "GET", path: "/:id", description: "Get workspace details", auth: "Bearer Token" },
      { method: "PUT", path: "/:id", description: "Update workspace", auth: "Bearer Token" },
      { method: "POST", path: "/:id/members/invite", description: "Invite member by email", auth: "Bearer Token", body: '{ "email": "..." }' },
    ],
  },
  {
    title: "AI Staff",
    base: "/api/workspaces/:wsId/ai-staff",
    endpoints: [
      { method: "GET", path: "/", description: "List AI staff members", auth: "Bearer Token" },
      { method: "POST", path: "/", description: "Create AI staff", auth: "Bearer Token", body: '{ "name": "...", "roleType": "...", "isManager": false }' },
      { method: "GET", path: "/:staffId", description: "Get staff details", auth: "Bearer Token" },
      { method: "PUT", path: "/:staffId", description: "Update staff (name, model, systemPrompt, etc.)", auth: "Bearer Token" },
      { method: "DELETE", path: "/:staffId", description: "Delete staff member", auth: "Bearer Token" },
    ],
  },
  {
    title: "Delegations",
    base: "/api/workspaces/:wsId/delegations",
    endpoints: [
      { method: "POST", path: "/", description: "Create delegation", auth: "Bearer Token", body: '{ "managerId": "...", "goal": "...", "autoExecute": true }' },
      { method: "GET", path: "/", description: "List delegations", auth: "Bearer Token" },
      { method: "GET", path: "/:id", description: "Get delegation details with subtasks", auth: "Bearer Token" },
      { method: "POST", path: "/:id/plan", description: "Plan only (decompose without executing)", auth: "Bearer Token" },
      { method: "POST", path: "/:id/execute", description: "Execute a planned delegation", auth: "Bearer Token" },
      { method: "POST", path: "/:id/run", description: "Plan + execute in one step", auth: "Bearer Token" },
      { method: "POST", path: "/:id/rerun", description: "Reset and re-run a delegation", auth: "Bearer Token" },
      { method: "POST", path: "/:id/approve", description: "Approve pending delegation", auth: "Bearer Token" },
      { method: "POST", path: "/:id/reject", description: "Reject pending delegation", auth: "Bearer Token" },
      { method: "GET", path: "/:id/history", description: "Get run history", auth: "Bearer Token" },
      { method: "DELETE", path: "/:id", description: "Delete delegation", auth: "Bearer Token" },
    ],
  },
  {
    title: "Webhooks (API Key Auth)",
    base: "/api/webhooks",
    endpoints: [
      { method: "POST", path: "/trigger", description: "Create and run a delegation via webhook", auth: "API Key", body: '{ "managerId": "...", "goal": "...", "context": "..." }' },
      { method: "GET", path: "/status/:delegationId", description: "Check delegation status", auth: "API Key" },
    ],
  },
  {
    title: "Workflows",
    base: "/api/workspaces/:wsId/workflows",
    endpoints: [
      { method: "GET", path: "/", description: "List workflows", auth: "Bearer Token" },
      { method: "POST", path: "/", description: "Create workflow", auth: "Bearer Token" },
      { method: "POST", path: "/:id/run", description: "Trigger workflow execution", auth: "Bearer Token" },
      { method: "PUT", path: "/:id", description: "Update workflow", auth: "Bearer Token" },
      { method: "DELETE", path: "/:id", description: "Delete workflow", auth: "Bearer Token" },
    ],
  },
  {
    title: "Messages",
    base: "/api/workspaces/:wsId/messages",
    endpoints: [
      { method: "GET", path: "/threads", description: "List message threads", auth: "Bearer Token" },
      { method: "POST", path: "/threads", description: "Create thread", auth: "Bearer Token" },
      { method: "POST", path: "/threads/:id/messages", description: "Send message (streaming supported)", auth: "Bearer Token" },
    ],
  },
  {
    title: "Analytics",
    base: "/api/workspaces/:wsId/analytics",
    endpoints: [
      { method: "GET", path: "/overview", description: "Dashboard summary stats", auth: "Bearer Token" },
      { method: "GET", path: "/usage?days=30", description: "Token usage and cost metrics", auth: "Bearer Token" },
      { method: "GET", path: "/activity?limit=20", description: "Recent activity feed", auth: "Bearer Token" },
    ],
  },
];

export default function APIDocsPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>("Delegations");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Documentation</h1>
          <p className="text-muted-foreground mt-1">
            Reference for all available API endpoints
          </p>
        </div>
      </div>

      {/* Auth info */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">Authentication</p>
          <p className="text-xs text-muted-foreground">
            Most endpoints require a JWT Bearer token in the Authorization header:
          </p>
          <code className="block px-3 py-2 rounded-md bg-secondary/50 border border-border text-xs font-mono text-foreground">
            Authorization: Bearer {"<accessToken>"}
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            Webhook endpoints use API keys instead:
          </p>
          <code className="block px-3 py-2 rounded-md bg-secondary/50 border border-border text-xs font-mono text-foreground">
            Authorization: Bearer spiq_{"<your_api_key>"}
          </code>
        </CardContent>
      </Card>

      {/* Endpoint sections */}
      <div className="space-y-3">
        {apiSections.map((section) => {
          const isExpanded = expandedSection === section.title;
          return (
            <Card key={section.title} className="overflow-hidden">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.title)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{section.title}</p>
                  <p className="text-xs text-muted-foreground">{section.base}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {section.endpoints.length} endpoints
                  </Badge>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border">
                  {section.endpoints.map((ep, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-3 border-b border-border/50 last:border-b-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-[10px] font-mono ${methodColors[ep.method]}`}>
                          {ep.method}
                        </Badge>
                        <code className="text-xs font-mono text-foreground">
                          {section.base}{ep.path}
                        </code>
                        <button
                          onClick={() => copyText(`${section.base}${ep.path}`)}
                          className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedText === `${section.base}${ep.path}` ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{ep.description}</p>
                      <p className="text-[10px] text-muted-foreground/60">Auth: {ep.auth}</p>
                      {ep.body && (
                        <div className="mt-1.5">
                          <p className="text-[10px] text-muted-foreground/60 mb-0.5">Body:</p>
                          <code className="block px-2 py-1 rounded bg-secondary/50 text-[10px] font-mono text-foreground/70 overflow-x-auto">
                            {ep.body}
                          </code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
