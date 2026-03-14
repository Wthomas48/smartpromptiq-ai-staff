import { useState } from "react";
import { useLocation } from "wouter";
import {
  Sparkles,
  Building2,
  ShoppingCart,
  Home,
  DollarSign,
  Heart,
  GraduationCap,
  Cpu,
  Scale,
  Briefcase,
  MoreHorizontal,
  Megaphone,
  TrendingUp,
  PenTool,
  ClipboardList,
  Search,
  Check,
  ArrowRight,
  ArrowLeft,
  Rocket,
  Star,
  Video,
  Headphones,
  Filter,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";

/* ─── Data ─────────────────────────────────────────────────────────── */

const industries = [
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "ecommerce", label: "E-commerce", icon: ShoppingCart },
  { id: "realestate", label: "Real Estate", icon: Home },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "healthcare", label: "Healthcare", icon: Heart },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "technology", label: "Technology", icon: Cpu },
  { id: "legal", label: "Legal", icon: Scale },
  { id: "consulting", label: "Consulting", icon: Briefcase },
  { id: "other", label: "Other", icon: MoreHorizontal },
] as const;

const roleTemplates = [
  {
    id: "marketing-manager",
    name: "Marketing Manager",
    icon: Megaphone,
    description: "Creates campaigns, manages content, analyzes performance",
    roleType: "Marketing Manager",
  },
  {
    id: "sales-representative",
    name: "Sales Representative",
    icon: TrendingUp,
    description: "Generates leads, follows up, closes deals",
    roleType: "Sales Representative",
  },
  {
    id: "content-writer",
    name: "Content Writer",
    icon: PenTool,
    description: "Writes blogs, social posts, emails, and copy",
    roleType: "Content Writer",
  },
  {
    id: "admin-assistant",
    name: "Admin Assistant",
    icon: ClipboardList,
    description: "Schedules, organizes, manages communications",
    roleType: "Admin Assistant",
  },
  {
    id: "researcher",
    name: "Researcher",
    icon: Search,
    description: "Analyzes data, creates reports, finds insights",
    roleType: "Researcher",
  },
  {
    id: "operations-manager",
    name: "Operations Manager",
    icon: Briefcase,
    description: "SOPs, recurring tasks, cross-staff coordination",
    roleType: "Operations Manager",
  },
  {
    id: "finance-manager",
    name: "Finance Manager",
    icon: DollarSign,
    description: "Watches the money, explains it in plain language",
    roleType: "Finance Manager",
  },
  {
    id: "brand-strategist",
    name: "Brand Strategist",
    icon: Star,
    description: "Protects and shapes the brand voice & identity",
    roleType: "Brand Strategist",
  },
  {
    id: "technical-assistant",
    name: "Technical Assistant",
    icon: Cpu,
    description: "Helps with dev, docs, and technical thinking",
    roleType: "Technical Assistant",
  },
  {
    id: "media-creator",
    name: "Media Creator",
    icon: Video,
    description: "Feeds the content machine — video, audio, social",
    roleType: "Media Creator",
  },
  {
    id: "customer-support",
    name: "Customer Support Agent",
    icon: Headphones,
    description: "Handles support, FAQs, and knowledge base",
    roleType: "Customer Support Agent",
  },
  {
    id: "funnel-builder",
    name: "Funnel Builder",
    icon: Filter,
    description: "Builds flows that turn traffic into money",
    roleType: "Funnel Builder",
  },
  {
    id: "strategy-advisor",
    name: "Strategy Advisor",
    icon: Compass,
    description: "The executive brain of the AI team",
    roleType: "Strategy Advisor",
  },
  {
    id: "community-manager",
    name: "Community Manager",
    icon: Heart,
    description: "Keeps the audience warm and engaged",
    roleType: "Community Manager",
  },
  {
    id: "product-manager",
    name: "Product Manager",
    icon: ClipboardList,
    description: "Thinks in features, users, and roadmaps",
    roleType: "Product Manager",
  },
  {
    id: "legal-compliance-advisor",
    name: "Legal & Compliance Advisor",
    icon: Scale,
    description: "Reviews policies, drafts agreements, flags risks",
    roleType: "Legal & Compliance Advisor",
  },
  {
    id: "seo-specialist",
    name: "SEO Specialist",
    icon: Search,
    description: "Optimizes content for search engines and organic growth",
    roleType: "SEO Specialist",
  },
  {
    id: "graphic-concept-designer",
    name: "Graphic Concept Designer",
    icon: Star,
    description: "Creates concepts for graphics, ads, and branding visuals",
    roleType: "Graphic Concept Designer",
  },
  {
    id: "copy-chief",
    name: "Copy Chief",
    icon: PenTool,
    description: "Edits, improves, and polishes all written content",
    roleType: "Copy Chief",
  },
  {
    id: "ecommerce-manager",
    name: "E-commerce Manager",
    icon: ShoppingCart,
    description: "Runs product listings, store optimization, and reviews",
    roleType: "E-commerce Manager",
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    icon: TrendingUp,
    description: "Turns raw data into insights, charts, and summaries",
    roleType: "Data Analyst",
  },
  {
    id: "training-onboarding-manager",
    name: "Training & Onboarding Manager",
    icon: GraduationCap,
    description: "Trains employees, creates onboarding docs & training paths",
    roleType: "Training & Onboarding Manager",
  },
  {
    id: "lead-generation-specialist",
    name: "Lead Generation Specialist",
    icon: TrendingUp,
    description: "Finds angles, audiences, and outreach strategies",
    roleType: "Lead Generation Specialist",
  },
  {
    id: "automation-engineer",
    name: "Automation Engineer",
    icon: Cpu,
    description: "Designs automations, workflows, and integrations",
    roleType: "Automation Engineer",
  },
  {
    id: "knowledge-base-curator",
    name: "Knowledge Base Curator",
    icon: Search,
    description: "Organizes documents, summaries, and internal knowledge",
    roleType: "Knowledge Base Curator",
  },
] as const;

