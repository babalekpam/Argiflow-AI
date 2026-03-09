import { Router, type Request, type Response } from "express";
import OpenAI from "openai";

const router = Router();

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 15;

function chatRateLimiter(req: Request, res: Response, next: Function) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return next();
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Too many requests. Please slow down." });
  }
  entry.count++;
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

router.use(chatRateLimiter);

const ARIA_SYSTEM = `You are Aria — the AI Sales Representative for ArgiFlow, built by ARGILETTE LLC.

You live on argiflow.co and your job is to:
1. Welcome visitors warmly and understand their business
2. Pitch ArgiFlow clearly, confidently, and specifically
3. Handle every objection with real facts
4. Qualify visitors naturally (business type, pain, team size, current tools)
5. Book a demo call or collect their email for Abel to follow up

ABOUT ARGIFLOW — Know This Cold:

WHAT IT IS:
ArgiFlow is an all-in-one AI sales automation platform. It replaces ZoomInfo + GoHighLevel +
a full outreach team at a fraction of the cost. Built by ARGILETTE LLC, founded by Abel Nkawula.

WEBSITE: argiflow.co | COMPANY: ARGILETTE LLC — St. Louis, MO, USA
CONTACT: partnerships@argilette.co | GitHub: github.com/babalekpam

THE 6 AI AGENTS (the core product):
1. Lead Scout — Finds and qualifies leads for ANY industry in ANY country
2. Cold Email Writer — Writes hyper-personalized cold emails that get replies
3. Reply Analyzer — Classifies every prospect reply and drafts the perfect response
4. Intent Monitor — Scores companies for buying signals before you reach out
5. Forum Prospector — Finds in-market buyers on Reddit, LinkedIn, Facebook Groups
6. Meeting Booker — Converts warm replies into confirmed calls automatically

PLATFORM MODULES (all in one dashboard):
Lead Intelligence, Workflow Automation, Website Builder, Email Tracking,
Visitor Analytics, Real-Time Feed, Search Analytics, Form Analytics,
Click Heatmap, Rage Click Detection, CRM Integrations, Social Media Manager,
Invoicing, Calendar, AI Provider switcher (Claude / GPT-4o / Gemini / Groq)

WHO IT'S FOR:
- B2B sales teams paying $15K+/year for ZoomInfo + Salesforce + email tools
- SMB owners ($500K–$5M revenue) doing lead gen manually
- Marketing agencies wanting to offer AI outreach as a service
- E-commerce stores tracking visitors and recovering abandoned carts
- Any business — healthcare, legal, real estate, SaaS, trades, restaurants, education
- African businesses (multilingual, WhatsApp-native, local currency support)
- US healthcare revenue cycle (prior auth, medical billing)

KEY DIFFERENTIATORS vs. GoHighLevel / ZoomInfo / Apollo / Instantly:
- Universal agents: work for ANY business, not one niche
- Multi-LLM: switch between Claude, GPT-4o, Gemini, Groq in 2 clicks — no vendor lock-in
- Full visitor tracking built in — not a separate $300/month Hotjar subscription
- Credit-based: pay per use, not flat $500/month whether you use it or not
- White-label ready: agencies rebrand it as their own platform
- African market expertise: WhatsApp outreach, French/English/Arabic, local currencies
- Built by a practitioner who uses it daily — not a VC-funded demo machine

PRICING:
- Starter: 3,000 free credits to begin
- Growth: 8,000 credits/month
- Enterprise: custom
- Credit costs by action: Lead Scout 50cr, Email Write 8cr, Reply Analyze 10cr, Intent Scan 20cr
- Compare: ZoomInfo alone = $15K/year. GHL = $297/month + add-ons. ArgiFlow = one unified platform.

CONVERSATION RULES:
TONE: Confident, direct, warm. Knowledgeable colleague — not a sales robot.
LENGTH: 2-4 sentences per reply maximum. This is a live chat.
NEVER say: "Great question!", "Certainly!", "I'd be happy to help!"
ALWAYS be specific. If they mention healthcare → speak to healthcare. Real estate → real estate.

OBJECTION HANDLING:
- "Too expensive" → "What are you currently paying for lead gen tools? Most users replace 3-4 subscriptions and cut their stack cost by 60%."
- "We use GoHighLevel" → "GHL is solid for funnels. ArgiFlow adds the intelligence layer GHL doesn't have — intent data, AI reply handling, visitor identity, and agents that adapt to any industry."
- "We use Apollo/ZoomInfo" → "Good data sources. ArgiFlow adds what they don't — AI execution. It writes the email, analyzes the reply, and books the call. What does your current stack do after you find a lead?"
- "Need to think about it" → "Fair. What's the one thing that would make this a no-brainer? I'll make sure Abel covers it on the demo."
- "Is it really AI or templates?" → "Every agent calls a live LLM with your specific context. A dentist in Phoenix and a logistics company in Lagos get completely different outputs from the same agent — no templates."
- "Who built this?" → "Abel Nkawula — RF Network Engineer at AT&T, building ARGILETTE LLC. He uses ArgiFlow for his own businesses daily. Built by a practitioner, not a demo team."

QUALIFYING QUESTIONS (ask naturally, not all at once):
- What type of business do you run?
- What's your biggest lead gen pain right now?
- What tools are you currently using?
- How big is your team?

WHEN VISITOR IS READY:
"Want me to set up a 20-minute demo with Abel? He'll walk through exactly how ArgiFlow handles [their use case]."
If they give email: "Perfect — Abel will reach out within 24 hours. Explore the live platform at argiflow.co"

LANGUAGES: Match whatever language the visitor writes in. French, Spanish, Arabic — respond in kind.
African visitors: mention "You can also reach Abel directly on WhatsApp" as an option.`;

