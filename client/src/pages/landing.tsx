import { usePageTitle } from "@/hooks/use-page-title";
import { useTranslation } from "react-i18next";
import heroRobotImg from "@assets/image_1770823639986.png";
import agentTeamImg from "@assets/image_1770823690247.png";
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
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LandingPage() {
  usePageTitle();
  const { t } = useTranslation();

  const services = [
    {
      icon: Phone,
      number: "01",
      title: t("landing.services.s0title"),
      description: t("landing.services.s0desc"),
    },
    {
      icon: Boxes,
      number: "02",
      title: t("landing.services.s1title"),
      description: t("landing.services.s1desc"),
    },
    {
      icon: Workflow,
      number: "03",
      title: t("landing.services.s2title"),
      description: t("landing.services.s2desc"),
    },
    {
      icon: MessageSquare,
      number: "04",
      title: t("landing.services.s3title"),
      description: t("landing.services.s3desc"),
    },
    {
      icon: Filter,
      number: "05",
      title: t("landing.services.s4title"),
      description: t("landing.services.s4desc"),
    },
    {
      icon: Target,
      number: "06",
      title: t("landing.services.s5title"),
      description: t("landing.services.s5desc"),
    },
  ];

  const platformFeatures = [
    {
      icon: Brain,
      title: t("landing.platformFeatures.f0title"),
      description: t("landing.platformFeatures.f0desc"),
    },
    {
      icon: Globe,
      title: t("landing.platformFeatures.f1title"),
      description: t("landing.platformFeatures.f1desc"),
    },
    {
      icon: Send,
      title: t("landing.platformFeatures.f2title"),
      description: t("landing.platformFeatures.f2desc"),
    },
    {
      icon: Eye,
      title: t("landing.platformFeatures.f3title"),
      description: t("landing.platformFeatures.f3desc"),
    },
    {
      icon: Layers,
      title: t("landing.platformFeatures.f4title"),
      description: t("landing.platformFeatures.f4desc"),
    },
    {
      icon: GraduationCap,
      title: t("landing.platformFeatures.f5title"),
      description: t("landing.platformFeatures.f5desc"),
    },
    {
      icon: Library,
      title: t("landing.platformFeatures.f6title"),
      description: t("landing.platformFeatures.f6desc"),
    },
    {
      icon: BarChart,
      title: t("landing.platformFeatures.f7title"),
      description: t("landing.platformFeatures.f7desc"),
    },
  ];

  const westernAgents = [
    { icon: Landmark, name: t("landing.agents.w0name"), desc: t("landing.agents.w0desc") },
    { icon: FileText, name: t("landing.agents.w1name"), desc: t("landing.agents.w1desc") },
    { icon: Building2, name: t("landing.agents.w2name"), desc: t("landing.agents.w2desc") },
    { icon: Landmark, name: t("landing.agents.w3name"), desc: t("landing.agents.w3desc") },
    { icon: RefreshCw, name: t("landing.agents.w4name"), desc: t("landing.agents.w4desc") },
    { icon: Search, name: t("landing.agents.w5name"), desc: t("landing.agents.w5desc") },
  ];

  const africanAgents = [
    { icon: Globe, name: t("landing.agents.a0name"), desc: t("landing.agents.a0desc") },
    { icon: Globe, name: t("landing.agents.a1name"), desc: t("landing.agents.a1desc") },
    { icon: Tractor, name: t("landing.agents.a2name"), desc: t("landing.agents.a2desc") },
    { icon: Users, name: t("landing.agents.a3name"), desc: t("landing.agents.a3desc") },
  ];

  const process_steps = [
    {
      step: "01",
      title: t("landing.process.step1Title"),
      description: t("landing.process.step1Desc"),
      icon: Rocket,
    },
    {
      step: "02",
      title: t("landing.process.step2Title"),
      description: t("landing.process.step2Desc"),
      icon: Bot,
    },
    {
      step: "03",
      title: t("landing.process.step3Title"),
      description: t("landing.process.step3Desc"),
      icon: TrendingUp,
    },
  ];

  const testimonials = [
    {
      name: t("landing.testimonials.t0name"),
      company: t("landing.testimonials.t0company"),
      initials: "MC",
      quote: t("landing.testimonials.t0quote"),
      rating: 5,
      result: t("landing.testimonials.t0result"),
    },
    {
      name: t("landing.testimonials.t1name"),
      company: t("landing.testimonials.t1company"),
      initials: "SW",
      quote: t("landing.testimonials.t1quote"),
      rating: 5,
      result: t("landing.testimonials.t1result"),
    },
    {
      name: t("landing.testimonials.t2name"),
      company: t("landing.testimonials.t2company"),
      initials: "DP",
      quote: t("landing.testimonials.t2quote"),
      rating: 5,
      result: t("landing.testimonials.t2result"),
    },
  ];

  const faqs = [
    { q: t("landing.faq.q0"), a: t("landing.faq.a0") },
    { q: t("landing.faq.q1"), a: t("landing.faq.a1") },
    { q: t("landing.faq.q2"), a: t("landing.faq.a2") },
    { q: t("landing.faq.q3"), a: t("landing.faq.a3") },
    { q: t("landing.faq.q4"), a: t("landing.faq.a4") },
    { q: t("landing.faq.q5"), a: t("landing.faq.a5") },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <a href="/" className="flex items-center gap-2" data-testid="link-home">
            <Zap className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold gradient-text">{t("common.brandName")}</span>
            <Badge variant="outline" className="text-[10px] ml-1 border-primary/30 text-primary">{t("common.brandTag")}</Badge>
          </a>
          <div className="hidden md:flex items-center gap-1">
            <a href="#services" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
              {t("nav.services")}
            </a>
            <a href="#agents" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
              {t("nav.aiAgents")}
            </a>
            <a href="#platform" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
              {t("nav.platform")}
            </a>
            <a href="#pricing" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
              {t("nav.pricing")}
            </a>
            <a href="#testimonials" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
              {t("nav.results")}
            </a>
            <a href="#faq" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md">
              {t("nav.faq")}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <a href="/login" data-testid="button-login">
              <Button variant="ghost" size="sm">{t("nav.clientLogin")}</Button>
            </a>
            <a href="/signup" data-testid="button-get-started">
              <Button size="sm">
                {t("nav.getStarted")}
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
              {t("landing.hero.badge")}
            </Badge>
            <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              {t("landing.hero.titlePart1")}{" "}
              <span className="gradient-text">{t("landing.hero.titleHighlight")}</span>{" "}
              {t("landing.hero.titlePart2")}
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
              {t("landing.hero.description")}
            </p>

            <div className="flex flex-wrap items-center gap-6 mb-10">
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold gradient-text">{t("landing.hero.stat1Value")}</span>
                <span className="text-sm text-muted-foreground">{t("landing.hero.stat1Label")}</span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold gradient-text">{t("landing.hero.stat2Value")}</span>
                <span className="text-sm text-muted-foreground">{t("landing.hero.stat2Label")}</span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold gradient-text">{t("landing.hero.stat3Value")}</span>
                <span className="text-sm text-muted-foreground">{t("landing.hero.stat3Label")}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a href="/signup" data-testid="button-hero-cta">
                <Button size="lg" className="text-base px-8">
                  <Rocket className="w-4 h-4 mr-2" />
                  {t("landing.hero.ctaGetStarted")}
                </Button>
              </a>
              <a href="#agents">
                <Button variant="outline" size="lg" className="text-base px-8">
                  <Boxes className="w-4 h-4 mr-2" />
                  {t("landing.hero.ctaExplore")}
                </Button>
              </a>
            </div>

            <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-chart-3" />
                <span>{t("landing.hero.trust1")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-chart-3" />
                <span>{t("landing.hero.trust2")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-chart-3" />
                <span>{t("landing.hero.trust3")}</span>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="hidden lg:block">
            <div className="relative rounded-xl overflow-hidden">
              <img src={heroRobotImg} alt="AI Agent" className="w-full h-auto rounded-xl" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Boxes, label: t("landing.heroVisual.agentCatalog"), value: t("landing.heroVisual.agentCatalogVal"), color: "bg-primary/10 text-primary" },
                    { icon: Filter, label: t("landing.heroVisual.salesFunnels"), value: t("landing.heroVisual.salesFunnelsVal"), color: "bg-chart-3/10 text-chart-3" },
                    { icon: Eye, label: t("landing.heroVisual.engagement"), value: t("landing.heroVisual.engagementVal"), color: "bg-chart-4/10 text-chart-4" },
                    { icon: Brain, label: t("landing.heroVisual.aiStrategy"), value: t("landing.heroVisual.aiStrategyVal"), color: "bg-chart-2/10 text-chart-2" },
                    { icon: Globe, label: t("landing.heroVisual.multiRegion"), value: t("landing.heroVisual.multiRegionVal"), color: "bg-amber-500/10 text-amber-400" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-md bg-background/70 backdrop-blur-sm border border-border/30">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${item.color}`}>
                        <item.icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{item.label}</p>
                        <p className="text-[10px] font-semibold text-muted-foreground">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 py-1.5 px-4 border-primary/30 bg-primary/5">
              {t("landing.services.badge")}
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              {t("landing.services.title")}{" "}
              <span className="gradient-text">{t("landing.services.titleHighlight")}</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {t("landing.services.description")}
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
              {t("landing.agents.badge")}
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              {t("landing.agents.title")}{" "}
              <span className="gradient-text">{t("landing.agents.titleHighlight")}</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {t("landing.agents.description")}
            </p>
          </div>

          <div className="relative rounded-xl overflow-hidden mb-10 max-h-64">
            <img src={agentTeamImg} alt="AI Agent Team" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
            <div className="absolute inset-0 flex items-center p-8">
              <div>
                <p className="text-2xl font-bold mb-2">{t("landing.agents.autonomousTitle")}</p>
                <p className="text-sm text-muted-foreground max-w-md">{t("landing.agents.autonomousDesc")}</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Western Agents */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">{t("landing.agents.argiflow")}</h3>
                  <p className="text-xs text-muted-foreground">{t("landing.agents.westernMarkets")}</p>
                </div>
                <Badge variant="outline" className="ml-auto text-xs">{t("landing.agents.westernRegions")}</Badge>
              </div>
              <div className="space-y-3">
                {westernAgents.map((agent) => (
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
                  <h3 className="font-bold">{t("landing.agents.tradeflow")}</h3>
                  <p className="text-xs text-muted-foreground">{t("landing.agents.africanMarkets")}</p>
                </div>
                <Badge variant="outline" className="ml-auto text-xs">{t("landing.agents.africanRegions")}</Badge>
              </div>
              <div className="space-y-3">
                {africanAgents.map((agent) => (
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
                  <span className="font-medium text-amber-400">{t("landing.agents.payPerResult")}</span> — {t("landing.agents.payPerResultDesc")}
                </p>
              </div>
            </Card>
          </div>

          <div className="text-center">
            <a href="/signup">
              <Button size="lg" className="text-base px-8">
                <Bot className="w-4 h-4 mr-2" />
                {t("landing.agents.deployCta")}
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
              {t("landing.agents.pipelineBadge")}
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              {t("landing.agents.pipelineTitle")}{" "}
              <span className="gradient-text">{t("landing.agents.pipelineTitleHighlight")}</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {t("landing.agents.pipelineDesc")}
            </p>
          </div>
          <Card className="p-8" data-testid="card-landing-pipeline">
            <CompactFlowchart />
          </Card>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
            {[
              { value: t("landing.agents.pipelineStat1Value"), label: t("landing.agents.pipelineStat1Label"), color: "text-primary" },
              { value: t("landing.agents.pipelineStat2Value"), label: t("landing.agents.pipelineStat2Label"), color: "text-chart-3" },
              { value: t("landing.agents.pipelineStat3Value"), label: t("landing.agents.pipelineStat3Label"), color: "text-chart-4" },
              { value: t("landing.agents.pipelineStat4Value"), label: t("landing.agents.pipelineStat4Label"), color: "text-amber-400" },
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
              {t("landing.platform.badge")}
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              {t("landing.platform.title")}{" "}
              <span className="gradient-text">{t("landing.platform.titleHighlight")}</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {t("landing.platform.description")}
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
              {t("landing.process.badge")}
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              {t("landing.process.title")}{" "}
              <span className="gradient-text">{t("landing.process.titleHighlight")}</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {t("landing.process.description")}
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
                    {t("landing.process.step")} {step.step}
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
                {t("landing.process.cta")}
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
              {t("landing.pricing.badge")}
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              {t("landing.pricing.title")} <span className="gradient-text">{t("landing.pricing.titleHighlight")}</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {t("landing.pricing.description")}
            </p>
          </div>

          {/* Western Pricing */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">{t("landing.agents.argiflow")}</h3>
              <Badge variant="outline" className="text-xs">{t("landing.agents.westernMarkets")}</Badge>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Starter */}
              <Card className="p-6 relative">
                <div className="text-center mb-6 pt-2">
                  <h3 className="text-lg font-semibold mb-1">{t("landing.pricing.starterName")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("landing.pricing.starterDesc")}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold">{t("landing.pricing.starterPrice")}</span>
                    <span className="text-muted-foreground">{t("landing.pricing.perMonth")}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {(t("landing.pricing.starterFeatures", { returnObjects: true }) as string[]).map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2">
                  <a href="/signup" className="block">
                    <Button className="w-full" variant="outline" data-testid="button-starter-trial">
                      {t("landing.pricing.starterCta")}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </a>
                  <a href="https://venmo.com/argilette?txn=pay&amount=297&note=ArgiFlow%20Starter%20Plan%20-%20Monthly%20Subscription" target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-[#008CFF] border-[#008CFF] text-white" variant="outline" data-testid="button-starter-venmo">
                      <SiVenmo className="w-4 h-4 mr-1" />
                      {t("landing.pricing.payWith")} Venmo
                    </Button>
                  </a>
                </div>
              </Card>

              {/* Pro */}
              <Card className="p-6 relative border-primary/40 glow-purple">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  {t("landing.pricing.proPopular")}
                </Badge>
                <div className="text-center mb-6 pt-2">
                  <h3 className="text-lg font-semibold mb-1">{t("landing.pricing.proName")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("landing.pricing.proDesc")}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold">{t("landing.pricing.proPrice")}</span>
                    <span className="text-muted-foreground">{t("landing.pricing.perMonth")}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {(t("landing.pricing.proFeatures", { returnObjects: true }) as string[]).map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2">
                  <a href="/signup" className="block">
                    <Button className="w-full" data-testid="button-pro-trial">
                      {t("landing.pricing.proCta")}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </a>
                  <a href="https://venmo.com/argilette?txn=pay&amount=597&note=ArgiFlow%20Pro%20Plan%20-%20Monthly%20Subscription" target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-[#008CFF] border-[#008CFF] text-white" variant="outline" data-testid="button-pro-venmo">
                      <SiVenmo className="w-4 h-4 mr-1" />
                      {t("landing.pricing.payWith")} Venmo
                    </Button>
                  </a>
                </div>
              </Card>

              {/* Enterprise */}
              <Card className="p-6 relative">
                <div className="text-center mb-6 pt-2">
                  <h3 className="text-lg font-semibold mb-1">{t("landing.pricing.entName")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("landing.pricing.entDesc")}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold">{t("landing.pricing.entPrice")}</span>
                    <span className="text-muted-foreground">{t("landing.pricing.perMonth")}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {(t("landing.pricing.entFeatures", { returnObjects: true }) as string[]).map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2">
                  <a href="/signup" className="block">
                    <Button className="w-full" variant="outline" data-testid="button-enterprise-trial">
                      {t("landing.pricing.entCta")}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </a>
                  <a href="https://venmo.com/argilette?txn=pay&amount=1497&note=ArgiFlow%20Enterprise%20Plan%20-%20Monthly%20Subscription" target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-[#008CFF] border-[#008CFF] text-white" variant="outline" data-testid="button-enterprise-venmo">
                      <SiVenmo className="w-4 h-4 mr-1" />
                      {t("landing.pricing.payWith")} Venmo
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
              <h3 className="text-lg font-bold">{t("landing.agents.tradeflow")}</h3>
              <Badge variant="outline" className="text-xs">{t("landing.agents.africanMarkets")}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {[
                { name: t("landing.pricing.tfHustleName"), price: t("landing.pricing.tfHustlePrice"), agents: t("landing.pricing.tfHustleAgents"), leads: t("landing.pricing.tfHustleLeads"), fee: t("landing.pricing.tfHustleFee"), features: t("landing.pricing.tfHustleFeatures", { returnObjects: true }) as string[] },
                { name: t("landing.pricing.tfBusinessName"), price: t("landing.pricing.tfBusinessPrice"), agents: t("landing.pricing.tfBusinessAgents"), leads: t("landing.pricing.tfBusinessLeads"), fee: t("landing.pricing.tfBusinessFee"), features: t("landing.pricing.tfBusinessFeatures", { returnObjects: true }) as string[], popular: true },
                { name: t("landing.pricing.tfMogulName"), price: t("landing.pricing.tfMogulPrice"), agents: t("landing.pricing.tfMogulAgents"), leads: t("landing.pricing.tfMogulLeads"), fee: t("landing.pricing.tfMogulFee"), features: t("landing.pricing.tfMogulFeatures", { returnObjects: true }) as string[] },
                { name: t("landing.pricing.tfPayPerResultName"), price: t("landing.pricing.tfPayPerResultPrice"), agents: t("landing.pricing.tfPayPerResultAgents"), leads: t("landing.pricing.tfPayPerResultLeads"), fee: t("landing.pricing.tfPayPerResultFee"), features: t("landing.pricing.tfPayPerResultFeatures", { returnObjects: true }) as string[] },
              ].map((plan) => (
                <Card key={plan.name} className={`p-4 ${plan.popular ? "border-amber-500/40" : ""}`}>
                  {plan.popular && (
                    <Badge className="mb-2 bg-amber-500 text-white text-[10px]">{t("landing.pricing.tfBusinessPopular")}</Badge>
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
                      {t("landing.pricing.getStarted")}
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
              {t("landing.testimonials.badge")}
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              {t("landing.testimonials.title")} <span className="gradient-text">{t("landing.testimonials.titleHighlight")}</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((item) => (
              <Card key={item.name} className="p-6">
                <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20 text-xs">
                    {item.result}
                  </Badge>
                </div>
                <p className="text-sm mb-6 leading-relaxed italic text-foreground/90">
                  "{item.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {item.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.company}</p>
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
              {t("landing.faq.badge")}
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              {t("landing.faq.title")} <span className="gradient-text">{t("landing.faq.titleHighlight")}</span>
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
              {t("landing.cta.title")} <span className="gradient-text">{t("landing.cta.titleHighlight")}</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              {t("landing.cta.description")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              <a href="/signup" data-testid="button-cta-final">
                <Button size="lg" className="text-base px-8">
                  <Rocket className="w-4 h-4 mr-2" />
                  {t("landing.cta.button")}
                </Button>
              </a>
              <a href="mailto:abel@argilette.com">
                <Button variant="outline" size="lg" className="text-base px-8">
                  <Mail className="w-4 h-4 mr-2" />
                  {t("landing.cta.emailUs")}
                </Button>
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("landing.cta.trialNote")}
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
                <span className="font-bold gradient-text">{t("landing.footer.brandName")}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t("landing.footer.description")}
              </p>
              <div className="flex items-center gap-3">
                <Button size="icon" variant="ghost"><SiX className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost"><SiLinkedin className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost"><SiInstagram className="w-4 h-4" /></Button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">{t("landing.footer.platformTitle")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#agents" className="hover:text-foreground transition-colors">{t("landing.footer.aiAgentCatalog")}</a></li>
                <li><a href="#services" className="hover:text-foreground transition-colors">{t("landing.footer.voiceAiAgents")}</a></li>
                <li><a href="#services" className="hover:text-foreground transition-colors">{t("landing.footer.salesFunnels")}</a></li>
                <li><a href="#platform" className="hover:text-foreground transition-colors">{t("landing.footer.engagementTracking")}</a></li>
                <li><a href="#platform" className="hover:text-foreground transition-colors">{t("landing.footer.aiStrategyEngine")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">{t("landing.footer.companyTitle")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#process" className="hover:text-foreground transition-colors">{t("landing.footer.howItWorks")}</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">{t("landing.footer.pricing")}</a></li>
                <li><a href="#testimonials" className="hover:text-foreground transition-colors">{t("landing.footer.results")}</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors">{t("landing.footer.faq")}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">{t("landing.footer.contactTitle")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/signup" className="hover:text-foreground transition-colors">{t("landing.footer.getStarted")}</a></li>
                <li><a href="mailto:info@argilette.com" className="hover:text-foreground transition-colors">info@argilette.com</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t("landing.footer.privacy")}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t("landing.footer.terms")}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col items-center md:items-start gap-1">
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} {t("landing.footer.copyright")}
              </p>
              <p className="text-[11px] text-muted-foreground/70" data-testid="text-product-of">
                {t("landing.footer.productOf")}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> {t("landing.footer.soc2")}
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> {t("landing.footer.poweredBy")}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
