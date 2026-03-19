import { Router, Request, Response } from "express";
import * as memory from "./aria-memory";
import { handleDiscoveryMessage, getOnboardingStatus } from "./aria-discovery";
import { handleChat, runAriaCycle, generateBriefing } from "./aria-agent";
import { getAvailableConnectors } from "./aria-connectors";

const router = Router();

router.get("/status", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const status = await getOnboardingStatus(userId);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const stats = await memory.getDashboardStats(userId);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/discovery", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });
    const reply = await handleDiscoveryMessage(userId, message);
    const status = await getOnboardingStatus(userId);
    res.json({ reply, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/discovery/history", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const history = await memory.getDiscoveryHistory(userId);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });
    const reply = await handleChat(userId, message);
    const stats = await memory.getDashboardStats(userId);
    res.json({ reply, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/chat/history", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await memory.getChatHistory(userId, limit);
    res.json(history.reverse());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/actions", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const status = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const actions = await memory.getActions(userId, limit, status || undefined);
    res.json(actions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/actions/pending", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const actions = await memory.getPendingActions(userId);
    res.json(actions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/actions/:id/approve", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const action = await memory.approveAction(parseInt(req.params.id), userId);
    if (!action) return res.status(404).json({ error: "Action not found" });
    res.json(action);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/actions/:id/reject", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const action = await memory.rejectAction(parseInt(req.params.id), userId);
    if (!action) return res.status(404).json({ error: "Action not found" });
    res.json(action);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/leads", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const leads = await memory.getLeads(userId);
    res.json(leads);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/emails", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const emails = await memory.getEmails(userId);
    res.json(emails);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/meetings", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const meetings = await memory.getMeetings(userId);
    res.json(meetings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/connectors", async (req: Request, res: Response) => {
  try {
    const connectors = getAvailableConnectors();
    res.json(connectors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/run-cycle", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const result = await runAriaCycle(userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/briefing", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const content = await generateBriefing(userId);
    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/briefings", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const briefings = await memory.getBriefings(userId);
    res.json(briefings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/settings", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { autonomy, briefing_time, briefing_via, timezone } = req.body;
    const updates: any = {};
    if (autonomy) updates.autonomy = autonomy;
    if (briefing_time) updates.briefing_time = briefing_time;
    if (briefing_via) updates.briefing_via = briefing_via;
    if (timezone) updates.timezone = timezone;
    const biz = await memory.upsertBusiness(userId, updates);
    res.json(biz);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/sync-leads", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { pool } = await import("./db");
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO aria_leads (user_id, name, email, phone, company, source, status, notes)
        SELECT 
          l.user_id, l.name, l.email, l.phone, l.company, 'platform-sync',
          CASE 
            WHEN l.status = 'converted' THEN 'converted'
            WHEN l.status = 'contacted' THEN 'contacted'
            WHEN l.score >= 60 THEN 'hot'
            WHEN l.score >= 30 THEN 'warm'
            ELSE 'new'
          END,
          l.notes
        FROM leads l
        WHERE l.user_id = $1
          AND l.email IS NOT NULL AND l.email != ''
          AND NOT EXISTS (SELECT 1 FROM aria_leads al WHERE al.email = l.email AND al.user_id = l.user_id)
        ORDER BY l.created_at DESC LIMIT 200
      `, [userId]);
      res.json({ synced: result.rowCount });
    } finally {
      client.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/actions/approve-all", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { pool } = await import("./db");
    const client = await pool.connect();
    try {
      const result = await client.query(
        "UPDATE aria_actions SET status = 'approved', approved_at = NOW() WHERE user_id = $1 AND status = 'pending' RETURNING id",
        [userId]
      );
      res.json({ approved: result.rowCount, ids: result.rows.map((r: any) => r.id) });
    } finally {
      client.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
