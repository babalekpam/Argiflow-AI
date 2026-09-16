// ============================================================
// ARGILETTE INSTANTLY FEATURES — API ROUTES
// Drop this into: server/instantly-routes.ts
// Then import and mount in server/routes.ts
// ============================================================

import { Router, type Request, type Response } from "express";
import { eq, and, desc, sql, count, avg, sum, gte, lte, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  emailAccounts, warmupStats, warmupConversations,
  campaigns, campaignSequences, campaignSendingAccounts, campaignLeads,
  inboxMessages,
  websitePixels, websiteVisitors,
  dfyOrders, dfyDomains,
  verificationJobs, verificationResults,
  inboxPlacementTests,
  copilotMemories, copilotTasks,
  emailTemplates, campaignDailyAnalytics,
} from "../shared/instantly-schema";
import { agentTasks, leads, userSettings } from "../shared/schema";
import { businessManager } from "../shared/business-manager-schema";
import { instantlyEngine } from "./instantly-engine";
import {
  getPreparedSequenceIssues,
  parseStringIdArray,
  validateCampaignPreparationPayload,
} from "./campaign-preparation-validators";
import {
  getLeadContactIssue,
  getTenantSmtpConfigIssue,
} from "./outreach-quality-gate";
import { isEmailSuppressed, isValidRecipientEmail } from "./email-suppression";
import {
  CAMPAIGN_LAUNCH_AUTH_TASK_TYPE,
  registerCampaignLaunch,
} from "./outreach-agent";

const router = Router();

// Middleware: require authenticated user (matches app session-based auth)
function requireUser(req: Request, res: Response, next: Function) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.use(requireUser);

// Helper to get userId from session
function getUserId(req: Request): string {
  return req.session.userId!;
}

// ============================================================
// EMAIL ACCOUNTS
// ============================================================

