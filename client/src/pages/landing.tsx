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
      t("landing.demo.scanningNPI"),
      t("landing.demo.matchingIndustry", { industry, location }),
      t("landing.demo.verifyingEmails"),
      t("landing.demo.enrichingPhones"),
      t("landing.demo.scoringLeads"),
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
        showToast("check", t("landing.demo.leadsFoundToast", { count }));
      }
    }, 700);
  }, [demoIndustry, demoLocation, showToast, t]);

  const simulateOutreach = useCallback(() => {
    showToast("mail", t("landing.demo.outreachCycle"));
    const tmr = setTimeout(() => {
      setActivityItems(prev => [
        { icon: "send", titleKey: "landing.demo.emailSentActivity", timeKey: "landing.demo.justNow" },
        ...prev,
      ]);
    }, 1500);
    callTimers.current.push(tmr);
  }, [showToast, t]);

  const simulateCall = useCallback(() => {
    if (callState !== "idle") {
      setCallState("idle");
      setCallStatus(t("landing.demo.clickToSimulate"));
      setShowTranscript(false);
      setCallTranscript([]);
      callTimers.current.forEach(tmr => clearTimeout(tmr));
      callTimers.current = [];
      return;
    }
    setCallState("calling");
    setCallStatus(t("landing.demo.dialing"));
    setShowTranscript(true);
    setCallTranscript([]);

    const t1 = setTimeout(() => setCallStatus(t("landing.demo.connectedSpeaking")), 1500);
    callTimers.current.push(t1);

    const delays = [2000, 5000, 9000, 13000, 17000, 22000, 27000];
    transcriptLines.forEach((line, idx) => {
      const tmr = setTimeout(() => {
        setCallTranscript(prev => [...prev, line]);
        if (idx === transcriptLines.length - 1) {
          const t2 = setTimeout(() => {
            setCallStatus(t("landing.demo.meetingBooked"));
            setCallState("idle");
            showToast("calendar", t("landing.demo.meetingBooked"));
          }, 2000);
          callTimers.current.push(t2);
        }
      }, delays[idx] || idx * 4000);
      callTimers.current.push(tmr);
    });
  }, [callState, showToast, t]);

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
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);} }
        @keyframes fadeIn { from{opacity:0;}to{opacity:1;} }
        @keyframes voicePulse { 0%{box-shadow:0 0 0 0 rgba(0,229,160,.6);}70%{box-shadow:0 0 0 30px rgba(0,229,160,0);}100%{box-shadow:0 0 0 0 rgba(0,229,160,0);} }
        @keyframes toastIn { from{transform:translateX(100%);opacity:0;}to{transform:translateX(0);opacity:1;} }
        @keyframes shimmer { 0%{background-position:200% 0;}100%{background-position:-200% 0;} }
        @keyframes float { 0%,100%{transform:translateY(0);}50%{transform:translateY(-12px);} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 20px rgba(0,229,160,.15),0 0 60px rgba(0,229,160,.05);}50%{box-shadow:0 0 30px rgba(0,229,160,.25),0 0 80px rgba(0,229,160,.1);} }
        @keyframes orbFloat1 { 0%{transform:translate(0,0) scale(1);}33%{transform:translate(30px,-20px) scale(1.05);}66%{transform:translate(-15px,10px) scale(.95);}100%{transform:translate(0,0) scale(1);} }
        @keyframes orbFloat2 { 0%{transform:translate(0,0) scale(1);}33%{transform:translate(-20px,15px) scale(.95);}66%{transform:translate(25px,-10px) scale(1.05);}100%{transform:translate(0,0) scale(1);} }
        @keyframes revealUp { from{opacity:0;transform:translateY(40px);}to{opacity:1;transform:translateY(0);} }
        @keyframes scaleIn { from{opacity:0;transform:scale(.95);}to{opacity:1;transform:scale(1);} }
        @keyframes gradientShift { 0%{background-position:0% 50%;}50%{background-position:100% 50%;}100%{background-position:0% 50%;} }
        .anim-fadeUp { animation: fadeUp .4s cubic-bezier(.22,1,.36,1); }
        .anim-reveal { animation: revealUp .7s cubic-bezier(.22,1,.36,1) both; }
        .anim-reveal-d1 { animation: revealUp .7s cubic-bezier(.22,1,.36,1) .1s both; }
        .anim-reveal-d2 { animation: revealUp .7s cubic-bezier(.22,1,.36,1) .2s both; }
        .anim-reveal-d3 { animation: revealUp .7s cubic-bezier(.22,1,.36,1) .3s both; }
        .anim-reveal-d4 { animation: revealUp .7s cubic-bezier(.22,1,.36,1) .4s both; }
        .anim-scaleIn { animation: scaleIn .5s cubic-bezier(.22,1,.36,1) .2s both; }
        .voice-pulse { animation: voicePulse 1.5s infinite; }
        .shimmer-text { background: linear-gradient(90deg,#00e5a0 0%,#3b82f6 25%,#00e5a0 50%,#3b82f6 75%,#00e5a0 100%); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: shimmer 4s linear infinite; }
        .gradient-border { position:relative; }
        .gradient-border::before { content:'';position:absolute;inset:-1px;border-radius:inherit;padding:1px;background:linear-gradient(135deg,rgba(0,229,160,.3),rgba(59,130,246,.3),rgba(0,229,160,.1));-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none; }
        .card-premium { background: rgba(13,17,25,.8); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,.06); transition: all .3s cubic-bezier(.22,1,.36,1); }
        .card-premium:hover { border-color: rgba(0,229,160,.2); transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,.3), 0 0 30px rgba(0,229,160,.05); }
        .section-heading { letter-spacing: -0.03em; line-height: 1.1; }
        .nav-link { position:relative;transition:color .2s; }
        .nav-link::after { content:'';position:absolute;bottom:-4px;left:50%;width:0;height:2px;background:#00e5a0;transition:all .2s;transform:translateX(-50%);border-radius:1px; }
        .nav-link:hover::after { width:100%; }
        .btn-primary { background: linear-gradient(135deg,#00e5a0,#00c98a); box-shadow: 0 4px 15px rgba(0,229,160,.25), inset 0 1px 0 rgba(255,255,255,.15); transition: all .3s cubic-bezier(.22,1,.36,1); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,229,160,.35), inset 0 1px 0 rgba(255,255,255,.15); }
        .btn-secondary { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); backdrop-filter: blur(8px); transition: all .3s; }
        .btn-secondary:hover { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.2); transform: translateY(-1px); }
        .glow-ring { box-shadow: 0 0 0 1px rgba(59,130,246,.4), 0 0 30px rgba(59,130,246,.1), 0 20px 40px rgba(0,0,0,.3); }
      `}</style>

      <div style={dm} className="min-h-screen bg-[#060810] text-[#eef2ff] relative overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none z-0" style={{
          backgroundImage: "linear-gradient(rgba(0,229,160,.015) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,160,.015) 1px,transparent 1px)",
          backgroundSize: "64px 64px",
        }} />
        <div className="fixed pointer-events-none z-0" style={{ width: 900, height: 900, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,100,255,.07) 0%,rgba(0,100,255,.02) 40%,transparent 65%)", top: -350, right: -250, animation: "orbFloat1 20s ease-in-out infinite" }} />
        <div className="fixed pointer-events-none z-0" style={{ width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,229,160,.05) 0%,rgba(0,229,160,.015) 40%,transparent 65%)", bottom: -200, left: -150, animation: "orbFloat2 25s ease-in-out infinite" }} />
        <div className="fixed pointer-events-none z-0" style={{ width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.04) 0%,transparent 65%)", top: "40%", left: "60%", animation: "orbFloat1 30s ease-in-out infinite reverse" }} />

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

        <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 lg:px-10 h-[72px]" style={{ background: "rgba(6,8,16,.75)", backdropFilter: "blur(24px) saturate(1.4)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="cursor-pointer flex items-center gap-2.5" onClick={() => showView("landing")} data-testid="link-home">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00e5a0,#00b377)" }}>
              <Zap className="w-4 h-4 text-[#060810]" />
            </div>
            <span style={syne} className="text-[20px] font-extrabold tracking-tight">Argi<span className="text-[#00e5a0]">Flow</span></span>
          </div>
          <div className="hidden md:flex items-center gap-9">
            <span className="nav-link text-[13px] text-[#8a9abb] cursor-pointer hover:text-[#eef2ff]" onClick={() => scrollToSection("features-section")} data-testid="link-nav-features">{t("landing.nav.features")}</span>
            <span className="nav-link text-[13px] text-[#8a9abb] cursor-pointer hover:text-[#eef2ff]" onClick={() => showView("demo")} data-testid="link-nav-demo">{t("landing.nav.demo")}</span>
            <span className="nav-link text-[13px] text-[#8a9abb] cursor-pointer hover:text-[#eef2ff]" onClick={() => scrollToSection("pricing-section")} data-testid="link-nav-pricing">{t("landing.nav.pricing")}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <LanguageSwitcher variant="compact" />
            <a href="/login" data-testid="link-login" className="px-4 py-2 rounded-lg text-[13px] text-[#8a9abb] hover:text-[#eef2ff] cursor-pointer transition-all" style={dm}>
              {t("landing.nav.logIn")}
            </a>
            <button onClick={() => showView("demo")} data-testid="button-live-demo" className="btn-secondary px-4 py-2 rounded-lg text-[13px] text-[#eef2ff] cursor-pointer" style={dm}>
              <span className="inline-block w-[6px] h-[6px] bg-[#00e5a0] rounded-full mr-1.5" style={{ animation: "pulse-dot 2s infinite" }} />
              {t("landing.nav.liveDemo")}
            </button>
            <button onClick={() => showView("getstarted")} data-testid="button-get-started" className="btn-primary px-5 py-2 rounded-lg text-[13px] font-bold text-[#060810] cursor-pointer" style={syne}>
              {t("landing.nav.getStarted")}
            </button>
          </div>
        </nav>

        {currentView === "landing" && (
          <div className="relative z-[1] min-h-screen">
            <div className="absolute top-0 left-0 right-0 h-[800px] pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,229,160,.08) 0%, transparent 60%)" }} />

            <div className="pt-[140px] pb-24 px-6 md:px-12 lg:px-16 max-w-[1240px] mx-auto relative">
              <div className="anim-reveal flex flex-col items-start">
                <div className="inline-flex items-center gap-2.5 text-[11px] font-medium text-[#8a9abb] uppercase tracking-[2px] px-4 py-2 rounded-full mb-5" style={{ background: "rgba(0,229,160,.06)", border: "1px solid rgba(0,229,160,.12)" }}>
                  <span className="w-1.5 h-1.5 bg-[#00e5a0] rounded-full" style={{ animation: "pulse-dot 2s infinite" }} />
                  {t("landing.hero.engineBadge")}
                </div>
                <div className="anim-reveal-d1 inline-flex items-center gap-2 text-[12px] font-semibold text-[#f59e0b] px-4 py-1.5 rounded-full mb-10" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }} data-testid="badge-replaces">
                  <Shield className="w-3.5 h-3.5" />
                  {t("landing.hero.replacesBadge")}
                </div>
              </div>
              <h1 style={syne} className="anim-reveal-d1 section-heading text-[clamp(40px,6.5vw,80px)] font-extrabold leading-[1.0] tracking-[-3px] mb-8 max-w-[900px]">
                {t("landing.hero.titleStop")} <span className="text-[#ef4444]/80 line-through decoration-[3px] decoration-[#ef4444]/40">{t("landing.hero.title5Tools")}</span>{" "}
                <span className="shimmer-text">{t("landing.hero.titleGetEverything")}</span> {t("landing.hero.titleIn")} <span className="text-[#3b82f6]">{t("landing.hero.titleOne")}</span>
              </h1>
              <p className="anim-reveal-d2 text-[18px] text-[#8a9abb] font-light max-w-[580px] leading-[1.7] mb-5">
                {t("landing.hero.descFull")}
              </p>
              <p className="anim-reveal-d2 text-[15px] text-[#00e5a0]/90 font-medium mb-12 max-w-[540px]">
                {t("landing.hero.oneLogin")} <strong>{t("landing.hero.freeTrialBold")}</strong> {t("landing.hero.oneLoginEnd")}
              </p>
              <div className="anim-reveal-d3 flex items-center gap-4 flex-wrap">
                <button onClick={() => showView("getstarted")} data-testid="button-start-trial" className="btn-primary px-9 py-4 rounded-xl text-[16px] font-bold text-[#060810] cursor-pointer" style={syne}>
                  {t("landing.hero.ctaTrial")}
                </button>
                <button onClick={() => showView("demo")} data-testid="button-watch-demo" className="btn-secondary px-9 py-4 rounded-xl text-[15px] font-medium text-[#eef2ff] cursor-pointer flex items-center gap-2" style={dm}>
                  <Play className="w-4 h-4" />
                  {t("landing.hero.ctaDemo")}
                </button>
              </div>
              <div className="anim-reveal-d4 flex items-center gap-5 mt-10">
                <div className="flex -space-x-2.5">
                  {["#3b82f6", "#00e5a0", "#f59e0b", "#ef4444", "#8a9abb"].map((c, i) => (
                    <div key={i} className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold ring-2 ring-[#060810]" style={{ background: c }}>
                      {["JM", "SK", "AT", "RC", "LP"][i]}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 mb-0.5">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 text-[#f59e0b] fill-[#f59e0b]" />)}
                  </div>
                  <span className="text-[13px] text-[#8a9abb]">
                    {t("landing.hero.trustedBy")} <strong className="text-[#eef2ff]">500+</strong> {t("landing.hero.savingTeams")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] mt-24 rounded-2xl overflow-hidden anim-reveal-d4" style={{ background: "rgba(255,255,255,0.04)" }}>
                {[
                  { num: "40+", label: t("landing.stats.toolsBuiltIn"), icon: Layers },
                  { num: "$0", label: t("landing.stats.extraCosts"), icon: CreditCard },
                  { num: "24/7", label: t("landing.stats.aiAvailability"), icon: Bot },
                  { num: "10x", label: t("landing.stats.pipelineGrowth"), icon: TrendingUp },
                ].map((s, i) => (
                  <div key={i} className="bg-[#0a0e18] py-9 px-7 text-center group hover:bg-[#0d1220] transition-colors">
                    <s.icon className="w-5 h-5 text-[#00e5a0]/50 mx-auto mb-3 group-hover:text-[#00e5a0] transition-colors" />
                    <div style={syne} className="text-[36px] font-extrabold tracking-[-2px] mb-1">{s.num}</div>
                    <div className="text-[12px] text-[#5a6a8a] uppercase tracking-[1px] font-medium">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-32 scroll-mt-20" data-testid="section-comparison">
                <div className="inline-flex items-center gap-2 text-[11px] font-medium text-[#5a6a8a] uppercase tracking-[2px] px-3.5 py-1.5 rounded-full mb-4" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>{t("landing.comparison.badge")}</div>
                <h2 style={syne} className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-1.5px] mb-4">{t("landing.comparison.title")}</h2>
                <p className="text-[16px] text-[#8a9abb] max-w-[580px] leading-relaxed mb-12">{t("landing.comparison.desc")}</p>

                <div className="rounded-2xl overflow-hidden overflow-x-auto" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="grid grid-cols-[1fr_90px_90px_90px_90px] md:grid-cols-[1fr_110px_110px_110px_110px] text-center min-w-[560px]" style={{ background: "#131a26", borderBottom: "2px solid transparent", backgroundImage: "linear-gradient(#131a26, #131a26), linear-gradient(135deg, rgba(0,229,160,0.3), rgba(59,130,246,0.2))", backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box" }}>
                    <div className="p-4 text-left text-[13px] font-semibold text-[#5a6a8a]">{t("landing.comparison.capability")}</div>
                    <div className="p-4 text-[13px] font-bold text-[#00e5a0]" style={{ ...syne, filter: "drop-shadow(0 0 20px rgba(0,229,160,0.3))", boxShadow: "0 0 30px rgba(0,229,160,0.2), inset 0 0 20px rgba(0,229,160,0.1)" }}>ArgiFlow</div>
                    <div className="p-4 text-[13px] font-medium text-[#5a6a8a]">Apollo</div>
                    <div className="p-4 text-[13px] font-medium text-[#5a6a8a]">ZoomInfo</div>
                    <div className="p-4 text-[13px] font-medium text-[#5a6a8a]">GHL</div>
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
                    { feat: t("landing.comparison.feat12"), a: true, b: false, c: false, d: true },
                    { feat: t("landing.comparison.feat13"), a: true, b: false, c: false, d: false },
                    { feat: t("landing.comparison.feat14"), a: true, b: false, c: false, d: true },
                    { feat: t("landing.comparison.feat15"), a: true, b: false, c: false, d: true },
                    { feat: t("landing.comparison.feat16"), a: true, b: false, c: false, d: "basic" },
                    { feat: t("landing.comparison.feat17"), a: true, b: false, c: false, d: true },
                    { feat: t("landing.comparison.feat18"), a: true, b: "basic", c: false, d: true },
                    { feat: t("landing.comparison.feat19"), a: true, b: false, c: false, d: true },
                    { feat: t("landing.comparison.feat20"), a: true, b: false, c: false, d: "basic" },
                    { feat: t("landing.comparison.feat21"), a: true, b: false, c: false, d: true },
                    { feat: t("landing.comparison.feat22"), a: true, b: false, c: false, d: "add-on" },
                    { feat: t("landing.comparison.feat23"), a: true, b: false, c: false, d: false },
                    { feat: t("landing.comparison.feat24"), a: true, b: false, c: false, d: false },
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-[1fr_90px_90px_90px_90px] md:grid-cols-[1fr_110px_110px_110px_110px] text-center items-center min-w-[560px] transition-colors hover:bg-[#0f1420]" style={{ background: i % 2 === 0 ? "#0a0e18" : "#0c1020", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="p-3 md:p-4 text-left text-[12px] md:text-[13px] text-[#c8d0e0]">{row.feat}</div>
                      <div className="p-3 md:p-4">{row.a === true ? <Check className="w-4 h-4 text-[#00e5a0] mx-auto" /> : <span className="text-[11px] text-[#5a6a8a]">{String(row.a)}</span>}</div>
                      <div className="p-3 md:p-4">{row.b === true ? <Check className="w-4 h-4 text-[#3b82f6] mx-auto" /> : row.b === false ? <X className="w-4 h-4 text-[#ef4444]/40 mx-auto" /> : <span className="text-[11px] text-[#5a6a8a]">{String(row.b)}</span>}</div>
                      <div className="p-3 md:p-4">{row.c === true ? <Check className="w-4 h-4 text-[#3b82f6] mx-auto" /> : row.c === false ? <X className="w-4 h-4 text-[#ef4444]/40 mx-auto" /> : <span className="text-[11px] text-[#5a6a8a]">{String(row.c)}</span>}</div>
                      <div className="p-3 md:p-4">{row.d === true ? <Check className="w-4 h-4 text-[#3b82f6] mx-auto" /> : row.d === false ? <X className="w-4 h-4 text-[#ef4444]/40 mx-auto" /> : <span className="text-[11px] text-[#f59e0b]">{String(row.d)}</span>}</div>
                    </div>
                  ))}
                  <div className="grid grid-cols-[1fr_90px_90px_90px_90px] md:grid-cols-[1fr_110px_110px_110px_110px] text-center items-center min-w-[560px]" style={{ background: "#131a26", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="p-4 text-left text-[13px] font-bold text-[#eef2ff]">{t("landing.comparison.startingPrice")}</div>
                    <div className="p-4 text-[13px] font-bold text-[#00e5a0]" style={syne}>$297/mo</div>
                    <div className="p-4 text-[11px] text-[#8a9abb]">$49-149/mo<br /><span className="text-[10px] text-[#5a6a8a]">{t("landing.comparison.credits")}</span></div>
                    <div className="p-4 text-[11px] text-[#8a9abb]">$14,995/yr<br /><span className="text-[10px] text-[#5a6a8a]">{t("landing.comparison.perSeat")}</span></div>
                    <div className="p-4 text-[11px] text-[#8a9abb]">$297-497<br /><span className="text-[10px] text-[#5a6a8a]">{t("landing.comparison.addOns")}</span></div>
                  </div>
                </div>

                <div className="mt-6 p-5 rounded-xl flex items-start gap-3 relative" style={{ background: "linear-gradient(135deg, rgba(0,229,160,0.04), rgba(59,130,246,0.02))", border: "1px solid transparent", backgroundImage: "linear-gradient(135deg, rgba(0,229,160,0.04), rgba(59,130,246,0.02)), linear-gradient(135deg, rgba(0,229,160,0.2), rgba(59,130,246,0.15))", backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box" }}>
                  <Zap className="w-5 h-5 text-[#00e5a0] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[14px] font-semibold text-[#eef2ff] mb-1">{t("landing.comparison.bottomLine")}</div>
                    <div className="text-[13px] text-[#8a9abb] leading-relaxed">{t("landing.comparison.bottomLineText1")} <strong className="text-[#eef2ff]">{t("landing.comparison.bottomLineNone")}</strong> {t("landing.comparison.bottomLineText2")} <strong className="text-[#00e5a0]">$297/mo</strong>{t("landing.comparison.bottomLineText3")}</div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl p-7 md:p-9 card-premium" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.06), rgba(239,68,68,0.04))", border: "1px solid rgba(245,158,11,0.12)" }} data-testid="section-vs-ghl">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                      <Shield className="w-5 h-5 text-[#f59e0b]" />
                    </div>
                    <div style={syne} className="text-[18px] font-bold">{t("landing.ghl.title")}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: t("landing.ghl.item0Title"), desc: t("landing.ghl.item0Desc") },
                      { title: t("landing.ghl.item1Title"), desc: t("landing.ghl.item1Desc") },
                      { title: t("landing.ghl.item2Title"), desc: t("landing.ghl.item2Desc") },
                      { title: t("landing.ghl.item3Title"), desc: t("landing.ghl.item3Desc") },
                    ].map((item, i) => (
                      <div key={i} className="card-premium p-4 rounded-xl">
                        <div className="text-[14px] font-semibold text-[#eef2ff] mb-1.5 flex items-center gap-2">
                          <X className="w-3.5 h-3.5 text-[#ef4444] shrink-0" />
                          {item.title}
                        </div>
                        <div className="text-[12px] text-[#8a9abb] leading-relaxed">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div id="features-section" className="mt-32 scroll-mt-20">
                <div className="inline-flex items-center gap-2 text-[11px] font-medium text-[#5a6a8a] uppercase tracking-[2px] px-3.5 py-1.5 rounded-full mb-4" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>{t("landing.features.badge")}</div>
                <h2 style={syne} className="section-heading text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-1.5px] mb-4">{t("landing.features.title")}</h2>
                <p className="text-[16px] text-[#8a9abb] max-w-[580px] leading-relaxed">{t("landing.features.desc")}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
                  {[
                    { icon: Search, title: t("landing.features.f0Title"), desc: t("landing.features.f0Desc"), color: "#00e5a0", bg: "rgba(0,229,160,0.12)" },
                    { icon: Send, title: t("landing.features.f1Title"), desc: t("landing.features.f1Desc"), color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
                    { icon: Phone, title: t("landing.features.f2Title"), desc: t("landing.features.f2Desc"), color: "#00e5a0", bg: "rgba(0,229,160,0.12)" },
                    { icon: Mail, title: t("landing.features.f3Title"), desc: t("landing.features.f3Desc"), color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
                    { icon: Brain, title: t("landing.features.f4Title"), desc: t("landing.features.f4Desc"), color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
                    { icon: Users, title: t("landing.features.f5Title"), desc: t("landing.features.f5Desc"), color: "#00e5a0", bg: "rgba(0,229,160,0.12)" },
                    { icon: Globe, title: t("landing.features.f6Title"), desc: t("landing.features.f6Desc"), color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
                    { icon: MessageSquare, title: t("landing.features.f7Title"), desc: t("landing.features.f7Desc"), color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
                    { icon: FileText, title: t("landing.features.f8Title"), desc: t("landing.features.f8Desc"), color: "#00e5a0", bg: "rgba(0,229,160,0.12)" },
                    { icon: BarChart3, title: t("landing.features.f9Title"), desc: t("landing.features.f9Desc"), color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
                    { icon: Star, title: t("landing.features.f10Title"), desc: t("landing.features.f10Desc"), color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
                    { icon: Layers, title: t("landing.features.f11Title"), desc: t("landing.features.f11Desc"), color: "#00e5a0", bg: "rgba(0,229,160,0.12)" },
                    { icon: Calendar, title: t("landing.features.f12Title"), desc: t("landing.features.f12Desc"), color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
                    { icon: Activity, title: t("landing.features.f13Title"), desc: t("landing.features.f13Desc"), color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
                    { icon: Rocket, title: t("landing.features.f14Title"), desc: t("landing.features.f14Desc"), color: "#00e5a0", bg: "rgba(0,229,160,0.12)" },
                  ].map((f, i) => (
                    <div key={i} className="card-premium rounded-2xl p-7 cursor-default" data-testid={`card-feature-${i}`}>
                      <div className="w-11 h-11 rounded-[10px] flex items-center justify-center text-xl mb-4" style={{ background: f.bg, color: f.color }}>
                        <f.icon className="w-5 h-5" />
                      </div>
                      <div style={syne} className="text-[15px] font-bold mb-2">{f.title}</div>
                      <div className="text-[13px] text-[#8a9abb] leading-relaxed">{f.desc}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-12 p-6 rounded-2xl text-center gradient-border" style={{ background: "linear-gradient(135deg, rgba(0,229,160,0.08), rgba(59,130,246,0.08))" }}>
                  <div style={syne} className="text-[20px] font-bold mb-2">{t("landing.features.plusText")}</div>
                  <div className="text-[14px] text-[#8a9abb]">{t("landing.features.everyFeature")}</div>
                </div>
              </div>

              <div className="mt-32 py-16 px-6 md:px-12" data-testid="section-what-they-charge">
                <div className="inline-flex items-center gap-2 text-[11px] font-medium text-[#5a6a8a] uppercase tracking-[2px] px-3.5 py-1.5 rounded-full mb-4 mx-auto" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", display: "flex", width: "fit-content" }}>{t("landing.costs.badge")}</div>
                <h2 style={syne} className="text-[clamp(24px,3.5vw,40px)] font-extrabold tracking-[-1.5px] mb-12 text-center max-w-[700px] mx-auto">{t("landing.costs.title")}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[900px] mx-auto">
                  {[
                    { tool: t("landing.costs.tool0Name"), price: t("landing.costs.tool0Price"), what: t("landing.costs.tool0What") },
                    { tool: t("landing.costs.tool1Name"), price: t("landing.costs.tool1Price"), what: t("landing.costs.tool1What") },
                    { tool: t("landing.costs.tool2Name"), price: t("landing.costs.tool2Price"), what: t("landing.costs.tool2What") },
                    { tool: t("landing.costs.tool3Name"), price: t("landing.costs.tool3Price"), what: t("landing.costs.tool3What") },
                    { tool: t("landing.costs.tool4Name"), price: t("landing.costs.tool4Price"), what: t("landing.costs.tool4What") },
                    { tool: t("landing.costs.tool5Name"), price: t("landing.costs.tool5Price"), what: t("landing.costs.tool5What") },
                    { tool: t("landing.costs.tool6Name"), price: t("landing.costs.tool6Price"), what: t("landing.costs.tool6What") },
                  ].map((item, i) => (
                    <div key={i} className="card-premium flex items-center justify-between p-4 rounded-xl">
                      <div>
                        <div className="text-[14px] font-medium text-[#eef2ff]">{item.tool}</div>
                        <div className="text-[11px] text-[#5a6a8a]">{item.what}</div>
                      </div>
                      <div className="text-[14px] font-bold text-[#ef4444]">{item.price}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 text-center">
                  <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl gradient-border" style={{ background: "linear-gradient(135deg, rgba(0,229,160,0.06), rgba(59,130,246,0.04))" }}>
                    <span className="text-[18px] font-bold text-[#ef4444] line-through" style={syne}>$2,346+/mo</span>
                    <ArrowRight className="w-5 h-5 text-[#5a6a8a]" />
                    <span className="text-[22px] font-extrabold text-[#00e5a0]" style={syne}>$297/mo</span>
                    <span className="text-[13px] text-[#8a9abb] ml-1">{t("landing.costs.withArgiflow")}</span>
                  </div>
                  <div className="mt-4 text-[14px] text-[#8a9abb]">{t("landing.costs.savePrefix")} <strong className="text-[#00e5a0]">{t("landing.costs.saveAmount")}</strong> {t("landing.costs.saveSuffix")}</div>
                </div>
              </div>
            </div>

            <div id="pricing-section" className="py-24 px-6 md:px-12 max-w-[1200px] mx-auto scroll-mt-20">
              <div className="inline-flex items-center gap-2 text-[11px] font-medium text-[#5a6a8a] uppercase tracking-[2px] px-3.5 py-1.5 rounded-full mb-4" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>{t("landing.pricing2.badge")}</div>
              <h2 style={syne} className="section-heading text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-1.5px] mb-4">{t("landing.pricing2.title")}</h2>
              <p className="text-[16px] text-[#8a9abb] max-w-[520px] leading-relaxed">{t("landing.pricing2.descPre")} <strong className="text-[#00e5a0]">{t("landing.pricing2.daysFree")}</strong> {t("landing.pricing2.descPost")}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
                {plans.map((p, i) => (
                  <div key={i} className={`rounded-[20px] p-9 relative transition-transform hover:-translate-y-1 ${p.popular ? "glow-ring" : "card-premium"}`} data-testid={`card-plan-${p.name.toLowerCase().replace(/\s/g, "-")}`} style={p.popular ? { background: "rgba(13,17,25,.9)", border: "1px solid rgba(59,130,246,.4)" } : undefined}>
                    {p.popular && (
                      <div className="absolute top-0 right-6 bg-[#3b82f6] text-white text-[10px] font-bold uppercase tracking-[1px] px-3 py-1 rounded-b-lg">{t("landing.pricing2.mostPopular")}</div>
                    )}
                    <div style={syne} className="text-[16px] font-bold mb-1.5">{p.name}</div>
                    <div style={syne} className="text-5xl font-extrabold tracking-[-2px] leading-none mb-1">{p.price}<sub className="text-[16px] font-normal text-[#5a6a8a] tracking-normal align-middle">{t("landing.pricing2.perMonth")}</sub></div>
                    <div className="text-[13px] text-[#5a6a8a] mb-7">{p.tagline}</div>
                    <ul className="flex flex-col gap-2.5 mb-8">
                      {p.features.map((f, j) => (
                        <li key={j} className="text-[13px] flex gap-2.5 items-start text-[rgba(238,242,255,.75)]">
                          <Check className="w-3.5 h-3.5 text-[#00e5a0] mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => startPlan(p.name, p.price)} data-testid={`button-plan-${p.name.toLowerCase().replace(/\s/g, "-")}`} className={`w-full py-3.5 rounded-[10px] text-[14px] font-bold cursor-pointer ${p.popular ? "btn-primary text-[#060810]" : "btn-secondary text-[#eef2ff]"}`} style={syne}>
                      {t("landing.pricing2.getStarted")}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials Section */}
            <div className="py-32 px-6 md:px-12 lg:px-16 max-w-[1240px] mx-auto">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 text-[11px] font-medium text-[#5a6a8a] uppercase tracking-[2px] px-3.5 py-1.5 rounded-full mb-4" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <MessageSquare className="w-3.5 h-3.5 text-[#00e5a0]" />
                  {t("landing.testimonials.badge")}
                </div>
                <h2 style={syne} className="section-heading text-[clamp(28px,4vw,44px)] font-extrabold mb-4">{t("landing.testimonials.title")}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { nameKey: "landing.testimonials.t0Name", roleKey: "landing.testimonials.t0Role", quoteKey: "landing.testimonials.t0Quote", color: "#00e5a0" },
                  { nameKey: "landing.testimonials.t1Name", roleKey: "landing.testimonials.t1Role", quoteKey: "landing.testimonials.t1Quote", color: "#3b82f6" },
                  { nameKey: "landing.testimonials.t2Name", roleKey: "landing.testimonials.t2Role", quoteKey: "landing.testimonials.t2Quote", color: "#f59e0b" },
                ].map((testimonial, i) => (
                  <div key={i} className="card-premium rounded-2xl p-8 flex flex-col" data-testid={`card-testimonial-${i}`}>
                    <div className="flex items-center gap-1 mb-5">
                      {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-[#f59e0b] fill-[#f59e0b]" />)}
                    </div>
                    <p className="text-[14px] text-[#c8d0e0] leading-[1.7] mb-6 flex-1">"{t(testimonial.quoteKey)}"</p>
                    <div className="flex items-center gap-3 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold" style={{ background: testimonial.color }}>
                        {t(testimonial.nameKey).split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold">{t(testimonial.nameKey)}</div>
                        <div className="text-[12px] text-[#5a6a8a]">{t(testimonial.roleKey)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Final CTA Section */}
            <div className="py-24 px-6 md:px-12 lg:px-16 max-w-[1240px] mx-auto">
              <div className="rounded-3xl p-12 md:p-16 text-center relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(0,229,160,.08) 0%, rgba(59,130,246,.06) 50%, rgba(139,92,246,.04) 100%)", border: "1px solid rgba(0,229,160,.12)" }}>
                <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 30% 50%, rgba(0,229,160,.06) 0%, transparent 50%)" }} />
                <div className="relative z-10">
                  <h2 style={syne} className="section-heading text-[clamp(28px,4vw,44px)] font-extrabold mb-5">{t("landing.cta2.title")}</h2>
                  <p className="text-[16px] text-[#8a9abb] leading-relaxed mb-10 max-w-[500px] mx-auto">{t("landing.cta2.desc")}</p>
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <button onClick={() => showView("getstarted")} data-testid="button-bottom-cta" className="btn-primary px-10 py-4 rounded-xl text-[16px] font-bold text-[#060810] cursor-pointer" style={syne}>
                      {t("landing.hero.ctaTrial")}
                    </button>
                    <button onClick={() => showView("demo")} data-testid="button-bottom-demo" className="btn-secondary px-10 py-4 rounded-xl text-[15px] font-medium text-[#eef2ff] cursor-pointer flex items-center gap-2" style={dm}>
                      <Play className="w-4 h-4" />
                      {t("landing.cta2.ctaDemoFirst")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Footer */}
            <footer className="pt-16 pb-8 px-6 md:px-12 lg:px-16 max-w-[1240px] mx-auto" style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
                <div className="col-span-2 md:col-span-1">
                  <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={() => showView("landing")}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00e5a0,#00b377)" }}>
                      <Zap className="w-3.5 h-3.5 text-[#060810]" />
                    </div>
                    <span style={syne} className="text-[17px] font-extrabold">Argi<span className="text-[#00e5a0]">Flow</span></span>
                  </div>
                  <p className="text-[12px] text-[#5a6a8a] leading-relaxed max-w-[200px]">{t("landing.footer.tagline")}</p>
                </div>
                {[
                  { title: t("landing.footer.product"), id: "product", links: [{ id: "features", label: t("landing.footer.features"), action: () => scrollToSection("features-section") }, { id: "pricing", label: t("landing.footer.pricing"), action: () => scrollToSection("pricing-section") }, { id: "demo", label: t("landing.footer.demo"), action: () => showView("demo") }] },
                  { title: t("landing.footer.company"), id: "company", links: [{ id: "about", label: t("landing.footer.about") }, { id: "blog", label: t("landing.footer.blog") }, { id: "contact", label: t("landing.footer.contact") }] },
                  { title: t("landing.footer.resources"), id: "resources", links: [{ id: "docs", label: t("landing.footer.docs") }, { id: "help", label: t("landing.footer.helpCenter") }, { id: "status", label: t("landing.footer.status") }] },
                  { title: t("landing.footer.legal"), id: "legal", links: [{ id: "privacy", label: t("landing.footer.privacy") }, { id: "terms", label: t("landing.footer.terms") }, { id: "security", label: t("landing.footer.security") }] },
                ].map((col, i) => (
                  <div key={i}>
                    <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#5a6a8a] mb-4">{col.title}</div>
                    <ul className="flex flex-col gap-2.5">
                      {col.links.map((link) => (
                        <li key={link.id} data-testid={`link-footer-${link.id}`} className="text-[13px] text-[#8a9abb] hover:text-[#eef2ff] cursor-pointer transition-colors" onClick={link.action}>{link.label}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-6 text-[12px] text-[#5a6a8a]" style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
                <span>{t("landing.footer.copyright")}</span>
                <span className="text-[#00e5a0] text-[11px]">info@argilette.com</span>
              </div>
            </footer>
          </div>
        )}

        {currentView === "demo" && (
          <div className="relative z-[1] min-h-screen pt-24 pb-16 px-6 md:px-12 lg:px-16 max-w-[1140px] mx-auto anim-fadeUp">
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 text-[11px] font-medium text-[#5a6a8a] uppercase tracking-[2px] px-3.5 py-1.5 rounded-full mb-3" style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>{t("landing.demo.badge")}</div>
              <h2 style={syne} className="section-heading text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-1.5px] mb-2">{t("landing.demo.title")}</h2>
              <p className="text-[14px] text-[#8a9abb]">{t("landing.demo.desc")}</p>
            </div>
            <div className="flex gap-2 p-1 rounded-xl w-fit mb-10" style={{ background: "#0a0e18", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}>
              {([["leads", t("landing.demo.tabLeads")], ["outreach", t("landing.demo.tabOutreach")], ["voice", t("landing.demo.tabVoice")], ["email", t("landing.demo.tabEmail")]] as [DemoTab, string][]).map(([k, label]) => (
                <button key={k} onClick={() => setActiveDemo(k)} data-testid={`button-demo-tab-${k}`} className={`px-5 py-2.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all ${activeDemo === k ? "bg-[#1a2235] text-[#eef2ff]" : "text-[#8a9abb]"}`} style={{ border: "none", ...dm }}>
                  {label}
                </button>
              ))}
            </div>

            {activeDemo === "leads" && (
              <div className="anim-fadeUp">
                <div className="card-premium rounded-2xl p-8 mb-5">
                  <div className="flex gap-3 mb-6 flex-wrap">
                    <input value={demoIndustry} onChange={e => setDemoIndustry(e.target.value)} placeholder={t("landing.demo.industryPlaceholder")} data-testid="input-demo-industry" className="flex-1 min-w-[180px] bg-[#131a26] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a] focus:border-[rgba(0,229,160,.4)] transition-colors" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} />
                    <input value={demoLocation} onChange={e => setDemoLocation(e.target.value)} placeholder={t("landing.demo.locationPlaceholder")} data-testid="input-demo-location" className="flex-1 min-w-[180px] bg-[#131a26] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a] focus:border-[rgba(0,229,160,.4)] transition-colors" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} />
                    <input value={demoTitle} onChange={e => setDemoTitle(e.target.value)} placeholder={t("landing.demo.titlePlaceholder")} data-testid="input-demo-title" className="flex-1 min-w-[180px] bg-[#131a26] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a] focus:border-[rgba(0,229,160,.4)] transition-colors" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} />
                    <button onClick={runLeadGen} disabled={leadRunning} data-testid="button-run-lead-gen" className="btn-primary px-7 py-3 rounded-[10px] text-[14px] font-bold text-[#07090f] cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed" style={syne}>
                      {t("landing.demo.generateLeads")}
                    </button>
                  </div>
                  {leadStatus && <div className="text-[14px] text-[#8a9abb] py-4">{leadStatus}</div>}
                  {leadResults.length > 0 && (
                    <div className="anim-fadeUp">
                      <div className="text-[13px] text-[#8a9abb] mb-4"><strong className="text-[#00e5a0]">{leadResults.length}</strong> {t("landing.demo.leadsFound")}</div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              {[t("landing.demo.thName"), t("landing.demo.thTitle"), t("landing.demo.thCompany"), t("landing.demo.thEmail"), t("landing.demo.thPhone"), t("landing.demo.thScore")].map(h => (
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
                <div className="card-premium rounded-2xl p-8 mb-5">
                  <div className="flex gap-0 mb-8 overflow-x-auto">
                    {[
                      { label: t("landing.demo.discovered"), count: 127, sub: t("landing.demo.newLeads"), done: true },
                      { label: t("landing.demo.enriched"), count: 98, sub: t("landing.demo.verified"), done: true },
                      { label: t("landing.demo.contacted"), count: 64, sub: t("landing.demo.emailSent"), active: true },
                      { label: t("landing.demo.replied"), count: 23, sub: t("landing.demo.rate17") },
                      { label: t("landing.demo.meetingLabel"), count: 11, sub: t("landing.demo.booked") },
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
                    <span className="text-[14px] font-bold">{t("landing.demo.liveActivity")}</span>
                    <button onClick={simulateOutreach} data-testid="button-run-outreach" className="btn-primary px-7 py-3 rounded-[10px] text-[14px] font-bold text-[#07090f] cursor-pointer" style={syne}>
                      {t("landing.demo.runNextCycle")}
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
                          <div className="text-[13px] font-medium mb-0.5">{t(item.titleKey)}</div>
                          <div className="text-[11px] text-[#5a6a8a]">{t(item.timeKey)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeDemo === "voice" && (
              <div className="anim-fadeUp">
                <div className="card-premium rounded-2xl p-8">
                  <div className="flex flex-col items-center py-12 gap-6">
                    <button onClick={simulateCall} data-testid="button-simulate-call" className={`w-[100px] h-[100px] rounded-full border-none cursor-pointer text-4xl flex items-center justify-center transition-all hover:scale-105 ${callState === "calling" ? "voice-pulse" : ""}`} style={{ background: "linear-gradient(135deg,#00e5a0,#00b377)" }}>
                      {callState === "calling" ? <PhoneCall className="w-9 h-9 text-[#07090f]" /> : <Phone className="w-9 h-9 text-[#07090f]" />}
                    </button>
                    <div style={syne} className="text-[16px] font-bold">{callStatus || t("landing.demo.clickToSimulate")}</div>
                    {showTranscript && (
                      <div ref={transcriptRef} className="bg-[#131a26] rounded-xl p-5 w-full max-w-[500px] max-h-[220px] overflow-y-auto text-[13px] leading-relaxed" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                        {callTranscript.map((line, i) => (
                          <div key={i} className={`mb-2.5 ${line.role === "ai" ? "text-[#00e5a0]" : "text-[#8a9abb]"}`}>
                            <strong>{line.role === "ai" ? "AI:" : "Dr. Torres:"}</strong> {line.text}
                          </div>
                        ))}
                        {callTranscript.length === 0 && <div className="text-[#5a6a8a]">{t("landing.demo.waitingConnection")}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeDemo === "email" && (
              <div className="anim-fadeUp">
                <div className="card-premium rounded-2xl p-8 mb-5">
                  <div style={syne} className="text-[14px] font-bold mb-5">{t("landing.demo.emailWarmupDashboard")}</div>
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
                          <span>{t("landing.demo.warmupLabel")}: {e.pct}%</span>
                          <span>{t("landing.demo.sentLabel")}: {e.sent}</span>
                          <span>{t("landing.demo.reputationLabel")}: {e.rep}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: t("landing.demo.activeDomains"), val: "4", color: "#00e5a0" },
                      { label: t("landing.demo.avgReputation"), val: "92%", color: "#00e5a0" },
                      { label: t("landing.demo.bounceRate"), val: "0.1%", color: "#eef2ff" },
                      { label: t("landing.demo.openRate"), val: "47%", color: "#f59e0b" },
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
          <div className="relative z-[1] min-h-screen pt-24 pb-20 px-6 lg:px-16 max-w-[1140px] mx-auto anim-fadeUp">
            <div className="flex items-center justify-center gap-0 mb-14">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-0">
                  <div className={`flex items-center gap-2.5 text-[13px] font-medium ${n < gsStep ? "text-[#00e5a0]" : n === gsStep ? "text-[#eef2ff]" : "text-[#5a6a8a]"}`}>
                    <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-[12px] font-bold ${n === gsStep ? "text-[#07090f]" : n < gsStep ? "bg-[rgba(0,229,160,0.12)] text-[#00e5a0] border-[rgba(0,229,160,.3)]" : "border-[rgba(255,255,255,0.07)]"}`} style={{ ...syne, ...(n === gsStep ? { background: "linear-gradient(135deg,#00e5a0,#00c98a)", boxShadow: "0 4px 15px rgba(0,229,160,.25), inset 0 1px 0 rgba(255,255,255,.15)", border: "none" } : { border: n < gsStep ? "1px solid rgba(0,229,160,.3)" : "1px solid rgba(255,255,255,0.07)" }) }}>
                      {n < gsStep ? <Check className="w-3 h-3" /> : n}
                    </div>
                    <span className="hidden sm:inline">{[t("landing.getstarted.step1"), t("landing.getstarted.step2"), t("landing.getstarted.step3")][n - 1]}</span>
                  </div>
                  {n < 3 && <div className="w-16 h-px bg-[rgba(255,255,255,0.07)] mx-2" />}
                </div>
              ))}
            </div>

            {gsStep === 1 && (
              <div className="anim-fadeUp">
                <div className="text-center mb-10">
                  <h2 style={syne} className="text-3xl font-extrabold tracking-[-1px] mb-2">{t("landing.getstarted.chooseTitle")}</h2>
                  <p className="text-[14px] text-[#8a9abb]">{t("landing.getstarted.choosePre")} <strong className="text-[#00e5a0]">{t("landing.getstarted.freeTrial")}</strong> {t("landing.getstarted.choosePost")}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                  {plans.map((p) => (
                    <div key={p.name} onClick={() => gsSelectPlan(p.name, p.price)} data-testid={`button-select-plan-${p.name.toLowerCase().replace(/\s/g, "-")}`} className={`card-premium rounded-2xl p-7 cursor-pointer relative transition-all hover:-translate-y-1 ${selectedPlan.name === p.name ? "bg-[rgba(0,229,160,.04)]" : ""}`} style={{ border: selectedPlan.name === p.name ? "1px solid #00e5a0" : undefined }}>
                      <div className={`absolute top-4 right-4 w-[22px] h-[22px] rounded-full bg-[#00e5a0] flex items-center justify-center transition-opacity ${selectedPlan.name === p.name ? "opacity-100" : "opacity-0"}`}>
                        <Check className="w-3 h-3 text-[#07090f]" />
                      </div>
                      {p.popular && (
                        <span className="inline-block text-[10px] font-bold uppercase tracking-[1px] text-[#3b82f6] px-2.5 py-0.5 rounded-[10px] mb-4" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,.3)" }}>{t("landing.pricing2.mostPopular")}</span>
                      )}
                      <div style={syne} className="text-[17px] font-bold mb-1.5">{p.name}</div>
                      <div style={syne} className="text-[40px] font-extrabold tracking-[-2px] leading-none mb-1">{p.price}<sub className="text-[15px] font-normal text-[#5a6a8a] tracking-normal">{t("landing.pricing2.perMonth")}</sub></div>
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
                  <button onClick={() => { if (selectedPlan.name) goToStep(2); else showToast("warn", t("landing.getstarted.pleaseSelect")); }} data-testid="button-gs-continue-1" className="btn-primary px-10 py-4 rounded-xl text-[16px] font-bold text-[#07090f] cursor-pointer" style={syne}>
                    {t("landing.getstarted.continue")} <ArrowRight className="inline w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            )}

            {gsStep === 2 && (
              <div className="anim-fadeUp">
                <button onClick={() => goToStep(1)} data-testid="button-gs-back-1" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] text-[#8a9abb] cursor-pointer hover:text-[#eef2ff] transition-all mb-7" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", ...dm }}>
                  <ArrowLeft className="w-3.5 h-3.5" /> {t("landing.getstarted.back")}
                </button>
                <div className="card-premium rounded-[20px] p-11 max-w-[580px] mx-auto">
                  <div className="flex justify-between items-center rounded-[10px] px-5 py-3.5 mb-8" style={{ background: "rgba(0,229,160,0.12)", border: "1px solid rgba(0,229,160,.2)" }}>
                    <span style={syne} className="text-[14px] font-bold">{selectedPlan.name} {t("landing.getstarted.planLabel")}</span>
                    <span style={syne} className="text-[18px] font-extrabold text-[#00e5a0]">{selectedPlan.price}{t("landing.pricing2.perMonth")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5a6a8a] uppercase tracking-[1.2px] mb-2">{t("landing.getstarted.firstName")}</label>
                      <input value={gsFirstName} onChange={e => setGsFirstName(e.target.value)} data-testid="input-gs-firstname" className="w-full bg-[#0a0e18] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a]" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} placeholder="John" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5a6a8a] uppercase tracking-[1.2px] mb-2">{t("landing.getstarted.lastName")}</label>
                      <input value={gsLastName} onChange={e => setGsLastName(e.target.value)} data-testid="input-gs-lastname" className="w-full bg-[#0a0e18] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a]" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} placeholder="Smith" />
                    </div>
                  </div>
                  <div className="mb-5">
                    <label className="block text-[11px] font-semibold text-[#5a6a8a] uppercase tracking-[1.2px] mb-2">{t("landing.getstarted.businessName")}</label>
                    <input value={gsBusiness} onChange={e => setGsBusiness(e.target.value)} data-testid="input-gs-business" className="w-full bg-[#0a0e18] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a]" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} placeholder="Acme Corp" />
                  </div>
                  <div className="mb-5">
                    <label className="block text-[11px] font-semibold text-[#5a6a8a] uppercase tracking-[1.2px] mb-2">{t("landing.getstarted.email")}</label>
                    <input value={gsEmail} onChange={e => setGsEmail(e.target.value)} type="email" data-testid="input-gs-email" className="w-full bg-[#0a0e18] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a]" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} placeholder="john@acme.com" />
                  </div>
                  <div className="mb-5">
                    <label className="block text-[11px] font-semibold text-[#5a6a8a] uppercase tracking-[1.2px] mb-2">{t("landing.getstarted.phone")}</label>
                    <input value={gsPhone} onChange={e => setGsPhone(e.target.value)} data-testid="input-gs-phone" className="w-full bg-[#0a0e18] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a]" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} placeholder="(555) 123-4567" />
                  </div>
                  <div className="mb-5">
                    <label className="block text-[11px] font-semibold text-[#5a6a8a] uppercase tracking-[1.2px] mb-2">{t("landing.getstarted.industry")}</label>
                    <select value={gsIndustry} onChange={e => setGsIndustry(e.target.value)} data-testid="select-gs-industry" className="w-full bg-[#0a0e18] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }}>
                      <option value="">{t("landing.getstarted.selectIndustry")}</option>
                      <option value="healthcare">{t("landing.getstarted.healthcare")}</option>
                      <option value="saas">{t("landing.getstarted.saas")}</option>
                      <option value="finance">{t("landing.getstarted.finance")}</option>
                      <option value="realestate">{t("landing.getstarted.realestate")}</option>
                      <option value="legal">{t("landing.getstarted.legal")}</option>
                      <option value="marketing">{t("landing.getstarted.marketing")}</option>
                      <option value="other">{t("landing.getstarted.other")}</option>
                    </select>
                  </div>
                  <div className="mb-5">
                    <label className="block text-[11px] font-semibold text-[#5a6a8a] uppercase tracking-[1.2px] mb-2">{t("landing.getstarted.targetCustomer")}</label>
                    <textarea value={gsTarget} onChange={e => setGsTarget(e.target.value)} data-testid="input-gs-target" className="w-full bg-[#0a0e18] rounded-[10px] px-4 py-3 text-[14px] text-[#eef2ff] outline-none placeholder:text-[#5a6a8a] resize-y min-h-[80px]" style={{ border: "1px solid rgba(255,255,255,0.07)", ...dm }} placeholder={t("landing.getstarted.targetPlaceholder")} />
                  </div>
                  <button onClick={() => goToStep(3)} data-testid="button-gs-continue-2" className="btn-primary w-full py-4 rounded-xl text-[16px] font-bold text-[#07090f] cursor-pointer mt-1" style={syne}>
                    {t("landing.getstarted.continuePayment")}
                  </button>
                </div>
              </div>
            )}

            {gsStep === 3 && (
              <div className="anim-fadeUp">
                <button onClick={() => goToStep(2)} data-testid="button-gs-back-2" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] text-[#8a9abb] cursor-pointer hover:text-[#eef2ff] transition-all mb-7" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", ...dm }}>
                  <ArrowLeft className="w-3.5 h-3.5" /> {t("landing.getstarted.back")}
                </button>
                <div className="card-premium rounded-[20px] p-12 max-w-[560px] mx-auto text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(0,229,160,0.12)", border: "1px solid rgba(0,229,160,.25)" }}>
                    <CreditCard className="w-6 h-6 text-[#00e5a0]" />
                  </div>
                  <h2 style={syne} className="text-[26px] font-extrabold tracking-[-1px] mb-2.5">{t("landing.getstarted.completeSetup")}</h2>
                  <p className="text-[14px] text-[#8a9abb] mb-9 leading-relaxed">{t("landing.getstarted.stripeDesc", { plan: selectedPlan.name })}</p>

                  {(gsFirstName || gsBusiness || gsEmail) && (
                    <div className="text-left rounded-[10px] p-4 mb-5" style={{ background: "rgba(0,229,160,.04)", border: "1px solid rgba(0,229,160,.15)" }}>
                      {gsFirstName && <div className="flex justify-between text-[13px] mb-1"><span className="text-[#5a6a8a]">{t("landing.getstarted.nameLabel")}</span><span className="font-medium">{gsFirstName} {gsLastName}</span></div>}
                      {gsBusiness && <div className="flex justify-between text-[13px] mb-1"><span className="text-[#5a6a8a]">{t("landing.getstarted.businessLabel")}</span><span className="font-medium">{gsBusiness}</span></div>}
                      {gsEmail && <div className="flex justify-between text-[13px]"><span className="text-[#5a6a8a]">{t("landing.getstarted.emailLabel")}</span><span className="font-medium">{gsEmail}</span></div>}
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-xl px-5 py-3.5 mb-7" style={{ background: "rgba(0,229,160,0.12)", border: "1px solid rgba(0,229,160,.2)" }}>
                    <span className="text-[13px] text-[#8a9abb]">{t("landing.getstarted.monthlySubscription")}</span>
                    <span style={syne} className="text-[22px] font-extrabold text-[#00e5a0]">{selectedPlan.price}{t("landing.pricing2.perMonth")}</span>
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
                          showToast("error", data.message || t("landing.getstarted.checkoutError"));
                          setCheckoutLoading(false);
                        }
                      } catch {
                        showToast("error", t("landing.getstarted.connectionError"));
                        setCheckoutLoading(false);
                      }
                    }}
                    disabled={checkoutLoading}
                    data-testid="button-stripe-checkout"
                    className={`w-full py-4 rounded-xl text-[16px] font-bold cursor-pointer transition-all mb-5 flex items-center justify-center gap-2 ${checkoutLoading ? "opacity-60" : "hover:bg-[#00ffb3] hover:-translate-y-0.5"}`}
                    style={{ background: "#00e5a0", color: "#07090f", ...syne }}
                  >
                    {checkoutLoading ? (
                      <><RotateCw className="w-4 h-4 animate-spin" /> {t("landing.getstarted.redirecting")}</>
                    ) : (
                      <>{t("landing.getstarted.payWithStripe")} <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-4 mb-7 text-[12px] text-[#5a6a8a]">
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {t("landing.getstarted.secureCheckout")}</span>
                    <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> {t("landing.getstarted.cardsAccepted")}</span>
                    <span className="flex items-center gap-1"><Check className="w-3 h-3" /> {t("landing.getstarted.cancelAnytime")}</span>
                  </div>

                  <div className="text-left">
                    <div className="text-[11px] font-bold uppercase tracking-[1.2px] text-[#5a6a8a] mb-3.5">{t("landing.getstarted.whatHappensNext")}</div>
                    {[
                      t("landing.getstarted.next1"),
                      t("landing.getstarted.next2"),
                      t("landing.getstarted.next3"),
                    ].map((step, i) => (
                      <div key={i} className="flex gap-3 mb-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-[#00e5a0] shrink-0" style={{ background: "#131a26", border: "1px solid rgba(255,255,255,0.07)", ...syne }}>{i + 1}</div>
                        <span className="text-[13px] text-[rgba(238,242,255,.7)] leading-relaxed pt-0.5">{step}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-5 text-[12px] text-[#5a6a8a]" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    {t("landing.getstarted.questionsEmail")} <a href="mailto:info@argilette.com" className="text-[#00e5a0] no-underline">info@argilette.com</a>
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
