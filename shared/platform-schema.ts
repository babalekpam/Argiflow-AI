import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, timestamp, boolean, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// Plan Limits (constant)
// ============================================================

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
// Agent Configs — with DB index
// ============================================================

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
}, (table) => [
  index("agent_configs_user_type_idx").on(table.userId, table.agentType),
]);

export const insertAgentConfigSchema = createInsertSchema(agentConfigs).omit({ id: true, createdAt: true });
export type AgentConfig = typeof agentConfigs.$inferSelect;
export type InsertAgentConfig = z.infer<typeof insertAgentConfigSchema>;

// ============================================================
// Agent Tasks
// ============================================================

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

export const insertAgentTaskSchema = createInsertSchema(agentTasks).omit({ id: true, createdAt: true });
export type AgentTask = typeof agentTasks.$inferSelect;
export type InsertAgentTask = z.infer<typeof insertAgentTaskSchema>;

// ============================================================
// Agent Runs
// ============================================================

export const agentRuns = pgTable("agent_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  agentId: text("agent_id").notNull(),
  agentName: text("agent_name"),
  prompt: text("prompt"),
  output: text("output"),
  provider: text("provider"),
  model: text("model"),
  status: text("status").default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAgentRunSchema = createInsertSchema(agentRuns).omit({ id: true, createdAt: true });
export type AgentRun = typeof agentRuns.$inferSelect;
export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;

// ============================================================
// Notifications
// ============================================================

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

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// ============================================================
// Usage Tracking
// ============================================================

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

// ============================================================
// Pipeline Snapshots
// ============================================================

export const pipelineSnapshots = pgTable("pipeline_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  found: integer("found").default(0),
  enriched: integer("enriched").default(0),
  contacted: integer("contacted").default(0),
  replied: integer("replied").default(0),
  meeting: integer("meeting").default(0),
  closed: integer("closed").default(0),
  snappedAt: timestamp("snapped_at").defaultNow(),
});

export const insertPipelineSnapshotSchema = createInsertSchema(pipelineSnapshots).omit({ id: true, snappedAt: true });
export type PipelineSnapshot = typeof pipelineSnapshots.$inferSelect;
export type InsertPipelineSnapshot = z.infer<typeof insertPipelineSnapshotSchema>;

// ============================================================
// Credits Ledger
// ============================================================

export const creditsLedger = pgTable("credits_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  action: text("action").notNull(),
  creditsUsed: integer("credits_used").notNull(),
  provider: text("provider"),
  model: text("model"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCreditsLedgerSchema = createInsertSchema(creditsLedger).omit({ id: true, createdAt: true });
export type CreditsLedger = typeof creditsLedger.$inferSelect;
export type InsertCreditsLedger = z.infer<typeof insertCreditsLedgerSchema>;

// ============================================================
// Subscriptions
// ============================================================

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

// ============================================================
// Auto Lead Gen Runs
// ============================================================

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

// ============================================================
// Platform Promotion Runs
// ============================================================

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

// ============================================================
// Sites
// ============================================================

export const sites = pgTable("sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug"),
  url: text("url"),
  status: text("status").default("draft"),
  visitors: integer("visitors").default(0),
  blocks: text("blocks").default("[]"),
  pages: text("pages").default('["Home"]'),
  template: text("template").default("blank"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSiteSchema = createInsertSchema(sites).omit({ id: true, createdAt: true, updatedAt: true });
export type Site = typeof sites.$inferSelect;
export type InsertSite = z.infer<typeof insertSiteSchema>;

// ============================================================
// Supplier Products
// ============================================================

export const supplierProducts = pgTable("supplier_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  siteId: varchar("site_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  supplierUrl: text("supplier_url"),
  productName: text("product_name").notNull(),
  description: text("description"),
  category: text("category"),
  supplierPrice: real("supplier_price").notNull(),
  suggestedRetailPrice: real("suggested_retail_price"),
  margin: real("margin"),
  aiNotes: text("ai_notes"),
  imageUrl: text("image_url"),
  images: text("images").array().default(sql`'{}'::text[]`),
  status: text("status").default("imported"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupplierProductSchema = createInsertSchema(supplierProducts).omit({ id: true, createdAt: true });
export type SupplierProduct = typeof supplierProducts.$inferSelect;
export type InsertSupplierProduct = z.infer<typeof insertSupplierProductSchema>;

// ============================================================
// Auth Tokens
// ============================================================

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
