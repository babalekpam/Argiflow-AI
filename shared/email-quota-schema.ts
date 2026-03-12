import { sql } from "drizzle-orm";
import { pgTable, varchar, integer, timestamp, boolean, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const emailPlanEnum = pgEnum("email_plan", [
  "starter",
  "growth",
  "pro",
  "agency",
]);

export const emailQuotas = pgTable("email_quotas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  plan: emailPlanEnum("plan").notNull().default("starter"),
  monthlyLimit: integer("monthly_limit").notNull().default(2500),
  sentThisMonth: integer("sent_this_month").notNull().default(0),
  sentAllTime: integer("sent_all_time").notNull().default(0),
  resetDate: timestamp("reset_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailSendsLog = pgTable("email_sends_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  to: text("to").notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  tag: varchar("tag", { length: 100 }),
  postalMsgId: varchar("postal_msg_id", { length: 200 }),
  postalToken: varchar("postal_token", { length: 100 }),
  status: varchar("status", { length: 50 }).notNull().default("sent"),
  errorMsg: text("error_msg"),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const insertEmailQuotaSchema = createInsertSchema(emailQuotas);
export const insertEmailSendLogSchema = createInsertSchema(emailSendsLog);

export type EmailQuota = typeof emailQuotas.$inferSelect;
export type InsertEmailQuota = z.infer<typeof insertEmailQuotaSchema>;
export type EmailSendLog = typeof emailSendsLog.$inferSelect;

export const EMAIL_PLAN_LIMITS: Record<string, number> = {
  starter: 2500,
  growth: 10000,
  pro: 50000,
  agency: 150000,
};

export const EMAIL_PLAN_PRICES: Record<string, number> = {
  starter: 0,
  growth: 47,
  pro: 97,
  agency: 197,
};
