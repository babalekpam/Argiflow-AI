import { useState } from "react";
import { ArrowLeft, Zap, HelpCircle, MessageSquare, Mail, BookOpen, ChevronDown, Phone, Settings, CreditCard, Users, Shield } from "lucide-react";

const helpCategories = [
  {
    icon: Settings,
    title: "Account & Setup",
    articles: [
      { q: "How to create your account", a: "Visit argilette.co and click \"Start Your 30-Day Free Trial.\" Fill in your name, email address, and a secure password. No credit card is required. After registration, you'll receive a verification email — click the link to activate your account. Once verified, you'll be guided through a quick onboarding where you set your company name, industry, and target market." },
      { q: "Setting up your first campaign", a: "After logging in, navigate to Email & Outreach > Campaigns and click \"New Campaign.\" Select your target audience from your CRM or upload a CSV. Choose an AI-generated email template or write your own. Configure your sending schedule (time of day, days of week, timezone). Set up follow-up steps if desired. Review and launch. ArgiFlow will personalize each email using the recipient's company and role data." },
      { q: "Configuring ARIA Business Manager", a: "Go to the ARIA tab in your dashboard. You'll start with AriaDiscovery — a conversational onboarding where ARIA learns about your business, services, target market, and goals. After onboarding, choose your approval mode: Supervised (approve every action), Semi-Auto (routine actions auto-proceed), or Autopilot (fully autonomous). Connect your email (SES), SMS (Twilio), and payment (Stripe) through the Connectors tab." },
      { q: "Adding team members", a: "Navigate to Settings > Team. Click \"Invite Member\" and enter their email address. Choose their role: Admin (full access), Manager (can manage campaigns and leads), or Member (view-only with limited actions). Team members will receive an invitation email with a link to create their account. Each team member gets their own login credentials." },
      { q: "Connecting your email accounts", a: "Go to Email & Outreach > Email Accounts > Add Account. ArgiFlow supports Gmail (via OAuth), Outlook (via OAuth), and custom SMTP/IMAP connections. For custom SMTP, enter your server address, port, username, and password. After connecting, we recommend starting email warmup immediately — this takes 2-4 weeks but is essential for good deliverability." },
    ],
  },
  {
    icon: Mail,
    title: "Email & Outreach",
    articles: [
      { q: "Setting up email warmup", a: "Navigate to Email & Outreach > Warmup and select the email account you want to warm up. Click \"Start Warmup.\" The system will begin sending and receiving emails gradually — starting at 5/day and ramping up over 2-4 weeks. ArgiFlow's warmup network automatically opens, replies to, and moves emails from spam to inbox, training email providers to trust your domain. Monitor progress in the warmup dashboard." },
      { q: "Creating email sequences", a: "Go to Email & Outreach > Campaigns > New Campaign. After selecting your audience, click \"Add Step\" to build a multi-step sequence. Each step has its own email content, timing delay (e.g., 3 days after previous step), and conditions (e.g., only send if previous email wasn't opened). Use the AI Copilot to generate content for each step. You can add up to 10 steps per sequence." },
      { q: "Configuring sending domains (SPF/DKIM/DMARC)", a: "Go to Email & Outreach > Sending Domains > Add Domain. Enter your domain name. ArgiFlow will generate the DNS records you need to add: one TXT record for SPF (authorizes ArgiFlow to send on your behalf), three CNAME records for DKIM (cryptographic email signing), and one TXT record for DMARC (policy for handling authentication failures). Add these records in your domain registrar's DNS settings. Verification takes 24-72 hours." },
      { q: "Managing your unified inbox", a: "The Unified Inbox (Email & Outreach > Inbox) aggregates replies from all connected email accounts. Every reply is automatically classified by AI: Interested, Not Interested, Out of Office, Referral, Question, or Meeting Request. Use the filter tabs to view specific categories. Click any reply to read and respond — the AI suggests reply text based on the conversation context. You can also update the lead's CRM status directly from the inbox." },
      { q: "Improving email deliverability", a: "Key steps: (1) Complete email warmup before sending campaigns. (2) Set up SPF, DKIM, and DMARC on your sending domain. (3) Keep bounce rates below 2% by verifying email addresses before sending. (4) Maintain a healthy sender reputation by keeping spam complaints below 0.1%. (5) Personalize every email — avoid generic templates. (6) Don't include too many links or images. (7) Use ArgiFlow's deliverability monitoring to track inbox placement rates." },
    ],
  },
  {
    icon: Phone,
    title: "Voice AI",
    articles: [
      { q: "Connecting Twilio for voice calls", a: "Go to Settings > Integrations > Twilio. Enter your Twilio Account SID and Auth Token (found in your Twilio Console dashboard). Click \"Connect.\" Then purchase a phone number from Twilio's console — choose a local number for higher answer rates. The number will appear automatically in ArgiFlow for use with Voice AI calls." },
      { q: "Configuring Voice AI scripts", a: "Navigate to AI Agents > Voice Caller > Scripts. Create a new script by selecting a template (Cold Call, Follow-Up, Qualification, Meeting Confirmation) or start from scratch. Write your script with conversation branches — define what the AI should say at each point and how to respond to common objections. The AI adapts the script dynamically during calls based on the actual conversation." },
      { q: "Understanding call transcripts", a: "After each Voice AI call, a full transcript is generated automatically using Deepgram's speech-to-text engine. View transcripts from AI Agents > Voice Caller > Call History. Each transcript shows the full conversation with speaker labels (AI vs. Prospect), timestamps, and sentiment indicators. You can search across all transcripts to find specific topics or objections." },
      { q: "Booking meetings via voice AI", a: "When the Voice AI detects interest during a call, it automatically offers to schedule a meeting. The AI checks your calendar availability in real-time, proposes available slots, and confirms the booking. A calendar invite is sent to both you and the prospect. You'll receive a notification with the meeting details and a pre-meeting briefing containing all relevant prospect data." },
      { q: "Troubleshooting call quality", a: "If calls have audio issues: (1) Check your Twilio account has sufficient balance. (2) Ensure your Deepgram API key is valid and active. (3) Verify your internet connection is stable — Voice AI requires consistent connectivity. (4) Check the call logs in Twilio's console for error codes. (5) Try a test call to your own number first. Contact support at info@argilette.com if issues persist." },
    ],
  },
  {
    icon: Users,
    title: "CRM & Leads",
    articles: [
      { q: "Importing existing contacts", a: "Go to CRM > Contacts > Import. Upload a CSV file with your contact data. ArgiFlow will auto-map columns to fields (name, email, phone, company, title). Review the mapping, fix any mismatches, and click Import. Contacts are deduplicated by email address — if a contact already exists, the import updates their record instead of creating a duplicate. You can import up to 10,000 contacts per batch." },
      { q: "Using lead scoring", a: "ArgiFlow automatically scores each lead based on engagement signals: email opens (+5 points), link clicks (+15), website visits (+10 per page), pricing page views (+25), demo requests (+50), and call conversations (+30). Scores decay over time for stale leads. View scores in CRM > Contacts. Set up automated actions based on score thresholds — e.g., when a lead reaches 70+, assign to a sales rep or trigger a Voice AI call." },
      { q: "Managing sales pipelines", a: "Go to CRM > Pipeline to see your Kanban board. Drag deals between stages (New Lead, Contacted, Qualified, Proposal, Negotiation, Closed). Click any deal card to view details, add notes, update values, or set next actions. Create custom pipelines for different products or sales processes from Pipeline > Settings. Each pipeline can have its own stages, colors, and automation rules." },
      { q: "Setting up calendar booking", a: "Navigate to CRM > Calendar > Booking Pages. Create a new booking page with your available times, meeting duration (15, 30, or 60 min), buffer time between meetings, and a custom URL slug. Add qualifying questions that prospects must answer before booking. Share the booking link in your emails, website, or social profiles. ArgiFlow syncs with Google Calendar and Outlook to prevent double-bookings." },
      { q: "Creating invoices and proposals", a: "Go to CRM > Invoicing > New Invoice. Select a contact, add line items with descriptions and amounts, set payment terms and due date, and add your company branding. Click Send to email the invoice with a secure payment link. For proposals, use CRM > Proposals > New Proposal — include cover page, scope of work, pricing table, and terms. Add e-signature fields so prospects can sign directly in the document." },
    ],
  },
  {
    icon: CreditCard,
    title: "Billing & Plans",
    articles: [
      { q: "Understanding pricing tiers", a: "ArgiFlow offers three plans: Starter (Free for 30 days, includes basic features and limited credits), Pro ($49/month, full feature access with higher credit allocations and priority support), and Agency ($99/month, unlimited team members, highest credit allocations, white-label options, and dedicated account management). All plans include access to all AI agents, email infrastructure, CRM, and analytics." },
      { q: "Upgrading or downgrading your plan", a: "Go to Settings > Billing > Change Plan. Select your desired plan and confirm. Upgrades take effect immediately — you'll be charged the prorated difference for the remainder of your billing period. Downgrades take effect at the end of your current billing period to ensure you retain access to higher-tier features until then. No data is lost when changing plans." },
      { q: "Managing payment methods", a: "Navigate to Settings > Billing > Payment Methods. Click \"Add Payment Method\" to enter a new credit or debit card. You can also remove existing cards or set a different card as your default payment method. All payment processing is handled securely through Stripe — ArgiFlow never stores your card numbers directly." },
      { q: "Understanding credits system", a: "Credits are consumed for premium actions: AI content generation (1-5 credits depending on length), voice AI calls (10 credits/call), advanced lead enrichment (2 credits/lead), and intelligence lookups (1-3 credits). Credits are deducted when an action starts and automatically refunded if it fails. Monitor your balance at Settings > Credits. Each plan includes a monthly credit allocation that resets at the start of each billing period." },
      { q: "Cancellation and refund policy", a: "You can cancel your subscription at any time from Settings > Billing > Cancel Subscription. Your access continues until the end of your current billing period. We do not offer partial-period refunds unless required by applicable law. After cancellation, your data is retained for 30 days in case you decide to reactivate. After 30 days, data may be permanently deleted." },
    ],
  },
  {
    icon: Shield,
    title: "Security & Privacy",
    articles: [
      { q: "Data protection practices", a: "ArgiFlow encrypts all data in transit using TLS 1.3 and at rest using AES-256 encryption. Our databases are hosted on enterprise-grade infrastructure with automated backups, geographic redundancy, and 99.99% uptime. We conduct regular security audits and penetration testing. All API keys and credentials are stored as encrypted environment variables, never in source code." },
      { q: "Two-factor authentication", a: "Enable two-factor authentication (2FA) from Settings > Security > Two-Factor Authentication. ArgiFlow supports authenticator apps (Google Authenticator, Authy, 1Password) that generate time-based one-time passwords (TOTP). After enabling 2FA, you'll need to enter a 6-digit code from your authenticator app each time you log in, in addition to your password." },
      { q: "API key management", a: "Manage your API keys from Settings > API Keys. Generate new keys, revoke existing ones, and set permissions for each key. API keys should be treated as sensitive credentials — never share them publicly or commit them to source code. If you suspect a key has been compromised, revoke it immediately and generate a new one." },
      { q: "GDPR compliance", a: "ArgiFlow is designed with GDPR compliance in mind. You have the right to access, correct, and delete your personal data at any time. We process data only for the purposes of providing the service. Contact data you store on the platform is your responsibility — ensure you have proper consent for storing and contacting individuals in your database, especially in EU jurisdictions." },
      { q: "Data export and deletion", a: "Export your data at any time from Settings > Data Management > Export. ArgiFlow exports your contacts, campaigns, analytics, and agent logs in CSV and JSON formats. To delete your account and all associated data, go to Settings > Account > Delete Account. Deletion is permanent and takes effect within 30 days. A confirmation email is sent before final deletion." },
    ],
  },
];

function HelpArticle({ article, catIdx, artIdx }: { article: { q: string; a: string }; catIdx: number; artIdx: number }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="overflow-hidden" data-testid={`help-article-${catIdx}-${artIdx}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer bg-transparent border-none text-left"
        data-testid={`button-help-${catIdx}-${artIdx}`}
      >
        <span className="text-[14px] text-white/50 hover:text-white/70 transition-colors">{article.q}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-white/20 shrink-0 ml-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3" data-testid={`content-help-${catIdx}-${artIdx}`}>
          <p className="text-[13px] text-white/40 leading-relaxed pl-0 bg-white/[0.02] rounded-lg p-4 border border-white/5">{article.a}</p>
        </div>
      )}
    </li>
  );
}

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
              <ul className="space-y-1">
                {cat.articles.map((article, j) => (
                  <HelpArticle key={j} article={article} catIdx={i} artIdx={j} />
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
