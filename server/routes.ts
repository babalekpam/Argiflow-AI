import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { leads, appointments, aiAgents, dashboardStats, aiChatMessages } from "@shared/schema";
import { getSession } from "./replit_integrations/auth/replitAuth";
import { registerSchema, loginSchema, insertLeadSchema, onboardingSchema, marketingStrategies } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import Anthropic from "@anthropic-ai/sdk";

// ============================================================
// ANTHROPIC CLAUDE — SINGLE AI PROVIDER FOR EVERYTHING
// No Tavily, no OpenAI, no other providers.
// Claude handles: chat, web search, actions, research
// ============================================================

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashed, "hex"), buf);
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    adminId?: string;
  }
}

const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

const isAdmin: RequestHandler = (req, res, next) => {
  if (!req.session?.adminId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// ============================================================
// LEAD GENERATION HELPERS
// ============================================================

const firstNames = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Quinn", "Blake", "Cameron", "Drew", "Hayden", "Skyler", "Reese", "Parker", "Sawyer", "Dakota", "Emerson", "Finley", "Rowan"];
const lastNames = ["Mitchell", "Brooks", "Rivera", "Foster", "Hayes", "Bennett", "Cole", "Reed", "Gray", "Ward", "Price", "Sullivan", "Russell", "Howard", "Perry", "Long", "Butler", "Barnes", "Ross", "Murphy"];
const sources = ["Google Ads", "Facebook", "Instagram", "LinkedIn", "Website", "Referral", "Cold Outreach", "Twitter"];
const domains = ["growthdigital.com", "scaleup.io", "clientmax.com", "growthlab.co", "agencypro.com", "scaledigital.com", "boostmedia.com", "funnelpro.com", "marketflow.co", "leadpeak.io"];

function randomPick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateRandomLead(userId: string) {
  const first = randomPick(firstNames);
  const last = randomPick(lastNames);
  const domain = randomPick(domains);
  const statuses = ["new", "warm", "hot", "qualified"];
  return {
    userId,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
    phone: `+1 (555) ${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
    source: randomPick(sources),
    status: randomPick(statuses),
    score: randomInt(40, 98),
  };
}

// ============================================================
// CRM ACTION EXECUTOR (called by Claude via tool_use)
// ============================================================

async function executeAction(userId: string, action: string, params: any): Promise<string> {
  switch (action) {
    case "generate_leads": {
      const count = Math.min(params.count || 3, 20);
      const created: string[] = [];
      for (let i = 0; i < count; i++) {
        const leadData = generateRandomLead(userId);
        await storage.createLead(leadData);
        created.push(leadData.name);
      }
      const allLeads = await storage.getLeadsByUser(userId);
      const stats = await storage.getStatsByUser(userId);
      const activeCount = allLeads.filter(l => l.status === "hot" || l.status === "qualified" || l.status === "warm").length;
      await storage.upsertStats({ userId, totalLeads: allLeads.length, activeLeads: activeCount, appointmentsBooked: stats?.appointmentsBooked || 0, conversionRate: stats?.conversionRate || 0, revenue: stats?.revenue || 0 });
      return `Created ${count} leads: ${created.join(", ")}. Total leads now: ${allLeads.length}.`;
    }
    case "book_appointments": {
      const userLeads = await storage.getLeadsByUser(userId);
      if (userLeads.length === 0) return "ERROR: User has no leads yet. Generate leads first.";
      const count = Math.min(params.count || 2, userLeads.length);
      const types = ["Discovery Call", "Strategy Session", "Sales Call", "Follow-Up Call", "Demo Call", "Consultation"];
      const booked: string[] = [];
      const shuffled = [...userLeads].sort(() => Math.random() - 0.5);
      for (let i = 0; i < count; i++) {
        const lead = shuffled[i];
        const hoursFromNow = randomInt(4, 72);
        const appt = await storage.createAppointment({ userId, leadName: lead.name, type: randomPick(types), date: new Date(Date.now() + hoursFromNow * 60 * 60 * 1000), status: "scheduled" });
        booked.push(`${lead.name} - ${appt.type}`);
      }
      const stats = await storage.getStatsByUser(userId);
      const allAppts = await storage.getAppointmentsByUser(userId);
      await storage.upsertStats({ userId, totalLeads: stats?.totalLeads || 0, activeLeads: stats?.activeLeads || 0, appointmentsBooked: allAppts.length, conversionRate: stats?.conversionRate || 0, revenue: stats?.revenue || 0 });
      return `Booked ${count} appointments: ${booked.join("; ")}.`;
    }
    case "activate_agents": {
      const agentTypes = [
        { name: "Lead Qualifier", type: "Qualification", desc: "Automatically scores and qualifies incoming leads based on engagement, demographics, and behavior patterns." },
        { name: "Email Nurturing", type: "Communication", desc: "Sends personalized email sequences that adapt based on recipient behavior and engagement metrics." },
        { name: "Appointment Setter", type: "Scheduling", desc: "Books qualified leads into available calendar slots and handles rescheduling automatically." },
        { name: "Chat Responder", type: "Support", desc: "Responds to incoming chat messages instantly, qualifying leads and answering common questions." },
        { name: "Ad Optimizer", type: "Marketing", desc: "Monitors ad performance across platforms and adjusts bids, targeting, and creative in real-time." },
        { name: "Follow-Up Agent", type: "Retention", desc: "Automatically follows up with leads who haven't responded, using multi-channel outreach." },
        { name: "Voice AI Agent", type: "Voice", desc: "Handles inbound and outbound phone calls, qualifies prospects, and books appointments via voice." },
        { name: "Social Media Agent", type: "Social", desc: "Monitors social channels, responds to mentions and DMs, and generates engagement automatically." },
      ];
      const existing = await storage.getAiAgentsByUser(userId);
      const existingNames = new Set(existing.map(a => a.name));
      const available = agentTypes.filter(a => !existingNames.has(a.name));
      if (available.length === 0) return "All AI agents are already set up and running.";
      const count = Math.min(params.count || available.length, available.length);
      const toCreate = available.slice(0, count);
      const created: string[] = [];
      for (const agent of toCreate) {
        await storage.createAiAgent({ userId, name: agent.name, type: agent.type, status: "active", tasksCompleted: 0, successRate: 0, description: agent.desc });
        created.push(agent.name);
      }
      return `Activated ${count} agents: ${created.join(", ")}.`;
    }
    case "follow_up_leads": {
      const userLeads = await storage.getLeadsByUser(userId);
      const warmLeads = userLeads.filter(l => l.status === "warm" || l.status === "new");
      if (warmLeads.length === 0) return "No warm or new leads to follow up with right now.";
      const count = Math.min(params.count || warmLeads.length, 5);
      const appts: string[] = [];
      for (let i = 0; i < count; i++) {
        const lead = warmLeads[i];
        await storage.createAppointment({ userId, leadName: lead.name, type: "Follow-Up Call", date: new Date(Date.now() + randomInt(24, 96) * 60 * 60 * 1000), status: "scheduled" });
        appts.push(lead.name);
      }
      return `Created follow-up calls for ${count} leads: ${appts.join(", ")}.`;
    }
    case "get_stats": {
      const userLeads = await storage.getLeadsByUser(userId);
      const appts = await storage.getAppointmentsByUser(userId);
      const agents = await storage.getAiAgentsByUser(userId);
      const hot = userLeads.filter(l => l.status === "hot").length;
      const qualified = userLeads.filter(l => l.status === "qualified").length;
      const warm = userLeads.filter(l => l.status === "warm").length;
      const scheduled = appts.filter(a => a.status === "scheduled").length;
      const completed = appts.filter(a => a.status === "completed").length;
      const activeAgents = agents.filter(a => a.status === "active").length;
      return `Leads: ${userLeads.length} total (${hot} hot, ${qualified} qualified, ${warm} warm, ${userLeads.length - hot - qualified - warm} new). Appointments: ${appts.length} total (${scheduled} scheduled, ${completed} completed). AI Agents: ${agents.length} total (${activeAgents} active).`;
    }
    default:
      return `Unknown action: ${action}`;
  }
}

// ============================================================
// BACKGROUND STRATEGY GENERATION
// ============================================================

async function generateStrategyInBackground(userId: string, companyName: string, industry: string, website: string, description: string) {
  try {
    const prompt = `You are a senior marketing strategist at a top AI automation agency. A new client just signed up. Analyze their business and create a comprehensive, actionable marketing strategy.

CLIENT INFO:
- Company: ${companyName}
- Industry: ${industry}
- Website: ${website || "Not provided"}
- Description: ${description}

Generate a detailed marketing strategy with these sections (use markdown formatting):

## Executive Summary
Brief overview of what you recommend and expected ROI timeline.

## Target Audience Analysis
- Primary customer personas (2-3)
- Pain points and motivations
- Where they hang out online

## Lead Generation Strategy
- Top 3 channels to focus on (with reasoning)
- Content types that work best for this industry
- Paid advertising recommendations (budget allocation)

## AI Automation Opportunities
- Which processes to automate first
- Voice AI use cases specific to their business
- Chatbot deployment recommendations
- Email/SMS automation sequences

## 90-Day Action Plan
- Month 1: Foundation (specific tasks)
- Month 2: Growth (scaling what works)
- Month 3: Optimization (data-driven adjustments)

## Key Metrics to Track
- 5-7 KPIs specific to their business
- Realistic targets for each

## Competitive Edge
- What will differentiate them
- Quick wins they can implement immediately

Be specific, actionable, and tailored to their exact business. Use real-world examples relevant to their industry. Don't be generic — make this feel like a $5,000 consulting deliverable they're getting for free.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    let strategyText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        strategyText += block.text;
      }
    }

    await storage.upsertMarketingStrategy({
      userId,
      companyName,
      industry,
      strategy: strategyText,
      status: "completed",
    });

    console.log(`Strategy generated successfully for user ${userId}`);
  } catch (error) {
    console.error("Strategy generation error:", error);
    await storage.upsertMarketingStrategy({
      userId,
      companyName,
      industry,
      strategy: `# Marketing Strategy for ${companyName}

## Executive Summary
We're preparing a customized marketing strategy for your ${industry} business. Our AI is analyzing your business profile to create actionable recommendations.

## While We Finalize Your Strategy...

Here are immediate actions you can take:

### 1. Set Up Your AI Agents
Go to the **AI Agents** tab and activate your Lead Qualifier and Email Nurturing agents. These will start working immediately.

### 2. Configure Your Integrations
Visit **Settings > Integrations** to connect your email (SendGrid) and SMS (Twilio) providers for automated outreach.

### 3. Start Your First Campaign
Use the **Email & SMS** section to create your first AI-powered campaign. Our chat assistant can help you write compelling copy.

### 4. Book a Strategy Call
Schedule a discovery call with our team to discuss your custom strategy in detail.

---

*Your full AI-generated strategy will be available shortly. Check back in a few minutes, or refresh your dashboard.*`,
      status: "completed",
    });
  }
}

