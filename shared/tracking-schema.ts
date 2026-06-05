import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, timestamp, boolean, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// Website / Event Tracking Tables
// ============================================================

export const trackVisitors = pgTable("track_visitors", {
  visitorId: text("visitor_id").primaryKey(),
  userId: varchar("user_id"),
  email: text("email"),
  name: text("name"),
  company: text("company"),
  firstIp: text("first_ip"),
  firstBrowser: text("first_browser"),
  firstDevice: text("first_device"),
  firstSeen: timestamp("first_seen").defaultNow(),
  lastSeen: timestamp("last_seen").defaultNow(),
  visitCount: integer("visit_count").default(1),
});

export const trackSessions = pgTable("track_sessions", {
  sessionId: text("session_id").primaryKey(),
  visitorId: text("visitor_id").notNull(),
  userId: varchar("user_id"),
  entryPage: text("entry_page"),
  exitPage: text("exit_page"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  ip: text("ip"),
  browser: text("browser"),
  device: text("device"),
  isMobile: boolean("is_mobile").default(false),
  pageCount: integer("page_count").default(1),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const trackPageviews = pgTable("track_pageviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id"),
  visitorId: text("visitor_id"),
  userId: varchar("user_id"),
  page: text("page").notNull(),
  title: text("title"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmTerm: text("utm_term"),
  ip: text("ip"),
  browser: text("browser"),
  device: text("device"),
  isMobile: boolean("is_mobile").default(false),
  screenWidth: integer("screen_width"),
  screenHeight: integer("screen_height"),
  timezone: text("timezone"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trackClicks = pgTable("track_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id"),
  visitorId: text("visitor_id"),
  page: text("page"),
  elementType: text("element_type"),
  elementText: text("element_text"),
  elementId: text("element_id"),
  elementClass: text("element_class"),
  href: text("href"),
  x: integer("x"),
  y: integer("y"),
  isRageClick: boolean("is_rage_click").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trackSearches = pgTable("track_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id"),
  visitorId: text("visitor_id"),
  userId: varchar("user_id"),
  query: text("query").notNull(),
  page: text("page"),
  resultsCount: integer("results_count").default(0),
  clickedResult: text("clicked_result"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trackSearchTerms = pgTable("track_search_terms", {
  query: text("query").primaryKey(),
  count: integer("count").default(1),
  lastSearchedAt: timestamp("last_searched_at").defaultNow(),
});

export const trackScroll = pgTable("track_scroll", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id"),
  visitorId: text("visitor_id"),
  page: text("page"),
  maxDepthPercent: integer("max_depth_percent").default(0),
  timeToBottomSeconds: integer("time_to_bottom_seconds"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trackForms = pgTable("track_forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id"),
  visitorId: text("visitor_id"),
  page: text("page"),
  formId: text("form_id"),
  formName: text("form_name"),
  eventType: text("event_type").notNull(),
  fieldName: text("field_name"),
  timeOnFormSeconds: integer("time_on_form_seconds"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trackCustomEvents = pgTable("track_custom_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id"),
  visitorId: text("visitor_id"),
  userId: varchar("user_id"),
  eventName: text("event_name").notNull(),
  eventCategory: text("event_category"),
  properties: jsonb("properties").default({}),
  page: text("page"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trackEmailSends = pgTable("track_email_sends", {
  token: text("token").primaryKey(),
  userId: varchar("user_id"),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject"),
  campaign: text("campaign"),
  opens: integer("opens").default(0),
  clicks: integer("clicks").default(0),
  openDevice: text("open_device"),
  openBrowser: text("open_browser"),
  firstOpenedAt: timestamp("first_opened_at"),
  lastOpenedAt: timestamp("last_opened_at"),
  firstClickedAt: timestamp("first_clicked_at"),
  lastClickedAt: timestamp("last_clicked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trackEmailLinks = pgTable("track_email_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull(),
  linkId: text("link_id").notNull(),
  originalUrl: text("original_url").notNull(),
  label: text("label"),
});

export const trackEmailEvents = pgTable("track_email_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull(),
  eventType: text("event_type").notNull(),
  linkId: text("link_id"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  browser: text("browser"),
  device: text("device"),
  isMobile: boolean("is_mobile").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
