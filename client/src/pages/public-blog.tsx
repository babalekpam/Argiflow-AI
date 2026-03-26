import { useState } from "react";
import { ArrowLeft, Zap, BookOpen, ChevronDown, Clock, User } from "lucide-react";

const blogPosts = [
  {
    id: "ai-cold-email-2026",
    title: "How AI is Revolutionizing Cold Email Outreach in 2026",
    excerpt: "Learn how autonomous AI agents are transforming the way B2B companies approach cold outreach — from hyper-personalized messaging to intelligent follow-up sequences that adapt in real-time.",
    author: "ArgiFlow Team",
    date: "March 20, 2026",
    category: "AI & Automation",
    readTime: "6 min read",
    body: [
      "Cold email outreach has undergone a fundamental transformation. What used to be a numbers game — blast thousands of generic emails and hope for a few responses — has evolved into a precision-targeting discipline powered by artificial intelligence.",
      "Modern AI agents don't just send emails. They research each prospect individually, pulling data from company filings, social profiles, recent news, and technology stack analysis to craft messages that feel genuinely personal. The difference in response rates is dramatic: AI-personalized emails consistently achieve 3-5x higher reply rates compared to template-based approaches.",
      "The real breakthrough comes from adaptive follow-up sequences. Traditional drip campaigns send the same follow-up regardless of how the recipient interacted with previous messages. AI-powered sequences analyze open patterns, click behavior, and timing data to dynamically adjust the next message's content, tone, and send time.",
      "For example, if a prospect opened your initial email three times but didn't reply, the AI recognizes high interest paired with hesitation and crafts a follow-up that addresses common objections. If they clicked a pricing link, the next email focuses on ROI and includes a case study relevant to their industry.",
      "ArgiFlow's Autonomous Outreach Agent takes this further with an 8-step loop: target definition, lead discovery, research, email composition, sending, follow-up sequences, reply handling, and meeting booking — all running without human intervention. The agent handles the entire pipeline from finding a prospect to getting them on your calendar.",
      "The key to success with AI outreach is setting the right guardrails. Start with supervised mode (approving each email before it sends), review the AI's personalization quality, and gradually increase autonomy as you build confidence in the output. Most users move to semi-autonomous mode within their first week.",
    ],
  },
  {
    id: "replace-sales-stack",
    title: "Why You Should Replace Your Entire Sales Stack With One Platform",
    excerpt: "Most B2B teams juggle 5-7 separate tools for prospecting, outreach, CRM, and analytics. Here's why consolidating into a single AI-powered platform saves money, time, and headaches.",
    author: "ArgiFlow Team",
    date: "March 15, 2026",
    category: "Strategy",
    readTime: "8 min read",
    body: [
      "The average B2B sales team uses 6.8 different tools in their daily workflow. There's a prospecting tool for finding leads, an enrichment tool for getting contact data, an email tool for outreach, a separate tool for email warmup, a CRM for tracking deals, an analytics platform for measuring performance, and often a calling tool for phone outreach. Each tool costs $50-300 per month, per user.",
      "The total cost adds up fast. A solo founder running ZoomInfo ($250/mo), Lemlist ($99/mo), Warmbox ($19/mo), HubSpot ($45/mo), Gong ($100/mo), and Calendly ($12/mo) is spending $525/month before making a single sale. For a team of five, that's $2,625/month — $31,500 per year.",
      "But cost isn't the biggest problem. The real issue is fragmentation. Data lives in silos. Your prospecting tool doesn't know what your CRM knows. Your email tool can't see your call data. Your analytics platform only has partial visibility. You spend hours each week manually moving data between systems, fixing sync errors, and reconciling conflicting information.",
      "A unified platform eliminates these problems entirely. When your lead intelligence engine, email outreach, voice calling, CRM, and analytics all share the same database, every tool has complete context. Your email agent knows which prospects your voice agent has already called. Your CRM automatically updates when an email gets a positive reply. Your analytics reflect the full picture across every channel.",
      "ArgiFlow consolidates all these capabilities into a single platform at a fraction of the cost. The Starter plan is free for 30 days, the Pro plan is $49/month, and the Agency plan is $99/month — compared to $525+/month for separate tools. That's not just a cost saving; it's a fundamentally better way to operate.",
      "The migration path is straightforward: import your existing contacts via CSV, connect your email accounts, and let the AI agents take over prospecting and outreach. Most teams are fully transitioned within a day.",
    ],
  },
  {
    id: "voice-ai-sales",
    title: "Voice AI for Sales: The Complete Guide to AI-Powered Phone Calls",
    excerpt: "From qualifying leads to booking meetings, voice AI agents are handling the calls your team doesn't have time for. Here's everything you need to know about deploying voice AI in your sales process.",
    author: "ArgiFlow Team",
    date: "March 10, 2026",
    category: "Voice AI",
    readTime: "10 min read",
    body: [
      "Voice AI has crossed the threshold from novelty to practical business tool. Modern speech synthesis sounds natural, speech recognition is highly accurate, and conversational AI can handle the nuanced back-and-forth of a real sales call. For B2B companies that need to qualify leads at scale, Voice AI is a game-changer.",
      "The technology stack behind Voice AI calling combines three components: telephony (Twilio handles the phone infrastructure), speech-to-text (Deepgram converts the prospect's speech to text in real-time), and a large language model (processes the text and generates contextually appropriate responses that are converted back to speech).",
      "ArgiFlow's Voice AI agent handles several common call scenarios: Cold qualification calls (introducing your company and qualifying interest), follow-up calls (checking in after an email sequence), meeting booking calls (proposing times and confirming appointments), and re-engagement calls (reaching out to dormant leads).",
      "The key to effective Voice AI is scripting with flexibility. You define the call structure — opening, value proposition, qualification questions, objection handling, and close — but the AI adapts dynamically based on the actual conversation. If a prospect raises an unexpected concern, the AI draws on its training to address it naturally rather than falling back to a rigid script.",
      "Call quality depends heavily on preparation. ArgiFlow pre-loads the AI with everything known about the prospect: their company data, email interaction history, website visits, and any previous call notes. This context allows the AI to have informed conversations rather than generic pitches.",
      "Compliance is critical with Voice AI. ArgiFlow includes configurable settings for time-of-day restrictions (never calling outside business hours), do-not-call list management, and call recording consent announcements. Before deploying Voice AI, ensure you understand the regulations in your target jurisdictions (TCPA in the US, GDPR in Europe).",
      "Results vary by use case, but early adopters report that Voice AI increases their qualified meetings by 40-60% while reducing the cost per meeting by 70%. The AI handles the high-volume qualification calls that sales reps don't have time for, freeing the team to focus on closing deals.",
    ],
  },
  {
    id: "lead-scoring-intent",
    title: "Beyond Lead Scoring: How Intent Data Changes Everything",
    excerpt: "Traditional lead scoring is broken. Discover how intent signals — tracked across email opens, website visits, and content engagement — help you identify buyers before they raise their hand.",
    author: "ArgiFlow Team",
    date: "March 5, 2026",
    category: "Sales Intelligence",
    readTime: "7 min read",
    body: [
      "Traditional lead scoring assigns static points based on demographics: job title (+10), company size (+15), industry match (+20). The problem? A perfect-fit prospect who has zero buying intent scores higher than a less-ideal prospect who's actively researching solutions and ready to purchase.",
      "Intent data flips the model. Instead of scoring who someone is, you score what they're doing. Email opens, link clicks, website visits, pricing page views, content downloads, and social engagement all generate signals that indicate buying readiness. A prospect who opened your last three emails, clicked the pricing link, and visited your website twice this week is demonstrably more interested than one who hasn't engaged at all — regardless of their job title.",
      "ArgiFlow's intent scoring system assigns weighted values to each signal: email opens (+5 points), link clicks (+15), website page views (+10 per page), pricing page views (+25), demo requests (+50), and voice call engagement (+30). Scores decay over time — a click from yesterday is worth more than one from three weeks ago — ensuring the score reflects current interest, not historical activity.",
      "The real power emerges when you combine intent data with identity resolution. ArgiFlow's Visitor Intelligence Engine cross-references anonymous website visitor IPs with email tracking data. When an email recipient clicks a link and visits your website, ArgiFlow connects their entire journey: which emails they opened, what links they clicked, and every page they browsed after arriving.",
      "This creates a complete picture of buying behavior that's invisible to traditional tools. You can see that a prospect opened your case study email on Monday, clicked through to your website, browsed your features page and pricing page, then came back on Wednesday and viewed your integration documentation. That's a prospect ready for a conversation.",
      "The most effective approach is automating actions based on intent thresholds. When a lead's score crosses 70, automatically assign them to a sales rep, trigger a personalized follow-up email, or schedule a Voice AI call. This ensures your hottest leads get immediate attention while your team focuses their energy where it matters most.",
    ],
  },
  {
    id: "email-deliverability",
    title: "Email Deliverability in 2026: Warmup, Authentication & Best Practices",
    excerpt: "With Google and Yahoo's new sender requirements, email deliverability is more critical than ever. Learn how to set up SPF, DKIM, DMARC, and automated warmup for maximum inbox placement.",
    author: "ArgiFlow Team",
    date: "February 28, 2026",
    category: "Email Infrastructure",
    readTime: "9 min read",
    body: [
      "Email deliverability isn't just about avoiding spam filters — it's the foundation of your entire outreach strategy. If your emails don't reach the inbox, nothing else matters. With Google and Yahoo enforcing stricter sender requirements in 2024-2026, proper email infrastructure is no longer optional.",
      "The three pillars of email authentication are SPF, DKIM, and DMARC. SPF (Sender Policy Framework) is a DNS record that tells email providers which servers are authorized to send emails from your domain. DKIM (DomainKeys Identified Mail) adds a cryptographic signature to each email, proving it hasn't been tampered with. DMARC (Domain-based Message Authentication, Reporting, and Conformance) tells providers what to do with emails that fail SPF or DKIM checks.",
      "Setting up these records isn't difficult, but it must be done correctly. In ArgiFlow, navigate to Email & Outreach > Sending Domains and add your domain. The platform generates the exact DNS records you need. Add them to your domain registrar's DNS settings and wait 24-72 hours for propagation. ArgiFlow automatically verifies each record and shows you the status.",
      "Email warmup is equally critical. A brand-new email account or domain has zero sending reputation. If you immediately send 500 cold emails, every major email provider will flag you as spam. Warmup gradually builds your reputation by sending and receiving emails over 2-4 weeks, with the volume increasing daily.",
      "ArgiFlow's built-in warmup engine handles this automatically. Connect your email account, start warmup, and the system sends emails to a network of real inboxes that open, reply to, and move messages from spam to inbox. This trains email providers to trust your domain. The default schedule starts at 5 emails/day and ramps to your target volume over 14-30 days.",
      "Best practices for maintaining deliverability: (1) Never send to unverified email addresses — bounce rates above 2% damage your reputation. (2) Keep spam complaint rates below 0.1%. (3) Personalize every email — identical messages to many recipients trigger spam filters. (4) Include an unsubscribe link. (5) Don't overload emails with links and images. (6) Monitor your sender score regularly through ArgiFlow's deliverability dashboard.",
    ],
  },
  {
    id: "autonomous-business-manager",
    title: "Meet ARIA: Your Autonomous AI Business Manager",
    excerpt: "What if an AI could manage your entire client acquisition pipeline — from finding leads to sending emails to booking meetings? ARIA does exactly that, running 24/7 on autopilot.",
    author: "ArgiFlow Team",
    date: "February 20, 2026",
    category: "Product",
    readTime: "5 min read",
    body: [
      "ARIA is ArgiFlow's autonomous AI Business Manager — an AI agent designed to manage your entire client acquisition pipeline without constant human supervision. Think of ARIA as a tireless team member who works 24/7, finding prospects, crafting outreach, following up, and booking meetings while you focus on closing deals.",
      "The journey begins with AriaDiscovery, a conversational onboarding process where ARIA learns everything about your business: what you sell, who you sell to, your unique value proposition, your pricing, your competitive advantages, and your goals. This isn't a form — it's a natural conversation where ARIA asks intelligent questions and builds a comprehensive understanding of your business.",
      "Once onboarded, ARIA operates in configurable cycles. Every 15 minutes (adjustable), ARIA evaluates the current state of your pipeline, identifies opportunities, and takes action. This might mean researching a new batch of prospects, sending personalized outreach emails, following up with warm leads, or preparing briefings on key metrics.",
      "ARIA supports three approval modes to match your comfort level. Supervised mode requires your approval for every action — ARIA proposes, you approve or reject. Semi-Auto mode lets routine actions (like follow-up emails to non-responders) proceed automatically while flagging important decisions for your review. Autopilot mode gives ARIA full autonomy to execute the entire pipeline independently.",
      "What makes ARIA different from simple automation is its ability to connect real tools and make contextual decisions. ARIA sends actual emails through AWS SES, makes real SMS messages through Twilio, tracks real revenue through Stripe, and uses the Visitor Intelligence Engine to understand which prospects are actively browsing your website. Every action is logged, every decision is explained, and every outcome is tracked.",
      "Start with Supervised mode, review ARIA's decisions for a few days, and gradually increase autonomy as you build confidence. Most users move to Semi-Auto within the first week and Autopilot within the first month. The result is a fully autonomous growth engine that scales your outreach without scaling your headcount.",
    ],
  },
];