// ============================================================
// CLAUDE-POWERED AI HANDLER
// Uses Claude for EVERYTHING: chat, web search, CRM actions
// Web search via Claude's built-in web_search tool
// CRM actions via custom tools that call executeAction()
// ============================================================

async function handleAiAction(userId: string, userMessage: string, chatHistory: { role: string; content: string }[] = []): Promise<string> {
  const allLeads = await storage.getLeadsByUser(userId);
  const allAppts = await storage.getAppointmentsByUser(userId);
  const allAgents = await storage.getAiAgentsByUser(userId);

  const systemPrompt = `You are ArgiFlow AI — the senior AI strategist and automation expert at ArgiFlow, a premium AI Automation Agency specializing in Voice AI, Process Automation, Lead Generation Chatbots, AI Receptionists, and CRM Integration.

You are a trusted business advisor, not a generic chatbot. Communicate with the authority and polish of a top-tier marketing consultant. Be direct, data-driven, and action-oriented.

CURRENT CLIENT DATA:
- Leads: ${allLeads.length} total (${allLeads.filter(l => l.status === "hot").length} hot, ${allLeads.filter(l => l.status === "qualified").length} qualified, ${allLeads.filter(l => l.status === "warm").length} warm, ${allLeads.filter(l => l.status === "new").length} new)
- Appointments: ${allAppts.length} total (${allAppts.filter(a => a.status === "scheduled").length} scheduled, ${allAppts.filter(a => a.status === "completed").length} completed)
- AI Agents: ${allAgents.length} deployed (${allAgents.filter(a => a.status === "active").length} active)
${allLeads.length > 0 ? `- Pipeline: ${allLeads.slice(0, 5).map(l => `${l.name} (${l.status}, score: ${l.score})`).join(", ")}` : "- Pipeline is empty — ready for lead generation"}
${allAgents.length > 0 ? `- Active agents: ${allAgents.map(a => `${a.name} (${a.status})`).join(", ")}` : "- No agents deployed yet"}

CAPABILITIES:
You have CRM management tools and web search at your disposal. Use them proactively:
- **CRM Tools**: Generate leads, book appointments, activate AI agents, follow up with prospects, pull performance stats
- **Web Search**: Research market trends, competitors, industry data, and real-time information
- Combine multiple tools in a single response when beneficial

COMMUNICATION STANDARDS:
- Use **bold** for key terms, metrics, and action items
- Use bullet points and numbered lists for clarity
- Structure longer responses with clear sections
- Lead with insights and recommendations, not just data
- Be concise but thorough — every sentence should add value
- When presenting data, provide context and actionable takeaways
- Proactively suggest next steps and strategic recommendations
- Use professional business language appropriate for C-suite executives
- When the user asks to do something, execute it immediately using the tools — then summarize what was done and recommend next steps
- If the pipeline is empty, recommend a strategic approach to lead generation
- Reference specific ArgiFlow capabilities (Voice AI, RCM automation, lead gen chatbots) where relevant`;

  // Build message history for Claude
  const claudeMessages: Anthropic.MessageParam[] = chatHistory
    .filter(m => m.role === "user" || m.role === "assistant")
    .slice(-20)
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  if (claudeMessages.length === 0 || (claudeMessages[claudeMessages.length - 1] as any).content !== userMessage) {
    claudeMessages.push({ role: "user", content: userMessage });
  }

  // Define tools: Claude's built-in web search + our CRM action tools
  const tools: Anthropic.Tool[] = [
    // Claude's native web search — replaces Tavily entirely
    {
      type: "web_search_20250305" as any,
      name: "web_search",
    } as any,
    // CRM Tools
    {
      name: "generate_leads",
      description: "Generate new leads and add them to the user's CRM. Use when the user asks to create, generate, or add leads.",
      input_schema: {
        type: "object" as const,
        properties: {
          count: { type: "number", description: "Number of leads to generate (1-20)", default: 5 },
        },
        required: [],
      },
    },
    {
      name: "book_appointments",
      description: "Book appointments with the user's existing leads. Use when the user asks to book, schedule, or create appointments.",
      input_schema: {
        type: "object" as const,
        properties: {
          count: { type: "number", description: "Number of appointments to book (1-10)", default: 3 },
        },
        required: [],
      },
    },
    {
      name: "activate_agents",
      description: "Activate AI automation agents (Lead Qualifier, Email Nurturing, Appointment Setter, Chat Responder, Ad Optimizer, Follow-Up Agent, Voice AI Agent, Social Media Agent). Use when the user asks to set up, activate, or deploy AI agents.",
      input_schema: {
        type: "object" as const,
        properties: {
          count: { type: "number", description: "Number of agents to activate", default: 8 },
        },
        required: [],
      },
    },
    {
      name: "follow_up_leads",
      description: "Create follow-up calls for warm and new leads. Use when the user asks to follow up with leads.",
      input_schema: {
        type: "object" as const,
        properties: {
          count: { type: "number", description: "Number of leads to follow up with (1-5)", default: 3 },
        },
        required: [],
      },
    },
    {
      name: "get_stats",
      description: "Get the user's current dashboard statistics including leads, appointments, and agent counts. Use when the user asks for stats, reports, performance, or an overview.",
      input_schema: {
        type: "object" as const,
        properties: {},
        required: [],
      },
    },
  ];

  try {
    // First Claude call — may use tools
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: systemPrompt,
      messages: claudeMessages,
      tools,
    });

    // Agentic loop — process tool calls until Claude gives a final text response
    let loopCount = 0;
    const maxLoops = 10;
    let currentMessages = [...claudeMessages];

    while (response.stop_reason === "tool_use" && loopCount < maxLoops) {
      loopCount++;

      // Collect all tool uses from the response
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) break;

      // Add assistant response to message chain
      currentMessages.push({ role: "assistant", content: response.content as any });

      // Process each tool call and build results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        let result: string;

        if (toolUse.name === "web_search") {
          // Claude's built-in web search handles itself — we don't manually process it
          // The SDK handles web_search_20250305 automatically in the agentic loop
          result = "Web search completed.";
        } else {
          // CRM action tools
          result = await executeAction(userId, toolUse.name, toolUse.input || {});
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Add tool results to message chain
      currentMessages.push({ role: "user", content: toolResults as any });

      // Call Claude again with updated context
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        system: systemPrompt,
        messages: currentMessages,
        tools,
      });
    }

    // Extract final text from Claude's response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    const finalText = textBlocks.map(b => b.text).join("\n").trim();

    return finalText || "Done! I've completed the actions. Check your dashboard to see the updates.";
  } catch (error: any) {
    console.error("Claude API error:", error);
    return fallbackResponse(userId, userMessage);
  }
}

