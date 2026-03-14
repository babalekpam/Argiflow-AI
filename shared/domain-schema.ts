import { pgTable, varchar, integer, timestamp, boolean, text, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

export const domainStatusEnum = pgEnum("domain_status", [
  "pending",
  "verifying",
  "active",
  "failed",
  "suspended",
]);

export const clientDomains = pgTable("client_domains", {
  id:               varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId:           varchar("user_id", { length: 36 }).notNull(),
  domain:           varchar("domain", { length: 255 }).notNull().unique(),
  status:           domainStatusEnum("status").notNull().default("pending"),

  dkimSelector:     varchar("dkim_selector", { length: 100 }).notNull(),
  dkimPublicKey:    text("dkim_public_key"),
  spfRecord:        text("spf_record"),
  returnPathHost:   varchar("return_path_host", { length: 255 }),

  postalDomainId:   integer("postal_domain_id"),
  postalServerId:   integer("postal_server_id"),

  sesVerified:      boolean("ses_verified").default(false),
  sesDkimTokens:    text("ses_dkim_tokens"),

  spfVerified:      boolean("spf_verified").default(false),
  dkimVerified:     boolean("dkim_verified").default(false),
  returnPathVerified: boolean("return_path_verified").default(false),
  lastCheckedAt:    timestamp("last_checked_at"),
  verifiedAt:       timestamp("verified_at"),

  defaultFromName:  varchar("default_from_name", { length: 255 }),
  defaultFromEmail: varchar("default_from_email", { length: 255 }),

  createdAt:        timestamp("created_at").defaultNow(),
  updatedAt:        timestamp("updated_at").defaultNow(),
});

export const insertClientDomainSchema = createInsertSchema(clientDomains).omit({ id: true, createdAt: true, updatedAt: true });
export type ClientDomain = typeof clientDomains.$inferSelect;
export type InsertClientDomain = typeof clientDomains.$inferInsert;
