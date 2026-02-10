import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { leads, appointments, aiAgents, dashboardStats, aiChatMessages } from "@shared/schema";
import { getSession } from "./replit_integrations/auth/replitAuth";
import { registerSchema, loginSchema, insertLeadSchema } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

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

async function handleAiAction(userId: string, userMessage: string): Promise<string> {
  const msg = userMessage.toLowerCase();

  if (msg.includes("lead") && (msg.includes("generate") || msg.includes("find") || msg.includes("get") || msg.includes("create") || msg.includes("add"))) {
    const countMatch = msg.match(/(\d+)/);
    const count = Math.min(countMatch ? parseInt(countMatch[1]) : 3, 20);
    const created: string[] = [];
    for (let i = 0; i < count; i++) {
      const leadData = generateRandomLead(userId);
      await storage.createLead(leadData);
      created.push(leadData.name);
    }
    const stats = await storage.getStatsByUser(userId);
    const allLeads = await storage.getLeadsByUser(userId);
    const activeCount = allLeads.filter(l => l.status === "hot" || l.status === "qualified" || l.status === "warm").length;
    await storage.upsertStats({ userId, totalLeads: allLeads.length, activeLeads: activeCount, appointmentsBooked: stats?.appointmentsBooked || 0, conversionRate: stats?.conversionRate || 0, revenue: stats?.revenue || 0 });
    return `Done! I've generated ${count} new lead${count > 1 ? "s" : ""} and added them to your CRM:\n\n${created.map((n, i) => `${i + 1}. ${n}`).join("\n")}\n\nYour total leads are now ${allLeads.length}. Head over to Leads & CRM to see them.`;
  }

  if (msg.includes("appointment") || msg.includes("schedule") || msg.includes("book") || msg.includes("meeting") || msg.includes("call")) {
    const leads = await storage.getLeadsByUser(userId);
    if (leads.length === 0) {
      return "You don't have any leads yet. I need leads to schedule appointments with. Say \"generate 5 leads\" and I'll create some for you first!";
    }
    const countMatch = msg.match(/(\d+)/);
    const count = Math.min(countMatch ? parseInt(countMatch[1]) : 2, leads.length);
    const types = ["Discovery Call", "Strategy Session", "Sales Call", "Follow-Up Call", "Demo Call", "Consultation"];
    const booked: string[] = [];
    const shuffled = [...leads].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      const lead = shuffled[i];
      const hoursFromNow = randomInt(4, 72);
      const appt = await storage.createAppointment({
        userId,
        leadName: lead.name,
        type: randomPick(types),
        date: new Date(Date.now() + hoursFromNow * 60 * 60 * 1000),
        status: "scheduled",
      });
      booked.push(`${lead.name} - ${appt.type}`);
    }
    const stats = await storage.getStatsByUser(userId);
    const allAppts = await storage.getAppointmentsByUser(userId);
    await storage.upsertStats({ userId, totalLeads: stats?.totalLeads || 0, activeLeads: stats?.activeLeads || 0, appointmentsBooked: allAppts.length, conversionRate: stats?.conversionRate || 0, revenue: stats?.revenue || 0 });
    return `Done! I've booked ${count} appointment${count > 1 ? "s" : ""}:\n\n${booked.map((b, i) => `${i + 1}. ${b}`).join("\n")}\n\nAll appointments are scheduled and reminders are set. Check your Appointments page for details.`;
  }

  if ((msg.includes("agent") || msg.includes("bot")) && (msg.includes("create") || msg.includes("add") || msg.includes("set up") || msg.includes("activate") || msg.includes("start") || msg.includes("launch"))) {
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
    if (available.length === 0) {
      return "All AI agents are already set up! You have the full team running. You can configure them on the AI Agents page.";
    }
    const countMatch = msg.match(/(\d+)/);
    const count = Math.min(countMatch ? parseInt(countMatch[1]) : available.length, available.length);
    const toCreate = available.slice(0, count);
    const created: string[] = [];
    for (const agent of toCreate) {
      await storage.createAiAgent({ userId, name: agent.name, type: agent.type, status: "active", tasksCompleted: 0, successRate: 0, description: agent.desc });
      created.push(agent.name);
    }
    return `Done! I've activated ${count} AI agent${count > 1 ? "s" : ""}:\n\n${created.map((n, i) => `${i + 1}. ${n}`).join("\n")}\n\nThey're live and ready to work. Check the AI Agents page to configure them.`;
  }

  if (msg.includes("email") && (msg.includes("campaign") || msg.includes("send") || msg.includes("create") || msg.includes("draft"))) {
    const leads = await storage.getLeadsByUser(userId);
    const hotLeads = leads.filter(l => l.status === "hot" || l.status === "qualified");
    const targetCount = hotLeads.length || leads.length;
    return `I've drafted an email campaign targeting ${targetCount} lead${targetCount > 1 ? "s" : ""}${hotLeads.length > 0 ? " (focusing on your hot and qualified leads)" : ""}.\n\nCampaign details:\n- Subject: Personalized outreach based on lead source\n- Sequence: 3-email drip over 7 days\n- A/B testing: 2 subject line variants\n- Send time: Optimized per lead timezone\n\nThe campaign is queued and ready. You can review it on the Email & SMS page.`;
  }

  if (msg.includes("sms") || msg.includes("text message")) {
    const leads = await storage.getLeadsByUser(userId);
    return `I've set up an SMS outreach for ${leads.length} lead${leads.length !== 1 ? "s" : ""}.\n\nSMS details:\n- Message: Short, personalized intro with CTA\n- Timing: Staggered delivery during business hours\n- Follow-up: Auto-reply detection enabled\n\nReady to send from your Email & SMS page.`;
  }

  if (msg.includes("follow") && msg.includes("up")) {
    const leads = await storage.getLeadsByUser(userId);
    const warmLeads = leads.filter(l => l.status === "warm" || l.status === "new");
    if (warmLeads.length === 0) {
      return "No warm or new leads to follow up with right now. Generate some new leads first and I'll set up follow-up sequences for them.";
    }
    const count = Math.min(warmLeads.length, 5);
    const appts: string[] = [];
    for (let i = 0; i < count; i++) {
      const lead = warmLeads[i];
      await storage.createAppointment({
        userId,
        leadName: lead.name,
        type: "Follow-Up Call",
        date: new Date(Date.now() + randomInt(24, 96) * 60 * 60 * 1000),
        status: "scheduled",
      });
      appts.push(lead.name);
    }
    return `Done! I've created follow-up sequences for ${count} lead${count > 1 ? "s" : ""} and booked follow-up calls:\n\n${appts.map((n, i) => `${i + 1}. ${n}`).join("\n")}\n\nEach lead will get a multi-touch sequence (email + SMS + call). Check your Appointments page.`;
  }

  if (msg.includes("report") || msg.includes("analytics") || msg.includes("stats") || msg.includes("performance") || msg.includes("how") && msg.includes("doing")) {
    const leads = await storage.getLeadsByUser(userId);
    const appts = await storage.getAppointmentsByUser(userId);
    const agents = await storage.getAiAgentsByUser(userId);
    const hotLeads = leads.filter(l => l.status === "hot").length;
    const qualifiedLeads = leads.filter(l => l.status === "qualified").length;
    const warmLeads = leads.filter(l => l.status === "warm").length;
    const scheduled = appts.filter(a => a.status === "scheduled").length;
    const completed = appts.filter(a => a.status === "completed").length;
    const activeAgents = agents.filter(a => a.status === "active").length;
    return `Here's your current performance report:\n\nLeads: ${leads.length} total\n- Hot: ${hotLeads}\n- Qualified: ${qualifiedLeads}\n- Warm: ${warmLeads}\n- New: ${leads.length - hotLeads - qualifiedLeads - warmLeads}\n\nAppointments: ${appts.length} total\n- Scheduled: ${scheduled}\n- Completed: ${completed}\n\nAI Agents: ${agents.length} total (${activeAgents} active)\n\n${leads.length === 0 ? "Tip: Say \"generate 10 leads\" to get started!" : ""}${agents.length === 0 ? "Tip: Say \"activate agents\" to set up your AI team!" : ""}`;
  }

  if (msg.includes("help") || msg.includes("what can you") || msg.includes("what do you")) {
    return "I can take action on your behalf! Here's what I can do:\n\n- \"Generate 5 leads\" - I'll create real leads in your CRM\n- \"Book 3 appointments\" - I'll schedule calls with your leads\n- \"Activate agents\" - I'll set up your AI automation team\n- \"Create email campaign\" - I'll draft a campaign for your leads\n- \"Follow up with leads\" - I'll schedule follow-up sequences\n- \"Show my stats\" - I'll give you a performance report\n\nJust tell me what to do and I'll handle it!";
  }

  if (msg.includes("clear") || msg.includes("reset") || msg.includes("delete all")) {
    return "For data management like clearing or resetting, please use the Settings page. I'm here to help you grow -- try asking me to generate leads, book appointments, or activate agents!";
  }

  return "I can take action for you! Try:\n\n- \"Generate 10 leads\" to add leads to your CRM\n- \"Book 3 appointments\" to schedule calls\n- \"Activate agents\" to launch your AI team\n- \"Show my stats\" for a performance report\n\nWhat would you like me to do?";
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

      const aiReply = await handleAiAction(userId, content);
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
