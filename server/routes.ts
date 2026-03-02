import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, and, sql, desc } from "drizzle-orm";
import { users, leads, appointments, aiAgents, dashboardStats, aiChatMessages, autoLeadGenRuns, platformPromotionRuns, funnelDeals, funnels, emailLogs } from "@shared/schema";
import { getSession } from "./replit_integrations/auth/replitAuth";
import { registerSchema, loginSchema, insertLeadSchema, insertBusinessSchema, onboardingSchema, marketingStrategies } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import { AGENT_CATALOG, getAgentsByRegion, getAgentByType } from "./agent-catalog";
import { REGIONS, detectRegion, getRegionConfig } from "./region-config";
import { registerWorkflowRoutes } from "./workflow-routes";
import { startWorkflowEngine } from "./workflow-engine";
import { workflowHooks } from "./workflow-hooks";
import { discoverTaxLiens, STATE_DATA, STATE_NAMES, type TaxLienSettings } from "./agents/tax-lien-agent";
import instantlyRoutes, { handlePixelTrack } from "./instantly-routes";
import intelligenceRoutes from "./intelligence-routes";
import outreachAgentRoutes from "./outreach-agent-routes";
import { intelligenceEngine } from "./intelligence-engine";
import { registerFreeScraperRoutes } from "./free-scraper-routes";
import { searchDDG, searchBing } from "./free-scraper";
import { registerStripeRoutes } from "./stripe-routes";
import { registerSequenceRoutes } from "./sequences-routes";
import { registerLinkedinRoutes } from "./linkedin-routes";
import { registerIntentRoutes } from "./intent-routes";
import { registerTeamRoutes } from "./team-routes";
import { registerAnalyticsRoutes } from "./analytics-routes";
import { registerCrmRoutes } from "./crm-routes";
import { registerWebhookRoutes } from "./webhook-routes";
import { registerAgencyRoutes } from "./agency-routes";
import { registerGhlRoutes } from "./ghl-routes";
import { startSequenceAutomationEngine, stopSequencesForLead, stopSequencesForDeal, autoEnrollLeadInSequence, getAutomationStatus, processSequenceAutomation } from "./sequence-automation";

let tavilyRateLimitedUntil = 0;

function normalizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return "";
  if (digits.length === 11 && digits.startsWith('1')) {
    const area = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const line = digits.slice(7, 11);
    return `+1 (${area}) ${prefix}-${line}`;
  }
  if (digits.length === 10) {
    const area = digits.slice(0, 3);
    const prefix = digits.slice(3, 6);
    const line = digits.slice(6, 10);
    return `+1 (${area}) ${prefix}-${line}`;
  }
  if (digits.length > 11) {
    const cc = digits.slice(0, digits.length - 10);
    const rest = digits.slice(digits.length - 10);
    return `+${cc} (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
  }
  return phone;
}

async function logEmail(data: { userId: string; leadId?: string; recipientEmail: string; recipientName?: string; subject?: string; provider: string; source: string; status: string; errorMessage?: string }) {
  try {
    await db.insert(emailLogs).values({
      userId: data.userId,
      leadId: data.leadId || null,
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName || null,
      subject: data.subject || null,
      provider: data.provider,
      source: data.source,
      status: data.status,
      errorMessage: data.errorMessage || null,
      sentAt: data.status === "sent" ? new Date() : null,
    });
  } catch (err: any) {
    console.error("[EmailLog] Failed to log email:", err.message);
  }
}

async function sendSystemEmail(to: string, from: { email: string; name: string }, subject: string, html: string, userId?: string) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USERNAME;
  const smtpPass = process.env.SMTP_PASSWORD;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const sgKey = process.env.SENDGRID_API_KEY;

  const logUserId = userId || "system";
  try {
    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      await transporter.sendMail({
        from: `"${from.name}" <${from.email}>`,
        to,
        subject,
        html,
      });
      console.log(`[SystemEmail] Sent via SMTP to ${to}`);
      await logEmail({ userId: logUserId, recipientEmail: to, subject, provider: "smtp", source: "system", status: "sent" });
    } else if (sgKey) {
      sgMail.setApiKey(sgKey);
      await sgMail.send({ to, from, subject, html });
      console.log(`[SystemEmail] Sent via SendGrid to ${to}`);
      await logEmail({ userId: logUserId, recipientEmail: to, subject, provider: "sendgrid", source: "system", status: "sent" });
    } else {
      console.warn("No email provider configured (neither SMTP env vars nor SENDGRID_API_KEY). Cannot send system email.");
      await logEmail({ userId: logUserId, recipientEmail: to, subject, provider: "none", source: "system", status: "failed", errorMessage: "No email provider configured" });
    }
  } catch (err: any) {
    const errorMsg = err?.response?.body?.errors?.[0]?.message || err?.message || "Failed to send system email";
    console.error(`[SystemEmail] Send error to ${to}:`, errorMsg);
    await logEmail({ userId: logUserId, recipientEmail: to, subject, provider: smtpHost ? "smtp" : "sendgrid", source: "system", status: "failed", errorMessage: errorMsg });
  }
}


// ============================================================
// AI PROVIDER CONFIGURATION
// OpenAI GPT-4o-mini is the PRIMARY provider for all AI features.
// Users can optionally override with their own Anthropic key in Settings.
// Anthropic platform key available as fallback for web search only.
// ============================================================

const isValidAnthropicKey = (key?: string) => key && key.startsWith("sk-ant-");

const anthropicConfig: { apiKey: string; baseURL: string } = (() => {
  if (isValidAnthropicKey(process.env.ANTHROPIC_API_KEY)) {
    console.log("[AI] Anthropic API key available (fallback/web search)");
    return {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      baseURL: "https://api.anthropic.com",
    };
  }
  return { apiKey: "", baseURL: "https://api.anthropic.com" };
})();

const anthropic = new Anthropic({ apiKey: anthropicConfig.apiKey, baseURL: anthropicConfig.baseURL });
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

const OPENAI_MODEL = "gpt-4o-mini";

class OpenAIAnthropicWrapper {
  private openai: OpenAI;
  private defaultModel: string;
  private _quotaExhausted = false;

  get quotaExhausted() { return this._quotaExhausted; }

  constructor(apiKey: string, model: string = OPENAI_MODEL) {
    this.openai = new OpenAI({ apiKey });
    this.defaultModel = model;
  }

  messages = {
    create: async (params: any): Promise<any> => {
      const { max_tokens, system, messages, tools } = params;

      const openaiMessages: any[] = [];
      if (system) {
        openaiMessages.push({ role: "system", content: typeof system === "string" ? system : JSON.stringify(system) });
      }

      for (const msg of messages) {
        if (msg.role === "assistant") {
          if (Array.isArray(msg.content)) {
            const textParts = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
            const toolCalls = msg.content.filter((b: any) => b.type === "tool_use").map((b: any) => ({
              id: b.id,
              type: "function" as const,
              function: { name: b.name, arguments: JSON.stringify(b.input || {}) }
            }));
            openaiMessages.push({
              role: "assistant",
              content: textParts || null,
              ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {})
            });
          } else {
            openaiMessages.push({ role: "assistant", content: msg.content });
          }
        } else if (msg.role === "user") {
          if (Array.isArray(msg.content)) {
            const toolResults = msg.content.filter((b: any) => b.type === "tool_result");
            if (toolResults.length > 0) {
              for (const tr of toolResults) {
                openaiMessages.push({
                  role: "tool",
                  tool_call_id: tr.tool_use_id,
                  content: typeof tr.content === "string" ? tr.content : JSON.stringify(tr.content),
                });
              }
            } else {
              const textContent = msg.content.map((b: any) => {
                if (typeof b === "string") return b;
                if (b.type === "text") return b.text;
                return JSON.stringify(b);
              }).join("\n");
              openaiMessages.push({ role: "user", content: textContent });
            }
          } else {
            openaiMessages.push({ role: "user", content: msg.content });
          }
        }
      }

      let openaiTools: any[] | undefined;
      if (tools && tools.length > 0) {
        openaiTools = tools
          .filter((t: any) => t.type !== "web_search_20250305")
          .map((t: any) => ({
            type: "function",
            function: {
              name: t.name,
              description: t.description || "",
              parameters: t.input_schema || { type: "object", properties: {} },
            }
          }));
        if (openaiTools.length === 0) openaiTools = undefined;
      }

      try {
        const openaiResponse = await this.openai.chat.completions.create({
          model: this.defaultModel,
          max_tokens: max_tokens || 4096,
          messages: openaiMessages,
          ...(openaiTools ? { tools: openaiTools } : {}),
        });

        const choice = openaiResponse.choices[0];
        const content: any[] = [];

        if (choice?.message?.content) {
          content.push({ type: "text", text: choice.message.content });
        }

        if (choice?.message?.tool_calls) {
          for (const tc of choice.message.tool_calls) {
            const fn = (tc as any).function;
            content.push({
              type: "tool_use",
              id: tc.id,
              name: fn.name,
              input: JSON.parse(fn.arguments || "{}"),
            });
          }
        }

        return {
          content: content.length > 0 ? content : [{ type: "text", text: "" }],
          stop_reason: choice?.finish_reason === "tool_calls" ? "tool_use" : "end_turn",
          model: openaiResponse.model,
          usage: openaiResponse.usage,
        };
      } catch (error: any) {
        if (error?.code === "insufficient_quota" || (error?.status === 429 && error?.message?.includes("quota"))) {
          this._quotaExhausted = true;
          console.error("[AI] OpenAI quota exhausted — marking for Anthropic fallback");
        }
        throw error;
      }
    }
  };
}

const openaiKey = process.env.OPENAI_API_KEY;
let platformOpenAI: OpenAIAnthropicWrapper | null = null;
if (openaiKey) {
  platformOpenAI = new OpenAIAnthropicWrapper(openaiKey, OPENAI_MODEL);
  console.log("[AI] OpenAI configured as primary AI provider (gpt-4o-mini)");
} else {
  console.log("[AI] No OpenAI key — using Anthropic as primary AI provider");
}

export async function getAnthropicForUser(userId: string): Promise<{ client: any; model: string }> {
  const settings = await storage.getSettingsByUser(userId);
  const sub = await storage.getSubscriptionByUser(userId);
  const hasActiveSubscription = sub && (sub.status === "active" || sub.status === "trial");

  if (platformOpenAI && !platformOpenAI.quotaExhausted && hasActiveSubscription) {
    return { client: platformOpenAI, model: OPENAI_MODEL };
  }

  if (platformOpenAI?.quotaExhausted) {
    console.log(`[AI] OpenAI quota issue — falling back to Anthropic for user ${userId}`);
  }

  const userAnthropicKey = settings?.anthropicApiKey;
  if (userAnthropicKey && userAnthropicKey.startsWith("sk-ant-")) {
    return {
      client: new Anthropic({ apiKey: userAnthropicKey, baseURL: "https://api.anthropic.com" }),
      model: CLAUDE_MODEL,
    };
  }

  if (anthropicConfig.apiKey && hasActiveSubscription) {
    return { client: anthropic, model: CLAUDE_MODEL };
  }

  if (!hasActiveSubscription) {
    throw new Error("AI_SUBSCRIPTION_REQUIRED");
  }

  throw new Error("AI_NOT_CONFIGURED");
}

import { PLAN_LIMITS, type PlanTier } from "@shared/schema";

async function checkUsageLimit(userId: string, field: "aiChats" | "smsSent" | "emailsSent" | "voiceCalls" | "leadsGenerated"): Promise<{ allowed: boolean; current: number; limit: number; planName: string }> {
  const sub = await storage.getSubscriptionByUser(userId);
  let plan: PlanTier = "starter";
  if (sub) {
    if (sub.status === "active" && sub.paymentMethod === "lifetime") {
      return { allowed: true, current: 0, limit: -1, planName: "Lifetime" };
    }
    if (sub.status === "trial" || sub.status === "active") {
      plan = (sub.plan as PlanTier) || "starter";
    }
  }
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
  const maxVal = limits[field];
  if (maxVal === -1) return { allowed: true, current: 0, limit: -1, planName: limits.name };
  const usage = await storage.getOrCreateUsage(userId);
  const current = (usage as any)[field] || 0;
  return { allowed: current < maxVal, current, limit: maxVal, planName: limits.name };
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
    originalUserId?: string;
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
  "medical-billing": {
    name: "Sales Pipeline",
    stages: [
      { name: "New Leads", color: "#3b82f6" },
      { name: "Contacted", color: "#8b5cf6" },
      { name: "Qualified", color: "#f59e0b" },
      { name: "Proposal Sent", color: "#f97316" },
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

export async function autoAddToFunnelDirect(userId: string, agentType: string, savedLeads: { name: string; email?: string; value?: number }[]): Promise<string> {
  if (savedLeads.length === 0) return "";
  try {
    return await addLeadsToAgentFunnel(userId, agentType, savedLeads);
  } catch (err) {
    console.error(`[${agentType}] Failed to add to funnel:`, err);
    return "";
  }
}

// ============================================================
// CRM ACTION EXECUTOR (called by Claude via tool_use)
// ============================================================

async function executeAction(userId: string, action: string, params: any): Promise<string> {
  switch (action) {
    case "generate_leads": {
      const leadUsage = await checkUsageLimit(userId, "leadsGenerated");
      if (!leadUsage.allowed) {
        return `Lead generation limit reached (${leadUsage.current}/${leadUsage.limit} this month on ${leadUsage.planName} plan). Upgrade your plan to generate more leads.`;
      }
      const leadsData = params.leads || [];
      if (!Array.isArray(leadsData) || leadsData.length === 0) {
        return "ERROR: No lead data provided. Use web_search first to find real businesses, then pass their details to this tool.";
      }

      const isGatekeeper = (name: string, email: string) => {
        const lower = (name || "").toLowerCase().trim();
        const emailLower = (email || "").toLowerCase().trim();
        const gatekeeperTitles = /(receptionist|front\s*desk|secretary|scheduler|intake\s*specialist|office\s*staff|billing\s*clerk)/i;
        if (gatekeeperTitles.test(lower)) return true;
        const isDecisionMaker = /\b(dr\.?|doctor|dds|dmd|md|do|dc|od|phd|owner|founder|ceo|president|managing\s*partner|principal|director|vp|vice\s*president|partner|cfo|coo|cto|cmo|head\s*of|general\s*manager|physician|dentist|chiropract|optometrist|surgeon|practitioner)\b/i.test(lower);
        if (isDecisionMaker) return false;
        const gatekeeperEmails = /^(info|contact|office|admin|hello|support|reception|frontdesk|appointments?|scheduling|billing|general|team|staff|help|enquir|inquir|mail)@/i;
        if (gatekeeperEmails.test(emailLower)) return true;
        return false;
      };
      const isFakeName = (name: string) => {
        if (!name) return true;
        const lower = name.toLowerCase().trim();
        if (/^(prospect|lead|contact|test|debug|fresh lead|alpha lead|real person)\s*/i.test(lower)) return true;
        if (/hunter (lead|prospect)/i.test(lower)) return true;
        if (/^unknown$/i.test(lower)) return true;
        if (/^(sample|example|dummy|placeholder|fake|lorem|john doe|jane doe)\b/i.test(lower)) return true;
        if (/lead\s*#/i.test(lower)) return true;
        if (/^[a-z]\s*\d+$/i.test(lower)) return true;
        return false;
      };
      const isFakeEmail = (email: string) => {
        if (!email) return false;
        const lower = email.toLowerCase().trim();
        if (/contact\d+@prospect/i.test(lower)) return true;
        if (/prospect-[a-z0-9]+\.com/i.test(lower)) return true;
        if (/@(example|test|fake|placeholder|dummy|sample|mailinator|tempmail|guerrillamail)\./i.test(lower)) return true;
        if (/^(test|fake|dummy|placeholder|sample|noreply|no-reply)@/i.test(lower)) return true;
        if (/^(prospect|lead|debug|fresh|alpha)[\d_@]/i.test(lower)) return true;
        if (/\+1555|5550{4}/i.test(lower)) return true;
        const namePart = lower.split("@")[0];
        const domainPart = lower.split("@")[1] || "";
        if (/^(dr|doctor|john|jane|robert|jessica|amanda|henry|maria|kevin|brian|sarah|steven|nick|jake|tina|laura|karen)[\._]/.test(namePart) && /^[a-z]+(practice|clinic|care|med|medical|health|surgery)\.(com|org|net)$/.test(domainPart)) return true;
        return false;
      };
      const isFakePhone = (phone: string) => {
        if (!phone) return false;
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 0) return false;
        const last10 = digits.slice(-10);
        if (last10.length >= 10 && /^.{3}555/.test(last10)) return true;
        if (/^(\d)\1{6,}$/.test(digits)) return true;
        if (/^(1234|0000|9999)/.test(digits)) return true;
        if (digits.length < 10) return true;
        return false;
      };

      const isBillingCompetitor = (company: string, notes: string) => {
        const text = `${company || ""} ${notes || ""}`.toLowerCase();
        const competitorPatterns = [
          /\bbilling\s*(company|service|solution|firm|agency|group|partner|pro|specialist|expert|center|associate)/i,
          /\brcm\s*(company|service|solution|firm|agency|group|partner)/i,
          /\brevenue\s*cycle\s*(management|service|solution|company|firm|partner|group)/i,
          /\bcoding\s*(company|service|solution|firm|agency)/i,
          /\bclearinghouse/i,
          /\bmedical\s*billing\s*(and|&)\s*(coding|collection)/i,
          /\bbilling\s*outsourc/i,
          /\behr\s*(vendor|company|provider|solution)/i,
          /\bemr\s*(vendor|company|provider|solution)/i,
          /\bpractice\s*management\s*software/i,
        ];
        for (const pattern of competitorPatterns) {
          if (pattern.test(text)) return true;
        }
        const companyLC = (company || "").toLowerCase().trim();
        if (/billing\s*(solution|service|company|group|partner|pro|specialist|firm|expert|associate|center)/i.test(companyLC)) return true;
        if (/\brcm\b/i.test(companyLC) && !/clinic|practice|medical\s*center|hospital/i.test(companyLC)) return true;
        return false;
      };

      const agentType = params.agent_type;
      const agentCatalogEntry = agentType ? getAgentByType(agentType) : null;
      const standardSource = agentCatalogEntry ? `${agentCatalogEntry.name} Agent` : null;

      const created: string[] = [];
      const skipped: string[] = [];
      const createdLeadDetails: { name: string; email?: string }[] = [];
      const existingLeads = await storage.getLeadsByUser(userId);
      const existingIndex = new Set<string>();
      for (const el of existingLeads) {
        if (el.email && el.email.trim()) existingIndex.add(el.email.toLowerCase().trim());
        if (el.company && el.company.trim()) {
          const companyKey = el.company.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
          if (companyKey.length > 2) existingIndex.add(`company:${companyKey}`);
        }
        if (el.phone && el.phone.trim()) {
          const phoneDigits = el.phone.replace(/\D/g, "").slice(-10);
          if (phoneDigits.length >= 10) existingIndex.add(`phone:${phoneDigits}`);
        }
      }

      const duplicates: string[] = [];

      const [_userRecord] = await db.select({ industry: users.industry }).from(users).where(eq(users.id, userId)).limit(1);
      const _userIsMedBilling = _userRecord && /medical billing|rcm|revenue cycle/i.test(_userRecord.industry || "");

      for (const lead of leadsData.slice(0, 30)) {
        if (isFakeName(lead.name)) {
          skipped.push(lead.name || "unnamed");
          console.warn(`[Lead Filter] Rejected fake name: "${lead.name}"`);
          continue;
        }
        if (isFakeEmail(lead.email)) {
          skipped.push(`${lead.name || "unnamed"} (fake email)`);
          console.warn(`[Lead Filter] Rejected fake email: name="${lead.name}", email="${lead.email}"`);
          continue;
        }
        if (isFakePhone(lead.phone)) {
          skipped.push(`${lead.name || "unnamed"} (fake phone)`);
          console.warn(`[Lead Filter] Rejected fake phone: name="${lead.name}", phone="${lead.phone}"`);
          continue;
        }
        if (isGatekeeper(lead.name, lead.email)) {
          skipped.push(`${lead.name || "unnamed"} (gatekeeper)`);
          console.warn(`[Lead Filter] Rejected gatekeeper: name="${lead.name}", email="${lead.email}" — we only want decision makers`);
          continue;
        }
        if (agentType === "medical-billing" && isBillingCompetitor(lead.company, lead.notes)) {
          skipped.push(`${lead.name || "unnamed"} (competitor — billing company)`);
          console.warn(`[Lead Filter] Rejected COMPETITOR billing company: "${lead.company}"`);
          continue;
        }

        if (_userIsMedBilling) {
          const companyText = `${lead.company || ""} ${lead.notes || ""} ${lead.intent_signal || lead.intentSignal || ""}`.toLowerCase();
          const isHealthcareRelated = /\b(medical|medic|health|healthcare|clinic|practice|physician|doctor|dr\b|dds|dmd|dental|dentist|dent|chiropractic|chiropract|optometr|ophthalm|dermatolog|cardiol|orthoped|pediatr|ob.?gyn|urol|neurolog|oncolog|gastro|pulmon|nephrol|endocrin|rheumatol|allerg|immunol|podiatr|psychiatr|psycholog|therap|physical therapy|pt\b|ot\b|speech|urgent care|walk.?in|surgery center|surgical|ambulatory|hospital|hospice|home health|nursing|assisted living|rehab|behavioral|mental health|wellness|pharma|laboratory|lab\b|radiology|imaging|patholog|anesthes|pain management|family medicine|internal medicine|primary care|community health|fqhc|veteran|va\b|med\s*spa|aesthetic|cosmetic|plastic surg|oral surg|periodon|endodont|orthodont|prosthodont)\b/.test(companyText);
          if (!isHealthcareRelated) {
            if (isBillingCompetitor(lead.company, lead.notes)) {
              skipped.push(`${lead.name || "unnamed"} (competitor — billing company)`);
              console.warn(`[Lead Filter] Rejected COMPETITOR for med-billing user: "${lead.company}"`);
              continue;
            }
            const isNonMedical = /\b(capital management|financial|investment|wealth|insurance agency|accounting firm|law firm|legal|attorney|real estate|realty|mortgage|construction|roofing|plumbing|hvac|electric|landscap|auto\s*(body|repair|shop)|restaurant|cafe|bar\b|hotel|motel|retail|clothing|fashion|jewelry|salon\b|barbershop|grooming|pet\b|veterinar|cleaning|janitorial|marketing agency|advertising|consulting group|staffing|recruiting|logistics|transport|freight|warehouse|manufactur|wholesale|distribution|tech startup|software company|it services|web design|seo agency)\b/.test(companyText);
            if (isNonMedical) {
              skipped.push(`${lead.name || "unnamed"} (not healthcare — ${lead.company})`);
              console.warn(`[Lead Filter] Rejected non-healthcare lead for med-billing user: "${lead.company}"`);
              continue;
            }
          }
        }
        const hasRealEmail = lead.email && lead.email.trim().length > 3 && lead.email.includes("@") && lead.email.includes(".");
        const hasRealPhone = lead.phone && lead.phone.replace(/\D/g, '').length >= 10;
        if (!hasRealEmail || !hasRealPhone) {
          const missing = !hasRealEmail && !hasRealPhone ? "phone AND email" : !hasRealEmail ? "email" : "phone";
          skipped.push(`${lead.name || "unnamed"} (missing ${missing})`);
          console.warn(`[Lead Filter] Rejected lead missing ${missing}: name="${lead.name}", email="${lead.email}", phone="${lead.phone}"`);
          continue;
        }

        let isDuplicate = false;
        const emailLC = (lead.email || "").toLowerCase().trim();
        const companyLC = (lead.company || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
        const phoneDigits = (lead.phone || "").replace(/\D/g, "").slice(-10);

        if (emailLC && emailLC.includes("@") && existingIndex.has(emailLC)) {
          isDuplicate = true;
        } else if (companyLC.length > 2 && existingIndex.has(`company:${companyLC}`)) {
          isDuplicate = true;
        } else if (phoneDigits.length >= 10 && existingIndex.has(`phone:${phoneDigits}`)) {
          isDuplicate = true;
        }

        if (isDuplicate) {
          duplicates.push(lead.name || lead.company || "unnamed");
          console.log(`[Lead Filter] Skipped duplicate: name="${lead.name}", email="${lead.email}", company="${lead.company}"`);
          continue;
        }

        const leadRecord = {
          userId,
          name: lead.name || "Unknown",
          email: lead.email || "",
          phone: normalizePhoneNumber(lead.phone),
          company: lead.company || "",
          address: lead.address || "",
          source: standardSource || lead.source || "Web Research",
          status: lead.status || "new",
          score: lead.score || randomInt(50, 85),
          notes: lead.notes || "",
          outreach: lead.outreach || "",
          intentSignal: lead.intentSignal || lead.intent_signal || "",
        };
        await storage.createLead(leadRecord);
        await storage.incrementUsage(userId, "leadsGenerated");
        created.push(`${leadRecord.name}${lead.company ? ` (${lead.company})` : ""}`);
        createdLeadDetails.push({ name: leadRecord.name, email: leadRecord.email });

        if (emailLC && emailLC.includes("@")) existingIndex.add(emailLC);
        if (companyLC.length > 2) existingIndex.add(`company:${companyLC}`);
        if (phoneDigits.length >= 10) existingIndex.add(`phone:${phoneDigits}`);
      }

      if (created.length === 0 && skipped.length > 0) {
        const hasGatekeepers = skipped.some(s => s.includes("gatekeeper"));
        const gatekeeperMsg = hasGatekeepers ? "\n- GATEKEEPER contacts (info@, contact@, office@, receptionists, schedulers) are AUTO-REJECTED. Find the DECISION MAKER: the owner, CEO, founder, director, VP, or partner." : "";
        const hasMissing = skipped.some(s => s.includes("missing"));
        const missingMsg = hasMissing ? "\n- Leads MUST have BOTH a real phone number AND a real email. Leads with only one or neither are AUTO-REJECTED." : "";
        return `ERROR: All ${skipped.length} leads were REJECTED — they had fabricated contact info, missing phone/email, or were gatekeeper contacts.${gatekeeperMsg}${missingMsg}\nYou MUST:\n1. Use web_search to search for SPECIFIC real businesses by name\n2. Search "[business name] owner" or "[business name] CEO" to find the DECISION MAKER\n3. Search "[decision maker name] email" AND "[business name] phone number" for REAL contact details — you need BOTH\n4. ONLY use emails and phone numbers you see in actual search results\n5. Phone numbers must NOT contain "555" — those are fictional\n6. Emails must NOT be generic (info@, contact@, office@) — find the decision maker's PERSONAL email\n7. Emails must be from REAL domains you found in search results\n8. Every lead MUST have BOTH a real phone AND real email — skip any lead where you can't find both\nTry again with REAL decision-maker contacts (BOTH phone AND email) from actual web pages.`;
      }
      const allLeads = await storage.getLeadsByUser(userId);
      const stats = await storage.getStatsByUser(userId);
      const activeCount = allLeads.filter(l => l.status === "hot" || l.status === "qualified" || l.status === "warm").length;
      await storage.upsertStats({ userId, totalLeads: allLeads.length, activeLeads: activeCount, appointmentsBooked: stats?.appointmentsBooked || 0, conversionRate: stats?.conversionRate || 0, revenue: stats?.revenue || 0 });

      let funnelMessage = "";
      if (agentType && AGENT_FUNNEL_STAGES[agentType]) {
        funnelMessage = await addLeadsToAgentFunnel(userId, agentType, createdLeadDetails);
      }

      let skippedMessage = skipped.length > 0 ? ` (${skipped.length} fake/placeholder leads were filtered out)` : "";
      let dupMessage = duplicates.length > 0 ? ` (${duplicates.length} duplicates skipped: ${duplicates.join(", ")})` : "";
      return `Saved ${created.length} real leads to CRM: ${created.join(", ")}. Total leads now: ${allLeads.length}.${funnelMessage}${skippedMessage}${dupMessage}`;
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
      const emailUsage = await checkUsageLimit(userId, "emailsSent");
      if (!emailUsage.allowed) {
        return `Email limit reached (${emailUsage.current}/${emailUsage.limit} this month on ${emailUsage.planName} plan). Upgrade your plan to send more emails.`;
      }
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
          await storage.incrementUsage(userId, "emailsSent");
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
              userId,
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
      const smsUsage = await checkUsageLimit(userId, "smsSent");
      if (!smsUsage.allowed) {
        return `SMS limit reached (${smsUsage.current}/${smsUsage.limit} this month on ${smsUsage.planName} plan). Upgrade your plan for more SMS.`;
      }
      const allLeads = await storage.getLeadsByUser(userId);
      const targetPhone = params.phone;
      const smsBody = params.message;
      const leadName = params.lead_name;

      console.log(`[Agent SMS] Params: phone=${targetPhone}, lead_id=${params.lead_id}, lead_name=${leadName}, message length=${smsBody?.length}`);

      if (!smsBody) {
        return "Please specify the message to send via SMS.";
      }

      try {
        const { sendSMS } = await import("./twilio");

        if (targetPhone) {
          const msg = await sendSMS(targetPhone, smsBody);
          await storage.incrementUsage(userId, "smsSent");
          return `SMS sent successfully to ${targetPhone} (SID: ${msg.sid}). Message: "${smsBody.slice(0, 80)}..."`;
        }

        const leadId = params.lead_id;
        if (leadId) {
          const lead = allLeads.find(l => l.id === leadId);
          if (!lead) return "Lead not found with that ID.";
          if (!lead.phone) return `Lead ${lead.name} has no phone number on file. Please add a phone number first.`;
          const msg = await sendSMS(lead.phone, smsBody);
          await storage.incrementUsage(userId, "smsSent");
          return `SMS sent to ${lead.name} at ${lead.phone} (SID: ${msg.sid}). Message: "${smsBody.slice(0, 80)}..."`;
        }

        if (leadName) {
          const matchedLead = allLeads.find(l => 
            l.name.toLowerCase().includes(leadName.toLowerCase()) || 
            (l.company && l.company.toLowerCase().includes(leadName.toLowerCase()))
          );
          if (matchedLead) {
            if (!matchedLead.phone) return `Lead ${matchedLead.name} has no phone number on file. Please add a phone number first.`;
            const msg = await sendSMS(matchedLead.phone, smsBody);
            await storage.incrementUsage(userId, "smsSent");
            return `SMS sent to ${matchedLead.name} at ${matchedLead.phone} (SID: ${msg.sid}). Message: "${smsBody.slice(0, 80)}..."`;
          }
          return `No lead found matching "${leadName}". Available leads with phone numbers: ${allLeads.filter(l => l.phone).slice(0, 5).map(l => `${l.name} (${l.phone})`).join(", ")}.`;
        }

        const leadsWithPhone = allLeads.filter(l => l.phone);
        if (leadsWithPhone.length === 0) {
          return "No leads with phone numbers found. Add phone numbers to your leads first.";
        }

        let sentCount = 0;
        const sentNames: string[] = [];
        const errors: string[] = [];
        for (const lead of leadsWithPhone) {
          try {
            await sendSMS(lead.phone!, smsBody);
            sentCount++;
            sentNames.push(lead.name);
          } catch (err: any) {
            console.error(`[Agent SMS] Failed to SMS ${lead.name} at ${lead.phone}:`, err.message);
            errors.push(`${lead.name}: ${err.message}`);
          }
        }
        let result = `SMS sent to ${sentCount} lead${sentCount !== 1 ? "s" : ""}: ${sentNames.join(", ")}.`;
        if (errors.length > 0) result += ` Failed for ${errors.length}: ${errors.join("; ")}`;
        return result;
      } catch (err: any) {
        console.error(`[Agent SMS] Error:`, err.message, err.code, err.moreInfo);
        if (err.message?.includes("Twilio not connected")) {
          return "SMS service is not available at the moment. The Twilio integration may need to be reconnected. Please try again later.";
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
  if (process.env.REPLIT_DEPLOYMENT_URL) {
    return `https://${process.env.REPLIT_DEPLOYMENT_URL}`;
  }
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "https://argilette.co";
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