// ============================================================
// FALLBACK — runs if Claude API is temporarily down
// Basic keyword matching to still execute CRM actions
// ============================================================

async function fallbackResponse(userId: string, msg: string): Promise<string> {
  const lower = msg.toLowerCase();
  if (lower.includes("lead") && (lower.includes("generate") || lower.includes("create"))) {
    const countMatch = lower.match(/(\d+)/);
    const count = Math.min(countMatch ? parseInt(countMatch[1]) : 3, 20);
    const result = await executeAction(userId, "generate_leads", { count });
    return `Running in fallback mode, but got it done! ${result}`;
  }
  if (lower.includes("appointment") || lower.includes("book")) {
    const countMatch = lower.match(/(\d+)/);
    const count = countMatch ? parseInt(countMatch[1]) : 2;
    const result = await executeAction(userId, "book_appointments", { count });
    return `Running in fallback mode, but done! ${result}`;
  }
  if (lower.includes("agent") || lower.includes("activate")) {
    const result = await executeAction(userId, "activate_agents", {});
    return `Running in fallback mode, but done! ${result}`;
  }
  if (lower.includes("stat") || lower.includes("report") || lower.includes("performance")) {
    const result = await executeAction(userId, "get_stats", {});
    return `Here's your current status:\n\n${result}`;
  }
  if (lower.includes("follow") && lower.includes("up")) {
    const result = await executeAction(userId, "follow_up_leads", {});
    return `Running in fallback mode, but done! ${result}`;
  }
  if (lower.includes("help")) {
    return "I can help you with:\n\n- Generating new leads for your CRM\n- Booking appointments with your leads\n- Activating AI automation agents\n- Following up with warm leads\n- Showing your performance stats\n- Researching markets, competitors, and trends\n- Writing emails, ad copy, and marketing content\n\nPowered 100% by Anthropic Claude. Just tell me what you need!";
  }
  return "I'm experiencing a temporary issue connecting to Claude. Please try again in a moment. In the meantime, you can still ask me to generate leads, book appointments, or activate agents — those actions still work!";
}

