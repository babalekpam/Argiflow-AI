import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { getSkill, buildSkillPrompt, buildAutoPrompt, listSkills } from "./marketing-skills/skills-loader";
import { callAI } from "./ai-provider";

const router = Router();

function safeError(err: unknown): string {
  if (err instanceof z.ZodError) {
    return err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
  }
  return "An internal error occurred. Please try again.";
}

const ARGIFLOW_CONTEXT = (() => {
  try {
    return fs.readFileSync(
      path.join(__dirname, "marketing-skills/product-context.md"), "utf8"
    );
  } catch {
    return "";
  }
})();

async function callWithSkill(skillName: string, userPrompt: string, extraContext = "", userId?: string): Promise<string> {
  const skillContent = getSkill(skillName);
  const systemPrompt = `You are Aria, ArgiFlow's AI marketing assistant — sharp, direct, and expert-level.

${ARGIFLOW_CONTEXT}

${extraContext ? `## Additional Context\n${extraContext}\n` : ""}

---

# ACTIVE SKILL: ${skillName}

${skillContent}

---

Always give complete, actionable, ready-to-use output. Be specific. Avoid generic advice.
When producing copy (emails, headlines, etc.), write final versions, not templates with [brackets].`;

  const result = await callAI({ system: systemPrompt, userMessage: userPrompt, maxTokens: 2000, userId });
  return result.text;
}

router.get("/skills", (_req: Request, res: Response) => {
  res.json({ skills: listSkills() });
});

const coldEmailSchema = z.object({
  target_role: z.string().min(1, "Target role is required"),
  company_name: z.string().optional().default(""),
  industry: z.string().min(1, "Industry is required"),
  pain_point: z.string().min(1, "Pain point is required"),
  your_offer: z.string().min(1, "Your offer is required"),
  tone: z.string().optional().default("peer-level")
});

const emailSequenceSchema = z.object({
  sequence_type: z.string().min(1, "Sequence type is required"),
  audience: z.string().min(1, "Audience is required"),
  goal: z.string().min(1, "Goal is required"),
  product_context: z.string().optional().default(""),
  num_emails: z.number().optional().default(5)
});

const pageAuditSchema = z.object({
  page_url: z.string().optional().default(""),
  page_copy: z.string().min(1, "Page copy is required"),
  page_type: z.string().min(1, "Page type is required"),
  goal: z.string().min(1, "Goal is required"),
  traffic_source: z.string().optional().default("organic")
});

const copyWriterSchema = z.object({
  copy_type: z.string().min(1, "Copy type is required"),
  audience: z.string().min(1, "Audience is required"),
  tone: z.string().min(1, "Tone is required"),
  key_points: z.string().min(1, "Key points are required"),
  existing_copy: z.string().optional().default("")
});

const launchPlannerSchema = z.object({
  launch_type: z.string().min(1, "Launch type is required"),
  product_name: z.string().min(1, "Product name is required"),
  target_audience: z.string().min(1, "Target audience is required"),
  timeline: z.string().min(1, "Timeline is required"),
  channels_available: z.string().min(1, "Channels are required")
});

const pricingAdvisorSchema = z.object({
  product_type: z.string().min(1, "Product type is required"),
  current_pricing: z.string().optional().default("none set"),
  target_market: z.string().min(1, "Target market is required"),
  competitors: z.string().min(1, "Competitors are required"),
  goal: z.string().min(1, "Goal is required")
});

const adCreativeSchema = z.object({
  platform: z.string().min(1, "Platform is required"),
  audience: z.string().min(1, "Audience is required"),
  offer: z.string().min(1, "Offer is required"),
  goal: z.string().min(1, "Goal is required"),
  tone: z.string().optional().default("direct")
});

const ariaEnhancedSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversation_history: z.array(z.object({ role: z.string(), content: z.string() })).optional().default([]),
  user_context: z.string().optional().default("")
});

const sequenceReviewSchema = z.object({
  sequence_name: z.string().min(1, "Sequence name is required"),
  target_segment: z.string().min(1, "Target segment is required"),
  emails: z.array(z.object({ subject: z.string(), body: z.string() })).min(1, "At least one email is required")
});

router.post("/cold-email", async (req: Request, res: Response) => {
  try {
    const { target_role, company_name, industry, pain_point, your_offer, tone } = coldEmailSchema.parse(req.body);

    const userPrompt = `Write a complete 4-touch cold email sequence for this outreach:

Target: ${target_role} at ${company_name || `a ${industry} company`}
Industry: ${industry}
Their pain point: ${pain_point}
What we offer: ${your_offer}
Tone: ${tone}

Deliver:
1. Subject lines for all 4 emails
2. Full body copy for each email (ready to send, no brackets)
3. Send timing for each email
4. One-line note on what each email is designed to do`;

    const userId = (req.session as any)?.userId;
    const result = await callWithSkill("cold-email", userPrompt, "", userId);
    res.json({ success: true, result, skill: "cold-email" });
  } catch (err: unknown) {
    const status = err instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ success: false, error: safeError(err) });
  }
});

router.post("/email-sequence", async (req: Request, res: Response) => {
  try {
    const { sequence_type, audience, goal, product_context, num_emails } = emailSequenceSchema.parse(req.body);

    const userPrompt = `Design a complete ${sequence_type} email sequence:

Audience: ${audience}
Goal: ${goal}
Number of emails: ${num_emails}
${product_context ? `Product context: ${product_context}` : ""}

For each email provide:
- Email number and purpose
- Send timing
- Subject line
- Preview text
- Full body copy (ready to send)
- CTA (button text + destination)`;

    const userId = (req.session as any)?.userId;
    const result = await callWithSkill("email-sequence", userPrompt, "", userId);
    res.json({ success: true, result, skill: "email-sequence" });
  } catch (err: unknown) {
    const status = err instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ success: false, error: safeError(err) });
  }
});

router.post("/page-audit", async (req: Request, res: Response) => {
  try {
    const { page_url, page_copy, page_type, goal, traffic_source } = pageAuditSchema.parse(req.body);

    const userPrompt = `Audit this ${page_type} page for conversion optimization:

${page_url ? `URL: ${page_url}` : ""}
Page type: ${page_type}
Conversion goal: ${goal}
Traffic source: ${traffic_source}

Page content:
"""
${page_copy}
"""

Provide:
1. Overall conversion score (1-10) with reasoning
2. Quick wins (implement today)
3. High-impact changes (this sprint)
4. 3 headline alternatives with rationale
5. CTA copy alternatives
6. Key objection you're not addressing`;

    const userId = (req.session as any)?.userId;
    const result = await callWithSkill("page-cro", userPrompt, "", userId);
    res.json({ success: true, result, skill: "page-cro" });
  } catch (err: unknown) {
    const status = err instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ success: false, error: safeError(err) });
  }
});

