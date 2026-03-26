import { ArrowLeft, Zap, BookOpen, ArrowRight, Clock, User } from "lucide-react";

const blogPosts = [
  {
    id: "ai-cold-email-2026",
    title: "How AI is Revolutionizing Cold Email Outreach in 2026",
    excerpt: "Learn how autonomous AI agents are transforming the way B2B companies approach cold outreach — from hyper-personalized messaging to intelligent follow-up sequences that adapt in real-time.",
    author: "ArgiFlow Team",
    date: "March 20, 2026",
    category: "AI & Automation",
    readTime: "6 min read",
  },
  {
    id: "replace-sales-stack",
    title: "Why You Should Replace Your Entire Sales Stack With One Platform",
    excerpt: "Most B2B teams juggle 5-7 separate tools for prospecting, outreach, CRM, and analytics. Here's why consolidating into a single AI-powered platform saves money, time, and headaches.",
    author: "ArgiFlow Team",
    date: "March 15, 2026",
    category: "Strategy",
    readTime: "8 min read",
  },
  {
    id: "voice-ai-sales",
    title: "Voice AI for Sales: The Complete Guide to AI-Powered Phone Calls",
    excerpt: "From qualifying leads to booking meetings, voice AI agents are handling the calls your team doesn't have time for. Here's everything you need to know about deploying voice AI in your sales process.",
    author: "ArgiFlow Team",
    date: "March 10, 2026",
    category: "Voice AI",
    readTime: "10 min read",
  },
  {
    id: "lead-scoring-intent",
    title: "Beyond Lead Scoring: How Intent Data Changes Everything",
    excerpt: "Traditional lead scoring is broken. Discover how intent signals — tracked across email opens, website visits, and content engagement — help you identify buyers before they raise their hand.",
    author: "ArgiFlow Team",
    date: "March 5, 2026",
    category: "Sales Intelligence",
    readTime: "7 min read",
  },
  {
    id: "email-deliverability",
    title: "Email Deliverability in 2026: Warmup, Authentication & Best Practices",
    excerpt: "With Google and Yahoo's new sender requirements, email deliverability is more critical than ever. Learn how to set up SPF, DKIM, DMARC, and automated warmup for maximum inbox placement.",
    author: "ArgiFlow Team",
    date: "February 28, 2026",
    category: "Email Infrastructure",
    readTime: "9 min read",
  },
  {
    id: "autonomous-business-manager",
    title: "Meet ARIA: Your Autonomous AI Business Manager",
    excerpt: "What if an AI could manage your entire client acquisition pipeline — from finding leads to sending emails to booking meetings? ARIA does exactly that, running 24/7 on autopilot.",
    author: "ArgiFlow Team",
    date: "February 20, 2026",
    category: "Product",
    readTime: "5 min read",
  },
];

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
            <article key={post.id} className="group rounded-2xl p-6 md:p-8 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:border-indigo-500/20 transition-all cursor-pointer" data-testid={`card-blog-${i}`}>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">{post.category}</span>
                <span className="flex items-center gap-1 text-[12px] text-white/25"><Clock className="w-3 h-3" /> {post.readTime}</span>
              </div>
              <h2 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors mb-3">{post.title}</h2>
              <p className="text-[14px] text-white/35 leading-relaxed mb-4">{post.excerpt}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px] text-white/25">
                  <User className="w-3 h-3" /> {post.author} &middot; {post.date}
                </div>
                <span className="flex items-center gap-1 text-[13px] text-indigo-400 font-medium group-hover:gap-2 transition-all">
                  Read more <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </article>
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
