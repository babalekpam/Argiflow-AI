import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Target,
  TrendingUp,
  Users,
  Mail,
  Phone,
  Globe,
  Workflow,
  Sparkles,
  Bot,
  MessageSquare,
  Calendar,
  Filter,
  Zap,
  CheckCircle,
  ArrowRight,
  DollarSign,
  BarChart3,
  Clock,
  ChevronDown,
  ChevronUp,
  Rocket,
  Shield,
  LucideIcon,
} from "lucide-react";
import { useLocation } from "wouter";

interface PhaseData {
  day: string;
  title: string;
  icon: LucideIcon;
  tasks: string[];
  whyItMatters: string;
  incomeImpact: string;
  linkTo?: string;
  linkLabel?: string;
}

const phases: PhaseData[] = [
  {
    day: "Day 1",
    title: "Set Up Your Business Profile",
    icon: Users,
    tasks: [
      "Register your account on the platform",
      "Complete the onboarding discovery questionnaire",
      "Enter your company name, website, industry, and description",
      "Train the AI on your website so it understands your business",
    ],
    whyItMatters:
      "The AI uses your business profile to personalize every outreach message, marketing strategy, and lead generation task. The more it knows about you, the better it performs.",
    incomeImpact:
      "A well-configured profile means higher response rates on outreach. Personalized messages convert 3-5x better than generic templates.",
    linkTo: "/dashboard/settings",
    linkLabel: "Go to Settings",
  },
  {
    day: "Day 1-2",
    title: "Generate Your Marketing Strategy",
    icon: Sparkles,
    tasks: [
      "Navigate to the Marketing Strategy page",
      "Let the AI analyze your business and generate a customized strategy",
      "Review the recommended channels, messaging, and tactics",
    ],
    whyItMatters:
      "Instead of guessing what marketing approach to take, you get a data-driven strategy tailored to your specific industry and target market.",
    incomeImpact:
      "A clear strategy prevents wasted time and money on tactics that don't work for your business.",
    linkTo: "/dashboard/strategy",
    linkLabel: "Go to Strategy",
  },
  {
    day: "Day 2-3",
    title: "Activate AI Lead Generation",
    icon: Bot,
    tasks: [
      "Go to the Agent Catalog and select the AI agent that matches your industry",
      "Configure the agent with your target criteria",
      "Let the agent run and automatically find leads",
    ],
    whyItMatters:
      "Manual lead research takes 2-4 hours per day. The AI does this automatically, finding 30+ qualified leads per batch.",
    incomeImpact:
      "If each lead has a 5% conversion rate and your average deal is $2,000, then 30 leads = 1-2 new clients = $2,000-$4,000 per batch.",
    linkTo: "/dashboard/agent-catalog",
    linkLabel: "Go to Agent Catalog",
  },
  {
    day: "Day 3-5",
    title: "Launch Automated Outreach",
    icon: Mail,
    tasks: [
      "Review the AI-generated leads in your CRM",
      "Each lead comes with a pre-written, personalized outreach email",
      "Send individual emails or create bulk campaigns",
      "Schedule outreach for optimal delivery times",
      "The automated follow-up system handles the rest (3 follow-ups over 7 days)",
    ],
    whyItMatters:
      "80% of sales require 5+ touchpoints, but most people give up after one email. Automated follow-ups ensure persistent, professional contact.",
    incomeImpact:
      "Follow-up sequences typically increase response rates by 40-60%. That means more conversations, more meetings, and more closed deals.",
    linkTo: "/dashboard/email",
    linkLabel: "Go to Email & SMS",
  },
  {
    day: "Day 5-7",
    title: "Engage Forum Leads",
    icon: Globe,
    tasks: [
      "Open Forum Prospector from the sidebar",
      "Search for discussions related to your services",
      "The AI finds people actively asking for help on forums",
      "Review AI-drafted replies, edit if needed, then copy and post",
    ],
    whyItMatters:
      'These are "hand-raisers" -- people who are already looking for exactly what you offer. They\'re the warmest leads you\'ll ever find.',
    incomeImpact:
      "Forum leads have significantly higher conversion rates (10-20%) because the prospect already has the need and is actively seeking solutions.",
    linkTo: "/dashboard/forum-prospector",
    linkLabel: "Go to Forum Prospector",
  },
  {
    day: "Week 2",
    title: "Use Voice AI for Qualification",
    icon: Phone,
    tasks: [
      "From any lead card, initiate a Voice AI call",
      "The AI calls the prospect, introduces your services, and qualifies interest",
      "Call transcripts, duration, and status are logged automatically",
      "Interested prospects are moved to higher pipeline stages",
    ],
    whyItMatters:
      "Phone calls have the highest conversion rate of any outreach method, but they're time-consuming. Voice AI handles the initial qualifying call.",
    incomeImpact:
      "Phone outreach typically converts 5-10x better than email alone. Voice AI lets you make dozens of qualifying calls daily without picking up the phone.",
    linkTo: "/dashboard/voice-ai",
    linkLabel: "Go to Voice AI",
  },
  {
    day: "Week 2-3",
    title: "Build Automated Workflows",
    icon: Workflow,
    tasks: [
      "Go to the Workflow Builder (drag-and-drop visual editor)",
      "Choose from 6 pre-built templates or build custom workflows",
      'Use "AI Generate" to have Claude automatically customize workflows for your business',
    ],
    whyItMatters:
      "Workflows connect all the pieces together. When a lead opens your email, the system automatically scores them higher, sends a follow-up, and alerts you.",
    incomeImpact:
      "Automation eliminates 10-20 hours per week of manual tasks. That time can be reinvested into delivering services or strategic growth.",
    linkTo: "/dashboard/workflows",
    linkLabel: "Go to Workflow Builder",
  },
  {
    day: "Ongoing",
    title: "Monitor, Optimize, and Scale",
    icon: BarChart3,
    tasks: [
      "Check your Dashboard daily for key metrics",
      "Review lead scores and engagement levels in the CRM",
      "Track deals through your Sales Funnels",
      "Monitor AI Inbox for automated responses",
      "Adjust outreach templates based on what's working",
    ],
    whyItMatters:
      "Data-driven decisions compound over time. Small improvements in conversion rates lead to significant revenue increases.",
    incomeImpact:
      "Consistent optimization can double your conversion rates within 3-6 months, significantly multiplying your revenue.",
  },
];

