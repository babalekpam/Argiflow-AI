import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Megaphone,
  MousePointerClick,
  Layers,
  BookOpen,
  Target,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  Briefcase,
  ShieldCheck,
  Star,
  TrendingUp,
  Play,
  Zap,
  ArrowRight,
  Phone,
  Home,
  Stethoscope,
  Scale,
  Car,
  Dumbbell,
  Wrench,
  Store,
  GraduationCap,
  Heart,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TabKey = "bot-templates" | "ad-templates" | "funnels" | "blueprint" | "sops";

const tabs: { key: TabKey; label: string; icon: typeof Bot }[] = [
  { key: "bot-templates", label: "Bot Templates", icon: Bot },
  { key: "ad-templates", label: "Ad Templates", icon: Megaphone },
  { key: "funnels", label: "VSL Funnels", icon: Layers },
  { key: "blueprint", label: "Client Blueprint", icon: Target },
  { key: "sops", label: "Agency SOPs", icon: FileText },
];

const botTemplates = [
  {
    name: "Real Estate Agent",
    industry: "Real Estate",
    icon: Home,
    conversations: "12,400+",
    price: "$5,000",
    description: "Qualifies buyers/sellers, schedules showings, handles objections. Pre-loaded with MLS integration scripts.",
    features: ["Lead qualification", "Showing scheduler", "Follow-up sequences", "Market analysis chat"],
  },
  {
    name: "Dental Receptionist",
    industry: "Dental / Medical",
    icon: Stethoscope,
    conversations: "8,200+",
    price: "$5,000",
    description: "Books appointments, handles insurance questions, sends reminders. HIPAA-compliant conversation flows.",
    features: ["Appointment booking", "Insurance verification", "Reminder system", "Emergency routing"],
  },
  {
    name: "Legal Intake Bot",
    industry: "Law Firms",
    icon: Scale,
    conversations: "6,800+",
    price: "$5,000",
    description: "Screens potential cases, collects intake info, schedules consultations. Built for PI, family, and criminal law.",
    features: ["Case screening", "Intake forms", "Consultation booking", "Conflict checks"],
  },
  {
    name: "Auto Dealership",
    industry: "Automotive",
    icon: Car,
    conversations: "9,100+",
    price: "$5,000",
    description: "Handles inventory questions, schedules test drives, captures trade-in info. Works with any DMS.",
    features: ["Inventory search", "Test drive booking", "Trade-in estimator", "Financing pre-qual"],
  },
  {
    name: "Fitness Studio",
    industry: "Health & Fitness",
    icon: Dumbbell,
    conversations: "5,600+",
    price: "$5,000",
    description: "Books classes, handles membership questions, promotes personal training packages. Integrates with scheduling.",
    features: ["Class booking", "Membership management", "PT upsells", "Trial offers"],
  },
  {
    name: "Home Services",
    industry: "HVAC / Plumbing",
    icon: Wrench,
    conversations: "11,300+",
    price: "$5,000",
    description: "Captures service requests, dispatches techs, handles emergency calls. Priority routing for urgent issues.",
    features: ["Service booking", "Emergency dispatch", "Quote generation", "Maintenance reminders"],
  },
  {
    name: "Restaurant Concierge",
    industry: "Restaurants",
    icon: Store,
    conversations: "7,400+",
    price: "$5,000",
    description: "Takes reservations, handles catering inquiries, manages waitlists. Multi-location support built in.",
    features: ["Reservations", "Catering quotes", "Waitlist management", "Event booking"],
  },
  {
    name: "Education Enrollor",
    industry: "Education",
    icon: GraduationCap,
    conversations: "4,900+",
    price: "$5,000",
    description: "Handles enrollment questions, schedules campus tours, processes applications. Perfect for schools and tutoring.",
    features: ["Enrollment guidance", "Tour scheduling", "Application status", "Financial aid info"],
  },
  {
    name: "Insurance Quoter",
    industry: "Insurance",
    icon: ShieldCheck,
    conversations: "10,200+",
    price: "$5,000",
    description: "Collects quote info, compares policies, books consultations. Works for auto, home, life, and commercial.",
    features: ["Quote collection", "Policy comparison", "Claims guidance", "Renewal reminders"],
  },
  {
    name: "Wellness Clinic",
    industry: "Med Spa / Wellness",
    icon: Heart,
    conversations: "6,100+",
    price: "$5,000",
    description: "Books treatments, handles consultation requests, promotes packages. Built for med spas and aesthetic clinics.",
    features: ["Treatment booking", "Consultation intake", "Package upsells", "Aftercare guidance"],
  },
  {
    name: "Medical Billing Assistant",
    industry: "Medical Billing",
    icon: DollarSign,
    conversations: "9,800+",
    price: "$7,500",
    description: "Handles patient billing inquiries, payment plans, insurance claim status, and collections follow-up. Reduces AR days and improves cash flow.",
    features: ["Claim status lookup", "Payment plan setup", "Balance inquiries", "Insurance verification"],
  },
  {
    name: "Revenue Cycle Manager",
    industry: "Revenue Cycle Management",
    icon: Briefcase,
    conversations: "7,600+",
    price: "$7,500",
    description: "End-to-end RCM automation: eligibility checks, prior authorizations, denial management, and patient statement follow-up. Built for healthcare practices and billing companies.",
    features: ["Eligibility verification", "Prior auth tracking", "Denial follow-up", "Payment reminders"],
  },
];

