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
  address: text("address"),
  companyResearch: text("company_research"),
  companyResearchedAt: timestamp("company_researched_at"),
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
  youApiKey: text("you_api_key"),
  webSearchProvider: text("web_search_provider").default("claude"),
  autoLeadGenEnabled: boolean("auto_lead_gen_enabled").default(false),
  linkedinProfileUrl: text("linkedin_profile_url"),
  linkedinEmail: text("linkedin_email"),
  linkedinConnected: boolean("linkedin_connected").default(false),
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
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
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
  emailsSent: integer("emails_sent").default(0),
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
    price: 297,
    aiChats: 100,
    smsSent: 0,
    emailsSent: 2000,
    voiceCalls: 0,
    voiceMinutes: 0,
    leadsGenerated: 500,
    agents: 3,
    funnels: 3,
    features: ["500 leads/month", "AI email outreach", "Basic CRM", "Email warmup (2 accounts)", "Weekly reports", "Chat support"],
  },
  growth: {
    name: "Growth",
    price: 597,
    aiChats: 1000,
    smsSent: 500,
    emailsSent: 5000,
    voiceCalls: 50,
    voiceMinutes: 200,
    leadsGenerated: 1500,
    agents: 10,
    funnels: 10,
    features: ["1,500 leads/month", "AI email + SMS outreach", "Voice AI Agent", "Full CRM + pipeline", "Email warmup (5 accounts)", "Sales intelligence", "Priority support"],
  },
  agency: {
    name: "Agency OS",
    price: 1497,
    aiChats: -1,
    smsSent: 2000,
    emailsSent: -1,
    voiceCalls: -1,
    voiceMinutes: -1,
    leadsGenerated: -1,
    agents: -1,
    funnels: -1,
    features: ["Unlimited leads", "All outreach channels", "Unlimited Voice AI", "White-label access", "B2B intelligence suite", "Unlimited email warmup", "Dedicated account manager", "Custom integrations"],
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

// ============================================================
// Multi-Channel Sequences
// ============================================================
export const sequences = pgTable("sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  totalEnrolled: integer("total_enrolled").default(0),
  totalCompleted: integer("total_completed").default(0),
  totalReplied: integer("total_replied").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sequenceSteps = pgTable("sequence_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequenceId: varchar("sequence_id").notNull(),
  stepNumber: integer("step_number").notNull(),
  channel: text("channel").notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  delayDays: integer("delay_days").notNull().default(1),
  delayHours: integer("delay_hours").notNull().default(0),
  variants: text("variants"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sequenceEnrollments = pgTable("sequence_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequenceId: varchar("sequence_id").notNull(),
  leadId: varchar("lead_id").notNull(),
  userId: varchar("user_id").notNull(),
  currentStep: integer("current_step").notNull().default(0),
  status: text("status").notNull().default("active"),
  nextSendAt: timestamp("next_send_at"),
  completedAt: timestamp("completed_at"),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
});

export const insertSequenceSchema = createInsertSchema(sequences).omit({ id: true, createdAt: true, updatedAt: true });
export type Sequence = typeof sequences.$inferSelect;
export type InsertSequence = z.infer<typeof insertSequenceSchema>;

export const insertSequenceStepSchema = createInsertSchema(sequenceSteps).omit({ id: true, createdAt: true });
export type SequenceStep = typeof sequenceSteps.$inferSelect;
export type InsertSequenceStep = z.infer<typeof insertSequenceStepSchema>;

export const insertSequenceEnrollmentSchema = createInsertSchema(sequenceEnrollments).omit({ id: true, enrolledAt: true });
export type SequenceEnrollment = typeof sequenceEnrollments.$inferSelect;
export type InsertSequenceEnrollment = z.infer<typeof insertSequenceEnrollmentSchema>;

// ============================================================
// LinkedIn Integration
// ============================================================
export const linkedinProfiles = pgTable("linkedin_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  leadId: varchar("lead_id"),
  linkedinUrl: text("linkedin_url").notNull(),
  fullName: text("full_name"),
  headline: text("headline"),
  company: text("company"),
  location: text("location"),
  connectionStatus: text("connection_status").notNull().default("none"),
  outreachStatus: text("outreach_status").notNull().default("none"),
  lastMessageSent: text("last_message_sent"),
  lastMessageAt: timestamp("last_message_at"),
  notes: text("notes"),
  enrichmentData: text("enrichment_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLinkedinProfileSchema = createInsertSchema(linkedinProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type LinkedinProfile = typeof linkedinProfiles.$inferSelect;
export type InsertLinkedinProfile = z.infer<typeof insertLinkedinProfileSchema>;

// ============================================================
// Intent Data / Activity Tracking
// ============================================================
export const intentActivity = pgTable("intent_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  leadId: varchar("lead_id"),
  company: text("company"),
  signalType: text("signal_type").notNull(),
  signalSource: text("signal_source").notNull(),
  strength: integer("strength").notNull().default(50),
  description: text("description"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIntentActivitySchema = createInsertSchema(intentActivity).omit({ id: true, createdAt: true });
export type IntentActivity = typeof intentActivity.$inferSelect;
export type InsertIntentActivity = z.infer<typeof insertIntentActivitySchema>;

// ============================================================
// Team Collaboration
// ============================================================
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull(),
  userId: varchar("user_id"),
  email: text("email").notNull(),
  name: text("name"),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("invited"),
  invitedAt: timestamp("invited_at").defaultNow(),
  joinedAt: timestamp("joined_at"),
});

export const leadAssignments = pgTable("lead_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull(),
  assignedTo: varchar("assigned_to").notNull(),
  assignedBy: varchar("assigned_by").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true, invitedAt: true, joinedAt: true });
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export const insertLeadAssignmentSchema = createInsertSchema(leadAssignments).omit({ id: true, createdAt: true });
export type LeadAssignment = typeof leadAssignments.$inferSelect;
export type InsertLeadAssignment = z.infer<typeof insertLeadAssignmentSchema>;

// ============================================================
// CRM Integrations
// ============================================================
export const crmConnections = pgTable("crm_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull().default("disconnected"),
  apiKey: text("api_key"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  instanceUrl: text("instance_url"),
  syncDirection: text("sync_direction").notNull().default("bidirectional"),
  fieldMapping: text("field_mapping"),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: text("last_sync_status"),
  totalSynced: integer("total_synced").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCrmConnectionSchema = createInsertSchema(crmConnections).omit({ id: true, createdAt: true, updatedAt: true });
export type CrmConnection = typeof crmConnections.$inferSelect;
export type InsertCrmConnection = z.infer<typeof insertCrmConnectionSchema>;

// ============================================================
// Webhook Integrations
// ============================================================
export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  secret: text("secret"),
  events: text("events").notNull(),
  status: text("status").notNull().default("active"),
  lastTriggeredAt: timestamp("last_triggered_at"),
  totalDeliveries: integer("total_deliveries").default(0),
  totalFailures: integer("total_failures").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  endpointId: varchar("endpoint_id").notNull(),
  event: text("event").notNull(),
  payload: text("payload").notNull(),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").default(0),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWebhookEndpointSchema = createInsertSchema(webhookEndpoints).omit({ id: true, createdAt: true });
export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
export type InsertWebhookEndpoint = z.infer<typeof insertWebhookEndpointSchema>;

export const insertWebhookDeliverySchema = createInsertSchema(webhookDeliveries).omit({ id: true, createdAt: true });
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type InsertWebhookDelivery = z.infer<typeof insertWebhookDeliverySchema>;

// ============================================================
// White-Label / Agency Workspaces
// ============================================================
export const agencyClients = pgTable("agency_clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull(),
  name: text("name").notNull(),
  domain: text("domain"),
  logo: text("logo"),
  brandColor: text("brand_color").default("#00e5a0"),
  industry: text("industry"),
  contactEmail: text("contact_email"),
  contactName: text("contact_name"),
  status: text("status").notNull().default("active"),
  totalLeads: integer("total_leads").default(0),
  totalDeals: integer("total_deals").default(0),
  monthlyBudget: real("monthly_budget").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAgencyClientSchema = createInsertSchema(agencyClients).omit({ id: true, createdAt: true, updatedAt: true });
export type AgencyClient = typeof agencyClients.$inferSelect;
export type InsertAgencyClient = z.infer<typeof insertAgencyClientSchema>;

// ============================================================
// Campaign Analytics / A/B Testing
// ============================================================
export const campaignReports = pgTable("campaign_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  channel: text("channel"),
  totalSent: integer("total_sent").default(0),
  totalOpened: integer("total_opened").default(0),
  totalClicked: integer("total_clicked").default(0),
  totalReplied: integer("total_replied").default(0),
  totalConverted: integer("total_converted").default(0),
  totalBounced: integer("total_bounced").default(0),
  totalUnsubscribed: integer("total_unsubscribed").default(0),
  revenue: real("revenue").default(0),
  cost: real("cost").default(0),
  abTestVariant: text("ab_test_variant"),
  abTestGroup: text("ab_test_group"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCampaignReportSchema = createInsertSchema(campaignReports).omit({ id: true, createdAt: true });
export type CampaignReport = typeof campaignReports.$inferSelect;
export type InsertCampaignReport = z.infer<typeof insertCampaignReportSchema>;

// ============================================================
// MODULE: Landing Page / Funnel Builder
// ============================================================
export const landingPages = pgTable("landing_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("landing_page"),
  slug: text("slug"),
  status: text("status").notNull().default("draft"),
  pageContent: text("page_content"),
  settings: text("settings"),
  seo: text("seo"),
  customDomain: text("custom_domain"),
  totalVisits: integer("total_visits").default(0),
  totalConversions: integer("total_conversions").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const landingPageSteps = pgTable("landing_page_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageId: varchar("page_id").notNull(),
  name: text("name").notNull(),
  path: text("path"),
  content: text("content"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLandingPageSchema = createInsertSchema(landingPages).omit({ id: true, createdAt: true, updatedAt: true });
export type LandingPage = typeof landingPages.$inferSelect;
export type InsertLandingPage = z.infer<typeof insertLandingPageSchema>;

export const insertLandingPageStepSchema = createInsertSchema(landingPageSteps).omit({ id: true, createdAt: true });
export type LandingPageStep = typeof landingPageSteps.$inferSelect;
export type InsertLandingPageStep = z.infer<typeof insertLandingPageStepSchema>;

// ============================================================
// MODULE: Forms & Surveys Builder
// ============================================================
export const formBuilders = pgTable("form_builders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("form"),
  fields: text("fields"),
  settings: text("settings"),
  styling: text("styling"),
  status: text("status").notNull().default("draft"),
  redirectUrl: text("redirect_url"),
  successMessage: text("success_message"),
  submissionCount: integer("submission_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const formSubmissions = pgTable("form_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: varchar("form_id").notNull(),
  data: text("data"),
  contactEmail: text("contact_email"),
  ipAddress: text("ip_address"),
  sourceUrl: text("source_url"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const insertFormBuilderSchema = createInsertSchema(formBuilders).omit({ id: true, createdAt: true, updatedAt: true });
export type FormBuilder = typeof formBuilders.$inferSelect;
export type InsertFormBuilder = z.infer<typeof insertFormBuilderSchema>;

export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({ id: true, submittedAt: true });
export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;

// ============================================================
// MODULE: Chat Widget / Live Chat
// ============================================================
export const chatWidgets = pgTable("chat_widgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  settings: text("settings"),
  welcomeMessage: text("welcome_message"),
  offlineMessage: text("offline_message"),
  botEnabled: boolean("bot_enabled").default(false),
  botFlows: text("bot_flows"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatConversations = pgTable("chat_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  widgetId: varchar("widget_id").notNull(),
  userId: varchar("user_id").notNull(),
  visitorName: text("visitor_name"),
  visitorEmail: text("visitor_email"),
  status: text("status").notNull().default("open"),
  assignedTo: varchar("assigned_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull(),
  senderType: text("sender_type").notNull(),
  senderName: text("sender_name"),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const insertChatWidgetSchema = createInsertSchema(chatWidgets).omit({ id: true, createdAt: true, updatedAt: true });
export type ChatWidget = typeof chatWidgets.$inferSelect;
export type InsertChatWidget = z.infer<typeof insertChatWidgetSchema>;

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({ id: true, createdAt: true, updatedAt: true });
export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, sentAt: true });
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// ============================================================
// MODULE: Invoicing & Payments
// ============================================================
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  invoiceNumber: text("invoice_number"),
  type: text("type").notNull().default("invoice"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactCompany: text("contact_company"),
  issueDate: timestamp("issue_date"),
  dueDate: timestamp("due_date"),
  lineItems: text("line_items"),
  subtotal: real("subtotal").default(0),
  taxRate: real("tax_rate").default(0),
  taxAmount: real("tax_amount").default(0),
  discountAmount: real("discount_amount").default(0),
  total: real("total").default(0),
  amountPaid: real("amount_paid").default(0),
  balanceDue: real("balance_due").default(0),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  terms: text("terms"),
  paymentLink: text("payment_link"),
  sentAt: timestamp("sent_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

// ============================================================
// MODULE: Social Media Management
// ============================================================
export const socialAccounts = pgTable("social_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  platform: text("platform").notNull(),
  accountName: text("account_name"),
  accountId: text("account_id"),
  profileImage: text("profile_image"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const socialPosts = pgTable("social_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  mediaUrls: text("media_urls"),
  platforms: text("platforms"),
  status: text("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  analytics: text("analytics"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSocialAccountSchema = createInsertSchema(socialAccounts).omit({ id: true, createdAt: true });
export type SocialAccount = typeof socialAccounts.$inferSelect;
export type InsertSocialAccount = z.infer<typeof insertSocialAccountSchema>;

export const insertSocialPostSchema = createInsertSchema(socialPosts).omit({ id: true, createdAt: true, updatedAt: true });
export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;

// ============================================================
// MODULE: Reputation Management
// ============================================================
export const reviewPlatforms = pgTable("review_platforms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  platform: text("platform").notNull(),
  businessName: text("business_name"),
  placeId: text("place_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platformId: varchar("platform_id").notNull(),
  userId: varchar("user_id").notNull(),
  reviewerName: text("reviewer_name"),
  rating: integer("rating"),
  content: text("content"),
  response: text("response"),
  respondedAt: timestamp("responded_at"),
  reviewDate: timestamp("review_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReviewPlatformSchema = createInsertSchema(reviewPlatforms).omit({ id: true, createdAt: true });
export type ReviewPlatform = typeof reviewPlatforms.$inferSelect;
export type InsertReviewPlatform = z.infer<typeof insertReviewPlatformSchema>;

export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

// ============================================================
// MODULE: WhatsApp Integration
// ============================================================
export const whatsappAccounts = pgTable("whatsapp_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  phoneNumber: text("phone_number").notNull(),
  displayName: text("display_name"),
  provider: text("provider").notNull().default("twilio"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(),
  userId: varchar("user_id").notNull(),
  toNumber: text("to_number").notNull(),
  fromNumber: text("from_number"),
  content: text("content").notNull(),
  direction: text("direction").notNull().default("outbound"),
  status: text("status").notNull().default("sent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWhatsappAccountSchema = createInsertSchema(whatsappAccounts).omit({ id: true, createdAt: true });
export type WhatsappAccount = typeof whatsappAccounts.$inferSelect;
export type InsertWhatsappAccount = z.infer<typeof insertWhatsappAccountSchema>;

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({ id: true, createdAt: true });
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;

// ============================================================
// MODULE: Facebook / Instagram DMs
// ============================================================
export const metaAccounts = pgTable("meta_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  platform: text("platform").notNull(),
  pageName: text("page_name"),
  pageId: text("page_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const metaMessages = pgTable("meta_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(),
  userId: varchar("user_id").notNull(),
  recipientId: text("recipient_id"),
  message: text("message").notNull(),
  direction: text("direction").notNull().default("outbound"),
  status: text("status").notNull().default("sent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMetaAccountSchema = createInsertSchema(metaAccounts).omit({ id: true, createdAt: true });
export type MetaAccount = typeof metaAccounts.$inferSelect;
export type InsertMetaAccount = z.infer<typeof insertMetaAccountSchema>;

export const insertMetaMessageSchema = createInsertSchema(metaMessages).omit({ id: true, createdAt: true });
export type MetaMessage = typeof metaMessages.$inferSelect;
export type InsertMetaMessage = z.infer<typeof insertMetaMessageSchema>;

// ============================================================
// MODULE: Calendar Sync
// ============================================================
export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  allDay: boolean("all_day").default(false),
  calendarProvider: text("calendar_provider"),
  externalId: text("external_id"),
  attendees: text("attendees"),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({ id: true, createdAt: true, updatedAt: true });
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

// ============================================================
// MODULE: Document Management & E-Signatures
// ============================================================
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  type: text("type").notNull().default("document"),
  status: text("status").notNull().default("draft"),
  recipientEmail: text("recipient_email"),
  recipientName: text("recipient_name"),
  signedAt: timestamp("signed_at"),
  signatureData: text("signature_data"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, updatedAt: true });
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

// ============================================================
// MODULE: Google Business Profile
// ============================================================
export const gbpAccounts = pgTable("gbp_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  businessName: text("business_name").notNull(),
  placeId: text("place_id"),
  address: text("address"),
  phone: text("phone"),
  category: text("category"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gbpPosts = pgTable("gbp_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("update"),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGbpAccountSchema = createInsertSchema(gbpAccounts).omit({ id: true, createdAt: true });
export type GbpAccount = typeof gbpAccounts.$inferSelect;
export type InsertGbpAccount = z.infer<typeof insertGbpAccountSchema>;

export const insertGbpPostSchema = createInsertSchema(gbpPosts).omit({ id: true, createdAt: true });
export type GbpPost = typeof gbpPosts.$inferSelect;
export type InsertGbpPost = z.infer<typeof insertGbpPostSchema>;

// ============================================================
// MODULE: Membership / Course Platform
// ============================================================
export const membershipSites = pgTable("membership_sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  domain: text("domain"),
  branding: text("branding"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const membershipCourses = pgTable("membership_courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").notNull(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  status: text("status").notNull().default("draft"),
  totalLessons: integer("total_lessons").default(0),
  totalEnrolled: integer("total_enrolled").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const membershipLessons = pgTable("membership_lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  videoUrl: text("video_url"),
  orderIndex: integer("order_index").default(0),
  durationMin: integer("duration_min").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMembershipSiteSchema = createInsertSchema(membershipSites).omit({ id: true, createdAt: true });
export type MembershipSite = typeof membershipSites.$inferSelect;
export type InsertMembershipSite = z.infer<typeof insertMembershipSiteSchema>;

export const insertMembershipCourseSchema = createInsertSchema(membershipCourses).omit({ id: true, createdAt: true, updatedAt: true });
export type MembershipCourse = typeof membershipCourses.$inferSelect;
export type InsertMembershipCourse = z.infer<typeof insertMembershipCourseSchema>;

export const insertMembershipLessonSchema = createInsertSchema(membershipLessons).omit({ id: true, createdAt: true });
export type MembershipLesson = typeof membershipLessons.$inferSelect;
export type InsertMembershipLesson = z.infer<typeof insertMembershipLessonSchema>;

// ============================================================
// MODULE: A/B Testing
// ============================================================
export const abTests = pgTable("ab_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("email"),
  variantA: text("variant_a"),
  variantB: text("variant_b"),
  status: text("status").notNull().default("draft"),
  winnerVariant: text("winner_variant"),
  totalSentA: integer("total_sent_a").default(0),
  totalSentB: integer("total_sent_b").default(0),
  opensA: integer("opens_a").default(0),
  opensB: integer("opens_b").default(0),
  clicksA: integer("clicks_a").default(0),
  clicksB: integer("clicks_b").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAbTestSchema = createInsertSchema(abTests).omit({ id: true, createdAt: true, updatedAt: true });
export type AbTest = typeof abTests.$inferSelect;
export type InsertAbTest = z.infer<typeof insertAbTestSchema>;

// ============================================================
// MODULE: Proposals & Estimates
// ============================================================
export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactCompany: text("contact_company"),
  content: text("content"),
  lineItems: text("line_items"),
  total: real("total").default(0),
  status: text("status").notNull().default("draft"),
  validUntil: timestamp("valid_until"),
  sentAt: timestamp("sent_at"),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProposalSchema = createInsertSchema(proposals).omit({ id: true, createdAt: true, updatedAt: true });
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;

// ============================================================
// MODULE: Affiliate Management
// ============================================================
export const affiliatePrograms = pgTable("affiliate_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  commissionRate: real("commission_rate").notNull().default(20),
  commissionType: text("commission_type").notNull().default("percentage"),
  cookieDays: integer("cookie_days").default(30),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const affiliates = pgTable("affiliates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  referralCode: text("referral_code"),
  totalReferrals: integer("total_referrals").default(0),
  totalEarnings: real("total_earnings").default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAffiliateProgramSchema = createInsertSchema(affiliatePrograms).omit({ id: true, createdAt: true });
export type AffiliateProgram = typeof affiliatePrograms.$inferSelect;
export type InsertAffiliateProgram = z.infer<typeof insertAffiliateProgramSchema>;

export const insertAffiliateSchema = createInsertSchema(affiliates).omit({ id: true, createdAt: true });
export type Affiliate = typeof affiliates.$inferSelect;
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;

// ============================================================
// MODULE: Blog Builder
// ============================================================
export const blogSites = pgTable("blog_sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  domain: text("domain"),
  description: text("description"),
  theme: text("theme"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").notNull(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  slug: text("slug"),
  content: text("content"),
  excerpt: text("excerpt"),
  category: text("category"),
  tags: text("tags"),
  featuredImage: text("featured_image"),
  status: text("status").notNull().default("draft"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  views: integer("views").default(0),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBlogSiteSchema = createInsertSchema(blogSites).omit({ id: true, createdAt: true });
export type BlogSite = typeof blogSites.$inferSelect;
export type InsertBlogSite = z.infer<typeof insertBlogSiteSchema>;

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({ id: true, createdAt: true, updatedAt: true });
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;

// ============================================================
// MODULE: Communities
// ============================================================
export const communitySpaces = pgTable("community_spaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(true),
  memberCount: integer("member_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communityChannels = pgTable("community_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  spaceId: varchar("space_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("discussion"),
  postCount: integer("post_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communityPosts = pgTable("community_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull(),
  userId: varchar("user_id").notNull(),
  authorName: text("author_name"),
  title: text("title"),
  content: text("content").notNull(),
  likes: integer("likes").default(0),
  replyCount: integer("reply_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommunitySpaceSchema = createInsertSchema(communitySpaces).omit({ id: true, createdAt: true });
export type CommunitySpace = typeof communitySpaces.$inferSelect;
export type InsertCommunitySpace = z.infer<typeof insertCommunitySpaceSchema>;

export const insertCommunityChannelSchema = createInsertSchema(communityChannels).omit({ id: true, createdAt: true });
export type CommunityChannel = typeof communityChannels.$inferSelect;
export type InsertCommunityChannel = z.infer<typeof insertCommunityChannelSchema>;

export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({ id: true, createdAt: true });
export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;

export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  leadId: varchar("lead_id"),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject"),
  provider: text("provider").notNull().default("smtp"),
  source: text("source").notNull().default("outreach"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({ id: true, createdAt: true });
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;

export * from "./workflow-schema";
export * from "./instantly-schema";
export * from "./intelligence-schema";
