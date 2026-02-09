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
  Filter,
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
} from "lucide-react";
import { SiX, SiLinkedin, SiInstagram } from "react-icons/si";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Lead Nurturing",
    description:
      "Our AI agents automatically engage, qualify, and nurture leads through personalized conversations 24/7.",
  },
  {
    icon: Filter,
    title: "Smart Funnel Builder",
    description:
      "AI designs and optimizes your entire sales funnel, from ad copy to landing pages to follow-up sequences.",
  },
  {
    icon: Calendar,
    title: "Automated Appointment Booking",
    description:
      "Qualified leads are automatically booked into your calendar. No more back-and-forth scheduling.",
  },
  {
    icon: Mail,
    title: "Email & SMS Automation",
    description:
      "Drip campaigns that adapt in real-time based on lead behavior and engagement patterns.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description:
      "Track every metric that matters. Conversion rates, ROI, lead quality scores, and pipeline value.",
  },
  {
    icon: Target,
    title: "Multi-Channel Ads",
    description:
      "Launch and manage ads across Google, Facebook, and Instagram from one unified dashboard.",
  },
];

const steps = [
  {
    step: "01",
    title: "Tell AI Your Demand",
    description:
      "Describe your business, target audience, and goals. Our AI understands exactly what you need.",
  },
  {
    step: "02",
    title: "AI Builds Everything",
    description:
      "In minutes, AI creates your funnels, writes ad copy, sets up email sequences, and configures your CRM.",
  },
  {
    step: "03",
    title: "Launch & Scale",
    description:
      "Go live instantly. AI continuously optimizes your campaigns, nurtures leads, and books appointments.",
  },
];

