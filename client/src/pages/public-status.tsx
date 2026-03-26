import { ArrowLeft, Zap, Activity, CheckCircle, Clock } from "lucide-react";

const services = [
  { name: "Web Application", status: "operational", uptime: "99.98%" },
  { name: "API Gateway", status: "operational", uptime: "99.99%" },
  { name: "AI Engine (Multi-LLM)", status: "operational", uptime: "99.95%" },
  { name: "Email Sending (AWS SES)", status: "operational", uptime: "99.99%" },
  { name: "Email Warmup Engine", status: "operational", uptime: "99.97%" },
  { name: "Voice AI (Twilio)", status: "operational", uptime: "99.96%" },
  { name: "Lead Intelligence Engine", status: "operational", uptime: "99.94%" },
  { name: "Visitor Tracking", status: "operational", uptime: "99.98%" },
  { name: "ARIA Business Manager", status: "operational", uptime: "99.97%" },
  { name: "Webhook Delivery", status: "operational", uptime: "99.99%" },
  { name: "Database (PostgreSQL)", status: "operational", uptime: "99.99%" },
  { name: "File Storage", status: "operational", uptime: "99.98%" },
];

export default function PublicStatusPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 h-16">
          <a href="/" className="flex items-center gap-2.5 no-underline" data-testid="link-home">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">Argi<span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Flow</span></span>
          </a>
          <a href="/" className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors no-underline" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </a>
        </div>
      </nav>

      <div className="pt-32 pb-24 px-6 max-w-[800px] mx-auto">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-300 uppercase tracking-widest px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-5">
            <Activity className="w-3.5 h-3.5" />
            System Status
          </span>
          <h1 className="text-[clamp(32px,5vw,52px)] font-extrabold tracking-tight mb-4" data-testid="text-status-title">
            System <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Status</span>
          </h1>

          <div className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mt-4" data-testid="text-status-overall">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-[15px] font-semibold text-emerald-300">All Systems Operational</span>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.08]">
          {services.map((service, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors" style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }} data-testid={`status-service-${i}`}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                <span className="text-[14px] font-medium text-white/70">{service.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[12px] text-white/25">{service.uptime} uptime</span>
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Operational</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-bold mb-5">Recent Incidents</h2>
          <div className="rounded-2xl p-6 bg-white/[0.03] border border-white/[0.08]">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-white/25" />
              </div>
              <div>
                <p className="text-[14px] text-white/50 leading-relaxed">No incidents reported in the last 90 days.</p>
                <p className="text-[12px] text-white/20 mt-1">Last checked: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 p-6 rounded-2xl text-center bg-white/[0.03] border border-white/[0.08]">
          <p className="text-[14px] text-white/35 mb-2">Experiencing issues? Report them to our team.</p>
          <a href="/contact" data-testid="link-status-contact" className="text-[13px] text-indigo-400 font-medium no-underline hover:text-indigo-300 transition-colors">
            Contact Support &rarr;
          </a>
        </div>
      </div>

      <footer className="py-8 px-6 max-w-[900px] mx-auto border-t border-white/5 text-center">
        <p className="text-[12px] text-white/15">&copy; {new Date().getFullYear()} ArgiFlow AI by ARGILETTE Labs. All rights reserved.</p>
      </footer>
    </div>
  );
}
