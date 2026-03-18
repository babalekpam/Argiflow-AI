import { Router, Request, Response } from "express";
import { db } from "./db";
import { eq, desc, and, gte } from "drizzle-orm";
import { businessManager, managerDecisions, managerDailyReports } from "@shared/business-manager-schema";
import { runManagerCycle, generateDailyReport } from "./business-manager";

const router = Router();

router.get("/config", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const [config] = await db.select().from(businessManager).where(eq(businessManager.userId, userId));
    res.json(config || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/config", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { agentName, businessContext, goals, personality, autonomyLevel, activeCapabilities, workingHours, dailyBudgetCredits } = req.body;

    const existing = await db.select().from(businessManager).where(eq(businessManager.userId, userId));

    if (existing.length > 0) {
      const [updated] = await db.update(businessManager).set({
        agentName: agentName || existing[0].agentName,
        businessContext: businessContext !== undefined ? businessContext : existing[0].businessContext,
        goals: goals !== undefined ? goals : existing[0].goals,
        personality: personality || existing[0].personality,
        autonomyLevel: autonomyLevel || existing[0].autonomyLevel,
        activeCapabilities: activeCapabilities || existing[0].activeCapabilities,
        workingHours: workingHours || existing[0].workingHours,
        dailyBudgetCredits: dailyBudgetCredits !== undefined ? dailyBudgetCredits : existing[0].dailyBudgetCredits,
        updatedAt: new Date(),
      }).where(eq(businessManager.userId, userId)).returning();
      return res.json(updated);
    }

    const [created] = await db.insert(businessManager).values({
      userId,
      agentName: agentName || "AI Business Manager",
      businessContext,
      goals: goals || ["Generate qualified leads", "Close more deals", "Grow revenue"],
      personality: personality || "professional",
      autonomyLevel: autonomyLevel || "moderate",
      activeCapabilities: activeCapabilities || ["lead_generation", "email_outreach", "follow_ups", "pipeline_management", "marketing", "analytics_review", "inbox_management"],
      workingHours: workingHours || "24/7",
      dailyBudgetCredits: dailyBudgetCredits || 500,
    }).returning();
    res.json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/toggle", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const [config] = await db.select().from(businessManager).where(eq(businessManager.userId, userId));

    if (!config) {
      return res.status(404).json({ error: "Configure the Business Manager first" });
    }

    const newEnabled = !config.enabled;
    const [updated] = await db.update(businessManager).set({
      enabled: newEnabled,
      status: newEnabled ? "idle" : "paused",
      currentThought: newEnabled ? "Starting up — will analyze business on next cycle..." : "Paused by owner",
      nextRunAt: newEnabled ? new Date(Date.now() + 60000) : null,
      updatedAt: new Date(),
    }).where(eq(businessManager.userId, userId)).returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/run-now", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const result = await runManagerCycle(userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/decisions", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const category = req.query.category as string;

    let query = db.select().from(managerDecisions).where(eq(managerDecisions.userId, userId));
    if (category) {
      query = db.select().from(managerDecisions).where(
        and(eq(managerDecisions.userId, userId), eq(managerDecisions.category, category))
      );
    }

    const decisions = await query.orderBy(desc(managerDecisions.createdAt)).limit(limit);
    res.json(decisions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/reports", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const reports = await db.select().from(managerDailyReports)
      .where(eq(managerDailyReports.userId, userId))
      .orderBy(desc(managerDailyReports.createdAt))
      .limit(30);
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/report", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const report = await generateDailyReport(userId);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const [config] = await db.select().from(businessManager).where(eq(businessManager.userId, userId));
    if (!config) return res.json(null);

    const today = new Date().toISOString().split("T")[0];
    const todayDecisions = await db.select().from(managerDecisions).where(
      and(
        eq(managerDecisions.userId, userId),
        gte(managerDecisions.createdAt, new Date(today + "T00:00:00Z"))
      )
    );

    res.json({
      enabled: config.enabled,
      status: config.status,
      currentThought: config.currentThought,
      totalDecisions: config.totalDecisions,
      totalActions: config.totalActions,
      todayDecisions: todayDecisions.length,
      todayActions: todayDecisions.reduce((acc: number, d: any) => acc + (d.actionsTaken?.length || 0), 0),
      lastRunAt: config.lastRunAt,
      nextRunAt: config.nextRunAt,
      creditsUsedToday: config.creditsUsedToday,
      dailyBudgetCredits: config.dailyBudgetCredits,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
