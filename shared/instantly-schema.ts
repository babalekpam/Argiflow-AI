// ============================================================
// ARGILETTE INSTANTLY FEATURES — DATABASE SCHEMA
// Drop this into: shared/instantly-schema.ts
// Then add: export * from "./instantly-schema"; to shared/schema.ts
// Run: npm run db:push to create tables
// ============================================================

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// EMAIL ACCOUNTS — Connect Google, Microsoft, or SMTP/IMAP
// ============================================================

export const emailAccounts = pgTable("email_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  provider: text("provider").notNull().default("smtp"), // google | microsoft | smtp
  authType: text("auth_type").notNull().default("credentials"), // credentials | oauth
  // SMTP/IMAP settings (encrypted in practice)
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port").default(587),
  imapHost: text("imap_host"),
  imapPort: integer("imap_port").default(993),
  smtpPassword: text("smtp_password"), // encrypted
  // OAuth tokens
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  // Warmup
  warmupEnabled: boolean("warmup_enabled").default(false),
  warmupStatus: text("warmup_status").default("inactive"), // inactive | active | paused
  warmupPool: text("warmup_pool").default("standard"), // standard | premium
  warmupDailyLimit: integer("warmup_daily_limit").default(20),
  warmupCurrentDay: integer("warmup_current_day").default(0),
  // Reputation & health
  reputationScore: real("reputation_score").default(0.5),
  healthStatus: text("health_status").default("unknown"), // healthy | warning | critical | unknown
  dailySendLimit: integer("daily_send_limit").default(50),
  sentToday: integer("sent_today").default(0),
  // DNS validation
  domain: text("domain"),
  spfValid: boolean("spf_valid").default(false),
  dkimValid: boolean("dkim_valid").default(false),
  dmarcValid: boolean("dmarc_valid").default(false),
  // Status
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailAccountSchema = createInsertSchema(emailAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export type EmailAccount = typeof emailAccounts.$inferSelect;
export type InsertEmailAccount = z.infer<typeof insertEmailAccountSchema>;

// ============================================================
// WARMUP — Stats, conversations, pool
// ============================================================

export const warmupStats = pgTable("warmup_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  emailsSent: integer("emails_sent").default(0),
  emailsReceived: integer("emails_received").default(0),
  emailsReplied: integer("emails_replied").default(0),
  landedInbox: integer("landed_inbox").default(0),
  landedSpam: integer("landed_spam").default(0),
  reputationScore: real("reputation_score").default(0.5),
  createdAt: timestamp("created_at").defaultNow(),
});

export type WarmupStat = typeof warmupStats.$inferSelect;

export const warmupConversations = pgTable("warmup_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderAccountId: varchar("sender_account_id").notNull(),
  receiverAccountId: varchar("receiver_account_id").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  replyBody: text("reply_body"),
  status: text("status").notNull().default("sent"), // sent | replied | opened
  landedIn: text("landed_in").default("unknown"), // inbox | spam | unknown
  sentAt: timestamp("sent_at").defaultNow(),
  repliedAt: timestamp("replied_at"),
});

export type WarmupConversation = typeof warmupConversations.$inferSelect;

// ============================================================
// CAMPAIGNS — Multi-step email sequences
// ============================================================

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"), // draft | active | paused | completed
  // Scheduling
  timezone: text("timezone").default("America/Chicago"),
  sendDays: text("send_days").default("mon,tue,wed,thu,fri"),
  sendStartHour: integer("send_start_hour").default(9),
  sendEndHour: integer("send_end_hour").default(17),
  dailyLimit: integer("daily_limit").default(50),
  // Stats
  totalLeads: integer("total_leads").default(0),
  emailsSent: integer("emails_sent").default(0),
  emailsOpened: integer("emails_opened").default(0),
  emailsReplied: integer("emails_replied").default(0),
  emailsBounced: integer("emails_bounced").default(0),
  opportunities: integer("opportunities").default(0),
  // Settings
  stopOnReply: boolean("stop_on_reply").default(true),
  stopOnAutoReply: boolean("stop_on_auto_reply").default(false),
  textOnly: boolean("text_only").default(false),
  trackOpens: boolean("track_opens").default(true),
  trackClicks: boolean("track_clicks").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true, createdAt: true, updatedAt: true });
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;

