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
} from "lucide-react";
import { SiX, SiLinkedin, SiInstagram } from "react-icons/si";
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
    icon: Workflow,
    number: "02",
    title: "Process Automation",
    description:
      "We audit your workflows and automate repetitive tasks across marketing, sales, and operations using custom AI solutions that save time and eliminate errors.",
  },
  {
    icon: MessageSquare,
    number: "03",
    title: "Lead Gen Chatbots",
    description:
      "AI chatbots for your website that engage visitors, answer questions, qualify leads, and book appointments while you focus on closing deals.",
  },
  {
    icon: Headphones,
    number: "04",
    title: "AI Receptionists",
    description:
      "Virtual receptionists that handle calls, route inquiries, and schedule meetings — ensuring every customer gets instant, professional attention around the clock.",
  },
  {
    icon: Target,
    number: "05",
    title: "CRM Integration",
    description:
      "Seamless integration of AI solutions with your existing CRM — Salesforce, HubSpot, or custom — ensuring data flows efficiently across every business tool.",
  },
  {
    icon: Brain,
    number: "06",
    title: "Bespoke AI Solutions",
    description:
      "Custom AI solutions engineered for your unique business challenges. From predictive analytics to intelligent document processing — we build what you need.",
  },
];

const process_steps = [
  {
    step: "01",
    title: "Book a Discovery Call",
    description:
      "Tell us about your business, challenges, and goals. We'll identify the highest-ROI AI opportunities specific to your operations.",
    icon: Calendar,
  },
  {
    step: "02",
    title: "Custom Solution Design",
    description:
      "We design a tailored AI strategy — selecting the right technologies, integration points, and implementation plan for maximum impact.",
    icon: Cog,
  },
  {
    step: "03",
    title: "Build & Integrate",
    description:
      "Our team builds and deploys your AI systems with seamless integration into existing workflows. We train your team to maximize results.",
    icon: Rocket,
  },
];

const testimonials = [
  {
    name: "Marcus Chen",
    company: "Apex Real Estate Group",
    initials: "MC",
    quote:
      "ArgiFlow's voice AI agent handles 80% of our inbound calls now. We booked 3x more appointments in the first month without hiring a single person.",
    rating: 5,
    result: "3x appointments",
  },
  {
    name: "Sarah Williams",
    company: "Pinnacle Legal",
    initials: "SW",
    quote:
      "The process automation alone saved us 40+ hours per week. Our team went from drowning in admin to focused on billable work.",
    rating: 5,
    result: "40hrs/week saved",
  },
  {
    name: "David Park",
    company: "ScaleUp Digital",
    initials: "DP",
    quote:
      "Their chatbot qualified more leads in one week than our SDR team did in a month. The ROI was immediate and undeniable.",
    rating: 5,
    result: "10x lead qualification",
  },
];

const targetAudiences = [
  {
    title: "Startups",
    subtitle: "Achieve PMF Faster",
    description:
      "Race to product-market fit with AI that makes your small team operate like a big one. Automate customer discovery, lead gen, and support from day one.",
    icon: Rocket,
  },
  {
    title: "SMBs",
    subtitle: "Scale Without Hiring",
    description:
      "Implement AI in the most critical areas of your business. Reduce costs, increase output, and stay ahead of competitors who are still doing things manually.",
    icon: TrendingUp,
  },
  {
    title: "Small Teams",
    subtitle: "10x Your Output",
    description:
      "Every team member using AI daily becomes 10x more productive. We train your people and build the systems that multiply what they can accomplish.",
    icon: Users,
  },
];

const faqs = [
  {
    q: "How long does implementation take?",
    a: "Most automations go live within 2-4 weeks. Complex, multi-system integrations may take 4-8 weeks. You'll see results fast.",
  },
  {
    q: "Do I need technical knowledge?",
    a: "Not at all. We handle everything — design, build, integration, and training. You just tell us your pain points and goals.",
  },
  {
    q: "What if it doesn't work for my business?",
    a: "We offer a 100% money-back guarantee on the Starter Package. If we can't deliver measurable value, you pay nothing.",
  },
  {
    q: "Can you integrate with my existing tools?",
    a: "Yes. We integrate with virtually any CRM, email platform, phone system, or business tool. If it has an API, we can connect it.",
  },
];

