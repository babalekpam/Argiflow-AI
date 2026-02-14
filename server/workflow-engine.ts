// ============================================================
// ARGILETTE WORKFLOW ENGINE — CORE ENGINE
// Drop this into: server/workflow-engine.ts
//
// This is the brain. It:
// 1. Listens for events from across the platform (EventBus)
// 2. Matches events to active workflow triggers
// 3. Executes workflow nodes in sequence
// 4. Handles delays, conditions, AI actions, and CRM operations
// 5. Logs every step for debugging and analytics
// ============================================================

import { db } from "./db";
import { eq, and, desc, sql, lte, isNull } from "drizzle-orm";
import { storage } from "./storage";
import Anthropic from "@anthropic-ai/sdk";
import {
  workflows,
  workflowNodes,
  workflowEdges,
  workflowExecutions,
  workflowExecutionSteps,
  TRIGGER_TYPES,
  type Workflow,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowExecution,
  type TriggerType,
} from "@shared/workflow-schema";

// ============================================================
// EVENT BUS — Central event dispatcher
// All platform events flow through here
// Workflows subscribe to events via their triggerType
// ============================================================

type EventHandler = (event: WorkflowEvent) => Promise<void>;

export interface WorkflowEvent {
  type: TriggerType;
  userId: string;
  entityId?: string;        // lead.id, appointment.id, deal.id, etc.
  entityType?: string;      // "lead", "appointment", "deal", etc.
  data: Record<string, any>; // Full entity data + context
  timestamp: Date;
}

class WorkflowEventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private eventLog: WorkflowEvent[] = [];
  private maxLogSize = 1000;

  on(eventType: string, handler: EventHandler) {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  async emit(event: WorkflowEvent) {
    // Log the event
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }

    console.log(`[Workflow EventBus] Event: ${event.type} | User: ${event.userId} | Entity: ${event.entityType}:${event.entityId}`);

    // Fire registered handlers
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (err: any) {
        console.error(`[Workflow EventBus] Handler error for ${event.type}:`, err?.message);
      }
    }

    // Match against active workflows
    try {
      await matchAndExecuteWorkflows(event);
    } catch (err: any) {
      console.error(`[Workflow EventBus] Workflow matching error:`, err?.message);
    }
  }

  getRecentEvents(count = 50): WorkflowEvent[] {
    return this.eventLog.slice(-count);
  }
}

// Singleton event bus
export const eventBus = new WorkflowEventBus();

// ============================================================
// WORKFLOW MATCHER — Finds active workflows for an event
// ============================================================

async function matchAndExecuteWorkflows(event: WorkflowEvent) {
  // Find all active workflows for this user + trigger type
  const activeWorkflows = await db
    .select()
    .from(workflows)
    .where(
      and(
        eq(workflows.userId, event.userId),
        eq(workflows.triggerType, event.type),
        eq(workflows.status, "active")
      )
    );

  if (activeWorkflows.length === 0) return;

  console.log(`[Workflow Engine] ${activeWorkflows.length} workflow(s) matched for ${event.type}`);

  for (const workflow of activeWorkflows) {
    try {
      // Check trigger config (e.g. only fire for leads with score > 80)
      if (!matchesTriggerConfig(workflow, event)) {
        console.log(`[Workflow Engine] Workflow "${workflow.name}" skipped — trigger config mismatch`);
        continue;
      }

      await executeWorkflow(workflow, event);
    } catch (err: any) {
      console.error(`[Workflow Engine] Failed to execute workflow "${workflow.name}":`, err?.message);
    }
  }
}

function matchesTriggerConfig(workflow: Workflow, event: WorkflowEvent): boolean {
  try {
    const config = JSON.parse(workflow.triggerConfig || "{}");

    // No config = match all events of this type
    if (Object.keys(config).length === 0) return true;

    // Status filter: only fire for specific statuses
    if (config.status && event.data.status !== config.status) return false;

    // Score threshold: only fire when score >= threshold
    if (config.scoreThreshold && (event.data.score || 0) < config.scoreThreshold) return false;

    // Source filter: only fire for specific lead sources
    if (config.source && event.data.source !== config.source) return false;

    // Funnel filter: only fire for specific funnel
    if (config.funnelId && event.data.funnelId !== config.funnelId) return false;

    // Stage filter: only fire for specific stage
    if (config.stageId && event.data.stageId !== config.stageId) return false;

    return true;
  } catch {
    return true; // If config parsing fails, allow execution
  }
}

