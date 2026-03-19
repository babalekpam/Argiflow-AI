import { callAI } from "./ai-provider";
import * as memory from "./aria-memory";
import * as connectors from "./aria-connectors";

export async function handleChat(userId: string, userMessage: string): Promise<string> {
  const biz = await memory.getBusiness(userId);
  if (!biz || !biz.onboarded) {
    return "Let's finish setting up first! Tell me about your business.";
  }

  await memory.addChatMessage(userId, "user", userMessage);
  const chatHistory = await memory.getChatHistory(userId, 20);
  const stats = await memory.getDashboardStats(userId);
  const pending = await memory.getPendingActions(userId);
  const leads = await memory.getLeads(userId, 10);

  const prompt = `You are Aria, the AI business manager for "${biz.name}" (${biz.type || "business"}).

OWNER: ${biz.owner_name || "the owner"}
BUSINESS: ${biz.name} — ${biz.main_service || "services"}
CUSTOMERS: ${biz.customer_type || "businesses"}
AREA: ${biz.service_area || "not specified"}
AUTONOMY: ${biz.autonomy} (supervised = ask before acting, semi-auto = act on low-risk items, autopilot = act on everything)

CURRENT STATE:
- Active leads: ${stats.leads}
- Emails sent: ${stats.emailsSent}
- Upcoming meetings: ${stats.upcomingMeetings}
- Actions today: ${stats.todayActions}
- Pending approvals: ${stats.pendingApprovals}

RECENT LEADS:
${leads.slice(0, 5).map(l => `- ${l.name} (${l.company || "no company"}) — ${l.status} ${l.email ? `[${l.email}]` : ""}`).join("\n") || "None yet"}

PENDING APPROVALS:
${pending.slice(0, 3).map(a => `- #${a.id}: ${a.title} (${a.category})`).join("\n") || "None"}

RECENT CHAT:
${chatHistory.slice(0, 10).reverse().map(m => `${m.role === "user" ? "Owner" : "Aria"}: ${m.content}`).join("\n")}

Owner just said: "${userMessage}"

RULES:
1. Be conversational and helpful. Use the owner's first name.
2. If they ask about business stats, answer from the data above.
3. If they ask you to DO something (send email, follow up, find leads), respond with what you'll do.
4. If autonomy is "supervised", propose actions and wait for approval.
5. Keep responses under 150 words. Be direct and useful.
6. You CAN take actions. Include them as JSON at the end if needed.

RESPOND AS JSON:
{
  "message": "Your response to the owner",
  "actions": [
    {
      "category": "email|lead_gen|follow_up|meeting|analysis|marketing",
      "title": "Brief action title",
      "description": "What you'll do",
      "execute_now": true/false,
      "tool": "ses|twilio|none",
      "tool_params": { "to": "recipient@email.com", "subject": "Email subject", "body": "Full HTML email body with greeting, content, and sign-off" }
    }
  ]
}

CRITICAL RULES FOR EMAIL ACTIONS:
- For ANY email action (category "email" or "follow_up"), you MUST include tool: "ses" and tool_params with to, subject, and body.
- The "body" field must contain the COMPLETE email content ready to send — not a summary or description. Write it as if you are writing the actual email.
- The "description" field is a brief summary for the owner to review. The "body" in tool_params is the actual email content.
- If sending to multiple recipients, create a separate action for each one.
- If no actions needed, set "actions" to [].`;

  const result = await callAI({
    system: "You are Aria, a friendly AI business manager. Return only valid JSON. No markdown.",
    userMessage: prompt,
    maxTokens: 1200,
    userId,
  });

  let parsed: any;
  try {
    let text = result.text.trim();
    if (text.startsWith("```")) text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    parsed = JSON.parse(text);
  } catch {
    parsed = { message: "I'm here! How can I help with your business today?", actions: [] };
  }

  for (const action of (parsed.actions || [])) {
    const shouldExecute = action.execute_now && biz.autonomy !== "supervised";
    const isEmailAction = action.tool === "ses" && action.tool_params?.to;

    if (shouldExecute && isEmailAction) {
      const emailResult = await connectors.sendEmailViaSES({
        to: action.tool_params.to,
        toName: action.tool_params.to_name,
        subject: action.tool_params.subject || `Follow-up from ${biz.name}`,
        body: action.tool_params.body || action.description,
        fromName: biz.owner_name || biz.name || "Aria",
        fromEmail: biz.owner_email || undefined,
      });

      await memory.createEmail(userId, {
        to_email: action.tool_params.to,
        to_name: action.tool_params.to_name,
        subject: action.tool_params.subject || `Follow-up from ${biz.name}`,
        body: action.tool_params.body || action.description,
        status: emailResult.success ? "sent" : "failed",
      });

      await memory.createAction(userId, {
        category: action.category,
        title: action.title,
        description: action.description,
        tool_used: "ses",
        tool_result: { ...emailResult, ...action.tool_params },
        output_preview: emailResult.success ? `Email sent to ${action.tool_params.to}` : `Failed: ${emailResult.error}`,
        status: "completed",
      });
    } else {
      await memory.createAction(userId, {
        category: action.category,
        title: action.title,
        description: action.description,
        tool_used: action.tool || null,
        tool_result: action.tool_params || null,
        output_preview: action.description,
        status: shouldExecute ? "completed" : "pending",
      });
    }
  }

  await memory.addChatMessage(userId, "assistant", parsed.message);
  return parsed.message;
}

