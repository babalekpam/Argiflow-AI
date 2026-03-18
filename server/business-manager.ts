import { db } from "./db";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import { businessManager, managerDecisions, managerDailyReports } from "@shared/business-manager-schema";
import { leads, appointments, emailAccounts } from "@shared/schema";
import { callAI } from "./ai-provider";

const CAPABILITY_LABELS: Record<string, string> = {
  lead_generation: "Lead Generation & Prospecting",
  email_outreach: "Email Outreach & Cold Emails",
  follow_ups: "Follow-Up Sequences",
  pipeline_management: "Pipeline & Deal Management",
  marketing: "Marketing Campaigns & Content",
  analytics_review: "Analytics & Performance Review",
  inbox_management: "Inbox Monitoring & Responses",
};

const CYCLE_INTERVAL_MS = 15 * 60 * 1000;

async function getBusinessSnapshot(userId: string) {
  const [leadStats] = await db.select({
    total: count(),
    hot: sql<number>`count(*) filter (where ${leads.score} >= 60)`,
    warm: sql<number>`count(*) filter (where ${leads.score} >= 30 and ${leads.score} < 60)`,
    cold: sql<number>`count(*) filter (where ${leads.score} < 30 or ${leads.score} is null)`,
    contacted: sql<number>`count(*) filter (where ${leads.status} = 'contacted')`,
    converted: sql<number>`count(*) filter (where ${leads.status} = 'converted')`,
    newToday: sql<number>`count(*) filter (where ${leads.createdAt} >= now() - interval '24 hours')`,
  }).from(leads).where(eq(leads.userId, userId));

  const recentLeads = await db.select({
    id: leads.id,
    name: leads.name,
    company: leads.company,
    email: leads.email,
    score: leads.score,
    status: leads.status,
  }).from(leads).where(eq(leads.userId, userId)).orderBy(desc(leads.createdAt)).limit(10);

  const [appointmentStats] = await db.select({
    total: count(),
    upcoming: sql<number>`count(*) filter (where ${appointments.date} >= now())`,
    today: sql<number>`count(*) filter (where date(${appointments.date}) = current_date)`,
  }).from(appointments).where(eq(appointments.userId, userId));

  const emailAccountsList = await db.select({
    email: emailAccounts.email,
    warmupEnabled: emailAccounts.warmupEnabled,
    reputation: emailAccounts.reputation,
    dailySendLimit: emailAccounts.dailySendLimit,
  }).from(emailAccounts).where(eq(emailAccounts.userId, userId));

  const recentDecisions = await db.select({
    category: managerDecisions.category,
    decision: managerDecisions.decision,
    status: managerDecisions.status,
    createdAt: managerDecisions.createdAt,
  }).from(managerDecisions).where(eq(managerDecisions.userId, userId)).orderBy(desc(managerDecisions.createdAt)).limit(5);

  return {
    leads: { ...leadStats, recentLeads },
    appointments: appointmentStats,
    emailAccounts: emailAccountsList,
    recentDecisions,
  };
}