router.post("/copy-writer", async (req: Request, res: Response) => {
  try {
    const { copy_type, audience, tone, key_points, existing_copy } = copyWriterSchema.parse(req.body);

    const systemSkills = buildSkillPrompt(["copywriting", "marketing-psychology"], ARGIFLOW_CONTEXT);

    const userPrompt = `Write ${copy_type} for this situation:

Target audience: ${audience}
Tone: ${tone}
Key points to hit: ${key_points}
${existing_copy ? `Existing copy to improve:\n"""\n${existing_copy}\n"""` : ""}

Deliver final, polished copy — no placeholders or brackets.
Include 2 alternatives for the headline/hook.`;

    const userId = (req.session as any)?.userId;
    const result = await callAI({ system: systemSkills, userMessage: userPrompt, maxTokens: 2000, userId });
    res.json({ success: true, result: result.text, skill: "copywriting+marketing-psychology" });
  } catch (err: unknown) {
    const status = err instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ success: false, error: safeError(err) });
  }
});

router.post("/launch-planner", async (req: Request, res: Response) => {
  try {
    const { launch_type, product_name, target_audience, timeline, channels_available } = launchPlannerSchema.parse(req.body);

    const userPrompt = `Create a complete launch plan:

What: ${launch_type} for "${product_name}"
Target audience: ${target_audience}
Timeline: ${timeline}
Available channels: ${channels_available}

Deliver:
1. Pre-launch checklist (with owners and deadlines)
2. Launch day play-by-play schedule
3. Post-launch 30-day plan
4. Top 3 owned + rented + borrowed channel moves
5. Email to existing audience (announcement copy)
6. Social post for launch day`;

    const userId = (req.session as any)?.userId;
    const result = await callWithSkill("launch-strategy", userPrompt, "", userId);
    res.json({ success: true, result, skill: "launch-strategy" });
  } catch (err: unknown) {
    const status = err instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ success: false, error: safeError(err) });
  }
});

