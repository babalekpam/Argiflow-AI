import { ArrowLeft, Zap, HelpCircle, MessageSquare, Mail, BookOpen, ArrowRight, Search, Phone, FileText, Settings, CreditCard, Users, Shield } from "lucide-react";

const helpCategories = [
  {
    icon: Settings,
    title: "Account & Setup",
    articles: ["How to create your account", "Setting up your first campaign", "Configuring ARIA Business Manager", "Adding team members", "Connecting your email accounts"],
  },
  {
    icon: Mail,
    title: "Email & Outreach",
    articles: ["Setting up email warmup", "Creating email sequences", "Configuring sending domains (SPF/DKIM/DMARC)", "Managing your unified inbox", "Improving email deliverability"],
  },
  {
    icon: Phone,
    title: "Voice AI",
    articles: ["Connecting Twilio for voice calls", "Configuring Voice AI scripts", "Understanding call transcripts", "Booking meetings via voice AI", "Troubleshooting call quality"],
  },
  {
    icon: Users,
    title: "CRM & Leads",
    articles: ["Importing existing contacts", "Using lead scoring", "Managing sales pipelines", "Setting up calendar booking", "Creating invoices and proposals"],
  },
  {
    icon: CreditCard,
    title: "Billing & Plans",
    articles: ["Understanding pricing tiers", "Upgrading or downgrading your plan", "Managing payment methods", "Understanding credits system", "Cancellation and refund policy"],
  },
  {
    icon: Shield,
    title: "Security & Privacy",
    articles: ["Data protection practices", "Two-factor authentication", "API key management", "GDPR compliance", "Data export and deletion"],
  },
];

export default function PublicHelpPage() {
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

      <div className="pt-32 pb-24 px-6 max-w-[1100px] mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-300 uppercase tracking-widest px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-5">
            <HelpCircle className="w-3.5 h-3.5" />
            Help Center
          </span>
          <h1 className="text-[clamp(32px,5vw,52px)] font-extrabold tracking-tight mb-4" data-testid="text-help-title">
            How Can We <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Help?</span>
          </h1>
          <p className="text-lg text-white/40 max-w-[560px] mx-auto leading-relaxed mb-8">
            Find answers to common questions, step-by-step guides, and troubleshooting tips.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          {[
            { icon: BookOpen, title: "Documentation", desc: "In-depth guides for every feature", link: "/docs" },
            { icon: Mail, title: "Email Support", desc: "info@argilette.com", link: "/contact" },
            { icon: MessageSquare, title: "Live Chat", desc: "Talk to our AI assistant", link: "/" },
          ].map((c, i) => (
            <a key={i} href={c.link} className="rounded-2xl p-6 bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/20 transition-all text-center no-underline group" data-testid={`card-help-quick-${i}`}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                <c.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-[15px] font-semibold text-white group-hover:text-indigo-300 transition-colors mb-1">{c.title}</h3>
              <p className="text-[13px] text-white/30">{c.desc}</p>
            </a>
          ))}
        </div>

        <div className="space-y-8">
          {helpCategories.map((cat, i) => (
            <div key={i} className="rounded-2xl p-6 md:p-8 bg-white/[0.03] border border-white/[0.08]" data-testid={`section-help-${i}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/10 flex items-center justify-center">
                  <cat.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h2 className="text-lg font-bold">{cat.title}</h2>
              </div>
              <ul className="space-y-2">
                {cat.articles.map((article, j) => (
                  <li key={j} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group" data-testid={`help-article-${i}-${j}`}>
                    <span className="text-[14px] text-white/50 group-hover:text-white/70 transition-colors">{article}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white/10 group-hover:text-indigo-400 transition-colors" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <footer className="py-8 px-6 max-w-[900px] mx-auto border-t border-white/5 text-center">
        <p className="text-[12px] text-white/15">&copy; {new Date().getFullYear()} ArgiFlow AI by ARGILETTE Labs. All rights reserved.</p>
      </footer>
    </div>
  );
}
