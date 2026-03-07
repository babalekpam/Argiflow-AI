import { useState, useRef, useEffect, useCallback } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";
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
  Database, Eye, Star, Calendar, Filter, X, RotateCw, Menu
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
  const [selectedPlan, setSelectedPlan] = useState({ name: "Growth", price: "$597" });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);} }
        @keyframes fadeIn { from{opacity:0;}to{opacity:1;} }
        @keyframes voicePulse { 0%{box-shadow:0 0 0 0 rgba(79,70,229,.5);}70%{box-shadow:0 0 0 24px rgba(79,70,229,0);}100%{box-shadow:0 0 0 0 rgba(79,70,229,0);} }
        @keyframes toastIn { from{transform:translateY(-12px);opacity:0;}to{transform:translateY(0);opacity:1;} }
        @keyframes float { 0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);} }
        .anim-up { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) both; }
        .anim-up-d1 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .1s both; }
        .anim-up-d2 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .2s both; }
        .anim-up-d3 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .3s both; }
        .anim-up-d4 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .4s both; }
        .voice-pulse { animation: voicePulse 1.5s infinite; }
      `}</style>

      <div className="min-h-screen bg-white text-slate-900 relative overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

        {toast && (
          <div className="fixed top-20 right-6 z-[200] px-5 py-3.5 rounded-2xl flex items-center gap-3 text-sm font-medium bg-white shadow-xl border border-slate-100" style={{ animation: "toastIn .3s ease" }}>
            <span className="text-indigo-600">
              {toast.icon === "check" && <Check className="w-4 h-4" />}
              {toast.icon === "mail" && <Mail className="w-4 h-4" />}
              {toast.icon === "calendar" && <Calendar className="w-4 h-4" />}
              {!["check", "mail", "calendar"].includes(toast.icon) && <Sparkles className="w-4 h-4" />}
            </span>
            <span className="text-slate-700">{toast.msg}</span>
          </div>
        )}

        <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 h-16">
            <div className="cursor-pointer flex items-center gap-2" onClick={() => showView("landing")} data-testid="link-home">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight">Argi<span className="text-indigo-600">Flow</span></span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <span className="text-[13px] text-slate-500 cursor-pointer hover:text-slate-900 transition-colors font-medium" onClick={() => scrollToSection("features-section")} data-testid="link-nav-features">{t("landing.nav.features")}</span>
              <span className="text-[13px] text-slate-500 cursor-pointer hover:text-slate-900 transition-colors font-medium" onClick={() => showView("demo")} data-testid="link-nav-demo">{t("landing.nav.demo")}</span>
              <span className="text-[13px] text-slate-500 cursor-pointer hover:text-slate-900 transition-colors font-medium" onClick={() => scrollToSection("pricing-section")} data-testid="link-nav-pricing">{t("landing.nav.pricing")}</span>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher variant="compact" />
              <a href="/login" data-testid="link-login" className="hidden sm:inline-flex px-4 py-2 rounded-lg text-[13px] text-slate-600 hover:text-slate-900 font-medium transition-colors">
                {t("landing.nav.logIn")}
              </a>
              <button onClick={() => showView("demo")} data-testid="button-live-demo" className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer bg-white">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                {t("landing.nav.liveDemo")}
              </button>
              <button onClick={() => showView("getstarted")} data-testid="button-get-started" className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 transition-all cursor-pointer shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 hover:-translate-y-0.5">
                {t("landing.nav.getStarted")}
              </button>
              <button className="md:hidden p-2 text-slate-500" onClick={() => setMobileMenu(!mobileMenu)}><Menu className="w-5 h-5" /></button>
            </div>
          </div>
          {mobileMenu && (
            <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 flex flex-col gap-3">
              <span className="text-sm text-slate-600 cursor-pointer py-2" onClick={() => scrollToSection("features-section")}>{t("landing.nav.features")}</span>
              <span className="text-sm text-slate-600 cursor-pointer py-2" onClick={() => showView("demo")}>{t("landing.nav.demo")}</span>
              <span className="text-sm text-slate-600 cursor-pointer py-2" onClick={() => scrollToSection("pricing-section")}>{t("landing.nav.pricing")}</span>
              <a href="/login" className="text-sm text-slate-600 py-2">{t("landing.nav.logIn")}</a>
            </div>
          )}
        </nav>

        {currentView === "landing" && (
          <div className="relative">
            <div className="absolute inset-0 h-[800px] bg-gradient-to-b from-indigo-50/80 via-white to-white pointer-events-none" />
            <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-violet-100/40 to-indigo-100/20 blur-3xl pointer-events-none" />
            <div className="absolute top-40 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-blue-100/30 to-transparent blur-3xl pointer-events-none" />

            <div className="relative pt-32 pb-20 px-6 max-w-[1100px] mx-auto">
              <div className="flex items-center gap-8 lg:gap-12">
                <div className="max-w-[720px] flex-1">
                  <div className="anim-up inline-flex items-center gap-2 text-[12px] font-semibold text-indigo-600 uppercase tracking-widest px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t("landing.hero.engineBadge")}
                  </div>
                  <div className="anim-up-d1 inline-flex items-center gap-2 text-[12px] font-semibold text-amber-700 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-100 mb-8 ml-2">
                    <Shield className="w-3.5 h-3.5" />
                    {t("landing.hero.replacesBadge")}
                  </div>
                  <h1 className="anim-up-d1 text-[clamp(36px,5.5vw,64px)] font-extrabold leading-[1.08] tracking-tight mb-6">
                    {t("landing.hero.titleStop")}{" "}
                    <span className="text-red-400 line-through decoration-2 decoration-red-300">{t("landing.hero.title5Tools")}</span>{" "}
                    <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">{t("landing.hero.titleGetEverything")}</span>{" "}
                    {t("landing.hero.titleIn")} <span className="text-indigo-600">{t("landing.hero.titleOne")}</span>
                  </h1>
                  <p className="anim-up-d2 text-lg text-slate-500 font-normal leading-relaxed mb-4 max-w-[560px]">
                    {t("landing.hero.descFull")}
                  </p>
                  <p className="anim-up-d2 text-[15px] text-indigo-600 font-medium mb-10">
                    {t("landing.hero.oneLogin")} <strong>{t("landing.hero.freeTrialBold")}</strong> {t("landing.hero.oneLoginEnd")}
                  </p>
                  <div className="anim-up-d3 flex items-center gap-3 flex-wrap">
                    <button onClick={() => showView("getstarted")} data-testid="button-start-trial" className="px-8 py-3.5 rounded-xl text-[15px] font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all cursor-pointer">
                      {t("landing.hero.ctaTrial")}
                    </button>
                    <button onClick={() => showView("demo")} data-testid="button-watch-demo" className="px-8 py-3.5 rounded-xl text-[15px] font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2">
                      <Play className="w-4 h-4 text-indigo-500" />
                      {t("landing.hero.ctaDemo")}
                    </button>
                  </div>
                  <div className="anim-up-d4 flex items-center gap-4 mt-10">
                    <div className="flex -space-x-2">
                      {["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-400", "bg-slate-400"].map((c, i) => (
                        <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white ${c}`}>
                          {["JM", "SK", "AT", "RC", "LP"][i]}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex items-center gap-0.5 mb-0.5">
                        {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}
                      </div>
                      <span className="text-[13px] text-slate-400">
                        {t("landing.hero.trustedBy")} <strong className="text-slate-600">500+</strong> {t("landing.hero.savingTeams")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="hidden lg:block flex-shrink-0 anim-up-d3" data-testid="img-hero-bot">
                  <div className="relative">
                    <div className="absolute -inset-6 bg-gradient-to-br from-indigo-200/30 via-violet-200/20 to-transparent rounded-full blur-2xl" />
                    <img src={botHeroImg} alt="ArgiFlow AI Assistant" className="w-[340px] h-[340px] object-contain relative z-10 drop-shadow-xl" style={{ animation: "float 4s ease-in-out infinite" }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-px mt-20 rounded-2xl overflow-hidden border border-slate-100 shadow-sm anim-up-d4">
                {[
                  { num: "40+", label: t("landing.stats.toolsBuiltIn"), icon: Layers },
                  { num: "$0", label: t("landing.stats.extraCosts"), icon: CreditCard },
                  { num: "24/7", label: t("landing.stats.aiAvailability"), icon: Bot },
                  { num: "10x", label: t("landing.stats.pipelineGrowth"), icon: TrendingUp },
                ].map((s, i) => (
                  <div key={i} className="bg-white py-8 px-6 text-center group hover:bg-slate-50 transition-colors">
                    <s.icon className="w-5 h-5 text-indigo-300 mx-auto mb-3 group-hover:text-indigo-500 transition-colors" />
                    <div className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">{s.num}</div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-20 px-6 max-w-[1100px] mx-auto" data-testid="section-comparison">
              <span className="inline-flex items-center text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 mb-4">{t("landing.comparison.badge")}</span>
              <h2 className="text-[clamp(24px,3.5vw,40px)] font-extrabold tracking-tight mb-3">{t("landing.comparison.title")}</h2>
              <p className="text-base text-slate-400 max-w-[520px] leading-relaxed mb-10">{t("landing.comparison.desc")}</p>

              <div className="rounded-2xl overflow-hidden overflow-x-auto border border-slate-100 shadow-sm">
                <div className="grid grid-cols-[1fr_90px_90px_90px_90px] md:grid-cols-[1fr_110px_110px_110px_110px] text-center min-w-[560px] bg-slate-50 border-b border-slate-100">
                  <div className="p-4 text-left text-[12px] font-semibold text-slate-400 uppercase tracking-wide">{t("landing.comparison.capability")}</div>
                  <div className="p-4 text-[13px] font-bold text-indigo-600">ArgiFlow</div>
                  <div className="p-4 text-[13px] font-medium text-slate-400">Apollo</div>
                  <div className="p-4 text-[13px] font-medium text-slate-400">ZoomInfo</div>
                  <div className="p-4 text-[13px] font-medium text-slate-400">GHL</div>
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
                  <div key={i} className={`grid grid-cols-[1fr_90px_90px_90px_90px] md:grid-cols-[1fr_110px_110px_110px_110px] text-center items-center min-w-[560px] hover:bg-indigo-50/30 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <div className="p-3 md:p-4 text-left text-[12px] md:text-[13px] text-slate-600">{row.feat}</div>
                    <div className="p-3 md:p-4">{row.a === true ? <Check className="w-4 h-4 text-indigo-600 mx-auto" /> : <span className="text-[11px] text-slate-400">{String(row.a)}</span>}</div>
                    <div className="p-3 md:p-4">{row.b === true ? <Check className="w-4 h-4 text-blue-500 mx-auto" /> : row.b === false ? <X className="w-4 h-4 text-slate-200 mx-auto" /> : <span className="text-[11px] text-slate-400">{String(row.b)}</span>}</div>
                    <div className="p-3 md:p-4">{row.c === true ? <Check className="w-4 h-4 text-blue-500 mx-auto" /> : row.c === false ? <X className="w-4 h-4 text-slate-200 mx-auto" /> : <span className="text-[11px] text-slate-400">{String(row.c)}</span>}</div>
                    <div className="p-3 md:p-4">{row.d === true ? <Check className="w-4 h-4 text-blue-500 mx-auto" /> : row.d === false ? <X className="w-4 h-4 text-slate-200 mx-auto" /> : <span className="text-[11px] text-amber-500">{String(row.d)}</span>}</div>
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_90px_90px_90px_90px] md:grid-cols-[1fr_110px_110px_110px_110px] text-center items-center min-w-[560px] bg-slate-50 border-t border-slate-200">
                  <div className="p-4 text-left text-[13px] font-bold text-slate-900">{t("landing.comparison.startingPrice")}</div>
                  <div className="p-4 text-[13px] font-bold text-indigo-600">$297/mo</div>
                  <div className="p-4 text-[11px] text-slate-400">$49-149/mo</div>
                  <div className="p-4 text-[11px] text-slate-400">$14,995/yr</div>
                  <div className="p-4 text-[11px] text-slate-400">$297-497</div>
                </div>
              </div>

              <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 flex items-start gap-3">
                <Zap className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-slate-900 mb-1">{t("landing.comparison.bottomLine")}</div>
                  <div className="text-[13px] text-slate-500 leading-relaxed">{t("landing.comparison.bottomLineText1")} <strong className="text-slate-700">{t("landing.comparison.bottomLineNone")}</strong> {t("landing.comparison.bottomLineText2")} <strong className="text-indigo-600">$297/mo</strong>{t("landing.comparison.bottomLineText3")}</div>
                </div>
              </div>
            </div>

            <div id="features-section" className="py-20 px-6 max-w-[1100px] mx-auto scroll-mt-20">
              <span className="inline-flex items-center text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 mb-4">{t("landing.features.badge")}</span>
              <h2 className="text-[clamp(24px,3.5vw,40px)] font-extrabold tracking-tight mb-3">{t("landing.features.title")}</h2>
              <p className="text-base text-slate-400 max-w-[520px] leading-relaxed mb-10">{t("landing.features.desc")}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: Search, title: t("landing.features.f0Title"), desc: t("landing.features.f0Desc"), color: "text-indigo-600", bg: "bg-indigo-50" },
                  { icon: Send, title: t("landing.features.f1Title"), desc: t("landing.features.f1Desc"), color: "text-violet-600", bg: "bg-violet-50" },
                  { icon: Phone, title: t("landing.features.f2Title"), desc: t("landing.features.f2Desc"), color: "text-emerald-600", bg: "bg-emerald-50" },
                  { icon: Mail, title: t("landing.features.f3Title"), desc: t("landing.features.f3Desc"), color: "text-amber-600", bg: "bg-amber-50" },
                  { icon: Brain, title: t("landing.features.f4Title"), desc: t("landing.features.f4Desc"), color: "text-blue-600", bg: "bg-blue-50" },
                  { icon: Users, title: t("landing.features.f5Title"), desc: t("landing.features.f5Desc"), color: "text-indigo-600", bg: "bg-indigo-50" },
                  { icon: Globe, title: t("landing.features.f6Title"), desc: t("landing.features.f6Desc"), color: "text-violet-600", bg: "bg-violet-50" },
                  { icon: MessageSquare, title: t("landing.features.f7Title"), desc: t("landing.features.f7Desc"), color: "text-emerald-600", bg: "bg-emerald-50" },
                  { icon: FileText, title: t("landing.features.f8Title"), desc: t("landing.features.f8Desc"), color: "text-amber-600", bg: "bg-amber-50" },
                  { icon: BarChart3, title: t("landing.features.f9Title"), desc: t("landing.features.f9Desc"), color: "text-blue-600", bg: "bg-blue-50" },
                  { icon: Star, title: t("landing.features.f10Title"), desc: t("landing.features.f10Desc"), color: "text-indigo-600", bg: "bg-indigo-50" },
                  { icon: Layers, title: t("landing.features.f11Title"), desc: t("landing.features.f11Desc"), color: "text-violet-600", bg: "bg-violet-50" },
                  { icon: Calendar, title: t("landing.features.f12Title"), desc: t("landing.features.f12Desc"), color: "text-emerald-600", bg: "bg-emerald-50" },
                  { icon: Activity, title: t("landing.features.f13Title"), desc: t("landing.features.f13Desc"), color: "text-amber-600", bg: "bg-amber-50" },
                  { icon: Rocket, title: t("landing.features.f14Title"), desc: t("landing.features.f14Desc"), color: "text-indigo-600", bg: "bg-indigo-50" },
                ].map((f, i) => (
                  <div key={i} className="rounded-2xl p-6 bg-white border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all cursor-default" data-testid={`card-feature-${i}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.bg}`}>
                      <f.icon className={`w-5 h-5 ${f.color}`} />
                    </div>
                    <div className="text-[15px] font-semibold text-slate-900 mb-1.5">{f.title}</div>
                    <div className="text-[13px] text-slate-400 leading-relaxed">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-20 px-6 max-w-[1100px] mx-auto" data-testid="section-ai-agents">
              <div className="text-center mb-12">
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-600 uppercase tracking-widest px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
                  <Bot className="w-3.5 h-3.5" />
                  AI-Powered Workforce
                </span>
                <h2 className="text-[clamp(24px,3.5vw,40px)] font-extrabold tracking-tight mb-3">Meet Your AI Agents</h2>
                <p className="text-base text-slate-400 max-w-[520px] mx-auto leading-relaxed">Each agent is purpose-built to handle a specific part of your sales pipeline — working 24/7 so you don't have to.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { img: botLeadScoutImg, name: "Lead Scout", desc: "Discovers and qualifies high-value prospects from multiple data sources", icon: Search, color: "from-indigo-500 to-blue-500" },
                  { img: botEmailWriterImg, name: "Email Writer", desc: "Crafts personalized cold emails and follow-up sequences that convert", icon: Mail, color: "from-violet-500 to-purple-500" },
                  { img: botVoiceCallerImg, name: "Voice Caller", desc: "Makes AI-powered phone calls with natural conversation and booking", icon: PhoneCall, color: "from-emerald-500 to-teal-500" },
                  { img: botAnalyticsImg, name: "Analytics Brain", desc: "Monitors intent signals, tracks engagement, and optimizes campaigns", icon: BarChart3, color: "from-amber-500 to-orange-500" },
                ].map((agent, i) => (
                  <div key={i} className="group rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-lg transition-all overflow-hidden" data-testid={`card-agent-${i}`}>
                    <div className="relative h-48 bg-gradient-to-br from-slate-50 to-indigo-50/50 flex items-center justify-center overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${agent.color} opacity-[0.03]`} />
                      <img src={agent.img} alt={agent.name} className="w-36 h-36 object-contain drop-shadow-lg" />
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center`}>
                          <agent.icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-[15px] font-semibold text-slate-900">{agent.name}</span>
                      </div>
                      <p className="text-[13px] text-slate-400 leading-relaxed">{agent.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-16 px-6 max-w-[1100px] mx-auto" data-testid="section-what-they-charge">
              <div className="text-center mb-10">
                <span className="inline-flex items-center text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 mb-4">{t("landing.costs.badge")}</span>
                <h2 className="text-[clamp(24px,3.5vw,40px)] font-extrabold tracking-tight mb-3">{t("landing.costs.title")}</h2>
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
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-100">
                    <div>
                      <div className="text-sm font-medium text-slate-700">{item.tool}</div>
                      <div className="text-[11px] text-slate-400">{item.what}</div>
                    </div>
                    <div className="text-sm font-bold text-red-500">{item.price}</div>
                  </div>
                ))}
              </div>
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100">
                  <span className="text-lg font-bold text-red-400 line-through">$2,346+/mo</span>
                  <ArrowRight className="w-5 h-5 text-slate-300" />
                  <span className="text-xl font-extrabold text-indigo-600">$297/mo</span>
                  <span className="text-[13px] text-slate-400 ml-1">{t("landing.costs.withArgiflow")}</span>
                </div>
              </div>
            </div>

            <div id="pricing-section" className="py-20 px-6 max-w-[1100px] mx-auto scroll-mt-20">
              <span className="inline-flex items-center text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 mb-4">{t("landing.pricing2.badge")}</span>
              <h2 className="text-[clamp(24px,3.5vw,40px)] font-extrabold tracking-tight mb-3">{t("landing.pricing2.title")}</h2>
              <p className="text-base text-slate-400 max-w-[480px] leading-relaxed mb-10">{t("landing.pricing2.descPre")} <strong className="text-indigo-600">{t("landing.pricing2.daysFree")}</strong> {t("landing.pricing2.descPost")}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {plans.map((p, i) => (
                  <div key={i} className={`rounded-2xl p-8 relative transition-all hover:-translate-y-1 ${p.popular ? "bg-gradient-to-b from-indigo-600 to-violet-700 text-white shadow-2xl shadow-indigo-200 scale-[1.02]" : "bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-xl"}`} data-testid={`card-plan-${p.name.toLowerCase().replace(/\s/g, "-")}`}>
                    {p.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-lg">{t("landing.pricing2.mostPopular")}</div>
                    )}
                    <div className={`text-[15px] font-semibold mb-1 ${p.popular ? "text-indigo-100" : "text-slate-500"}`}>{p.name}</div>
                    <div className="text-4xl font-extrabold tracking-tight leading-none mb-1">{p.price}<sub className={`text-[14px] font-normal ml-0.5 ${p.popular ? "text-indigo-200" : "text-slate-400"}`}>{t("landing.pricing2.perMonth")}</sub></div>
                    <div className={`text-[13px] mb-6 ${p.popular ? "text-indigo-200" : "text-slate-400"}`}>{p.tagline}</div>
                    <ul className="flex flex-col gap-2.5 mb-8">
                      {p.features.map((f, j) => (
                        <li key={j} className={`text-[13px] flex gap-2 items-start ${p.popular ? "text-indigo-100" : "text-slate-500"}`}>
                          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${p.popular ? "text-emerald-300" : "text-indigo-500"}`} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => startPlan(p.name, p.price)} data-testid={`button-plan-${p.name.toLowerCase().replace(/\s/g, "-")}`} className={`w-full py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all ${p.popular ? "bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg" : "bg-slate-900 text-white hover:bg-slate-800"}`}>
                      {t("landing.pricing2.getStarted")}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-24 px-6 max-w-[1100px] mx-auto">
              <div className="text-center mb-12">
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-widest px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 mb-4">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                  {t("landing.testimonials.badge")}
                </span>
                <h2 className="text-[clamp(24px,3.5vw,40px)] font-extrabold tracking-tight">{t("landing.testimonials.title")}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { nameKey: "landing.testimonials.t0Name", roleKey: "landing.testimonials.t0Role", quoteKey: "landing.testimonials.t0Quote", color: "bg-indigo-500" },
                  { nameKey: "landing.testimonials.t1Name", roleKey: "landing.testimonials.t1Role", quoteKey: "landing.testimonials.t1Quote", color: "bg-violet-500" },
                  { nameKey: "landing.testimonials.t2Name", roleKey: "landing.testimonials.t2Role", quoteKey: "landing.testimonials.t2Quote", color: "bg-emerald-500" },
                ].map((testimonial, i) => (
                  <div key={i} className="rounded-2xl p-7 bg-white border border-slate-100 hover:shadow-lg transition-all flex flex-col" data-testid={`card-testimonial-${i}`}>
                    <div className="flex items-center gap-0.5 mb-4">
                      {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-1">"{t(testimonial.quoteKey)}"</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${testimonial.color}`}>
                        {t(testimonial.nameKey).split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-slate-700">{t(testimonial.nameKey)}</div>
                        <div className="text-[12px] text-slate-400">{t(testimonial.roleKey)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="py-20 px-6 max-w-[1100px] mx-auto">
              <div className="rounded-3xl p-12 md:p-16 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)] pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="hidden md:block flex-shrink-0" data-testid="img-cta-bots">
                    <img src={botTeamImg} alt="AI Agent Team" className="w-[260px] object-contain drop-shadow-2xl opacity-90" style={{ animation: "float 5s ease-in-out infinite" }} />
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <h2 className="text-[clamp(24px,3.5vw,40px)] font-extrabold tracking-tight text-white mb-4">{t("landing.cta2.title")}</h2>
                    <p className="text-base text-indigo-100 leading-relaxed mb-8 max-w-[480px]">{t("landing.cta2.desc")}</p>
                    <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
                      <button onClick={() => showView("getstarted")} data-testid="button-bottom-cta" className="px-8 py-3.5 rounded-xl text-[15px] font-semibold text-indigo-700 bg-white hover:bg-indigo-50 shadow-lg transition-all cursor-pointer">
                        {t("landing.hero.ctaTrial")}
                      </button>
                      <button onClick={() => showView("demo")} data-testid="button-bottom-demo" className="px-8 py-3.5 rounded-xl text-[15px] font-medium text-white border border-white/30 hover:bg-white/10 transition-all cursor-pointer flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        {t("landing.cta2.ctaDemoFirst")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <footer className="pt-14 pb-8 px-6 max-w-[1100px] mx-auto border-t border-slate-100">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
                <div className="col-span-2 md:col-span-1">
                  <div className="flex items-center gap-2 mb-3 cursor-pointer" onClick={() => showView("landing")}>
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[16px] font-extrabold">Argi<span className="text-indigo-600">Flow</span></span>
                  </div>
                  <p className="text-[12px] text-slate-400 leading-relaxed max-w-[200px]">{t("landing.footer.tagline")}</p>
                </div>
                {[
                  { title: t("landing.footer.product"), id: "product", links: [{ id: "features", label: t("landing.footer.features"), action: () => scrollToSection("features-section") }, { id: "pricing", label: t("landing.footer.pricing"), action: () => scrollToSection("pricing-section") }, { id: "demo", label: t("landing.footer.demo"), action: () => showView("demo") }] },
                  { title: t("landing.footer.company"), id: "company", links: [{ id: "about", label: t("landing.footer.about") }, { id: "blog", label: t("landing.footer.blog") }, { id: "contact", label: t("landing.footer.contact") }] },
                  { title: t("landing.footer.resources"), id: "resources", links: [{ id: "docs", label: t("landing.footer.docs") }, { id: "help", label: t("landing.footer.helpCenter") }, { id: "status", label: t("landing.footer.status") }] },
                  { title: t("landing.footer.legal"), id: "legal", links: [{ id: "privacy", label: t("landing.footer.privacy") }, { id: "terms", label: t("landing.footer.terms") }, { id: "security", label: t("landing.footer.security") }] },
                ].map((col, i) => (
                  <div key={i}>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">{col.title}</div>
                    <ul className="flex flex-col gap-2">
                      {col.links.map((link) => (
                        <li key={link.id} data-testid={`link-footer-${link.id}`} className="text-[13px] text-slate-400 hover:text-slate-700 cursor-pointer transition-colors" onClick={link.action}>{link.label}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-5 text-[12px] text-slate-300 border-t border-slate-100">
                <span>{t("landing.footer.copyright")}</span>
                <span className="text-indigo-500">info@argilette.com</span>
              </div>
            </footer>
          </div>
        )}

        {currentView === "demo" && (
          <div className="relative min-h-screen pt-24 pb-16 px-6 max-w-[1100px] mx-auto" style={{ animation: "fadeUp .5s ease both" }}>
            <div className="mb-6">
              <span className="inline-flex items-center text-[11px] font-semibold text-indigo-600 uppercase tracking-widest px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-3">{t("landing.demo.badge")}</span>
              <h2 className="text-[clamp(24px,3.5vw,40px)] font-extrabold tracking-tight mb-2">{t("landing.demo.title")}</h2>
              <p className="text-sm text-slate-400">{t("landing.demo.desc")}</p>
            </div>
            <div className="flex gap-1 p-1 rounded-xl w-fit mb-8 bg-slate-100 border border-slate-200">
              {([["leads", t("landing.demo.tabLeads")], ["outreach", t("landing.demo.tabOutreach")], ["voice", t("landing.demo.tabVoice")], ["email", t("landing.demo.tabEmail")]] as [DemoTab, string][]).map(([k, label]) => (
                <button key={k} onClick={() => setActiveDemo(k)} data-testid={`button-demo-tab-${k}`} className={`px-5 py-2.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all border-0 ${activeDemo === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 bg-transparent"}`}>
                  {label}
                </button>
              ))}
            </div>

            {activeDemo === "leads" && (
              <div style={{ animation: "fadeUp .4s ease both" }}>
                <div className="rounded-2xl p-7 bg-white border border-slate-200 shadow-sm mb-5">
                  <div className="flex gap-3 mb-5 flex-wrap">
                    <input value={demoIndustry} onChange={e => setDemoIndustry(e.target.value)} placeholder={t("landing.demo.industryPlaceholder")} data-testid="input-demo-industry" className="flex-1 min-w-[160px] rounded-xl px-4 py-3 text-sm text-slate-700 outline-none border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-slate-50 placeholder:text-slate-400" />
                    <input value={demoLocation} onChange={e => setDemoLocation(e.target.value)} placeholder={t("landing.demo.locationPlaceholder")} data-testid="input-demo-location" className="flex-1 min-w-[160px] rounded-xl px-4 py-3 text-sm text-slate-700 outline-none border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-slate-50 placeholder:text-slate-400" />
                    <input value={demoTitle} onChange={e => setDemoTitle(e.target.value)} placeholder={t("landing.demo.titlePlaceholder")} data-testid="input-demo-title" className="flex-1 min-w-[160px] rounded-xl px-4 py-3 text-sm text-slate-700 outline-none border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-slate-50 placeholder:text-slate-400" />
                    <button onClick={runLeadGen} disabled={leadRunning} data-testid="button-run-lead-gen" className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all">
                      {t("landing.demo.generateLeads")}
                    </button>
                  </div>
                  {leadStatus && <div className="text-sm text-slate-500 py-3 flex items-center gap-2"><div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />{leadStatus}</div>}
                  {leadResults.length > 0 && (
                    <div style={{ animation: "fadeUp .4s ease both" }}>
                      <div className="text-[13px] text-slate-500 mb-3"><strong className="text-indigo-600">{leadResults.length}</strong> {t("landing.demo.leadsFound")}</div>
                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-slate-50">
                              {[t("landing.demo.thName"), t("landing.demo.thTitle"), t("landing.demo.thCompany"), t("landing.demo.thEmail"), t("landing.demo.thPhone"), t("landing.demo.thScore")].map(h => (
                                <th key={h} className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-2.5 text-left border-b border-slate-100">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {leadResults.map((l, i) => (
                              <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="px-3 py-3 text-[13px] font-medium text-slate-700 border-b border-slate-50">{l.name}</td>
                                <td className="px-3 py-3 text-[13px] text-slate-400 border-b border-slate-50">{l.title}</td>
                                <td className="px-3 py-3 text-[13px] text-slate-600 border-b border-slate-50">{l.company}</td>
                                <td className="px-3 py-3 text-[13px] text-indigo-600 border-b border-slate-50">{l.email}</td>
                                <td className="px-3 py-3 text-[13px] text-slate-400 border-b border-slate-50">{l.phone}</td>
                                <td className="px-3 py-3 text-[13px] border-b border-slate-50">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${l.stype === "high" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{l.score}</span>
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
                <div className="rounded-2xl p-7 bg-white border border-slate-200 shadow-sm">
                  <div className="flex gap-0 mb-6 overflow-x-auto">
                    {[
                      { label: t("landing.demo.discovered"), count: 127, sub: t("landing.demo.newLeads"), done: true },
                      { label: t("landing.demo.enriched"), count: 98, sub: t("landing.demo.verified"), done: true },
                      { label: t("landing.demo.contacted"), count: 64, sub: t("landing.demo.emailSent"), active: true },
                      { label: t("landing.demo.replied"), count: 23, sub: t("landing.demo.rate17") },
                      { label: t("landing.demo.meetingLabel"), count: 11, sub: t("landing.demo.booked") },
                    ].map((s, i, arr) => (
                      <div key={i} className={`flex-1 min-w-[90px] px-3 py-3.5 text-center relative rounded-lg mx-0.5 ${s.done ? "bg-emerald-50 border border-emerald-100" : s.active ? "bg-indigo-50 border border-indigo-200" : "bg-slate-50 border border-slate-100"}`}>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</div>
                        <div className="text-xl font-extrabold tracking-tight my-0.5">{s.count}</div>
                        <div className="text-[10px] text-slate-400">{s.sub}</div>
                        {i < arr.length - 1 && <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm z-10">&rarr;</span>}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-slate-700">{t("landing.demo.liveActivity")}</span>
                    <button onClick={simulateOutreach} data-testid="button-run-outreach" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 cursor-pointer hover:shadow-lg transition-all">
                      {t("landing.demo.runNextCycle")}
                    </button>
                  </div>
                  <div className="flex flex-col">
                    {activityItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 py-3" style={{ borderBottom: i < activityItems.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.icon === "cal" ? "bg-blue-50" : "bg-indigo-50"}`}>
                          {item.icon === "mail" && <Mail className="w-4 h-4 text-indigo-500" />}
                          {item.icon === "reply" && <MessageSquare className="w-4 h-4 text-indigo-500" />}
                          {item.icon === "cal" && <Calendar className="w-4 h-4 text-blue-500" />}
                          {item.icon === "send" && <Send className="w-4 h-4 text-indigo-500" />}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-slate-700">{t(item.titleKey)}</div>
                          <div className="text-[11px] text-slate-400">{t(item.timeKey)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeDemo === "voice" && (
              <div style={{ animation: "fadeUp .4s ease both" }}>
                <div className="rounded-2xl p-7 bg-white border border-slate-200 shadow-sm">
                  <div className="flex flex-col items-center py-10 gap-5">
                    <button onClick={simulateCall} data-testid="button-simulate-call" className={`w-24 h-24 rounded-full border-none cursor-pointer flex items-center justify-center transition-all hover:scale-105 bg-gradient-to-br from-indigo-600 to-violet-600 shadow-xl shadow-indigo-200 ${callState === "calling" ? "voice-pulse" : ""}`}>
                      {callState === "calling" ? <PhoneCall className="w-8 h-8 text-white" /> : <Phone className="w-8 h-8 text-white" />}
                    </button>
                    <div className="text-[15px] font-semibold text-slate-700">{callStatus || t("landing.demo.clickToSimulate")}</div>
                    {showTranscript && (
                      <div ref={transcriptRef} className="bg-slate-50 rounded-xl p-5 w-full max-w-[500px] max-h-[220px] overflow-y-auto text-[13px] leading-relaxed border border-slate-200">
                        {callTranscript.map((line, i) => (
                          <div key={i} className={`mb-2 ${line.role === "ai" ? "text-indigo-600" : "text-slate-500"}`}>
                            <strong>{line.role === "ai" ? "AI:" : "Dr. Torres:"}</strong> {line.text}
                          </div>
                        ))}
                        {callTranscript.length === 0 && <div className="text-slate-400">{t("landing.demo.waitingConnection")}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeDemo === "email" && (
              <div style={{ animation: "fadeUp .4s ease both" }}>
                <div className="rounded-2xl p-7 bg-white border border-slate-200 shadow-sm">
                  <div className="text-sm font-semibold text-slate-700 mb-5">{t("landing.demo.emailWarmupDashboard")}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                    {[
                      { email: "outreach@argilette.co", pct: 92, sent: "1,247", rep: "94%" },
                      { email: "sales@argilette.co", pct: 78, sent: "892", rep: "87%" },
                      { email: "hello@argilette.co", pct: 85, sent: "1,031", rep: "91%" },
                      { email: "team@argilette.co", pct: 41, sent: "234", rep: "72%" },
                    ].map((e, i) => (
                      <div key={i} className="rounded-xl p-4 bg-slate-50 border border-slate-100">
                        <div className="text-[13px] font-medium text-slate-700 mb-2.5">{e.email}</div>
                        <div className="h-1.5 rounded bg-slate-200 mb-2">
                          <div className="h-1.5 rounded transition-all duration-1000" style={{ width: `${e.pct}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>{t("landing.demo.warmupLabel")}: {e.pct}%</span>
                          <span>{t("landing.demo.sentLabel")}: {e.sent}</span>
                          <span>{t("landing.demo.reputationLabel")}: {e.rep}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: t("landing.demo.activeDomains"), val: "4", color: "text-indigo-600" },
                      { label: t("landing.demo.avgReputation"), val: "92%", color: "text-emerald-600" },
                      { label: t("landing.demo.bounceRate"), val: "0.1%", color: "text-slate-700" },
                      { label: t("landing.demo.openRate"), val: "47%", color: "text-amber-600" },
                    ].map((s, i) => (
                      <div key={i} className="rounded-xl p-4 bg-slate-50 border border-slate-100 text-center">
                        <div className={`text-2xl font-extrabold tracking-tight mb-0.5 ${s.color}`}>{s.val}</div>
                        <div className="text-[11px] text-slate-400">{s.label}</div>
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
                  <div className={`flex items-center gap-2 text-[13px] font-medium ${n < gsStep ? "text-indigo-600" : n === gsStep ? "text-slate-900" : "text-slate-400"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold ${n === gsStep ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200" : n < gsStep ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : "bg-slate-50 text-slate-400 border border-slate-200"}`}>
                      {n < gsStep ? <Check className="w-3 h-3" /> : n}
                    </div>
                    <span className="hidden sm:inline">{[t("landing.getstarted.step1"), t("landing.getstarted.step2"), t("landing.getstarted.step3")][n - 1]}</span>
                  </div>
                  {n < 3 && <div className="w-12 h-px bg-slate-200 mx-3" />}
                </div>
              ))}
            </div>

            {gsStep === 1 && (
              <div style={{ animation: "fadeUp .4s ease both" }}>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-extrabold tracking-tight mb-2">{t("landing.getstarted.chooseTitle")}</h2>
                  <p className="text-sm text-slate-400">{t("landing.getstarted.choosePre")} <strong className="text-indigo-600">{t("landing.getstarted.freeTrial")}</strong> {t("landing.getstarted.choosePost")}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {plans.map((p) => (
                    <div key={p.name} onClick={() => setSelectedPlan({ name: p.name, price: p.price })} data-testid={`button-select-plan-${p.name.toLowerCase().replace(/\s/g, "-")}`} className={`rounded-2xl p-6 cursor-pointer relative transition-all hover:-translate-y-0.5 bg-white border-2 ${selectedPlan.name === p.name ? "border-indigo-500 shadow-lg shadow-indigo-100" : "border-slate-100 hover:border-slate-200"}`}>
                      <div className={`absolute top-4 right-4 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center transition-opacity ${selectedPlan.name === p.name ? "opacity-100" : "opacity-0"}`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      {p.popular && <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-600 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 mb-3">{t("landing.pricing2.mostPopular")}</span>}
                      <div className="text-[15px] font-semibold text-slate-700 mb-1">{p.name}</div>
                      <div className="text-3xl font-extrabold tracking-tight mb-0.5">{p.price}<sub className="text-sm font-normal text-slate-400">{t("landing.pricing2.perMonth")}</sub></div>
                      <div className="text-[12px] text-slate-400 mb-4">{p.tagline}</div>
                      <ul className="flex flex-col gap-1.5">
                        {p.features.map((f, j) => (
                          <li key={j} className="text-[12px] flex gap-1.5 text-slate-500"><Check className="w-3 h-3 text-indigo-500 mt-0.5 shrink-0" />{f}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <button onClick={() => { if (selectedPlan.name) goToStep(2); else showToast("warn", t("landing.getstarted.pleaseSelect")); }} data-testid="button-gs-continue-1" className="px-10 py-3.5 rounded-xl text-[15px] font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer">
                    {t("landing.getstarted.continue")} <ArrowRight className="inline w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            )}

            {gsStep === 2 && (
              <div style={{ animation: "fadeUp .4s ease both" }}>
                <button onClick={() => goToStep(1)} data-testid="button-gs-back-1" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] text-slate-500 cursor-pointer hover:text-slate-700 transition-all mb-6 bg-white border border-slate-200">
                  <ArrowLeft className="w-3.5 h-3.5" /> {t("landing.getstarted.back")}
                </button>
                <div className="rounded-2xl p-10 max-w-[560px] mx-auto bg-white border border-slate-200 shadow-lg">
                  <div className="flex justify-between items-center rounded-xl px-4 py-3 mb-6 bg-indigo-50 border border-indigo-100">
                    <span className="text-sm font-semibold text-slate-700">{selectedPlan.name} {t("landing.getstarted.planLabel")}</span>
                    <span className="text-lg font-extrabold text-indigo-600">{selectedPlan.price}{t("landing.pricing2.perMonth")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t("landing.getstarted.firstName")}</label>
                      <input value={gsFirstName} onChange={e => setGsFirstName(e.target.value)} data-testid="input-gs-firstname" className="w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-slate-50" placeholder="John" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t("landing.getstarted.lastName")}</label>
                      <input value={gsLastName} onChange={e => setGsLastName(e.target.value)} data-testid="input-gs-lastname" className="w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-slate-50" placeholder="Smith" />
                    </div>
                  </div>
                  {[
                    { label: t("landing.getstarted.businessName"), val: gsBusiness, set: setGsBusiness, id: "input-gs-business", ph: "Acme Corp" },
                    { label: t("landing.getstarted.email"), val: gsEmail, set: setGsEmail, id: "input-gs-email", ph: "john@acme.com", type: "email" },
                    { label: t("landing.getstarted.phone"), val: gsPhone, set: setGsPhone, id: "input-gs-phone", ph: "(555) 123-4567" },
                  ].map((f) => (
                    <div key={f.id} className="mb-4">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{f.label}</label>
                      <input value={f.val} onChange={e => f.set(e.target.value)} type={f.type || "text"} data-testid={f.id} className="w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-slate-50" placeholder={f.ph} />
                    </div>
                  ))}
                  <div className="mb-4">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t("landing.getstarted.industry")}</label>
                    <select value={gsIndustry} onChange={e => setGsIndustry(e.target.value)} data-testid="select-gs-industry" className="w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none border border-slate-200 focus:border-indigo-400 bg-slate-50">
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
                  <div className="mb-4">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{t("landing.getstarted.targetCustomer")}</label>
                    <textarea value={gsTarget} onChange={e => setGsTarget(e.target.value)} data-testid="input-gs-target" className="w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-slate-50 resize-y min-h-[80px]" placeholder={t("landing.getstarted.targetPlaceholder")} />
                  </div>
                  <button onClick={() => goToStep(3)} data-testid="button-gs-continue-2" className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 cursor-pointer hover:shadow-lg transition-all mt-1">
                    {t("landing.getstarted.continuePayment")}
                  </button>
                </div>
              </div>
            )}

            {gsStep === 3 && (
              <div style={{ animation: "fadeUp .4s ease both" }}>
                <button onClick={() => goToStep(2)} data-testid="button-gs-back-2" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] text-slate-500 cursor-pointer hover:text-slate-700 transition-all mb-6 bg-white border border-slate-200">
                  <ArrowLeft className="w-3.5 h-3.5" /> {t("landing.getstarted.back")}
                </button>
                <div className="rounded-2xl p-10 max-w-[540px] mx-auto bg-white border border-slate-200 shadow-lg text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 bg-indigo-50 border border-indigo-100">
                    <CreditCard className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight mb-2">{t("landing.getstarted.completeSetup")}</h2>
                  <p className="text-sm text-slate-400 mb-8 leading-relaxed">{t("landing.getstarted.stripeDesc", { plan: selectedPlan.name })}</p>
                  {(gsFirstName || gsBusiness || gsEmail) && (
                    <div className="text-left rounded-xl p-4 mb-4 bg-slate-50 border border-slate-100">
                      {gsFirstName && <div className="flex justify-between text-[13px] mb-1"><span className="text-slate-400">{t("landing.getstarted.nameLabel")}</span><span className="font-medium text-slate-700">{gsFirstName} {gsLastName}</span></div>}
                      {gsBusiness && <div className="flex justify-between text-[13px] mb-1"><span className="text-slate-400">{t("landing.getstarted.businessLabel")}</span><span className="font-medium text-slate-700">{gsBusiness}</span></div>}
                      {gsEmail && <div className="flex justify-between text-[13px]"><span className="text-slate-400">{t("landing.getstarted.emailLabel")}</span><span className="font-medium text-slate-700">{gsEmail}</span></div>}
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-xl px-4 py-3 mb-6 bg-indigo-50 border border-indigo-100">
                    <span className="text-[13px] text-slate-500">{t("landing.getstarted.monthlySubscription")}</span>
                    <span className="text-xl font-extrabold text-indigo-600">{selectedPlan.price}{t("landing.pricing2.perMonth")}</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (checkoutLoading) return;
                      setCheckoutLoading(true);
                      try {
                        const planKey = selectedPlan.name === "Starter" ? "starter" : selectedPlan.name === "Growth" ? "growth" : "agency";
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
                    className={`w-full py-3.5 rounded-xl text-[15px] font-semibold cursor-pointer transition-all mb-4 flex items-center justify-center gap-2 text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-200 ${checkoutLoading ? "opacity-60" : "hover:shadow-xl hover:-translate-y-0.5"}`}
                  >
                    {checkoutLoading ? (<><RotateCw className="w-4 h-4 animate-spin" /> {t("landing.getstarted.redirecting")}</>) : (<>{t("landing.getstarted.payWithStripe")} <ArrowRight className="w-4 h-4" /></>)}
                  </button>
                  <div className="flex items-center justify-center gap-4 mb-6 text-[12px] text-slate-400">
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {t("landing.getstarted.secureCheckout")}</span>
                    <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> {t("landing.getstarted.cardsAccepted")}</span>
                    <span className="flex items-center gap-1"><Check className="w-3 h-3" /> {t("landing.getstarted.cancelAnytime")}</span>
                  </div>
                  <div className="text-left">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">{t("landing.getstarted.whatHappensNext")}</div>
                    {[t("landing.getstarted.next1"), t("landing.getstarted.next2"), t("landing.getstarted.next3")].map((step, i) => (
                      <div key={i} className="flex gap-3 mb-2.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-indigo-600 shrink-0 bg-indigo-50 border border-indigo-100">{i + 1}</div>
                        <span className="text-[13px] text-slate-500 leading-relaxed pt-0.5">{step}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 text-[12px] text-slate-400 border-t border-slate-100">
                    {t("landing.getstarted.questionsEmail")} <a href="mailto:info@argilette.com" className="text-indigo-600 no-underline">info@argilette.com</a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
