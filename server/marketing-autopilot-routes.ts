import { Router, type Request, type Response } from "express";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { marketingAutopilot, autopilotActions } from "@shared/schema";
import {
  studyBusiness,
  generateMarketingPlan,
  executeAutopilotCycle,
} from "./marketing-autopilot";
import { z } from "zod";

const router = Router();

router.get("/config", async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let [config] = await db
      .select()
      .from(marketingAutopilot)
      .where(eq(marketingAutopilot.userId, userId));

    if (!config) {
      [config] = await db
        .insert(marketingAutopilot)
        .values({ userId, enabled: false })
        .returning();
    }

    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load autopilot config" });
  }
});

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  frequency: z.enum(["hourly", "twice_daily", "daily", "weekly"]).optional(),
  activeChannels: z.string().optional(),
});

router.patch("/config", async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const updates = updateSchema.parse(req.body);

    const setValues: any = { updatedAt: new Date() };
    if (updates.enabled !== undefined) setValues.enabled = updates.enabled;
    if (updates.frequency) setValues.frequency = updates.frequency;
    if (updates.activeChannels) setValues.activeChannels = updates.activeChannels;

    if (updates.enabled === true) {
      setValues.nextRunAt = new Date();
    }

    const [config] = await db
      .update(marketingAutopilot)
      .set(setValues)
      .where(eq(marketingAutopilot.userId, userId))
      .returning();

    if (!config) {
      const [newConfig] = await db
        .insert(marketingAutopilot)
        .values({ userId, ...setValues })
        .returning();
      return res.json(newConfig);
    }

    res.json(config);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map((e) => e.message).join(", ") });
    }
    res.status(500).json({ error: "Failed to update config" });
  }
});

router.post("/study-business", async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let [config] = await db
      .select()
      .from(marketingAutopilot)
      .where(eq(marketingAutopilot.userId, userId));
    if (!config) {
      await db.insert(marketingAutopilot).values({ userId, enabled: false });
    }

    const profile = await studyBusiness(userId);
    res.json({ success: true, profile });
  } catch (err: any) {
    console.error("[Autopilot] Study business error:", err.message);
    res.status(500).json({ error: "Failed to study business. Please try again." });
  }
});

router.post("/generate-plan", async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const plan = await generateMarketingPlan(userId);
    res.json({ success: true, plan });
  } catch (err: any) {
    console.error("[Autopilot] Generate plan error:", err.message);
    res.status(500).json({ error: "Failed to generate marketing plan. Please try again." });
  }
});

router.post("/run-cycle", async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await executeAutopilotCycle(userId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[Autopilot] Run cycle error:", err.message);
    res.status(500).json({ error: "Failed to run autopilot cycle. Please try again." });
  }
});

router.get("/actions", async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const actions = await db
      .select()
      .from(autopilotActions)
      .where(eq(autopilotActions.userId, userId))
      .orderBy(desc(autopilotActions.createdAt))
      .limit(limit);

    res.json(actions);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load actions" });
  }
});

router.get("/actions/stats", async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const [config] = await db
      .select()
      .from(marketingAutopilot)
      .where(eq(marketingAutopilot.userId, userId));

    res.json({
      totalActions: config?.totalActions || 0,
      totalEmailsSent: config?.totalEmailsSent || 0,
      totalLeadsGenerated: config?.totalLeadsGenerated || 0,
      totalCampaignsCreated: config?.totalCampaignsCreated || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load stats" });
  }
});

export default router;