const testimonials = [
  {
    name: "James Davidson",
    company: "Ecom Boss",
    initials: "JD",
    quote:
      "We went from $30k/month to $50k per WEEK in 3 months with ArgiFlow. The system just works.",
    rating: 5,
  },
  {
    name: "Sarah Lewis",
    company: "Growth Agency",
    initials: "SL",
    quote:
      "I closed $25k in new business in my first 3 weeks using ArgiFlow. The ROI is incredible!",
    rating: 5,
  },
  {
    name: "Michael Torres",
    company: "Scale Digital",
    initials: "MT",
    quote:
      "The AI agent booked 47 appointments in one month. I couldn't believe it was all automated.",
    rating: 5,
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$97",
    description: "Perfect for solo entrepreneurs",
    features: [
      "1 Sales Funnel",
      "500 Leads/month",
      "Basic AI Agent",
      "Email Automation",
      "Basic Analytics",
    ],
  },
  {
    name: "Professional",
    price: "$297",
    description: "For growing agencies",
    popular: true,
    features: [
      "5 Sales Funnels",
      "5,000 Leads/month",
      "Advanced AI Agents",
      "Email + SMS Automation",
      "Advanced Analytics",
      "Priority Support",
    ],
  },
  {
    name: "Enterprise",
    price: "$697",
    description: "For scaling businesses",
    features: [
      "Unlimited Funnels",
      "Unlimited Leads",
      "Custom AI Agents",
      "Full Automation Suite",
      "White-Label Option",
      "Dedicated Account Manager",
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <a href="/" className="flex items-center gap-2" data-testid="link-home">
            <Zap className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold gradient-text">ArgiFlow</span>
          </a>
          <div className="hidden md:flex items-center gap-1">
            <a
              href="#features"
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md"
              data-testid="link-features"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md"
              data-testid="link-how-it-works"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md"
              data-testid="link-pricing"
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md"
              data-testid="link-testimonials"
            >
              Testimonials
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/api/login" data-testid="button-login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </a>
            <a href="/api/login" data-testid="button-get-started">
              <Button size="sm">
                Get Started
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
          </div>
        </div>
      </nav>

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
              Trusted by 500+ Agencies Worldwide
            </Badge>
            <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Drop Your Demand.{" "}
              <span className="gradient-text">AI Handles Everything.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
              Just tell our AI what you need. It automatically builds your funnels,
              writes your ads, nurtures leads, books appointments, and optimizes
              everything 24/7.
            </p>

            <div className="flex flex-wrap items-center gap-6 mb-10">
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold gradient-text">$100M+</span>
                <span className="text-sm text-muted-foreground">Revenue Generated</span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold gradient-text">500+</span>
                <span className="text-sm text-muted-foreground">Businesses Scaled</span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold gradient-text">50K+</span>
                <span className="text-sm text-muted-foreground">Appointments Booked</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a href="/api/login" data-testid="button-hero-cta">
                <Button size="lg" className="text-base px-8">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Let AI Build My System
                </Button>
              </a>
              <a href="/api/login" data-testid="button-hero-signin">
                <Button variant="outline" size="lg" className="text-base px-8">
                  <Play className="w-4 h-4 mr-2" />
                  Watch Demo
                </Button>
              </a>
            </div>

            <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-chart-3" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-chart-3" />
                <span>Setup in 5 minutes</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <Card className="p-6 glow-purple gradient-border">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">This Month</p>
                  <p className="text-3xl font-bold">$127,450</p>
                </div>
                <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +24%
                </Badge>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-background/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">New Leads</p>
                      <p className="text-xs text-muted-foreground">This week</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">1,284</span>
                </div>
                <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-background/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-chart-3/10 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-chart-3" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Appointments</p>
                      <p className="text-xs text-muted-foreground">Booked today</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">28</span>
                </div>
                <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-background/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-chart-4/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-chart-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">AI Tasks</p>
                      <p className="text-xs text-muted-foreground">Completed today</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">342</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 py-1.5 px-4 border-primary/30 bg-primary/5">
              Features
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="gradient-text">Scale Fast</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              One platform to automate your entire client acquisition process. From
              first touch to booked appointment.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="p-6 hover-elevate"
                data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 py-1.5 px-4 border-primary/30 bg-primary/5">
              How It Works
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Three Steps to{" "}
              <span className="gradient-text">Automated Growth</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Get up and running in minutes, not months. Our AI does the heavy
              lifting.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={step.step} className="relative" data-testid={`step-${step.step}`}>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-px bg-gradient-to-r from-primary/30 to-transparent -translate-x-1/2 z-0" />
                )}
                <Card className="p-6 text-center relative z-10">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-lg font-bold gradient-text">{step.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 py-1.5 px-4 border-primary/30 bg-primary/5">
              Pricing
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Simple, <span className="gradient-text">Transparent Pricing</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Start free, scale when you're ready. No hidden fees.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`p-6 relative ${plan.popular ? "border-primary/40 glow-purple" : ""}`}
                data-testid={`card-pricing-${plan.name.toLowerCase()}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}
                <div className="text-center mb-6 pt-2">
                  <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <Check className="w-4 h-4 text-chart-3 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a href="/api/login" className="block">
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    data-testid={`button-plan-${plan.name.toLowerCase()}`}
                  >
                    Start Free Trial
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </a>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-24 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-chart-4/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 py-1.5 px-4 border-primary/30 bg-primary/5">
              Testimonials
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Loved by <span className="gradient-text">500+ Businesses</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <Card
                key={t.name}
                className="p-6"
                data-testid={`card-testimonial-${t.initials.toLowerCase()}`}
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
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

      <section className="py-24 relative">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Card className="p-12 gradient-border glow-purple">
            <h2 className="text-4xl font-bold mb-4">
              Ready to <span className="gradient-text">Scale Your Business?</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Join 500+ businesses that trust ArgiFlow to automate their client
              acquisition. Start your free 14-day trial today.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a href="/api/login" data-testid="button-cta-final">
                <Button size="lg" className="text-base px-8">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Free Trial
                </Button>
              </a>
              <a href="/api/login" data-testid="button-cta-demo">
                <Button variant="outline" size="lg" className="text-base px-8">
                  Schedule a Demo
                </Button>
              </a>
            </div>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border/50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-primary" />
                <span className="font-bold gradient-text">ArgiFlow</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Scale your business with automated client acquisition.
              </p>
              <div className="flex items-center gap-3">
                <Button size="icon" variant="ghost">
                  <SiX className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost">
                  <SiLinkedin className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost">
                  <SiInstagram className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Case Studies</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Partners</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 ArgiFlow. All rights reserved. Built for ARGILETTE.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
