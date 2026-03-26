import { ArrowLeft, Zap, Shield, Lock, Server, Eye, Key, Database, Globe, CheckCircle } from "lucide-react";

export default function PublicSecurityPage() {
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
            <Shield className="w-3.5 h-3.5" />
            Security
          </span>
          <h1 className="text-[clamp(32px,5vw,52px)] font-extrabold tracking-tight mb-4" data-testid="text-security-title">
            Security at <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">ArgiFlow</span>
          </h1>
          <p className="text-lg text-white/40 max-w-[600px] mx-auto leading-relaxed">
            We take the security of your data seriously. Here's how we protect your information and keep the platform safe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
          {[
            { icon: Lock, title: "Encryption in Transit", desc: "All data transmitted between your browser and our servers is protected with TLS 1.3 encryption. API endpoints enforce HTTPS exclusively." },
            { icon: Database, title: "Encrypted Storage", desc: "Customer data is stored in encrypted PostgreSQL databases with automatic backups. Sensitive credentials are encrypted at rest using industry-standard algorithms." },
            { icon: Key, title: "Secure Authentication", desc: "Session-based authentication with secure, httpOnly cookies. Password hashing uses bcrypt with appropriate salt rounds. Email verification required for all accounts." },
            { icon: Eye, title: "Access Controls", desc: "Role-based access control (RBAC) ensures users only access their own data. API keys and secrets are managed through secure environment variables, never stored in code." },
            { icon: Server, title: "Infrastructure Security", desc: "Hosted on enterprise-grade cloud infrastructure with automated security patching, DDoS protection, and network-level firewalls." },
            { icon: Globe, title: "Third-Party Security", desc: "All integrations (OpenAI, Twilio, Stripe, AWS SES) use secure API communication with encrypted credentials. We regularly review third-party security practices." },
          ].map((item, i) => (
            <div key={i} className="rounded-2xl p-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:border-indigo-500/20 transition-all" data-testid={`card-security-${i}`}>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/10 flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-[15px] font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-[13px] text-white/35 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-bold mb-4">Our Security Practices</h2>
            <div className="space-y-3">
              {[
                "All API keys and secrets are stored as encrypted environment variables — never committed to source code",
                "Session tokens are rotated regularly with secure, httpOnly, sameSite cookie attributes",
                "AI provider API keys support Bring Your Own Key (BYOK) with per-user encrypted storage",
                "Email infrastructure uses authenticated sending (SPF, DKIM, DMARC) via AWS SES",
                "Voice AI calls are encrypted end-to-end through Twilio's secure infrastructure",
                "Database connections use SSL/TLS encryption with certificate verification",
                "Regular dependency audits to identify and patch known vulnerabilities",
                "Automated monitoring for suspicious activity and unauthorized access attempts",
              ].map((practice, i) => (
                <div key={i} className="flex items-start gap-3 py-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-[14px] text-white/40 leading-relaxed">{practice}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Data Handling</h2>
            <p className="text-[14px] text-white/40 leading-relaxed mb-3">
              Your data is yours. We follow strict data handling principles:
            </p>
            <ul className="space-y-2 text-[14px] text-white/40 leading-relaxed list-disc list-inside">
              <li>We never sell, share, or use your contact data for purposes other than providing the service</li>
              <li>AI-generated content is processed in real-time and not used to train third-party models</li>
              <li>Visitor tracking data collected through our snippet is processed solely for your account</li>
              <li>Data deletion requests are honored within 30 days</li>
              <li>Account data is automatically purged 30 days after account termination</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Reporting Vulnerabilities</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">
              If you discover a security vulnerability in ArgiFlow, please report it responsibly by emailing <a href="mailto:info@argilette.com" className="text-indigo-400 no-underline">info@argilette.com</a> with the subject line "Security Vulnerability Report." We appreciate responsible disclosure and will respond within 48 hours.
            </p>
          </section>
        </div>
      </div>

      <footer className="py-8 px-6 max-w-[900px] mx-auto border-t border-white/5 text-center">
        <p className="text-[12px] text-white/15">&copy; {new Date().getFullYear()} ArgiFlow AI by ARGILETTE Labs. All rights reserved.</p>
      </footer>
    </div>
  );
}
