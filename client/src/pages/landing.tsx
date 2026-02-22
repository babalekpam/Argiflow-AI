import { useState, useRef, useEffect, useCallback } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  Search, Send, Phone, Target, TrendingUp, ArrowRight, Check,
  Play, Shield, Clock, Sparkles, MessageSquare, Headphones, Brain,
  Rocket, Globe, Users, Mail, BarChart3, Zap, Bot, Activity,
  BarChart, Layers, Flame, ChevronRight, ArrowLeft, Mic,
  FileText, Settings, CreditCard, PieChart, PhoneCall,
  Database, Eye, Star, Calendar, Filter, X, RotateCw
} from "lucide-react";

type ViewType = "landing" | "demo" | "getstarted" | "dashboard";
type DemoTab = "leads" | "outreach" | "voice" | "email";
type DashPanel = "overview" | "outreach" | "voice" | "intelligence" | "email" | "crm" | "reports" | "billing";

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

const plans = [
  {
    name: "Starter", price: "$297", tagline: "Perfect for solo founders & small teams",
    features: ["500 leads/month", "AI email outreach", "Basic CRM", "Email warmup (2 accounts)", "Weekly reports", "Chat support"],
  },
  {
    name: "Growth", price: "$597", tagline: "Most popular — for scaling teams", popular: true,
    features: ["1,500 leads/month", "AI email + SMS outreach", "Voice AI Agent", "Full CRM + pipeline", "Email warmup (5 accounts)", "Sales intelligence", "Priority support"],
  },
  {
    name: "Agency OS", price: "$1,497", tagline: "For agencies managing multiple clients",
    features: ["5,000 leads/month", "Unlimited outreach channels", "White-label Voice AI", "Multi-client CRM", "Email warmup (15 accounts)", "Custom AI training", "Dedicated success manager", "API access"],
  },
];