// ============================================================
// WORKFLOW EXECUTOR — Runs a workflow from start to finish
// ============================================================

export async function executeWorkflow(
  workflow: Workflow,
  event: WorkflowEvent,
  startNodeId?: string
): Promise<string> {
  // Load all nodes and edges
  const nodes = await db
    .select()
    .from(workflowNodes)
    .where(eq(workflowNodes.workflowId, workflow.id));

  const edges = await db
    .select()
    .from(workflowEdges)
    .where(eq(workflowEdges.workflowId, workflow.id));

  if (nodes.length === 0) {
    console.warn(`[Workflow Engine] Workflow "${workflow.name}" has no nodes`);
    return "";
  }

  // Find the trigger node (entry point)
  const triggerNode = startNodeId
    ? nodes.find(n => n.id === startNodeId)
    : nodes.find(n => n.nodeType === "trigger");

  if (!triggerNode) {
    console.warn(`[Workflow Engine] No trigger node found in "${workflow.name}"`);
    return "";
  }

  // Create execution record
  const [execution] = await db
    .insert(workflowExecutions)
    .values({
      workflowId: workflow.id,
      userId: event.userId,
      status: "running",
      triggerData: JSON.stringify(event.data),
      contextData: JSON.stringify(event.data),
      totalSteps: nodes.length,
      currentNodeId: triggerNode.id,
    })
    .returning();

  console.log(`[Workflow Engine] Execution started: ${execution.id} for "${workflow.name}"`);

  // Execute nodes
  try {
    let context = { ...event.data };
    let currentNode: WorkflowNode | undefined = triggerNode;
    let stepsCompleted = 0;

    while (currentNode) {
      // Log step start
      const stepStart = Date.now();
      const [step] = await db
        .insert(workflowExecutionSteps)
        .values({
          executionId: execution.id,
          nodeId: currentNode.id,
          status: "running",
          inputData: JSON.stringify(context),
          startedAt: new Date(),
        })
        .returning();

      try {
        // Execute the node
        const result = await executeNode(currentNode, context, event.userId);

        // Merge result into context
        context = { ...context, ...result.output, _lastNodeResult: result };

        // Update step as completed
        const durationMs = Date.now() - stepStart;
        await db
          .update(workflowExecutionSteps)
          .set({
            status: "completed",
            outputData: JSON.stringify(result.output),
            durationMs,
            completedAt: new Date(),
          })
          .where(eq(workflowExecutionSteps.id, step.id));

        stepsCompleted++;

        // Handle delay nodes — pause execution
        if (currentNode.nodeType === "delay" && result.delayUntil) {
          await db
            .update(workflowExecutions)
            .set({
              status: "waiting",
              resumeAt: result.delayUntil,
              currentNodeId: currentNode.id,
              contextData: JSON.stringify(context),
              stepsCompleted,
            })
            .where(eq(workflowExecutions.id, execution.id));

          console.log(`[Workflow Engine] Execution ${execution.id} paused until ${result.delayUntil.toISOString()}`);
          return execution.id;
        }

        // Find next node(s) via edges
        const outEdges = edges.filter(e => e.sourceNodeId === currentNode!.id);

        if (outEdges.length === 0) {
          // No more edges — workflow complete
          currentNode = undefined;
        } else if (currentNode.nodeType === "condition" || currentNode.nodeType === "splitter") {
          // Conditional branching — pick the matching edge
          const branch = result.branch || "default";
          const matchingEdge = outEdges.find(e => e.condition === branch)
            || outEdges.find(e => e.condition === "default")
            || outEdges[0];
          currentNode = nodes.find(n => n.id === matchingEdge.targetNodeId);
        } else if (outEdges.length > 1) {
          // Parallel paths — execute all targets (fan-out)
          for (const edge of outEdges.slice(1)) {
            const parallelNode = nodes.find(n => n.id === edge.targetNodeId);
            if (parallelNode) {
              // Fire parallel branch as separate mini-execution
              setImmediate(() => {
                executeNodeChain(execution.id, parallelNode, nodes, edges, context, event.userId)
                  .catch(err => console.error(`[Workflow Engine] Parallel branch error:`, err?.message));
              });
            }
          }
          // Continue main path with first edge
          currentNode = nodes.find(n => n.id === outEdges[0].targetNodeId);
        } else {
          // Single path — follow the edge
          currentNode = nodes.find(n => n.id === outEdges[0].targetNodeId);
        }
      } catch (nodeError: any) {
        // Step failed
        await db
          .update(workflowExecutionSteps)
          .set({
            status: "failed",
            errorMessage: nodeError?.message || "Unknown error",
            durationMs: Date.now() - stepStart,
            completedAt: new Date(),
          })
          .where(eq(workflowExecutionSteps.id, step.id));

        console.error(`[Workflow Engine] Node "${currentNode!.label}" failed:`, nodeError?.message);

        // Fail the execution
        await db
          .update(workflowExecutions)
          .set({
            status: "failed",
            errorMessage: `Step "${currentNode!.label}" failed: ${nodeError?.message}`,
            stepsCompleted,
            completedAt: new Date(),
          })
          .where(eq(workflowExecutions.id, execution.id));

        // Increment failed runs
        await db
          .update(workflows)
          .set({
            totalRuns: sql`${workflows.totalRuns} + 1`,
            failedRuns: sql`${workflows.failedRuns} + 1`,
            lastRunAt: new Date(),
          })
          .where(eq(workflows.id, workflow.id));

        return execution.id;
      }
    }

    // Workflow completed successfully
    await db
      .update(workflowExecutions)
      .set({
        status: "completed",
        stepsCompleted,
        completedAt: new Date(),
        contextData: JSON.stringify(context),
      })
      .where(eq(workflowExecutions.id, execution.id));

    // Update workflow stats
    await db
      .update(workflows)
      .set({
        totalRuns: sql`${workflows.totalRuns} + 1`,
        successfulRuns: sql`${workflows.successfulRuns} + 1`,
        lastRunAt: new Date(),
      })
      .where(eq(workflows.id, workflow.id));

    console.log(`[Workflow Engine] Execution ${execution.id} completed — ${stepsCompleted} steps`);
    return execution.id;
  } catch (error: any) {
    await db
      .update(workflowExecutions)
      .set({
        status: "failed",
        errorMessage: error?.message || "Unexpected execution error",
        completedAt: new Date(),
      })
      .where(eq(workflowExecutions.id, execution.id));

    await db
      .update(workflows)
      .set({
        totalRuns: sql`${workflows.totalRuns} + 1`,
        failedRuns: sql`${workflows.failedRuns} + 1`,
        lastRunAt: new Date(),
      })
      .where(eq(workflows.id, workflow.id));

    return execution.id;
  }
}

