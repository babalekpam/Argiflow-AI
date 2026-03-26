import { useState, useRef, useEffect, useCallback } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";
import { AriaWidget } from "@/components/aria-widget";
import botHeroImg from "@assets/generated_images/bot-hero.png";
import botLeadScoutImg from "@assets/generated_images/bot-lead-scout.png";
import botEmailWriterImg from "@assets/generated_images/bot-email-writer.png";
import botVoiceCallerImg from "@assets/generated_images/bot-voice-caller.png";
import botAnalyticsImg from "@assets/generated_images/bot-analytics.png";
import botTeamImg from "@assets/generated_images/bot-team.png";
import {
  Search, Send, Phone, Target, TrendingUp, ArrowRight, Check,
  Play, Shield, Clock, Sparkles, MessageSquare, Headphones, Brain,
  Rocket, Globe, Users, Mail, BarChart3, Zap, Bot, Activity,
  BarChart, Layers, Flame, ChevronRight, ArrowLeft, Mic,
  FileText, Settings, CreditCard, PieChart, PhoneCall,
  Database, Eye, Star, Calendar, Filter, X, RotateCw, Menu,
  Workflow, MousePointerClick, Megaphone, PenTool, BookOpen,
  Building2, ShieldCheck, Cpu, CircuitBoard, Gauge, Link2,
  ScanLine, UserCheck, Inbox, GraduationCap, Code2, Palette,
  LineChart, Receipt, Briefcase, Network
} from "lucide-react";

type ViewType = "landing" | "demo" | "getstarted";
type DemoTab = "leads" | "outreach" | "voice" | "email";

const mockLeads = [
  { name: "Dr. Sarah Martinez", title: "Practice Owner", company: "OrthoCare Miami", email: "s.martinez@orthocare.com", phone: "(305) 882-4411", score: 92, stype: "high" },
  { name: "James Wilson", title: "Office Manager", company: "Gulf Coast Pediatrics", email: "j.wilson@gcpeds.com", phone: "(239) 445-7823", score: 88, stype: "high" },
  { name: "Dr. Kevin Patel", title: "Physician Owner", company: "Sunrise Family Medicine", email: "kpatel@sunrisefm.com", phone: "(813) 229-5510", score: 94, stype: "high" },
  { name: "Amanda Torres", title: "Billing Director", company: "Tampa Bay Medical Group", email: "a.torres@tbmg.com", phone: "(727) 338-9902", score: 71, stype: "med" },
  { name: "Dr. Robert Chen", title: "Practice Owner", company: "Bayview Family Practice", email: "rchen@bayviewfp.com", phone: "(561) 774-3311", score: 79, stype: "med" },
  { name: "Lisa Thompson", title: "Office Admin", company: "Palm Beach Dermatology", email: "l.thompson@pbderm.com", phone: "(561) 447-2200", score: 83, stype: "high" },
  { name: "Dr. Michael Reeves", title: "Practice Owner", company: "Reeves Internal Medicine", email: "m.reeves@revmed.com", phone: "(407) 882-5511", score: 91, stype: "high" },
  { name: "Sandra Nguyen", title: "Billing Manager", company: "Central Florida Urgent Care", email: "s.nguyen@cfuc.com", phone: "(407) 338-7700", score: 66, stype: "med" },
];

const transcriptLines = [
  { role: "ai", text: "Hi, this is Alex calling from ArgiFlow. Am I speaking with Dr. Torres?" },
  { role: "prospect", text: "Yes, this is she. What is this regarding?" },
  { role: "ai", text: "I'm calling because a lot of medical practices in Tampa are losing money on billing errors and staff turnover. We've built an AI system that handles the entire billing process. Do you handle billing in-house currently?" },
  { role: "prospect", text: "We do, yeah — it's been a headache honestly." },
  { role: "ai", text: "I completely understand. Most practices lose 15-20% of revenue to billing errors they don't even catch. Could we schedule a 15-minute call this week to show you exactly how much you might be leaving on the table?" },
  { role: "prospect", text: "Sure, I have Thursday afternoon open." },
  { role: "ai", text: "Perfect. I'll send a calendar invite to your office email. Thursday at 2pm work for you?" },
];

