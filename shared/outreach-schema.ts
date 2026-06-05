import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, timestamp, boolean, real, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// Multi-Channel Sequences
// ============================================================

export const sequences = pgTable("sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  totalEnrolled: integer("total_enrolled").default(0),
  totalCompleted: integer("total_completed").default(0),
  totalReplied: integer("total_replied").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sequenceSteps = pgTable("sequence_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequenceId: varchar("sequence_id").notNull(),
  stepNumber: integer("step_number").notNull(),
  channel: text("channel").notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  delayDays: integer("delay_days").notNull().default(1),
  delayHours: integer("delay_hours").notNull().default(0),
  variants: text("variants"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sequenceEnrollments = pgTable("sequence_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sequenceId: varchar("sequence_id").notNull(),
  leadId: varchar("lead_id").notNull(),
  userId: varchar("user_id").notNull(),
  currentStep: integer("current_step").notNull().default(0),
  status: text("status").notNull().default("active"),
  nextSendAt: timestamp("next_send_at"),
  completedAt: timestamp("completed_at"),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
});

export const insertSequenceSchema = createInsertSchema(sequences).omit({ id: true, createdAt: true, updatedAt: true });
export type Sequence = typeof sequences.$inferSelect;
export type InsertSequence = z.infer<typeof insertSequenceSchema>;

export const insertSequenceStepSchema = createInsertSchema(sequenceSteps).omit({ id: true, createdAt: true });
export type SequenceStep = typeof sequenceSteps.$inferSelect;
export type InsertSequenceStep = z.infer<typeof insertSequenceStepSchema>;

export const insertSequenceEnrollmentSchema = createInsertSchema(sequenceEnrollments).omit({ id: true, enrolledAt: true });
export type SequenceEnrollment = typeof sequenceEnrollments.$inferSelect;
export type InsertSequenceEnrollment = z.infer<typeof insertSequenceEnrollmentSchema>;

// ============================================================
// Email Logs
// ============================================================

export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  leadId: varchar("lead_id"),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject"),
  provider: text("provider").notNull().default("smtp"),
  source: text("source").notNull().default("outreach"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({ id: true, createdAt: true });
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;

// ============================================================
// Email Replies — with DB indexes
// ============================================================

export const emailReplies = pgTable("email_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull(),
  userId: varchar("user_id").notNull(),
  direction: text("direction").notNull(),
  fromEmail: text("from_email").notNull(),
  toEmail: text("to_email").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  messageId: text("message_id"),
  inReplyTo: text("in_reply_to"),
  status: text("status").notNull().default("received"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("email_replies_lead_idx").on(table.leadId),
  index("email_replies_msg_idx").on(table.messageId),
]);

export const insertEmailReplySchema = createInsertSchema(emailReplies).omit({ id: true, createdAt: true });
export type EmailReply = typeof emailReplies.$inferSelect;
export type InsertEmailReply = z.infer<typeof insertEmailReplySchema>;

// ============================================================
// Email Events
// ============================================================

export const emailEvents = pgTable("email_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull(),
  userId: varchar("user_id").notNull(),
  eventType: text("event_type").notNull(),
  metadata: text("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("email_events_lead_idx").on(table.leadId),
]);

export const insertEmailEventSchema = createInsertSchema(emailEvents).omit({ id: true, createdAt: true });
export type EmailEvent = typeof emailEvents.$inferSelect;
export type InsertEmailEvent = z.infer<typeof insertEmailEventSchema>;

// ============================================================
// Voice Calls
// ============================================================

export const voiceCalls = pgTable("voice_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  leadId: varchar("lead_id"),
  agentId: varchar("agent_id"),
  toNumber: text("to_number").notNull(),
  fromNumber: text("from_number"),
  direction: text("direction").notNull().default("outbound"),
  status: text("status").notNull().default("queued"),
  durationSec: integer("duration_sec").default(0),
  outcome: text("outcome"),
  recordingUrl: text("recording_url"),
  transcript: text("transcript"),
  script: text("script"),
  twilioCallSid: text("twilio_call_sid"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVoiceCallSchema = createInsertSchema(voiceCalls).omit({ id: true, createdAt: true });
export type VoiceCall = typeof voiceCalls.$inferSelect;
export type InsertVoiceCall = z.infer<typeof insertVoiceCallSchema>;

// ============================================================
// Intent Data / Activity Tracking
// ============================================================

export const intentActivity = pgTable("intent_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  leadId: varchar("lead_id"),
  company: text("company"),
  signalType: text("signal_type").notNull(),
  signalSource: text("signal_source").notNull(),
  strength: integer("strength").notNull().default(50),
  description: text("description"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIntentActivitySchema = createInsertSchema(intentActivity).omit({ id: true, createdAt: true });
export type IntentActivity = typeof intentActivity.$inferSelect;
export type InsertIntentActivity = z.infer<typeof insertIntentActivitySchema>;

// ============================================================
// Intent Watchlist Signals
// ============================================================

export const intentWatchlistSignals = pgTable("intent_watchlist_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  company: text("company").notNull(),
  domain: text("domain").notNull(),
  signal: text("signal").notNull(),
  strength: text("strength").notNull().default("MED"),
  score: integer("score").default(50),
  source: text("source").default("manual"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIntentWatchlistSignalSchema = createInsertSchema(intentWatchlistSignals).omit({ id: true, createdAt: true });
export type IntentWatchlistSignal = typeof intentWatchlistSignals.$inferSelect;
export type InsertIntentWatchlistSignal = z.infer<typeof insertIntentWatchlistSignalSchema>;

// ============================================================
// Monitored Domains
// ============================================================

export const monitoredDomains = pgTable("monitored_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  domain: text("domain").notNull(),
  company: text("company"),
  active: boolean("active").default(true),
  addedAt: timestamp("added_at").defaultNow(),
});

export const insertMonitoredDomainSchema = createInsertSchema(monitoredDomains).omit({ id: true, addedAt: true });
export type MonitoredDomain = typeof monitoredDomains.$inferSelect;
export type InsertMonitoredDomain = z.infer<typeof insertMonitoredDomainSchema>;

// ============================================================
// LinkedIn Integration
// ============================================================

export const linkedinProfiles = pgTable("linkedin_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  leadId: varchar("lead_id"),
  linkedinUrl: text("linkedin_url").notNull(),
  fullName: text("full_name"),
  headline: text("headline"),
  company: text("company"),
  location: text("location"),
  connectionStatus: text("connection_status").notNull().default("none"),
  outreachStatus: text("outreach_status").notNull().default("none"),
  lastMessageSent: text("last_message_sent"),
  lastMessageAt: timestamp("last_message_at"),
  notes: text("notes"),
  enrichmentData: text("enrichment_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLinkedinProfileSchema = createInsertSchema(linkedinProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type LinkedinProfile = typeof linkedinProfiles.$inferSelect;
export type InsertLinkedinProfile = z.infer<typeof insertLinkedinProfileSchema>;