interface StrategyData {
  name: string;
  bestFor: string;
  approach: string[];
  expectedResults: string;
  icon: LucideIcon;
}

const strategies: StrategyData[] = [
  {
    name: "The Volume Play",
    bestFor: "Service businesses with a large addressable market",
    approach: [
      "Run AI lead generation daily to maximize pipeline volume",
      "Use bulk email campaigns for initial outreach",
      "Let automated follow-ups handle persistence",
      "Use Voice AI to qualify the best responders",
    ],
    expectedResults: "100-200 leads/week, 5-10 qualified conversations, 2-4 new clients/month",
    icon: TrendingUp,
  },
  {
    name: "The Precision Play",
    bestFor: "High-ticket service providers (B2B consultants, specialized agencies)",
    approach: [
      "Use Forum Prospector to find highly qualified warm leads",
      "Write deeply personalized outreach using AI drafts",
      "Focus on fewer, higher-quality conversations",
      "Build relationship-focused follow-up sequences",
    ],
    expectedResults: "20-40 qualified leads/week, 5-8 meaningful conversations, 1-2 high-value clients/month",
    icon: Target,
  },
  {
    name: "The Multi-Channel Blitz",
    bestFor: "Competitive industries where standing out matters",
    approach: [
      "Combine email + SMS + Voice AI + forum engagement",
      "Hit prospects across multiple channels for maximum visibility",
      "Use workflow automation to coordinate timing across channels",
      "Example: Email Monday, SMS Wednesday, Voice AI Friday",
    ],
    expectedResults: "3-5x higher response rates, faster pipeline velocity, stronger brand recognition",
    icon: Zap,
  },
  {
    name: "The Passive Pipeline",
    bestFor: "Solo entrepreneurs who want growth without daily effort",
    approach: [
      "Set up automated lead generation (runs every 5 hours)",
      "Configure automated outreach and follow-up sequences",
      "Enable AI Inbox Monitor for auto-replies",
      "Check in 2-3 times per week to review and close",
    ],
    expectedResults: "Consistent pipeline with minimal involvement, 1-2 new clients/month on near-autopilot",
    icon: Clock,
  },
];

const projections = [
  {
    scenario: "Conservative",
    description: "Part-time use, service business",
    data: [
      { month: "Month 1", leads: 60, clients: 1, revenue: "$2,000" },
      { month: "Month 3", leads: 180, clients: 3, revenue: "$6,000" },
      { month: "Month 6", leads: 360, clients: 5, revenue: "$10,000" },
      { month: "Month 12", leads: 720, clients: 8, revenue: "$16,000" },
    ],
  },
  {
    scenario: "Moderate",
    description: "Active daily use, dedicated outreach",
    data: [
      { month: "Month 1", leads: 200, clients: 3, revenue: "$9,000" },
      { month: "Month 3", leads: 600, clients: 7, revenue: "$21,000" },
      { month: "Month 6", leads: 1200, clients: 12, revenue: "$36,000" },
      { month: "Month 12", leads: 2400, clients: 20, revenue: "$60,000" },
    ],
  },
  {
    scenario: "Aggressive",
    description: "Full automation, high-ticket services",
    data: [
      { month: "Month 1", leads: 300, clients: 5, revenue: "$25,000" },
      { month: "Month 3", leads: 900, clients: 12, revenue: "$60,000" },
      { month: "Month 6", leads: 1800, clients: 20, revenue: "$100,000" },
      { month: "Month 12", leads: 3600, clients: 35, revenue: "$175,000" },
    ],
  },
];

