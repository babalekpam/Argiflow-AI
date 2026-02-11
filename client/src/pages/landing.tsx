import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Bot,
  BarChart3,
  Calendar,
  Users,
  Mail,
  Phone,
  Target,
  TrendingUp,
  ArrowRight,
  Check,
  Star,
  ChevronRight,
  Play,
  Shield,
  Clock,
  Sparkles,
  MessageSquare,
  Headphones,
  Cog,
  Workflow,
  Brain,
  Rocket,
  ArrowDown,
  Globe,
  CheckCircle,
  Search,
  Filter,
  FileText,
  Landmark,
  Building2,
  RefreshCw,
  Tractor,
  Eye,
  MousePointerClick,
  GraduationCap,
  Library,
  Settings,
  Boxes,
  Activity,
  BarChart,
  Send,
  Layers,
} from "lucide-react";
import { SiX, SiLinkedin, SiInstagram, SiVenmo } from "react-icons/si";
import { CompactFlowchart } from "@/components/animated-flowchart";

const services = [
  {
    icon: Phone,
    number: "01",
    title: "Voice AI Agents",
    description:
      "Custom voice AI agents that handle inbound and outbound calls, qualify leads, answer questions, and schedule appointments 24/7 — so you never miss an opportunity.",
  },
  {
    icon: Boxes,
    number: "02",
    title: "Specialized AI Agent Catalog",
    description:
      "10+ industry-specific AI agents — from Tax Lien Hunters and Govt Contract Finders to Cross-Border Trade Agents. Each agent runs autonomously with its own lifecycle: discover, analyze, enrich, act, and monitor.",
  },
  {
    icon: Workflow,
    number: "03",
    title: "Process Automation",
    description:
      "We audit your workflows and automate repetitive tasks across marketing, sales, and operations using custom AI solutions that save time and eliminate errors.",
  },
  {
    icon: MessageSquare,
    number: "04",
    title: "Lead Gen Chatbots",
    description:
      "AI chatbots powered by Claude that engage visitors, answer questions, qualify leads, and book appointments — with full context of your business, website, and services.",
  },
  {
    icon: Filter,
    number: "05",
    title: "Sales Funnels & Pipeline",
    description:
      "Visual Kanban-style sales pipelines to manage deals through stages. Create custom funnels, drag-and-drop deals, and track conversion rates with stage-level analytics.",
  },
  {
    icon: Target,
    number: "06",
    title: "Email & Engagement Intelligence",
    description:
      "Automated outreach with open/click tracking. AI scores leads as Hot, Warm, or Interested based on engagement and recommends next steps — call, follow-up, or try a different channel.",
  },
];

const platformFeatures = [
  {
    icon: Brain,
    title: "AI-Generated Marketing Strategy",
    description: "Claude analyzes your business and generates a full marketing strategy on signup — automatically tailored to your industry, services, and target audience.",
  },
  {
    icon: Globe,
    title: "Website Intelligence",
    description: "AI scans and analyzes your website to extract services, value propositions, pricing, FAQs, and contact info — then injects that knowledge into every AI interaction.",
  },
  {
    icon: Send,
    title: "Omnichannel Outreach",
    description: "Send personalized emails via SendGrid and SMS via Twilio directly from the platform. AI crafts outreach messages based on your business profile and lead data.",
  },
  {
    icon: Eye,
    title: "Email Open & Click Tracking",
    description: "Know exactly which leads opened your emails, clicked your links, and when. Auto-scoring classifies leads by engagement level with recommended next actions.",
  },
  {
    icon: Layers,
    title: "Automation Arsenal",
    description: "Pre-built workflow templates for lead nurturing, follow-ups, appointment reminders, and re-engagement campaigns. Activate, pause, and customize with one click.",
  },
  {
    icon: GraduationCap,
    title: "Training Center",
    description: "Courses, tutorials, and resources to master the platform. From beginner guides to advanced AI strategy — with progress tracking and completion certificates.",
  },
  {
    icon: Library,
    title: "Resource Library",
    description: "Bot templates for 12+ industries, ad templates with 9x ROI blueprints, VSL funnel builders, organic client acquisition blueprints, and agency SOPs.",
  },
  {
    icon: BarChart,
    title: "Advanced Analytics",
    description: "Real-time dashboards tracking leads, appointments, agent performance, email engagement rates, funnel conversion, and revenue attribution across all channels.",
  },
];

