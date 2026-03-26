import { ArrowLeft, Zap, Shield } from "lucide-react";

export default function PublicPrivacyPage() {
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
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-300 uppercase tracking-widest px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-5">
            <Shield className="w-3.5 h-3.5" />
            Legal
          </span>
          <h1 className="text-[clamp(32px,5vw,48px)] font-extrabold tracking-tight mb-4" data-testid="text-privacy-title">Privacy Policy</h1>
          <p className="text-[14px] text-white/30">Last updated: March 1, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-3 text-white">1. Introduction</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">ARGILETTE Labs ("we," "our," or "us") operates the ArgiFlow platform (argilette.co). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, website, and related services.</p>
            <p className="text-[14px] text-white/40 leading-relaxed mt-3">By using ArgiFlow, you consent to the data practices described in this policy. If you do not agree with the terms, please discontinue use of the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">2. Information We Collect</h2>
            <h3 className="text-[16px] font-semibold text-white/70 mt-4 mb-2">2.1 Account Information</h3>
            <p className="text-[14px] text-white/40 leading-relaxed">When you create an account, we collect your name, email address, company name, industry, phone number, and billing information necessary to provide and manage your subscription.</p>
            <h3 className="text-[16px] font-semibold text-white/70 mt-4 mb-2">2.2 Usage Data</h3>
            <p className="text-[14px] text-white/40 leading-relaxed">We automatically collect information about how you interact with the platform, including pages visited, features used, campaign performance metrics, AI agent activity logs, and session duration.</p>
            <h3 className="text-[16px] font-semibold text-white/70 mt-4 mb-2">2.3 Lead & Contact Data</h3>
            <p className="text-[14px] text-white/40 leading-relaxed">Data you import or generate through the platform (contacts, leads, email content, call transcripts) is stored securely and remains your property. We do not sell, share, or use your contact data for any purpose other than providing the service.</p>
            <h3 className="text-[16px] font-semibold text-white/70 mt-4 mb-2">2.4 Visitor Tracking Data</h3>
            <p className="text-[14px] text-white/40 leading-relaxed">If you use our visitor tracking snippet on your website, we collect anonymous visitor data (IP addresses, page views, session behavior) on your behalf. This data is processed solely for your use and is not shared with third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">3. How We Use Your Information</h2>
            <ul className="space-y-2 text-[14px] text-white/40 leading-relaxed list-disc list-inside">
              <li>To provide, maintain, and improve the ArgiFlow platform and services</li>
              <li>To process your transactions and manage your subscription</li>
              <li>To send you service-related communications (account alerts, security notices, billing updates)</li>
              <li>To provide customer support and respond to your inquiries</li>
              <li>To analyze usage patterns and improve platform performance</li>
              <li>To detect, prevent, and address technical issues or security threats</li>
              <li>To comply with legal obligations and enforce our terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">4. Data Sharing & Third Parties</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">We do not sell your personal information. We share data only with trusted service providers necessary to operate the platform:</p>
            <ul className="space-y-2 text-[14px] text-white/40 leading-relaxed list-disc list-inside mt-3">
              <li><strong className="text-white/60">AI Providers</strong> (OpenAI, Anthropic, etc.): To process AI requests on your behalf, subject to their respective privacy policies</li>
              <li><strong className="text-white/60">Amazon Web Services (SES)</strong>: For email delivery services</li>
              <li><strong className="text-white/60">Twilio</strong>: For SMS and voice calling services</li>
              <li><strong className="text-white/60">Stripe</strong>: For payment processing</li>
              <li><strong className="text-white/60">Deepgram</strong>: For speech-to-text processing of voice calls</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">5. Data Security</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">We implement industry-standard security measures including encryption in transit (TLS), encrypted storage, secure session management, and regular security assessments. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">6. Data Retention</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">We retain your data for as long as your account is active or as needed to provide services. Upon account deletion, we remove your personal data within 30 days, except where retention is required by law. Anonymized analytics data may be retained indefinitely.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">7. Your Rights</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">Depending on your jurisdiction, you may have the right to: access your personal data, correct inaccurate data, request deletion of your data, object to certain processing, receive a portable copy of your data, and withdraw consent. To exercise these rights, contact us at <a href="mailto:info@argilette.com" className="text-indigo-400 no-underline">info@argilette.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">8. Cookies & Tracking</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">We use essential cookies for authentication and session management. We use analytics cookies to understand platform usage. You can control cookie preferences through your browser settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">9. Changes to This Policy</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">We may update this Privacy Policy periodically. We will notify you of material changes by posting the updated policy on this page and updating the "Last updated" date. Continued use of the platform constitutes acceptance of the revised policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">10. Contact Us</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">If you have questions about this Privacy Policy or our data practices, contact us at:</p>
            <div className="mt-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[14px] text-white/40">
              <p><strong className="text-white/60">ARGILETTE Labs</strong></p>
              <p>Email: <a href="mailto:info@argilette.com" className="text-indigo-400 no-underline">info@argilette.com</a></p>
              <p>Website: <a href="https://argilette.co" className="text-indigo-400 no-underline">argilette.co</a></p>
            </div>
          </section>
        </div>
      </div>

      <footer className="py-8 px-6 max-w-[900px] mx-auto border-t border-white/5 text-center">
        <p className="text-[12px] text-white/15">&copy; {new Date().getFullYear()} ArgiFlow AI by ARGILETTE Labs. All rights reserved.</p>
      </footer>
    </div>
  );
}
