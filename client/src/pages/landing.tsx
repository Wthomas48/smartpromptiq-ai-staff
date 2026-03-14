import { useState } from "react";
import { useLocation } from "wouter";
import {
  Sparkles,
  Megaphone,
  TrendingUp,
  PenTool,
  ClipboardList,
  Search,
  Settings,
  DollarSign,
  Star,
  Terminal,
  Video,
  Headphones,
  Filter,
  Compass,
  MessageCircleHeart,
  LayoutDashboard,
  Scale,
  Palette,
  Globe,
  BarChart3,
  GraduationCap,
  Zap,
  FileText,
  Users,
  ArrowRight,
  Check,
  Rocket,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─── Role Data ───────────────────────────────────────────────── */

const aiRoles = [
  {
    name: "Marketing Manager",
    icon: Megaphone,
    gradient: "from-purple-500 to-purple-700",
    category: "Marketing & Growth",
    tagline: "Campaigns that convert, content that clicks.",
    description: "Creates data-driven marketing strategies, manages content calendars, analyzes campaign performance, and maintains brand voice across every channel.",
    capabilities: ["Campaign strategy & execution", "Content calendar management", "Performance analytics", "Brand voice consistency"],
  },
  {
    name: "Sales Representative",
    icon: TrendingUp,
    gradient: "from-emerald-500 to-emerald-700",
    category: "Sales & Revenue",
    tagline: "Builds pipelines, closes deals.",
    description: "Qualifies leads with precision, crafts compelling outreach, manages deal flow through every stage, and follows up at exactly the right moment.",
    capabilities: ["Lead qualification & scoring", "Outreach email sequences", "Pipeline management", "Deal negotiation support"],
  },
  {
    name: "Content Writer",
    icon: PenTool,
    gradient: "from-blue-500 to-blue-700",
    category: "Content & Copy",
    tagline: "Words that work, content that ranks.",
    description: "Transforms complex ideas into engaging blog posts, social content, newsletters, and long-form articles — all SEO-optimized and on-brand.",
    capabilities: ["Blog posts & articles", "Social media content", "Email newsletters", "SEO copywriting"],
  },
  {
    name: "Admin Assistant",
    icon: ClipboardList,
    gradient: "from-orange-500 to-orange-700",
    category: "Operations",
    tagline: "Nothing slips through the cracks.",
    description: "Manages calendars, drafts correspondence, prepares meeting agendas, and keeps workflows organized so every day runs smoothly.",
    capabilities: ["Calendar management", "Email triage", "Meeting notes & summaries", "Task organization"],
  },
  {
    name: "Researcher",
    icon: Search,
    gradient: "from-cyan-500 to-cyan-700",
    category: "Research & Analysis",
    tagline: "Deep research, actionable insights.",
    description: "Gathers data from diverse sources, cross-references findings, and synthesizes complex information into clear, evidence-based reports.",
    capabilities: ["Market & competitive analysis", "Data synthesis", "Trend monitoring", "Research summaries"],
  },
  {
    name: "Operations Manager",
    icon: Settings,
    gradient: "from-amber-500 to-amber-700",
    category: "Operations",
    tagline: "The glue that holds everything together.",
    description: "Creates SOPs, tracks recurring tasks, coordinates between all AI Staff, and ensures every department is aligned and efficient.",
    capabilities: ["SOP creation", "Recurring task tracking", "Cross-staff coordination", "Weekly ops summaries"],
  },
  {
    name: "Finance Manager",
    icon: DollarSign,
    gradient: "from-emerald-600 to-green-800",
    category: "Finance",
    tagline: "Watches the money, explains it simply.",
    description: "Analyzes financial data, categorizes expenses, builds budgets, and creates monthly snapshots that tell the full story at a glance.",
    capabilities: ["Income & expense summaries", "Budget drafts", "Financial snapshots", "Expense categorization"],
  },
  {
    name: "Brand Strategist",
    icon: Star,
    gradient: "from-pink-500 to-rose-700",
    category: "Marketing & Growth",
    tagline: "Protects and shapes your brand.",
    description: "Defines brand voice, generates campaign themes, reviews content for consistency, and ensures your brand sounds like your brand everywhere.",
    capabilities: ["Brand voice guides", "Campaign themes", "Consistency checks", "Positioning statements"],
  },
  {
    name: "Technical Assistant",
    icon: Terminal,
    gradient: "from-sky-500 to-indigo-700",
    category: "Engineering",
    tagline: "Makes the whole engineering team faster.",
    description: "Explains code in plain English, drafts API documentation, formats bug reports, and suggests technical improvements with clear rationale.",
    capabilities: ["Code explanation", "API documentation", "Bug report formatting", "Technical improvements"],
  },
  {
    name: "Media Creator",
    icon: Video,
    gradient: "from-violet-500 to-purple-700",
    category: "Content & Copy",
    tagline: "Feeds the content machine.",
    description: "Writes YouTube scripts, generates short-form hooks for Reels and TikTok, structures podcast episodes, and repurposes content across platforms.",
    capabilities: ["YouTube scripts", "Short-form hooks", "Podcast outlines", "Content repurposing"],
  },
  {
    name: "Customer Support Agent",
    icon: Headphones,
    gradient: "from-teal-500 to-cyan-700",
    category: "Support",
    tagline: "Every customer feels heard.",
    description: "Drafts empathetic replies, builds FAQ entries from common questions, maintains the knowledge base, and summarizes weekly support trends.",
    capabilities: ["FAQ building", "Reply drafting", "Support summaries", "Knowledge base updates"],
  },
  {
    name: "Funnel Builder",
    icon: Filter,
    gradient: "from-orange-500 to-red-600",
    category: "Sales & Revenue",
    tagline: "Turns traffic into money.",
    description: "Designs complete funnels from traffic to offer, generates landing page copy, writes email nurture sequences, and builds lead magnet flows.",
    capabilities: ["Funnel blueprints", "Landing page copy", "Email sequences", "Lead magnet flows"],
  },
  {
    name: "Strategy Advisor",
    icon: Compass,
    gradient: "from-purple-600 to-indigo-800",
    category: "Executive",
    tagline: "The executive brain of your AI team.",
    description: "Writes quarterly strategy briefs, generates SWOT analyses, creates competitive snapshots, and prioritizes what moves the needle most.",
    capabilities: ["Strategy briefs", "SWOT analysis", "Competitive snapshots", "Priority recommendations"],
  },
  {
    name: "Community Manager",
    icon: MessageCircleHeart,
    gradient: "from-rose-500 to-pink-600",
    category: "Marketing & Growth",
    tagline: "The reason people stay.",
    description: "Generates engagement prompts, drafts reply templates, summarizes community health weekly, and celebrates member contributions.",
    capabilities: ["Engagement prompts", "Reply templates", "Health summaries", "Member spotlights"],
  },
  {
    name: "Product Manager",
    icon: LayoutDashboard,
    gradient: "from-blue-600 to-indigo-700",
    category: "Product",
    tagline: "Thinks in features, users, and roadmaps.",
    description: "Turns ideas into feature specs, proposes 3-month roadmaps, clusters user feedback into themes, and writes release notes.",
    capabilities: ["Feature specs", "Roadmap proposals", "Feedback clustering", "Release notes"],
  },
  {
    name: "Legal & Compliance Advisor",
    icon: Scale,
    gradient: "from-amber-500 to-yellow-700",
    category: "Legal",
    tagline: "Keeps the business compliant.",
    description: "Drafts simple contracts, reviews policies in plain language, creates compliance checklists, and summarizes legal documents with risk flags.",
    capabilities: ["Policy review", "Contract drafting", "Compliance checklists", "Document summaries"],
  },
  {
    name: "SEO Specialist",
    icon: Search,
    gradient: "from-green-500 to-teal-700",
    category: "Marketing & Growth",
    tagline: "Ranks content, drives organic growth.",
    description: "Generates SEO content briefs, clusters keywords by intent, audits pages for on-page fixes, and analyzes competitor SEO gaps.",
    capabilities: ["SEO content briefs", "Keyword clustering", "On-page audits", "Competitor analysis"],
  },
  {
    name: "Graphic Concept Designer",
    icon: Palette,
    gradient: "from-fuchsia-500 to-pink-700",
    category: "Design",
    tagline: "Every visual has a job to do.",
    description: "Creates thumbnail concepts, ad creative directions, brand visual packs, and platform-specific social graphic design briefs.",
    capabilities: ["Thumbnail concepts", "Ad creative ideas", "Brand visual packs", "Social graphics"],
  },
  {
    name: "Copy Chief",
    icon: PenTool,
    gradient: "from-purple-500 to-violet-700",
    category: "Content & Copy",
    tagline: "The last line of defense before publish.",
    description: "Polishes text for clarity and impact, generates scroll-stopping hooks, rewrites content in brand voice, and creates headline A/B variations.",
    capabilities: ["Copy polishing", "Hook generation", "Brand voice rewrites", "Headline A/B testing"],
  },
  {
    name: "E-commerce Manager",
    icon: Globe,
    gradient: "from-orange-500 to-amber-700",
    category: "Sales & Revenue",
    tagline: "Listings that sell, stores that convert.",
    description: "Builds optimized product listings, audits store layouts, drafts review responses, and identifies upsell and cross-sell opportunities.",
    capabilities: ["Product descriptions", "Store audits", "Review responses", "Upsell suggestions"],
  },
  {
    name: "Data Analyst",
    icon: BarChart3,
    gradient: "from-cyan-500 to-blue-700",
    category: "Research & Analysis",
    tagline: "Data without interpretation is just noise.",
    description: "Analyzes CSVs instantly, identifies trends and anomalies, creates KPI breakdowns in plain language, and builds text-based dashboards.",
    capabilities: ["CSV analysis", "Trend reports", "KPI breakdowns", "Text dashboards"],
  },
  {
    name: "Training & Onboarding Manager",
    icon: GraduationCap,
    gradient: "from-green-500 to-emerald-700",
    category: "Operations",
    tagline: "Makes learning feel manageable.",
    description: "Creates step-by-step onboarding plans, turns topics into training lessons, rewrites SOPs as simple walkthroughs, and builds training roadmaps.",
    capabilities: ["Onboarding guides", "Training modules", "SOP walkthroughs", "Training paths"],
  },
  {
    name: "Lead Generation Specialist",
    icon: Zap,
    gradient: "from-orange-500 to-red-700",
    category: "Sales & Revenue",
    tagline: "Every lead deserves a reason to say yes.",
    description: "Generates lead magnet concepts, writes value-first outreach scripts, builds audience targeting strategies, and creates lead scoring frameworks.",
    capabilities: ["Lead magnet ideas", "Outreach scripts", "Audience targeting", "Lead scoring"],
  },
  {
    name: "Automation Engineer",
    icon: Settings,
    gradient: "from-blue-500 to-indigo-700",
    category: "Engineering",
    tagline: "Easy to understand, hard to break.",
    description: "Maps automation blueprints from trigger to action, plans integrations with data flow, optimizes existing workflows, and audits automations for gaps.",
    capabilities: ["Automation blueprints", "Integration plans", "Process optimization", "Automation audits"],
  },
  {
    name: "Knowledge Base Curator",
    icon: FileText,
    gradient: "from-cyan-500 to-teal-700",
    category: "Operations",
    tagline: "Find what you need in seconds.",
    description: "Summarizes uploaded documents instantly, creates structured KB articles with tags, designs tagging taxonomies, and identifies knowledge gaps.",
    capabilities: ["Document summaries", "KB articles", "Tagging systems", "Gap analysis"],
  },
];

const categories = [
  "All",
  "Marketing & Growth",
  "Sales & Revenue",
  "Content & Copy",
  "Operations",
  "Research & Analysis",
  "Engineering",
  "Finance",
  "Executive",
  "Product",
  "Support",
  "Legal",
  "Design",
];

const stats = [
  { value: "25+", label: "AI Staff Roles" },
  { value: "100+", label: "Pre-built Workflows" },
  { value: "24/7", label: "Always Working" },
  { value: "0", label: "Days to Onboard" },
];

const features = [
  {
    icon: Rocket,
    title: "Deploy in Minutes",
    description: "Pick a role, customize the personality, and your AI staff member is live — no code, no setup, no waiting.",
  },
  {
    icon: Users,
    title: "Build a Full AI Team",
    description: "From marketing to legal to engineering — assemble a complete team that covers every function of your business.",
  },
  {
    icon: Zap,
    title: "Pre-built Workflows",
    description: "Every role comes with ready-to-run workflows. Just trigger them and watch your AI staff execute.",
  },
  {
    icon: Shield,
    title: "Human-in-the-Loop",
    description: "Review, approve, or reject any task before it goes live. You stay in control while AI does the heavy lifting.",
  },
  {
    icon: Clock,
    title: "Works While You Sleep",
    description: "Schedule workflows, automate recurring tasks, and wake up to completed work every morning.",
  },
  {
    icon: Sparkles,
    title: "Learns Your Brand",
    description: "Every AI staff member adapts to your brand voice, industry context, and business goals.",
  },
];

/* ─── Landing Page Component ──────────────────────────────────── */

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const filteredRoles =
    activeCategory === "All"
      ? aiRoles
      : aiRoles.filter((r) => r.category === activeCategory);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ═══ Nav ═══ */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-400" />
            <span className="text-lg font-bold">SmartPromptIQ</span>
            <span className="ml-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
              AI Staff
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              className="text-sm"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate("/register")}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 text-sm font-semibold shadow-lg shadow-purple-500/20"
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══ Hero ═══ */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-4xl px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-300 mb-8">
            <Sparkles className="h-4 w-4" />
            25 AI Staff Roles — Ready to Deploy
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6">
            Hire Your{" "}
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              AI-Powered
            </span>{" "}
            Dream Team
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed mb-10">
            SmartPromptIQ AI Staff gives you a full team of specialized AI employees — from marketing to legal to engineering.
            Each one comes pre-trained with workflows, system prompts, and a personality tailored to their role.{" "}
            <span className="text-foreground font-medium">Deploy in minutes. Scale without hiring.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button
              onClick={() => navigate("/register")}
              className="h-14 px-10 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 shadow-xl shadow-purple-500/25 transition-all duration-300 hover:shadow-purple-500/40 hover:scale-105 rounded-xl"
            >
              <Rocket className="h-5 w-5 mr-2" />
              Start Building Your Team
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                document.getElementById("roles")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="h-14 px-8 text-lg rounded-xl border-border/50"
            >
              Explore All 25 Roles
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Features ═══ */}
      <section className="border-t border-border/30 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why Businesses Choose AI Staff
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Not just another chatbot. A full team of specialists that understand your business, follow your brand, and execute real work.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border/50 bg-card/50 p-6 transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-500/5"
                >
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ Roles ═══ */}
      <section id="roles" className="border-t border-border/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Meet Your AI Team
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              25 specialized roles covering every function of your business. Each one pre-loaded with workflows, system prompts, and capabilities.
            </p>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer",
                  activeCategory === cat
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                    : "bg-card/50 border border-border/50 text-muted-foreground hover:text-foreground hover:border-purple-500/40"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Role grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRoles.map((role) => {
              const Icon = role.icon;
              const isExpanded = expandedRole === role.name;
              return (
                <div
                  key={role.name}
                  className={cn(
                    "group rounded-xl border bg-card/50 overflow-hidden transition-all duration-300",
                    isExpanded
                      ? "border-purple-500/50 shadow-lg shadow-purple-500/10"
                      : "border-border/50 hover:border-purple-500/30"
                  )}
                >
                  {/* Gradient header */}
                  <div className={cn("h-1.5 bg-gradient-to-r", role.gradient)} />

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br",
                            role.gradient,
                            "shadow-lg"
                          )}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">{role.name}</h3>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {role.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm font-medium text-purple-300 italic mb-2">
                      "{role.tagline}"
                    </p>

                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {role.description}
                    </p>

                    {/* Capabilities */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRole(isExpanded ? null : role.name)
                      }
                      className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 cursor-pointer transition-colors mb-2"
                    >
                      {isExpanded ? "Hide" : "View"} capabilities
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="space-y-1.5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        {role.capabilities.map((cap) => (
                          <div
                            key={cap}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <Check className="h-3 w-3 text-purple-400 shrink-0" />
                            {cap}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section className="border-t border-border/30 bg-card/30">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Up and Running in 3 Steps
            </h2>
            <p className="text-muted-foreground">
              No technical setup. No training data. Just pick, customize, and launch.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create Your Workspace",
                description: "Name your workspace and pick your industry. Takes 10 seconds.",
              },
              {
                step: "02",
                title: "Choose Your AI Team",
                description: "Browse 25 roles, pick the ones you need, customize their personality and tone.",
              },
              {
                step: "03",
                title: "Launch & Execute",
                description: "Trigger workflows, chat with your AI staff, approve tasks, and watch the work get done.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 mb-4">
                  <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Pricing Teaser ═══ */}
      <section className="border-t border-border/30">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Plans for Every Stage
          </h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
            Start free, scale when you're ready. Every plan includes pre-built workflows and full customization.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "$29",
                description: "3 AI Staff, 1 workspace",
                features: ["3 AI Staff members", "Pre-built workflows", "Email support", "5 GB storage"],
              },
              {
                name: "Pro",
                price: "$79",
                description: "10 AI Staff, 5 workspaces",
                features: ["10 AI Staff members", "Custom templates", "Priority support", "API access"],
                featured: true,
              },
              {
                name: "Agency",
                price: "$199",
                description: "Unlimited AI Staff",
                features: ["Unlimited AI Staff", "Unlimited workspaces", "White-label option", "Dedicated support"],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "rounded-xl border p-6 text-left transition-all duration-200",
                  plan.featured
                    ? "border-purple-500/50 bg-purple-500/5 shadow-lg shadow-purple-500/10 scale-105"
                    : "border-border/50 bg-card/50"
                )}
              >
                {plan.featured && (
                  <div className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-2">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-1 mb-1">
                  <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                <div className="space-y-2">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-purple-400 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => navigate("/register")}
                  className={cn(
                    "w-full mt-5 h-10 text-sm font-semibold",
                    plan.featured
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 shadow-lg shadow-purple-500/20"
                      : "bg-card border border-border/50 text-foreground hover:border-purple-500/50"
                  )}
                >
                  Get Started
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="border-t border-border/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-600/5 to-blue-600/5 pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Build Your AI Team?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join businesses that are scaling faster with AI Staff. Pick your roles, launch your workflows, and start getting real work done today.
          </p>
          <Button
            onClick={() => navigate("/register")}
            className="h-14 px-10 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 shadow-xl shadow-purple-500/25 transition-all duration-300 hover:shadow-purple-500/40 hover:scale-105 rounded-xl"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Get Started Free
          </Button>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-border/30 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <span className="text-sm font-bold">SmartPromptIQ AI Staff</span>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} SmartPromptIQ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