const agentShowcase = [
  { icon: Landmark, name: "Tax Lien Hunter", region: "Western", desc: "Crawl county records, analyze ROI, track auctions, auto-bid" },
  { icon: FileText, name: "Tax Deed Agent", region: "Western", desc: "Find tax deed properties at county auctions nationwide" },
  { icon: Building2, name: "Wholesale RE Agent", region: "Western", desc: "Off-market deals, run comps, connect with cash buyers" },
  { icon: Landmark, name: "Govt Contracts Agent", region: "Western", desc: "Scan SAM.gov, filter by NAICS, evaluate requirements" },
  { icon: RefreshCw, name: "Arbitrage Agent", region: "Western", desc: "Profitable arbitrage across Amazon, eBay, Walmart" },
  { icon: Search, name: "Lead Gen Agent", region: "Western", desc: "AI-powered prospecting across multiple channels" },
  { icon: Globe, name: "Govt Tender Agent", region: "Africa", desc: "Find and auto-apply to government tenders continent-wide" },
  { icon: Globe, name: "Cross-Border Trade", region: "Africa", desc: "Identify import/export opportunities, match trade partners" },
  { icon: Tractor, name: "Agri Market Agent", region: "Africa", desc: "Market intelligence for agricultural commodities" },
  { icon: Users, name: "Diaspora Services", region: "Africa", desc: "Connect diaspora with investment & service opportunities" },
];

const process_steps = [
  {
    step: "01",
    title: "Sign Up & Tell Us About Your Business",
    description:
      "Create your account and tell us about your company, industry, and goals. Our AI immediately generates a customized marketing strategy and begins analyzing your website.",
    icon: Rocket,
  },
  {
    step: "02",
    title: "Deploy AI Agents",
    description:
      "Browse the Agent Catalog, enable specialized agents for your industry, and configure their settings. They start finding opportunities, leads, and deals immediately.",
    icon: Bot,
  },
  {
    step: "03",
    title: "Engage, Convert & Scale",
    description:
      "AI agents find leads, send outreach, track engagement, and move deals through your pipeline. You focus on closing while the platform handles everything else.",
    icon: TrendingUp,
  },
];

const testimonials = [
  {
    name: "Marcus Chen",
    company: "Apex Real Estate Group",
    initials: "MC",
    quote:
      "ArgiFlow's Tax Lien Hunter found 47 properties in our first week. The voice AI handles 80% of our calls. We booked 3x more appointments without hiring anyone.",
    rating: 5,
    result: "47 deals found",
  },
  {
    name: "Sarah Williams",
    company: "Pinnacle Legal",
    initials: "SW",
    quote:
      "The process automation saved us 40+ hours per week. Email tracking shows us exactly who's interested. Our team went from drowning in admin to focused on closing.",
    rating: 5,
    result: "40hrs/week saved",
  },
  {
    name: "David Park",
    company: "ScaleUp Digital",
    initials: "DP",
    quote:
      "The AI chatbot qualified more leads in one week than our SDR team did in a month. The engagement scoring tells us exactly who to call first. Game changer.",
    rating: 5,
    result: "10x lead qualification",
  },
];

const faqs = [
  {
    q: "What are AI Agents and how do they work?",
    a: "AI Agents are specialized autonomous systems that run specific tasks for your industry — like finding tax liens, scanning government contracts, or generating leads. Each agent follows a lifecycle: discover opportunities, analyze them, enrich with data, take action (send outreach, bid), and monitor results. You configure them once and they work 24/7.",
  },
  {
    q: "How long does implementation take?",
    a: "Sign up, configure your agents, and they start working immediately. Most users see their first leads within 24 hours. For more complex multi-system integrations, 2-4 weeks to fully optimize.",
  },
  {
    q: "Do I need technical knowledge?",
    a: "Not at all. The platform is designed for non-technical users. Browse the agent catalog, flip a switch to enable, and configure with simple settings. Our AI handles the complex parts.",
  },
  {
    q: "What regions do you support?",
    a: "We operate globally with two specialized brands: ArgiFlow for Western markets (US, EU, UK, Canada, Australia) and TradeFlow for African markets (Nigeria, Kenya, Ghana, South Africa, and 26+ more countries) — each with region-specific agents and pricing.",
  },
  {
    q: "Can you integrate with my existing tools?",
    a: "Yes. We integrate with CRMs (Salesforce, HubSpot), email platforms (SendGrid), SMS (Twilio), calendars, and virtually any tool with an API. All integrations are configured from your Settings dashboard.",
  },
  {
    q: "What if it doesn't work for my business?",
    a: "Every plan starts with a 14-day free trial — no credit card required. If it's not the right fit, cancel anytime with zero risk.",
  },
];

