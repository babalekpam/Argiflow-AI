import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, timestamp, boolean, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// Landing Pages / Funnel Builder
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
// Forms & Surveys Builder
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
// Chat Widget / Live Chat
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
// Blog Builder
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
// Community Spaces
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

// ============================================================
// Membership / Course Platform
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
// Documents & E-Signatures
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
// Proposals & Estimates
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
// Affiliate Management
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
// A/B Testing
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
// Calendar Events
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
// Invoices & Payments
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