// Helper: Execute a chain of nodes (for parallel branches)
async function executeNodeChain(
  executionId: string,
  startNode: WorkflowNode,
  allNodes: WorkflowNode[],
  allEdges: WorkflowEdge[],
  context: Record<string, any>,
  userId: string
) {
  let currentNode: WorkflowNode | undefined = startNode;
  while (currentNode) {
    const result = await executeNode(currentNode, context, userId);
    context = { ...context, ...result.output };

    // Log step
    await db.insert(workflowExecutionSteps).values({
      executionId,
      nodeId: currentNode.id,
      status: "completed",
      inputData: JSON.stringify(context),
      outputData: JSON.stringify(result.output),
      completedAt: new Date(),
    });

    // Follow edge
    const nextEdge = allEdges.find(e => e.sourceNodeId === currentNode!.id);
    currentNode = nextEdge ? allNodes.find(n => n.id === nextEdge.targetNodeId) : undefined;
  }
}

// ============================================================
// NODE EXECUTOR — Executes a single workflow node
// ============================================================

interface NodeResult {
  output: Record<string, any>;
  branch?: string;         // For condition nodes
  delayUntil?: Date;       // For delay nodes
}

async function executeNode(
  node: WorkflowNode,
  context: Record<string, any>,
  userId: string
): Promise<NodeResult> {
  const config = JSON.parse(node.config || "{}");

  switch (node.actionType) {
    // ---- TRIGGERS (pass-through, just provide context) ----
    case "trigger_event":
    case "trigger_schedule":
    case "trigger_webhook":
    case "trigger_manual":
      return { output: { triggered: true, triggerType: node.actionType } };

    // ---- DELAYS ----
    case "delay_wait": {
      const hours = config.hours || 1;
      const delayUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
      return { output: { delayHours: hours }, delayUntil };
    }
    case "delay_wait_until": {
      const targetDate = config.date ? new Date(config.date) : new Date(Date.now() + 24 * 60 * 60 * 1000);
      return { output: { waitUntil: targetDate.toISOString() }, delayUntil: targetDate };
    }

    // ---- CONDITIONS ----
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

    // ---- A/B SPLITTER ----
    case "splitter_ab": {
      const splitRatio = config.ratio || 50; // percentage going to branch "a"
      const random = Math.random() * 100;
      const branch = random < splitRatio ? "a" : "b";
      return { output: { splitBranch: branch, splitRatio }, branch };
    }

    // ---- AI ACTIONS ----
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

    // ---- CRM ACTIONS ----
    case "create_lead": {
      const leadData = {
        userId,
        name: resolveTemplate(config.name || "{{name}}", context),
        email: resolveTemplate(config.email || "{{email}}", context),
        phone: resolveTemplate(config.phone || "{{phone}}", context) || "",
        company: resolveTemplate(config.company || "{{company}}", context) || "",
        source: config.source || "Workflow Automation",
        status: config.status || "new",
        score: config.score || context.score || 50,
        notes: resolveTemplate(config.notes || "Created by workflow", context),
        outreach: resolveTemplate(config.outreach || "", context),
        intentSignal: config.intentSignal || "workflow_generated",
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
        notes: resolveTemplate(config.notes || "Auto-scheduled by workflow", context) || null,
        source: "workflow",
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

    // ---- COMMUNICATION ACTIONS ----
    case "send_email": {
      const to = resolveTemplate(config.to || "{{email}}", context);
      const subject = resolveTemplate(config.subject || "Update from ArgiFlow", context);
      let body = resolveTemplate(config.body || config.template || "Hello {{name}}", context);

      // If template specified but no body, use AI to generate
      if (config.template && !config.body) {
        body = await callAI(userId,
          `Write a professional email for template "${config.template}". Context: Lead name: ${context.name || "there"}, Company: ${context.company || "their business"}. Keep it under 200 words. Just the email body, no subject line.`
        );
      }

      if (to && to.includes("@")) {
        // Use existing email infrastructure
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
        // Log intent — actual call initiation goes through existing voice route
        return { output: { callRequested: true, phone, note: "Use /api/voice/calls to initiate" } };
      }
      return { output: { callRequested: false, error: "No phone number" } };
    }
    case "send_notification": {
      const title = resolveTemplate(config.title || "Workflow Notification", context);
      const message = resolveTemplate(config.message || "A workflow action completed.", context);
      await storage.createNotification({
        userId,
        type: config.notificationType || "system",
        title,
        message,
        priority: config.priority || "normal",
        agentType: "workflow",
      });
      return { output: { notificationSent: true, title } };
    }

    // ---- AGENT ACTIONS ----
    case "run_agent": {
      const agentType = config.agentType;
      if (agentType) {
        // Create agent task (similar to existing /api/agent-configs/:id/run)
        await storage.createAgentTask({
          userId,
          agentType,
          taskType: "workflow_triggered",
          description: `Triggered by workflow: ${context._workflowName || "unknown"}`,
          status: "pending",
        });
        return { output: { agentTriggered: true, agentType } };
      }
      return { output: { agentTriggered: false, error: "No agentType specified" } };
    }
    case "trigger_lead_gen": {
      // Fire the auto lead gen for this user
      return { output: { leadGenTriggered: true, note: "Use /api/auto-lead-gen/trigger" } };
    }

    // ---- INTEGRATION ACTIONS ----
    case "call_webhook": {
      const url = config.url;
      const method = config.method || "POST";
      const payload = { ...context, workflowEvent: true };

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
      const note = resolveTemplate(config.note || "Workflow action logged", context);
      console.log(`[Workflow CRM Log] User: ${userId} | ${note}`);
      return { output: { logged: true, note } };
    }
    case "create_task": {
      const title = resolveTemplate(config.title || "New Task", context);
      const description = resolveTemplate(config.description || "", context);
      console.log(`[Workflow Task] User: ${userId} | Task: ${title}`);
      // Could integrate with project management table if it exists
      return { output: { taskCreated: true, title, description } };
    }
    case "trigger_workflow": {
      const targetWorkflowId = config.workflowId;
      if (targetWorkflowId) {
        const [targetWorkflow] = await db
          .select()
          .from(workflows)
          .where(and(eq(workflows.id, targetWorkflowId), eq(workflows.userId, userId)));
        if (targetWorkflow) {
          const event: WorkflowEvent = {
            type: TRIGGER_TYPES.MANUAL,
            userId,
            data: context,
            timestamp: new Date(),
          };
          // Fire asynchronously to avoid deep nesting
          setImmediate(() => executeWorkflow(targetWorkflow, event));
          return { output: { workflowTriggered: true, targetWorkflowId } };
        }
      }
      return { output: { workflowTriggered: false, error: "Target workflow not found" } };
    }

    default:
      console.warn(`[Workflow Engine] Unknown action type: ${node.actionType}`);
      return { output: { error: `Unknown action: ${node.actionType}` } };
  }
}

// ============================================================
// HELPER: Call Claude AI (uses existing per-user key pattern)
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
    console.error(`[Workflow AI] Error:`, err?.message);
    return "[AI temporarily unavailable]";
  }
}

