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

    const recentTasks = await db.select().from(agentTasks)
      .where(and(eq(agentTasks.userId, userId), eq(agentTasks.agentType, "outreach_agent")))
      .orderBy(desc(agentTasks.createdAt))
      .limit(10);

    const discovered = recentTasks.filter(t => t.taskType === "discovery").length;
    const sent = recentTasks.filter(t => t.taskType === "send_batch" || t.taskType === "send_email").length;
    const replies = recentTasks.filter(t => t.taskType === "reply_received" || t.taskType === "reply_handled").length;

    res.json({
      success: true,
      message: "Full cycle completed: discover > enroll > send > monitor",
      results: { discovered, sent, replies },
    });
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

    const defaultSettings: any = {
      discoveryEnabled: true,
      discoveryQueries: ["solo medical practice needs billing help", "healthcare practice looking for RCM"],
      discoverySource: "web",
      dailyProspectLimit: 10,
      autoCampaignId: null,
      autoEnrollEnabled: false,
      autoReplyEnabled: true,
      aiPersonality: "professional",
      autoBookEnabled: false,
      calendarLink: "",
      meetingDuration: 15,
      timezone: "America/Chicago",
      maxEmailsPerDay: 50,
      maxFollowUps: 3,
      blacklistDomains: [],
      pauseOnNegative: true,
    };

    if (!config) {
      const [created] = await db.insert(agentConfigs).values({
        userId,
        agentType: "outreach_agent",
        enabled: false,
        agentSettings: JSON.stringify(defaultSettings),
        runFrequency: "continuous",
      }).returning();

      return res.json(defaultSettings);
    }

    let parsedSettings: any = {};
    try { parsedSettings = JSON.parse(config.agentSettings || "{}"); } catch {}

    res.json({ ...defaultSettings, ...parsedSettings });
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

    const mapped = tasks.map(t => ({
      id: t.id,
      type: t.taskType,
      message: t.description || t.taskType,
      details: t.result || null,
      status: t.status,
      timestamp: t.createdAt,
    }));

    res.json(mapped);
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

    const allTasks = await db.select().from(agentTasks)
      .where(and(eq(agentTasks.userId, userId), eq(agentTasks.agentType, "outreach_agent")))
      .orderBy(desc(agentTasks.createdAt))
      .limit(200);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 86400000);

    const todayTasks = allTasks.filter(t => t.createdAt && new Date(t.createdAt) >= today);

    const totalDiscovered = allTasks.filter(t => t.taskType === "discovery").length;
    const discoveredToday = todayTasks.filter(t => t.taskType === "discovery").length;
    const totalSent = allTasks.filter(t => t.taskType === "send_batch" || t.taskType === "send_email").length;
    const sentToday = todayTasks.filter(t => t.taskType === "send_batch" || t.taskType === "send_email").length;
    const totalReplies = allTasks.filter(t => t.taskType === "reply_received" || t.taskType === "reply_handled" || t.taskType === "interested_reply").length;
    const interested = allTasks.filter(t => t.taskType === "interested_reply" || t.taskType === "meeting_detected").length;
    const meetingsBooked = allTasks.filter(t => t.taskType === "meeting_booked" || t.taskType === "meeting_detected").length;
    const bookedThisWeek = allTasks.filter(t => (t.taskType === "meeting_booked" || t.taskType === "meeting_detected") && t.createdAt && new Date(t.createdAt) >= weekAgo).length;

    let parsedSettings: any = {};
    try { parsedSettings = JSON.parse(config?.agentSettings || "{}"); } catch {}

    const pipelineStep = config?.isRunning ? 0 : -1;

    res.json({
      isRunning: config?.isRunning || false,
      lastRun: config?.lastRun,
      stats: {
        totalDiscovered,
        discoveredToday,
        totalSent,
        sentToday,
        totalReplies,
        interested,
        meetingsBooked,
        bookedThisWeek,
      },
      pipeline: config?.isRunning ? { currentStep: pipelineStep } : null,
      settings: parsedSettings,
      recentActivity: allTasks.slice(0, 10),
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