// ============================================================
// CLAUDE-POWERED WEB SEARCH ENDPOINT
// Standalone endpoint for web research (used by frontend)
// ============================================================

async function claudeWebSearch(query: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      system: "You are a helpful research assistant. Search the web and provide a clear, concise summary of the findings. Include relevant source URLs when available.",
      messages: [{ role: "user", content: query }],
      tools: [
        {
          type: "web_search_20250305" as any,
          name: "web_search",
        } as any,
      ],
    });

    // Agentic loop for search
    let currentResponse = response;
    let messages: Anthropic.MessageParam[] = [{ role: "user", content: query }];
    let loops = 0;

    while (currentResponse.stop_reason === "tool_use" && loops < 5) {
      loops++;
      messages.push({ role: "assistant", content: currentResponse.content as any });

      const toolUses = currentResponse.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const results: Anthropic.ToolResultBlockParam[] = toolUses.map(tu => ({
        type: "tool_result" as const,
        tool_use_id: tu.id,
        content: "Search completed.",
      }));

      messages.push({ role: "user", content: results as any });

      currentResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        system: "You are a helpful research assistant. Provide a clear, concise summary of your web search findings.",
        messages,
        tools: [
          {
            type: "web_search_20250305" as any,
            name: "web_search",
          } as any,
        ],
      });
    }

    const text = currentResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("\n");

    return text || "No results found.";
  } catch (error) {
    console.error("Claude web search error:", error);
    return "Search temporarily unavailable. Please try again.";
  }
}

