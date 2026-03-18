import { db, pool } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import {
  marketingAutopilot,
  autopilotActions,
  leads,
  users,
  businesses,
  websiteProfiles,
  marketingStrategies,
  sequences,
  sequenceSteps,
  sequenceEnrollments,
} from "@shared/schema";
import Anthropic from "@anthropic-ai/sdk";
import { sendEmail } from "./postal";
import { getSkill, buildSkillPrompt, detectSkills } from "./marketing-skills/skills-loader";
import fs from "fs";
import path from "path";

const isValidAnthropicKey = (key?: string) => key && key.startsWith("sk-ant-");
const useDirectKey = isValidAnthropicKey(process.env.ANTHROPIC_API_KEY);

const anthropic = new Anthropic(
  useDirectKey
    ? { apiKey: process.env.ANTHROPIC_API_KEY! }
    : process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY && process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL
    ? { apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY, baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL }
    : { apiKey: process.env.OPENAI_API_KEY || "" }
);

const AI_MODEL = useDirectKey ? "claude-sonnet-4-20250514"
  : process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ? "claude-sonnet-4-5"
  : "claude-sonnet-4-5";

const PRODUCT_CONTEXT = (() => {
  try {
    return fs.readFileSync(path.join(__dirname, "marketing-skills/product-context.md"), "utf8");
  } catch {
    return "";
  }
})();

async function aiGenerate(systemPrompt: string, userPrompt: string, maxTokens = 2000): Promise<string> {
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  return (response.content[0] as { text: string }).text;
}