export default function LandingPage() {
  usePageTitle();
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <a href="/" className="flex items-center gap-2" data-testid="link-home">
            <Zap className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold gradient-text">ArgiFlow</span>
            <Badge variant="outline" className="text-[10px] ml-1 border-primary/30 text-primary">AI</Badge>
          </a>
          <div className="hidden md:flex items-center gap-1">
            <a href="#services" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
              Services
            </a>
            <a href="#agents" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
              AI Agents
            </a>
            <a href="#platform" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
              Platform
            </a>
            <a href="#pricing" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
              Pricing
            </a>
            <a href="#testimonials" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
              Results
            </a>
            <a href="#faq" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" data-testid="button-login">
              <Button variant="ghost" size="sm">Client Login</Button>
            </a>
            <a href="/signup" data-testid="button-get-started">
              <Button size="sm">
                Get Started
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/5 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/5 w-80 h-80 bg-chart-4/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-chart-2/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <Badge variant="outline" className="mb-6 py-1.5 px-4 border-primary/30 bg-primary/5">
              <Sparkles className="w-3.5 h-3.5 mr-2 text-primary" />
              AI Automation Platform for Revenue-Driven Businesses
            </Badge>
            <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Deploy AI Agents That{" "}
              <span className="gradient-text">Find, Engage & Close</span>{" "}
              Deals For You
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
              10+ specialized AI agents that discover opportunities, generate leads,
              send outreach, track engagement, and manage your pipeline — all on autopilot.
              Available for Western and African markets.
            </p>

            <div className="flex flex-wrap items-center gap-6 mb-10">
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold gradient-text">10+</span>
                <span className="text-sm text-muted-foreground">AI Agents Available</span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold gradient-text">24/7</span>
                <span className="text-sm text-muted-foreground">Autonomous Operation</span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold gradient-text">2</span>
                <span className="text-sm text-muted-foreground">Global Regions</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a href="/signup" data-testid="button-hero-cta">
                <Button size="lg" className="text-base px-8">
                  <Rocket className="w-4 h-4 mr-2" />
                  Get Started Free
                </Button>
              </a>
              <a href="#agents">
                <Button variant="outline" size="lg" className="text-base px-8">
                  <Boxes className="w-4 h-4 mr-2" />
                  Explore AI Agents
                </Button>
              </a>
            </div>

            <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-chart-3" />
                <span>14-Day Free Trial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-chart-3" />
                <span>Western + African Markets</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-chart-3" />
                <span>Results in 24 Hours</span>
              </div>
            </div>
          </div>

          {/* Hero Card */}
          <div className="hidden lg:block">
            <Card className="p-6 glow-purple gradient-border">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-1">Full-Stack AI Platform</h3>
                <p className="text-xs text-muted-foreground">Everything you need to scale with AI</p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: Boxes, label: "AI Agent Catalog", value: "10+ Agents", sub: "Industry-specific & autonomous", color: "bg-primary/10 text-primary" },
                  { icon: Filter, label: "Sales Funnels", value: "Kanban View", sub: "Drag-and-drop deal pipeline", color: "bg-chart-3/10 text-chart-3" },
                  { icon: Eye, label: "Engagement Tracking", value: "Real-Time", sub: "Open, click & score leads", color: "bg-chart-4/10 text-chart-4" },
                  { icon: Brain, label: "AI Strategy Engine", value: "Auto-Generated", sub: "Claude-powered business plans", color: "bg-chart-2/10 text-chart-2" },
                  { icon: Globe, label: "Multi-Region", value: "Global", sub: "Western + African markets", color: "bg-amber-500/10 text-amber-400" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-md bg-background/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${item.color}`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.sub}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 py-1.5 px-4 border-primary/30 bg-primary/5">
              Core Capabilities
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="gradient-text">Automate Revenue</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              From autonomous AI agents to engagement intelligence — a complete platform
              for finding opportunities, engaging leads, and closing deals.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.title} className="p-6 hover-elevate group relative overflow-visible">
                <div className="absolute top-4 right-4 text-4xl font-extrabold text-foreground/5 group-hover:text-primary/10 transition-colors">
                  {service.number}
                </div>
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <service.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {service.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Agent Catalog Showcase */}
      <section id="agents" className="py-24 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-0 w-80 h-80 bg-chart-4/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 py-1.5 px-4 border-primary/30 bg-primary/5">
              <Boxes className="w-3.5 h-3.5 mr-2" />
              AI Agent Catalog
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              10+ Specialized AI Agents Ready to{" "}
              <span className="gradient-text">Work For You</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Each agent is purpose-built for a specific industry or task. Enable with one click,
              configure your preferences, and let them run autonomously.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Western Agents */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">ArgiFlow</h3>
                  <p className="text-xs text-muted-foreground">Western Markets</p>
                </div>
                <Badge variant="outline" className="ml-auto text-xs">US / EU / UK / CA / AU</Badge>
              </div>
              <div className="space-y-3">
                {agentShowcase.filter(a => a.region === "Western").map((agent) => (
                  <div key={agent.name} className="flex items-center gap-3 p-2.5 rounded-md bg-secondary/30">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <agent.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* African Agents */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold">TradeFlow</h3>
                  <p className="text-xs text-muted-foreground">African Markets</p>
                </div>
                <Badge variant="outline" className="ml-auto text-xs">NG / KE / GH / ZA / 26+</Badge>
              </div>
              <div className="space-y-3">
                {agentShowcase.filter(a => a.region === "Africa").map((agent) => (
                  <div key={agent.name} className="flex items-center gap-3 p-2.5 rounded-md bg-secondary/30">
                    <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                      <agent.icon className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-md bg-amber-500/5 border border-amber-500/10">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-amber-400">Pay-Per-Result available</span> — No monthly fee. Only pay when agents deliver results.
                </p>
              </div>
            </Card>
          </div>

          <div className="text-center">
            <a href="/signup">
              <Button size="lg" className="text-base px-8">
                <Bot className="w-4 h-4 mr-2" />
                Deploy Your First Agent Free
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* AI Pipeline Flowchart */}
      <section className="py-24 relative" data-testid="section-pipeline">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/3 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 py-1.5 px-4 border-primary/30 bg-primary/5">
              The AI Pipeline
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Your Automated{" "}
              <span className="gradient-text">Client Acquisition Engine</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Watch how AI agents work together to find, qualify, nurture, and convert leads into paying clients — fully automated, 24/7.
            </p>
          </div>
          <Card className="p-8" data-testid="card-landing-pipeline">
            <CompactFlowchart />
          </Card>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
            {[
              { value: "10+", label: "AI Agents Deployed", color: "text-primary" },
              { value: "24/7", label: "Autonomous Operation", color: "text-chart-3" },
              { value: "80%", label: "Lower Acquisition Cost", color: "text-chart-4" },
              { value: "5min", label: "Setup to First Results", color: "text-amber-400" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section id="platform" className="py-24 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-chart-2/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 py-1.5 px-4 border-primary/30 bg-primary/5">
              Complete Platform
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Built-in Tools to{" "}
              <span className="gradient-text">Run Your Entire Operation</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Every tool you need — from AI strategy generation to email tracking, training resources, and analytics — all in one dashboard.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {platformFeatures.map((feature) => (
              <Card key={feature.title} className="p-5 hover-elevate">
                <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                  <feature.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works / Process */}
      <section id="process" className="py-24 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 py-1.5 px-4 border-primary/30 bg-primary/5">
              Get Started in Minutes
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Three Steps to{" "}
              <span className="gradient-text">AI-Powered Growth</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              From signup to your first leads in under 5 minutes.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {process_steps.map((step, index) => (
              <div key={step.step} className="relative">
                {index < process_steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-primary/30 to-transparent -translate-x-1/2 z-0" />
                )}
                <Card className="p-6 text-center relative z-10">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant="outline" className="mb-3 border-primary/30 text-primary text-xs">
                    Step {step.step}
                  </Badge>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </Card>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <a href="/signup">
              <Button size="lg" className="text-base px-8">
                <Rocket className="w-4 h-4 mr-2" />
                Get Started Now
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-6">
            <Badge variant="outline" className="mb-4 py-1.5 px-4 border-primary/30 bg-primary/5">
              Packages & Pricing
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Plans That <span className="gradient-text">Scale With You</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Start free, upgrade as you grow. Every plan includes the full platform.
            </p>
          </div>

          {/* Western Pricing */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">ArgiFlow</h3>
              <Badge variant="outline" className="text-xs">Western Markets</Badge>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Starter */}
              <Card className="p-6 relative">
                <div className="text-center mb-6 pt-2">
                  <h3 className="text-lg font-semibold mb-1">Starter</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Launch your first AI agent
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold">$297</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    "1 AI agent from the catalog",
                    "100 leads/month",
                    "Email & SMS outreach",
                    "CRM & lead management",
                    "AI marketing strategy",
                    "Community support",
                    "14-day free trial",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2">
                  <a href="/signup" className="block">
                    <Button className="w-full" variant="outline" data-testid="button-starter-trial">
                      Start Free Trial
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </a>
                  <a href="https://venmo.com/argilette?txn=pay&amount=297&note=ArgiFlow%20Starter%20Plan%20-%20Monthly%20Subscription" target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-[#008CFF] border-[#008CFF] text-white" variant="outline" data-testid="button-starter-venmo">
                      <SiVenmo className="w-4 h-4 mr-1" />
                      Pay with Venmo
                    </Button>
                  </a>
                </div>
              </Card>

              {/* Pro */}
              <Card className="p-6 relative border-primary/40 glow-purple">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
                <div className="text-center mb-6 pt-2">
                  <h3 className="text-lg font-semibold mb-1">Pro</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Scale with multiple agents
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold">$597</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    "3 AI agents from the catalog",
                    "500 leads/month",
                    "Voice AI & telephony agents",
                    "Sales funnels with Kanban",
                    "Engagement tracking & scoring",
                    "Priority support + strategy calls",
                    "Advanced analytics",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2">
                  <a href="/signup" className="block">
                    <Button className="w-full" data-testid="button-pro-trial">
                      Start Free Trial
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </a>
                  <a href="https://venmo.com/argilette?txn=pay&amount=597&note=ArgiFlow%20Pro%20Plan%20-%20Monthly%20Subscription" target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-[#008CFF] border-[#008CFF] text-white" variant="outline" data-testid="button-pro-venmo">
                      <SiVenmo className="w-4 h-4 mr-1" />
                      Pay with Venmo
                    </Button>
                  </a>
                </div>
              </Card>

              {/* Enterprise */}
              <Card className="p-6 relative">
                <div className="text-center mb-6 pt-2">
                  <h3 className="text-lg font-semibold mb-1">Enterprise</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Unlimited AI power
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold">$1,497</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    "Unlimited AI agents",
                    "Unlimited leads",
                    "Custom agent development",
                    "API access & white-label",
                    "Multi-system integrations",
                    "Dedicated account manager",
                    "SLA & onboarding support",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2">
                  <a href="/signup" className="block">
                    <Button className="w-full" variant="outline" data-testid="button-enterprise-trial">
                      Contact Sales
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </a>
                  <a href="https://venmo.com/argilette?txn=pay&amount=1497&note=ArgiFlow%20Enterprise%20Plan%20-%20Monthly%20Subscription" target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-[#008CFF] border-[#008CFF] text-white" variant="outline" data-testid="button-enterprise-venmo">
                      <SiVenmo className="w-4 h-4 mr-1" />
                      Pay with Venmo
                    </Button>
                  </a>
                </div>
              </Card>
            </div>
          </div>

          {/* African Pricing */}
          <div className="mt-16">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Globe className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold">TradeFlow</h3>
              <Badge variant="outline" className="text-xs">African Markets</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {[
                { name: "Hustle", price: "$5", agents: "1 Agent", leads: "50 leads/mo", fee: "5% success fee", features: ["WhatsApp alerts", "Mobile dashboard"] },
                { name: "Business", price: "$15", agents: "3 Agents", leads: "200 leads/mo", fee: "3% success fee", features: ["Full dashboard", "Tender auto-apply"], popular: true },
                { name: "Mogul", price: "$25", agents: "Unlimited", leads: "Unlimited leads", fee: "2% success fee", features: ["Priority matching", "API access"] },
                { name: "Pay Per Result", price: "$0", agents: "1 Agent", leads: "20 leads/mo", fee: "8% success fee", features: ["No monthly fee", "Pay when you earn"] },
              ].map((plan) => (
                <Card key={plan.name} className={`p-4 ${plan.popular ? "border-amber-500/40" : ""}`}>
                  {plan.popular && (
                    <Badge className="mb-2 bg-amber-500 text-white text-[10px]">Popular</Badge>
                  )}
                  <h4 className="font-semibold text-sm">{plan.name}</h4>
                  <div className="flex items-baseline gap-0.5 mt-1 mb-3">
                    <span className="text-2xl font-extrabold">{plan.price}</span>
                    {plan.price !== "$0" && <span className="text-xs text-muted-foreground">/mo</span>}
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                    <p>{plan.agents}</p>
                    <p>{plan.leads}</p>
                    <p className="text-amber-400 font-medium">{plan.fee}</p>
                  </div>
                  <ul className="space-y-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs">
                        <Check className="w-3 h-3 text-chart-3 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="/signup" className="block mt-3">
                    <Button size="sm" variant="outline" className="w-full text-xs" data-testid={`button-africa-${plan.name.toLowerCase().replace(/\s/g, "-")}`}>
                      Get Started
                    </Button>
                  </a>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-chart-4/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 py-1.5 px-4 border-primary/30 bg-primary/5">
              Client Results
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Real Businesses, <span className="gradient-text">Real Results</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <Card key={t.name} className="p-6">
                <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20 text-xs">
                    {t.result}
                  </Badge>
                </div>
                <p className="text-sm mb-6 leading-relaxed italic text-foreground/90">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.company}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 relative">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 py-1.5 px-4 border-primary/30 bg-primary/5">
              FAQ
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Common <span className="gradient-text">Questions</span>
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <Card key={i} className="p-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                  {faq.q}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                  {faq.a}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Card className="p-12 gradient-border glow-purple">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Deploy <span className="gradient-text">AI Agents?</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Sign up free, browse the agent catalog, and deploy your first AI agent in under 5 minutes.
              Let autonomous AI find opportunities, engage leads, and grow your revenue.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              <a href="/signup" data-testid="button-cta-final">
                <Button size="lg" className="text-base px-8">
                  <Rocket className="w-4 h-4 mr-2" />
                  Get Started Free
                </Button>
              </a>
              <a href="mailto:abel@argilette.com">
                <Button variant="outline" size="lg" className="text-base px-8">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Us
                </Button>
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              14-day free trial. No credit card required. Cancel anytime.
            </p>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-primary" />
                <span className="font-bold gradient-text">ArgiFlow AI</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                AI Automation Platform helping businesses scale with autonomous AI agents across Western and African markets.
              </p>
              <div className="flex items-center gap-3">
                <Button size="icon" variant="ghost"><SiX className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost"><SiLinkedin className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost"><SiInstagram className="w-4 h-4" /></Button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#agents" className="hover:text-foreground transition-colors">AI Agent Catalog</a></li>
                <li><a href="#services" className="hover:text-foreground transition-colors">Voice AI Agents</a></li>
                <li><a href="#services" className="hover:text-foreground transition-colors">Sales Funnels</a></li>
                <li><a href="#platform" className="hover:text-foreground transition-colors">Engagement Tracking</a></li>
                <li><a href="#platform" className="hover:text-foreground transition-colors">AI Strategy Engine</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#process" className="hover:text-foreground transition-colors">How It Works</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#testimonials" className="hover:text-foreground transition-colors">Results</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/signup" className="hover:text-foreground transition-colors">Get Started</a></li>
                <li><a href="mailto:abel@argilette.com" className="hover:text-foreground transition-colors">abel@argilette.com</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} ArgiFlow AI (argilette.co). All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> SOC 2 Compliant
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> Powered by Claude AI
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