router.post("/pricing-advisor", async (req: Request, res: Response) => {
  try {
    const { product_type, current_pricing, target_market, competitors, goal } = pricingAdvisorSchema.parse(req.body);

    const userPrompt = `Analyze and advise on pricing strategy:

Product type: ${product_type}
Current pricing: ${current_pricing}
Target market: ${target_market}
Competitors and their pricing: ${competitors}
Goal: ${goal}

Provide:
1. Recommended tier structure (3 tiers with names, prices, features)
2. Value metric recommendation with rationale
3. Pricing psychology tactics to apply
4. Annual vs monthly discount recommendation
5. What to test first
6. One-sentence recommended positioning for pricing page hero`;

    const userId = (req.session as any)?.userId;
    const result = await callWithSkill("pricing-strategy", userPrompt, "", userId);
    res.json({ success: true, result, skill: "pricing-strategy" });
  } catch (err: unknown) {
    const status = err instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ success: false, error: safeError(err) });
  }
});

router.post("/ad-creative", async (req: Request, res: Response) => {
  try {
    const { platform, audience, offer, goal, tone } = adCreativeSchema.parse(req.body);

    const userPrompt = `Create ad creative for:

Platform: ${platform}
Audience: ${audience}
Offer: ${offer}
Goal: ${goal}
Tone: ${tone}

Deliver:
1. 3 headline variations (with character counts)
2. 2 body copy variations (platform-appropriate length)
3. 3 CTA options
4. Hook line for video/creative brief
5. Targeting suggestion for this audience`;

    const userId = (req.session as any)?.userId;
    const result = await callWithSkill("ad-creative", userPrompt, "", userId);
    res.json({ success: true, result, skill: "ad-creative" });
  } catch (err: unknown) {
    const status = err instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ success: false, error: safeError(err) });
  }
});

router.post("/aria-enhanced", async (req: Request, res: Response) => {
  try {
    const { message, conversation_history, user_context } = ariaEnhancedSchema.parse(req.body);

    const { skills, prompt: systemPrompt } = buildAutoPrompt(message, ARGIFLOW_CONTEXT);

    const ariaBase = `You are Aria, ArgiFlow's AI sales and marketing assistant. You are embedded in the ArgiFlow platform and help users grow their business. You are sharp, direct, and give expert advice — not generic platitudes.

${systemPrompt}

${user_context ? `\n## User Context\n${user_context}` : ""}`;

    const messages = [
      ...conversation_history,
      { role: "user" as const, content: message }
    ];

    const userId = (req.session as any)?.userId;
    const lastUserMsg = messages[messages.length - 1]?.content || message;
    const result = await callAI({ system: ariaBase, userMessage: typeof lastUserMsg === "string" ? lastUserMsg : message, maxTokens: 1500, userId });

    res.json({
      success: true,
      result: result.text,
      skills_used: skills,
      skill_count: skills.length
    });
  } catch (err: unknown) {
    const status = err instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ success: false, error: safeError(err) });
  }
});

router.post("/sequence-review", async (req: Request, res: Response) => {
  try {
    const { sequence_name, target_segment, emails } = sequenceReviewSchema.parse(req.body);

    const emailsFormatted = emails.map((e, i) =>
      `Email ${i + 1}:\nSubject: ${e.subject}\n\n${e.body}`
    ).join("\n\n---\n\n");

    const systemSkills = buildSkillPrompt(["cold-email", "marketing-psychology"], ARGIFLOW_CONTEXT);

    const userPrompt = `Review this outreach sequence before it goes live:

Sequence: "${sequence_name}"
Target segment: ${target_segment}

${emailsFormatted}

For each email, provide:
1. Quality score (1-10)
2. What's working
3. What to fix (specific rewrite if needed)
4. Subject line alternatives (if weak)

Then overall sequence assessment:
- Does it flow logically?
- Does it escalate value correctly?
- Predicted reply rate vs. industry benchmark
- #1 change to make before sending`;

    const userId = (req.session as any)?.userId;
    const result = await callAI({ system: systemSkills, userMessage: userPrompt, maxTokens: 2500, userId });

    res.json({
      success: true,
      result: result.text,
      skill: "cold-email+marketing-psychology"
    });
  } catch (err: unknown) {
    const status = err instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ success: false, error: safeError(err) });
  }
});

export default router;