const adTemplates = [
  {
    name: "The Problem-Solution Ad",
    type: "Facebook / Instagram",
    spend: "$8,200",
    revenue: "$73,800",
    roi: "9x",
    hook: "Your phone rings. Nobody answers. That customer just called your competitor.",
    description: "Pain-point focused ad that highlights missed calls and lost revenue. Proven performer across 50+ campaigns.",
  },
  {
    name: "The Before/After Ad",
    type: "Facebook / Instagram",
    spend: "$12,400",
    revenue: "$111,600",
    roi: "9x",
    hook: "Before AI: 23% of calls answered. After AI: 100% of calls answered. 24/7.",
    description: "Side-by-side comparison showing transformation. Works especially well with real client data.",
  },
  {
    name: "The Demo Video Ad",
    type: "Facebook Video",
    spend: "$6,800",
    revenue: "$61,200",
    roi: "9x",
    hook: "Watch this AI answer a real call in 0.3 seconds...",
    description: "Short-form video showing the AI in action. Highest engagement rate of all our creatives.",
  },
  {
    name: "The ROI Calculator Ad",
    type: "Facebook Lead Form",
    spend: "$9,600",
    revenue: "$86,400",
    roi: "9x",
    hook: "How much revenue are you losing from missed calls? Enter your numbers.",
    description: "Interactive lead form ad that pre-qualifies prospects by having them calculate their own lost revenue.",
  },
  {
    name: "The Testimonial Carousel",
    type: "Facebook / Instagram",
    spend: "$5,200",
    revenue: "$46,800",
    roi: "9x",
    hook: "3 business owners. 3 industries. Same result: Never miss a call again.",
    description: "Multi-slide carousel with real client testimonials and results. High trust factor.",
  },
  {
    name: "The Scarcity Ad",
    type: "Facebook / Instagram",
    spend: "$7,800",
    revenue: "$70,200",
    roi: "9x",
    hook: "We only onboard 5 new AI voice clients per week. 2 spots left.",
    description: "Urgency-driven ad with limited availability messaging. Best for filling pipeline fast.",
  },
];

const funnelTemplates = [
  {
    name: "AI Voice Demo Funnel",
    pages: 5,
    conversionRate: "34%",
    description: "Complete VSL funnel with demo video, ROI calculator, social proof, and booking page. Import-ready.",
    steps: ["Landing Page", "VSL Video", "ROI Calculator", "Testimonials", "Book Call"],
  },
  {
    name: "Webinar Registration Funnel",
    pages: 4,
    conversionRate: "28%",
    description: "Automated webinar funnel that educates prospects and books demos. Includes replay and follow-up emails.",
    steps: ["Registration", "Thank You + Reminder", "Webinar / Replay", "Book Demo"],
  },
  {
    name: "Free Audit Funnel",
    pages: 3,
    conversionRate: "41%",
    description: "Offer a free missed-call audit to prospects. Captures info, delivers report, books strategy call.",
    steps: ["Audit Request", "Instant Report", "Strategy Call"],
  },
  {
    name: "Case Study Funnel",
    pages: 4,
    conversionRate: "22%",
    description: "Showcase client success stories with data. Builds credibility and drives warm leads to booking.",
    steps: ["Case Study Page", "Results Breakdown", "Social Proof", "Book Call"],
  },
];