function BlogArticle({ post, index }: { post: typeof blogPosts[0]; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:border-indigo-500/20 transition-all overflow-hidden" data-testid={`card-blog-${index}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-6 md:p-8 cursor-pointer bg-transparent border-none"
        data-testid={`button-blog-${index}`}
      >
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">{post.category}</span>
          <span className="flex items-center gap-1 text-[12px] text-white/25"><Clock className="w-3 h-3" /> {post.readTime}</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-3">{post.title}</h2>
        <p className="text-[14px] text-white/35 leading-relaxed mb-4">{post.excerpt}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] text-white/25">
            <User className="w-3 h-3" /> {post.author} &middot; {post.date}
          </div>
          <span className="flex items-center gap-1.5 text-[13px] text-indigo-400 font-medium">
            {open ? "Collapse" : "Read article"}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </span>
        </div>
      </button>
      {open && (
        <div className="px-6 md:px-8 pb-8 border-t border-white/5 pt-6 space-y-4" data-testid={`content-blog-${index}`}>
          {post.body.map((paragraph, k) => (
            <p key={k} className="text-[14px] text-white/45 leading-[1.8]">{paragraph}</p>
          ))}
        </div>
      )}
    </article>
  );
}

export default function PublicBlogPage() {
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

      <div className="pt-32 pb-24 px-6 max-w-[1000px] mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-300 uppercase tracking-widest px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-5">
            <BookOpen className="w-3.5 h-3.5" />
            Blog
          </span>
          <h1 className="text-[clamp(32px,5vw,52px)] font-extrabold tracking-tight mb-4" data-testid="text-blog-title">
            Insights & <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Resources</span>
          </h1>
          <p className="text-lg text-white/40 max-w-[560px] mx-auto leading-relaxed">
            Expert strategies, product updates, and actionable guides to help you grow your business with AI-powered automation.
          </p>
        </div>

        <div className="space-y-5">
          {blogPosts.map((post, i) => (
            <BlogArticle key={post.id} post={post} index={i} />
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-white/25 text-sm">More articles coming soon. Subscribe to get notified.</p>
        </div>
      </div>

      <footer className="py-8 px-6 max-w-[900px] mx-auto border-t border-white/5 text-center">
        <p className="text-[12px] text-white/15">&copy; {new Date().getFullYear()} ArgiFlow AI by ARGILETTE Labs. All rights reserved.</p>
      </footer>
    </div>
  );
}
