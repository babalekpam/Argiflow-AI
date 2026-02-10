import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { leads, appointments, aiAgents, dashboardStats, aiChatMessages } from "@shared/schema";
import { getSession } from "./replit_integrations/auth/replitAuth";
import { registerSchema, loginSchema, insertLeadSchema } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import Anthropic from "@anthropic-ai/sdk";

async function tavilySearch(query: string, options: { maxResults?: number; topic?: string } = {}): Promise<{ answer?: string; results: { title: string; url: string; content: string }[] }> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return { results: [], answer: "Web search is not configured. Please add a TAVILY_API_KEY." };
  }
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: options.maxResults || 5,
        topic: options.topic || "general",
        include_answer: true,
        include_raw_content: false,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Tavily API error:", errText);
      return { results: [], answer: "Search failed. Please try again." };
    }
    const data = await res.json() as any;
    return {
      answer: data.answer || undefined,
      results: (data.results || []).map((r: any) => ({
        title: r.title || "",
        url: r.url || "",
        content: r.content || "",
      })),
    };
  } catch (err) {
    console.error("Tavily search error:", err);
    return { results: [], answer: "Search temporarily unavailable." };
  }
}

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

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

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
      return `ACTIONS_COMPLETED: Created ${count} leads: ${created.join(", ")}. Total leads now: ${allLeads.length}.`;
    }
    case "book_appointments": {
      const userLeads = await storage.getLeadsByUser(userId);
      if (userLeads.length === 0) return "NO_LEADS: User has no leads yet.";
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
      return `ACTIONS_COMPLETED: Booked ${count} appointments: ${booked.join("; ")}.`;
    }
    case "activate_agents": {
      const agentTypes = [
        { name: "Lead Qualifier", type: "Qualification", desc: "Automatically scores and qualifies incoming leads based on engagement, demographics, and behavior patterns." },
        { name: "Email Nurturing", type: "Communication", desc: "Sends personalized email sequences that adapt based on recipient behavior and engagement metrics." },
        { name: "Appointment Setter", type: "Scheduling", desc: "Books qualified leads into available calendar slots and handles rescheduling automatically." },
        { name: "Chat Responder", type: "Support", desc: "Responds to incoming chat messages instantly, qualifying leads and answering common questions." },
        { name: "Ad Optimizer", type: "Marketing", desc: "Monitors ad performance across platforms and adjusts bids, targeting, and creative in real-time." },
        { name: "Follow-Up Agent", type: "Retention", desc: "Automatically follows up with leads who haven't responded, using multi-channel outreach." },
      ];
      const existing = await storage.getAiAgentsByUser(userId);
      const existingNames = new Set(existing.map(a => a.name));
      const available = agentTypes.filter(a => !existingNames.has(a.name));
      if (available.length === 0) return "ALL_AGENTS_EXIST: All 6 AI agents are already set up.";
      const count = Math.min(params.count || available.length, available.length);
      const toCreate = available.slice(0, count);
      const created: string[] = [];
      for (const agent of toCreate) {
        await storage.createAiAgent({ userId, name: agent.name, type: agent.type, status: "active", tasksCompleted: 0, successRate: 0, description: agent.desc });
        created.push(agent.name);
      }
      return `ACTIONS_COMPLETED: Activated ${count} agents: ${created.join(", ")}.`;
    }
    case "follow_up_leads": {
      const userLeads = await storage.getLeadsByUser(userId);
      const warmLeads = userLeads.filter(l => l.status === "warm" || l.status === "new");
      if (warmLeads.length === 0) return "NO_WARM_LEADS: No warm or new leads to follow up with.";
      const count = Math.min(params.count || warmLeads.length, 5);
      const appts: string[] = [];
      for (let i = 0; i < count; i++) {
        const lead = warmLeads[i];
        await storage.createAppointment({ userId, leadName: lead.name, type: "Follow-Up Call", date: new Date(Date.now() + randomInt(24, 96) * 60 * 60 * 1000), status: "scheduled" });
        appts.push(lead.name);
      }
      return `ACTIONS_COMPLETED: Created follow-up calls for ${count} leads: ${appts.join(", ")}.`;
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
      return `STATS: Leads: ${userLeads.length} total (${hot} hot, ${qualified} qualified, ${warm} warm, ${userLeads.length - hot - qualified - warm} new). Appointments: ${appts.length} total (${scheduled} scheduled, ${completed} completed). AI Agents: ${agents.length} total (${activeAgents} active).`;
    }
    case "web_search": {
      const query = params.query || params.q || "";
      if (!query) return "SEARCH_ERROR: No search query provided.";
      const topic = params.topic || "general";
      const maxResults = Math.min(params.max_results || 5, 10);
      const searchResult = await tavilySearch(query, { maxResults, topic });
      let formatted = `SEARCH_RESULTS for "${query}":\n`;
      if (searchResult.answer) {
        formatted += `\nSummary: ${searchResult.answer}\n`;
      }
      if (searchResult.results.length > 0) {
        formatted += `\nSources:\n`;
        searchResult.results.forEach((r, i) => {
          formatted += `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.content.slice(0, 300)}\n\n`;
        });
      }
      return formatted;
    }
    default:
      return "NO_ACTION";
  }
}

