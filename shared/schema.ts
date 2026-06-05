import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, timestamp, boolean, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

// ============================================================
// Core: Businesses
// ============================================================

export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  industry: text("industry"),
  description: text("description"),
  color: text("color").notNull().default("#38bdf8"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({ id: true, createdAt: true });
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;

// ============================================================
// Core: Leads — with DB indexes on hot-query columns
// ============================================================

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  businessId: varchar("business_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  source: text("source").notNull(),
  status: text("status").notNull().default("new"),
  score: integer("score").default(0),
  notes: text("notes"),
  outreach: text("outreach"),
  intentSignal: text("intent_signal"),
  outreachSentAt: timestamp("outreach_sent_at"),
  scheduledSendAt: timestamp("scheduled_send_at"),
  engagementScore: integer("engagement_score").default(0),
  engagementLevel: text("engagement_level").default("none"),
  lastEngagedAt: timestamp("last_engaged_at"),
  emailOpens: integer("email_opens").default(0),
  emailClicks: integer("email_clicks").default(0),
  nextStep: text("next_step"),
  followUpStep: integer("follow_up_step").default(0),
  followUpStatus: text("follow_up_status").default("none"),
  followUpNextAt: timestamp("follow_up_next_at"),
  followUpLastSentAt: timestamp("follow_up_last_sent_at"),
  address: text("address"),
  companyResearch: text("company_research"),
  companyResearchedAt: timestamp("company_researched_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("leads_user_id_idx").on(table.userId),
  index("leads_scheduled_send_idx").on(table.scheduledSendAt),
  index("leads_follow_up_idx").on(table.followUpStatus, table.followUpNextAt),
]);

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true });
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

// ============================================================
// Core: Appointments
// ============================================================

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  leadName: text("lead_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  type: text("type").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true });
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

// ============================================================
// Core: AI Agents
// ============================================================

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

export const insertAiAgentSchema = createInsertSchema(aiAgents).omit({ id: true, createdAt: true });
export type AiAgent = typeof aiAgents.$inferSelect;
export type InsertAiAgent = z.infer<typeof insertAiAgentSchema>;

// ============================================================
// Core: Dashboard Stats
// ============================================================

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

export const insertDashboardStatsSchema = createInsertSchema(dashboardStats).omit({ id: true, updatedAt: true });
export type DashboardStats = typeof dashboardStats.$inferSelect;
export type InsertDashboardStats = z.infer<typeof insertDashboardStatsSchema>;

// ============================================================
// Core: Admins
// ============================================================

export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true });
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

// ============================================================
// Core: User Settings
// ============================================================

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
  senderEmail: text("sender_email"),
  emailProvider: text("email_provider").default("sendgrid"),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUsername: text("smtp_username"),
  smtpPassword: text("smtp_password"),
  smtpSecure: boolean("smtp_secure").default(true),
  twilioAccountSid: text("twilio_account_sid"),
  twilioAuthToken: text("twilio_auth_token"),
  twilioPhoneNumber: text("twilio_phone_number"),
  grasshopperNumber: text("grasshopper_number"),
  calendarLink: text("calendar_link"),
  webhookUrl: text("webhook_url"),
  anthropicApiKey: text("anthropic_api_key"),
  openaiApiKey: text("openai_api_key"),
  geminiApiKey: text("gemini_api_key"),
  mistralApiKey: text("mistral_api_key"),
  groqApiKey: text("groq_api_key"),
  togetherApiKey: text("together_api_key"),
  cohereApiKey: text("cohere_api_key"),
  openrouterApiKey: text("openrouter_api_key"),
  preferredAiProvider: text("preferred_ai_provider").default("auto"),
  preferredAiModel: text("preferred_ai_model"),
  youApiKey: text("you_api_key"),
  webSearchProvider: text("web_search_provider").default("claude"),
  autoLeadGenEnabled: boolean("auto_lead_gen_enabled").default(false),
  linkedinProfileUrl: text("linkedin_profile_url"),
  linkedinEmail: text("linkedin_email"),
  linkedinConnected: boolean("linkedin_connected").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ id: true, updatedAt: true });
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

// ============================================================
// Core: AI Chat Messages
// ============================================================

export const aiChatMessages = pgTable("ai_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAiChatMessageSchema = createInsertSchema(aiChatMessages).omit({ id: true, createdAt: true });
export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type InsertAiChatMessage = z.infer<typeof insertAiChatMessageSchema>;

// ============================================================
// Core: Website Profiles
// ============================================================

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

// ============================================================
// Core: Automations
// ============================================================

export const automations = pgTable("automations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  templateKey: text("template_key").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  steps: text("steps").notNull(),
  status: text("status").notNull().default("inactive"),
  runs: integer("runs").default(0),
  successRate: real("success_rate").default(0),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAutomationSchema = createInsertSchema(automations).omit({ id: true, createdAt: true });
export type Automation = typeof automations.$inferSelect;
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;

// ============================================================
// Re-exports from domain files
// ============================================================

export * from "./workflow-schema";
export * from "./instantly-schema";
export * from "./intelligence-schema";
export * from "./email-quota-schema";
export * from "./domain-schema";
export * from "./marketing-autopilot-schema";
export * from "./business-manager-schema";
export * from "./crm-schema";
export * from "./outreach-schema";
export * from "./tracking-schema";
export * from "./platform-schema";
export * from "./content-schema";
export * from "./social-schema";