export async function sendOutreachEmail(lead: any, userSettings: any, user: any): Promise<{ success: boolean; error?: string }> {
  if (!lead.email || !lead.outreach) {
    return { success: false, error: "Lead has no email or outreach draft" };
  }

  if (!user?.companyName) {
    return { success: false, error: "Company identity required. Go to Settings > Company Profile and enter your company name before sending outreach." };
  }

  if (!userSettings?.senderEmail && !process.env.SMTP_USERNAME) {
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

  const senderEmail = userSettings.senderEmail || process.env.SMTP_USERNAME;
  const senderName = `${user.firstName || ""} from ${user.companyName}`.trim();

  let subjectLine = lead.company
    ? `Quick question for ${lead.company}`
    : `Quick question, ${lead.name.split(" ")[0]}`;
  const subjectMatch = lead.outreach.match(/^Subject:\s*(.+)/im);
  if (subjectMatch) {
    subjectLine = subjectMatch[1].trim();
  }

  const baseUrl = getBaseUrl();

  let outreachBody = lead.outreach;
  if (subjectMatch) {
    outreachBody = outreachBody.replace(/^Subject:\s*.+\n?/im, "").trim();
  }

  const outreachHasSignature = /Best regards,\s*\n/i.test(outreachBody) ||
    /Looking forward to connecting,\s*\n/i.test(outreachBody) ||
    /Warm regards,\s*\n/i.test(outreachBody) ||
    /Kind regards,\s*\n/i.test(outreachBody) ||
    /Sincerely,\s*\n/i.test(outreachBody);

  let textSignature = "";
  let htmlSignature = "";

  if (!outreachHasSignature) {
    const sigParts: string[] = [];
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    if (fullName) sigParts.push(fullName);
    if ((user as any).jobTitle) sigParts.push((user as any).jobTitle);
    if (user.companyName) sigParts.push(user.companyName);
    const phoneNum = userSettings.grasshopperNumber || userSettings.twilioPhoneNumber || "";
    if (phoneNum) sigParts.push(phoneNum);
    if (user.website) sigParts.push(user.website);
    const calLink = userSettings.calendarLink || "";
    if (calLink) sigParts.push(calLink);

    textSignature = sigParts.length > 0 ? "\n\n--\n" + sigParts.join("\n") : "";
    htmlSignature = sigParts.length > 0
      ? `<br><br><div style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:16px;font-size:13px;color:#6b7280;">${sigParts.map(p => p.startsWith("http") ? `<a href="${p}" style="color:#0ea5e9;">${p}</a>` : p.startsWith("Book a call:") ? `<a href="${p.replace("Book a call: ", "")}" style="color:#0ea5e9;">${p}</a>` : p).join("<br>")}</div>`
      : "";
  }
  let htmlBody = outreachBody.replace(/\n/g, "<br>") + htmlSignature;
  htmlBody = wrapLinksForTracking(htmlBody, lead.id, baseUrl);
  htmlBody = injectTrackingPixel(htmlBody, lead.id, baseUrl);

  const plainText = outreachBody + textSignature;

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
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: lead.email,
        subject: subjectLine,
        text: plainText,
        html: htmlBody,
      });
    } else {
      sgMail.setApiKey(userSettings.sendgridApiKey);
      await sgMail.send({
        to: lead.email,
        from: { email: senderEmail, name: senderName },
        subject: subjectLine,
        text: plainText,
        html: htmlBody,
      });
    }
    await logEmail({ userId: user.id, leadId: lead.id, recipientEmail: lead.email, recipientName: lead.name, subject: subjectLine, provider: emailProvider, source: "outreach", status: "sent" });
    return { success: true };
  } catch (err: any) {
    console.error("Email send error:", err?.response?.body || err?.message || err);
    const errorMsg = err?.response?.body?.errors?.[0]?.message || err?.message || "Failed to send";

    const isBounce = /\b(550|551|552|553|554)\b/.test(err?.responseCode?.toString() || err?.message || "") ||
      /bounce|rejected|undeliverable|mailbox.*not found|user.*unknown|does not exist|invalid.*recipient|no such user/i.test(errorMsg);

    const emailStatus = isBounce ? "bounced" : "failed";
    await logEmail({ userId: user.id, leadId: lead.id, recipientEmail: lead.email, recipientName: lead.name, subject: subjectLine, provider: emailProvider, source: "outreach", status: emailStatus, errorMessage: errorMsg });
    return { success: false, error: errorMsg, bounced: isBounce };
  }
}

// ============================================================
// CLAUDE-POWERED AI HANDLER
// AI-powered chat with CRM actions
// Web search via Tavily, AI processing via OpenAI (primary) or Anthropic (fallback)
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

  const userName = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "there";
  const userCompany = user?.companyName || "";
  const userIndustry = user?.industry || "";
  const userPhone = (user as any)?.phone || "";

  const isMedBillChatUser = (userCompany || "").toLowerCase().includes("track-med");
  const medBillChatBlock = isMedBillChatUser ? `

TRACK-MED BILLING SOLUTIONS — SPECIAL INSTRUCTIONS:
You are acting as Clara Motena, Clients Acquisition Director at Track-Med Billing Solutions.
When asked to find medical practices or leads, you MUST:
1. Use web_search to find REAL practices — search for "[specialty] practice [city/state]", "small medical practice [region]", "independent physician office [area]", "private dental practice [location]", etc.
2. Do MULTIPLE searches (3-5) targeting different specialties, locations, and directories (Healthgrades, Zocdoc, Google Maps results, state medical board, BBB).
3. For EACH practice found, do a FOLLOW-UP web_search for "[practice name] phone email contact" to get decision-maker details.
4. ONLY target decision makers: Practice Owner, Managing Partner, Medical Director, Office Manager, Administrator — NEVER receptionists.
5. Save ALL leads using generate_leads with agent_type="medical-billing".
6. Use these outreach templates based on lead score:
   - Score >= 60 (hot/warm): Alternate between Template A (Free Analysis Offer) and Template B (Pain Points Version)
   - Score < 60 (cold prospect): Use Template C (Soft Introduction)

TEMPLATE A — Subject: Free CPT & Billing Cost Analysis for [Practice Name]
Hi [Dr. Last Name / Practice Manager Name],
I came across [Practice Name] and wanted to reach out — I work with independent [specialty] practices to help improve cash flow and reduce billing overhead.
At Track-Med Billing Solutions, we specialize in helping medical and dental practices improve cash flow and reduce billing overhead through fully personalized Revenue Cycle Management. And right now, we're offering a complimentary CPT and Billing Cost Analysis — at no cost or obligation to you.
In less than 30 minutes, we can show you exactly where revenue may be slipping through the cracks — whether from undercoding, denied claims, or slow payer follow-up.
We also provide: Free Practice Management Software for clients, Physician Credentialing, RAC Audit Defense, and full HIPAA-compliant billing systems.
Would you be open to a quick call this week to see what we find?
Best regards,
Clara Motena
Clients Acquisition Director
Track-Med Billing Solutions
+1(615)482-6768
https://www.track-med.com
https://www.tmbds.com/schedule

TEMPLATE C — Subject: A quick introduction from Track-Med Billing Solutions, [Practice Name]
Hi [Dr. Last Name / Practice Manager Name],
I hope this finds you well. My name is Clara Motena and I work with independent [specialty] practices like [Practice Name] to help streamline their revenue cycle — so providers can spend more time with patients and less time chasing payments.
Track-Med Billing Solutions provides fully personalized medical billing and Revenue Cycle Management, and we've found that many small to mid-size practices don't realize how much revenue they're leaving on the table until they see the numbers.
That's why we're offering a free, no-obligation CPT & Billing Cost Analysis. In less than 30 minutes, we can show you:
• Whether your current coding is maximizing your reimbursements
• Where claims may be getting delayed or denied unnecessarily
• A clear comparison of what you're collecting vs. what you could be
We also include free Practice Management Software for practices that partner with us, plus Physician Credentialing, RAC Audit Protection, and HIPAA-compliant document management — all built in.
There's absolutely no cost or commitment to see what we find. Would you be open to a brief conversation this week?
Best regards,
Clara Motena
Clients Acquisition Director
Track-Med Billing Solutions
+1(615)482-6768
https://www.track-med.com
https://www.tmbds.com/schedule

ABSOLUTE RULE: When asked to find practices or leads, NEVER give advice or recommendations on "how to find them." YOU must search, find, and SAVE them using the tools. The user is paying for you to DO the work, not to tell them how to do it themselves.
` : "";

  const systemPrompt = `You are Argilette AI — a senior AI strategist and business growth assistant on the Argilette platform (argilette.co), a universal AI Automation Platform for B2B lead generation, sales intelligence, and client acquisition. Be direct, data-driven, action-oriented. Communicate like a top-tier marketing consultant.

You serve ANY type of business — adapt your expertise to whatever industry the user operates in. You are NOT limited to any single industry.
${companyBlock}${medBillChatBlock}
CRM DATA: ${allLeads.length} leads (${allLeads.filter(l => l.status === "hot").length} hot, ${allLeads.filter(l => l.status === "qualified").length} qualified, ${allLeads.filter(l => l.status === "warm").length} warm, ${allLeads.filter(l => l.status === "new").length} new) | ${allAppts.length} appointments (${allAppts.filter(a => a.status === "scheduled").length} scheduled) | ${allAgents.length} agents (${allAgents.filter(a => a.status === "active").length} active)${websiteKnowledgeBlock}

CORE BEHAVIOR:
- Answer ANY question the user asks — business strategy, marketing, sales, general knowledge, technical questions, etc.
- When the user asks general questions (not about leads), respond helpfully like a knowledgeable business consultant.
- Only activate lead generation tools when the user specifically asks to find leads, prospects, or contacts.
- Adapt your language and expertise to the user's industry: ${userIndustry || "any industry they describe"}.

LEAD GENERATION (when requested):
1. ALWAYS use web_search FIRST to find REAL businesses. NEVER fabricate contacts.
2. Intent-based prospecting: find companies actively seeking services (RFPs, job listings, forum posts, competitor complaints). Score: 80-100 active seekers, 60-79 intent signals, 40-59 profile match only.
3. Extract REAL contact details from web results — real names, real phone numbers, real email addresses.
4. STRICT FORBIDDEN DATA: Never use "Prospect 1", "test@test.com", "contact1@prospect.com", or any indexed/generic placeholders. If you cannot find real data, DO NOT create the lead.
5. EVERY lead MUST include: name (Real Person), email (Real Email), phone (Real Phone), company (Real Business), address (Physical street address, city, state, zip), source, status="new", score, intent_signal, notes, outreach (personalized 3-5 sentence email).${bookingLink ? ` Include booking link in outreach: ${bookingLink}` : ' Include CTA: "Would you be open to a 15-minute call this week?"'}
6. End EVERY outreach email with this EXACT multi-line signature block (copy it verbatim):

Best regards,
${userName}
${(user as any)?.jobTitle || ""}
${userCompany}
${userPhone ? userPhone : ""}
${user?.website || ""}
${bookingLink || ""}

NEVER shorten, omit lines, or put signature on one line. Each field gets its own line.

DECISION-MAKER TARGETING:
- ONLY target decision makers: CEO, Founder, Owner, President, Managing Director, VP, Director, Partner, CFO, COO, CTO, CMO, Head of Department, General Manager, Principal.
- Adapt decision-maker titles to the user's target industry (e.g., Practice Owner for medical, Property Owner for real estate, Agency Director for marketing, etc.).
- NEVER target gatekeepers: receptionist, front desk, secretary, assistant, scheduler, coordinator, office staff, clerk.
- NEVER use generic emails: info@, contact@, office@, admin@, hello@, support@, reception@, general@, team@, staff@, help@.
- Use LinkedIn, company About/Team pages, press releases, and industry directories to find decision-maker contacts.

LEAD SEARCH STRATEGIES (adapt to user's target industry):
1. DIRECTORY SEARCH: Search for businesses by type and location using industry-specific directories, Google Maps, Yelp, BBB, and professional associations.
2. JOB POSTING SIGNALS: Search for companies hiring in relevant roles — indicates growth or pain points.
3. NEW BUSINESS DISCOVERY: Find recently opened businesses that need services.
4. PAIN POINT SIGNALS: Search forums, reviews, and social media for companies struggling with problems the user can solve.
5. COMPETITOR ANALYSIS: Find businesses using competitor products/services — they may be open to switching.

LEAD SCORING:
- Company is actively looking for the user's type of service: +35 points
- Company is growing/hiring: +25 points
- Decision maker identified with direct contact: +25 points
- Company size matches user's ideal client: +20 points
- Has direct email: +10 points
- Has direct phone: +10 points
- Recent pain point or complaint found: +30 points
- Score 70+ = HOT, 50-69 = WARM, below 50 = COLD

AGENT-TO-FUNNEL: When generating leads for a specific agent type, include agent_type in generate_leads. Valid types: tax-lien, tax-deed, wholesale-re, govt-contracts-us, lead-gen, medical-billing, govt-tender-africa, cross-border-trade, agri-market, diaspora-services, arbitrage. This auto-creates or finds the matching funnel pipeline.

TOOL SEQUENCING: web_search → generate_leads (with agent_type if applicable) → send_outreach (if user says engage/reach out/send/email). For SMS: send_sms. For funnels: create_funnel. Execute actions immediately, then summarize results.

CONTACT VERIFICATION (MANDATORY):
- ONLY use emails and phones you actually found on real websites during searches.
- NEVER fabricate, guess, or invent contact details.
- NEVER use @example.com, @test.com, or placeholder domains.
- NEVER use 555-xxx-xxxx phone numbers — those are fictional.
- Each lead MUST have BOTH a real phone number AND a real email address. Leads missing either are REJECTED.
- For EVERY potential lead, do dedicated searches for their contact info before saving.

CRITICAL RULE: When asked to find leads, you MUST call the generate_leads tool to save them to the CRM. NEVER just describe leads in text without saving them.

ABSOLUTE RULE — NO ADVICE-ONLY RESPONSES: When the user asks you to "find", "search", "generate", or "discover" leads/practices/businesses, you MUST immediately use web_search to find them, then save them with generate_leads. NEVER respond with "here are some recommendations on how to find them" or "try using Google Maps/LinkedIn/directories." YOU are the agent — YOU do the searching. The user is paying for ACTION, not advice on how to do it themselves. If web_search returns limited results, do MORE searches with different queries — try different locations, specialties, directory sites, etc.

FORMAT: Use **bold** for key terms, bullet points, numbered lists. Be concise but thorough.`;

  // Build message history for Claude
  const claudeMessages: Anthropic.MessageParam[] = chatHistory
    .filter(m => m.role === "user" || m.role === "assistant")
    .slice(-10)
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  if (claudeMessages.length === 0 || (claudeMessages[claudeMessages.length - 1] as any).content !== userMessage) {
    claudeMessages.push({ role: "user", content: userMessage });
  }

  // Define tools: CRM action tools (web search handled via Tavily)
  const tools: any[] = [
    {
      name: "generate_leads",
      description: "Save leads to CRM. Never fabricate data. ALWAYS target decision makers (CEO, Founder, Owner, Director, VP, Partner) — NEVER gatekeepers. If leads come from a specific agent (e.g. tax-lien, lead-gen), include agent_type to auto-add them to the matching funnel pipeline.",
      input_schema: {
        type: "object" as const,
        properties: {
          agent_type: { type: "string", description: "Optional agent type if leads are from a specific agent. Valid types: tax-lien, tax-deed, wholesale-re, govt-contracts-us, lead-gen, medical-billing, govt-tender-africa, cross-border-trade, agri-market, diaspora-services, arbitrage. When provided, leads are auto-added to the matching funnel pipeline." },
          leads: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Decision maker's full name (CEO, Founder, Owner, Director, VP). Never use gatekeeper names." },
                email: { type: "string", description: "Real email from website/directory" },
                phone: { type: "string", description: "Real phone from website/directory" },
                company: { type: "string", description: "Company name" },
                address: { type: "string", description: "Physical address of the practice/business (street, city, state, zip). Extract from search results." },
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
      description: "Send an SMS message to a lead or phone number. You can target by phone number directly, by lead_id, or by lead_name (partial match on name or company). If none specified, sends to ALL leads with phone numbers. Always generate a compelling, concise SMS message (under 160 chars ideally).",
      input_schema: {
        type: "object" as const,
        properties: {
          phone: { type: "string", description: "Direct phone number to send to (e.g. +16154826768)" },
          lead_id: { type: "string", description: "ID of a specific lead to send to" },
          lead_name: { type: "string", description: "Name or company of the lead to find and send to (partial match)" },
          message: { type: "string", description: "The SMS message body to send" },
        },
        required: ["message"],
      },
    },
    {
      name: "web_search",
      description: "Search the internet for real-time information. Use this to find real businesses, contact info, job postings, and verify data. ALWAYS use this before generate_leads to find REAL companies with VERIFIED contact details. Search for specific terms like company names, industries, locations, job postings for billing managers, etc.",
      input_schema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "The search query to find real businesses and contact information" },
        },
        required: ["query"],
      },
    },
  ];

  try {
    // Pre-search optimization: If user asks for leads, pre-fetch web results to reduce AI tool loops
    const lowerMsg = userMessage.toLowerCase();
    const isLeadRequest = lowerMsg.includes("lead") || lowerMsg.includes("find") || lowerMsg.includes("search") || lowerMsg.includes("prospect") || lowerMsg.includes("generate") || lowerMsg.includes("discover");
    let preSearchContext = "";
    if (isLeadRequest && (lowerMsg.includes("business") || lowerMsg.includes("compan") || lowerMsg.includes("client") || lowerMsg.includes("lead") || lowerMsg.includes("prospect") || userIndustry)) {
      try {
        const locationMatch = lowerMsg.match(/\b(in\s+)?([\w\s]+(?:,\s*\w{2})?)\b/i);
        const industryContext = userIndustry || "business";
        const searchQuery = `${userMessage.slice(0, 100)} ${industryContext} contact phone email`;
        let preSearchResults: any[] = [];

        if (process.env.TAVILY_API_KEY && Date.now() > tavilyRateLimitedUntil) {
          try {
            const tRes = await fetch("https://api.tavily.com/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query: searchQuery, search_depth: "advanced", max_results: 15, include_answer: true }),
              signal: AbortSignal.timeout(15000),
            });
            const tData = await tRes.json() as any;
            if (tRes.ok && !tData.detail) {
              preSearchResults = tData.results || [];
              if (preSearchResults.length > 0) {
                preSearchContext = `\n\nPRE-LOADED WEB SEARCH RESULTS (use these to extract real business contacts):\n${tData.answer || ""}\n${preSearchResults.map((r: any) => `Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`).join("\n\n")}`;
              }
            } else {
              console.warn("[Pre-search] Tavily error:", JSON.stringify(tData.detail || tData).slice(0, 200));
              if (tRes.status === 429 || tRes.status === 432) {
                tavilyRateLimitedUntil = Date.now() + 30 * 60 * 1000;
                console.log("[Pre-search] Tavily rate-limited — skipping for 30 min");
              }
            }
          } catch (tavErr: any) {
            console.warn("[Pre-search] Tavily fetch error:", tavErr?.message);
          }
        } else if (process.env.TAVILY_API_KEY) {
          console.log("[Pre-search] Tavily rate-limited — using fallbacks");
        }

        if (!preSearchContext) {
          console.log("[Pre-search] Trying DuckDuckGo...");
          try {
            const ddgResults = await searchDDG(searchQuery, 15);
            if (ddgResults.length > 0) {
              preSearchContext = `\n\nPRE-LOADED WEB SEARCH RESULTS (use these to extract real business contacts):\n${ddgResults.map(r => `Source: ${r.url}\nTitle: ${r.title}\n${r.snippet || ""}`).join("\n\n")}`;
              console.log(`[Pre-search] DuckDuckGo returned ${ddgResults.length} results`);
            }
          } catch (ddgErr: any) {
            console.warn("[Pre-search] DuckDuckGo error:", ddgErr?.message);
          }
        }

        if (!preSearchContext) {
          console.log("[Pre-search] Trying Bing...");
          try {
            const bingResults = await searchBing(searchQuery, 15);
            if (bingResults.length > 0) {
              preSearchContext = `\n\nPRE-LOADED WEB SEARCH RESULTS (use these to extract real business contacts):\n${bingResults.map(r => `Source: ${r.url}\nTitle: ${r.title}\n${r.snippet || ""}`).join("\n\n")}`;
              console.log(`[Pre-search] Bing returned ${bingResults.length} results`);
            }
          } catch (bingErr: any) {
            console.warn("[Pre-search] Bing error:", bingErr?.message);
          }
        }
        if (!preSearchContext && process.env.YOU_API_KEY) {
          console.log("[Pre-search] Trying You.com...");
          try {
            const youRes = await fetch(`https://api.ydc-index.io/search?query=${encodeURIComponent(searchQuery)}`, {
              headers: { "X-API-Key": process.env.YOU_API_KEY, "Accept": "application/json" },
              signal: AbortSignal.timeout(10000),
            });
            if (youRes.ok) {
              const youData = await youRes.json() as any;
              const hits = youData.hits || youData.results || [];
              if (hits.length > 0) {
                preSearchContext = `\n\nPRE-LOADED WEB SEARCH RESULTS (use these to extract real business contacts):\n${hits.slice(0, 15).map((h: any) => `Source: ${h.url || "N/A"}\nTitle: ${h.title || "N/A"}\n${h.description || (h.snippets || []).join(" ") || ""}`).join("\n\n")}`;
                console.log(`[Pre-search] You.com returned ${hits.length} results`);
              }
            }
          } catch (youErr: any) {
            console.warn("[Pre-search] You.com error:", youErr?.message);
          }
        }

        if (!preSearchContext) {
          console.warn("[Pre-search] All search providers returned 0 results — AI will use web_search tool");
        }
      } catch (e: any) {
        console.log("[Pre-search] Error:", e.message);
      }
    }

    const messagesForAI = preSearchContext 
      ? [...claudeMessages.slice(0, -1), { role: "user" as const, content: `${userMessage}${preSearchContext}\n\nIMPORTANT: Use the pre-loaded search results above to find real businesses. Do 1-2 additional targeted web searches if needed for specific contact info, then call generate_leads immediately.` }]
      : claudeMessages;

    // First Claude call — may use tools (uses user's own API key)
    let response = await userAnthropicClient.messages.create({
      model: userModel,
      max_tokens: 8192,
      system: systemPrompt,
      messages: messagesForAI,
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

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        if (toolUse.name === "web_search") {
          const query = (toolUse.input as any)?.query || "";
          console.log(`[AI Tool] web_search: "${query}"`);
          try {
            const tavilyKey = process.env.TAVILY_API_KEY;
            const youApiKey = process.env.YOU_API_KEY;
            let searchResults: string[] = [];

            if (tavilyKey && Date.now() > tavilyRateLimitedUntil) {
              try {
                const searchRes = await fetch("https://api.tavily.com/search", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    api_key: tavilyKey,
                    query,
                    search_depth: "advanced",
                    max_results: 10,
                    include_raw_content: false,
                  }),
                  signal: AbortSignal.timeout(15000),
                });
                const searchData = await searchRes.json() as any;
                if (!searchRes.ok || searchData.detail) {
                  console.error(`[AI Tool] Tavily API error (${searchRes.status}):`, JSON.stringify(searchData.detail || searchData).slice(0, 300));
                  if (searchRes.status === 429 || searchRes.status === 432) {
                    tavilyRateLimitedUntil = Date.now() + 30 * 60 * 1000;
                    console.log(`[AI Tool] Tavily rate-limited — skipping for 30 minutes`);
                  }
                } else {
                  searchResults = (searchData.results || []).map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.content?.slice(0, 500)}`);
                }
              } catch (tavErr: any) {
                console.error(`[AI Tool] Tavily error:`, tavErr?.message);
              }
            } else if (tavilyKey && Date.now() <= tavilyRateLimitedUntil) {
              console.log(`[AI Tool] Tavily rate-limited — skipping, using fallbacks`);
            }

            if (searchResults.length === 0) {
              console.log(`[AI Tool] Trying DuckDuckGo search...`);
              try {
                const ddgResults = await searchDDG(query, 10);
                searchResults = ddgResults.map(r => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet || "N/A"}`);
                if (searchResults.length > 0) console.log(`[AI Tool] DuckDuckGo returned ${searchResults.length} results`);
              } catch (ddgErr: any) {
                console.error(`[AI Tool] DuckDuckGo search error:`, ddgErr?.message);
              }
            }

            if (searchResults.length === 0) {
              console.log(`[AI Tool] DuckDuckGo failed, trying Bing...`);
              try {
                const bingResults = await searchBing(query, 10);
                searchResults = bingResults.map(r => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet || "N/A"}`);
                if (searchResults.length > 0) console.log(`[AI Tool] Bing returned ${searchResults.length} results`);
              } catch (bingErr: any) {
                console.error(`[AI Tool] Bing search error:`, bingErr?.message);
              }
            }

            if (searchResults.length === 0 && youApiKey) {
              console.log(`[AI Tool] Trying You.com search...`);
              try {
                const youRes = await fetch(`https://api.ydc-index.io/search?query=${encodeURIComponent(query)}`, {
                  headers: { "X-API-Key": youApiKey, "Accept": "application/json" },
                  signal: AbortSignal.timeout(10000),
                });
                if (youRes.ok) {
                  const youData = await youRes.json() as any;
                  const hits = youData.hits || youData.results || [];
                  searchResults = hits.slice(0, 10).map((h: any) => {
                    const snippets = (h.snippets || []).join(" ").slice(0, 500);
                    return `Title: ${h.title || "N/A"}\nURL: ${h.url || "N/A"}\nSnippet: ${h.description || snippets || "N/A"}`;
                  });
                  if (searchResults.length > 0) console.log(`[AI Tool] You.com search returned ${searchResults.length} results`);
                }
              } catch (youErr: any) {
                console.error(`[AI Tool] You.com search error:`, youErr?.message);
              }
            }

            if (searchResults.length === 0 && !tavilyKey && !youApiKey) {
              toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: "Web search not configured (no search API keys available). Use your AI knowledge to find real businesses based on publicly known information. Call generate_leads with businesses you know exist from your training data — include real company names, locations, and specialties. Note in the lead that contact info should be verified." });
              continue;
            }

            if (searchResults.length === 0) {
              console.warn(`[AI Tool] All search providers returned 0 results for: "${query}"`);
              toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: `Web search returned no results for "${query}". Try a DIFFERENT, simpler query — e.g. just the practice type and city name like "dermatology practice Nashville" or "family medicine clinic Houston". If you've already tried multiple queries, use your AI knowledge of REAL businesses you know from your training data. Call generate_leads with real businesses — use the DECISION MAKER's real name (not the practice name), their direct email (not info@ or contact@), and their real phone number. Set source to "AI knowledge - verify contact info".` });
              continue;
            }

            const searchSummary = searchResults.join("\n\n---\n\n");
            console.log(`[AI Tool] web_search returned ${searchResults.length} results`);
            toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: searchSummary.slice(0, 15000) });
          } catch (searchErr: any) {
            console.error(`[AI Tool] web_search ERROR:`, searchErr?.message);
            toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: `Search error: ${searchErr?.message}. Use your AI knowledge instead — find real businesses you know exist and call generate_leads with them.`, is_error: true });
          }
          continue;
        }

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
        max_tokens: 8192,
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

    if (!finalText) {
      const toolsUsed = response.content.filter((block: any) => block.type === "tool_use").map((b: any) => b.name);
      if (toolsUsed.includes("generate_leads")) {
        return "Done! I've saved new leads to your CRM. Check your Leads page to see them.";
      } else if (loopCount >= maxLoops) {
        return "I ran into some issues while searching for leads — the search service may be temporarily unavailable. Please try again in a few minutes, or try a more specific request like 'find dental practices in Nashville that need billing help'.";
      } else {
        return "I wasn't able to find and save any leads this time. The web search service may be temporarily unavailable. Please try again shortly, or try a more specific request with a location and specialty.";
      }
    }
    return finalText;
  } catch (error: any) {
    console.error("AI API error details:", {
      message: error?.message,
      status: error?.status,
      type: error?.type,
      code: error?.error?.type,
      fullError: JSON.stringify(error, null, 2).slice(0, 1000),
    });

    if (error?.status === 429 || error?.code === "insufficient_quota") {
      const isQuotaIssue = error?.code === "insufficient_quota" || error?.message?.includes("quota");
      if (isQuotaIssue) {
        console.log("[AI] Quota exhausted — switching to fallback AI provider");
      }

      try {
        const fallbackAi = await getAnthropicForUser(userId);
        console.log(`[AI] Retrying with fallback provider: ${fallbackAi.model}`);
        const retryResponse = await fallbackAi.client.messages.create({
          model: fallbackAi.model,
          max_tokens: 2048,
          system: systemPrompt,
          messages: claudeMessages,
        });
        const retryText = retryResponse.content
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("\n")
          .trim();
        if (retryText) return retryText;
      } catch (retryErr: any) {
        console.error("Retry with fallback also failed:", retryErr?.message);
      }

      if (!isQuotaIssue) {
        const retryAfter = error?.headers?.["retry-after"];
        const waitMs = retryAfter ? Math.min(parseInt(retryAfter) * 1000, 30000) : 5000;
        console.log(`Rate limited — retrying in ${waitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        try {
          const retryResponse2 = await userAnthropicClient.messages.create({
            model: userModel,
            max_tokens: 2048,
            system: systemPrompt,
            messages: claudeMessages,
          });
          const retryText2 = retryResponse2.content
            .filter((b: any) => b.type === "text")
            .map((b: any) => b.text)
            .join("\n")
            .trim();
          if (retryText2) return retryText2;
        } catch (retryErr2: any) {
          console.error("Second retry also failed:", retryErr2?.message);
        }
      }
      return "The AI is currently handling a lot of requests. Please wait about 30 seconds and try again — your message will go through. In the meantime, actions like booking appointments and activating agents still work!";
    }

    if (error?.status === 400 || error?.status === 401 || error?.status === 403) {
      return `There was an issue with the AI configuration (${error?.status}). The system administrator has been notified. Please try again in a moment. Error: ${error?.message?.slice(0, 200) || "Unknown"}`;
    }

    if (error?.status === 529 || error?.status === 500 || error?.status === 503) {
      return "The AI service is temporarily overloaded. Please try again in 30-60 seconds. Your CRM data and other features still work normally.";
    }

    console.error("[Chat] Unexpected error, running fallback for user", userId);
    return fallbackResponse(userId, userMessage);
  }
}

// ============================================================
// FALLBACK — runs if AI API is temporarily down
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
    return "I can help you with:\n\n- Generating new leads for your CRM\n- Booking appointments with your leads\n- Activating AI automation agents\n- Following up with warm leads\n- Showing your performance stats\n- Researching markets, competitors, and trends\n- Writing emails, ad copy, and marketing content\n\nJust tell me what you need!";
  }
  return "I'm experiencing a temporary issue with the AI service. Please try again in a moment. In the meantime, you can still ask me to generate leads, book appointments, or activate agents — those actions still work!";
}

// ============================================================
// AI-POWERED WEB SEARCH FALLBACK (OpenAI)
// Used when Tavily/You.com not available
// ============================================================

async function openaiWebSearch(query: string): Promise<string> {
  if (!openaiKey) {
    return "Web search is not available. Please configure a search provider in Settings > Integrations.";
  }
  try {
    const openai = new OpenAI({ apiKey: openaiKey });
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 4000,
      messages: [
        { role: "system", content: "You are a helpful research assistant. Provide a clear, concise summary based on your knowledge. Note that you cannot browse the web, so provide your best knowledge-based answer and suggest the user configure Tavily or You.com search for real-time web results." },
        { role: "user", content: query },
      ],
    });
    return response.choices[0]?.message?.content || "No results found.";
  } catch (error: any) {
    console.error("OpenAI web search fallback error:", error?.message || error);
    if (error?.status === 429) {
      return "The AI is currently busy. Please wait about 30 seconds and try your search again.";
    }
    return "Search temporarily unavailable. Please try again.";
  }
}

async function youWebSearch(query: string, apiKey: string): Promise<string> {
  try {
    const params = new URLSearchParams({
      query,
      count: "10",
    });
    const response = await fetch(`https://api.ydc-index.io/v1/search?${params.toString()}`, {
      headers: { "X-API-Key": apiKey },
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("You.com search error:", response.status, errText);
      return `You.com search failed (${response.status}). Please check your API key.`;
    }
    const data = await response.json();
    const webResults = data?.results?.web || data?.hits || [];
    if (webResults.length === 0) return "No results found.";

    const formatted = webResults.slice(0, 8).map((r: any, i: number) => {
      const title = r.title || "Untitled";
      const url = r.url || "";
      const snippets = r.snippets?.join(" ") || r.description || "";
      return `${i + 1}. **${title}**\n   ${url}\n   ${snippets}`;
    }).join("\n\n");

    return `## Web Search Results for: "${query}"\n\n${formatted}`;
  } catch (error: any) {
    console.error("You.com search error:", error?.message || error);
    return "You.com search temporarily unavailable. Please try again.";
  }
}

async function tavilySearch(query: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        max_results: 8,
        include_answer: true,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("Tavily search error:", response.status, errText);
      return `Tavily search failed (${response.status}). Please check your API key.`;
    }
    const data = await response.json();

    let output = "";
    if (data.answer) {
      output += `## AI Summary\n${data.answer}\n\n`;
    }
    const results = data.results || [];
    if (results.length > 0) {
      output += `## Sources\n\n`;
      output += results.map((r: any, i: number) => {
        const title = r.title || "Untitled";
        const url = r.url || "";
        const content = r.content || "";
        return `${i + 1}. **${title}**\n   ${url}\n   ${content}`;
      }).join("\n\n");
    }
    return output || "No results found.";
  } catch (error: any) {
    console.error("Tavily search error:", error?.message || error);
    return "Tavily search temporarily unavailable. Please try again.";
  }
}

async function webSearch(query: string, userId: string): Promise<string> {
  const settings = await storage.getSettingsByUser(userId);
  const provider = settings?.webSearchProvider || "tavily";

  if (provider === "tavily") {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey) {
      return tavilySearch(query, tavilyKey);
    }
    return openaiWebSearch(query);
  }

  if (provider === "you") {
    const youKey = settings?.youApiKey || process.env.YOU_API_KEY;
    if (!youKey) {
      return "You.com API key not configured. Go to Settings > Integrations to add your You.com API key.";
    }
    return youWebSearch(query, youKey);
  }

  return openaiWebSearch(query);
}

// ============================================================
// AI CONTENT GENERATION (OpenAI primary)
// Write emails, ad copy, social posts, etc.
// ============================================================

