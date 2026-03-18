import { pool } from "./db";

export interface AriaBusiness {
  id: number;
  user_id: string;
  name: string | null;
  type: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  location: string | null;
  website: string | null;
  main_service: string | null;
  price_range: string | null;
  avg_job_value: number | null;
  customer_type: string | null;
  service_area: string | null;
  monthly_revenue: number;
  active_leads: number;
  overdue_invoices: number;
  autonomy: string;
  briefing_time: string;
  briefing_via: string;
  timezone: string;
  onboarded: boolean;
  onboard_score: number;
  status: string;
  connected_tools: any[];
  created_at: Date;
  updated_at: Date;
}

export interface AriaLead {
  id: number;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: string;
  last_contact: Date | null;
  next_followup: Date | null;
  notes: string | null;
  deal_value: number | null;
  created_at: Date;
}

export interface AriaAction {
  id: number;
  user_id: string;
  category: string;
  title: string;
  description: string | null;
  tool_used: string | null;
  tool_result: any;
  output_preview: string | null;
  lead_id: number | null;
  status: string;
  approved_at: Date | null;
  created_at: Date;
}

async function q(text: string, params: any[] = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getBusiness(userId: string): Promise<AriaBusiness | null> {
  const rows = await q("SELECT * FROM aria_business WHERE user_id = $1", [userId]);
  return rows[0] || null;
}

export async function upsertBusiness(userId: string, data: Partial<AriaBusiness>): Promise<AriaBusiness> {
  const existing = await getBusiness(userId);
  if (existing) {
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const [key, val] of Object.entries(data)) {
      if (key === "id" || key === "user_id" || key === "created_at") continue;
      sets.push(`${key} = $${idx}`);
      vals.push(val);
      idx++;
    }
    sets.push(`updated_at = NOW()`);
    vals.push(userId);
    const rows = await q(`UPDATE aria_business SET ${sets.join(", ")} WHERE user_id = $${idx} RETURNING *`, vals);
    return rows[0];
  }
  const cols = ["user_id", ...Object.keys(data).filter(k => k !== "id" && k !== "user_id" && k !== "created_at")];
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const values = [userId, ...cols.slice(1).map(k => (data as any)[k])];
  const rows = await q(`INSERT INTO aria_business (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`, values);
  return rows[0];
}

export async function getDiscoveryHistory(userId: string): Promise<Array<{ role: string; content: string }>> {
  return await q("SELECT role, content FROM aria_discovery WHERE user_id = $1 ORDER BY created_at ASC", [userId]);
}

export async function addDiscoveryMessage(userId: string, role: string, content: string) {
  await q("INSERT INTO aria_discovery (user_id, role, content) VALUES ($1, $2, $3)", [userId, role, content]);
}

export async function getChatHistory(userId: string, limit = 50): Promise<Array<{ id: number; role: string; content: string; created_at: Date }>> {
  return await q("SELECT id, role, content, created_at FROM aria_chat WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2", [userId, limit]);
}

export async function addChatMessage(userId: string, role: string, content: string) {
  const rows = await q("INSERT INTO aria_chat (user_id, role, content) VALUES ($1, $2, $3) RETURNING *", [userId, role, content]);
  return rows[0];
}

export async function getLeads(userId: string, limit = 50): Promise<AriaLead[]> {
  return await q("SELECT * FROM aria_leads WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2", [userId, limit]);
}

export async function getLeadsDueFollowup(userId: string): Promise<AriaLead[]> {
  return await q("SELECT * FROM aria_leads WHERE user_id = $1 AND next_followup <= NOW() AND status NOT IN ('closed', 'converted') ORDER BY next_followup ASC", [userId]);
}

export async function upsertLead(userId: string, data: Partial<AriaLead>): Promise<AriaLead> {
  if (data.id) {
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    for (const [key, val] of Object.entries(data)) {
      if (key === "id" || key === "user_id" || key === "created_at") continue;
      sets.push(`${key} = $${idx}`);
      vals.push(val);
      idx++;
    }
    sets.push(`updated_at = NOW()`);
    vals.push(data.id);
    const rows = await q(`UPDATE aria_leads SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`, vals);
    return rows[0];
  }
  const rows = await q(
    "INSERT INTO aria_leads (user_id, name, email, phone, company, source, status, notes, deal_value) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
    [userId, data.name, data.email || null, data.phone || null, data.company || null, data.source || "aria", data.status || "new", data.notes || null, data.deal_value || null]
  );
  return rows[0];
}

export async function getActions(userId: string, limit = 50, statusFilter?: string): Promise<AriaAction[]> {
  if (statusFilter) {
    return await q("SELECT * FROM aria_actions WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3", [userId, statusFilter, limit]);
  }
  return await q("SELECT * FROM aria_actions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2", [userId, limit]);
}

export async function getPendingActions(userId: string): Promise<AriaAction[]> {
  return await q("SELECT * FROM aria_actions WHERE user_id = $1 AND status = 'pending' ORDER BY created_at ASC", [userId]);
}

export async function createAction(userId: string, data: { category: string; title: string; description?: string; tool_used?: string; tool_result?: any; output_preview?: string; lead_id?: number; status?: string }): Promise<AriaAction> {
  const rows = await q(
    "INSERT INTO aria_actions (user_id, category, title, description, tool_used, tool_result, output_preview, lead_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
    [userId, data.category, data.title, data.description || null, data.tool_used || null, data.tool_result ? JSON.stringify(data.tool_result) : null, data.output_preview || null, data.lead_id || null, data.status || "completed"]
  );
  return rows[0];
}

