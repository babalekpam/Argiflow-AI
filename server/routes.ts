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
import sgMail from "@sendgrid/mail";

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

function randomPick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

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
      for (const lead of leadsData.slice(0, 20)) {
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
      }
      const allLeads = await storage.getLeadsByUser(userId);
      const stats = await storage.getStatsByUser(userId);
      const activeCount = allLeads.filter(l => l.status === "hot" || l.status === "qualified" || l.status === "warm").length;
      await storage.upsertStats({ userId, totalLeads: allLeads.length, activeLeads: activeCount, appointmentsBooked: stats?.appointmentsBooked || 0, conversionRate: stats?.conversionRate || 0, revenue: stats?.revenue || 0 });
      return `Saved ${created.length} real leads to CRM: ${created.join(", ")}. Total leads now: ${allLeads.length}.`;
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

      const sgKey = settings?.sendgridApiKey || process.env.SENDGRID_API_KEY;
      if (!sgKey) {
        return "SendGrid API key not configured. Tell the user to go to Settings > Integrations and add their SendGrid API key to enable direct email sending.";
      }

      sgMail.setApiKey(sgKey);
      const senderEmail = "info@track-med.com";
      const senderName = user?.companyName
        ? `${user.firstName || ""} from ${user.companyName}`.trim()
        : `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "ArgiFlow";

      let sent = 0;
      let failed = 0;
      const sentNames: string[] = [];
      const failedNames: string[] = [];

      for (const lead of targets) {
        const result = await sendOutreachEmail(lead, settings, user);
        if (result.success) {
          await storage.updateLead(lead.id, { outreachSentAt: new Date(), status: "warm" });
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
          return "Twilio is not connected. Ask the user to set up their Twilio integration in the project settings.";
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

  const sendgridKey = userSettings?.sendgridApiKey || process.env.SENDGRID_API_KEY;
  if (!sendgridKey) {
    return { success: false, error: "SendGrid API key not configured. Go to Settings > Integrations to add it." };
  }

  sgMail.setApiKey(sendgridKey);

  const senderEmail = "info@track-med.com";
  const senderName = user?.companyName
    ? `${user.firstName || ""} from ${user.companyName}`.trim()
    : `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "ArgiFlow";

  const subjectLine = lead.company
    ? `Quick question for ${lead.company}`
    : `Quick question, ${lead.name.split(" ")[0]}`;

  const baseUrl = getBaseUrl();
  let htmlBody = lead.outreach.replace(/\n/g, "<br>");
  htmlBody = wrapLinksForTracking(htmlBody, lead.id, baseUrl);
  htmlBody = injectTrackingPixel(htmlBody, lead.id, baseUrl);

  try {
    await sgMail.send({
      to: lead.email,
      from: { email: senderEmail, name: senderName },
      subject: subjectLine,
      text: lead.outreach,
      html: htmlBody,
    });
    return { success: true };
  } catch (err: any) {
    console.error("SendGrid error:", err?.response?.body || err);
    const sgError = err?.response?.body?.errors?.[0]?.message || err?.message || "Failed to send";
    return { success: false, error: sgError };
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

  const systemPrompt = `You are ArgiFlow AI — the senior AI strategist and automation expert at ArgiFlow, a premium AI Automation Agency specializing in Voice AI, Process Automation, Lead Generation Chatbots, AI Receptionists, and CRM Integration.

You are a trusted business advisor, not a generic chatbot. Communicate with the authority and polish of a top-tier marketing consultant. Be direct, data-driven, and action-oriented.
${companyBlock}
CURRENT CLIENT DATA:
- Leads: ${allLeads.length} total (${allLeads.filter(l => l.status === "hot").length} hot, ${allLeads.filter(l => l.status === "qualified").length} qualified, ${allLeads.filter(l => l.status === "warm").length} warm, ${allLeads.filter(l => l.status === "new").length} new)
- Appointments: ${allAppts.length} total (${allAppts.filter(a => a.status === "scheduled").length} scheduled, ${allAppts.filter(a => a.status === "completed").length} completed)
- AI Agents: ${allAgents.length} deployed (${allAgents.filter(a => a.status === "active").length} active)
${allLeads.length > 0 ? `- Pipeline: ${allLeads.slice(0, 5).map(l => `${l.name} (${l.status}, score: ${l.score})`).join(", ")}` : "- Pipeline is empty — ready for lead generation"}
${allAgents.length > 0 ? `- Active agents: ${allAgents.map(a => `${a.name} (${a.status})`).join(", ")}` : "- No agents deployed yet"}${websiteKnowledgeBlock}

CAPABILITIES:
You have CRM management tools and web search at your disposal. Use them proactively:
- **Lead Generation**: When the user asks for leads, you MUST use web_search FIRST to find REAL businesses and contacts. Search for real companies in their industry, extract actual names, emails, phone numbers, and website URLs from public directories, business listings, and company websites. Then save them using the generate_leads tool. NEVER make up fictional contact information — every lead must come from actual web search results.
- **Direct Outreach**: After generating leads, if the user says to "engage", "reach out", "email", "send", or "contact" them, IMMEDIATELY use the send_outreach tool to send the personalized outreach emails directly. You can also use this when the user asks you to follow up or engage existing leads.
- **SMS Messaging**: If the user asks to "text", "SMS", or "send a text" to leads or a phone number, use the send_sms tool. You can text individual leads by ID, a direct phone number, or all leads with phone numbers at once.
- **CRM Tools**: Book appointments, activate AI agents, follow up with prospects, pull performance stats
- **Web Search**: Research market trends, competitors, industry data, real-time information, and find real business contacts
- Combine multiple tools in a single response when beneficial. For example, generate leads AND send outreach in the same flow when the user asks to "find and engage prospects".

LEAD GENERATION RULES (CRITICAL):
1. ALWAYS search the web first before generating leads
2. Focus on INTENT-BASED prospecting — find companies that are ACTIVELY LOOKING FOR the services your client offers. Use smart search strategies:
   - Search for companies posting job listings or RFPs related to the client's services (e.g., "companies looking for medical billing services", "RFP medical billing outsourcing 2025")
   - Search for businesses that recently lost a provider or are switching (e.g., "company switching billing provider", "medical practice needs new billing company")
   - Search forums, Reddit, LinkedIn, and review sites where businesses ask for recommendations (e.g., "recommend medical billing company reddit", "best medical billing service reviews")
   - Search for businesses in pain-point situations (e.g., "medical practice billing challenges", "healthcare providers struggling with claims")
   - Search industry directories and lead sources (e.g., "new medical practices opening [location]", "healthcare startups 2025")
   - Search for companies currently using a competitor and may be ready to switch (e.g., "[competitor name] alternatives", "[competitor] reviews complaints")
3. Extract REAL contact details: actual business names, real email addresses, real phone numbers from their websites and public profiles
4. If you can't find a direct email, look for the company's contact page or use common patterns (info@company.com, contact@company.com)
5. Include the company name and source (where you found them) for each lead
6. Score leads based on INTENT signals — higher scores for companies actively seeking the service:
   - 80-100: Actively posted an RFP or job listing seeking this service
   - 60-79: Showed clear intent signals (asked for recommendations, posted complaints about current provider)
   - 40-59: Fits the target profile but no clear active-search signal yet
7. If the user doesn't specify an industry or location, use their company profile information
8. When presenting leads, explain WHY each lead is a good prospect — what intent signal did you find? Why might they need the client's service right now?
9. For EVERY lead, you MUST generate a personalized outreach email draft (3-5 sentences). The outreach should:
   - Reference their specific situation or pain point you discovered
   - Mention a relevant benefit of the client's service
   - Include a clear call-to-action with a booking link if available. ${bookingLink ? `ALWAYS include this booking link in the outreach: ${bookingLink} — e.g., "I'd love to chat — you can book a quick call here: ${bookingLink}"` : 'Use a generic CTA like "Would you be open to a 15-minute call this week?"'}
   - Sound human, warm, and consultative — not salesy or spammy
   - ALWAYS end the email with this exact signature block:
     Best regards,
     Clara Motena
     Client Acquisition Director
     Track-Med Billing Solutions
     +1(615)482-6768 / (636) 244-8246
10. Also include an intent_signal field describing what buying signal you found (e.g., "Posted looking for billing help", "New practice opening", "Switching providers")
11. Include research notes about each prospect — what you learned about their business, size, challenges

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
      description: "Save researched leads to the CRM. IMPORTANT: You MUST use web_search FIRST to find real businesses/contacts before calling this tool. Search for real companies in the user's industry and location. Extract real names, emails, phone numbers, and company names from search results. NEVER invent or fabricate contact information.",
      input_schema: {
        type: "object" as const,
        properties: {
          leads: {
            type: "array",
            description: "Array of real leads found via web search, each with personalized outreach",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Real contact name (person or business name)" },
                email: { type: "string", description: "Real email address found from website or directory" },
                phone: { type: "string", description: "Real phone number found from website or directory" },
                company: { type: "string", description: "Company/business name" },
                source: { type: "string", description: "Where found: 'Web Research', 'Google', 'LinkedIn', 'Directory', etc." },
                status: { type: "string", description: "Lead status: 'new'" },
                score: { type: "number", description: "Lead score 1-100 based on intent signals" },
                intent_signal: { type: "string", description: "What buying signal was detected — e.g. 'Posted RFP for billing services', 'Complained about current provider on Reddit', 'New practice opening Q1 2025'" },
                notes: { type: "string", description: "Research notes about this prospect — why they're a good fit, what you learned about their situation" },
                outreach: { type: "string", description: "A personalized outreach email draft (3-5 sentences) referencing their specific situation, pain point, or intent signal. Include a clear call-to-action like booking a call." },
              },
              required: ["name"],
            },
          },
        },
        required: ["leads"],
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
    {
      name: "send_outreach",
      description: "Send the personalized outreach emails to leads that have outreach drafts. Use this IMMEDIATELY after generating leads when the user says to 'engage', 'reach out', 'email', 'send', or 'contact' the prospects. Can send to all unsent leads at once or specific lead IDs.",
      input_schema: {
        type: "object" as const,
        properties: {
          lead_ids: {
            type: "array",
            items: { type: "string" },
            description: "Specific lead IDs to send outreach to. If empty, sends to ALL leads with unsent outreach drafts.",
          },
          send_all: {
            type: "boolean",
            description: "If true, sends outreach to ALL leads with unsent drafts. Defaults to true if no lead_ids provided.",
          },
        },
        required: [],
      },
    },
    {
      name: "send_sms",
      description: "Send an SMS text message to a lead or phone number using Twilio. Use when the user asks to 'text', 'SMS', 'message', or 'send a text' to leads or a phone number.",
      input_schema: {
        type: "object" as const,
        properties: {
          phone: {
            type: "string",
            description: "Direct phone number to send to (e.g. +15551234567). Use this OR lead_id, not both.",
          },
          lead_id: {
            type: "string",
            description: "ID of a specific lead to send SMS to. The lead must have a phone number on file.",
          },
          message: {
            type: "string",
            description: "The SMS message body to send.",
          },
        },
        required: ["message"],
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

    let loopCount = 0;
    const maxLoops = 10;
    let currentMessages = [...claudeMessages];

    while (response.stop_reason === "tool_use" && loopCount < maxLoops) {
      loopCount++;

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      const crmToolUses = toolUseBlocks.filter(t => t.name !== "web_search");

      if (crmToolUses.length === 0) {
        const textContent = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map(b => b.text)
          .join("\n")
          .trim();
        if (textContent) return textContent;
        break;
      }

      currentMessages.push({ role: "assistant", content: response.content as any });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of crmToolUses) {
        const result = await executeAction(userId, toolUse.name, toolUse.input || {});
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      currentMessages.push({ role: "user", content: toolResults as any });

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
  if (lower.includes("lead") && (lower.includes("generate") || lower.includes("create") || lower.includes("find"))) {
    return "I need the AI engine to search the web for real leads. The fallback system can't do web searches — please try again in a moment and I'll find real businesses for you.";
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

          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-5",
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

      await storage.updateLead(lead.id, { outreachSentAt: new Date(), status: "warm" });
      res.json({ success: true, message: `Outreach sent to ${lead.name}` });
    } catch (error) {
      console.error("Error sending outreach:", error);
      res.status(500).json({ message: "Failed to send outreach" });
    }
  });

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

      if (!settings?.sendgridApiKey) {
        return res.status(400).json({ message: "SendGrid API key not configured. Go to Settings > Integrations to add it." });
      }

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const lead of unsent) {
        const result = await sendOutreachEmail(lead, settings, user);
        if (result.success) {
          await storage.updateLead(lead.id, { outreachSentAt: new Date(), status: "warm" });
          sent++;
        } else {
          failed++;
          errors.push(`${lead.name}: ${result.error}`);
        }
      }

      res.json({ success: true, sent, failed, total: unsent.length, errors: errors.slice(0, 5) });
    } catch (error) {
      console.error("Error sending bulk outreach:", error);
      res.status(500).json({ message: "Failed to send outreach emails" });
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
      const { name, type, description, status, generateScript, templateIndustry, templateFeatures } = req.body;
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
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-5",
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
