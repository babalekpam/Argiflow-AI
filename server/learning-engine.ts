// ============================================================
// LEARNING SYSTEM — CORE ENGINE
// Cloned from workflow-engine.ts for independent learning rebuild
// ============================================================

import { db } from "./db";
import { eq, and, desc, sql, lte, isNull } from "drizzle-orm";
import { storage } from "./storage";
import Anthropic from "@anthropic-ai/sdk";
import {
  learnings,
  learningNodes,
  learningEdges,
  learningExecutions,
  learningExecutionSteps,
  LEARNING_TRIGGER_TYPES,
  type Learning,
  type LearningNode,
  type LearningEdge,
  type LearningExecution,
  type LearningTriggerType,
} from "@shared/learning-schema";

// ============================================================
// EVENT BUS — Central event dispatcher for learning events
// ============================================================

type LearningEventHandler = (event: LearningEvent) => Promise<void>;

export interface LearningEvent {
  type: LearningTriggerType;
  userId: string;
  entityId?: string;
  entityType?: string;
  data: Record<string, any>;
  timestamp: Date;
}

class LearningEventBus {
  private handlers: Map<string, LearningEventHandler[]> = new Map();
  private eventLog: LearningEvent[] = [];
  private maxLogSize = 1000;

  on(eventType: string, handler: LearningEventHandler) {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  async emit(event: LearningEvent) {
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }

    console.log(`[Learning EventBus] Event: ${event.type} | User: ${event.userId} | Entity: ${event.entityType}:${event.entityId}`);

    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (err: any) {
        console.error(`[Learning EventBus] Handler error for ${event.type}:`, err?.message);
      }
    }

    try {
      await matchAndExecuteLearninges(event);
    } catch (err: any) {
      console.error(`[Learning EventBus] Learning matching error:`, err?.message);
    }
  }

  getRecentEvents(count = 50): LearningEvent[] {
    return this.eventLog.slice(-count);
  }
}

export const learningEventBus = new LearningEventBus();

// ============================================================
// LEARNING MATCHER — Finds active learnings for an event
// ============================================================

async function matchAndExecuteLearninges(event: LearningEvent) {
  const activeLearninges = await db
    .select()
    .from(learnings)
    .where(
      and(
        eq(learnings.userId, event.userId),
        eq(learnings.triggerType, event.type),
        eq(learnings.status, "active")
      )
    );

  if (activeLearninges.length === 0) return;

  console.log(`[Learning Engine] ${activeLearninges.length} learning(s) matched for ${event.type}`);

  for (const learning of activeLearninges) {
    try {
      if (!matchesTriggerConfig(learning, event)) {
        console.log(`[Learning Engine] Learning "${learning.name}" skipped — trigger config mismatch`);
        continue;
      }
      await executeLearning(learning, event);
    } catch (err: any) {
      console.error(`[Learning Engine] Failed to execute learning "${learning.name}":`, err?.message);
    }
  }
}

function matchesTriggerConfig(learning: Learning, event: LearningEvent): boolean {
  try {
    const config = JSON.parse(learning.triggerConfig || "{}");
    if (Object.keys(config).length === 0) return true;
    if (config.status && event.data.status !== config.status) return false;
    if (config.scoreThreshold && (event.data.score || 0) < config.scoreThreshold) return false;
    if (config.source && event.data.source !== config.source) return false;
    if (config.funnelId && event.data.funnelId !== config.funnelId) return false;
    if (config.stageId && event.data.stageId !== config.stageId) return false;
    return true;
  } catch {
    return true;
  }
}

// ============================================================
// LEARNING EXECUTOR — Runs a learning from start to finish
// ============================================================