export default function LandingPage() {
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
            <a href="#process" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
              How It Works
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
              AI Automation Agency for Growing Businesses
            </Badge>
            <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Scale Your Business With{" "}
              <span className="gradient-text">AI Automation</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
              We help SMBs, startups, and small teams harness AI to slash costs,
              scale revenue, and 10x output — without hiring additional staff.
            </p>

            <div className="flex flex-wrap items-center gap-6 mb-10">
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold gradient-text">24/7</span>
                <span className="text-sm text-muted-foreground">AI Working For You</span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold gradient-text">10x</span>
                <span className="text-sm text-muted-foreground">Team Productivity</span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold gradient-text">2-4 Wks</span>
                <span className="text-sm text-muted-foreground">To See Results</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a href="/signup" data-testid="button-hero-cta">
                <Button size="lg" className="text-base px-8">
                  <Rocket className="w-4 h-4 mr-2" />
                  Get Started Free
                </Button>
              </a>
              <a href="#services">
                <Button variant="outline" size="lg" className="text-base px-8">
                  <ArrowDown className="w-4 h-4 mr-2" />
                  See Our Services
                </Button>
              </a>
            </div>

            <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-chart-3" />
                <span>100% Money-Back Guarantee</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-chart-3" />
                <span>Results in 2-4 Weeks</span>
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
                <h3 className="text-lg font-bold mb-1">What AI Can Do For You</h3>
                <p className="text-xs text-muted-foreground">Capabilities built for growing businesses</p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: Phone, label: "Voice AI Agents", value: "24/7 Coverage", sub: "Inbound & outbound calls", color: "bg-primary/10 text-primary" },
                  { icon: MessageSquare, label: "Lead Gen Chatbots", value: "Always On", sub: "Qualify & convert visitors", color: "bg-chart-3/10 text-chart-3" },
                  { icon: Workflow, label: "Process Automation", value: "End-to-End", sub: "Sales, marketing & ops", color: "bg-chart-4/10 text-chart-4" },
                  { icon: Calendar, label: "Smart Scheduling", value: "Automated", sub: "AI-powered booking", color: "bg-chart-2/10 text-chart-2" },
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
              Our AI Services
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Comprehensive AI Solutions to{" "}
              <span className="gradient-text">Transform Your Business</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              From voice AI to process automation — we build, integrate, and optimize
              AI systems tailored to your exact needs.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.title} className="p-6 hover-elevate group relative overflow-hidden">
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
              { value: "10x", label: "More Leads Generated", color: "text-primary" },
              { value: "24/7", label: "AI Working Non-Stop", color: "text-chart-3" },
              { value: "80%", label: "Lower Acquisition Cost", color: "text-chart-4" },
              { value: "5x", label: "Faster Response Time", color: "text-amber-400" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Serve */}
      <section className="py-24 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-chart-4/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 py-1.5 px-4 border-primary/30 bg-primary/5">
              Who We Serve
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Built for Teams That Want to{" "}
              <span className="gradient-text">Scale Fast</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {targetAudiences.map((audience) => (
              <Card key={audience.title} className="p-8 text-center hover-elevate">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                  <audience.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-1">{audience.title}</h3>
                <p className="text-primary text-sm font-medium mb-4">{audience.subtitle}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {audience.description}
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
              Our Process
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              How We Implement{" "}
              <span className="gradient-text">AI for Your Business</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              A proven 3-step process for delivering AI automation that actually works.
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
              Invest in <span className="gradient-text">Real Growth</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Every engagement starts with a discovery call. These packages are starting points — 
              we customize based on your specific needs.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Starter Package */}
            <Card className="p-6 relative">
              <div className="text-center mb-6 pt-2">
                <h3 className="text-lg font-semibold mb-1">Starter Package</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  One-time setup to launch your first AI system
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold">$1,497</span>
                  <span className="text-muted-foreground">one-time</span>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  "AI & automation audit of your business",
                  "One full automation build (sales, marketing, or support)",
                  "Up to 30 min/week for calls",
                  "Unlimited questions via Slack/Telegram",
                  "Basic team training on automations we build",
                  "No-code & AI platform implementation",
                  "30-day money-back guarantee",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="/signup" className="block">
                <Button className="w-full" variant="outline">
                  Get Started
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </a>
            </Card>

            {/* Ongoing Package */}
            <Card className="p-6 relative border-primary/40 glow-purple">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                Most Popular
              </Badge>
              <div className="text-center mb-6 pt-2">
                <h3 className="text-lg font-semibold mb-1">Ongoing Growth</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Continuous automation & optimization
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold">$997</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  "Full AI & automation audit",
                  "Up to 2 systems automated simultaneously",
                  "Ongoing updates for all past implementations",
                  "Up to 45 min/week for strategy calls",
                  "Priority support via your preferred channel",
                  "Weekly analytics report",
                  "Unlimited questions via Slack/Telegram",
                  "Pause or cancel anytime",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="/signup" className="block">
                <Button className="w-full">
                  Get Started
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </a>
            </Card>

            {/* Custom Package */}
            <Card className="p-6 relative">
              <div className="text-center mb-6 pt-2">
                <h3 className="text-lg font-semibold mb-1">Enterprise / Custom</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Custom AI agents, integrations & more
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold">Custom</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Quoted per project</p>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  "Everything in Ongoing Growth",
                  "Custom AI agent development",
                  "Voice AI & telephony systems",
                  "Advanced CRM integrations",
                  "Multi-system automation",
                  "Dedicated project manager",
                  "Custom reporting & analytics",
                  "White-label options available",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="/signup" className="block">
                <Button className="w-full" variant="outline">
                  Let's Talk
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </a>
            </Card>
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
                <div className="flex items-center justify-between mb-4">
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
              Ready to <span className="gradient-text">Scale with AI?</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Sign up for free and explore how AI can transform your business operations.
              We'll help you identify the highest-ROI opportunities and get started fast.
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
              No commitment required. 100% money-back guarantee on Starter Package.
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
                AI Automation Agency helping businesses scale with intelligent automation.
              </p>
              <div className="flex items-center gap-3">
                <Button size="icon" variant="ghost"><SiX className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost"><SiLinkedin className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost"><SiInstagram className="w-4 h-4" /></Button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Services</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#services" className="hover:text-foreground transition-colors">Voice AI Agents</a></li>
                <li><a href="#services" className="hover:text-foreground transition-colors">Process Automation</a></li>
                <li><a href="#services" className="hover:text-foreground transition-colors">Lead Gen Chatbots</a></li>
                <li><a href="#services" className="hover:text-foreground transition-colors">CRM Integration</a></li>
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
          <div className="pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 ArgiFlow AI. All rights reserved. An ARGILETTE company.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
