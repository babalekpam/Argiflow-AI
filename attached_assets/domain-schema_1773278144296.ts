// ============================================================
// WHITE-LABEL DOMAIN SCHEMA — ArgiFlow
// Each client can connect their own sending domain
// ============================================================

import { pgTable, varchar, integer, timestamp, boolean, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const domainStatusEnum = pgEnum("domain_status", [
  "pending",    // Just added, DNS not configured yet
  "verifying",  // DNS records added, waiting for propagation
  "active",     // Verified and sending
  "failed",     // Verification failed
  "suspended",  // Suspended by admin
]);

export const clientDomains = pgTable("client_domains", {
  id:               varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:           varchar("user_id", { length: 36 }).notNull(),
  domain:           varchar("domain", { length: 255 }).notNull().unique(),
  status:           domainStatusEnum("status").notNull().default("pending"),

  // DNS Records they need to add
  dkimSelector:     varchar("dkim_selector", { length: 100 }).notNull(),  // e.g. "postal-abc123"
  dkimPublicKey:    text("dkim_public_key"),                               // Full DKIM TXT value
  spfRecord:        text("spf_record"),                                    // SPF TXT value
  returnPathHost:   varchar("return_path_host", { length: 255 }),          // CNAME target

  // Postal internal IDs (set after domain added to Postal)
  postalDomainId:   integer("postal_domain_id"),
  postalServerId:   integer("postal_server_id"),

  // Verification tracking
  spfVerified:      boolean("spf_verified").default(false),
  dkimVerified:     boolean("dkim_verified").default(false),
  returnPathVerified: boolean("return_path_verified").default(false),
  lastCheckedAt:    timestamp("last_checked_at"),
  verifiedAt:       timestamp("verified_at"),

  // Default sender for this domain
  defaultFromName:  varchar("default_from_name", { length: 255 }),
  defaultFromEmail: varchar("default_from_email", { length: 255 }),

  createdAt:        timestamp("created_at").defaultNow(),
  updatedAt:        timestamp("updated_at").defaultNow(),
});

export const insertClientDomainSchema = createInsertSchema(clientDomains);
export const selectClientDomainSchema = createSelectSchema(clientDomains);
export type ClientDomain = typeof clientDomains.$inferSelect;