export async function executeLearning(
  learning: Learning,
  event: LearningEvent,
  startNodeId?: string
): Promise<string> {
  const nodes = await db
    .select()
    .from(learningNodes)
    .where(eq(learningNodes.learningId, learning.id));

  const edges = await db
    .select()
    .from(learningEdges)
    .where(eq(learningEdges.learningId, learning.id));

  if (nodes.length === 0) {
    console.warn(`[Learning Engine] Learning "${learning.name}" has no nodes`);
    return "";
  }

  const triggerNode = startNodeId
    ? nodes.find(n => n.id === startNodeId)
    : nodes.find(n => n.nodeType === "trigger");

  if (!triggerNode) {
    console.warn(`[Learning Engine] No trigger node found in "${learning.name}"`);
    return "";
  }

  const [execution] = await db
    .insert(learningExecutions)
    .values({
      learningId: learning.id,
      userId: event.userId,
      status: "running",
      triggerData: JSON.stringify(event.data),
      contextData: JSON.stringify(event.data),
      totalSteps: nodes.length,
      currentNodeId: triggerNode.id,
    })
    .returning();

  console.log(`[Learning Engine] Execution started: ${execution.id} for "${learning.name}"`);

  try {
    let context = { ...event.data };
    let currentNode: LearningNode | undefined = triggerNode;
    let stepsCompleted = 0;

    while (currentNode) {
      const stepStart = Date.now();
      const [step] = await db
        .insert(learningExecutionSteps)
        .values({
          executionId: execution.id,
          nodeId: currentNode.id,
          status: "running",
          inputData: JSON.stringify(context),
          startedAt: new Date(),
        })
        .returning();

      try {
        const result = await executeNode(currentNode, context, event.userId);
        context = { ...context, ...result.output, _lastNodeResult: result };

        const durationMs = Date.now() - stepStart;
        await db
          .update(learningExecutionSteps)
          .set({
            status: "completed",
            outputData: JSON.stringify(result.output),
            durationMs,
            completedAt: new Date(),
          })
          .where(eq(learningExecutionSteps.id, step.id));

        stepsCompleted++;

        if (currentNode.nodeType === "delay" && result.delayUntil) {
          await db
            .update(learningExecutions)
            .set({
              status: "waiting",
              resumeAt: result.delayUntil,
              currentNodeId: currentNode.id,
              contextData: JSON.stringify(context),
              stepsCompleted,
            })
            .where(eq(learningExecutions.id, execution.id));

          console.log(`[Learning Engine] Execution ${execution.id} paused until ${result.delayUntil.toISOString()}`);
          return execution.id;
        }

        const outEdges = edges.filter(e => e.sourceNodeId === currentNode!.id);

        if (outEdges.length === 0) {
          currentNode = undefined;
        } else if (currentNode.nodeType === "condition" || currentNode.nodeType === "splitter") {
          const branch = result.branch || "default";
          const matchingEdge = outEdges.find(e => e.condition === branch)
            || outEdges.find(e => e.condition === "default")
            || outEdges[0];
          currentNode = nodes.find(n => n.id === matchingEdge.targetNodeId);
        } else if (outEdges.length > 1) {
          for (const edge of outEdges.slice(1)) {
            const parallelNode = nodes.find(n => n.id === edge.targetNodeId);
            if (parallelNode) {
              setImmediate(() => {
                executeNodeChain(execution.id, parallelNode, nodes, edges, context, event.userId)
                  .catch(err => console.error(`[Learning Engine] Parallel branch error:`, err?.message));
              });
            }
          }
          currentNode = nodes.find(n => n.id === outEdges[0].targetNodeId);
        } else {
          currentNode = nodes.find(n => n.id === outEdges[0].targetNodeId);
        }
      } catch (nodeError: any) {
        await db
          .update(learningExecutionSteps)
          .set({
            status: "failed",
            errorMessage: nodeError?.message || "Unknown error",
            durationMs: Date.now() - stepStart,
            completedAt: new Date(),
          })
          .where(eq(learningExecutionSteps.id, step.id));

        console.error(`[Learning Engine] Node "${currentNode!.label}" failed:`, nodeError?.message);

        await db
          .update(learningExecutions)
          .set({
            status: "failed",
            errorMessage: `Step "${currentNode!.label}" failed: ${nodeError?.message}`,
            stepsCompleted,
            completedAt: new Date(),
          })
          .where(eq(learningExecutions.id, execution.id));

        await db
          .update(learnings)
          .set({
            totalRuns: sql`${learnings.totalRuns} + 1`,
            failedRuns: sql`${learnings.failedRuns} + 1`,
            lastRunAt: new Date(),
          })
          .where(eq(learnings.id, learning.id));

        return execution.id;
      }
    }

    await db
      .update(learningExecutions)
      .set({
        status: "completed",
        stepsCompleted,
        completedAt: new Date(),
        contextData: JSON.stringify(context),
      })
      .where(eq(learningExecutions.id, execution.id));

    await db
      .update(learnings)
      .set({
        totalRuns: sql`${learnings.totalRuns} + 1`,
        successfulRuns: sql`${learnings.successfulRuns} + 1`,
        lastRunAt: new Date(),
      })
      .where(eq(learnings.id, learning.id));

    console.log(`[Learning Engine] Execution ${execution.id} completed — ${stepsCompleted} steps`);
    return execution.id;
  } catch (error: any) {
    await db
      .update(learningExecutions)
      .set({
        status: "failed",
        errorMessage: error?.message || "Unexpected execution error",
        completedAt: new Date(),
      })
      .where(eq(learningExecutions.id, execution.id));

    await db
      .update(learnings)
      .set({
        totalRuns: sql`${learnings.totalRuns} + 1`,
        failedRuns: sql`${learnings.failedRuns} + 1`,
        lastRunAt: new Date(),
      })
      .where(eq(learnings.id, learning.id));

    return execution.id;
  }
}

