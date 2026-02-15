// ============================================================
// ARGILETTE INSTANTLY FEATURES — API ROUTES
// Drop this into: server/instantly-routes.ts
// Then import and mount in server/routes.ts
// ============================================================

import { Router, type Request, type Response } from "express";
import { eq, and, desc, sql, count, avg, sum, gte, lte } from "drizzle-orm";
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
import { leads } from "../shared/schema";
import { instantlyEngine } from "./instantly-engine";

const router = Router();

// Middleware: require authenticated user
function requireUser(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.use(requireUser);

// Helper to get userId from session
function getUserId(req: Request): string {
  return (req.user as any).id;
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

    const sequences = await db.select().from(campaignSequences)
      .where(eq(campaignSequences.campaignId, campaign.id))
      .orderBy(campaignSequences.stepNumber);

    const sendingAccounts = await db.select().from(campaignSendingAccounts)
      .where(eq(campaignSendingAccounts.campaignId, campaign.id));

    const leadCount = await db.select({ count: count() }).from(campaignLeads)
      .where(eq(campaignLeads.campaignId, campaign.id));

    res.json({ ...campaign, sequences, sendingAccounts, leadCount: leadCount[0]?.count || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Update campaign
router.put("/campaigns/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const [updated] = await db.update(campaigns)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(campaigns.id, req.params.id), eq(campaigns.userId, userId)))
      .returning();
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Delete campaign
router.delete("/campaigns/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const id = req.params.id;
    await db.delete(campaignLeads).where(eq(campaignLeads.campaignId, id));
    await db.delete(campaignSendingAccounts).where(eq(campaignSendingAccounts.campaignId, id));
    await db.delete(campaignSequences).where(eq(campaignSequences.campaignId, id));
    await db.delete(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Add sequence step
router.post("/campaigns/:id/sequences", async (req, res) => {
  try {
    const [seq] = await db.insert(campaignSequences)
      .values({ ...req.body, campaignId: req.params.id }).returning();
    res.json(seq);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Update sequence step
router.put("/campaigns/:campaignId/sequences/:seqId", async (req, res) => {
  try {
    const [updated] = await db.update(campaignSequences)
      .set(req.body)
      .where(eq(campaignSequences.id, req.params.seqId)).returning();
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Delete sequence step
router.delete("/campaigns/:campaignId/sequences/:seqId", async (req, res) => {
  try {
    await db.delete(campaignSequences).where(eq(campaignSequences.id, req.params.seqId));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Assign sending accounts
router.post("/campaigns/:id/accounts", async (req, res) => {
  try {
    const { accountIds } = req.body;
    const campaignId = req.params.id;
    // Remove existing
    await db.delete(campaignSendingAccounts).where(eq(campaignSendingAccounts.campaignId, campaignId));
    // Add new
    if (accountIds?.length) {
      await db.insert(campaignSendingAccounts).values(
        accountIds.map((accountId: string) => ({ campaignId, accountId }))
      );
    }
    res.json({ success: true, count: accountIds?.length || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Add leads to campaign
router.post("/campaigns/:id/leads", async (req, res) => {
  try {
    const { leadIds } = req.body;
    const campaignId = req.params.id;
    if (leadIds?.length) {
      await db.insert(campaignLeads).values(
        leadIds.map((leadId: string) => ({ campaignId, leadId }))
      );
      await db.update(campaigns).set({
        totalLeads: sql`${campaigns.totalLeads} + ${leadIds.length}`,
      }).where(eq(campaigns.id, campaignId));
    }
    res.json({ success: true, added: leadIds?.length || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Change campaign status (launch/pause/resume/stop)
router.post("/campaigns/:id/status", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { status } = req.body;
    const [updated] = await db.update(campaigns)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(campaigns.id, req.params.id), eq(campaigns.userId, userId)))
      .returning();
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Campaign analytics
router.get("/campaigns/:id/analytics", async (req, res) => {
  try {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, req.params.id));
    if (!campaign) return res.status(404).json({ error: "Not found" });

    const statusBreakdown = await db.select({
      status: campaignLeads.status,
      count: count(),
    }).from(campaignLeads)
      .where(eq(campaignLeads.campaignId, campaign.id))
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
        open: campaign.emailsSent > 0 ? ((campaign.emailsOpened / campaign.emailsSent) * 100).toFixed(1) : 0,
        reply: campaign.emailsSent > 0 ? ((campaign.emailsReplied / campaign.emailsSent) * 100).toFixed(1) : 0,
        bounce: campaign.emailsSent > 0 ? ((campaign.emailsBounced / campaign.emailsSent) * 100).toFixed(1) : 0,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Preview email with spintax + variables
router.post("/campaigns/:id/preview", async (req, res) => {
  try {
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
    const companies = [...new Set(allVisitors.filter(v => v.companyName).map(v => v.companyName))];

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

router.get("/instantly/dashboard", async (req, res) => {
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