async function handleAiAction(userId: string, userMessage: string, chatHistory: { role: string; content: string }[] = []): Promise<string> {
  const allLeads = await storage.getLeadsByUser(userId);
  const allAppts = await storage.getAppointmentsByUser(userId);
  const allAgents = await storage.getAiAgentsByUser(userId);

  const systemPrompt = `You are ArgiFlow AI, an intelligent assistant for automated client acquisition. You help business owners manage leads, appointments, AI agents, and marketing campaigns. You have access to the internet and can research anything for the user.

CURRENT USER DATA:
- Leads: ${allLeads.length} total (${allLeads.filter(l => l.status === "hot").length} hot, ${allLeads.filter(l => l.status === "qualified").length} qualified, ${allLeads.filter(l => l.status === "warm").length} warm, ${allLeads.filter(l => l.status === "new").length} new)
- Appointments: ${allAppts.length} total (${allAppts.filter(a => a.status === "scheduled").length} scheduled, ${allAppts.filter(a => a.status === "completed").length} completed)
- AI Agents: ${allAgents.length} total (${allAgents.filter(a => a.status === "active").length} active)
${allLeads.length > 0 ? `- Recent leads: ${allLeads.slice(0, 5).map(l => `${l.name} (${l.status}, score: ${l.score})`).join(", ")}` : ""}
${allAgents.length > 0 ? `- Agents: ${allAgents.map(a => `${a.name} (${a.status})`).join(", ")}` : ""}

AVAILABLE ACTIONS:
You can perform real actions in the user's account AND search the internet. When you want to perform an action, include an ACTION block in your response using this exact format:

[ACTION:generate_leads:{"count":5}]
[ACTION:book_appointments:{"count":3}]
[ACTION:activate_agents:{"count":6}]
[ACTION:follow_up_leads:{"count":3}]
[ACTION:get_stats:{}]
[ACTION:web_search:{"query":"your search query here"}]
[ACTION:web_search:{"query":"latest news topic","topic":"news"}]

WEB SEARCH CAPABILITY:
- You can search the internet for ANY topic the user asks about
- Use web_search when the user asks you to research, look up, find information, or when you need current data
- The topic parameter can be "general" (default) or "news" for recent news
- You will receive search results with summaries and source links - use them to provide informed, cited answers
- ALWAYS use web_search when the user asks questions about current events, market trends, competitors, industry data, best practices, tools, or anything that requires up-to-date information
- You can combine web search with other actions (e.g., research a topic AND generate leads)

Include the ACTION block naturally within your response. You can include multiple actions. The system will execute them and the results will be visible immediately on the user's dashboard.

GUIDELINES:
- Be conversational, helpful, and proactive
- Give strategic advice about lead generation, sales, and marketing
- When the user asks to do something, DO IT by including the action block
- When the user asks a question that needs research, SEARCH THE WEB for them
- After receiving search results, summarize the findings clearly and cite sources when relevant
- Provide context about what you did and next steps
- If the user has no leads yet, suggest generating some first
- Be specific with numbers and recommendations
- Keep responses concise but informative`;

  const claudeMessages: { role: "user" | "assistant"; content: string }[] = chatHistory
    .filter(m => m.role === "user" || m.role === "assistant")
    .slice(-20)
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  if (claudeMessages.length === 0 || claudeMessages[claudeMessages.length - 1].content !== userMessage) {
    claudeMessages.push({ role: "user", content: userMessage });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: claudeMessages,
    });

    let aiText = response.content[0].type === "text" ? response.content[0].text : "";

    const actionRegex = /\[ACTION:(\w+):\{([^}]*)\}\]/g;
    let match;
    const actionResults: string[] = [];
    const searchResults: string[] = [];

    while ((match = actionRegex.exec(aiText)) !== null) {
      const actionName = match[1];
      let params: any = {};
      try { params = JSON.parse(`{${match[2]}}`); } catch {}
      const result = await executeAction(userId, actionName, params);
      actionResults.push(result);
      if (actionName === "web_search") {
        searchResults.push(result);
      }
    }

    aiText = aiText.replace(/\[ACTION:\w+:\{[^}]*\}\]/g, "").trim();

    if (searchResults.length > 0) {
      const searchContext = searchResults.join("\n\n");
      const followUpMessages = [
        ...claudeMessages,
        { role: "assistant" as const, content: aiText || "Let me search for that information." },
        { role: "user" as const, content: `Here are the web search results. Please summarize and present the key findings to the user in a clear, helpful way. Include relevant source links when appropriate.\n\n${searchContext}` },
      ];
      try {
        const followUp = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 1500,
          system: systemPrompt,
          messages: followUpMessages,
        });
        const followUpText = followUp.content[0].type === "text" ? followUp.content[0].text : "";
        aiText = followUpText.replace(/\[ACTION:\w+:\{[^}]*\}\]/g, "").trim() || aiText;
      } catch (err) {
        console.error("Follow-up Claude call failed:", err);
        aiText = aiText ? `${aiText}\n\n${searchContext}` : searchContext;
      }
    }

    const failedResults = actionResults.filter(r => r.startsWith("NO_LEADS") || r.startsWith("NO_WARM_LEADS") || r.startsWith("ALL_AGENTS_EXIST"));
    if (failedResults.length > 0) {
      const notes = failedResults.map(r => {
        if (r.startsWith("NO_LEADS")) return "You don't have any leads yet. Try asking me to generate some leads first.";
        if (r.startsWith("NO_WARM_LEADS")) return "No warm or new leads to follow up with right now.";
        if (r.startsWith("ALL_AGENTS_EXIST")) return "All AI agents are already set up and running.";
        return "";
      }).filter(Boolean);
      aiText = aiText ? `${aiText}\n\nNote: ${notes.join(" ")}` : notes.join("\n");
    }

    if (!aiText && actionResults.length > 0) {
      aiText = "Done! I've completed the actions. Check your dashboard to see the updates.";
    }

    return aiText || "I'm here to help! Ask me anything about lead generation, appointments, or marketing strategies.";
  } catch (error: any) {
    console.error("Anthropic API error:", error);
    return fallbackResponse(userId, userMessage);
  }
}