async function executeNodeChain(
  executionId: string,
  startNode: LearningNode,
  allNodes: LearningNode[],
  allEdges: LearningEdge[],
  context: Record<string, any>,
  userId: string
) {
  let currentNode: LearningNode | undefined = startNode;
  while (currentNode) {
    const result = await executeNode(currentNode, context, userId);
    context = { ...context, ...result.output };

    await db.insert(learningExecutionSteps).values({
      executionId,
      nodeId: currentNode.id,
      status: "completed",
      inputData: JSON.stringify(context),
      outputData: JSON.stringify(result.output),
      completedAt: new Date(),
    });

    const nextEdge = allEdges.find(e => e.sourceNodeId === currentNode!.id);
    currentNode = nextEdge ? allNodes.find(n => n.id === nextEdge.targetNodeId) : undefined;
  }
}

// ============================================================
// NODE EXECUTOR — Executes a single learning node
// ============================================================

interface NodeResult {
  output: Record<string, any>;
  branch?: string;
  delayUntil?: Date;
}

async function executeNode(
  node: LearningNode,
  context: Record<string, any>,
  userId: string
): Promise<NodeResult> {
  const config = JSON.parse(node.config || "{}");

  switch (node.actionType) {
    case "trigger_event":
    case "trigger_schedule":
    case "trigger_webhook":
    case "trigger_manual":
      return { output: { triggered: true, triggerType: node.actionType } };

    case "delay_wait": {
      const hours = config.hours || 1;
      const delayUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
      return { output: { delayHours: hours }, delayUntil };
    }
    case "delay_wait_until": {
      const targetDate = config.date ? new Date(config.date) : new Date(Date.now() + 24 * 60 * 60 * 1000);
      return { output: { waitUntil: targetDate.toISOString() }, delayUntil: targetDate };
    }

    case "condition_if": {
      const field = config.field || "score";
      const operator = config.operator || "gte";
      const value = config.value || 0;
      const fieldValue = getNestedValue(context, field);
      const result = evaluateCondition(fieldValue, operator, value);
      return { output: { conditionMet: result, field, value: fieldValue }, branch: result ? "true" : "false" };
    }
    case "condition_switch": {
      const field = config.field || "status";
      const fieldValue = getNestedValue(context, field);
      const rules = config.rules || [];
      let matchedBranch = "default";
      for (const rule of rules) {
        if (evaluateCondition(fieldValue, rule.op || "eq", rule.value)) {
          matchedBranch = rule.branch || "default";
          break;
        }
      }
      return { output: { switchField: field, switchValue: fieldValue, matchedBranch }, branch: matchedBranch };
    }

    case "splitter_ab": {
      const splitRatio = config.ratio || 50;
      const random = Math.random() * 100;
      const branch = random < splitRatio ? "a" : "b";
      return { output: { splitBranch: branch, splitRatio }, branch };
    }

    case "ai_classify": {
      const text = resolveTemplate(config.input || "{{name}} from {{company}}", context);
      const categories = config.categories || ["hot", "warm", "cold"];
      const aiResult = await callAI(userId, `Classify this into one of these categories: ${categories.join(", ")}. Input: "${text}". Respond with ONLY the category name, nothing else.`);
      const classified = categories.find((c: string) => aiResult.toLowerCase().includes(c.toLowerCase())) || categories[categories.length - 1];
      return { output: { classification: classified, aiResponse: aiResult }, branch: classified };
    }
    case "ai_score_lead": {
      const leadData = `Name: ${context.name || "Unknown"}, Company: ${context.company || "N/A"}, Source: ${context.source || "N/A"}, Intent: ${context.intentSignal || context.intent_signal || "N/A"}, Notes: ${context.notes || "N/A"}`;
      const aiResult = await callAI(userId, `Score this lead 0-100 based on buying intent. Consider: source quality, intent signals, company fit. Lead: ${leadData}. Respond with ONLY a number.`);
      const score = parseInt(aiResult.replace(/\D/g, "")) || 50;
      const tier = score >= 80 ? "hot" : score >= 50 ? "warm" : "cold";
      return { output: { score, tier, aiScoreResponse: aiResult }, branch: tier };
    }
    case "ai_generate_content": {
      const type = config.type || "email";
      const topic = resolveTemplate(config.topic || "Follow up with {{name}}", context);
      const aiResult = await callAI(userId, `Generate ${type} content about: ${topic}. Be professional and concise.`);
      return { output: { generatedContent: aiResult, contentType: type } };
    }
    case "ai_summarize": {
      const input = resolveTemplate(config.input || "{{notes}}", context);
      const aiResult = await callAI(userId, `Summarize this concisely in 2-3 sentences: ${input}`);
      return { output: { summary: aiResult } };
    }
    case "ai_extract": {
      const input = resolveTemplate(config.input || "{{notes}}", context);
      const fields = config.fields || ["name", "email", "company"];
      const aiResult = await callAI(userId, `Extract these fields from the text: ${fields.join(", ")}. Text: "${input}". Respond with JSON only.`);
      try {
        const extracted = JSON.parse(aiResult.match(/\{[\s\S]*\}/)?.[0] || "{}");
        return { output: { extracted } };
      } catch {
        return { output: { extracted: {}, rawAiResponse: aiResult } };
      }
    }

    case "create_lead": {
      const leadData = {
        userId,
        name: resolveTemplate(config.name || "{{name}}", context),
        email: resolveTemplate(config.email || "{{email}}", context),
        phone: resolveTemplate(config.phone || "{{phone}}", context) || "",
        company: resolveTemplate(config.company || "{{company}}", context) || "",
        source: config.source || "Learning Automation",
        status: config.status || "new",
        score: config.score || context.score || 50,
        notes: resolveTemplate(config.notes || "Created by learning", context),
        outreach: resolveTemplate(config.outreach || "", context),
        intentSignal: config.intentSignal || "learning_generated",
      };
      const lead = await storage.createLead(leadData);
      return { output: { leadId: lead.id, leadName: lead.name, leadCreated: true } };
    }
    case "update_lead": {
      const leadId = context.leadId || context.entityId || context.id;
      if (!leadId) return { output: { error: "No leadId in context" } };
      const updates: Record<string, any> = {};
      if (config.status) updates.status = config.status;
      if (config.score) updates.score = config.score;
      if (config.engagementLevel) updates.engagementLevel = config.engagementLevel;
      if (config.notes) updates.notes = resolveTemplate(config.notes, context);
      if (config.nextStep) updates.nextStep = resolveTemplate(config.nextStep, context);
      await storage.updateLead(leadId, updates);
      return { output: { leadId, updated: true, updates } };
    }
    case "create_appointment": {
      const apptData = {
        userId,
        leadName: resolveTemplate(config.leadName || "{{name}}", context),
        email: resolveTemplate(config.email || "{{email}}", context) || null,
        phone: resolveTemplate(config.phone || "{{phone}}", context) || null,
        company: resolveTemplate(config.company || "{{company}}", context) || null,
        type: config.type || "Discovery Call",
        date: config.date ? new Date(config.date) : new Date(Date.now() + 48 * 60 * 60 * 1000),
        notes: resolveTemplate(config.notes || "Auto-scheduled by learning", context) || null,
        source: "learning",
        status: "scheduled",
      };
      const appt = await storage.createAppointment(apptData);
      return { output: { appointmentId: appt.id, appointmentCreated: true } };
    }
    case "move_deal": {
      const dealId = context.dealId || context.entityId;
      const targetStageId = config.stageId;
      if (dealId && targetStageId) {
        await storage.updateFunnelDeal(dealId, { stageId: targetStageId });
        return { output: { dealId, movedToStage: targetStageId } };
      }
      return { output: { error: "Missing dealId or stageId" } };
    }
    case "create_funnel_deal": {
      const funnelId = config.funnelId || context.funnelId;
      const stageId = config.stageId || context.stageId;
      if (funnelId && stageId) {
        const deal = await storage.createFunnelDeal({
          funnelId,
          stageId,
          userId,
          contactName: resolveTemplate(config.contactName || "{{name}}", context),
          contactEmail: resolveTemplate(config.contactEmail || "{{email}}", context) || "",
          value: config.value || context.value || 0,
          status: "open",
        });
        return { output: { dealId: deal.id, dealCreated: true } };
      }
      return { output: { error: "Missing funnelId or stageId" } };
    }

    case "send_email": {
      const to = resolveTemplate(config.to || "{{email}}", context);
      const subject = resolveTemplate(config.subject || "Update from ArgiFlow", context);
      let body = resolveTemplate(config.body || config.template || "Hello {{name}}", context);

      if (config.template && !config.body) {
        body = await callAI(userId,
          `Write a professional email for template "${config.template}". Context: Lead name: ${context.name || "there"}, Company: ${context.company || "their business"}. Keep it under 200 words. Just the email body, no subject line.`
        );
      }

      if (to && to.includes("@")) {
        const settings = await storage.getSettingsByUser(userId);
        const user = await storage.getUserById(userId);
        if (settings?.senderEmail && user?.companyName) {
          try {
            const nodemailer = (await import("nodemailer")).default;
            const smtpHost = settings.smtpHost || process.env.SMTP_HOST;
            const smtpUser = settings.smtpUsername || process.env.SMTP_USERNAME;
            const smtpPass = settings.smtpPassword || process.env.SMTP_PASSWORD;
            if (smtpHost && smtpUser && smtpPass) {
              const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: settings.smtpPort || 587,
                secure: settings.smtpSecure ?? false,
                auth: { user: smtpUser, pass: smtpPass },
              });
              await transporter.sendMail({
                from: `"${user.firstName || ""} from ${user.companyName}" <${settings.senderEmail}>`,
                to,
                subject,
                html: body.replace(/\n/g, "<br>"),
                text: body,
              });
              return { output: { emailSent: true, to, subject } };
            } else if (settings.sendgridApiKey) {
              const sgMail = (await import("@sendgrid/mail")).default;
              sgMail.setApiKey(settings.sendgridApiKey);
              await sgMail.send({
                to,
                from: { email: settings.senderEmail, name: `${user.firstName || ""} from ${user.companyName}`.trim() },
                subject,
                text: body,
                html: body.replace(/\n/g, "<br>"),
              });
              return { output: { emailSent: true, to, subject } };
            }
          } catch (emailErr: any) {
            return { output: { emailSent: false, error: emailErr?.message } };
          }
        }
        return { output: { emailSent: false, error: "Email provider not configured" } };
      }
      return { output: { emailSent: false, error: "No valid email address" } };
    }
    case "send_sms": {
      const phone = resolveTemplate(config.phone || "{{phone}}", context);
      let message = resolveTemplate(config.message || config.template || "Hi {{name}}, following up from ArgiFlow.", context);

      if (config.template && !config.message) {
        message = await callAI(userId,
          `Write a concise SMS (under 160 chars) for template "${config.template}". For: ${context.name || "prospect"}. Just the message text.`
        );
      }

      if (phone) {
        try {
          const { sendSMS } = await import("./twilio");
          const msg = await sendSMS(phone, message);
          return { output: { smsSent: true, phone, sid: msg.sid } };
        } catch (smsErr: any) {
          return { output: { smsSent: false, error: smsErr?.message } };
        }
      }
      return { output: { smsSent: false, error: "No phone number" } };
    }
    case "make_voice_call": {
      const phone = resolveTemplate(config.phone || "{{phone}}", context);
      if (phone) {
        return { output: { callRequested: true, phone, note: "Use /api/voice/calls to initiate" } };
      }
      return { output: { callRequested: false, error: "No phone number" } };
    }
    case "send_notification": {
      const title = resolveTemplate(config.title || "Learning Notification", context);
      const message = resolveTemplate(config.message || "A learning action completed.", context);
      await storage.createNotification({
        userId,
        type: config.notificationType || "system",
        title,
        message,
        priority: config.priority || "normal",
        agentType: "learning",
      });
      return { output: { notificationSent: true, title } };
    }

    case "run_agent": {
      const agentType = config.agentType;
      if (agentType) {
        await storage.createAgentTask({
          userId,
          agentType,
          taskType: "learning_triggered",
          description: `Triggered by learning: ${context._learningName || "unknown"}`,
          status: "pending",
        });
        return { output: { agentTriggered: true, agentType } };
      }
      return { output: { agentTriggered: false, error: "No agentType specified" } };
    }
    case "trigger_lead_gen": {
      return { output: { leadGenTriggered: true, note: "Use /api/auto-lead-gen/trigger" } };
    }

    case "call_webhook": {
      const url = config.url;
      const method = config.method || "POST";
      const payload = { ...context, learningEvent: true };

      if (url) {
        try {
          const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          return { output: { webhookCalled: true, url, status: response.status } };
        } catch (webhookErr: any) {
          return { output: { webhookCalled: false, error: webhookErr?.message } };
        }
      }
      return { output: { webhookCalled: false, error: "No URL specified" } };
    }
    case "log_to_crm": {
      const note = resolveTemplate(config.note || "Learning action logged", context);
      console.log(`[Learning CRM Log] User: ${userId} | ${note}`);
      return { output: { logged: true, note } };
    }
    case "create_task": {
      const title = resolveTemplate(config.title || "New Task", context);
      const description = resolveTemplate(config.description || "", context);
      console.log(`[Learning Task] User: ${userId} | Task: ${title}`);
      return { output: { taskCreated: true, title, description } };
    }
    case "trigger_learning": {
      const targetLearningId = config.learningId;
      if (targetLearningId) {
        const [targetLearning] = await db
          .select()
          .from(learnings)
          .where(and(eq(learnings.id, targetLearningId), eq(learnings.userId, userId)));
        if (targetLearning) {
          const event: LearningEvent = {
            type: LEARNING_TRIGGER_TYPES.MANUAL,
            userId,
            data: context,
            timestamp: new Date(),
          };
          setImmediate(() => executeLearning(targetLearning, event));
          return { output: { learningTriggered: true, targetLearningId } };
        }
      }
      return { output: { learningTriggered: false, error: "Target learning not found" } };
    }

    default:
      console.warn(`[Learning Engine] Unknown action type: ${node.actionType}`);
      return { output: { error: `Unknown action: ${node.actionType}` } };
  }
}