const featureCategories = [
  {
    title: "Lead Generation",
    icon: Target,
    features: [
      "AI Agent Catalog - 10+ specialized agents for different industries",
      "Automatic Lead Generation - Runs every 5 hours, 30 leads per batch",
      "Forum Prospector - Finds warm leads on Reddit, Quora, and industry forums",
      "Lead Scoring - AI-powered scoring to prioritize the best opportunities",
      "Multi-Business Support - Track leads for up to 4 separate business lines",
    ],
  },
  {
    title: "Outreach & Communication",
    icon: Mail,
    features: [
      "AI Email Outreach - Personalized emails generated by AI",
      "Bulk Campaigns - Send to hundreds of leads at once",
      "SMS Messaging - Text message outreach for higher open rates",
      "Voice AI Calling - AI phone calls for qualification and booking",
      "Automated Follow-Ups - 3-step sequences (Day 3, 5, 7)",
      "AI Inbox Monitor - Automatically replies to prospect emails",
    ],
  },
  {
    title: "Sales Management",
    icon: Filter,
    features: [
      "CRM Dashboard - Central view of all leads and activities",
      "Sales Funnels - Kanban-style deal tracking",
      "Appointment Scheduling - Manage client meetings",
      "Engagement Tracking - Monitor email opens, clicks, and responses",
    ],
  },
  {
    title: "Automation",
    icon: Workflow,
    features: [
      "Visual Workflow Builder - Drag-and-drop automation designer",
      "30+ Action Types - AI classify, score, generate, email, SMS, voice",
      "Pre-Built Templates - 6 ready-to-use workflow templates",
      "AI Workflow Generation - Claude AI customizes workflows for you",
      "Event-Driven Triggers - 13 event hooks for full automation",
    ],
  },
];

const checklistItems = [
  "Create your account",
  "Complete the onboarding questionnaire",
  "Train the AI on your website",
  "Generate your marketing strategy",
  "Set up your first AI agent for lead generation",
  "Review and send outreach to your first batch of leads",
  "Configure automated follow-up sequences",
  "Search forums with Forum Prospector for warm leads",
  "Build your first workflow automation",
  "Set up Voice AI for lead qualification",
  "Monitor your dashboard and optimize based on results",
];