async function thinkAndDecide(userId: string, config: any, snapshot: any): Promise<Array<{ category: string; decision: string; reasoning: string; actions: Array<{ type: string; detail: string }> ; priority: string }>> {
  const capabilities = (config.activeCapabilities || []).map((c: string) => CAPABILITY_LABELS[c] || c).join(", ");

  const prompt = `You are the AI Business Manager for this company. You ARE the business operator — think and act like the CEO/COO.

BUSINESS CONTEXT:
${config.businessContext || "No specific business context provided."}

GOALS:
${(config.goals || []).join("\n- ") || "Grow the business, generate leads, close deals."}

YOUR PERSONALITY: ${config.personality || "professional"}
AUTONOMY LEVEL: ${config.autonomyLevel} (conservative = only safe actions, moderate = balanced risk, aggressive = maximize growth)
ACTIVE CAPABILITIES: ${capabilities}

CURRENT BUSINESS SNAPSHOT:
- Total Leads: ${snapshot.leads.total} (Hot: ${snapshot.leads.hot}, Warm: ${snapshot.leads.warm}, Cold: ${snapshot.leads.cold})
- Contacted: ${snapshot.leads.contacted}, Converted: ${snapshot.leads.converted}
- New leads today: ${snapshot.leads.newToday}
- Appointments: ${snapshot.appointments.total} total, ${snapshot.appointments.upcoming} upcoming, ${snapshot.appointments.today} today
- Email accounts: ${snapshot.emailAccounts.length}
- Recent leads: ${JSON.stringify(snapshot.leads.recentLeads.slice(0, 5).map((l: any) => ({ name: l.name, company: l.company, score: l.score, status: l.status })))}

RECENT DECISIONS ALREADY MADE:
${snapshot.recentDecisions.map((d: any) => `- [${d.category}] ${d.decision}`).join("\n") || "None yet — this is the first cycle."}

Analyze the business state and decide what actions to take RIGHT NOW. Think like a real business manager — what needs attention? What opportunities exist? What's falling through the cracks?

Return a JSON array of decisions. Each decision should be:
{
  "category": "lead_generation" | "email_outreach" | "follow_ups" | "pipeline_management" | "marketing" | "analytics_review" | "inbox_management",
  "decision": "Brief description of what you're deciding to do",
  "reasoning": "Why this is important right now",
  "actions": [{"type": "action_type", "detail": "specific action detail"}],
  "priority": "high" | "medium" | "low"
}

Rules:
- Only decide on capabilities that are ACTIVE
- Don't repeat decisions already made recently
- Prioritize high-impact actions
- Be specific — vague decisions are useless
- Return 1-5 decisions per cycle based on what actually needs doing
- If nothing urgent needs doing, return an empty array []

Respond with ONLY the JSON array.`;

  const result = await callAI({
    system: "You are an autonomous AI Business Manager. Return only valid JSON arrays. No markdown, no explanation.",
    userMessage: prompt,
    maxTokens: 3000,
    userId,
  });

  let text = result.text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  try {
    const decisions = JSON.parse(text);
    if (!Array.isArray(decisions)) return [];
    return decisions;
  } catch {
    console.error("[BusinessManager] Failed to parse AI decisions:", text.slice(0, 200));
    return [];
  }
}

async function executeDecisionActions(userId: string, decision: any, config: any): Promise<Array<{ type: string; detail: string; result: string }>> {
  const results: Array<{ type: string; detail: string; result: string }> = [];

  for (const action of (decision.actions || [])) {
    try {
      switch (action.type) {
        case "score_leads":
        case "review_pipeline":
        case "analyze_performance": {
          const analysis = await callAI({
            system: "You are analyzing business data. Provide concise, actionable insights.",
            userMessage: `Analyze this and provide 3-5 actionable insights: ${action.detail}`,
            maxTokens: 800,
            userId,
          });
          results.push({ type: action.type, detail: action.detail, result: analysis.text.slice(0, 500) });
          break;
        }

        case "draft_email":
        case "draft_follow_up": {
          const email = await callAI({
            system: `You are a professional email writer. Write compelling, concise emails. Personality: ${config.personality || "professional"}`,
            userMessage: `Draft an email: ${action.detail}. Keep it under 150 words, professional, and with a clear CTA.`,
            maxTokens: 600,
            userId,
          });
          results.push({ type: action.type, detail: action.detail, result: email.text.slice(0, 800) });
          break;
        }

        case "generate_content":
        case "create_post": {
          const content = await callAI({
            system: "You are a content strategist. Create engaging, value-driven content.",
            userMessage: `Create this content: ${action.detail}`,
            maxTokens: 1000,
            userId,
          });
          results.push({ type: action.type, detail: action.detail, result: content.text.slice(0, 1000) });
          break;
        }

        case "prioritize_leads": {
          const leadData = await db.select({
            id: leads.id,
            name: leads.name,
            company: leads.company,
            score: leads.score,
            status: leads.status,
            email: leads.email,
          }).from(leads).where(
            and(eq(leads.userId, userId), gte(leads.score, 30))
          ).orderBy(desc(leads.score)).limit(20);

          const prioritization = await callAI({
            system: "You are a sales prioritization expert. Rank leads and explain why.",
            userMessage: `Prioritize these leads for outreach. Business context: ${config.businessContext || "B2B services"}. Leads: ${JSON.stringify(leadData)}`,
            maxTokens: 1000,
            userId,
          });
          results.push({ type: action.type, detail: action.detail, result: prioritization.text.slice(0, 1000) });
          break;
        }

        case "recommend_strategy":
        case "suggest_improvement": {
          const strategy = await callAI({
            system: "You are a business strategist. Provide specific, actionable recommendations.",
            userMessage: `Based on this context, what should we do? ${action.detail}. Business: ${config.businessContext || "B2B company"}`,
            maxTokens: 800,
            userId,
          });
          results.push({ type: action.type, detail: action.detail, result: strategy.text.slice(0, 800) });
          break;
        }

        default: {
          results.push({ type: action.type, detail: action.detail, result: `Action noted: ${action.detail}` });
        }
      }
    } catch (err: any) {
      results.push({ type: action.type, detail: action.detail, result: `Error: ${err.message}` });
    }
  }

  return results;
}