// ============================================================
// HELPER: Call Claude AI
// ============================================================

async function callAI(userId: string, prompt: string): Promise<string> {
  try {
    const settings = await storage.getSettingsByUser(userId);
    const userKey = settings?.anthropicApiKey;
    let client: Anthropic;
    let model = "claude-sonnet-4-20250514";

    if (userKey && userKey.startsWith("sk-ant-")) {
      client = new Anthropic({ apiKey: userKey });
    } else if (process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-")) {
      client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    } else {
      return "[AI not configured]";
    }

    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("\n")
      .trim();
  } catch (err: any) {
    console.error(`[Learning AI] Error:`, err?.message);
    return "[AI temporarily unavailable]";
  }
}

// ============================================================
// HELPER: Template resolution
// ============================================================

function resolveTemplate(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => {
    const value = getNestedValue(context, key);
    return value !== undefined && value !== null ? String(value) : "";
  });
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

// ============================================================
// HELPER: Condition evaluation
// ============================================================

function evaluateCondition(fieldValue: any, operator: string, compareValue: any): boolean {
  switch (operator) {
    case "eq": return fieldValue == compareValue;
    case "neq": return fieldValue != compareValue;
    case "gt": return Number(fieldValue) > Number(compareValue);
    case "gte": return Number(fieldValue) >= Number(compareValue);
    case "lt": return Number(fieldValue) < Number(compareValue);
    case "lte": return Number(fieldValue) <= Number(compareValue);
    case "contains": return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
    case "starts_with": return String(fieldValue).toLowerCase().startsWith(String(compareValue).toLowerCase());
    case "exists": return fieldValue !== undefined && fieldValue !== null && fieldValue !== "";
    case "not_exists": return fieldValue === undefined || fieldValue === null || fieldValue === "";
    default: return fieldValue == compareValue;
  }
}

