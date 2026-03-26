import { ArrowLeft, Zap, FileText } from "lucide-react";

export default function PublicTermsPage() {
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
            <FileText className="w-3.5 h-3.5" />
            Legal
          </span>
          <h1 className="text-[clamp(32px,5vw,48px)] font-extrabold tracking-tight mb-4" data-testid="text-terms-title">Terms of Service</h1>
          <p className="text-[14px] text-white/30">Last updated: March 1, 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-3 text-white">1. Agreement to Terms</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">By accessing or using ArgiFlow (the "Service"), operated by ARGILETTE Labs ("Company," "we," "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service. These terms apply to all users, including visitors, registered users, and paying subscribers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">2. Description of Service</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">ArgiFlow is a B2B sales intelligence and AI automation platform that provides lead generation, email outreach, voice AI calling, CRM, marketing automation, visitor tracking, and autonomous business management tools. The Service is provided "as is" and may be updated, modified, or discontinued at our discretion.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">3. Accounts & Registration</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">To use the Service, you must create an account with accurate and complete information. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized access. You must be at least 18 years old or the age of majority in your jurisdiction to create an account.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">4. Subscription & Billing</h2>
            <p className="text-[14px] text-white/40 leading-relaxed mb-3">ArgiFlow offers tiered subscription plans:</p>
            <ul className="space-y-2 text-[14px] text-white/40 leading-relaxed list-disc list-inside">
              <li><strong className="text-white/60">Starter</strong>: Free for 30 days, no credit card required</li>
              <li><strong className="text-white/60">Pro</strong>: $49/month, billed monthly</li>
              <li><strong className="text-white/60">Agency</strong>: $99/month, billed monthly</li>
            </ul>
            <p className="text-[14px] text-white/40 leading-relaxed mt-3">Paid subscriptions are billed monthly via Stripe. You may upgrade, downgrade, or cancel your subscription at any time. Cancellations take effect at the end of the current billing period. No refunds are provided for partial billing periods unless required by applicable law.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">5. Acceptable Use</h2>
            <p className="text-[14px] text-white/40 leading-relaxed mb-3">You agree to use the Service only for lawful purposes and in compliance with all applicable laws, including anti-spam legislation (CAN-SPAM, GDPR, CASL). You may not:</p>
            <ul className="space-y-2 text-[14px] text-white/40 leading-relaxed list-disc list-inside">
              <li>Send unsolicited emails or messages in violation of applicable anti-spam laws</li>
              <li>Use the platform to harass, abuse, or harm others</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>Use the Service to scrape, mine, or collect data in violation of third-party terms</li>
              <li>Resell, sublicense, or redistribute the Service without written authorization</li>
              <li>Use Voice AI calling features in jurisdictions where AI-generated calls are prohibited</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">6. Your Data & Content</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">You retain ownership of all data and content you upload, import, or create on the platform, including contacts, email templates, campaign content, and call scripts. You grant us a limited license to process your data solely for the purpose of providing the Service. We will not use your data for any other purpose, including training AI models, without your explicit consent.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">7. AI-Generated Content</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">The Service uses artificial intelligence to generate emails, marketing content, call scripts, and business recommendations. AI-generated content is provided as suggestions and should be reviewed before use. We do not guarantee the accuracy, completeness, or suitability of AI-generated content. You are responsible for all content sent through the platform on your behalf.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">8. Credits System</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">Certain actions on the platform consume credits. Credits are deducted atomically per action and are auto-refunded if an action fails. Credit balances are non-transferable and expire at the end of your billing period. Unused credits do not carry over.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">9. Third-Party Services</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">The Service integrates with third-party providers including OpenAI, Anthropic, Twilio, Amazon SES, Stripe, and Deepgram. Your use of these integrations is subject to the respective third-party terms and privacy policies. We are not responsible for the availability or conduct of third-party services.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">10. Limitation of Liability</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">To the maximum extent permitted by law, ARGILETTE Labs shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities, arising from your use of the Service. Our total liability shall not exceed the amount you have paid us in the twelve months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">11. Indemnification</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">You agree to indemnify and hold harmless ARGILETTE Labs, its officers, directors, employees, and agents from any claims, losses, or damages arising from your use of the Service, violation of these terms, or infringement of any third-party rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">12. Termination</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">We may suspend or terminate your account at any time for violation of these terms, with or without notice. Upon termination, your right to use the Service ceases immediately. We will retain your data for 30 days after termination to allow for export, after which it may be permanently deleted.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">13. Changes to Terms</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">We reserve the right to modify these Terms of Service at any time. Material changes will be communicated via email or through the platform. Your continued use of the Service after changes take effect constitutes acceptance of the revised terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">14. Governing Law</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">These terms are governed by the laws of the United States. Any disputes arising from these terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-white">15. Contact</h2>
            <p className="text-[14px] text-white/40 leading-relaxed">For questions about these Terms of Service, contact us at:</p>
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