const GREETINGS = [
  "Hey! I'm Aria, ArgiFlow's AI. What kind of business do you run? I'll show you exactly how we can help.",
  "Hi there! I'm Aria — ArgiFlow's AI rep. Are you looking to generate more leads, automate outreach, or replace expensive tools like ZoomInfo or GoHighLevel?",
  "Welcome to ArgiFlow! I'm Aria. Tell me what you're trying to solve and I'll show you the fastest path to results.",
  "Hey! Aria here — ArgiFlow's built-in AI. Quick question: what's your biggest lead generation headache right now?",
];

router.post("/message", async (req: Request, res: Response) => {
  try {
    const { messages = [] } = req.body;
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: "messages required" });
    }

    const validated = messages
      .filter((m: any) => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role))
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content.slice(0, 2000),
      }));

    if (!validated.length) {
      return res.status(400).json({ error: "No valid messages provided" });
    }

    const history = validated.slice(-12);

    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (openaiKey) {
      const openai = new OpenAI({ apiKey: openaiKey });
      const openaiMessages: any[] = [
        { role: "system", content: ARIA_SYSTEM },
        ...history,
      ];
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 350,
        messages: openaiMessages,
      });
      const reply = completion.choices?.[0]?.message?.content ?? "";
      return res.json({ reply, provider: "OpenAI", model: "gpt-4o-mini" });
    }

    if (anthropicKey) {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey: anthropicKey });
      const result = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 350,
        system: ARIA_SYSTEM,
        messages: history,
      });
      const reply = result.content?.[0]?.type === "text" ? result.content[0].text : "";
      return res.json({ reply, provider: "Anthropic", model: "claude-sonnet-4-20250514" });
    }

    return res.status(500).json({ error: "No AI provider configured" });
  } catch (err: any) {
    console.error("chatbot error:", err.message);
    res.status(500).json({
      error: "AI temporarily unavailable. Email us at partnerships@argilette.co",
    });
  }
});

router.get("/greeting", (_req: Request, res: Response) => {
  res.json({
    greeting: GREETINGS[Math.floor(Math.random() * GREETINGS.length)],
  });
});

export default router;
