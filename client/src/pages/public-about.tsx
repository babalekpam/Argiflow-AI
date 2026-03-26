import { ArrowLeft, Zap, Globe, Users, Rocket, Shield, Brain, Target } from "lucide-react";

export default function PublicAboutPage() {
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

      <div className="pt-32 pb-24 px-6 max-w-[900px] mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-300 uppercase tracking-widest px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-5">
            <Globe className="w-3.5 h-3.5" />
            About Us
          </span>
          <h1 className="text-[clamp(32px,5vw,56px)] font-extrabold tracking-tight leading-[1.1] mb-6" data-testid="text-about-title">
            We Build the Future of<br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Autonomous Business Growth</span>
          </h1>
          <p className="text-lg text-white/40 leading-relaxed max-w-[640px] mx-auto">
            ArgiFlow is an AI automation platform built by ARGILETTE Labs — a technology company headquartered in the United States, on a mission to make enterprise-grade sales intelligence and marketing automation accessible to every business.
          </p>
        </div>

        <div className="space-y-20">
          <section>
            <h2 className="text-2xl font-bold mb-4" data-testid="text-mission-title">Our Mission</h2>
            <p className="text-white/40 leading-relaxed mb-4">
              We believe that small and mid-sized businesses deserve the same powerful tools that Fortune 500 companies use to acquire customers — without the six-figure price tags, complex integrations, or dedicated IT teams. ArgiFlow was built to level the playing field.
            </p>
            <p className="text-white/40 leading-relaxed">
              Our platform combines AI-powered lead intelligence, autonomous email outreach, voice AI calling, CRM, marketing automation, and a fully autonomous business manager into a single, affordable solution. One login replaces seven or more separate subscriptions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6" data-testid="text-values-title">What Drives Us</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: Brain, title: "AI-First Engineering", desc: "Every feature is designed with artificial intelligence at its core — not bolted on as an afterthought. Our multi-LLM router supports 9 AI providers for maximum flexibility." },
                { icon: Target, title: "Results Over Features", desc: "We measure success by the revenue our customers generate, not the number of features we ship. Every tool in ArgiFlow exists to drive real business outcomes." },
                { icon: Users, title: "Accessibility", desc: "Enterprise capabilities at small-business pricing. We built ArgiFlow so a solo founder has the same growth engine as a funded startup with a 20-person sales team." },
                { icon: Shield, title: "Trust & Transparency", desc: "Your data is yours. We never sell customer information, and our pricing is straightforward — no hidden fees, no per-seat charges, no surprise add-ons." },
              ].map((v, i) => (
                <div key={i} className="rounded-2xl p-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:border-indigo-500/20 transition-all" data-testid={`card-value-${i}`}>
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/10 flex items-center justify-center mb-4">
                    <v.icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-white mb-2">{v.title}</h3>
                  <p className="text-[13px] text-white/35 leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4" data-testid="text-company-title">The Company</h2>
            <p className="text-white/40 leading-relaxed mb-4">
              ArgiFlow is developed and operated by <strong className="text-white/60">ARGILETTE Labs</strong>, a US-based technology company specializing in AI-driven business automation. Founded with the vision of democratizing sales intelligence, we serve businesses across North America, Europe, and Africa.
            </p>
            <p className="text-white/40 leading-relaxed mb-4">
              Our engineering team combines deep expertise in artificial intelligence, natural language processing, cloud infrastructure, and enterprise SaaS to deliver a platform that works autonomously — finding leads, writing emails, making calls, and booking meetings while you focus on closing deals.
            </p>
            <p className="text-white/40 leading-relaxed">
              We support both Western markets (under the ArgiFlow brand) and African markets (under the TradeFlow brand), with region-specific features, pricing, and currencies tailored to each market's unique needs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6" data-testid="text-numbers-title">ArgiFlow by the Numbers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { num: "40+", label: "Built-in Tools" },
                { num: "9", label: "AI Providers" },
                { num: "13+", label: "AI Agents" },
                { num: "2", label: "Markets Served" },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-6 text-center bg-white/[0.03] border border-white/[0.08]" data-testid={`stat-${i}`}>
                  <div className="text-3xl font-extrabold tracking-tight text-white mb-1">{s.num}</div>
                  <div className="text-[11px] text-white/30 uppercase tracking-wider font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl p-8 md:p-12 text-center" style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.12) 100%)" }}>
            <Rocket className="w-8 h-8 text-indigo-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">Ready to Get Started?</h2>
            <p className="text-white/40 mb-6 max-w-[400px] mx-auto">Join hundreds of businesses already using ArgiFlow to automate their growth.</p>
            <a href="/signup" data-testid="link-about-signup" className="inline-flex px-8 py-3.5 rounded-xl text-[15px] font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-xl shadow-indigo-500/25 transition-all no-underline">
              Start Your 30-Day Free Trial
            </a>
          </section>
        </div>
      </div>

      <footer className="py-8 px-6 max-w-[900px] mx-auto border-t border-white/5 text-center">
        <p className="text-[12px] text-white/15">&copy; {new Date().getFullYear()} ArgiFlow AI by ARGILETTE Labs. All rights reserved.</p>
      </footer>
    </div>
  );
}
