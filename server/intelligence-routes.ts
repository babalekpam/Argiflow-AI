// ============================================================
// ARGILETTE B2B SALES INTELLIGENCE — API ROUTES
// Apollo.io + ZoomInfo feature parity
// Drop this into: server/intelligence-routes.ts
// Mount: app.use("/api/intelligence", intelligenceRoutes);
// ============================================================

import { Router, type Request, type Response } from "express";
import { eq, and, desc, sql, count, ilike, or } from "drizzle-orm";
import { db } from "./db";
import {
  contactProfiles, companyProfiles, intentSignals,
  technographics, orgChartEntries, savedSearches,
  prospectLists, prospectListMembers, enrichmentJobs,
  dataCredits, companyEvents,
} from "../shared/intelligence-schema";
import { leads, userSettings } from "../shared/schema";
import { campaigns, campaignLeads } from "../shared/instantly-schema";
import { intelligenceEngine } from "./intelligence-engine";

const router = Router();

function requireUser(req: Request, res: Response, next: Function) {
  if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}
router.use(requireUser);

function getUserId(req: Request): string { return req.session.userId!; }

async function useCredits(userId: string, action: string, entityId?: string, entityType?: string, amount: number = 1) {
  await db.insert(dataCredits).values({ userId, action, creditsUsed: amount, entityId, entityType });
}

// ============================================================
// PEOPLE SEARCH (Apollo-style)
// ============================================================