export default function PlatformGuidePage() {
  const [, setLocation] = useLocation();
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const [activeProjection, setActiveProjection] = useState(1);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const toggleChecked = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const completedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <BookOpen className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-guide-title">
              How to Increase Your Income with ArgiFlow
            </h1>
          </div>
          <p className="text-muted-foreground" data-testid="text-guide-subtitle">
            A practical guide to automated client acquisition. Follow these steps to build a consistent pipeline and grow your revenue.
          </p>
        </div>

        <Card className="p-5" data-testid="card-guide-problem">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingUp className="w-5 h-5 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">The Problem Every Entrepreneur Faces</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Most entrepreneurs in service-based businesses face the same bottleneck: <strong className="text-foreground">finding clients consistently</strong>. You get busy delivering services, stop marketing, projects end, and you scramble to find new clients. This "feast or famine" cycle keeps income unpredictable and growth stagnant.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ArgiFlow breaks this cycle by automating client acquisition so your pipeline is always full -- like hiring an entire sales team that works 24/7 and costs a fraction of a single employee.
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Step-by-Step: From Sign-Up to Revenue
          </h2>
          <p className="text-sm text-muted-foreground">
            Follow these 8 phases to go from zero to a fully automated client acquisition machine.
          </p>
          <div className="space-y-2">
            {phases.map((phase, idx) => {
              const PhaseIcon = phase.icon;
              const isExpanded = expandedPhase === idx;
              return (
                <Card
                  key={idx}
                  className="overflow-visible"
                  data-testid={`card-guide-phase-${idx}`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    className="w-full p-4 flex items-center gap-3 text-left cursor-pointer hover-elevate"
                    onClick={() => setExpandedPhase(isExpanded ? null : idx)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpandedPhase(isExpanded ? null : idx); }}
                    data-testid={`button-guide-phase-${idx}`}
                  >
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <PhaseIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] py-0 shrink-0">
                          {phase.day}
                        </Badge>
                        <span className="text-sm font-medium">
                          Phase {idx + 1}: {phase.title}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4">
                      <div className="pl-11 space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                            What to do
                          </p>
                          <ul className="space-y-1">
                            {phase.tasks.map((task, tIdx) => (
                              <li key={tIdx} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                <span>{task}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="rounded-md bg-muted/50 p-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                              Why It Matters
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {phase.whyItMatters}
                            </p>
                          </div>
                          <div className="rounded-md bg-primary/5 p-3">
                            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">
                              Income Impact
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {phase.incomeImpact}
                            </p>
                          </div>
                        </div>
                        {phase.linkTo && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(phase.linkTo!)}
                            data-testid={`button-guide-goto-${idx}`}
                          >
                            {phase.linkLabel}
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Income-Generating Strategies
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose the strategy that best fits your business model and capacity.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {strategies.map((strategy, idx) => {
              const StratIcon = strategy.icon;
              return (
                <Card key={idx} className="p-4 space-y-3" data-testid={`card-guide-strategy-${idx}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <StratIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{strategy.name}</p>
                      <p className="text-[11px] text-muted-foreground">{strategy.bestFor}</p>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {strategy.approach.map((item, aIdx) => (
                      <li key={aIdx} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">Expected:</span> {strategy.expectedResults}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Revenue Projections
          </h2>
          <p className="text-sm text-muted-foreground">
            Estimated results based on different levels of engagement with the platform.
          </p>
          <div className="flex gap-1 mb-2">
            {projections.map((proj, idx) => (
              <Button
                key={idx}
                variant={activeProjection === idx ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveProjection(idx)}
                data-testid={`button-guide-projection-${idx}`}
              >
                {proj.scenario}
              </Button>
            ))}
          </div>
          <Card className="p-4" data-testid="card-guide-projections">
            <p className="text-xs text-muted-foreground mb-3">
              {projections[activeProjection].description}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Timeline</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">Leads</th>
                    <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">Clients</th>
                    <th className="text-right py-2 pl-4 text-xs font-medium text-primary">Monthly Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {projections[activeProjection].data.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-4 text-sm">{row.month}</td>
                      <td className="py-2.5 px-4 text-sm text-right text-muted-foreground">{row.leads.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-sm text-right text-muted-foreground">{row.clients}</td>
                      <td className="py-2.5 pl-4 text-sm text-right font-semibold text-primary">{row.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 italic">
              Results vary based on industry, market conditions, service quality, and level of engagement.
            </p>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Platform Features at a Glance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {featureCategories.map((cat, idx) => {
              const CatIcon = cat.icon;
              return (
                <Card key={idx} className="p-4 space-y-2" data-testid={`card-guide-features-${idx}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <CatIcon className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold">{cat.title}</p>
                  </div>
                  <ul className="space-y-1">
                    {cat.features.map((feat, fIdx) => (
                      <li key={fIdx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="p-5" data-testid="card-guide-checklist">
          <div className="flex items-center gap-2 mb-1">
            <Rocket className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Getting Started Checklist</h2>
            <Badge variant="outline" className="ml-auto text-xs">
              {completedCount}/{checklistItems.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Track your progress as you set up the platform for maximum results.
          </p>
          <div className="w-full bg-muted rounded-full h-2 mb-4">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / checklistItems.length) * 100}%` }}
              data-testid="progress-guide-checklist"
            />
          </div>
          <ul className="space-y-1.5">
            {checklistItems.map((item, idx) => (
              <li key={idx}>
                <button
                  className="flex items-center gap-2.5 w-full text-left py-1 group"
                  onClick={() => toggleChecked(idx)}
                  data-testid={`button-guide-check-${idx}`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      checkedItems[idx]
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {checkedItems[idx] && (
                      <CheckCircle className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                  <span
                    className={`text-sm transition-colors ${
                      checkedItems[idx]
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {item}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 bg-primary/5 border-primary/20" data-testid="card-guide-cta">
          <div className="text-center space-y-3">
            <h2 className="text-lg font-semibold">Ready to Start Growing?</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Begin with Phase 1 by setting up your business profile, then work through each phase at your own pace. The platform is designed to deliver results from day one.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button onClick={() => setLocation("/dashboard/settings")} data-testid="button-guide-start-settings">
                Set Up Profile
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="outline" onClick={() => setLocation("/dashboard/strategy")} data-testid="button-guide-start-strategy">
                Generate Strategy
              </Button>
              <Button variant="outline" onClick={() => setLocation("/dashboard/agent-catalog")} data-testid="button-guide-start-agents">
                Find Leads
              </Button>
            </div>
          </div>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center pb-4">
          Revenue projections are estimates based on typical conversion rates. Actual results will vary based on industry, market conditions, service quality, and level of engagement with the platform.
        </p>
      </div>
    </div>
  );
}