const blueprintSteps = [
  {
    step: 1,
    title: "Identify Your Target Niche",
    description: "Pick 2-3 industries from the bot templates. These have proven demand. Focus where businesses answer phones daily.",
    timeframe: "Day 1",
  },
  {
    step: 2,
    title: "Build Your Hit List",
    description: "Use Google Maps, Yelp, and industry directories. Find businesses with bad reviews about phone service. These are warm leads.",
    timeframe: "Day 1-2",
  },
  {
    step: 3,
    title: "Create Personalized Demos",
    description: "Use the 1-Click Demo Builder for each prospect. Takes 3 minutes per demo. They see their business with AI already working.",
    timeframe: "Day 2-3",
  },
  {
    step: 4,
    title: "Send Cold Outreach",
    description: "Use the proven email/DM templates below. Include the personalized demo link. Follow up 3 times over 7 days.",
    timeframe: "Day 3-5",
  },
  {
    step: 5,
    title: "Run Discovery Calls",
    description: "Use the SPIN framework: Situation, Problem, Implication, Need-payoff. Let the prospect talk 80% of the time.",
    timeframe: "Day 5-7",
  },
  {
    step: 6,
    title: "Close & Install",
    description: "Use the 15-Minute Installation Checklist. Charge $5,000 setup + $997/month. Install same day. Start ROI immediately.",
    timeframe: "Day 7-10",
  },
];

const outreachTemplates = [
  {
    name: "Cold Email #1 - The Missed Call Approach",
    subject: "Quick question about [Business Name]'s phone system",
    preview: "I called [Business Name] at [time] yesterday and got voicemail. I'm guessing I'm not the only one...",
  },
  {
    name: "Cold Email #2 - The Data Drop",
    subject: "[Business Name] is losing ~$X/month from missed calls",
    preview: "The average [industry] business misses 32% of inbound calls. At your average ticket of $X...",
  },
  {
    name: "LinkedIn DM - The Demo Share",
    subject: "",
    preview: "Hey [Name], I built something for [Business Name] - an AI that answers your phones 24/7. Here's a 60-second demo with your actual business name...",
  },
  {
    name: "Follow-up #3 - The Case Study",
    subject: "How [Similar Business] added $14K/mo from missed calls",
    preview: "[Similar Business] was missing 28% of their calls. We set up AI voice for them in 15 minutes...",
  },
];

