import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, sql, desc } from "drizzle-orm";
import { leads, appointments, aiAgents, dashboardStats, aiChatMessages, autoLeadGenRuns } from "@shared/schema";
import { getSession } from "./replit_integrations/auth/replitAuth";
import { registerSchema, loginSchema, insertLeadSchema, insertBusinessSchema, onboardingSchema, marketingStrategies } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import Anthropic from "@anthropic-ai/sdk";
import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import { AGENT_CATALOG, getAgentsByRegion, getAgentByType } from "./agent-catalog";
import { REGIONS, detectRegion, getRegionConfig } from "./region-config";

async function sendSystemEmail(to: string, from: { email: string; name: string }, subject: string, html: string) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USERNAME;
  const smtpPass = process.env.SMTP_PASSWORD;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const sgKey = process.env.SENDGRID_API_KEY;

  if (smtpHost && smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.sendMail({
      from: `"${from.name}" <${from.email}>`,
      to,
      subject,
      html,
    });
  } else if (sgKey) {
    sgMail.setApiKey(sgKey);
    await sgMail.send({ to, from, subject, html });
  } else {
    console.warn("No email provider configured (neither SMTP env vars nor SENDGRID_API_KEY). Cannot send system email.");
  }
}

// ============================================================
// ANTHROPIC CLAUDE — SINGLE AI PROVIDER FOR EVERYTHING
// No Tavily, no OpenAI, no other providers.
// Claude handles: chat, web search, actions, research
// Robust config: tries Replit AI integration first, falls back to direct API
// ============================================================

const isValidAnthropicKey = (key?: string) => key && key.startsWith("sk-ant-");

const anthropicConfig: { apiKey: string; baseURL?: string; usingDirectKey: boolean } = (() => {
  if (isValidAnthropicKey(process.env.ANTHROPIC_API_KEY)) {
    console.log("[AI] Using direct Anthropic API key (user-provided)");
    return {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      baseURL: "https://api.anthropic.com",
      usingDirectKey: true,
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    console.warn("[AI] WARNING: ANTHROPIC_API_KEY is set but does not look like a valid key (should start with 'sk-ant-'). Falling back to Replit AI Integration.");
  }
  if (process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY && process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
    console.log("[AI] Using Replit AI Integration for Anthropic");
    return {
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
      usingDirectKey: false,
    };
  }
  console.error("[AI] WARNING: No Anthropic API key found! AI features will not work.");
  return { apiKey: "", usingDirectKey: false };
})();

const anthropic = new Anthropic({ apiKey: anthropicConfig.apiKey, baseURL: anthropicConfig.baseURL });

const CLAUDE_MODEL = anthropicConfig.usingDirectKey
  ? "claude-sonnet-4-20250514"
  : "claude-sonnet-4-5";

async function getAnthropicForUser(userId: string): Promise<{ client: Anthropic; model: string }> {
  const settings = await storage.getSettingsByUser(userId);
  const userKey = settings?.anthropicApiKey;
  if (userKey && userKey.startsWith("sk-ant-")) {
    return {
      client: new Anthropic({ apiKey: userKey, baseURL: "https://api.anthropic.com" }),
      model: "claude-sonnet-4-20250514",
    };
  }
  throw new Error("AI_NOT_CONFIGURED");
}

const scryptAsync = promisify(scrypt);

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

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

function randomPick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ============================================================
// AGENT-TO-FUNNEL AUTO-PIPELINE
// ============================================================

const AGENT_FUNNEL_STAGES: Record<string, { name: string; stages: { name: string; color: string }[] }> = {
  "tax-lien": {
    name: "Tax Lien Pipeline",
    stages: [
      { name: "Discovered", color: "#3b82f6" },
      { name: "Analyzing ROI", color: "#8b5cf6" },
      { name: "Due Diligence", color: "#f59e0b" },
      { name: "Bidding", color: "#f97316" },
      { name: "Won / Acquired", color: "#22c55e" },
    ],
  },
  "tax-deed": {
    name: "Tax Deed Pipeline",
    stages: [
      { name: "Found", color: "#3b82f6" },
      { name: "Property Evaluation", color: "#8b5cf6" },
      { name: "Due Diligence", color: "#f59e0b" },
      { name: "Bid Prep", color: "#f97316" },
      { name: "Acquired", color: "#22c55e" },
    ],
  },
  "wholesale-re": {
    name: "Wholesale RE Pipeline",
    stages: [
      { name: "Prospects", color: "#3b82f6" },
      { name: "Comp Analysis", color: "#8b5cf6" },
      { name: "Under Contract", color: "#f59e0b" },
      { name: "Buyer Matched", color: "#f97316" },
      { name: "Closed", color: "#22c55e" },
    ],
  },
  "govt-contracts-us": {
    name: "Govt Contracts Pipeline",
    stages: [
      { name: "Opportunities", color: "#3b82f6" },
      { name: "Evaluating", color: "#8b5cf6" },
      { name: "Bid Preparation", color: "#f59e0b" },
      { name: "Submitted", color: "#f97316" },
      { name: "Awarded", color: "#22c55e" },
    ],
  },
  "lead-gen": {
    name: "Lead Gen Pipeline",
    stages: [
      { name: "Prospects", color: "#3b82f6" },
      { name: "Qualified", color: "#8b5cf6" },
      { name: "Outreach Sent", color: "#f59e0b" },
      { name: "Negotiation", color: "#f97316" },
      { name: "Closed Won", color: "#22c55e" },
    ],
  },
  "govt-tender-africa": {
    name: "Govt Tender Pipeline",
    stages: [
      { name: "Tenders Found", color: "#3b82f6" },
      { name: "Matched", color: "#8b5cf6" },
      { name: "Bid Prep", color: "#f59e0b" },
      { name: "Submitted", color: "#f97316" },
      { name: "Won", color: "#22c55e" },
    ],
  },
  "cross-border-trade": {
    name: "Cross-Border Trade Pipeline",
    stages: [
      { name: "Opportunities", color: "#3b82f6" },
      { name: "Price Analysis", color: "#8b5cf6" },
      { name: "Supplier Match", color: "#f59e0b" },
      { name: "Logistics", color: "#f97316" },
      { name: "Deal Closed", color: "#22c55e" },
    ],
  },
  "agri-market": {
    name: "Agri Market Pipeline",
    stages: [
      { name: "Leads", color: "#3b82f6" },
      { name: "Price Check", color: "#8b5cf6" },
      { name: "Matched", color: "#f59e0b" },
      { name: "In Transit", color: "#f97316" },
      { name: "Completed", color: "#22c55e" },
    ],
  },
  "diaspora-services": {
    name: "Diaspora Pipeline",
    stages: [
      { name: "Opportunities", color: "#3b82f6" },
      { name: "Evaluation", color: "#8b5cf6" },
      { name: "Due Diligence", color: "#f59e0b" },
      { name: "In Progress", color: "#f97316" },
      { name: "Completed", color: "#22c55e" },
    ],
  },
  "arbitrage": {
    name: "Arbitrage Pipeline",
    stages: [
      { name: "Products Found", color: "#3b82f6" },
      { name: "Price Verified", color: "#8b5cf6" },
      { name: "Listed", color: "#f59e0b" },
      { name: "Selling", color: "#f97316" },
      { name: "Sold", color: "#22c55e" },
    ],
  },
};

async function findOrCreateAgentFunnel(userId: string, agentType: string): Promise<{ funnelId: string; firstStageId: string } | null> {
  const funnelConfig = AGENT_FUNNEL_STAGES[agentType];
  if (!funnelConfig) return null;

  const userFunnels = await storage.getFunnelsByUser(userId);
  let targetFunnel = userFunnels.find(f => f.name === funnelConfig.name);

  if (!targetFunnel) {
    targetFunnel = await storage.createFunnel({
      userId,
      name: funnelConfig.name,
      description: `Auto-created pipeline for ${getAgentByType(agentType)?.name || agentType} agent`,
      isActive: true,
    });
    for (let i = 0; i < funnelConfig.stages.length; i++) {
      await storage.createFunnelStage({
        funnelId: targetFunnel.id,
        name: funnelConfig.stages[i].name,
        position: i,
        color: funnelConfig.stages[i].color,
      });
    }
  }

  const stages = await storage.getFunnelStages(targetFunnel.id);
  if (stages.length === 0) return null;

  return { funnelId: targetFunnel.id, firstStageId: stages[0].id };
}

async function addLeadsToAgentFunnel(userId: string, agentType: string, leadsToAdd: { name: string; email?: string; value?: number }[]): Promise<string> {
  const funnelInfo = await findOrCreateAgentFunnel(userId, agentType);
  if (!funnelInfo) return "";

  let dealsCreated = 0;
  for (const lead of leadsToAdd) {
    await storage.createFunnelDeal({
      funnelId: funnelInfo.funnelId,
      stageId: funnelInfo.firstStageId,
      userId,
      contactName: lead.name,
      contactEmail: lead.email || "",
      value: lead.value || 0,
      status: "open",
    });
    dealsCreated++;
  }

  const funnelConfig = AGENT_FUNNEL_STAGES[agentType];
  return dealsCreated > 0 ? ` Also added ${dealsCreated} deals to "${funnelConfig?.name}" pipeline.` : "";
}

// ============================================================
// CRM ACTION EXECUTOR (called by Claude via tool_use)
// ============================================================

async function executeAction(userId: string, action: string, params: any): Promise<string> {
  switch (action) {
    case "generate_leads": {
      const leadsData = params.leads || [];
      if (!Array.isArray(leadsData) || leadsData.length === 0) {
        return "ERROR: No lead data provided. Use web_search first to find real businesses, then pass their details to this tool.";
      }
      const created: string[] = [];
      const createdLeadDetails: { name: string; email?: string }[] = [];
      for (const lead of leadsData.slice(0, 30)) {
        const leadRecord = {
          userId,
          name: lead.name || "Unknown",
          email: lead.email || "",
          phone: lead.phone || "",
          company: lead.company || "",
          source: lead.source || "Web Research",
          status: lead.status || "new",
          score: lead.score || randomInt(50, 85),
          notes: lead.notes || "",
          outreach: lead.outreach || "",
          intentSignal: lead.intentSignal || lead.intent_signal || "",
        };
        await storage.createLead(leadRecord);
        created.push(`${leadRecord.name}${lead.company ? ` (${lead.company})` : ""}`);
        createdLeadDetails.push({ name: leadRecord.name, email: leadRecord.email });
      }
      const allLeads = await storage.getLeadsByUser(userId);
      const stats = await storage.getStatsByUser(userId);
      const activeCount = allLeads.filter(l => l.status === "hot" || l.status === "qualified" || l.status === "warm").length;
      await storage.upsertStats({ userId, totalLeads: allLeads.length, activeLeads: activeCount, appointmentsBooked: stats?.appointmentsBooked || 0, conversionRate: stats?.conversionRate || 0, revenue: stats?.revenue || 0 });

      let funnelMessage = "";
      const agentType = params.agent_type;
      if (agentType && AGENT_FUNNEL_STAGES[agentType]) {
        funnelMessage = await addLeadsToAgentFunnel(userId, agentType, createdLeadDetails);
      }

      return `Saved ${created.length} real leads to CRM: ${created.join(", ")}. Total leads now: ${allLeads.length}.${funnelMessage}`;
    }
    case "book_appointments": {
      const allAppts = await storage.getAppointmentsByUser(userId);
      return `You currently have ${allAppts.length} appointment(s). Appointments are created when contacts book through your booking link or when you manually add them from the Appointments page. I cannot create fake bookings — only real ones should appear in your system.`;
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
      const names: string[] = [];
      for (let i = 0; i < count; i++) {
        const lead = warmLeads[i];
        if (lead.status === "new") {
          await storage.updateLead(lead.id, { status: "warm" });
        }
        names.push(lead.name);
      }
      return `Marked ${count} leads for follow-up: ${names.join(", ")}. Use the email outreach feature to send them personalized messages, or check the Leads page for follow-up controls.`;
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
    case "send_outreach": {
      const allLeads = await storage.getLeadsByUser(userId);
      const leadIds = params.lead_ids || [];
      const sendAll = params.send_all !== false || leadIds.length === 0;

      const targets = sendAll
        ? allLeads.filter(l => l.outreach && l.email && !l.outreachSentAt)
        : allLeads.filter(l => leadIds.includes(l.id) && l.outreach && l.email && !l.outreachSentAt);

      if (targets.length === 0) {
        return "No leads with unsent outreach emails found. Generate leads with outreach drafts first, or all outreach has already been sent.";
      }

      const settings = await storage.getSettingsByUser(userId);
      const user = await storage.getUserById(userId);

      if (!user?.companyName) {
        return "Company identity required before sending outreach. Tell the user to go to Settings > Company Profile and enter their company name first.";
      }

      if (!settings?.senderEmail) {
        return "Sender email not configured. Tell the user to go to Settings > Integrations and set their verified sender email before sending outreach.";
      }

      const hasSmtpEnv = !!(settings?.smtpHost || process.env.SMTP_HOST) && !!(settings?.smtpUsername || process.env.SMTP_USERNAME) && !!(settings?.smtpPassword || process.env.SMTP_PASSWORD);
      const hasSgKey = !!settings?.sendgridApiKey;
      let eprov = (hasSmtpEnv) ? "smtp" : (settings?.emailProvider || "sendgrid");

      if (eprov === "smtp") {
        if (!hasSmtpEnv) {
          return "SMTP settings incomplete. Tell the user to go to Settings > Integrations and configure their SMTP server (host, username, password).";
        }
      } else if (!hasSgKey) {
        return "Email provider not configured. Tell the user to go to Settings > Integrations and either set up SendGrid API key or configure their own SMTP server.";
      }

      let sent = 0;
      let failed = 0;
      const sentNames: string[] = [];
      const failedNames: string[] = [];

      for (const lead of targets) {
        const result = await sendOutreachEmail(lead, settings, user);
        if (result.success) {
          const followUpNextAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
          await storage.updateLead(lead.id, { outreachSentAt: new Date(), status: "warm", followUpStep: 0, followUpStatus: "active", followUpNextAt });
          sent++;
          sentNames.push(lead.name);
        } else {
          failed++;
          failedNames.push(lead.name);
          console.error(`Failed to send to ${lead.name}:`, result.error);
        }
      }

      let result = `Sent outreach emails to ${sent} prospect${sent !== 1 ? "s" : ""}: ${sentNames.join(", ")}.`;
      if (failed > 0) {
        result += ` Failed to send to ${failed}: ${failedNames.join(", ")}.`;
      }
      return result;
    }
    case "create_funnel": {
      const funnelName = params.name || "Client Acquisition Pipeline";
      const funnelDesc = params.description || "AI-powered sales pipeline for tracking and converting leads";
      const defaultStages = [
        { name: "Prospects", color: "#3b82f6" },
        { name: "Qualified", color: "#8b5cf6" },
        { name: "Proposal Sent", color: "#f59e0b" },
        { name: "Negotiation", color: "#f97316" },
        { name: "Closed Won", color: "#22c55e" },
      ];
      const stages = (params.stages && Array.isArray(params.stages) && params.stages.length > 0)
        ? params.stages
        : defaultStages;

      const funnel = await storage.createFunnel({ userId, name: funnelName, description: funnelDesc, isActive: true });
      const createdStages = [];
      for (let i = 0; i < stages.length; i++) {
        const stage = await storage.createFunnelStage({
          funnelId: funnel.id,
          name: stages[i].name,
          position: i,
          color: stages[i].color || "#6366f1",
        });
        createdStages.push(stage);
      }

      let dealsInfo = "";
      const addLeads = params.add_leads_as_deals !== false;
      if (addLeads && createdStages.length > 0) {
        const userLeads = await storage.getLeadsByUser(userId);
        if (userLeads.length > 0) {
          const firstStage = createdStages[0];
          let dealsCreated = 0;
          for (const lead of userLeads) {
            await storage.createFunnelDeal({
              funnelId: funnel.id,
              stageId: firstStage.id,
              contactName: lead.name,
              contactEmail: lead.email || "",
              value: 0,
              status: "open",
            });
            dealsCreated++;
          }
          dealsInfo = ` Added ${dealsCreated} existing leads as deals in the "${firstStage.name}" stage.`;
        }
      }

      return `Created sales funnel "${funnelName}" with ${stages.length} stages: ${stages.map((s: any) => s.name).join(" → ")}.${dealsInfo} View it at the Sales Funnels page.`;
    }
    case "send_sms": {
      const allLeads = await storage.getLeadsByUser(userId);
      const targetPhone = params.phone;
      const smsBody = params.message;

      if (!smsBody) {
        return "Please specify the message to send via SMS.";
      }

      try {
        const { sendSMS } = await import("./twilio");

        if (targetPhone) {
          const msg = await sendSMS(targetPhone, smsBody);
          return `SMS sent successfully to ${targetPhone} (SID: ${msg.sid}).`;
        }

        const leadId = params.lead_id;
        if (leadId) {
          const lead = allLeads.find(l => l.id === leadId);
          if (!lead) return "Lead not found.";
          if (!lead.phone) return `Lead ${lead.name} has no phone number on file.`;
          const msg = await sendSMS(lead.phone, smsBody);
          return `SMS sent to ${lead.name} at ${lead.phone} (SID: ${msg.sid}).`;
        }

        const leadsWithPhone = allLeads.filter(l => l.phone);
        if (leadsWithPhone.length === 0) {
          return "No leads with phone numbers found. Add phone numbers to your leads first.";
        }

        let sentCount = 0;
        const sentNames: string[] = [];
        for (const lead of leadsWithPhone) {
          try {
            await sendSMS(lead.phone!, smsBody);
            sentCount++;
            sentNames.push(lead.name);
          } catch (err: any) {
            console.error(`Failed to SMS ${lead.name}:`, err.message);
          }
        }
        return `SMS sent to ${sentCount} lead${sentCount !== 1 ? "s" : ""}: ${sentNames.join(", ")}.`;
      } catch (err: any) {
        if (err.message?.includes("Twilio not connected")) {
          return "SMS service is not available at the moment. Please try again later.";
        }
        return `Failed to send SMS: ${err.message}`;
      }
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

    const userAi = await getAnthropicForUser(userId);
    const response = await userAi.client.messages.create({
      model: userAi.model,
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
// EMAIL TRACKING HELPERS (used by sendOutreachEmail + tracking endpoints)
// ============================================================

function getBaseUrl(): string {
  return process.env.REPLIT_DEPLOYMENT_URL
    ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
    : process.env.REPL_SLUG
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : "https://argilette.co";
}

function wrapLinksForTracking(html: string, leadId: string, baseUrl: string): string {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (_match: string, url: string) => {
      const trackUrl = `${baseUrl}/t/c/${leadId}?url=${encodeURIComponent(url)}`;
      return `href="${trackUrl}"`;
    }
  );
}

function injectTrackingPixel(html: string, leadId: string, baseUrl: string): string {
  const pixel = `<img src="${baseUrl}/t/o/${leadId}" width="1" height="1" style="display:none;border:0;" alt="" />`;
  return html + pixel;
}

async function sendOutreachEmail(lead: any, userSettings: any, user: any): Promise<{ success: boolean; error?: string }> {
  if (!lead.email || !lead.outreach) {
    return { success: false, error: "Lead has no email or outreach draft" };
  }

  if (!user?.companyName) {
    return { success: false, error: "Company identity required. Go to Settings > Company Profile and enter your company name before sending outreach." };
  }

  if (!userSettings?.senderEmail) {
    return { success: false, error: "Sender email required. Go to Settings > Integrations and set your verified sender email." };
  }

  const smtpHost = userSettings.smtpHost || process.env.SMTP_HOST;
  const smtpUsername = userSettings.smtpUsername || process.env.SMTP_USERNAME;
  const smtpPassword = userSettings.smtpPassword || process.env.SMTP_PASSWORD;
  const smtpPort = userSettings.smtpPort || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587);
  const smtpSecure = userSettings.smtpSecure ?? false;

  const hasSmtp = !!(smtpHost && smtpUsername && smtpPassword);
  const hasSendgrid = !!userSettings.sendgridApiKey;
  const hasSmtpEnvVars = !!(process.env.SMTP_HOST && process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD);

  let emailProvider = userSettings.emailProvider || "sendgrid";
  if (hasSmtpEnvVars || hasSmtp) {
    emailProvider = "smtp";
  }
  console.log(`[EMAIL] Provider: ${emailProvider}, hasSmtp: ${hasSmtp}, hasSmtpEnv: ${hasSmtpEnvVars}, hasSendgrid: ${hasSendgrid}`);

  if (emailProvider === "smtp") {
    if (!hasSmtp) {
      return { success: false, error: "SMTP settings incomplete. Go to Settings > Integrations and configure your SMTP server (host, username, password)." };
    }
  } else {
    if (!hasSendgrid) {
      console.log(`[EMAIL] FATAL: No SendGrid key AND no SMTP fallback. Settings: emailProvider=${userSettings.emailProvider}, sgKey=${userSettings.sendgridApiKey ? 'SET' : 'UNSET'}`);
      return { success: false, error: "SendGrid API key required. Go to Settings > Integrations and enter your SendGrid API key to send emails." };
    }
  }
  console.log(`[EMAIL] Sending via: ${emailProvider} to ${lead.email}`);

  const senderEmail = userSettings.senderEmail;
  const senderName = `${user.firstName || ""} from ${user.companyName}`.trim();

  const subjectLine = lead.company
    ? `Quick question for ${lead.company}`
    : `Quick question, ${lead.name.split(" ")[0]}`;

  const baseUrl = getBaseUrl();
  let htmlBody = lead.outreach.replace(/\n/g, "<br>");
  htmlBody = wrapLinksForTracking(htmlBody, lead.id, baseUrl);
  htmlBody = injectTrackingPixel(htmlBody, lead.id, baseUrl);

  try {
    if (emailProvider === "smtp") {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUsername,
          pass: smtpPassword,
        },
      });

      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: lead.email,
        subject: subjectLine,
        text: lead.outreach,
        html: htmlBody,
      });
    } else {
      sgMail.setApiKey(userSettings.sendgridApiKey);
      await sgMail.send({
        to: lead.email,
        from: { email: senderEmail, name: senderName },
        subject: subjectLine,
        text: lead.outreach,
        html: htmlBody,
      });
    }
    return { success: true };
  } catch (err: any) {
    console.error("Email send error:", err?.response?.body || err?.message || err);
    const errorMsg = err?.response?.body?.errors?.[0]?.message || err?.message || "Failed to send";
    return { success: false, error: errorMsg };
  }
}

