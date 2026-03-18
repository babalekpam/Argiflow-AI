import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const marketingAutopilot = pgTable("marketing_autopilot", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  businessProfile: text("business_profile"),
  marketingPlan: text("marketing_plan"),
  activeChannels: text("active_channels").default("email,content"),
  frequency: text("frequency").notNull().default("daily"),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  totalActions: integer("total_actions").default(0),
  totalEmailsSent: integer("total_emails_sent").default(0),
  totalLeadsGenerated: integer("total_leads_generated").default(0),
  totalCampaignsCreated: integer("total_campaigns_created").default(0),
  status: text("status").notNull().default("idle"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const autopilotActions = pgTable("autopilot_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  actionType: text("action_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  result: text("result"),
  status: text("status").notNull().default("pending"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMarketingAutopilotSchema = createInsertSchema(marketingAutopilot).omit({ id: true, createdAt: true, updatedAt: true });
export type MarketingAutopilotConfig = typeof marketingAutopilot.$inferSelect;
export type InsertMarketingAutopilotConfig = z.infer<typeof insertMarketingAutopilotSchema>;

export const insertAutopilotActionSchema = createInsertSchema(autopilotActions).omit({ id: true, createdAt: true });
export type AutopilotAction = typeof autopilotActions.$inferSelect;
export type InsertAutopilotAction = z.infer<typeof insertAutopilotActionSchema>;