export const campaignSequences = pgTable("campaign_sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull(),
  stepNumber: integer("step_number").notNull().default(1),
  variant: text("variant").default("A"), // A/B/C/Z testing
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  delayDays: integer("delay_days").default(0),
  delayHours: integer("delay_hours").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCampaignSequenceSchema = createInsertSchema(campaignSequences).omit({ id: true, createdAt: true });
export type CampaignSequence = typeof campaignSequences.$inferSelect;
export type InsertCampaignSequence = z.infer<typeof insertCampaignSequenceSchema>;

export const campaignSendingAccounts = pgTable("campaign_sending_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull(),
  accountId: varchar("account_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CampaignSendingAccount = typeof campaignSendingAccounts.$inferSelect;

export const campaignLeads = pgTable("campaign_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull(),
  leadId: varchar("lead_id").notNull(),
  status: text("status").notNull().default("pending"), // pending | sent | opened | replied | bounced | unsubscribed
  currentStep: integer("current_step").default(0),
  sentCount: integer("sent_count").default(0),
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  lastSentAt: timestamp("last_sent_at"),
  nextSendAt: timestamp("next_send_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCampaignLeadSchema = createInsertSchema(campaignLeads).omit({ id: true, createdAt: true });
export type CampaignLead = typeof campaignLeads.$inferSelect;
export type InsertCampaignLead = z.infer<typeof insertCampaignLeadSchema>;

// ============================================================
// UNIBOX — Unified inbox with AI labels
// ============================================================

export const inboxMessages = pgTable("inbox_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id").notNull(),
  campaignId: varchar("campaign_id"),
  leadId: varchar("lead_id"),
  direction: text("direction").notNull().default("inbound"), // inbound | outbound
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  toEmail: text("to_email").notNull(),
  subject: text("subject"),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  snippet: text("snippet"),
  messageId: text("message_id"),
  threadId: text("thread_id"),
  inReplyTo: text("in_reply_to"),
  // AI classification
  aiLabel: text("ai_label").default("unlabeled"), // interested | not_interested | out_of_office | meeting_booked | referral | question | wrong_person | bounced | unlabeled
  aiSentiment: text("ai_sentiment").default("neutral"), // positive | negative | neutral
  aiConfidence: real("ai_confidence").default(0),
  // Status
  isRead: boolean("is_read").default(false),
  isStarred: boolean("is_starred").default(false),
  isArchived: boolean("is_archived").default(false),
  receivedAt: timestamp("received_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInboxMessageSchema = createInsertSchema(inboxMessages).omit({ id: true, createdAt: true });
export type InboxMessage = typeof inboxMessages.$inferSelect;
export type InsertInboxMessage = z.infer<typeof insertInboxMessageSchema>;

// ============================================================
// WEBSITE VISITORS — Pixel tracking + de-anonymization
// ============================================================

export const websitePixels = pgTable("website_pixels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  domain: text("domain").notNull(),
  pixelCode: text("pixel_code"),
  isActive: boolean("is_active").default(true),
  monthlyCredits: integer("monthly_credits").default(50),
  creditsUsed: integer("credits_used").default(0),
  linkedinResolutions: integer("linkedin_resolutions").default(200),
  linkedinUsed: integer("linkedin_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWebsitePixelSchema = createInsertSchema(websitePixels).omit({ id: true, createdAt: true });
export type WebsitePixel = typeof websitePixels.$inferSelect;
export type InsertWebsitePixel = z.infer<typeof insertWebsitePixelSchema>;

export const websiteVisitors = pgTable("website_visitors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pixelId: varchar("pixel_id").notNull(),
  userId: varchar("user_id").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  pageUrl: text("page_url"),
  pageTitle: text("page_title"),
  referrer: text("referrer"),
  country: text("country"),
  city: text("city"),
  region: text("region"),
  // Company resolution
  companyName: text("company_name"),
  companyDomain: text("company_domain"),
  companyIndustry: text("company_industry"),
  companySize: text("company_size"),
  // Contact resolution
  resolvedEmail: text("resolved_email"),
  resolvedName: text("resolved_name"),
  resolvedTitle: text("resolved_title"),
  resolvedLinkedin: text("resolved_linkedin"),
  resolutionStatus: text("resolution_status").default("unresolved"), // unresolved | resolved | partial
  // Behavior
  sessionDuration: integer("session_duration").default(0),
  pageViews: integer("page_views").default(1),
  visitedAt: timestamp("visited_at").defaultNow(),
});

export type WebsiteVisitor = typeof websiteVisitors.$inferSelect;

// ============================================================
// DFY EMAIL SETUP — Done-for-you provisioning
// ============================================================

export const dfyOrders = pgTable("dfy_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  primaryDomain: text("primary_domain").notNull(),
  secondaryDomains: text("secondary_domains"), // JSON array
  inboxesPerDomain: integer("inboxes_per_domain").default(3),
  status: text("status").notNull().default("pending"), // pending | registering | configuring_dns | creating_accounts | warming_up | completed | failed
  // Progress flags
  domainsRegistered: boolean("domains_registered").default(false),
  dnsConfigured: boolean("dns_configured").default(false),
  accountsCreated: boolean("accounts_created").default(false),
  warmupStarted: boolean("warmup_started").default(false),
  errorMessage: text("error_message"),
  estimatedCompletion: timestamp("estimated_completion"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDfyOrderSchema = createInsertSchema(dfyOrders).omit({ id: true, createdAt: true });
export type DfyOrder = typeof dfyOrders.$inferSelect;
export type InsertDfyOrder = z.infer<typeof insertDfyOrderSchema>;

export const dfyDomains = pgTable("dfy_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  domain: text("domain").notNull(),
  registrationStatus: text("registration_status").default("pending"),
  spfRecord: text("spf_record"),
  dkimRecord: text("dkim_record"),
  dmarcRecord: text("dmarc_record"),
  mxRecord: text("mx_record"),
  dnsVerified: boolean("dns_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DfyDomain = typeof dfyDomains.$inferSelect;

// ============================================================
// EMAIL VERIFICATION — Waterfall + catch-all recovery
// ============================================================

export const verificationJobs = pgTable("verification_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name"),
  status: text("status").notNull().default("pending"), // pending | processing | completed | failed
  totalEmails: integer("total_emails").default(0),
  validCount: integer("valid_count").default(0),
  invalidCount: integer("invalid_count").default(0),
  riskyCount: integer("risky_count").default(0),
  unknownCount: integer("unknown_count").default(0),
  catchAllRecovered: integer("catch_all_recovered").default(0),
  creditsUsed: real("credits_used").default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVerificationJobSchema = createInsertSchema(verificationJobs).omit({ id: true, createdAt: true });
export type VerificationJob = typeof verificationJobs.$inferSelect;
export type InsertVerificationJob = z.infer<typeof insertVerificationJobSchema>;

export const verificationResults = pgTable("verification_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull().default("pending"), // valid | invalid | risky | unknown
  reason: text("reason"),
  isDisposable: boolean("is_disposable").default(false),
  isRoleBased: boolean("is_role_based").default(false),
  isFreeProvider: boolean("is_free_provider").default(false),
  isCatchAll: boolean("is_catch_all").default(false),
  mxValid: boolean("mx_valid").default(false),
  smtpValid: boolean("smtp_valid").default(false),
  provider: text("provider"), // which verification provider confirmed
  createdAt: timestamp("created_at").defaultNow(),
});

export type VerificationResult = typeof verificationResults.$inferSelect;

// ============================================================
// INBOX PLACEMENT TESTING
// ============================================================

export const inboxPlacementTests = pgTable("inbox_placement_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  score: integer("score").default(0),
  // Results per provider
  gmailResult: text("gmail_result").default("unknown"), // primary | promotions | spam | unknown
  outlookResult: text("outlook_result").default("unknown"), // inbox | junk | spam | unknown
  yahooResult: text("yahoo_result").default("unknown"), // inbox | spam | unknown
  // Analysis
  spamWordsFound: text("spam_words_found"), // JSON array
  recommendations: text("recommendations"), // JSON array
  hasExcessiveLinks: boolean("has_excessive_links").default(false),
  hasImages: boolean("has_images").default(false),
  contentLength: integer("content_length").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInboxPlacementTestSchema = createInsertSchema(inboxPlacementTests).omit({ id: true, createdAt: true });
export type InboxPlacementTest = typeof inboxPlacementTests.$inferSelect;
export type InsertInboxPlacementTest = z.infer<typeof insertInboxPlacementTestSchema>;

// ============================================================
// AI COPILOT — Memory + task generation
// ============================================================

export const copilotMemories = pgTable("copilot_memories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  memoryType: text("memory_type").notNull().default("business_context"), // business_context | icp | value_prop | objection_handling
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CopilotMemory = typeof copilotMemories.$inferSelect;

export const copilotTasks = pgTable("copilot_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  taskType: text("task_type").notNull(), // sequence | subject_lines | follow_up | campaign_idea
  prompt: text("prompt"),
  result: text("result"),
  creditsUsed: real("credits_used").default(0),
  status: text("status").notNull().default("pending"), // pending | completed | failed
  createdAt: timestamp("created_at").defaultNow(),
});

export type CopilotTask = typeof copilotTasks.$inferSelect;

// ============================================================
// EMAIL TEMPLATES LIBRARY
// ============================================================

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  category: text("category").default("general"), // cold_email | follow_up | break_up | meeting | nurture
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  isPublic: boolean("is_public").default(false),
  useCount: integer("use_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true, createdAt: true });
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

// ============================================================
// CAMPAIGN ANALYTICS — Daily aggregated metrics
// ============================================================

export const campaignDailyAnalytics = pgTable("campaign_daily_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  campaignId: varchar("campaign_id"),
  date: text("date").notNull(), // YYYY-MM-DD
  emailsSent: integer("emails_sent").default(0),
  emailsOpened: integer("emails_opened").default(0),
  emailsReplied: integer("emails_replied").default(0),
  emailsBounced: integer("emails_bounced").default(0),
  emailsClicked: integer("emails_clicked").default(0),
  opportunities: integer("opportunities").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CampaignDailyAnalytic = typeof campaignDailyAnalytics.$inferSelect;
