import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, timestamp, boolean, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// Social Media Management
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
// Reputation Management
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
// WhatsApp Integration
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
// Facebook / Instagram DMs
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
// Google Business Profile
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