export default function LandingPage() {
  usePageTitle();
  const { t } = useTranslation();

  const [currentView, setCurrentView] = useState<ViewType>("landing");
  const [activeDemo, setActiveDemo] = useState<DemoTab>("leads");
  const [gsStep, setGsStep] = useState<1 | 2 | 3>(1);
  const [selectedPlan, setSelectedPlan] = useState({ name: "Growth", price: "$597" });
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [toast, setToast] = useState<{ icon: string; msg: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [leadStatus, setLeadStatus] = useState("");
  const [leadResults, setLeadResults] = useState<typeof mockLeads>([]);
  const [leadRunning, setLeadRunning] = useState(false);
  const [demoIndustry, setDemoIndustry] = useState("");
  const [demoLocation, setDemoLocation] = useState("");
  const [demoTitle, setDemoTitle] = useState("");
  const leadTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [activityItems, setActivityItems] = useState([
    { icon: "mail", title: "Email opened — Dr. Sarah Martinez, OrthoCare Miami", time: "2 min ago" },
    { icon: "reply", title: "Reply received — James Wilson, Gulf Coast Pediatrics", time: "8 min ago" },
    { icon: "cal", title: "Meeting booked — Kevin Patel, Sunrise Family Medicine", time: "23 min ago" },
    { icon: "send", title: "Follow-up sent — Amanda Torres, Tampa Bay Medical", time: "41 min ago" },
  ]);

  const [callState, setCallState] = useState<"idle" | "calling">("idle");
  const [callStatus, setCallStatus] = useState("Click to simulate call");
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

  const [dashPanel, setDashPanel] = useState<DashPanel>("overview");

  const showToast = useCallback((icon: string, msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ icon, msg });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const showView = useCallback((v: ViewType) => {
    setCurrentView(v);
    window.scrollTo(0, 0);
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
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
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [callTranscript]);

  useEffect(() => {
    return () => {
      if (leadTimer.current) clearInterval(leadTimer.current);
      callTimers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const runLeadGen = useCallback(() => {
    setLeadRunning(true);
    setLeadResults([]);
    const industry = demoIndustry || "businesses";
    const location = demoLocation || "US";
    const msgs = [
      "Scanning NPI Registry and public directories...",
      `Matching ${industry} in ${location}...`,
      "Verifying email addresses...",
      "Enriching with phone numbers and LinkedIn...",
      "Scoring leads by intent and fit...",
    ];
    let i = 0;
    setLeadStatus(msgs[0]);
    if (leadTimer.current) clearInterval(leadTimer.current);
    leadTimer.current = setInterval(() => {
      i++;
      if (i < msgs.length) {
        setLeadStatus(msgs[i]);
      } else {
        if (leadTimer.current) clearInterval(leadTimer.current);
        setLeadRunning(false);
        setLeadStatus("");
        const count = Math.floor(Math.random() * 4) + 5;
        setLeadResults(mockLeads.slice(0, count));
        showToast("check", `${count} leads found!`);
      }
    }, 700);
  }, [demoIndustry, demoLocation, showToast]);

  const simulateOutreach = useCallback(() => {
    showToast("mail", "Running next outreach cycle — 12 emails queued...");
    const t = setTimeout(() => {
      setActivityItems(prev => [
        { icon: "send", title: "Email sent → Dr. Robert Chen, Bayview Family Practice", time: "Just now" },
        ...prev,
      ]);
    }, 1500);
    callTimers.current.push(t);
  }, [showToast]);

  const simulateCall = useCallback(() => {
    if (callState !== "idle") {
      setCallState("idle");
      setCallStatus("Click to simulate call");
      setShowTranscript(false);
      setCallTranscript([]);
      callTimers.current.forEach(t => clearTimeout(t));
      callTimers.current = [];
      return;
    }
    setCallState("calling");
    setCallStatus("Dialing...");
    setShowTranscript(true);
    setCallTranscript([]);

    const t1 = setTimeout(() => setCallStatus("Connected — AI speaking"), 1500);
    callTimers.current.push(t1);

    const delays = [2000, 5000, 9000, 13000, 17000, 22000, 27000];
    transcriptLines.forEach((line, idx) => {
      const t = setTimeout(() => {
        setCallTranscript(prev => [...prev, line]);
        if (idx === transcriptLines.length - 1) {
          const t2 = setTimeout(() => {
            setCallStatus("Meeting booked — Thu 2pm");
            setCallState("idle");
            showToast("calendar", "Meeting booked — Thu 2pm!");
          }, 2000);
          callTimers.current.push(t2);
        }
      }, delays[idx] || idx * 4000);
      callTimers.current.push(t);
    });
  }, [callState, showToast]);

  const gsSelectPlan = useCallback((name: string, price: string) => {
    setSelectedPlan({ name, price });
  }, []);

  const goToStep = useCallback((step: 1 | 2 | 3) => {
    setGsStep(step);
    window.scrollTo(0, 0);
  }, []);

  const startPlan = useCallback((name: string, price: string) => {
    setSelectedPlan({ name, price });
    setGsStep(1);
    showView("getstarted");
  }, [showView]);

  const syne = { fontFamily: "'Syne', sans-serif" };
  const dm = { fontFamily: "'DM Sans', sans-serif" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:.5;transform:scale(.7);} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        @keyframes voicePulse { 0%{box-shadow:0 0 0 0 rgba(0,229,160,.6);}70%{box-shadow:0 0 0 30px rgba(0,229,160,0);}100%{box-shadow:0 0 0 0 rgba(0,229,160,0);} }
        @keyframes toastIn { from{transform:translateX(100%);opacity:0;}to{transform:translateX(0);opacity:1;} }
        .anim-fadeUp { animation: fadeUp .3s ease; }
        .voice-pulse { animation: voicePulse 1.5s infinite; }
      `}</style>

      <div style={dm} className="min-h-screen bg-[#07090f] text-[#eef2ff] relative overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          backgroundImage: "linear-gradient(rgba(0,229,160,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,160,.025) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div className="fixed pointer-events-none z-0" style={{ width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,100,255,.08) 0%,transparent 65%)", top: -300, right: -200 }} />
        <div className="fixed pointer-events-none z-0" style={{ width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,229,160,.06) 0%,transparent 65%)", bottom: -150, left: -100 }} />

        {toast && (
          <div className="fixed top-20 right-6 z-[200] px-5 py-3 rounded-xl flex items-center gap-3 text-sm font-medium shadow-lg" style={{ background: "#131a26", border: "1px solid rgba(255,255,255,0.12)", animation: "toastIn .3s ease" }}>
            <span className="text-[#00e5a0]">
              {toast.icon === "check" && <Check className="w-4 h-4" />}
              {toast.icon === "mail" && <Mail className="w-4 h-4" />}
              {toast.icon === "calendar" && <Calendar className="w-4 h-4" />}
              {!["check", "mail", "calendar"].includes(toast.icon) && <Sparkles className="w-4 h-4" />}
            </span>
            <span>{toast.msg}</span>
          </div>
        )}

        <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-8 h-16" style={{ background: "rgba(7,9,15,.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="cursor-pointer" style={syne} onClick={() => showView("landing")} data-testid="link-home">
            <span className="text-xl font-extrabold tracking-tight">Argi<span className="text-[#00e5a0]">Flow</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <span className="text-sm text-[#8a9abb] cursor-pointer hover:text-[#eef2ff] transition-colors" onClick={() => scrollToSection("features-section")} data-testid="link-nav-features">Features</span>
            <span className="text-sm text-[#8a9abb] cursor-pointer hover:text-[#eef2ff] transition-colors" onClick={() => showView("demo")} data-testid="link-nav-demo">Demo</span>
            <span className="text-sm text-[#8a9abb] cursor-pointer hover:text-[#eef2ff] transition-colors" onClick={() => scrollToSection("pricing-section")} data-testid="link-nav-pricing">Pricing</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="compact" />
            <a href="/login" data-testid="link-login" className="px-4 py-2 rounded-lg text-[13px] text-[#8a9abb] hover:text-[#eef2ff] cursor-pointer transition-all" style={dm}>
              Log In
            </a>
            <button onClick={() => showView("demo")} data-testid="button-live-demo" className="px-4 py-2 rounded-lg text-[13px] text-[#eef2ff] cursor-pointer transition-all" style={{ border: "1px solid rgba(255,255,255,0.12)", background: "transparent", ...dm }}>
              <span className="inline-block w-[7px] h-[7px] bg-[#00e5a0] rounded-full mr-1.5" style={{ animation: "pulse-dot 2s infinite" }} />
              Live Demo
            </button>
            <button onClick={() => showView("getstarted")} data-testid="button-get-started" className="px-4 py-2 bg-[#00e5a0] rounded-lg text-[13px] font-bold text-[#07090f] cursor-pointer hover:bg-[#00ffb3] transition-all" style={syne}>
              Get Started
            </button>
          </div>
        </nav>

        {currentView === "landing" && (
          <div className="relative z-[1] min-h-screen">
            <div className="pt-[140px] pb-20 px-6 md:px-12 max-w-[1200px] mx-auto">
              <div className="inline-flex items-center gap-2 text-[11px] font-medium text-[#8a9abb] uppercase tracking-[2px] px-4 py-1.5 rounded-full mb-4" style={{ background: "#131a26", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="w-1.5 h-1.5 bg-[#00e5a0] rounded-full" />
                The All-In-One B2B Growth Engine
              </div>
              <div className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#f59e0b] px-4 py-1.5 rounded-full mb-8" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }} data-testid="badge-replaces">
                Replaces Apollo + ZoomInfo + Instantly + GoHighLevel + Smartlead
              </div>
              <h1 style={syne} className="text-[clamp(38px,6.5vw,82px)] font-extrabold leading-[1.0] tracking-[-3px] mb-7 max-w-[950px]">
                Stop Paying for <span className="text-[#ef4444] line-through decoration-[3px]">5 Tools.</span>{" "}
                <span className="text-[#00e5a0]">Get Everything</span> in <span className="text-[#3b82f6]">One.</span>
              </h1>
              <p className="text-lg text-[#8a9abb] font-light max-w-[600px] leading-relaxed mb-5">
                ArgiFlow gives you what Apollo, ZoomInfo, Instantly, Smartlead, and GoHighLevel do — combined into a single platform. Lead data, outreach, voice AI, email infrastructure, CRM, funnels, and 40+ tools. No add-ons. No per-seat charges. Nothing else to buy.
              </p>
              <p className="text-[15px] text-[#00e5a0] font-medium mb-12 max-w-[540px]">
                One login. One bill. Every tool you need to find, contact, and close B2B deals.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <button onClick={() => showView("getstarted")} data-testid="button-start-trial" className="px-9 py-4 bg-[#00e5a0] rounded-xl text-[16px] font-bold text-[#07090f] cursor-pointer hover:bg-[#00ffb3] hover:shadow-[0_8px_32px_rgba(0,229,160,.35)] hover:-translate-y-0.5 transition-all" style={syne}>
                  Start Free Trial
                </button>
                <button onClick={() => showView("demo")} data-testid="button-watch-demo" className="px-9 py-4 rounded-xl text-[15px] font-medium text-[#eef2ff] cursor-pointer hover:border-[rgba(255,255,255,.3)] transition-all" style={{ border: "1px solid rgba(255,255,255,0.12)", background: "transparent", ...dm }}>
                  Watch Demo
                </button>
              </div>
              <div className="flex items-center gap-4 mt-8">
                <div className="flex -space-x-2">
                  {["#3b82f6", "#00e5a0", "#f59e0b", "#ef4444", "#8a9abb"].map((c, i) => (
                    <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: c, border: "2px solid #07090f" }}>
                      {["JM", "SK", "AT", "RC", "LP"][i]}
                    </div>
                  ))}
                </div>
                <span className="text-[13px] text-[#8a9abb]">
                  Trusted by <strong className="text-[#00e5a0]">500+</strong> sales teams saving $2,000+/mo
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-px mt-20 rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {[
                  { num: "40+", label: "Tools Built In" },
                  { num: "$0", label: "Extra Software Costs" },
                  { num: "24/7", label: "AI Agent Availability" },
                  { num: "10x", label: "Pipeline Growth" },
                ].map((s, i) => (
                  <div key={i} className="bg-[#0d1119] py-8 px-7 text-center">
                    <div style={syne} className="text-4xl font-extrabold tracking-[-1.5px] mb-1.5">{s.num}</div>
                    <div className="text-[13px] text-[#5a6a8a]">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-24 scroll-mt-20" data-testid="section-comparison">
                <div className="text-[11px] font-semibold uppercase tracking-[2px] text-[#5a6a8a] mb-3">Why ArgiFlow Wins</div>
                <h2 style={syne} className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-1.5px] mb-4">They Sell You Pieces. We Give You the Whole Machine.</h2>
                <p className="text-[16px] text-[#8a9abb] max-w-[580px] leading-relaxed mb-12">Other platforms make you buy 5 subscriptions and glue them together. ArgiFlow replaces all of them — for a fraction of the cost.</p>

                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="grid grid-cols-[1fr_100px_100px_100px] md:grid-cols-[1fr_120px_120px_120px] text-center" style={{ background: "#131a26" }}>
                    <div className="p-4 text-left text-[13px] font-semibold text-[#5a6a8a]">Capability</div>
                    <div className="p-4 text-[13px] font-bold text-[#00e5a0]" style={syne}>ArgiFlow</div>
                    <div className="p-4 text-[13px] font-medium text-[#5a6a8a]">Apollo</div>
                    <div className="p-4 text-[13px] font-medium text-[#5a6a8a]">ZoomInfo</div>
                  </div>
                  {[
                    { feat: "B2B Contact & Company Data", a: true, b: true, c: true },
                    { feat: "Email Finder & Verification", a: true, b: true, c: true },
                    { feat: "Multi-Channel Outreach (Email + SMS)", a: true, b: "email", c: false },
                    { feat: "AI Voice Calling Agent", a: true, b: false, c: false },
                    { feat: "Email Warmup & Deliverability", a: true, b: false, c: false },
                    { feat: "CRM & Sales Pipeline", a: true, b: "basic", c: false },
                    { feat: "Landing Pages & Funnels", a: true, b: false, c: false },
                    { feat: "AI Chat Widget", a: true, b: false, c: false },
                    { feat: "Invoicing & Proposals", a: true, b: false, c: false },
                    { feat: "Social Media Management", a: true, b: false, c: false },
                    { feat: "Reputation & Reviews", a: true, b: false, c: false },
                    { feat: "Blog & Content Builder", a: true, b: false, c: false },
                    { feat: "Membership & Courses", a: true, b: false, c: false },
                    { feat: "Workflow Automation Engine", a: true, b: "basic", c: false },
                    { feat: "Intent Data & Signals", a: true, b: true, c: true },
                    { feat: "Org Charts & Technographics", a: true, b: false, c: true },
                    { feat: "A/B Testing", a: true, b: false, c: false },
                    { feat: "Calendar & Scheduling", a: true, b: false, c: false },
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-[1fr_100px_100px_100px] md:grid-cols-[1fr_120px_120px_120px] text-center items-center" style={{ background: i % 2 === 0 ? "#0d1119" : "#0f1420", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="p-3 md:p-4 text-left text-[12px] md:text-[13px] text-[#c8d0e0]">{row.feat}</div>
                      <div className="p-3 md:p-4">{row.a === true ? <Check className="w-4 h-4 text-[#00e5a0] mx-auto" /> : <span className="text-[11px] text-[#5a6a8a]">{row.a}</span>}</div>
                      <div className="p-3 md:p-4">{row.b === true ? <Check className="w-4 h-4 text-[#3b82f6] mx-auto" /> : row.b === false ? <X className="w-4 h-4 text-[#ef4444]/40 mx-auto" /> : <span className="text-[11px] text-[#5a6a8a]">{row.b}</span>}</div>
                      <div className="p-3 md:p-4">{row.c === true ? <Check className="w-4 h-4 text-[#3b82f6] mx-auto" /> : row.c === false ? <X className="w-4 h-4 text-[#ef4444]/40 mx-auto" /> : <span className="text-[11px] text-[#5a6a8a]">{row.c}</span>}</div>
                    </div>
                  ))}
                  <div className="grid grid-cols-[1fr_100px_100px_100px] md:grid-cols-[1fr_120px_120px_120px] text-center items-center" style={{ background: "#131a26", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="p-4 text-left text-[13px] font-bold text-[#eef2ff]">Starting Price</div>
                    <div className="p-4 text-[14px] font-bold text-[#00e5a0]" style={syne}>$297/mo</div>
                    <div className="p-4 text-[13px] text-[#8a9abb]">$49-149/mo<br /><span className="text-[10px] text-[#5a6a8a]">+ credits</span></div>
                    <div className="p-4 text-[13px] text-[#8a9abb]">$14,995/yr<br /><span className="text-[10px] text-[#5a6a8a]">per seat</span></div>
                  </div>
                </div>

                <div className="mt-6 p-5 rounded-xl flex items-start gap-3" style={{ background: "rgba(0,229,160,0.06)", border: "1px solid rgba(0,229,160,0.12)" }}>
                  <Zap className="w-5 h-5 text-[#00e5a0] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[14px] font-semibold text-[#eef2ff] mb-1">The bottom line</div>
                    <div className="text-[13px] text-[#8a9abb] leading-relaxed">With Apollo + ZoomInfo + Instantly + Smartlead + GoHighLevel, you'd pay <strong className="text-[#eef2ff]">$3,000-5,000/mo</strong> and still need to connect everything yourself. ArgiFlow gives you <strong className="text-[#00e5a0]">all of it for $297/mo</strong> — already connected, already automated, ready to go.</div>
                  </div>
                </div>
              </div>

              <div id="features-section" className="mt-24 scroll-mt-20">
                <div className="text-[11px] font-semibold uppercase tracking-[2px] text-[#5a6a8a] mb-3">What's All Included</div>
                <h2 style={syne} className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-1.5px] mb-4">40+ Tools. Zero Add-Ons. Nothing Else to Buy.</h2>
                <p className="text-[16px] text-[#8a9abb] max-w-[580px] leading-relaxed">Every tool below is included in your plan. No upsells, no per-seat fees, no credit limits, no surprise invoices.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
                  {[
                    { icon: Search, title: "B2B Lead Intelligence", desc: "Find decision-makers with verified emails, phones, company data, and buying intent — like Apollo + ZoomInfo combined.", color: "#00e5a0", bg: "rgba(0,229,160,0.12)" },
                    { icon: Send, title: "AI Multi-Channel Outreach", desc: "Automated email, SMS, and LinkedIn sequences — personalized by AI, sent at the perfect time. Replaces Instantly + Smartlead.", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
                    { icon: Phone, title: "Voice AI Calling Agent", desc: "An AI agent that makes real phone calls, handles objections, and books meetings — 24/7. No other platform has this.", color: "#00e5a0", bg: "rgba(0,229,160,0.12)" },
                    { icon: Mail, title: "Email Infrastructure", desc: "Warmup, reputation monitoring, inbox placement testing, and deliverability optimization. Built in — not a $100/mo add-on.", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
                    { icon: Brain, title: "Sales Intelligence & Enrichment", desc: "Company profiles, org charts, technographic data, intent signals, and AI-powered deep research on any prospect.", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
                    { icon: Users, title: "CRM & Sales Pipeline", desc: "Kanban pipelines, deal tracking, lead scoring, and AI-predicted close probability. No Salesforce needed.", color: "#00e5a0", bg: "rgba(0,229,160,0.12)" },
                    { icon: Globe, title: "Landing Pages & Funnels", desc: "Build high-converting pages with 5 templates, custom domains, and built-in analytics. Replaces ClickFunnels.", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
                    { icon: MessageSquare, title: "AI Chat Widget", desc: "Embed an AI chatbot on your site that captures leads, answers questions, and books appointments automatically.", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
                    { icon: FileText, title: "Invoicing & Proposals", desc: "Send professional invoices and proposals with e-signatures. Track views, get paid — no QuickBooks required.", color: "#00e5a0", bg: "rgba(0,229,160,0.12)" },
                    { icon: BarChart3, title: "Social Media Management", desc: "Schedule and publish to multiple platforms. AI writes your posts. Replaces Buffer or Hootsuite.", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
                    { icon: Star, title: "Reputation & Reviews", desc: "Monitor reviews across Google and other platforms. AI-powered response suggestions. Manage your brand.", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
                    { icon: Layers, title: "Workflow Automation Engine", desc: "Visual n8n-style automations with triggers, conditions, and AI actions. Automate any process — no Zapier needed.", color: "#00e5a0", bg: "rgba(0,229,160,0.12)" },
                    { icon: Calendar, title: "Calendar & Scheduling", desc: "Client appointment booking with availability sync. Like Calendly, but already built into your sales workflow.", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
                    { icon: Activity, title: "Blog & Content Builder", desc: "AI-powered blog with SEO optimization. Publish to your site, drive organic traffic, capture leads.", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
                    { icon: Rocket, title: "Membership & Courses", desc: "Create gated content, online courses, and membership areas. Monetize your expertise directly.", color: "#00e5a0", bg: "rgba(0,229,160,0.12)" },
                  ].map((f, i) => (
                    <div key={i} className="bg-[#0d1119] rounded-2xl p-7 transition-all duration-200 hover:-translate-y-1 cursor-default" style={{ border: "1px solid rgba(255,255,255,0.07)" }} data-testid={`card-feature-${i}`}>
                      <div className="w-11 h-11 rounded-[10px] flex items-center justify-center text-xl mb-4" style={{ background: f.bg, color: f.color }}>
                        <f.icon className="w-5 h-5" />
                      </div>
                      <div style={syne} className="text-[15px] font-bold mb-2">{f.title}</div>
                      <div className="text-[13px] text-[#8a9abb] leading-relaxed">{f.desc}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-12 p-6 rounded-2xl text-center" style={{ background: "linear-gradient(135deg, rgba(0,229,160,0.08), rgba(59,130,246,0.08))", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={syne} className="text-[20px] font-bold mb-2">Plus: A/B Testing, Documents, Google Business Profile, Community Forums, and more.</div>
                  <div className="text-[14px] text-[#8a9abb]">Every feature is included. Every plan. No hidden upgrades.</div>
                </div>
              </div>

              <div className="mt-24 py-16 px-6 md:px-12" data-testid="section-what-they-charge">
                <div className="text-[11px] font-semibold uppercase tracking-[2px] text-[#5a6a8a] mb-3 text-center">The Real Cost of "Cheaper" Tools</div>
                <h2 style={syne} className="text-[clamp(24px,3.5vw,40px)] font-extrabold tracking-[-1.5px] mb-12 text-center max-w-[700px] mx-auto">What You'd Pay Without ArgiFlow</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[900px] mx-auto">
                  {[
                    { tool: "Apollo.io", price: "$99/mo", what: "Contact data only" },
                    { tool: "ZoomInfo", price: "$1,250/mo", what: "Company intel only" },
                    { tool: "Instantly.ai", price: "$97/mo", what: "Cold email only" },
                    { tool: "Smartlead", price: "$94/mo", what: "Email warmup only" },
                    { tool: "GoHighLevel", price: "$297/mo", what: "CRM + funnels only" },
                    { tool: "Calendly", price: "$12/mo", what: "Scheduling only" },
                  ].map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "#0d1119", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div>
                        <div className="text-[14px] font-medium text-[#eef2ff]">{t.tool}</div>
                        <div className="text-[11px] text-[#5a6a8a]">{t.what}</div>
                      </div>
                      <div className="text-[14px] font-bold text-[#ef4444]">{t.price}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 text-center">
                  <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <span className="text-[18px] font-bold text-[#ef4444] line-through" style={syne}>$1,849+/mo</span>
                    <ArrowRight className="w-5 h-5 text-[#5a6a8a]" />
                    <span className="text-[22px] font-extrabold text-[#00e5a0]" style={syne}>$297/mo</span>
                    <span className="text-[13px] text-[#8a9abb] ml-1">with ArgiFlow</span>
                  </div>
                  <div className="mt-4 text-[14px] text-[#8a9abb]">Save over <strong className="text-[#00e5a0]">$18,000/year</strong> — and get more features than any of them individually.</div>
                </div>
              </div>
            </div>

            <div id="pricing-section" className="py-24 px-6 md:px-12 max-w-[1200px] mx-auto scroll-mt-20">
              <div className="text-[11px] font-semibold uppercase tracking-[2px] text-[#5a6a8a] mb-3">Pricing</div>
              <h2 style={syne} className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-1.5px] mb-4">One Platform. One Price. Everything Included.</h2>
              <p className="text-[16px] text-[#8a9abb] max-w-[520px] leading-relaxed">No per-seat charges. No credit limits. No hidden add-ons. Choose your plan and get every single tool from day one.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
                {plans.map((p, i) => (
                  <div key={i} className={`bg-[#0d1119] rounded-[20px] p-9 relative overflow-hidden transition-transform hover:-translate-y-1 ${p.popular ? "border-[rgba(59,130,246,.4)]" : ""}`} style={{ border: p.popular ? "1px solid rgba(59,130,246,.4)" : "1px solid rgba(255,255,255,0.07)" }} data-testid={`card-plan-${p.name.toLowerCase().replace(/\s/g, "-")}`}>
                    {p.popular && (
                      <div className="absolute top-0 right-6 bg-[#3b82f6] text-white text-[10px] font-bold uppercase tracking-[1px] px-3 py-1 rounded-b-lg">Most Popular</div>
                    )}
                    <div style={syne} className="text-[16px] font-bold mb-1.5">{p.name}</div>
                    <div style={syne} className="text-5xl font-extrabold tracking-[-2px] leading-none mb-1">{p.price}<sub className="text-[16px] font-normal text-[#5a6a8a] tracking-normal align-middle">/mo</sub></div>
                    <div className="text-[13px] text-[#5a6a8a] mb-7">{p.tagline}</div>
                    <ul className="flex flex-col gap-2.5 mb-8">
                      {p.features.map((f, j) => (
                        <li key={j} className="text-[13px] flex gap-2.5 items-start text-[rgba(238,242,255,.75)]">
                          <Check className="w-3.5 h-3.5 text-[#00e5a0] mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => startPlan(p.name, p.price)} data-testid={`button-plan-${p.name.toLowerCase().replace(/\s/g, "-")}`} className={`w-full py-3.5 rounded-[10px] text-[14px] font-bold cursor-pointer transition-all ${p.popular ? "bg-[#00e5a0] text-[#07090f] hover:bg-[#00ffb3]" : "text-[#eef2ff] hover:border-[rgba(255,255,255,.3)]"}`} style={p.popular ? syne : { ...syne, background: "transparent", border: "1px solid rgba(255,255,255,0.12)" }}>
                      Get Started
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-20 px-6 md:px-12 max-w-[800px] mx-auto text-center">
              <h2 style={syne} className="text-[clamp(26px,3.5vw,40px)] font-extrabold tracking-[-1.5px] mb-5">Ready to Replace Your Entire Sales Stack?</h2>
              <p className="text-[16px] text-[#8a9abb] leading-relaxed mb-8">Join 500+ teams who ditched 5+ subscriptions for one platform that does it all. Start free — no credit card required.</p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <button onClick={() => showView("getstarted")} data-testid="button-bottom-cta" className="px-9 py-4 bg-[#00e5a0] rounded-xl text-[16px] font-bold text-[#07090f] cursor-pointer hover:bg-[#00ffb3] hover:shadow-[0_8px_32px_rgba(0,229,160,.35)] hover:-translate-y-0.5 transition-all" style={syne}>
                  Start Free Trial
                </button>
                <button onClick={() => showView("demo")} data-testid="button-bottom-demo" className="px-9 py-4 rounded-xl text-[15px] font-medium text-[#eef2ff] cursor-pointer hover:border-[rgba(255,255,255,.3)] transition-all" style={{ border: "1px solid rgba(255,255,255,0.12)", background: "transparent", ...dm }}>
                  Watch Demo First
                </button>
              </div>
            </div>

            <footer className="py-8 px-6 text-center text-[13px] text-[#5a6a8a]" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              &copy; 2026 ArgiFlow AI. All rights reserved.
            </footer>
          </div>
        )}

        {currentView === "demo" && (
          <div className="relative z-[1] min-h-screen pt-24 pb-16 px-6 md:px-12 max-w-[1100px] mx-auto anim-fadeUp">
            <div className="mb-4">
              <div className="text-[11px] font-semibold uppercase tracking-[2px] text-[#5a6a8a] mb-2">Interactive Demo</div>
              <h2 style={syne} className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-1.5px] mb-2">See ArgiFlow in Action</h2>
              <p className="text-[14px] text-[#8a9abb]">Explore each module with live simulations.</p>
            </div>
            <div className="flex gap-2 p-1 rounded-xl w-fit mb-10" style={{ background: "#0d1119", border: "1px solid rgba(255,255,255,0.07)" }}>
              {([["leads", "Lead Gen"], ["outreach", "Outreach"], ["voice", "Voice AI"], ["email", "Email Infra"]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setActiveDemo(k)} data-testid={`button-demo-tab-${k}`} className={`px-5 py-2.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all ${activeDemo === k ? "bg-[#1a2235] text-[#eef2ff]" : "text-[#8a9abb]"}`} style={{ border: "none", ...dm }}>
                  {label}
                </button>
              ))}
            </div>

            {activeDemo === "leads" && (
              <div className="anim-fadeUp">
                <div className="bg-[#0d1119] rounded-2xl p-8 mb-5" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex gap-3 mb-6 flex-wrap">
                    <input value={demoIndustry} onChange={e => setDemoIndustry(e.target.value)} placeholder="Industry (e.g. Healthcare)" data-testid="input-demo-industry" className="flex-1 min-w-[180px] bg-[#131a26] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a] focus:border-[rgba(0,229,160,.4)] transition-colors" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} />
                    <input value={demoLocation} onChange={e => setDemoLocation(e.target.value)} placeholder="Location (e.g. Florida)" data-testid="input-demo-location" className="flex-1 min-w-[180px] bg-[#131a26] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a] focus:border-[rgba(0,229,160,.4)] transition-colors" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} />
                    <input value={demoTitle} onChange={e => setDemoTitle(e.target.value)} placeholder="Title (e.g. Owner)" data-testid="input-demo-title" className="flex-1 min-w-[180px] bg-[#131a26] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a] focus:border-[rgba(0,229,160,.4)] transition-colors" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} />
                    <button onClick={runLeadGen} disabled={leadRunning} data-testid="button-run-lead-gen" className="px-7 py-3 bg-[#00e5a0] rounded-[10px] text-[14px] font-bold text-[#07090f] cursor-pointer hover:bg-[#00ffb3] transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed" style={syne}>
                      Generate Leads
                    </button>
                  </div>
                  {leadStatus && <div className="text-[14px] text-[#8a9abb] py-4">{leadStatus}</div>}
                  {leadResults.length > 0 && (
                    <div className="anim-fadeUp">
                      <div className="text-[13px] text-[#8a9abb] mb-4"><strong className="text-[#00e5a0]">{leadResults.length}</strong> verified leads found</div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              {["Name", "Title", "Company", "Email", "Phone", "Score"].map(h => (
                                <th key={h} className="text-[11px] font-semibold uppercase tracking-[1px] text-[#5a6a8a] px-3.5 py-2.5 text-left" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {leadResults.map((l, i) => (
                              <tr key={i} className="hover:bg-[#131a26]">
                                <td className="px-3.5 py-3.5 text-[13px] font-medium" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{l.name}</td>
                                <td className="px-3.5 py-3.5 text-[13px] text-[#8a9abb]" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{l.title}</td>
                                <td className="px-3.5 py-3.5 text-[13px]" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{l.company}</td>
                                <td className="px-3.5 py-3.5 text-[13px] text-[#00e5a0]" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{l.email}</td>
                                <td className="px-3.5 py-3.5 text-[13px] text-[#8a9abb]" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{l.phone}</td>
                                <td className="px-3.5 py-3.5 text-[13px]" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${l.stype === "high" ? "bg-[rgba(0,229,160,.15)] text-[#00e5a0]" : "bg-[rgba(245,158,11,.15)] text-[#f59e0b]"}`}>{l.score}</span>
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
              <div className="anim-fadeUp">
                <div className="bg-[#0d1119] rounded-2xl p-8 mb-5" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex gap-0 mb-8 overflow-x-auto">
                    {[
                      { label: "DISCOVERED", count: 127, sub: "New leads", done: true },
                      { label: "ENRICHED", count: 98, sub: "Verified", done: true },
                      { label: "CONTACTED", count: 64, sub: "Email sent", active: true },
                      { label: "REPLIED", count: 23, sub: "17% rate" },
                      { label: "MEETING", count: 11, sub: "Booked" },
                    ].map((s, i, arr) => (
                      <div key={i} className={`flex-1 min-w-[100px] px-3 py-4 text-center relative ${i === 0 ? "rounded-l-[10px]" : ""} ${i === arr.length - 1 ? "rounded-r-[10px]" : ""} ${s.done ? "bg-[rgba(0,229,160,.08)]" : s.active ? "bg-[rgba(59,130,246,.1)]" : "bg-[#131a26]"}`} style={{ border: `1px solid ${s.done ? "rgba(0,229,160,.2)" : s.active ? "rgba(59,130,246,.3)" : "rgba(255,255,255,0.07)"}` }}>
                        <div className="text-[11px] font-semibold text-[#5a6a8a] uppercase tracking-[.8px]">{s.label}</div>
                        <div style={syne} className="text-[22px] font-extrabold my-1">{s.count}</div>
                        <div className="text-[10px] text-[#5a6a8a]">{s.sub}</div>
                        {i < arr.length - 1 && <span className="absolute -right-2.5 top-1/2 -translate-y-1/2 text-[#5a6a8a] text-[14px] z-10">&rarr;</span>}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mb-6 gap-4 flex-wrap" style={syne}>
                    <span className="text-[14px] font-bold">Live Activity</span>
                    <button onClick={simulateOutreach} data-testid="button-run-outreach" className="px-7 py-3 bg-[#00e5a0] rounded-[10px] text-[14px] font-bold text-[#07090f] cursor-pointer hover:bg-[#00ffb3] transition-all" style={syne}>
                      Run Next Cycle
                    </button>
                  </div>
                  <div className="flex flex-col">
                    {activityItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-3.5 py-3.5" style={{ borderBottom: i < activityItems.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[14px] shrink-0 mt-0.5" style={{ background: item.icon === "cal" ? "rgba(59,130,246,0.12)" : "rgba(0,229,160,0.12)" }}>
                          {item.icon === "mail" && <Mail className="w-4 h-4 text-[#00e5a0]" />}
                          {item.icon === "reply" && <MessageSquare className="w-4 h-4 text-[#00e5a0]" />}
                          {item.icon === "cal" && <Calendar className="w-4 h-4 text-[#3b82f6]" />}
                          {item.icon === "send" && <Send className="w-4 h-4 text-[#00e5a0]" />}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium mb-0.5">{item.title}</div>
                          <div className="text-[11px] text-[#5a6a8a]">{item.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeDemo === "voice" && (
              <div className="anim-fadeUp">
                <div className="bg-[#0d1119] rounded-2xl p-8" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex flex-col items-center py-12 gap-6">
                    <button onClick={simulateCall} data-testid="button-simulate-call" className={`w-[100px] h-[100px] rounded-full border-none cursor-pointer text-4xl flex items-center justify-center transition-all hover:scale-105 ${callState === "calling" ? "voice-pulse" : ""}`} style={{ background: "linear-gradient(135deg,#00e5a0,#00b377)" }}>
                      {callState === "calling" ? <PhoneCall className="w-9 h-9 text-[#07090f]" /> : <Phone className="w-9 h-9 text-[#07090f]" />}
                    </button>
                    <div style={syne} className="text-[16px] font-bold">{callStatus}</div>
                    {showTranscript && (
                      <div ref={transcriptRef} className="bg-[#131a26] rounded-xl p-5 w-full max-w-[500px] max-h-[220px] overflow-y-auto text-[13px] leading-relaxed" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                        {callTranscript.map((line, i) => (
                          <div key={i} className={`mb-2.5 ${line.role === "ai" ? "text-[#00e5a0]" : "text-[#8a9abb]"}`}>
                            <strong>{line.role === "ai" ? "AI:" : "Dr. Torres:"}</strong> {line.text}
                          </div>
                        ))}
                        {callTranscript.length === 0 && <div className="text-[#5a6a8a]">Waiting for connection...</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeDemo === "email" && (
              <div className="anim-fadeUp">
                <div className="bg-[#0d1119] rounded-2xl p-8 mb-5" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={syne} className="text-[14px] font-bold mb-5">Email Warmup Dashboard</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {[
                      { email: "outreach@argilette.co", pct: 92, sent: "1,247", rep: "94%" },
                      { email: "sales@argilette.co", pct: 78, sent: "892", rep: "87%" },
                      { email: "hello@argilette.co", pct: 85, sent: "1,031", rep: "91%" },
                      { email: "team@argilette.co", pct: 41, sent: "234", rep: "72%" },
                    ].map((e, i) => (
                      <div key={i} className="bg-[#131a26] rounded-xl p-5" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="text-[13px] font-medium mb-3">{e.email}</div>
                        <div className="h-1.5 rounded bg-[rgba(255,255,255,.06)] mb-2">
                          <div className="h-1.5 rounded transition-all duration-1000" style={{ width: `${e.pct}%`, background: "linear-gradient(90deg,#00e5a0,#3b82f6)" }} />
                        </div>
                        <div className="flex justify-between text-[11px] text-[#5a6a8a]">
                          <span>Warmup: {e.pct}%</span>
                          <span>Sent: {e.sent}</span>
                          <span>Reputation: {e.rep}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Active Domains", val: "4", color: "#00e5a0" },
                      { label: "Avg Reputation", val: "92%", color: "#00e5a0" },
                      { label: "Bounce Rate", val: "0.1%", color: "#eef2ff" },
                      { label: "Open Rate", val: "47%", color: "#f59e0b" },
                    ].map((s, i) => (
                      <div key={i} className="bg-[#131a26] rounded-xl p-5 text-center" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ ...syne, color: s.color }} className="text-2xl font-extrabold mb-1">{s.val}</div>
                        <div className="text-[11px] text-[#5a6a8a]">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === "getstarted" && (
          <div className="relative z-[1] min-h-screen pt-24 pb-20 px-6 max-w-[1100px] mx-auto anim-fadeUp">
            <div className="flex items-center justify-center gap-0 mb-14">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-0">
                  <div className={`flex items-center gap-2.5 text-[13px] font-medium ${n < gsStep ? "text-[#00e5a0]" : n === gsStep ? "text-[#eef2ff]" : "text-[#5a6a8a]"}`}>
                    <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-[12px] font-bold ${n === gsStep ? "bg-[#00e5a0] text-[#07090f] border-[#00e5a0]" : n < gsStep ? "bg-[rgba(0,229,160,0.12)] text-[#00e5a0] border-[rgba(0,229,160,.3)]" : "border-[rgba(255,255,255,0.07)]"}`} style={{ ...syne, border: n === gsStep ? "1px solid #00e5a0" : n < gsStep ? "1px solid rgba(0,229,160,.3)" : "1px solid rgba(255,255,255,0.07)" }}>
                      {n < gsStep ? <Check className="w-3 h-3" /> : n}
                    </div>
                    <span className="hidden sm:inline">{["Choose Plan", "Your Info", "Checkout"][n - 1]}</span>
                  </div>
                  {n < 3 && <div className="w-16 h-px bg-[rgba(255,255,255,0.07)] mx-2" />}
                </div>
              ))}
            </div>

            {gsStep === 1 && (
              <div className="anim-fadeUp">
                <div className="text-center mb-10">
                  <h2 style={syne} className="text-3xl font-extrabold tracking-[-1px] mb-2">Choose Your Plan</h2>
                  <p className="text-[14px] text-[#8a9abb]">Select the plan that fits your sales operation.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                  {plans.map((p) => (
                    <div key={p.name} onClick={() => gsSelectPlan(p.name, p.price)} data-testid={`button-select-plan-${p.name.toLowerCase().replace(/\s/g, "-")}`} className={`bg-[#0d1119] rounded-2xl p-7 cursor-pointer relative transition-all hover:-translate-y-1 ${selectedPlan.name === p.name ? "border-[#00e5a0] bg-[rgba(0,229,160,.04)]" : "hover:border-[rgba(0,229,160,.3)]"}`} style={{ border: selectedPlan.name === p.name ? "1px solid #00e5a0" : "1px solid rgba(255,255,255,0.07)" }}>
                      <div className={`absolute top-4 right-4 w-[22px] h-[22px] rounded-full bg-[#00e5a0] flex items-center justify-center transition-opacity ${selectedPlan.name === p.name ? "opacity-100" : "opacity-0"}`}>
                        <Check className="w-3 h-3 text-[#07090f]" />
                      </div>
                      {p.popular && (
                        <span className="inline-block text-[10px] font-bold uppercase tracking-[1px] text-[#3b82f6] px-2.5 py-0.5 rounded-[10px] mb-4" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,.3)" }}>Most Popular</span>
                      )}
                      <div style={syne} className="text-[17px] font-bold mb-1.5">{p.name}</div>
                      <div style={syne} className="text-[40px] font-extrabold tracking-[-2px] leading-none mb-1">{p.price}<sub className="text-[15px] font-normal text-[#5a6a8a] tracking-normal">/mo</sub></div>
                      <div className="text-[12px] text-[#5a6a8a] mb-5">{p.tagline}</div>
                      <ul className="flex flex-col gap-2">
                        {p.features.map((f, j) => (
                          <li key={j} className="text-[12px] flex gap-2 text-[rgba(238,242,255,.7)]">
                            <Check className="w-3 h-3 text-[#00e5a0] mt-0.5 shrink-0" />{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <button onClick={() => { if (selectedPlan.name) goToStep(2); else showToast("warn", "Please select a plan"); }} data-testid="button-gs-continue-1" className="px-10 py-4 bg-[#00e5a0] rounded-xl text-[16px] font-bold text-[#07090f] cursor-pointer hover:bg-[#00ffb3] transition-all" style={syne}>
                    Continue <ArrowRight className="inline w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            )}

            {gsStep === 2 && (
              <div className="anim-fadeUp">
                <button onClick={() => goToStep(1)} data-testid="button-gs-back-1" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] text-[#8a9abb] cursor-pointer hover:text-[#eef2ff] transition-all mb-7" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", ...dm }}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div className="bg-[#0d1119] rounded-[20px] p-11 max-w-[580px] mx-auto" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex justify-between items-center rounded-[10px] px-5 py-3.5 mb-8" style={{ background: "rgba(0,229,160,0.12)", border: "1px solid rgba(0,229,160,.2)" }}>
                    <span style={syne} className="text-[14px] font-bold">{selectedPlan.name} Plan</span>
                    <span style={syne} className="text-[18px] font-extrabold text-[#00e5a0]">{selectedPlan.price}/mo</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5a6a8a] uppercase tracking-[1.2px] mb-2">First Name</label>
                      <input value={gsFirstName} onChange={e => setGsFirstName(e.target.value)} data-testid="input-gs-firstname" className="w-full bg-[#131a26] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a]" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} placeholder="John" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5a6a8a] uppercase tracking-[1.2px] mb-2">Last Name</label>
                      <input value={gsLastName} onChange={e => setGsLastName(e.target.value)} data-testid="input-gs-lastname" className="w-full bg-[#131a26] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a]" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} placeholder="Smith" />
                    </div>
                  </div>
                  <div className="mb-5">
                    <label className="block text-[11px] font-semibold text-[#5a6a8a] uppercase tracking-[1.2px] mb-2">Business Name</label>
                    <input value={gsBusiness} onChange={e => setGsBusiness(e.target.value)} data-testid="input-gs-business" className="w-full bg-[#131a26] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a]" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} placeholder="Acme Corp" />
                  </div>
                  <div className="mb-5">
                    <label className="block text-[11px] font-semibold text-[#5a6a8a] uppercase tracking-[1.2px] mb-2">Email</label>
                    <input value={gsEmail} onChange={e => setGsEmail(e.target.value)} type="email" data-testid="input-gs-email" className="w-full bg-[#131a26] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a]" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} placeholder="john@acme.com" />
                  </div>
                  <div className="mb-5">
                    <label className="block text-[11px] font-semibold text-[#5a6a8a] uppercase tracking-[1.2px] mb-2">Phone</label>
                    <input value={gsPhone} onChange={e => setGsPhone(e.target.value)} data-testid="input-gs-phone" className="w-full bg-[#131a26] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a]" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} placeholder="(555) 123-4567" />
                  </div>
                  <div className="mb-5">
                    <label className="block text-[11px] font-semibold text-[#5a6a8a] uppercase tracking-[1.2px] mb-2">Industry</label>
                    <select value={gsIndustry} onChange={e => setGsIndustry(e.target.value)} data-testid="select-gs-industry" className="w-full bg-[#131a26] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }}>
                      <option value="">Select industry...</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="saas">SaaS / Technology</option>
                      <option value="finance">Finance / Insurance</option>
                      <option value="realestate">Real Estate</option>
                      <option value="legal">Legal</option>
                      <option value="marketing">Marketing / Agency</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="mb-5">
                    <label className="block text-[11px] font-semibold text-[#5a6a8a] uppercase tracking-[1.2px] mb-2">Target Customer Description</label>
                    <textarea value={gsTarget} onChange={e => setGsTarget(e.target.value)} data-testid="input-gs-target" className="w-full bg-[#131a26] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a] resize-y min-h-[80px]" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} placeholder="Describe your ideal customer..." />
                  </div>
                  <button onClick={() => goToStep(3)} data-testid="button-gs-continue-2" className="w-full py-4 bg-[#00e5a0] rounded-xl text-[16px] font-bold text-[#07090f] cursor-pointer hover:bg-[#00ffb3] transition-all mt-1" style={syne}>
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {gsStep === 3 && (
              <div className="anim-fadeUp">
                <button onClick={() => goToStep(2)} data-testid="button-gs-back-2" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] text-[#8a9abb] cursor-pointer hover:text-[#eef2ff] transition-all mb-7" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", ...dm }}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div className="bg-[#0d1119] rounded-[20px] p-12 max-w-[560px] mx-auto text-center" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(0,229,160,0.12)", border: "1px solid rgba(0,229,160,.25)" }}>
                    <CreditCard className="w-6 h-6 text-[#00e5a0]" />
                  </div>
                  <h2 style={syne} className="text-[26px] font-extrabold tracking-[-1px] mb-2.5">Complete Your Setup</h2>
                  <p className="text-[14px] text-[#8a9abb] mb-9 leading-relaxed">You'll be redirected to Stripe's secure checkout to activate your {selectedPlan.name} plan.</p>

                  {(gsFirstName || gsBusiness || gsEmail) && (
                    <div className="text-left rounded-[10px] p-4 mb-5" style={{ background: "rgba(0,229,160,.04)", border: "1px solid rgba(0,229,160,.15)" }}>
                      {gsFirstName && <div className="flex justify-between text-[13px] mb-1"><span className="text-[#5a6a8a]">Name</span><span className="font-medium">{gsFirstName} {gsLastName}</span></div>}
                      {gsBusiness && <div className="flex justify-between text-[13px] mb-1"><span className="text-[#5a6a8a]">Business</span><span className="font-medium">{gsBusiness}</span></div>}
                      {gsEmail && <div className="flex justify-between text-[13px]"><span className="text-[#5a6a8a]">Email</span><span className="font-medium">{gsEmail}</span></div>}
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-xl px-5 py-3.5 mb-7" style={{ background: "rgba(0,229,160,0.12)", border: "1px solid rgba(0,229,160,.2)" }}>
                    <span className="text-[13px] text-[#8a9abb]">Monthly Subscription</span>
                    <span style={syne} className="text-[22px] font-extrabold text-[#00e5a0]">{selectedPlan.price}/mo</span>
                  </div>

                  <button
                    onClick={async () => {
                      if (checkoutLoading) return;
                      setCheckoutLoading(true);
                      try {
                        const planKey = selectedPlan.name === "Starter" ? "starter" : selectedPlan.name === "Growth" ? "growth" : "agency";
                        const resp = await fetch("/api/stripe/create-checkout-session", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ plan: planKey, email: gsEmail, name: `${gsFirstName} ${gsLastName}`.trim() }),
                        });
                        const data = await resp.json();
                        if (data.url) {
                          window.location.href = data.url;
                        } else {
                          showToast("error", data.message || "Could not start checkout");
                          setCheckoutLoading(false);
                        }
                      } catch {
                        showToast("error", "Connection error. Please try again.");
                        setCheckoutLoading(false);
                      }
                    }}
                    disabled={checkoutLoading}
                    data-testid="button-stripe-checkout"
                    className={`w-full py-4 rounded-xl text-[16px] font-bold cursor-pointer transition-all mb-5 flex items-center justify-center gap-2 ${checkoutLoading ? "opacity-60" : "hover:bg-[#00ffb3] hover:-translate-y-0.5"}`}
                    style={{ background: "#00e5a0", color: "#07090f", ...syne }}
                  >
                    {checkoutLoading ? (
                      <><RotateCw className="w-4 h-4 animate-spin" /> Redirecting to Stripe...</>
                    ) : (
                      <>Pay with Stripe <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-4 mb-7 text-[12px] text-[#5a6a8a]">
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure checkout</span>
                    <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Cards accepted</span>
                    <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Cancel anytime</span>
                  </div>

                  <div className="text-left">
                    <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-[#5a6a8a] mb-3.5">What Happens Next</div>
                    {[
                      "Instant account activation after payment",
                      "Onboarding guide sent to your email",
                      "Your AI agents ready within minutes",
                    ].map((step, i) => (
                      <div key={i} className="flex gap-3 mb-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-[#00e5a0] shrink-0" style={{ background: "#131a26", border: "1px solid rgba(255,255,255,0.07)", ...syne }}>{i + 1}</div>
                        <span className="text-[13px] text-[rgba(238,242,255,.7)] leading-relaxed pt-0.5">{step}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-5 text-[12px] text-[#5a6a8a]" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    Questions? Email <a href="mailto:support@argiflow.ai" className="text-[#00e5a0] no-underline">support@argiflow.ai</a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === "dashboard" && (
          <div className="relative z-[1] min-h-screen">
            <div className="flex min-h-screen pt-16">
              <div className="w-60 bg-[#0d1119] fixed left-0 top-16 bottom-0 overflow-y-auto shrink-0 py-6" style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-4 mb-2">
                  <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#5a6a8a] px-2 py-2">Main</div>
                  {([
                    { key: "overview", icon: BarChart3, label: "Overview", badge: null },
                    { key: "outreach", icon: Send, label: "Outreach", badge: "12" },
                    { key: "voice", icon: Phone, label: "Voice AI", badge: null },
                    { key: "intelligence", icon: Brain, label: "Intelligence", badge: null },
                    { key: "email", icon: Mail, label: "Email Infra", badge: null },
                    { key: "crm", icon: Users, label: "CRM", badge: "3", badgeColor: "orange" },
                    { key: "reports", icon: FileText, label: "Reports", badge: null },
                    { key: "billing", icon: CreditCard, label: "Billing", badge: null },
                  ] as const).map(item => (
                    <div key={item.key} onClick={() => setDashPanel(item.key)} data-testid={`button-dash-${item.key}`} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-[13px] mb-0.5 ${dashPanel === item.key ? "bg-[rgba(0,229,160,0.12)] text-[#00e5a0]" : "text-[#8a9abb] hover:bg-[#131a26] hover:text-[#eef2ff]"}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor === "orange" ? "bg-[#f59e0b] text-[#07090f]" : "bg-[#00e5a0] text-[#07090f]"}`}>{item.badge}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 ml-60 p-8 min-h-screen">
                {dashPanel === "overview" && (
                  <div className="anim-fadeUp">
                    <div style={syne} className="text-[26px] font-extrabold tracking-[-1px] mb-1">Welcome back, Client</div>
                    <div className="text-[14px] text-[#8a9abb] mb-8">Here's your pipeline overview for this week.</div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
                      {[
                        { label: "Active Leads", num: "487", change: "+23 this week", up: true, icon: Target },
                        { label: "Emails Sent", num: "1,247", change: "+312 this week", up: true, icon: Mail },
                        { label: "Meetings Booked", num: "11", change: "+3 this week", up: true, icon: Calendar },
                        { label: "Pipeline Value", num: "$44k", change: "+41% MoM", up: true, icon: TrendingUp },
                      ].map((k, i) => (
                        <div key={i} className="bg-[#0d1119] rounded-[14px] p-5" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="flex items-center justify-between text-[12px] text-[#5a6a8a] mb-2">
                            <span>{k.label}</span>
                            <k.icon className="w-4 h-4" />
                          </div>
                          <div style={syne} className="text-[32px] font-extrabold tracking-[-1.5px] mb-1">{k.num}</div>
                          <div className="text-[12px] text-[#00e5a0]">{k.change}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                      <div className="bg-[#0d1119] rounded-[14px] p-6" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="flex items-center justify-between mb-5" style={syne}>
                          <span className="text-[14px] font-bold">Weekly Performance</span>
                          <span className="text-[12px] text-[#00e5a0] cursor-pointer font-normal" style={dm}>View Details</span>
                        </div>
                        <div className="flex items-end gap-1 h-[60px]">
                          {[35, 55, 40, 70, 60, 85, 50].map((h, i) => (
                            <div key={i} className="flex-1 rounded-t cursor-pointer transition-colors hover:bg-[#00e5a0]" style={{ height: `${h}%`, background: "rgba(0,229,160,.25)" }} />
                          ))}
                        </div>
                        <div className="flex gap-1 mt-1.5">
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                            <span key={d} className="flex-1 text-center text-[10px] text-[#5a6a8a]">{d}</span>
                          ))}
                        </div>
                      </div>
                      <div className="bg-[#0d1119] rounded-[14px] p-6" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={syne} className="text-[14px] font-bold mb-5">Pipeline Funnel</div>
                        <div className="flex flex-col gap-2">
                          {[
                            { label: "Discovered", count: 487, pct: 100 },
                            { label: "Contacted", count: 312, pct: 64 },
                            { label: "Replied", count: 67, pct: 14 },
                            { label: "Meeting", count: 11, pct: 2 },
                          ].map((f, i) => (
                            <div key={i}>
                              <div className="flex justify-between text-[11px] text-[#5a6a8a] mb-1">
                                <span>{f.label}</span>
                                <span>{f.count}</span>
                              </div>
                              <div className="h-5 rounded bg-[rgba(255,255,255,.04)]">
                                <div className="h-5 rounded flex items-center pl-2 text-[11px] font-semibold" style={{ width: `${f.pct}%`, background: "linear-gradient(90deg,#3b82f6,#00e5a0)" }}>{f.pct}%</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#0d1119] rounded-[14px] p-6" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between mb-5" style={syne}>
                        <span className="text-[14px] font-bold">Recent Activity</span>
                        <span className="text-[12px] text-[#00e5a0] cursor-pointer font-normal" style={dm}>View All</span>
                      </div>
                      <div className="flex flex-col">
                        {[
                          { icon: Mail, text: "Email opened by Dr. Sarah Martinez", time: "2 min ago", color: "rgba(0,229,160,0.12)" },
                          { icon: MessageSquare, text: "Reply from James Wilson — interested", time: "8 min ago", color: "rgba(59,130,246,0.12)" },
                          { icon: Calendar, text: "Meeting booked — Kevin Patel, Thu 2pm", time: "23 min ago", color: "rgba(0,229,160,0.12)" },
                          { icon: Send, text: "Follow-up sent to Amanda Torres", time: "41 min ago", color: "rgba(0,229,160,0.12)" },
                        ].map((a, i, arr) => (
                          <div key={i} className="flex items-start gap-3.5 py-3.5" style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: a.color }}>
                              <a.icon className="w-4 h-4 text-[#00e5a0]" />
                            </div>
                            <div>
                              <div className="text-[13px] font-medium mb-0.5">{a.text}</div>
                              <div className="text-[11px] text-[#5a6a8a]">{a.time}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {dashPanel === "outreach" && (
                  <div className="anim-fadeUp">
                    <div style={syne} className="text-[26px] font-extrabold tracking-[-1px] mb-1">Outreach Campaigns</div>
                    <div className="text-[14px] text-[#8a9abb] mb-8">312 emails sent this week &middot; 17% reply rate</div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
                      {[
                        { label: "Emails Sent", val: "312" },
                        { label: "Open Rate", val: "47%", color: "#00e5a0" },
                        { label: "Reply Rate", val: "17%", color: "#f59e0b" },
                        { label: "Meetings", val: "11", color: "#3b82f6" },
                      ].map((k, i) => (
                        <div key={i} className="bg-[#0d1119] rounded-[14px] p-5" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="text-[12px] text-[#5a6a8a] mb-2">{k.label}</div>
                          <div style={{ ...syne, color: k.color || "#eef2ff" }} className="text-[32px] font-extrabold tracking-[-1.5px]">{k.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dashPanel === "voice" && (
                  <div className="anim-fadeUp">
                    <div style={syne} className="text-[26px] font-extrabold tracking-[-1px] mb-1">Voice AI Agent</div>
                    <div className="text-[14px] text-[#8a9abb] mb-8">AI-powered calling &middot; 47 calls attempted</div>
                    <div className="grid grid-cols-3 gap-4 mb-7">
                      {[
                        { label: "Calls Attempted", val: "47", color: "#00e5a0" },
                        { label: "Calls Completed", val: "0", color: "#ef4444" },
                        { label: "Meetings Booked", val: "0" },
                      ].map((k, i) => (
                        <div key={i} className="bg-[#0d1119] rounded-[14px] p-5" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="text-[12px] text-[#5a6a8a] mb-2">{k.label}</div>
                          <div style={{ ...syne, color: k.color || "#eef2ff" }} className="text-[32px] font-extrabold tracking-[-1.5px]">{k.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dashPanel === "intelligence" && (
                  <div className="anim-fadeUp">
                    <div style={syne} className="text-[26px] font-extrabold tracking-[-1px] mb-1">Sales Intelligence</div>
                    <div className="text-[14px] text-[#8a9abb] mb-8">ZoomInfo-style B2B data — people, companies, intent signals</div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
                      {[
                        { label: "People Searched", val: "1,204" },
                        { label: "Emails Found", val: "987", color: "#00e5a0" },
                        { label: "Intent Signals", val: "43", color: "#f59e0b" },
                        { label: "Companies Tracked", val: "218", color: "#3b82f6" },
                      ].map((k, i) => (
                        <div key={i} className="bg-[#0d1119] rounded-[14px] p-5" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="text-[12px] text-[#5a6a8a] mb-2">{k.label}</div>
                          <div style={{ ...syne, color: k.color || "#eef2ff" }} className="text-[32px] font-extrabold tracking-[-1.5px]">{k.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dashPanel === "email" && (
                  <div className="anim-fadeUp">
                    <div style={syne} className="text-[26px] font-extrabold tracking-[-1px] mb-1">Email Infrastructure</div>
                    <div className="text-[14px] text-[#8a9abb] mb-8">Warmup, deliverability, and campaign management</div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
                      {[
                        { label: "Active Domains", val: "4", color: "#00e5a0" },
                        { label: "Avg Reputation", val: "92%", color: "#00e5a0" },
                        { label: "Bounce Rate", val: "0.1%" },
                        { label: "Open Rate", val: "47%", color: "#f59e0b" },
                      ].map((k, i) => (
                        <div key={i} className="bg-[#0d1119] rounded-[14px] p-5" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="text-[12px] text-[#5a6a8a] mb-2">{k.label}</div>
                          <div style={{ ...syne, color: k.color || "#eef2ff" }} className="text-[32px] font-extrabold tracking-[-1.5px]">{k.val}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#0d1119] rounded-[14px] p-6" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div style={syne} className="text-[14px] font-bold mb-5">Email Accounts</div>
                      {[
                        { email: "outreach@argilette.co", score: 92, color: "#00e5a0", status: "Active" },
                        { email: "sales@argilette.co", score: 78, color: "#f59e0b", status: "Warming" },
                        { email: "hello@argilette.co", score: 85, color: "#00e5a0", status: "Active" },
                        { email: "team@argilette.co", score: 41, color: "#ef4444", status: "Low" },
                      ].map((e, i) => (
                        <div key={i} className="flex items-center gap-4 py-3 flex-wrap" style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                          <span className="text-[13px] w-48">{e.email}</span>
                          <div className="flex-1 h-1.5 rounded bg-[rgba(255,255,255,.06)] min-w-[100px]">
                            <div className="h-1.5 rounded" style={{ width: `${e.score}%`, background: e.color }} />
                          </div>
                          <span className="text-[13px] font-semibold w-8" style={{ color: e.color }}>{e.score}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: e.color === "#00e5a0" ? "rgba(0,229,160,0.12)" : e.color === "#f59e0b" ? "rgba(245,158,11,.12)" : "rgba(239,68,68,.1)", color: e.color }}>{e.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dashPanel === "crm" && (
                  <div className="anim-fadeUp">
                    <div style={syne} className="text-[26px] font-extrabold tracking-[-1px] mb-1">CRM & Pipeline</div>
                    <div className="text-[14px] text-[#8a9abb] mb-8">11 active deals &middot; $44,000 pipeline value</div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
                      {[
                        { label: "Open Deals", val: "11" },
                        { label: "Pipeline Value", val: "$44k", color: "#f59e0b" },
                        { label: "Won This Month", val: "2", color: "#00e5a0" },
                        { label: "Avg Deal Size", val: "$4k" },
                      ].map((k, i) => (
                        <div key={i} className="bg-[#0d1119] rounded-[14px] p-5" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="text-[12px] text-[#5a6a8a] mb-2">{k.label}</div>
                          <div style={{ ...syne, color: k.color || "#eef2ff" }} className="text-[32px] font-extrabold tracking-[-1.5px]">{k.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dashPanel === "reports" && (
                  <div className="anim-fadeUp">
                    <div style={syne} className="text-[26px] font-extrabold tracking-[-1px] mb-1">Weekly Reports</div>
                    <div className="text-[14px] text-[#8a9abb] mb-8">Auto-generated every Monday &middot; Next report in 5 days</div>
                    <div className="bg-[#0d1119] rounded-[14px] p-6 mb-5" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div style={syne} className="text-[14px] font-bold mb-1">Week of Feb 10 – Feb 16, 2026</div>
                      <div className="text-[12px] text-[#5a6a8a] mb-4">Delivered Monday Feb 17 at 8:00 AM</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[
                          { label: "Leads Found", val: "127", color: "#00e5a0", change: "+18%" },
                          { label: "Emails Sent", val: "312", color: "#3b82f6", change: "+8%" },
                          { label: "Open Rate", val: "47%", change: "+3pts" },
                          { label: "Reply Rate", val: "17%", color: "#f59e0b", change: "+2pts" },
                          { label: "Meetings", val: "11", change: "+3" },
                          { label: "Pipeline", val: "$44k", color: "#00e5a0", change: "+41%" },
                        ].map((m, i) => (
                          <div key={i} className="text-center">
                            <div style={{ ...syne, color: m.color || "#eef2ff" }} className="text-xl font-extrabold">{m.val}</div>
                            <div className="text-[11px] text-[#5a6a8a]">{m.label}</div>
                            <div className="text-[11px] text-[#00e5a0]">{m.change}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {dashPanel === "billing" && (
                  <div className="anim-fadeUp">
                    <div style={syne} className="text-[26px] font-extrabold tracking-[-1px] mb-1">Billing & Plan</div>
                    <div className="text-[14px] text-[#8a9abb] mb-8">Current plan: Starter &middot; Next payment due Mar 1, 2026</div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <div className="bg-[#0d1119] rounded-[14px] p-6" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={syne} className="text-[14px] font-bold mb-5">Current Plan</div>
                        <div style={syne} className="text-4xl font-extrabold tracking-[-1px] mb-1">$297<span className="text-[16px] font-normal text-[#5a6a8a]">/mo</span></div>
                        <div className="text-[14px] text-[#8a9abb] mb-5">Starter Plan</div>
                        <div className="rounded-[10px] p-3.5 mb-5" style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)" }}>
                          <div className="text-[13px] font-semibold text-[#f59e0b] mb-1">487/500 leads used (97%)</div>
                          <div className="text-[12px] text-[#8a9abb]">Upgrade to Growth for 1,500 leads + Voice AI</div>
                        </div>
                        <button onClick={() => startPlan("Growth", "$597")} data-testid="button-upgrade-plan" className="w-full py-3.5 bg-[#3b82f6] rounded-[10px] text-[14px] font-bold text-white cursor-pointer border-none" style={syne}>
                          Upgrade to Growth — $597/mo
                        </button>
                      </div>
                      <div className="bg-[#0d1119] rounded-[14px] p-6" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={syne} className="text-[14px] font-bold mb-5">Payment History</div>
                        {[
                          { date: "Feb 1, 2026", plan: "Starter Plan", amount: "$297" },
                          { date: "Jan 1, 2026", plan: "Starter Plan", amount: "$297" },
                          { date: "Dec 1, 2025", plan: "Starter Plan", amount: "$297" },
                        ].map((p, i, arr) => (
                          <div key={i} className="flex justify-between py-3.5 text-[13px]" style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                            <span>{p.date}</span>
                            <span className="text-[#5a6a8a]">{p.plan}</span>
                            <span className="text-[#00e5a0] font-semibold">{p.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
