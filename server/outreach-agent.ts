// ============================================================
// ARGILETTE AI OUTREACH AGENT — Full Autonomous Pipeline
// Drop this into: server/outreach-agent.ts
//
// THE LOOP:
// 1. DISCOVER  → Find new prospects (web scraping, lead gen)
// 2. ENROLL    → Auto-add to campaign sequences
// 3. SEND      → Send personalized emails via rotation
// 4. MONITOR   → Poll IMAP for replies
// 5. CLASSIFY  → AI reads & labels every reply
// 6. RESPOND   → AI generates smart follow-ups
// 7. BOOK      → Detects interest → proposes times → books meeting
// 8. REPEAT    → Runs continuously on schedule
// ============================================================

import { db } from "./db";
import { eq, and, sql, lte, isNull, desc, count } from "drizzle-orm";
import {
  emailAccounts, campaigns, campaignSequences, campaignLeads,
  campaignSendingAccounts, inboxMessages, campaignDailyAnalytics,
} from "../shared/instantly-schema";
import {
  leads, appointments, notifications, agentTasks, agentConfigs,
  userSettings,
} from "../shared/schema";
import { instantlyEngine } from "./instantly-engine";
import nodemailer from "nodemailer";
import { storage } from "./storage";

// ============================================================
// TYPES
// ============================================================

interface AgentConfig {
  userId: string;
  // Business Profile (makes the agent work for ANY business type)
  businessType: string;             // e.g. "medical_billing", "marketing_agency", "real_estate", "saas", "consulting", "custom"
  businessDescription: string;      // What the user's business does
  targetAudience: string;           // Who they want to reach (e.g. "dental offices", "restaurants", "ecommerce stores")
  valueProposition: string;         // What value they offer prospects
  competitorKeywords: string[];     // Keywords to filter out competitors
  // Discovery
  discoveryEnabled: boolean;
  discoveryQueries: string[];       // Search queries for finding prospects
  discoverySource: string;          // web | linkedin | apollo | manual
  dailyProspectLimit: number;       // Max new prospects per day
  // Engagement
  autoCampaignId: string | null;    // Campaign to auto-enroll new leads
  autoEnrollEnabled: boolean;
  // Reply handling
  autoReplyEnabled: boolean;
  aiPersonality: string;            // professional | casual | aggressive
  // Booking
  autoBookEnabled: boolean;
  calendarLink: string;             // Calendly/Cal.com link
  meetingDuration: number;          // minutes
  availableSlots: string;           // JSON: available days/hours
  timezone: string;
  // Safety
  maxEmailsPerDay: number;
  maxFollowUps: number;
  blacklistDomains: string[];
  pauseOnNegative: boolean;
}

interface ReplyContext {
  leadName: string;
  leadEmail: string;
  leadCompany: string;
  originalSubject: string;
  originalBody: string;
  replyBody: string;
  replyLabel: string;
  replySentiment: string;
  conversationHistory: string[];
  businessContext: string;
  calendarLink: string;
}

// ============================================================
// AI OUTREACH AGENT CLASS
// ============================================================

export class OutreachAgent {
  private running: Map<string, boolean> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  // ── START / STOP ──────────────────────────────────────────

  async start(userId: string): Promise<void> {
    if (this.running.get(userId)) return;
    this.running.set(userId, true);

    console.log(`[OutreachAgent] Starting for user ${userId}`);

    // Run immediately, then on interval
    await this.runFullCycle(userId);

    // Check for replies every 5 minutes
    const replyInterval = setInterval(() => this.monitorReplies(userId), 5 * 60 * 1000);
    // Run sends every 15 minutes
    const sendInterval = setInterval(() => this.processSendQueue(userId), 15 * 60 * 1000);
    // Discovery once per hour
    const discoveryInterval = setInterval(() => this.discoverProspects(userId), 60 * 60 * 1000);
    // Warmup every 15 minutes
    const warmupInterval = setInterval(() => instantlyEngine.runWarmupCycle(), 15 * 60 * 1000);

    this.intervals.set(`${userId}-reply`, replyInterval);
    this.intervals.set(`${userId}-send`, sendInterval);
    this.intervals.set(`${userId}-discover`, discoveryInterval);
    this.intervals.set(`${userId}-warmup`, warmupInterval);

    await this.logAgentTask(userId, "agent_started", "AI Outreach Agent started — full autonomous mode");
  }

  async stop(userId: string): Promise<void> {
    this.running.set(userId, false);
    // Clear all intervals
    for (const key of [`${userId}-reply`, `${userId}-send`, `${userId}-discover`, `${userId}-warmup`]) {
      const interval = this.intervals.get(key);
      if (interval) clearInterval(interval);
      this.intervals.delete(key);
    }
    await this.logAgentTask(userId, "agent_stopped", "AI Outreach Agent stopped");
  }

  // ── FULL CYCLE ────────────────────────────────────────────

  async runFullCycle(userId: string): Promise<void> {
    try {
      console.log(`[OutreachAgent] Running full cycle for ${userId}`);
      await this.discoverProspects(userId);
      await this.enrollNewLeads(userId);
      await this.processSendQueue(userId);
      await this.monitorReplies(userId);
    } catch (err: any) {
      console.error(`[OutreachAgent] Cycle error:`, err.message);
      await this.logAgentTask(userId, "cycle_error", err.message, "failed");
    }
  }

  // ── STEP 1: DISCOVER PROSPECTS (Tavily Web Search + AI Extraction) ──