router.post("/people/search", async (req, res) => {
  try {
    const userId = getUserId(req);
    const filters = req.body;

    // First try database
    let conditions: any[] = [];
    if (filters.jobTitle) conditions.push(ilike(contactProfiles.jobTitle, `%${filters.jobTitle}%`));
    if (filters.companyName) conditions.push(ilike(contactProfiles.companyName, `%${filters.companyName}%`));
    if (filters.location?.country) conditions.push(eq(contactProfiles.country, filters.location.country));
    if (filters.location?.state) conditions.push(eq(contactProfiles.state, filters.location.state));
    if (filters.location?.city) conditions.push(ilike(contactProfiles.city, `%${filters.location.city}%`));

    let dbResults: any[] = [];
    if (conditions.length > 0) {
      dbResults = await db.select().from(contactProfiles)
        .where(and(...conditions))
        .orderBy(desc(contactProfiles.dataQualityScore))
        .limit(filters.limit || 25)
        .offset(((filters.page || 1) - 1) * (filters.limit || 25));
    }

    // If not enough results, supplement with engine
    if (dbResults.length < (filters.limit || 25)) {
      const engineResults = intelligenceEngine.searchPeople(filters);
      // Merge: DB results first, then engine fills gaps
      const combined = [...dbResults, ...engineResults.results.slice(0, (filters.limit || 25) - dbResults.length)];

      return res.json({
        results: combined,
        total: engineResults.total + dbResults.length,
        page: filters.page || 1,
        pages: Math.ceil((engineResults.total + dbResults.length) / (filters.limit || 25)),
        source: dbResults.length > 0 ? "database+engine" : "engine",
      });
    }

    const [totalCount] = await db.select({ count: count() }).from(contactProfiles)
      .where(conditions.length > 0 ? and(...conditions) : sql`1=1`);

    res.json({
      results: dbResults,
      total: totalCount?.count || 0,
      page: filters.page || 1,
      pages: Math.ceil((totalCount?.count || 0) / (filters.limit || 25)),
      source: "database",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Reveal contact details (costs credits)
router.post("/people/:id/reveal", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const [contact] = await db.select().from(contactProfiles).where(eq(contactProfiles.id, id));
    if (!contact) return res.status(404).json({ error: "Contact not found" });

    await useCredits(userId, "contact_reveal", id, "contact");

    res.json({
      ...contact,
      revealed: true,
      workEmail: contact.workEmail,
      directPhone: contact.directPhone,
      mobilePhone: contact.mobilePhone,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// COMPANY SEARCH
// ============================================================

router.post("/companies/search", async (req, res) => {
  try {
    const filters = req.body;

    let conditions: any[] = [];
    if (filters.name) conditions.push(ilike(companyProfiles.name, `%${filters.name}%`));
    if (filters.industry) conditions.push(eq(companyProfiles.industry, filters.industry));
    if (filters.location?.country) conditions.push(eq(companyProfiles.hqCountry, filters.location.country));
    if (filters.location?.state) conditions.push(eq(companyProfiles.hqState, filters.location.state));

    let dbResults: any[] = [];
    if (conditions.length > 0) {
      dbResults = await db.select().from(companyProfiles)
        .where(and(...conditions))
        .limit(filters.limit || 25);
    }

    if (dbResults.length < (filters.limit || 25)) {
      const engineResults = intelligenceEngine.searchCompanies(filters);
      const combined = [...dbResults, ...engineResults.results.slice(0, (filters.limit || 25) - dbResults.length)];
      return res.json({ results: combined, total: engineResults.total, page: filters.page || 1 });
    }

    res.json({ results: dbResults, total: dbResults.length, page: filters.page || 1 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Company detail + full profile
router.get("/companies/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const [company] = await db.select().from(companyProfiles).where(eq(companyProfiles.id, req.params.id));
    if (!company) return res.status(404).json({ error: "Not found" });

    // Get contacts at this company
    const contacts = await db.select().from(contactProfiles)
      .where(eq(contactProfiles.companyId, company.id))
      .orderBy(contactProfiles.seniorityLevel)
      .limit(20);

    // Get tech stack
    const techData = await db.select().from(technographics)
      .where(eq(technographics.companyId, company.id));

    // Get intent signals
    const intent = await db.select().from(intentSignals)
      .where(eq(intentSignals.companyId, company.id))
      .orderBy(desc(intentSignals.detectedAt))
      .limit(10);

    // Get news/events
    const events = await db.select().from(companyEvents)
      .where(eq(companyEvents.companyId, company.id))
      .orderBy(desc(companyEvents.eventDate))
      .limit(10);

    await useCredits(userId, "company_lookup", company.id, "company");

    res.json({ ...company, contacts, techStack: techData, intentSignals: intent, events });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// ENRICHMENT — Enrich contacts & companies
// ============================================================

// Enrich single contact
router.post("/enrich/contact", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { email, name, company, linkedinUrl } = req.body;

    const enriched = intelligenceEngine.enrichContact({ email, name, company, linkedinUrl });

    // Save to database
    const [saved] = await db.insert(contactProfiles).values({
      ...enriched,
      skills: JSON.stringify(enriched.skills),
      lastEnrichedAt: new Date(),
    }).returning();

    await useCredits(userId, "enrichment", saved.id, "contact");
    res.json(saved);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Enrich single company
router.post("/enrich/company", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { domain, name } = req.body;

    const enriched = intelligenceEngine.enrichCompany({ domain, name });

    const [saved] = await db.insert(companyProfiles).values({
      ...enriched,
      techStack: JSON.stringify(enriched.techStack),
      lastEnrichedAt: new Date(),
    }).returning();

    await useCredits(userId, "enrichment", saved.id, "company");
    res.json(saved);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Bulk enrich from existing leads
router.post("/enrich/bulk-leads", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { leadIds } = req.body;
    if (!leadIds?.length) return res.status(400).json({ error: "No lead IDs" });

    const [job] = await db.insert(enrichmentJobs).values({
      userId, type: "contact", totalRecords: leadIds.length, status: "processing",
    }).returning();

    let enriched = 0;
    for (const leadId of leadIds) {
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
      if (!lead) continue;

      const data = intelligenceEngine.enrichContact({
        email: lead.email, name: lead.name, company: lead.company || undefined,
      });

      // Save enriched contact profile
      await db.insert(contactProfiles).values({
        ...data,
        skills: JSON.stringify(data.skills || []),
        lastEnrichedAt: new Date(),
      });

      // Update lead with enriched data
      await db.update(leads).set({
        phone: data.directPhone || lead.phone,
        score: Math.min(100, (lead.score || 0) + 15),
        notes: `${lead.notes || ""}\n[Enriched] Title: ${data.jobTitle}, Phone: ${data.directPhone || "N/A"}`,
      }).where(eq(leads.id, leadId));

      enriched++;
    }

    await db.update(enrichmentJobs).set({
      status: "completed", enrichedCount: enriched,
      creditsUsed: enriched, completedAt: new Date(),
    }).where(eq(enrichmentJobs.id, job.id));

    await useCredits(userId, "enrichment", job.id, "batch", enriched);
    res.json({ jobId: job.id, enriched, total: leadIds.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// EMAIL FINDER
// ============================================================

router.post("/find-email", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { firstName, lastName, domain } = req.body;
    if (!firstName || !lastName || !domain) return res.status(400).json({ error: "firstName, lastName, domain required" });

    const result = intelligenceEngine.findEmail(firstName, lastName, domain);
    await useCredits(userId, "email_finder");

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Bulk email finder
router.post("/find-email/bulk", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { contacts } = req.body; // [{firstName, lastName, domain}]
    if (!contacts?.length) return res.status(400).json({ error: "No contacts" });

    const results = contacts.map((c: any) =>
      intelligenceEngine.findEmail(c.firstName, c.lastName, c.domain)
    );

    await useCredits(userId, "email_finder", undefined, undefined, contacts.length);
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// PHONE FINDER
// ============================================================

router.post("/find-phone", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { contactId, name, company } = req.body;

    const result = intelligenceEngine.findPhone(contactId || "", name || "", company || "");
    await useCredits(userId, "phone_finder");

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// INTENT DATA
// ============================================================

router.post("/intent/detect", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { companyDomain, topics } = req.body;
    if (!companyDomain || !topics?.length) return res.status(400).json({ error: "companyDomain and topics required" });

    const signals = intelligenceEngine.detectIntent(companyDomain, topics);

    // Save signals
    for (const signal of signals) {
      await db.insert(intentSignals).values(signal);
    }

    await useCredits(userId, "intent_lookup");
    res.json({ companyDomain, signals, totalSignals: signals.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get intent signals for all companies (dashboard)
router.get("/intent/dashboard", async (req, res) => {
  try {
    const signals = await db.select().from(intentSignals)
      .orderBy(desc(intentSignals.score))
      .limit(50);

    // Group by company
    const byCompany: Record<string, any> = {};
    for (const s of signals) {
      const key = s.companyDomain || s.companyName || "unknown";
      if (!byCompany[key]) {
        byCompany[key] = { company: s.companyName, domain: s.companyDomain, signals: [], maxScore: 0 };
      }
      byCompany[key].signals.push(s);
      byCompany[key].maxScore = Math.max(byCompany[key].maxScore, s.score || 0);
    }

    const ranked = Object.values(byCompany).sort((a: any, b: any) => b.maxScore - a.maxScore);

    res.json({ companies: ranked, totalSignals: signals.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Track custom intent topics
router.post("/intent/topics", async (req, res) => {
  try {
    const { topics } = req.body;
    // In production: subscribe to Bombora/G2 intent streams for these topics
    res.json({ tracked: topics, message: "Intent tracking activated for these topics" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// TECHNOGRAPHICS
// ============================================================

router.post("/technographics/scan", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { companyDomain, companyId } = req.body;

    const stack = intelligenceEngine.detectTechStack(companyDomain);

    // Save to DB
    const results: any[] = [];
    for (const tech of stack) {
      const details = intelligenceEngine.getTechDetails(tech);
      const [entry] = await db.insert(technographics).values({
        companyId, companyDomain,
        technology: tech,
        category: details?.category || "Other",
        status: "active",
        firstDetected: new Date(),
        lastDetected: new Date(),
        confidence: 0.7 + Math.random() * 0.3,
      }).returning();
      results.push({ ...entry, competitors: details?.competitors || [] });
    }

    await useCredits(userId, "enrichment");
    res.json({ companyDomain, technologies: results, count: results.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Search by technology (find companies using X)
router.post("/technographics/search", async (req, res) => {
  try {
    const { technology, category } = req.body;
    let results;

    if (technology) {
      results = await db.select().from(technographics)
        .where(ilike(technographics.technology, `%${technology}%`))
        .limit(50);
    } else if (category) {
      results = await db.select().from(technographics)
        .where(eq(technographics.category, category))
        .limit(50);
    } else {
      return res.status(400).json({ error: "technology or category required" });
    }

    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// ORG CHARTS
// ============================================================

router.get("/org-chart/:companyId", async (req, res) => {
  try {
    const userId = getUserId(req);
    let entries = await db.select().from(orgChartEntries)
      .where(eq(orgChartEntries.companyId, req.params.companyId))
      .orderBy(orgChartEntries.level);

    if (entries.length === 0) {
      // Auto-build from company data
      const [company] = await db.select().from(companyProfiles).where(eq(companyProfiles.id, req.params.companyId));
      if (company) {
        const chart = intelligenceEngine.buildOrgChart(company.name, company.id);
        for (const entry of chart) {
          await db.insert(orgChartEntries).values(entry);
        }
        entries = await db.select().from(orgChartEntries)
          .where(eq(orgChartEntries.companyId, req.params.companyId))
          .orderBy(orgChartEntries.level);
      }
    }

    await useCredits(userId, "org_chart", req.params.companyId, "company");
    res.json(entries);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// COMPANY NEWS & EVENTS
// ============================================================

router.get("/events/:companyDomain", async (req, res) => {
  try {
    let events = await db.select().from(companyEvents)
      .where(eq(companyEvents.companyDomain, req.params.companyDomain))
      .orderBy(desc(companyEvents.eventDate))
      .limit(20);

    if (events.length === 0) {
      // Generate from engine
      const generated = intelligenceEngine.getCompanyEvents(req.params.companyDomain);
      for (const event of generated) {
        const [saved] = await db.insert(companyEvents).values(event).returning();
        events.push(saved);
      }
    }

    res.json(events);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// AI-POWERED DEEP RESEARCH
// ============================================================

router.post("/ai-research/company", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { domain } = req.body;

    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    const apiKey = settings?.anthropicApiKey;
    if (!apiKey) return res.status(400).json({ error: "Set your Anthropic API key in Settings first" });

    const research = await intelligenceEngine.aiResearchCompany(domain, apiKey);
    await useCredits(userId, "enrichment", undefined, "company", 3);

    res.json(research);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/ai-research/contact", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, company, title } = req.body;

    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    const apiKey = settings?.anthropicApiKey;
    if (!apiKey) return res.status(400).json({ error: "Set your Anthropic API key in Settings first" });

    const research = await intelligenceEngine.aiResearchContact(name, company, title, apiKey);
    await useCredits(userId, "enrichment", undefined, "contact", 2);

    res.json(research);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// PROSPECT LISTS
// ============================================================

router.get("/lists", async (req, res) => {
  try {
    const userId = getUserId(req);
    const lists = await db.select().from(prospectLists)
      .where(eq(prospectLists.userId, userId))
      .orderBy(desc(prospectLists.updatedAt));
    res.json(lists);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/lists", async (req, res) => {
  try {
    const userId = getUserId(req);
    const [list] = await db.insert(prospectLists).values({ ...req.body, userId }).returning();
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/lists/:id/add", async (req, res) => {
  try {
    const { contactIds, companyIds } = req.body;
    const listId = req.params.id;
    let added = 0;

    if (contactIds?.length) {
      for (const contactId of contactIds) {
        await db.insert(prospectListMembers).values({ listId, contactId });
        added++;
      }
    }
    if (companyIds?.length) {
      for (const companyId of companyIds) {
        await db.insert(prospectListMembers).values({ listId, companyId });
        added++;
      }
    }

    await db.update(prospectLists).set({
      contactCount: sql`${prospectLists.contactCount} + ${contactIds?.length || 0}`,
      companyCount: sql`${prospectLists.companyCount} + ${companyIds?.length || 0}`,
      updatedAt: new Date(),
    }).where(eq(prospectLists.id, listId));

    res.json({ success: true, added });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/lists/:id/members", async (req, res) => {
  try {
    const members = await db.select().from(prospectListMembers)
      .where(eq(prospectListMembers.listId, req.params.id));

    // Hydrate contacts and companies
    const contacts: any[] = [];
    const companies: any[] = [];

    for (const m of members) {
      if (m.contactId) {
        const [c] = await db.select().from(contactProfiles).where(eq(contactProfiles.id, m.contactId));
        if (c) contacts.push(c);
      }
      if (m.companyId) {
        const [c] = await db.select().from(companyProfiles).where(eq(companyProfiles.id, m.companyId));
        if (c) companies.push(c);
      }
    }

    res.json({ contacts, companies });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Push list to campaign
router.post("/lists/:id/to-campaign", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { campaignId } = req.body;
    if (!campaignId) return res.status(400).json({ error: "campaignId required" });

    const members = await db.select().from(prospectListMembers)
      .where(eq(prospectListMembers.listId, req.params.id));

    let enrolled = 0;
    for (const m of members) {
      if (!m.contactId) continue;
      const [contact] = await db.select().from(contactProfiles).where(eq(contactProfiles.id, m.contactId));
      if (!contact?.workEmail) continue;

      // Create lead if not exists
      const existing = await db.select().from(leads)
        .where(and(eq(leads.userId, userId), eq(leads.email, contact.workEmail)));

      let leadId: string;
      if (existing.length === 0) {
        const [newLead] = await db.insert(leads).values({
          userId,
          name: contact.fullName || `${contact.firstName} ${contact.lastName}`,
          email: contact.workEmail,
          company: contact.companyName || undefined,
          source: "intelligence",
          status: "new",
          notes: `Title: ${contact.jobTitle}. From prospect list.`,
        }).returning();
        leadId = newLead.id;
      } else {
        leadId = existing[0].id;
      }

      // Add to campaign
      await db.insert(campaignLeads).values({ campaignId, leadId }).onConflictDoNothing();
      enrolled++;
    }

    res.json({ success: true, enrolled });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/lists/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    await db.delete(prospectListMembers).where(eq(prospectListMembers.listId, req.params.id));
    await db.delete(prospectLists).where(and(eq(prospectLists.id, req.params.id), eq(prospectLists.userId, userId)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// SAVED SEARCHES + ALERTS
// ============================================================

router.get("/saved-searches", async (req, res) => {
  try {
    const userId = getUserId(req);
    const searches = await db.select().from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .orderBy(desc(savedSearches.lastRunAt));
    res.json(searches);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/saved-searches", async (req, res) => {
  try {
    const userId = getUserId(req);
    const [search] = await db.insert(savedSearches).values({
      ...req.body, userId, filters: JSON.stringify(req.body.filters),
    }).returning();
    res.json(search);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/saved-searches/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    await db.delete(savedSearches)
      .where(and(eq(savedSearches.id, req.params.id), eq(savedSearches.userId, userId)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// CREDITS & USAGE
// ============================================================

router.get("/credits", async (req, res) => {
  try {
    const userId = getUserId(req);
    const usage = await db.select({
      action: dataCredits.action,
      total: sql<number>`sum(${dataCredits.creditsUsed})::int`,
    }).from(dataCredits)
      .where(eq(dataCredits.userId, userId))
      .groupBy(dataCredits.action);

    const totalUsed = usage.reduce((sum, u) => sum + (u.total || 0), 0);

    // In production: check subscription plan for credit limits
    const monthlyAllowance = 1000;

    res.json({
      used: totalUsed,
      remaining: Math.max(0, monthlyAllowance - totalUsed),
      allowance: monthlyAllowance,
      breakdown: usage,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// EXPORT DATA
// ============================================================

router.post("/export", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { contactIds, companyIds, format = "json" } = req.body;
    const exportData: any = { contacts: [], companies: [] };

    if (contactIds?.length) {
      for (const id of contactIds) {
        const [c] = await db.select().from(contactProfiles).where(eq(contactProfiles.id, id));
        if (c) exportData.contacts.push(c);
      }
    }
    if (companyIds?.length) {
      for (const id of companyIds) {
        const [c] = await db.select().from(companyProfiles).where(eq(companyProfiles.id, id));
        if (c) exportData.companies.push(c);
      }
    }

    await useCredits(userId, "export", undefined, undefined, (contactIds?.length || 0) + (companyIds?.length || 0));

    if (format === "csv") {
      // Convert to CSV
      const rows = exportData.contacts.map((c: any) =>
        `${c.fullName},${c.workEmail},${c.directPhone || ""},${c.jobTitle},${c.companyName},${c.linkedinUrl || ""}`
      );
      const csv = `Name,Email,Phone,Title,Company,LinkedIn\n${rows.join("\n")}`;
      res.setHeader("Content-Type", "text/csv");
      return res.send(csv);
    }

    res.json(exportData);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// INTELLIGENCE DASHBOARD
// ============================================================

router.get("/dashboard", async (req, res) => {
  try {
    const userId = getUserId(req);

    const [contactCount] = await db.select({ count: count() }).from(contactProfiles);
    const [companyCount] = await db.select({ count: count() }).from(companyProfiles);
    const [signalCount] = await db.select({ count: count() }).from(intentSignals);
    const [listCount] = await db.select({ count: count() }).from(prospectLists).where(eq(prospectLists.userId, userId));

    // Top intent companies
    const topIntent = await db.select().from(intentSignals)
      .orderBy(desc(intentSignals.score))
      .limit(5);

    // Recent enrichments
    const recentEnrichments = await db.select().from(enrichmentJobs)
      .where(eq(enrichmentJobs.userId, userId))
      .orderBy(desc(enrichmentJobs.createdAt))
      .limit(5);

    // Credit usage
    const creditUsage = await db.select({
      total: sql<number>`sum(${dataCredits.creditsUsed})::int`,
    }).from(dataCredits).where(eq(dataCredits.userId, userId));

    res.json({
      totalContacts: contactCount?.count || 0,
      totalCompanies: companyCount?.count || 0,
      totalIntentSignals: signalCount?.count || 0,
      prospectLists: listCount?.count || 0,
      topIntentCompanies: topIntent,
      recentEnrichments,
      creditsUsed: creditUsage[0]?.total || 0,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