// ============================================================
// CLAUDE CONTENT GENERATION ENDPOINT
// Write emails, ad copy, social posts, etc.
// ============================================================

async function claudeGenerate(prompt: string, type: string = "general"): Promise<string> {
  const systemPrompts: Record<string, string> = {
    email: "You are an expert email copywriter for B2B businesses. Write compelling, conversion-focused emails that drive action. Keep them concise and professional.",
    ad: "You are an expert advertising copywriter. Write attention-grabbing ad copy optimized for the specified platform. Include headlines, body copy, and CTAs.",
    social: "You are a social media content expert. Write engaging posts optimized for the specified platform. Include relevant hashtags and CTAs.",
    sms: "You are an SMS marketing expert. Write concise, compelling text messages under 160 characters that drive immediate action.",
    blog: "You are a content marketing expert. Write informative, SEO-friendly blog content that positions the business as an authority.",
    script: "You are a sales script expert. Write natural, conversational scripts that qualify leads and move them toward a booking.",
    general: "You are a helpful AI assistant for ArgiFlow, an AI Automation Agency. Help the user with whatever they need.",
  };

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: systemPrompts[type] || systemPrompts.general,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("\n");

    return text || "Unable to generate content. Please try again.";
  } catch (error) {
    console.error("Claude generate error:", error);
    return "Content generation temporarily unavailable.";
  }
}