// ============================================================
// DELAY RESUME PROCESSOR
// ============================================================

export async function processDelayedLearningExecutions() {
  try {
    const now = new Date();
    const waiting = await db
      .select()
      .from(learningExecutions)
      .where(
        and(
          eq(learningExecutions.status, "waiting"),
          lte(learningExecutions.resumeAt!, now)
        )
      );

    if (waiting.length === 0) return;

    console.log(`[Learning Engine] Resuming ${waiting.length} delayed execution(s)`);

    for (const exec of waiting) {
      try {
        const [learning] = await db
          .select()
          .from(learnings)
          .where(eq(learnings.id, exec.learningId));

        if (!learning || learning.status !== "active") {
          await db
            .update(learningExecutions)
            .set({ status: "cancelled", completedAt: new Date(), errorMessage: "Learning no longer active" })
            .where(eq(learningExecutions.id, exec.id));
          continue;
        }

        const currentNodeId = exec.currentNodeId;
        if (!currentNodeId) continue;

        const allEdges = await db
          .select()
          .from(learningEdges)
          .where(eq(learningEdges.learningId, learning.id));

        const nextEdge = allEdges.find(e => e.sourceNodeId === currentNodeId);
        if (!nextEdge) {
          await db
            .update(learningExecutions)
            .set({ status: "completed", completedAt: new Date() })
            .where(eq(learningExecutions.id, exec.id));
          continue;
        }

        const context = JSON.parse(exec.contextData || "{}");
        const event: LearningEvent = {
          type: LEARNING_TRIGGER_TYPES.MANUAL,
          userId: exec.userId,
          data: context,
          timestamp: new Date(),
        };

        await db
          .update(learningExecutions)
          .set({ status: "running", resumeAt: null })
          .where(eq(learningExecutions.id, exec.id));

        await executeLearning(learning, event, nextEdge.targetNodeId);
      } catch (resumeErr: any) {
        console.error(`[Learning Engine] Failed to resume execution ${exec.id}:`, resumeErr?.message);
        await db
          .update(learningExecutions)
          .set({ status: "failed", errorMessage: `Resume failed: ${resumeErr?.message}`, completedAt: new Date() })
          .where(eq(learningExecutions.id, exec.id));
      }
    }
  } catch (error: any) {
    console.error("[Learning Engine] Delay processor error:", error?.message);
  }
}

// ============================================================
// INITIALIZATION
// ============================================================

export function startLearningEngine() {
  console.log("[Learning Engine] Starting background processors...");
  setInterval(processDelayedLearningExecutions, 60 * 1000);
  setTimeout(processDelayedLearningExecutions, 30 * 1000);
  console.log("[Learning Engine] ✅ Engine started — listening for events");
}