async function aiGenerate(prompt: string, type: string = "general", userClient?: { client: any; model: string }): Promise<string> {
  const systemPrompts: Record<string, string> = {
    email: "You are an expert email copywriter for B2B businesses. Write compelling, conversion-focused emails that drive action. Keep them concise and professional.",
    ad: "You are an expert advertising copywriter. Write attention-grabbing ad copy optimized for the specified platform. Include headlines, body copy, and CTAs.",
    social: "You are a social media content expert. Write engaging posts optimized for the specified platform. Include relevant hashtags and CTAs.",
    sms: "You are an SMS marketing expert. Write concise, compelling text messages under 160 characters that drive immediate action.",
    blog: "You are a content marketing expert. Write informative, SEO-friendly blog content that positions the business as an authority.",
    script: "You are a sales script expert. Write natural, conversational scripts that qualify leads and move them toward a booking.",
    general: "You are a helpful AI assistant for ArgiFlow, an AI Automation Agency. Help the user with whatever they need.",
  };

  if (userClient) {
    try {
      const response = await userClient.client.messages.create({
        model: userClient.model,
        max_tokens: 2048,
        system: systemPrompts[type] || systemPrompts.general,
        messages: [{ role: "user", content: prompt }],
      });
      const text = response.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n");
      if (text) return text;
    } catch (error: any) {
      console.error("AI generate error (wrapper):", error?.message);
      if (error?.status === 429) {
        return "The AI is currently busy. Please wait about 30 seconds and try again.";
      }
    }
  }

  if (!openaiKey) {
    return "Content generation is not available. AI provider not configured.";
  }

  try {
    const openai = new OpenAI({ apiKey: openaiKey });
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompts[type] || systemPrompts.general },
        { role: "user", content: prompt },
      ],
    });
    return response.choices[0]?.message?.content || "Unable to generate content. Please try again.";
  } catch (error: any) {
    console.error("OpenAI generate error:", error?.message || error);
    if (error?.status === 429) {
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

  // ---- SEO: SITEMAP & ROBOTS ----
  app.get("/sitemap.xml", (_req, res) => {
    const domain = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "https://argilette.co";

    const pages = [
      { loc: "/", priority: "1.0", changefreq: "weekly" },
      { loc: "/auth", priority: "0.8", changefreq: "monthly" },
    ];

    const urls = pages
      .map(
        (p) =>
          `  <url>\n    <loc>${domain}${p.loc}</loc>\n    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
      )
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
    res.set("Content-Type", "application/xml");
    res.send(xml);
  });

  app.get("/robots.txt", (_req, res) => {
    const domain = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "https://argilette.co";

    const txt = [
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /dashboard/",
      "",
      `Sitemap: ${domain}/sitemap.xml`,
    ].join("\n");
    res.set("Content-Type", "text/plain");
    res.send(txt);
  });

  // ---- INSTANTLY FEATURES ----
  app.use("/api/instantly", instantlyRoutes);
  app.post("/api/pixel/t", handlePixelTrack);

  // ---- B2B SALES INTELLIGENCE ----
  app.use("/api/intelligence", intelligenceRoutes);

  // ---- AI OUTREACH AGENT ----
  app.use("/api/outreach-agent", outreachAgentRoutes);

  // ---- FREE LEAD INTELLIGENCE SCRAPER ----
  registerFreeScraperRoutes(app, isAuthenticated);

  registerStripeRoutes(app);

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
      workflowHooks.onUserRegistered(user.id, user);

      const verifyToken = randomBytes(32).toString("hex");
      const verifyTokenHash = createHash("sha256").update(verifyToken).digest("hex");
      const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.createEmailVerificationToken({ userId: user.id, token: verifyTokenHash, expiresAt: verifyExpiresAt });

      const verifyUrl = `${getBaseUrl()}/verify-email?token=${verifyToken}`;
      try {
        await sendSystemEmail(
          email,
          { email: "info@argilette.com", name: "ArgiFlow" },
          `Verify your email — ArgiFlow`,
          `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; padding: 40px 30px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #38bdf8; margin: 0; font-size: 28px;">ArgiFlow</h1>
              <p style="color: #8b949e; margin: 8px 0 0;">AI-Powered Client Acquisition</p>
            </div>
            <h2 style="color: #e6edf3; font-size: 22px;">Welcome, ${firstName}!</h2>
            <p style="color: #8b949e; line-height: 1.7; font-size: 15px;">Thanks for signing up! Please verify your email address to activate your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: #38bdf8; color: #0d1117; padding: 14px 36px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">Confirm Email Address</a>
            </div>
            <p style="color: #8b949e; font-size: 13px; line-height: 1.6;">This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
            <p style="color: #484f58; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #21262d; padding-top: 20px;">ArgiFlow by Argilette &mdash; AI Automation for Client Acquisition<br/>&copy; ${new Date().getFullYear()} Argilette. All rights reserved.</p>
          </div>`
        );
        console.log(`Verification email sent to ${email}`);
      } catch (verifyEmailErr: any) {
        console.error("Verification email failed:", verifyEmailErr?.response?.body || verifyEmailErr?.message || verifyEmailErr);
        await storage.markEmailVerified(user.id);
      }

      const stripeSessionId = req.body.stripeSessionId;
      let stripeReconciled = false;
      if (stripeSessionId && process.env.STRIPE_SECRET_KEY) {
        try {
          const Stripe = (await import("stripe")).default;
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
          const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
          const sessionEmail = session.customer_email || session.customer_details?.email;
          if (session.payment_status === "paid" && sessionEmail?.toLowerCase() === email.toLowerCase()) {
            const { upsertSubscription, PLAN_PRICES } = await import("./stripe-routes");
            const plan = session.metadata?.plan || "starter";
            const planConfig = PLAN_PRICES[plan] || PLAN_PRICES.starter;
            await upsertSubscription(user.id, {
              plan,
              status: "active",
              amount: planConfig.amount / 100,
              paymentMethod: "stripe",
              stripeCustomerId: (session.customer as string) || null,
              stripeSubscriptionId: (session.subscription as string) || null,
              currentPeriodStart: new Date(),
              notes: `Stripe checkout ${stripeSessionId}`,
            });
            stripeReconciled = true;
            console.log(`[Stripe] Reconciled subscription for ${email} — ${plan}`);
          } else if (sessionEmail?.toLowerCase() !== email.toLowerCase()) {
            console.warn(`[Stripe] Session email ${sessionEmail} does not match registration email ${email}`);
          }
        } catch (stripeErr: any) {
          console.error("[Stripe] Reconciliation failed:", stripeErr?.message || stripeErr);
        }
      }

      if (!stripeReconciled) {
        try {
          const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
          await storage.createSubscription({
            userId: user.id,
            plan: "growth",
            status: "trial",
            amount: 0,
            paymentMethod: "none",
            trialEndsAt: trialEnd,
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEnd,
            notes: "15-day Pro trial — full access to all features",
          });
          console.log(`15-day Pro trial created for ${email} (expires ${trialEnd.toISOString()})`);
        } catch (subErr: any) {
          console.error("Failed to create trial subscription:", subErr?.message || subErr);
        }
      }

      try {
        await sendSystemEmail(
          email,
          { email: "info@argilette.com", name: "ArgiFlow" },
          `Welcome to ArgiFlow — Your Pro Account is Active!`,
          `<div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d1117; color: #e6edf3; padding: 40px 30px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #38bdf8; margin: 0; font-size: 28px;">ArgiFlow</h1>
              <p style="color: #8b949e; margin: 8px 0 0;">AI-Powered Client Acquisition</p>
            </div>
            <h2 style="color: #e6edf3; font-size: 22px;">Welcome, ${firstName}!</h2>
            <p style="color: #8b949e; line-height: 1.7; font-size: 15px;">Your account is ready and your <strong style="color: #38bdf8;">15-day Pro trial</strong> is now active. You have full access to all Pro features including AI agents, lead generation, voice AI calling, email campaigns, sales intelligence, and more — completely free for 15 days.</p>
            <div style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #e6edf3; margin: 0 0 8px; font-weight: 600;">Your Account:</p>
              <p style="color: #8b949e; margin: 4px 0; font-size: 14px;">Plan: <strong style="color: #38bdf8;">Pro Trial (15 days free)</strong></p>
              <p style="color: #8b949e; margin: 4px 0; font-size: 14px;">Status: <strong style="color: #22c55e;">Active — Full Access</strong></p>
              <p style="color: #8b949e; margin: 4px 0; font-size: 14px;">Includes: <strong style="color: #38bdf8;">All 40+ tools, AI agents, voice calling, sales intelligence</strong></p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://argilette.co/dashboard" style="background: #38bdf8; color: #0d1117; padding: 14px 36px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
            </div>
            <p style="color: #8b949e; font-size: 13px; line-height: 1.6;">Enjoy full access to every ArgiFlow feature for 15 days — no credit card required. After your trial, choose a plan that fits your needs.</p>
            <p style="color: #484f58; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #21262d; padding-top: 20px;">ArgiFlow by Argilette &mdash; AI Automation for Client Acquisition<br/>&copy; ${new Date().getFullYear()} Argilette. All rights reserved.</p>
          </div>`
        );
        console.log(`Welcome email sent to ${email}`);
      } catch (emailErr: any) {
        console.error("Welcome email failed:", emailErr?.response?.body || emailErr?.message || emailErr);
      }

      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, companyName: user.companyName, industry: user.industry, website: user.website, jobTitle: user.jobTitle, companyDescription: user.companyDescription, onboardingCompleted: user.onboardingCompleted, emailVerified: user.emailVerified });
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
      delete req.session.adminId;
      delete req.session.originalUserId;
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, companyName: user.companyName, industry: user.industry, website: user.website, jobTitle: user.jobTitle, companyDescription: user.companyDescription, onboardingCompleted: user.onboardingCompleted, emailVerified: user.emailVerified });
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

      const verifyUrl = `${getBaseUrl()}/verify-email?token=${token}`;
      await sendSystemEmail(
        email,
        { email: "info@argilette.com", name: "ArgiFlow" },
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

      const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;
      await sendSystemEmail(
        email,
        { email: "info@argilette.com", name: "ArgiFlow" },
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
      let sub = await storage.getSubscriptionByUser(user.id);
      if (sub && sub.status === "trial" && sub.trialEndsAt && new Date(sub.trialEndsAt) < new Date()) {
        await storage.updateSubscription(sub.id, {
          plan: "starter",
          status: "expired",
          notes: "15-day Pro trial expired — upgrade to continue",
        });
        sub = await storage.getSubscriptionByUser(user.id);
        console.log(`[Trial] Expired trial for user ${user.email}, downgraded to starter`);
      }
      let planLabel = "Free";
      let trialDaysLeft: number | null = null;
      if (sub) {
        const planName = sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1);
        if (sub.status === "active" && sub.paymentMethod === "lifetime") planLabel = `${planName} (Lifetime)`;
        else if (sub.status === "trial") {
          const daysLeft = sub.trialEndsAt ? Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
          trialDaysLeft = daysLeft;
          planLabel = `Pro Trial (${daysLeft}d left)`;
        }
        else if (sub.status === "active") planLabel = `${planName} Plan`;
        else if (sub.status === "expired") planLabel = "Trial Expired — Upgrade";
        else planLabel = "Free";
      }
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, companyName: user.companyName, industry: user.industry, website: user.website, jobTitle: user.jobTitle, companyDescription: user.companyDescription, onboardingCompleted: user.onboardingCompleted, emailVerified: user.emailVerified, planLabel, trialDaysLeft });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { firstName, lastName, email, companyName, industry, website, jobTitle, companyDescription } = req.body;
      const updateData: Record<string, any> = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (companyName !== undefined) updateData.companyName = companyName;
      if (industry !== undefined) updateData.industry = industry;
      if (website !== undefined) updateData.website = website || null;
      if (jobTitle !== undefined) updateData.jobTitle = jobTitle || null;
      if (companyDescription !== undefined) updateData.companyDescription = companyDescription || null;
      if (email !== undefined) {
        const emailStr = email.trim().toLowerCase();
        if (!emailStr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
          return res.status(400).json({ message: "Invalid email address" });
        }
        const existing = await storage.getUserByEmail(emailStr);
        if (existing && existing.id !== userId) {
          return res.status(409).json({ message: "Email already in use by another account" });
        }
        updateData.email = emailStr;
      }
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }
      const updated = await storage.updateUser(userId, updateData);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ id: updated.id, email: updated.email, firstName: updated.firstName, lastName: updated.lastName, profileImageUrl: updated.profileImageUrl, companyName: updated.companyName, industry: updated.industry, website: updated.website, jobTitle: updated.jobTitle, companyDescription: updated.companyDescription, onboardingCompleted: updated.onboardingCompleted, emailVerified: updated.emailVerified });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get("/api/usage", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const sub = await storage.getSubscriptionByUser(userId);
      let plan: PlanTier = "starter";
      let isLifetime = false;
      if (sub) {
        if (sub.status === "active" && sub.paymentMethod === "lifetime") {
          isLifetime = true;
          plan = (sub.plan as PlanTier) || "growth";
        } else if (sub.status === "trial" || sub.status === "active") {
          plan = (sub.plan as PlanTier) || "starter";
        }
      }
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
      const usage = await storage.getOrCreateUsage(userId);
      res.json({
        plan: plan,
        planName: limits.name,
        isLifetime,
        isTrial: sub?.status === "trial",
        trialEndsAt: sub?.trialEndsAt,
        usage: {
          aiChats: { used: usage.aiChats, limit: limits.aiChats },
          smsSent: { used: usage.smsSent, limit: limits.smsSent },
          emailsSent: { used: usage.emailsSent, limit: limits.emailsSent },
          voiceCalls: { used: usage.voiceCalls, limit: limits.voiceCalls },
          leadsGenerated: { used: usage.leadsGenerated, limit: limits.leadsGenerated },
        },
        limits,
      });
    } catch (error) {
      console.error("Error fetching usage:", error);
      res.status(500).json({ message: "Failed to fetch usage" });
    }
  });

  app.get("/api/plans", (req, res) => {
    res.json(PLAN_LIMITS);
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
      req.session.originalUserId = req.session.userId;
      req.session.adminId = admin.id;
      console.log(`[OWNER LOGIN] User ${user.email} switching to admin panel, originalUserId saved: ${req.session.originalUserId}`);
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
      const amounts: Record<string, number> = { starter: 0, pro: 259.99, enterprise: 499.99 };
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

  // ---- AI KPI DASHBOARD ----

  app.get("/api/ai-kpi", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const allLeads = await storage.getLeadsByUser(userId);
      const allAppts = await storage.getAppointmentsByUser(userId);
      const chatMessages = await storage.getChatMessages(userId);
      const agents = await storage.getAiAgentsByUser(userId);

      const aiSources = ["ai", "chat", "web research", "dataseo", "dataforseo", "outreach"];
      const aiLeads = allLeads.filter(l =>
        aiSources.some(s => (l.source || "").toLowerCase().includes(s))
      );
      const manualLeads = allLeads.filter(l =>
        !aiSources.some(s => (l.source || "").toLowerCase().includes(s))
      );

      const userMessages = chatMessages.filter(m => m.role === "user");
      const assistantMessages = chatMessages.filter(m => m.role === "assistant");

      const statusBreakdown: Record<string, number> = {};
      allLeads.forEach(l => {
        statusBreakdown[l.status] = (statusBreakdown[l.status] || 0) + 1;
      });

      const sourceBreakdown: Record<string, number> = {};
      allLeads.forEach(l => {
        const src = l.source || "Unknown";
        sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
      });

      const outreachedLeads = allLeads.filter(l => l.outreach && l.outreach.length > 0);
      const engagedLeads = allLeads.filter(l =>
        (l.engagementLevel && l.engagementLevel !== "none") ||
        (l.emailOpens && l.emailOpens > 0) ||
        (l.emailClicks && l.emailClicks > 0)
      );
      const totalOpens = allLeads.reduce((sum, l) => sum + (l.emailOpens || 0), 0);
      const totalClicks = allLeads.reduce((sum, l) => sum + (l.emailClicks || 0), 0);
      const openRate = outreachedLeads.length > 0 ? Math.round((totalOpens / outreachedLeads.length) * 100) : 0;
      const clickRate = outreachedLeads.length > 0 ? Math.round((totalClicks / outreachedLeads.length) * 100) : 0;
      const responseRate = outreachedLeads.length > 0
        ? Math.round((engagedLeads.length / outreachedLeads.length) * 100) : 0;

      const qualifiedLeads = allLeads.filter(l => l.status === "qualified" || l.status === "warm" || l.status === "hot" || l.status === "contacted");
      const conversionRate = allLeads.length > 0 ? Math.round((qualifiedLeads.length / allLeads.length) * 100) : 0;

      const now = new Date();
      const leadsTrend: { date: string; count: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const count = allLeads.filter(l => {
          const ld = l.createdAt ? new Date(l.createdAt).toISOString().split("T")[0] : "";
          return ld === dateStr;
        }).length;
        leadsTrend.push({ date: dateStr, count });
      }

      const activeAgents = agents.filter(a => a.status === "active");
      const agentsByType: Record<string, number> = {};
      agents.forEach(a => {
        agentsByType[a.type] = (agentsByType[a.type] || 0) + 1;
      });

      const followUpLeads = allLeads.filter(l => l.followUpStatus && l.followUpStatus !== "none");

      res.json({
        overview: {
          totalLeads: allLeads.length,
          aiGeneratedLeads: aiLeads.length,
          manualLeads: manualLeads.length,
          totalConversations: userMessages.length,
          totalAiResponses: assistantMessages.length,
          totalAppointments: allAppts.length,
          conversionRate,
        },
        outreach: {
          totalOutreached: outreachedLeads.length,
          totalEngaged: engagedLeads.length,
          totalOpens,
          totalClicks,
          openRate,
          clickRate,
          responseRate,
          followUpsActive: followUpLeads.length,
        },
        agents: {
          total: agents.length,
          active: activeAgents.length,
          byType: agentsByType,
        },
        breakdown: {
          byStatus: statusBreakdown,
          bySource: sourceBreakdown,
        },
        leadsTrend,
      });
    } catch (error) {
      console.error("Error fetching AI KPI:", error);
      res.status(500).json({ message: "Failed to fetch AI KPI data" });
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

          const tavilyKey = process.env.TAVILY_API_KEY;
          let websiteSearchResults = "";
          if (tavilyKey) {
            try {
              const tRes = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  api_key: tavilyKey,
                  query: `site:${websiteUrl} about services pricing contact`,
                  search_depth: "advanced",
                  max_results: 10,
                  include_answer: true,
                }),
              });
              if (tRes.ok) {
                const tData = await tRes.json();
                websiteSearchResults = [
                  tData.answer || "",
                  ...(tData.results || []).map((r: any) => `Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`)
                ].join("\n\n");
              }
            } catch (e: any) {
              console.error("Tavily search error:", e.message);
            }
          } else {
            console.warn("[Website Training] No TAVILY_API_KEY — proceeding without web search");
          }

          const trainAi = await getAnthropicForUser(userId);
          const systemMsg = "You are a business analyst. Your job is to thoroughly analyze business websites and extract structured information that will be used to train AI agents. Be thorough, specific, and use actual information from the website — never make things up." +
            (websiteSearchResults ? `\n\nHere are web search results about the website to help your analysis:\n\n${websiteSearchResults}` : "");
          const response = await trainAi.client.messages.create({
            model: trainAi.model,
            max_tokens: 8000,
            system: systemMsg,
            messages: [{ role: "user", content: searchPrompt }],
          });

          const fullText = response.content
            .filter((b: any) => b.type === "text")
            .map((b: any) => b.text)
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
      const deleted = await storage.deleteBusiness(req.params.id as string, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Business not found" });
      }
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
      if (parsed.data.phone) {
        parsed.data.phone = normalizePhoneNumber(parsed.data.phone);
      }
      const lead = await storage.createLead(parsed.data);
      workflowHooks.onLeadCreated(userId, lead);
      res.json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.delete("/api/leads/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const deleted = await storage.deleteLead(req.params.id as string, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Lead not found" });
      }
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
      const oldStatus = lead.status;
      const updated = await storage.updateLead(lead.id, updates);
      if (updates.status && updates.status !== oldStatus && updated) {
        workflowHooks.onLeadStatusChanged(userId, updated, oldStatus || "new", updates.status);
      }
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

      if (!settings?.senderEmail && !process.env.SMTP_USERNAME) {
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

  async function processOutreachGeneration(userId: string, regenerateAll: boolean = false) {
    try {
      let outreachAi: { client: Anthropic; model: string };
      try { outreachAi = await getAnthropicForUser(userId); } catch {
        outreachGenerationStatus.set(userId, { status: "error", generated: 0, total: 0, error: "AI API key not configured" });
        return;
      }
      const allLeads = await storage.getLeadsByUser(userId);
      const needsOutreach = regenerateAll ? allLeads.filter(l => l.status === "new") : allLeads.filter(l => !l.outreach || l.outreach.trim() === "");
      const user = await storage.getUserById(userId);
      const userSettings = await storage.getSettingsByUser(userId);
      const bookingLink = userSettings?.calendarLink || "";
      const senderFullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
      const senderTitle = (user as any)?.jobTitle || "";
      const senderCompany = user?.companyName || "Our company";
      const senderPhone = userSettings?.grasshopperNumber || userSettings?.twilioPhoneNumber || "";
      const senderWebsite = user?.website || "";

      const batchSize = 10;
      let generated = 0;
      const batches = [];
      for (let i = 0; i < needsOutreach.length; i += batchSize) {
        batches.push(needsOutreach.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const leadsInfo = batch.map((l, idx) =>
          `${idx + 1}. Name: "${l.name}", Company: ${l.company || "N/A"}, Email: ${l.email || "N/A"}, Notes: ${l.notes || "N/A"}, Intent: ${l.intentSignal || "N/A"}, Score: ${l.score || "N/A"}`
        ).join("\n");

        try {
          const isMedBillUser = (senderCompany || "").toLowerCase().includes("track-med");
          const medBillTemplateInstructions = isMedBillUser ? `

## OUTREACH TEMPLATES — Use the appropriate template based on the lead's score and intent signals.

**TEMPLATE A — Free Analysis Offer (for leads with score >= 60 or billing-related intent):**
Subject: Are billing errors costing [Practice Name] money? — Free Analysis Inside

Hi [Dr. Last Name / Practice Manager Name],
I wanted to reach out because practices like yours often leave significant revenue on the table — not from lack of patients, but from inaccurate coding, delayed claims, and missed reimbursements.
At Track-Med Billing Solutions, we specialize in helping medical and dental practices improve cash flow and reduce billing overhead through fully personalized Revenue Cycle Management. And right now, we're offering a complimentary CPT and Billing Cost Analysis — at no cost or obligation to you.
Here's what we'll cover:
• A detailed review of your current billing and coding accuracy
• Identification of revenue leakage points in your claims process
• A clear picture of what you could be collecting vs. what you currently are
On top of that, practices that partner with us receive free access to state-of-the-art Practice Management Software — a value-add that our clients love from day one.
We also handle Physician Credentialing, Electronic Fund Transfer, RAC Audit Protection (MD Audit Shield), and HIPAA-compliant Document Management — so you can focus on what matters most: your patients.
This analysis takes less than 30 minutes and could uncover thousands in recoverable revenue. Would you be open to a brief call this week to get started?

**TEMPLATE B — Pain Points Version (for leads with score >= 60 or billing-related intent):**
Subject: Still dealing with denied claims and slow reimbursements, [Practice Name]?

Hi [Dr. Last Name / Practice Manager],
Denied claims, slow reimbursements, and billing staff turnover are among the biggest revenue killers for independent practices today — and most providers don't realize how much it's truly costing them.
Track-Med Billing Solutions was built to fix exactly that.
We provide end-to-end Revenue Cycle Management tailored to your specialty — from clean claim submission and payment posting to credentialing, RAC audit defense, and patient balance collections. We've helped practices significantly reduce their days in A/R and recover revenue they didn't even know they were missing.
What sets us apart:
✔ Personalized billing teams aligned to your specialty
✔ Free Practice Management Software when you use our billing services
✔ Free CPT & Billing Cost Analysis — so you see the ROI before you commit
✔ Physician Credentialing included
✔ HIPAA-compliant systems across the board
Our free analysis alone gives you a detailed breakdown of any revenue loss due to coding or billing errors. No pressure, no commitment — just real data about your practice's financial health.
Can we carve out 20 minutes this week? I'd love to show you what we're seeing in practices similar to yours.

**TEMPLATE C — Cold Prospect Introduction (for leads with score < 60 or no billing signals):**
Subject: A quick introduction from Track-Med Billing Solutions, [Practice Name]

Hi [Dr. Last Name / Practice Manager Name],
I hope this finds you well. My name is Clara Motena and I work with independent medical practices like [Practice Name] to help streamline their revenue cycle — so providers can spend more time with patients and less time chasing payments.
Track-Med Billing Solutions provides fully personalized medical billing and Revenue Cycle Management, and we've found that many small to mid-size practices don't realize how much revenue they're leaving on the table until they see the numbers.
That's why we're offering a free, no-obligation CPT & Billing Cost Analysis. In less than 30 minutes, we can show you:
• Whether your current coding is maximizing your reimbursements
• Where claims may be getting delayed or denied unnecessarily
• A clear comparison of what you're collecting vs. what you could be
We also include free Practice Management Software for practices that partner with us, plus Physician Credentialing, RAC Audit Protection, and HIPAA-compliant document management — all built in.
There's absolutely no cost or commitment to see what we find. Would you be open to a brief conversation this week?

## SIGNATURE — Every email MUST end with this exact signature block:

Best regards,
Clara Motena
Clients Acquisition Director
Track-Med Billing Solutions
+1(615)482-6768
https://www.track-med.com
https://www.tmbds.com/schedule

## RULES:
- For leads with score >= 60 or billing/claims/denial-related intent signals: Alternate between Template A and Template B
- For leads with score < 60 or no billing signals (cold prospects): Use Template C
- Replace [Practice Name] with the lead's actual company/practice name
- Replace [Dr. Last Name / Practice Manager Name] with the lead's actual name
- Keep the full template content — do NOT shorten or summarize
- MUST end with the EXACT signature block above — no variations
` : "";

          const response = await outreachAi.client.messages.create({
            model: outreachAi.model,
            max_tokens: 4000,
            messages: [{
              role: "user",
              content: isMedBillUser
                ? `Generate personalized outreach email drafts for these leads using the Track-Med templates below. Each template already includes the proper signature — do NOT add any additional signature.\n${medBillTemplateInstructions}\n\nLeads:\n${leadsInfo}\n\nReturn ONLY a JSON array: [{"name":"exact lead name","outreach":"full email draft including subject line and signature from template"}]. No markdown, no explanation.`
                : `Generate personalized outreach email drafts (3-5 sentences each) for these leads. Reference their situation, mention a benefit, include a call-to-action.${bookingLink ? ` Include booking link: ${bookingLink}` : ""}\n\nEach email MUST end with this EXACT signature block:\n\nBest regards,\n${senderFullName}\n${senderTitle ? `${senderTitle}\n` : ""}${senderCompany}\n${senderPhone ? `${senderPhone}\n` : ""}${senderWebsite ? `${senderWebsite}\n` : ""}${bookingLink ? `${bookingLink}\n` : ""}\n\nLeads:\n${leadsInfo}\n\nReturn ONLY a JSON array: [{"name":"exact lead name","outreach":"email draft with signature"}]. No markdown, no explanation.`
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
    const regenerateAll = req.body?.regenerateAll === true;
    const allLeads = await storage.getLeadsByUser(userId);
    const targetLeads = regenerateAll ? allLeads.filter(l => l.status === "new") : allLeads.filter(l => !l.outreach || l.outreach.trim() === "");

    if (targetLeads.length === 0) {
      return res.json({ message: "All leads already have outreach drafts!", generated: 0, status: "complete" });
    }

    const existing = outreachGenerationStatus.get(userId);
    if (existing && existing.status === "processing") {
      return res.json({ message: "Already generating drafts...", total: existing.total, status: "processing" });
    }

    outreachGenerationStatus.set(userId, { status: "processing", generated: 0, total: targetLeads.length });
    res.json({ message: `${regenerateAll ? "Regenerating" : "Generating"} drafts for ${targetLeads.length} leads...`, total: targetLeads.length, status: "processing" });

    setImmediate(() => {
      processOutreachGeneration(userId, regenerateAll).catch(err => {
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

  app.post("/api/leads/:id/research-company", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const lead = await storage.getLeadById(req.params.id as string);
      if (!lead || lead.userId !== userId) {
        return res.status(404).json({ message: "Lead not found" });
      }
      if (!lead.company) {
        return res.status(400).json({ message: "No company name available for this lead" });
      }

      let userAi: { client: Anthropic; model: string };
      try { userAi = await getAnthropicForUser(userId); } catch {
        return res.status(400).json({ message: "AI API key not configured. Go to Settings > Integrations to add your Anthropic API key." });
      }

      const searchQueries = [
        `${lead.company} company overview services products`,
        `${lead.company} leadership team decision makers`,
      ];
      let webContext = "";
      for (const sq of searchQueries) {
        try {
          const result = await webSearch(sq, userId);
          if (result && result !== "No results found.") {
            webContext += `\n\n### Search: "${sq}"\n${result}`;
          }
        } catch (err) {
          console.warn("[RESEARCH] Web search failed for query:", sq, err);
        }
      }

      const user = await storage.getUserById(userId);
      const settings = await storage.getSettingsByUser(userId);

      const prompt = `You are a B2B sales research analyst. Research the following company and provide a detailed intelligence report that will help craft a compelling offer.

Company: ${lead.company}
Contact: ${lead.name}
Email: ${lead.email}
${lead.phone ? `Phone: ${lead.phone}` : ""}

Our Company: ${user?.companyName || "Our company"}
Our Services: ${settings?.industry || "business services"}

${webContext ? `## Web Research Results:\n${webContext}\n\n` : ""}

Provide a structured report with these sections:
1. **Company Overview**: What the company does, their industry, size estimate, location
2. **Key Services/Products**: What they offer to their customers
3. **Pain Points**: Common challenges companies like this face that our services could solve
4. **Decision Makers**: Likely decision-making structure and who to target
5. **Competitive Landscape**: Who their competitors are
6. **Recommended Offer**: A tailored offer/value proposition specifically for this company based on their needs and our services
7. **Talking Points**: 3-5 key conversation starters for outreach

Be specific and actionable. If web data is limited, use industry knowledge to provide useful insights. Format in clean markdown.`;

      const response = await userAi.client.messages.create({
        model: userAi.model,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const research = response.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n");

      await storage.updateLead(lead.id, {
        companyResearch: research,
        companyResearchedAt: new Date(),
      });

      res.json({ success: true, research });
    } catch (error) {
      console.error("Error researching company:", error);
      res.status(500).json({ message: "Failed to research company" });
    }
  });

  app.post("/api/leads/backfill-funnel", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const allLeads = await storage.getLeadsByUser(userId);
      const medBillingLeads = allLeads.filter(l => {
        const src = (l.source || "").toLowerCase();
        return src.includes("dataseo") || src.includes("datafor") || src.includes("medical billing") || src.includes("lead hunter") || src.includes("web research");
      });

      if (medBillingLeads.length === 0) {
        return res.json({ message: "No leads found to backfill", added: 0 });
      }

      const funnelInfo = await findOrCreateAgentFunnel(userId, "medical-billing");
      if (!funnelInfo) {
        return res.status(500).json({ message: "Failed to create sales pipeline" });
      }

      const existingDeals = await storage.getFunnelDeals(funnelInfo.funnelId);
      const existingEmails = new Set(existingDeals.map(d => (d.contactEmail || "").toLowerCase().trim()).filter(Boolean));
      const existingNames = new Set(existingDeals.map(d => (d.contactName || "").toLowerCase().trim()).filter(Boolean));

      let added = 0;
      for (const lead of medBillingLeads) {
        const emailLC = (lead.email || "").toLowerCase().trim();
        const nameLC = (lead.name || "").toLowerCase().trim();
        if ((emailLC && existingEmails.has(emailLC)) || (nameLC && existingNames.has(nameLC))) {
          continue;
        }
        await storage.createFunnelDeal({
          funnelId: funnelInfo.funnelId,
          stageId: funnelInfo.firstStageId,
          userId,
          contactName: lead.name || "",
          contactEmail: lead.email || "",
          value: 0,
          status: "open",
        });
        existingEmails.add(emailLC);
        existingNames.add(nameLC);
        added++;
      }

      res.json({ message: `Added ${added} leads to sales pipeline`, added, total: medBillingLeads.length });
    } catch (error) {
      console.error("Error backfilling funnel:", error);
      res.status(500).json({ message: "Failed to backfill funnel" });
    }
  });

  app.post("/api/leads/sync-funnel-stages", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const requestedFunnelId = req.body.funnelId as string | undefined;

      let targetFunnelId: string;
      if (requestedFunnelId) {
        const funnel = await db.select().from(funnels).where(and(eq(funnels.id, requestedFunnelId), eq(funnels.userId, userId))).limit(1);
        if (!funnel.length) return res.status(404).json({ message: "Funnel not found" });
        targetFunnelId = requestedFunnelId;
      } else {
        const funnelInfo = await findOrCreateAgentFunnel(userId, "medical-billing");
        if (!funnelInfo) return res.status(500).json({ message: "No sales pipeline found" });
        targetFunnelId = funnelInfo.funnelId;
      }

      const stages = await storage.getFunnelStages(targetFunnelId);
      const stageMap: Record<string, string> = {};
      for (const s of stages) {
        stageMap[s.name.toLowerCase().replace(/\s+/g, "")] = s.id;
      }
      const contactedStageId = stageMap["contacted"] || stages[1]?.id;
      const qualifiedStageId = stageMap["qualified"] || stages[2]?.id;
      const newLeadStageId = stageMap["newlead"] || stageMap["newleads"] || stages[0]?.id;

      if (!contactedStageId) {
        return res.status(500).json({ message: "No 'Contacted' stage found in pipeline" });
      }

      const allLeads = await storage.getLeadsByUser(userId);
      const contactedLeads = allLeads.filter(l => l.outreachSentAt);
      const hotLeads = allLeads.filter(l => l.status === "hot" && l.outreachSentAt);

      const existingDeals = await storage.getFunnelDeals(targetFunnelId);
      const existingEmails = new Set(existingDeals.map(d => (d.contactEmail || "").toLowerCase().trim()).filter(Boolean));

      let added = 0;
      let moved = 0;

      for (const deal of existingDeals) {
        const email = (deal.contactEmail || "").toLowerCase().trim();
        const matchingLead = contactedLeads.find(l => (l.email || "").toLowerCase().trim() === email);
        if (matchingLead && deal.stageId === newLeadStageId) {
          const targetStage = matchingLead.status === "hot" ? qualifiedStageId : contactedStageId;
          await db.update(funnelDeals).set({ stageId: targetStage }).where(eq(funnelDeals.id, deal.id));
          moved++;
        }
      }

      for (const lead of contactedLeads) {
        const emailLC = (lead.email || "").toLowerCase().trim();
        if (!emailLC || existingEmails.has(emailLC)) continue;

        const targetStage = lead.status === "hot" ? qualifiedStageId : contactedStageId;
        await storage.createFunnelDeal({
          funnelId: targetFunnelId,
          stageId: targetStage,
          userId,
          contactName: lead.name || "",
          contactEmail: lead.email || "",
          value: 0,
          status: "open",
        });
        existingEmails.add(emailLC);
        added++;
      }

      const proposalStageId = stageMap["proposalsent"] || stages[3]?.id;
      const wonStageId = stageMap["closedwon"] || stages[4]?.id;
      const allLeadEmails = new Set(allLeads.map(l => (l.email || "").toLowerCase().trim()).filter(Boolean));
      let createdInCrm = 0;
      const refreshedDeals = await storage.getFunnelDeals(targetFunnelId);
      for (const deal of refreshedDeals) {
        const dealEmail = (deal.contactEmail || "").toLowerCase().trim();
        if (!dealEmail || allLeadEmails.has(dealEmail)) continue;

        let crmStatus = "new";
        if (deal.stageId === contactedStageId) crmStatus = "contacted";
        else if (deal.stageId === qualifiedStageId) crmStatus = "qualified";
        else if (deal.stageId === proposalStageId) crmStatus = "proposal";
        else if (deal.stageId === wonStageId) crmStatus = "won";

        await storage.createLead({
          userId,
          name: deal.contactName || "",
          email: deal.contactEmail || "",
          source: "sales-funnel",
          status: crmStatus,
          score: crmStatus === "won" ? 100 : crmStatus === "proposal" ? 80 : crmStatus === "qualified" ? 60 : crmStatus === "contacted" ? 40 : 0,
        });
        allLeadEmails.add(dealEmail);
        createdInCrm++;
      }

      res.json({
        message: `Synced pipeline: ${added} deals added to funnel, ${moved} deals moved, ${createdInCrm} leads created in CRM`,
        added,
        moved,
        createdInCrm,
        totalContactedLeads: contactedLeads.length,
        totalHotLeads: hotLeads.length,
      });
    } catch (error) {
      console.error("Error syncing funnel stages:", error);
      res.status(500).json({ message: "Failed to sync funnel stages" });
    }
  });

  let enrichmentRunning = false;
  let enrichmentProgress = { enriched: 0, failed: 0, total: 0, status: "idle" as string };

  app.get("/api/leads/enrich-status", isAuthenticated, async (_req, res) => {
    res.json(enrichmentProgress);
  });

  app.post("/api/leads/enrich-followups", isAuthenticated, async (req, res) => {
    try {
      if (enrichmentRunning) {
        return res.json({ message: "Enrichment already running", ...enrichmentProgress, status: "processing" });
      }

      const userId = req.session.userId!;
      const allLeads = await storage.getLeadsByUser(userId);
      const followUpLeads = allLeads.filter(l => l.followUpStatus === "active" || l.followUpStatus === "completed");

      const genericPrefixes = ["info@", "contact@", "office@", "admin@", "reception@", "frontdesk@", "general@", "team@", "staff@", "help@", "appointments@", "scheduling@", "support@", "billing@"];
      const needsEnrichment = followUpLeads.filter(l => {
        if (!l.company) return false;
        const email = (l.email || "").toLowerCase();
        const phone = (l.phone || "").trim();
        const name = (l.name || "").toLowerCase();
        const hasGenericEmail = genericPrefixes.some(p => email.startsWith(p));
        const hasBadPhone = !phone || phone.length < 7;
        const hasGenericName = name.includes("practice manager") || name.includes("office manager");
        return hasGenericEmail || hasBadPhone || hasGenericName;
      });

      if (needsEnrichment.length === 0) {
        return res.json({ message: "All follow-up contacts already have valid decision-maker info", enriched: 0, total: followUpLeads.length, status: "complete" });
      }

      enrichmentRunning = true;
      enrichmentProgress = { enriched: 0, failed: 0, total: needsEnrichment.length, status: "processing" };

      res.json({
        message: `Starting decision-maker search for ${needsEnrichment.length} follow-up contacts`,
        enriching: needsEnrichment.length,
        total: followUpLeads.length,
        status: "processing",
      });

      (async () => {
        for (const lead of needsEnrichment) {
          try {
            const result = await intelligenceEngine.findDecisionMaker({
              company: lead.company!,
              currentName: lead.name || undefined,
              currentEmail: lead.email || undefined,
              currentPhone: lead.phone || undefined,
            });

            if (result.confidence === "low" && !result.name && !result.email && !result.phone) {
              enrichmentProgress.failed++;
              continue;
            }

            const updates: any = {};
            let changed = false;

            if (result.name && result.name !== lead.name) {
              const nameLC = result.name.toLowerCase();
              if (!nameLC.includes("practice manager") && !nameLC.includes("office manager") && !nameLC.includes("billing")) {
                updates.name = result.name;
                changed = true;
              }
            }

            if (result.email && result.email.includes("@")) {
              const newEmailLC = result.email.toLowerCase();
              const currentEmailLC = (lead.email || "").toLowerCase();
              const currentIsGeneric = genericPrefixes.some(p => currentEmailLC.startsWith(p));
              const newIsGeneric = genericPrefixes.some(p => newEmailLC.startsWith(p));
              if ((!newIsGeneric || currentIsGeneric) && newEmailLC !== currentEmailLC) {
                updates.email = result.email;
                changed = true;
              }
            }

            if (result.phone) {
              const ph = result.phone.replace(/\D/g, "");
              if (ph.length >= 10 && !/^.{3}555/.test(ph.slice(-10))) {
                updates.phone = normalizePhoneNumber(result.phone);
                changed = true;
              }
            }

            if (result.address) {
              updates.address = result.address;
              changed = true;
            }

            if (changed) {
              const enrichNote = `[DECISION MAKER FOUND ${new Date().toLocaleDateString()}] ${result.title || ""} — ${result.source || "web search"} (${result.confidence} confidence). ${result.notes || ""}`;
              updates.notes = lead.notes ? `${enrichNote}\n\n${lead.notes}` : enrichNote;
              await storage.updateLead(lead.id, updates);
              enrichmentProgress.enriched++;
              console.log(`[DM-ENRICH] Updated ${lead.company}: name=${updates.name || "unchanged"}, email=${updates.email || "unchanged"}, phone=${updates.phone || "unchanged"}, address=${updates.address || "unchanged"}`);
            } else {
              enrichmentProgress.failed++;
            }

            await new Promise(r => setTimeout(r, 1500));
          } catch (err) {
            console.error(`[DM-ENRICH] Error processing ${lead.company}:`, err);
            enrichmentProgress.failed++;
          }
        }
        enrichmentProgress.status = "complete";
        enrichmentRunning = false;
        console.log(`[DM-ENRICH] Complete: ${enrichmentProgress.enriched} enriched, ${enrichmentProgress.failed} failed out of ${needsEnrichment.length}`);
      })();
    } catch (error) {
      console.error("Error starting enrichment:", error);
      enrichmentRunning = false;
      enrichmentProgress.status = "error";
      res.status(500).json({ message: "Failed to start enrichment" });
    }
  });

  app.post("/api/leads/:id/find-decision-maker", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const lead = await storage.getLeadById(req.params.id as string);
      if (!lead || lead.userId !== userId) {
        return res.status(404).json({ message: "Lead not found" });
      }
      if (!lead.company) {
        return res.status(400).json({ message: "Lead has no company name — cannot search for decision maker" });
      }

      const result = await intelligenceEngine.findDecisionMaker({
        company: lead.company,
        currentName: lead.name || undefined,
        currentEmail: lead.email || undefined,
        currentPhone: lead.phone || undefined,
      });

      if (result.confidence === "low" && !result.name && !result.email && !result.phone) {
        return res.json({ message: "Could not find a decision maker for this company", result, updated: false });
      }

      const updates: any = {};
      let changed = false;

      if (result.name && result.name !== lead.name) {
        updates.name = result.name;
        changed = true;
      }

      if (result.email && result.email.includes("@") && result.email.includes(".")) {
        const newEmailLC = result.email.toLowerCase();
        const currentEmailLC = (lead.email || "").toLowerCase();
        const genericPrefixes = ["info@", "contact@", "office@", "admin@", "reception@", "frontdesk@", "general@", "team@", "staff@", "help@"];
        const currentIsGeneric = genericPrefixes.some(p => currentEmailLC.startsWith(p));
        const newIsGeneric = genericPrefixes.some(p => newEmailLC.startsWith(p));
        if (!newIsGeneric || !lead.email || currentIsGeneric) {
          if (newEmailLC !== currentEmailLC) {
            updates.email = result.email;
            changed = true;
          }
        }
      }

      if (result.phone) {
        const ph = result.phone.replace(/\D/g, "");
        if (ph.length >= 10 && !/^.{3}555/.test(ph.slice(-10))) {
          if (result.phone !== lead.phone) {
            updates.phone = normalizePhoneNumber(result.phone);
            changed = true;
          }
        }
      }

      if (result.address && result.address !== lead.address) {
        updates.address = result.address;
        changed = true;
      }

      if (changed) {
        const enrichNote = `[DECISION MAKER FOUND ${new Date().toLocaleDateString()}] ${result.title || ""} — ${result.source || "web search"} (${result.confidence} confidence). ${result.notes || ""}`;
        updates.notes = lead.notes ? `${enrichNote}\n\n${lead.notes}` : enrichNote;
        await storage.updateLead(lead.id, updates);
        console.log(`[DM-ENRICH] Updated ${lead.company}: name=${updates.name || "unchanged"}, email=${updates.email || "unchanged"}, phone=${updates.phone || "unchanged"}, address=${updates.address || "unchanged"}`);
      }

      res.json({ message: changed ? "Decision maker found and lead updated" : "Decision maker search completed — no better data found", result, updated: changed, updates: changed ? updates : null });
    } catch (error: any) {
      console.error("Error finding decision maker:", error);
      res.status(500).json({ message: "Failed to find decision maker" });
    }
  });

  app.post("/api/leads/enrich-all", isAuthenticated, async (req, res) => {
    try {
      if (enrichmentRunning) {
        return res.json({ message: "Enrichment already running", ...enrichmentProgress, status: "processing" });
      }

      const userId = req.session.userId!;
      const allLeads = await storage.getLeadsByUser(userId);

      const genericPrefixes = ["info@", "contact@", "office@", "admin@", "reception@", "frontdesk@", "general@", "team@", "staff@", "help@", "appointments@", "scheduling@", "support@", "billing@"];
      const needsEnrichment = allLeads.filter(l => {
        if (!l.company) return false;
        const email = (l.email || "").toLowerCase();
        const phone = (l.phone || "").trim();
        const name = (l.name || "").toLowerCase();
        const hasGenericEmail = genericPrefixes.some(p => email.startsWith(p));
        const hasNoEmail = !email || !email.includes("@");
        const hasBadPhone = !phone || phone.length < 7;
        const hasGenericName = !name || name === l.company?.toLowerCase() || name.includes("practice manager") || name.includes("office manager");
        return hasGenericEmail || hasNoEmail || hasBadPhone || hasGenericName;
      });

      if (needsEnrichment.length === 0) {
        return res.json({ message: "All leads already have decision-maker contact info", enriched: 0, total: allLeads.length, status: "complete" });
      }

      enrichmentRunning = true;
      enrichmentProgress = { enriched: 0, failed: 0, total: needsEnrichment.length, status: "processing" };

      res.json({
        message: `Starting decision-maker search for ${needsEnrichment.length} leads`,
        enriching: needsEnrichment.length,
        total: allLeads.length,
        status: "processing",
      });

      (async () => {
        for (const lead of needsEnrichment) {
          try {
            const result = await intelligenceEngine.findDecisionMaker({
              company: lead.company!,
              currentName: lead.name || undefined,
              currentEmail: lead.email || undefined,
              currentPhone: lead.phone || undefined,
            });

            if (result.confidence === "low" && !result.name && !result.email && !result.phone) {
              enrichmentProgress.failed++;
              continue;
            }

            const updates: any = {};
            let changed = false;

            if (result.name && result.name !== lead.name) {
              const nameLC = result.name.toLowerCase();
              if (!nameLC.includes("practice manager") && !nameLC.includes("office manager") && !nameLC.includes("billing")) {
                updates.name = result.name;
                changed = true;
              }
            }

            if (result.email && result.email.includes("@")) {
              const newEmailLC = result.email.toLowerCase();
              const currentEmailLC = (lead.email || "").toLowerCase();
              const currentIsGeneric = genericPrefixes.some(p => currentEmailLC.startsWith(p));
              const newIsGeneric = genericPrefixes.some(p => newEmailLC.startsWith(p));
              if ((!newIsGeneric || currentIsGeneric) && newEmailLC !== currentEmailLC) {
                updates.email = result.email;
                changed = true;
              }
            }

            if (result.phone) {
              const ph = result.phone.replace(/\D/g, "");
              if (ph.length >= 10 && !/^.{3}555/.test(ph.slice(-10))) {
                updates.phone = normalizePhoneNumber(result.phone);
                changed = true;
              }
            }

            if (result.address) {
              updates.address = result.address;
              changed = true;
            }

            if (changed) {
              const enrichNote = `[DECISION MAKER FOUND ${new Date().toLocaleDateString()}] ${result.title || ""} — ${result.source || "web search"} (${result.confidence} confidence). ${result.notes || ""}`;
              updates.notes = lead.notes ? `${enrichNote}\n\n${lead.notes}` : enrichNote;
              await storage.updateLead(lead.id, updates);
              enrichmentProgress.enriched++;
              console.log(`[DM-ENRICH] Updated ${lead.company}: name=${updates.name || "unchanged"}, email=${updates.email || "unchanged"}, phone=${updates.phone || "unchanged"}, address=${updates.address || "unchanged"}`);
            } else {
              enrichmentProgress.failed++;
            }

            await new Promise(r => setTimeout(r, 1500));
          } catch (err) {
            console.error(`[DM-ENRICH] Error processing ${lead.company}:`, err);
            enrichmentProgress.failed++;
          }
        }
        enrichmentProgress.status = "complete";
        enrichmentRunning = false;
        console.log(`[DM-ENRICH] Complete: ${enrichmentProgress.enriched} enriched, ${enrichmentProgress.failed} failed out of ${needsEnrichment.length}`);
      })();
    } catch (error) {
      console.error("Error starting enrichment:", error);
      enrichmentRunning = false;
      enrichmentProgress.status = "error";
      res.status(500).json({ message: "Failed to start enrichment" });
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

  // ---- AUTOMATED LEAD ENGAGEMENT ----
  // Automatically generates outreach + sends emails for new leads without manual intervention
  // Runs every 10 minutes — leads with score >= 40 get outreach generated + sent (hot/warm get Template A/B, cold get Template C)

  const HOT_LEAD_MIN_SCORE = 40;
  const HOT_LEAD_BATCH_SIZE = 5;
  const HOT_LEAD_INTERVAL = 3 * 60 * 1000; // 3 minutes — rapid catch-up for any leads not handled by instant outreach
  let autoEngageRunning = false;

  async function processAutoHotLeadEngagement() {
    if (autoEngageRunning) {
      console.log("[AutoEngage] Skipping — previous run still in progress");
      return;
    }
    autoEngageRunning = true;
    try {
      const allUsers = await storage.getAllUsers();
      for (const user of allUsers) {
        try {
          if (!user.companyName) continue;
          const settings = await storage.getSettingsByUser(user.id);
          if (!settings) continue;

          const hasSendCapability = !!(
            (settings as any).senderEmail ||
            process.env.SMTP_USERNAME
          ) && !!(
            ((settings as any).smtpHost && (settings as any).smtpUsername && (settings as any).smtpPassword) ||
            (process.env.SMTP_HOST && process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD) ||
            (settings as any).sendgridApiKey
          );
          if (!hasSendCapability) continue;

          const allLeads = await storage.getLeadsByUser(user.id);
          const hotLeads = allLeads.filter(l =>
            l.status === "new" &&
            (l.score || 0) >= HOT_LEAD_MIN_SCORE &&
            l.email &&
            !l.outreachSentAt &&
            !l.scheduledSendAt
          );

          if (hotLeads.length === 0) continue;

          const batch = hotLeads.slice(0, HOT_LEAD_BATCH_SIZE);
          const needsOutreach = batch.filter(l => !l.outreach || l.outreach.trim() === "");
          const readyToSend = batch.filter(l => l.outreach && l.outreach.trim() !== "");

          if (needsOutreach.length > 0) {
            let outreachAi: { client: Anthropic; model: string };
            try { outreachAi = await getAnthropicForUser(user.id); } catch {
              console.log(`[AutoEngage] Skipping outreach gen for ${user.email} — no AI key`);
              continue;
            }

            const userSettings = settings as any;
            const bookingLink = userSettings?.calendarLink || "";
            const senderFullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
            const senderTitle = (user as any)?.jobTitle || "";
            const senderCompany = user.companyName || "Our company";
            const senderPhone = userSettings?.grasshopperNumber || userSettings?.twilioPhoneNumber || "";
            const senderWebsite = user.website || "";
            const isMedBillUser = (senderCompany || "").toLowerCase().includes("track-med");

            const leadsInfo = needsOutreach.map((l, idx) =>
              `${idx + 1}. Name: "${l.name}", Company: ${l.company || "N/A"}, Email: ${l.email || "N/A"}, Notes: ${l.notes || "N/A"}, Intent: ${l.intentSignal || "N/A"}, Score: ${l.score || "N/A"}`
            ).join("\n");

            const medBillTemplateInstructions = isMedBillUser ? `

## OUTREACH TEMPLATES — Use the appropriate template based on the lead's score and intent signals.

**TEMPLATE A — Free Analysis Offer (for leads with score >= 60 or billing-related intent):**
Subject: Are billing errors costing [Practice Name] money? — Free Analysis Inside

Hi [Dr. Last Name / Practice Manager Name],
I wanted to reach out because practices like yours often leave significant revenue on the table — not from lack of patients, but from inaccurate coding, delayed claims, and missed reimbursements.
At Track-Med Billing Solutions, we specialize in helping medical and dental practices improve cash flow and reduce billing overhead through fully personalized Revenue Cycle Management. And right now, we're offering a complimentary CPT and Billing Cost Analysis — at no cost or obligation to you.
Here's what we'll cover:
• A detailed review of your current billing and coding accuracy
• Identification of revenue leakage points in your claims process
• A clear picture of what you could be collecting vs. what you currently are
On top of that, practices that partner with us receive free access to state-of-the-art Practice Management Software — a value-add that our clients love from day one.
We also handle Physician Credentialing, Electronic Fund Transfer, RAC Audit Protection (MD Audit Shield), and HIPAA-compliant Document Management — so you can focus on what matters most: your patients.
This analysis takes less than 30 minutes and could uncover thousands in recoverable revenue. Would you be open to a brief call this week to get started?

**TEMPLATE B — Pain Points Version (for leads with score >= 60 or billing-related intent):**
Subject: Still dealing with denied claims and slow reimbursements, [Practice Name]?

Hi [Dr. Last Name / Practice Manager],
Denied claims, slow reimbursements, and billing staff turnover are among the biggest revenue killers for independent practices today — and most providers don't realize how much it's truly costing them.
Track-Med Billing Solutions was built to fix exactly that.
We provide end-to-end Revenue Cycle Management tailored to your specialty — from clean claim submission and payment posting to credentialing, RAC audit defense, and patient balance collections. We've helped practices significantly reduce their days in A/R and recover revenue they didn't even know they were missing.
What sets us apart:
✔ Personalized billing teams aligned to your specialty
✔ Free Practice Management Software when you use our billing services
✔ Free CPT & Billing Cost Analysis — so you see the ROI before you commit
✔ Physician Credentialing included
✔ HIPAA-compliant systems across the board
Our free analysis alone gives you a detailed breakdown of any revenue loss due to coding or billing errors. No pressure, no commitment — just real data about your practice's financial health.
Can we carve out 20 minutes this week? I'd love to show you what we're seeing in practices similar to yours.

**TEMPLATE C — Cold Prospect Introduction (for leads with score < 60 or no billing signals):**
Subject: A quick introduction from Track-Med Billing Solutions, [Practice Name]

Hi [Dr. Last Name / Practice Manager Name],
I hope this finds you well. My name is Clara Motena and I work with independent medical practices like [Practice Name] to help streamline their revenue cycle — so providers can spend more time with patients and less time chasing payments.
Track-Med Billing Solutions provides fully personalized medical billing and Revenue Cycle Management, and we've found that many small to mid-size practices don't realize how much revenue they're leaving on the table until they see the numbers.
That's why we're offering a free, no-obligation CPT & Billing Cost Analysis. In less than 30 minutes, we can show you:
• Whether your current coding is maximizing your reimbursements
• Where claims may be getting delayed or denied unnecessarily
• A clear comparison of what you're collecting vs. what you could be
We also include free Practice Management Software for practices that partner with us, plus Physician Credentialing, RAC Audit Protection, and HIPAA-compliant document management — all built in.
There's absolutely no cost or commitment to see what we find. Would you be open to a brief conversation this week?

## SIGNATURE — Every email MUST end with this exact signature block:

Best regards,
Clara Motena
Clients Acquisition Director
Track-Med Billing Solutions
+1(615)482-6768
https://www.track-med.com
https://www.tmbds.com/schedule

## RULES:
- For leads with score >= 60 or billing/claims/denial-related intent signals: Alternate between Template A and Template B
- For leads with score < 60 or no billing signals (cold prospects): Use Template C
- Replace [Practice Name] with the lead's actual company/practice name
- Replace [Dr. Last Name / Practice Manager Name] with the lead's actual name
- Keep the full template content — do NOT shorten or summarize
- MUST end with the EXACT signature block above — no variations
` : "";

            try {
              const prompt = isMedBillUser
                ? `Generate personalized outreach email drafts for these leads using the Track-Med templates below. Each template already includes the proper signature — do NOT add any additional signature.\n${medBillTemplateInstructions}\n\nLeads:\n${leadsInfo}\n\nReturn ONLY a JSON array: [{"name":"exact lead name","outreach":"full email draft including subject line and signature from template"}]. No markdown, no explanation.`
                : `Generate personalized outreach email drafts (3-5 sentences each) for these leads. Reference their situation, mention a benefit, include a call-to-action.${bookingLink ? ` Include booking link: ${bookingLink}` : ""}\n\nEach email MUST end with this EXACT signature block:\n\nBest regards,\n${senderFullName}\n${senderTitle ? `${senderTitle}\n` : ""}${senderCompany}\n${senderPhone ? `${senderPhone}\n` : ""}${senderWebsite ? `${senderWebsite}\n` : ""}${bookingLink ? `${bookingLink}\n` : ""}\n\nLeads:\n${leadsInfo}\n\nReturn ONLY a JSON array: [{"name":"exact lead name","outreach":"email draft with signature"}]. No markdown, no explanation.`;

              const response = await outreachAi.client.messages.create({
                model: outreachAi.model,
                max_tokens: 4000,
                messages: [{ role: "user", content: prompt }],
              });

              const text = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map(b => b.text).join("");
              const jsonMatch = text.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                const drafts = JSON.parse(jsonMatch[0]);
                for (const draft of drafts) {
                  const matchingLead = needsOutreach.find(l => l.name.toLowerCase() === draft.name?.toLowerCase());
                  if (matchingLead && draft.outreach) {
                    await storage.updateLead(matchingLead.id, { outreach: draft.outreach });
                    readyToSend.push({ ...matchingLead, outreach: draft.outreach });
                    console.log(`[AutoEngage] Generated outreach for ${matchingLead.name}`);
                  }
                }
              }
            } catch (err) {
              console.error(`[AutoEngage] Outreach generation failed for ${user.email}:`, err);
            }
          }

          let sent = 0;
          let failed = 0;
          for (const lead of readyToSend) {
            try {
              const result = await sendOutreachEmail(lead, settings, user);
              if (result.success) {
                const followUpNextAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
                await storage.updateLead(lead.id, {
                  outreachSentAt: new Date(),
                  status: "warm",
                  followUpStep: 0,
                  followUpStatus: "active",
                  followUpNextAt,
                });
                sent++;
                console.log(`[AutoEngage] ✅ Sent to ${lead.name} (${lead.email})`);
              } else {
                failed++;
                console.log(`[AutoEngage] ❌ Failed for ${lead.name}: ${result.error}`);
              }
              await new Promise(r => setTimeout(r, 3000));
            } catch (err) {
              failed++;
              console.error(`[AutoEngage] Error sending to ${lead.name}:`, err);
            }
          }

          if (sent > 0 || failed > 0) {
            console.log(`[AutoEngage] ${user.email}: ${sent} sent, ${failed} failed out of ${readyToSend.length} hot leads`);
          }
        } catch (userErr) {
          console.error(`[AutoEngage] Error for user ${user.id}:`, userErr);
        }
      }
    } catch (error) {
      console.error("[AutoEngage] Fatal error in auto-engagement:", error);
    } finally {
      autoEngageRunning = false;
    }
  }

  setTimeout(processAutoHotLeadEngagement, 3 * 60 * 1000);
  setInterval(processAutoHotLeadEngagement, HOT_LEAD_INTERVAL);
  console.log("[AutoEngage] Auto-engagement scheduled — runs every 3 minutes as safety net. Leads with score >= 40 get outreach generated + sent automatically.");

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
Initial outreach was about: ${user.industry || "business"} services from ${user.companyName || "our company"}

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
      return await aiGenerate(prompt, "email", userClient);
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
    const fSigParts: string[] = [];
    const fFullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    if (fFullName) fSigParts.push(fFullName);
    if ((user as any).jobTitle) fSigParts.push((user as any).jobTitle);
    if (user.companyName) fSigParts.push(user.companyName);
    const fPhone = userSettings.grasshopperNumber || userSettings.twilioPhoneNumber || "";
    if (fPhone) fSigParts.push(fPhone);
    if (user.website) fSigParts.push(user.website);
    const fCalLink = userSettings.calendarLink || "";
    if (fCalLink) fSigParts.push(fCalLink);

    const fTextSig = fSigParts.length > 0 ? "\n\n--\n" + fSigParts.join("\n") : "";
    const fHtmlSig = fSigParts.length > 0
      ? `<br><br><div style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:16px;font-size:13px;color:#6b7280;">${fSigParts.map(p => p.startsWith("http") ? `<a href="${p}" style="color:#0ea5e9;">${p}</a>` : p.startsWith("Book a call:") ? `<a href="${p.replace("Book a call: ", "")}" style="color:#0ea5e9;">${p}</a>` : p).join("<br>")}</div>`
      : "";

    let htmlBody = emailBody.replace(/\n/g, "<br>") + fHtmlSig;
    htmlBody = wrapLinksForTracking(htmlBody, lead.id, baseUrl);
    htmlBody = injectTrackingPixel(htmlBody, lead.id, baseUrl);
    const fPlainText = emailBody + fTextSig;

    try {
      if (emailProvider === "smtp") {
        const transporter = nodemailer.createTransport({
          host: smtpHost, port: smtpPort, secure: smtpSecure,
          auth: { user: smtpUsername, pass: smtpPassword },
        });
        await transporter.sendMail({
          from: `"${senderName}" <${senderEmail}>`,
          to: lead.email, subject: subjectLine,
          text: fPlainText, html: htmlBody,
        });
      } else {
        sgMail.setApiKey(userSettings.sendgridApiKey);
        await sgMail.send({
          to: lead.email,
          from: { email: senderEmail, name: senderName },
          subject: subjectLine, text: fPlainText, html: htmlBody,
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
  // IMAP INBOX MONITOR — AI AUTO-REPLY TO LEAD RESPONSES
  // Checks inbox every 2 minutes, matches replies to leads,
  // generates intelligent AI responses via Claude, sends reply
  // ============================================================

  const inboxMonitorStatus = { lastCheck: null as Date | null, processing: false, repliesFound: 0, repliesSent: 0, errors: 0, lastError: null as string | null };

  async function checkInboxAndReply() {
    const imapHost = process.env.IMAP_HOST;
    const imapPort = process.env.IMAP_PORT ? parseInt(process.env.IMAP_PORT) : 993;
    const imapUser = process.env.SMTP_USERNAME;
    const imapPass = process.env.SMTP_PASSWORD;

    if (!imapHost || !imapUser || !imapPass) {
      console.log("[INBOX] IMAP not configured, skipping inbox check");
      return;
    }

    if (inboxMonitorStatus.processing) {
      console.log("[INBOX] Already processing, skipping");
      return;
    }

    inboxMonitorStatus.processing = true;
    console.log("[INBOX] Checking inbox for lead replies...");

    let client: any = null;
    try {
      const { ImapFlow } = await import("imapflow");
      client = new ImapFlow({
        host: imapHost,
        port: imapPort,
        secure: imapPort === 993,
        auth: { user: imapUser, pass: imapPass },
        logger: false,
      });

      await client.connect();
      const lock = await client.getMailboxLock("INBOX");

      try {
        const since = new Date();
        since.setHours(since.getHours() - 24);

        const unseenMessages = await client.search({ seen: false, since });
        if (!unseenMessages || unseenMessages.length === 0) {
          console.log("[INBOX] No new unread messages");
          inboxMonitorStatus.lastCheck = new Date();
          return;
        }

        console.log(`[INBOX] Found ${unseenMessages.length} unread messages`);

        const allUsers = await storage.getAllUsers();

        for (const uid of unseenMessages.slice(0, 10)) {
          try {
            const msg = await client.fetchOne(uid, { envelope: true, source: true });
            if (!msg?.envelope) continue;

            const fromEmail = msg.envelope.from?.[0]?.address?.toLowerCase();
            const subject = msg.envelope.subject || "";
            const messageId = msg.envelope.messageId || "";
            const inReplyTo = msg.envelope.inReplyTo || "";

            if (!fromEmail) continue;

            const existing = messageId ? await storage.getEmailReplyByMessageId(messageId) : null;
            if (existing) continue;

            const toAddresses = (msg.envelope.to || []).map((t: any) => t?.address?.toLowerCase()).filter(Boolean);
            const isToUs = toAddresses.some((addr: string) => addr === imapUser.toLowerCase());
            if (!isToUs) {
              continue;
            }

            let matchedLead = null;
            let matchedUser = null;

            for (const user of allUsers) {
              const userLeads = await storage.getLeadsByUser(user.id);
              const lead = userLeads.find(l =>
                l.email?.toLowerCase() === fromEmail &&
                l.outreachSentAt
              );
              if (lead) {
                matchedLead = lead;
                matchedUser = user;
                break;
              }
            }

            if (!matchedLead || !matchedUser) {
              console.log(`[INBOX] No matching lead for ${fromEmail}, skipping`);
              continue;
            }

            console.log(`[INBOX] Matched reply from ${fromEmail} to lead: ${matchedLead.name}`);
            inboxMonitorStatus.repliesFound++;

            let bodyText = "";
            if (msg.source) {
              const rawSource = msg.source.toString();
              const bodyStart = rawSource.indexOf("\r\n\r\n");
              if (bodyStart > -1) {
                bodyText = rawSource.substring(bodyStart + 4);
                bodyText = bodyText
                  .replace(/<[^>]*>/g, "")
                  .replace(/=\r?\n/g, "")
                  .replace(/=([0-9A-Fa-f]{2})/g, (_: string, hex: string) => String.fromCharCode(parseInt(hex, 16)))
                  .replace(/\r\n/g, "\n")
                  .trim();
                if (bodyText.length > 2000) bodyText = bodyText.substring(0, 2000);
              }
            }

            await storage.createEmailReply({
              leadId: matchedLead.id,
              userId: matchedUser.id,
              direction: "inbound",
              fromEmail: fromEmail,
              toEmail: imapUser,
              subject: subject,
              body: bodyText || "(Could not parse email body)",
              messageId: messageId,
              inReplyTo: inReplyTo,
              status: "received",
            });

            await storage.updateLead(matchedLead.id, {
              status: "contacted",
              engagementScore: Math.min((matchedLead.engagementScore || 0) + 40, 100),
              engagementLevel: "hot",
              lastEngagedAt: new Date(),
              nextStep: "Lead replied to outreach — AI auto-reply sent",
              followUpStatus: "completed",
            });

            const seqsStopped = await stopSequencesForLead(matchedLead.id, "replied");
            if (seqsStopped > 0) {
              console.log(`[INBOX] Auto-stopped ${seqsStopped} sequence(s) for ${matchedLead.name} after reply`);
            }

            await storage.createNotification({
              userId: matchedUser.id,
              title: `Reply from ${matchedLead.name}`,
              message: `${matchedLead.name} (${matchedLead.company || fromEmail}) replied to your outreach.${seqsStopped > 0 ? ` ${seqsStopped} active sequence(s) auto-stopped.` : ""} AI auto-reply has been sent.`,
              type: "lead_reply",
              read: false,
            });

            try {
              const userSettings = await storage.getSettingsByUser(matchedUser.id);
              const existingThread = await storage.getEmailRepliesByLead(matchedLead.id);

              const ai = await getAnthropicForUser(matchedUser.id);
              const senderFullName = `${matchedUser.firstName || ""} ${matchedUser.lastName || ""}`.trim();
              const senderTitle = (matchedUser as any)?.jobTitle || "";
              const senderCompany = matchedUser.companyName || "";
              const senderPhone = userSettings?.grasshopperNumber || userSettings?.twilioPhoneNumber || "";
              const senderWebsite = matchedUser.website || "";
              const calLink = userSettings?.calendarLink || "";

              const threadContext = existingThread
                .map(r => `[${r.direction === "inbound" ? "LEAD" : "US"}] ${r.body}`)
                .join("\n---\n");

              const aiResponse = await ai.client.messages.create({
                model: ai.model,
                max_tokens: 1000,
                messages: [{
                  role: "user",
                  content: `You are ${senderFullName}, ${senderTitle} at ${senderCompany}. A lead has replied to your outreach email. Write a professional, warm, and helpful reply.

LEAD INFO:
- Name: ${matchedLead.name}
- Company: ${matchedLead.company || "Unknown"}
- Original outreach: ${matchedLead.outreach || "N/A"}

THEIR REPLY:
${bodyText}

${threadContext ? `PREVIOUS CONVERSATION:\n${threadContext}\n` : ""}

INSTRUCTIONS:
- Be conversational, professional, and warm
- Answer any questions they asked
- Gently guide toward booking a call/meeting${calLink ? ` using this link: ${calLink}` : ""}
- Keep it concise (3-5 sentences max)
- End with this EXACT signature:

Best regards,
${senderFullName}
${senderTitle ? `${senderTitle}\n` : ""}${senderCompany}
${senderPhone ? `${senderPhone}\n` : ""}${senderWebsite ? `${senderWebsite}\n` : ""}${calLink ? `${calLink}\n` : ""}

Return ONLY the email reply text, no subject line, no markdown.`
                }],
              });

              const replyText = aiResponse.content
                .filter((b): b is Anthropic.TextBlock => b.type === "text")
                .map(b => b.text)
                .join("")
                .trim();

              if (replyText) {
                const smtpHost = userSettings?.smtpHost || process.env.SMTP_HOST;
                const smtpUsername = userSettings?.smtpUsername || process.env.SMTP_USERNAME;
                const smtpPassword = userSettings?.smtpPassword || process.env.SMTP_PASSWORD;
                const smtpPort = userSettings?.smtpPort || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587);
                const senderEmail = userSettings?.senderEmail || smtpUsername;
                const senderName = `${matchedUser.firstName || ""} from ${senderCompany}`.trim();

                const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
                const htmlReply = replyText.replace(/\n/g, "<br>");

                const transporter = nodemailer.createTransport({
                  host: smtpHost,
                  port: smtpPort,
                  secure: smtpPort === 465,
                  auth: { user: smtpUsername, pass: smtpPassword },
                });

                await transporter.sendMail({
                  from: `"${senderName}" <${senderEmail}>`,
                  to: fromEmail,
                  subject: replySubject,
                  text: replyText,
                  html: htmlReply,
                  inReplyTo: messageId,
                  references: messageId,
                });

                await storage.createEmailReply({
                  leadId: matchedLead.id,
                  userId: matchedUser.id,
                  direction: "outbound",
                  fromEmail: senderEmail || smtpUsername!,
                  toEmail: fromEmail,
                  subject: replySubject,
                  body: replyText,
                  messageId: null,
                  inReplyTo: messageId,
                  status: "sent",
                });

                inboxMonitorStatus.repliesSent++;
                console.log(`[INBOX] AI reply sent to ${fromEmail} for lead ${matchedLead.name}`);
              }
            } catch (aiErr: any) {
              console.error(`[INBOX] AI reply error for ${matchedLead.name}:`, aiErr?.message);
              inboxMonitorStatus.errors++;
              inboxMonitorStatus.lastError = aiErr?.message || "AI reply failed";
            }

            await client.messageFlagsAdd(uid, ["\\Seen"]);

          } catch (msgErr: any) {
            console.error("[INBOX] Error processing message:", msgErr?.message);
            inboxMonitorStatus.errors++;
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (err: any) {
      console.error("[INBOX] Inbox monitor error:", err?.message);
      inboxMonitorStatus.lastError = err?.message || "Connection failed";
      inboxMonitorStatus.errors++;
      if (client) try { await client.logout(); } catch {}
    } finally {
      inboxMonitorStatus.processing = false;
      inboxMonitorStatus.lastCheck = new Date();
      console.log(`[INBOX] Check complete. Replies found: ${inboxMonitorStatus.repliesFound}, sent: ${inboxMonitorStatus.repliesSent}`);
    }
  }

  setInterval(checkInboxAndReply, 2 * 60 * 1000);
  setTimeout(checkInboxAndReply, 30 * 1000);

  app.get("/api/inbox-monitor/status", isAuthenticated, (_req, res) => {
    res.json(inboxMonitorStatus);
  });

  app.post("/api/inbox-monitor/check-now", isAuthenticated, (_req, res) => {
    if (inboxMonitorStatus.processing) {
      return res.json({ message: "Already checking inbox...", status: "processing" });
    }
    checkInboxAndReply().catch(err => console.error("[INBOX] Manual check error:", err));
    res.json({ message: "Inbox check started", status: "processing" });
  });

  app.get("/api/leads/:id/replies", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const lead = await storage.getLeadById(req.params.id);
      if (!lead || lead.userId !== userId) {
        return res.status(404).json({ message: "Lead not found" });
      }
      const replies = await storage.getEmailRepliesByLead(lead.id);
      res.json(replies);
    } catch (err) {
      res.status(500).json({ message: "Failed to get replies" });
    }
  });

  // ============================================================
  // AUTOMATIC LEAD GENERATION (every 5 hours)
  // Uses AI to search for real leads based on the user's industry
  // and adds them to the CRM automatically
  // ============================================================

  const AUTO_LEAD_GEN_INTERVAL = 30 * 60 * 1000; // 30 minutes — fast discovery for all subscribers
  const AUTO_LEAD_GEN_BATCH_SIZE = 30;

  const LEAD_SEARCH_REGIONS = [
    "Tennessee", "Missouri", "Georgia", "Texas", "Florida", "Ohio",
    "North Carolina", "Illinois", "California", "Pennsylvania",
    "New York", "Virginia", "Michigan", "Arizona", "Colorado", "Washington",
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
        const sub = await storage.getSubscriptionByUser(user.id);
        if (!sub || (sub.status !== "active" && sub.status !== "trial")) continue;
        try {
          const ai = await getAnthropicForUser(user.id);
          eligibleUsers.push({ user, ai });
        } catch { continue; }
      }

      if (eligibleUsers.length === 0) {
        console.log("[Auto Lead Gen] No eligible users (need: enabled + active subscription + AI available)");
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
      const region = LEAD_SEARCH_REGIONS[autoLeadGenRotationIndex % LEAD_SEARCH_REGIONS.length];
      autoLeadGenRotationIndex++;

      const userIndustry = targetUser.industry || "business services";
      const userCompanyName = targetUser.companyName || "our company";
      const isMedBilling = /medical billing|rcm|revenue cycle/i.test(userIndustry);
      const searchIndustry = isMedBilling
        ? "healthcare providers medical practices doctors offices clinics hospitals needing medical billing RCM services"
        : userIndustry;

      console.log(`[Auto Lead Gen] Starting run for user ${targetUser.email} — ${region} — ${searchIndustry}`);

      const [autoGenSettings] = await db.select().from(userSettings).where(eq(userSettings.userId, targetUser.id));
      const autoGenBookingLink = autoGenSettings?.calendarLink || "";
      const autoGenPhone = autoGenSettings?.grasshopperNumber || autoGenSettings?.twilioPhoneNumber || "";

      const [runRecord] = await db.insert(autoLeadGenRuns).values({
        userId: targetUser.id,
        status: "running",
        searchQueries: `${region}: ${searchIndustry}`,
        startedAt: new Date(),
      }).returning();

      const userAnthropicClient = userAi.client;
      const userModelName = userAi.model;

      const medBillingContext = isMedBilling ? `
INDUSTRY FOCUS: Medical Billing & Revenue Cycle Management (RCM) ONLY.
You are finding HEALTHCARE PROVIDERS who need medical billing and RCM services — these are your BUYERS.

TARGET PROSPECTS (who to find):
- Medical practices, physician offices, doctor's offices
- Specialty clinics (dermatology, cardiology, orthopedics, pediatrics, OB/GYN, etc.)
- Urgent care centers, walk-in clinics
- Outpatient surgery centers, ambulatory surgical centers
- Small hospitals, community health centers, FQHCs
- Mental health / behavioral health practices
- Physical therapy, chiropractic, dental offices
- Home health agencies, hospice providers
- Independent physician groups, medical groups

DO NOT TARGET (these are competitors, not buyers):
- Other medical billing companies
- RCM service providers
- Healthcare IT companies that sell billing software
- Insurance companies, payers, clearinghouses

SEARCH TERMS TO USE:
- "medical practice ${region} contact", "doctor office ${region} phone email"
- "physician ${region} practice owner", "clinic ${region} owner director"
- "healthcare provider ${region} contact information"
- "new medical practice ${region}", "physician opening practice ${region}"
` : "";

      const autoGenPrompt = `You are an automated lead hunter for ${userCompanyName} (industry: ${userIndustry}). Your ONLY job is to find ${AUTO_LEAD_GEN_BATCH_SIZE} REAL businesses in ${region} that could be potential clients.
${medBillingContext}
TASK: Find ${AUTO_LEAD_GEN_BATCH_SIZE} businesses in ${region} that match the user's target market for ${searchIndustry}.

CRITICAL: Find businesses that would BUY from ${userCompanyName}, NOT competitors who sell similar services.

SEARCH STRATEGY:
1. Use web_search to find REAL businesses related to ${searchIndustry} in ${region}:
   - Search "[industry keyword] ${region}" and "[business type] ${region} contact"
2. For each business found, do follow-up searches for the DECISION MAKER (Owner, CEO, Director):
   - "[business name] owner" or "[business name] CEO" or "[business name] director"
3. Then search for their real contact info:
   - "[business name] phone number" and "[business name] contact email"
   - Check Google Maps, Yelp, BBB, company website contact page
4. ONLY save businesses where you found REAL, verified contact information

DECISION MAKER TARGETING:
- Target: CEO, Founder, Owner, President, Director, VP, Partner, Managing Director${isMedBilling ? ", Practice Administrator, Office Manager, Billing Manager" : ""}
- NEVER target receptionists, front desk staff, assistants, or coordinators

CONTACT INFO RULES (MANDATORY):
- ONLY include contact info you actually found on a real website, directory, or contact page
- NEVER fabricate or guess emails — only use what you SAW in search results
- NEVER use @example.com, @test.com, or placeholder domains
- NEVER use 555-xxx-xxxx phone numbers — those are fictional
- Phone numbers MUST be FULL US numbers with area code (10 digits)
- Each lead MUST have BOTH a real phone number AND a real email from actual webpages — leads missing either are REJECTED

SCORING:
- Business actively looking for services like ${searchIndustry}: score 85+
- New business (< 1 year old): score 75+
- Small business (< 50 employees): score 70+
- Decision maker (owner/CEO/director) found with direct contact: +25
- Shows intent signals (hiring, complaints, RFPs): +15

For EACH lead provide: name (decision maker), email, phone, company, address (physical street address, city, state, zip — extract from Google Maps, Yelp, BBB, or website), source ("Auto Lead Gen — ${region}"), status "new", score (40-95), intent_signal (why they're a good prospect), notes (role + company details + where contact info was found), outreach (personalized 3-5 sentence email about how ${userCompanyName} can help them). EVERY outreach email MUST end with this EXACT multi-line signature block (copy verbatim, each field on its own line):

Best regards,
${targetUser.firstName || ""} ${targetUser.lastName || ""}
${(targetUser as any).jobTitle || ""}
${userCompanyName}
${autoGenPhone}
${targetUser.website || ""}
${autoGenBookingLink}

NEVER shorten or omit lines from the signature. Each field gets its own line.

CRITICAL: You MUST call generate_leads with ALL leads in a single call. Use agent_type="lead-gen". Do NOT just describe leads — SAVE them with the tool.`;

      const tavilyKey2 = process.env.TAVILY_API_KEY;
      let autoGenSearchResults = "";
      if (tavilyKey2 && Date.now() > tavilyRateLimitedUntil) {
        try {
          const tRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: tavilyKey2,
              query: `${searchIndustry} ${region} owner CEO contact phone email`,
              search_depth: "advanced",
              max_results: 10,
              include_answer: true,
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (tRes.ok) {
            const tData = await tRes.json();
            autoGenSearchResults = [
              tData.answer || "",
              ...(tData.results || []).map((r: any) => `Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`)
            ].join("\n\n");
          } else {
            const errData = await tRes.json().catch(() => ({})) as any;
            console.error(`[Auto Lead Gen] Tavily error (${tRes.status}):`, JSON.stringify(errData).slice(0, 200));
            if (tRes.status === 429 || tRes.status === 432) {
              tavilyRateLimitedUntil = Date.now() + 30 * 60 * 1000;
              console.log(`[Auto Lead Gen] Tavily rate-limited — skipping for 30 min`);
            }
          }
        } catch (e: any) {
          console.error("Tavily search error:", e.message);
        }
      } else if (tavilyKey2) {
        console.log("[Auto Lead Gen] Tavily rate-limited — using fallbacks");
      } else {
        console.warn("[Auto Lead Gen] No TAVILY_API_KEY — trying DuckDuckGo...");
      }

      if (!autoGenSearchResults.trim()) {
        try {
          const ddgResults = await searchDDG(`${searchIndustry} ${region} owner contact`, 10);
          if (ddgResults.length > 0) {
            autoGenSearchResults = ddgResults.map(r => `Source: ${r.url}\nTitle: ${r.title}\n${r.snippet || ""}`).join("\n\n");
            console.log(`[Auto Lead Gen] DuckDuckGo provided ${ddgResults.length} results for ${targetUser.email}`);
          }
        } catch (ddgErr: any) {
          console.error("[Auto Lead Gen] DuckDuckGo error:", ddgErr?.message);
        }
      }

      if (!autoGenSearchResults.trim()) {
        try {
          const bingResults = await searchBing(`${searchIndustry} ${region} contact`, 10);
          if (bingResults.length > 0) {
            autoGenSearchResults = bingResults.map(r => `Source: ${r.url}\nTitle: ${r.title}\n${r.snippet || ""}`).join("\n\n");
            console.log(`[Auto Lead Gen] Bing provided ${bingResults.length} results for ${targetUser.email}`);
          }
        } catch (bingErr: any) {
          console.error("[Auto Lead Gen] Bing error:", bingErr?.message);
        }
      }

      const autoGenSystemPrompt = autoGenSearchResults
        ? `Use the following web search results to find real leads with verified contact information:\n\n${autoGenSearchResults}`
        : "";

      const tools: any[] = [
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
                    address: { type: "string" as const, description: "Physical address of the business (street, city, state, zip)" },
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
        {
          name: "web_search",
          description: "Search the web for business information, decision makers, and contact details.",
          input_schema: {
            type: "object" as const,
            properties: {
              query: { type: "string" as const },
            },
            required: ["query"],
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
        ...(autoGenSystemPrompt ? { system: autoGenSystemPrompt } : {}),
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

        const toolResults: any[] = [];

        for (const toolUse of toolUseBlocks) {
          if (toolUse.name === "web_search") {
            try {
              let webResult = "";
              const searchQuery = toolUse.input?.query || "";
              if (tavilyKey2 && Date.now() > tavilyRateLimitedUntil) {
                try {
                  const tRes = await fetch("https://api.tavily.com/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      api_key: tavilyKey2,
                      query: searchQuery,
                      search_depth: "advanced",
                      max_results: 5,
                      include_answer: true,
                    }),
                    signal: AbortSignal.timeout(15000),
                  });
                  if (tRes.ok) {
                    const tData = await tRes.json();
                    webResult = [
                      tData.answer || "",
                      ...(tData.results || []).map((r: any) => `Source: ${r.url}\n${r.title}\n${r.content || ""}`)
                    ].join("\n\n");
                  } else if (tRes.status === 429 || tRes.status === 432) {
                    tavilyRateLimitedUntil = Date.now() + 30 * 60 * 1000;
                  }
                } catch {}
              }
              if (!webResult.trim()) {
                const ddgResults = await searchDDG(searchQuery, 8);
                if (ddgResults.length > 0) {
                  webResult = ddgResults.map(r => `Source: ${r.url}\nTitle: ${r.title}\n${r.snippet || ""}`).join("\n\n");
                }
              }
              if (!webResult.trim()) {
                const bingResults = await searchBing(searchQuery, 8);
                if (bingResults.length > 0) {
                  webResult = bingResults.map(r => `Source: ${r.url}\nTitle: ${r.title}\n${r.snippet || ""}`).join("\n\n");
                }
              }
              toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: webResult || "No results found." });
            } catch (e: any) {
              toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: `Search error: ${e.message}` });
            }
          } else {
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
          content: `You MUST now call the generate_leads tool with all the leads you found. Do NOT just describe them in text. Call the tool NOW with an array of lead objects. Each lead needs: name, email, phone, company, source ("Auto Lead Gen"), status "new", score, intent_signal, notes, outreach. Use agent_type="lead-gen". CRITICAL: Every email and phone number MUST be real and verified from your web search results. NEVER fabricate contacts. NEVER use @example.com, @test.com, or 555 phone numbers. If you don't have real contact info for a lead, skip that lead entirely.`,
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

      console.log(`[Auto Lead Gen] Completed for ${targetUser.email}: ${leadsGenerated} leads generated for ${region}`);

      if (leadsGenerated > 0) {
        await storage.createNotification({
          userId: targetUser.id,
          type: "lead",
          title: "New Leads Discovered",
          message: `Found ${leadsGenerated} new leads in ${region} for ${userCompanyName}. Outreach being sent now.`,
          read: false,
        });

        try {
          const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, targetUser.id));
          if (settings && settings.autoLeadGenEnabled) {
            const hasSendCapability = !!(
              ((settings as any).senderEmail || process.env.SMTP_USERNAME) &&
              (((settings as any).smtpHost && (settings as any).smtpUsername && (settings as any).smtpPassword) ||
               (process.env.SMTP_HOST && process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD) ||
               (settings as any).sendgridApiKey)
            );

            if (hasSendCapability) {
              const runSource = `Auto Lead Gen — ${region}`;
              const runStartTime = runRecord.startedAt || new Date(Date.now() - 30 * 60 * 1000);
              const newLeads = await db.select().from(leads)
                .where(and(
                  eq(leads.userId, targetUser.id),
                  isNull(leads.outreachSentAt),
                  sql`${leads.email} IS NOT NULL AND ${leads.email} != ''`,
                  sql`${leads.outreach} IS NOT NULL AND ${leads.outreach} != ''`,
                  sql`${leads.createdAt} >= ${runStartTime}`,
                  sql`${leads.source} LIKE 'Auto Lead Gen%'`
                ));

              if (newLeads.length > 0) {
                console.log(`[Auto Lead Gen] Instant outreach: sending to ${newLeads.length} new leads for ${targetUser.email}...`);
                let sent = 0, failed = 0;
                for (const lead of newLeads) {
                  try {
                    const claimResult = await db.update(leads)
                      .set({ outreachSentAt: new Date() })
                      .where(and(eq(leads.id, lead.id), isNull(leads.outreachSentAt)))
                      .returning({ id: leads.id });
                    if (!claimResult.length) continue;

                    const result = await sendOutreachEmail(lead, settings, targetUser);
                    if (result.success) {
                      sent++;
                      await db.update(leads).set({
                        status: "contacted",
                        followUpStep: 0,
                        followUpStatus: "active",
                        followUpNextAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                      }).where(eq(leads.id, lead.id));
                      try {
                        await logEmail({ userId: targetUser.id, leadId: lead.id, recipientEmail: lead.email, recipientName: lead.name, subject: `Quick question for ${lead.company || lead.name}`, status: "sent", provider: "smtp", source: "auto-lead-gen-instant" });
                      } catch {}
                    } else {
                      failed++;
                      await db.update(leads).set({ outreachSentAt: null }).where(eq(leads.id, lead.id));
                      try {
                        await logEmail({ userId: targetUser.id, leadId: lead.id, recipientEmail: lead.email, recipientName: lead.name, subject: `Quick question for ${lead.company || lead.name}`, status: "failed", provider: "smtp", source: "auto-lead-gen-instant", errorMessage: result.error });
                      } catch {}
                    }
                    await new Promise(r => setTimeout(r, 2000));
                  } catch (emailErr: any) {
                    failed++;
                    await db.update(leads).set({ outreachSentAt: null }).where(eq(leads.id, lead.id));
                  }
                }
                if (sent > 0) {
                  console.log(`[Auto Lead Gen] Instant outreach: ${sent} sent, ${failed} failed for ${targetUser.email}`);
                  await storage.createNotification({
                    userId: targetUser.id,
                    type: "email",
                    title: "Instant Outreach Sent",
                    message: `Automatically sent ${sent} outreach email${sent > 1 ? 's' : ''} to new leads in ${region}.`,
                    read: false,
                  });
                }
              }
            }
          }
        } catch (outreachErr: any) {
          console.error(`[Auto Lead Gen] Instant outreach error for ${targetUser.email}:`, outreachErr.message);
        }
      }

    } catch (error: any) {
      console.error(`[Auto Lead Gen] Error for user ${targetUser.email}:`, error?.message);
    }
  }

  setTimeout(() => {
    runAutoLeadGeneration().catch(err => console.error("[Auto Lead Gen] Initial run error:", err));
    setInterval(() => {
      runAutoLeadGeneration().catch(err => console.error("[Auto Lead Gen] Scheduled run error:", err));
    }, AUTO_LEAD_GEN_INTERVAL);
  }, 4 * 60 * 1000);
  console.log("[Auto Lead Gen] Scheduled to run every 30 minutes for ALL subscribers. First run in 4 minutes.");

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
        intervalMinutes: 30,
        batchSize: AUTO_LEAD_GEN_BATCH_SIZE,
        totalLeadsGenerated: totalLeads,
        runs,
        nextRegion: LEAD_SEARCH_REGIONS[autoLeadGenRotationIndex % LEAD_SEARCH_REGIONS.length],
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

  // ---- MEDICAL BILLING LEAD GEN (Hourly for abel@argilette.com) ----
  const MEDBILL_LEAD_GEN_INTERVAL = 20 * 60 * 1000; // 20 minutes — fast discovery for hot leads
  const MEDBILL_LEAD_GEN_BATCH = 20;
  const MEDBILL_USER_EMAIL = "abel@argilette.com";

  const MEDBILL_REGIONS = [
    "Tennessee", "Texas", "Florida", "Georgia", "California",
    "New York", "Ohio", "Illinois", "Pennsylvania", "North Carolina",
    "Virginia", "Michigan", "Arizona", "Colorado", "Missouri",
    "Washington", "Maryland", "New Jersey", "Massachusetts", "Indiana",
  ];
  let medBillRegionIndex = 0;

  const MEDBILL_SPECIALTIES = [
    "mental health", "chiropractic", "pain management", "urgent care",
    "physical therapy", "podiatry", "home health", "family medicine",
    "internal medicine", "dermatology", "orthopedics", "cardiology",
  ];
  let medBillSpecialtyIndex = 0;

  async function runMedBillLeadGen() {
    try {
      const allUsers = await storage.getAllUsers();
      const targetUser = allUsers.find((u: any) => u.email === MEDBILL_USER_EMAIL);
      if (!targetUser) {
        console.log("[MedBill Lead Gen] Target user not found, skipping");
        return;
      }

      const sub = await storage.getSubscriptionByUser(targetUser.id);
      if (!sub || (sub.status !== "active" && sub.status !== "trial")) {
        console.log("[MedBill Lead Gen] No active subscription, skipping");
        return;
      }

      let userAi: { client: Anthropic; model: string };
      try {
        userAi = await getAnthropicForUser(targetUser.id);
      } catch {
        console.log("[MedBill Lead Gen] AI not configured for user, skipping");
        return;
      }

      const region = MEDBILL_REGIONS[medBillRegionIndex % MEDBILL_REGIONS.length];
      const specialty = MEDBILL_SPECIALTIES[medBillSpecialtyIndex % MEDBILL_SPECIALTIES.length];
      medBillRegionIndex++;
      medBillSpecialtyIndex++;

      console.log(`[MedBill Lead Gen] Starting hourly run — ${region} — ${specialty}`);

      const [runRecord] = await db.insert(autoLeadGenRuns).values({
        userId: targetUser.id,
        status: "running",
        searchQueries: `MedBill: ${specialty} in ${region}`,
        startedAt: new Date(),
      }).returning();

      const medBillPrompt = `You are a specialized B2B lead generation agent for Track-Med Billing Solutions, a Revenue Cycle Management (RCM) company. Your job is to identify and qualify medical practices that are either ACTIVELY seeking medical billing services or LIKELY to need them.

CURRENT TARGET: Find ${MEDBILL_LEAD_GEN_BATCH} medical practices in ${region} specializing in ${specialty}.

## LEAD TIERS

**TIER 1 — ACTIVELY LOOKING (Hot Leads)** — practices showing direct signals:
- Posted job listings for billing specialists, medical coders, or RCM staff
- Posted on forums asking for billing service recommendations
- Reviews/complaints about billing on Google, Yelp, Healthgrades ("billing errors", "slow payments", "wrong codes")
- Advertised for in-house billing roles (frustrated or transitioning)
- Recent ownership changes, new practice openings, or physician departures

**TIER 2 — LIKELY TO NEED (Warm Leads)** — matching struggle profiles:
- Solo practitioners or small group practices (1–5 providers)
- Complex billing specialties: ${specialty}
- Low Google ratings citing billing/insurance issues
- Recently credentialed providers (new practice = billing needed)
- Rural/underserved areas with limited admin staff
- Multi-location practices without centralized billing

**TIER 3 — COLD PROSPECTS (Small Practices)** — no expressed billing issues, but high potential:
- Small practices with 1–10 providers in ${specialty}
- Likely handling billing in-house or using outdated systems
- Any independent/private practice — they ALL need billing help even if they don't know it yet
- New practices, recently opened or expanding
- Practices found in directories, Google Maps, NPI Registry without any billing-related signals
- These get a SOFTER introductory outreach (Template C below)

## DECISION MAKER TARGETING (MANDATORY)
- You MUST find the DECISION MAKER for each practice: Owner, CEO, Managing Partner, Practice Administrator, Office Manager, Medical Director
- NEVER target receptionists, front desk staff, billing clerks, or assistants
- For each lead, identify the person who has authority to sign a billing services contract
- Search for "[practice name] owner" or "[practice name] administrator" or check LinkedIn

## DATA TO COLLECT PER LEAD
1. Practice Name
2. Decision Maker Name + Title (Owner/CEO/Administrator/Director)
3. Specialty
4. City/State
5. Phone Number (real, verified)
6. Email Address (real, verified — NOT fabricated)
7. Website URL
8. Google Rating + Number of Reviews
9. Tier Classification (Tier 1 or Tier 2)
10. Lead Signal (specific evidence that flagged this lead)
11. Outreach Angle (personalized hook for cold outreach)

## SEARCH STRATEGY
1. Use web_search to find "${specialty} practices ${region}" and "${specialty} doctor ${region} contact"
2. For each practice, search for the decision maker: "[practice name] owner" or "[practice name] administrator"
3. Search for real contact info: "[practice name] phone email contact"
4. Check Google Maps, Yelp, Healthgrades, NPI Registry for verified data

## CONTACT INFO RULES (MANDATORY)
- ONLY include contact info you actually found on a real website, directory, or contact page
- NEVER fabricate or guess emails — only use what you SAW in search results
- NEVER use @example.com, @test.com, or placeholder domains
- NEVER use 555-xxx-xxxx phone numbers — those are fictional
- Phone numbers MUST be FULL US numbers with area code (10 digits)
- Each lead MUST have a real phone number from actual webpages

## SCORING
- Practice actively posting for billing help (Tier 1): score 85-95
- Practice matching struggle profile (Tier 2): score 65-80
- Cold prospect small practice (Tier 3): score 40-60
- Decision maker found with direct contact: +15 bonus
- Multiple lead signals: +10 bonus
- Has billing-related complaints in reviews: +10 bonus

For EACH lead provide: name (DECISION MAKER name, not practice name), email, phone, company (practice name), address (physical street address, city, state, zip — extract from Google Maps, Yelp, or website), source ("MedBill Lead Gen — ${region} — ${specialty}"), status "new", score (40-95), intent_signal (tier + why they need billing help), notes (decision maker title + specialty + practice details + where contact was found + practice size if known), outreach (use the appropriate template based on the lead's tier):

## TEMPLATE SELECTION RULES:
- **Tier 1 (Hot) and Tier 2 (Warm) leads**: Alternate between Template A and Template B
- **Tier 3 (Cold Prospect) leads**: ALWAYS use Template C — the softer introduction

**TEMPLATE A — Subject: Are billing errors costing [Practice Name] money? — Free Analysis Inside**
Hi [Dr. Last Name / Practice Manager Name],
I wanted to reach out because practices like yours often leave significant revenue on the table — not from lack of patients, but from inaccurate coding, delayed claims, and missed reimbursements.
At Track-Med Billing Solutions, we specialize in helping medical and dental practices improve cash flow and reduce billing overhead through fully personalized Revenue Cycle Management. And right now, we're offering a complimentary CPT and Billing Cost Analysis — at no cost or obligation to you.
Here's what we'll cover:
• A detailed review of your current billing and coding accuracy
• Identification of revenue leakage points in your claims process
• A clear picture of what you could be collecting vs. what you currently are
On top of that, practices that partner with us receive free access to state-of-the-art Practice Management Software — a value-add that our clients love from day one.
We also handle Physician Credentialing, Electronic Fund Transfer, RAC Audit Protection (MD Audit Shield), and HIPAA-compliant Document Management — so you can focus on what matters most: your patients.
This analysis takes less than 30 minutes and could uncover thousands in recoverable revenue. Would you be open to a brief call this week to get started?
Best regards,
Clara Motena
Clients Acquisition Director
Track-Med Billing Solutions
+1(615)482-6768
https://www.track-med.com
https://www.tmbds.com/schedule

**TEMPLATE B — Subject: Still dealing with denied claims and slow reimbursements, [Practice Name]?**
Hi [Dr. Last Name / Practice Manager],
Denied claims, slow reimbursements, and billing staff turnover are among the biggest revenue killers for independent practices today — and most providers don't realize how much it's truly costing them.
Track-Med Billing Solutions was built to fix exactly that.
We provide end-to-end Revenue Cycle Management tailored to your specialty — from clean claim submission and payment posting to credentialing, RAC audit defense, and patient balance collections. We've helped practices significantly reduce their days in A/R and recover revenue they didn't even know they were missing.
What sets us apart:
✔ Personalized billing teams aligned to your specialty
✔ Free Practice Management Software when you use our billing services
✔ Free CPT & Billing Cost Analysis — so you see the ROI before you commit
✔ Physician Credentialing included
✔ HIPAA-compliant systems across the board
Our free analysis alone gives you a detailed breakdown of any revenue loss due to coding or billing errors. No pressure, no commitment — just real data about your practice's financial health.
Can we carve out 20 minutes this week? I'd love to show you what we're seeing in practices similar to yours.
Best regards,
Clara Motena
Clients Acquisition Director
Track-Med Billing Solutions
+1(615)482-6768
https://www.track-med.com
https://www.tmbds.com/schedule

**TEMPLATE C — Subject: A quick introduction from Track-Med Billing Solutions, [Practice Name]**
Hi [Dr. Last Name / Practice Manager Name],
I hope this finds you well. My name is Clara Motena and I work with independent ${specialty} practices like [Practice Name] to help streamline their revenue cycle — so providers can spend more time with patients and less time chasing payments.
Track-Med Billing Solutions provides fully personalized medical billing and Revenue Cycle Management, and we've found that many small to mid-size practices don't realize how much revenue they're leaving on the table until they see the numbers.
That's why we're offering a free, no-obligation CPT & Billing Cost Analysis. In less than 30 minutes, we can show you:
• Whether your current coding is maximizing your reimbursements
• Where claims may be getting delayed or denied unnecessarily
• A clear comparison of what you're collecting vs. what you could be
We also include free Practice Management Software for practices that partner with us, plus Physician Credentialing, RAC Audit Protection, and HIPAA-compliant document management — all built in.
There's absolutely no cost or commitment to see what we find. Would you be open to a brief conversation this week?
Best regards,
Clara Motena
Clients Acquisition Director
Track-Med Billing Solutions
+1(615)482-6768
https://www.track-med.com
https://www.tmbds.com/schedule

IMPORTANT: Include the FULL template text — do NOT shorten. Replace [Practice Name] and [Dr. Last Name] with actual lead info. Include the subject line at the top as "Subject: ...". For Tier 3 leads, ALWAYS use Template C.

LEAD MIX TARGET: Aim for approximately 60% Tier 1/2 (hot/warm) and 40% Tier 3 (cold prospects). This ensures a healthy pipeline of both immediate opportunities and future prospects.

CRITICAL: You MUST call generate_leads with ALL leads in a single call. Use agent_type="medical-billing". Do NOT just describe leads — SAVE them with the tool. Prioritize quality over quantity — 15 strong leads with real decision-maker contacts beat 30 weak ones.`;

      const tavilyKey = process.env.TAVILY_API_KEY;
      let searchResults = "";
      if (tavilyKey && Date.now() > tavilyRateLimitedUntil) {
        try {
          const searchQueries = [
            `${specialty} medical practice ${region} owner contact phone email`,
            `${specialty} doctor office ${region} billing services needed`,
            `small ${specialty} practice ${region} private independent physician office`,
          ];
          for (const sq of searchQueries) {
            const tRes = await fetch("https://api.tavily.com/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                api_key: tavilyKey,
                query: sq,
                search_depth: "advanced",
                max_results: 8,
                include_answer: true,
              }),
              signal: AbortSignal.timeout(15000),
            });
            if (tRes.ok) {
              const tData = await tRes.json();
              searchResults += [
                tData.answer || "",
                ...(tData.results || []).map((r: any) => `Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`)
              ].join("\n\n") + "\n\n";
            } else if (tRes.status === 429 || tRes.status === 432) {
              tavilyRateLimitedUntil = Date.now() + 30 * 60 * 1000;
              console.log(`[MedBill Lead Gen] Tavily rate-limited — skipping for 30 min`);
              break;
            }
          }
        } catch (e: any) {
          console.error("[MedBill Lead Gen] Tavily search error:", e.message);
        }
      } else if (tavilyKey) {
        console.log("[MedBill Lead Gen] Tavily rate-limited — using fallbacks");
      }

      if (!searchResults.trim()) {
        console.log("[MedBill Lead Gen] Tavily failed, trying DuckDuckGo free fallback...");
        try {
          const ddgQueries = [
            `${specialty} medical practice ${region} owner contact`,
            `small ${specialty} practice ${region} independent physician`,
            `${specialty} doctor office ${region} phone email`,
          ];
          for (const sq of ddgQueries) {
            const ddgResults = await searchDDG(sq, 8);
            if (ddgResults.length > 0) {
              searchResults += ddgResults.map(r => `Source: ${r.url}\nTitle: ${r.title}\n${r.snippet || ""}`).join("\n\n") + "\n\n";
            }
          }
          if (searchResults.trim()) {
            console.log(`[MedBill Lead Gen] DuckDuckGo provided search results`);
          }
        } catch (ddgErr: any) {
          console.error("[MedBill Lead Gen] DuckDuckGo error:", ddgErr?.message);
        }
      }

      if (!searchResults.trim()) {
        console.log("[MedBill Lead Gen] DDG failed too, trying Bing fallback...");
        try {
          const bingQueries = [
            `${specialty} medical practice ${region} contact`,
            `${specialty} doctor office ${region} phone email`,
          ];
          for (const sq of bingQueries) {
            const bingResults = await searchBing(sq, 8);
            if (bingResults.length > 0) {
              searchResults += bingResults.map(r => `Source: ${r.url}\nTitle: ${r.title}\n${r.snippet || ""}`).join("\n\n") + "\n\n";
            }
          }
          if (searchResults.trim()) {
            console.log(`[MedBill Lead Gen] Bing provided search results`);
          }
        } catch (bingErr: any) {
          console.error("[MedBill Lead Gen] Bing error:", bingErr?.message);
        }
      }

      const systemPrompt = searchResults
        ? `Use these web search results to find real medical practice leads with verified decision-maker contacts:\n\n${searchResults}`
        : "";

      const tools: any[] = [
        {
          name: "generate_leads",
          description: "Save medical billing leads to CRM. Pass all leads at once.",
          input_schema: {
            type: "object" as const,
            properties: {
              leads: {
                type: "array" as const,
                items: {
                  type: "object" as const,
                  properties: {
                    name: { type: "string" as const, description: "Decision maker name (Owner/CEO/Administrator)" },
                    email: { type: "string" as const },
                    phone: { type: "string" as const },
                    company: { type: "string" as const, description: "Practice name" },
                    address: { type: "string" as const, description: "Physical address of the practice (street, city, state, zip)" },
                    source: { type: "string" as const },
                    status: { type: "string" as const },
                    score: { type: "number" as const },
                    intent_signal: { type: "string" as const },
                    notes: { type: "string" as const },
                    outreach: { type: "string" as const },
                  },
                  required: ["name", "company"],
                },
              },
              agent_type: { type: "string" as const },
            },
            required: ["leads"],
          },
        },
        {
          name: "web_search",
          description: "Search the web for medical practice information, decision makers, and contact details.",
          input_schema: {
            type: "object" as const,
            properties: {
              query: { type: "string" as const },
            },
            required: ["query"],
          },
        },
      ];

      const userAnthropicClient = userAi.client;
      const userModelName = userAi.model;

      async function medBillClaudeCall(params: any, retries = 3): Promise<any> {
        for (let i = 0; i < retries; i++) {
          try {
            return await userAnthropicClient.messages.create(params);
          } catch (err: any) {
            if (err?.status === 429 && i < retries - 1) {
              const wait = Math.min((i + 1) * 30000, 90000);
              console.log(`[MedBill Lead Gen] Rate limited, waiting ${wait / 1000}s...`);
              await new Promise(r => setTimeout(r, wait));
            } else { throw err; }
          }
        }
      }

      let response = await medBillClaudeCall({
        model: userModelName,
        max_tokens: 4096,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: "user", content: medBillPrompt }],
        tools,
      });

      let loopCount = 0;
      const maxLoops = 15;
      let currentMessages: any[] = [{ role: "user", content: medBillPrompt }];
      let leadsGenerated = 0;

      while (response.stop_reason === "tool_use" && loopCount < maxLoops) {
        loopCount++;
        currentMessages.push({ role: "assistant", content: response.content });

        const toolUseBlocks = response.content.filter((block: any) => block.type === "tool_use");
        const toolResults: any[] = [];

        for (const toolUse of toolUseBlocks) {
          if (toolUse.name === "web_search") {
            try {
              let webResult = "";
              const searchQ = toolUse.input?.query || "";
              if (tavilyKey && Date.now() > tavilyRateLimitedUntil) {
                try {
                  const tRes = await fetch("https://api.tavily.com/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      api_key: tavilyKey,
                      query: searchQ,
                      search_depth: "advanced",
                      max_results: 5,
                      include_answer: true,
                    }),
                    signal: AbortSignal.timeout(15000),
                  });
                  if (tRes.ok) {
                    const tData = await tRes.json();
                    webResult = [
                      tData.answer || "",
                      ...(tData.results || []).map((r: any) => `Source: ${r.url}\n${r.title}\n${r.content || ""}`)
                    ].join("\n\n");
                  } else if (tRes.status === 429 || tRes.status === 432) {
                    tavilyRateLimitedUntil = Date.now() + 30 * 60 * 1000;
                  }
                } catch {}
              }
              if (!webResult.trim()) {
                const ddgResults = await searchDDG(searchQ, 8);
                if (ddgResults.length > 0) {
                  webResult = ddgResults.map(r => `Source: ${r.url}\nTitle: ${r.title}\n${r.snippet || ""}`).join("\n\n");
                }
              }
              if (!webResult.trim()) {
                const bingResults = await searchBing(searchQ, 8);
                if (bingResults.length > 0) {
                  webResult = bingResults.map(r => `Source: ${r.url}\nTitle: ${r.title}\n${r.snippet || ""}`).join("\n\n");
                }
              }
              toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: webResult || "No results found." });
            } catch (e: any) {
              toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: `Search error: ${e.message}` });
            }
          } else {
            try {
              const result = await executeAction(targetUser.id, toolUse.name, toolUse.input || {});
              console.log(`[MedBill Lead Gen] ${toolUse.name}: ${result.slice(0, 150)}`);
              const match = result.match(/Saved (\d+) real leads/);
              if (match) leadsGenerated += parseInt(match[1]);
              toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
            } catch (err: any) {
              toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: `ERROR: ${err?.message}`, is_error: true });
            }
          }
        }

        if (toolResults.length > 0) {
          currentMessages.push({ role: "user", content: toolResults });
        }

        response = await medBillClaudeCall({
          model: userModelName,
          max_tokens: 4096,
          messages: currentMessages,
          tools,
        });
      }

      if (leadsGenerated === 0 && loopCount < maxLoops) {
        console.log("[MedBill Lead Gen] No leads yet, forcing generate_leads call...");
        currentMessages.push({ role: "assistant", content: response.content as any });
        currentMessages.push({
          role: "user",
          content: `You MUST now call the generate_leads tool with all the medical practice leads you found. Each lead needs the DECISION MAKER name (Owner, CEO, Administrator), email, phone, company (practice name), address (physical street address, city, state, zip), source "MedBill Lead Gen", status "new", score, intent_signal, notes (title + specialty), outreach. Use agent_type="medical-billing". NEVER fabricate contacts. Skip leads without real verified contact info.`,
        });

        let retryResp = await medBillClaudeCall({
          model: userModelName,
          max_tokens: 4096,
          messages: currentMessages,
          tools,
        });

        let retryLoops = 0;
        let retryCurrent = [...currentMessages];
        while (retryResp.stop_reason === "tool_use" && retryLoops < 5) {
          retryLoops++;
          retryCurrent.push({ role: "assistant", content: retryResp.content as any });
          const retryToolUses = retryResp.content.filter((block: any) => block.type === "tool_use" && block.name !== "web_search");
          const retryResults: any[] = [];
          for (const toolUse of retryToolUses) {
            try {
              const result = await executeAction(targetUser.id, toolUse.name, toolUse.input || {});
              console.log(`[MedBill Lead Gen Retry] ${toolUse.name}: ${result.slice(0, 150)}`);
              const match = result.match(/Saved (\d+) real leads/);
              if (match) leadsGenerated += parseInt(match[1]);
              retryResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
            } catch (err: any) {
              retryResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: `ERROR: ${err?.message}`, is_error: true });
            }
          }
          if (retryResults.length > 0) retryCurrent.push({ role: "user", content: retryResults });
          retryResp = await medBillClaudeCall({ model: userModelName, max_tokens: 4096, messages: retryCurrent, tools });
        }
      }

      await db.update(autoLeadGenRuns).set({
        status: leadsGenerated > 0 ? "completed" : "no_leads",
        leadsGenerated,
        completedAt: new Date(),
      }).where(eq(autoLeadGenRuns.id, runRecord.id));

      console.log(`[MedBill Lead Gen] Completed: ${leadsGenerated} leads generated — ${specialty} in ${region}`);

      if (leadsGenerated > 0) {
        await storage.createNotification({
          userId: targetUser.id,
          type: "lead",
          title: "Medical Billing Leads Found",
          message: `Found ${leadsGenerated} new ${specialty} practice leads in ${region}. Decision makers identified and ready for outreach.`,
          read: false,
        });

        // ── INSTANT OUTREACH — generate + send immediately, zero delay ──
        try {
          const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, targetUser.id));
          if (settings) {
            const runStartTime = runRecord.startedAt || new Date(Date.now() - 30 * 60 * 1000);
            const allNewLeads = await db.select().from(leads)
              .where(and(
                eq(leads.userId, targetUser.id),
                isNull(leads.outreachSentAt),
                sql`${leads.email} IS NOT NULL AND ${leads.email} != ''`,
                sql`${leads.createdAt} >= ${runStartTime}`
              ));

            if (allNewLeads.length > 0) {
              console.log(`[MedBill Instant] ${allNewLeads.length} new leads — generating outreach + sending immediately...`);

              const needsOutreachGen = allNewLeads.filter(l => !l.outreach || l.outreach.trim() === "");
              const readyToSend = allNewLeads.filter(l => l.outreach && l.outreach.trim() !== "");

              if (needsOutreachGen.length > 0) {
                console.log(`[MedBill Instant] Generating outreach for ${needsOutreachGen.length} leads without drafts...`);
                try {
                  const aiClient = await getAnthropicForUser(targetUser.id);
                  const leadsInfo = needsOutreachGen.map((l, idx) =>
                    `${idx + 1}. Name: "${l.name}", Company: ${l.company || "N/A"}, Email: ${l.email}, Score: ${l.score || 50}, Intent: ${l.intentSignal || "N/A"}, Notes: ${l.notes || "N/A"}`
                  ).join("\n");

                  const templatePrompt = `Generate personalized outreach emails for these medical billing leads using Track-Med templates.

## TEMPLATE RULES:
- Score >= 60 or billing/claims/denial intent: Use Template A or B (alternate)
- Score < 60 or no billing signals: Use Template C (soft introduction)

**TEMPLATE A — Free Analysis Offer:**
Subject: Are billing errors costing [Practice Name] money? — Free Analysis Inside

Hi [Dr. Last Name / Practice Manager Name],
I wanted to reach out because practices like yours often leave significant revenue on the table — not from lack of patients, but from inaccurate coding, delayed claims, and missed reimbursements.
At Track-Med Billing Solutions, we specialize in helping medical and dental practices improve cash flow and reduce billing overhead through fully personalized Revenue Cycle Management. And right now, we're offering a complimentary CPT and Billing Cost Analysis — at no cost or obligation to you.
Here's what we'll cover:
• A detailed review of your current billing and coding accuracy
• Identification of revenue leakage points in your claims process
• A clear picture of what you could be collecting vs. what you currently are
On top of that, practices that partner with us receive free access to state-of-the-art Practice Management Software — a value-add that our clients love from day one.
We also handle Physician Credentialing, Electronic Fund Transfer, RAC Audit Protection (MD Audit Shield), and HIPAA-compliant Document Management — so you can focus on what matters most: your patients.
This analysis takes less than 30 minutes and could uncover thousands in recoverable revenue. Would you be open to a brief call this week to get started?

**TEMPLATE B — Pain Points Version:**
Subject: Still dealing with denied claims and slow reimbursements, [Practice Name]?

Hi [Dr. Last Name / Practice Manager],
Denied claims, slow reimbursements, and billing staff turnover are among the biggest revenue killers for independent practices today — and most providers don't realize how much it's truly costing them.
Track-Med Billing Solutions was built to fix exactly that.
We provide end-to-end Revenue Cycle Management tailored to your specialty — from clean claim submission and payment posting to credentialing, RAC audit defense, and patient balance collections. We've helped practices significantly reduce their days in A/R and recover revenue they didn't even know they were missing.
What sets us apart:
✔ Personalized billing teams aligned to your specialty
✔ Free Practice Management Software when you use our billing services
✔ Free CPT & Billing Cost Analysis — so you see the ROI before you commit
✔ Physician Credentialing included
✔ HIPAA-compliant systems across the board
Our free analysis alone gives you a detailed breakdown of any revenue loss due to coding or billing errors. No pressure, no commitment — just real data about your practice's financial health.
Can we carve out 20 minutes this week? I'd love to show you what we're seeing in practices similar to yours.

**TEMPLATE C — Cold Introduction:**
Subject: A quick introduction from Track-Med Billing Solutions, [Practice Name]

Hi [Dr. Last Name / Practice Manager Name],
I hope this finds you well. My name is Clara Motena and I work with independent medical practices like [Practice Name] to help streamline their revenue cycle — so providers can spend more time with patients and less time chasing payments.
Track-Med Billing Solutions provides fully personalized medical billing and Revenue Cycle Management, and we've found that many small to mid-size practices don't realize how much revenue they're leaving on the table until they see the numbers.
That's why we're offering a free, no-obligation CPT & Billing Cost Analysis. In less than 30 minutes, we can show you:
• Whether your current coding is maximizing your reimbursements
• Where claims may be getting delayed or denied unnecessarily
• A clear comparison of what you're collecting vs. what you could be
We also include free Practice Management Software for practices that partner with us, plus Physician Credentialing, RAC Audit Protection, and HIPAA-compliant document management — all built in.
There's absolutely no cost or commitment to see what we find. Would you be open to a brief conversation this week?

## SIGNATURE — Every email MUST end with:
Best regards,
Clara Motena
Clients Acquisition Director
Track-Med Billing Solutions
+1(615)482-6768
https://www.track-med.com
https://www.tmbds.com/schedule

Leads:
${leadsInfo}

Return ONLY a JSON array: [{"name":"exact lead name","outreach":"full email with subject line and signature"}]. No markdown.`;

                  const response = await aiClient.client.messages.create({
                    model: aiClient.model,
                    max_tokens: 6000,
                    messages: [{ role: "user", content: templatePrompt }],
                  });

                  const text = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
                  const jsonMatch = text.match(/\[[\s\S]*\]/);
                  if (jsonMatch) {
                    const drafts = JSON.parse(jsonMatch[0]);
                    for (const draft of drafts) {
                      const matchingLead = needsOutreachGen.find(l => l.name.toLowerCase() === draft.name?.toLowerCase());
                      if (matchingLead && draft.outreach) {
                        await db.update(leads).set({ outreach: draft.outreach }).where(eq(leads.id, matchingLead.id));
                        readyToSend.push({ ...matchingLead, outreach: draft.outreach });
                        console.log(`[MedBill Instant] Generated outreach for ${matchingLead.name} (score: ${matchingLead.score})`);
                      }
                    }
                  }
                } catch (genErr: any) {
                  console.error(`[MedBill Instant] AI outreach generation failed:`, genErr.message);
                  console.log(`[MedBill Instant] Using hard template fallback for ${needsOutreachGen.length} leads...`);
                  const signature = `\n\nBest regards,\nClara Motena\nClients Acquisition Director\nTrack-Med Billing Solutions\n+1(615)482-6768\nhttps://www.track-med.com\nhttps://www.tmbds.com/schedule`;
                  for (const lead of needsOutreachGen) {
                    const practiceName = lead.company || lead.name;
                    const contactName = lead.name;
                    const isHot = (lead.score || 0) >= 60 || (lead.intentSignal || "").toLowerCase().match(/billing|claim|denial|reimburse|revenue/);
                    let outreach: string;
                    if (isHot) {
                      outreach = `Subject: Are billing errors costing ${practiceName} money? -- Free Analysis Inside\n\nHi ${contactName},\n\nI wanted to reach out because practices like yours often leave significant revenue on the table -- not from lack of patients, but from inaccurate coding, delayed claims, and missed reimbursements.\n\nAt Track-Med Billing Solutions, we specialize in helping medical and dental practices improve cash flow and reduce billing overhead through fully personalized Revenue Cycle Management. And right now, we're offering a complimentary CPT and Billing Cost Analysis -- at no cost or obligation to you.\n\nHere's what we'll cover:\n- A detailed review of your current billing and coding accuracy\n- Identification of revenue leakage points in your claims process\n- A clear picture of what you could be collecting vs. what you currently are\n\nOn top of that, practices that partner with us receive free access to state-of-the-art Practice Management Software.\n\nThis analysis takes less than 30 minutes and could uncover thousands in recoverable revenue. Would you be open to a brief call this week to get started?${signature}`;
                    } else {
                      outreach = `Subject: A quick introduction from Track-Med Billing Solutions, ${practiceName}\n\nHi ${contactName},\n\nI hope this finds you well. My name is Clara Motena and I work with independent medical practices like ${practiceName} to help streamline their revenue cycle -- so providers can spend more time with patients and less time chasing payments.\n\nTrack-Med Billing Solutions provides fully personalized medical billing and Revenue Cycle Management, and we've found that many small to mid-size practices don't realize how much revenue they're leaving on the table until they see the numbers.\n\nThat's why we're offering a free, no-obligation CPT & Billing Cost Analysis. In less than 30 minutes, we can show you:\n- Whether your current coding is maximizing your reimbursements\n- Where claims may be getting delayed or denied unnecessarily\n- A clear comparison of what you're collecting vs. what you could be\n\nThere's absolutely no cost or commitment to see what we find. Would you be open to a brief conversation this week?${signature}`;
                    }
                    await db.update(leads).set({ outreach }).where(eq(leads.id, lead.id));
                    readyToSend.push({ ...lead, outreach });
                    console.log(`[MedBill Instant] Hard template applied for ${lead.name} (score: ${lead.score})`);
                  }
                }
              }

              let sent = 0, failed = 0;
              for (const lead of readyToSend) {
                try {
                  const claimResult = await db.update(leads)
                    .set({ outreachSentAt: new Date() })
                    .where(and(eq(leads.id, lead.id), isNull(leads.outreachSentAt)))
                    .returning({ id: leads.id });
                  if (!claimResult.length) {
                    console.log(`[MedBill Instant] Lead ${lead.email} already claimed, skipping`);
                    continue;
                  }

                  const result = await sendOutreachEmail(lead, settings, targetUser);
                  if (result.success) {
                    sent++;
                    await db.update(leads).set({
                      status: "contacted",
                      followUpStep: 0,
                      followUpStatus: "active",
                      followUpNextAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                    }).where(eq(leads.id, lead.id));
                    try {
                      await logEmail({ userId: targetUser.id, leadId: lead.id, recipientEmail: lead.email, recipientName: lead.name, subject: `Quick question for ${lead.company || lead.name}`, status: "sent", provider: "smtp", source: "medbill-instant-outreach" });
                    } catch {}
                    console.log(`[MedBill Instant] ✅ Sent to ${lead.name} <${lead.email}> (score: ${lead.score})`);
                  } else {
                    failed++;
                    await db.update(leads).set({ outreachSentAt: null }).where(eq(leads.id, lead.id));
                    console.warn(`[MedBill Instant] ❌ Failed for ${lead.email}: ${result.error}`);
                    try {
                      await logEmail({ userId: targetUser.id, leadId: lead.id, recipientEmail: lead.email, recipientName: lead.name, subject: `Quick question for ${lead.company || lead.name}`, status: "failed", provider: "smtp", source: "medbill-instant-outreach", errorMessage: result.error });
                    } catch {}
                  }
                  await new Promise(r => setTimeout(r, 2000));
                } catch (emailErr: any) {
                  failed++;
                  await db.update(leads).set({ outreachSentAt: null }).where(eq(leads.id, lead.id));
                  console.error(`[MedBill Instant] Email error for ${lead.email}:`, emailErr.message);
                  try {
                    await logEmail({ userId: targetUser.id, leadId: lead.id, recipientEmail: lead.email, recipientName: lead.name, subject: `Quick question for ${lead.company || lead.name}`, status: "failed", provider: "smtp", source: "medbill-instant-outreach", errorMessage: emailErr.message });
                  } catch {}
                }
              }
              console.log(`[MedBill Instant] Outreach complete: ${sent} sent, ${failed} failed out of ${readyToSend.length}`);
              if (sent > 0) {
                await storage.createNotification({
                  userId: targetUser.id,
                  type: "email",
                  title: "Instant Outreach Sent",
                  message: `Instantly sent ${sent} outreach email${sent > 1 ? 's' : ''} to new ${specialty} leads in ${region} — zero delay from discovery to contact.`,
                  read: false,
                });
              }
            } else {
              console.log(`[MedBill Instant] No new leads requiring outreach`);
            }
          } else {
            console.log(`[MedBill Instant] No user settings found, skipping outreach`);
          }
        } catch (outreachErr: any) {
          console.error(`[MedBill Instant] Auto-outreach error:`, outreachErr.message);
        }
      }
    } catch (error: any) {
      console.error(`[MedBill Lead Gen] Error:`, error?.message);
    }
  }

  setTimeout(() => {
    runMedBillLeadGen().catch(err => console.error("[MedBill Lead Gen] Initial run error:", err));
    setInterval(() => {
      runMedBillLeadGen().catch(err => console.error("[MedBill Lead Gen] Hourly run error:", err));
    }, MEDBILL_LEAD_GEN_INTERVAL);
  }, 2 * 60 * 1000);
  console.log("[MedBill Lead Gen] Scheduled to run every 20 minutes for abel@argilette.com. First run in 2 minutes.");

  app.get("/api/medbill-lead-gen/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      if (!user || (user.email !== MEDBILL_USER_EMAIL && user.email !== process.env.ADMIN_EMAIL)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const targetUser = user.email === MEDBILL_USER_EMAIL ? user : (await storage.getAllUsers()).find((u: any) => u.email === MEDBILL_USER_EMAIL);
      if (!targetUser) return res.status(404).json({ message: "Target user not found" });
      const runs = await db.select().from(autoLeadGenRuns)
        .where(and(eq(autoLeadGenRuns.userId, targetUser.id), sql`${autoLeadGenRuns.searchQueries} LIKE 'MedBill:%'`))
        .orderBy(desc(autoLeadGenRuns.startedAt)).limit(20);
      const totalLeads = runs.reduce((sum, r) => sum + (r.leadsGenerated || 0), 0);
      res.json({
        intervalMinutes: 20,
        batchSize: MEDBILL_LEAD_GEN_BATCH,
        totalLeadsGenerated: totalLeads,
        runs,
        nextRegion: MEDBILL_REGIONS[medBillRegionIndex % MEDBILL_REGIONS.length],
        nextSpecialty: MEDBILL_SPECIALTIES[medBillSpecialtyIndex % MEDBILL_SPECIALTIES.length],
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/medbill-lead-gen/trigger", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      if (!user || (user.email !== MEDBILL_USER_EMAIL && user.email !== process.env.ADMIN_EMAIL)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      res.json({ message: "Medical billing lead generation triggered. Leads will appear in your CRM within a few minutes." });
      runMedBillLeadGen();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ---- SMS (Twilio) ----

  app.post("/api/sms/send", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const smsUsage = await checkUsageLimit(userId, "smsSent");
      if (!smsUsage.allowed) {
        return res.status(429).json({ message: `SMS limit reached (${smsUsage.current}/${smsUsage.limit} this month). Upgrade your plan for more.`, upgradeRequired: true });
      }
      const { to, body } = req.body;
      if (!to || !body) {
        return res.status(400).json({ message: "Phone number (to) and message body are required" });
      }
      const { sendSMS } = await import("./twilio");
      const message = await sendSMS(to, body);
      await storage.incrementUsage(userId, "smsSent");
      res.json({ success: true, sid: message.sid, status: message.status });
    } catch (error: any) {
      console.error("Error sending SMS:", error);
      res.status(500).json({ message: error.message || "Failed to send SMS" });
    }
  });

  app.post("/api/leads/:id/send-sms", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const smsUsage = await checkUsageLimit(userId, "smsSent");
      if (!smsUsage.allowed) {
        return res.status(429).json({ message: `SMS limit reached (${smsUsage.current}/${smsUsage.limit} this month). Upgrade your plan for more.`, upgradeRequired: true });
      }
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
      await storage.incrementUsage(userId, "smsSent");
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

  const BOT_UA_PATTERNS = [
    "googlebot", "bingbot", "slurp", "duckduckbot", "baiduspider",
    "yandexbot", "facebot", "ia_archiver", "mj12bot", "semrushbot",
    "ahrefsbot", "dotbot", "petalbot", "bytespider",
    "barracuda", "proofpoint", "mimecast", "fireeye", "forcepoint",
    "symantec", "mcafee", "sophos", "trendmicro", "fortinet",
    "cisco", "ironport", "messagelabs", "spamhaus", "returnpath",
    "validity", "250ok", "mailgun", "postmark", "sparkpost",
    "urldefense", "safelinks", "protection.outlook",
    "bot", "crawler", "spider", "scan", "check", "monitor",
    "wget", "curl", "python-requests", "node-fetch", "axios",
    "headlesschrome", "phantomjs", "selenium",
  ];
  const GOOGLE_IP_PREFIXES = [
    "66.249.", "74.125.", "209.85.", "216.239.", "64.233.",
    "72.14.", "108.177.", "142.250.", "172.217.", "173.194.",
  ];
  const KNOWN_SCANNER_IPS = ["81.161.59.17", "54.198.58.157", "51.54.38.120"];

  function isEmailBotEvent(ua: string, ip: string): boolean {
    if (!ua || ua.length < 20) return true;
    if (BOT_UA_PATTERNS.some(p => ua.includes(p))) return true;
    if (GOOGLE_IP_PREFIXES.some(p => ip.startsWith(p))) return true;
    if (KNOWN_SCANNER_IPS.includes(ip)) return true;
    return false;
  }

  function isEmailBot(req: any): boolean {
    const ua = (req.headers["user-agent"] || "").toLowerCase();
    const ip = ((req.headers["x-forwarded-for"] as string || req.ip || "").split(",")[0].trim());
    return isEmailBotEvent(ua, ip);
  }

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
    res.set({
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.send(TRACKING_PIXEL);

    if (isEmailBot(req)) return;

    try {
      const lead = await storage.getLeadById(req.params.leadId);
      if (lead) {
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
        workflowHooks.onLeadEmailOpened(lead.userId, { ...lead, emailOpens: newOpens, engagementScore: score });

        try {
          await storage.createEmailEvent({
            leadId: lead.id,
            userId: lead.userId,
            eventType: "open",
            ipAddress: (req.headers["x-forwarded-for"] as string || req.ip || "").split(",")[0].trim(),
            userAgent: req.headers["user-agent"] || null,
            metadata: null,
          });
        } catch (evtErr) {
          console.error("Email event insert error:", evtErr);
        }
      }
    } catch (err) {
      console.error("Tracking pixel error:", err);
    }
  });

  app.get("/t/c/:leadId", async (req, res) => {
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

    if (isEmailBot(req)) {
      return res.redirect(302, safeUrl || "https://argilette.co");
    }

    try {
      const lead = await storage.getLeadById(req.params.leadId);
      if (lead) {
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
        workflowHooks.onLeadEmailClicked(lead.userId, { ...lead, emailClicks: newClicks, engagementScore: score });

        try {
          await storage.createEmailEvent({
            leadId: lead.id,
            userId: lead.userId,
            eventType: "click",
            metadata: JSON.stringify({ url: safeUrl || "unknown" }),
            ipAddress: (req.headers["x-forwarded-for"] as string || req.ip || "").split(",")[0].trim(),
            userAgent: req.headers["user-agent"] || null,
          });
        } catch (evtErr) {
          console.error("Click event insert error:", evtErr);
        }
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

  app.get("/api/follow-up-tracker", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const allLeads = await storage.getLeadsByUser(userId);
      const activeFollowUps = allLeads.filter(l => l.followUpStatus === "active");
      const completedFollowUps = allLeads.filter(l => l.followUpStatus === "completed");
      const pausedFollowUps = allLeads.filter(l => l.followUpStatus === "paused");
      const now = new Date();

      const overdue = activeFollowUps.filter(l => l.followUpNextAt && new Date(l.followUpNextAt) < now);
      const upcoming = activeFollowUps.filter(l => l.followUpNextAt && new Date(l.followUpNextAt) >= now)
        .sort((a, b) => new Date(a.followUpNextAt!).getTime() - new Date(b.followUpNextAt!).getTime());

      const formatLead = (l: any) => ({
        id: l.id,
        name: l.name,
        email: l.email,
        company: l.company,
        status: l.status,
        score: l.score,
        followUpStep: l.followUpStep || 0,
        followUpStatus: l.followUpStatus,
        followUpNextAt: l.followUpNextAt,
        followUpLastSentAt: l.followUpLastSentAt,
        engagementLevel: l.engagementLevel || "none",
        emailOpens: l.emailOpens || 0,
        emailClicks: l.emailClicks || 0,
        outreachSentAt: l.outreachSentAt,
      });

      res.json({
        summary: {
          active: activeFollowUps.length,
          completed: completedFollowUps.length,
          paused: pausedFollowUps.length,
          overdue: overdue.length,
          upcoming: upcoming.length,
          totalWithFollowUp: activeFollowUps.length + completedFollowUps.length + pausedFollowUps.length,
        },
        overdue: overdue.map(formatLead),
        upcoming: upcoming.map(formatLead),
        active: activeFollowUps.sort((a, b) => (b.followUpStep || 0) - (a.followUpStep || 0)).map(formatLead),
        completed: completedFollowUps.map(formatLead),
        paused: pausedFollowUps.map(formatLead),
      });
    } catch (error) {
      console.error("Error fetching follow-up tracker:", error);
      res.status(500).json({ message: "Failed to fetch follow-up data" });
    }
  });

  app.post("/api/email-analytics/recalculate", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const allLeads = await storage.getLeadsByUser(userId);
      const sentLeads = allLeads.filter(l => l.outreachSentAt);
      let updated = 0;

      for (const lead of sentLeads) {
        const events = await storage.getEmailEventsByLead(lead.id);
        if (events.length === 0) continue;

        const realEvents = events.filter(e => {
          const ua = (e.userAgent || "").toLowerCase();
          const ip = (e.ipAddress || "");
          return !isEmailBotEvent(ua, ip);
        });
        const realOpens = realEvents.filter(e => e.eventType === "open").length;
        const realClicks = realEvents.filter(e => e.eventType === "click").length;

        const { score, level, nextStep } = calculateEngagement(realOpens, realClicks);
        const statusUpdate: any = {
          emailOpens: realOpens,
          emailClicks: realClicks,
          engagementScore: score,
          engagementLevel: level,
          nextStep,
        };
        if (!lead.lastEngagedAt && (realOpens > 0 || realClicks > 0)) {
          statusUpdate.lastEngagedAt = lead.outreachSentAt || new Date();
        }
        if (realOpens === 0 && realClicks === 0) {
          statusUpdate.lastEngagedAt = null;
          if (lead.status === "hot" || lead.status === "warm") statusUpdate.status = "new";
        } else if (level === "hot" && lead.status !== "qualified") {
          statusUpdate.status = "hot";
        } else if (level === "warm" && lead.status === "new") {
          statusUpdate.status = "warm";
        }
        await storage.updateLead(lead.id, statusUpdate);
        updated++;
      }

      res.json({ success: true, updated, total: sentLeads.length });
    } catch (error) {
      console.error("Error recalculating engagement:", error);
      res.status(500).json({ message: "Failed to recalculate" });
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
      workflowHooks.onAppointmentBooked(userId, appt);
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
      if (req.body.status === "completed") {
        workflowHooks.onAppointmentCompleted(userId, updated);
      }
      if (req.body.status === "cancelled") {
        workflowHooks.onAppointmentCancelled(userId, updated);
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
      const deleted = await storage.deleteAppointment(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Appointment not found" });
      }
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
      const result: any = { ...settings };
      if (result.anthropicApiKey) {
        const key = result.anthropicApiKey;
        result.anthropicApiKey = key.length > 8 ? key.slice(0, 7) + "..." + key.slice(-4) : "****";
      }
      if (result.youApiKey) {
        const key = result.youApiKey;
        result.youApiKey = key.length > 8 ? key.slice(0, 4) + "..." + key.slice(-4) : "****";
      }
      if (result.sendgridApiKey) {
        const key = result.sendgridApiKey;
        result.sendgridApiKey = key.length > 8 ? key.slice(0, 4) + "..." + key.slice(-4) : "****";
      }
      const sub = await storage.getSubscriptionByUser(userId);
      const hasActiveSub = sub && (sub.status === "active" || sub.status === "trial");
      result.platformAiEnabled = !!(platformOpenAI && hasActiveSub);
      result.hasActiveSubscription = !!hasActiveSub;
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
      if (body.youApiKey && body.youApiKey.includes("...")) {
        delete body.youApiKey;
      }
      const settings = await storage.upsertSettings({ ...body, userId });
      const result = { ...settings };
      if (result.anthropicApiKey) {
        const key = result.anthropicApiKey;
        result.anthropicApiKey = key.length > 8 ? key.slice(0, 7) + "..." + key.slice(-4) : "****";
      }
      if (result.youApiKey) {
        const key = result.youApiKey;
        result.youApiKey = key.length > 8 ? key.slice(0, 4) + "..." + key.slice(-4) : "****";
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
      console.log(`[Chat] Received message from user ${userId}: "${content?.slice(0, 80)}..."`);
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "Message content is required" });
      }

      const usageCheck = await checkUsageLimit(userId, "aiChats");
      if (!usageCheck.allowed) {
        return res.status(429).json({ message: `You've reached your ${usageCheck.planName} plan limit of ${usageCheck.limit} AI chats this month (${usageCheck.current}/${usageCheck.limit} used). Upgrade your plan for more.`, upgradeRequired: true });
      }

      const userMessage = await storage.createChatMessage({ userId, role: "user", content });

      const history = await storage.getChatMessages(userId);
      const chatHistory = history.slice(-10).map(m => ({ role: m.role, content: m.content }));

      const isLeadGenReq = /\b(lead|find|search|prospect|dental|chiro|practice|doctor|clinic)\b/i.test(content);
      const timeoutMs = isLeadGenReq ? 120000 : 90000;
      const aiReply = await Promise.race([
        handleAiAction(userId, content, chatHistory),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs)),
      ]);
      console.log(`[Chat] AI reply for user ${userId}: "${aiReply?.slice(0, 100)}..."`);
      await storage.incrementUsage(userId, "aiChats");
      const aiMessage = await storage.createChatMessage({ userId, role: "assistant", content: aiReply });

      res.json({ userMessage, aiMessage });
    } catch (error: any) {
      console.error("Error sending chat message:", error?.message || error);
      if (error?.message === "AI_TIMEOUT") {
        const timeoutMsg = "The AI took too long to respond. This usually happens with complex requests like lead generation with web search. Please try again — simpler requests will be faster.";
        const aiMessage = await storage.createChatMessage({ userId: req.session.userId!, role: "assistant", content: timeoutMsg });
        return res.json({ userMessage: { userId: req.session.userId!, role: "user", content }, aiMessage });
      }
      if (error?.message === "AI_SUBSCRIPTION_REQUIRED") {
        const subMsg = "AI features require an active subscription. Please upgrade to a Pro or Enterprise plan to access AI-powered lead generation, chat, and automation features.";
        const aiMessage = await storage.createChatMessage({ userId: req.session.userId!, role: "assistant", content: subMsg });
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
      const result = await webSearch(query, userId);
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
      const result = await aiGenerate(prompt, type || "general", userClient);
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
      const voiceUsage = await checkUsageLimit(req.session.userId!, "voiceCalls");
      if (!voiceUsage.allowed) {
        return res.status(429).json({ message: `Voice call limit reached (${voiceUsage.current}/${voiceUsage.limit} this month on ${voiceUsage.planName} plan). Upgrade your plan for more calls.`, upgradeRequired: true });
      }
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
        await storage.incrementUsage(userId, "voiceCalls");

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

      const baseUrl = `https://${req.get("host")}`;
      const wsUrl = baseUrl.replace("https://", "wss://");

      if (process.env.DEEPGRAM_API_KEY) {
        res.type("text/xml");
        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}/api/voice/stream/${callLogId}">
      <Parameter name="callLogId" value="${callLogId}" />
    </Stream>
  </Connect>
</Response>`);
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
      if (updateData.status === "completed") {
        workflowHooks.onVoiceCallCompleted(callLog.userId, { id: callLog.id, ...updateData });
      }
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
        phone: normalizePhoneNumber(phone),
        source: "Discovery Call",
        status: "new",
        score: 85, // high intent — they booked a call
      });
      console.log(`New discovery call submission: ${firstName} ${lastName} (${email}) from ${company}`);
      workflowHooks.onDiscoverySubmitted(req.body);
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
      const deleted = await storage.deleteAutomation(req.params.id as string, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Automation not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete automation" });
    }
  });

  // ---- ADMIN ----

  await clearOldSeedData();
  await seedSuperAdmin();
  await ensureOwnerPassword();
  await ensureAllUsersProLifetime();
  // Auto-cleanup disabled — was deleting real production leads on every restart
  // Use admin panel endpoints for manual cleanup if needed
  await restoreLeadsFromFunnel();
  await backfillDentalLeads();
  await backfillMedBillingFunnel();

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
      if (req.session.userId) {
        req.session.originalUserId = req.session.userId;
      }
      req.session.adminId = admin.id;
      const ownerUser = await storage.getUserByEmail("abel@argilette.com");
      if (ownerUser) {
        req.session.userId = ownerUser.id;
      }
      console.log(`[ADMIN LOGIN] Admin ${admin.email} logged in, session userId preserved as ${req.session.originalUserId || req.session.userId}`);
      res.json({ id: admin.id, email: admin.email, name: admin.name, linkedUserId: ownerUser?.id || null });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/admin/logout", async (req, res) => {
    if (req.session.originalUserId) {
      req.session.userId = req.session.originalUserId;
      delete req.session.originalUserId;
    }
    delete req.session.adminId;
    res.json({ success: true });
  });

  app.post("/api/admin/switch-to-user", isAdmin, async (req, res) => {
    try {
      const admin = await storage.getAdminById(req.session.adminId!);
      if (!admin) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const originalUserId = req.session.originalUserId;
      let linkedUser = null;
      if (originalUserId) {
        linkedUser = await storage.getUserById(originalUserId);
      }
      if (!linkedUser) {
        linkedUser = await storage.getUserByEmail("abel@argilette.com");
      }
      if (linkedUser) {
        req.session.userId = linkedUser.id;
        delete req.session.adminId;
        delete req.session.originalUserId;
        console.log(`[ADMIN SWITCH] Admin ${admin.email} switched back to user ${linkedUser.email} (${linkedUser.id})`);
        return res.json({ success: true, userId: linkedUser.id, email: linkedUser.email });
      }
      return res.status(404).json({ message: "No user account found to switch to." });
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
        jobTitle: u.jobTitle,
        companyDescription: u.companyDescription,
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

  app.patch("/api/admin/clients/:id", isAdmin, async (req, res) => {
    try {
      const admin = await storage.getAdminById(req.session.adminId!);
      if (!admin || admin.email !== "babalekpam@gmail.com") {
        return res.status(403).json({ message: "Only the super admin can edit clients" });
      }

      const { firstName, lastName, companyName, industry, website, companyDescription, jobTitle, email } = req.body;
      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (companyName !== undefined) updateData.companyName = companyName;
      if (industry !== undefined) updateData.industry = industry;
      if (website !== undefined) updateData.website = website;
      if (companyDescription !== undefined) updateData.companyDescription = companyDescription;
      if (jobTitle !== undefined) updateData.jobTitle = jobTitle;

      if (email !== undefined) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.params.id) {
          return res.status(409).json({ message: "Another account already uses this email" });
        }
        const [updated] = await db.update(users).set({ ...updateData, email, updatedAt: new Date() }).where(eq(users.id, req.params.id)).returning();
        if (!updated) return res.status(404).json({ message: "Client not found" });
        return res.json(updated);
      }

      const updated = await storage.updateUser(req.params.id, updateData);
      if (!updated) return res.status(404).json({ message: "Client not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
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
      const validPlans = ["starter", "growth", "agency"];
      const validStatuses = ["trial", "active", "past_due", "cancelled", "expired"];
      if (!plan || !validPlans.includes(plan)) {
        return res.status(400).json({ message: "Valid plan is required (starter, growth, agency)" });
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
        amount: amount || (plan === "starter" ? 297 : plan === "growth" ? 597 : 1497),
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
      const validPlans = ["starter", "growth", "agency"];
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

  app.post("/api/admin/cleanup-fake-leads", isAdmin, async (_req, res) => {
    try {
      const result = await db.execute(sql`
        DELETE FROM leads WHERE 
          phone LIKE '%555%'
          OR email ~* '@(familypractice|orthoclinic|urgentcare|familymed|internalmed|dentistry|dermatology|pediatrics|cardiology|oncology|neurology|gastro|pulmonology|rheumatology|endocrinology|nephrology|urology|geriatrics|sleepmedic|pathology|brownfamily|browngastro|brownallergy|brownorthopedics|brownpediatrics|browneye|atlantaurology|gastroenterologystl|geriatricsstl|oncologystl)\.(com|org|net)$'
        RETURNING id
      `);
      const count = (result as any).rowCount || (result as any).length || 0;
      console.log(`[Cleanup] Removed ${count} fake leads from database`);
      res.json({ success: true, removed: count });
    } catch (error) {
      console.error("[Cleanup] Error:", error);
      res.status(500).json({ message: "Failed to cleanup fake leads" });
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
        platformSenderEmail: "info@argilette.com",
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
      const deleted = await storage.deleteFunnel(funnel.id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Funnel not found" });
      }
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
      workflowHooks.onDealCreated(userId, deal);
      res.json(deal);
    } catch (error) {
      res.status(500).json({ message: "Failed to create deal" });
    }
  });

  app.patch("/api/deals/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { stageId, contactName, contactEmail, value, status } = req.body;
      const existingDeal = await storage.getFunnelDeal(req.params.id as string);
      if (!existingDeal || existingDeal.userId !== userId) return res.status(404).json({ message: "Deal not found" });
      const oldStageId = existingDeal.stageId;
      const updated = await storage.updateFunnelDeal(req.params.id as string, userId, {
        ...(stageId && { stageId }),
        ...(contactName && { contactName }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(value !== undefined && { value }),
        ...(status && { status }),
      });
      if (!updated) return res.status(404).json({ message: "Deal not found" });
      if (stageId && oldStageId && stageId !== oldStageId) {
        workflowHooks.onDealStageChanged(userId, updated, oldStageId, stageId);
      }
      if (status === "won") {
        workflowHooks.onDealWon(userId, updated);
        stopSequencesForDeal(updated.id, userId, "won").catch(err =>
          console.error("[Deal] Failed to stop sequences on deal won:", err.message)
        );
      }
      if (status === "lost") {
        stopSequencesForDeal(updated.id, userId, "lost").catch(err =>
          console.error("[Deal] Failed to stop sequences on deal lost:", err.message)
        );
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update deal" });
    }
  });

  app.delete("/api/deals/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const deleted = await storage.deleteFunnelDeal(req.params.id as string, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Deal not found" });
      }
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
      const deleted = await storage.deleteAgentConfig(req.params.id, req.session.userId!);
      if (!deleted) {
        return res.status(404).json({ message: "Agent config not found" });
      }
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
      (async () => {
        try {
          const agentName = catalogEntry?.name || config.agentType;
          const settings = config.settings as Record<string, any> || {};

          let aiClient: Anthropic;
          let aiModel: string;
          try {
            const ai = await getAnthropicForUser(userId);
            aiClient = ai.client;
            aiModel = ai.model;
          } catch {
            aiClient = anthropic;
            aiModel = CLAUDE_MODEL;
          }

          if (config.agentType === "tax-lien") {
            console.log(`[Agent Run] Using dedicated county-level Tax Lien discovery for user ${userId}`);
            const tlSettings: TaxLienSettings = {
              targetStates: settings.targetStates || ["FL"],
              targetCounties: settings.targetCounties || [],
              propertyTypes: settings.propertyTypes || ["residential"],
              minLienAmount: settings.minLienAmount || 500,
              maxLienAmount: settings.maxLienAmount || 25000,
              minInterestRate: settings.minInterestRate || 8,
              bidStrategy: settings.bidStrategy || "moderate",
              autoBid: settings.autoBid || false,
            };

            const results = await discoverTaxLiens(aiClient, aiModel, tlSettings);

            let leadsFound = 0;
            let leadsSkippedDup = 0;
            const savedLeadsList: { name: string; email?: string; value?: number }[] = [];
            const user = await storage.getUserById(userId);
            const bookingLink = (await storage.getSettingsByUser(userId))?.calendarLink || "";
            const senderName = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Your Team";
            const companyName = user?.companyName || "our company";

            const existingLeadsTL = await storage.getLeadsByUser(userId);
            const existingTLSet = new Set<string>();
            for (const el of existingLeadsTL) {
              if (el.source === "Tax Lien Hunter Agent" && el.notes) {
                try {
                  const parsed = JSON.parse(el.notes);
                  if (parsed.parcelNumber) existingTLSet.add(`parcel:${parsed.parcelNumber.toLowerCase().trim()}`);
                  if (parsed.propertyAddress) existingTLSet.add(`addr:${parsed.propertyAddress.toLowerCase().trim().replace(/[^a-z0-9]/g, "")}`);
                } catch {}
              }
              const nameCompanyKey = `${(el.name || "").toLowerCase().trim()}::${(el.company || "").toLowerCase().trim()}`;
              existingTLSet.add(nameCompanyKey);
            }

            for (const property of results.properties.slice(0, 50)) {
              try {
                if (!property.ownerName || property.ownerName === "Unknown" || /^(prospect|lead|contact|test)\s*\d/i.test(property.ownerName)) {
                  console.log(`[tax-lien] Skipping property with invalid owner: "${property.ownerName}"`);
                  continue;
                }
                if (!property.propertyAddress || property.propertyAddress.length < 5) {
                  console.log(`[tax-lien] Skipping property with invalid address: "${property.propertyAddress}"`);
                  continue;
                }

                let isTLDuplicate = false;
                if (property.parcelNumber && existingTLSet.has(`parcel:${property.parcelNumber.toLowerCase().trim()}`)) {
                  isTLDuplicate = true;
                } else if (property.propertyAddress) {
                  const addrKey = `addr:${property.propertyAddress.toLowerCase().trim().replace(/[^a-z0-9]/g, "")}`;
                  if (existingTLSet.has(addrKey)) isTLDuplicate = true;
                }
                if (isTLDuplicate) {
                  console.log(`[tax-lien] Skipping duplicate property: "${property.propertyAddress}" (parcel: ${property.parcelNumber})`);
                  leadsSkippedDup++;
                  continue;
                }
                if (property.parcelNumber) existingTLSet.add(`parcel:${property.parcelNumber.toLowerCase().trim()}`);
                if (property.propertyAddress) existingTLSet.add(`addr:${property.propertyAddress.toLowerCase().trim().replace(/[^a-z0-9]/g, "")}`);

                const outreach = `Hi ${property.ownerName},\n\nI noticed a tax lien on your property at ${property.propertyAddress} (${property.county} County, ${STATE_NAMES[property.state] || property.state}). The amount owed is $${property.amountOwed?.toLocaleString()} with a ${property.interestRate}% interest rate.\n\nI specialize in helping property owners resolve tax liens before auction deadlines. I'd love to discuss your options.\n\nBest regards,\n${senderName}, ${companyName}${bookingLink ? `\nBook a call: ${bookingLink}` : ""}`;

                await storage.createLead({
                  userId,
                  name: property.ownerName,
                  company: `${property.county} County, ${STATE_NAMES[property.state] || property.state}`,
                  email: "",
                  phone: "",
                  status: "new",
                  source: "Tax Lien Hunter Agent",
                  score: Math.max(10, 100 - property.riskScore),
                  notes: JSON.stringify({
                    type: "tax_lien",
                    contactStatus: "property_owner_identified",
                    parcelNumber: property.parcelNumber,
                    propertyAddress: property.propertyAddress,
                    amountOwed: property.amountOwed,
                    assessedValue: property.assessedValue,
                    marketValue: property.marketValue,
                    interestRate: property.interestRate,
                    redemptionPeriod: property.redemptionPeriod,
                    projectedROI: property.projectedROI,
                    riskScore: property.riskScore,
                    riskFactors: property.riskFactors,
                    auctionDate: property.auctionDate,
                    auctionPlatform: property.auctionPlatform,
                    purchaseSteps: property.purchaseSteps,
                    dueDiligenceChecklist: property.dueDiligenceChecklist,
                    sourceUrl: property.sourceUrl,
                  }),
                  outreachDraft: outreach,
                });
                savedLeadsList.push({ name: property.ownerName, value: property.amountOwed || 0 });
                leadsFound++;
              } catch (err) {
                console.error("[tax-lien] Failed to save lead:", err);
              }
            }

            const funnelInfo = await autoAddToFunnelDirect(userId, "tax-lien", savedLeadsList);

            await storage.updateAgentTask(task.id, {
              status: "completed",
              completedAt: new Date(),
              result: JSON.stringify({
                leadsFound,
                auctionEvents: results.auctionCalendar.length,
                summary: results.summary,
                aiPowered: true,
                countySearch: true,
              }),
            });
            await storage.updateAgentConfig(configId, userId, {
              isRunning: false,
              totalLeadsFound: (config.totalLeadsFound || 0) + leadsFound,
            } as any);
            await storage.createNotification({
              userId,
              agentType: config.agentType,
              type: "new_lead",
              title: `Tax Lien Hunter Found ${leadsFound} Properties`,
              message: `County-level search across ${results.summary.statesSearched.join(", ")} found ${results.summary.totalFound} properties. ${results.summary.matchingCriteria} matched your criteria (${results.summary.topDeals} top deals with >12% ROI). ${results.summary.nextAuctions}.${funnelInfo ? " " + funnelInfo : ""}`,
              priority: leadsFound > 5 ? "high" : "normal",
            });

            console.log(`[Agent Run] Tax Lien Hunter completed: ${leadsFound} properties saved, ${leadsSkippedDup} duplicates skipped for user ${userId}`);
            return;
          }

          const agentSearchPrompts: Record<string, string> = {
            "tax-lien": `Search for REAL tax lien properties currently listed for auction or recently filed in ${(settings.targetStates || ["FL", "AZ", "IN"]).join(", ")}. For EACH property you find, you MUST extract:
- Full property address (street, city, state, zip)
- Property owner's FULL NAME (search county assessor records, property appraiser sites)
- Owner's phone number (search Whitepages, TruePeopleSearch, or public records)
- Owner's email address (search for their name + email, or use professional patterns)
- Lien amount if available
- Property type (residential, commercial, vacant land)

Search queries to use: "tax lien auction [state] 2025", "delinquent property tax list [county]", "tax lien certificate sale [state]", "[county] tax collector delinquent list"
Then for each property found, search: "[owner name] contact info", "[owner name] [city] phone email"

Return 5-10 leads with REAL data only. Every lead must have a real person's name, real address, and real contact info. Do NOT use placeholder names like "Prospect 1" or fake emails like "contact1@prospect.com".`,
            "tax-deed": `Search for REAL tax deed properties available at upcoming auctions in ${(settings.targetStates || ["TX", "GA", "CA", "FL"]).join(", ")}. For each property extract: full address, owner name, phone, email, estimated property value. Search county auction sites, tax deed sale listings, and public records. Return 5-10 leads with verified real data only.`,
            "wholesale-re": `Search for REAL distressed properties, pre-foreclosure listings, and motivated sellers in ${(settings.targetMarkets || ["Atlanta", "Houston", "Phoenix"]).join(", ")}. For each property extract: full address, owner name, phone, email, estimated ARV. Search foreclosure listings, probate records, and absentee owner lists. Return 5-10 leads with verified real data only.`,
            "govt-contracts-us": `Search for REAL current government contract opportunities on SAM.gov and federal procurement portals. Find contracts valued between $${settings.minContractValue || 25000} and $${settings.maxContractValue || 500000}. Extract: contracting agency, contract title, NAICS code, deadline, point of contact name/email/phone. Return 5-10 real opportunities.`,
            "lead-gen": `Search for REAL businesses in the ${settings.industry || "professional services"} industry that are actively looking for new clients or showing growth signals. Target ${settings.targetTitle || "business owners"}. Extract: owner/decision-maker name, business name, phone, email, website. Return 5-10 leads with verified real data only.`,
            "govt-tender-africa": `Search for REAL government tenders currently open in ${(settings.targetCountries || ["NG", "KE", "GH"]).join(", ")} for sectors: ${(settings.sectors || ["IT", "construction"]).join(", ")}. Extract: tender title, issuing agency, deadline, contact person name/email/phone, estimated value. Return 5-10 real opportunities.`,
            "cross-border-trade": `Search for REAL cross-border trade opportunities and suppliers for ${(settings.productCategories || ["electronics", "textiles"]).join(", ")} on trade routes ${(settings.tradeRoutes || ["china-nigeria"]).join(", ")}. Extract: supplier company, contact person name, phone, email, product details, pricing. Return 5-10 real trade leads.`,
            "agri-market": `Search for REAL agricultural commodity buyers and sellers for ${(settings.commodities || ["cocoa", "coffee"]).join(", ")}. Find actual trading companies, cooperatives, and exporters. Extract: company name, contact person, phone, email, commodity details, pricing. Return 5-10 real leads.`,
            "diaspora-services": `Search for REAL investment opportunities in ${(settings.homeCountries || ["NG", "GH", "KE"]).join(", ")} suitable for diaspora investors. Find: real estate developments, business partnerships, franchise opportunities. Extract: company/project name, contact person, phone, email, investment details. Return 5-10 real opportunities.`,
            "arbitrage": `Search for REAL profitable arbitrage opportunities on ${(settings.platforms || ["amazon", "ebay"]).join(", ")} for categories: ${(settings.categories || ["electronics", "toys"]).join(", ")} with min profit $${settings.minProfit || 5} and min ROI ${settings.minROI || 20}%. Find actual products with price differentials. Return 5-10 real product opportunities with seller details.`,
          };

          const searchPrompt = agentSearchPrompts[config.agentType] || `Search for real business leads related to ${agentName}. Extract: real person name, real company, real phone, real email, detailed notes. Return 5-10 leads with verified data only. Never use placeholder or fake data.`;

          const user = await storage.getUserById(userId);
          const bookingLink = (await storage.getSettingsByUser(userId))?.calendarLink || "";

          const aiSystemPrompt = `You are a specialized ${agentName} AI agent. Your job is to search the web and find REAL leads with REAL contact information.

CRITICAL RULES:
1. Use web_search to find REAL data. NEVER fabricate or generate placeholder data.
2. Every lead MUST have: a real person's full name, a real email address, a real phone number if available, and a real company/property name.
3. FORBIDDEN: Names like "Prospect 1", "Lead #2", "Tax Lien Hunter Lead". FORBIDDEN: Emails like "contact1@prospect.com", "test@test.com". If you can't find real info, skip that lead entirely.
4. For real estate agents: MUST include the full property address in the notes field.
5. Include intent signals explaining WHY this is a good lead.
6. Write a personalized 3-5 sentence outreach email for each lead.${bookingLink ? ` Include booking link: ${bookingLink}` : ""}
7. End each outreach with: Best regards, ${user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Your Team"}${user?.companyName ? `, ${user.companyName}` : ""}

After searching, call generate_leads with agent_type="${config.agentType}" to save the leads to CRM.`;

          const tavilyKey3 = process.env.TAVILY_API_KEY;
          let agentSearchResults = "";
          if (tavilyKey3) {
            try {
              const tRes = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  api_key: tavilyKey3,
                  query: searchPrompt.slice(0, 400),
                  search_depth: "advanced",
                  max_results: 10,
                  include_answer: true,
                }),
              });
              if (tRes.ok) {
                const tData = await tRes.json();
                agentSearchResults = [
                  tData.answer || "",
                  ...(tData.results || []).map((r: any) => `Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`)
                ].join("\n\n");
              }
            } catch (e: any) {
              console.error("Tavily search error:", e.message);
            }
          } else {
            console.warn("[Agent Run] No TAVILY_API_KEY — proceeding without web search");
          }

          const finalAiSystemPrompt = aiSystemPrompt + (agentSearchResults ? `\n\nHere are web search results to help you find real leads:\n\n${agentSearchResults}` : "");

          const aiTools: any[] = [
            {
              name: "generate_leads",
              description: `Save real leads found via web search to CRM. Include agent_type="${config.agentType}" to auto-add to funnel. ONLY save leads with real names, real emails, and real contact info. Never save placeholder data.`,
              input_schema: {
                type: "object" as const,
                properties: {
                  agent_type: { type: "string" },
                  leads: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Real person's full name" },
                        email: { type: "string", description: "Real email address found via web search" },
                        phone: { type: "string", description: "Real phone number" },
                        company: { type: "string", description: "Real company or property name" },
                        address: { type: "string", description: "Physical address of the business (street, city, state, zip)" },
                        source: { type: "string" },
                        status: { type: "string" },
                        score: { type: "number" },
                        intent_signal: { type: "string" },
                        notes: { type: "string", description: "Include property address, owner details, and research notes" },
                        outreach: { type: "string" },
                      },
                      required: ["name", "email", "company", "source", "score", "outreach"],
                    },
                  },
                },
                required: ["leads", "agent_type"],
              },
            },
          ];

          console.log(`[Agent Run] Starting AI-powered search for ${agentName} (user: ${userId})`);

          let response = await aiClient.messages.create({
            model: aiModel,
            max_tokens: 8192,
            system: finalAiSystemPrompt,
            messages: [{ role: "user", content: searchPrompt }],
            tools: aiTools,
          });

          let loopCount = 0;
          const maxLoops = 10;
          let currentMessages: any[] = [{ role: "user", content: searchPrompt }];
          let leadsFound = 0;
          let funnelInfo = "";

          while (response.stop_reason === "tool_use" && loopCount < maxLoops) {
            loopCount++;
            currentMessages.push({ role: "assistant", content: response.content as any });

            const toolUseBlocks = response.content.filter(
              (block: any) => block.type === "tool_use"
            );

            const crmToolUses = toolUseBlocks.filter((t: any) => t.name !== "web_search");
            const toolResults: any[] = [];

            for (const toolUse of crmToolUses) {
              console.log(`[Agent Run] Tool: ${toolUse.name}`, JSON.stringify(toolUse.input || {}).slice(0, 300));
              try {
                const result = await executeAction(userId, toolUse.name, toolUse.input || {});
                console.log(`[Agent Run] Result: ${result.slice(0, 200)}`);

                const savedMatch = result.match(/Saved (\d+) real leads/);
                if (savedMatch) leadsFound += parseInt(savedMatch[1]);
                const funnelMatch = result.match(/Also added .+pipeline\./);
                if (funnelMatch) funnelInfo = funnelMatch[0];

                toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: result });
              } catch (toolError: any) {
                toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: `ERROR: ${toolError?.message}`, is_error: true });
              }
            }

            if (toolResults.length > 0) {
              currentMessages.push({ role: "user", content: toolResults as any });
            }

            response = await aiClient.messages.create({
              model: aiModel,
              max_tokens: 8192,
              system: finalAiSystemPrompt,
              messages: currentMessages,
              tools: aiTools,
            });
          }

          const allLeads = await storage.getLeadsByUser(userId);
          const stats = await storage.getStatsByUser(userId);
          const activeCount = allLeads.filter(l => l.status === "hot" || l.status === "qualified" || l.status === "warm").length;
          await storage.upsertStats({ userId, totalLeads: allLeads.length, activeLeads: activeCount, appointmentsBooked: stats?.appointmentsBooked || 0, conversionRate: stats?.conversionRate || 0, revenue: stats?.revenue || 0 });

          await storage.updateAgentTask(task.id, { status: "completed", completedAt: new Date(), result: JSON.stringify({ leadsFound, analyzed: true, addedToFunnel: !!funnelInfo, aiPowered: true }) });
          await storage.updateAgentConfig(configId, userId, { isRunning: false, totalLeadsFound: (config.totalLeadsFound || 0) + leadsFound } as any);
          await storage.createNotification({
            userId,
            agentType: config.agentType,
            type: "new_lead",
            title: `${agentName} Found ${leadsFound} Real Leads`,
            message: `Your agent completed an AI-powered web search and discovered ${leadsFound} real leads with verified contact info.${funnelInfo ? " " + funnelInfo : ""} Check your leads and funnels pages for details.`,
            priority: leadsFound > 5 ? "high" : "normal",
          });

          console.log(`[Agent Run] Completed: ${agentName} found ${leadsFound} real leads for user ${userId}`);
        } catch (err: any) {
          console.error("Error completing agent task:", err?.message || err);
          try {
            await storage.updateAgentTask(task.id, { status: "failed", completedAt: new Date(), result: JSON.stringify({ error: err?.message || "Unknown error" }) });
            await storage.updateAgentConfig(configId, userId, { isRunning: false } as any);
            await storage.createNotification({
              userId,
              agentType: config.agentType,
              type: "error",
              title: `${catalogEntry?.name || config.agentType} Run Failed`,
              message: `The agent encountered an error during its search. Please try again. Error: ${(err?.message || "Unknown").slice(0, 100)}`,
              priority: "high",
            });
          } catch {}
        }
      })();
      res.json({ task, message: `${catalogEntry?.name || config.agentType} is running...` });
    } catch (error) {
      console.error("Error running agent:", error);
      res.status(500).json({ message: "Failed to run agent" });
    }
  });

  // ---- TAX LIEN CONFIG ENDPOINTS ----

  app.get("/api/agents/tax-lien/config", isAuthenticated, (_req, res) => {
    res.json({
      availableStates: Object.entries(STATE_DATA).map(([code, data]) => ({
        code,
        name: STATE_NAMES[code],
        interestRate: data.interestRate,
        redemptionPeriod: data.redemptionPeriod,
        auctionType: data.auctionType,
        keyCounties: data.keyCounties,
        auctionPlatforms: data.auctionPlatforms,
      })),
      propertyTypes: [
        { value: "residential", label: "Residential" },
        { value: "commercial", label: "Commercial" },
        { value: "vacant_land", label: "Vacant Land" },
        { value: "multi_family", label: "Multi-Family" },
      ],
      bidStrategies: [
        { value: "conservative", label: "Conservative — Low risk, steady 8-12% returns" },
        { value: "moderate", label: "Moderate — Balanced, target 12-18% returns" },
        { value: "aggressive", label: "Aggressive — Higher risk, 18-24% returns" },
      ],
    });
  });

  app.get("/api/agents/tax-lien/states/:stateCode", isAuthenticated, (req, res) => {
    const stateCode = req.params.stateCode.toUpperCase();
    const data = STATE_DATA[stateCode];
    if (!data) return res.status(404).json({ error: "State not found" });
    res.json({
      code: stateCode,
      name: STATE_NAMES[stateCode],
      ...data,
    });
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

  // ---- EMAIL LOGS ----

  app.get("/api/email-logs", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { status, source, limit: limitParam, offset: offsetParam } = req.query;
      let query = db.select().from(emailLogs).where(eq(emailLogs.userId, userId)).orderBy(desc(emailLogs.createdAt));
      const rows = await query;
      let filtered = rows;
      if (status && typeof status === "string") {
        filtered = filtered.filter(r => r.status === status);
      }
      if (source && typeof source === "string") {
        filtered = filtered.filter(r => r.source === source);
      }
      const total = filtered.length;
      const lim = parseInt(limitParam as string) || 50;
      const off = parseInt(offsetParam as string) || 0;
      filtered = filtered.slice(off, off + lim);
      res.json({ logs: filtered, total });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/email-logs/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const rows = await db.select().from(emailLogs).where(eq(emailLogs.userId, userId));
      const total = rows.length;
      const sent = rows.filter(r => r.status === "sent").length;
      const failed = rows.filter(r => r.status === "failed").length;
      const bounced = rows.filter(r => r.status === "bounced").length;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todaySent = rows.filter(r => r.status === "sent" && r.sentAt && new Date(r.sentAt) >= today).length;
      const todayFailed = rows.filter(r => r.status === "failed" && r.createdAt && new Date(r.createdAt) >= today).length;
      const todayBounced = rows.filter(r => r.status === "bounced" && r.createdAt && new Date(r.createdAt) >= today).length;
      const bySource: Record<string, { sent: number; failed: number; bounced: number }> = {};
      for (const r of rows) {
        if (!bySource[r.source]) bySource[r.source] = { sent: 0, failed: 0, bounced: 0 };
        if (r.status === "sent") bySource[r.source].sent++;
        if (r.status === "failed") bySource[r.source].failed++;
        if (r.status === "bounced") bySource[r.source].bounced++;
      }
      const recentErrors = rows.filter(r => r.status === "failed" || r.status === "bounced").slice(0, 10).map(r => ({ id: r.id, email: r.recipientEmail, error: r.errorMessage, source: r.source, status: r.status, time: r.createdAt }));
      res.json({ total, sent, failed, bounced, todaySent, todayFailed, todayBounced, bySource, recentErrors, successRate: total > 0 ? Math.round((sent / total) * 100) : 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/email-logs/:id/retry", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const logId = req.params.id;
      const [logEntry] = await db.select().from(emailLogs).where(sql`${emailLogs.id} = ${logId} AND ${emailLogs.userId} = ${userId}`);
      if (!logEntry) return res.status(404).json({ error: "Email log not found" });
      if (logEntry.status === "sent") return res.json({ message: "Already sent successfully" });
      if (!logEntry.leadId) return res.status(400).json({ error: "No lead associated, cannot retry" });

      const [lead] = await db.select().from(leads).where(eq(leads.id, logEntry.leadId));
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const user = await storage.getUserById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      const settings = await storage.getUserSettings(userId);

      const result = await sendOutreachEmail(lead, settings || {}, user);
      await db.update(emailLogs).set({ retryCount: (logEntry.retryCount || 0) + 1 }).where(eq(emailLogs.id, logId));
      if (result.success) {
        res.json({ success: true, message: "Email resent successfully" });
      } else {
        res.json({ success: false, error: result.error });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/email-logs", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await db.delete(emailLogs).where(eq(emailLogs.userId, userId));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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
      const deleted = await storage.deleteNotification(req.params.id, req.session.userId!);
      if (!deleted) {
        return res.status(404).json({ message: "Notification not found" });
      }
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

  // ---- FORUM PROSPECTOR ----
  app.post("/api/forum-prospector/search", isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { query, industry } = req.body;
      if (query && (typeof query !== "string" || query.length > 500)) {
        return res.status(400).json({ message: "Search query must be a string under 500 characters" });
      }
      if (industry && (typeof industry !== "string" || industry.length > 100)) {
        return res.status(400).json({ message: "Industry must be a string under 100 characters" });
      }

      const userAi = await getAnthropicForUser(userId);
      const ai = userAi.client;
      const model = userAi.model;

      const user = await storage.getUserById(userId);
      const companyName = user?.companyName || "our company";
      const companyDesc = user?.companyDescription || "";
      const website = user?.website || "";
      const industryLabel = industry || (user as any)?.industry || "business services";

      const forumSearchQuery = `${industryLabel} services help needed forum discussion ${query || ""} site:reddit.com OR site:quora.com OR forum`;

      const tavilyKey = process.env.TAVILY_API_KEY;
      let searchContent = "";
      if (tavilyKey) {
        try {
          const tavilyRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: tavilyKey,
              query: forumSearchQuery,
              search_depth: "advanced",
              max_results: 10,
              include_answer: true,
            }),
          });
          if (tavilyRes.ok) {
            const tavilyData = await tavilyRes.json();
            searchContent = [
              tavilyData.answer || "",
              ...(tavilyData.results || []).map((r: any) => `Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`)
            ].join("\n\n");
          }
        } catch (e: any) {
          console.error("Forum Tavily search error:", e.message);
        }
      }

      if (!searchContent) {
        return res.json({ posts: [], message: "Web search not available. Please configure Tavily API key." });
      }

      const extractPrompt = `You are a lead prospecting expert. From these web search results, extract real forum posts and community discussions where people are asking about or need ${industryLabel} services.

Search Results:
${searchContent}

For EACH relevant discussion found, provide this EXACT JSON format (return a JSON array):
[
  {
    "title": "Post/thread title",
    "url": "Direct URL to the post",
    "platform": "Reddit/Quora/Forum name",
    "snippet": "Brief excerpt of what they're asking about (2-3 sentences)",
    "postedDate": "Approximate date if available",
    "relevanceScore": 8
  }
]

IMPORTANT: Return ONLY the JSON array, no other text. Only include REAL posts with REAL URLs from the search results.`;

      const searchResponse = await ai.messages.create({
        model,
        max_tokens: 6000,
        system: "You are a lead prospecting expert. Extract structured data from search results. Return JSON data only.",
        messages: [{ role: "user", content: extractPrompt }],
      });

      const searchText = searchResponse.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n");

      let posts: any[] = [];
      try {
        const jsonMatch = searchText.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            posts = parsed.filter((p: any) => p && typeof p === "object" && p.title);
          }
        }
      } catch (parseErr) {
        console.error("Forum prospector JSON parse error:", parseErr);
        posts = [];
      }

      if (posts.length === 0) {
        return res.json({
          posts: [],
          rawResults: searchText,
          message: "Could not find structured forum results. The AI may have returned a text summary instead. Try searching with different terms.",
        });
      }

      const replyPrompt = `You are a helpful business development expert for ${companyName}. ${companyDesc ? `Company info: ${companyDesc}.` : ""} ${website ? `Website: ${website}` : ""}

For each forum post below, write a HELPFUL, NON-SPAMMY reply that:
- Genuinely addresses their question or pain point first
- Shares useful advice or insights (not just selling)
- Naturally mentions how ${companyName} can help (subtle, not pushy)
- Sounds like a real person, not a bot
- Is 3-5 sentences long
- Does NOT include links unless they ask for recommendations

Posts:
${posts.map((p: any, i: number) => `${i + 1}. [${p.platform}] "${p.title}" — ${p.snippet}`).join("\n")}

Return a JSON array of reply strings in the same order:
["reply for post 1", "reply for post 2", ...]

Return ONLY the JSON array.`;

      const replyResponse = await ai.messages.create({
        model,
        max_tokens: 4000,
        messages: [{ role: "user", content: replyPrompt }],
      });

      const replyText = replyResponse.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n");

      let replies: string[] = [];
      try {
        const jsonMatch = replyText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          replies = JSON.parse(jsonMatch[0]);
        }
      } catch {
        replies = [];
      }

      const results = posts.map((post: any, idx: number) => ({
        ...post,
        draftReply: replies[idx] || "Reply could not be generated. Try refreshing.",
      }));

      res.json({ posts: results });
    } catch (error: any) {
      console.error("Forum prospector error:", error?.message || error);
      if (error?.status === 429) {
        return res.status(429).json({ message: "AI is busy. Please wait 30 seconds and try again." });
      }
      res.status(500).json({ message: "Forum search failed. Please try again." });
    }
  });

  // ---- PLATFORM PROMOTER AGENT ----
  const PROMOTION_SEARCH_ROTATIONS = [
    "business owners looking for automation tools 2025",
    "best CRM automation platform for small business",
    "AI lead generation software for entrepreneurs",
    "automated client acquisition tools",
    "need help automating my business outreach",
    "best AI sales automation platform",
    "B2B lead generation automation tools",
    "automated email outreach tools for business",
    "AI voice calling software for sales",
    "best marketing automation for service businesses",
    "how to automate lead generation for my business",
    "looking for AI agents to find clients",
    "sales funnel automation software recommendations",
    "forum discussion AI automation tools for businesses",
    "automated prospecting tools for small business owners",
  ];

  let promotionRotationIndex = 0;

  async function runPlatformPromotion(manualQuery?: string) {
    const query = manualQuery || PROMOTION_SEARCH_ROTATIONS[promotionRotationIndex % PROMOTION_SEARCH_ROTATIONS.length];
    if (!manualQuery) promotionRotationIndex++;

    console.log(`[Platform Promoter] Starting run — query: "${query}"`);

    const [run] = await db.insert(platformPromotionRuns).values({
      status: "running",
      searchQuery: query,
      startedAt: new Date(),
    }).returning();

    try {
      const promoterTavilyKey = process.env.TAVILY_API_KEY;
      let promoterSearchContent = "";
      if (promoterTavilyKey) {
        try {
          const tRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: promoterTavilyKey,
              query: `${query} site:reddit.com OR site:quora.com OR forum OR discussion`,
              search_depth: "advanced",
              max_results: 10,
              include_answer: true,
            }),
          });
          if (tRes.ok) {
            const tData = await tRes.json();
            promoterSearchContent = [
              tData.answer || "",
              ...(tData.results || []).map((r: any) => `Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`)
            ].join("\n\n");
          }
        } catch (e: any) {
          console.error("[Platform Promoter] Tavily search error:", e.message);
        }
      }

      if (!promoterSearchContent && !openaiKey) {
        await db.update(platformPromotionRuns).set({
          status: "failed", errorMessage: "No search provider available.",
          results: JSON.stringify([]),
          completedAt: new Date(),
        }).where(eq(platformPromotionRuns.id, run.id));
        return;
      }

      if (!openaiKey) {
        await db.update(platformPromotionRuns).set({
          status: "failed", errorMessage: "OpenAI not configured.",
          results: JSON.stringify([]),
          completedAt: new Date(),
        }).where(eq(platformPromotionRuns.id, run.id));
        return;
      }

      const promoterOpenAI = new OpenAI({ apiKey: openaiKey });
      const extractResponse = await promoterOpenAI.chat.completions.create({
        model: OPENAI_MODEL,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are an expert at finding online discussions about business automation tools. Extract structured data from search results. Return JSON only." },
          { role: "user", content: `From these search results, extract forum posts and discussions where people are looking for automation tools, CRM platforms, AI lead generation, or sales automation.

Search Results:
${promoterSearchContent}

Return a JSON object with a "posts" array. Each post should have:
- "title": The post/question title
- "url": The full URL
- "platform": Where it was found (Reddit, Quora, G2, Capterra, etc.)
- "snippet": A brief summary of what they're asking/discussing
- "postedDate": When it was posted (if available)
- "relevanceScore": 1-100 how relevant to automation/CRM tools

Example: {"posts": [{"title":"Best AI automation?","url":"https://...","platform":"Reddit","snippet":"Looking for...","postedDate":"2025","relevanceScore":85}]}` },
        ],
      });

      const searchText = extractResponse.choices[0]?.message?.content || "";

      let posts: any[] = [];
      try {
        const parsed = JSON.parse(searchText);
        if (parsed?.posts && Array.isArray(parsed.posts)) {
          posts = parsed.posts.filter((p: any) => p && typeof p === "object" && p.title);
        } else {
          const jsonMatch = searchText.match(/\[[\s\S]*?\]/);
          if (jsonMatch) {
            const arrParsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(arrParsed)) {
              posts = arrParsed.filter((p: any) => p && typeof p === "object" && p.title);
            }
          }
        }
      } catch {
        posts = [];
      }

      if (posts.length === 0) {
        await db.update(platformPromotionRuns).set({
          status: "completed",
          postsFound: 0,
          draftsGenerated: 0,
          results: JSON.stringify([]),
          completedAt: new Date(),
        }).where(eq(platformPromotionRuns.id, run.id));
        console.log("[Platform Promoter] No posts found for query:", query);
        return;
      }

      const replyGenResponse = await promoterOpenAI.chat.completions.create({
        model: OPENAI_MODEL,
        max_tokens: 4096,
        messages: [
          { role: "system", content: "You are a helpful tech community member who has genuine experience with ArgiFlow (argilette.co). Return a JSON array of reply strings." },
          { role: "user", content: `ArgiFlow key features to naturally mention when relevant:
- AI-powered lead generation with 10+ specialized agents
- Voice AI calling that qualifies leads and books appointments
- Automated email outreach with AI-personalized messages
- Forum Prospector that finds warm leads on Reddit/Quora/forums
- Visual workflow builder with 30+ action types
- Built-in CRM with lead scoring
- Sales funnels with Kanban-style pipeline
- Website: argilette.co

For each of these ${posts.length} forum posts, write a GENUINELY HELPFUL reply that:
1. Actually answers their question first
2. Shares specific relevant tips
3. Naturally mentions ArgiFlow ONLY where it fits
4. Sounds like a real person, not marketing copy
5. Is 3-6 sentences long
6. Includes argilette.co only once, naturally

Posts:
${posts.map((p: any, i: number) => `${i + 1}. "${p.title}" — ${p.snippet}`).join("\n")}

Return a JSON array of reply strings in the same order:
["Reply to post 1...", "Reply to post 2..."]` },
        ],
      });

      const replyText = replyGenResponse.choices[0]?.message?.content || "";

      let replies: string[] = [];
      try {
        const jsonMatch = replyText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          replies = JSON.parse(jsonMatch[0]);
        }
      } catch {
        replies = [];
      }

      const results = posts.map((post: any, idx: number) => ({
        ...post,
        draftReply: replies[idx] || "Reply could not be generated.",
        engagementStatus: "pending",
      }));

      // ── AUTO-ENGAGE: Extract contacts and send outreach ──
      let emailsSentCount = 0;
      try {
        const contactExtractResponse = await promoterOpenAI.chat.completions.create({
          model: OPENAI_MODEL,
          max_tokens: 4096,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You extract business contact information from forum posts and discussions. Return JSON only." },
            { role: "user", content: `From these forum posts about automation tools, extract any business contacts, company names, or email addresses of people who could benefit from ArgiFlow (argilette.co) — an AI-powered business automation platform.

Look for:
- Business owners mentioning their company names
- People sharing their websites or business details
- Usernames that hint at business ownership
- Any email addresses mentioned
- Company domains from URLs or signatures

Posts:
${posts.map((p: any, i: number) => `${i + 1}. "${p.title}" on ${p.platform}\nURL: ${p.url}\nSnippet: ${p.snippet}`).join("\n\n")}

Return a JSON object with a "contacts" array. Each contact should have:
- "name": Person/business name (best guess from username or post content)
- "company": Company name if identifiable
- "email": Email if found, or null
- "domain": Business domain if identifiable from URL or content
- "postIndex": Which post number (0-indexed) this contact came from
- "context": Brief note about what they're looking for

Only include contacts where you can identify at least a name and some business context. Do NOT invent emails.
Example: {"contacts": [{"name":"John Smith","company":"Smith Marketing","email":null,"domain":"smithmarketing.com","postIndex":0,"context":"Looking for lead gen automation"}]}` },
          ],
        });

        const contactText = contactExtractResponse.choices[0]?.message?.content || "";
        let contacts: any[] = [];
        try {
          const parsed = JSON.parse(contactText);
          contacts = parsed?.contacts || [];
        } catch { contacts = []; }

        if (contacts.length > 0) {
          console.log(`[Platform Promoter] Found ${contacts.length} potential contacts to engage`);

          const allUsers = await storage.getAllUsers();
          const adminUser = allUsers.find((u: any) => u.email === "abel@argilette.com");
          const [adminSettings] = adminUser ? await db.select().from(userSettings).where(eq(userSettings.userId, adminUser.id)) : [null];

          if (adminUser && adminSettings) {
            for (const contact of contacts) {
              const postIdx = typeof contact.postIndex === "number" ? (contact.postIndex >= 1 && contact.postIndex <= posts.length ? contact.postIndex - 1 : contact.postIndex) : -1;

              if (!contact.email) {
                if (postIdx >= 0 && postIdx < results.length) {
                  results[postIdx].engagementStatus = "no_email";
                }
                continue;
              }

              try {
                const outreachContent = `Hi ${contact.name?.split(" ")[0] || "there"},

I noticed you were looking into ${contact.context || "automation tools for your business"} — great timing!

I wanted to share ArgiFlow (argilette.co) with you. It's an AI-powered platform that combines lead generation, automated outreach, CRM, and even AI voice calling into one tool. A lot of business owners use it to automate their entire client acquisition pipeline.

Here's what makes it different:
• AI agents that find and qualify leads 24/7
• Automated email sequences with AI personalization
• Built-in CRM with lead scoring
• Voice AI that books appointments for you

We offer a 15-day free trial with full Pro access — no credit card required.

Would love to hear if this fits what you're looking for. Feel free to check it out at argilette.co or reply here with any questions.

Best,
The ArgiFlow Team`;

                const promoterLead = {
                  id: `promo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  name: contact.name || "Business Owner",
                  email: contact.email,
                  company: contact.company || "",
                  outreach: outreachContent,
                };

                const sendResult = await sendOutreachEmail(promoterLead, adminSettings, adminUser);
                if (sendResult.success) {
                  emailsSentCount++;
                  if (postIdx >= 0 && postIdx < results.length) {
                    results[postIdx].engagementStatus = "sent";
                    results[postIdx].engagedEmail = contact.email;
                  }
                  console.log(`[Platform Promoter] Outreach sent to ${contact.email}`);
                  try {
                    await logEmail({ userId: adminUser.id, recipientEmail: contact.email, recipientName: contact.name, subject: `Quick question for ${contact.company || contact.name}`, status: "sent", provider: "smtp", source: "platform-promoter" });
                  } catch {}
                } else {
                  if (postIdx >= 0 && postIdx < results.length) {
                    results[postIdx].engagementStatus = "failed";
                    results[postIdx].engagementError = sendResult.error;
                  }
                  console.warn(`[Platform Promoter] Failed to send to ${contact.email}: ${sendResult.error}`);
                  try {
                    await logEmail({ userId: adminUser.id, recipientEmail: contact.email, recipientName: contact.name, subject: `Quick question for ${contact.company || contact.name}`, status: "failed", provider: "smtp", source: "platform-promoter", errorMessage: sendResult.error });
                  } catch {}
                }
                await new Promise(r => setTimeout(r, 3000));
              } catch (engErr: any) {
                console.error(`[Platform Promoter] Engagement error for ${contact.email}:`, engErr.message);
                if (postIdx >= 0 && postIdx < results.length) {
                  results[postIdx].engagementStatus = "error";
                }
              }
            }
          } else {
            console.log(`[Platform Promoter] No admin user/settings found, skipping auto-engage`);
          }
        } else {
          console.log(`[Platform Promoter] No extractable contacts found`);
        }
      } catch (engErr: any) {
        console.error(`[Platform Promoter] Contact extraction error:`, engErr.message);
      }

      await db.update(platformPromotionRuns).set({
        status: "completed",
        postsFound: posts.length,
        draftsGenerated: replies.length,
        emailsSent: emailsSentCount,
        results: JSON.stringify(results),
        completedAt: new Date(),
      }).where(eq(platformPromotionRuns.id, run.id));

      console.log(`[Platform Promoter] Completed — ${posts.length} posts found, ${replies.length} drafts, ${emailsSentCount} emails sent`);

      if (emailsSentCount > 0) {
        const notifUser = (await storage.getAllUsers()).find((u: any) => u.email === "abel@argilette.com");
        if (notifUser) {
          await storage.createNotification({
            userId: notifUser.id,
            type: "email",
            title: "Platform Promoter: Outreach Sent",
            message: `Engaged ${emailsSentCount} prospect${emailsSentCount > 1 ? 's' : ''} from forum discussions about automation tools.`,
            read: false,
          });
        }
      }
    } catch (error: any) {
      console.error("[Platform Promoter] Error:", error?.message);
      await db.update(platformPromotionRuns).set({
        status: "failed",
        errorMessage: error?.message || "Unknown error",
        completedAt: new Date(),
      }).where(eq(platformPromotionRuns.id, run.id));
    }
  }

  // Background: run 5 times per day (every 4.8 hours)
  const PLATFORM_PROMOTER_INTERVAL = Math.round((24 / 5) * 60 * 60 * 1000);
  setInterval(() => {
    runPlatformPromotion().catch(err => console.error("[Platform Promoter] Scheduler error:", err));
  }, PLATFORM_PROMOTER_INTERVAL);
  runPlatformPromotion().catch(err => console.error("[Platform Promoter] Initial run error:", err));
  console.log("[Platform Promoter] Scheduled to run 5 times per day (every ~4.8 hours). Manual trigger available at /api/platform-promoter/trigger");

  app.get("/api/platform-promoter/status", isAuthenticated, async (req, res) => {
    try {
      const runs = await db.select().from(platformPromotionRuns)
        .orderBy(desc(platformPromotionRuns.startedAt))
        .limit(20);
      res.json({ runs });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get promotion status" });
    }
  });

  app.get("/api/platform-promoter/run/:id", isAuthenticated, async (req, res) => {
    try {
      const runId = parseInt(req.params.id);
      const [run] = await db.select().from(platformPromotionRuns)
        .where(eq(platformPromotionRuns.id, runId));
      if (!run) return res.status(404).json({ message: "Run not found" });
      res.json(run);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get run details" });
    }
  });

  app.post("/api/auto-engage/trigger", isAuthenticated, async (req, res) => {
    try {
      processAutoHotLeadEngagement().catch(err =>
        console.error("[AutoEngage] Manual trigger error:", err)
      );
      res.json({ message: "Auto hot-lead engagement triggered — processing in background" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to trigger auto-engagement" });
    }
  });

  app.post("/api/platform-promoter/trigger", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.body;
      runPlatformPromotion(query || undefined).catch(err =>
        console.error("[Platform Promoter] Manual trigger error:", err)
      );
      res.json({ message: "Platform promotion run started", query: query || "auto-rotation" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to trigger promotion run" });
    }
  });

  registerSequenceRoutes(app);
  registerLinkedinRoutes(app);
  registerIntentRoutes(app);
  registerTeamRoutes(app);
  registerAnalyticsRoutes(app);
  registerCrmRoutes(app);
  registerWebhookRoutes(app);
  registerAgencyRoutes(app);
  registerGhlRoutes(app);
  registerWorkflowRoutes(app);
  startWorkflowEngine();
  startSequenceAutomationEngine();

  app.get("/api/sequence-automation/status", isAuthenticated, (_req, res) => {
    res.json(getAutomationStatus());
  });

  app.post("/api/sequence-automation/run-now", isAuthenticated, async (_req, res) => {
    processSequenceAutomation().catch(err => console.error("[SeqAuto] Manual run error:", err.message));
    res.json({ message: "Automation cycle triggered" });
  });

  app.post("/api/sequence-automation/enroll", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { leadId, sequenceId } = req.body;
      if (!leadId) return res.status(400).json({ message: "leadId required" });
      const enrolled = await autoEnrollLeadInSequence(userId, leadId, sequenceId);
      res.json({ success: enrolled, message: enrolled ? "Lead enrolled in sequence" : "Already enrolled or no active sequence" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  fixIncorrectLifetimeTrials().catch(err => console.error("Trial fix error:", err));

  return httpServer;
}

async function fixIncorrectLifetimeTrials() {
  try {
    const { eq, and } = await import("drizzle-orm");
    const { subscriptions } = await import("@shared/schema");
    const ownerEmail = "abel@argilette.com";
    const adminEmail = "babalekpam@gmail.com";
    const ownerUser = await storage.getUserByEmail(ownerEmail);
    const adminUser = await storage.getUserByEmail(adminEmail);
    const protectedIds = new Set<string>();
    if (ownerUser) protectedIds.add(ownerUser.id);
    if (adminUser) protectedIds.add(adminUser.id);

    const allSubs = await db.select().from(subscriptions).where(
      and(
        eq(subscriptions.status, "active"),
        eq(subscriptions.paymentMethod, "lifetime"),
      )
    );
    let fixed = 0;
    for (const sub of allSubs) {
      if (protectedIds.has(sub.userId)) continue;
      if (sub.notes?.includes("Platform Owner") || sub.notes?.includes("Platform Admin")) continue;
      const trialEnd = new Date(new Date(sub.createdAt!).getTime() + 14 * 24 * 60 * 60 * 1000);
      if (trialEnd < new Date()) {
        await storage.updateSubscription(sub.id, {
          plan: "starter",
          status: "expired",
          paymentMethod: "none",
          trialEndsAt: trialEnd,
          currentPeriodEnd: trialEnd,
          notes: "15-day Pro trial expired — upgrade to continue",
        });
      } else {
        await storage.updateSubscription(sub.id, {
          status: "trial",
          paymentMethod: "none",
          trialEndsAt: trialEnd,
          currentPeriodEnd: trialEnd,
          notes: "15-day Pro trial (corrected from lifetime)",
        });
      }
      fixed++;
    }
    if (fixed > 0) console.log(`[Trial Fix] Corrected ${fixed} incorrect lifetime subscriptions to 15-day trials`);
  } catch (error) {
    console.error("Error fixing lifetime trials:", error);
  }
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

async function ensureOwnerPassword() {
  const ownerEmail = "abel@argilette.com";
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return;
  try {
    const user = await storage.getUserByEmail(ownerEmail);
    if (!user) return;
    const newHash = await hashPassword(adminPassword);
    await storage.updateUser(user.id, {
      passwordHash: newHash,
      industry: "Revenue Cycle Management / Medical Billing",
      companyName: "Track-Med Billing Solutions",
      firstName: "Clara",
      lastName: "Motena",
    });
    const settings = await storage.getSettingsByUser(user.id);
    if (settings) {
      await storage.upsertSettings({
        ...settings,
        userId: user.id,
        grasshopperNumber: settings.grasshopperNumber || "+16154826768",
        calendarLink: settings.calendarLink || "https://www.tmbds.com/schedule",
      });
    }
    console.log("Owner password & profile synced from ADMIN_PASSWORD secret");
  } catch (err) {
    console.error("Error syncing owner password:", err);
  }
}

async function backfillMedBillingFunnel() {
  try {
    const ownerUser = await storage.getUserByEmail("abel@argilette.com");
    if (!ownerUser) return;

    const allLeads = await storage.getLeadsByUser(ownerUser.id);
    const medBillingLeads = allLeads.filter(l => {
      const src = (l.source || "").toLowerCase();
      return src.includes("dataseo") || src.includes("datafor") || src.includes("medical billing") || src.includes("lead hunter") || src.includes("web research");
    });

    if (medBillingLeads.length === 0) return;

    const funnelInfo = await findOrCreateAgentFunnel(ownerUser.id, "medical-billing");
    if (!funnelInfo) return;

    const existingDeals = await storage.getFunnelDeals(funnelInfo.funnelId);
    const existingEmails = new Set(existingDeals.map(d => (d.contactEmail || "").toLowerCase().trim()).filter(Boolean));
    const existingNames = new Set(existingDeals.map(d => (d.contactName || "").toLowerCase().trim()).filter(Boolean));

    let added = 0;
    for (const lead of medBillingLeads) {
      const emailLC = (lead.email || "").toLowerCase().trim();
      const nameLC = (lead.name || "").toLowerCase().trim();
      if ((emailLC && existingEmails.has(emailLC)) || (nameLC && existingNames.has(nameLC))) continue;
      await storage.createFunnelDeal({
        funnelId: funnelInfo.funnelId,
        stageId: funnelInfo.firstStageId,
        userId: ownerUser.id,
        contactName: lead.name || "",
        contactEmail: lead.email || "",
        value: 0,
        status: "open",
      });
      existingEmails.add(emailLC);
      existingNames.add(nameLC);
      added++;
    }
    if (added > 0) {
      console.log(`[Startup] Backfilled ${added} leads into Sales Pipeline`);
    }
  } catch (err) {
    console.error("[Startup] Error backfilling funnel:", err);
  }
}

async function cleanupFakeLeads() {
  try {
    const result = await db.execute(sql`
      DELETE FROM leads WHERE 
        phone LIKE '%555%'
        OR email ~* '@(familypractice|orthoclinic|urgentcare|familymed|internalmed|dentistry|dermatology|pediatrics|cardiology|oncology|neurology|gastro|pulmonology|rheumatology|endocrinology|nephrology|urology|geriatrics|sleepmedic|pathology|brownfamily|browngastro|brownallergy|brownorthopedics|brownpediatrics|browneye|atlantaurology|gastroenterologystl|geriatricsstl|oncologystl)\.(com|org|net)$'
      RETURNING id
    `);
    const count = (result as any).rowCount || (result as any).length || 0;
    if (count > 0) {
      console.log(`[Startup Cleanup] Removed ${count} fake/gatekeeper leads (555 phones, generic domains, generic emails)`);
    }
  } catch (error) {
    console.error("[Startup Cleanup] Error:", error);
  }
}

async function cleanupNonMedicalLeads() {
  try {
    const owner = await storage.getUserByEmail("abel@argilette.com");
    if (!owner) return;
    const userIsMedBilling = /medical billing|rcm|revenue cycle/i.test(owner.industry || "");
    if (!userIsMedBilling) return;

    const allLeads = await storage.getLeadsByUser(owner.id);
    const healthcareRx = /\b(medical|medic|health|healthcare|clinic|practice|physician|doctor|dr\b|dds|dmd|dental|dentist|dent|chiropractic|chiropract|optometr|ophthalm|dermatolog|cardiol|orthoped|pediatr|ob.?gyn|urol|neurolog|oncolog|gastro|pulmon|nephrol|endocrin|rheumatol|allerg|immunol|podiatr|psychiatr|psycholog|therap|physical therapy|urgent care|walk.?in|surgery center|surgical|ambulatory|hospital|hospice|home health|nursing|assisted living|rehab|behavioral|mental health|wellness|pharma|laboratory|radiology|imaging|patholog|anesthes|pain management|family medicine|internal medicine|primary care|community health|fqhc|med\s*spa|aesthetic|cosmetic|plastic surg|oral surg|periodon|endodont|orthodont|prosthodont|smile|vision|eye\s*care|chiro|skin|laser)\b/i;
    const nonMedicalRx = /\b(financial|finance|finserv|fin\s*tech|wealth|capital management|investment|banking|bank\s*systems|money growth|trustee|law\s*firm|lawyer|legal\s*services|real\s*estate|realty|mortgage|insure\s*financial|consulting\s*group|staffing|roofing|plumbing|hvac|restaurant|retail|procurement|community bank|first bank|pro financial|priority financial|four cities financial|abc finance|step up finance|gem financial|insure financial|agc financial)\b/i;

    const toDelete: { id: string; name: string; company: string }[] = [];
    for (const lead of allLeads) {
      const text = `${lead.company || ""} ${lead.notes || ""} ${lead.name || ""} ${lead.intentSignal || ""}`;
      if (nonMedicalRx.test(text) && !healthcareRx.test(text)) {
        toDelete.push({ id: lead.id, name: lead.name || "", company: lead.company || "" });
      }
    }

    if (toDelete.length > 0) {
      for (const lead of toDelete) {
        await db.delete(leads).where(eq(leads.id, lead.id));
      }
      console.log(`[Startup Cleanup] Removed ${toDelete.length} non-medical/financial leads from CRM:`);
      for (const r of toDelete) {
        console.log(`  - ${r.name} (${r.company})`);
      }
    }
  } catch (err) {
    console.error("[Startup Cleanup] Error removing non-medical leads:", err);
  }
}

async function restoreLeadsFromFunnel() {
  try {
    const owner = await storage.getUserByEmail("abel@argilette.com");
    if (!owner) return;

    const allFunnels = await storage.getFunnelsByUser(owner.id);
    if (!allFunnels.length) return;

    const existingLeads = await storage.getLeadsByUser(owner.id);
    const existingEmails = new Set(existingLeads.map((l: any) => l.email?.toLowerCase()).filter(Boolean));
    const existingNames = new Set(existingLeads.map((l: any) => l.name?.toLowerCase()).filter(Boolean));

    let restored = 0;
    for (const funnel of allFunnels) {
      const deals = await storage.getFunnelDeals(funnel.id);
      const stages = await storage.getFunnelStages(funnel.id);
      const stageMap = new Map(stages.map((s: any) => [s.id, s.name]));

      for (const deal of deals) {
        const email = (deal.contactEmail || "").toLowerCase().trim();
        const name = (deal.contactName || "").trim();
        if (!name) continue;

        const nameKey = name.toLowerCase();
        if (existingEmails.has(email) && email) continue;
        if (existingNames.has(nameKey)) continue;

        const stageName = stageMap.get(deal.stageId) || "";
        let status = "new";
        if (/contacted/i.test(stageName)) status = "contacted";
        else if (/qualified/i.test(stageName)) status = "qualified";
        else if (/proposal/i.test(stageName)) status = "proposal";
        else if (/closed|won/i.test(stageName)) status = "won";

        const nameParts = name.split(" - ");
        const leadName = nameParts[0].trim();
        const company = nameParts.length > 1 ? nameParts.slice(1).join(" - ").trim() : "";

        let score = 50;
        if (status === "contacted") score = 65;
        else if (status === "qualified") score = 80;
        else if (status === "proposal") score = 85;
        else if (status === "won") score = 95;

        await storage.createLead({
          userId: owner.id,
          name: leadName,
          email: email || "",
          phone: "",
          company,
          source: "restored-from-funnel",
          status: status === "won" ? "converted" : status === "qualified" ? "warm" : status,
          score,
          notes: `Restored from ${funnel.name} pipeline (${stageName} stage)`,
        });
        existingEmails.add(email);
        existingNames.add(nameKey);
        restored++;
      }
    }

    if (restored > 0) {
      console.log(`[Restore] Restored ${restored} leads from funnel deals back into CRM`);
    }
  } catch (error) {
    console.error("[Restore] Error restoring leads from funnel:", error);
  }
}

async function backfillDentalLeads() {
  try {
    const owner = await storage.getUserByEmail("abel@argilette.com");
    if (!owner) return;
    const dentalLeads = [
      { name: "Dr. Hunter Fleenor", email: "FairviewFamilyDentistryTN@gmail.com", phone: "(615) 266-2645", company: "Fairview Family Dentistry", source: "fairviewfamilydentistrytn.com", status: "contacted", score: 78, intentSignal: "Looking for billing solutions", notes: "Owner, interested in improving billing efficiency.", outreach: "Email sent to discuss potential collaboration." },
      { name: "Dr. Timothy Pfountz", email: "pending@smilelebanon.com", phone: "(615) 453-9937", company: "Smile Solutions of Lebanon", source: "smilelebanon.com", status: "new", score: 75, intentSignal: "Looking for efficient billing solutions", notes: "Owner of the practice; needs to improve billing processes. Email not yet found - requires follow-up search.", outreach: "Need to gather email for outreach." },
      { name: "Dr. Steven Brock", email: "contact@mydentalimage.com", phone: "865-531-1715", company: "Dental Images", source: "mydentalimage.com", status: "new", score: 80, intentSignal: "Seeking external billing support", notes: "Co-Owner, looking for billing assistance. Email needs verification.", outreach: "Ready to engage on billing services." },
      { name: "HealthPoint Family Care", email: "", phone: "(859) 488-0304", company: "HealthPoint Family Care", source: "healthpointky.com", status: "new", score: 82, intentSignal: "Hiring Dental Billing Specialist - actively enhancing billing processes", notes: "Florence, KY. Currently hiring for Dental Billing Specialist; looking to improve billing efficiency. Email needs to be found.", outreach: "Ready for outreach on billing services." },
    ];
    let inserted = 0;
    for (const lead of dentalLeads) {
      const existing = await db.execute(sql`SELECT id FROM leads WHERE user_id = ${owner.id} AND (email = ${lead.email} OR (company = ${lead.company} AND name = ${lead.name})) LIMIT 1`);
      const rows = (existing as any).rows || existing;
      if (rows && rows.length > 0) continue;
      await storage.createLead({ userId: owner.id, ...lead });
      inserted++;
    }
    if (inserted > 0) {
      console.log(`[Backfill] Inserted ${inserted} dental practice leads for owner`);
      const funnels = await storage.getFunnelsByUser(owner.id);
      const salesFunnel = funnels.find((f: any) => f.name.includes("Sales") || f.name.includes("Pipeline"));
      if (salesFunnel) {
        const stages = await storage.getFunnelStages(salesFunnel.id);
        const newLeadsStage = stages.find((s: any) => s.name === "New Leads");
        const contactedStage = stages.find((s: any) => s.name === "Contacted");
        if (newLeadsStage || contactedStage) {
          for (const lead of dentalLeads) {
            const existingDeal = await db.execute(sql`SELECT id FROM funnel_deals WHERE funnel_id = ${salesFunnel.id} AND contact_name ILIKE ${'%' + lead.name.split(' ').pop() + '%'} LIMIT 1`);
            const dealRows = (existingDeal as any).rows || existingDeal;
            if (dealRows && dealRows.length > 0) continue;
            const stageId = lead.status === "contacted" && contactedStage ? contactedStage.id : (newLeadsStage?.id || stages[0]?.id);
            if (stageId) {
              await storage.createFunnelDeal({ funnelId: salesFunnel.id, stageId, userId: owner.id, contactName: `${lead.name} - ${lead.company}`, contactEmail: lead.email, value: 0, status: "active" });
            }
          }
          console.log(`[Backfill] Added leads to Sales Pipeline`);
        }
      }
    }
  } catch (error) {
    console.error("[Backfill Dental] Error:", error);
  }
}

async function ensureAllUsersProLifetime() {
  try {
    const allUsers = await storage.getAllUsers();
    let upgraded = 0;
    for (const user of allUsers) {
      const existing = await storage.getSubscriptionByUser(user.id);
      if (!existing) {
        await storage.createSubscription({
          userId: user.id,
          plan: "growth",
          status: "active",
          amount: 0,
          paymentMethod: "lifetime",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date("2099-12-31"),
          notes: "Lifetime Growth — All accounts",
        });
        upgraded++;
      } else if (existing.status !== "active" || existing.plan === "starter") {
        await storage.updateSubscription(existing.id, {
          plan: "growth",
          status: "active",
          amount: 0,
          currentPeriodEnd: new Date("2099-12-31"),
          notes: "Lifetime Growth — All accounts",
        });
        upgraded++;
      }
    }
    if (upgraded > 0) {
      console.log(`Upgraded ${upgraded} user(s) to Lifetime Pro`);
    }
  } catch (err) {
    console.error("Error ensuring all users Pro lifetime:", err);
  }
}
