import { Express, RequestHandler } from "express";
import NodeCache from "node-cache";
import {
  searchLeads,
  enrichCompany,
  findContact,
  searchLocal,
  searchLinkedIn,
  verifyEmail,
  generateEmailPatterns,
  findVerifiedEmails,
  cleanDomain,
} from "./free-scraper";

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });

const HUNTER_KEY = process.env.HUNTER_API_KEY || null;

export function registerFreeScraperRoutes(app: Express, isAuthenticated: RequestHandler) {

  app.get("/api/free-leads/search", isAuthenticated, async (req, res) => {
    const { q = "", industry = "", location = "", size = "", limit = "20" } = req.query as Record<string, string>;

    if (!q && !industry && !location) {
      return res.status(400).json({ error: "Provide q, industry, or location" });
    }

    const key = `fsearch:${q}:${industry}:${location}:${limit}`;
    const hit = cache.get(key);
    if (hit) return res.json({ ...(hit as any), cached: true });

    try {
      const leads = await searchLeads({
        q, industry, location, size,
        limit: Math.min(parseInt(limit) || 20, 50),
      });

      const result = {
        query: { q, industry, location, size },
        total: leads.length,
        leads,
        timestamp: new Date().toISOString(),
      };

      cache.set(key, result, 1800);
      res.json(result);
    } catch (err: any) {
      console.error("[free-leads/search]", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/free-leads/local", isAuthenticated, async (req, res) => {
    const { type, city, state = "", limit = "25" } = req.query as Record<string, string>;
    if (!type || !city) return res.status(400).json({ error: "type and city are required" });

    const key = `flocal:${type}:${city}:${state}:${limit}`;
    const hit = cache.get(key);
    if (hit) return res.json({ ...(hit as any), cached: true });

    try {
      const result = await searchLocal(type, city, state, parseInt(limit) || 25);
      cache.set(key, result, 3600);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/free-leads/enrich", isAuthenticated, async (req, res) => {
    const { domain } = req.query as Record<string, string>;
    if (!domain) return res.status(400).json({ error: "domain is required" });

    const clean = cleanDomain(domain);
    const key = `fenrich:${clean}`;
    const hit = cache.get(key);
    if (hit) return res.json({ ...(hit as any), cached: true });

    try {
      const data = await enrichCompany(clean, { hunterKey: HUNTER_KEY || undefined });
      cache.set(key, data, 7200);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/free-leads/contact", isAuthenticated, async (req, res) => {
    const { firstName, lastName, domain, company = "", title = "" } = req.query as Record<string, string>;

    if (!firstName || !lastName || !domain) {
      return res.status(400).json({ error: "firstName, lastName, and domain are required" });
    }

    const key = `fcontact:${firstName}:${lastName}:${cleanDomain(domain)}`;
    const hit = cache.get(key);
    if (hit) return res.json({ ...(hit as any), cached: true });

    try {
      const data = await findContact(firstName, lastName, domain, {
        company, title, hunterKey: HUNTER_KEY || undefined,
      });
      cache.set(key, data, 7200);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/free-leads/emails", isAuthenticated, async (req, res) => {
    const { domain, firstName, lastName } = req.query as Record<string, string>;
    if (!domain) return res.status(400).json({ error: "domain is required" });

    const clean = cleanDomain(domain);

    try {
      let emails: any[] = [];
      if (firstName && lastName) {
        emails = await findVerifiedEmails(firstName, lastName, clean);
      } else {
        const commonFirst = ["info", "contact", "hello", "admin", "sales"];
        const checks = commonFirst.map((f) => `${f}@${clean}`);
        const verified = await Promise.all(
          checks.map(async (e) => ({
            email: e,
            mxVerified: await verifyEmail(e),
            src: "pattern",
          }))
        );
        emails = verified.filter((e) => e.mxVerified);
      }

      res.json({ domain: clean, emails, total: emails.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/free-leads/patterns", isAuthenticated, (req, res) => {
    const { firstName, lastName, domain } = req.query as Record<string, string>;
    if (!firstName || !lastName || !domain)
      return res.status(400).json({ error: "firstName, lastName, domain required" });

    const patterns = generateEmailPatterns(firstName, lastName, cleanDomain(domain));
    res.json({ patterns, note: "Use /verify to MX-check these" });
  });

  app.post("/api/free-leads/verify", isAuthenticated, async (req, res) => {
    const { emails = [] } = req.body;
    if (!Array.isArray(emails) || emails.length === 0)
      return res.status(400).json({ error: "emails array required" });
    if (emails.length > 200)
      return res.status(400).json({ error: "Max 200 emails per request" });

    const results = await Promise.all(
      emails.map(async (email: string) => ({
        email,
        mxVerified: await verifyEmail(email),
        domain: email.split("@")[1] || null,
      }))
    );

    res.json({
      total: results.length,
      valid: results.filter((r) => r.mxVerified).length,
      invalid: results.filter((r) => !r.mxVerified).length,
      results,
    });
  });

  app.get("/api/free-leads/linkedin", isAuthenticated, async (req, res) => {
    const { company = "", industry = "", location = "" } = req.query as Record<string, string>;
    if (!company && !industry) return res.status(400).json({ error: "company or industry required" });

    const key = `fli:${company}:${industry}:${location}`;
    const hit = cache.get(key);
    if (hit) return res.json({ ...(hit as any), cached: true });

    try {
      const results = await searchLinkedIn(company, industry, location);
      const result = { query: { company, industry, location }, results };
      cache.set(key, result, 3600);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/free-leads/export", isAuthenticated, (req, res) => {
    const { leads = [], format = "csv", crm } = req.body;
    if (!leads.length) return res.status(400).json({ error: "No leads to export" });

    const fields = crm === "hubspot"
      ? ["Company Name", "Website URL", "Email Address", "Phone Number", "Industry", "City", "Lead Source", "Description"]
      : ["name", "domain", "email", "phone", "industry", "location", "address", "linkedin", "score", "src"];

    const fieldMap: Record<string, string> = {
      "Company Name": "name", "Website URL": "website", "Email Address": "email",
      "Phone Number": "phone", Industry: "industry", City: "location",
      "Lead Source": "src", Description: "snippet",
    };

    const header = fields.join(",");
    const rows = leads.map((lead: any) =>
      fields.map((f) => {
        const key = fieldMap[f] || f;
        const val = key === "src" ? "ArgiFlow" : (lead[key] || "");
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(",")
    );

    if (format === "json") {
      return res.json({ exported: leads.length, leads });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="argiflow-leads.csv"');
    res.send([header, ...rows].join("\n"));
  });

  app.get("/api/free-leads/stats", isAuthenticated, (_req, res) => {
    const keys = cache.keys();
    res.json({
      cacheSize: keys.length,
      sources: {
        duckduckgo: { free: true, keyRequired: false },
        bing: { free: true, keyRequired: false },
        yellowpages: { free: true, keyRequired: false },
        manta: { free: true, keyRequired: false },
        linkedin_dork: { free: true, keyRequired: false },
        website_scrape: { free: true, keyRequired: false },
        rdap_whois: { free: true, keyRequired: false },
        dns_mx_verify: { free: true, keyRequired: false },
        email_patterns: { free: true, keyRequired: false },
        hunter_io: { free: "25/mo", keyRequired: true, hasKey: !!HUNTER_KEY },
        clearbit_logo: { free: true, keyRequired: false },
        sec_edgar: { free: true, keyRequired: false },
      },
      monthlyCost: HUNTER_KEY ? "$0 (free tier only)" : "$0",
    });
  });

  console.log("[Free Scraper] All free lead intelligence routes registered");
}