// List all email accounts
router.get("/email-accounts", async (req, res) => {
  try {
    const userId = getUserId(req);
    const accounts = await db.select().from(emailAccounts)
      .where(eq(emailAccounts.userId, userId))
      .orderBy(desc(emailAccounts.createdAt));
    res.json(accounts);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Connect SMTP/IMAP account
router.post("/email-accounts/connect/smtp", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { email, displayName, smtpHost, smtpPort, imapHost, imapPort, password } = req.body;
    const domain = email.split("@")[1];

    const [account] = await db.insert(emailAccounts).values({
      userId,
      email,
      displayName: displayName || email.split("@")[0],
      provider: "smtp",
      authType: "credentials",
      smtpHost, smtpPort: smtpPort || 587,
      imapHost, imapPort: imapPort || 993,
      smtpPassword: password, // In production: encrypt this
      domain,
      isActive: true,
    }).returning();

    res.json(account);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Connect Google OAuth account
router.post("/email-accounts/connect/google", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { email, displayName, accessToken, refreshToken } = req.body;
    const domain = email.split("@")[1];

    const [account] = await db.insert(emailAccounts).values({
      userId, email,
      displayName: displayName || email.split("@")[0],
      provider: "google", authType: "oauth",
      smtpHost: "smtp.gmail.com", smtpPort: 587,
      imapHost: "imap.gmail.com", imapPort: 993,
      accessToken, refreshToken, domain, isActive: true,
    }).returning();

    res.json(account);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Connect Microsoft OAuth account
router.post("/email-accounts/connect/microsoft", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { email, displayName, accessToken, refreshToken } = req.body;
    const domain = email.split("@")[1];

    const [account] = await db.insert(emailAccounts).values({
      userId, email,
      displayName: displayName || email.split("@")[0],
      provider: "microsoft", authType: "oauth",
      smtpHost: "smtp.office365.com", smtpPort: 587,
      imapHost: "outlook.office365.com", imapPort: 993,
      accessToken, refreshToken, domain, isActive: true,
    }).returning();

    res.json(account);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Toggle warmup on/off
router.post("/email-accounts/:id/warmup/toggle", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const existing = await db.select().from(emailAccounts)
      .where(and(eq(emailAccounts.id, id), eq(emailAccounts.userId, userId)));

    if (!existing.length) return res.status(404).json({ error: "Account not found" });

    const newStatus = existing[0].warmupEnabled ? false : true;
    const [updated] = await db.update(emailAccounts)
      .set({
        warmupEnabled: newStatus,
        warmupStatus: newStatus ? "active" : "inactive",
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, id)).returning();

    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get account health & DNS
router.get("/email-accounts/:id/health", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const [account] = await db.select().from(emailAccounts)
      .where(and(eq(emailAccounts.id, id), eq(emailAccounts.userId, userId)));

    if (!account) return res.status(404).json({ error: "Account not found" });

    res.json({
      email: account.email,
      health: account.healthStatus,
      reputation: account.reputationScore,
      dns: { spf: account.spfValid, dkim: account.dkimValid, dmarc: account.dmarcValid },
      warmup: { enabled: account.warmupEnabled, status: account.warmupStatus, pool: account.warmupPool },
      sending: { dailyLimit: account.dailySendLimit, sentToday: account.sentToday },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Delete email account
router.delete("/email-accounts/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    await db.delete(emailAccounts)
      .where(and(eq(emailAccounts.id, req.params.id), eq(emailAccounts.userId, userId)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// WARMUP
// ============================================================

// Warmup dashboard
router.get("/warmup/dashboard", async (req, res) => {
  try {
    const userId = getUserId(req);
    const accounts = await db.select().from(emailAccounts)
      .where(and(eq(emailAccounts.userId, userId), eq(emailAccounts.warmupEnabled, true)));

    const accountIds = accounts.map(a => a.id);
    let stats: any[] = [];

    if (accountIds.length > 0) {
      stats = await db.select().from(warmupStats)
        .where(sql`${warmupStats.accountId} = ANY(${accountIds})`)
        .orderBy(desc(warmupStats.date))
        .limit(100);
    }

    const totalSent = stats.reduce((s, r) => s + (r.emailsSent || 0), 0);
    const totalReceived = stats.reduce((s, r) => s + (r.emailsReceived || 0), 0);
    const totalInbox = stats.reduce((s, r) => s + (r.landedInbox || 0), 0);
    const totalSpam = stats.reduce((s, r) => s + (r.landedSpam || 0), 0);

    res.json({
      activeAccounts: accounts.length,
      totalSent, totalReceived,
      inboxRate: totalSent > 0 ? ((totalInbox / (totalInbox + totalSpam)) * 100).toFixed(1) : 0,
      accounts: accounts.map(a => ({
        id: a.id, email: a.email, pool: a.warmupPool,
        reputation: a.reputationScore, status: a.warmupStatus,
        dailyLimit: a.warmupDailyLimit, currentDay: a.warmupCurrentDay,
      })),
      stats,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get warmup stats for specific account
router.get("/warmup/stats/:accountId", async (req, res) => {
  try {
    const stats = await db.select().from(warmupStats)
      .where(eq(warmupStats.accountId, req.params.accountId))
      .orderBy(desc(warmupStats.date))
      .limit(30);
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Update warmup settings
router.put("/warmup/settings/:accountId", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { warmupDailyLimit, warmupPool } = req.body;
    const [updated] = await db.update(emailAccounts)
      .set({ warmupDailyLimit, warmupPool, updatedAt: new Date() })
      .where(and(eq(emailAccounts.id, req.params.accountId), eq(emailAccounts.userId, userId)))
      .returning();
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// CAMPAIGNS
// ============================================================

type LaunchReadiness = {
  ready: boolean;
  blockers: string[];
  leadCount: number;
  stepCount: number;
};

class DuplicateCampaignPreparationError extends Error {
  constructor() {
    super("A campaign with this name already exists");
    this.name = "DuplicateCampaignPreparationError";
  }
}

function normalizedEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function addBlocker(blockers: string[], blocker: string): void {
  if (!blockers.includes(blocker)) blockers.push(blocker);
}

function campaignLaunchAuthorizationResult(campaignId: string): string {
  return JSON.stringify({
    schema: "campaign_launch_authorization",
    version: 1,
    campaignId,
  });
}

async function getOwnedCampaign(database: any, userId: string, campaignId: string): Promise<any | null> {
  const [campaign] = await database.select().from(campaigns).where(and(
    eq(campaigns.id, campaignId),
    eq(campaigns.userId, userId),
  )).limit(1);
  return campaign || null;
}

function campaignMutationBlocked(campaign: any): string | null {
  if (campaign.status === "active") {
    return "Pause the active campaign before editing its sequences, recipients, or sender accounts.";
  }
  return null;
}

async function getLockedMutableCampaign(
  transaction: any,
  userId: string,
  campaignId: string,
): Promise<{ campaign: any | null; error: string | null }> {
  // Use the same per-campaign lock as every activation path so an edit
  // cannot race a draft-to-active CAS.
  await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`campaign-launch:${campaignId}`}, 0))`);
  const campaign = await getOwnedCampaign(transaction, userId, campaignId);
  if (!campaign) return { campaign: null, error: null };
  return { campaign, error: campaignMutationBlocked(campaign) };
}

function sameStringArray(left: unknown, right: readonly string[]): boolean {
  return Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

function sameUnorderedStringArray(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((value, index) => value === rightSorted[index]);
}

function sameTimestamp(left: unknown, right: unknown): boolean {
  if (left == null || right == null) return left == null && right == null;
  const leftTime = left instanceof Date ? left.getTime() : new Date(String(left)).getTime();
  const rightTime = right instanceof Date ? right.getTime() : new Date(String(right)).getTime();
  return Number.isFinite(leftTime) && leftTime === rightTime;
}

async function matchesExistingDraftPreparation(
  database: any,
  campaign: any,
  payload: {
    name: string;
    businessContext: string;
    goals: string[];
    steps: Array<{ subject: string; body: string; delayDays: number }>;
    leadIds: string[];
    accountIds: string[];
  },
): Promise<boolean> {
  if (campaign.status !== "draft" || campaign.name !== payload.name ||
      campaign.stopOnReply !== true || campaign.totalLeads !== payload.leadIds.length) {
    return false;
  }

  const [manager] = await database.select({
    businessContext: businessManager.businessContext,
    goals: businessManager.goals,
  }).from(businessManager).where(eq(businessManager.userId, campaign.userId)).limit(1);
  if (!manager ||
      manager.businessContext !== payload.businessContext ||
      !sameStringArray(manager.goals, payload.goals)) {
    return false;
  }

  const sequences = await database.select({
    stepNumber: campaignSequences.stepNumber,
    variant: campaignSequences.variant,
    subject: campaignSequences.subject,
    body: campaignSequences.body,
    delayDays: campaignSequences.delayDays,
    delayHours: campaignSequences.delayHours,
    isActive: campaignSequences.isActive,
  }).from(campaignSequences)
    .where(eq(campaignSequences.campaignId, campaign.id))
    .orderBy(campaignSequences.stepNumber);
  if (sequences.length !== payload.steps.length || sequences.some((sequence: any, index: number) => {
    const step = payload.steps[index];
    return sequence.stepNumber !== index + 1 ||
      sequence.variant !== "A" ||
      sequence.subject !== step.subject ||
      sequence.body !== step.body ||
      sequence.delayDays !== step.delayDays ||
      sequence.delayHours !== 0 ||
      sequence.isActive !== true;
  })) {
    return false;
  }

  const persistedLeads = await database.select({
    leadId: campaignLeads.leadId,
    status: campaignLeads.status,
    currentStep: campaignLeads.currentStep,
    sentCount: campaignLeads.sentCount,
    openCount: campaignLeads.openCount,
    clickCount: campaignLeads.clickCount,
    lastSentAt: campaignLeads.lastSentAt,
    nextSendAt: campaignLeads.nextSendAt,
  }).from(campaignLeads).where(eq(campaignLeads.campaignId, campaign.id));
  if (!sameUnorderedStringArray(
        persistedLeads.map((lead: any) => lead.leadId),
        payload.leadIds,
      ) ||
      persistedLeads.some((lead: any) => {
        return lead.status !== "pending" ||
          (lead.currentStep || 0) !== 0 ||
          (lead.sentCount || 0) !== 0 ||
          (lead.openCount || 0) !== 0 ||
          (lead.clickCount || 0) !== 0 ||
          !sameTimestamp(lead.lastSentAt, null) ||
          !sameTimestamp(lead.nextSendAt, null);
      })) {
    return false;
  }

  const persistedAccounts = await database.select({
    accountId: campaignSendingAccounts.accountId,
  }).from(campaignSendingAccounts)
    .where(eq(campaignSendingAccounts.campaignId, campaign.id));
  return sameUnorderedStringArray(
    persistedAccounts.map((account: any) => account.accountId),
    payload.accountIds,
  );
}

function isNonContactableStatus(value: unknown): boolean {
  const status = typeof value === "string" ? value.trim().toLowerCase() : "";
  return status.includes("reply") ||
    status.includes("suppress") ||
    status.includes("unsubscribe") ||
    status.includes("opted_out") ||
    status.includes("opt_out") ||
    status.includes("optout") ||
    status.includes("opt-out") ||
    status.includes("do_not_contact") ||
    status.includes("do-not-contact") ||
    status.includes("bounce") ||
    status.includes("not_interested") ||
    status.includes("not-interested") ||
    status.includes("wrong_person") ||
    status.includes("wrong-person") ||
    status === "invalid" ||
    status === "converted" ||
    status === "appointment_booked";
}

/**
 * Evaluate a campaign without exposing account credentials or relying on
 * model-generated history.  `database` is intentionally structural so the
 * same check can run inside the launch transaction.
 */
async function evaluateCampaignLaunchReadiness(
  database: any,
  userId: string,
  campaignId: string,
): Promise<{ campaign: any | null; readiness: LaunchReadiness }> {
  const blockers: string[] = [];
  const [campaign] = await database.select().from(campaigns).where(and(
    eq(campaigns.id, campaignId),
    eq(campaigns.userId, userId),
  )).limit(1);

  if (!campaign) {
    return {
      campaign: null,
      readiness: { ready: false, blockers: ["Campaign not found"], leadCount: 0, stepCount: 0 },
    };
  }

  const [sequences, campaignLeadRows, sendingAccountRows, settingsRows, launchAuthorizationRows] = await Promise.all([
    database.select().from(campaignSequences)
      .where(eq(campaignSequences.campaignId, campaign.id))
      .orderBy(campaignSequences.stepNumber),
    database.select().from(campaignLeads)
      .where(eq(campaignLeads.campaignId, campaign.id)),
    database.select().from(campaignSendingAccounts)
      .where(eq(campaignSendingAccounts.campaignId, campaign.id)),
    database.select({
      smtpHost: userSettings.smtpHost,
      smtpUsername: userSettings.smtpUsername,
      smtpPassword: userSettings.smtpPassword,
      senderEmail: userSettings.senderEmail,
    }).from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1),
    database.select({ id: agentTasks.id })
      .from(agentTasks)
      .where(and(
        eq(agentTasks.userId, userId),
        eq(agentTasks.agentType, "outreach_agent"),
        eq(agentTasks.taskType, CAMPAIGN_LAUNCH_AUTH_TASK_TYPE),
        eq(agentTasks.status, "authorized"),
        eq(agentTasks.result, campaignLaunchAuthorizationResult(campaign.id)),
      ))
      .limit(1),
  ]);

  const [settings] = settingsRows;
  const smtpIssue = getTenantSmtpConfigIssue(settings);
  if (smtpIssue) addBlocker(blockers, smtpIssue);
  if (!isValidRecipientEmail(settings?.senderEmail)) {
    addBlocker(blockers, "Tenant sender email is invalid or missing; update the saved SMTP sender before launching.");
  }

  if (campaign.stopOnReply !== true) {
    addBlocker(blockers, "Stop on reply must be enabled before launching.");
  }

  // A launch marker lets a paused prepared campaign remain strict after its
  // first activation without adding a schema column. Legacy campaigns have
  // no marker and retain the general (>0 step) status behavior.
  const isPreparedCampaign = campaign.status === "draft" || launchAuthorizationRows.length > 0;
  const stepIssues = isPreparedCampaign
    ? getPreparedSequenceIssues(sequences)
    : sequences.length === 0
      ? ["Campaign must contain at least one sequence step."]
      : sequences.filter((sequence: any) => sequence.isActive === true).length === 0
        ? ["Campaign must contain at least one active sequence step."]
        : sequences
          .filter((sequence: any) => sequence.isActive === true)
          .flatMap((sequence: any) => {
          const issues: string[] = [];
          if (typeof sequence.subject !== "string" || sequence.subject.trim().length === 0) {
            issues.push("Every active campaign step must have a non-empty subject.");
          }
          if (typeof sequence.body !== "string" || sequence.body.trim().length === 0) {
            issues.push("Every active campaign step must have a non-empty body.");
          }
          return issues;
          });
  stepIssues.forEach((issue: string) => addBlocker(blockers, issue));

  const leadIds = campaignLeadRows.map((row: any) => row.leadId);
  const tenantLeads: any[] = leadIds.length > 0
    ? await database.select().from(leads).where(and(
      eq(leads.userId, userId),
      inArray(leads.id, leadIds),
    ))
    : [];
  const tenantLeadById = new Map<string, any>(tenantLeads.map((lead: any) => [lead.id, lead]));

  if (campaignLeadRows.length === 0) {
    addBlocker(blockers, "Select at least one lead before launching.");
  }
  if (tenantLeads.length !== campaignLeadRows.length) {
    addBlocker(blockers, "One or more selected leads are missing or are not owned by this tenant.");
  }

  for (const campaignLead of campaignLeadRows) {
    const lead = tenantLeadById.get(campaignLead.leadId);
    if (!lead) continue;
    if (!isValidRecipientEmail(lead.email)) {
      addBlocker(blockers, `Lead ${lead.id} has an invalid recipient email.`);
    }
    if (getLeadContactIssue(lead)) {
      addBlocker(blockers, `Lead ${lead.id} failed contact-quality checks.`);
    }
    if (isNonContactableStatus(lead.status) || isNonContactableStatus(campaignLead.status)) {
      addBlocker(blockers, `Lead ${lead.id} is replied, suppressed, unsubscribed, bounced, or otherwise not contactable.`);
    }
    try {
      if (await isEmailSuppressed(userId, lead.email)) {
        addBlocker(blockers, `Lead ${lead.id} is suppressed and cannot be contacted.`);
      }
    } catch {
      // A suppression lookup that cannot be verified must never turn into an
      // allow decision.
      addBlocker(blockers, "Recipient suppression status could not be verified.");
    }
  }

  const selectedAccountIds = sendingAccountRows.map((row: any) => row.accountId);
  const tenantAccounts: any[] = selectedAccountIds.length > 0
    ? await database.select().from(emailAccounts).where(and(
      eq(emailAccounts.userId, userId),
      inArray(emailAccounts.id, selectedAccountIds),
    ))
    : [];
  const tenantAccountById = new Map<string, any>(tenantAccounts.map((account: any) => [account.id, account]));

  if (sendingAccountRows.length === 0) {
    addBlocker(blockers, "Select at least one sending account before launching.");
  }
  if (tenantAccounts.length !== sendingAccountRows.length) {
    addBlocker(blockers, "One or more selected sending accounts are missing or are not owned by this tenant.");
  }

  const savedSender = normalizedEmail(settings?.senderEmail);
  for (const selectedAccount of sendingAccountRows) {
    const account = tenantAccountById.get(selectedAccount.accountId);
    if (!account) continue;
    if (account.isActive !== true) {
      addBlocker(blockers, `Sending account ${account.id} is inactive.`);
    }
    if (normalizedEmail(account.email) !== savedSender) {
      addBlocker(blockers, "Selected sending accounts must match the tenant's saved SMTP sender.");
    }
  }

  return {
    campaign,
    readiness: {
      ready: blockers.length === 0,
      blockers,
      leadCount: tenantLeads.length,
      stepCount: sequences.length,
    },
  };
}

// Save a user-approved campaign brief and its explicitly selected resources.
// This endpoint never sends email, enables a scheduler, or changes manager
// autonomy/enabled fields.
router.post("/campaign-preparations", async (req, res) => {
  const validation = validateCampaignPreparationPayload(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: "Invalid campaign preparation payload",
      details: validation.errors,
    });
  }

  const userId = getUserId(req);
  const payload = validation.data;
  const accountIds = payload.accountIds;

  try {
    const result = await db.transaction(async (tx) => {
      // One lock per tenant serializes same-user preparation attempts without
      // a schema migration or a global lock that would affect other tenants.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`campaign-preparation:${userId}`}, 0))`);

      const [existing] = await tx.select().from(campaigns)
        .where(and(
          eq(campaigns.userId, userId),
          sql`lower(${campaigns.name}) = lower(${payload.name})`,
        ))
        .limit(1);
      if (existing) {
        if (await matchesExistingDraftPreparation(tx, existing, payload)) {
          return { id: existing.id, status: "draft", replayed: true };
        }
        throw new DuplicateCampaignPreparationError();
      }

      const selectedLeads = payload.leadIds.length > 0
        ? await tx.select({ id: leads.id }).from(leads).where(and(
          eq(leads.userId, userId),
          inArray(leads.id, payload.leadIds),
        ))
        : [];
      if (selectedLeads.length !== payload.leadIds.length) {
        throw new Error("One or more selected leads are missing or are not owned by this tenant");
      }

      const tenantAccounts = await tx.select({ id: emailAccounts.id })
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, userId));
      const tenantAccountIds = new Set(tenantAccounts.map(account => account.id));
      if (accountIds.some(accountId => !tenantAccountIds.has(accountId))) {
        throw new Error("One or more selected sending accounts are missing or are not owned by this tenant");
      }

      // Only these two Business Manager fields are intentionally changed.
      // enabled, autonomyLevel, capabilities, budgets, and scheduler state
      // remain untouched.
      await tx.insert(businessManager)
        .values({
          userId,
          businessContext: payload.businessContext,
          goals: payload.goals,
        })
        .onConflictDoUpdate({
          target: businessManager.userId,
          set: {
            businessContext: payload.businessContext,
            goals: payload.goals,
            updatedAt: new Date(),
          },
        });

      const [campaign] = await tx.insert(campaigns).values({
        userId,
        name: payload.name,
        status: "draft",
        stopOnReply: true,
        totalLeads: payload.leadIds.length,
      }).returning({ id: campaigns.id, status: campaigns.status });

      await tx.insert(campaignSequences).values(payload.steps.map((step, index) => ({
        campaignId: campaign.id,
        stepNumber: index + 1,
        subject: step.subject,
        body: step.body,
        delayDays: step.delayDays,
        delayHours: 0,
        isActive: true,
      })));

      if (payload.leadIds.length > 0) {
        await tx.insert(campaignLeads).values(payload.leadIds.map(leadId => ({
          campaignId: campaign.id,
          leadId,
          status: "pending",
          currentStep: 0,
          nextSendAt: null,
        })));
      }

      if (accountIds.length > 0) {
        await tx.insert(campaignSendingAccounts).values(accountIds.map(accountId => ({
          campaignId: campaign.id,
          accountId,
        })));
      }

      return { id: campaign.id, status: "draft", replayed: false };
    });

    return res.status(result.replayed ? 200 : 201).json({ id: result.id, status: "draft" });
  } catch (error: any) {
    if (error instanceof DuplicateCampaignPreparationError) {
      return res.status(409).json({ error: error.message });
    }
    const message = error?.message || "Unable to prepare campaign";
    if (/selected (?:leads|sending accounts)/i.test(message)) {
      return res.status(400).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
});

/**
 * Register the saved tenant SMTP sender as campaign metadata after an
 * explicit user click.  The password is never copied to email_accounts and
 * this handler never sends a test or campaign message.
 */
router.post("/campaign-saved-sender", async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`campaign-saved-sender:${userId}`}, 0))`);

      const [settings] = await tx.select({
        smtpHost: userSettings.smtpHost,
        smtpPort: userSettings.smtpPort,
        smtpUsername: userSettings.smtpUsername,
        smtpPassword: userSettings.smtpPassword,
        senderEmail: userSettings.senderEmail,
      }).from(userSettings).where(eq(userSettings.userId, userId)).limit(1);

      const smtpIssue = getTenantSmtpConfigIssue(settings);
      if (smtpIssue || !isValidRecipientEmail(settings?.senderEmail)) {
        return {
          error: smtpIssue || "Tenant sender email is invalid; update the saved SMTP sender first.",
        };
      }

      const senderEmail = settings!.senderEmail!.trim();
      const [existing] = await tx.select({
        id: emailAccounts.id,
        email: emailAccounts.email,
        isActive: emailAccounts.isActive,
      }).from(emailAccounts).where(and(
        eq(emailAccounts.userId, userId),
        sql`lower(trim(${emailAccounts.email})) = lower(trim(${senderEmail}))`,
      )).limit(1);

      if (existing) {
        if (existing.isActive !== true) {
          await tx.update(emailAccounts)
            .set({ isActive: true, updatedAt: new Date() })
            .where(and(eq(emailAccounts.id, existing.id), eq(emailAccounts.userId, userId)));
        }
        return {
          id: existing.id,
          email: existing.email,
          status: "active",
          created: false,
        };
      }

      const [account] = await tx.insert(emailAccounts).values({
        userId,
        email: senderEmail,
        displayName: senderEmail.split("@")[0],
        provider: "smtp",
        authType: "credentials",
        smtpHost: settings!.smtpHost,
        smtpPort: settings!.smtpPort || 587,
        // The campaign worker reads the saved tenant SMTP settings directly.
        // Do not duplicate or expose the password in this metadata row.
        smtpPassword: null,
        domain: senderEmail.split("@")[1]?.toLowerCase() || null,
        isActive: true,
      }).returning({
        id: emailAccounts.id,
        email: emailAccounts.email,
        isActive: emailAccounts.isActive,
      });

      return {
        id: account.id,
        email: account.email,
        status: account.isActive ? "active" : "inactive",
        created: true,
      };
    });

    if ("error" in result) return res.status(409).json({ error: result.error });
    return res.status(result.created ? 201 : 200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Unable to register saved SMTP sender" });
  }
});

router.get("/campaign-launch-options", async (req, res) => {
  try {
    const userId = getUserId(req);
    const [tenantLeads, accounts, settings] = await Promise.all([
      db.select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        status: leads.status,
      }).from(leads).where(eq(leads.userId, userId)),
      db.select({
        id: emailAccounts.id,
        email: emailAccounts.email,
        isActive: emailAccounts.isActive,
      }).from(emailAccounts).where(eq(emailAccounts.userId, userId)),
      db.select({
        smtpHost: userSettings.smtpHost,
        smtpUsername: userSettings.smtpUsername,
        smtpPassword: userSettings.smtpPassword,
        senderEmail: userSettings.senderEmail,
      }).from(userSettings).where(eq(userSettings.userId, userId)).limit(1),
    ]);

    const savedSender = normalizedEmail(settings[0]?.senderEmail);
    const matchingActiveSender = accounts.some(account =>
      account.isActive === true && normalizedEmail(account.email) === savedSender,
    );
    const smtpReady = Boolean(
      settings[0] &&
      !getTenantSmtpConfigIssue(settings[0]) &&
      isValidRecipientEmail(settings[0].senderEmail) &&
      matchingActiveSender,
    );

    return res.json({
      leads: tenantLeads,
      accounts: accounts.map(account => ({
        id: account.id,
        email: account.email,
        status: account.isActive ? "active" : "inactive",
      })),
      smtpReady,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Unable to load campaign launch options" });
  }
});

router.get("/campaigns/:id/launch-readiness", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { campaign, readiness } = await evaluateCampaignLaunchReadiness(db, userId, req.params.id);
    if (!campaign) return res.status(404).json({ error: "Not found" });
    return res.json(readiness);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Unable to evaluate campaign readiness" });
  }
});

router.post("/campaigns/:id/launch", async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`campaign-launch:${req.params.id}`}, 0))`);
      const campaign = await getOwnedCampaign(tx, userId, req.params.id);
      if (!campaign) {
        return {
          campaign: null,
          readiness: { ready: false, blockers: ["Campaign not found"], leadCount: 0, stepCount: 0 },
          alreadyActive: false,
        };
      }
      // A repeated click after a committed launch is an idempotent replay.
      // Preserve the active state and, importantly, do not reset pending
      // recipients' nextSendAt timestamps.
      if (campaign.status === "active") {
        return {
          campaign,
          readiness: { ready: true, blockers: [], leadCount: 0, stepCount: 0 },
          alreadyActive: true,
        };
      }

      const { readiness } = await evaluateCampaignLaunchReadiness(tx, userId, req.params.id);
      if (!campaign) return { campaign: null, readiness };
      if (!readiness.ready) return { campaign, readiness };

      const [updated] = await tx.update(campaigns)
        .set({ status: "active", updatedAt: new Date() })
        .where(and(
          eq(campaigns.id, req.params.id),
          eq(campaigns.userId, userId),
          eq(campaigns.status, campaign.status),
        ))
        .returning({ id: campaigns.id, status: campaigns.status });
      if (!updated) {
        const current = await getOwnedCampaign(tx, userId, req.params.id);
        return {
          campaign: current,
          readiness: current?.status === "active"
            ? { ready: true, blockers: [], leadCount: 0, stepCount: 0 }
            : readiness,
          alreadyActive: current?.status === "active",
        };
      }

      // A prepared draft intentionally has no active scheduler work. Queue
      // its explicitly selected pending recipients only after this
      // transaction has won the draft-to-active CAS.
      await tx.update(campaignLeads)
        .set({ nextSendAt: new Date() })
        .where(and(
          eq(campaignLeads.campaignId, req.params.id),
          eq(campaignLeads.status, "pending"),
        ));

      // Register the dispatcher authorization in this same transaction as
      // the active transition. The shared helper owns the task type, status,
      // and versioned result contract.
      await registerCampaignLaunch(tx, userId, updated.id);

      return { campaign: updated, readiness, alreadyActive: false };
    });

    if (!result.campaign) return res.status(404).json({ error: "Not found" });
    if (!result.readiness.ready) {
      return res.status(409).json({
        error: "Campaign is not ready to launch",
        ...result.readiness,
      });
    }
    return res.json({ id: result.campaign.id, status: "active" });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Unable to launch campaign" });
  }
});

// List campaigns
router.get("/campaigns", async (req, res) => {
  try {
    const userId = getUserId(req);
    const result = await db.select().from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt));
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Create campaign
router.post("/campaigns", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (req.body?.status === "active") {
      return res.status(409).json({
        error: "Campaigns must be created as drafts and launched through the readiness-checked launch action.",
      });
    }
    const [campaign] = await db.insert(campaigns).values({ ...req.body, userId }).returning();
    res.json(campaign);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get campaign with sequences
router.get("/campaigns/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const [campaign] = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, req.params.id), eq(campaigns.userId, userId)));
    if (!campaign) return res.status(404).json({ error: "Not found" });

    const [sequences, sendingAccountLinks, campaignLeadLinks] = await Promise.all([
      db.select().from(campaignSequences)
        .where(eq(campaignSequences.campaignId, campaign.id))
        .orderBy(campaignSequences.stepNumber),
      db.select().from(campaignSendingAccounts)
        .where(eq(campaignSendingAccounts.campaignId, campaign.id)),
      db.select({ leadId: campaignLeads.leadId }).from(campaignLeads)
        .where(eq(campaignLeads.campaignId, campaign.id)),
    ]);
    const accountIds = sendingAccountLinks.map(link => link.accountId);
    const ownedAccounts = accountIds.length > 0
      ? await db.select({ id: emailAccounts.id }).from(emailAccounts).where(and(
        eq(emailAccounts.userId, userId),
        inArray(emailAccounts.id, accountIds),
      ))
      : [];
    const ownedAccountIds = new Set(ownedAccounts.map(account => account.id));
    const sendingAccounts = sendingAccountLinks.filter(link => ownedAccountIds.has(link.accountId));

    const leadIds = campaignLeadLinks.map(link => link.leadId);
    const ownedLeads = leadIds.length > 0
      ? await db.select({ id: leads.id }).from(leads).where(and(
        eq(leads.userId, userId),
        inArray(leads.id, leadIds),
      ))
      : [];

    res.json({ ...campaign, sequences, sendingAccounts, leadCount: ownedLeads.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Update campaign
router.put("/campaigns/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const campaign = await getOwnedCampaign(db, userId, req.params.id);
    if (!campaign) return res.status(404).json({ error: "Not found" });

    const editableFields = [
      "name", "status", "timezone", "sendDays", "sendStartHour", "sendEndHour",
      "dailyLimit", "stopOnReply", "stopOnAutoReply", "textOnly", "trackOpens", "trackClicks",
    ] as const;
    const requestKeys = Object.keys(req.body || {});
    const unknownKeys = requestKeys.filter(key => !(editableFields as readonly string[]).includes(key));
    if (unknownKeys.length > 0) {
      return res.status(400).json({ error: `Unsupported campaign fields: ${unknownKeys.join(", ")}` });
    }
    if (req.body?.status !== undefined &&
        !["draft", "active", "paused", "completed"].includes(req.body.status)) {
      return res.status(400).json({ error: "Invalid campaign status" });
    }
    const nonStatusEdit = requestKeys.some(key => key !== "status");
    if (campaign.status === "active" && nonStatusEdit) {
      return res.status(409).json({
        error: "Pause the active campaign before editing campaign settings.",
      });
    }
    if (campaign.status === "active" &&
        req.body?.status !== undefined &&
        req.body.status !== "active" &&
        req.body.status !== "paused") {
      return res.status(409).json({
        error: "Pause the active campaign before changing its status or editing it.",
      });
    }
    if (req.body?.status === "active") {
      const result = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`campaign-launch:${req.params.id}`}, 0))`);
        const current = await getOwnedCampaign(tx, userId, req.params.id);
        if (!current) return { campaign: null, readiness: null };
        if (current.status === "active") return { campaign: current, readiness: null };

        const { readiness } = await evaluateCampaignLaunchReadiness(tx, userId, req.params.id);
        if (!readiness.ready) return { campaign: current, readiness };

        const [updated] = await tx.update(campaigns)
          .set({ status: "active", updatedAt: new Date() })
          .where(and(
            eq(campaigns.id, req.params.id),
            eq(campaigns.userId, userId),
            eq(campaigns.status, current.status),
          ))
          .returning();
        if (!updated) return { campaign: current, readiness };

        await tx.update(campaignLeads)
          .set({ nextSendAt: new Date() })
          .where(and(
            eq(campaignLeads.campaignId, req.params.id),
            eq(campaignLeads.status, "pending"),
          ));
        await registerCampaignLaunch(tx, userId, updated.id);
        return { campaign: updated, readiness };
      });
      if (!result.campaign) return res.status(404).json({ error: "Not found" });
      if (result.readiness && !result.readiness.ready) {
        return res.status(409).json({
          error: "Campaign is not ready to launch",
          ...result.readiness,
        });
      }
      return res.json(result.campaign);
    }
    const updateData = Object.fromEntries(
      editableFields
        .filter(field => Object.prototype.hasOwnProperty.call(req.body || {}, field))
        .map(field => [field, req.body[field]]),
    );
    const updated = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`campaign-launch:${req.params.id}`}, 0))`);
      const current = await getOwnedCampaign(tx, userId, req.params.id);
      if (!current) return null;
      if (current.status === "active" && nonStatusEdit) {
        throw new Error("Pause the active campaign before editing campaign settings.");
      }
      const [saved] = await tx.update(campaigns)
        .set({ ...updateData, updatedAt: new Date() })
        .where(and(
          eq(campaigns.id, req.params.id),
          eq(campaigns.userId, userId),
          eq(campaigns.status, current.status),
        ))
        .returning();
      return saved || null;
    });
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (e: any) {
    if (/Pause the active campaign/.test(e.message)) return res.status(409).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// Delete campaign
router.delete("/campaigns/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const id = req.params.id;
    const deleted = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`campaign-launch:${id}`}, 0))`);
      const campaign = await getOwnedCampaign(tx, userId, id);
      if (!campaign) return false;
      await tx.delete(campaignLeads).where(eq(campaignLeads.campaignId, id));
      await tx.delete(campaignSendingAccounts).where(eq(campaignSendingAccounts.campaignId, id));
      await tx.delete(campaignSequences).where(eq(campaignSequences.campaignId, id));
      await tx.delete(agentTasks).where(and(
        eq(agentTasks.userId, userId),
        eq(agentTasks.agentType, "outreach_agent"),
        eq(agentTasks.taskType, CAMPAIGN_LAUNCH_AUTH_TASK_TYPE),
        eq(agentTasks.result, campaignLaunchAuthorizationResult(id)),
      ));
      const [removed] = await tx.delete(campaigns)
        .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
        .returning({ id: campaigns.id });
      return Boolean(removed);
    });
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Add sequence step
router.post("/campaigns/:id/sequences", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { stepNumber, variant, subject, body, delayDays, delayHours, isActive } = req.body || {};
    if (!Number.isInteger(stepNumber) || stepNumber < 1 ||
        typeof subject !== "string" || !subject.trim() ||
        typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ error: "stepNumber, subject, and body are required" });
    }
    const seq = await db.transaction(async (tx) => {
      const { campaign, error } = await getLockedMutableCampaign(tx, userId, req.params.id);
      if (!campaign) return null;
      if (error) throw new Error(error);
      const [created] = await tx.insert(campaignSequences)
        .values({
          campaignId: req.params.id,
          stepNumber,
          variant: typeof variant === "string" ? variant : "A",
          subject: subject.trim(),
          body: body.trim(),
          delayDays: Number.isInteger(delayDays) && delayDays >= 0 ? delayDays : 0,
          delayHours: Number.isInteger(delayHours) && delayHours >= 0 ? delayHours : 0,
          isActive: isActive !== false,
        }).returning();
      return created;
    });
    if (!seq) return res.status(404).json({ error: "Not found" });
    res.json(seq);
  } catch (e: any) {
    if (/Pause the active campaign/.test(e.message)) return res.status(409).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// Update sequence step
router.put("/campaigns/:campaignId/sequences/:seqId", async (req, res) => {
  try {
    const userId = getUserId(req);
    const allowedFields = ["stepNumber", "variant", "subject", "body", "delayDays", "delayHours", "isActive"];
    const requestKeys = Object.keys(req.body || {});
    if (requestKeys.some(key => !allowedFields.includes(key))) {
      return res.status(400).json({ error: "Unsupported sequence fields" });
    }
    const updateData: Record<string, unknown> = {};
    for (const key of requestKeys) updateData[key] = req.body[key];
    if (updateData.subject !== undefined && (typeof updateData.subject !== "string" || !String(updateData.subject).trim())) {
      return res.status(400).json({ error: "Subject must be non-empty" });
    }
    if (updateData.body !== undefined && (typeof updateData.body !== "string" || !String(updateData.body).trim())) {
      return res.status(400).json({ error: "Body must be non-empty" });
    }
    const updated = await db.transaction(async (tx) => {
      const { campaign, error } = await getLockedMutableCampaign(tx, userId, req.params.campaignId);
      if (!campaign) return null;
      if (error) throw new Error(error);
      const [sequence] = await tx.update(campaignSequences)
        .set({
          ...updateData,
          ...(typeof updateData.subject === "string" ? { subject: updateData.subject.trim() } : {}),
          ...(typeof updateData.body === "string" ? { body: updateData.body.trim() } : {}),
        })
        .where(and(
          eq(campaignSequences.id, req.params.seqId),
          eq(campaignSequences.campaignId, req.params.campaignId),
        )).returning();
      return sequence;
    });
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (e: any) {
    if (/Pause the active campaign/.test(e.message)) return res.status(409).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// Delete sequence step
router.delete("/campaigns/:campaignId/sequences/:seqId", async (req, res) => {
  try {
    const userId = getUserId(req);
    const deleted = await db.transaction(async (tx) => {
      const { campaign, error } = await getLockedMutableCampaign(tx, userId, req.params.campaignId);
      if (!campaign) return false;
      if (error) throw new Error(error);
      const removed = await tx.delete(campaignSequences).where(and(
        eq(campaignSequences.id, req.params.seqId),
        eq(campaignSequences.campaignId, req.params.campaignId),
      )).returning({ id: campaignSequences.id });
      return removed.length > 0;
    });
    if (!deleted) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (e: any) {
    if (/Pause the active campaign/.test(e.message)) return res.status(409).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// Assign sending accounts
router.post("/campaigns/:id/accounts", async (req, res) => {
  try {
    const userId = getUserId(req);
    const accountIds = parseStringIdArray(req.body?.accountIds ?? []);
    if (!accountIds) return res.status(400).json({ error: "accountIds must be unique non-empty strings" });
    const result = await db.transaction(async (tx) => {
      const { campaign, error } = await getLockedMutableCampaign(tx, userId, req.params.id);
      if (!campaign) return { found: false, count: 0 };
      if (error) throw new Error(error);
      if (accountIds.length > 0) {
        const ownedAccounts = await tx.select({ id: emailAccounts.id })
          .from(emailAccounts)
          .where(and(eq(emailAccounts.userId, userId), inArray(emailAccounts.id, accountIds)));
        if (ownedAccounts.length !== accountIds.length) {
          throw new Error("One or more sending accounts are missing or are not owned by this tenant");
        }
      }
      await tx.delete(campaignSendingAccounts)
        .where(eq(campaignSendingAccounts.campaignId, req.params.id));
      if (accountIds.length > 0) {
        await tx.insert(campaignSendingAccounts).values(
          accountIds.map(accountId => ({ campaignId: req.params.id, accountId })),
        );
      }
      return { found: true, count: accountIds.length };
    });
    if (!result.found) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, count: result.count });
  } catch (e: any) {
    if (/Pause the active campaign|missing or are not owned/.test(e.message)) {
      return res.status(409).json({ error: e.message });
    }
    res.status(500).json({ error: e.message });
  }
});

// Add leads to campaign
router.post("/campaigns/:id/leads", async (req, res) => {
  try {
    const userId = getUserId(req);
    const leadIds = parseStringIdArray(req.body?.leadIds ?? []);
    if (!leadIds) return res.status(400).json({ error: "leadIds must be unique non-empty strings" });
    const result = await db.transaction(async (tx) => {
      const { campaign, error } = await getLockedMutableCampaign(tx, userId, req.params.id);
      if (!campaign) return { found: false, added: 0 };
      if (error) throw new Error(error);
      if (leadIds.length === 0) return { found: true, added: 0 };

      const ownedLeads = await tx.select({ id: leads.id })
        .from(leads)
        .where(and(eq(leads.userId, userId), inArray(leads.id, leadIds)));
      if (ownedLeads.length !== leadIds.length) {
        throw new Error("One or more leads are missing or are not owned by this tenant");
      }
      const existing = await tx.select({ leadId: campaignLeads.leadId })
        .from(campaignLeads)
        .where(and(
          eq(campaignLeads.campaignId, req.params.id),
          inArray(campaignLeads.leadId, leadIds),
        ));
      const existingIds = new Set(existing.map(row => row.leadId));
      const newLeadIds = leadIds.filter(leadId => !existingIds.has(leadId));
      if (newLeadIds.length === 0) return { found: true, added: 0 };
      await tx.insert(campaignLeads).values(
        newLeadIds.map(leadId => ({ campaignId: req.params.id, leadId })),
      );
      await tx.update(campaigns).set({
        totalLeads: sql`${campaigns.totalLeads} + ${newLeadIds.length}`,
      }).where(and(eq(campaigns.id, req.params.id), eq(campaigns.userId, userId)));
      return { found: true, added: newLeadIds.length };
    });
    if (!result.found) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, added: result.added });
  } catch (e: any) {
    if (/Pause the active campaign|missing or are not owned/.test(e.message)) {
      return res.status(409).json({ error: e.message });
    }
    res.status(500).json({ error: e.message });
  }
});

// Change campaign status (launch/pause/resume/stop)
router.post("/campaigns/:id/status", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { status } = req.body;
    if (!["draft", "active", "paused", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid campaign status" });
    }
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`campaign-launch:${req.params.id}`}, 0))`);
      const campaign = await getOwnedCampaign(tx, userId, req.params.id);
      if (!campaign) return { campaign: null, readiness: null, alreadyActive: false };

      if (status === "active") {
        if (campaign.status === "active") {
          return { campaign, readiness: null, alreadyActive: true };
        }
        const { readiness } = await evaluateCampaignLaunchReadiness(tx, userId, req.params.id);
        if (!readiness.ready) return { campaign, readiness, alreadyActive: false };

        const [updated] = await tx.update(campaigns)
          .set({ status: "active", updatedAt: new Date() })
          .where(and(
            eq(campaigns.id, req.params.id),
            eq(campaigns.userId, userId),
            eq(campaigns.status, campaign.status),
          ))
          .returning();
        if (!updated) return { campaign, readiness, alreadyActive: false };

        await tx.update(campaignLeads)
          .set({ nextSendAt: new Date() })
          .where(and(
            eq(campaignLeads.campaignId, req.params.id),
            eq(campaignLeads.status, "pending"),
          ));
        await registerCampaignLaunch(tx, userId, updated.id);
        return { campaign: updated, readiness, alreadyActive: false };
      }
      if (campaign.status === "active" && status !== "paused") {
        return {
          campaign,
          readiness: {
            ready: false,
            blockers: ["Pause the active campaign before changing its status or editing it."],
            leadCount: 0,
            stepCount: 0,
          },
          alreadyActive: false,
        };
      }

      const [updated] = await tx.update(campaigns)
        .set({ status, updatedAt: new Date() })
        .where(and(
          eq(campaigns.id, req.params.id),
          eq(campaigns.userId, userId),
          eq(campaigns.status, campaign.status),
        ))
        .returning();
      return { campaign: updated || campaign, readiness: null, alreadyActive: false };
    });
    if (!result.campaign) return res.status(404).json({ error: "Not found" });
    if (result.readiness && !result.readiness.ready) {
      return res.status(409).json({
        error: "Campaign is not ready to launch",
        ...result.readiness,
      });
    }
    return res.json(result.campaign);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Campaign analytics
router.get("/campaigns/:id/analytics", async (req, res) => {
  try {
    const userId = getUserId(req);
    const [campaign] = await db.select().from(campaigns).where(and(
      eq(campaigns.id, req.params.id),
      eq(campaigns.userId, userId),
    ));
    if (!campaign) return res.status(404).json({ error: "Not found" });

    const statusBreakdown = await db.select({
      status: campaignLeads.status,
      count: count(),
    }).from(campaignLeads)
      .innerJoin(leads, eq(campaignLeads.leadId, leads.id))
      .where(and(
        eq(campaignLeads.campaignId, campaign.id),
        eq(leads.userId, userId),
      ))
      .groupBy(campaignLeads.status);

    const daily = await db.select().from(campaignDailyAnalytics)
      .where(eq(campaignDailyAnalytics.campaignId, campaign.id))
      .orderBy(desc(campaignDailyAnalytics.date))
      .limit(30);

    res.json({
      campaign,
      statusBreakdown,
      daily,
      rates: {
        open: (campaign.emailsSent || 0) > 0 ? (((campaign.emailsOpened || 0) / (campaign.emailsSent || 1)) * 100).toFixed(1) : 0,
        reply: (campaign.emailsSent || 0) > 0 ? (((campaign.emailsReplied || 0) / (campaign.emailsSent || 1)) * 100).toFixed(1) : 0,
        bounce: (campaign.emailsSent || 0) > 0 ? (((campaign.emailsBounced || 0) / (campaign.emailsSent || 1)) * 100).toFixed(1) : 0,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Preview email with spintax + variables
router.post("/campaigns/:id/preview", async (req, res) => {
  try {
    const userId = getUserId(req);
    const campaign = await getOwnedCampaign(db, userId, req.params.id);
    if (!campaign) return res.status(404).json({ error: "Not found" });
    const { subject, body, leadData } = req.body;
    const processed = instantlyEngine.processEmailContent(subject, body, leadData || {});
    res.json(processed);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// UNIBOX (Unified Inbox)
// ============================================================

// Get inbox messages with filters
router.get("/unibox", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { label, accountId, isRead, page = "1" } = req.query;
    const limit = 50;
    const offset = (parseInt(page as string) - 1) * limit;

    let conditions = [eq(inboxMessages.userId, userId), eq(inboxMessages.isArchived, false)];
    if (label && label !== "all") conditions.push(eq(inboxMessages.aiLabel, label as string));
    if (accountId) conditions.push(eq(inboxMessages.accountId, accountId as string));
    if (isRead === "true") conditions.push(eq(inboxMessages.isRead, true));
    if (isRead === "false") conditions.push(eq(inboxMessages.isRead, false));

    const messages = await db.select().from(inboxMessages)
      .where(and(...conditions))
      .orderBy(desc(inboxMessages.receivedAt))
      .limit(limit).offset(offset);

    // Label counts
    const labelCounts = await db.select({
      label: inboxMessages.aiLabel,
      count: count(),
    }).from(inboxMessages)
      .where(and(eq(inboxMessages.userId, userId), eq(inboxMessages.isArchived, false)))
      .groupBy(inboxMessages.aiLabel);

    const unreadCount = await db.select({ count: count() }).from(inboxMessages)
      .where(and(eq(inboxMessages.userId, userId), eq(inboxMessages.isRead, false), eq(inboxMessages.isArchived, false)));

    res.json({ messages, labelCounts, unreadCount: unreadCount[0]?.count || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Mark message read/unread
router.put("/unibox/:id/read", async (req, res) => {
  try {
    const [updated] = await db.update(inboxMessages)
      .set({ isRead: req.body.isRead ?? true })
      .where(eq(inboxMessages.id, req.params.id)).returning();
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Star/unstar message
router.put("/unibox/:id/star", async (req, res) => {
  try {
    const [msg] = await db.select().from(inboxMessages).where(eq(inboxMessages.id, req.params.id));
    const [updated] = await db.update(inboxMessages)
      .set({ isStarred: !msg?.isStarred })
      .where(eq(inboxMessages.id, req.params.id)).returning();
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Change AI label
router.put("/unibox/:id/label", async (req, res) => {
  try {
    const [updated] = await db.update(inboxMessages)
      .set({ aiLabel: req.body.label })
      .where(eq(inboxMessages.id, req.params.id)).returning();
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Archive message
router.put("/unibox/:id/archive", async (req, res) => {
  try {
    const [updated] = await db.update(inboxMessages)
      .set({ isArchived: true })
      .where(eq(inboxMessages.id, req.params.id)).returning();
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Bulk actions
router.post("/unibox/bulk", async (req, res) => {
  try {
    const { ids, action, label } = req.body;
    if (!ids?.length) return res.status(400).json({ error: "No message ids" });

    for (const id of ids) {
      if (action === "read") await db.update(inboxMessages).set({ isRead: true }).where(eq(inboxMessages.id, id));
      if (action === "unread") await db.update(inboxMessages).set({ isRead: false }).where(eq(inboxMessages.id, id));
      if (action === "archive") await db.update(inboxMessages).set({ isArchived: true }).where(eq(inboxMessages.id, id));
      if (action === "label") await db.update(inboxMessages).set({ aiLabel: label }).where(eq(inboxMessages.id, id));
    }
    res.json({ success: true, affected: ids.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Incoming message webhook (for IMAP sync)
router.post("/unibox/incoming", async (req, res) => {
  try {
    const { userId, accountId, fromEmail, fromName, toEmail, subject, body, messageId, threadId } = req.body;
    const classification = instantlyEngine.classifyEmail(body || "", subject || "");

    const [msg] = await db.insert(inboxMessages).values({
      userId, accountId, direction: "inbound",
      fromEmail, fromName, toEmail, subject,
      bodyText: body, snippet: body?.substring(0, 120),
      messageId, threadId,
      aiLabel: classification.label,
      aiSentiment: classification.sentiment,
      aiConfidence: classification.confidence,
    }).returning();

    res.json(msg);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// WEBSITE VISITORS
// ============================================================

// Create tracking pixel
router.post("/visitors/pixel", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { domain } = req.body;
    const pixelCode = instantlyEngine.generatePixelCode(domain, userId);

    const [pixel] = await db.insert(websitePixels).values({
      userId, domain, pixelCode,
    }).returning();

    res.json(pixel);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get pixels
router.get("/visitors/pixels", async (req, res) => {
  try {
    const userId = getUserId(req);
    const pixels = await db.select().from(websitePixels).where(eq(websitePixels.userId, userId));
    res.json(pixels);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Visitor dashboard
router.get("/visitors/dashboard", async (req, res) => {
  try {
    const userId = getUserId(req);
    const allVisitors = await db.select().from(websiteVisitors)
      .where(eq(websiteVisitors.userId, userId))
      .orderBy(desc(websiteVisitors.visitedAt))
      .limit(100);

    const resolved = allVisitors.filter(v => v.resolutionStatus === "resolved");
    const companies = Array.from(new Set(allVisitors.filter(v => v.companyName).map(v => v.companyName!)));

    res.json({
      totalVisitors: allVisitors.length,
      resolvedCount: resolved.length,
      resolutionRate: allVisitors.length > 0 ? ((resolved.length / allVisitors.length) * 100).toFixed(1) : 0,
      topCompanies: companies.slice(0, 10),
      recentVisitors: allVisitors.slice(0, 20),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Push visitor to leads
router.post("/visitors/:id/to-lead", async (req, res) => {
  try {
    const userId = getUserId(req);
    const [visitor] = await db.select().from(websiteVisitors).where(eq(websiteVisitors.id, req.params.id));
    if (!visitor || !visitor.resolvedEmail) return res.status(400).json({ error: "Visitor not resolved" });

    const [lead] = await db.insert(leads).values({
      userId,
      name: visitor.resolvedName || "Unknown",
      email: visitor.resolvedEmail,
      company: visitor.companyName || undefined,
      source: "website_visitor",
      status: "new",
      notes: `Visited: ${visitor.pageUrl}. Company: ${visitor.companyName}. Title: ${visitor.resolvedTitle}`,
    }).returning();

    res.json(lead);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// DFY EMAIL SETUP
// ============================================================

// Create DFY order
router.post("/dfy/order", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { primaryDomain, secondaryDomains, inboxesPerDomain } = req.body;

    const [order] = await db.insert(dfyOrders).values({
      userId, primaryDomain,
      secondaryDomains: JSON.stringify(secondaryDomains || []),
      inboxesPerDomain: inboxesPerDomain || 3,
      estimatedCompletion: new Date(Date.now() + 72 * 60 * 60 * 1000),
    }).returning();

    // Create domain records
    const allDomains = [primaryDomain, ...(secondaryDomains || [])];
    for (const domain of allDomains) {
      const dnsRecords = instantlyEngine.generateDnsRecords(domain);
      await db.insert(dfyDomains).values({
        orderId: order.id, domain,
        spfRecord: dnsRecords.spf, dkimRecord: dnsRecords.dkim,
        dmarcRecord: dnsRecords.dmarc, mxRecord: dnsRecords.mx,
      });
    }

    // Start async provisioning (simulated)
    instantlyEngine.startDfyProvisioning(order.id).catch(console.error);

    res.json(order);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// List DFY orders
router.get("/dfy/orders", async (req, res) => {
  try {
    const userId = getUserId(req);
    const orders = await db.select().from(dfyOrders)
      .where(eq(dfyOrders.userId, userId))
      .orderBy(desc(dfyOrders.createdAt));

    // Attach domains to each order
    const result = await Promise.all(orders.map(async (order) => {
      const domains = await db.select().from(dfyDomains).where(eq(dfyDomains.orderId, order.id));
      return { ...order, domains };
    }));

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Check domain availability
router.post("/dfy/check-domain", async (req, res) => {
  try {
    const { domain } = req.body;
    const result = instantlyEngine.checkDomainAvailability(domain);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// EMAIL VERIFICATION
// ============================================================

// Bulk verify
router.post("/verification/bulk", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, emails } = req.body;
    if (!emails?.length) return res.status(400).json({ error: "No emails provided" });

    const [job] = await db.insert(verificationJobs).values({
      userId, name: name || `Verification ${new Date().toLocaleDateString()}`,
      totalEmails: emails.length,
      status: "processing",
    }).returning();

    // Process each email
    let valid = 0, invalid = 0, risky = 0, unknown = 0;
    for (const email of emails) {
      const result = instantlyEngine.verifyEmail(email);
      await db.insert(verificationResults).values({
        jobId: job.id, email, ...result,
      });
      if (result.status === "valid") valid++;
      else if (result.status === "invalid") invalid++;
      else if (result.status === "risky") risky++;
      else unknown++;
    }

    const [updated] = await db.update(verificationJobs).set({
      status: "completed",
      validCount: valid, invalidCount: invalid,
      riskyCount: risky, unknownCount: unknown,
      creditsUsed: emails.length * 0.25,
      completedAt: new Date(),
    }).where(eq(verificationJobs.id, job.id)).returning();

    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Single verify
router.post("/verification/single", async (req, res) => {
  try {
    const { email } = req.body;
    const result = instantlyEngine.verifyEmail(email);
    res.json({ email, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// List verification jobs
router.get("/verification/jobs", async (req, res) => {
  try {
    const userId = getUserId(req);
    const jobs = await db.select().from(verificationJobs)
      .where(eq(verificationJobs.userId, userId))
      .orderBy(desc(verificationJobs.createdAt));
    res.json(jobs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get job results
router.get("/verification/jobs/:id/results", async (req, res) => {
  try {
    const results = await db.select().from(verificationResults)
      .where(eq(verificationResults.jobId, req.params.id));
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Catch-all recovery
router.post("/verification/jobs/:id/catch-all", async (req, res) => {
  try {
    const riskyResults = await db.select().from(verificationResults)
      .where(and(eq(verificationResults.jobId, req.params.id), eq(verificationResults.isCatchAll, true)));

    let recovered = 0;
    for (const r of riskyResults) {
      if (Math.random() < 0.6) { // 60% recovery rate
        await db.update(verificationResults)
          .set({ status: "valid", reason: "catch_all_recovered" })
          .where(eq(verificationResults.id, r.id));
        recovered++;
      }
    }

    await db.update(verificationJobs)
      .set({ catchAllRecovered: recovered })
      .where(eq(verificationJobs.id, req.params.id));

    res.json({ recovered, total: riskyResults.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// INBOX PLACEMENT TESTING
// ============================================================

router.post("/inbox-test", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { accountId, subject, body } = req.body;
    const analysis = instantlyEngine.analyzeInboxPlacement(subject, body);

    const [test] = await db.insert(inboxPlacementTests).values({
      userId, accountId, subject, body,
      score: analysis.score,
      gmailResult: analysis.gmail,
      outlookResult: analysis.outlook,
      yahooResult: analysis.yahoo,
      spamWordsFound: JSON.stringify(analysis.spamWords),
      recommendations: JSON.stringify(analysis.recommendations),
      hasExcessiveLinks: analysis.hasExcessiveLinks,
      hasImages: analysis.hasImages,
      contentLength: body.length,
    }).returning();

    res.json({ ...test, analysis });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get past tests
router.get("/inbox-tests", async (req, res) => {
  try {
    const userId = getUserId(req);
    const tests = await db.select().from(inboxPlacementTests)
      .where(eq(inboxPlacementTests.userId, userId))
      .orderBy(desc(inboxPlacementTests.createdAt))
      .limit(20);
    res.json(tests);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// AI COPILOT
// ============================================================

// Get/set business context memory
router.get("/copilot/memory", async (req, res) => {
  try {
    const userId = getUserId(req);
    const memories = await db.select().from(copilotMemories).where(eq(copilotMemories.userId, userId));
    res.json(memories);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/copilot/memory", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { memoryType, content } = req.body;

    // Upsert: delete existing of same type, then insert
    await db.delete(copilotMemories)
      .where(and(eq(copilotMemories.userId, userId), eq(copilotMemories.memoryType, memoryType)));

    const [memory] = await db.insert(copilotMemories).values({
      userId, memoryType, content,
    }).returning();

    res.json(memory);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Generate content
router.post("/copilot/generate", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { taskType, prompt } = req.body;

    // Get business context
    const memories = await db.select().from(copilotMemories).where(eq(copilotMemories.userId, userId));
    const context = memories.map(m => `${m.memoryType}: ${m.content}`).join("\n");

    const result = instantlyEngine.generateCopilotContent(taskType, prompt || "", context);
    const creditsUsed = taskType === "sequence" ? 0.5 : 0.25;

    const [task] = await db.insert(copilotTasks).values({
      userId, taskType, prompt,
      result: JSON.stringify(result),
      creditsUsed, status: "completed",
    }).returning();

    res.json({ task, result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get past tasks
router.get("/copilot/tasks", async (req, res) => {
  try {
    const userId = getUserId(req);
    const tasks = await db.select().from(copilotTasks)
      .where(eq(copilotTasks.userId, userId))
      .orderBy(desc(copilotTasks.createdAt))
      .limit(50);
    res.json(tasks);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// EMAIL TEMPLATES
// ============================================================

router.get("/email-templates", async (req, res) => {
  try {
    const userId = getUserId(req);
    const templates = await db.select().from(emailTemplates)
      .where(sql`${emailTemplates.userId} = ${userId} OR ${emailTemplates.isPublic} = true`)
      .orderBy(desc(emailTemplates.createdAt));
    res.json(templates);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/email-templates", async (req, res) => {
  try {
    const userId = getUserId(req);
    const [template] = await db.insert(emailTemplates).values({ ...req.body, userId }).returning();
    res.json(template);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/email-templates/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    await db.delete(emailTemplates)
      .where(and(eq(emailTemplates.id, req.params.id), eq(emailTemplates.userId, userId)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// INSTANTLY ANALYTICS DASHBOARD
// ============================================================

router.get("/analytics/dashboard", async (req, res) => {
  try {
    const userId = getUserId(req);

    const [accountCount] = await db.select({ count: count() }).from(emailAccounts).where(eq(emailAccounts.userId, userId));
    const [campaignCount] = await db.select({ count: count() }).from(campaigns).where(eq(campaigns.userId, userId));
    const [leadCount] = await db.select({ count: count() }).from(leads).where(eq(leads.userId, userId));

    const activeCampaigns = await db.select().from(campaigns)
      .where(and(eq(campaigns.userId, userId), eq(campaigns.status, "active")));

    const totalSent = activeCampaigns.reduce((s, c) => s + (c.emailsSent || 0), 0);
    const totalOpened = activeCampaigns.reduce((s, c) => s + (c.emailsOpened || 0), 0);
    const totalReplied = activeCampaigns.reduce((s, c) => s + (c.emailsReplied || 0), 0);
    const totalBounced = activeCampaigns.reduce((s, c) => s + (c.emailsBounced || 0), 0);
    const totalOpportunities = activeCampaigns.reduce((s, c) => s + (c.opportunities || 0), 0);

    const warmupAccounts = await db.select().from(emailAccounts)
      .where(and(eq(emailAccounts.userId, userId), eq(emailAccounts.warmupEnabled, true)));
    const avgReputation = warmupAccounts.length > 0
      ? warmupAccounts.reduce((s, a) => s + (a.reputationScore || 0), 0) / warmupAccounts.length
      : 0;

    res.json({
      accounts: accountCount?.count || 0,
      campaigns: campaignCount?.count || 0,
      leads: leadCount?.count || 0,
      emailsSent: totalSent,
      emailsOpened: totalOpened,
      emailsReplied: totalReplied,
      emailsBounced: totalBounced,
      opportunities: totalOpportunities,
      warmupAccounts: warmupAccounts.length,
      avgReputation: avgReputation.toFixed(2),
      openRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0,
      replyRate: totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// PIXEL TRACKING ENDPOINT (PUBLIC — no auth)
// Mount separately in routes.ts as: app.post("/api/pixel/t", ...)
// ============================================================

export async function handlePixelTrack(req: Request, res: Response) {
  try {
    const { pixelId, userId, url, title, referrer, sessionId } = req.body;
    const ip = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "";
    const ua = req.headers["user-agent"] || "";

    // Bot detection
    const botPatterns = /bot|crawl|spider|slurp|baidu|yandex|googlebot/i;
    if (botPatterns.test(ua)) return res.status(200).json({ ok: true });

    // Simulate company resolution (in production: use Clearbit/RB2B)
    const resolution = instantlyEngine.resolveVisitor(ip);

    await db.insert(websiteVisitors).values({
      pixelId, userId, ipAddress: ip, userAgent: ua,
      pageUrl: url, pageTitle: title, referrer,
      country: resolution.country, city: resolution.city,
      companyName: resolution.companyName, companyDomain: resolution.companyDomain,
      companyIndustry: resolution.companyIndustry, companySize: resolution.companySize,
      resolvedEmail: resolution.email, resolvedName: resolution.name,
      resolvedTitle: resolution.title, resolvedLinkedin: resolution.linkedin,
      resolutionStatus: resolution.email ? "resolved" : "unresolved",
    });

    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(200).json({ ok: true }); // Always 200 for pixel
  }
}

export default router;
