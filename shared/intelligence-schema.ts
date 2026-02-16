// ============================================================
// ARGILETTE B2B SALES INTELLIGENCE — DATABASE SCHEMA
// Apollo.io + ZoomInfo feature parity
// Drop this into: shared/intelligence-schema.ts
// Then add: export * from "./intelligence-schema"; to shared/schema.ts
// Run: npm run db:push
// ============================================================

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// CONTACTS DATABASE — The core people directory
// ============================================================

export const contactProfiles = pgTable("contact_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Identity
  firstName: text("first_name"),
  lastName: text("last_name"),
  fullName: text("full_name"),
  // Work
  jobTitle: text("job_title"),
  seniorityLevel: text("seniority_level"), // c_suite | vp | director | manager | individual
  department: text("department"), // engineering | sales | marketing | operations | finance | hr | legal | executive
  // Company link
  companyId: varchar("company_id"),
  companyName: text("company_name"),
  companyDomain: text("company_domain"),
  // Contact info
  workEmail: text("work_email"),
  personalEmail: text("personal_email"),
  emailVerified: boolean("email_verified").default(false),
  emailConfidence: real("email_confidence").default(0), // 0-100
  directPhone: text("direct_phone"),
  mobilePhone: text("mobile_phone"),
  companyPhone: text("company_phone"),
  // Social
  linkedinUrl: text("linkedin_url"),
  twitterUrl: text("twitter_url"),
  githubUrl: text("github_url"),
  // Location
  city: text("city"),
  state: text("state"),
  country: text("country"),
  timezone: text("timezone"),
  // Enrichment
  bio: text("bio"),
  skills: text("skills"), // JSON array
  education: text("education"), // JSON array
  previousCompanies: text("previous_companies"), // JSON array
  yearsExperience: integer("years_experience"),
  // Data quality
  dataSource: text("data_source").default("system"), // system | apollo | zoominfo | linkedin | manual | enrichment
  lastVerifiedAt: timestamp("last_verified_at"),
  lastEnrichedAt: timestamp("last_enriched_at"),
  dataQualityScore: real("data_quality_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContactProfileSchema = createInsertSchema(contactProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type ContactProfile = typeof contactProfiles.$inferSelect;
export type InsertContactProfile = z.infer<typeof insertContactProfileSchema>;

// ============================================================
// COMPANY DATABASE — Firmographics + technographics
// ============================================================

export const companyProfiles = pgTable("company_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Identity
  name: text("name").notNull(),
  domain: text("domain"),
  logoUrl: text("logo_url"),
  description: text("description"),
  // Firmographics
  industry: text("industry"),
  subIndustry: text("sub_industry"),
  sicCode: text("sic_code"),
  naicsCode: text("naics_code"),
  employeeCount: integer("employee_count"),
  employeeRange: text("employee_range"), // 1-10 | 11-50 | 51-200 | 201-500 | 501-1000 | 1001-5000 | 5000+
  annualRevenue: real("annual_revenue"),
  revenueRange: text("revenue_range"), // <1M | 1-10M | 10-50M | 50-100M | 100-500M | 500M-1B | 1B+
  foundedYear: integer("founded_year"),
  companyType: text("company_type"), // public | private | nonprofit | government | education
  stockTicker: text("stock_ticker"),
  // Location
  headquarters: text("headquarters"),
  hqCity: text("hq_city"),
  hqState: text("hq_state"),
  hqCountry: text("hq_country"),
  hqAddress: text("hq_address"),
  hqZip: text("hq_zip"),
  officeLocations: text("office_locations"), // JSON array
  // Technology
  techStack: text("tech_stack"), // JSON array of technologies
  techCategories: text("tech_categories"), // JSON array: CRM, Marketing, Analytics, etc.
  // Funding
  totalFunding: real("total_funding"),
  lastFundingRound: text("last_funding_round"), // seed | series_a | series_b | series_c | ipo
  lastFundingAmount: real("last_funding_amount"),
  lastFundingDate: timestamp("last_funding_date"),
  investors: text("investors"), // JSON array
  // Social
  linkedinUrl: text("linkedin_url"),
  twitterUrl: text("twitter_url"),
  facebookUrl: text("facebook_url"),
  websiteUrl: text("website_url"),
  // Contact info
  mainPhone: text("main_phone"),
  mainEmail: text("main_email"),
  // Scoring
  alexaRank: integer("alexa_rank"),
  employeeGrowth6m: real("employee_growth_6m"), // percentage
  // Data
  dataSource: text("data_source").default("system"),
  lastEnrichedAt: timestamp("last_enriched_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCompanyProfileSchema = createInsertSchema(companyProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;

// ============================================================
// INTENT DATA — Buying signals from web behavior
// ============================================================

export const intentSignals = pgTable("intent_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id"),
  companyName: text("company_name"),
  companyDomain: text("company_domain"),
  // Signal
  topicCategory: text("topic_category").notNull(), // revenue_cycle | medical_billing | practice_management | ehr_migration | credentialing | etc.
  signalType: text("signal_type").notNull(), // content_consumption | job_posting | tech_install | tech_uninstall | funding_event | expansion | hiring_surge
  signalStrength: text("signal_strength").default("medium"), // low | medium | high | surge
  score: integer("score").default(50), // 0-100
  // Details
  source: text("source"), // g2 | capterra | linkedin | indeed | web | technews
  evidence: text("evidence"), // What triggered this signal
  url: text("url"), // Source URL
  // Timing
  detectedAt: timestamp("detected_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Intent signals decay
  createdAt: timestamp("created_at").defaultNow(),
});

export type IntentSignal = typeof intentSignals.$inferSelect;

// ============================================================
// TECHNOGRAPHICS — Technology installations
// ============================================================

export const technographics = pgTable("technographics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id"),
  companyDomain: text("company_domain"),
  technology: text("technology").notNull(), // e.g. "Salesforce", "HubSpot", "Epic EHR"
  category: text("category").notNull(), // CRM | EHR | Marketing | Analytics | Billing | PM | Communication
  subCategory: text("sub_category"),
  status: text("status").default("active"), // active | recently_added | recently_removed
  firstDetected: timestamp("first_detected"),
  lastDetected: timestamp("last_detected"),
  confidence: real("confidence").default(0.8),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Technographic = typeof technographics.$inferSelect;

// ============================================================
// ORG CHARTS — Company hierarchy
// ============================================================

export const orgChartEntries = pgTable("org_chart_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull(),
  contactId: varchar("contact_id"),
  // Role
  name: text("name").notNull(),
  title: text("title"),
  department: text("department"),
  seniorityLevel: text("seniority_level"),
  // Hierarchy
  reportsToId: varchar("reports_to_id"), // parent entry
  level: integer("level").default(0), // 0 = CEO, 1 = C-suite, 2 = VP, etc.
  // Contact info
  email: text("email"),
  phone: text("phone"),
  linkedinUrl: text("linkedin_url"),
  // Flags
  isDecisionMaker: boolean("is_decision_maker").default(false),
  isBudgetHolder: boolean("is_budget_holder").default(false),
  isInfluencer: boolean("is_influencer").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type OrgChartEntry = typeof orgChartEntries.$inferSelect;

// ============================================================
// SAVED SEARCHES — Reusable search queries
// ============================================================

export const savedSearches = pgTable("saved_searches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  searchType: text("search_type").notNull(), // people | companies
  filters: text("filters").notNull(), // JSON filter criteria
  resultCount: integer("result_count").default(0),
  lastRunAt: timestamp("last_run_at"),
  // Alerts
  alertEnabled: boolean("alert_enabled").default(false),
  alertFrequency: text("alert_frequency").default("daily"), // daily | weekly
  lastAlertAt: timestamp("last_alert_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSavedSearchSchema = createInsertSchema(savedSearches).omit({ id: true, createdAt: true });
export type SavedSearch = typeof savedSearches.$inferSelect;

// ============================================================
// PROSPECT LISTS — Curated lead lists
// ============================================================

export const prospectLists = pgTable("prospect_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  contactCount: integer("contact_count").default(0),
  companyCount: integer("company_count").default(0),
  isShared: boolean("is_shared").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProspectListSchema = createInsertSchema(prospectLists).omit({ id: true, createdAt: true, updatedAt: true });
export type ProspectList = typeof prospectLists.$inferSelect;

export const prospectListMembers = pgTable("prospect_list_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listId: varchar("list_id").notNull(),
  contactId: varchar("contact_id"),
  companyId: varchar("company_id"),
  addedAt: timestamp("added_at").defaultNow(),
});

export type ProspectListMember = typeof prospectListMembers.$inferSelect;

// ============================================================
// ENRICHMENT JOBS — Batch enrichment tracking
// ============================================================

export const enrichmentJobs = pgTable("enrichment_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // contact | company | email_finder | phone_finder
  status: text("status").notNull().default("pending"), // pending | processing | completed | failed
  totalRecords: integer("total_records").default(0),
  enrichedCount: integer("enriched_count").default(0),
  failedCount: integer("failed_count").default(0),
  creditsUsed: integer("credits_used").default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type EnrichmentJob = typeof enrichmentJobs.$inferSelect;

// ============================================================
// DATA CREDITS — Usage tracking
// ============================================================

export const dataCredits = pgTable("data_credits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  action: text("action").notNull(), // contact_reveal | company_lookup | email_finder | phone_finder | enrichment | export | intent_lookup | org_chart
  creditsUsed: integer("credits_used").default(1),
  entityId: varchar("entity_id"), // contact or company id
  entityType: text("entity_type"), // contact | company
  createdAt: timestamp("created_at").defaultNow(),
});

export type DataCredit = typeof dataCredits.$inferSelect;

// ============================================================
// NEWS & COMPANY EVENTS — Trigger-based selling
// ============================================================

export const companyEvents = pgTable("company_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id"),
  companyName: text("company_name"),
  companyDomain: text("company_domain"),
  eventType: text("event_type").notNull(), // funding | acquisition | ipo | expansion | layoff | leadership_change | product_launch | partnership | award | hiring_surge
  title: text("title").notNull(),
  summary: text("summary"),
  sourceUrl: text("source_url"),
  sourceName: text("source_name"),
  eventDate: timestamp("event_date"),
  relevanceScore: integer("relevance_score").default(50),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CompanyEvent = typeof companyEvents.$inferSelect;

// ============================================================
// SEARCH FILTER CONSTANTS
// ============================================================

export const SENIORITY_LEVELS = ["c_suite", "vp", "director", "manager", "senior", "individual", "intern"] as const;
export const DEPARTMENTS = ["engineering", "sales", "marketing", "operations", "finance", "hr", "legal", "executive", "it", "product", "customer_success", "support"] as const;
export const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10000+"] as const;
export const REVENUE_RANGES = ["<1M", "1-10M", "10-50M", "50-100M", "100-500M", "500M-1B", "1B+"] as const;
export const COMPANY_TYPES = ["public", "private", "nonprofit", "government", "education"] as const;
export const TECH_CATEGORIES = ["CRM", "EHR", "Marketing", "Analytics", "Billing", "Project_Management", "Communication", "HR", "Finance", "Security", "Cloud", "AI_ML"] as const;
export const SIGNAL_TYPES = ["content_consumption", "job_posting", "tech_install", "tech_uninstall", "funding_event", "expansion", "hiring_surge", "leadership_change"] as const;
