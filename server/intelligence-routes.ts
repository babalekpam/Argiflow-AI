import { Router, type Request, type Response } from "express";
import { eq, and, desc, sql, count, ilike } from "drizzle-orm";
import { db } from "./db";
import {
  contactProfiles, companyProfiles, intentSignals,
  technographics, orgChartEntries, savedSearches,
  prospectLists, prospectListMembers, enrichmentJobs,
  dataCredits, companyEvents,
} from "../shared/intelligence-schema";
import { leads } from "../shared/schema";
import { intelligenceEngine } from "./intelligence-engine";

const router = Router();

function requireUser(req: Request, res: Response, next: Function) {
  if (!req.session?.userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}
router.use(requireUser);

function getUserId(req: Request): string { return req.session.userId!; }

async function useCredits(userId: string, action: string, entityId?: string, entityType?: string, amount: number = 1) {
  try {
    await db.insert(dataCredits).values({ userId, action, creditsUsed: amount, entityId, entityType });
  } catch (e) {}
}

function normalizeContact(c: any): any {
  return {
    id: c.id,
    fullName: c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.name || "Unknown",
    firstName: c.firstName || "",
    lastName: c.lastName || "",
    jobTitle: c.jobTitle || c.title || "Professional",
    previousTitle: c.previousTitle || "",
    companyName: c.companyName || c.company || "",
    companyDomain: c.companyDomain || c.domain || "",
    companyIndustry: c.companyIndustry || "",
    companySize: c.companySize || "",
    workEmail: c.workEmail || c.email || c.personalEmail || "",
    email: c.workEmail || c.email || c.personalEmail || "",
    directPhone: c.directPhone || c.phone || c.mobilePhone || "",
    phone: c.directPhone || c.phone || c.mobilePhone || "",
    mobilePhone: c.mobilePhone || "",
    city: c.city || "",
    state: c.state || "",
    timezone: c.timezone || "",
    location: c.location || [c.city, c.state, c.country].filter(Boolean).join(", ") || "",
    linkedinUrl: c.linkedinUrl || "",
    twitterUrl: c.twitterUrl || "",
    summary: c.summary || c.bio || "",
    bio: c.bio || c.summary || "",
    seniority: c.seniority || c.seniorityLevel || "",
    department: c.department || "",
    education: c.education || "",
    certifications: c.certifications || [],
    skills: c.skills || [],
    yearsExperience: c.yearsExperience || null,
    recentActivity: c.recentActivity || "",
    isDecisionMaker: c.isDecisionMaker || false,
    buyingRole: c.buyingRole || "",
    bestOutreachChannel: c.bestOutreachChannel || "",
    painPoints: c.painPoints || [],
    icebreaker: c.icebreaker || "",
    source: c.source || "",
    dataQualityScore: c.dataQualityScore || 0,
  };
}

function normalizeCompany(c: any): any {
  return {
    id: c.id,
    name: c.name || "Unknown",
    domain: c.domain || (c.website ? c.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : ""),
    website: c.website || (c.domain ? `https://${c.domain}` : ""),
    industry: c.industry || "",
    subIndustry: c.subIndustry || "",
    description: c.description || "",
    location: c.location || [c.city, c.state, c.country].filter(Boolean).join(", ") || "",
    employeeCount: c.employeeCount || c.employeeRange || "",
    employeeRange: c.employeeRange || c.employeeCount || "",
    phone: c.phone || "",
    email: c.email || "",
    revenue: c.revenue || c.annualRevenue || "",
    ownerName: c.ownerName || null,
    ownerTitle: c.ownerTitle || null,
    ownerEmail: c.ownerEmail || null,
    ownerPhone: c.ownerPhone || null,
    ownerLinkedin: c.ownerLinkedin || null,
    keyContacts: c.keyContacts || [],
    technologies: c.technologies || [],
    socialMedia: c.socialMedia || {},
    source: c.source || "",
  };
}

router.post("/people/search", async (req, res) => {
  try {
    const userId = getUserId(req);
    const filters = req.body;

    let conditions: any[] = [];
    if (filters.jobTitle) conditions.push(ilike(contactProfiles.jobTitle, `%${filters.jobTitle}%`));
    if (filters.company) conditions.push(ilike(contactProfiles.companyName, `%${filters.company}%`));
    if (filters.seniority) conditions.push(eq(contactProfiles.seniorityLevel, filters.seniority));
    if (filters.department) conditions.push(eq(contactProfiles.department, filters.department));

    let dbResults: any[] = [];
    if (conditions.length > 0) {
      dbResults = await db.select().from(contactProfiles)
        .where(and(...conditions))
        .orderBy(desc(contactProfiles.dataQualityScore))
        .limit(10);
    }

    if (dbResults.length >= 5) {
      return res.json({ results: dbResults.map(normalizeContact), total: dbResults.length, page: 1, pages: 1, source: "database" });
    }

    const engineResults = await intelligenceEngine.searchPeople(filters);
    const normalizedDb = dbResults.map(normalizeContact);
    const normalizedAi = (engineResults.results || []).map(normalizeContact);
    const combined = [...normalizedDb, ...normalizedAi.slice(0, 10 - normalizedDb.length)];

    await useCredits(userId, "people_search");
    res.json({
      results: combined,
      total: engineResults.total + dbResults.length,
      page: 1,
      pages: engineResults.pages,
      source: dbResults.length > 0 ? "database+ai" : "ai_web_search",
    });
  } catch (e: any) {
    console.error("[Intelligence] People search error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post("/companies/search", async (req, res) => {
  try {
    const userId = getUserId(req);
    const filters = req.body;

    let conditions: any[] = [];
    if (filters.name) conditions.push(ilike(companyProfiles.name, `%${filters.name}%`));
    if (filters.industry) conditions.push(ilike(companyProfiles.industry, `%${filters.industry}%`));
    if (filters.location) {
      conditions.push(sql`(${ilike(companyProfiles.headquarters, `%${filters.location}%`)} OR ${ilike(companyProfiles.hqCity, `%${filters.location}%`)} OR ${ilike(companyProfiles.hqState, `%${filters.location}%`)} OR ${ilike(companyProfiles.hqCountry, `%${filters.location}%`)})`);
    }
    if (filters.minEmployees) conditions.push(sql`${companyProfiles.employeeCount} >= ${parseInt(filters.minEmployees)}`);
    if (filters.maxEmployees) conditions.push(sql`${companyProfiles.employeeCount} <= ${parseInt(filters.maxEmployees)}`);

    let dbResults: any[] = [];
    if (conditions.length > 0) {
      dbResults = await db.select().from(companyProfiles)
        .where(and(...conditions))
        .limit(10);
    }

    if (dbResults.length >= 5) {
      return res.json({ results: dbResults.map(normalizeCompany), total: dbResults.length, page: 1, pages: 1, source: "database" });
    }

    const engineResults = await intelligenceEngine.searchCompanies(filters);
    const normalizedDb = dbResults.map(normalizeCompany);
    const normalizedAi = (engineResults.results || []).map(normalizeCompany);
    const combined = [...normalizedDb, ...normalizedAi.slice(0, 10 - normalizedDb.length)];

    await useCredits(userId, "company_search");
    res.json({
      results: combined,
      total: engineResults.total + dbResults.length,
      page: 1,
      pages: engineResults.pages,
      source: dbResults.length > 0 ? "database+ai" : "ai_web_search",
    });
  } catch (e: any) {
    console.error("[Intelligence] Company search error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post("/contacts/enrich", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { email, name, company, linkedinUrl } = req.body;

    const enriched = await intelligenceEngine.enrichContact({ email, name, company, linkedinUrl });

    const dbRecord: any = {
      firstName: enriched.firstName || null,
      lastName: enriched.lastName || null,
      fullName: enriched.fullName || null,
      jobTitle: enriched.jobTitle || null,
      seniorityLevel: enriched.seniorityLevel || null,
      department: enriched.department || null,
      companyName: enriched.companyName || null,
      companyDomain: enriched.companyDomain || null,
      workEmail: enriched.workEmail || null,
      personalEmail: enriched.personalEmail || null,
      emailVerified: enriched.emailVerified || false,
      emailConfidence: enriched.emailConfidence || 0,
      directPhone: enriched.directPhone || null,
      mobilePhone: enriched.mobilePhone || null,
      companyPhone: enriched.officePhone || null,
      linkedinUrl: enriched.linkedinUrl || null,
      twitterUrl: enriched.twitterUrl || null,
      city: enriched.city || null,
      state: enriched.state || null,
      country: enriched.country || "US",
      timezone: enriched.timezone || null,
      bio: enriched.bio || null,
      skills: JSON.stringify(enriched.skills || []),
      education: JSON.stringify(enriched.education || []),
      previousCompanies: JSON.stringify(enriched.workHistory || []),
      yearsExperience: enriched.yearsInRole || null,
      dataSource: enriched.dataSource || "deep_web_enrichment",
      lastEnrichedAt: new Date(),
      dataQualityScore: enriched.dataQualityScore || 50,
    };

    const [saved] = await db.insert(contactProfiles).values(dbRecord).returning();

    const deepData = {
      ...saved,
      previousTitles: enriched.previousTitles || [],
      certifications: enriched.certifications || [],
      specialties: enriched.specialties || [],
      publications: enriched.publications || [],
      awards: enriched.awards || [],
      interests: enriched.interests || [],
      languages: enriched.languages || [],
      otherSocialUrls: enriched.otherSocialUrls || [],
      isDecisionMaker: enriched.isDecisionMaker || false,
      isBudgetHolder: enriched.isBudgetHolder || false,
      buyingRole: enriched.buyingRole || "end_user",
      bestOutreachChannel: enriched.bestOutreachChannel || "email",
      bestContactTime: enriched.bestContactTime || null,
      personalityType: enriched.personalityType || null,
      communicationStyle: enriched.communicationStyle || null,
      painPoints: enriched.painPoints || [],
      talkingPoints: enriched.talkingPoints || [],
      icebreaker: enriched.icebreaker || "",
      mutualConnections: enriched.mutualConnections || "",
      recentActivity: enriched.recentActivity || "",
      verificationNotes: enriched.verificationNotes || "",
      sourcesUsed: enriched.sourcesUsed || [],
      companyIndustry: enriched.companyIndustry || "",
      companySize: enriched.companySize || "",
    };

    await useCredits(userId, "enrichment", saved.id, "contact");
    res.json(deepData);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/companies/enrich", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { domain, name } = req.body;

    const enriched = await intelligenceEngine.enrichCompany({ domain, name });

    const dbRecord: any = {
      name: enriched.name || name || "Unknown",
      domain: enriched.domain || domain || null,
      description: enriched.description || null,
      industry: enriched.industry || null,
      subIndustry: enriched.subIndustry || null,
      sicCode: enriched.sicCode || null,
      naicsCode: enriched.naicsCode || null,
      employeeCount: enriched.employeeCount || null,
      employeeRange: enriched.employeeRange || null,
      annualRevenue: enriched.annualRevenue || null,
      revenueRange: enriched.revenueRange || null,
      foundedYear: enriched.foundedYear || null,
      companyType: enriched.companyType || "private",
      stockTicker: enriched.stockTicker || null,
      headquarters: enriched.headquarters || null,
      hqCity: enriched.hqCity || null,
      hqState: enriched.hqState || null,
      hqCountry: enriched.hqCountry || "US",
      officeLocations: JSON.stringify(enriched.otherLocations || []),
      techStack: JSON.stringify(enriched.techStack || []),
      investors: JSON.stringify(enriched.investors || []),
      linkedinUrl: enriched.linkedinUrl || null,
      twitterUrl: enriched.twitterUrl || null,
      facebookUrl: enriched.facebookUrl || null,
      websiteUrl: enriched.website || enriched.websiteUrl || (domain ? `https://${domain}` : null),
      mainPhone: enriched.mainPhone || null,
      mainEmail: enriched.generalEmail || null,
      dataSource: enriched.dataSource || "deep_web_enrichment",
      lastEnrichedAt: new Date(),
    };

    const [saved] = await db.insert(companyProfiles).values(dbRecord).returning();

    const deepData = {
      ...saved,
      tagline: enriched.tagline || "",
      ceo: enriched.ceo || "",
      ceoLinkedin: enriched.ceoLinkedin || "",
      founderNames: enriched.founderNames || [],
      keyExecutives: enriched.keyExecutives || [],
      boardMembers: enriched.boardMembers || [],
      keyProducts: enriched.keyProducts || [],
      keyClients: enriched.keyClients || [],
      targetMarket: enriched.targetMarket || "",
      valueProposition: enriched.valueProposition || "",
      competitors: enriched.competitors || [],
      competitiveAdvantage: enriched.competitiveAdvantage || "",
      fundingTotal: enriched.fundingTotal || "",
      fundingRounds: enriched.fundingRounds || [],
      acquisitions: enriched.acquisitions || [],
      partnerships: enriched.partnerships || [],
      awards: enriched.awards || [],
      certifications: enriched.certifications || [],
      recentNews: enriched.recentNews || [],
      hiringSignals: enriched.hiringSignals || [],
      growthIndicators: enriched.growthIndicators || [],
      painPoints: enriched.painPoints || [],
      glassdoorRating: enriched.glassdoorRating || null,
      bbbRating: enriched.bbbRating || null,
      customerReviewSentiment: enriched.customerReviewSentiment || "unknown",
      instagramUrl: enriched.instagramUrl || "",
      youtubeUrl: enriched.youtubeUrl || "",
      dataQualityScore: enriched.dataQualityScore || 50,
      verificationNotes: enriched.verificationNotes || "",
      sourcesUsed: enriched.sourcesUsed || [],
    };

    await useCredits(userId, "enrichment", saved.id, "company");
    res.json(deepData);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/enrichment/jobs", async (req, res) => {
  try {
    const userId = getUserId(req);
    const jobs = await db.select().from(enrichmentJobs)
      .where(eq(enrichmentJobs.userId, userId))
      .orderBy(desc(enrichmentJobs.createdAt))
      .limit(20);
    res.json(jobs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/enrichment/bulk-from-leads", async (req, res) => {
  try {
    const userId = getUserId(req);
    const userLeads = await db.select().from(leads)
      .where(eq(leads.userId, userId))
      .limit(50);

    if (!userLeads.length) return res.json({ count: 0, message: "No leads to enrich" });

    const [job] = await db.insert(enrichmentJobs).values({
      userId, type: "contact", totalRecords: userLeads.length, status: "processing",
    }).returning();

    let enriched = 0;
    for (const lead of userLeads.slice(0, 10)) {
      try {
        const data = await intelligenceEngine.enrichContact({
          email: lead.email || undefined, name: lead.name, company: lead.company || undefined,
        });

        await db.insert(contactProfiles).values({
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          fullName: data.fullName || null,
          jobTitle: data.jobTitle || null,
          seniorityLevel: data.seniorityLevel || null,
          department: data.department || null,
          companyName: data.companyName || null,
          companyDomain: data.companyDomain || null,
          workEmail: data.workEmail || null,
          personalEmail: data.personalEmail || null,
          emailVerified: data.emailVerified || false,
          emailConfidence: data.emailConfidence || 0,
          directPhone: data.directPhone || null,
          mobilePhone: data.mobilePhone || null,
          companyPhone: data.officePhone || null,
          linkedinUrl: data.linkedinUrl || null,
          twitterUrl: data.twitterUrl || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || "US",
          timezone: data.timezone || null,
          bio: data.bio || null,
          skills: JSON.stringify(data.skills || []),
          education: JSON.stringify(data.education || []),
          previousCompanies: JSON.stringify(data.workHistory || []),
          yearsExperience: data.yearsInRole || null,
          dataSource: data.dataSource || "deep_web_enrichment",
          lastEnrichedAt: new Date(),
          dataQualityScore: data.dataQualityScore || 50,
        });

        if (data.directPhone || data.jobTitle !== "Professional") {
          await db.update(leads).set({
            phone: data.directPhone || lead.phone,
            score: Math.min(100, (lead.score || 0) + 15),
            notes: `${lead.notes || ""}\n[Enriched] Title: ${data.jobTitle}, Phone: ${data.directPhone || "N/A"}`,
          }).where(eq(leads.id, lead.id));
        }

        enriched++;
      } catch (e: any) {
        console.error(`[Enrichment] Failed for lead ${lead.id}:`, e.message);
      }
    }

    await db.update(enrichmentJobs).set({
      status: "completed", enrichedCount: enriched,
      creditsUsed: enriched, completedAt: new Date(),
    }).where(eq(enrichmentJobs.id, job.id));

    await useCredits(userId, "bulk_enrichment", job.id, "batch", enriched);
    res.json({ jobId: job.id, enriched, total: userLeads.length, count: enriched });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/email/find", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { firstName, lastName, domain } = req.body;
    if (!firstName || !lastName || !domain) return res.status(400).json({ error: "firstName, lastName, domain required" });

    const result = await intelligenceEngine.findEmail(firstName, lastName, domain);
    await useCredits(userId, "email_finder");

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/phone/find", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { firstName, lastName, company } = req.body;
    const name = `${firstName || ""} ${lastName || ""}`.trim();
    if (!name || !company) return res.status(400).json({ error: "Name and company required" });

    const result = await intelligenceEngine.findPhone(name, company);
    await useCredits(userId, "phone_finder");

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/intent/detect", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { companyDomain, topics } = req.body;
    if (!companyDomain || !topics?.length) return res.status(400).json({ error: "companyDomain and topics required" });

    const signals = await intelligenceEngine.detectIntent(companyDomain, topics);

    for (const signal of signals) {
      try { await db.insert(intentSignals).values(signal); } catch (e) {}
    }

    await useCredits(userId, "intent_lookup");
    res.json({ companyDomain, signals, totalSignals: signals.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/intent/dashboard", async (req, res) => {
  try {
    const signals = await db.select().from(intentSignals)
      .orderBy(desc(intentSignals.score))
      .limit(50);

    const byCompany: Record<string, any> = {};
    for (const s of signals) {
      const key = s.companyDomain || s.companyName || "unknown";
      if (!byCompany[key]) {
        byCompany[key] = { companyName: s.companyName, domain: s.companyDomain, signals: [], maxScore: 0, topics: [] as string[], maxStrength: "low" };
      }
      byCompany[key].signals.push(s);
      byCompany[key].maxScore = Math.max(byCompany[key].maxScore, s.score || 0);
      if (s.topicCategory && !byCompany[key].topics.includes(s.topicCategory)) {
        byCompany[key].topics.push(s.topicCategory);
      }
      if (s.signalStrength === "high") byCompany[key].maxStrength = "surge";
      else if (s.signalStrength === "medium" && byCompany[key].maxStrength !== "surge") byCompany[key].maxStrength = "medium";
    }

    const ranked = Object.values(byCompany).sort((a: any, b: any) => b.maxScore - a.maxScore);

    res.json({
      byCompany: ranked,
      totalSignals: signals.length,
      surgeSignals: signals.filter(s => s.signalStrength === "high").length,
      companiesTracked: ranked.length,
      topicsTracked: new Set(signals.map(s => s.topicCategory).filter(Boolean)).size,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/technographics/search", async (req, res) => {
  try {
    const { technology, category } = req.query as any;

    if (technology) {
      const results = await db.select().from(technographics)
        .where(ilike(technographics.technology, `%${technology}%`))
        .limit(50);
      return res.json({ results });
    }

    if (category) {
      const results = await db.select().from(technographics)
        .where(eq(technographics.category, category))
        .limit(50);
      return res.json({ results });
    }

    res.json({ results: [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/technographics/scan", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { companyDomain, companyId } = req.body;

    const stack = await intelligenceEngine.detectTechStack(companyDomain);

    const results: any[] = [];
    for (const tech of stack) {
      const details = intelligenceEngine.getTechDetails(tech);
      try {
        const [entry] = await db.insert(technographics).values({
          companyId, companyDomain,
          technology: tech,
          category: details?.category || "Other",
          status: "active",
          firstDetected: new Date(),
          lastDetected: new Date(),
          confidence: 0.85,
        }).returning();
        results.push({ ...entry, competitors: details?.competitors || [] });
      } catch (e) {}
    }

    await useCredits(userId, "tech_scan");
    res.json({ companyDomain, technologies: results, count: results.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/org-chart/:companyId/build", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { companyId } = req.params;

    let entries = await db.select().from(orgChartEntries)
      .where(eq(orgChartEntries.companyId, companyId))
      .orderBy(orgChartEntries.level);

    if (entries.length === 0) {
      const [company] = await db.select().from(companyProfiles).where(eq(companyProfiles.id, companyId));
      const companyName = company?.name || companyId;

      const chart = await intelligenceEngine.buildOrgChart(companyName, companyId);
      for (const entry of chart) {
        try {
          await db.insert(orgChartEntries).values(entry);
        } catch (e) {}
      }
      entries = await db.select().from(orgChartEntries)
        .where(eq(orgChartEntries.companyId, companyId))
        .orderBy(orgChartEntries.level);

      if (entries.length === 0) {
        return res.json({ entries: chart });
      }
    }

    await useCredits(userId, "org_chart", companyId, "company");
    res.json({ entries });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/events/recent", async (req, res) => {
  try {
    const events = await db.select().from(companyEvents)
      .orderBy(desc(companyEvents.eventDate))
      .limit(20);
    res.json(events);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/events/:companyDomain", async (req, res) => {
  try {
    let events = await db.select().from(companyEvents)
      .where(eq(companyEvents.companyDomain, req.params.companyDomain))
      .orderBy(desc(companyEvents.eventDate))
      .limit(20);

    if (events.length === 0) {
      const generated = await intelligenceEngine.getCompanyEvents(req.params.companyDomain);
      for (const event of generated) {
        try {
          const [saved] = await db.insert(companyEvents).values(event).returning();
          events.push(saved);
        } catch (e) {}
      }
    }

    res.json(events);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/research/company/:idOrDomain", async (req, res) => {
  try {
    const userId = getUserId(req);
    const identifier = req.params.idOrDomain;

    let domain = identifier;
    const [company] = await db.select().from(companyProfiles).where(eq(companyProfiles.id, identifier)).catch(() => [null] as any);
    if (company?.domain) domain = company.domain;

    const research = await intelligenceEngine.aiResearchCompany(domain);
    await useCredits(userId, "ai_research", undefined, "company", 3);

    res.json(research);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/research/contact/:idOrName", async (req, res) => {
  try {
    const userId = getUserId(req);
    const identifier = req.params.idOrName;
    const { company, title } = req.body;

    let name = identifier;
    let contactCompany = company || "";
    let contactTitle = title || "";

    const [contact] = await db.select().from(contactProfiles).where(eq(contactProfiles.id, identifier)).catch(() => [null] as any);
    if (contact) {
      name = contact.fullName || `${contact.firstName} ${contact.lastName}`;
      contactCompany = contact.companyName || contactCompany;
      contactTitle = contact.jobTitle || contactTitle;
    }

    const research = await intelligenceEngine.aiResearchContact(name, contactCompany, contactTitle);
    await useCredits(userId, "ai_research", undefined, "contact", 2);

    res.json(research);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/prospect-lists", async (req, res) => {
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

router.post("/prospect-lists", async (req, res) => {
  try {
    const userId = getUserId(req);
    const [list] = await db.insert(prospectLists).values({ ...req.body, userId }).returning();
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/prospect-lists/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    await db.delete(prospectListMembers).where(eq(prospectListMembers.listId, req.params.id));
    await db.delete(prospectLists).where(
      and(eq(prospectLists.id, req.params.id), eq(prospectLists.userId, userId))
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/saved-searches", async (req, res) => {
  try {
    const userId = getUserId(req);
    const searches = await db.select().from(savedSearches)
      .where(eq(savedSearches.userId, userId))
      .orderBy(desc(savedSearches.createdAt));
    res.json(searches);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/credits/balance", async (req, res) => {
  try {
    const userId = getUserId(req);
    const [result] = await db.select({
      total: sql<number>`COALESCE(SUM(${dataCredits.creditsUsed}), 0)`,
    }).from(dataCredits).where(eq(dataCredits.userId, userId));

    const used = result?.total || 0;
    const limit = 1000;
    res.json({ balance: Math.max(0, limit - used), used, limit });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/companies/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const [company] = await db.select().from(companyProfiles).where(eq(companyProfiles.id, req.params.id));
    if (!company) return res.status(404).json({ error: "Not found" });

    const contacts = await db.select().from(contactProfiles)
      .where(eq(contactProfiles.companyId, company.id))
      .limit(20);

    const techData = await db.select().from(technographics)
      .where(eq(technographics.companyId, company.id));

    const intent = await db.select().from(intentSignals)
      .where(eq(intentSignals.companyId, company.id))
      .orderBy(desc(intentSignals.detectedAt))
      .limit(10);

    const events = await db.select().from(companyEvents)
      .where(eq(companyEvents.companyDomain, company.domain || ""))
      .orderBy(desc(companyEvents.eventDate))
      .limit(10);

    await useCredits(userId, "company_lookup", company.id, "company");
    res.json({ ...company, contacts, techStack: techData, intentSignals: intent, events });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/people/:id/reveal", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const [contact] = await db.select().from(contactProfiles).where(eq(contactProfiles.id, id));
    if (!contact) return res.status(404).json({ error: "Contact not found" });

    await useCredits(userId, "contact_reveal", id, "contact");

    res.json({ ...contact, revealed: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
