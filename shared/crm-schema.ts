import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, timestamp, boolean, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// Funnels & Pipeline
// ============================================================

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

// ============================================================
// Marketing Strategies
// ============================================================

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

export const insertMarketingStrategySchema = createInsertSchema(marketingStrategies).omit({ id: true, createdAt: true, updatedAt: true });
export type MarketingStrategy = typeof marketingStrategies.$inferSelect;
export type InsertMarketingStrategy = z.infer<typeof insertMarketingStrategySchema>;

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