export default function LandingPage() {
  usePageTitle();
  const { t } = useTranslation();

  const plans = [
    {
      name: t("landing.pricing2.starterName"), price: t("landing.pricing2.starterPrice"), tagline: t("landing.pricing2.starterTagline"),
      features: [t("landing.pricing2.starterF0"), t("landing.pricing2.starterF1"), t("landing.pricing2.starterF2"), t("landing.pricing2.starterF3"), t("landing.pricing2.starterF4"), t("landing.pricing2.starterF5")],
    },
    {
      name: t("landing.pricing2.growthName"), price: t("landing.pricing2.growthPrice"), tagline: t("landing.pricing2.growthTagline"), popular: true,
      features: [t("landing.pricing2.growthF0"), t("landing.pricing2.growthF1"), t("landing.pricing2.growthF2"), t("landing.pricing2.growthF3"), t("landing.pricing2.growthF4"), t("landing.pricing2.growthF5"), t("landing.pricing2.growthF6")],
    },
    {
      name: t("landing.pricing2.agencyName"), price: t("landing.pricing2.agencyPrice"), tagline: t("landing.pricing2.agencyTagline"),
      features: [t("landing.pricing2.agencyF0"), t("landing.pricing2.agencyF1"), t("landing.pricing2.agencyF2"), t("landing.pricing2.agencyF3"), t("landing.pricing2.agencyF4"), t("landing.pricing2.agencyF5"), t("landing.pricing2.agencyF6"), t("landing.pricing2.agencyF7")],
    },
  ];

  const [currentView, setCurrentView] = useState<ViewType>("landing");
  const [activeDemo, setActiveDemo] = useState<DemoTab>("leads");
  const [gsStep, setGsStep] = useState<1 | 2 | 3>(1);
  const [selectedPlan, setSelectedPlan] = useState({ name: "Pro", price: "$49" });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activePlatformTab, setActivePlatformTab] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  const [toast, setToast] = useState<{ icon: string; msg: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [leadStatus, setLeadStatus] = useState("");
  const [leadResults, setLeadResults] = useState<typeof mockLeads>([]);
  const [leadRunning, setLeadRunning] = useState(false);
  const [demoIndustry, setDemoIndustry] = useState("");
  const [demoLocation, setDemoLocation] = useState("");
  const [demoTitle, setDemoTitle] = useState("");
  const leadTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [activityItems, setActivityItems] = useState<{icon: string; titleKey: string; timeKey: string}[]>([
    { icon: "mail", titleKey: "landing.demo.activity1", timeKey: "landing.demo.time2min" },
    { icon: "reply", titleKey: "landing.demo.activity2", timeKey: "landing.demo.time8min" },
    { icon: "cal", titleKey: "landing.demo.activity3", timeKey: "landing.demo.time23min" },
    { icon: "send", titleKey: "landing.demo.activity4", timeKey: "landing.demo.time41min" },
  ]);

  const [callState, setCallState] = useState<"idle" | "calling">("idle");
  const [callStatus, setCallStatus] = useState("");
  const [callTranscript, setCallTranscript] = useState<{ role: string; text: string }[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const callTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const [gsFirstName, setGsFirstName] = useState("");
  const [gsLastName, setGsLastName] = useState("");
  const [gsBusiness, setGsBusiness] = useState("");
  const [gsEmail, setGsEmail] = useState("");
  const [gsPhone, setGsPhone] = useState("");
  const [gsIndustry, setGsIndustry] = useState("");
  const [gsTarget, setGsTarget] = useState("");

  const showToast = useCallback((icon: string, msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ icon, msg });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const showView = useCallback((v: ViewType) => {
    setCurrentView(v);
    setMobileMenu(false);
    window.scrollTo(0, 0);
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    setMobileMenu(false);
    if (currentView !== "landing") {
      setCurrentView("landing");
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentView]);

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [callTranscript]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (leadTimer.current) clearInterval(leadTimer.current);
      callTimers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const runLeadGen = useCallback(() => {
    setLeadRunning(true);
    setLeadResults([]);
    const industry = demoIndustry || "businesses";
    const location = demoLocation || "US";
    const msgs = [t("landing.demo.scanningNPI"), t("landing.demo.matchingIndustry", { industry, location }), t("landing.demo.verifyingEmails"), t("landing.demo.enrichingPhones"), t("landing.demo.scoringLeads")];
    let i = 0;
    setLeadStatus(msgs[0]);
    if (leadTimer.current) clearInterval(leadTimer.current);
    leadTimer.current = setInterval(() => {
      i++;
      if (i < msgs.length) { setLeadStatus(msgs[i]); }
      else {
        if (leadTimer.current) clearInterval(leadTimer.current);
        setLeadRunning(false);
        setLeadStatus("");
        const count = Math.floor(Math.random() * 4) + 5;
        setLeadResults(mockLeads.slice(0, count));
        showToast("check", t("landing.demo.leadsFoundToast", { count }));
      }
    }, 700);
  }, [demoIndustry, demoLocation, showToast, t]);

  const simulateOutreach = useCallback(() => {
    showToast("mail", t("landing.demo.outreachCycle"));
    const tmr = setTimeout(() => {
      setActivityItems(prev => [{ icon: "send", titleKey: "landing.demo.emailSentActivity", timeKey: "landing.demo.justNow" }, ...prev]);
    }, 1500);
    callTimers.current.push(tmr);
  }, [showToast, t]);

  const simulateCall = useCallback(() => {
    if (callState !== "idle") {
      setCallState("idle"); setCallStatus(t("landing.demo.clickToSimulate")); setShowTranscript(false); setCallTranscript([]);
      callTimers.current.forEach(tmr => clearTimeout(tmr)); callTimers.current = []; return;
    }
    setCallState("calling"); setCallStatus(t("landing.demo.dialing")); setShowTranscript(true); setCallTranscript([]);
    const t1 = setTimeout(() => setCallStatus(t("landing.demo.connectedSpeaking")), 1500);
    callTimers.current.push(t1);
    const delays = [2000, 5000, 9000, 13000, 17000, 22000, 27000];
    transcriptLines.forEach((line, idx) => {
      const tmr = setTimeout(() => {
        setCallTranscript(prev => [...prev, line]);
        if (idx === transcriptLines.length - 1) {
          const t2 = setTimeout(() => { setCallStatus(t("landing.demo.meetingBooked")); setCallState("idle"); showToast("calendar", t("landing.demo.meetingBooked")); }, 2000);
          callTimers.current.push(t2);
        }
      }, delays[idx] || idx * 4000);
      callTimers.current.push(tmr);
    });
  }, [callState, showToast, t]);

  const goToStep = useCallback((step: 1 | 2 | 3) => { setGsStep(step); window.scrollTo(0, 0); }, []);
  const startPlan = useCallback((name: string, price: string) => { setSelectedPlan({ name, price }); setGsStep(1); showView("getstarted"); }, [showView]);

  const platformTabs = [
    {
      label: "AI Agents & Automation",
      icon: Bot,
      features: [
        { icon: Brain, title: "ARIA Business Manager", desc: "Your autonomous AI co-pilot that manages leads, sends emails, books meetings, and runs your business 24/7." },
        { icon: Search, title: "Lead Scout Agent", desc: "Discovers and qualifies high-value prospects from 10+ data sources including SEC, OpenCorporates, and web search." },
        { icon: Mail, title: "Email Outreach Agent", desc: "Crafts hyper-personalized cold email sequences with AI — writes, sends, follows up, and handles replies." },
        { icon: PhoneCall, title: "Voice AI Caller", desc: "Makes natural AI phone calls via Twilio + Deepgram — qualifies leads, handles objections, books meetings live." },
        { icon: Target, title: "Intent Monitor", desc: "Tracks buying signals across the web — knows who's ready to buy before they even reach out." },
        { icon: Workflow, title: "Workflow Engine", desc: "N8n-style visual automation builder with event triggers, conditional logic, and AI-powered workflow generation." },
      ]
    },
    {
      label: "Sales Intelligence",
      icon: Database,
      features: [
        { icon: Database, title: "B2B Data Engine", desc: "Aggregates from OpenCorporates, SEC EDGAR, Wikidata, GitHub, RDAP/WHOIS — comprehensive company intel." },
        { icon: UserCheck, title: "Lead Enrichment", desc: "Auto-enrich any contact with verified emails, phone numbers, social profiles, company data, and tech stack." },
        { icon: ScanLine, title: "Technographic Scanner", desc: "See what technologies your prospects use — identify perfect-fit leads based on their tech stack." },
        { icon: Eye, title: "Visitor Intelligence", desc: "Identify anonymous website visitors, cross-reference with email tracking, compute intent scores in real-time." },
        { icon: Link2, title: "Email-to-Website Bridge", desc: "Track the full journey: email open → link click → website browse → pages visited → CTA engagement." },
        { icon: Filter, title: "Free Lead Scraper", desc: "Zero-cost lead discovery engine — find decision-makers without expensive data subscriptions." },
      ]
    },
    {
      label: "Email & Outreach",
      icon: Mail,
      features: [
        { icon: Send, title: "Campaign Builder", desc: "Multi-step email sequences with A/B testing, smart scheduling, and automatic follow-up branching." },
        { icon: Inbox, title: "Unified Inbox", desc: "AI-classified inbox — auto-labels replies as Interested, Meeting Booked, Not Now, or Unsubscribe." },
        { icon: Flame, title: "Email Warmup", desc: "Automated domain warming across multiple accounts to maximize deliverability before campaigns launch." },
        { icon: ShieldCheck, title: "Sending Domains", desc: "White-label sending via AWS SES with full SPF, DKIM, DMARC configuration and domain health monitoring." },
        { icon: Activity, title: "Deliverability Suite", desc: "Real-time bounce rate, spam score, and reputation tracking across all sending accounts." },
        { icon: Globe, title: "Omnichannel", desc: "Reach prospects across Email, SMS via Twilio, WhatsApp, LinkedIn, and Meta DMs from one platform." },
      ]
    },
    {
      label: "CRM & Pipeline",
      icon: Users,
      features: [
        { icon: Users, title: "Smart CRM", desc: "Full contact management with engagement scoring, activity timelines, and AI-powered next-action suggestions." },
        { icon: BarChart3, title: "Sales Funnels", desc: "Visual Kanban pipelines — drag-and-drop deal tracking from Lead to Closed Won with conversion analytics." },
        { icon: Calendar, title: "Calendar & Booking", desc: "Integrated scheduling with automated reminders, Calendly-style booking links, and AI meeting prep." },
        { icon: Receipt, title: "Invoicing & Proposals", desc: "Professional quotes, invoices, payment reminders, and AR follow-up — all generated and tracked." },
        { icon: FileText, title: "E-Signatures", desc: "Built-in document signing for contracts and proposals — no need for DocuSign or HelloSign." },
        { icon: PenTool, title: "Forms & Surveys", desc: "Lead capture forms with conditional logic, directly integrated into your CRM pipeline." },
      ]
    },
    {
      label: "Marketing & Web",
      icon: Megaphone,
      features: [
        { icon: Megaphone, title: "AI Marketing Suite", desc: "33-skill AI marketing toolkit — generates strategies, ad copy, social posts, and full content calendars." },
        { icon: Cpu, title: "Marketing Autopilot", desc: "Autonomous AI that builds 30-day marketing plans and executes campaigns across all channels." },
        { icon: Code2, title: "Website Builder", desc: "AI-generated websites with natural language — supports e-commerce, supplier integration, and pricing optimization." },
        { icon: Palette, title: "Landing Pages", desc: "High-converting landing page builder with templates, A/B testing, and real-time conversion tracking." },
        { icon: BookOpen, title: "Blog Engine", desc: "SEO-optimized content management for authority building and organic lead generation." },
        { icon: MessageSquare, title: "Social & Reputation", desc: "Schedule posts, manage Google reviews, and maintain brand presence across all platforms." },
      ]
    },
    {
      label: "Analytics & Intelligence",
      icon: LineChart,
      features: [
        { icon: LineChart, title: "Revenue Analytics", desc: "Track MRR, churn, CAC by channel, LTV cohorts, and conversion rates across your entire funnel." },
        { icon: MousePointerClick, title: "Visitor Tracking", desc: "Embeddable JS snippet tracks page views, sessions, clicks, form behavior, and custom events in detail." },
        { icon: Gauge, title: "Campaign Performance", desc: "Real-time dashboards for email open rates, click-through rates, reply rates, and meeting conversion." },
        { icon: Network, title: "Multi-LLM Router", desc: "9 AI providers — OpenAI, Anthropic, Gemini, Mistral, Groq, Together AI, Cohere, OpenRouter, Ollama." },
        { icon: GraduationCap, title: "Learning Center", desc: "Built-in courses and training to help you master every feature and maximize ROI." },
        { icon: Building2, title: "Agency OS", desc: "White-label the entire platform — manage multiple clients with sub-accounts, billing, and reporting." },
      ]
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);} }
        @keyframes fadeIn { from{opacity:0;}to{opacity:1;} }
        @keyframes voicePulse { 0%{box-shadow:0 0 0 0 rgba(99,102,241,.5);}70%{box-shadow:0 0 0 24px rgba(99,102,241,0);}100%{box-shadow:0 0 0 0 rgba(99,102,241,0);} }
        @keyframes toastIn { from{transform:translateY(-12px);opacity:0;}to{transform:translateY(0);opacity:1;} }
        @keyframes float { 0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);} }
        @keyframes shimmer { 0%{background-position:-200% 0;}100%{background-position:200% 0;} }
        @keyframes glow { 0%,100%{opacity:.4;}50%{opacity:.8;} }
        @keyframes countUp { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes slideInLeft { from{opacity:0;transform:translateX(-30px);}to{opacity:1;transform:translateX(0);} }
        .anim-up { animation: fadeUp .7s cubic-bezier(.22,1,.36,1) both; }
        .anim-up-d1 { animation: fadeUp .7s cubic-bezier(.22,1,.36,1) .12s both; }
        .anim-up-d2 { animation: fadeUp .7s cubic-bezier(.22,1,.36,1) .24s both; }
        .anim-up-d3 { animation: fadeUp .7s cubic-bezier(.22,1,.36,1) .36s both; }
        .anim-up-d4 { animation: fadeUp .7s cubic-bezier(.22,1,.36,1) .48s both; }
        .anim-up-d5 { animation: fadeUp .7s cubic-bezier(.22,1,.36,1) .6s both; }
        .voice-pulse { animation: voicePulse 1.5s infinite; }
        .gradient-text { background: linear-gradient(135deg, #818cf8, #c084fc, #818cf8); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: shimmer 3s linear infinite; }
        .glass-card { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); }
        .glass-card-light { background: rgba(255,255,255,0.7); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.5); }
        .feature-card { transition: all .3s cubic-bezier(.22,1,.36,1); }
        .feature-card:hover { transform: translateY(-4px); box-shadow: 0 20px 60px -12px rgba(99,102,241,0.15); }
        .glow-orb { animation: glow 4s ease-in-out infinite; }
      `}</style>

      <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

        {toast && (
          <div className="fixed top-20 right-6 z-[200] px-5 py-3.5 rounded-2xl flex items-center gap-3 text-sm font-medium bg-white/10 backdrop-blur-xl shadow-2xl border border-white/10" style={{ animation: "toastIn .3s ease" }}>
            <span className="text-indigo-400">
              {toast.icon === "check" && <Check className="w-4 h-4" />}
              {toast.icon === "mail" && <Mail className="w-4 h-4" />}
              {toast.icon === "calendar" && <Calendar className="w-4 h-4" />}
              {!["check", "mail", "calendar"].includes(toast.icon) && <Sparkles className="w-4 h-4" />}
            </span>
            <span className="text-white/90">{toast.msg}</span>
          </div>
        )}

        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${scrolled ? "bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20" : "bg-transparent"}`}>
          <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 h-16">
            <div className="cursor-pointer flex items-center gap-2.5" onClick={() => showView("landing")} data-testid="link-home">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Zap className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight">Argi<span className="gradient-text">Flow</span></span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <span className="text-[13px] text-white/50 cursor-pointer hover:text-white transition-colors font-medium" onClick={() => scrollToSection("platform-section")} data-testid="link-nav-features">Platform</span>
              <span className="text-[13px] text-white/50 cursor-pointer hover:text-white transition-colors font-medium" onClick={() => showView("demo")} data-testid="link-nav-demo">Live Demo</span>
              <span className="text-[13px] text-white/50 cursor-pointer hover:text-white transition-colors font-medium" onClick={() => scrollToSection("pricing-section")} data-testid="link-nav-pricing">Pricing</span>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher variant="compact" />
              <a href="/login" data-testid="link-login" className="hidden sm:inline-flex px-4 py-2 rounded-lg text-[13px] text-white/60 hover:text-white font-medium transition-colors">
                Log in
              </a>
              <button onClick={() => showView("demo")} data-testid="button-live-demo" className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-white/80 border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Live Demo
              </button>
              <button onClick={() => showView("getstarted")} data-testid="button-get-started" className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 transition-all cursor-pointer shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5">
                Get Started
              </button>
              <button className="md:hidden p-2 text-white/60" onClick={() => setMobileMenu(!mobileMenu)}><Menu className="w-5 h-5" /></button>
            </div>
          </div>
          {mobileMenu && (
            <div className="md:hidden bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/5 px-6 py-4 flex flex-col gap-3">
              <span className="text-sm text-white/60 cursor-pointer py-2" onClick={() => scrollToSection("platform-section")}>Platform</span>
              <span className="text-sm text-white/60 cursor-pointer py-2" onClick={() => showView("demo")}>Live Demo</span>
              <span className="text-sm text-white/60 cursor-pointer py-2" onClick={() => scrollToSection("pricing-section")}>Pricing</span>
              <a href="/login" className="text-sm text-white/60 py-2">Log in</a>
            </div>
          )}
        </nav>

        {currentView === "landing" && (
          <div className="relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full bg-gradient-to-b from-indigo-600/8 via-violet-600/5 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-3xl pointer-events-none glow-orb" />
            <div className="absolute top-40 left-0 w-[400px] h-[400px] rounded-full bg-indigo-600/5 blur-3xl pointer-events-none glow-orb" style={{ animationDelay: "2s" }} />

            <div className="relative pt-32 pb-24 px-6 max-w-[1200px] mx-auto">
              <div className="text-center max-w-[900px] mx-auto">
                <div className="anim-up flex items-center justify-center gap-3 mb-8 flex-wrap">
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-300 uppercase tracking-widest px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI-Powered Growth Engine
                  </span>
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-amber-300 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <Shield className="w-3.5 h-3.5" />
                    Replaces 7+ Tools
                  </span>
                </div>

                <h1 className="anim-up-d1 text-[clamp(40px,6vw,72px)] font-extrabold leading-[1.05] tracking-tight mb-6">
                  Your Entire Sales &<br/>
                  Marketing Team —<br/>
                  <span className="gradient-text">Powered by AI</span>
                </h1>

                <p className="anim-up-d2 text-lg md:text-xl text-white/40 font-normal leading-relaxed mb-4 max-w-[640px] mx-auto">
                  Lead intelligence, email outreach, voice AI, CRM, marketing automation, and an autonomous business manager — all in one platform.
                </p>
                <p className="anim-up-d2 text-[15px] text-indigo-400 font-medium mb-10">
                  One login. One price. <strong className="text-indigo-300">30 days free.</strong> No credit card required.
                </p>

                <div className="anim-up-d3 flex items-center justify-center gap-3 flex-wrap mb-12">
                  <button onClick={() => showView("getstarted")} data-testid="button-start-trial" className="group px-8 py-4 rounded-xl text-[15px] font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-2">
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button onClick={() => showView("demo")} data-testid="button-watch-demo" className="px-8 py-4 rounded-xl text-[15px] font-medium text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center gap-2">
                    <Play className="w-4 h-4 text-indigo-400" />
                    Watch Live Demo
                  </button>
                </div>

                <div className="anim-up-d4 flex items-center justify-center gap-5">
                  <div className="flex -space-x-2">
                    {["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-400", "bg-violet-500"].map((c, i) => (
                      <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-[#0a0a0f] ${c}`}>
                        {["JM", "SK", "AT", "RC", "LP"][i]}
                      </div>
                    ))}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-0.5 mb-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}
                    </div>
                    <span className="text-[13px] text-white/30">
                      Trusted by <strong className="text-white/60">growing businesses</strong> worldwide
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden anim-up-d5" style={{ background: "rgba(255,255,255,0.05)" }}>
                {[
                  { num: "40+", label: "Tools Built In", icon: Layers },
                  { num: "$0", label: "Extra Costs", icon: CreditCard },
                  { num: "24/7", label: "AI Availability", icon: Bot },
                  { num: "10x", label: "Pipeline Growth", icon: TrendingUp },
                ].map((s, i) => (
                  <div key={i} className="bg-[#0f0f17] py-8 px-6 text-center group hover:bg-[#141420] transition-colors">
                    <s.icon className="w-5 h-5 text-indigo-500/50 mx-auto mb-3 group-hover:text-indigo-400 transition-colors" />
                    <div className="text-3xl font-extrabold tracking-tight text-white mb-1">{s.num}</div>
                    <div className="text-[11px] text-white/30 uppercase tracking-wider font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-16 px-6 max-w-[1100px] mx-auto" data-testid="section-logos-replaced">
              <div className="text-center mb-10">
                <p className="text-[13px] text-white/30 uppercase tracking-widest font-medium mb-6">One platform replaces</p>
                <div className="flex items-center justify-center gap-6 md:gap-10 flex-wrap">
                  {["Apollo", "ZoomInfo", "Instantly", "GoHighLevel", "HubSpot", "Calendly", "DocuSign"].map((name, i) => (
                    <span key={i} className="text-[15px] font-semibold text-white/15 hover:text-white/30 transition-colors cursor-default">{name}</span>
                  ))}
                </div>
              </div>
            </div>

            <div id="platform-section" className="py-24 px-6 max-w-[1200px] mx-auto scroll-mt-20">
              <div className="text-center mb-16">
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-300 uppercase tracking-widest px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-5">
                  <CircuitBoard className="w-3.5 h-3.5" />
                  The Complete Platform
                </span>
                <h2 className="text-[clamp(28px,4vw,48px)] font-extrabold tracking-tight mb-4">
                  Everything You Need to<br/>
                  <span className="gradient-text">Acquire & Grow Clients</span>
                </h2>
                <p className="text-base text-white/35 max-w-[560px] mx-auto leading-relaxed">
                  Six powerful modules working together — AI agents, sales intelligence, email infrastructure, CRM, marketing, and analytics.
                </p>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
                {platformTabs.map((tab, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePlatformTab(i)}
                    data-testid={`button-platform-tab-${i}`}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-medium whitespace-nowrap cursor-pointer transition-all ${
                      activePlatformTab === i
                        ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/10"
                        : "text-white/40 hover:text-white/60 border border-transparent hover:border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" style={{ animation: "fadeUp .5s ease both" }} key={activePlatformTab}>
                {platformTabs[activePlatformTab].features.map((f, i) => (
                  <div key={i} className="feature-card rounded-2xl p-6 glass-card hover:border-indigo-500/20 cursor-default" data-testid={`card-feature-${activePlatformTab}-${i}`}>
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/10 flex items-center justify-center mb-4">
                      <f.icon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="text-[15px] font-semibold text-white mb-2">{f.title}</div>
                    <div className="text-[13px] text-white/35 leading-relaxed">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-24 px-6 max-w-[1100px] mx-auto" data-testid="section-ai-agents">
              <div className="text-center mb-14">
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-300 uppercase tracking-widest px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-5">
                  <Bot className="w-3.5 h-3.5" />
                  AI-Powered Workforce
                </span>
                <h2 className="text-[clamp(28px,4vw,48px)] font-extrabold tracking-tight mb-4">
                  Meet Your <span className="gradient-text">AI Agents</span>
                </h2>
                <p className="text-base text-white/35 max-w-[540px] mx-auto leading-relaxed">
                  Purpose-built autonomous agents that handle every part of your sales pipeline — working around the clock.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { img: botLeadScoutImg, name: "Lead Scout", desc: "Discovers and qualifies high-value prospects from 10+ data sources", icon: Search, gradient: "from-indigo-500/20 to-blue-500/20", border: "border-indigo-500/15" },
                  { img: botEmailWriterImg, name: "Email Writer", desc: "Crafts personalized sequences that convert — writes, sends, follows up", icon: Mail, gradient: "from-violet-500/20 to-purple-500/20", border: "border-violet-500/15" },
                  { img: botVoiceCallerImg, name: "Voice Caller", desc: "Natural AI phone calls — qualifies leads, handles objections, books meetings", icon: PhoneCall, gradient: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/15" },
                  { img: botAnalyticsImg, name: "Analytics Brain", desc: "Monitors intent signals, tracks engagement, optimizes your campaigns", icon: BarChart3, gradient: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/15" },
                ].map((agent, i) => (
                  <div key={i} className={`group rounded-2xl glass-card hover:${agent.border} transition-all overflow-hidden feature-card`} data-testid={`card-agent-${i}`}>
                    <div className={`relative h-48 bg-gradient-to-br ${agent.gradient} flex items-center justify-center overflow-hidden`}>
                      <img src={agent.img} alt={agent.name} className="w-36 h-36 object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/10 flex items-center justify-center">
                          <agent.icon className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="text-[15px] font-semibold text-white">{agent.name}</span>
                      </div>
                      <p className="text-[13px] text-white/35 leading-relaxed">{agent.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-20 px-6 max-w-[1100px] mx-auto" data-testid="section-comparison">
              <div className="text-center mb-12">
                <span className="inline-flex items-center text-[11px] font-semibold text-white/40 uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-5">{t("landing.comparison.badge")}</span>
                <h2 className="text-[clamp(28px,4vw,48px)] font-extrabold tracking-tight mb-4">{t("landing.comparison.title")}</h2>
                <p className="text-base text-white/30 max-w-[520px] mx-auto leading-relaxed">{t("landing.comparison.desc")}</p>
              </div>

              <div className="rounded-2xl overflow-hidden overflow-x-auto glass-card">
                <div className="grid grid-cols-[1fr_90px_90px_90px_90px] md:grid-cols-[1fr_110px_110px_110px_110px] text-center min-w-[560px] bg-white/5 border-b border-white/5">
                  <div className="p-4 text-left text-[12px] font-semibold text-white/30 uppercase tracking-wide">{t("landing.comparison.capability")}</div>
                  <div className="p-4 text-[13px] font-bold text-indigo-400">ArgiFlow</div>
                  <div className="p-4 text-[13px] font-medium text-white/25">Apollo</div>
                  <div className="p-4 text-[13px] font-medium text-white/25">ZoomInfo</div>
                  <div className="p-4 text-[13px] font-medium text-white/25">GHL</div>
                </div>
                {[
                  { feat: t("landing.comparison.feat0"), a: true, b: true, c: true, d: false },
                  { feat: t("landing.comparison.feat1"), a: true, b: true, c: true, d: false },
                  { feat: t("landing.comparison.feat2"), a: true, b: true, c: true, d: false },
                  { feat: t("landing.comparison.feat3"), a: true, b: false, c: true, d: false },
                  { feat: t("landing.comparison.feat4"), a: true, b: false, c: false, d: false },
                  { feat: t("landing.comparison.feat5"), a: true, b: "email", c: false, d: true },
                  { feat: t("landing.comparison.feat6"), a: true, b: false, c: false, d: false },
                  { feat: t("landing.comparison.feat7"), a: true, b: false, c: false, d: "add-on" },
                  { feat: t("landing.comparison.feat8"), a: true, b: false, c: false, d: "basic" },
                  { feat: t("landing.comparison.feat9"), a: true, b: "basic", c: false, d: true },
                  { feat: t("landing.comparison.feat10"), a: true, b: false, c: false, d: true },
                  { feat: t("landing.comparison.feat11"), a: true, b: false, c: false, d: "add-on" },
                ].map((row, i) => (
                  <div key={i} className={`grid grid-cols-[1fr_90px_90px_90px_90px] md:grid-cols-[1fr_110px_110px_110px_110px] text-center items-center min-w-[560px] hover:bg-indigo-500/5 transition-colors ${i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"}`} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <div className="p-3 md:p-4 text-left text-[12px] md:text-[13px] text-white/50">{row.feat}</div>
                    <div className="p-3 md:p-4">{row.a === true ? <Check className="w-4 h-4 text-indigo-400 mx-auto" /> : <span className="text-[11px] text-white/25">{String(row.a)}</span>}</div>
                    <div className="p-3 md:p-4">{row.b === true ? <Check className="w-4 h-4 text-blue-400/50 mx-auto" /> : row.b === false ? <X className="w-4 h-4 text-white/10 mx-auto" /> : <span className="text-[11px] text-white/25">{String(row.b)}</span>}</div>
                    <div className="p-3 md:p-4">{row.c === true ? <Check className="w-4 h-4 text-blue-400/50 mx-auto" /> : row.c === false ? <X className="w-4 h-4 text-white/10 mx-auto" /> : <span className="text-[11px] text-white/25">{String(row.c)}</span>}</div>
                    <div className="p-3 md:p-4">{row.d === true ? <Check className="w-4 h-4 text-blue-400/50 mx-auto" /> : row.d === false ? <X className="w-4 h-4 text-white/10 mx-auto" /> : <span className="text-[11px] text-amber-400/60">{String(row.d)}</span>}</div>
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_90px_90px_90px_90px] md:grid-cols-[1fr_110px_110px_110px_110px] text-center items-center min-w-[560px] bg-white/5 border-t border-white/10">
                  <div className="p-4 text-left text-[13px] font-bold text-white">{t("landing.comparison.startingPrice")}</div>
                  <div className="p-4 text-[13px] font-bold text-indigo-400">$49/mo</div>
                  <div className="p-4 text-[11px] text-white/25">$49-149/mo</div>
                  <div className="p-4 text-[11px] text-white/25">$14,995/yr</div>
                  <div className="p-4 text-[11px] text-white/25">$297-497</div>
                </div>
              </div>

              <div className="mt-6 p-5 rounded-xl glass-card flex items-start gap-3">
                <Zap className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-white mb-1">{t("landing.comparison.bottomLine")}</div>
                  <div className="text-[13px] text-white/35 leading-relaxed">{t("landing.comparison.bottomLineText1")} <strong className="text-white/60">{t("landing.comparison.bottomLineNone")}</strong> {t("landing.comparison.bottomLineText2")} <strong className="text-indigo-400">$49/mo</strong>{t("landing.comparison.bottomLineText3")}</div>
                </div>
              </div>
            </div>

            <div className="py-16 px-6 max-w-[1100px] mx-auto" data-testid="section-what-they-charge">
              <div className="text-center mb-10">
                <span className="inline-flex items-center text-[11px] font-semibold text-white/40 uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-5">{t("landing.costs.badge")}</span>
                <h2 className="text-[clamp(28px,4vw,48px)] font-extrabold tracking-tight mb-3">{t("landing.costs.title")}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-[900px] mx-auto">
                {[
                  { tool: t("landing.costs.tool0Name"), price: t("landing.costs.tool0Price"), what: t("landing.costs.tool0What") },
                  { tool: t("landing.costs.tool1Name"), price: t("landing.costs.tool1Price"), what: t("landing.costs.tool1What") },
                  { tool: t("landing.costs.tool2Name"), price: t("landing.costs.tool2Price"), what: t("landing.costs.tool2What") },
                  { tool: t("landing.costs.tool3Name"), price: t("landing.costs.tool3Price"), what: t("landing.costs.tool3What") },
                  { tool: t("landing.costs.tool4Name"), price: t("landing.costs.tool4Price"), what: t("landing.costs.tool4What") },
                  { tool: t("landing.costs.tool5Name"), price: t("landing.costs.tool5Price"), what: t("landing.costs.tool5What") },
                  { tool: t("landing.costs.tool6Name"), price: t("landing.costs.tool6Price"), what: t("landing.costs.tool6What") },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl glass-card">
                    <div>
                      <div className="text-sm font-medium text-white/70">{item.tool}</div>
                      <div className="text-[11px] text-white/30">{item.what}</div>
                    </div>
                    <div className="text-sm font-bold text-red-400">{item.price}</div>
                  </div>
                ))}
              </div>
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl glass-card">
                  <span className="text-lg font-bold text-red-400/60 line-through">$2,346+/mo</span>
                  <ArrowRight className="w-5 h-5 text-white/20" />
                  <span className="text-xl font-extrabold gradient-text">$49/mo</span>
                  <span className="text-[13px] text-white/30 ml-1">{t("landing.costs.withArgiflow")}</span>
                </div>
              </div>
            </div>

            <div id="pricing-section" className="py-24 px-6 max-w-[1100px] mx-auto scroll-mt-20">
              <div className="text-center mb-12">
                <span className="inline-flex items-center text-[11px] font-semibold text-white/40 uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-5">{t("landing.pricing2.badge")}</span>
                <h2 className="text-[clamp(28px,4vw,48px)] font-extrabold tracking-tight mb-4">{t("landing.pricing2.title")}</h2>
                <p className="text-base text-white/30 max-w-[480px] mx-auto leading-relaxed">{t("landing.pricing2.descPre")} <strong className="text-indigo-400">{t("landing.pricing2.daysFree")}</strong> {t("landing.pricing2.descPost")}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {plans.map((p, i) => (
                  <div key={i} className={`rounded-2xl p-8 relative transition-all hover:-translate-y-1 ${p.popular ? "bg-gradient-to-b from-indigo-600 to-violet-700 text-white shadow-2xl shadow-indigo-500/20 scale-[1.02] border border-indigo-400/20" : "glass-card hover:border-indigo-500/20"}`} data-testid={`card-plan-${p.name.toLowerCase().replace(/\s/g, "-")}`}>
                    {p.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-lg">{t("landing.pricing2.mostPopular")}</div>
                    )}
                    <div className={`text-[15px] font-semibold mb-1 ${p.popular ? "text-indigo-100" : "text-white/40"}`}>{p.name}</div>
                    <div className="text-4xl font-extrabold tracking-tight leading-none mb-1">{p.price}<sub className={`text-[14px] font-normal ml-0.5 ${p.popular ? "text-indigo-200" : "text-white/25"}`}>{t("landing.pricing2.perMonth")}</sub></div>
                    <div className={`text-[13px] mb-6 ${p.popular ? "text-indigo-200" : "text-white/25"}`}>{p.tagline}</div>
                    <ul className="flex flex-col gap-2.5 mb-8">
                      {p.features.map((f, j) => (
                        <li key={j} className={`text-[13px] flex gap-2 items-start ${p.popular ? "text-indigo-100" : "text-white/40"}`}>
                          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${p.popular ? "text-emerald-300" : "text-indigo-400"}`} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => startPlan(p.name, p.price)} data-testid={`button-plan-${p.name.toLowerCase().replace(/\s/g, "-")}`} className={`w-full py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all ${p.popular ? "bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg" : "bg-white/10 text-white hover:bg-white/15 border border-white/10"}`}>
                      {t("landing.pricing2.getStarted")}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-24 px-6 max-w-[1100px] mx-auto">
              <div className="text-center mb-12">
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-white/40 uppercase tracking-widest px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  {t("landing.testimonials.badge")}
                </span>
                <h2 className="text-[clamp(28px,4vw,48px)] font-extrabold tracking-tight">{t("landing.testimonials.title")}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { nameKey: "landing.testimonials.t0Name", roleKey: "landing.testimonials.t0Role", quoteKey: "landing.testimonials.t0Quote", color: "bg-indigo-500" },
                  { nameKey: "landing.testimonials.t1Name", roleKey: "landing.testimonials.t1Role", quoteKey: "landing.testimonials.t1Quote", color: "bg-violet-500" },
                  { nameKey: "landing.testimonials.t2Name", roleKey: "landing.testimonials.t2Role", quoteKey: "landing.testimonials.t2Quote", color: "bg-emerald-500" },
                ].map((testimonial, i) => (
                  <div key={i} className="rounded-2xl p-7 glass-card hover:border-indigo-500/15 transition-all flex flex-col feature-card" data-testid={`card-testimonial-${i}`}>
                    <div className="flex items-center gap-0.5 mb-4">
                      {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                    </div>
                    <p className="text-sm text-white/40 leading-relaxed mb-6 flex-1">"{t(testimonial.quoteKey)}"</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${testimonial.color}`}>
                        {t(testimonial.nameKey).split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-white/70">{t(testimonial.nameKey)}</div>
                        <div className="text-[12px] text-white/30">{t(testimonial.roleKey)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-20 px-6 max-w-[1100px] mx-auto">
              <div className="rounded-3xl p-12 md:p-16 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 50%, rgba(99,102,241,0.1) 100%)" }}>
                <div className="absolute inset-0 border border-indigo-500/20 rounded-3xl pointer-events-none" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="hidden md:block flex-shrink-0" data-testid="img-cta-bots">
                    <img src={botTeamImg} alt="AI Agent Team" className="w-[260px] object-contain drop-shadow-2xl opacity-80" style={{ animation: "float 5s ease-in-out infinite" }} />
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <h2 className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-tight text-white mb-4">
                      Ready to Automate<br/>Your Growth?
                    </h2>
                    <p className="text-base text-white/40 leading-relaxed mb-8 max-w-[480px]">
                      Join businesses using ArgiFlow to find leads, close deals, and scale — all on autopilot.
                    </p>
                    <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
                      <button onClick={() => showView("getstarted")} data-testid="button-bottom-cta" className="px-8 py-3.5 rounded-xl text-[15px] font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-xl shadow-indigo-500/25 transition-all cursor-pointer">
                        Start Free Trial
                      </button>
                      <button onClick={() => showView("demo")} data-testid="button-bottom-demo" className="px-8 py-3.5 rounded-xl text-[15px] font-medium text-white/70 border border-white/15 hover:bg-white/5 transition-all cursor-pointer flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        See It In Action
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <footer className="pt-14 pb-8 px-6 max-w-[1100px] mx-auto border-t border-white/5">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
                <div className="col-span-2 md:col-span-1">
                  <div className="flex items-center gap-2 mb-3 cursor-pointer" onClick={() => showView("landing")}>
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[16px] font-extrabold">Argi<span className="gradient-text">Flow</span></span>
                  </div>
                  <p className="text-[12px] text-white/25 leading-relaxed max-w-[200px]">{t("landing.footer.tagline")}</p>
                </div>
                {[
                  { title: t("landing.footer.product"), id: "product", links: [{ id: "features", label: t("landing.footer.features"), action: () => scrollToSection("platform-section") }, { id: "pricing", label: t("landing.footer.pricing"), action: () => scrollToSection("pricing-section") }, { id: "demo", label: t("landing.footer.demo"), action: () => showView("demo") }] },
                  { title: t("landing.footer.company"), id: "company", links: [{ id: "about", label: t("landing.footer.about"), href: "/about" }, { id: "blog", label: t("landing.footer.blog"), href: "/blog" }, { id: "contact", label: t("landing.footer.contact"), href: "/contact" }] },
                  { title: t("landing.footer.resources"), id: "resources", links: [{ id: "docs", label: t("landing.footer.docs"), href: "/docs" }, { id: "help", label: t("landing.footer.helpCenter"), href: "/help" }, { id: "status", label: t("landing.footer.status"), href: "/status" }] },
                  { title: t("landing.footer.legal"), id: "legal", links: [{ id: "privacy", label: t("landing.footer.privacy"), href: "/privacy" }, { id: "terms", label: t("landing.footer.terms"), href: "/terms" }, { id: "security", label: t("landing.footer.security"), href: "/security" }] },
                ].map((col, i) => (
                  <div key={i}>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/25 mb-3">{col.title}</div>
                    <ul className="flex flex-col gap-2">
                      {col.links.map((link: any) => (
                        <li key={link.id} data-testid={`link-footer-${link.id}`} className="text-[13px] text-white/25 hover:text-white/50 cursor-pointer transition-colors">
                          {link.href ? <a href={link.href} className="text-inherit no-underline">{link.label}</a> : <span onClick={link.action}>{link.label}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-5 text-[12px] text-white/15 border-t border-white/5">
                <span>{t("landing.footer.copyright")}</span>
                <span className="text-indigo-400/60">info@argilette.com</span>
              </div>
            </footer>
          </div>
        )}

        {currentView === "demo" && (
          <div className="relative min-h-screen pt-24 pb-16 px-6 max-w-[1100px] mx-auto" style={{ animation: "fadeUp .5s ease both" }}>
            <div className="mb-6">
              <span className="inline-flex items-center text-[11px] font-semibold text-indigo-300 uppercase tracking-widest px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-3">{t("landing.demo.badge")}</span>
              <h2 className="text-[clamp(24px,3.5vw,40px)] font-extrabold tracking-tight mb-2">{t("landing.demo.title")}</h2>
              <p className="text-sm text-white/35">{t("landing.demo.desc")}</p>
            </div>
            <div className="flex gap-1 p-1 rounded-xl w-fit mb-8 bg-white/5 border border-white/10">
              {([["leads", t("landing.demo.tabLeads")], ["outreach", t("landing.demo.tabOutreach")], ["voice", t("landing.demo.tabVoice")], ["email", t("landing.demo.tabEmail")]] as [DemoTab, string][]).map(([k, label]) => (
                <button key={k} onClick={() => setActiveDemo(k)} data-testid={`button-demo-tab-${k}`} className={`px-5 py-2.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all border-0 ${activeDemo === k ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60 bg-transparent"}`}>
                  {label}
                </button>
              ))}
            </div>

            {activeDemo === "leads" && (
              <div style={{ animation: "fadeUp .4s ease both" }}>
                <div className="rounded-2xl p-7 glass-card mb-5">
                  <div className="flex gap-3 mb-5 flex-wrap">
                    <input value={demoIndustry} onChange={e => setDemoIndustry(e.target.value)} placeholder={t("landing.demo.industryPlaceholder")} data-testid="input-demo-industry" className="flex-1 min-w-[160px] rounded-xl px-4 py-3 text-sm text-white outline-none border border-white/10 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white/5 placeholder:text-white/25" />
                    <input value={demoLocation} onChange={e => setDemoLocation(e.target.value)} placeholder={t("landing.demo.locationPlaceholder")} data-testid="input-demo-location" className="flex-1 min-w-[160px] rounded-xl px-4 py-3 text-sm text-white outline-none border border-white/10 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white/5 placeholder:text-white/25" />
                    <input value={demoTitle} onChange={e => setDemoTitle(e.target.value)} placeholder={t("landing.demo.titlePlaceholder")} data-testid="input-demo-title" className="flex-1 min-w-[160px] rounded-xl px-4 py-3 text-sm text-white outline-none border border-white/10 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white/5 placeholder:text-white/25" />
                    <button onClick={runLeadGen} disabled={leadRunning} data-testid="button-run-lead-gen" className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/20 transition-all">
                      {t("landing.demo.generateLeads")}
                    </button>
                  </div>
                  {leadStatus && <div className="text-sm text-white/50 py-3 flex items-center gap-2"><div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />{leadStatus}</div>}
                  {leadResults.length > 0 && (
                    <div style={{ animation: "fadeUp .4s ease both" }}>
                      <div className="text-[13px] text-white/40 mb-3"><strong className="text-indigo-400">{leadResults.length}</strong> {t("landing.demo.leadsFound")}</div>
                      <div className="overflow-x-auto rounded-xl border border-white/10">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-white/5">
                              {[t("landing.demo.thName"), t("landing.demo.thTitle"), t("landing.demo.thCompany"), t("landing.demo.thEmail"), t("landing.demo.thPhone"), t("landing.demo.thScore")].map(h => (
                                <th key={h} className="text-[11px] font-semibold uppercase tracking-wider text-white/25 px-3 py-2.5 text-left border-b border-white/5">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {leadResults.map((l, i) => (
                              <tr key={i} className="hover:bg-indigo-500/5 transition-colors">
                                <td className="px-3 py-3 text-[13px] font-medium text-white/70 border-b border-white/5">{l.name}</td>
                                <td className="px-3 py-3 text-[13px] text-white/35 border-b border-white/5">{l.title}</td>
                                <td className="px-3 py-3 text-[13px] text-white/50 border-b border-white/5">{l.company}</td>
                                <td className="px-3 py-3 text-[13px] text-indigo-400 border-b border-white/5">{l.email}</td>
                                <td className="px-3 py-3 text-[13px] text-white/35 border-b border-white/5">{l.phone}</td>
                                <td className="px-3 py-3 text-[13px] border-b border-white/5">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${l.stype === "high" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>{l.score}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeDemo === "outreach" && (
              <div style={{ animation: "fadeUp .4s ease both" }}>
                <div className="rounded-2xl p-7 glass-card">
                  <div className="flex gap-0 mb-6 overflow-x-auto">
                    {[
                      { label: t("landing.demo.discovered"), count: 127, sub: t("landing.demo.newLeads"), done: true },
                      { label: t("landing.demo.enriched"), count: 98, sub: t("landing.demo.verified"), done: true },
                      { label: t("landing.demo.contacted"), count: 64, sub: t("landing.demo.emailSent"), active: true },
                      { label: t("landing.demo.replied"), count: 23, sub: t("landing.demo.rate17") },
                      { label: t("landing.demo.meetingLabel"), count: 11, sub: t("landing.demo.booked") },
                    ].map((s, i, arr) => (
                      <div key={i} className={`flex-1 min-w-[90px] px-3 py-3.5 text-center relative rounded-lg mx-0.5 ${s.done ? "bg-emerald-500/10 border border-emerald-500/20" : s.active ? "bg-indigo-500/10 border border-indigo-500/20" : "bg-white/5 border border-white/10"}`}>
                        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">{s.label}</div>
                        <div className="text-xl font-extrabold tracking-tight my-0.5 text-white">{s.count}</div>
                        <div className="text-[10px] text-white/25">{s.sub}</div>
                        {i < arr.length - 1 && <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 text-white/15 text-sm z-10">&rarr;</span>}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-white/70">{t("landing.demo.liveActivity")}</span>
                    <button onClick={simulateOutreach} data-testid="button-run-outreach" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/20 transition-all">
                      {t("landing.demo.runNextCycle")}
                    </button>
                  </div>
                  <div className="flex flex-col">
                    {activityItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 py-3" style={{ borderBottom: i < activityItems.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.icon === "cal" ? "bg-blue-500/10" : "bg-indigo-500/10"}`}>
                          {item.icon === "mail" && <Mail className="w-4 h-4 text-indigo-400" />}
                          {item.icon === "reply" && <MessageSquare className="w-4 h-4 text-indigo-400" />}
                          {item.icon === "cal" && <Calendar className="w-4 h-4 text-blue-400" />}
                          {item.icon === "send" && <Send className="w-4 h-4 text-indigo-400" />}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-white/70">{t(item.titleKey)}</div>
                          <div className="text-[11px] text-white/25">{t(item.timeKey)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeDemo === "voice" && (
              <div style={{ animation: "fadeUp .4s ease both" }}>
                <div className="rounded-2xl p-7 glass-card">
                  <div className="flex flex-col items-center py-10 gap-5">
                    <button onClick={simulateCall} data-testid="button-simulate-call" className={`w-24 h-24 rounded-full border-none cursor-pointer flex items-center justify-center transition-all hover:scale-105 bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/30 ${callState === "calling" ? "voice-pulse" : ""}`}>
                      {callState === "calling" ? <PhoneCall className="w-8 h-8 text-white" /> : <Phone className="w-8 h-8 text-white" />}
                    </button>
                    <div className="text-[15px] font-semibold text-white/70">{callStatus || t("landing.demo.clickToSimulate")}</div>
                    {showTranscript && (
                      <div ref={transcriptRef} className="bg-white/5 rounded-xl p-5 w-full max-w-[500px] max-h-[220px] overflow-y-auto text-[13px] leading-relaxed border border-white/10">
                        {callTranscript.map((line, i) => (
                          <div key={i} className={`mb-2 ${line.role === "ai" ? "text-indigo-400" : "text-white/50"}`}>
                            <strong>{line.role === "ai" ? "AI:" : "Dr. Torres:"}</strong> {line.text}
                          </div>
                        ))}
                        {callTranscript.length === 0 && <div className="text-white/25">{t("landing.demo.waitingConnection")}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeDemo === "email" && (
              <div style={{ animation: "fadeUp .4s ease both" }}>
                <div className="rounded-2xl p-7 glass-card">
                  <div className="text-sm font-semibold text-white/70 mb-5">{t("landing.demo.emailWarmupDashboard")}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                    {[
                      { email: "outreach@argilette.co", pct: 92, sent: "1,247", rep: "94%" },
                      { email: "sales@argilette.co", pct: 78, sent: "892", rep: "87%" },
                      { email: "hello@argilette.co", pct: 85, sent: "1,031", rep: "91%" },
                      { email: "team@argilette.co", pct: 41, sent: "234", rep: "72%" },
                    ].map((e, i) => (
                      <div key={i} className="rounded-xl p-4 bg-white/5 border border-white/10">
                        <div className="text-[13px] font-medium text-white/70 mb-2.5">{e.email}</div>
                        <div className="h-1.5 rounded bg-white/10 mb-2">
                          <div className="h-1.5 rounded transition-all duration-1000" style={{ width: `${e.pct}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
                        </div>
                        <div className="flex justify-between text-[11px] text-white/25">
                          <span>{t("landing.demo.warmupLabel")}: {e.pct}%</span>
                          <span>{t("landing.demo.sentLabel")}: {e.sent}</span>
                          <span>{t("landing.demo.reputationLabel")}: {e.rep}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: t("landing.demo.activeDomains"), val: "4", color: "text-indigo-400" },
                      { label: t("landing.demo.avgReputation"), val: "92%", color: "text-emerald-400" },
                      { label: t("landing.demo.bounceRate"), val: "0.1%", color: "text-white" },
                      { label: t("landing.demo.openRate"), val: "47%", color: "text-amber-400" },
                    ].map((s, i) => (
                      <div key={i} className="rounded-xl p-4 bg-white/5 border border-white/10 text-center">
                        <div className={`text-2xl font-extrabold tracking-tight mb-0.5 ${s.color}`}>{s.val}</div>
                        <div className="text-[11px] text-white/25">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === "getstarted" && (
          <div className="relative min-h-screen pt-24 pb-20 px-6 max-w-[1100px] mx-auto" style={{ animation: "fadeUp .5s ease both" }}>
            <div className="flex items-center justify-center gap-0 mb-12">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-0">
                  <div className={`flex items-center gap-2 text-[13px] font-medium ${n < gsStep ? "text-indigo-400" : n === gsStep ? "text-white" : "text-white/25"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold ${n === gsStep ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30" : n < gsStep ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-white/5 text-white/25 border border-white/10"}`}>
                      {n < gsStep ? <Check className="w-3 h-3" /> : n}
                    </div>
                    <span className="hidden sm:inline">{[t("landing.getstarted.step1"), t("landing.getstarted.step2"), t("landing.getstarted.step3")][n - 1]}</span>
                  </div>
                  {n < 3 && <div className="w-12 h-px bg-white/10 mx-3" />}
                </div>
              ))}
            </div>

            {gsStep === 1 && (
              <div style={{ animation: "fadeUp .4s ease both" }}>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-extrabold tracking-tight mb-2">{t("landing.getstarted.chooseTitle")}</h2>
                  <p className="text-sm text-white/35">{t("landing.getstarted.choosePre")} <strong className="text-indigo-400">{t("landing.getstarted.freeTrial")}</strong> {t("landing.getstarted.choosePost")}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {plans.map((p) => (
                    <div key={p.name} onClick={() => setSelectedPlan({ name: p.name, price: p.price })} data-testid={`button-select-plan-${p.name.toLowerCase().replace(/\s/g, "-")}`} className={`rounded-2xl p-6 cursor-pointer relative transition-all hover:-translate-y-0.5 glass-card ${selectedPlan.name === p.name ? "border-indigo-500/50 shadow-lg shadow-indigo-500/10" : "hover:border-white/15"}`}>
                      <div className={`absolute top-4 right-4 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center transition-opacity ${selectedPlan.name === p.name ? "opacity-100" : "opacity-0"}`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      {p.popular && <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/25 mb-3">{t("landing.pricing2.mostPopular")}</span>}
                      <div className="text-[15px] font-semibold text-white/70 mb-1">{p.name}</div>
                      <div className="text-3xl font-extrabold tracking-tight mb-0.5">{p.price}<sub className="text-sm font-normal text-white/25">{t("landing.pricing2.perMonth")}</sub></div>
                      <div className="text-[12px] text-white/25 mb-4">{p.tagline}</div>
                      <ul className="flex flex-col gap-1.5">
                        {p.features.map((f, j) => (
                          <li key={j} className="text-[12px] flex gap-1.5 text-white/40"><Check className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />{f}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <button onClick={() => { if (selectedPlan.name) goToStep(2); else showToast("warn", t("landing.getstarted.pleaseSelect")); }} data-testid="button-gs-continue-1" className="px-10 py-3.5 rounded-xl text-[15px] font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer">
                    {t("landing.getstarted.continue")} <ArrowRight className="inline w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            )}

            {gsStep === 2 && (
              <div style={{ animation: "fadeUp .4s ease both" }}>
                <button onClick={() => goToStep(1)} data-testid="button-gs-back-1" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] text-white/50 cursor-pointer hover:text-white/70 transition-all mb-6 bg-white/5 border border-white/10">
                  <ArrowLeft className="w-3.5 h-3.5" /> {t("landing.getstarted.back")}
                </button>
                <div className="rounded-2xl p-10 max-w-[560px] mx-auto glass-card shadow-2xl shadow-black/30">
                  <div className="flex justify-between items-center rounded-xl px-4 py-3 mb-6 bg-indigo-500/10 border border-indigo-500/20">
                    <span className="text-sm font-semibold text-white/70">{selectedPlan.name} {t("landing.getstarted.planLabel")}</span>
                    <span className="text-lg font-extrabold text-indigo-400">{selectedPlan.price}{t("landing.pricing2.perMonth")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">{t("landing.getstarted.firstName")}</label>
                      <input value={gsFirstName} onChange={e => setGsFirstName(e.target.value)} data-testid="input-gs-firstname" className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 bg-white/5" placeholder="John" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">{t("landing.getstarted.lastName")}</label>
                      <input value={gsLastName} onChange={e => setGsLastName(e.target.value)} data-testid="input-gs-lastname" className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 bg-white/5" placeholder="Smith" />
                    </div>
                  </div>
                  {[
                    { label: t("landing.getstarted.businessName"), val: gsBusiness, set: setGsBusiness, id: "input-gs-business", ph: "Acme Corp" },
                    { label: t("landing.getstarted.email"), val: gsEmail, set: setGsEmail, id: "input-gs-email", ph: "john@acme.com", type: "email" },
                    { label: t("landing.getstarted.phone"), val: gsPhone, set: setGsPhone, id: "input-gs-phone", ph: "(555) 123-4567" },
                  ].map((f) => (
                    <div key={f.id} className="mb-4">
                      <label className="block text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">{f.label}</label>
                      <input value={f.val} onChange={e => f.set(e.target.value)} type={f.type || "text"} data-testid={f.id} className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 bg-white/5" placeholder={f.ph} />
                    </div>
                  ))}
                  <div className="mb-4">
                    <label className="block text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">{t("landing.getstarted.industry")}</label>
                    <select value={gsIndustry} onChange={e => setGsIndustry(e.target.value)} data-testid="select-gs-industry" className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-indigo-500/50 bg-white/5">
                      <option value="" className="bg-[#0a0a0f]">{t("landing.getstarted.selectIndustry")}</option>
                      <option value="healthcare" className="bg-[#0a0a0f]">{t("landing.getstarted.healthcare")}</option>
                      <option value="saas" className="bg-[#0a0a0f]">{t("landing.getstarted.saas")}</option>
                      <option value="finance" className="bg-[#0a0a0f]">{t("landing.getstarted.finance")}</option>
                      <option value="realestate" className="bg-[#0a0a0f]">{t("landing.getstarted.realestate")}</option>
                      <option value="legal" className="bg-[#0a0a0f]">{t("landing.getstarted.legal")}</option>
                      <option value="marketing" className="bg-[#0a0a0f]">{t("landing.getstarted.marketing")}</option>
                      <option value="other" className="bg-[#0a0a0f]">{t("landing.getstarted.other")}</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">{t("landing.getstarted.targetCustomer")}</label>
                    <textarea value={gsTarget} onChange={e => setGsTarget(e.target.value)} data-testid="input-gs-target" className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 bg-white/5 resize-y min-h-[80px]" placeholder={t("landing.getstarted.targetPlaceholder")} />
                  </div>
                  <button onClick={() => goToStep(3)} data-testid="button-gs-continue-2" className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/20 transition-all mt-1">
                    {t("landing.getstarted.continuePayment")}
                  </button>
                </div>
              </div>
            )}

            {gsStep === 3 && (
              <div style={{ animation: "fadeUp .4s ease both" }}>
                <button onClick={() => goToStep(2)} data-testid="button-gs-back-2" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] text-white/50 cursor-pointer hover:text-white/70 transition-all mb-6 bg-white/5 border border-white/10">
                  <ArrowLeft className="w-3.5 h-3.5" /> {t("landing.getstarted.back")}
                </button>
                <div className="rounded-2xl p-10 max-w-[540px] mx-auto glass-card shadow-2xl shadow-black/30 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 bg-indigo-500/15 border border-indigo-500/20">
                    <CreditCard className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight mb-2">{t("landing.getstarted.completeSetup")}</h2>
                  <p className="text-sm text-white/35 mb-8 leading-relaxed">{t("landing.getstarted.stripeDesc", { plan: selectedPlan.name })}</p>
                  {(gsFirstName || gsBusiness || gsEmail) && (
                    <div className="text-left rounded-xl p-4 mb-4 bg-white/5 border border-white/10">
                      {gsFirstName && <div className="flex justify-between text-[13px] mb-1"><span className="text-white/30">{t("landing.getstarted.nameLabel")}</span><span className="font-medium text-white/70">{gsFirstName} {gsLastName}</span></div>}
                      {gsBusiness && <div className="flex justify-between text-[13px] mb-1"><span className="text-white/30">{t("landing.getstarted.businessLabel")}</span><span className="font-medium text-white/70">{gsBusiness}</span></div>}
                      {gsEmail && <div className="flex justify-between text-[13px]"><span className="text-white/30">{t("landing.getstarted.emailLabel")}</span><span className="font-medium text-white/70">{gsEmail}</span></div>}
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-xl px-4 py-3 mb-6 bg-indigo-500/10 border border-indigo-500/20">
                    <span className="text-[13px] text-white/40">{t("landing.getstarted.monthlySubscription")}</span>
                    <span className="text-xl font-extrabold text-indigo-400">{selectedPlan.price}{t("landing.pricing2.perMonth")}</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (checkoutLoading) return;
                      setCheckoutLoading(true);
                      try {
                        const planKey = selectedPlan.name === "Starter" ? "starter" : selectedPlan.name === "Pro" ? "pro" : "agency";
                        const resp = await fetch("/api/stripe/create-checkout-session", {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ plan: planKey, email: gsEmail, name: `${gsFirstName} ${gsLastName}`.trim() }),
                        });
                        const data = await resp.json();
                        if (data.url) { window.location.href = data.url; }
                        else { showToast("error", data.message || t("landing.getstarted.checkoutError")); setCheckoutLoading(false); }
                      } catch { showToast("error", t("landing.getstarted.connectionError")); setCheckoutLoading(false); }
                    }}
                    disabled={checkoutLoading}
                    data-testid="button-stripe-checkout"
                    className={`w-full py-3.5 rounded-xl text-[15px] font-semibold cursor-pointer transition-all mb-4 flex items-center justify-center gap-2 text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 ${checkoutLoading ? "opacity-60" : "hover:shadow-xl hover:-translate-y-0.5"}`}
                  >
                    {checkoutLoading ? (<><RotateCw className="w-4 h-4 animate-spin" /> {t("landing.getstarted.redirecting")}</>) : (<>{t("landing.getstarted.payWithStripe")} <ArrowRight className="w-4 h-4" /></>)}
                  </button>
                  <div className="flex items-center justify-center gap-4 mb-6 text-[12px] text-white/25">
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {t("landing.getstarted.secureCheckout")}</span>
                    <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> {t("landing.getstarted.cardsAccepted")}</span>
                    <span className="flex items-center gap-1"><Check className="w-3 h-3" /> {t("landing.getstarted.cancelAnytime")}</span>
                  </div>
                  <div className="text-left">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/25 mb-3">{t("landing.getstarted.whatHappensNext")}</div>
                    {[t("landing.getstarted.next1"), t("landing.getstarted.next2"), t("landing.getstarted.next3")].map((step, i) => (
                      <div key={i} className="flex gap-3 mb-2.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-indigo-400 shrink-0 bg-indigo-500/15 border border-indigo-500/20">{i + 1}</div>
                        <span className="text-[13px] text-white/40 leading-relaxed pt-0.5">{step}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 text-[12px] text-white/25 border-t border-white/5">
                    {t("landing.getstarted.questionsEmail")} <a href="mailto:info@argilette.com" className="text-indigo-400 no-underline">info@argilette.com</a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <AriaWidget />
    </>
  );
}
