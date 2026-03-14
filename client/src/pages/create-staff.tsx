import { useState } from "react";
import { useLocation } from "wouter";
import {
  Megaphone,
  TrendingUp,
  PenTool,
  ClipboardList,
  Search,
  Check,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  Heart,
  BarChart3,
  Palette,
  Zap,
  Mail,
  Globe,
  Code,
  FileText,
  Share2,
  Users,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Rocket,
  Star,
  Settings,
  DollarSign,
  Terminal,
  Video,
  Headphones,
  Filter,
  Compass,
  MessageCircleHeart,
  LayoutDashboard,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/api";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/* ─── Data ─────────────────────────────────────────────────────────── */

const roleTemplates = [
  {
    id: "marketing-manager",
    name: "Marketing Manager",
    icon: Megaphone,
    gradient: "from-purple-500 to-purple-700",
    glowColor: "purple",
    ringColor: "border-purple-500",
    bgColor: "bg-purple-500",
    textColor: "text-purple-400",
    description: "Creates campaigns, manages content, analyzes performance",
    roleType: "MARKETING_MANAGER",
    capabilities: [
      "Campaign strategy & execution",
      "Content calendar management",
      "Performance analytics & reporting",
      "Brand voice consistency",
    ],
  },
  {
    id: "sales-representative",
    name: "Sales Representative",
    icon: TrendingUp,
    gradient: "from-emerald-500 to-emerald-700",
    glowColor: "emerald",
    ringColor: "border-emerald-500",
    bgColor: "bg-emerald-500",
    textColor: "text-emerald-400",
    description: "Generates leads, follows up, closes deals",
    roleType: "SALES_REPRESENTATIVE",
    capabilities: [
      "Lead qualification & scoring",
      "Outreach email sequences",
      "Pipeline management",
      "Deal negotiation support",
    ],
  },
  {
    id: "content-writer",
    name: "Content Writer",
    icon: PenTool,
    gradient: "from-blue-500 to-blue-700",
    glowColor: "blue",
    ringColor: "border-blue-500",
    bgColor: "bg-blue-500",
    textColor: "text-blue-400",
    description: "Writes blogs, social posts, emails, and copy",
    roleType: "CONTENT_WRITER",
    capabilities: [
      "Blog posts & long-form articles",
      "Social media content creation",
      "Email newsletter writing",
      "SEO-optimized copywriting",
    ],
  },
  {
    id: "admin-assistant",
    name: "Admin Assistant",
    icon: ClipboardList,
    gradient: "from-orange-500 to-orange-700",
    glowColor: "orange",
    ringColor: "border-orange-500",
    bgColor: "bg-orange-500",
    textColor: "text-orange-400",
    description: "Schedules, organizes, manages communications",
    roleType: "ADMIN_ASSISTANT",
    capabilities: [
      "Calendar & schedule management",
      "Email triage & prioritization",
      "Meeting notes & summaries",
      "Task organization & tracking",
    ],
  },
  {
    id: "researcher",
    name: "Researcher",
    icon: Search,
    gradient: "from-cyan-500 to-cyan-700",
    glowColor: "cyan",
    ringColor: "border-cyan-500",
    bgColor: "bg-cyan-500",
    textColor: "text-cyan-400",
    description: "Analyzes data, creates reports, finds insights",
    roleType: "RESEARCHER",
    capabilities: [
      "Market & competitive analysis",
      "Data synthesis & reporting",
      "Trend identification & monitoring",
      "Research paper summaries",
    ],
  },
  {
    id: "operations-manager",
    name: "Operations Manager",
    icon: Settings,
    gradient: "from-amber-500 to-amber-700",
    glowColor: "amber",
    ringColor: "border-amber-500",
    bgColor: "bg-amber-500",
    textColor: "text-amber-400",
    description: "SOPs, recurring tasks, cross-staff coordination",
    roleType: "OPERATIONS_MANAGER",
    capabilities: [
      "SOP creation from instructions",
      "Recurring task tracking & checklists",
      "Cross-staff coordination & handoffs",
      "Weekly operations summaries",
    ],
  },
  {
    id: "finance-manager",
    name: "Finance Manager",
    icon: DollarSign,
    gradient: "from-emerald-600 to-green-800",
    glowColor: "emerald",
    ringColor: "border-emerald-500",
    bgColor: "bg-emerald-600",
    textColor: "text-emerald-400",
    description: "Watches the money, explains it in plain language",
    roleType: "FINANCE_MANAGER",
    capabilities: [
      "Income & expense summaries in plain language",
      "Simple budget drafts tied to goals",
      "Monthly financial snapshots at a glance",
      "Expense categorization from CSVs",
    ],
  },
  {
    id: "brand-strategist",
    name: "Brand Strategist",
    icon: Star,
    gradient: "from-pink-500 to-rose-700",
    glowColor: "pink",
    ringColor: "border-pink-500",
    bgColor: "bg-pink-500",
    textColor: "text-pink-400",
    description: "Protects and shapes the brand voice & identity",
    roleType: "BRAND_STRATEGIST",
    capabilities: [
      "Brand voice guide from examples",
      "Campaign theme generation (3-5 angles)",
      "Content consistency & alignment checks",
      "Positioning statement development",
    ],
  },
  {
    id: "technical-assistant",
    name: "Technical Assistant",
    icon: Terminal,
    gradient: "from-sky-500 to-indigo-700",
    glowColor: "sky",
    ringColor: "border-sky-500",
    bgColor: "bg-sky-500",
    textColor: "text-sky-400",
    description: "Helps with dev, docs, and technical thinking",
    roleType: "TECHNICAL_ASSISTANT",
    capabilities: [
      "Code explanation in plain English",
      "API documentation from raw notes",
      "Bug report formatting & structuring",
      "Technical improvement suggestions",
    ],
  },
  {
    id: "media-creator",
    name: "Media Creator",
    icon: Video,
    gradient: "from-violet-500 to-purple-700",
    glowColor: "violet",
    ringColor: "border-violet-500",
    bgColor: "bg-violet-500",
    textColor: "text-violet-400",
    description: "Feeds the content machine — video, audio, social",
    roleType: "MEDIA_CREATOR",
    capabilities: [
      "YouTube long-form scripts from topic + outline",
      "10 short-form hooks per topic (Reels/TikTok)",
      "Podcast episode outlines with talking points",
      "Content repurposing across platforms",
    ],
  },
  {
    id: "customer-support",
    name: "Customer Support Agent",
    icon: Headphones,
    gradient: "from-teal-500 to-cyan-700",
    glowColor: "teal",
    ringColor: "border-teal-500",
    bgColor: "bg-teal-500",
    textColor: "text-teal-400",
    description: "Handles support, FAQs, and knowledge base",
    roleType: "CUSTOMER_SUPPORT",
    capabilities: [
      "FAQ entries from common questions",
      "Empathetic reply drafting for review",
      "Weekly support trend summaries",
      "Knowledge base creation & updates",
    ],
  },
  {
    id: "funnel-builder",
    name: "Funnel Builder",
    icon: Filter,
    gradient: "from-orange-500 to-red-600",
    glowColor: "orange",
    ringColor: "border-orange-500",
    bgColor: "bg-orange-500",
    textColor: "text-orange-400",
    description: "Builds flows that turn traffic into money",
    roleType: "FUNNEL_BUILDER",
    capabilities: [
      "Full funnel blueprints (traffic → offer)",
      "Landing page copy section by section",
      "5-7 email nurture sequences per offer",
      "Lead magnet flows with opt-in pages",
    ],
  },
  {
    id: "strategy-advisor",
    name: "Strategy Advisor",
    icon: Compass,
    gradient: "from-purple-600 to-indigo-800",
    glowColor: "purple",
    ringColor: "border-purple-600",
    bgColor: "bg-purple-600",
    textColor: "text-purple-400",
    description: "The executive brain of the AI team",
    roleType: "STRATEGY_ADVISOR",
    capabilities: [
      "Quarterly strategy briefs with priorities",
      "SWOT analysis from real notes & data",
      "Competitive snapshots with gap analysis",
      "Priority recommendations with clear 'why'",
    ],
  },
  {
    id: "community-manager",
    name: "Community Manager",
    icon: MessageCircleHeart,
    gradient: "from-rose-500 to-pink-600",
    glowColor: "rose",
    ringColor: "border-rose-500",
    bgColor: "bg-rose-500",
    textColor: "text-rose-400",
    description: "Keeps the audience warm and engaged",
    roleType: "COMMUNITY_MANAGER",
    capabilities: [
      "Daily engagement prompts & polls",
      "Empathetic reply templates for comments",
      "Weekly community health summaries",
      "Member spotlight & recognition",
    ],
  },
  {
    id: "product-manager",
    name: "Product Manager",
    icon: LayoutDashboard,
    gradient: "from-blue-600 to-indigo-700",
    glowColor: "blue",
    ringColor: "border-blue-600",
    bgColor: "bg-blue-600",
    textColor: "text-blue-400",
    description: "Thinks in features, users, and roadmaps",
    roleType: "PRODUCT_MANAGER",
    capabilities: [
      "Feature specs from ideas with user stories",
      "3-month roadmap proposals from goals",
      "User feedback clustering into themes",
      "Release notes for shipped features",
    ],
  },
  {
    id: "legal-compliance-advisor",
    name: "Legal & Compliance Advisor",
    icon: Scale,
    gradient: "from-amber-500 to-yellow-700",
    glowColor: "amber",
    ringColor: "border-amber-500",
    bgColor: "bg-amber-500",
    textColor: "text-amber-400",
    description: "Reviews policies, drafts agreements, flags risks",
    roleType: "LEGAL_COMPLIANCE_ADVISOR",
    capabilities: [
      "Policy review with plain-language summaries",
      "Simple contract drafting from templates",
      "Compliance checklists for projects & launches",
      "Legal document summarization & risk flagging",
    ],
  },
  {
    id: "seo-specialist",
    name: "SEO Specialist",
    icon: Search,
    gradient: "from-green-500 to-teal-700",
    glowColor: "green",
    ringColor: "border-green-500",
    bgColor: "bg-green-500",
    textColor: "text-green-400",
    description: "Optimizes content for search engines and organic growth",
    roleType: "SEO_SPECIALIST",
    capabilities: [
      "Full SEO content briefs for blog topics",
      "Keyword clustering from seed phrases",
      "On-page SEO audits with fix recommendations",
      "Competitor SEO gap analysis",
    ],
  },
  {
    id: "graphic-concept-designer",
    name: "Graphic Concept Designer",
    icon: Palette,
    gradient: "from-fuchsia-500 to-pink-700",
    glowColor: "fuchsia",
    ringColor: "border-fuchsia-500",
    bgColor: "bg-fuchsia-500",
    textColor: "text-fuchsia-400",
    description: "Creates concepts for graphics, ads, and branding visuals",
    roleType: "GRAPHIC_CONCEPT_DESIGNER",
    capabilities: [
      "3-5 thumbnail concepts per video",
      "Ad creative concepts with visual direction",
      "Brand visual packs (colors, type, shapes)",
      "Platform-specific social graphic concepts",
    ],
  },
  {
    id: "copy-chief",
    name: "Copy Chief",
    icon: PenTool,
    gradient: "from-purple-500 to-violet-700",
    glowColor: "purple",
    ringColor: "border-purple-500",
    bgColor: "bg-purple-500",
    textColor: "text-purple-400",
    description: "Edits, improves, and polishes all written content",
    roleType: "COPY_CHIEF",
    capabilities: [
      "Polish any pasted text for clarity & impact",
      "Generate 10 hooks per topic",
      "Rewrite content in the brand's voice",
      "Headline A/B variations with rationale",
    ],
  },
  {
    id: "ecommerce-manager",
    name: "E-commerce Manager",
    icon: Globe,
    gradient: "from-orange-500 to-amber-700",
    glowColor: "orange",
    ringColor: "border-orange-500",
    bgColor: "bg-orange-500",
    textColor: "text-orange-400",
    description: "Runs product listings, store optimization, and reviews",
    roleType: "ECOMMERCE_MANAGER",
    capabilities: [
      "SEO-optimized product descriptions",
      "Store layout audits with fix recommendations",
      "Empathetic review response drafting",
      "Upsell & cross-sell suggestions",
    ],
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    icon: BarChart3,
    gradient: "from-cyan-500 to-blue-700",
    glowColor: "cyan",
    ringColor: "border-cyan-500",
    bgColor: "bg-cyan-500",
    textColor: "text-cyan-400",
    description: "Turns raw data into insights, charts, and summaries",
    roleType: "DATA_ANALYST",
    capabilities: [
      "CSV upload → instant insights & stats",
      "Trend reports with pattern detection",
      "KPI breakdowns in plain language",
      "Text-based dashboard summaries",
    ],
  },
  {
    id: "training-onboarding-manager",
    name: "Training & Onboarding Manager",
    icon: Users,
    gradient: "from-green-500 to-emerald-700",
    glowColor: "green",
    ringColor: "border-green-500",
    bgColor: "bg-green-500",
    textColor: "text-green-400",
    description: "Trains employees, creates onboarding docs & training paths",
    roleType: "TRAINING_ONBOARDING_MANAGER",
    capabilities: [
      "Step-by-step onboarding plans for new hires",
      "Training modules with objectives & quizzes",
      "SOP walkthroughs in simple language",
      "Training path roadmaps by role or skill",
    ],
  },
  {
    id: "lead-generation-specialist",
    name: "Lead Generation Specialist",
    icon: Zap,
    gradient: "from-orange-500 to-red-700",
    glowColor: "orange",
    ringColor: "border-orange-500",
    bgColor: "bg-orange-500",
    textColor: "text-orange-400",
    description: "Finds angles, audiences, and outreach strategies",
    roleType: "LEAD_GENERATION_SPECIALIST",
    capabilities: [
      "10 lead magnet concepts per niche",
      "Cold outreach scripts that open with value",
      "Audience targeting by persona & platform",
      "Lead scoring frameworks with tiers",
    ],
  },
  {
    id: "automation-engineer",
    name: "Automation Engineer",
    icon: Settings,
    gradient: "from-blue-500 to-indigo-700",
    glowColor: "blue",
    ringColor: "border-blue-500",
    bgColor: "bg-blue-500",
    textColor: "text-blue-400",
    description: "Designs automations, workflows, and integrations",
    roleType: "AUTOMATION_ENGINEER",
    capabilities: [
      "Trigger → action automation blueprints",
      "Integration plans with data flow mapping",
      "Process optimization for existing workflows",
      "Automation audits with gap analysis",
    ],
  },
  {
    id: "knowledge-base-curator",
    name: "Knowledge Base Curator",
    icon: FileText,
    gradient: "from-cyan-500 to-teal-700",
    glowColor: "cyan",
    ringColor: "border-cyan-500",
    bgColor: "bg-cyan-500",
    textColor: "text-cyan-400",
    description: "Organizes documents, summaries, and internal knowledge",
    roleType: "KNOWLEDGE_BASE_CURATOR",
    capabilities: [
      "Instant document summaries from uploads",
      "Structured KB articles with tags & links",
      "Document tagging taxonomies",
      "Knowledge gap analysis & article outlines",
    ],
  },
] as const;

const personalities = [
  {
    id: "professional",
    name: "Professional",
    icon: Briefcase,
    description: "Formal, precise, business-focused",
  },
  {
    id: "friendly",
    name: "Friendly",
    icon: Heart,
    description: "Warm, approachable, conversational",
  },
  {
    id: "analytical",
    name: "Analytical",
    icon: BarChart3,
    description: "Data-driven, logical, detail-oriented",
  },
  {
    id: "creative",
    name: "Creative",
    icon: Palette,
    description: "Innovative, expressive, outside-the-box",
  },
  {
    id: "direct",
    name: "Direct",
    icon: Zap,
    description: "Concise, action-oriented, no fluff",
  },
] as const;

const avatarStyles = ["Modern", "Illustrated", "Realistic", "Minimal", "Cosmic"] as const;

const avatarColors = [
  { id: "purple", from: "from-purple-500", to: "to-purple-700", bg: "bg-purple-500", ring: "ring-purple-400" },
  { id: "blue", from: "from-blue-500", to: "to-blue-700", bg: "bg-blue-500", ring: "ring-blue-400" },
  { id: "green", from: "from-emerald-500", to: "to-emerald-700", bg: "bg-emerald-500", ring: "ring-emerald-400" },
  { id: "orange", from: "from-orange-500", to: "to-orange-700", bg: "bg-orange-500", ring: "ring-orange-400" },
  { id: "pink", from: "from-pink-500", to: "to-pink-700", bg: "bg-pink-500", ring: "ring-pink-400" },
  { id: "cyan", from: "from-cyan-500", to: "to-cyan-700", bg: "bg-cyan-500", ring: "ring-cyan-400" },
] as const;

const tools: readonly { id: string; name: string; icon: typeof Mail; comingSoon?: boolean; enabled: boolean }[] = [
  { id: "email", name: "Email", icon: Mail, enabled: true },
  { id: "webhooks", name: "Webhooks", icon: Globe, enabled: true },
  { id: "api", name: "SmartPromptIQ API", icon: Code, enabled: true },
  { id: "documents", name: "Documents", icon: FileText, enabled: true },
  { id: "chrome", name: "Chrome Extension", icon: Globe, comingSoon: true, enabled: false },
  { id: "social", name: "Social Posting", icon: Share2, comingSoon: true, enabled: false },
  { id: "crm", name: "CRM", icon: Users, comingSoon: true, enabled: false },
];

const workflowsByRole: Record<string, { id: string; name: string; description: string }[]> = {
  "marketing-manager": [
    { id: "daily-social", name: "Daily Social Posts", description: "Auto-generate and schedule daily social media content" },
    { id: "weekly-email", name: "Weekly Email Campaign", description: "Draft and optimize weekly email newsletters" },
    { id: "monthly-analytics", name: "Monthly Analytics", description: "Compile monthly performance reports with insights" },
    { id: "competitor-analysis", name: "Competitor Analysis", description: "Monitor and analyze competitor activities weekly" },
  ],
  "sales-representative": [
    { id: "lead-followup", name: "Lead Follow-up", description: "Automated follow-up sequences for new leads" },
    { id: "weekly-pipeline", name: "Weekly Pipeline Report", description: "Generate weekly pipeline status and forecasts" },
    { id: "proposal-gen", name: "Proposal Generator", description: "Create customized proposals from templates" },
    { id: "client-checkin", name: "Client Check-in", description: "Schedule and draft periodic client touchpoints" },
  ],
  "content-writer": [
    { id: "blog-draft", name: "Blog Post Draft", description: "Research and draft SEO-optimized blog posts" },
    { id: "social-calendar", name: "Social Media Calendar", description: "Plan and create a month of social content" },
    { id: "newsletter", name: "Newsletter Creation", description: "Curate and write engaging email newsletters" },
    { id: "seo-report", name: "SEO Report", description: "Analyze content performance and keyword rankings" },
  ],
  "admin-assistant": [
    { id: "daily-schedule", name: "Daily Schedule", description: "Organize and optimize daily agenda and tasks" },
    { id: "email-triage", name: "Email Triage", description: "Categorize and prioritize incoming emails" },
    { id: "meeting-summary", name: "Meeting Summary", description: "Generate concise meeting notes and action items" },
    { id: "task-priority", name: "Task Prioritization", description: "Rank and organize tasks by urgency and impact" },
  ],
  "researcher": [
    { id: "market-analysis", name: "Market Analysis", description: "Deep-dive research into market trends and opportunities" },
    { id: "data-report", name: "Data Report", description: "Compile and visualize data into actionable reports" },
    { id: "trend-monitoring", name: "Trend Monitoring", description: "Track emerging trends in your industry" },
    { id: "competitive-intel", name: "Competitive Intel", description: "Gather and synthesize competitive intelligence" },
  ],
  "operations-manager": [
    { id: "weekly-ops-summary", name: "Weekly Ops Summary", description: "Collect activity from all AI Staff, generate operations report" },
    { id: "sop-builder", name: "SOP Builder", description: "Turn user instructions into step-by-step SOPs with roles & ownership" },
    { id: "task-checklist", name: "Task Checklist Generator", description: "Create recurring checklists with frequency, owners, and reminders" },
    { id: "cross-staff-coord", name: "Cross-Staff Coordination", description: "Map dependencies, identify handoffs, flag misalignment across staff" },
  ],
  "finance-manager": [
    { id: "finance-snapshot", name: "Monthly Finance Snapshot", description: "Summarize revenue, expenses, and profit in plain language" },
    { id: "budget-draft", name: "Budget Draft", description: "Create a simple budget based on your goals and targets" },
    { id: "expense-categorization", name: "Expense Categorization", description: "Categorize CSV of expenses into groups, flag unusual charges" },
    { id: "cash-flow-alert", name: "Cash Flow Alert", description: "Project upcoming expenses, identify shortfall risks, suggest actions" },
  ],
  "brand-strategist": [
    { id: "brand-voice-guide", name: "Brand Voice Guide", description: "Generate a brand voice document from a few content examples" },
    { id: "campaign-theme-gen", name: "Campaign Theme Generator", description: "Create 3-5 campaign angles with hooks for a product or offer" },
    { id: "content-consistency", name: "Content Consistency Check", description: "Review content for brand alignment, flag off-brand language" },
    { id: "positioning-builder", name: "Positioning Statement Builder", description: "Craft a positioning statement and test against competitors" },
  ],
  "technical-assistant": [
    { id: "code-explanation", name: "Code Explanation", description: "Take pasted code and explain it in plain English section by section" },
    { id: "api-doc-draft", name: "API Doc Draft", description: "Turn raw notes into structured API documentation with examples" },
    { id: "bug-report-formatter", name: "Bug Report Formatter", description: "Turn messy notes into clear bug reports with steps to reproduce" },
    { id: "tech-improvements", name: "Technical Improvements", description: "Review code/architecture, suggest improvements, prioritize by impact" },
  ],
  "media-creator": [
    { id: "youtube-script", name: "YouTube Script Generator", description: "Long-form script from topic + outline with hooks and B-roll cues" },
    { id: "reels-tiktok", name: "Reels/TikTok Ideas", description: "Generate 10 short-form hooks per topic with captions and audio" },
    { id: "podcast-outline", name: "Podcast Episode Outline", description: "Structure segments, talking points, intro/outro, guest questions" },
    { id: "content-repurpose", name: "Content Repurposer", description: "Turn long-form content into short-form clips for each platform" },
  ],
  "customer-support": [
    { id: "faq-builder", name: "FAQ Builder", description: "Turn common questions into organized, clear FAQ entries" },
    { id: "reply-drafting", name: "Reply Drafting", description: "Suggest empathetic, accurate responses to customer messages" },
    { id: "support-summary", name: "Support Summary", description: "Weekly summary of common issues, trends, and resolutions" },
    { id: "kb-updater", name: "Knowledge Base Updater", description: "Review resolved tickets, write or update KB articles" },
  ],
  "funnel-builder": [
    { id: "funnel-blueprint", name: "Funnel Blueprint", description: "Map a full funnel from traffic source to offer, stage by stage" },
    { id: "landing-page-draft", name: "Landing Page Draft", description: "Generate copy sections: headline, benefits, social proof, CTA" },
    { id: "email-sequence", name: "Email Sequence", description: "Write a 5-7 email nurture sequence for a specific offer" },
    { id: "lead-magnet-flow", name: "Lead Magnet Flow", description: "Create lead magnet content, opt-in page copy, and delivery flow" },
  ],
  "strategy-advisor": [
    { id: "quarterly-brief", name: "Quarterly Strategy Brief", description: "Summarize where the business is and what to focus on next" },
    { id: "swot-analysis", name: "SWOT Analysis", description: "Generate real SWOT from notes and data, not generic templates" },
    { id: "competitive-snapshot", name: "Competitive Snapshot", description: "Summarize key competitors, their angles, and where gaps are" },
    { id: "priority-recommender", name: "Priority Recommender", description: "Score initiatives by impact, recommend top 3, explain the why" },
  ],
  "community-manager": [
    { id: "engagement-prompts", name: "Engagement Prompts", description: "Generate daily questions, polls, and discussion starters" },
    { id: "reply-suggestions", name: "Reply Suggestions", description: "Draft empathetic, on-brand responses to comments and posts" },
    { id: "community-health", name: "Community Health Summary", description: "Weekly engagement trends, sentiment, and feedback report" },
    { id: "member-spotlight", name: "Member Spotlight", description: "Identify and celebrate active or helpful community members" },
  ],
  "product-manager": [
    { id: "feature-spec", name: "Feature Spec Draft", description: "Turn an idea into a structured spec with user stories and criteria" },
    { id: "roadmap-proposal", name: "Roadmap Proposal", description: "Suggest a 3-month roadmap scored by impact and effort" },
    { id: "feedback-clustering", name: "Feedback Clustering", description: "Group user feedback into themes, ranked by frequency" },
    { id: "release-notes", name: "Release Notes Writer", description: "Write user-facing descriptions of shipped features" },
  ],
  "legal-compliance-advisor": [
    { id: "policy-review", name: "Policy Review", description: "Upload a document, get a plain-language summary plus flagged risks" },
    { id: "contract-draft", name: "Contract Draft", description: "Generate a simple agreement from a template with key terms filled in" },
    { id: "compliance-checklist", name: "Compliance Checklist", description: "Create a checklist for a new project, product, or policy change" },
    { id: "document-summarizer", name: "Document Summarizer", description: "Translate a legal document into plain English with key obligations" },
  ],
  "seo-specialist": [
    { id: "seo-content-brief", name: "SEO Content Brief", description: "Full brief for a blog topic: keywords, intent, outline, and word count" },
    { id: "keyword-cluster", name: "Keyword Cluster", description: "Create grouped keyword lists from a seed phrase, scored by difficulty" },
    { id: "seo-audit", name: "SEO Audit", description: "Analyze a webpage for title, meta, headings, keyword usage, and fixes" },
    { id: "competitor-seo", name: "Competitor SEO Analysis", description: "Find what competitors rank for, spot gaps, and recommend wins" },
  ],
  "graphic-concept-designer": [
    { id: "thumbnail-concept", name: "Thumbnail Concept", description: "Generate 3-5 thumbnail ideas with layout, colors, text, and emotion" },
    { id: "ad-creative-concepts", name: "Ad Creative Concepts", description: "Visual direction and copy placement for ad campaign variations" },
    { id: "brand-visual-pack", name: "Brand Visual Pack", description: "Suggest colors, typography, shapes, and style guide for branding" },
    { id: "social-graphic-concepts", name: "Social Graphic Concepts", description: "Platform-specific graphic layouts with design briefs" },
  ],
  "copy-chief": [
    { id: "copy-polish", name: "Copy Polish", description: "Improve any pasted text for clarity, tightness, and impact" },
    { id: "hook-generator", name: "Hook Generator", description: "Create 10 scroll-stopping hooks for any topic" },
    { id: "brand-voice-rewrite", name: "Brand Voice Rewrite", description: "Rewrite content to match the brand's exact tone and style" },
    { id: "headline-ab", name: "Headline A/B Options", description: "Generate 5-8 headline variations scored by clarity and emotion" },
  ],
  "ecommerce-manager": [
    { id: "product-listing", name: "Product Listing Builder", description: "Create optimized, benefit-driven product descriptions with SEO" },
    { id: "store-audit", name: "Store Audit", description: "Analyze store layout, images, and descriptions for improvements" },
    { id: "review-reply", name: "Review Reply Generator", description: "Draft empathetic, professional responses to customer reviews" },
    { id: "upsell-suggestions", name: "Upsell Suggestions", description: "Identify cross-sell and bundle opportunities across products" },
  ],
  "data-analyst": [
    { id: "data-summary", name: "Data Summary", description: "Upload a CSV and get key stats, outliers, and plain-language insights" },
    { id: "trend-report", name: "Trend Report", description: "Identify patterns, anomalies, and shifts over time with explanations" },
    { id: "kpi-breakdown", name: "KPI Breakdown", description: "Summarize key metrics with comparisons and context" },
    { id: "text-dashboard", name: "Text Dashboard", description: "Build a scannable metrics dashboard organized by category" },
  ],
  "training-onboarding-manager": [
    { id: "onboarding-guide", name: "Onboarding Guide", description: "Create a step-by-step onboarding plan from day one to productive" },
    { id: "training-module", name: "Training Module", description: "Turn any topic into a structured lesson with objectives and quiz" },
    { id: "sop-walkthrough", name: "SOP Walkthrough", description: "Rewrite an SOP as a simple, easy-to-follow walkthrough" },
    { id: "training-path", name: "Training Path Builder", description: "Sequence topics into a milestone-based training roadmap" },
  ],
  "lead-generation-specialist": [
    { id: "lead-magnet-ideas", name: "Lead Magnet Ideas", description: "Generate 10 lead magnet concepts ranked by conversion potential" },
    { id: "outreach-script", name: "Outreach Script", description: "Create a value-first cold outreach message with follow-up" },
    { id: "audience-targeting", name: "Audience Targeting", description: "Suggest ideal audiences, platforms, and messaging per segment" },
    { id: "lead-scoring", name: "Lead Scoring Framework", description: "Build a scoring system with criteria, points, and qualification tiers" },
  ],
  "automation-engineer": [
    { id: "automation-blueprint", name: "Automation Blueprint", description: "Map a complete workflow from trigger to action with conditions" },
    { id: "integration-plan", name: "Integration Plan", description: "Suggest tools, connections, and data flow between systems" },
    { id: "process-optimization", name: "Process Optimization", description: "Find bottlenecks in existing workflows and propose improvements" },
    { id: "automation-audit", name: "Automation Audit", description: "Review existing automations for failures, gaps, and efficiency" },
  ],
  "knowledge-base-curator": [
    { id: "document-summary", name: "Document Summary", description: "Summarize any uploaded file into key points and action items" },
    { id: "kb-entry", name: "Knowledge Base Entry", description: "Turn raw content into a structured KB article with tags" },
    { id: "tagging-system", name: "Tagging System", description: "Suggest tags and categories to make documents searchable" },
    { id: "knowledge-gap", name: "Knowledge Gap Finder", description: "Audit existing KB and identify missing topics to cover" },
  ],
};

const defaultWorkflows = [
  { id: "general-task", name: "General Task Execution", description: "Handle ad-hoc tasks and requests efficiently" },
  { id: "daily-briefing", name: "Daily Briefing", description: "Compile a daily summary of key updates" },
  { id: "report-gen", name: "Report Generation", description: "Create structured reports from raw data" },
];

/* ─── Sparkle particle ─────────────────────────────────────────────── */

function SparkleParticle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}ms` }}
    >
      <Star
        className="h-3 w-3 text-yellow-400 opacity-0"
        style={{ animation: `sparkle-float 2.5s ease-in-out ${delay}ms infinite` }}
      />
    </div>
  );
}

/* ─── Avatar pattern overlays ──────────────────────────────────────── */

function AvatarPattern({ style }: { style: string }) {
  if (style === "Modern") {
    return (
      <div className="absolute inset-0 rounded-full opacity-30">
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-white/40 rounded-lg rotate-45" />
      </div>
    );
  }
  if (style === "Illustrated") {
    return (
      <div className="absolute inset-0 rounded-full opacity-20">
        <div className="absolute inset-3 border-2 border-white/50 rounded-full border-dashed" />
      </div>
    );
  }
  if (style === "Realistic") {
    return (
      <div className="absolute inset-0 rounded-full opacity-15 bg-gradient-to-b from-white/20 to-transparent" />
    );
  }
  if (style === "Minimal") {
    return null;
  }
  if (style === "Cosmic") {
    return (
      <div className="absolute inset-0 rounded-full overflow-hidden opacity-25">
        <div className="absolute top-2 right-4 w-2 h-2 bg-white rounded-full" />
        <div className="absolute top-6 left-5 w-1 h-1 bg-white rounded-full" />
        <div className="absolute bottom-4 right-6 w-1.5 h-1.5 bg-white rounded-full" />
        <div className="absolute bottom-8 left-8 w-1 h-1 bg-white rounded-full" />
      </div>
    );
  }
  return null;
}

/* ─── Step Indicator ───────────────────────────────────────────────── */

const stepLabels = ["Choose a Role", "Customize", "Tools & Workflows", "Review & Activate"];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-lg mx-auto">
      {stepLabels.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500",
                  isDone
                    ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30"
                    : isCurrent
                    ? "border-2 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                    : "border-2 border-border/40 text-muted-foreground/40"
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap transition-colors duration-300",
                  isDone || isCurrent ? "text-foreground" : "text-muted-foreground/40"
                )}
              >
                {label}
              </span>
            </div>
            {i < stepLabels.length - 1 && (
              <div
                className={cn(
                  "w-12 sm:w-16 h-0.5 rounded-full mx-1 mb-6 transition-all duration-500",
                  stepNum < currentStep
                    ? "bg-gradient-to-r from-purple-500 to-blue-500"
                    : "bg-border/30"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────── */

export default function CreateStaffPage() {
  const [, navigate] = useLocation();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const [step, setStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Step 1 state
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Step 2 state
  const [staffName, setStaffName] = useState("");
  const [staffTitle, setStaffTitle] = useState("");
  const [staffDescription, setStaffDescription] = useState("");
  const [personality, setPersonality] = useState<string | null>(null);
  const [avatarStyle, setAvatarStyle] = useState<string>("Modern");
  const [avatarColor, setAvatarColor] = useState<string>("purple");

  // Step 3 state
  const [enabledTools, setEnabledTools] = useState<Set<string>>(
    new Set(["email", "webhooks", "api", "documents"])
  );
  const [enabledWorkflows, setEnabledWorkflows] = useState<Set<string>>(new Set());

  // Step 4 state
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sparkles for step 4
  const [sparkles] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2000,
    }))
  );

  const selectedRoleData = roleTemplates.find((r) => r.id === selectedRole);
  const currentAvatarColor = avatarColors.find((c) => c.id === avatarColor) || avatarColors[0];
  const initials = staffName
    ? staffName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AI";

  const workflows = selectedRole
    ? workflowsByRole[selectedRole] || defaultWorkflows
    : defaultWorkflows;

  const goToStep = (next: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(next);
      setIsTransitioning(false);
    }, 200);
  };

  const handleRoleSelect = (roleId: string) => {
    const role = roleTemplates.find((r) => r.id === roleId);
    setSelectedRole(roleId);
    if (role) {
      if (!staffTitle) setStaffTitle(`AI ${role.name}`);
      if (!staffDescription) setStaffDescription(role.description);
      // Set avatar color to match role
      const colorMap: Record<string, string> = {
        "marketing-manager": "purple",
        "sales-representative": "green",
        "content-writer": "blue",
        "admin-assistant": "orange",
        "researcher": "cyan",
      };
      setAvatarColor(colorMap[roleId] || "purple");
    }
  };

  const handleCustomRole = () => {
    setSelectedRole(null);
    goToStep(2);
  };

  const toggleTool = (toolId: string) => {
    setEnabledTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
  };

  const toggleWorkflow = (wfId: string) => {
    setEnabledWorkflows((prev) => {
      const next = new Set(prev);
      if (next.has(wfId)) next.delete(wfId);
      else next.add(wfId);
      return next;
    });
  };

  const canProceedStep1 = !!selectedRole;
  const canProceedStep2 = staffName.trim().length > 0 && staffTitle.trim().length > 0;

  const handleActivate = async () => {
    if (!wsId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await apiPost<{ id: number }>(`/api/workspaces/${wsId}/ai-staff`, {
        name: staffName.trim(),
        roleType: selectedRoleData?.roleType || "CUSTOM",
        description: staffDescription.trim() || undefined,
        modelConfig: {
          provider,
          temperature,
          maxTokens,
          personality,
          avatarStyle,
          avatarColor,
          tools: Array.from(enabledTools),
          workflows: Array.from(enabledWorkflows),
        },
      });
      navigate(`/ai-staff/${result.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create AI staff member";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="flex min-h-screen flex-col bg-background relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top nav */}
      <div className="w-full border-b border-border/30 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/ai-staff")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to AI Staff
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <span className="text-sm font-semibold text-foreground">Create AI Staff</span>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="w-full max-w-5xl mx-auto px-6 pt-8 pb-6">
        <StepIndicator currentStep={step} />
      </div>

      {/* Step content */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 pb-32">
        <div
          className={cn(
            "transition-all duration-200 ease-in-out",
            isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
          )}
        >
          {/* ═══════════════ STEP 1: Choose a Role ═══════════════ */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-foreground">Choose a Role</h2>
                <p className="text-muted-foreground text-base max-w-lg mx-auto">
                  Select a role template to get started quickly, or create a custom role from scratch.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {roleTemplates.map((role) => {
                  const Icon = role.icon;
                  const selected = selectedRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => handleRoleSelect(role.id)}
                      className={cn(
                        "group relative flex flex-col items-start gap-4 rounded-xl border p-6 text-left transition-all duration-300 cursor-pointer",
                        "hover:scale-[1.02] hover:shadow-lg",
                        selected
                          ? `${role.ringColor} bg-gradient-to-br ${role.gradient}/10 shadow-xl`
                          : "border-border/50 bg-card/50 hover:border-border"
                      )}
                      style={
                        selected
                          ? { boxShadow: `0 0 30px rgba(168,85,247,0.15)` }
                          : undefined
                      }
                    >
                      {/* Selected checkmark */}
                      {selected && (
                        <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg z-10">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}

                      {/* Icon */}
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                          selected
                            ? `bg-gradient-to-br ${role.gradient} shadow-lg`
                            : "bg-muted/50 group-hover:bg-muted"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-6 w-6 transition-colors duration-300",
                            selected ? "text-white" : `text-muted-foreground group-hover:${role.textColor}`
                          )}
                        />
                      </div>

                      {/* Content */}
                      <div className="space-y-2 flex-1">
                        <p className="font-semibold text-foreground">{role.name}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {role.description}
                        </p>
                      </div>

                      {/* Capabilities */}
                      <ul className="space-y-1 w-full">
                        {role.capabilities.map((cap) => (
                          <li key={cap} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <div className={cn(
                              "h-1 w-1 rounded-full mt-1.5 shrink-0",
                              selected ? role.bgColor : "bg-muted-foreground/30"
                            )} />
                            {cap}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              {/* Custom role */}
              <div className="flex justify-center">
                <button
                  onClick={handleCustomRole}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 underline underline-offset-4 decoration-muted-foreground/30 hover:decoration-foreground/50 cursor-pointer"
                >
                  Create Custom Role (skip to customization)
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 2: Customize ═══════════════ */}
          {step === 2 && (
            <div className="space-y-10 max-w-3xl mx-auto">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-foreground">Customize Your Staff Member</h2>
                <p className="text-muted-foreground text-base">
                  Give them a name, personality, and look.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                {/* Left column: form fields */}
                <div className="lg:col-span-3 space-y-8">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-purple-500" />
                      Basic Info
                    </h3>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="staff-name" className="text-xs text-muted-foreground">Name</Label>
                        <Input
                          id="staff-name"
                          placeholder='e.g., Maya'
                          value={staffName}
                          onChange={(e) => setStaffName(e.target.value)}
                          className="h-11 bg-muted/30 border-border/50 focus-visible:ring-purple-500/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="staff-title" className="text-xs text-muted-foreground">Title</Label>
                        <Input
                          id="staff-title"
                          placeholder='e.g., AI Marketing Manager'
                          value={staffTitle}
                          onChange={(e) => setStaffTitle(e.target.value)}
                          className="h-11 bg-muted/30 border-border/50 focus-visible:ring-purple-500/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="staff-desc" className="text-xs text-muted-foreground">Description</Label>
                        <Textarea
                          id="staff-desc"
                          placeholder="Describe what this staff member will do..."
                          value={staffDescription}
                          onChange={(e) => setStaffDescription(e.target.value)}
                          rows={3}
                          className="bg-muted/30 border-border/50 focus-visible:ring-purple-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Personality */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-blue-500" />
                      Personality & Tone
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {personalities.map((p) => {
                        const Icon = p.icon;
                        const selected = personality === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPersonality(p.id)}
                            className={cn(
                              "group flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer",
                              "hover:border-purple-500/50 hover:bg-purple-500/5",
                              selected
                                ? "border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                                : "border-border/50 bg-card/50"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                                selected
                                  ? "bg-gradient-to-br from-purple-500 to-blue-500"
                                  : "bg-muted/50"
                              )}
                            >
                              <Icon className={cn("h-4 w-4", selected ? "text-white" : "text-muted-foreground")} />
                            </div>
                            <div>
                              <p className={cn("text-sm font-medium", selected ? "text-foreground" : "text-foreground/80")}>
                                {p.name}
                              </p>
                              <p className="text-xs text-muted-foreground">{p.description}</p>
                            </div>
                            {selected && (
                              <Check className="h-4 w-4 text-purple-400 ml-auto shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right column: avatar preview */}
                <div className="lg:col-span-2 space-y-6">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-cyan-500" />
                    Avatar Preview
                  </h3>

                  <div className="flex flex-col items-center gap-6">
                    {/* Avatar circle */}
                    <div className="relative">
                      <div
                        className={cn(
                          "h-40 w-40 rounded-full flex items-center justify-center bg-gradient-to-br transition-all duration-500",
                          currentAvatarColor.from,
                          currentAvatarColor.to,
                          "shadow-2xl"
                        )}
                        style={{ boxShadow: `0 0 40px rgba(168,85,247,0.2)` }}
                      >
                        <AvatarPattern style={avatarStyle} />
                        <span className="text-4xl font-bold text-white relative z-10 select-none">
                          {initials}
                        </span>
                      </div>
                      <div className={cn(
                        "absolute -inset-1 rounded-full bg-gradient-to-br opacity-20 blur-sm -z-10",
                        currentAvatarColor.from,
                        currentAvatarColor.to
                      )} />
                    </div>

                    {/* Style buttons */}
                    <div className="space-y-2 w-full">
                      <p className="text-xs text-muted-foreground text-center">Style</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {avatarStyles.map((s) => (
                          <button
                            key={s}
                            onClick={() => setAvatarStyle(s)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer",
                              avatarStyle === s
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/50"
                                : "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/50"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color swatches */}
                    <div className="space-y-2 w-full">
                      <p className="text-xs text-muted-foreground text-center">Color</p>
                      <div className="flex justify-center gap-3">
                        {avatarColors.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setAvatarColor(c.id)}
                            className={cn(
                              "h-8 w-8 rounded-full transition-all duration-200 cursor-pointer bg-gradient-to-br",
                              c.from, c.to,
                              avatarColor === c.id
                                ? `ring-2 ${c.ring} ring-offset-2 ring-offset-background scale-110`
                                : "opacity-60 hover:opacity-100 hover:scale-105"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 3: Tools & Workflows ═══════════════ */}
          {step === 3 && (
            <div className="space-y-10 max-w-3xl mx-auto">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-foreground">Tools & Workflows</h2>
                <p className="text-muted-foreground text-base">
                  Enable integrations and set up automated workflows.
                </p>
              </div>

              {/* Tools */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-purple-500" />
                  Tools & Integrations
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tools.map((tool) => {
                    const Icon = tool.icon;
                    const isEnabled = enabledTools.has(tool.id);
                    const isComingSoon = tool.comingSoon;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => !isComingSoon && toggleTool(tool.id)}
                        disabled={isComingSoon}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200",
                          isComingSoon
                            ? "border-border/30 bg-card/30 cursor-not-allowed opacity-50"
                            : isEnabled
                            ? "border-purple-500/50 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.1)] cursor-pointer"
                            : "border-border/50 bg-card/50 hover:border-border cursor-pointer"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                            isEnabled && !isComingSoon
                              ? "bg-gradient-to-br from-purple-500 to-blue-500"
                              : "bg-muted/50"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5",
                              isEnabled && !isComingSoon ? "text-white" : "text-muted-foreground"
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <p className={cn("text-sm font-medium", isEnabled ? "text-foreground" : "text-foreground/70")}>
                            {tool.name}
                          </p>
                        </div>
                        {isComingSoon ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                            Soon
                          </span>
                        ) : (
                          <div
                            className={cn(
                              "h-5 w-9 rounded-full transition-all duration-300 relative",
                              isEnabled ? "bg-purple-500" : "bg-muted/60"
                            )}
                          >
                            <div
                              className={cn(
                                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-300",
                                isEnabled ? "left-4.5" : "left-0.5"
                              )}
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Workflows */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-blue-500" />
                  Suggested Workflows
                  {selectedRoleData && (
                    <span className="text-xs font-normal normal-case text-muted-foreground">
                      for {selectedRoleData.name}
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {workflows.map((wf) => {
                    const isEnabled = enabledWorkflows.has(wf.id);
                    return (
                      <button
                        key={wf.id}
                        type="button"
                        onClick={() => toggleWorkflow(wf.id)}
                        className={cn(
                          "group flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer",
                          isEnabled
                            ? "border-blue-500/50 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                            : "border-border/50 bg-card/50 hover:border-border"
                        )}
                      >
                        <div className="flex-1 space-y-1">
                          <p className={cn("text-sm font-medium", isEnabled ? "text-foreground" : "text-foreground/70")}>
                            {wf.name}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{wf.description}</p>
                        </div>
                        <div
                          className={cn(
                            "h-5 w-9 rounded-full transition-all duration-300 relative shrink-0 mt-0.5",
                            isEnabled ? "bg-blue-500" : "bg-muted/60"
                          )}
                        >
                          <div
                            className={cn(
                              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-300",
                              isEnabled ? "left-4.5" : "left-0.5"
                            )}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 4: Review & Activate ═══════════════ */}
          {step === 4 && (
            <div className="space-y-8 max-w-2xl mx-auto relative">
              {/* Sparkles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {sparkles.map((s) => (
                  <SparkleParticle key={s.id} delay={s.delay} x={s.x} y={s.y} />
                ))}
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-foreground">Review & Activate</h2>
                <p className="text-muted-foreground text-base">
                  Everything looks great. Let's bring your AI staff member to life.
                </p>
              </div>

              {/* Summary card */}
              <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
                {/* Header with avatar */}
                <div className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 p-8 flex flex-col items-center gap-4">
                  <div className="relative">
                    <div
                      className={cn(
                        "h-24 w-24 rounded-full flex items-center justify-center bg-gradient-to-br shadow-xl",
                        currentAvatarColor.from,
                        currentAvatarColor.to
                      )}
                    >
                      <AvatarPattern style={avatarStyle} />
                      <span className="text-2xl font-bold text-white relative z-10">{initials}</span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-background">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-foreground">{staffName || "Unnamed"}</h3>
                    <p className="text-sm text-muted-foreground">{staffTitle || "AI Staff Member"}</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {selectedRoleData && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {(() => { const Icon = selectedRoleData.icon; return <Icon className="h-3 w-3" />; })()}
                        {selectedRoleData.name}
                      </span>
                    )}
                    {personality && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {personalities.find((p) => p.id === personality)?.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="p-6 space-y-5">
                  {/* Tools */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Enabled Tools
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(enabledTools).map((toolId) => {
                        const tool = tools.find((t) => t.id === toolId);
                        if (!tool) return null;
                        const Icon = tool.icon;
                        return (
                          <span
                            key={toolId}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/50 text-foreground/80 border border-border/30"
                          >
                            <Icon className="h-3 w-3" />
                            {tool.name}
                          </span>
                        );
                      })}
                      {enabledTools.size === 0 && (
                        <span className="text-xs text-muted-foreground">No tools selected</span>
                      )}
                    </div>
                  </div>

                  {/* Workflows */}
                  {enabledWorkflows.size > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Active Workflows
                      </p>
                      <div className="space-y-1.5">
                        {Array.from(enabledWorkflows).map((wfId) => {
                          const wf = workflows.find((w) => w.id === wfId);
                          if (!wf) return null;
                          return (
                            <div key={wfId} className="flex items-center gap-2 text-sm">
                              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                              <span className="text-foreground/80">{wf.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Advanced Settings */}
                  <div className="border-t border-border/30 pt-4">
                    <button
                      onClick={() => setAdvancedOpen(!advancedOpen)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full"
                    >
                      {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <span className="font-medium">Advanced Settings</span>
                    </button>

                    {advancedOpen && (
                      <div className="mt-4 space-y-4 pl-6">
                        {/* Provider */}
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">AI Provider</Label>
                          <Select value={provider} onValueChange={setProvider}>
                            <SelectTrigger className="h-10 bg-muted/30 border-border/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="openai">OpenAI</SelectItem>
                              <SelectItem value="anthropic">Anthropic</SelectItem>
                              <SelectItem value="google">Google</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Temperature */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Temperature</Label>
                            <span className="text-xs font-mono text-foreground/70">{temperature.toFixed(1)}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none bg-muted/60 accent-purple-500 cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground/50">
                            <span>Precise</span>
                            <span>Creative</span>
                          </div>
                        </div>

                        {/* Max Tokens */}
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Max Tokens</Label>
                          <Input
                            type="number"
                            value={maxTokens}
                            onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                            className="h-10 bg-muted/30 border-border/50 font-mono text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive text-center">
                  {error}
                </div>
              )}

              {/* Activate button */}
              <Button
                onClick={handleActivate}
                disabled={isSubmitting}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 shadow-xl shadow-purple-500/25 transition-all duration-300 hover:shadow-purple-500/40 hover:scale-[1.01] rounded-xl"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Rocket className="h-5 w-5 mr-2" />
                    Activate Staff Member
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border/30 bg-background/90 backdrop-blur-sm z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              if (step === 1) navigate("/ai-staff");
              else goToStep(step - 1);
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => goToStep(step + 1)}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 shadow-lg shadow-purple-500/20 transition-all duration-200 hover:shadow-purple-500/30 px-8"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <div /> // Placeholder — activate button is inline on step 4
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
      `}</style>
    </div>
  );
}