export async function runAriaCycle(userId: string): Promise<{ actions: number; message: string }> {
  const biz = await memory.getBusiness(userId);
  if (!biz || !biz.onboarded || biz.status !== "active") {
    return { actions: 0, message: "Not active" };
  }

  await memory.upsertBusiness(userId, { status: "thinking" });

  const stats = await memory.getDashboardStats(userId);
  const followups = await memory.getLeadsDueFollowup(userId);
  const snapshot = await memory.getLatestSnapshot(userId);

  const stripeData = await connectors.getStripeRevenue();
  if (stripeData) {
    await memory.upsertBusiness(userId, {
      monthly_revenue: stripeData.mtdRevenue,
      overdue_invoices: stripeData.overdueInvoices,
    });
  }

  const prompt = `You are Aria, the autonomous AI business manager for "${biz.name}".

BUSINESS: ${biz.name} (${biz.type || "business"})
SERVICE: ${biz.main_service || "services"}
CUSTOMERS: ${biz.customer_type || "businesses"}
AREA: ${biz.service_area || "not specified"}
AUTONOMY: ${biz.autonomy}

CURRENT STATE:
- Revenue MTD: $${biz.monthly_revenue || 0}
- Active leads: ${stats.leads}
- Emails sent: ${stats.emailsSent}
- Upcoming meetings: ${stats.upcomingMeetings}
- Overdue invoices: ${biz.overdue_invoices || 0}
- Actions today: ${stats.todayActions}

LEADS NEEDING FOLLOW-UP:
${followups.slice(0, 5).map(l => `- ${l.name} (${l.email || "no email"}) — last contact: ${l.last_contact || "never"}, status: ${l.status}`).join("\n") || "None due"}

YESTERDAY'S SNAPSHOT:
${snapshot ? `Revenue: $${snapshot.revenue_mtd}, Leads: ${snapshot.leads_total}, Emails: ${snapshot.emails_sent}` : "No snapshot yet"}

Based on the current state, decide what actions to take. Think like a real business manager.

RESPOND AS JSON:
{
  "thought": "Brief internal thought about what needs doing",
  "actions": [
    {
      "category": "email|lead_gen|follow_up|meeting|analysis|marketing",
      "title": "Brief action title",
      "description": "What to do",
      "priority": "high|medium|low",
      "tool": "ses|twilio|stripe|none",
      "tool_params": {}
    }
  ]
}

Rules:
- Return 0-5 actions based on what actually needs doing.
- If leads need follow-up, draft follow-up emails.
- If no leads exist, suggest lead gen actions.
- Be specific. Vague actions are useless.
- For email actions, include tool_params: { to, subject, body }`;

  const result = await callAI({
    system: "You are Aria, an autonomous AI business manager. Return only valid JSON.",
    userMessage: prompt,
    maxTokens: 2000,
    userId,
  });

  let parsed: any;
  try {
    let text = result.text.trim();
    if (text.startsWith("```")) text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    parsed = JSON.parse(text);
  } catch {
    parsed = { thought: "Could not analyze", actions: [] };
  }

  let actionsExecuted = 0;

  for (const action of (parsed.actions || [])) {
    const isAutoExecute = biz.autonomy === "autopilot" || (biz.autonomy === "semi-auto" && action.priority !== "high");

    if (isAutoExecute && action.tool === "ses" && action.tool_params?.to) {
      const emailResult = await connectors.sendEmailViaSES({
        to: action.tool_params.to,
        toName: action.tool_params.to_name,
        subject: action.tool_params.subject || `Follow-up from ${biz.name}`,
        body: action.tool_params.body || action.description,
        fromName: biz.owner_name || biz.name || "Aria",
        fromEmail: biz.owner_email || undefined,
      });

      await memory.createEmail(userId, {
        to_email: action.tool_params.to,
        to_name: action.tool_params.to_name,
        subject: action.tool_params.subject || `Follow-up from ${biz.name}`,
        body: action.tool_params.body || action.description,
        status: emailResult.success ? "sent" : "failed",
      });

      await memory.createAction(userId, {
        category: action.category,
        title: action.title,
        description: action.description,
        tool_used: "ses",
        tool_result: emailResult,
        output_preview: emailResult.success ? `Email sent to ${action.tool_params.to}` : `Failed: ${emailResult.error}`,
        status: "completed",
      });

      actionsExecuted++;
    } else {
      await memory.createAction(userId, {
        category: action.category,
        title: action.title,
        description: action.description,
        tool_used: action.tool || null,
        tool_result: action.tool_params || null,
        output_preview: action.description,
        status: isAutoExecute ? "completed" : "pending",
      });

      if (isAutoExecute) actionsExecuted++;
    }
  }

  await memory.createSnapshot(userId);
  await memory.upsertBusiness(userId, { status: "active" });

  return { actions: actionsExecuted, message: parsed.thought || "Cycle complete" };
}