export async function approveAction(actionId: number, userId: string): Promise<AriaAction | null> {
  const rows = await q("UPDATE aria_actions SET status = 'approved', approved_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *", [actionId, userId]);
  return rows[0] || null;
}

export async function rejectAction(actionId: number, userId: string): Promise<AriaAction | null> {
  const rows = await q("UPDATE aria_actions SET status = 'rejected' WHERE id = $1 AND user_id = $2 RETURNING *", [actionId, userId]);
  return rows[0] || null;
}

export async function createEmail(userId: string, data: { action_id?: number; lead_id?: number; to_email: string; to_name?: string; subject: string; body: string; status?: string }) {
  const rows = await q(
    "INSERT INTO aria_emails (user_id, action_id, lead_id, to_email, to_name, subject, body, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
    [userId, data.action_id || null, data.lead_id || null, data.to_email, data.to_name || null, data.subject, data.body, data.status || "draft"]
  );
  return rows[0];
}

export async function markEmailSent(emailId: number) {
  await q("UPDATE aria_emails SET status = 'sent', sent_at = NOW() WHERE id = $1", [emailId]);
}

export async function getEmails(userId: string, limit = 50) {
  return await q("SELECT * FROM aria_emails WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2", [userId, limit]);
}

export async function createMeeting(userId: string, data: { lead_id?: number; title: string; start_time: string; end_time: string; attendee_email?: string; attendee_name?: string; notes?: string }) {
  const rows = await q(
    "INSERT INTO aria_meetings (user_id, lead_id, title, start_time, end_time, attendee_email, attendee_name, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
    [userId, data.lead_id || null, data.title, data.start_time, data.end_time, data.attendee_email || null, data.attendee_name || null, data.notes || null]
  );
  return rows[0];
}

export async function getMeetings(userId: string, limit = 20) {
  return await q("SELECT * FROM aria_meetings WHERE user_id = $1 AND start_time >= NOW() ORDER BY start_time ASC LIMIT $2", [userId, limit]);
}

export async function createSnapshot(userId: string) {
  const biz = await getBusiness(userId);
  const leads = await getLeads(userId, 9999);
  const emails = await q("SELECT COUNT(*) as cnt FROM aria_emails WHERE user_id = $1 AND status = 'sent'", [userId]);
  const meetings = await q("SELECT COUNT(*) as cnt FROM aria_meetings WHERE user_id = $1", [userId]);
  const actions = await q("SELECT COUNT(*) as cnt FROM aria_actions WHERE user_id = $1 AND created_at >= CURRENT_DATE", [userId]);

  const rows = await q(
    "INSERT INTO aria_snapshots (user_id, revenue_mtd, leads_total, emails_sent, meetings_booked, invoices_overdue, actions_taken) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [userId, biz?.monthly_revenue || 0, leads.length, parseInt(emails[0]?.cnt || "0"), parseInt(meetings[0]?.cnt || "0"), biz?.overdue_invoices || 0, parseInt(actions[0]?.cnt || "0")]
  );
  return rows[0];
}

export async function getLatestSnapshot(userId: string) {
  const rows = await q("SELECT * FROM aria_snapshots WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1", [userId]);
  return rows[0] || null;
}

export async function createBriefing(userId: string, content: string, sentVia: string) {
  const rows = await q("INSERT INTO aria_briefings (user_id, content, sent_via) VALUES ($1, $2, $3) RETURNING *", [userId, content, sentVia]);
  return rows[0];
}

export async function getBriefings(userId: string, limit = 10) {
  return await q("SELECT * FROM aria_briefings WHERE user_id = $1 ORDER BY sent_at DESC LIMIT $2", [userId, limit]);
}

export async function saveToolToken(userId: string, tool: string, tokenData: any) {
  await q(
    "INSERT INTO aria_tokens (user_id, tool, token_data, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (user_id, tool) DO UPDATE SET token_data = $3, updated_at = NOW()",
    [userId, tool, JSON.stringify(tokenData)]
  );
}

export async function getToolToken(userId: string, tool: string) {
  const rows = await q("SELECT token_data FROM aria_tokens WHERE user_id = $1 AND tool = $2", [userId, tool]);
  return rows[0]?.token_data || null;
}

export async function getDashboardStats(userId: string) {
  const biz = await getBusiness(userId);
  const leadCount = await q("SELECT COUNT(*) as cnt FROM aria_leads WHERE user_id = $1", [userId]);
  const pendingCount = await q("SELECT COUNT(*) as cnt FROM aria_actions WHERE user_id = $1 AND status = 'pending'", [userId]);
  const todayActions = await q("SELECT COUNT(*) as cnt FROM aria_actions WHERE user_id = $1 AND created_at >= CURRENT_DATE", [userId]);
  const emailsSent = await q("SELECT COUNT(*) as cnt FROM aria_emails WHERE user_id = $1 AND status = 'sent'", [userId]);
  const upcomingMeetings = await q("SELECT COUNT(*) as cnt FROM aria_meetings WHERE user_id = $1 AND start_time >= NOW()", [userId]);
  const recentActions = await getActions(userId, 10);

  return {
    business: biz,
    leads: parseInt(leadCount[0]?.cnt || "0"),
    pendingApprovals: parseInt(pendingCount[0]?.cnt || "0"),
    todayActions: parseInt(todayActions[0]?.cnt || "0"),
    emailsSent: parseInt(emailsSent[0]?.cnt || "0"),
    upcomingMeetings: parseInt(upcomingMeetings[0]?.cnt || "0"),
    recentActions,
  };
}
