import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

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
  createdAt: timestamp("created_at").defaultNow(),
});

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
  autoLeadGenEnabled: boolean("auto_lead_gen_enabled").default(false),
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

export const emailEvents = pgTable("email_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull(),
  userId: varchar("user_id").notNull(),
  eventType: text("event_type").notNull(),
  metadata: text("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailEventSchema = createInsertSchema(emailEvents).omit({ id: true, createdAt: true });
export type EmailEvent = typeof emailEvents.$inferSelect;
export type InsertEmailEvent = z.infer<typeof insertEmailEventSchema>;

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  plan: text("plan").notNull().default("starter"),
  status: text("status").notNull().default("trial"),
  amount: real("amount").notNull().default(0),
  paymentMethod: text("payment_method").default("venmo"),
  venmoHandle: text("venmo_handle"),
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelledAt: timestamp("cancelled_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export const agentConfigs = pgTable("agent_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  agentType: text("agent_type").notNull(),
  enabled: boolean("enabled").default(false),
  agentSettings: text("agent_settings"),
  customScript: text("custom_script"),
  isRunning: boolean("is_running").default(false),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  lastError: text("last_error"),
  totalLeadsFound: integer("total_leads_found").default(0),
  totalDealsCompleted: integer("total_deals_completed").default(0),
  healthScore: integer("health_score").default(100),
  runFrequency: text("run_frequency").default("daily"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentTasks = pgTable("agent_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  agentType: text("agent_type").notNull(),
  agentConfigId: varchar("agent_config_id"),
  taskType: text("task_type").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  result: text("result"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  agentType: text("agent_type"),
  type: text("type").notNull().default("info"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: text("priority").default("normal"),
  read: boolean("read").default(false),
  leadId: varchar("lead_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAgentConfigSchema = createInsertSchema(agentConfigs).omit({ id: true, createdAt: true });
export type AgentConfig = typeof agentConfigs.$inferSelect;
export type InsertAgentConfig = z.infer<typeof insertAgentConfigSchema>;

export const insertAgentTaskSchema = createInsertSchema(agentTasks).omit({ id: true, createdAt: true });
export type AgentTask = typeof agentTasks.$inferSelect;
export type InsertAgentTask = z.infer<typeof insertAgentTaskSchema>;

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

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

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;

export const voiceCalls = pgTable("voice_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  leadId: varchar("lead_id"),
  agentId: varchar("agent_id"),
  toNumber: text("to_number").notNull(),
  fromNumber: text("from_number"),
  direction: text("direction").notNull().default("outbound"),
  status: text("status").notNull().default("queued"),
  durationSec: integer("duration_sec").default(0),
  outcome: text("outcome"),
  recordingUrl: text("recording_url"),
  transcript: text("transcript"),
  script: text("script"),
  twilioCallSid: text("twilio_call_sid"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVoiceCallSchema = createInsertSchema(voiceCalls).omit({ id: true, createdAt: true });
export type VoiceCall = typeof voiceCalls.$inferSelect;
export type InsertVoiceCall = z.infer<typeof insertVoiceCallSchema>;

export const emailReplies = pgTable("email_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull(),
  userId: varchar("user_id").notNull(),
  direction: text("direction").notNull(),
  fromEmail: text("from_email").notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  messageId: text("message_id"),
  inReplyTo: text("in_reply_to"),
  status: text("status").notNull().default("received"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailReplySchema = createInsertSchema(emailReplies).omit({ id: true, createdAt: true });
export type EmailReply = typeof emailReplies.$inferSelect;
export type InsertEmailReply = z.infer<typeof insertEmailReplySchema>;

export const autoLeadGenRuns = pgTable("auto_lead_gen_runs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  status: text("status").notNull().default("pending"),
  leadsGenerated: integer("leads_generated").default(0),
  errorMessage: text("error_message"),
  searchQueries: text("search_queries"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type AutoLeadGenRun = typeof autoLeadGenRuns.$inferSelect;

export const platformPromotionRuns = pgTable("platform_promotion_runs", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("pending"),
  postsFound: integer("posts_found").default(0),
  draftsGenerated: integer("drafts_generated").default(0),
  searchQuery: text("search_query"),
  errorMessage: text("error_message"),
  results: text("results"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type PlatformPromotionRun = typeof platformPromotionRuns.$inferSelect;

export const usageTracking = pgTable("usage_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  aiChats: integer("ai_chats").notNull().default(0),
  smsSent: integer("sms_sent").notNull().default(0),
  emailsSent: integer("emails_sent").notNull().default(0),
  voiceCalls: integer("voice_calls").notNull().default(0),
  voiceMinutes: integer("voice_minutes").notNull().default(0),
  leadsGenerated: integer("leads_generated").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUsageTrackingSchema = createInsertSchema(usageTracking).omit({ id: true, createdAt: true, updatedAt: true });
export type UsageTracking = typeof usageTracking.$inferSelect;
export type InsertUsageTracking = z.infer<typeof insertUsageTrackingSchema>;

export const PLAN_LIMITS = {
  starter: {
    name: "Starter",
    price: 0,
    aiChats: 10,
    smsSent: 0,
    emailsSent: 20,
    voiceCalls: 0,
    voiceMinutes: 0,
    leadsGenerated: 5,
    agents: 1,
    funnels: 1,
    features: ["Basic CRM", "1 AI Agent", "5 Leads/month", "10 AI Chats/month", "20 Emails/month", "1 Sales Funnel", "Email Support"],
  },
  pro: {
    name: "Pro",
    price: 97,
    aiChats: 500,
    smsSent: 200,
    emailsSent: 1000,
    voiceCalls: 25,
    voiceMinutes: 100,
    leadsGenerated: 100,
    agents: 10,
    funnels: 5,
    features: ["Full CRM & Pipeline", "10 AI Agents", "100 Leads/month", "500 AI Chats/month", "200 SMS/month", "1,000 Emails/month", "25 Voice AI Calls", "5 Sales Funnels", "Marketing Automation", "B2B Intelligence", "Priority Support"],
  },
  enterprise: {
    name: "Enterprise",
    price: 297,
    aiChats: -1,
    smsSent: 1000,
    emailsSent: -1,
    voiceCalls: -1,
    voiceMinutes: -1,
    leadsGenerated: -1,
    agents: -1,
    funnels: -1,
    features: ["Unlimited AI Agents", "Unlimited Leads", "Unlimited AI Chats", "1,000 SMS/month", "Unlimited Emails", "Unlimited Voice AI", "Unlimited Funnels", "Custom Workflows", "AI Outreach Agent", "Bring Your Own API Keys", "Dedicated Account Manager", "White-Glove Onboarding"],
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

export * from "./workflow-schema";
export * from "./instantly-schema";
export * from "./intelligence-schema";
