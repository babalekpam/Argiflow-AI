import { Router, Request, Response } from "express";
import * as memory from "./aria-memory";
import { handleDiscoveryMessage, getOnboardingStatus } from "./aria-discovery";
import { handleChat, runAriaCycle, generateBriefing } from "./aria-agent";
import { getAvailableConnectors, sendEmailViaSES } from "./aria-connectors";
import { getHighIntentVisitors, getRecentVisitorActivity } from "./visitor-intelligence";

const router = Router();

async function executeApprovedAction(userId: string, action: any): Promise<{ executed: boolean; result?: string; error?: string }> {
  if (!action.category || action.category !== "email") {
    await updateActionStatus(action.id, userId, "completed", `Action approved and noted`);
    return { executed: true, result: "Action completed" };
  }

  const biz = await memory.getBusiness(userId);
  let toEmail = "";
  let subject = "";
  let body = "";

  let toolResult = action.tool_result;
  if (typeof toolResult === "string") {
    try { toolResult = JSON.parse(toolResult); } catch { toolResult = null; }
  }
  if (toolResult && typeof toolResult === "object") {
    toEmail = toolResult.to || toolResult.to_email || "";
    subject = toolResult.subject || "";
    body = toolResult.body || "";
  }

  if (!toEmail && action.description) {
    const emailMatch = action.description.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) toEmail = emailMatch[0];
  }

  if (!toEmail) {
    await updateActionStatus(action.id, userId, "completed", "Approved (no email target specified)");
    return { executed: true, result: "Approved but no email target found in action" };
  }

  if (!subject) subject = action.title || `Follow-up from ${biz?.name || "ArgiFlow"}`;
  if (!body) body = action.description || action.output_preview || action.title;

  try {
    const emailResult = await sendEmailViaSES({
      to: toEmail,
      subject,
      body: body.replace(/\n/g, "<br>"),
      fromName: biz?.owner_name || biz?.name || "ArgiFlow",
      fromEmail: biz?.owner_email || undefined,
    });

    if (emailResult.success) {
      await memory.createEmail(userId, {
        action_id: action.id,
        to_email: toEmail,
        subject,
        body,
        status: "sent",
      });
      await updateActionStatus(action.id, userId, "completed", `Email sent to ${toEmail}`);
      return { executed: true, result: `Email sent to ${toEmail}` };
    } else {
      await updateActionStatus(action.id, userId, "completed", `Email failed: ${emailResult.error}`);
      return { executed: false, error: emailResult.error };
    }
  } catch (err: any) {
    return { executed: false, error: err.message };
  }
}

async function updateActionStatus(actionId: number, userId: string, status: string, preview: string) {
  const { pool } = await import("./db");
  const client = await pool.connect();
  try {
    await client.query(
      "UPDATE aria_actions SET status = $1, output_preview = $2 WHERE id = $3 AND user_id = $4",
      [status, preview, actionId, userId]
    );
  } finally {
    client.release();
  }
}

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

    const execResult = await executeApprovedAction(userId, action);
    res.json({ ...action, execResult });
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
    const pending = await memory.getPendingActions(userId);
    const results: any[] = [];

    for (const action of pending) {
      const approved = await memory.approveAction(action.id, userId);
      if (approved) {
        const execResult = await executeApprovedAction(userId, approved);
        results.push({ id: action.id, title: action.title, ...execResult });
      }
    }

    res.json({ approved: results.length, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/visitor-intelligence", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const hours = Math.min(Math.max(parseInt(req.query.hours as string) || 48, 1), 168);
    const highIntent = await getHighIntentVisitors(userId, hours);
    const all = await getRecentVisitorActivity(userId, hours, 30);

    res.json({
      high_intent: highIntent.map(a => ({
        visitor_id: a.visitor.visitor_id,
        identified: a.visitor.identified,
        name: a.visitor.name,
        email: a.visitor.email,
        company: a.visitor.company,
        lead_id: a.visitor.lead_id,
        lead_status: a.visitor.lead_status,
        lead_score: a.visitor.lead_score,
        match_method: a.visitor.match_method,
        device: a.visitor.device,
        browser: a.visitor.browser,
        visit_count: a.visitor.visit_count,
        pages: a.pages_viewed.map(p => p.page),
        clicks: a.clicks.map(c => ({ text: c.element_text, href: c.href })),
        intent_score: a.intent_score,
        intent_signals: a.intent_signals,
        session_duration: a.session_duration,
        entry_page: a.entry_page,
        referrer: a.referrer,
        utm_source: a.utm_source,
        utm_campaign: a.utm_campaign,
      })),
      total_visitors: all.length,
      identified_count: all.filter(a => a.visitor.identified).length,
      anonymous_count: all.filter(a => !a.visitor.identified).length,
      avg_intent_score: all.length > 0 ? Math.round(all.reduce((s, a) => s + a.intent_score, 0) / all.length) : 0,
    });
  } catch (err: any) {
    console.error("[Aria] Visitor intelligence error:", err.message);
    res.status(500).json({ error: "Failed to load visitor intelligence" });
  }
});

export default router;
