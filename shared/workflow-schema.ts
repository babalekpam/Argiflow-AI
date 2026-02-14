// ============================================================
// ARGILETTE WORKFLOW ENGINE — DATABASE SCHEMA
// Drop this into: shared/workflow-schema.ts
// Then add: export * from "./workflow-schema"; to shared/schema.ts
// Run: npm run db:push to create tables
// ============================================================

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// WORKFLOWS — The master workflow definition
// ============================================================

export const workflows = pgTable("workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  // What fires this workflow
  triggerType: text("trigger_type").notNull(),
  // JSON config for the trigger (e.g. which lead status, which event type)
  triggerConfig: text("trigger_config").default("{}"),
  // Active, paused, draft
  status: text("status").notNull().default("draft"),
  // How many times it has executed
  totalRuns: integer("total_runs").default(0),
  successfulRuns: integer("successful_runs").default(0),
  failedRuns: integer("failed_runs").default(0),
  lastRunAt: timestamp("last_run_at"),
  // Optional: tag/category for organization
  category: text("category"),
  // Version tracking (increment on each edit)
  version: integer("version").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({ id: true, createdAt: true, updatedAt: true });
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

// ============================================================
// WORKFLOW NODES — Individual steps in a workflow
// Each node is a trigger, condition, action, or delay
// ============================================================

export const workflowNodes = pgTable("workflow_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id").notNull(),
  // Type: trigger | condition | action | delay | ai_classifier | splitter
  nodeType: text("node_type").notNull(),
  // Specific action: send_email, send_sms, create_lead, ai_generate, wait_delay, etc.
  actionType: text("action_type").notNull(),
  // Human-readable label for the UI
  label: text("label").notNull(),
  // JSON configuration for this node
  config: text("config").default("{}"),
  // Position in visual editor (x,y)
  positionX: integer("position_x").default(0),
  positionY: integer("position_y").default(0),
  // Execution order (for linear workflows, optional)
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWorkflowNodeSchema = createInsertSchema(workflowNodes).omit({ id: true, createdAt: true });
export type WorkflowNode = typeof workflowNodes.$inferSelect;
export type InsertWorkflowNode = z.infer<typeof insertWorkflowNodeSchema>;

// ============================================================
// WORKFLOW EDGES — Connections between nodes
// Defines the flow: "after node A, go to node B"
// Supports conditional branching (if condition met → B, else → C)
// ============================================================

export const workflowEdges = pgTable("workflow_edges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id").notNull(),
  sourceNodeId: varchar("source_node_id").notNull(),
  targetNodeId: varchar("target_node_id").notNull(),
  // For conditional branches: "true", "false", "default", or a specific value
  condition: text("condition").default("default"),
  // Label shown on the edge in the UI
  label: text("label"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWorkflowEdgeSchema = createInsertSchema(workflowEdges).omit({ id: true, createdAt: true });
export type WorkflowEdge = typeof workflowEdges.$inferSelect;
export type InsertWorkflowEdge = z.infer<typeof insertWorkflowEdgeSchema>;

// ============================================================
// WORKFLOW EXECUTIONS — Each time a workflow runs
// ============================================================

export const workflowExecutions = pgTable("workflow_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id").notNull(),
  userId: varchar("user_id").notNull(),
  // running | completed | failed | cancelled | waiting (for delays)
  status: text("status").notNull().default("running"),
  // What triggered this execution (JSON: event type, entity id, etc.)
  triggerData: text("trigger_data").default("{}"),
  // Context data that flows through the workflow (enriched at each step)
  contextData: text("context_data").default("{}"),
  // Results summary
  stepsCompleted: integer("steps_completed").default(0),
  totalSteps: integer("total_steps").default(0),
  errorMessage: text("error_message"),
  // If waiting on a delay, when to resume
  resumeAt: timestamp("resume_at"),
  // The node currently being executed or waiting at
  currentNodeId: varchar("current_node_id"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions).omit({ id: true, startedAt: true });
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>;

// ============================================================
// WORKFLOW EXECUTION STEPS — Detailed log of each node execution
// ============================================================

export const workflowExecutionSteps = pgTable("workflow_execution_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  executionId: varchar("execution_id").notNull(),
  nodeId: varchar("node_id").notNull(),
  // pending | running | completed | failed | skipped
  status: text("status").notNull().default("pending"),
  // Input data for this step
  inputData: text("input_data").default("{}"),
  // Output data from this step (feeds into next step)
  outputData: text("output_data").default("{}"),
  // Error details if failed
  errorMessage: text("error_message"),
  // Duration in ms
  durationMs: integer("duration_ms").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWorkflowExecutionStepSchema = createInsertSchema(workflowExecutionSteps).omit({ id: true, createdAt: true });
export type WorkflowExecutionStep = typeof workflowExecutionSteps.$inferSelect;
export type InsertWorkflowExecutionStep = z.infer<typeof insertWorkflowExecutionStepSchema>;

// ============================================================
// TRIGGER TYPES — All events that can fire a workflow
// Maps to existing ARGILETTE platform events
// ============================================================

export const TRIGGER_TYPES = {
  // Lead events
  LEAD_CREATED: "lead_created",
  LEAD_STATUS_CHANGED: "lead_status_changed",
  LEAD_SCORE_THRESHOLD: "lead_score_threshold",
  LEAD_EMAIL_OPENED: "lead_email_opened",
  LEAD_EMAIL_CLICKED: "lead_email_clicked",
  LEAD_ENGAGEMENT_HOT: "lead_engagement_hot",

  // Appointment events
  APPOINTMENT_BOOKED: "appointment_booked",
  APPOINTMENT_COMPLETED: "appointment_completed",
  APPOINTMENT_CANCELLED: "appointment_cancelled",

  // Funnel events
  DEAL_CREATED: "deal_created",
  DEAL_STAGE_CHANGED: "deal_stage_changed",
  DEAL_WON: "deal_won",
  DEAL_LOST: "deal_lost",

  // Agent events
  AGENT_RUN_COMPLETED: "agent_run_completed",
  AGENT_LEADS_FOUND: "agent_leads_found",

  // Communication events
  INBOUND_SMS: "inbound_sms",
  VOICE_CALL_COMPLETED: "voice_call_completed",
  CHAT_MESSAGE_RECEIVED: "chat_message_received",

  // System events
  WEBHOOK_RECEIVED: "webhook_received",
  SCHEDULED: "scheduled",
  MANUAL: "manual",

  // Discovery/signup events
  DISCOVERY_SUBMITTED: "discovery_submitted",
  USER_REGISTERED: "user_registered",
} as const;

export type TriggerType = (typeof TRIGGER_TYPES)[keyof typeof TRIGGER_TYPES];

// ============================================================
// ACTION TYPES — All actions a workflow node can perform
// Maps to existing ARGILETTE platform capabilities
// ============================================================

export const ACTION_TYPES = {
  // Triggers (node_type = "trigger")
  TRIGGER_EVENT: "trigger_event",
  TRIGGER_SCHEDULE: "trigger_schedule",
  TRIGGER_WEBHOOK: "trigger_webhook",
  TRIGGER_MANUAL: "trigger_manual",

  // Flow control (node_type = "condition" | "delay" | "splitter")
  CONDITION_IF: "condition_if",
  CONDITION_SWITCH: "condition_switch",
  DELAY_WAIT: "delay_wait",
  DELAY_WAIT_UNTIL: "delay_wait_until",
  SPLITTER_AB: "splitter_ab",

  // AI (node_type = "action")
  AI_CLASSIFY: "ai_classify",
  AI_GENERATE_CONTENT: "ai_generate_content",
  AI_SCORE_LEAD: "ai_score_lead",
  AI_SUMMARIZE: "ai_summarize",
  AI_EXTRACT: "ai_extract",

  // CRM actions
  CREATE_LEAD: "create_lead",
  UPDATE_LEAD: "update_lead",
  CREATE_APPOINTMENT: "create_appointment",
  MOVE_DEAL: "move_deal",
  CREATE_FUNNEL_DEAL: "create_funnel_deal",
  UPDATE_STATS: "update_stats",

  // Communication actions
  SEND_EMAIL: "send_email",
  SEND_SMS: "send_sms",
  MAKE_VOICE_CALL: "make_voice_call",
  SEND_NOTIFICATION: "send_notification",

  // Agent actions
  RUN_AGENT: "run_agent",
  TRIGGER_LEAD_GEN: "trigger_lead_gen",

  // Integration actions
  CALL_WEBHOOK: "call_webhook",
  LOG_TO_CRM: "log_to_crm",
  CREATE_TASK: "create_task",

  // Workflow actions
  TRIGGER_WORKFLOW: "trigger_workflow",
} as const;

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];

// ============================================================
// WORKFLOW TEMPLATES — Pre-built workflows users can activate
// ============================================================

export interface WorkflowTemplate {
  key: string;
  name: string;
  description: string;
  category: string;
  triggerType: TriggerType;
  nodes: Omit<InsertWorkflowNode, "workflowId">[];
  edges: { sourceIndex: number; targetIndex: number; condition?: string }[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    key: "lead-capture-nurture",
    name: "Lead Capture → Nurture Sequence",
    description: "When a new lead is created, AI scores them, routes hot leads to immediate outreach, and starts a nurture drip for warm leads.",
    category: "Lead Management",
    triggerType: TRIGGER_TYPES.LEAD_CREATED,
    nodes: [
      { nodeType: "trigger", actionType: "trigger_event", label: "New Lead Created", config: "{}", positionX: 100, positionY: 200, sortOrder: 0 },
      { nodeType: "action", actionType: "ai_score_lead", label: "AI Lead Scoring", config: "{\"model\":\"intent_based\"}", positionX: 350, positionY: 200, sortOrder: 1 },
      { nodeType: "condition", actionType: "condition_switch", label: "Route by Score", config: "{\"field\":\"score\",\"rules\":[{\"op\":\"gte\",\"value\":80,\"branch\":\"hot\"},{\"op\":\"gte\",\"value\":50,\"branch\":\"warm\"}]}", positionX: 600, positionY: 200, sortOrder: 2 },
      { nodeType: "action", actionType: "send_email", label: "Send Hot Outreach", config: "{\"template\":\"hot_lead_immediate\",\"priority\":\"high\"}", positionX: 850, positionY: 100, sortOrder: 3 },
      { nodeType: "action", actionType: "send_notification", label: "Alert: Hot Lead!", config: "{\"priority\":\"high\",\"title\":\"🔥 Hot Lead Detected\"}", positionX: 1100, positionY: 100, sortOrder: 4 },
      { nodeType: "delay", actionType: "delay_wait", label: "Wait 2 Days", config: "{\"hours\":48}", positionX: 850, positionY: 300, sortOrder: 5 },
      { nodeType: "action", actionType: "send_email", label: "Send Warm Nurture #1", config: "{\"template\":\"warm_nurture_1\"}", positionX: 1100, positionY: 300, sortOrder: 6 },
      { nodeType: "action", actionType: "log_to_crm", label: "Log Cold to CRM", config: "{\"status\":\"cold\",\"note\":\"Low score — added to cold pool\"}", positionX: 850, positionY: 500, sortOrder: 7 },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2 },
      { sourceIndex: 2, targetIndex: 3, condition: "hot" },
      { sourceIndex: 3, targetIndex: 4 },
      { sourceIndex: 2, targetIndex: 5, condition: "warm" },
      { sourceIndex: 5, targetIndex: 6 },
      { sourceIndex: 2, targetIndex: 7, condition: "default" },
    ],
  },
  {
    key: "email-engagement-escalator",
    name: "Email Engagement → Escalation",
    description: "When a lead opens an email or clicks a link, automatically escalate their status, notify the team, and trigger follow-up.",
    category: "Email Automation",
    triggerType: TRIGGER_TYPES.LEAD_EMAIL_CLICKED,
    nodes: [
      { nodeType: "trigger", actionType: "trigger_event", label: "Email Link Clicked", config: "{}", positionX: 100, positionY: 200, sortOrder: 0 },
      { nodeType: "action", actionType: "update_lead", label: "Set Status → Hot", config: "{\"status\":\"hot\",\"engagementLevel\":\"hot\"}", positionX: 350, positionY: 200, sortOrder: 1 },
      { nodeType: "action", actionType: "send_notification", label: "Notify Team", config: "{\"title\":\"Lead clicked email link!\",\"priority\":\"high\"}", positionX: 600, positionY: 200, sortOrder: 2 },
      { nodeType: "delay", actionType: "delay_wait", label: "Wait 1 Hour", config: "{\"hours\":1}", positionX: 850, positionY: 200, sortOrder: 3 },
      { nodeType: "action", actionType: "send_sms", label: "Send SMS Follow-up", config: "{\"template\":\"hot_lead_sms\"}", positionX: 1100, positionY: 200, sortOrder: 4 },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2 },
      { sourceIndex: 2, targetIndex: 3 },
      { sourceIndex: 3, targetIndex: 4 },
    ],
  },
  {
    key: "appointment-booked-onboarding",
    name: "Appointment Booked → Onboarding Flow",
    description: "When an appointment is booked, send confirmation, create a project task, and start the onboarding sequence.",
    category: "Client Onboarding",
    triggerType: TRIGGER_TYPES.APPOINTMENT_BOOKED,
    nodes: [
      { nodeType: "trigger", actionType: "trigger_event", label: "Appointment Booked", config: "{}", positionX: 100, positionY: 200, sortOrder: 0 },
      { nodeType: "action", actionType: "send_email", label: "Send Confirmation", config: "{\"template\":\"appointment_confirmation\"}", positionX: 350, positionY: 200, sortOrder: 1 },
      { nodeType: "action", actionType: "send_sms", label: "SMS Reminder", config: "{\"template\":\"appointment_reminder_sms\"}", positionX: 600, positionY: 200, sortOrder: 2 },
      { nodeType: "action", actionType: "create_task", label: "Create Onboarding Task", config: "{\"title\":\"Prepare for discovery call\",\"assignee\":\"auto\"}", positionX: 850, positionY: 200, sortOrder: 3 },
      { nodeType: "action", actionType: "update_lead", label: "Move to Qualified", config: "{\"status\":\"qualified\"}", positionX: 1100, positionY: 200, sortOrder: 4 },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2 },
      { sourceIndex: 2, targetIndex: 3 },
      { sourceIndex: 3, targetIndex: 4 },
    ],
  },
  {
    key: "deal-won-billing-pipeline",
    name: "Deal Won → Invoice & Project Setup",
    description: "When a deal is marked as won, create an invoice, set up the project, send a welcome email, and notify the team.",
    category: "Revenue",
    triggerType: TRIGGER_TYPES.DEAL_WON,
    nodes: [
      { nodeType: "trigger", actionType: "trigger_event", label: "Deal Won", config: "{}", positionX: 100, positionY: 200, sortOrder: 0 },
      { nodeType: "action", actionType: "send_email", label: "Welcome Email", config: "{\"template\":\"deal_won_welcome\"}", positionX: 350, positionY: 150, sortOrder: 1 },
      { nodeType: "action", actionType: "create_task", label: "Setup Project", config: "{\"title\":\"Client onboarding project\",\"steps\":[\"Kickoff call\",\"Data gathering\",\"System setup\",\"Go-live\"]}", positionX: 350, positionY: 350, sortOrder: 2 },
      { nodeType: "action", actionType: "send_notification", label: "Notify Team: New Client!", config: "{\"title\":\"🎉 New client signed!\",\"priority\":\"high\"}", positionX: 600, positionY: 200, sortOrder: 3 },
      { nodeType: "action", actionType: "log_to_crm", label: "Log Revenue", config: "{\"type\":\"revenue_event\"}", positionX: 850, positionY: 200, sortOrder: 4 },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 0, targetIndex: 2 },
      { sourceIndex: 1, targetIndex: 3 },
      { sourceIndex: 2, targetIndex: 3 },
      { sourceIndex: 3, targetIndex: 4 },
    ],
  },
  {
    key: "ai-content-pipeline",
    name: "AI Content Generation Pipeline",
    description: "Scheduled content creation: AI generates blog posts, social content, and emails, then distributes them.",
    category: "Marketing",
    triggerType: TRIGGER_TYPES.SCHEDULED,
    nodes: [
      { nodeType: "trigger", actionType: "trigger_schedule", label: "Every Monday 9 AM", config: "{\"cron\":\"0 9 * * 1\"}", positionX: 100, positionY: 200, sortOrder: 0 },
      { nodeType: "action", actionType: "ai_generate_content", label: "Generate Blog Post", config: "{\"type\":\"blog\",\"topic\":\"industry_trends\"}", positionX: 350, positionY: 200, sortOrder: 1 },
      { nodeType: "action", actionType: "ai_generate_content", label: "Generate Social Posts", config: "{\"type\":\"social\",\"platforms\":[\"linkedin\",\"twitter\"]}", positionX: 600, positionY: 100, sortOrder: 2 },
      { nodeType: "action", actionType: "ai_generate_content", label: "Generate Newsletter", config: "{\"type\":\"email\",\"template\":\"weekly_newsletter\"}", positionX: 600, positionY: 300, sortOrder: 3 },
      { nodeType: "action", actionType: "send_notification", label: "Content Ready", config: "{\"title\":\"📝 Weekly content ready for review\"}", positionX: 850, positionY: 200, sortOrder: 4 },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2 },
      { sourceIndex: 1, targetIndex: 3 },
      { sourceIndex: 2, targetIndex: 4 },
      { sourceIndex: 3, targetIndex: 4 },
    ],
  },
  {
    key: "reputation-review-engine",
    name: "Service Complete → Review Request",
    description: "After an appointment is completed, wait 24 hours then request a review. If positive sentiment detected, auto-share.",
    category: "Reputation",
    triggerType: TRIGGER_TYPES.APPOINTMENT_COMPLETED,
    nodes: [
      { nodeType: "trigger", actionType: "trigger_event", label: "Appointment Completed", config: "{}", positionX: 100, positionY: 200, sortOrder: 0 },
      { nodeType: "delay", actionType: "delay_wait", label: "Wait 24 Hours", config: "{\"hours\":24}", positionX: 350, positionY: 200, sortOrder: 1 },
      { nodeType: "action", actionType: "send_email", label: "Request Review", config: "{\"template\":\"review_request\"}", positionX: 600, positionY: 200, sortOrder: 2 },
      { nodeType: "action", actionType: "send_sms", label: "SMS Review Nudge", config: "{\"template\":\"review_sms_nudge\"}", positionX: 850, positionY: 200, sortOrder: 3 },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1 },
      { sourceIndex: 1, targetIndex: 2 },
      { sourceIndex: 2, targetIndex: 3 },
    ],
  },
];