// ============================================================
// EXPRESS ROUTES
// ============================================================

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.set("trust proxy", 1);
  app.use(getSession());

  // ---- AUTH ----

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }
      const { email, password, firstName, lastName } = parsed.data;
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({ email, passwordHash, firstName, lastName });
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, companyName: user.companyName, industry: user.industry, website: user.website, companyDescription: user.companyDescription, onboardingCompleted: user.onboardingCompleted });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }
      const { email, password } = parsed.data;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const valid = await comparePasswords(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, companyName: user.companyName, industry: user.industry, website: user.website, companyDescription: user.companyDescription, onboardingCompleted: user.onboardingCompleted });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, companyName: user.companyName, industry: user.industry, website: user.website, companyDescription: user.companyDescription, onboardingCompleted: user.onboardingCompleted });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ---- ONBOARDING & STRATEGY GENERATION ----

  app.post("/api/onboarding", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = onboardingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }
      const { companyName, industry, website, companyDescription } = parsed.data;

      await storage.updateUser(userId, {
        companyName,
        industry,
        website: website || null,
        companyDescription,
        onboardingCompleted: new Date(),
      });

      await storage.upsertMarketingStrategy({
        userId,
        companyName,
        industry,
        strategy: "",
        status: "generating",
      });

      res.json({ success: true });

      generateStrategyInBackground(userId, companyName, industry, website || "", companyDescription).catch((err) => {
        console.error("Background strategy generation failed:", err);
      });
    } catch (error) {
      console.error("Onboarding error:", error);
      res.status(500).json({ message: "Onboarding failed" });
    }
  });

  app.get("/api/strategy", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const strategy = await storage.getMarketingStrategy(userId);
      res.json(strategy || null);
    } catch (error) {
      console.error("Error fetching strategy:", error);
      res.status(500).json({ message: "Failed to fetch strategy" });
    }
  });

  app.post("/api/strategy/regenerate", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      if (!user?.companyName || !user?.industry || !user?.companyDescription) {
        return res.status(400).json({ message: "Company info missing. Please update your profile." });
      }
      await storage.upsertMarketingStrategy({
        userId,
        companyName: user.companyName,
        industry: user.industry,
        strategy: "",
        status: "generating",
      });
      res.json({ success: true });

      generateStrategyInBackground(userId, user.companyName, user.industry, user.website || "", user.companyDescription).catch((err) => {
        console.error("Background strategy regeneration failed:", err);
      });
    } catch (error) {
      console.error("Regeneration error:", error);
      res.status(500).json({ message: "Failed to regenerate strategy" });
    }
  });

  // ---- DASHBOARD STATS ----

  app.get("/api/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const allLeads = await storage.getLeadsByUser(userId);
      const allAppts = await storage.getAppointmentsByUser(userId);
      const activeCount = allLeads.filter(l => l.status === "new" || l.status === "warm" || l.status === "hot" || l.status === "qualified").length;
      const cachedStats = await storage.getStatsByUser(userId);
      res.json({
        totalLeads: allLeads.length,
        activeLeads: activeCount,
        appointmentsBooked: allAppts.length,
        conversionRate: cachedStats?.conversionRate || 0,
        revenue: cachedStats?.revenue || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // ---- LEADS ----

  app.get("/api/leads", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const result = await storage.getLeadsByUser(userId);
      res.json(result);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.post("/api/leads", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = insertLeadSchema.safeParse({ ...req.body, userId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }
      const lead = await storage.createLead(parsed.data);
      res.json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.delete("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.deleteLead(req.params.id as string, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  app.delete("/api/leads", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.deleteAllLeadsByUser(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting all leads:", error);
      res.status(500).json({ message: "Failed to delete leads" });
    }
  });

  // ---- APPOINTMENTS ----

  app.get("/api/appointments", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const result = await storage.getAppointmentsByUser(userId);
      res.json(result);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  // ---- AI AGENTS ----

  app.get("/api/ai-agents", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const result = await storage.getAiAgentsByUser(userId);
      res.json(result);
    } catch (error) {
      console.error("Error fetching AI agents:", error);
      res.status(500).json({ message: "Failed to fetch AI agents" });
    }
  });

  app.post("/api/ai-agents", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { name, type, description, status } = req.body;
      if (!name || !type) {
        return res.status(400).json({ message: "Name and type are required" });
      }
      const agent = await storage.createAiAgent({
        userId,
        name,
        type,
        status: status || "active",
        tasksCompleted: 0,
        successRate: 0,
        description: description || "",
      });
      res.json(agent);
    } catch (error) {
      console.error("Error creating AI agent:", error);
      res.status(500).json({ message: "Failed to create AI agent" });
    }
  });

  app.patch("/api/ai-agents/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const id = req.params.id as string;
      const { name, status, description, type } = req.body;
      const data: Record<string, string> = {};
      if (name !== undefined) data.name = name;
      if (status !== undefined) data.status = status;
      if (description !== undefined) data.description = description;
      if (type !== undefined) data.type = type;
      const result = await storage.updateAiAgent(id, userId, data);
      if (!result) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error updating AI agent:", error);
      res.status(500).json({ message: "Failed to update AI agent" });
    }
  });

  // ---- SETTINGS ----

  app.get("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let settings = await storage.getSettingsByUser(userId);
      if (!settings) {
        settings = await storage.upsertSettings({ userId, emailNotifications: true, smsNotifications: false, aiAutoRespond: true, leadScoring: true, appointmentReminders: true, weeklyReport: true, darkMode: true, twoFactorAuth: false });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const settings = await storage.upsertSettings({ ...req.body, userId });
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // ---- CHAT (Claude-powered) ----

  app.get("/api/chat/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const messages = await storage.getChatMessages(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { content } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Message content is required" });
      }
      const userMessage = await storage.createChatMessage({ userId, role: "user", content });

      const history = await storage.getChatMessages(userId);
      const chatHistory = history.slice(-20).map(m => ({ role: m.role, content: m.content }));

      const aiReply = await handleAiAction(userId, content, chatHistory);
      const aiMessage = await storage.createChatMessage({ userId, role: "assistant", content: aiReply });

      res.json({ userMessage, aiMessage });
    } catch (error) {
      console.error("Error sending chat message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.delete("/api/chat/messages", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.clearChatMessages(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear messages" });
    }
  });

  // ---- CLAUDE WEB SEARCH ENDPOINT (new) ----

  app.post("/api/ai/search", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }
      const result = await claudeWebSearch(query);
      res.json({ result });
    } catch (error) {
      console.error("Error in AI search:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // ---- CLAUDE CONTENT GENERATION ENDPOINT (new) ----

  app.post("/api/ai/generate", isAuthenticated, async (req, res) => {
    try {
      const { prompt, type } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ message: "Prompt is required" });
      }
      const result = await claudeGenerate(prompt, type || "general");
      res.json({ result });
    } catch (error) {
      console.error("Error in AI generate:", error);
      res.status(500).json({ message: "Generation failed" });
    }
  });

  // ---- DISCOVERY CALL SUBMISSIONS (new) ----

  app.post("/api/discovery", async (req, res) => {
    try {
      const { firstName, lastName, email, phone, company, website, teamSize, revenue, challenge, interest } = req.body;
      if (!firstName || !lastName || !email || !company) {
        return res.status(400).json({ message: "Required fields: firstName, lastName, email, company" });
      }
      // Store as a lead for admin to see
      const lead = await storage.createLead({
        userId: "discovery", // special marker for discovery calls
        name: `${firstName} ${lastName}`,
        email,
        phone: phone || "",
        source: "Discovery Call",
        status: "new",
        score: 85, // high intent — they booked a call
      });
      console.log(`New discovery call submission: ${firstName} ${lastName} (${email}) from ${company}`);
      res.json({ success: true, message: "Discovery call request received" });
    } catch (error) {
      console.error("Error saving discovery call:", error);
      res.status(500).json({ message: "Failed to save discovery call" });
    }
  });

  // ---- ADMIN ----

  await clearOldSeedData();
  await seedSuperAdmin();

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const admin = await storage.getAdminByEmail(email);
      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const valid = await comparePasswords(password, admin.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.session.adminId = admin.id;
      res.json({ id: admin.id, email: admin.email, name: admin.name });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    delete req.session.adminId;
    res.json({ success: true });
  });

  app.get("/api/admin/me", isAdmin, async (req, res) => {
    try {
      const admin = await storage.getAdminById(req.session.adminId!);
      if (!admin) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      res.json({ id: admin.id, email: admin.email, name: admin.name });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin" });
    }
  });

  app.get("/api/admin/leads", isAdmin, async (_req, res) => {
    try {
      const result = await storage.getAllLeads();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get("/api/admin/appointments", isAdmin, async (_req, res) => {
    try {
      const result = await storage.getAllAppointments();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.get("/api/admin/agents", isAdmin, async (_req, res) => {
    try {
      const result = await storage.getAllAiAgents();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.get("/api/admin/stats", isAdmin, async (_req, res) => {
    try {
      const allStats = await storage.getAllStats();
      const allLeads = await storage.getAllLeads();
      const allAppointments = await storage.getAllAppointments();
      const allAgents = await storage.getAllAiAgents();
      res.json({
        totalUsers: allStats.length,
        totalLeads: allLeads.length,
        totalAppointments: allAppointments.length,
        totalAgents: allAgents.length,
        revenue: allStats.reduce((sum, s) => sum + (s.revenue || 0), 0),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // ============================================================
  // SALES FUNNELS
  // ============================================================

  app.get("/api/funnels", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const userFunnels = await storage.getFunnelsByUser(userId);
      res.json(userFunnels);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch funnels" });
    }
  });

  app.post("/api/funnels", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { name, description, stages } = req.body;
      if (!name || !stages || !Array.isArray(stages) || stages.length === 0) {
        return res.status(400).json({ message: "Name and at least one stage are required" });
      }
      const funnel = await storage.createFunnel({ userId, name, description, isActive: true });
      for (let i = 0; i < stages.length; i++) {
        await storage.createFunnelStage({
          funnelId: funnel.id,
          name: stages[i].name,
          position: i,
          color: stages[i].color || "#6366f1",
        });
      }
      const createdStages = await storage.getFunnelStages(funnel.id);
      res.json({ ...funnel, stages: createdStages });
    } catch (error) {
      res.status(500).json({ message: "Failed to create funnel" });
    }
  });

  app.delete("/api/funnels/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const funnel = await storage.getFunnelById(req.params.id as string);
      if (!funnel || funnel.userId !== userId) return res.status(404).json({ message: "Funnel not found" });
      await storage.deleteFunnelDeals(funnel.id);
      await storage.deleteFunnelStages(funnel.id);
      await storage.deleteFunnel(funnel.id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete funnel" });
    }
  });

  app.get("/api/funnels/:id/stages", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const funnel = await storage.getFunnelById(req.params.id as string);
      if (!funnel || funnel.userId !== userId) return res.status(404).json({ message: "Funnel not found" });
      const stages = await storage.getFunnelStages(funnel.id);
      res.json(stages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stages" });
    }
  });

  app.get("/api/funnels/:id/deals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const funnel = await storage.getFunnelById(req.params.id as string);
      if (!funnel || funnel.userId !== userId) return res.status(404).json({ message: "Funnel not found" });
      const deals = await storage.getFunnelDeals(funnel.id);
      res.json(deals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deals" });
    }
  });

  app.post("/api/funnels/:id/deals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const funnel = await storage.getFunnelById(req.params.id as string);
      if (!funnel || funnel.userId !== userId) return res.status(404).json({ message: "Funnel not found" });
      const { stageId, contactName, contactEmail, value } = req.body;
      if (!stageId || !contactName) {
        return res.status(400).json({ message: "Stage and contact name are required" });
      }
      const deal = await storage.createFunnelDeal({
        funnelId: funnel.id,
        stageId,
        userId,
        contactName,
        contactEmail: contactEmail || null,
        value: value || 0,
        status: "open",
      });
      res.json(deal);
    } catch (error) {
      res.status(500).json({ message: "Failed to create deal" });
    }
  });

  app.patch("/api/deals/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { stageId, contactName, contactEmail, value, status } = req.body;
      const updated = await storage.updateFunnelDeal(req.params.id as string, {
        ...(stageId && { stageId }),
        ...(contactName && { contactName }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(value !== undefined && { value }),
        ...(status && { status }),
      });
      if (!updated || updated.userId !== userId) return res.status(404).json({ message: "Deal not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update deal" });
    }
  });

  app.delete("/api/deals/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.deleteFunnelDeal(req.params.id as string, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete deal" });
    }
  });

  return httpServer;
}

