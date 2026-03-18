import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const businessManager = pgTable("business_manager", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  agentName: text("agent_name").default("AI Business Manager"),
  businessContext: text("business_context"),
  goals: jsonb("goals").$type<string[]>(),
  personality: text("personality").default("professional"),
  autonomyLevel: text("autonomy_level").notNull().default("moderate"),
  activeCapabilities: jsonb("active_capabilities").$type<string[]>().default(sql`'["lead_generation","email_outreach","follow_ups","pipeline_management","marketing","analytics_review","inbox_management"]'::jsonb`),
  workingHours: text("working_hours").default("24/7"),
  dailyBudgetCredits: integer("daily_budget_credits").default(500),
  creditsUsedToday: integer("credits_used_today").default(0),
  lastBudgetReset: timestamp("last_budget_reset").defaultNow(),
  totalDecisions: integer("total_decisions").default(0),
  totalActions: integer("total_actions").default(0),
  totalLeadsGenerated: integer("total_leads_generated").default(0),
  totalEmailsSent: integer("total_emails_sent").default(0),
  totalMeetingsBooked: integer("total_meetings_booked").default(0),
  totalRevenue: real("total_revenue").default(0),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  status: text("status").notNull().default("idle"),
  currentThought: text("current_thought"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const managerDecisions = pgTable("manager_decisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  category: text("category").notNull(),
  decision: text("decision").notNull(),
  reasoning: text("reasoning"),
  actionsTaken: jsonb("actions_taken").$type<Array<{ type: string; detail: string; result?: string }>>(),
  impact: text("impact"),
  priority: text("priority").default("medium"),
  status: text("status").notNull().default("completed"),
  creditsUsed: integer("credits_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const managerDailyReports = pgTable("manager_daily_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  reportDate: text("report_date").notNull(),
  summary: text("summary").notNull(),
  decisionsCount: integer("decisions_count").default(0),
  actionsCount: integer("actions_count").default(0),
  leadsGenerated: integer("leads_generated").default(0),
  emailsSent: integer("emails_sent").default(0),
  meetingsBooked: integer("meetings_booked").default(0),
  highlights: jsonb("highlights").$type<string[]>(),
  recommendations: jsonb("recommendations").$type<string[]>(),
  pipelineHealth: jsonb("pipeline_health").$type<{ total: number; hot: number; warm: number; cold: number; converted: number }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBusinessManagerSchema = createInsertSchema(businessManager).omit({ id: true, createdAt: true, updatedAt: true });
export type BusinessManagerConfig = typeof businessManager.$inferSelect;
export type InsertBusinessManagerConfig = z.infer<typeof insertBusinessManagerSchema>;

export const insertManagerDecisionSchema = createInsertSchema(managerDecisions).omit({ id: true, createdAt: true });
export type ManagerDecision = typeof managerDecisions.$inferSelect;
export type InsertManagerDecision = z.infer<typeof insertManagerDecisionSchema>;

export const insertManagerDailyReportSchema = createInsertSchema(managerDailyReports).omit({ id: true, createdAt: true });
export type ManagerDailyReport = typeof managerDailyReports.$inferSelect;
export type InsertManagerDailyReport = z.infer<typeof insertManagerDailyReportSchema>;