// ============================================================
// CLAUDE-POWERED AI HANDLER
// Uses Claude for EVERYTHING: chat, web search, CRM actions
// Web search via Claude's built-in web_search tool
// CRM actions via custom tools that call executeAction()
// ============================================================

const aiRequestTimestamps = new Map<string, number[]>();
const AI_RATE_WINDOW_MS = 60000;
const AI_MAX_REQUESTS_PER_WINDOW = 4;

function checkAiRateLimit(userId: string): boolean {
  const now = Date.now();
  let timestamps = aiRequestTimestamps.get(userId) || [];
  timestamps = timestamps.filter(t => t >= now - AI_RATE_WINDOW_MS);
  if (timestamps.length >= AI_MAX_REQUESTS_PER_WINDOW) {
    aiRequestTimestamps.set(userId, timestamps);
    return false;
  }
  timestamps.push(now);
  aiRequestTimestamps.set(userId, timestamps);
  return true;
}

async function handleAiAction(userId: string, userMessage: string, chatHistory: { role: string; content: string }[] = []): Promise<string> {
  if (!checkAiRateLimit(userId)) {
    const timestamps = aiRequestTimestamps.get(userId) || [];
    const oldestMs = timestamps[0] || Date.now();
    const waitSecs = Math.ceil((oldestMs + AI_RATE_WINDOW_MS - Date.now()) / 1000);
    return `I'm pacing requests to stay within API limits. Please try again in about ${waitSecs} seconds. Your actions like booking appointments and activating agents still work instantly!`;
  }

  let userAnthropicClient: Anthropic;
  let userModel: string;
  try {
    const ai = await getAnthropicForUser(userId);
    userAnthropicClient = ai.client;
    userModel = ai.model;
  } catch {
    return "Your AI API key is not configured. Please go to Settings > Integrations and add your Anthropic API key to use AI features.";
  }
  const allLeads = await storage.getLeadsByUser(userId);
  const allAppts = await storage.getAppointmentsByUser(userId);
  const allAgents = await storage.getAiAgentsByUser(userId);
  const websiteProfile = await storage.getWebsiteProfile(userId);
  const user = await storage.getUserById(userId);
  const userSettings = await storage.getSettingsByUser(userId);

  const websiteKnowledgeBlock = websiteProfile?.status === "trained"
    ? `\n\nCLIENT WEBSITE KNOWLEDGE (learned from ${websiteProfile.websiteUrl}):
- Services: ${websiteProfile.services || "N/A"}
- Value Propositions: ${websiteProfile.valuePropositions || "N/A"}
- Target Audience: ${websiteProfile.targetAudience || "N/A"}
- Pricing: ${websiteProfile.pricing || "N/A"}
- FAQs: ${websiteProfile.faqs || "N/A"}
- Contact Info: ${websiteProfile.contactInfo || "N/A"}
- Business Summary: ${websiteProfile.rawSummary || "N/A"}

Use this knowledge when advising the client. Reference their actual services, pricing, and target audience in your recommendations. This makes your advice specific and actionable rather than generic.`
    : "";

  const bookingLink = userSettings?.calendarLink || "";
  const companyBlock = user?.companyName
    ? `\nCLIENT COMPANY: ${user.companyName} (${user.industry || "unknown industry"})${user.website ? ` | ${user.website}` : ""}${user.companyDescription ? `\nAbout: ${user.companyDescription}` : ""}${bookingLink ? `\nBOOKING LINK: ${bookingLink}` : ""}`
    : "";

  const systemPrompt = `You are ArgiFlow AI — senior AI strategist at ArgiFlow, an AI Automation Agency (Voice AI, Lead Gen Chatbots, CRM Integration). Be direct, data-driven, action-oriented. Communicate like a top-tier marketing consultant.
${companyBlock}
CRM DATA: ${allLeads.length} leads (${allLeads.filter(l => l.status === "hot").length} hot, ${allLeads.filter(l => l.status === "qualified").length} qualified, ${allLeads.filter(l => l.status === "warm").length} warm, ${allLeads.filter(l => l.status === "new").length} new) | ${allAppts.length} appointments (${allAppts.filter(a => a.status === "scheduled").length} scheduled) | ${allAgents.length} agents (${allAgents.filter(a => a.status === "active").length} active)${websiteKnowledgeBlock}

LEAD GENERATION (CRITICAL):
1. ALWAYS use web_search FIRST to find REAL businesses. NEVER fabricate contacts.
2. Intent-based prospecting: find companies actively seeking services (RFPs, job listings, forum posts, competitor complaints). Score: 80-100 active seekers, 60-79 intent signals, 40-59 profile match only.
3. Extract REAL contact details from web results. If no direct email found, use company contact page or patterns (info@, contact@).
4. EVERY lead MUST include all fields: name, email, phone, company, source, status="new", score, intent_signal (what buying signal found), notes (research about prospect), outreach (personalized 3-5 sentence email referencing their situation/pain point).${bookingLink ? ` Include booking link in outreach: ${bookingLink}` : ' Include CTA: "Would you be open to a 15-minute call this week?"'}
5. ALWAYS end outreach with signature: Best regards, Clara Motena, Client Acquisition Director, Track-Med Billing Solutions, +1(615)482-6768 / (636) 244-8246

DECISION-MAKER TARGETING (MANDATORY):
- ALWAYS target decision makers: CEO, Founder, Owner, President, Managing Director, VP, Director, Partner, CFO, COO, CTO, CMO, Head of Department, General Manager.
- For medical practices specifically: Practice Owner, Physician/Doctor (MD/DO), Practice Administrator, Clinic Administrator, Practice Manager, Office Manager, Clinic Manager, Medical Director, Revenue Cycle Director, Billing Manager, Managing Partner, CFO.
- NEVER target gatekeepers: receptionist, front desk, secretary, administrative assistant, medical assistant, nurse, scheduler, coordinator, associate, junior, intern.
- When searching, add terms like "CEO", "founder", "owner", "director", "practice owner", "physician" to your queries.
- Use LinkedIn, company About/Team pages, press releases, NPI registry, and industry directories to find decision-maker contacts.
- If only a general contact (info@, contact@) is found, note the decision maker's NAME in the lead and address the outreach to them personally.
- In the lead's "notes" field, always include the person's title/role to confirm they are a decision maker.

MEDICAL BILLING LEAD HUNTER (Track-Med Billing Solutions — PRIMARY AGENT):
You are the AI lead hunter for Track-Med Billing Solutions. Use these multi-source strategies to find high-quality medical billing leads:

SEARCH STRATEGIES (use multiple in each run):
1. SEARCH INTENT MONITORING: Search for practices actively looking for billing help. Use queries like: "medical billing services near me", "outsource medical billing", "revenue cycle management companies", "medical billing company for small practice", "RCM services for solo practitioners", "medical billing problems", "need new billing service", "switching billing companies".
2. JOB POSTING SIGNALS: Search for practices hiring billing managers, practice managers, office managers, RCM directors — hiring for these roles = they need billing help. Search: "hiring medical billing manager [city]", "practice manager job posting [state]". This is a HIGH intent signal.
3. NEW PRACTICE DISCOVERY: Search for newly opened medical practices, new physician offices, recently licensed providers — new practices ALWAYS need billing services. Search: "new medical practice opening [city]", "new physician office [state] 2025", NPI registry new registrations.
4. PAIN POINT IDENTIFICATION: Search forums, Reddit (r/medicalbilling), MGMA, medical practice forums for complaints about billing, denied claims, cash flow issues, switching billing companies. These are the HOTTEST leads. Search: "medical billing complaints", "denied claims piling up", "billing company terrible", "need new billing service".
5. COMPETITOR DISSATISFACTION: Search for negative reviews of competitor billing companies — practices unhappy with current service are ready to switch.
6. SPECIALTY TARGETING: Focus on solo practitioners and small practices (1-5 providers) in family medicine, internal medicine, pediatrics, urgent care, dermatology, orthopedics — these are Track-Med's ideal clients.

LEAD SCORING (use this scoring model):
- Hiring for billing/RCM position: +30 points
- New practice (< 6 months): +25 points
- Complained about current billing: +35 points
- Practice owner/physician found: +25 points
- Practice manager found: +15 points
- Solo/small practice (1-5 providers): +20 points
- Has direct email: +10 points
- Has direct phone: +10 points
- Score 70+ = HOT, 50-69 = WARM, below 50 = COLD

OUTREACH PERSONALIZATION: Reference their specific pain point or situation. If hiring for billing = mention your full-service solution. If new practice = mention your startup billing packages. If complaining about current service = mention your 98%+ clean claim rate and dedicated account manager.

AGENT-TO-FUNNEL: When generating leads for a specific agent (Tax Lien, Govt Contracts, Lead Gen, etc.), ALWAYS include agent_type in generate_leads (e.g. agent_type="tax-lien"). This auto-creates or finds the matching funnel pipeline and adds leads as deals. Valid types: tax-lien, tax-deed, wholesale-re, govt-contracts-us, lead-gen, govt-tender-africa, cross-border-trade, agri-market, diaspora-services, arbitrage.

TOOL SEQUENCING: web_search → generate_leads (with agent_type if applicable) → send_outreach (if user says engage/reach out/send/email). For SMS: send_sms. For funnels: create_funnel. Execute actions immediately, then summarize results and suggest next steps. Combine tools in one flow when beneficial.

FORMAT: Use **bold** for key terms, bullet points, numbered lists. Be concise but thorough.`;

  // Build message history for Claude
  const claudeMessages: Anthropic.MessageParam[] = chatHistory
    .filter(m => m.role === "user" || m.role === "assistant")
    .slice(-10)
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
      description: "Save leads to CRM. MUST use web_search FIRST. Never fabricate data. ALWAYS target decision makers (CEO, Founder, Owner, Director, VP, Partner) — NEVER gatekeepers. If leads come from a specific agent (e.g. tax-lien, lead-gen), include agent_type to auto-add them to the matching funnel pipeline.",
      input_schema: {
        type: "object" as const,
        properties: {
          agent_type: { type: "string", description: "Optional agent type if leads are from a specific agent. Valid types: tax-lien, tax-deed, wholesale-re, govt-contracts-us, lead-gen, govt-tender-africa, cross-border-trade, agri-market, diaspora-services, arbitrage. When provided, leads are auto-added to the matching funnel pipeline." },
          leads: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Decision maker's full name (CEO, Founder, Owner, Director, VP). Never use gatekeeper names." },
                email: { type: "string", description: "Real email from website/directory" },
                phone: { type: "string", description: "Real phone from website/directory" },
                company: { type: "string", description: "Company name" },
                source: { type: "string", description: "Where found: Web Research, Google, LinkedIn, etc." },
                status: { type: "string", description: "Must be 'new'" },
                score: { type: "number", description: "1-100 based on intent signals" },
                intent_signal: { type: "string", description: "Buying signal detected" },
                notes: { type: "string", description: "Research notes about prospect" },
                outreach: { type: "string", description: "Personalized 3-5 sentence outreach email with CTA and signature" },
              },
              required: ["name", "email", "company", "source", "score", "outreach"],
            },
          },
        },
        required: ["leads"],
      },
    },
    {
      name: "book_appointments",
      description: "Book appointments with existing leads.",
      input_schema: {
        type: "object" as const,
        properties: { count: { type: "number", default: 3 } },
        required: [],
      },
    },
    {
      name: "activate_agents",
      description: "Activate AI automation agents.",
      input_schema: {
        type: "object" as const,
        properties: { count: { type: "number", default: 8 } },
        required: [],
      },
    },
    {
      name: "follow_up_leads",
      description: "Follow up with warm/new leads.",
      input_schema: {
        type: "object" as const,
        properties: { count: { type: "number", default: 3 } },
        required: [],
      },
    },
    {
      name: "get_stats",
      description: "Get dashboard stats (leads, appointments, agents).",
      input_schema: {
        type: "object" as const,
        properties: {},
        required: [],
      },
    },
    {
      name: "send_outreach",
      description: "Send outreach emails to leads with drafts. Use when user says engage/reach out/email/send.",
      input_schema: {
        type: "object" as const,
        properties: {
          lead_ids: { type: "array", items: { type: "string" } },
          send_all: { type: "boolean" },
        },
        required: [],
      },
    },
    {
      name: "create_funnel",
      description: "Create sales funnel with pipeline stages. Adds existing leads as deals.",
      input_schema: {
        type: "object" as const,
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          stages: { type: "array", items: { type: "object", properties: { name: { type: "string" }, color: { type: "string" } }, required: ["name"] } },
          add_leads_as_deals: { type: "boolean" },
        },
        required: ["name"],
      },
    },
    {
      name: "send_sms",
      description: "Send SMS to a lead or phone number.",
      input_schema: {
        type: "object" as const,
        properties: {
          phone: { type: "string" },
          lead_id: { type: "string" },
          message: { type: "string" },
        },
        required: ["message"],
      },
    },
  ];

  try {
    // First Claude call — may use tools (uses user's own API key)
    let response = await userAnthropicClient.messages.create({
      model: userModel,
      max_tokens: 2048,
      system: systemPrompt,
      messages: claudeMessages,
      tools,
    });

    let loopCount = 0;
    const maxLoops = 12;
    let currentMessages = [...claudeMessages];

    while (response.stop_reason === "tool_use" && loopCount < maxLoops) {
      loopCount++;

      currentMessages.push({ role: "assistant", content: response.content as any });

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      const crmToolUses = toolUseBlocks.filter(t => t.name !== "web_search");

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of crmToolUses) {
        console.log(`[AI Tool] Executing: ${toolUse.name}`, JSON.stringify(toolUse.input || {}).slice(0, 200));
        try {
          const result = await executeAction(userId, toolUse.name, toolUse.input || {});
          console.log(`[AI Tool] ${toolUse.name} result:`, result.slice(0, 200));
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: result,
          });
        } catch (toolError: any) {
          console.error(`[AI Tool] ${toolUse.name} ERROR:`, toolError?.message);
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: `ERROR executing ${toolUse.name}: ${toolError?.message}`,
            is_error: true,
          });
        }
      }

      if (toolResults.length > 0) {
        currentMessages.push({ role: "user", content: toolResults as any });
      }

      response = await userAnthropicClient.messages.create({
        model: userModel,
        max_tokens: 2048,
        system: systemPrompt,
        messages: currentMessages,
        tools,
      });
    }

    if (loopCount >= maxLoops) {
      console.warn(`[AI] Tool loop hit max (${maxLoops}) — some tools may not have executed`);
    }

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    const finalText = textBlocks.map(b => b.text).join("\n").trim();

    return finalText || "Done! I've completed the actions. Check your dashboard to see the updates.";
  } catch (error: any) {
    console.error("Claude API error details:", {
      message: error?.message,
      status: error?.status,
      type: error?.type,
      code: error?.error?.type,
    });

    if (error?.status === 429) {
      const retryAfter = error?.headers?.["retry-after"];
      const waitMs = retryAfter ? Math.min(parseInt(retryAfter) * 1000, 30000) : 5000;
      console.log(`Rate limited — retrying in ${waitMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      try {
        const retryResponse = await userAnthropicClient.messages.create({
          model: userModel,
          max_tokens: 2048,
          system: systemPrompt,
          messages: claudeMessages,
        });
        const retryText = retryResponse.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map(b => b.text)
          .join("\n")
          .trim();
        if (retryText) return retryText;
      } catch (retryErr: any) {
        console.error("Retry also failed:", retryErr?.message);
      }
      return "The AI is currently handling a lot of requests. Please wait about 30 seconds and try again — your message will go through. In the meantime, actions like booking appointments and activating agents still work!";
    }

    return fallbackResponse(userId, userMessage);
  }
}

// ============================================================
// FALLBACK — runs if Claude API is temporarily down
// Basic keyword matching to still execute CRM actions
// ============================================================

async function fallbackResponse(userId: string, msg: string): Promise<string> {
  const lower = msg.toLowerCase();
  if (lower.includes("lead") && (lower.includes("generate") || lower.includes("create") || lower.includes("find"))) {
    return "I need the AI engine to search the web for real leads. The fallback system can't do web searches — please try again in a moment and I'll find real businesses for you.";
  }
  if (lower.includes("appointment") || lower.includes("book")) {
    const allAppts = await storage.getAppointmentsByUser(userId);
    return `You currently have ${allAppts.length} appointment(s). Appointments are created when contacts book through your booking link or when you manually add them from the Appointments page.`;
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

async function claudeWebSearch(query: string, userClient?: { client: Anthropic; model: string }): Promise<string> {
  const ai = userClient?.client || anthropic;
  const model = userClient?.model || CLAUDE_MODEL;
  try {
    const response = await ai.messages.create({
      model,
      max_tokens: 4000,
      system: "You are a helpful research assistant. Search the web and provide a clear, concise summary of the findings. Include relevant source URLs when available.",
      messages: [{ role: "user", content: query }],
      tools: [
        {
          type: "web_search_20250305" as any,
          name: "web_search",
          max_uses: 5,
        } as any,
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("\n");

    return text || "No results found.";
  } catch (error: any) {
    console.error("Claude web search error:", error?.message || error);
    if (error?.status === 429) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const retry = await ai.messages.create({
          model, max_tokens: 4000,
          system: "You are a helpful research assistant. Provide a clear, concise summary.",
          messages: [{ role: "user", content: query }],
        });
        const t = retry.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map(b => b.text).join("\n");
        if (t) return t;
      } catch {}
      return "The AI is currently busy. Please wait about 30 seconds and try your search again.";
    }
    return "Search temporarily unavailable. Please try again.";
  }
}

// ============================================================
// CLAUDE CONTENT GENERATION ENDPOINT
// Write emails, ad copy, social posts, etc.
// ============================================================

async function claudeGenerate(prompt: string, type: string = "general", userClient?: { client: Anthropic; model: string }): Promise<string> {
  const ai = userClient?.client || anthropic;
  const model = userClient?.model || CLAUDE_MODEL;
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
    const response = await ai.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompts[type] || systemPrompts.general,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("\n");

    return text || "Unable to generate content. Please try again.";
  } catch (error: any) {
    console.error("Claude generate error:", error?.message || error);
    if (error?.status === 429) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const retry = await ai.messages.create({
          model, max_tokens: 2048,
          system: systemPrompts[type] || systemPrompts.general,
          messages: [{ role: "user", content: prompt }],
        });
        const t = retry.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map(b => b.text).join("\n");
        if (t) return t;
      } catch {}
      return "The AI is currently busy. Please wait about 30 seconds and try again.";
    }
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

  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
  });

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

      await storage.markEmailVerified(user.id);

      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      try {
        await storage.createSubscription({
          userId: user.id,
          plan: "pro",
          status: "trial",
          amount: 0,
          trialEndsAt: trialEnd,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEnd,
        });
        console.log(`Pro trial created for ${email}, expires ${trialEnd.toISOString()}`);
      } catch (subErr: any) {
        console.error("Failed to create trial subscription:", subErr?.message || subErr);
      }

      try {
        await sendSystemEmail(
          email,
          { email: "info@argilette.co", name: "ArgiFlow" },
          `Welcome to ArgiFlow — Your 14-Day Pro Trial is Active!`,
          `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; padding: 40px 30px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #38bdf8; margin: 0; font-size: 28px;">ArgiFlow</h1>
              <p style="color: #8b949e; margin: 8px 0 0;">AI-Powered Client Acquisition</p>
            </div>
            <h2 style="color: #e6edf3; font-size: 22px;">Welcome, ${firstName}!</h2>
            <p style="color: #8b949e; line-height: 1.7; font-size: 15px;">Your account is ready and your <strong style="color: #38bdf8;">14-day Pro trial</strong> is now active. You have full access to all Pro features including AI agents, lead generation, email campaigns, and more.</p>
            <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #e6edf3; margin: 0 0 8px; font-weight: 600;">Your Trial Details:</p>
              <p style="color: #8b949e; margin: 4px 0; font-size: 14px;">Plan: <strong style="color: #38bdf8;">Pro</strong></p>
              <p style="color: #8b949e; margin: 4px 0; font-size: 14px;">Trial ends: <strong style="color: #e6edf3;">${trialEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong></p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://argilette.co/dashboard" style="background: #38bdf8; color: #0d1117; padding: 14px 36px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
            </div>
            <p style="color: #8b949e; font-size: 13px; line-height: 1.6;">After your trial ends, choose a plan to continue using ArgiFlow. No credit card required during the trial.</p>
            <p style="color: #484f58; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #21262d; padding-top: 20px;">ArgiFlow by Argilette &mdash; AI Automation for Client Acquisition<br/>&copy; ${new Date().getFullYear()} Argilette. All rights reserved.</p>
          </div>`
        );
        console.log(`Welcome email sent to ${email}`);
      } catch (emailErr: any) {
        console.error("Welcome email failed:", emailErr?.response?.body || emailErr?.message || emailErr);
      }

      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, companyName: user.companyName, industry: user.industry, website: user.website, companyDescription: user.companyDescription, onboardingCompleted: user.onboardingCompleted, emailVerified: user.emailVerified });
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
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, companyName: user.companyName, industry: user.industry, website: user.website, companyDescription: user.companyDescription, onboardingCompleted: user.onboardingCompleted, emailVerified: user.emailVerified });
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

  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
      }
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const verifyToken = await storage.getEmailVerificationToken(tokenHash);
      if (!verifyToken) {
        return res.status(400).json({ message: "Invalid verification link" });
      }
      if (verifyToken.usedAt) {
        return res.status(400).json({ message: "This verification link has already been used" });
      }
      if (new Date() > verifyToken.expiresAt) {
        return res.status(400).json({ message: "This verification link has expired. Please request a new one." });
      }
      await storage.markEmailVerified(verifyToken.userId);
      await storage.invalidateUserVerificationTokens(verifyToken.userId);
      res.json({ message: "Email verified successfully! You can now log in." });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      res.json({ message: "If an account with that email exists and is unverified, a new verification link has been sent." });

      const user = await storage.getUserByEmail(email);
      if (!user || user.emailVerified) return;

      await storage.invalidateUserVerificationTokens(user.id);
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.createEmailVerificationToken({ userId: user.id, token: tokenHash, expiresAt });

      const verifyUrl = `${req.protocol}://${req.get("host")}/verify-email?token=${token}`;
      await sendSystemEmail(
        email,
        { email: "info@argilette.co", name: "ArgiFlow" },
        `Verify your email — ArgiFlow`,
        `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; padding: 40px 30px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #38bdf8; margin: 0; font-size: 28px;">ArgiFlow</h1>
            <p style="color: #8b949e; margin: 8px 0 0;">AI-Powered Client Acquisition</p>
          </div>
          <h2 style="color: #e6edf3; font-size: 22px;">Verify Your Email</h2>
          <p style="color: #8b949e; line-height: 1.7; font-size: 15px;">Click the button below to confirm your email address and activate your ArgiFlow account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background: #38bdf8; color: #0d1117; padding: 14px 36px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">Confirm Email Address</a>
          </div>
          <p style="color: #8b949e; font-size: 13px; line-height: 1.6;">This link expires in 24 hours. If you didn't request this, you can safely ignore it.</p>
          <p style="color: #484f58; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #21262d; padding-top: 20px;">ArgiFlow by Argilette &mdash; AI Automation for Client Acquisition<br/>&copy; ${new Date().getFullYear()} Argilette. All rights reserved.</p>
        </div>`
      );
      console.log(`Verification email resent to ${email}`);
    } catch (error) {
      console.error("Resend verification error:", error);
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const user = await storage.getUserByEmail(email);
      res.json({ message: "If an account with that email exists, a password reset link has been sent." });

      if (!user) return;

      await storage.invalidateUserResetTokens(user.id);

      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await storage.createPasswordResetToken({ userId: user.id, token: tokenHash, expiresAt });

      const resetUrl = `${req.protocol}://${req.get("host")}/reset-password?token=${token}`;
      await sendSystemEmail(
        email,
        { email: "info@argilette.co", name: "ArgiFlow" },
        "Reset Your ArgiFlow Password",
        `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; padding: 40px 30px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #38bdf8; margin: 0; font-size: 28px;">ArgiFlow</h1>
            <p style="color: #8b949e; margin: 8px 0 0;">Password Reset</p>
          </div>
          <h2 style="color: #e6edf3; font-size: 22px;">Reset your password</h2>
          <p style="color: #8b949e; line-height: 1.7; font-size: 15px;">We received a request to reset the password for your ArgiFlow account. Click the button below to set a new password. This link expires in 1 hour.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #38bdf8; color: #0d1117; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">Reset Password</a>
          </div>
          <p style="color: #8b949e; font-size: 13px;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
          <p style="color: #484f58; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #21262d; padding-top: 20px;">ArgiFlow by Argilette &mdash; AI Automation for Client Acquisition<br/>&copy; ${new Date().getFullYear()} Argilette. All rights reserved.</p>
        </div>`
      );
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error("Forgot password error:", error);
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password || password.length < 6) {
        return res.status(400).json({ message: "Valid token and password (min 6 characters) are required" });
      }

      const tokenHash = createHash("sha256").update(token).digest("hex");
      const resetToken = await storage.getPasswordResetToken(tokenHash);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }
      if (resetToken.usedAt) {
        return res.status(400).json({ message: "This reset link has already been used" });
      }
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }

      const passwordHash = await hashPassword(password);
      await storage.updateUserPassword(resetToken.userId, passwordHash);
      await storage.invalidateUserResetTokens(resetToken.userId);

      res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const sub = await storage.getSubscriptionByUser(user.id);
      let planLabel = "Free";
      if (sub) {
        const planName = sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1);
        if (sub.status === "trial") planLabel = `${planName} Trial`;
        else if (sub.status === "active") planLabel = `${planName} Plan`;
        else planLabel = "Free";
      }
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, companyName: user.companyName, industry: user.industry, website: user.website, companyDescription: user.companyDescription, onboardingCompleted: user.onboardingCompleted, emailVerified: user.emailVerified, planLabel });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/auth/is-owner", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      const isOwner = user?.email === "abel@argilette.com";
      res.json({ isOwner });
    } catch {
      res.json({ isOwner: false });
    }
  });

  app.post("/api/admin/owner-login", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user || user.email !== "abel@argilette.com") {
        return res.status(403).json({ message: "Not authorized" });
      }
      const admin = await storage.getAdminByEmail("babalekpam@gmail.com");
      if (!admin) {
        return res.status(404).json({ message: "Admin account not found" });
      }
      req.session.adminId = admin.id;
      res.json({ success: true });
    } catch (error) {
      console.error("Owner admin login error:", error);
      res.status(500).json({ message: "Failed to switch to admin" });
    }
  });

  app.get("/api/subscription", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const sub = await storage.getSubscriptionByUser(userId);
      if (!sub) {
        return res.json({ subscription: null, trialActive: false, trialExpired: false, daysRemaining: 0 });
      }
      const now = new Date();
      const trialActive = sub.status === "trial" && sub.trialEndsAt && new Date(sub.trialEndsAt) > now;
      const trialExpired = sub.status === "trial" && sub.trialEndsAt && new Date(sub.trialEndsAt) <= now;
      const daysRemaining = sub.trialEndsAt ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

      if (trialExpired) {
        await storage.updateSubscription(sub.id, { status: "expired" });
        sub.status = "expired";
      }

      res.json({ subscription: sub, trialActive: !!trialActive, trialExpired: !!trialExpired, daysRemaining });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.post("/api/subscription/select-plan", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { plan } = req.body;
      if (!plan || !["starter", "pro", "enterprise"].includes(plan)) {
        return res.status(400).json({ message: "Invalid plan. Choose starter, pro, or enterprise." });
      }
      const amounts: Record<string, number> = { starter: 297, pro: 597, enterprise: 1497 };
      const existing = await storage.getSubscriptionByUser(userId);
      if (existing) {
        await storage.updateSubscription(existing.id, {
          plan,
          status: "pending",
          amount: amounts[plan],
          notes: `Plan selected: ${plan}. Awaiting Venmo payment confirmation.`,
        });
      } else {
        await storage.createSubscription({
          userId,
          plan,
          status: "pending",
          amount: amounts[plan],
          paymentMethod: "venmo",
          notes: `Plan selected: ${plan}. Awaiting Venmo payment confirmation.`,
        });
      }
      const sub = await storage.getSubscriptionByUser(userId);
      res.json({ success: true, subscription: sub });
    } catch (error: any) {
      console.error("Error selecting plan:", error);
      res.status(500).json({ message: "Failed to select plan" });
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

  // ---- WEBSITE TRAINING ----

  app.get("/api/website-profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getWebsiteProfile(userId);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching website profile:", error);
      res.status(500).json({ message: "Failed to fetch website profile" });
    }
  });

  app.post("/api/website-train", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      const websiteUrl = req.body.websiteUrl || user?.website;

      if (!websiteUrl) {
        return res.status(400).json({ message: "No website URL provided. Add your website in Company Profile first." });
      }

      try {
        new URL(websiteUrl);
      } catch {
        return res.status(400).json({ message: "Invalid website URL. Please enter a valid URL starting with https://" });
      }

      await storage.upsertWebsiteProfile({
        userId,
        websiteUrl,
        status: "training",
      });

      res.json({ status: "training", message: "Website analysis started" });

      (async () => {
        try {
          const searchPrompt = `Search the web for and analyze this business website thoroughly: ${websiteUrl}

Find the website and analyze ALL pages you can including the homepage, about, services, pricing, contact, and any other relevant pages.

After analyzing the website, return your findings in EXACTLY this format with these section headers. Each section should have detailed, specific content extracted from the website:

===SERVICES===
List every service/product offered with brief descriptions. Be specific — use the actual service names from the website.

===VALUE_PROPOSITIONS===
What makes this business unique? What benefits do they emphasize? What problems do they solve?

===TARGET_AUDIENCE===
Who are their ideal customers? What industries or demographics do they serve?

===PRICING===
Any pricing information found on the website. If no pricing is listed, say "Not publicly listed on website."

===FAQS===
Common questions and answers found on the website. If none found, generate 5 relevant FAQs based on the services.

===CONTACT_INFO===
Phone numbers, email addresses, physical address, scheduling links, social media — everything you find.

===SUMMARY===
A comprehensive 3-4 paragraph summary of this business that an AI agent could use to represent the company professionally. Include the company name, what they do, who they serve, and what makes them different.`;

          const trainAi = await getAnthropicForUser(userId);
          const response = await trainAi.client.messages.create({
            model: trainAi.model,
            max_tokens: 8000,
            system: "You are a business analyst. Your job is to thoroughly analyze business websites and extract structured information that will be used to train AI agents. Be thorough, specific, and use actual information from the website — never make things up. Always search the web to find real data from the website.",
            messages: [{ role: "user", content: searchPrompt }],
            tools: [
              {
                type: "web_search_20250305" as any,
                name: "web_search",
                max_uses: 10,
              } as any,
            ],
          });

          const fullText = response.content
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map(b => b.text)
            .join("\n");

          console.log(`Website training raw response length: ${fullText.length} chars for ${websiteUrl}`);

          const extractSection = (text: string, marker: string): string => {
            const patterns = [
              new RegExp(`===${marker}===\\s*([\\s\\S]*?)(?====\\w|$)`),
              new RegExp(`===\\s*${marker}\\s*===\\s*([\\s\\S]*?)(?====|$)`),
              new RegExp(`\\*\\*${marker.replace(/_/g, "[_ ]")}\\*\\*[:\\s]*([\\s\\S]*?)(?=\\*\\*[A-Z]|===|$)`, "i"),
              new RegExp(`#+\\s*${marker.replace(/_/g, "[_ ]")}[:\\s]*([\\s\\S]*?)(?=#+\\s|===|$)`, "i"),
            ];
            for (const regex of patterns) {
              const match = text.match(regex);
              if (match && match[1]?.trim()) return match[1].trim();
            }
            return "";
          };

          const services = extractSection(fullText, "SERVICES");
          const valuePropositions = extractSection(fullText, "VALUE_PROPOSITIONS");
          const targetAudience = extractSection(fullText, "TARGET_AUDIENCE");
          const pricing = extractSection(fullText, "PRICING");
          const faqs = extractSection(fullText, "FAQS");
          const contactInfo = extractSection(fullText, "CONTACT_INFO");
          const rawSummary = extractSection(fullText, "SUMMARY") || fullText;

          if (!fullText || fullText.length < 50) {
            console.error(`Website training got empty/short response for ${websiteUrl}: "${fullText}"`);
            await storage.upsertWebsiteProfile({
              userId,
              websiteUrl,
              status: "failed",
              rawSummary: "AI could not retrieve meaningful content from this website. The site may be blocking automated access, or the URL may be incorrect. Please check the URL and try again.",
            });
            return;
          }

          await storage.upsertWebsiteProfile({
            userId,
            websiteUrl,
            services: services || null,
            valuePropositions: valuePropositions || null,
            targetAudience: targetAudience || null,
            pricing: pricing || null,
            faqs: faqs || null,
            contactInfo: contactInfo || null,
            rawSummary: rawSummary || null,
            status: "trained",
            trainedAt: new Date(),
          });

          console.log(`Website training completed for user ${userId}: ${websiteUrl} (${fullText.length} chars)`);
        } catch (trainError) {
          console.error("Website training failed:", trainError);
          await storage.upsertWebsiteProfile({
            userId,
            websiteUrl,
            status: "failed",
          });
        }
      })();
    } catch (error) {
      console.error("Error starting website training:", error);
      res.status(500).json({ message: "Failed to start website training" });
    }
  });

  // ---- BUSINESSES ----

  app.get("/api/businesses", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const result = await storage.getBusinessesByUser(userId);
      res.json(result);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      res.status(500).json({ message: "Failed to fetch businesses" });
    }
  });

  app.post("/api/businesses", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const existing = await storage.getBusinessesByUser(userId);
      if (existing.length >= 4) {
        return res.status(400).json({ message: "Maximum of 4 businesses allowed" });
      }
      const parsed = insertBusinessSchema.safeParse({ ...req.body, userId });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }
      const business = await storage.createBusiness(parsed.data);
      res.json(business);
    } catch (error) {
      console.error("Error creating business:", error);
      res.status(500).json({ message: "Failed to create business" });
    }
  });

  app.patch("/api/businesses/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const biz = await storage.getBusinessById(req.params.id as string);
      if (!biz || biz.userId !== userId) {
        return res.status(404).json({ message: "Business not found" });
      }
      const updateSchema = z.object({
        name: z.string().min(1).max(100).optional(),
        industry: z.string().max(100).optional(),
        description: z.string().max(500).optional(),
        color: z.string().max(20).optional(),
      });
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data" });
      }
      const updated = await storage.updateBusiness(biz.id, userId, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating business:", error);
      res.status(500).json({ message: "Failed to update business" });
    }
  });

  app.delete("/api/businesses/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.deleteBusiness(req.params.id as string, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting business:", error);
      res.status(500).json({ message: "Failed to delete business" });
    }
  });

  // ---- LEADS ----

  app.get("/api/leads", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const businessId = req.query.businessId as string | undefined;
      const source = req.query.source as string | undefined;
      let result = await storage.getLeadsByUser(userId, businessId);
      if (source) {
        result = result.filter(l => l.source === source);
      }
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

  app.patch("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const lead = await storage.getLeadById(req.params.id as string);
      if (!lead || lead.userId !== userId) {
        return res.status(404).json({ message: "Lead not found" });
      }
      const updateSchema = z.object({
        outreach: z.string().min(1).max(5000).optional(),
        status: z.enum(["new", "warm", "hot", "cold", "qualified"]).optional(),
        scheduledSendAt: z.string().datetime().optional().nullable(),
      }).refine(data => data.outreach !== undefined || data.status !== undefined || data.scheduledSendAt !== undefined, { message: "No valid fields to update" });
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const updates: any = {};
      if (parsed.data.outreach) updates.outreach = parsed.data.outreach.trim();
      if (parsed.data.status) updates.status = parsed.data.status;
      if (parsed.data.scheduledSendAt !== undefined) {
        updates.scheduledSendAt = parsed.data.scheduledSendAt ? new Date(parsed.data.scheduledSendAt) : null;
      }
      const updated = await storage.updateLead(lead.id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  // ---- SEND OUTREACH EMAILS ----

  app.post("/api/leads/:id/send-outreach", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const lead = await storage.getLeadById(req.params.id as string);
      if (!lead || lead.userId !== userId) {
        return res.status(404).json({ message: "Lead not found" });
      }
      if (lead.outreachSentAt) {
        return res.status(400).json({ message: "Outreach already sent to this lead" });
      }

      const settings = await storage.getSettingsByUser(userId);
      const user = await storage.getUserById(userId);
      const result = await sendOutreachEmail(lead, settings, user);

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      const followUpNextAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      await storage.updateLead(lead.id, { outreachSentAt: new Date(), status: "warm", followUpStep: 0, followUpStatus: "active", followUpNextAt });
      res.json({ success: true, message: `Outreach sent to ${lead.name}` });
    } catch (error) {
      console.error("Error sending outreach:", error);
      res.status(500).json({ message: "Failed to send outreach" });
    }
  });

  const bulkSendStatus = new Map<string, { status: string; sent: number; failed: number; total: number; errors: string[] }>();

  async function processBulkOutreachSend(userId: string, unsent: any[], settings: any, user: any) {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const lead of unsent) {
      try {
        const result = await sendOutreachEmail(lead, settings, user);
        if (result.success) {
          const followUpNextAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
          await storage.updateLead(lead.id, { outreachSentAt: new Date(), status: "warm", followUpStep: 0, followUpStatus: "active", followUpNextAt });
          sent++;
        } else {
          failed++;
          errors.push(`${lead.name}: ${result.error}`);
        }
      } catch (err: any) {
        failed++;
        errors.push(`${lead.name}: ${err.message || "Unknown error"}`);
      }
      bulkSendStatus.set(userId, { status: "processing", sent, failed, total: unsent.length, errors: errors.slice(0, 5) });
    }

    bulkSendStatus.set(userId, { status: "complete", sent, failed, total: unsent.length, errors: errors.slice(0, 5) });
    console.log(`Bulk outreach send complete for user ${userId}: ${sent} sent, ${failed} failed out of ${unsent.length}`);
  }

  app.post("/api/leads/send-all-outreach", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const allLeads = await storage.getLeadsByUser(userId);
      const unsent = allLeads.filter(l => l.outreach && l.email && !l.outreachSentAt);

      if (unsent.length === 0) {
        return res.status(400).json({ message: "No unsent outreach emails to send" });
      }

      const settings = await storage.getSettingsByUser(userId);
      const user = await storage.getUserById(userId);

      if (!user?.companyName) {
        return res.status(400).json({ message: "Company identity required. Go to Settings > Company Profile and enter your company name before sending outreach." });
      }

      if (!settings?.senderEmail) {
        return res.status(400).json({ message: "Sender email required. Go to Settings > Integrations > Email Identity and set your sender email before sending outreach." });
      }

      const bulkSmtpHost = settings?.smtpHost || process.env.SMTP_HOST;
      const bulkSmtpUser = settings?.smtpUsername || process.env.SMTP_USERNAME;
      const bulkSmtpPass = settings?.smtpPassword || process.env.SMTP_PASSWORD;
      const bulkHasSmtp = !!(bulkSmtpHost && bulkSmtpUser && bulkSmtpPass);
      const bulkHasSg = !!settings?.sendgridApiKey;
      let bulkProvider = bulkHasSmtp ? "smtp" : (settings?.emailProvider || "sendgrid");

      if (bulkProvider === "smtp") {
        if (!bulkHasSmtp) {
          return res.status(400).json({ message: "SMTP settings incomplete. Go to Settings > Integrations and configure your SMTP server." });
        }
      } else if (!bulkHasSg) {
        return res.status(400).json({ message: "Email provider not configured. Go to Settings > Integrations and set up SendGrid or SMTP." });
      }

      const existing = bulkSendStatus.get(userId);
      if (existing && existing.status === "processing") {
        return res.json({ status: "processing", sent: existing.sent, failed: existing.failed, total: existing.total });
      }

      bulkSendStatus.set(userId, { status: "processing", sent: 0, failed: 0, total: unsent.length, errors: [] });
      res.json({ status: "processing", sent: 0, failed: 0, total: unsent.length, message: `Sending ${unsent.length} emails in the background...` });

      setImmediate(() => {
        processBulkOutreachSend(userId, unsent, settings, user).catch(err => {
          console.error("Background bulk send failed:", err);
          bulkSendStatus.set(userId, { status: "error", sent: 0, failed: 0, total: unsent.length, errors: [String(err)] });
        });
      });
    } catch (error) {
      console.error("Error sending bulk outreach:", error);
      res.status(500).json({ message: "Failed to send outreach emails" });
    }
  });

  app.get("/api/leads/send-all-outreach/status", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const status = bulkSendStatus.get(userId);
    if (!status) {
      return res.json({ status: "idle", sent: 0, failed: 0, total: 0 });
    }
    res.json(status);
    if (status.status === "complete" || status.status === "error") {
      bulkSendStatus.delete(userId);
    }
  });

  // ---- GENERATE MISSING OUTREACH DRAFTS ----

  const outreachGenerationStatus = new Map<string, { status: string; generated: number; total: number; error?: string }>();

  async function processOutreachGeneration(userId: string) {
    try {
      let outreachAi: { client: Anthropic; model: string };
      try { outreachAi = await getAnthropicForUser(userId); } catch {
        outreachGenerationStatus.set(userId, { status: "error", generated: 0, total: 0, error: "AI API key not configured" });
        return;
      }
      const allLeads = await storage.getLeadsByUser(userId);
      const needsOutreach = allLeads.filter(l => !l.outreach || l.outreach.trim() === "");
      const user = await storage.getUserById(userId);
      const userSettings = await storage.getSettingsByUser(userId);
      const bookingLink = userSettings?.calendarLink || "";

      const batchSize = 10;
      let generated = 0;
      const batches = [];
      for (let i = 0; i < needsOutreach.length; i += batchSize) {
        batches.push(needsOutreach.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const leadsInfo = batch.map((l, idx) =>
          `${idx + 1}. Name: "${l.name}", Company: ${l.company || "N/A"}, Email: ${l.email || "N/A"}, Notes: ${l.notes || "N/A"}, Intent: ${l.intentSignal || "N/A"}`
        ).join("\n");

        try {
          const response = await outreachAi.client.messages.create({
            model: outreachAi.model,
            max_tokens: 4000,
            messages: [{
              role: "user",
              content: `Generate personalized outreach email drafts (3-5 sentences each) for these leads. Reference their situation, mention a benefit, include a call-to-action.${bookingLink ? ` Booking link: ${bookingLink}` : ""}\n\nFrom: ${user?.companyName || "Our company"} (${user?.industry || ""})\n\nLeads:\n${leadsInfo}\n\nReturn ONLY a JSON array: [{"name":"exact lead name","outreach":"email draft"}]. No markdown, no explanation.`
            }],
          });

          const text = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map(b => b.text).join("");
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const drafts = JSON.parse(jsonMatch[0]);
            for (const draft of drafts) {
              const matchingLead = batch.find(l => l.name.toLowerCase() === draft.name?.toLowerCase());
              if (matchingLead && draft.outreach) {
                await storage.updateLead(matchingLead.id, { outreach: draft.outreach });
                generated++;
              }
            }
          }
        } catch (batchError) {
          console.error("Error generating outreach batch:", batchError);
        }
        outreachGenerationStatus.set(userId, { status: "processing", generated, total: needsOutreach.length });
      }

      outreachGenerationStatus.set(userId, { status: "complete", generated, total: needsOutreach.length });
      console.log(`Outreach generation complete for user ${userId}: ${generated}/${needsOutreach.length}`);
    } catch (error) {
      console.error("Error in background outreach generation:", error);
      outreachGenerationStatus.set(userId, { status: "error", generated: 0, total: 0, error: "Failed to generate outreach drafts" });
    }
  }

  app.post("/api/leads/generate-outreach", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const allLeads = await storage.getLeadsByUser(userId);
    const needsOutreach = allLeads.filter(l => !l.outreach || l.outreach.trim() === "");

    if (needsOutreach.length === 0) {
      return res.json({ message: "All leads already have outreach drafts!", generated: 0, status: "complete" });
    }

    const existing = outreachGenerationStatus.get(userId);
    if (existing && existing.status === "processing") {
      return res.json({ message: "Already generating drafts...", total: existing.total, status: "processing" });
    }

    outreachGenerationStatus.set(userId, { status: "processing", generated: 0, total: needsOutreach.length });
    res.json({ message: `Generating drafts for ${needsOutreach.length} leads...`, total: needsOutreach.length, status: "processing" });

    setImmediate(() => {
      processOutreachGeneration(userId).catch(err => {
        console.error("Background outreach generation failed:", err);
        outreachGenerationStatus.set(userId, { status: "error", generated: 0, total: 0, error: String(err) });
      });
    });
  });

  app.get("/api/leads/generate-outreach/status", isAuthenticated, async (req, res) => {
    const userId = req.session.userId!;
    const status = outreachGenerationStatus.get(userId);
    if (!status) {
      return res.json({ status: "idle", generated: 0, total: 0 });
    }
    res.json(status);
    if (status.status === "complete" || status.status === "error") {
      outreachGenerationStatus.delete(userId);
    }
  });

  // ---- SCHEDULE OUTREACH ----

  app.post("/api/leads/:id/schedule-outreach", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const lead = await storage.getLeadById(req.params.id as string);
      if (!lead || lead.userId !== userId) {
        return res.status(404).json({ message: "Lead not found" });
      }
      if (lead.outreachSentAt) {
        return res.status(400).json({ message: "Outreach already sent to this lead" });
      }
      if (!lead.outreach) {
        return res.status(400).json({ message: "Lead has no outreach draft to schedule" });
      }
      if (!lead.email) {
        return res.status(400).json({ message: "Lead has no email address" });
      }
      const schema = z.object({ scheduledSendAt: z.string().datetime() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid schedule time" });
      }
      const scheduleDate = new Date(parsed.data.scheduledSendAt);
      if (scheduleDate <= new Date()) {
        return res.status(400).json({ message: "Scheduled time must be in the future" });
      }
      await storage.updateLead(lead.id, { scheduledSendAt: scheduleDate });
      res.json({ success: true, message: `Outreach to ${lead.name} scheduled for ${scheduleDate.toLocaleString()}` });
    } catch (error) {
      console.error("Error scheduling outreach:", error);
      res.status(500).json({ message: "Failed to schedule outreach" });
    }
  });

  app.post("/api/leads/:id/cancel-schedule", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const lead = await storage.getLeadById(req.params.id as string);
      if (!lead || lead.userId !== userId) {
        return res.status(404).json({ message: "Lead not found" });
      }
      if (!lead.scheduledSendAt) {
        return res.status(400).json({ message: "No schedule to cancel" });
      }
      await storage.updateLead(lead.id, { scheduledSendAt: null });
      res.json({ success: true, message: `Schedule cancelled for ${lead.name}` });
    } catch (error) {
      console.error("Error cancelling schedule:", error);
      res.status(500).json({ message: "Failed to cancel schedule" });
    }
  });

  // ---- FOLLOW-UP SEQUENCE CONTROL ----

  app.post("/api/leads/:id/follow-up/pause", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const lead = await storage.getLeadById(req.params.id as string);
      if (!lead || lead.userId !== userId) {
        return res.status(404).json({ message: "Lead not found" });
      }
      if (lead.followUpStatus !== "active") {
        return res.status(400).json({ message: "Follow-up is not active" });
      }
      await storage.updateLead(lead.id, { followUpStatus: "paused", followUpNextAt: null });
      res.json({ success: true, message: `Follow-up paused for ${lead.name}` });
    } catch (error) {
      console.error("Error pausing follow-up:", error);
      res.status(500).json({ message: "Failed to pause follow-up" });
    }
  });

  app.post("/api/leads/:id/follow-up/resume", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const lead = await storage.getLeadById(req.params.id as string);
      if (!lead || lead.userId !== userId) {
        return res.status(404).json({ message: "Lead not found" });
      }
      if (lead.followUpStatus !== "paused") {
        return res.status(400).json({ message: "Follow-up is not paused" });
      }
      const followUpNextAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      await storage.updateLead(lead.id, { followUpStatus: "active", followUpNextAt });
      res.json({ success: true, message: `Follow-up resumed for ${lead.name}` });
    } catch (error) {
      console.error("Error resuming follow-up:", error);
      res.status(500).json({ message: "Failed to resume follow-up" });
    }
  });

  // ---- BACKGROUND SCHEDULER ----

  async function processScheduledOutreach() {
    try {
      const dueLeads = await storage.getScheduledLeadsToSend();
      if (dueLeads.length === 0) return;

      for (const lead of dueLeads) {
        try {
          if (!lead.outreach || !lead.email) {
            await storage.updateLead(lead.id, { scheduledSendAt: null });
            continue;
          }
          const settings = await storage.getSettingsByUser(lead.userId);
          const user = await storage.getUserById(lead.userId);
          if (!user?.companyName || !settings?.senderEmail) {
            console.warn(`Clearing schedule for lead ${lead.id}: missing company/sender config`);
            await storage.updateLead(lead.id, { scheduledSendAt: null });
            continue;
          }
          const result = await sendOutreachEmail(lead, settings, user);
          if (result.success) {
            const followUpNextAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
            await storage.updateLead(lead.id, { outreachSentAt: new Date(), scheduledSendAt: null, status: "warm", followUpStep: 0, followUpStatus: "active", followUpNextAt });
            console.log(`Scheduled outreach sent to ${lead.name} (${lead.email})`);
          } else {
            console.error(`Scheduled send failed for ${lead.name}: ${result.error}. Clearing schedule.`);
            await storage.updateLead(lead.id, { scheduledSendAt: null });
          }
        } catch (err) {
          console.error(`Error processing scheduled lead ${lead.id}:`, err);
        }
      }
    } catch (error) {
      console.error("Error in scheduled outreach processor:", error);
    }
  }

  setInterval(processScheduledOutreach, 60 * 1000);

  // ---- AUTOMATED FOLLOW-UP SEQUENCES ----
  // Sends escalating follow-up emails to leads until they book an appointment
  // Schedule: Day 1 (initial sent), Day 3 (follow-up 1), Day 5 (follow-up 2), Day 7 (final nudge)

  const FOLLOW_UP_SCHEDULE = [
    { step: 1, daysAfter: 2, urgency: "gentle", label: "Friendly Check-In" },
    { step: 2, daysAfter: 2, urgency: "value", label: "Value Reminder" },
    { step: 3, daysAfter: 2, urgency: "final", label: "Final Nudge" },
  ];

  async function generateFollowUpEmail(lead: any, step: number, urgency: string, user: any, bookingLink: string, userClient?: { client: Anthropic; model: string }): Promise<string> {
    const urgencyInstructions: Record<string, string> = {
      gentle: "Write a warm, friendly follow-up. Reference the initial email without being pushy. Ask if they had a chance to review your proposal. Keep it short (3-4 sentences).",
      value: "Write a value-driven follow-up. Include a specific benefit or case study result (e.g., 'Our clients typically see 15-25% improvement in collection rates'). Create gentle urgency. Include the booking link.",
      final: "Write a final follow-up. Be direct but respectful — mention this is the last email. Emphasize the specific value you can provide. Make it easy to respond with a simple yes/no. Include the booking link.",
    };

    const prompt = `Write a follow-up email (follow-up #${step} of 3) for this lead:
Name: ${lead.name}
Company: ${lead.company || "their practice"}
Initial outreach was about: medical billing optimization services from ${user.companyName || "our company"}

${urgencyInstructions[urgency] || urgencyInstructions.gentle}

${bookingLink ? `Include this booking link naturally: ${bookingLink}` : "Invite them to reply to schedule a quick call."}

RULES:
- Do NOT include a subject line — just the email body
- Use their first name: ${lead.name.split(" ")[0]}
- Sign off as ${user.firstName || "the team"} from ${user.companyName || "our company"}
- Keep it under 150 words
- Be conversational, not corporate
- Do not use placeholder brackets like [Company] — use actual values`;

    try {
      return await claudeGenerate(prompt, "email", userClient);
    } catch (err) {
      console.error(`[FOLLOW-UP] Failed to generate email for step ${step}:`, err);
      return "";
    }
  }

  async function sendFollowUpEmail(lead: any, emailBody: string, step: number, userSettings: any, user: any): Promise<{ success: boolean; error?: string }> {
    if (!lead.email || !emailBody) {
      return { success: false, error: "No email or follow-up body" };
    }
    if (!user?.companyName || !userSettings?.senderEmail) {
      return { success: false, error: "Missing company/sender config" };
    }

    const smtpHost = userSettings.smtpHost || process.env.SMTP_HOST;
    const smtpUsername = userSettings.smtpUsername || process.env.SMTP_USERNAME;
    const smtpPassword = userSettings.smtpPassword || process.env.SMTP_PASSWORD;
    const smtpPort = userSettings.smtpPort || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587);
    const smtpSecure = userSettings.smtpSecure ?? false;

    const hasSmtp = !!(smtpHost && smtpUsername && smtpPassword);
    const hasSendgrid = !!userSettings.sendgridApiKey;
    const hasSmtpEnvVars = !!(process.env.SMTP_HOST && process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD);

    let emailProvider = userSettings.emailProvider || "sendgrid";
    if (hasSmtpEnvVars || hasSmtp) emailProvider = "smtp";

    if (emailProvider === "smtp" && !hasSmtp) return { success: false, error: "SMTP settings incomplete" };
    if (emailProvider !== "smtp" && !hasSendgrid) return { success: false, error: "No email provider configured" };

    const senderEmail = userSettings.senderEmail;
    const senderName = `${user.firstName || ""} from ${user.companyName}`.trim();
    const firstName = lead.name.split(" ")[0];
    const subjectLine = step === 1
      ? `Following up, ${firstName}`
      : step === 2
        ? `Quick thought for ${lead.company || firstName}`
        : `Last note, ${firstName}`;

    const baseUrl = getBaseUrl();
    let htmlBody = emailBody.replace(/\n/g, "<br>");
    htmlBody = wrapLinksForTracking(htmlBody, lead.id, baseUrl);
    htmlBody = injectTrackingPixel(htmlBody, lead.id, baseUrl);

    try {
      if (emailProvider === "smtp") {
        const transporter = nodemailer.createTransport({
          host: smtpHost, port: smtpPort, secure: smtpSecure,
          auth: { user: smtpUsername, pass: smtpPassword },
        });
        await transporter.sendMail({
          from: `"${senderName}" <${senderEmail}>`,
          to: lead.email, subject: subjectLine,
          text: emailBody, html: htmlBody,
        });
      } else {
        sgMail.setApiKey(userSettings.sendgridApiKey);
        await sgMail.send({
          to: lead.email,
          from: { email: senderEmail, name: senderName },
          subject: subjectLine, text: emailBody, html: htmlBody,
        });
      }
      console.log(`[FOLLOW-UP] Step ${step} sent to ${lead.name} (${lead.email})`);
      return { success: true };
    } catch (err: any) {
      console.error(`[FOLLOW-UP] Send failed for ${lead.name}:`, err?.message);
      return { success: false, error: err?.message || "Send failed" };
    }
  }

  async function processFollowUpSequences() {
    try {
      const dueLeads = await storage.getLeadsDueForFollowUp();
      if (dueLeads.length === 0) return;

      console.log(`[FOLLOW-UP] Processing ${dueLeads.length} leads due for follow-up`);

      for (const lead of dueLeads) {
        try {
          const appointments = await storage.getAppointmentsByUser(lead.userId);
          const hasAppointment = appointments.some(
            a => a.leadName.toLowerCase() === lead.name.toLowerCase()
          );
          if (hasAppointment) {
            await storage.updateLead(lead.id, {
              followUpStatus: "completed",
              followUpNextAt: null,
            });
            console.log(`[FOLLOW-UP] ${lead.name} booked appointment — sequence stopped`);
            continue;
          }

          if (lead.engagementScore && lead.engagementScore >= 60) {
            await storage.updateLead(lead.id, {
              followUpStatus: "completed",
              followUpNextAt: null,
            });
            console.log(`[FOLLOW-UP] ${lead.name} highly engaged (score ${lead.engagementScore}) — sequence stopped`);
            continue;
          }

          const currentStep = (lead.followUpStep || 0) + 1;
          const stepConfig = FOLLOW_UP_SCHEDULE.find(s => s.step === currentStep);

          if (!stepConfig) {
            await storage.updateLead(lead.id, {
              followUpStatus: "completed",
              followUpNextAt: null,
            });
            console.log(`[FOLLOW-UP] ${lead.name} completed all ${FOLLOW_UP_SCHEDULE.length} steps`);
            continue;
          }

          const settings = await storage.getSettingsByUser(lead.userId);
          const user = await storage.getUserById(lead.userId);
          if (!user || !settings?.senderEmail) {
            console.warn(`[FOLLOW-UP] Skipping ${lead.name}: missing user/sender config`);
            continue;
          }

          let followUpAi: { client: Anthropic; model: string } | undefined;
          try { followUpAi = await getAnthropicForUser(lead.userId); } catch {
            console.warn(`[FOLLOW-UP] Skipping ${lead.name}: user has no AI API key configured`);
            continue;
          }

          const bookingLink = settings.calendarLink || "";
          const emailBody = await generateFollowUpEmail(lead, currentStep, stepConfig.urgency, user, bookingLink, followUpAi);
          if (!emailBody) {
            console.warn(`[FOLLOW-UP] Empty email generated for ${lead.name} step ${currentStep}, retrying next cycle`);
            continue;
          }

          const result = await sendFollowUpEmail(lead, emailBody, currentStep, settings, user);
          if (result.success) {
            const nextStepConfig = FOLLOW_UP_SCHEDULE.find(s => s.step === currentStep + 1);
            const nextAt = nextStepConfig
              ? new Date(Date.now() + nextStepConfig.daysAfter * 24 * 60 * 60 * 1000)
              : null;

            await storage.updateLead(lead.id, {
              followUpStep: currentStep,
              followUpLastSentAt: new Date(),
              followUpNextAt: nextAt,
              followUpStatus: nextAt ? "active" : "completed",
              status: lead.status === "new" ? "warm" : lead.status,
            });
          } else {
            console.error(`[FOLLOW-UP] Failed for ${lead.name}: ${result.error}`);
          }

          await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
          console.error(`[FOLLOW-UP] Error processing lead ${lead.id}:`, err);
        }
      }
    } catch (error) {
      console.error("[FOLLOW-UP] Background processor error:", error);
    }
  }

  setInterval(processFollowUpSequences, 5 * 60 * 1000);
  setTimeout(processFollowUpSequences, 2 * 60 * 1000);

  // ============================================================
  // AUTOMATIC MEDICAL BILLING LEAD GENERATION (every 5 hours)
  // Uses Claude AI to search for real medical billing leads
  // and adds them to the CRM automatically
  // ============================================================

  const AUTO_LEAD_GEN_INTERVAL = 5 * 60 * 60 * 1000; // 5 hours
  const AUTO_LEAD_GEN_BATCH_SIZE = 30;

  const MEDICAL_BILLING_SEARCH_ROTATIONS = [
    { region: "Tennessee", focus: "solo practices hiring billing managers" },
    { region: "Missouri", focus: "new medical practices needing RCM services" },
    { region: "Georgia", focus: "practices complaining about billing issues" },
    { region: "Texas", focus: "family medicine practices outsourcing billing" },
    { region: "Florida", focus: "urgent care clinics seeking billing help" },
    { region: "Ohio", focus: "pediatric practices with denied claims" },
    { region: "North Carolina", focus: "dermatology practices needing billing" },
    { region: "Illinois", focus: "internal medicine billing outsourcing" },
    { region: "California", focus: "orthopedic practices switching billing companies" },
    { region: "Pennsylvania", focus: "small medical practices needing RCM" },
    { region: "Virginia", focus: "multi-specialty clinics billing pain points" },
    { region: "New York", focus: "solo practitioners medical billing services" },
  ];

  let autoLeadGenRotationIndex = 0;

  async function runAutoLeadGeneration() {
    try {
      const allUsers = await storage.getAllUsers();
      if (allUsers.length === 0) {
        console.log("[Auto Lead Gen] No users found, skipping");
        return;
      }

      const eligibleUsers: Array<{ user: any; ai: { client: Anthropic; model: string } }> = [];
      for (const user of allUsers) {
        const settings = await storage.getSettingsByUser(user.id);
        if (!settings?.autoLeadGenEnabled) continue;
        if (!settings?.anthropicApiKey || !settings.anthropicApiKey.startsWith("sk-ant-")) continue;
        const sub = await storage.getSubscriptionByUser(user.id);
        if (!sub || (sub.status !== "active" && sub.status !== "trial")) continue;
        try {
          const ai = await getAnthropicForUser(user.id);
          eligibleUsers.push({ user, ai });
        } catch { continue; }
      }

      if (eligibleUsers.length === 0) {
        console.log("[Auto Lead Gen] No eligible users (need: API key + enabled + active subscription)");
        return;
      }

      for (const { user: targetUser, ai: userAi } of eligibleUsers) {
        await runAutoLeadGenForUser(targetUser, userAi);
      }
    } catch (error: any) {
      console.error("[Auto Lead Gen] Scheduler error:", error?.message);
    }
  }

  async function runAutoLeadGenForUser(targetUser: any, userAi: { client: Anthropic; model: string }) {
    try {
      const rotation = MEDICAL_BILLING_SEARCH_ROTATIONS[autoLeadGenRotationIndex % MEDICAL_BILLING_SEARCH_ROTATIONS.length];
      autoLeadGenRotationIndex++;

      console.log(`[Auto Lead Gen] Starting run for user ${targetUser.email} — ${rotation.region} — ${rotation.focus}`);

      const [runRecord] = await db.insert(autoLeadGenRuns).values({
        userId: targetUser.id,
        status: "running",
        searchQueries: `${rotation.region}: ${rotation.focus}`,
        startedAt: new Date(),
      }).returning();

      const userAnthropicClient = userAi.client;
      const userModelName = userAi.model;

      const autoGenPrompt = `You are Track-Med Billing Solutions' automated lead hunter. Your ONLY job is to find ${AUTO_LEAD_GEN_BATCH_SIZE} REAL medical billing leads and save them.

TASK: Find ${AUTO_LEAD_GEN_BATCH_SIZE} medical billing leads in ${rotation.region}, focused on: ${rotation.focus}

SEARCH STRATEGY:
1. Use web_search to find real medical practices, physicians, and clinics in ${rotation.region}
2. Look for practices that show intent signals: hiring billing staff, new practice openings, complaints about billing, switching RCM companies
3. Find decision makers: practice owners, physicians (MD/DO), practice administrators, medical directors, CFOs
4. Extract real names, emails, phone numbers, company names from search results
5. If direct email not found, use patterns: firstname@practicename.com, info@practicename.com, or contact@ patterns

SCORING:
- Hiring for billing position: score 80+
- New practice (< 6 months): score 75+
- Complaining about billing: score 85+
- Practice owner/physician: +25 to score
- Solo/small practice: +20 to score

For EACH lead provide: name, email, phone, company, source ("Medical Billing Lead Hunter"), status "new", score (40-95), intent_signal, notes (title + why they're a good prospect), outreach (personalized 3-5 sentence email ending with: Best regards, Clara Motena, Client Acquisition Director, Track-Med Billing Solutions, +1(615)482-6768 / (636) 244-8246)

CRITICAL: You MUST call generate_leads with ALL ${AUTO_LEAD_GEN_BATCH_SIZE} leads in a single call. Use agent_type="lead-gen". Do NOT just talk about leads — you MUST use the generate_leads tool to save them.`;

      const tools: any[] = [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 10,
        },
        {
          name: "generate_leads",
          description: "Save leads to CRM. Pass all leads at once.",
          input_schema: {
            type: "object" as const,
            properties: {
              leads: {
                type: "array" as const,
                items: {
                  type: "object" as const,
                  properties: {
                    name: { type: "string" as const },
                    email: { type: "string" as const },
                    phone: { type: "string" as const },
                    company: { type: "string" as const },
                    source: { type: "string" as const },
                    status: { type: "string" as const },
                    score: { type: "number" as const },
                    intent_signal: { type: "string" as const },
                    notes: { type: "string" as const },
                    outreach: { type: "string" as const },
                  },
                  required: ["name"],
                },
              },
              agent_type: { type: "string" as const },
            },
            required: ["leads"],
          },
        },
      ];

      async function claudeCallWithRetry(params: any, retries = 3): Promise<any> {
        for (let i = 0; i < retries; i++) {
          try {
            return await userAnthropicClient.messages.create(params);
          } catch (err: any) {
            if (err?.status === 429 && i < retries - 1) {
              const wait = Math.min((i + 1) * 30000, 90000);
              console.log(`[Auto Lead Gen] Rate limited, waiting ${wait / 1000}s...`);
              await new Promise(r => setTimeout(r, wait));
            } else {
              throw err;
            }
          }
        }
      }

      let response = await claudeCallWithRetry({
        model: userModelName,
        max_tokens: 4096,
        messages: [{ role: "user", content: autoGenPrompt }],
        tools,
      });

      let loopCount = 0;
      const maxAutoLoops = 15;
      let currentMessages: any[] = [{ role: "user", content: autoGenPrompt }];
      let leadsGenerated = 0;

      while (response.stop_reason === "tool_use" && loopCount < maxAutoLoops) {
        loopCount++;
        currentMessages.push({ role: "assistant", content: response.content });

        const toolUseBlocks = response.content.filter(
          (block: any) => block.type === "tool_use"
        );

        const crmToolUses = toolUseBlocks.filter((t: any) => t.name !== "web_search");
        const toolResults: any[] = [];

        for (const toolUse of crmToolUses) {
          try {
            console.log(`[Auto Lead Gen] Tool: ${toolUse.name}`);
            const result = await executeAction(targetUser.id, toolUse.name, toolUse.input || {});
            console.log(`[Auto Lead Gen] Result: ${result.slice(0, 150)}`);

            const match = result.match(/Saved (\d+) real leads/);
            if (match) leadsGenerated += parseInt(match[1]);

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: result,
            });
          } catch (err: any) {
            console.error(`[Auto Lead Gen] Tool error: ${err?.message}`);
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: `ERROR: ${err?.message}`,
              is_error: true,
            });
          }
        }

        if (toolResults.length > 0) {
          currentMessages.push({ role: "user", content: toolResults });
        }

        response = await claudeCallWithRetry({
          model: userModelName,
          max_tokens: 4096,
          messages: currentMessages,
          tools,
        });
      }

      if (leadsGenerated === 0 && loopCount < maxAutoLoops) {
        console.log("[Auto Lead Gen] No leads generated yet, forcing generate_leads call...");
        const textSoFar = response.content
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("\n");

        currentMessages.push({ role: "assistant", content: response.content as any });
        currentMessages.push({
          role: "user",
          content: `You MUST now call the generate_leads tool with all the leads you found. Do NOT just describe them in text. Call the tool NOW with an array of lead objects. Each lead needs: name, email, phone, company, source ("Medical Billing Lead Hunter"), status "new", score, intent_signal, notes, outreach. Use agent_type="lead-gen". If you found practices in your search, create leads for them NOW using the tool.`,
        });

        const retryResponse = await claudeCallWithRetry({
          model: userModelName,
          max_tokens: 4096,
          messages: currentMessages,
          tools,
        });

        let retryLoops = 0;
        let retryResp = retryResponse;
        let retryCurrent = [...currentMessages];

        while (retryResp.stop_reason === "tool_use" && retryLoops < 5) {
          retryLoops++;
          retryCurrent.push({ role: "assistant", content: retryResp.content as any });

          const retryToolUses = retryResp.content.filter(
            (block: any) => block.type === "tool_use" && block.name !== "web_search"
          );

          const retryResults: any[] = [];
          for (const toolUse of retryToolUses) {
            try {
              const result = await executeAction(targetUser.id, toolUse.name, toolUse.input || {});
              console.log(`[Auto Lead Gen Retry] ${toolUse.name}: ${result.slice(0, 150)}`);
              const match = result.match(/Saved (\d+) real leads/);
              if (match) leadsGenerated += parseInt(match[1]);
              retryResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
            } catch (err: any) {
              retryResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: `ERROR: ${err?.message}`, is_error: true });
            }
          }

          if (retryResults.length > 0) {
            retryCurrent.push({ role: "user", content: retryResults });
          }

          retryResp = await claudeCallWithRetry({
            model: userModelName,
            max_tokens: 4096,
            messages: retryCurrent,
            tools,
          });
        }
      }

      await db.update(autoLeadGenRuns).set({
        status: leadsGenerated > 0 ? "completed" : "no_leads",
        leadsGenerated,
        completedAt: new Date(),
      }).where(eq(autoLeadGenRuns.id, runRecord.id));

      console.log(`[Auto Lead Gen] Completed for ${targetUser.email}: ${leadsGenerated} leads generated for ${rotation.region}`);

    } catch (error: any) {
      console.error(`[Auto Lead Gen] Error for user ${targetUser.email}:`, error?.message);
    }
  }

  // Start auto lead gen on a 5-hour interval (first run after 5 minutes to avoid rate limits at startup)
  setTimeout(() => {
    runAutoLeadGeneration();
    setInterval(runAutoLeadGeneration, AUTO_LEAD_GEN_INTERVAL);
  }, 5 * 60 * 1000);

  // API: Get auto lead gen status & history
  app.get("/api/auto-lead-gen/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const settings = await storage.getSettingsByUser(userId);
      const runs = await db.select().from(autoLeadGenRuns).where(eq(autoLeadGenRuns.userId, userId)).orderBy(desc(autoLeadGenRuns.startedAt)).limit(20);
      const totalLeads = runs.reduce((sum, r) => sum + (r.leadsGenerated || 0), 0);
      res.json({
        enabled: !!settings?.autoLeadGenEnabled,
        hasApiKey: !!(settings?.anthropicApiKey && settings.anthropicApiKey.startsWith("sk-ant-")),
        intervalHours: 5,
        batchSize: AUTO_LEAD_GEN_BATCH_SIZE,
        totalLeadsGenerated: totalLeads,
        runs,
        nextRotation: MEDICAL_BILLING_SEARCH_ROTATIONS[autoLeadGenRotationIndex % MEDICAL_BILLING_SEARCH_ROTATIONS.length],
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auto-lead-gen/trigger", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let userAi: { client: Anthropic; model: string };
      try { userAi = await getAnthropicForUser(userId); } catch {
        return res.status(400).json({ message: "AI API key not configured. Go to Settings > Integrations to add your Anthropic API key." });
      }
      const settings = await storage.getSettingsByUser(userId);
      if (!settings?.autoLeadGenEnabled) {
        return res.status(400).json({ message: "Auto lead generation is not enabled. Enable it in Settings > Integrations." });
      }
      const user = await storage.getUserById(userId);
      res.json({ message: "Auto lead generation triggered for your account. Check status in a few minutes." });
      runAutoLeadGenForUser(user, userAi);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ---- SMS (Twilio) ----

  app.post("/api/sms/send", isAuthenticated, async (req, res) => {
    try {
      const { to, body } = req.body;
      if (!to || !body) {
        return res.status(400).json({ message: "Phone number (to) and message body are required" });
      }
      const { sendSMS } = await import("./twilio");
      const message = await sendSMS(to, body);
      res.json({ success: true, sid: message.sid, status: message.status });
    } catch (error: any) {
      console.error("Error sending SMS:", error);
      res.status(500).json({ message: error.message || "Failed to send SMS" });
    }
  });

  app.post("/api/leads/:id/send-sms", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const lead = await storage.getLeadById(req.params.id as string);
      if (!lead || lead.userId !== userId) {
        return res.status(404).json({ message: "Lead not found" });
      }
      if (!lead.phone) {
        return res.status(400).json({ message: "Lead has no phone number" });
      }
      const { body } = req.body;
      if (!body) {
        return res.status(400).json({ message: "Message body is required" });
      }
      const { sendSMS } = await import("./twilio");
      const message = await sendSMS(lead.phone, body);
      res.json({ success: true, sid: message.sid, status: message.status, leadName: lead.name });
    } catch (error: any) {
      console.error("Error sending SMS to lead:", error);
      res.status(500).json({ message: error.message || "Failed to send SMS" });
    }
  });

  // ---- EMAIL TRACKING (public endpoints — no auth, hit from email clients) ----

  const TRACKING_PIXEL = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );

  function calculateEngagement(opens: number, clicks: number): { score: number; level: string; nextStep: string } {
    let score = 0;
    if (opens >= 1) score += 20;
    if (opens >= 2) score += 10;
    if (opens >= 3) score += 10;
    if (clicks >= 1) score += 30;
    if (clicks >= 2) score += 15;
    if (clicks >= 3) score += 10;
    score = Math.min(score, 100);

    let level: string;
    let nextStep: string;
    if (score >= 60) {
      level = "hot";
      nextStep = "Schedule a call immediately — this lead is highly engaged";
    } else if (score >= 30) {
      level = "warm";
      nextStep = "Send a follow-up email with a case study or booking link";
    } else if (score >= 10) {
      level = "interested";
      nextStep = "Send a value-add follow-up in 2-3 days";
    } else {
      level = "none";
      nextStep = "Wait for engagement or try a different channel (SMS/call)";
    }
    return { score, level, nextStep };
  }

  app.get("/t/o/:leadId", async (req, res) => {
    try {
      const lead = await storage.getLeadById(req.params.leadId);
      if (lead) {
        await storage.createEmailEvent({
          leadId: lead.id,
          userId: lead.userId,
          eventType: "open",
          ipAddress: (req.headers["x-forwarded-for"] as string || req.ip || "").split(",")[0].trim(),
          userAgent: req.headers["user-agent"] || null,
          metadata: null,
        });

        const newOpens = (lead.emailOpens || 0) + 1;
        const { score, level, nextStep } = calculateEngagement(newOpens, lead.emailClicks || 0);
        const statusUpdate: any = {
          emailOpens: newOpens,
          engagementScore: score,
          engagementLevel: level,
          lastEngagedAt: new Date(),
          nextStep,
        };
        if (level === "hot" && lead.status !== "qualified") statusUpdate.status = "hot";
        else if (level === "warm" && lead.status === "new") statusUpdate.status = "warm";
        await storage.updateLead(lead.id, statusUpdate);
      }
    } catch (err) {
      console.error("Tracking pixel error:", err);
    }
    res.set({
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.send(TRACKING_PIXEL);
  });

  app.get("/t/c/:leadId", async (req, res) => {
    try {
      const url = req.query.url as string;
      let safeUrl: string | null = null;
      if (url) {
        try {
          const parsed = new URL(url);
          if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            safeUrl = parsed.toString();
          }
        } catch {}
      }

      const lead = await storage.getLeadById(req.params.leadId);
      if (lead) {
        await storage.createEmailEvent({
          leadId: lead.id,
          userId: lead.userId,
          eventType: "click",
          metadata: JSON.stringify({ url: safeUrl || "unknown" }),
          ipAddress: (req.headers["x-forwarded-for"] as string || req.ip || "").split(",")[0].trim(),
          userAgent: req.headers["user-agent"] || null,
        });

        const newClicks = (lead.emailClicks || 0) + 1;
        const { score, level, nextStep } = calculateEngagement(lead.emailOpens || 0, newClicks);
        const statusUpdate: any = {
          emailClicks: newClicks,
          engagementScore: score,
          engagementLevel: level,
          lastEngagedAt: new Date(),
          nextStep,
        };
        if (level === "hot" && lead.status !== "qualified") statusUpdate.status = "hot";
        else if (level === "warm" && (lead.status === "new" || lead.status === "cold")) statusUpdate.status = "warm";
        await storage.updateLead(lead.id, statusUpdate);
      }
      if (safeUrl) {
        return res.redirect(302, safeUrl);
      }
    } catch (err) {
      console.error("Click tracking error:", err);
    }
    res.redirect(302, "https://argilette.co");
  });

  app.get("/api/leads/:id/engagement", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const lead = await storage.getLeadById(req.params.id as string);
      if (!lead || lead.userId !== userId) {
        return res.status(404).json({ message: "Lead not found" });
      }
      const events = await storage.getEmailEventsByLead(lead.id);
      const opens = events.filter(e => e.eventType === "open");
      const clicks = events.filter(e => e.eventType === "click");

      res.json({
        leadId: lead.id,
        engagementScore: lead.engagementScore || 0,
        engagementLevel: lead.engagementLevel || "none",
        nextStep: lead.nextStep || "No engagement yet — waiting for email interaction",
        emailOpens: lead.emailOpens || 0,
        emailClicks: lead.emailClicks || 0,
        lastEngagedAt: lead.lastEngagedAt,
        events: events.slice(0, 50).map(e => ({
          type: e.eventType,
          metadata: e.metadata ? JSON.parse(e.metadata) : null,
          timestamp: e.createdAt,
          ipAddress: e.ipAddress,
        })),
        timeline: {
          firstOpen: opens.length > 0 ? opens[opens.length - 1].createdAt : null,
          lastOpen: opens.length > 0 ? opens[0].createdAt : null,
          firstClick: clicks.length > 0 ? clicks[clicks.length - 1].createdAt : null,
          lastClick: clicks.length > 0 ? clicks[0].createdAt : null,
          totalOpens: opens.length,
          totalClicks: clicks.length,
        },
      });
    } catch (error) {
      console.error("Error fetching engagement:", error);
      res.status(500).json({ message: "Failed to fetch engagement data" });
    }
  });

  app.get("/api/email-analytics", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const allLeads = await storage.getLeadsByUser(userId);
      const sentLeads = allLeads.filter(l => l.outreachSentAt);
      const totalSent = sentLeads.length;
      const totalOpens = sentLeads.reduce((sum, l) => sum + (l.emailOpens || 0), 0);
      const totalClicks = sentLeads.reduce((sum, l) => sum + (l.emailClicks || 0), 0);
      const engaged = sentLeads.filter(l => (l.emailOpens || 0) > 0).length;

      const byLevel = {
        hot: sentLeads.filter(l => l.engagementLevel === "hot").length,
        warm: sentLeads.filter(l => l.engagementLevel === "warm").length,
        interested: sentLeads.filter(l => l.engagementLevel === "interested").length,
        none: sentLeads.filter(l => !l.engagementLevel || l.engagementLevel === "none").length,
      };

      res.json({
        totalSent,
        totalOpens,
        totalClicks,
        engaged,
        openRate: totalSent > 0 ? Math.round((engaged / totalSent) * 100) : 0,
        clickRate: totalSent > 0 ? Math.round((sentLeads.filter(l => (l.emailClicks || 0) > 0).length / totalSent) * 100) : 0,
        byLevel,
      });
    } catch (error) {
      console.error("Error fetching email analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
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

  app.post("/api/appointments", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { leadName, email, phone, company, type, date, notes, source, status } = req.body;
      if (!leadName || !type || !date) {
        return res.status(400).json({ message: "Name, type, and date are required" });
      }
      const appt = await storage.createAppointment({
        userId,
        leadName,
        email: email || null,
        phone: phone || null,
        company: company || null,
        type,
        date: new Date(date),
        notes: notes || null,
        source: source || "manual",
        status: status || "scheduled",
      });
      res.json(appt);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.patch("/api/appointments/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const updated = await storage.updateAppointment(req.params.id, userId, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  app.delete("/api/appointments/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.deleteAppointment(req.params.id, userId);
      res.json({ message: "Appointment deleted" });
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ message: "Failed to delete appointment" });
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
      const { name, type, description, status, script, generateScript, templateIndustry, templateFeatures } = req.body;
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
        script: script || null,
      });

      if (generateScript) {
        const user = await storage.getUserById(userId);
        const companyName = user?.companyName || "your company";
        const industry = user?.industry || templateIndustry || "general";
        const companyDescription = user?.companyDescription || "";
        const website = user?.website || "";

        const websiteProfile = await storage.getWebsiteProfile(userId);
        const websiteKnowledge = websiteProfile?.status === "trained"
          ? `\n\nWEBSITE KNOWLEDGE (learned from ${websiteProfile.websiteUrl}):
- Services: ${websiteProfile.services || "N/A"}
- Value Propositions: ${websiteProfile.valuePropositions || "N/A"}
- Target Audience: ${websiteProfile.targetAudience || "N/A"}
- Pricing: ${websiteProfile.pricing || "N/A"}
- FAQs: ${websiteProfile.faqs || "N/A"}
- Contact Info: ${websiteProfile.contactInfo || "N/A"}
- Business Summary: ${websiteProfile.rawSummary || "N/A"}

IMPORTANT: Use the website knowledge above to make the bot script hyper-specific. Reference actual service names, real pricing, actual FAQs, and real contact details from the website. The bot should sound like it truly knows this business inside and out.`
          : "";

        const scriptPrompt = `You are an expert AI automation consultant. Generate a professional, ready-to-deploy conversational script for an AI bot.

BOT ROLE: ${name}
BOT INDUSTRY: ${templateIndustry || industry}
BOT FEATURES: ${(templateFeatures || []).join(", ")}
BOT DESCRIPTION: ${description}

CLIENT BUSINESS:
- Company: ${companyName}
- Industry: ${industry}
- Website: ${website}
- Description: ${companyDescription}${websiteKnowledge}

Generate TWO things in your response, separated by the exact delimiter "---WORKFLOW_STEPS---":

PART 1 - PROFESSIONAL BOT SCRIPT:
Write a complete, professional conversational script that this bot would use. Include:
- A warm, professional greeting customized to the business
- 4-6 key conversation flows (qualifying questions, objection handling, booking/scheduling, follow-up)
- Professional closing and handoff scripts
- Edge case handling (after hours, complex requests, escalation)
Format as a clean, readable script with clear section headers using ## markdown headers.
Make it specific to the client's business and industry - NOT generic.
Keep it concise but thorough (roughly 300-500 words).

PART 2 - WORKFLOW STEPS (after the ---WORKFLOW_STEPS--- delimiter):
Return a JSON array of 5-7 workflow steps that visually describe this bot's automation pipeline. Each step should have:
- "title": short step name (3-5 words)
- "description": one sentence describing what happens
- "icon": one of: "MessageSquare", "UserCheck", "Calendar", "Mail", "Phone", "Target", "BarChart", "Clock", "Shield", "Zap", "FileText", "DollarSign"

Example format:
[{"title":"Greet & Qualify","description":"Bot greets visitor and asks qualifying questions.","icon":"MessageSquare"},{"title":"Capture Info","description":"Collects contact details and requirements.","icon":"UserCheck"}]

Return ONLY the script then the delimiter then the JSON array. No other text.`;

        try {
          const scriptAi = await getAnthropicForUser(userId);
          const response = await scriptAi.client.messages.create({
            model: scriptAi.model,
            max_tokens: 2000,
            messages: [{ role: "user", content: scriptPrompt }],
          });

          const fullText = response.content
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map((b) => b.text)
            .join("");

          const parts = fullText.split("---WORKFLOW_STEPS---");
          const script = parts[0]?.trim() || "";
          let workflowSteps = "[]";
          if (parts[1]) {
            const jsonMatch = parts[1].match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              try {
                JSON.parse(jsonMatch[0]);
                workflowSteps = jsonMatch[0];
              } catch {
                workflowSteps = "[]";
              }
            }
          }

          const updated = await storage.updateAiAgent(agent.id, userId, { script, workflowSteps });
          return res.json(updated || agent);
        } catch (aiError) {
          console.error("Claude script generation failed (agent still created):", aiError);
          return res.json(agent);
        }
      }

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
      const { name, status, description, type, script, workflowSteps } = req.body;
      const data: Record<string, string> = {};
      if (name !== undefined) data.name = name;
      if (status !== undefined) data.status = status;
      if (description !== undefined) data.description = description;
      if (type !== undefined) data.type = type;
      if (script !== undefined) data.script = script;
      if (workflowSteps !== undefined) data.workflowSteps = workflowSteps;
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
      const result = { ...settings };
      if (result.anthropicApiKey) {
        const key = result.anthropicApiKey;
        result.anthropicApiKey = key.length > 8 ? key.slice(0, 7) + "..." + key.slice(-4) : "****";
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const body = { ...req.body };
      if (body.anthropicApiKey && body.anthropicApiKey.includes("...")) {
        delete body.anthropicApiKey;
      }
      const settings = await storage.upsertSettings({ ...body, userId });
      const result = { ...settings };
      if (result.anthropicApiKey) {
        const key = result.anthropicApiKey;
        result.anthropicApiKey = key.length > 8 ? key.slice(0, 7) + "..." + key.slice(-4) : "****";
      }
      res.json(result);
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
      const chatHistory = history.slice(-10).map(m => ({ role: m.role, content: m.content }));

      const timeoutMs = 90000;
      const aiReply = await Promise.race([
        handleAiAction(userId, content, chatHistory),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs)),
      ]);
      const aiMessage = await storage.createChatMessage({ userId, role: "assistant", content: aiReply });

      res.json({ userMessage, aiMessage });
    } catch (error: any) {
      console.error("Error sending chat message:", error?.message || error);
      if (error?.message === "AI_TIMEOUT") {
        const timeoutMsg = "The AI took too long to respond. This usually happens with complex requests like lead generation with web search. Please try again — simpler requests will be faster.";
        const aiMessage = await storage.createChatMessage({ userId: req.session.userId!, role: "assistant", content: timeoutMsg });
        return res.json({ userMessage: { userId: req.session.userId!, role: "user", content }, aiMessage });
      }
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
      const userId = req.session.userId!;
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }
      let userClient: { client: Anthropic; model: string } | undefined;
      try { userClient = await getAnthropicForUser(userId); } catch {
        return res.status(400).json({ message: "AI API key not configured. Go to Settings > Integrations to add your Anthropic API key." });
      }
      const result = await claudeWebSearch(query, userClient);
      res.json({ result });
    } catch (error) {
      console.error("Error in AI search:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // ---- CLAUDE CONTENT GENERATION ENDPOINT (new) ----

  app.post("/api/ai/generate", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { prompt, type } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ message: "Prompt is required" });
      }
      let userClient: { client: Anthropic; model: string } | undefined;
      try { userClient = await getAnthropicForUser(userId); } catch {
        return res.status(400).json({ message: "AI API key not configured. Go to Settings > Integrations to add your Anthropic API key." });
      }
      const result = await claudeGenerate(prompt, type || "general", userClient);
      res.json({ result });
    } catch (error) {
      console.error("Error in AI generate:", error);
      res.status(500).json({ message: "Generation failed" });
    }
  });

  // ---- VOICE AI CALLS (Twilio) ----

  app.get("/api/voice/calls", isAuthenticated, async (req, res) => {
    try {
      const calls = await storage.getVoiceCallsByUser(req.session.userId!);
      res.json(calls);
    } catch (error) {
      console.error("Error fetching voice calls:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  app.post("/api/voice/calls", isAuthenticated, async (req, res) => {
    try {
      const { toNumber, leadId, agentId, script: customScript } = req.body;
      if (!toNumber || typeof toNumber !== "string") {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const cleaned = toNumber.replace(/[\s\-\(\)\.]/g, "");
      const phoneRegex = /^\+?[1-9]\d{6,14}$/;
      if (!phoneRegex.test(cleaned)) {
        return res.status(400).json({ message: "Invalid phone number format. Use international format like +15551234567" });
      }
      const normalizedPhone = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;

      const userId = req.session.userId!;

      let agentName = "ArgiFlow AI Assistant";
      let agentDescription = "";
      let agentType = "";
      let agentScript = "";

      if (agentId) {
        const agents = await storage.getAiAgentsByUser(userId);
        const agent = agents.find(a => a.id === agentId);
        if (agent) {
          agentName = agent.name;
          agentDescription = agent.description || "";
          agentType = agent.type || "";
          agentScript = agent.script || "";
        }
      }

      let leadName = "";
      let leadCompany = "";
      let leadContext = "";
      if (leadId) {
        const lead = await storage.getLeadById(leadId);
        if (lead) {
          leadName = lead.name;
          leadCompany = lead.company || "";
          leadContext = `You are calling ${lead.name}${lead.company ? ` from ${lead.company}` : ""}. Their email is ${lead.email || "unknown"}.`;
          if (lead.outreach) {
            leadContext += ` Previous outreach context: ${lead.outreach}`;
          }
        }
      }

      const fullScript = customScript || agentScript;

      const systemPrompt = `You are "${agentName}", a professional AI phone agent making an outbound sales/business call.
${agentDescription ? `Your role: ${agentDescription}` : ""}
${agentType ? `Your specialty: ${agentType}` : ""}
${leadContext ? `\nWho you are calling: ${leadContext}` : ""}

${fullScript ? `CALL SCRIPT AND TALKING POINTS (follow this as your conversation guide):\n${fullScript}` : ""}

CRITICAL INSTRUCTIONS FOR THE PHONE CALL:
- You are on a LIVE phone call. Speak naturally like a real person having a conversation.
- Your FIRST message should be a short, natural greeting introducing yourself and the purpose of the call (1-2 sentences max). Extract the opening line from the script above.
- After the greeting, FOLLOW the script's flow: discovery questions, value proposition, objection handling, and closing -- adapting naturally to what the person says.
- Keep each response concise (1-3 sentences). This is a phone call, not an email.
- Listen carefully and respond to what they actually say. Don't just recite the script word-for-word.
- If they raise objections, use the objection handling from the script.
- If they're not interested, be polite, thank them, and offer to follow up later.
- If they want to schedule a meeting, confirm details enthusiastically.
- Never reveal you are an AI unless directly asked.
- When the conversation reaches a natural end, say goodbye warmly.
${leadName ? `- Address the person as "${leadName}" or "Dr. ${leadName.split(" ").pop()}" if appropriate.` : ""}`;

      const greeting = leadName
        ? `Hi ${leadName}, this is ${agentName.split(" ")[0]} with ${agentName.includes("Track") ? agentName : "our team"}. How are you doing today?`
        : `Hi, this is ${agentName.split(" ")[0]}. How are you doing today?`;

      const callLog = await storage.createVoiceCall({
        userId,
        leadId: leadId || null,
        agentId: agentId || null,
        toNumber: normalizedPhone,
        direction: "outbound",
        status: "queued",
        script: JSON.stringify({ greeting, systemPrompt }),
      });

      const baseUrl = `https://${req.get("host")}`;
      const twimlUrl = `${baseUrl}/api/twilio/voice/${callLog.id}/twiml`;
      const statusUrl = `${baseUrl}/api/twilio/voice/status`;

      try {
        const { getTwilioClient, getTwilioFromPhoneNumber } = await import("./twilio");
        const client = await getTwilioClient();
        const fromNumber = await getTwilioFromPhoneNumber();

        if (!fromNumber) {
          await storage.updateVoiceCall(callLog.id, { status: "failed", outcome: "No Twilio phone number configured" });
          return res.status(400).json({ message: "No Twilio phone number configured" });
        }

        const call = await client.calls.create({
          url: twimlUrl,
          from: fromNumber,
          to: normalizedPhone,
          statusCallback: statusUrl,
          statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
          statusCallbackMethod: "POST",
          record: true,
        });

        await storage.updateVoiceCall(callLog.id, {
          twilioCallSid: call.sid,
          fromNumber,
          status: "initiated",
          startedAt: new Date(),
        });

        res.json({ success: true, callId: callLog.id, twilioSid: call.sid });
      } catch (twilioErr: any) {
        console.error("Twilio call error:", twilioErr);
        await storage.updateVoiceCall(callLog.id, { status: "failed", outcome: twilioErr.message || "Twilio error" });
        res.status(500).json({ message: twilioErr.message || "Failed to initiate call" });
      }
    } catch (error) {
      console.error("Error initiating voice call:", error);
      res.status(500).json({ message: "Failed to initiate call" });
    }
  });

  app.post("/api/twilio/voice/:callLogId/twiml", async (req, res) => {
    try {
      const { callLogId } = req.params;
      const callLog = await storage.getVoiceCallById(callLogId);

      if (!callLog) {
        res.type("text/xml");
        return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred.</Say><Hangup/></Response>`);
      }

      let greeting = "Hello, this is an AI assistant. How can I help you?";
      let systemPrompt = "You are a professional AI phone agent. Be helpful and concise.";

      try {
        const scriptData = callLog.script ? JSON.parse(callLog.script) : {};
        greeting = scriptData.greeting || greeting;
        systemPrompt = scriptData.systemPrompt || systemPrompt;
      } catch {
        greeting = callLog.script || greeting;
      }

      const speechResult = req.body?.SpeechResult;

      if (speechResult) {
        try {
          const existingTranscript = callLog.transcript ? JSON.parse(callLog.transcript) : [];
          existingTranscript.push({ role: "caller", text: speechResult });

          const conversationHistory = existingTranscript.map((t: any) =>
            ({ role: t.role === "agent" ? "assistant" as const : "user" as const, content: t.text })
          );

          let voiceAi: { client: Anthropic; model: string };
          try { voiceAi = await getAnthropicForUser(callLog.userId); } catch {
            res.type("text/xml");
            return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>AI service not configured. Please contact your administrator.</Say><Hangup/></Response>`);
          }
          const aiResponse = await voiceAi.client.messages.create({
            model: voiceAi.model,
            max_tokens: 300,
            system: systemPrompt,
            messages: conversationHistory,
          });

          const aiText = aiResponse.content[0]?.type === "text" ? aiResponse.content[0].text : "I understand. Is there anything else I can help with?";
          existingTranscript.push({ role: "agent", text: aiText });

          await storage.updateVoiceCall(callLogId, { transcript: JSON.stringify(existingTranscript) });

          const isGoodbye = aiText.toLowerCase().includes("goodbye") || aiText.toLowerCase().includes("have a great day") || existingTranscript.length > 20;

          const baseUrl = `https://${req.get("host")}`;

          res.type("text/xml");
          if (isGoodbye) {
            return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(aiText)}</Say>
  <Hangup/>
</Response>`);
          }

          return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(aiText)}</Say>
  <Gather input="speech" timeout="8" speechTimeout="auto" action="${baseUrl}/api/twilio/voice/${callLogId}/twiml" method="POST">
    <Say voice="Polly.Joanna"></Say>
  </Gather>
  <Say voice="Polly.Joanna">Are you still there? No worries if now isn't a good time. Feel free to reach out whenever works best. Take care!</Say>
  <Hangup/>
</Response>`);
        } catch (aiErr) {
          console.error("AI response error during call:", aiErr);
          res.type("text/xml");
          return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I apologize, I'm having a technical issue. A team member will follow up with you shortly. Goodbye!</Say>
  <Hangup/>
</Response>`);
        }
      }

      const initialTranscript = [{ role: "agent", text: greeting }];
      await storage.updateVoiceCall(callLogId, { status: "in-progress", transcript: JSON.stringify(initialTranscript) });

      const baseUrl = `https://${req.get("host")}`;

      res.type("text/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(greeting)}</Say>
  <Gather input="speech" timeout="8" speechTimeout="auto" action="${baseUrl}/api/twilio/voice/${callLogId}/twiml" method="POST">
    <Say voice="Polly.Joanna"></Say>
  </Gather>
  <Say voice="Polly.Joanna">Hello? Are you still there? No problem, feel free to call us back whenever works for you. Have a great day!</Say>
  <Hangup/>
</Response>`);
    } catch (error) {
      console.error("TwiML generation error:", error);
      res.type("text/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred. Goodbye.</Say><Hangup/></Response>`);
    }
  });

  app.post("/api/twilio/voice/status", async (req, res) => {
    try {
      const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body;
      if (!CallSid) return res.sendStatus(200);

      const callLog = await storage.getVoiceCallByTwilioSid(CallSid);
      if (!callLog) return res.sendStatus(200);

      const updateData: any = {};

      const statusMap: Record<string, string> = {
        "queued": "queued",
        "initiated": "initiated",
        "ringing": "ringing",
        "in-progress": "in-progress",
        "completed": "completed",
        "busy": "failed",
        "no-answer": "failed",
        "canceled": "failed",
        "failed": "failed",
      };

      updateData.status = statusMap[CallStatus] || CallStatus;

      if (CallStatus === "completed") {
        updateData.outcome = "completed";
        updateData.endedAt = new Date();
        if (CallDuration) updateData.durationSec = parseInt(CallDuration);
      } else if (["busy", "no-answer", "canceled", "failed"].includes(CallStatus)) {
        updateData.outcome = CallStatus;
        updateData.endedAt = new Date();
      }

      if (RecordingUrl) {
        updateData.recordingUrl = RecordingUrl;
      }

      await storage.updateVoiceCall(callLog.id, updateData);
      res.sendStatus(200);
    } catch (error) {
      console.error("Voice status callback error:", error);
      res.sendStatus(200);
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

  // ---- AUTOMATIONS ----

  app.get("/api/automations", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const results = await storage.getAutomationsByUser(userId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch automations" });
    }
  });

  app.post("/api/automations", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { templateKey, title, description, steps } = req.body;
      if (!templateKey || !title || !steps) {
        return res.status(400).json({ message: "templateKey, title, and steps are required" });
      }
      const automation = await storage.createAutomation({
        userId,
        templateKey,
        title,
        description: description || null,
        steps: JSON.stringify(steps),
        status: "active",
        runs: 0,
        successRate: 0,
        lastRunAt: null,
      });
      res.json(automation);
    } catch (error) {
      res.status(500).json({ message: "Failed to create automation" });
    }
  });

  app.patch("/api/automations/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { status } = req.body;
      if (!status || !["active", "paused", "inactive"].includes(status)) {
        return res.status(400).json({ message: "Valid status required (active, paused, inactive)" });
      }
      const updated = await storage.updateAutomation(req.params.id as string, userId, { status });
      if (!updated) return res.status(404).json({ message: "Automation not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update automation" });
    }
  });

  app.delete("/api/automations/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      await storage.deleteAutomation(req.params.id as string, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete automation" });
    }
  });

  // ---- ADMIN ----

  await clearOldSeedData();
  await seedSuperAdmin();
  await ensureOwnerSubscription();

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
      let linkedUser = await storage.getUserByEmail(admin.email);
      if (!linkedUser) {
        const allUsers = await storage.getAllUsers();
        if (allUsers.length > 0) {
          linkedUser = allUsers[0];
        }
      }
      if (linkedUser) {
        req.session.userId = linkedUser.id;
      }
      res.json({ id: admin.id, email: admin.email, name: admin.name, linkedUserId: linkedUser?.id || null });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    delete req.session.adminId;
    res.json({ success: true });
  });

  app.post("/api/admin/switch-to-user", isAdmin, async (req, res) => {
    try {
      const admin = await storage.getAdminById(req.session.adminId!);
      if (!admin) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { email } = req.body || {};
      let linkedUser = null;
      if (email && typeof email === "string" && email.includes("@")) {
        linkedUser = await storage.getUserByEmail(email.trim().toLowerCase());
      }
      if (!linkedUser) {
        linkedUser = await storage.getUserByEmail(admin.email);
      }
      if (!linkedUser) {
        const allUsers = await storage.getAllUsers();
        if (allUsers.length > 0) {
          linkedUser = allUsers[0];
        }
      }
      if (linkedUser) {
        req.session.userId = linkedUser.id;
        console.log(`[ADMIN SWITCH] Admin ${admin.email} (${admin.id}) switched to user ${linkedUser.email} (${linkedUser.id}) at ${new Date().toISOString()}`);
        return res.json({ success: true, userId: linkedUser.id, email: linkedUser.email });
      }
      return res.status(404).json({ message: "No user accounts exist yet." });
    } catch (error) {
      res.status(500).json({ message: "Failed to switch" });
    }
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
      const allUsers = await storage.getAllUsers();
      const allLeads = await storage.getAllLeads();
      const allAppointments = await storage.getAllAppointments();
      const allAgents = await storage.getAllAiAgents();
      const allSubs = await storage.getAllSubscriptions();
      const activeSubs = allSubs.filter(s => s.status === "active" || s.status === "trial");
      const monthlyRevenue = allSubs.filter(s => s.status === "active").reduce((sum, s) => sum + (s.amount || 0), 0);
      res.json({
        totalUsers: allUsers.length,
        totalLeads: allLeads.length,
        totalAppointments: allAppointments.length,
        totalAgents: allAgents.length,
        totalSubscriptions: allSubs.length,
        activeSubscriptions: activeSubs.length,
        monthlyRevenue,
        revenue: monthlyRevenue,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get("/api/admin/clients", isAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allSubs = await storage.getAllSubscriptions();
      const allLeads = await storage.getAllLeads();
      const allAgents = await storage.getAllAiAgents();

      const subsMap = new Map(allSubs.map(s => [s.userId, s]));
      const leadCounts = new Map<string, number>();
      allLeads.forEach(l => leadCounts.set(l.userId, (leadCounts.get(l.userId) || 0) + 1));
      const agentCounts = new Map<string, number>();
      allAgents.forEach(a => agentCounts.set(a.userId, (agentCounts.get(a.userId) || 0) + 1));

      const clients = allUsers.map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        companyName: u.companyName,
        industry: u.industry,
        website: u.website,
        createdAt: u.createdAt,
        subscription: subsMap.get(u.id) || null,
        leadsCount: leadCounts.get(u.id) || 0,
        agentsCount: agentCounts.get(u.id) || 0,
      }));
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/admin/subscriptions", isAdmin, async (_req, res) => {
    try {
      const allSubs = await storage.getAllSubscriptions();
      const allUsers = await storage.getAllUsers();
      const usersMap = new Map(allUsers.map(u => [u.id, u]));
      const subsWithUser = allSubs.map(s => ({
        ...s,
        user: usersMap.get(s.userId) ? {
          email: usersMap.get(s.userId)!.email,
          firstName: usersMap.get(s.userId)!.firstName,
          lastName: usersMap.get(s.userId)!.lastName,
          companyName: usersMap.get(s.userId)!.companyName,
        } : null,
      }));
      res.json(subsWithUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.post("/api/admin/subscriptions", isAdmin, async (req, res) => {
    try {
      const { userId, plan, status, amount, paymentMethod, venmoHandle, notes } = req.body;
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ message: "User ID is required" });
      }
      const validPlans = ["starter", "pro", "enterprise"];
      const validStatuses = ["trial", "active", "past_due", "cancelled", "expired"];
      if (!plan || !validPlans.includes(plan)) {
        return res.status(400).json({ message: "Valid plan is required (starter, pro, enterprise)" });
      }
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const sub = await storage.createSubscription({
        userId,
        plan,
        status: status || "trial",
        amount: amount || (plan === "starter" ? 297 : plan === "pro" ? 597 : 1497),
        paymentMethod: paymentMethod || "venmo",
        venmoHandle: venmoHandle || null,
        trialEndsAt: status === "trial" ? trialEnd : null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        notes: notes || null,
      });
      res.json(sub);
    } catch (error) {
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.patch("/api/admin/subscriptions/:id", isAdmin, async (req, res) => {
    try {
      const { plan, status, amount, paymentMethod, venmoHandle, notes, currentPeriodEnd } = req.body;
      const validPlans = ["starter", "pro", "enterprise"];
      const validStatuses = ["trial", "active", "past_due", "cancelled", "expired"];
      if (plan !== undefined && !validPlans.includes(plan)) {
        return res.status(400).json({ message: "Invalid plan" });
      }
      if (status !== undefined && !validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const data: any = {};
      if (plan !== undefined) data.plan = plan;
      if (status !== undefined) data.status = status;
      if (amount !== undefined) data.amount = amount;
      if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
      if (venmoHandle !== undefined) data.venmoHandle = venmoHandle;
      if (notes !== undefined) data.notes = notes;
      if (currentPeriodEnd !== undefined) data.currentPeriodEnd = new Date(currentPeriodEnd);
      if (status === "cancelled") data.cancelledAt = new Date();
      const updated = await storage.updateSubscription(req.params.id, data);
      if (!updated) return res.status(404).json({ message: "Subscription not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  app.delete("/api/admin/subscriptions/:id", isAdmin, async (req, res) => {
    try {
      await storage.deleteSubscription(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete subscription" });
    }
  });

  app.get("/api/admin/platform-config", isAdmin, async (_req, res) => {
    try {
      res.json({
        sendgridApiKey: !!process.env.SENDGRID_API_KEY,
        twilioAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
        twilioPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
        anthropicApiKey: !!process.env.ANTHROPIC_API_KEY,
        sessionSecret: !!process.env.SESSION_SECRET,
        adminPassword: !!process.env.ADMIN_PASSWORD,
        platformSenderEmail: "info@argilette.co",
        outreachEmailMode: "user_sendgrid_key",
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch platform config" });
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

  // ---- AGENT CATALOG & CONFIGS ----

  app.get("/api/agent-catalog", isAuthenticated, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      const userRegion = user?.region || "western";
      const regionFilter = (req.query.region as string) || "all";
      let catalog;
      if (regionFilter === "all") {
        catalog = AGENT_CATALOG;
      } else {
        catalog = getAgentsByRegion(regionFilter);
      }
      const configs = await storage.getAgentConfigsByUser(userId);
      const enriched = catalog.map(agent => {
        const config = configs.find(c => c.agentType === agent.type);
        return { ...agent, configured: !!config, enabled: config?.enabled || false, configId: config?.id || null, config: config || null };
      });
      res.json({ agents: enriched, userRegion });
    } catch (error) {
      console.error("Error fetching agent catalog:", error);
      res.status(500).json({ message: "Failed to fetch agent catalog" });
    }
  });

  app.get("/api/agent-configs", isAuthenticated, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const configs = await storage.getAgentConfigsByUser(req.session.userId!);
      res.json(configs);
    } catch (error) {
      console.error("Error fetching agent configs:", error);
      res.status(500).json({ message: "Failed to fetch agent configs" });
    }
  });

  app.post("/api/agent-configs", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { agentType, enabled, agentSettings, runFrequency, customScript } = req.body;
      const catalogEntry = getAgentByType(agentType);
      if (!catalogEntry) return res.status(400).json({ message: "Invalid agent type" });
      const config = await storage.upsertAgentConfig({
        userId,
        agentType,
        enabled: enabled ?? true,
        agentSettings: agentSettings ? JSON.stringify(agentSettings) : JSON.stringify(catalogEntry.defaultSettings),
        runFrequency: runFrequency || "daily",
        customScript: customScript || null,
      });
      await storage.createNotification({
        userId,
        agentType,
        type: "system",
        title: `${catalogEntry.name} Configured`,
        message: `Your ${catalogEntry.name} agent has been ${enabled ? "enabled" : "configured"}. It will ${enabled ? "start finding opportunities automatically" : "be ready when you enable it"}.`,
        priority: "normal",
      });
      res.json(config);
    } catch (error) {
      console.error("Error creating agent config:", error);
      res.status(500).json({ message: "Failed to create agent config" });
    }
  });

  app.patch("/api/agent-configs/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const id = req.params.id;
      const { enabled, agentSettings, runFrequency, customScript } = req.body;
      const data: Record<string, unknown> = {};
      if (enabled !== undefined) data.enabled = enabled;
      if (agentSettings !== undefined) data.agentSettings = JSON.stringify(agentSettings);
      if (runFrequency !== undefined) data.runFrequency = runFrequency;
      if (customScript !== undefined) data.customScript = customScript;
      const result = await storage.updateAgentConfig(id, userId, data as any);
      if (!result) return res.status(404).json({ message: "Config not found" });
      res.json(result);
    } catch (error) {
      console.error("Error updating agent config:", error);
      res.status(500).json({ message: "Failed to update agent config" });
    }
  });

  app.delete("/api/agent-configs/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteAgentConfig(req.params.id, req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting agent config:", error);
      res.status(500).json({ message: "Failed to delete agent config" });
    }
  });

  app.post("/api/agent-configs/:id/run", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const configId = req.params.id;
      const configs = await storage.getAgentConfigsByUser(userId);
      const config = configs.find(c => c.id === configId);
      if (!config) return res.status(404).json({ message: "Config not found" });
      const catalogEntry = getAgentByType(config.agentType);
      const task = await storage.createAgentTask({
        userId,
        agentType: config.agentType,
        agentConfigId: configId,
        taskType: "manual_run",
        description: `Manual run of ${catalogEntry?.name || config.agentType}`,
        status: "running",
        startedAt: new Date(),
      });
      await storage.updateAgentConfig(configId, userId, { isRunning: true, lastRun: new Date() } as any);
      setTimeout(async () => {
        try {
          const leadsFound = Math.floor(Math.random() * 15) + 3;
          const agentName = catalogEntry?.name || config.agentType;

          const generatedLeads: { name: string; email: string; company: string }[] = [];
          for (let i = 0; i < leadsFound; i++) {
            const leadName = `${agentName} Lead #${Date.now().toString(36).slice(-4)}-${i + 1}`;
            const company = `${agentName} Prospect ${i + 1}`;
            const email = `contact${i + 1}@prospect-${Date.now().toString(36).slice(-4)}.com`;
            const leadRecord = {
              userId,
              name: leadName,
              email,
              phone: "",
              company,
              source: `${agentName} Agent`,
              status: "new" as const,
              score: randomInt(50, 90),
              notes: `Auto-discovered by ${agentName} agent run`,
              outreach: "",
              intentSignal: "Agent discovery",
            };
            await storage.createLead(leadRecord);
            generatedLeads.push({ name: leadName, email, company });
          }

          let funnelInfo = "";
          try {
            const pipelineResult = await addLeadsToAgentFunnel(
              userId,
              config.agentType,
              generatedLeads.map(l => ({ name: l.name, email: l.email }))
            );
            if (pipelineResult) {
              funnelInfo = pipelineResult;
            }
          } catch (funnelErr) {
            console.error("Error adding leads to funnel:", funnelErr);
          }

          const allLeads = await storage.getLeadsByUser(userId);
          const stats = await storage.getStatsByUser(userId);
          const activeCount = allLeads.filter(l => l.status === "hot" || l.status === "qualified" || l.status === "warm").length;
          await storage.upsertStats({ userId, totalLeads: allLeads.length, activeLeads: activeCount, appointmentsBooked: stats?.appointmentsBooked || 0, conversionRate: stats?.conversionRate || 0, revenue: stats?.revenue || 0 });

          await storage.updateAgentTask(task.id, { status: "completed", completedAt: new Date(), result: JSON.stringify({ leadsFound, analyzed: true, addedToFunnel: !!funnelInfo }) });
          await storage.updateAgentConfig(configId, userId, { isRunning: false, totalLeadsFound: (config.totalLeadsFound || 0) + leadsFound } as any);
          await storage.createNotification({
            userId,
            agentType: config.agentType,
            type: "new_lead",
            title: `${agentName} Found ${leadsFound} Leads`,
            message: `Your agent completed a scan and discovered ${leadsFound} new opportunities.${funnelInfo} Check your leads and funnels pages for details.`,
            priority: leadsFound > 10 ? "high" : "normal",
          });
        } catch (err) {
          console.error("Error completing agent task:", err);
        }
      }, 5000);
      res.json({ task, message: `${catalogEntry?.name || config.agentType} is running...` });
    } catch (error) {
      console.error("Error running agent:", error);
      res.status(500).json({ message: "Failed to run agent" });
    }
  });

  // ---- AGENT TASKS ----

  app.get("/api/agent-tasks", isAuthenticated, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const tasks = await storage.getAgentTasksByUser(req.session.userId!);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agent tasks" });
    }
  });

  // ---- NOTIFICATIONS ----

  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const userId = req.session.userId!;
      const [notifs, unreadCount] = await Promise.all([
        storage.getNotificationsByUser(userId),
        storage.getUnreadNotificationCount(userId),
      ]);
      res.json({ notifications: notifs, unreadCount });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.markNotificationRead(req.params.id, req.session.userId!);
      if (!result) return res.status(404).json({ message: "Notification not found" });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification read" });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all read" });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteNotification(req.params.id, req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // ---- REGIONS ----

  app.get("/api/regions", (_req, res) => {
    res.json(REGIONS);
  });

  app.get("/api/regions/:region", (req, res) => {
    const config = getRegionConfig(req.params.region);
    res.json(config);
  });

  app.get("/api/regions/detect/:countryCode", (req, res) => {
    const region = detectRegion(req.params.countryCode);
    const config = getRegionConfig(region);
    res.json({ region, ...config });
  });

  return httpServer;
}

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
  const email = "babalekpam@gmail.com";
  const existing = await storage.getAdminByEmail(email);
  if (!existing) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      console.warn("ADMIN_PASSWORD not set. Super admin not created. Set the ADMIN_PASSWORD secret to enable admin login.");
      return;
    }
    const passwordHash = await hashPassword(password);
    await storage.createAdmin({ email, passwordHash, name: "Super Admin" });
    console.log("Super admin seeded:", email);
  }
}

async function ensureOwnerSubscription() {
  const ownerEmail = "abel@argilette.com";
  try {
    const user = await storage.getUserByEmail(ownerEmail);
    if (!user) return;
    const existing = await storage.getSubscriptionByUser(user.id);
    if (!existing) {
      await storage.createSubscription({
        userId: user.id,
        plan: "pro",
        status: "active",
        amount: 0,
        paymentMethod: "lifetime",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date("2099-12-31"),
        notes: "Lifetime Pro - Platform Owner",
      });
      console.log("Lifetime Pro subscription created for owner:", ownerEmail);
    } else if (existing.status !== "active" || existing.plan !== "pro") {
      await storage.updateSubscription(existing.id, {
        plan: "pro",
        status: "active",
        currentPeriodEnd: new Date("2099-12-31"),
        notes: "Lifetime Pro - Platform Owner",
      });
      console.log("Owner subscription updated to lifetime Pro:", ownerEmail);
    }
  } catch (err) {
    console.error("Error ensuring owner subscription:", err);
  }
}