async function logAction(
  userId: string,
  actionType: string,
  title: string,
  description: string,
  result: string,
  status: "completed" | "failed" | "pending" = "completed",
  metadata?: any
) {
  await db.insert(autopilotActions).values({
    userId,
    actionType,
    title,
    description,
    result,
    status,
    metadata: metadata || null,
  });
  await db
    .update(marketingAutopilot)
    .set({
      totalActions: sql`${marketingAutopilot.totalActions} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(marketingAutopilot.userId, userId));
}

export async function studyBusiness(userId: string): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error("User not found");

  const [biz] = await db.select().from(businesses).where(eq(businesses.userId, userId)).limit(1);
  const [website] = await db.select().from(websiteProfiles).where(eq(websiteProfiles.userId, userId)).limit(1);
  const [strategy] = await db.select().from(marketingStrategies).where(eq(marketingStrategies.userId, userId)).limit(1);

  const leadsResult = await pool.query(
    `SELECT COUNT(*) as total, 
            COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
            COUNT(CASE WHEN status = 'hot' THEN 1 END) as hot,
            COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
            COUNT(CASE WHEN outreach_sent_at IS NOT NULL THEN 1 END) as outreached
     FROM leads WHERE user_id = $1`,
    [userId]
  );
  const leadStats = leadsResult.rows[0];

  const seqResult = await pool.query(
    `SELECT COUNT(*) as total, 
            SUM(total_enrolled) as enrolled,
            SUM(total_replied) as replied
     FROM sequences WHERE user_id = $1`,
    [userId]
  );
  const seqStats = seqResult.rows[0];

  const recentLeads = await db
    .select({ name: leads.name, company: leads.company, status: leads.status, score: leads.score })
    .from(leads)
    .where(eq(leads.userId, userId))
    .orderBy(desc(leads.createdAt))
    .limit(20);

  const businessContext = `
# BUSINESS INTELLIGENCE REPORT

## Owner Profile
- Name: ${user.firstName} ${user.lastName}
- Email: ${user.email}
- Company: ${user.companyName || "Not set"}
- Industry: ${user.industry || "Not set"}
- Job Title: ${user.jobTitle || "Not set"}
- Website: ${user.website || "Not set"}
${user.companyDescription ? `- Description: ${user.companyDescription}` : ""}

## Business Details
${biz ? `- Business Name: ${biz.name}\n- Industry: ${biz.industry}\n- Description: ${biz.description}` : "No business profile created yet."}

## Website Intelligence
${website ? `- URL: ${website.websiteUrl}\n- Services: ${website.services}\n- Value Props: ${website.valuePropositions}\n- Target Audience: ${website.targetAudience}\n- Pricing: ${website.pricing}\n- Status: ${website.status}` : "No website profile trained yet."}

## Existing Marketing Strategy
${strategy ? strategy.strategy : "No marketing strategy generated yet."}

## Lead Pipeline Stats
- Total Leads: ${leadStats.total}
- New/Untouched: ${leadStats.new_leads}
- Contacted: ${leadStats.contacted}
- Hot Leads: ${leadStats.hot}
- Outreached: ${leadStats.outreached}

## Sequence Stats
- Active Sequences: ${seqStats.total || 0}
- Total Enrolled: ${seqStats.enrolled || 0}
- Total Replied: ${seqStats.replied || 0}

## Recent Leads (Last 20)
${recentLeads.map((l) => `- ${l.name} (${l.company || "unknown"}) — ${l.status}, score: ${l.score}`).join("\n")}
`;

  const systemPrompt = `You are an expert business analyst and marketing strategist. Study this business thoroughly and create a comprehensive profile that will be used by an autonomous AI marketing agent to run all marketing operations.

${PRODUCT_CONTEXT}`;

  const profile = await aiGenerate(
    systemPrompt,
    `Study this business data and create a detailed business profile including:
1. Business summary (what they do, who they serve, their value proposition)
2. Target audience / ICP (ideal customer profile) with specifics
3. Key pain points they solve
4. Competitive advantages
5. Current marketing status (what's working, what's missing)
6. Revenue model and pricing analysis
7. Brand voice and tone recommendations
8. Top 5 immediate marketing priorities

Business Data:
${businessContext}`,
    3000
  );

  await db
    .update(marketingAutopilot)
    .set({ businessProfile: profile, updatedAt: new Date() })
    .where(eq(marketingAutopilot.userId, userId));

  await logAction(userId, "business_study", "Business Intelligence Study", "AI analyzed all business data, leads, website, and strategies", profile.substring(0, 500) + "...");

  return profile;
}

export async function generateMarketingPlan(userId: string): Promise<string> {
  const [config] = await db.select().from(marketingAutopilot).where(eq(marketingAutopilot.userId, userId));
  if (!config?.businessProfile) {
    throw new Error("Business profile not generated yet. Study the business first.");
  }

  const skillPrompt = buildSkillPrompt(
    ["cold-email", "email-sequence", "content-strategy", "launch-strategy", "pricing-strategy", "marketing-ideas"],
    PRODUCT_CONTEXT
  );

  const plan = await aiGenerate(
    `You are an autonomous AI marketing director. You have been given full ownership of this business's marketing operations. Create a comprehensive, actionable marketing plan that YOU will execute autonomously.

${skillPrompt}`,
    `Based on this business profile, create a detailed 30-day autonomous marketing execution plan:

${config.businessProfile}

The plan must include:
1. WEEK 1: Foundation & Quick Wins
   - Cold email campaigns to launch (specific segments, messaging angles)
   - Content pieces to create
   - Landing page optimizations
   
2. WEEK 2: Scale Outreach
   - New segments to target
   - Follow-up sequences to deploy
   - Social content calendar
   
3. WEEK 3: Optimize & Expand
   - A/B tests to run
   - New channels to activate
   - Referral/partnership plays
   
4. WEEK 4: Analyze & Iterate
   - KPIs to review
   - Strategy adjustments
   - Next month priorities

For each action item, be SPECIFIC:
- Exact target audience segments
- Exact messaging angles
- Exact email subjects and talking points
- Exact content topics

This plan will be executed by AI agents automatically. Make it concrete and actionable.`,
    4000
  );

  await db
    .update(marketingAutopilot)
    .set({ marketingPlan: plan, updatedAt: new Date() })
    .where(eq(marketingAutopilot.userId, userId));

  await logAction(userId, "marketing_plan", "30-Day Marketing Plan Generated", "AI created comprehensive autonomous marketing execution plan", plan.substring(0, 500) + "...");

  return plan;
}

export async function executeAutopilotCycle(userId: string): Promise<{ actions: string[] }> {
  const claimed = await pool.query(
    `UPDATE marketing_autopilot SET status = 'running', last_run_at = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND enabled = true AND status != 'running'
     RETURNING *`,
    [userId]
  );
  if (claimed.rows.length === 0) {
    return { actions: ["Autopilot is disabled or already running"] };
  }

  const config = claimed.rows[0];
  if (!config.business_profile) {
    const profile = await studyBusiness(userId);
    if (!profile) return { actions: ["Failed to study business"] };
  }
  if (!config.marketing_plan) {
    await generateMarketingPlan(userId);
  }

  const [freshConfig] = await db.select().from(marketingAutopilot).where(eq(marketingAutopilot.userId, userId));
  const actions: string[] = [];
  const channels = (freshConfig.activeChannels || "email,content").split(",");

  try {
    if (channels.includes("email")) {
      const emailAction = await runEmailCampaignAction(userId, freshConfig.businessProfile!, freshConfig.marketingPlan!);
      actions.push(emailAction);
    }

    if (channels.includes("content")) {
      const contentAction = await runContentAction(userId, freshConfig.businessProfile!, freshConfig.marketingPlan!);
      actions.push(contentAction);
    }

    if (channels.includes("sequences")) {
      const seqAction = await runSequenceAction(userId, freshConfig.businessProfile!, freshConfig.marketingPlan!);
      actions.push(seqAction);
    }

    if (channels.includes("audit")) {
      const auditAction = await runAuditAction(userId, freshConfig.businessProfile!);
      actions.push(auditAction);
    }

    const nextRun = new Date();
    const freq = freshConfig.frequency || "daily";
    if (freq === "hourly") nextRun.setHours(nextRun.getHours() + 1);
    else if (freq === "daily") nextRun.setHours(nextRun.getHours() + 24);
    else if (freq === "twice_daily") nextRun.setHours(nextRun.getHours() + 12);
    else nextRun.setHours(nextRun.getHours() + 168);

    await db
      .update(marketingAutopilot)
      .set({ status: "idle", nextRunAt: nextRun, updatedAt: new Date() })
      .where(eq(marketingAutopilot.userId, userId));
  } catch (err: any) {
    await db
      .update(marketingAutopilot)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(marketingAutopilot.userId, userId));
    await logAction(userId, "cycle_error", "Autopilot Cycle Error", err.message, "", "failed");
    actions.push(`Error: ${err.message}`);
  }

  return { actions };
}

async function runEmailCampaignAction(userId: string, profile: string, plan: string): Promise<string> {
  const result = await pool.query(
    `SELECT * FROM leads 
     WHERE user_id = $1 AND status = 'new' AND outreach_sent_at IS NULL AND email IS NOT NULL AND email != ''
     ORDER BY score DESC NULLS LAST, created_at DESC
     LIMIT 5`,
    [userId]
  );
  const newLeads = result.rows;

  if (newLeads.length === 0) {
    await logAction(userId, "email_campaign", "Email Campaign Check", "No untouched leads available for outreach", "Skipped — all leads already contacted or no leads found");
    return "No new leads to email";
  }

  const coldEmailSkill = getSkill("cold-email");
  const lead = newLeads[0];

  const emailContent = await aiGenerate(
    `You are an expert cold email writer working for this business. Write a personalized cold email.

${PRODUCT_CONTEXT}

## Business Profile
${profile}

## Cold Email Expertise
${coldEmailSkill}`,
    `Write a single personalized cold email for this lead:
- Name: ${lead.name}
- Company: ${lead.company || "Unknown"}
- Email: ${lead.email}
- Industry context from their company research: ${lead.company_research || "None available"}

Requirements:
- Subject line (compelling, under 50 chars)
- Body (3-4 paragraphs, personalized, no brackets/placeholders)
- Clear CTA
- Professional sign-off

Output ONLY in this exact format:
SUBJECT: [subject line]
---
[email body]`,
    1000
  );

  const lines = emailContent.split("\n");
  const subjectLine = lines.find((l) => l.startsWith("SUBJECT:"))?.replace("SUBJECT:", "").trim() || "Quick question";
  const body = emailContent.split("---").slice(1).join("---").trim();

  if (body.length > 50) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    try {
      await sendEmail({
        to: lead.email,
        from: user?.email || process.env.SES_FROM_EMAIL,
        fromName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "ArgiFlow",
        subject: subjectLine,
        html: body.replace(/\n/g, "<br>"),
        tag: "autopilot-cold-email",
      });

      await db
        .update(leads)
        .set({
          status: "contacted",
          outreach: emailContent,
          outreachSentAt: new Date(),
          nextStep: "Awaiting reply — autopilot will follow up",
        })
        .where(eq(leads.id, lead.id));

      await db
        .update(marketingAutopilot)
        .set({ totalEmailsSent: sql`${marketingAutopilot.totalEmailsSent} + 1` })
        .where(eq(marketingAutopilot.userId, userId));

      await logAction(
        userId,
        "email_sent",
        `Cold Email Sent to ${lead.name}`,
        `Personalized outreach to ${lead.name} at ${lead.company || "unknown company"}`,
        `Subject: ${subjectLine}\n\nSent to: ${lead.email}`,
        "completed",
        { leadId: lead.id, leadName: lead.name, leadEmail: lead.email }
      );

      return `Sent cold email to ${lead.name} (${lead.email})`;
    } catch (err: any) {
      await logAction(userId, "email_failed", `Email Failed for ${lead.name}`, err.message, "", "failed");
      return `Failed to send email to ${lead.name}: ${err.message}`;
    }
  }

  return "Generated email content but skipped sending (too short)";
}

async function runContentAction(userId: string, profile: string, plan: string): Promise<string> {
  const contentSkill = buildSkillPrompt(["content-strategy", "social-content", "copywriting"], PRODUCT_CONTEXT);

  const content = await aiGenerate(
    `You are an AI content marketing manager. Create content based on the business profile and marketing plan.

${contentSkill}

## Business Profile
${profile}`,
    `Based on the current marketing plan, generate today's content piece. Choose the most impactful format:
- LinkedIn post (if B2B focused)
- Blog outline (if SEO needed)
- Email newsletter (if list building)
- Social media post (if awareness needed)

Marketing Plan Context:
${plan.substring(0, 2000)}

Output the COMPLETE ready-to-publish content piece with:
1. Platform/Format
2. Title/Hook
3. Full content
4. CTA
5. Hashtags (if social)`,
    1500
  );

  await logAction(
    userId,
    "content_created",
    "Content Piece Generated",
    "AI created a marketing content piece based on the current plan",
    content.substring(0, 1000),
    "completed"
  );

  return "Created content piece";
}

async function runSequenceAction(userId: string, profile: string, plan: string): Promise<string> {
  const existingSeqs = await db.select().from(sequences).where(eq(sequences.userId, userId));

  if (existingSeqs.length >= 5) {
    await logAction(userId, "sequence_check", "Sequence Check", "User already has 5+ sequences", "Skipped creation");
    return "Sufficient sequences already exist";
  }

  const seqSkill = buildSkillPrompt(["email-sequence", "cold-email"], PRODUCT_CONTEXT);

  const seqContent = await aiGenerate(
    `You are an autonomous email sequence architect. Design a high-converting sequence.

${seqSkill}

## Business Profile
${profile}`,
    `Create a new 4-step email sequence for a segment identified in the marketing plan.

Marketing Plan:
${plan.substring(0, 1500)}

Existing sequences: ${existingSeqs.map((s) => s.name).join(", ") || "None"}

Design a NEW sequence targeting a DIFFERENT segment. Output in this exact JSON format:
{
  "name": "Sequence Name — Target Segment",
  "description": "Brief description",
  "steps": [
    { "stepNumber": 1, "subject": "Subject line", "content": "Full email body", "delayDays": 0 },
    { "stepNumber": 2, "subject": "Subject line", "content": "Full email body", "delayDays": 3 },
    { "stepNumber": 3, "subject": "Subject line", "content": "Full email body", "delayDays": 5 },
    { "stepNumber": 4, "subject": "Subject line", "content": "Full email body", "delayDays": 7 }
  ]
}

Output ONLY valid JSON, no markdown.`,
    2500
  );

  try {
    const jsonStr = seqContent.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    const [newSeq] = await db
      .insert(sequences)
      .values({
        userId,
        name: parsed.name,
        description: parsed.description || "AI-generated autopilot sequence",
        status: "active",
      })
      .returning();

    for (const step of parsed.steps) {
      await db.insert(sequenceSteps).values({
        sequenceId: newSeq.id,
        stepNumber: step.stepNumber,
        channel: "email",
        subject: step.subject,
        content: step.content,
        delayDays: step.delayDays || 1,
      });
    }

    await db
      .update(marketingAutopilot)
      .set({ totalCampaignsCreated: sql`${marketingAutopilot.totalCampaignsCreated} + 1` })
      .where(eq(marketingAutopilot.userId, userId));

    await logAction(
      userId,
      "sequence_created",
      `New Sequence: ${parsed.name}`,
      `AI created a ${parsed.steps.length}-step email sequence targeting a new segment`,
      `Sequence: ${parsed.name}\nSteps: ${parsed.steps.length}`,
      "completed",
      { sequenceId: newSeq.id }
    );

    return `Created new sequence: ${parsed.name}`;
  } catch (err: any) {
    await logAction(userId, "sequence_failed", "Sequence Creation Failed", err.message, seqContent.substring(0, 500), "failed");
    return `Failed to create sequence: ${err.message}`;
  }
}

async function runAuditAction(userId: string, profile: string): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user?.website) {
    return "No website URL configured — skipping audit";
  }

  const auditSkill = buildSkillPrompt(["page-cro", "copywriting"], PRODUCT_CONTEXT);

  const audit = await aiGenerate(
    `You are a CRO expert. Audit the business's marketing approach and provide specific improvements.

${auditSkill}

## Business Profile
${profile}`,
    `Conduct a marketing audit for this business:
- Website: ${user.website}
- Company: ${user.companyName}
- Industry: ${user.industry}

Provide:
1. Top 3 conversion quick wins
2. Messaging improvements (specific rewrites)
3. CTA optimization recommendations
4. SEO keyword opportunities
5. Social proof strategies to implement`,
    1500
  );

  await logAction(
    userId,
    "marketing_audit",
    "Marketing Audit Completed",
    `AI audited marketing approach for ${user.companyName}`,
    audit.substring(0, 1000),
    "completed"
  );

  return "Completed marketing audit";
}

let autopilotInterval: NodeJS.Timeout | null = null;
let schedulerStarted = false;

export function startAutopilotScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  console.log("[MarketingAutopilot] Background scheduler started — checking every 30 minutes");

  autopilotInterval = setInterval(async () => {
    try {
      const dueConfigs = await pool.query(
        `SELECT user_id FROM marketing_autopilot 
         WHERE enabled = true 
           AND status != 'running'
           AND (next_run_at IS NULL OR next_run_at <= NOW())
         LIMIT 5`
      );

      for (const row of dueConfigs.rows) {
        console.log(`[MarketingAutopilot] Running cycle for user ${row.user_id}`);
        try {
          await executeAutopilotCycle(row.user_id);
        } catch (err: any) {
          console.error(`[MarketingAutopilot] Cycle failed for ${row.user_id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error("[MarketingAutopilot] Scheduler error:", err.message);
    }
  }, 30 * 60 * 1000);
}

export function stopAutopilotScheduler() {
  if (autopilotInterval) {
    clearInterval(autopilotInterval);
    autopilotInterval = null;
  }
}