async function fallbackResponse(userId: string, msg: string): Promise<string> {
  const lower = msg.toLowerCase();
  if (lower.includes("lead") && (lower.includes("generate") || lower.includes("create"))) {
    const countMatch = lower.match(/(\d+)/);
    const count = Math.min(countMatch ? parseInt(countMatch[1]) : 3, 20);
    const result = await executeAction(userId, "generate_leads", { count });
    return `I'm running in basic mode right now, but I still got things done! ${result.replace("ACTIONS_COMPLETED: ", "")}`;
  }
  if (lower.includes("appointment") || lower.includes("book")) {
    const countMatch = lower.match(/(\d+)/);
    const count = countMatch ? parseInt(countMatch[1]) : 2;
    const result = await executeAction(userId, "book_appointments", { count });
    if (result.startsWith("NO_LEADS")) return "You don't have any leads yet. Ask me to generate some leads first!";
    return `Running in basic mode, but done! ${result.replace("ACTIONS_COMPLETED: ", "")}`;
  }
  if (lower.includes("agent") || lower.includes("activate")) {
    const result = await executeAction(userId, "activate_agents", {});
    return `Running in basic mode, but done! ${result.replace("ACTIONS_COMPLETED: ", "").replace("ALL_AGENTS_EXIST: ", "")}`;
  }
  if (lower.includes("stat") || lower.includes("report") || lower.includes("performance")) {
    const result = await executeAction(userId, "get_stats", {});
    return result.replace("STATS: ", "Here's your current status:\n\n");
  }
  if (lower.includes("search") || lower.includes("research") || lower.includes("look up") || lower.includes("find out") || lower.includes("what is") || lower.includes("who is") || lower.includes("how to")) {
    const result = await executeAction(userId, "web_search", { query: msg });
    if (result.startsWith("SEARCH_RESULTS")) {
      return `I ran a quick search for you (basic mode):\n\n${result.replace("SEARCH_RESULTS", "Results")}`;
    }
    return result;
  }
  if (lower.includes("help")) {
    return "I can help you with:\n\n- Generating new leads for your CRM\n- Booking appointments with your leads\n- Activating AI automation agents\n- Creating email/SMS campaigns\n- Following up with warm leads\n- Showing your performance stats\n- Searching the internet for research and information\n\nJust tell me what you need!";
  }
  return "I'm experiencing a temporary issue connecting to my AI engine. Please try again in a moment. You can still ask me to generate leads, book appointments, activate agents, or search the web - those actions still work!";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.set("trust proxy", 1);
  app.use(getSession());

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
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
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
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
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
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const stats = await storage.getStatsByUser(userId);
      res.json(stats || { totalLeads: 0, activeLeads: 0, appointmentsBooked: 0, conversionRate: 0, revenue: 0 });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

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

  return httpServer;
}

async function clearOldSeedData() {
  try {
    const { eq, and, inArray } = await import("drizzle-orm");
    const knownSeedNames = ["Sarah Johnson", "Robert Chen", "Emma Wilson", "David Park", "Lisa Anderson", "Michael Torres", "Jennifer Kim", "Alex Rivera"];
    const knownAgentNames = ["Lead Qualifier", "Email Nurturing", "Appointment Setter", "Chat Responder", "Ad Optimizer", "Follow-Up Agent"];
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