/* ─── Sparkle particle for the final step ──────────────────────────── */

function SparkleParticle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay}ms`,
      }}
    >
      <Star
        className="h-4 w-4 text-yellow-400 animate-pulse opacity-0"
        style={{
          animation: `sparkle-float 2s ease-in-out ${delay}ms infinite`,
        }}
      />
    </div>
  );
}

/* ─── Main Onboarding Component ────────────────────────────────────── */

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const { refreshWorkspaces } = useWorkspace();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Step 1 state
  const [workspaceName, setWorkspaceName] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  // Step 2 state
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());

  // Workspace created state
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);

  // Loading / error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sparkle positions for step 3
  const [sparkles] = useState(() =>
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2000,
    }))
  );

  const goToStep = (next: number) => {
    setDirection(next > step ? "forward" : "backward");
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(next);
      setIsTransitioning(false);
    }, 200);
  };

  /* ── Step 1 handler: create workspace ─────────────────────────────── */
  const handleStep1 = async () => {
    if (!workspaceName.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const workspace = await apiPost<{ id: number; name: string }>("/api/workspaces", {
        name: workspaceName.trim(),
        industry: selectedIndustry || undefined,
      });
      setWorkspaceId(workspace.id);
      await refreshWorkspaces();
      goToStep(2);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create workspace";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Step 2 handler: create AI staff ──────────────────────────────── */
  const handleStep2 = async () => {
    if (!workspaceId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const promises = Array.from(selectedRoles).map((roleId) => {
        const template = roleTemplates.find((r) => r.id === roleId);
        if (!template) return Promise.resolve();
        return apiPost(`/api/workspaces/${workspaceId}/ai-staff`, {
          name: template.name,
          roleType: template.roleType,
          description: template.description,
        });
      });
      await Promise.all(promises);
      goToStep(3);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create AI staff";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipRoles = () => {
    goToStep(3);
  };

  const handleLaunchDashboard = async () => {
    await refreshWorkspaces();
    navigate("/dashboard");
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const stepValid =
    step === 1 ? workspaceName.trim().length > 0 :
    step === 2 ? true :
    true;

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="flex min-h-screen flex-col items-center bg-background relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="w-full max-w-[700px] px-6 pt-10 pb-4">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-foreground">SmartPromptIQ</span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full h-1.5 rounded-full overflow-hidden bg-muted/50">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500 ease-out",
                    s <= step
                      ? "w-full bg-gradient-to-r from-purple-500 to-blue-500"
                      : "w-0"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors duration-300",
                  s <= step ? "text-foreground" : "text-muted-foreground/50"
                )}
              >
                {s === 1 ? "Workspace" : s === 2 ? "AI Team" : "Ready!"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="w-full max-w-[700px] px-6 pb-10 flex-1">
        <div
          className={cn(
            "transition-all duration-200 ease-in-out",
            isTransitioning
              ? "opacity-0 translate-y-2"
              : "opacity-100 translate-y-0"
          )}
        >
          {/* ═══════════════ STEP 1 ═══════════════ */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-foreground">
                  Set Up Your Workspace
                </h2>
                <p className="text-muted-foreground text-base">
                  Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! Let's get your AI team headquarters ready.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive text-center">
                  {error}
                </div>
              )}

              {/* Workspace name */}
              <div className="space-y-2">
                <Label htmlFor="workspace-name" className="text-sm font-medium">
                  Workspace Name
                </Label>
                <Input
                  id="workspace-name"
                  placeholder="e.g. Acme Corp, My Agency, Side Hustle HQ"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="h-12 text-base bg-muted/30 border-border/50 focus-visible:ring-purple-500/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && stepValid) handleStep1();
                  }}
                />
              </div>

              {/* Industry selector */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  What industry are you in?{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {industries.map((ind) => {
                    const Icon = ind.icon;
                    const selected = selectedIndustry === ind.id;
                    return (
                      <button
                        key={ind.id}
                        type="button"
                        onClick={() =>
                          setSelectedIndustry(selected ? null : ind.id)
                        }
                        className={cn(
                          "group relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200 cursor-pointer",
                          "hover:border-purple-500/50 hover:bg-purple-500/5",
                          selected
                            ? "border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                            : "border-border/50 bg-card/50"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-6 w-6 transition-colors duration-200",
                            selected ? "text-purple-400" : "text-muted-foreground group-hover:text-purple-400"
                          )}
                        />
                        <span
                          className={cn(
                            "text-xs font-medium transition-colors duration-200",
                            selected ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {ind.label}
                        </span>
                        {selected && (
                          <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-purple-500 flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Continue button */}
              <Button
                onClick={handleStep1}
                disabled={!stepValid || isSubmitting}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 shadow-lg shadow-purple-500/20 transition-all duration-200 hover:shadow-purple-500/30 hover:scale-[1.01]"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating workspace...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* ═══════════════ STEP 2 ═══════════════ */}
          {step === 2 && (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-foreground">
                  Choose Your AI Team
                </h2>
                <p className="text-muted-foreground text-base">
                  Select the AI staff members you'd like to start with. You can always add more later.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive text-center">
                  {error}
                </div>
              )}

              {/* Role cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {roleTemplates.map((role) => {
                  const Icon = role.icon;
                  const selected = selectedRoles.has(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      className={cn(
                        "group relative flex items-start gap-4 rounded-xl border p-5 text-left transition-all duration-200 cursor-pointer",
                        "hover:border-purple-500/50 hover:bg-purple-500/5",
                        selected
                          ? "border-purple-500 bg-purple-500/10 shadow-[0_0_24px_rgba(168,85,247,0.2)]"
                          : "border-border/50 bg-card/50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                          selected
                            ? "bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shadow-purple-500/25"
                            : "bg-muted/50 group-hover:bg-purple-500/10"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5 transition-colors duration-200",
                            selected ? "text-white" : "text-muted-foreground group-hover:text-purple-400"
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "font-semibold text-sm transition-colors duration-200",
                            selected ? "text-foreground" : "text-foreground/80"
                          )}
                        >
                          {role.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {role.description}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "absolute top-3 right-3 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                          selected
                            ? "border-purple-500 bg-purple-500 scale-100"
                            : "border-border/60 bg-transparent scale-90 group-hover:border-purple-500/40"
                        )}
                      >
                        {selected && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => goToStep(1)}
                    className="h-12 px-6 border-border/50"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    onClick={handleStep2}
                    disabled={selectedRoles.size === 0 || isSubmitting}
                    className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 shadow-lg shadow-purple-500/20 transition-all duration-200 hover:shadow-purple-500/30 hover:scale-[1.01]"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Setting up team...
                      </>
                    ) : (
                      <>
                        Continue with {selectedRoles.size} role{selectedRoles.size !== 1 ? "s" : ""}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={handleSkipRoles}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 underline underline-offset-4 decoration-muted-foreground/30 hover:decoration-foreground/50 cursor-pointer"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 3 ═══════════════ */}
          {step === 3 && (
            <div className="space-y-8 text-center relative">
              {/* Sparkle particles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {sparkles.map((s) => (
                  <SparkleParticle key={s.id} delay={s.delay} x={s.x} y={s.y} />
                ))}
              </div>

              {/* Success icon */}
              <div className="flex justify-center pt-4">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-purple-500/30 animate-bounce-gentle">
                    <Rocket className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 animate-ping-slow" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-foreground">
                  You're All Set!
                </h2>
                <p className="text-muted-foreground text-base">
                  Your AI-powered workspace is ready to go.
                </p>
              </div>

              {/* Summary card */}
              <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 text-left space-y-4 max-w-md mx-auto">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Workspace</p>
                    <p className="font-semibold text-foreground">{workspaceName}</p>
                  </div>
                </div>
                {selectedRoles.size > 0 && (
                  <div className="border-t border-border/30 pt-4">
                    <p className="text-xs text-muted-foreground mb-3">AI Team Members</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(selectedRoles).map((roleId) => {
                        const role = roleTemplates.find((r) => r.id === roleId);
                        if (!role) return null;
                        const Icon = role.icon;
                        return (
                          <div
                            key={roleId}
                            className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300"
                          >
                            <Icon className="h-3 w-3" />
                            {role.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Launch button */}
              <Button
                onClick={handleLaunchDashboard}
                className="h-14 px-10 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 shadow-xl shadow-purple-500/25 transition-all duration-300 hover:shadow-purple-500/40 hover:scale-105 rounded-xl"
              >
                <Rocket className="h-5 w-5 mr-2" />
                Launch Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Inline keyframe styles */}
      <style>{`
        @keyframes sparkle-float {
          0% { opacity: 0; transform: translateY(0) scale(0.5); }
          20% { opacity: 1; transform: translateY(-8px) scale(1); }
          80% { opacity: 1; transform: translateY(-24px) scale(1); }
          100% { opacity: 0; transform: translateY(-32px) scale(0.5); }
        }
        @keyframes ping-slow {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