  async discoverProspects(userId: string): Promise<void> {
    const config = await this.getAgentConfig(userId);
    if (!config.discoveryEnabled) return;

    const tavilyKey = process.env.TAVILY_API_KEY;
    if (!tavilyKey) {
      console.warn("[OutreachAgent] No TAVILY_API_KEY — skipping real web discovery");
      return;
    }

    try {
      const user = await storage.getUserById(userId);
      const companyName = user?.companyName || "Your Company";
      const senderName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Team";
      const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
      const calLink = (settings as any)?.calendarLink || "";
      const senderPhone = (settings as any)?.grasshopperNumber || (settings as any)?.twilioPhoneNumber || "";
      const senderTitle = (user as any)?.jobTitle || "";
      const senderWebsite = user?.website || "";

      const businessDesc = config.businessDescription || user?.companyDescription || "";
      const targetAudience = config.targetAudience || "";
      const valueProp = config.valueProposition || "";

      const queries = config.discoveryQueries?.length > 0
        ? config.discoveryQueries
        : this.generateDefaultQueries(config, targetAudience, businessDesc);

      let allSearchResults = "";

      for (const query of queries.slice(0, 3)) {
        try {
          const searchQuery = `${query} owner phone email contact site:.com`;
          console.log(`[OutreachAgent] Tavily search: "${searchQuery}"`);
          const tRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: tavilyKey,
              query: searchQuery,
              search_depth: "advanced",
              max_results: 10,
              include_answer: true,
            }),
          });
          if (tRes.ok) {
            const tData = await tRes.json() as any;
            const results = [
              tData.answer || "",
              ...(tData.results || []).map((r: any) => `Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`)
            ].join("\n\n");
            allSearchResults += `\n\n--- SEARCH: "${query}" ---\n${results}`;
          }
        } catch (e: any) {
          console.error(`[OutreachAgent] Search error for "${query}": ${e.message}`);
        }
      }

      if (!allSearchResults.trim()) {
        console.warn("[OutreachAgent] No search results found");
        return;
      }

      const { getAnthropicForUser } = await import("./routes");
      const ai = await getAnthropicForUser(userId);

      const competitorFilter = (config.competitorKeywords || []).length > 0
        ? `- NEVER include companies matching these competitor keywords: ${config.competitorKeywords.join(", ")} — they are competitors, not prospects`
        : "- Avoid extracting companies that are in the SAME business as the sender (they are competitors, not prospects)";

      const targetDesc = targetAudience
        ? `Extract REAL businesses matching this target audience: ${targetAudience}`
        : "Extract REAL businesses and decision makers from the search results";

      const valueDesc = valueProp
        ? `Mention how ${companyName} can help them: ${valueProp}`
        : `Mention how ${companyName} can help their business`;

      const signatureParts = [senderName, senderTitle, companyName, senderPhone, senderWebsite, calLink].filter(Boolean);

      const extractionPrompt = `You are a B2B lead extraction specialist for ${companyName}${businessDesc ? `, ${businessDesc}` : ""}.

SEARCH RESULTS:
${allSearchResults}

TASK: ${targetDesc}. These are our PROSPECTS — businesses that could benefit from our services.

CRITICAL RULES:
${competitorFilter}
- ONLY include leads where you found REAL contact info in the search results
- NEVER fabricate emails — only use what you actually see in the results
- NEVER use @example.com, @test.com, or 555-xxx-xxxx phone numbers
- Each lead MUST have at minimum: name (decision maker), email, company name
- Phone numbers should be real US numbers (10 digits with area code) if found
- Target decision makers: owners, founders, CEOs, directors, managers

For EACH valid lead, generate a personalized outreach email (3-5 sentences) that:
1. References their specific business/situation
2. ${valueDesc}
3. Includes a clear call to action
4. Ends with this signature:

Best regards,
${signatureParts.join("\n")}

Return ONLY a valid JSON array:
[{
  "name": "Full Name",
  "email": "real@email.com",
  "phone": "+1XXXXXXXXXX",
  "company": "Business Name",
  "score": 70,
  "intent_signal": "Why they need our service",
  "notes": "Title, business type, size, source URL",
  "outreach": "Full personalized email with signature"
}]

Return up to ${config.dailyProspectLimit || 10} leads. If fewer real leads found, return fewer. Return empty array [] if no valid leads found. NO markdown wrapping.`;

      const response = await ai.client.messages.create({
        model: ai.model,
        max_tokens: 4000,
        system: "Extract real business leads from web search results. Return only valid JSON arrays.",
        messages: [{ role: "user", content: extractionPrompt }],
      });

      const text = response.content?.filter((b: any) => b.type === "text")?.map((b: any) => b.text)?.join("") || "";
      let newProspects: any[] = [];
      try {
        newProspects = JSON.parse(text.replace(/```json?|```/g, "").trim());
        if (!Array.isArray(newProspects)) newProspects = [];
      } catch {
        console.error("[OutreachAgent] Failed to parse AI response as JSON");
        newProspects = [];
      }

      const blacklist = config.blacklistDomains || [];
      const isFakeEmail = (email: string) => {
        if (!email) return true;
        const lower = email.toLowerCase().trim();
        if (/@(example|test|fake|placeholder|dummy|sample|mailinator|tempmail)\./i.test(lower)) return true;
        if (/^(test|fake|dummy|placeholder|sample|noreply)@/i.test(lower)) return true;
        if (!email.includes("@") || !email.includes(".")) return true;
        return false;
      };
      const isFakePhone = (phone: string) => {
        if (!phone) return false;
        const digits = phone.replace(/\D/g, "");
        if (digits.length < 10) return true;
        const last10 = digits.slice(-10);
        if (/^.{3}555/.test(last10)) return true;
        if (/^(\d)\1{6,}$/.test(digits)) return true;
        return false;
      };
      const isCompetitor = (company: string, notes: string) => {
        const text = `${company || ""} ${notes || ""}`.toLowerCase();
        const competitorKws = config.competitorKeywords || [];
        if (competitorKws.length > 0) {
          for (const kw of competitorKws) {
            if (kw && text.includes(kw.toLowerCase())) return true;
          }
        }
        return false;
      };

      newProspects = newProspects.filter(p => {
        if (!p.name || !p.email || !p.company) return false;
        if (isFakeEmail(p.email)) return false;
        if (p.phone && isFakePhone(p.phone)) p.phone = null;
        if (isCompetitor(p.company, p.notes || "")) return false;
        const domain = p.email?.split("@")[1]?.toLowerCase();
        if (domain && blacklist.includes(domain)) return false;
        return true;
      });

      let added = 0;
      const savedLeadNames: { name: string; email?: string }[] = [];
      for (const prospect of newProspects) {
        const existing = await db.select().from(leads)
          .where(and(eq(leads.userId, userId), eq(leads.email, prospect.email)));

        if (existing.length === 0) {
          await db.insert(leads).values({
            userId,
            name: prospect.name,
            email: prospect.email,
            phone: prospect.phone || null,
            company: prospect.company,
            source: "AI Outreach Agent",
            status: "new",
            score: prospect.score || 65,
            notes: prospect.notes || "",
            intentSignal: prospect.intent_signal || "Potential prospect — needs our services",
            outreach: prospect.outreach || null,
            engagementLevel: "warm",
          });
          savedLeadNames.push({ name: prospect.name, email: prospect.email });
          added++;
        }
      }

      if (added > 0) {
        try {
          const { autoAddToFunnelDirect } = await import("./routes");
          const funnelSlug = config.businessType || "outreach";
          await autoAddToFunnelDirect(userId, funnelSlug, savedLeadNames);
        } catch (fErr: any) {
          console.warn(`[OutreachAgent] Failed to add to funnel: ${fErr.message}`);
        }

        try {
          const { autoEnrollLeadInSequence } = await import("./sequence-automation");
          const enrolledLeads = await db.select().from(leads)
            .where(and(eq(leads.userId, userId), eq(leads.source, "AI Outreach Agent"), eq(leads.status, "new")));
          let seqEnrolled = 0;
          for (const lead of enrolledLeads) {
            const ok = await autoEnrollLeadInSequence(userId, lead.id);
            if (ok) seqEnrolled++;
          }
          if (seqEnrolled > 0) {
            console.log(`[OutreachAgent] Auto-enrolled ${seqEnrolled} leads into sequences`);
          }
        } catch (seqErr: any) {
          console.warn(`[OutreachAgent] Sequence enrollment error: ${seqErr.message}`);
        }

        await this.notify(userId, "Prospects Found", `AI Outreach Agent discovered ${added} new prospects and prepared outreach emails`);
        await this.logAgentTask(userId, "discovery", `Found ${added} new prospects with outreach drafts from: ${queries.join(", ")}`);
        console.log(`[OutreachAgent] Added ${added} real prospects for user ${userId}`);
      } else {
        console.log(`[OutreachAgent] No new prospects found for queries: ${queries.join(", ")}`);
      }
    } catch (err: any) {
      console.error(`[OutreachAgent] Discovery error:`, err.message);
    }
  }

  // ── STEP 2: AUTO-ENROLL INTO CAMPAIGNS ────────────────────

  async enrollNewLeads(userId: string): Promise<void> {
    const config = await this.getAgentConfig(userId);
    if (!config.autoEnrollEnabled || !config.autoCampaignId) return;

    try {
      // Find new leads not in any campaign
      const newLeads = await db.select().from(leads)
        .where(and(
          eq(leads.userId, userId),
          eq(leads.status, "new"),
          eq(leads.source, "ai_discovery"),
        ))
        .limit(config.dailyProspectLimit);

      if (newLeads.length === 0) return;

      // Check which are already enrolled
      const existingEnrollments = await db.select({ leadId: campaignLeads.leadId })
        .from(campaignLeads)
        .where(eq(campaignLeads.campaignId, config.autoCampaignId));

      const enrolledIds = new Set(existingEnrollments.map(e => e.leadId));
      const toEnroll = newLeads.filter(l => !enrolledIds.has(l.id));

      if (toEnroll.length === 0) return;

      // Enroll into campaign
      await db.insert(campaignLeads).values(
        toEnroll.map(lead => ({
          campaignId: config.autoCampaignId!,
          leadId: lead.id,
          status: "pending" as const,
          nextSendAt: this.getNextSendTime(config.timezone),
        }))
      );

      // Update lead status
      for (const lead of toEnroll) {
        await db.update(leads).set({ status: "contacted" }).where(eq(leads.id, lead.id));
      }

      // Update campaign total
      await db.update(campaigns).set({
        totalLeads: sql`${campaigns.totalLeads} + ${toEnroll.length}`,
      }).where(eq(campaigns.id, config.autoCampaignId));

      await this.logAgentTask(userId, "enrollment", `Auto-enrolled ${toEnroll.length} leads into campaign`);
    } catch (err: any) {
      console.error(`[OutreachAgent] Enrollment error:`, err.message);
    }
  }

  // ── STEP 3: PROCESS SEND QUEUE ────────────────────────────

  async processSendQueue(userId: string): Promise<void> {
    const config = await this.getAgentConfig(userId);

    try {
      // Find active campaigns
      const activeCampaigns = await db.select().from(campaigns)
        .where(and(eq(campaigns.userId, userId), eq(campaigns.status, "active")));

      for (const campaign of activeCampaigns) {
        // Check sending schedule (respect business hours)
        if (!this.isWithinSendingHours(campaign)) continue;

        // Get sending accounts (inbox rotation)
        const sendAccounts = await db.select().from(campaignSendingAccounts)
          .where(eq(campaignSendingAccounts.campaignId, campaign.id));

        if (sendAccounts.length === 0) continue;

        const accountDetails = await Promise.all(
          sendAccounts.map(sa => db.select().from(emailAccounts).where(eq(emailAccounts.id, sa.accountId)))
        );
        const activeAccounts = accountDetails.flat().filter(a => a.isActive && (a.sentToday || 0) < (a.dailySendLimit || 50));

        if (activeAccounts.length === 0) continue;

        // Get leads ready to send
        const readyLeads = await db.select().from(campaignLeads)
          .where(and(
            eq(campaignLeads.campaignId, campaign.id),
            eq(campaignLeads.status, "pending"),
            lte(campaignLeads.nextSendAt, new Date()),
          ))
          .limit(campaign.dailyLimit || 50);

        // Get sequences
        const sequences = await db.select().from(campaignSequences)
          .where(and(eq(campaignSequences.campaignId, campaign.id), eq(campaignSequences.isActive, true)))
          .orderBy(campaignSequences.stepNumber);

        if (sequences.length === 0) continue;

        let sentCount = 0;
        let accountIndex = 0;

        for (const cl of readyLeads) {
          if (sentCount >= (config.maxEmailsPerDay || 50)) break;

          // Get lead data
          const [lead] = await db.select().from(leads).where(eq(leads.id, cl.leadId));
          if (!lead) continue;

          // Get current sequence step
          const currentStep = cl.currentStep || 0;
          const sequence = sequences.find(s => s.stepNumber === currentStep + 1);
          if (!sequence) {
            // All steps completed
            await db.update(campaignLeads).set({ status: "sent" }).where(eq(campaignLeads.id, cl.id));
            continue;
          }

          // Pick account (round-robin rotation)
          const account = activeAccounts[accountIndex % activeAccounts.length];
          accountIndex++;

          // Process spintax + variables
          const { subject, body } = instantlyEngine.processEmailContent(
            sequence.subject, sequence.body, {
              firstName: lead.name?.split(" ")[0],
              lastName: lead.name?.split(" ").slice(1).join(" "),
              name: lead.name,
              email: lead.email,
              company: lead.company,
            }
          );

          // SEND THE EMAIL
          const sent = await this.sendEmail(account, lead.email, subject, body, campaign.trackOpens ?? true);

          if (sent) {
            sentCount++;

            // Calculate next send time
            const nextStep = sequences.find(s => s.stepNumber === currentStep + 2);
            const nextSendAt = nextStep
              ? new Date(Date.now() + ((nextStep.delayDays || 0) * 86400000) + ((nextStep.delayHours || 0) * 3600000))
              : null;

            await db.update(campaignLeads).set({
              currentStep: currentStep + 1,
              sentCount: sql`${campaignLeads.sentCount} + 1`,
              lastSentAt: new Date(),
              nextSendAt,
              status: nextStep ? "pending" : "sent",
            }).where(eq(campaignLeads.id, cl.id));

            // Record in inbox as outbound
            await db.insert(inboxMessages).values({
              userId, accountId: account.id, campaignId: campaign.id, leadId: lead.id,
              direction: "outbound", fromEmail: account.email, fromName: account.displayName || "",
              toEmail: lead.email, subject, bodyText: body,
              snippet: body.substring(0, 120),
            });

            // Update account send count
            await db.update(emailAccounts).set({
              sentToday: sql`${emailAccounts.sentToday} + 1`,
            }).where(eq(emailAccounts.id, account.id));
          }
        }

        // Update campaign stats
        if (sentCount > 0) {
          await db.update(campaigns).set({
            emailsSent: sql`${campaigns.emailsSent} + ${sentCount}`,
            updatedAt: new Date(),
          }).where(eq(campaigns.id, campaign.id));

          // Daily analytics
          const today = new Date().toISOString().split("T")[0];
          await db.insert(campaignDailyAnalytics).values({
            userId, campaignId: campaign.id, date: today, emailsSent: sentCount,
          });

          await this.logAgentTask(userId, "send_batch", `Sent ${sentCount} emails for campaign "${campaign.name}"`);
        }
      }
    } catch (err: any) {
      console.error(`[OutreachAgent] Campaign send error:`, err.message);
    }

    // ── DIRECT SEND: Send unsent outreach drafts via platform SMTP/SendGrid ──
    try {
      const unsentLeads = await db.select().from(leads)
        .where(and(
          eq(leads.userId, userId),
          sql`${leads.outreach} IS NOT NULL AND ${leads.outreach} != ''`,
          isNull(leads.outreachSentAt),
          sql`${leads.email} IS NOT NULL AND ${leads.email} != ''`,
        ))
        .limit(config.maxEmailsPerDay || 50);

      if (unsentLeads.length > 0) {
        const user = await storage.getUserById(userId);
        const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));

        if (user) {
          const { sendOutreachEmail } = await import("./routes");
          let directSent = 0;
          let directFailed = 0;

          for (const lead of unsentLeads) {
            try {
              const result = await sendOutreachEmail(lead, settings || {}, user);
              if (result.success) {
                directSent++;
                const followUpNextAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
                await db.update(leads).set({
                  outreachSentAt: new Date(),
                  status: "warm",
                  followUpStep: 0,
                  followUpStatus: "active",
                  followUpNextAt,
                }).where(eq(leads.id, lead.id));
              } else {
                directFailed++;
                console.warn(`[OutreachAgent] Direct send failed for ${lead.email}: ${result.error}`);
              }
            } catch (sendErr: any) {
              directFailed++;
              console.error(`[OutreachAgent] Direct send error for ${lead.email}: ${sendErr.message}`);
            }

            // Small delay between sends to avoid rate limits
            await new Promise(r => setTimeout(r, 1500));
          }

          if (directSent > 0) {
            await this.logAgentTask(userId, "send_email", `Directly sent ${directSent} outreach emails (${directFailed} failed)`);
          }
        }
      }
    } catch (err: any) {
      console.error(`[OutreachAgent] Direct send error:`, err.message);
    }
  }

  // ── STEP 4: MONITOR REPLIES (IMAP POLLING) ────────────────

  async monitorReplies(userId: string): Promise<void> {
    try {
      const accounts = await db.select().from(emailAccounts)
        .where(and(eq(emailAccounts.userId, userId), eq(emailAccounts.isActive, true)));

      for (const account of accounts) {
        try {
          await this.pollImapForReplies(userId, account);
        } catch (err: any) {
          console.error(`[OutreachAgent] IMAP error for ${account.email}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error(`[OutreachAgent] Monitor error:`, err.message);
    }
  }

  private async pollImapForReplies(userId: string, account: any): Promise<void> {
    // In production: use ImapFlow to connect and fetch new messages
    // const { ImapFlow } = await import("imapflow");
    // const client = new ImapFlow({
    //   host: account.imapHost,
    //   port: account.imapPort,
    //   secure: true,
    //   auth: { user: account.email, pass: account.smtpPassword },
    // });
    // await client.connect();
    // const lock = await client.getMailboxLock("INBOX");
    // ... fetch unseen messages since lastSyncAt ...
    // lock.release();
    // await client.logout();

    // For now: check inbox_messages for unprocessed inbound messages
    const unprocessed = await db.select().from(inboxMessages)
      .where(and(
        eq(inboxMessages.accountId, account.id),
        eq(inboxMessages.direction, "inbound"),
        eq(inboxMessages.isRead, false),
      ))
      .orderBy(desc(inboxMessages.receivedAt))
      .limit(20);

    for (const msg of unprocessed) {
      await this.handleIncomingReply(userId, account, msg);
    }

    // Update last sync
    await db.update(emailAccounts).set({ lastSyncAt: new Date() }).where(eq(emailAccounts.id, account.id));
  }

  // ── STEP 5: AI CLASSIFIES EVERY REPLY ─────────────────────

  private async handleIncomingReply(userId: string, account: any, message: any): Promise<void> {
    const config = await this.getAgentConfig(userId);

    // AI Classification
    const classification = instantlyEngine.classifyEmail(message.bodyText || "", message.subject || "");

    // Update message with AI label
    await db.update(inboxMessages).set({
      aiLabel: classification.label,
      aiSentiment: classification.sentiment,
      aiConfidence: classification.confidence,
      isRead: true,
    }).where(eq(inboxMessages.id, message.id));

    // Find the lead
    let lead: any = null;
    if (message.leadId) {
      [lead] = await db.select().from(leads).where(eq(leads.id, message.leadId));
    } else {
      // Try to match by email
      [lead] = await db.select().from(leads)
        .where(and(eq(leads.userId, userId), eq(leads.email, message.fromEmail)));
    }

    // Update lead engagement
    if (lead) {
      await db.update(leads).set({
        engagementLevel: classification.sentiment === "positive" ? "hot" : "warm",
        engagementScore: sql`${leads.engagementScore} + 10`,
        lastEngagedAt: new Date(),
      }).where(eq(leads.id, lead.id));
    }

    // Update campaign stats
    if (message.campaignId) {
      await db.update(campaigns).set({
        emailsReplied: sql`${campaigns.emailsReplied} + 1`,
      }).where(eq(campaigns.id, message.campaignId));

      // Stop sequence if stopOnReply
      if (message.leadId) {
        await db.update(campaignLeads).set({ status: "replied" })
          .where(and(eq(campaignLeads.leadId, message.leadId), eq(campaignLeads.campaignId, message.campaignId)));
      }
    }

    // ── DECISION TREE ───────────────────────────────────────

    switch (classification.label) {
      case "interested":
      case "meeting_booked":
        await this.handleInterested(userId, account, message, lead, config);
        break;

      case "question":
        await this.handleQuestion(userId, account, message, lead, config);
        break;

      case "referral":
        await this.handleReferral(userId, account, message, lead, config);
        break;

      case "not_interested":
        await this.handleNotInterested(userId, message, lead, config);
        break;

      case "out_of_office":
        await this.handleOutOfOffice(userId, message, lead, config);
        break;

      case "wrong_person":
        await this.handleWrongPerson(userId, message, lead, config);
        break;

      case "bounced":
        await this.handleBounced(userId, message, lead);
        break;

      default:
        // Unlabeled — notify for manual review
        await this.notify(userId, "📩 New Reply", `Reply from ${message.fromEmail} needs review`);
        break;
    }
  }

  // ── STEP 6: AI GENERATES SMART RESPONSES ──────────────────

  private async handleInterested(userId: string, account: any, message: any, lead: any, config: AgentConfig): Promise<void> {
    // 🎯 HOT LEAD — attempt to book meeting
    await this.notify(userId, "🔥 Interested Reply!", `${message.fromEmail} expressed interest! AI is following up.`, "high");

    if (lead) {
      await db.update(leads).set({ status: "hot", engagementLevel: "hot" }).where(eq(leads.id, lead.id));
    }

    if (!config.autoReplyEnabled) return;

    // Generate booking response
    const replyBody = await this.generateAiReply(userId, {
      leadName: lead?.name || message.fromName || "there",
      leadEmail: message.fromEmail,
      leadCompany: lead?.company || "",
      originalSubject: message.subject || "",
      originalBody: "",
      replyBody: message.bodyText || "",
      replyLabel: "interested",
      replySentiment: "positive",
      conversationHistory: [],
      businessContext: await this.getBusinessContext(userId),
      calendarLink: config.calendarLink || "",
    });

    if (replyBody) {
      await this.sendReply(account, message, replyBody);
      await this.logAgentTask(userId, "auto_reply", `AI replied to interested lead: ${message.fromEmail}`);
    }

    // Auto-book if they already mentioned a time
    if (config.autoBookEnabled && /available|free|works|let'?s|schedule|book/i.test(message.bodyText || "")) {
      await this.attemptAutoBook(userId, lead, message);
    }
  }

  private async handleQuestion(userId: string, account: any, message: any, lead: any, config: AgentConfig): Promise<void> {
    await this.notify(userId, "❓ Question Received", `${message.fromEmail} has a question`);

    if (!config.autoReplyEnabled) return;

    const replyBody = await this.generateAiReply(userId, {
      leadName: lead?.name || message.fromName || "there",
      leadEmail: message.fromEmail,
      leadCompany: lead?.company || "",
      originalSubject: message.subject || "",
      originalBody: "",
      replyBody: message.bodyText || "",
      replyLabel: "question",
      replySentiment: "neutral",
      conversationHistory: [],
      businessContext: await this.getBusinessContext(userId),
      calendarLink: config.calendarLink || "",
    });

    if (replyBody) {
      await this.sendReply(account, message, replyBody);
      await this.logAgentTask(userId, "auto_reply", `AI answered question from: ${message.fromEmail}`);
    }
  }

  private async handleReferral(userId: string, account: any, message: any, lead: any, config: AgentConfig): Promise<void> {
    await this.notify(userId, "🔗 Referral!", `${message.fromEmail} referred someone. Check the reply for the new contact.`);

    // Try to extract referred contact from email body
    const emailMatch = (message.bodyText || "").match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      const referredEmail = emailMatch[0];
      const existing = await db.select().from(leads)
        .where(and(eq(leads.userId, userId), eq(leads.email, referredEmail)));

      if (existing.length === 0) {
        await db.insert(leads).values({
          userId,
          name: "Referred Contact",
          email: referredEmail,
          source: "referral",
          status: "new",
          notes: `Referred by ${message.fromEmail}. Original message: ${(message.bodyText || "").substring(0, 200)}`,
        });
        await this.logAgentTask(userId, "referral_captured", `New referral lead captured: ${referredEmail}`);
      }
    }

    // Thank the referrer
    if (config.autoReplyEnabled) {
      const replyBody = await this.generateAiReply(userId, {
        leadName: lead?.name || "there", leadEmail: message.fromEmail,
        leadCompany: lead?.company || "", originalSubject: message.subject || "",
        originalBody: "", replyBody: message.bodyText || "",
        replyLabel: "referral", replySentiment: "positive",
        conversationHistory: [], businessContext: await this.getBusinessContext(userId),
        calendarLink: config.calendarLink || "",
      });
      if (replyBody) await this.sendReply(account, message, replyBody);
    }
  }

  private async handleNotInterested(userId: string, message: any, lead: any, config: AgentConfig): Promise<void> {
    await this.notify(userId, "❌ Not Interested", `${message.fromEmail} declined`);

    if (lead) {
      await db.update(leads).set({ status: "lost", engagementLevel: "cold" }).where(eq(leads.id, lead.id));
    }

    // Stop all campaign sequences for this lead
    if (message.leadId) {
      await db.update(campaignLeads).set({ status: "unsubscribed" })
        .where(eq(campaignLeads.leadId, message.leadId));
    }

    // Do NOT auto-reply to "not interested" — respect their wishes
    await this.logAgentTask(userId, "unsubscribed", `${message.fromEmail} not interested — removed from sequences`);
  }

  private async handleOutOfOffice(userId: string, message: any, lead: any, config: AgentConfig): Promise<void> {
    // Reschedule follow-up for 5 days later
    if (message.leadId && message.campaignId) {
      const rescheduleDate = new Date(Date.now() + 5 * 86400000);
      await db.update(campaignLeads).set({
        nextSendAt: rescheduleDate,
        status: "pending",
      }).where(and(eq(campaignLeads.leadId, message.leadId), eq(campaignLeads.campaignId, message.campaignId)));

      await this.logAgentTask(userId, "ooo_reschedule", `${message.fromEmail} OOO — rescheduled for ${rescheduleDate.toDateString()}`);
    }
  }

  private async handleWrongPerson(userId: string, message: any, lead: any, config: AgentConfig): Promise<void> {
    await this.notify(userId, "🚫 Wrong Person", `${message.fromEmail} is not the right contact`);

    if (lead) {
      await db.update(leads).set({ status: "disqualified" }).where(eq(leads.id, lead.id));
    }
    if (message.leadId) {
      await db.update(campaignLeads).set({ status: "unsubscribed" })
        .where(eq(campaignLeads.leadId, message.leadId));
    }
  }

  private async handleBounced(userId: string, message: any, lead: any): Promise<void> {
    if (lead) {
      await db.update(leads).set({ status: "bounced" }).where(eq(leads.id, lead.id));
    }
    if (message.leadId) {
      await db.update(campaignLeads).set({ status: "bounced" })
        .where(eq(campaignLeads.leadId, message.leadId));
    }
    if (message.campaignId) {
      await db.update(campaigns).set({
        emailsBounced: sql`${campaigns.emailsBounced} + 1`,
      }).where(eq(campaigns.id, message.campaignId));
    }
  }

  // ── STEP 7: AUTO-BOOK MEETINGS ────────────────────────────

  private async attemptAutoBook(userId: string, lead: any, message: any): Promise<void> {
    if (!lead) return;

    try {
      const config = await this.getAgentConfig(userId);

      // Create appointment
      const appointmentDate = new Date(Date.now() + 2 * 86400000); // 2 days from now
      appointmentDate.setHours(10, 0, 0, 0); // Default 10 AM

      const [appointment] = await db.insert(appointments).values({
        userId,
        leadName: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        type: "discovery_call",
        date: appointmentDate,
        status: "scheduled",
        source: "ai_agent",
        notes: `Auto-booked by AI agent. Lead expressed interest via email.`,
      }).returning();

      // Update lead
      await db.update(leads).set({
        status: "appointment_booked",
        nextStep: `Discovery call on ${appointmentDate.toDateString()}`,
      }).where(eq(leads.id, lead.id));

      // Update campaign stats
      if (message.campaignId) {
        await db.update(campaigns).set({
          opportunities: sql`${campaigns.opportunities} + 1`,
        }).where(eq(campaigns.id, message.campaignId));
      }

      await this.notify(userId, "📅 Meeting Booked!", `AI agent booked a call with ${lead.name} (${lead.company})`, "high");
      await this.logAgentTask(userId, "meeting_booked", `Auto-booked discovery call with ${lead.name} at ${lead.email}`);

    } catch (err: any) {
      console.error(`[OutreachAgent] Booking error:`, err.message);
    }
  }

  // ── AI REPLY GENERATION ───────────────────────────────────

  private async generateAiReply(userId: string, context: ReplyContext): Promise<string | null> {
    try {
      const { getAnthropicForUser } = await import("./routes");
      const ai = await getAnthropicForUser(userId);

      const systemPrompt = `You are an AI sales assistant. You write email replies on behalf of a business.

BUSINESS CONTEXT:
${context.businessContext}

RULES:
- Keep replies SHORT (3-5 sentences max)
- Be warm, professional, and conversational — NOT salesy
- NEVER use generic sales language like "I hope this email finds you well"
- Mirror the prospect's tone and formality level
- If they're interested, suggest a specific meeting time or share the calendar link
- If they have a question, answer it concisely using the business context
- If they referred someone, thank them warmly
- ALWAYS include a clear call to action
- Calendar link (if available): ${context.calendarLink}
- Sign off with just a first name, no title`;

      const userPrompt = `Reply to this email:

FROM: ${context.leadName} (${context.leadEmail}) at ${context.leadCompany}
SUBJECT: ${context.originalSubject}
THEIR MESSAGE: ${context.replyBody}
CLASSIFICATION: ${context.replyLabel} (${context.replySentiment})

Write ONLY the email body — no subject line, no "Subject:", just the reply text.`;

      const response = await ai.client.messages.create({
        model: ai.model,
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const text = response.content?.filter((b: any) => b.type === "text")?.map((b: any) => b.text)?.join("") || null;
      return text;
    } catch (err: any) {
      console.error(`[OutreachAgent] AI reply error:`, err.message);
      return this.generateTemplateReply(context);
    }
  }

  private generateTemplateReply(context: ReplyContext): string {
    const name = context.leadName?.split(" ")[0] || "there";

    switch (context.replyLabel) {
      case "interested":
        if (context.calendarLink) {
          return `Hi ${name},\n\nGreat to hear from you! I'd love to walk you through how we can help ${context.leadCompany || "your team"}.\n\nHere's my calendar to grab a quick 15-minute call: ${context.calendarLink}\n\nPick whatever time works best for you.\n\nLooking forward to it!`;
        }
        return `Hi ${name},\n\nGreat to hear from you! I'd love to walk you through how we can help ${context.leadCompany || "your team"}.\n\nWould you be open to a quick 15-minute call this week? I'm flexible on timing — just let me know what works.\n\nLooking forward to connecting!`;

      case "question":
        return `Hi ${name},\n\nGreat question! Based on what we do, here's a quick answer:\n\n${context.businessContext ? "Our approach focuses on delivering measurable results for teams like yours." : "We'd be happy to walk you through the details."}\n\nWould it help to jump on a quick call to dive deeper? I can walk you through everything in 10 minutes.\n\nLet me know!`;

      case "referral":
        return `Hi ${name},\n\nReally appreciate you connecting us! I'll reach out to them directly.\n\nIf there's ever anything we can do for you as well, don't hesitate to let me know.\n\nThanks again!`;

      default:
        return `Hi ${name},\n\nThanks for getting back to me! I'd love to continue the conversation.\n\nWould a quick 10-minute call work for you this week?\n\nBest regards`;
    }
  }

  // ── EMAIL SENDING ─────────────────────────────────────────

  private async sendEmail(account: any, toEmail: string, subject: string, body: string, trackOpens: boolean = true): Promise<boolean> {
    try {
      // Add open tracking pixel
      let htmlBody = body.replace(/\n/g, "<br>");
      if (trackOpens) {
        htmlBody += `<img src="/api/pixel/open/${Date.now()}" width="1" height="1" style="display:none" />`;
      }

      const transporter = nodemailer.createTransport({
        host: account.smtpHost,
        port: account.smtpPort || 587,
        secure: account.smtpPort === 465,
        auth: {
          user: account.email,
          pass: account.smtpPassword,
        },
      });

      await transporter.sendMail({
        from: `${account.displayName || account.email} <${account.email}>`,
        to: toEmail,
        subject,
        text: body,
        html: htmlBody,
      });

      return true;
    } catch (err: any) {
      console.error(`[OutreachAgent] Send failed to ${toEmail}:`, err.message);
      return false;
    }
  }

  private async sendReply(account: any, originalMessage: any, replyBody: string): Promise<boolean> {
    const subject = originalMessage.subject?.startsWith("Re:") ? originalMessage.subject : `Re: ${originalMessage.subject}`;
    const sent = await this.sendEmail(account, originalMessage.fromEmail, subject, replyBody, false);

    if (sent) {
      // Record outbound reply in inbox
      await db.insert(inboxMessages).values({
        userId: originalMessage.userId,
        accountId: account.id,
        campaignId: originalMessage.campaignId,
        leadId: originalMessage.leadId,
        direction: "outbound",
        fromEmail: account.email,
        fromName: account.displayName || "",
        toEmail: originalMessage.fromEmail,
        subject,
        bodyText: replyBody,
        snippet: replyBody.substring(0, 120),
        threadId: originalMessage.threadId,
        inReplyTo: originalMessage.messageId,
      });
    }

    return sent;
  }

  // ── HELPER METHODS ────────────────────────────────────────

  private generateDefaultQueries(config: AgentConfig, targetAudience: string, businessDesc: string): string[] {
    if (targetAudience) {
      return [
        `${targetAudience} looking for help`,
        `${targetAudience} owner manager contact`,
        `${targetAudience} near me directory`,
      ];
    }
    if (businessDesc) {
      return [
        `businesses that need ${businessDesc}`,
        `companies looking for ${businessDesc} services`,
      ];
    }
    return [
      "small business owner needs help growing",
      "business looking for services partner",
    ];
  }

  private async getAgentConfig(userId: string): Promise<AgentConfig> {
    const defaults: AgentConfig = {
      userId,
      businessType: "medical_billing",
      businessDescription: "medical billing and revenue cycle management",
      targetAudience: "dental offices, chiropractors, medical practices, clinics",
      valueProposition: "streamline their billing operations, reduce claim denials, and increase revenue collection",
      competitorKeywords: ["billing company", "billing service", "RCM company", "revenue cycle management"],
      discoveryEnabled: true,
      discoveryQueries: ["dental practice billing issues", "chiropractor practice needs billing help", "medical practice hiring billing staff"],
      discoverySource: "web",
      dailyProspectLimit: 10,
      autoCampaignId: null,
      autoEnrollEnabled: false,
      autoReplyEnabled: true,
      aiPersonality: "professional",
      autoBookEnabled: true,
      calendarLink: "",
      meetingDuration: 15,
      availableSlots: "{}",
      timezone: "America/Chicago",
      maxEmailsPerDay: 50,
      maxFollowUps: 3,
      blacklistDomains: [],
      pauseOnNegative: true,
    };

    const [config] = await db.select().from(agentConfigs)
      .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, "outreach_agent")));

    if (config?.agentSettings) {
      try {
        const saved = JSON.parse(config.agentSettings);
        return { ...defaults, ...saved };
      } catch {}
    }

    return defaults;
  }

  private async getUserSettings(userId: string): Promise<any> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings;
  }

  private async getBusinessContext(userId: string): Promise<string> {
    try {
      const { copilotMemories } = await import("../shared/instantly-schema");
      const memories = await db.select().from(copilotMemories).where(eq(copilotMemories.userId, userId));
      return memories.map(m => `${m.memoryType}: ${m.content}`).join("\n");
    } catch {
      return "";
    }
  }

  private async notify(userId: string, title: string, message: string, priority: string = "normal"): Promise<void> {
    await db.insert(notifications).values({
      userId,
      agentType: "outreach_agent",
      type: priority === "high" ? "success" : "info",
      title, message, priority,
    });
  }

  private async logAgentTask(userId: string, taskType: string, description: string, status: string = "completed"): Promise<void> {
    await db.insert(agentTasks).values({
      userId,
      agentType: "outreach_agent",
      taskType, description, status,
      completedAt: status === "completed" ? new Date() : undefined,
    });
  }

  private isWithinSendingHours(campaign: any): boolean {
    const now = new Date();
    const hour = now.getHours();
    const dayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const sendDays = (campaign.sendDays || "mon,tue,wed,thu,fri").split(",").map((d: string) => dayMap[d.trim()]);
    const currentDay = now.getDay();

    if (!sendDays.includes(currentDay)) return false;
    if (hour < (campaign.sendStartHour || 9) || hour >= (campaign.sendEndHour || 17)) return false;
    return true;
  }

  private getNextSendTime(timezone: string): Date {
    const now = new Date();
    // Add random delay between 5-60 minutes to appear human
    const delay = (5 + Math.random() * 55) * 60 * 1000;
    return new Date(now.getTime() + delay);
  }

  private generateTemplateProspects(queries: string[], limit: number): any[] {
    // Fallback when no API key — generates template prospects
    const prospects: any[] = [];
    const firstNames = ["Sarah", "Michael", "Jennifer", "David", "Lisa", "Robert", "Emily", "James", "Amanda", "William"];
    const lastNames = ["Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas"];
    const titles = ["Office Manager", "Practice Administrator", "Medical Director", "Billing Manager", "Operations Director"];
    const companies = ["Premier Medical", "Valley Health Group", "Sunrise Clinic", "Metro Physicians", "Coastal Care Center"];

    for (let i = 0; i < Math.min(limit, 10); i++) {
      const first = firstNames[i % firstNames.length];
      const last = lastNames[i % lastNames.length];
      const company = companies[i % companies.length];
      const domain = company.toLowerCase().replace(/\s+/g, "") + ".com";

      prospects.push({
        name: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
        company,
        jobTitle: titles[i % titles.length],
        industry: "Healthcare",
        notes: `Discovered via search: ${queries[0] || "target ICP"}`,
      });
    }
    return prospects;
  }
}

export const outreachAgent = new OutreachAgent();