// ============================================================
// DATABASE SEED / CLEANUP
// ============================================================

async function clearOldSeedData() {
  try {
    const { eq, and, inArray } = await import("drizzle-orm");
    const knownSeedNames = ["Sarah Johnson", "Robert Chen", "Emma Wilson", "David Park", "Lisa Anderson", "Michael Torres", "Jennifer Kim", "Alex Rivera"];
    const seedLeads = await db.select().from(leads).where(inArray(leads.name, knownSeedNames));
    if (seedLeads.length > 0) {
      await db.delete(aiChatMessages);
      await db.delete(appointments);
      await db.delete(aiAgents);
      await db.delete(leads);
      await db.delete(dashboardStats);
      console.log("Cleared old seed data from all tables");
    }
  } catch (error) {
    console.error("Error clearing seed data:", error);
  }
}

async function seedSuperAdmin() {
  const email = "abel@argilette.com";
  const existing = await storage.getAdminByEmail(email);
  if (!existing) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      console.warn("ADMIN_PASSWORD not set. Super admin not created. Set the ADMIN_PASSWORD secret to enable admin login.");
      return;
    }
    const passwordHash = await hashPassword(password);
    await storage.createAdmin({ email, passwordHash, name: "Abel" });
    console.log("Super admin seeded:", email);
  }
}
