// ============================================================
// ARGILETTE OUTREACH AGENT — API ROUTES
// Drop this into: server/outreach-agent-routes.ts
// Mount in routes.ts: app.use("/api/outreach-agent", outreachAgentRoutes);
// ============================================================

import { Router, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import { agentConfigs, agentTasks } from "../shared/schema";
import { campaigns, emailAccounts } from "../shared/instantly-schema";
import { outreachAgent } from "./outreach-agent";

const router = Router();

function requireUser(req: Request, res: Response, next: Function) {
  if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

router.use(requireUser);

function getUserId(req: Request): string {
  return req.session.userId!;
}

// ── START / STOP AGENT ──────────────────────────────────────

router.post("/start", async (req, res) => {
  try {
    const userId = getUserId(req);
    await outreachAgent.start(userId);

    // Update config status
    await db.update(agentConfigs).set({ isRunning: true, lastRun: new Date() })
      .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, "outreach_agent")));

    res.json({ status: "running", message: "AI Outreach Agent started. It will discover prospects, send emails, handle replies, and book meetings autonomously." });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/stop", async (req, res) => {
  try {
    const userId = getUserId(req);
    await outreachAgent.stop(userId);

    await db.update(agentConfigs).set({ isRunning: false })
      .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, "outreach_agent")));

    res.json({ status: "stopped", message: "AI Outreach Agent stopped." });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── RUN SINGLE CYCLE (MANUAL TRIGGER) ───────────────────────

router.post("/run-cycle", async (req, res) => {
  try {
    const userId = getUserId(req);
    await outreachAgent.runFullCycle(userId);
    res.json({ success: true, message: "Full cycle completed: discover → enroll → send → monitor" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET / UPDATE AGENT CONFIG ───────────────────────────────

router.get("/config", async (req, res) => {
  try {
    const userId = getUserId(req);
    const [config] = await db.select().from(agentConfigs)
      .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, "outreach_agent")));

    if (!config) {
      // Create default config
      const defaultSettings = {
        userId,
        discoveryEnabled: true,
        discoveryQueries: ["solo medical practice needs billing help", "healthcare practice looking for RCM"],
        discoverySource: "web",
        dailyProspectLimit: 10,
        autoCampaignId: null,
        autoEnrollEnabled: false,
        autoReplyEnabled: true,
        aiPersonality: "professional",
        autoBookEnabled: true,
        calendarLink: "",
        meetingDuration: 15,
        availableSlots: JSON.stringify({
          monday: { start: "09:00", end: "17:00" },
          tuesday: { start: "09:00", end: "17:00" },
          wednesday: { start: "09:00", end: "17:00" },
          thursday: { start: "09:00", end: "17:00" },
          friday: { start: "09:00", end: "17:00" },
        }),
        timezone: "America/Chicago",
        maxEmailsPerDay: 50,
        maxFollowUps: 3,
        blacklistDomains: [],
        pauseOnNegative: true,
      };

      const [created] = await db.insert(agentConfigs).values({
        userId,
        agentType: "outreach_agent",
        enabled: false,
        agentSettings: JSON.stringify(defaultSettings),
        runFrequency: "continuous",
      }).returning();

      return res.json({ ...created, parsedSettings: defaultSettings });
    }

    let parsedSettings = {};
    try { parsedSettings = JSON.parse(config.agentSettings || "{}"); } catch {}

    res.json({ ...config, parsedSettings });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/config", async (req, res) => {
  try {
    const userId = getUserId(req);
    const settings = req.body;

    const [existing] = await db.select().from(agentConfigs)
      .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, "outreach_agent")));

    if (existing) {
      const [updated] = await db.update(agentConfigs).set({
        agentSettings: JSON.stringify(settings),
        enabled: true,
      }).where(eq(agentConfigs.id, existing.id)).returning();
      return res.json(updated);
    }

    const [created] = await db.insert(agentConfigs).values({
      userId,
      agentType: "outreach_agent",
      enabled: true,
      agentSettings: JSON.stringify(settings),
    }).returning();

    res.json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── ACTIVITY LOG ────────────────────────────────────────────

router.get("/activity", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { limit = "50" } = req.query;

    const tasks = await db.select().from(agentTasks)
      .where(and(eq(agentTasks.userId, userId), eq(agentTasks.agentType, "outreach_agent")))
      .orderBy(desc(agentTasks.createdAt))
      .limit(parseInt(limit as string));

    res.json(tasks);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── AGENT STATUS / DASHBOARD ────────────────────────────────

router.get("/status", async (req, res) => {
  try {
    const userId = getUserId(req);
    const [config] = await db.select().from(agentConfigs)
      .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, "outreach_agent")));

    // Recent activity summary
    const recentTasks = await db.select().from(agentTasks)
      .where(and(eq(agentTasks.userId, userId), eq(agentTasks.agentType, "outreach_agent")))
      .orderBy(desc(agentTasks.createdAt))
      .limit(10);

    // Count by task type
    const taskCounts: Record<string, number> = {};
    for (const task of recentTasks) {
      taskCounts[task.taskType] = (taskCounts[task.taskType] || 0) + 1;
    }

    // Active campaigns
    const activeCampaigns = await db.select().from(campaigns)
      .where(and(eq(campaigns.userId, userId), eq(campaigns.status, "active")));

    // Connected accounts
    const activeAccounts = await db.select().from(emailAccounts)
      .where(and(eq(emailAccounts.userId, userId), eq(emailAccounts.isActive, true)));

    let parsedSettings: any = {};
    try { parsedSettings = JSON.parse(config?.agentSettings || "{}"); } catch {}

    res.json({
      isRunning: config?.isRunning || false,
      lastRun: config?.lastRun,
      healthScore: config?.healthScore || 100,
      totalLeadsFound: config?.totalLeadsFound || 0,
      totalDealsCompleted: config?.totalDealsCompleted || 0,
      settings: parsedSettings,
      activeCampaigns: activeCampaigns.length,
      connectedAccounts: activeAccounts.length,
      recentActivity: recentTasks,
      activitySummary: taskCounts,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── LINK CAMPAIGN TO AGENT ──────────────────────────────────

router.post("/link-campaign", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { campaignId } = req.body;

    const [config] = await db.select().from(agentConfigs)
      .where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, "outreach_agent")));

    if (!config) return res.status(404).json({ error: "Agent not configured. GET /config first." });

    let settings: any = {};
    try { settings = JSON.parse(config.agentSettings || "{}"); } catch {}
    settings.autoCampaignId = campaignId;
    settings.autoEnrollEnabled = true;

    await db.update(agentConfigs).set({
      agentSettings: JSON.stringify(settings),
    }).where(eq(agentConfigs.id, config.id));

    res.json({ success: true, message: `Campaign ${campaignId} linked. New prospects will auto-enroll.` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
