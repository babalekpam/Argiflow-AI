import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  source: text("source").notNull(),
  status: text("status").notNull().default("new"),
  score: integer("score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  leadName: text("lead_name").notNull(),
  type: text("type").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiAgents = pgTable("ai_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("active"),
  tasksCompleted: integer("tasks_completed").default(0),
  successRate: real("success_rate").default(0),
  description: text("description"),
  script: text("script"),
  workflowSteps: text("workflow_steps"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dashboardStats = pgTable("dashboard_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  totalLeads: integer("total_leads").default(0),
  activeLeads: integer("active_leads").default(0),
  appointmentsBooked: integer("appointments_booked").default(0),
  conversionRate: real("conversion_rate").default(0),
  revenue: real("revenue").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  aiAutoRespond: boolean("ai_auto_respond").default(true),
  leadScoring: boolean("lead_scoring").default(true),
  appointmentReminders: boolean("appointment_reminders").default(true),
  weeklyReport: boolean("weekly_report").default(true),
  darkMode: boolean("dark_mode").default(true),
  twoFactorAuth: boolean("two_factor_auth").default(false),
  sendgridApiKey: text("sendgrid_api_key"),
  twilioAccountSid: text("twilio_account_sid"),
  twilioAuthToken: text("twilio_auth_token"),
  twilioPhoneNumber: text("twilio_phone_number"),
  grasshopperNumber: text("grasshopper_number"),
  calendarLink: text("calendar_link"),
  webhookUrl: text("webhook_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const marketingStrategies = pgTable("marketing_strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  companyName: text("company_name").notNull(),
  industry: text("industry").notNull(),
  strategy: text("strategy").notNull(),
  status: text("status").notNull().default("generating"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiChatMessages = pgTable("ai_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ id: true, updatedAt: true });
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export const insertAiChatMessageSchema = createInsertSchema(aiChatMessages).omit({ id: true, createdAt: true });
export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type InsertAiChatMessage = z.infer<typeof insertAiChatMessageSchema>;

export const insertMarketingStrategySchema = createInsertSchema(marketingStrategies).omit({ id: true, createdAt: true, updatedAt: true });
export type MarketingStrategy = typeof marketingStrategies.$inferSelect;
export type InsertMarketingStrategy = z.infer<typeof insertMarketingStrategySchema>;

export const funnels = pgTable("funnels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const funnelStages = pgTable("funnel_stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  funnelId: varchar("funnel_id").notNull(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  color: text("color").notNull().default("#6366f1"),
});

export const funnelDeals = pgTable("funnel_deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  funnelId: varchar("funnel_id").notNull(),
  stageId: varchar("stage_id").notNull(),
  userId: varchar("user_id").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email"),
  value: real("value").default(0),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFunnelSchema = createInsertSchema(funnels).omit({ id: true, createdAt: true });
export type Funnel = typeof funnels.$inferSelect;
export type InsertFunnel = z.infer<typeof insertFunnelSchema>;

export const insertFunnelStageSchema = createInsertSchema(funnelStages).omit({ id: true });
export type FunnelStage = typeof funnelStages.$inferSelect;
export type InsertFunnelStage = z.infer<typeof insertFunnelStageSchema>;

export const insertFunnelDealSchema = createInsertSchema(funnelDeals).omit({ id: true, createdAt: true });
export type FunnelDeal = typeof funnelDeals.$inferSelect;
export type InsertFunnelDeal = z.infer<typeof insertFunnelDealSchema>;

export const websiteProfiles = pgTable("website_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  websiteUrl: text("website_url").notNull(),
  services: text("services"),
  valuePropositions: text("value_propositions"),
  targetAudience: text("target_audience"),
  pricing: text("pricing"),
  faqs: text("faqs"),
  contactInfo: text("contact_info"),
  rawSummary: text("raw_summary"),
  status: text("status").notNull().default("training"),
  trainedAt: timestamp("trained_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWebsiteProfileSchema = createInsertSchema(websiteProfiles).omit({ id: true, createdAt: true });
export type WebsiteProfile = typeof websiteProfiles.$inferSelect;
export type InsertWebsiteProfile = z.infer<typeof insertWebsiteProfileSchema>;

export const insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true });
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true });
export const insertAiAgentSchema = createInsertSchema(aiAgents).omit({ id: true, createdAt: true });
export const insertDashboardStatsSchema = createInsertSchema(dashboardStats).omit({ id: true, updatedAt: true });

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type AiAgent = typeof aiAgents.$inferSelect;
export type InsertAiAgent = z.infer<typeof insertAiAgentSchema>;
export type DashboardStats = typeof dashboardStats.$inferSelect;
export type InsertDashboardStats = z.infer<typeof insertDashboardStatsSchema>;
