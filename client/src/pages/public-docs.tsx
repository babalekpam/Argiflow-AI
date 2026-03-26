import { ArrowLeft, Zap, BookOpen, ArrowRight, Search, Rocket, Mail, Phone, Users, Brain, BarChart3, Globe, Settings, Shield, Workflow } from "lucide-react";

const docSections = [
  {
    title: "Getting Started",
    icon: Rocket,
    articles: [
      { title: "Quick Start Guide", desc: "Set up your ArgiFlow account and launch your first campaign in under 15 minutes." },
      { title: "Platform Overview", desc: "Understand the core modules — AI Agents, Intelligence, Outreach, CRM, Marketing, and Analytics." },
      { title: "Account Settings", desc: "Configure your profile, team members, billing, and notification preferences." },
      { title: "ARIA Business Manager Setup", desc: "Onboard your autonomous AI business manager and configure approval workflows." },
    ],
  },
  {
    title: "AI Agents",
    icon: Brain,
    articles: [
      { title: "Agent Catalog", desc: "Explore 13+ specialized AI agents — Lead Scout, Email Writer, Voice Caller, and more." },
      { title: "Configuring Agents", desc: "Customize agent behavior, target markets, outreach tone, and working schedules." },
      { title: "Autonomous Outreach Agent", desc: "Set up the 8-step outreach loop that finds, contacts, and books meetings automatically." },
      { title: "Voice AI Calling", desc: "Configure Twilio integration for AI-powered phone calls with Deepgram speech processing." },
    ],
  },
  {
    title: "Sales Intelligence",
    icon: Search,
    articles: [
      { title: "B2B Data Engine", desc: "How ArgiFlow aggregates data from OpenCorporates, SEC EDGAR, Wikidata, and more." },
      { title: "Lead Enrichment", desc: "Auto-enrich contacts with verified emails, phone numbers, social profiles, and tech stack data." },
      { title: "Intent Data & Scoring", desc: "Track buying signals and compute intent scores based on engagement and behavior." },
      { title: "Visitor Intelligence", desc: "Identify anonymous website visitors and cross-reference with email tracking data." },
    ],
  },
  {
    title: "Email & Outreach",
    icon: Mail,
    articles: [
      { title: "Campaign Builder", desc: "Create multi-step email sequences with A/B testing and smart scheduling." },
      { title: "Email Warmup", desc: "Automated domain warming to maximize deliverability before launching campaigns." },
      { title: "Sending Domains", desc: "Configure SPF, DKIM, DMARC for white-label sending via AWS SES." },
      { title: "Unified Inbox", desc: "AI-classified inbox that auto-labels replies by sentiment and intent." },
    ],
  },
  {
    title: "CRM & Pipeline",
    icon: Users,
    articles: [
      { title: "Contact Management", desc: "Organize leads with custom fields, tags, engagement scores, and activity timelines." },
      { title: "Sales Funnels", desc: "Visual Kanban-style pipelines for tracking deals from lead to closed-won." },
      { title: "Calendar & Booking", desc: "Integrated scheduling with automated reminders and booking page links." },
      { title: "Invoicing & E-Signatures", desc: "Generate professional quotes, invoices, and contracts with built-in signing." },
    ],
  },
  {
    title: "Integrations & API",
    icon: Settings,
    articles: [
      { title: "AI Provider Configuration", desc: "Set up and switch between 9 AI providers — OpenAI, Anthropic, Gemini, Mistral, and more." },
      { title: "Twilio Integration", desc: "Connect Twilio for SMS outreach and Voice AI calling capabilities." },
      { title: "Stripe Payments", desc: "Configure Stripe for subscription billing and payment processing." },
      { title: "Webhook & API Reference", desc: "Connect ArgiFlow to your existing tools with webhooks and REST API." },
    ],
  },
];

export default function PublicDocsPage() {
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
            <BookOpen className="w-3.5 h-3.5" />
            Documentation
          </span>
          <h1 className="text-[clamp(32px,5vw,52px)] font-extrabold tracking-tight mb-4" data-testid="text-docs-title">
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Documentation</span> & Guides
          </h1>
          <p className="text-lg text-white/40 max-w-[560px] mx-auto leading-relaxed">
            Everything you need to set up, configure, and get the most out of ArgiFlow.
          </p>
        </div>

        <div className="space-y-10">
          {docSections.map((section, i) => (
            <div key={i} data-testid={`section-docs-${i}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/10 flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold">{section.title}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.articles.map((article, j) => (
                  <div key={j} className="group rounded-xl p-5 bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/20 transition-all cursor-pointer" data-testid={`card-doc-${i}-${j}`}>
                    <h3 className="text-[14px] font-semibold text-white group-hover:text-indigo-300 transition-colors mb-1.5 flex items-center justify-between">
                      {article.title}
                      <ArrowRight className="w-3.5 h-3.5 text-white/15 group-hover:text-indigo-400 transition-colors" />
                    </h3>
                    <p className="text-[13px] text-white/30 leading-relaxed">{article.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 p-8 rounded-2xl text-center bg-white/[0.03] border border-white/[0.08]">
          <h3 className="text-lg font-bold mb-2">Need More Help?</h3>
          <p className="text-white/35 text-sm mb-4">Can't find what you're looking for? Our support team is ready to assist.</p>
          <a href="/contact" data-testid="link-docs-contact" className="inline-flex px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 transition-all no-underline">
            Contact Support
          </a>
        </div>
      </div>

      <footer className="py-8 px-6 max-w-[900px] mx-auto border-t border-white/5 text-center">
        <p className="text-[12px] text-white/15">&copy; {new Date().getFullYear()} ArgiFlow AI by ARGILETTE Labs. All rights reserved.</p>
      </footer>
    </div>
  );
}