const sopCategories = [
  {
    title: "Client Installation SOPs",
    icon: Wrench,
    count: 6,
    items: [
      "Voice AI Setup Checklist (15 min)",
      "Phone Number Porting Guide",
      "Greeting Script Configuration",
      "Calendar Integration Setup",
      "CRM Connection Walkthrough",
      "Go-Live Testing Protocol",
    ],
  },
  {
    title: "Sales Process SOPs",
    icon: DollarSign,
    count: 5,
    items: [
      "Discovery Call Framework",
      "Demo Presentation Script",
      "Proposal Template + Pricing",
      "Objection Handling Guide",
      "Contract & Onboarding Flow",
    ],
  },
  {
    title: "Client Support SOPs",
    icon: Heart,
    count: 4,
    items: [
      "Monthly Check-in Template",
      "Performance Report Guide",
      "Escalation & Troubleshooting",
      "Upsell Opportunity Identification",
    ],
  },
  {
    title: "Quality Control SOPs",
    icon: ShieldCheck,
    count: 4,
    items: [
      "Call Quality Audit Checklist",
      "Bot Response Accuracy Review",
      "Customer Satisfaction Survey",
      "Weekly Performance Dashboard",
    ],
  },
  {
    title: "Scaling & Team SOPs",
    icon: Users,
    count: 5,
    items: [
      "Hiring Your First VA",
      "VA Task Delegation Template",
      "Team Training Curriculum",
      "Agency Growth Milestones",
      "Referral Program Setup",
    ],
  },
  {
    title: "Marketing SOPs",
    icon: Megaphone,
    count: 4,
    items: [
      "Content Calendar Template",
      "Social Media Posting Guide",
      "Testimonial Collection Process",
      "Case Study Creation Framework",
    ],
  },
];

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("bot-templates");
  const [installedItems, setInstalledItems] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const markInstalled = (key: string) => {
    setInstalledItems((prev) => ({ ...prev, [key]: true }));
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-resources-title">Resources</h1>
          <p className="text-muted-foreground text-sm">
            Battle-tested templates, proven ads, funnels, and SOPs to scale your agency.
          </p>
        </div>
        <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20">
          <Star className="w-3 h-3 mr-1.5" />
          Included Free
        </Badge>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon className="w-3.5 h-3.5 mr-1.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "bot-templates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              12 proven bot templates. Each one handled thousands of real conversations.
              Pick a template, install in 15 minutes, and start delivering results.
            </p>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {botTemplates.length} Templates
            </Badge>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {botTemplates.map((template, i) => {
              const key = `bot-${i}`;
              const installed = installedItems[key];
              return (
                <Card key={i} className={`p-5 ${installed ? "border-emerald-500/30" : ""}`} data-testid={`card-bot-template-${i}`}>
                  {installed && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-md bg-emerald-500/10">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-400">
                        Installed — Go to <span className="font-semibold">AI Agents</span> to configure and activate this bot.
                      </p>
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${installed ? "bg-emerald-500/10" : "bg-primary/10"}`}>
                      {installed ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <template.icon className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-sm">{template.name}</h3>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                          {template.conversations} conversations
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{template.industry}</p>
                      <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {template.features.map((f, fi) => (
                          <Badge key={fi} variant="outline" className="text-[10px] py-0 px-1.5">
                            {f}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          Charge clients <span className="text-foreground font-semibold">{template.price}</span>
                        </span>
                        {installed ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" data-testid={`badge-installed-bot-${i}`}>
                            <CheckCircle className="w-3 h-3 mr-1.5" />
                            Installed
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            data-testid={`button-install-bot-${i}`}
                            onClick={() => {
                              markInstalled(key);
                              toast({ title: `${template.name} installed`, description: `Go to AI Agents to configure and activate your new ${template.industry} bot.` });
                            }}
                          >
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Install Template
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "ad-templates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Facebook ads that generated $450K from $50K spend.
              Copy and paste our winning creatives.
            </p>
            <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20">
              9x Average ROI
            </Badge>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {adTemplates.map((ad, i) => {
              const key = `ad-${i}`;
              const used = installedItems[key];
              return (
                <Card key={i} className={`p-5 ${used ? "border-emerald-500/30" : ""}`} data-testid={`card-ad-template-${i}`}>
                  {used && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-md bg-emerald-500/10">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-400">
                        Copied to clipboard — Paste into your ad manager to launch this campaign.
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div>
                      <h3 className="font-semibold text-sm">{ad.name}</h3>
                      <p className="text-xs text-muted-foreground">{ad.type}</p>
                    </div>
                    {used ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Copied
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        {ad.roi} ROI
                      </Badge>
                    )}
                  </div>
                  <div className="bg-secondary/30 rounded-md p-3 mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Hook / Headline:</p>
                    <p className="text-sm font-medium italic">"{ad.hook}"</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{ad.description}</p>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
                    <span>Spend: <span className="text-foreground font-medium">{ad.spend}</span></span>
                    <span>Revenue: <span className="text-emerald-400 font-medium">{ad.revenue}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      data-testid={`button-copy-ad-${i}`}
                      onClick={() => handleCopy(ad.hook, "Ad hook")}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Copy Hook
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      data-testid={`button-use-ad-${i}`}
                      onClick={() => {
                        markInstalled(key);
                        handleCopy(`${ad.hook}\n\n${ad.description}`, "Ad template");
                        toast({ title: `${ad.name} copied`, description: "Full ad copy and hook are in your clipboard. Paste into your Facebook/Instagram ad manager." });
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Use Template
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "funnels" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Complete funnels that close clients automatically.
              Every page, script, and email ready to import. Swap logos, launch.
            </p>
            <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20">
              Proven Funnels
            </Badge>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {funnelTemplates.map((funnel, i) => {
              const key = `funnel-${i}`;
              const imported = installedItems[key];
              return (
                <Card key={i} className={`p-5 ${imported ? "border-emerald-500/30" : ""}`} data-testid={`card-funnel-${i}`}>
                  {imported && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-md bg-emerald-500/10">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-400">
                        Imported — Go to <span className="font-semibold">Sales Funnels</span> to customize pages and launch.
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <h3 className="font-semibold text-sm">{funnel.name}</h3>
                    {imported ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Imported
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        {funnel.conversionRate} conversion
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">{funnel.description}</p>
                  <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-3">
                    {funnel.steps.map((step, si) => (
                      <div key={si} className="flex items-center gap-1 shrink-0">
                        <div className={`px-2.5 py-1.5 rounded-md text-[10px] font-medium ${imported ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"}`}>
                          {step}
                        </div>
                        {si < funnel.steps.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">{funnel.pages} pages included</span>
                    {imported ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" data-testid={`badge-imported-funnel-${i}`}>
                        <CheckCircle className="w-3 h-3 mr-1.5" />
                        Imported
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        data-testid={`button-import-funnel-${i}`}
                        onClick={() => {
                          markInstalled(key);
                          toast({ title: `${funnel.name} imported`, description: `Go to Sales Funnels to customize your ${funnel.pages}-page funnel and launch it.` });
                        }}
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Import Funnel
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "blueprint" && (
        <div className="space-y-6">
          <Card className="p-6" data-testid="card-blueprint-header">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-md bg-chart-2/10 flex items-center justify-center shrink-0">
                <Target className="w-6 h-6 text-chart-2" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Organic Client Blueprint</h3>
                <p className="text-sm text-muted-foreground">
                  Land $5K clients with $0 ad spend. The same outreach methods that landed corporate clients cold.
                  Follow this 10-day playbook to sign your first client without spending a dollar on ads.
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">10-Day Playbook</h3>
            {blueprintSteps.map((step) => (
              <Card key={step.step} className="p-4" data-testid={`card-blueprint-step-${step.step}`}>
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                    {step.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold text-sm">{step.title}</h4>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        <Clock className="w-2.5 h-2.5 mr-1" />
                        {step.timeframe}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Outreach Templates</h3>
            {outreachTemplates.map((tpl, i) => (
              <Card key={i} className="p-4" data-testid={`card-outreach-${i}`}>
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <h4 className="font-semibold text-sm">{tpl.name}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`button-copy-outreach-${i}`}
                    onClick={() => handleCopy(tpl.preview, "Template")}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy
                  </Button>
                </div>
                {tpl.subject && (
                  <p className="text-xs text-muted-foreground mb-1">
                    Subject: <span className="text-foreground">{tpl.subject}</span>
                  </p>
                )}
                <div className="bg-secondary/30 rounded-md p-3">
                  <p className="text-xs text-muted-foreground italic">{tpl.preview}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "sops" && (
        <div className="space-y-4">
          <Card className="p-5" data-testid="card-sops-header">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">5-Minute Agency SOPs</h3>
                <p className="text-sm text-muted-foreground">
                  Every procedure documented and recorded. Installation, sales, support, quality control,
                  scaling, and team training. Hand any task to a VA instantly. Your agency runs like clockwork from day one.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sopCategories.map((cat, i) => {
              const key = `sop-${i}`;
              const viewed = installedItems[key];
              return (
                <Card key={i} className={`p-5 ${viewed ? "border-emerald-500/30" : ""}`} data-testid={`card-sop-category-${i}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center ${viewed ? "bg-emerald-500/10" : "bg-primary/10"}`}>
                      {viewed ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <cat.icon className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{cat.title}</h3>
                      <p className="text-xs text-muted-foreground">{cat.count} procedures</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {cat.items.map((item, ii) => (
                      <div key={ii} className="flex items-center gap-2 text-xs">
                        <CheckCircle className="w-3 h-3 text-chart-3 shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                  {viewed ? (
                    <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-md bg-emerald-500/10">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-400">
                        SOPs accessed — Follow each checklist step-by-step for best results.
                      </p>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      data-testid={`button-view-sops-${i}`}
                      onClick={() => {
                        markInstalled(key);
                        toast({ title: `${cat.title} accessed`, description: `${cat.count} procedures ready. Follow each checklist step-by-step for best results.` });
                      }}
                    >
                      <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                      View SOPs
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