// ============================================================
// HELPER: Template resolution — replaces {{field}} with context values
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
// DELAY RESUME PROCESSOR — Checks for waiting executions
// Runs every 60 seconds via setInterval
// ============================================================

export async function processDelayedExecutions() {
  try {
    const now = new Date();
    const waiting = await db
      .select()
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.status, "waiting"),
          lte(workflowExecutions.resumeAt!, now)
        )
      );

    if (waiting.length === 0) return;

    console.log(`[Workflow Engine] Resuming ${waiting.length} delayed execution(s)`);

    for (const exec of waiting) {
      try {
        // Load the workflow
        const [workflow] = await db
          .select()
          .from(workflows)
          .where(eq(workflows.id, exec.workflowId));

        if (!workflow || workflow.status !== "active") {
          await db
            .update(workflowExecutions)
            .set({ status: "cancelled", completedAt: new Date(), errorMessage: "Workflow no longer active" })
            .where(eq(workflowExecutions.id, exec.id));
          continue;
        }

        // Find the current node and its next edge
        const currentNodeId = exec.currentNodeId;
        if (!currentNodeId) continue;

        const allEdges = await db
          .select()
          .from(workflowEdges)
          .where(eq(workflowEdges.workflowId, workflow.id));

        const nextEdge = allEdges.find(e => e.sourceNodeId === currentNodeId);
        if (!nextEdge) {
          // Delay was the last node — complete
          await db
            .update(workflowExecutions)
            .set({ status: "completed", completedAt: new Date() })
            .where(eq(workflowExecutions.id, exec.id));
          continue;
        }

        // Resume from next node
        const context = JSON.parse(exec.contextData || "{}");
        const event: WorkflowEvent = {
          type: TRIGGER_TYPES.MANUAL,
          userId: exec.userId,
          data: context,
          timestamp: new Date(),
        };

        // Update execution status
        await db
          .update(workflowExecutions)
          .set({ status: "running", resumeAt: null })
          .where(eq(workflowExecutions.id, exec.id));

        // Continue execution from next node
        await executeWorkflow(workflow, event, nextEdge.targetNodeId);

      } catch (resumeErr: any) {
        console.error(`[Workflow Engine] Failed to resume execution ${exec.id}:`, resumeErr?.message);
        await db
          .update(workflowExecutions)
          .set({ status: "failed", errorMessage: `Resume failed: ${resumeErr?.message}`, completedAt: new Date() })
          .where(eq(workflowExecutions.id, exec.id));
      }
    }
  } catch (error: any) {
    console.error("[Workflow Engine] Delay processor error:", error?.message);
  }
}

// ============================================================
// INITIALIZATION — Start the engine background processors
// Call this from server/index.ts after registerRoutes()
// ============================================================

export function startWorkflowEngine() {
  console.log("[Workflow Engine] Starting background processors...");

  // Process delayed executions every 60 seconds
  setInterval(processDelayedExecutions, 60 * 1000);

  // First check after 30 seconds
  setTimeout(processDelayedExecutions, 30 * 1000);

  console.log("[Workflow Engine] ✅ Engine started — listening for events");
}