export async function generateBriefing(userId: string): Promise<string> {
  const biz = await memory.getBusiness(userId);
  if (!biz || !biz.onboarded) return "Business not set up yet.";

  const stats = await memory.getDashboardStats(userId);
  const recentActions = await memory.getActions(userId, 20);
  const pendingActions = await memory.getPendingActions(userId);

  const prompt = `Generate a daily briefing for ${biz.owner_name || "the owner"} of ${biz.name}.

TODAY'S STATS:
- Revenue MTD: $${biz.monthly_revenue || 0}
- Active leads: ${stats.leads}
- Emails sent: ${stats.emailsSent}
- Meetings coming up: ${stats.upcomingMeetings}
- Actions taken today: ${stats.todayActions}
- Pending your approval: ${stats.pendingApprovals}

RECENT ACTIONS:
${recentActions.slice(0, 10).map(a => `- [${a.category}] ${a.title} (${a.status})`).join("\n") || "None"}

PENDING APPROVALS:
${pendingActions.slice(0, 5).map(a => `- ${a.title}: ${a.description || ""}`).join("\n") || "None"}

Write a brief, friendly daily update in plain English. Include:
1. A greeting using their first name
2. Key numbers (leads, emails, meetings)
3. What you did today
4. What needs their attention (pending approvals)
5. What you plan to do next

Keep it under 200 words. Be warm and professional, like a trusted assistant.`;

  const result = await callAI({
    system: "You are Aria, writing a daily briefing. Be concise and friendly.",
    userMessage: prompt,
    maxTokens: 500,
    userId,
  });

  const briefingText = result.text.trim();
  await memory.createBriefing(userId, briefingText, biz.briefing_via || "email");

  if (biz.briefing_via === "email" && biz.owner_email) {
    await connectors.sendEmailViaSES({
      to: biz.owner_email,
      toName: biz.owner_name || undefined,
      subject: `Daily Briefing — ${biz.name}`,
      body: briefingText.replace(/\n/g, "<br>"),
      fromName: "Aria",
    });
  }

  return briefingText;
}

const ARIA_CYCLE_INTERVAL = 15 * 60 * 1000;

export function startAriaScheduler() {
  console.log("[Aria] Background scheduler started — checking every 15 minutes");

  setInterval(async () => {
    try {
      const { pool } = await import("./db");
      const client = await pool.connect();
      try {
        const result = await client.query("SELECT * FROM aria_business WHERE onboarded = true AND status = 'active'");
        for (const biz of result.rows) {
          try {
            console.log(`[Aria] Running cycle for user ${biz.user_id}`);
            const cycleResult = await runAriaCycle(biz.user_id);
            console.log(`[Aria] Cycle complete: ${cycleResult.actions} actions — ${cycleResult.message}`);
          } catch (err: any) {
            console.error(`[Aria] Cycle error for ${biz.user_id}:`, err.message);
            await memory.upsertBusiness(biz.user_id, { status: "active" });
          }
        }
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error("[Aria] Scheduler error:", err.message);
    }
  }, ARIA_CYCLE_INTERVAL);

  setInterval(async () => {
    try {
      const now = new Date();
      const { pool } = await import("./db");
      const client = await pool.connect();
      try {
        const result = await client.query("SELECT * FROM aria_business WHERE onboarded = true");
        for (const biz of result.rows) {
          const briefingHour = parseInt((biz.briefing_time || "08:00").split(":")[0]);
          if (now.getHours() === briefingHour && now.getMinutes() < 30) {
            try {
              await generateBriefing(biz.user_id);
              console.log(`[Aria] Briefing sent for ${biz.user_id}`);
            } catch (err: any) {
              console.error(`[Aria] Briefing error for ${biz.user_id}:`, err.message);
            }
          }
        }
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error("[Aria] Briefing scheduler error:", err.message);
    }
  }, 30 * 60 * 1000);
}