export async function runManagerCycle(userId: string): Promise<{ decisions: number; actions: number; thought: string }> {
  const [config] = await db.select().from(businessManager).where(eq(businessManager.userId, userId));
  if (!config || !config.enabled) {
    throw new Error("Business Manager is not enabled");
  }

  const today = new Date();
  if (config.lastBudgetReset) {
    const lastReset = new Date(config.lastBudgetReset);
    if (today.toDateString() !== lastReset.toDateString()) {
      await db.update(businessManager).set({ creditsUsedToday: 0, lastBudgetReset: today }).where(eq(businessManager.userId, userId));
    }
  }

  await db.update(businessManager).set({
    status: "thinking",
    currentThought: "Analyzing business state and deciding next actions...",
    updatedAt: new Date(),
  }).where(eq(businessManager.userId, userId));

  const snapshot = await getBusinessSnapshot(userId);
  const decisions = await thinkAndDecide(userId, config, snapshot);

  if (decisions.length === 0) {
    await db.update(businessManager).set({
      status: "idle",
      currentThought: "Everything looks good — no urgent actions needed right now.",
      lastRunAt: new Date(),
      nextRunAt: new Date(Date.now() + CYCLE_INTERVAL_MS),
      updatedAt: new Date(),
    }).where(eq(businessManager.userId, userId));
    return { decisions: 0, actions: 0, thought: "No urgent actions needed." };
  }

  let totalActions = 0;
  let lastThought = "";

  for (const decision of decisions) {
    await db.update(businessManager).set({
      currentThought: `Working on: ${decision.decision}`,
      updatedAt: new Date(),
    }).where(eq(businessManager.userId, userId));

    const actionResults = await executeDecisionActions(userId, decision, config);
    totalActions += actionResults.length;

    await db.insert(managerDecisions).values({
      userId,
      category: decision.category,
      decision: decision.decision,
      reasoning: decision.reasoning,
      actionsTaken: actionResults,
      priority: decision.priority,
      status: "completed",
      creditsUsed: actionResults.length * 5,
    });

    lastThought = decision.decision;
  }

  await db.update(businessManager).set({
    status: "idle",
    currentThought: `Completed ${decisions.length} decisions, ${totalActions} actions. Last: ${lastThought}`,
    lastRunAt: new Date(),
    nextRunAt: new Date(Date.now() + CYCLE_INTERVAL_MS),
    totalDecisions: sql`${businessManager.totalDecisions} + ${decisions.length}`,
    totalActions: sql`${businessManager.totalActions} + ${totalActions}`,
    updatedAt: new Date(),
  }).where(eq(businessManager.userId, userId));

  return { decisions: decisions.length, actions: totalActions, thought: lastThought };
}

export async function generateDailyReport(userId: string): Promise<any> {
  const today = new Date().toISOString().split("T")[0];

  const todayDecisions = await db.select().from(managerDecisions).where(
    and(
      eq(managerDecisions.userId, userId),
      gte(managerDecisions.createdAt, new Date(today + "T00:00:00Z"))
    )
  ).orderBy(desc(managerDecisions.createdAt));

  const snapshot = await getBusinessSnapshot(userId);

  const reportPrompt = `Generate a daily business report for today (${today}).

DECISIONS MADE TODAY (${todayDecisions.length}):
${todayDecisions.map(d => `- [${d.category}] ${d.decision} (${d.priority} priority) — ${d.reasoning}`).join("\n") || "No decisions made today."}

CURRENT BUSINESS STATE:
- Leads: ${snapshot.leads.total} total (${snapshot.leads.hot} hot, ${snapshot.leads.warm} warm)
- New leads today: ${snapshot.leads.newToday}
- Converted: ${snapshot.leads.converted}
- Appointments: ${snapshot.appointments.upcoming} upcoming

Provide a JSON response:
{
  "summary": "2-3 sentence executive summary of today",
  "highlights": ["key achievement 1", "key achievement 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "healthScore": 1-100
}`;

  const result = await callAI({
    system: "You are a business analyst. Return only valid JSON.",
    userMessage: reportPrompt,
    maxTokens: 1000,
    userId,
  });

  let parsed: any = {};
  try {
    let text = result.text.trim();
    if (text.startsWith("```")) text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    parsed = JSON.parse(text);
  } catch {
    parsed = { summary: "Report generation completed.", highlights: [], recommendations: [], healthScore: 50 };
  }

  const [report] = await db.insert(managerDailyReports).values({
    userId,
    reportDate: today,
    summary: parsed.summary || "Daily cycle completed.",
    decisionsCount: todayDecisions.length,
    actionsCount: todayDecisions.reduce((acc: number, d: any) => acc + (d.actionsTaken?.length || 0), 0),
    leadsGenerated: Number(snapshot.leads.newToday) || 0,
    highlights: parsed.highlights || [],
    recommendations: parsed.recommendations || [],
    pipelineHealth: {
      total: Number(snapshot.leads.total) || 0,
      hot: Number(snapshot.leads.hot) || 0,
      warm: Number(snapshot.leads.warm) || 0,
      cold: Number(snapshot.leads.cold) || 0,
      converted: Number(snapshot.leads.converted) || 0,
    },
  }).returning();

  return report;
}

export function startBusinessManagerScheduler() {
  console.log("[BusinessManager] Background scheduler started — checking every 15 minutes");

  setInterval(async () => {
    try {
      const configs = await db.select().from(businessManager).where(eq(businessManager.enabled, true));

      for (const config of configs) {
        const now = new Date();
        if (config.nextRunAt && now < new Date(config.nextRunAt)) continue;

        try {
          console.log(`[BusinessManager] Running cycle for user ${config.userId}`);
          const result = await runManagerCycle(config.userId);
          console.log(`[BusinessManager] Cycle complete: ${result.decisions} decisions, ${result.actions} actions`);
        } catch (err: any) {
          console.error(`[BusinessManager] Cycle error for user ${config.userId}:`, err.message);
          await db.update(businessManager).set({
            status: "error",
            currentThought: `Error: ${err.message}`,
            nextRunAt: new Date(Date.now() + CYCLE_INTERVAL_MS),
            updatedAt: new Date(),
          }).where(eq(businessManager.userId, config.userId));
        }
      }
    } catch (err: any) {
      console.error("[BusinessManager] Scheduler error:", err.message);
    }
  }, CYCLE_INTERVAL_MS);

  setInterval(async () => {
    try {
      const now = new Date();
      if (now.getHours() === 23 && now.getMinutes() < 30) {
        const configs = await db.select().from(businessManager).where(eq(businessManager.enabled, true));
        for (const config of configs) {
          try {
            await generateDailyReport(config.userId);
            console.log(`[BusinessManager] Daily report generated for user ${config.userId}`);
          } catch (err: any) {
            console.error(`[BusinessManager] Report error for ${config.userId}:`, err.message);
          }
        }
      }
    } catch (err: any) {
      console.error("[BusinessManager] Report scheduler error:", err.message);
    }
  }, 30 * 60 * 1000);
}
