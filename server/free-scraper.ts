import axios from "axios";
import * as cheerio from "cheerio";
import dns from "dns/promises";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
];

function randAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function makeHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "User-Agent": randAgent(),
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    DNT: "1",
    "Upgrade-Insecure-Requests": "1",
    ...extra,
  };
}

const http = axios.create({ timeout: 12000 });

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randDelay = () => delay(800 + Math.random() * 1200);

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  src: string;
}

export interface LeadResult {
  domain: string;
  name: string;
  website: string;
  snippet: string;
  industry: string | null;
  location: string | null;
  score: number;
  src: string;
}

export interface LocalBusiness {
  name: string;
  phone: string | null;
  address: string;
  categories?: string;
  website: string | null;
  rating?: string | null;
  ypUrl?: string;
  domain: string | null;
  description?: string | null;
  snippet?: string;
  src: string;
}

export interface EnrichResult {
  domain: string;
  name: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  linkedin: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  employees: string | null;
  founded: string | null;
  logo: string | null;
  domainCreated: string | null;
  registrar: string | null;
  dnsActive: boolean;
  hasMX: boolean;
  mxRecords: string[];
  contacts: any[];
  enrichedAt: string;
  sources: string[];
}

export interface ContactResult {
  firstName: string;
  lastName: string;
  domain: string;
  emails: EmailPattern[];
  linkedInProfiles: LinkedInProfile[];
  confidence: string;
}

export interface EmailPattern {
  email: string;
  mxVerified: boolean;
  confidence: string;
  src?: string;
}

export interface LinkedInProfile {
  name: string;
  profileUrl: string;
  headline: string;
  src: string;
}

// ═══════════════════════════════════════════════════════════
//  SOURCE 1 — DUCKDUCKGO (free, no key)
// ═══════════════════════════════════════════════════════════
export async function searchDDG(query: string, limit = 10): Promise<SearchResult[]> {
  try {
    await randDelay();
    const res = await http.get("https://html.duckduckgo.com/html/", {
      params: { q: query, kl: "us-en", s: 0 },
      headers: makeHeaders({ Referer: "https://duckduckgo.com/" }),
    });

    const $ = cheerio.load(res.data);
    const results: SearchResult[] = [];

    $(".result").each((i, el) => {
      if (i >= limit) return false;
      const title = $(el).find(".result__title a").text().trim();
      const href = $(el).find(".result__title a").attr("href") || "";
      const snippet = $(el).find(".result__snippet").text().trim();
      const domain = cleanDomain(href);
      if (title && domain) results.push({ title, url: href, snippet, domain, src: "ddg" });
    });

    return results;
  } catch (e: any) {
    console.warn("[DDG]", e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
//  SOURCE 2 — BING HTML (free, no key)
// ═══════════════════════════════════════════════════════════
export async function searchBing(query: string, limit = 10): Promise<SearchResult[]> {
  try {
    await randDelay();
    const res = await http.get("https://www.bing.com/search", {
      params: { q: query, count: limit, first: 1 },
      headers: makeHeaders({ Referer: "https://www.bing.com/", "sec-fetch-site": "same-origin" }),
    });

    const $ = cheerio.load(res.data);
    const results: SearchResult[] = [];

    $("#b_results .b_algo").each((i, el) => {
      if (i >= limit) return false;
      const title = $(el).find("h2").text().trim();
      const url = $(el).find("h2 a").attr("href") || "";
      const snippet = $(el).find(".b_caption p").text().trim();
      const domain = cleanDomain(url);
      if (title && domain) results.push({ title, url, snippet, domain, src: "bing" });
    });

    return results;
  } catch (e: any) {
    console.warn("[Bing]", e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
//  SOURCE 3 — YELLOW PAGES (local B2B)
// ═══════════════════════════════════════════════════════════
export async function scrapeYellowPages(type: string, location: string, limit = 20): Promise<LocalBusiness[]> {
  const results: LocalBusiness[] = [];
  try {
    const searchTerm = encodeURIComponent(type.replace(/\s/g, "-"));
    const locationTerm = encodeURIComponent(location.replace(/\s/g, "-").replace(",", ""));
    const url = `https://www.yellowpages.com/search?search_terms=${searchTerm}&geo_location_terms=${locationTerm}`;

    await randDelay();
    const res = await http.get(url, { headers: makeHeaders({ Referer: "https://www.yellowpages.com/" }) });
    const $ = cheerio.load(res.data);

    $(".result").each((i, el) => {
      if (i >= limit) return false;
      const name = $(el).find(".business-name span").text().trim() || $(el).find("a.business-name").text().trim();
      const phone = $(el).find(".phone").text().trim();
      const addr = $(el).find(".adr").text().trim().replace(/\s+/g, " ");
      const cats = $(el).find(".categories a").map((_: number, a: any) => $(a).text()).get().join(", ");
      const website = $(el).find("a.track-visit-website").attr("href") || null;
      const rating = $(el).find(".ratings .count").text().replace(/[()]/g, "").trim();
      const ypUrl = "https://www.yellowpages.com" + ($(el).find("a.business-name").attr("href") || "");

      if (name) {
        results.push({
          name,
          phone: cleanPhone(phone),
          address: addr,
          categories: cats,
          website,
          rating: rating || null,
          ypUrl,
          domain: website ? cleanDomain(website) : null,
          src: "yellowpages",
        });
      }
    });
  } catch (e: any) {
    console.warn("[YellowPages]", e.message);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════
//  SOURCE 4 — MANTA.COM (B2B directory)
// ═══════════════════════════════════════════════════════════
export async function scrapeManta(query: string, location = "", limit = 15): Promise<LocalBusiness[]> {
  const results: LocalBusiness[] = [];
  try {
    const q = `${query} ${location}`.trim();
    const url = `https://www.manta.com/search?search_source=nav&q=${encodeURIComponent(q)}`;

    await randDelay();
    const res = await http.get(url, { headers: makeHeaders() });
    const $ = cheerio.load(res.data);

    $('[data-test="company-card"], .search-result-company, article.company').each((i, el) => {
      if (i >= limit) return false;
      const name = $(el).find('h2 a, .company-name a, [data-test="company-name"]').first().text().trim();
      const phone = $(el).find('[data-test="phone"], .phone').text().trim();
      const addr = $(el).find('[data-test="address"], .address').text().trim().replace(/\s+/g, " ");
      const website = $(el).find('a[href*="http"]:not([href*="manta.com"])').first().attr("href");
      const desc = $(el).find("p, .description").first().text().trim();

      if (name) {
        results.push({
          name,
          phone: cleanPhone(phone),
          address: addr,
          website: website || null,
          description: desc || null,
          domain: website ? cleanDomain(website) : null,
          src: "manta",
        });
      }
    });
  } catch (e: any) {
    console.warn("[Manta]", e.message);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════
//  SOURCE 5 — LINKEDIN via DDG dorks (0 cost)
// ═══════════════════════════════════════════════════════════
export async function searchLinkedIn(company: string, industry = "", location = ""): Promise<LinkedInProfile[]> {
  const parts = [company, industry, location].filter(Boolean).join(" ");
  const query = `${parts} site:linkedin.com/company`;
  const raw = await searchDDG(query, 5);
  return raw
    .filter((r) => r.url?.includes("linkedin.com/company"))
    .map((r) => ({
      name: r.title.replace("| LinkedIn", "").replace("LinkedIn", "").trim(),
      profileUrl: r.url,
      headline: r.snippet,
      src: "linkedin_dork",
    }));
}

export async function searchLinkedInPeople(name: string, company: string, title = ""): Promise<LinkedInProfile[]> {
  const query = `"${name}" "${company}" ${title} site:linkedin.com/in`;
  const raw = await searchDDG(query, 5);
  return raw
    .filter((r) => r.url?.includes("linkedin.com/in"))
    .map((r) => ({
      name: r.title.replace("| LinkedIn", "").trim(),
      profileUrl: r.url,
      headline: r.snippet,
      src: "linkedin_dork",
    }));
}

// ═══════════════════════════════════════════════════════════
//  SOURCE 6 — DIRECT WEBSITE SCRAPE
// ═══════════════════════════════════════════════════════════
export async function scrapeWebsite(domain: string): Promise<Record<string, any>> {
  const result: Record<string, any> = {
    name: null, description: null, email: null, phone: null,
    address: null, linkedin: null, twitter: null, facebook: null,
    instagram: null, employees: null, founded: null, logo: null,
  };

  const urls = [`https://${domain}`, `https://www.${domain}`];

  for (const url of urls) {
    try {
      await randDelay();
      const res = await http.get(url, { headers: makeHeaders(), maxRedirects: 4, timeout: 9000 });
      const $ = cheerio.load(res.data);
      const bodyText = $("body").text();

      result.name =
        $('meta[property="og:site_name"]').attr("content") ||
        $('meta[name="application-name"]').attr("content") ||
        $("title").text().split(/[|\-–—]/)[0].trim() || null;

      result.description =
        $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content") || null;
      if (result.description) result.description = result.description.slice(0, 300);

      const emails = (bodyText.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g) || [])
        .filter((e: string) => !e.match(/\.(png|jpg|gif|svg|webp)/i) && !e.includes("example.") && !e.includes("placeholder"));
      result.email = emails[0] || null;

      const phoneMatch = bodyText.match(/(\+1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
      result.phone = phoneMatch ? cleanPhone(phoneMatch[0]) : null;

      $("a[href]").each((_: number, el: any) => {
        const href = $(el).attr("href") || "";
        if (href.includes("linkedin.com/company") && !result.linkedin) result.linkedin = href;
        else if ((href.includes("twitter.com/") || href.includes("x.com/")) && !href.includes("intent") && !result.twitter) result.twitter = href;
        else if (href.includes("facebook.com/") && !href.includes("sharer") && !result.facebook) result.facebook = href;
        else if (href.includes("instagram.com/") && !result.instagram) result.instagram = href;
      });

      $('script[type="application/ld+json"]').each((_: number, el: any) => {
        try {
          const raw = $(el).html()?.trim();
          if (!raw) return;
          const schema = JSON.parse(raw);
          const orgs = [].concat(schema).filter((s: any) =>
            s["@type"] === "Organization" || s["@type"] === "LocalBusiness" ||
            s["@type"] === "MedicalBusiness" || s["@type"] === "LegalService"
          );
          for (const org of orgs as any[]) {
            if (org.name && !result.name) result.name = org.name;
            if (org.telephone && !result.phone) result.phone = cleanPhone(org.telephone);
            if (org.email && !result.email) result.email = org.email;
            if (org.numberOfEmployees) result.employees = org.numberOfEmployees?.value || org.numberOfEmployees;
            if (org.foundingDate) result.founded = org.foundingDate;
            if (org.address) {
              const a = org.address;
              result.address = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry]
                .filter(Boolean).join(", ");
            }
            if (org.logo) result.logo = typeof org.logo === "string" ? org.logo : org.logo?.url;
            if (org.description && !result.description) result.description = org.description?.slice(0, 300);
          }
        } catch {}
      });

      if (!result.logo) {
        result.logo = `https://logo.clearbit.com/${domain}`;
      }

      break;
    } catch {}
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
//  SOURCE 7 — WHOIS / RDAP (free domain info)
// ═══════════════════════════════════════════════════════════
export async function getDomainInfo(domain: string): Promise<{ registrar: string | null; created: string | null; updated: string | null; status: any; src: string } | null> {
  try {
    const tld = domain.split(".").pop() || "com";
    const rdapServers: Record<string, string> = {
      com: "https://rdap.verisign.com/com/v1/domain/",
      net: "https://rdap.verisign.com/net/v1/domain/",
      org: "https://rdap.org/domain/",
      io: "https://rdap.org/domain/",
      co: "https://rdap.org/domain/",
    };

    const base = rdapServers[tld] || "https://rdap.org/domain/";
    const res = await http.get(`${base}${domain}`, { timeout: 6000 });
    const d = res.data;

    const events = d.events || [];
    const created = events.find((e: any) => e.eventAction === "registration")?.eventDate?.split("T")[0];
    const updated = events.find((e: any) => e.eventAction === "last changed")?.eventDate?.split("T")[0];
    const registrar = d.entities?.find((e: any) => e.roles?.includes("registrar"))?.vcardArray?.[1]?.find((v: any) => v[0] === "fn")?.[3];

    return { registrar, created, updated, status: d.status, src: "rdap" };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
//  SOURCE 8 — DNS / MX VERIFICATION (free)
// ═══════════════════════════════════════════════════════════
export async function verifyDomain(domain: string): Promise<{ hasA: boolean; hasMX: boolean; mxRecords: string[] }> {
  try {
    const [a, mx] = await Promise.allSettled([
      dns.resolve(domain, "A"),
      dns.resolve(domain, "MX"),
    ]);
    return {
      hasA: a.status === "fulfilled" && a.value.length > 0,
      hasMX: mx.status === "fulfilled" && mx.value.length > 0,
      mxRecords: mx.status === "fulfilled" ? mx.value.map((r: any) => r.exchange) : [],
    };
  } catch {
    return { hasA: false, hasMX: false, mxRecords: [] };
  }
}

export async function verifyEmail(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;
  try {
    const records = await dns.resolve(domain, "MX");
    return records.length > 0;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
//  SOURCE 9 — EMAIL PATTERN GENERATION
// ═══════════════════════════════════════════════════════════
export function generateEmailPatterns(firstName: string, lastName: string, domain: string): string[] {
  const f = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const l = lastName.toLowerCase().replace(/[^a-z]/g, "");
  const fi = f[0] || "";
  const li = l[0] || "";

  if (!f || !l) return [];

  return [
    `${f}.${l}@${domain}`,
    `${fi}${l}@${domain}`,
    `${f}@${domain}`,
    `${fi}.${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${f}-${l}@${domain}`,
    `${l}.${f}@${domain}`,
    `${l}${fi}@${domain}`,
    `${f}${li}@${domain}`,
    `${fi}${li}@${domain}`,
    `${f}_${l}@${domain}`,
    `${l}@${domain}`,
  ];
}

export async function findVerifiedEmails(firstName: string, lastName: string, domain: string): Promise<EmailPattern[]> {
  const patterns = generateEmailPatterns(firstName, lastName, domain);
  const { hasMX } = await verifyDomain(domain);

  if (!hasMX) return [];

  const results = await Promise.all(
    patterns.map(async (email) => {
      const valid = await verifyEmail(email);
      return { email, mxVerified: valid, confidence: valid ? "medium" : "low" };
    })
  );

  return results.filter((r) => r.mxVerified);
}

// ═══════════════════════════════════════════════════════════
//  SOURCE 10 — HUNTER.IO FREE TIER (25/mo, optional)
// ═══════════════════════════════════════════════════════════
export async function hunterDomainSearch(domain: string, apiKey: string): Promise<any[]> {
  if (!apiKey) return [];
  try {
    const res = await http.get("https://api.hunter.io/v2/domain-search", {
      params: { domain, limit: 10, api_key: apiKey },
    });
    return (res.data.data?.emails || []).map((e: any) => ({
      email: e.value,
      firstName: e.first_name,
      lastName: e.last_name,
      position: e.position,
      confidence: e.confidence,
      linkedin: e.linkedin,
      src: "hunter",
    }));
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
//  SOURCE 11 — SEC EDGAR (public companies, free API)
// ═══════════════════════════════════════════════════════════
export async function searchSECEdgar(companyName: string): Promise<any[]> {
  try {
    const search = await http.get(
      `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(companyName)}%22&forms=10-K`,
      { headers: { "User-Agent": "ArgiFlow contact@argiflow.com" } }
    );
    return (
      search.data?.hits?.hits?.slice(0, 3).map((h: any) => ({
        name: h._source?.display_names?.[0],
        cik: h._source?.entity_id,
        src: "sec_edgar",
      })) || []
    );
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
//  MASTER FUNCTIONS
// ═══════════════════════════════════════════════════════════

export async function searchLeads(opts: { q?: string; industry?: string; location?: string; size?: string; limit?: number } = {}): Promise<LeadResult[]> {
  const { q = "", industry = "", location = "", size = "", limit = 20 } = opts;

  const BLACKLIST = new Set([
    "wikipedia.org", "reddit.com", "youtube.com", "facebook.com", "twitter.com",
    "instagram.com", "indeed.com", "glassdoor.com", "amazon.com", "yelp.com",
    "bbb.org", "manta.com", "yellowpages.com", "mapquest.com", "whitepages.com",
  ]);

  const part = [q, industry, location, size].filter(Boolean).join(" ");
  const queries = [
    `${part} company contact`,
    industry && location ? `${industry} businesses ${location}` : null,
    q && location ? `"${q}" ${location}` : null,
  ].filter(Boolean) as string[];

  const webPromises = queries.slice(0, 2).flatMap((query) => [
    searchDDG(query, Math.ceil(limit / 2)),
    searchBing(query, Math.ceil(limit / 2)),
  ]);

  const webResults = (await Promise.allSettled(webPromises))
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<SearchResult[]>).value);

  const seen = new Set<string>();
  const leads: LeadResult[] = [];

  for (const r of webResults) {
    if (!r.domain || seen.has(r.domain) || BLACKLIST.has(r.domain)) continue;
    if (!r.domain.includes(".") || r.domain.length < 4) continue;
    seen.add(r.domain);

    leads.push({
      domain: r.domain,
      name: r.title?.split(/[|\-–—]/)[0].trim(),
      website: r.url,
      snippet: r.snippet,
      industry: industry || null,
      location: location || null,
      score: scoreResult(r, { industry, location, q }),
      src: r.src,
    });
  }

  return leads.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function enrichCompany(domain: string, opts: { hunterKey?: string } = {}): Promise<EnrichResult> {
  const clean = cleanDomain(domain);

  const [siteData, domainInfo, dnsInfo] = await Promise.allSettled([
    scrapeWebsite(clean),
    getDomainInfo(clean),
    verifyDomain(clean),
  ]);

  const site = siteData.status === "fulfilled" ? siteData.value : {};
  const rdap = domainInfo.status === "fulfilled" ? domainInfo.value : null;
  const dns_ = dnsInfo.status === "fulfilled" ? dnsInfo.value : { hasA: false, hasMX: false, mxRecords: [] };

  const emails = opts.hunterKey ? await hunterDomainSearch(clean, opts.hunterKey) : [];

  return {
    domain: clean,
    name: site.name || null,
    description: site.description || null,
    email: site.email || null,
    phone: site.phone || null,
    address: site.address || null,
    linkedin: site.linkedin || null,
    twitter: site.twitter || null,
    facebook: site.facebook || null,
    instagram: site.instagram || null,
    employees: site.employees || null,
    founded: site.founded || null,
    logo: site.logo || `https://logo.clearbit.com/${clean}`,
    domainCreated: rdap?.created || null,
    registrar: rdap?.registrar || null,
    dnsActive: dns_.hasA,
    hasMX: dns_.hasMX,
    mxRecords: dns_.mxRecords,
    contacts: emails,
    enrichedAt: new Date().toISOString(),
    sources: ["website", rdap ? "rdap" : null, dns_.hasA ? "dns" : null, emails.length ? "hunter" : null].filter(Boolean) as string[],
  };
}

export async function findContact(
  firstName: string,
  lastName: string,
  domain: string,
  opts: { company?: string; title?: string; hunterKey?: string } = {}
): Promise<ContactResult> {
  const clean = cleanDomain(domain);

  const [emailResults, linkedInResults] = await Promise.allSettled([
    findVerifiedEmails(firstName, lastName, clean),
    searchLinkedInPeople(`${firstName} ${lastName}`, opts.company || clean, opts.title || ""),
  ]);

  let emails: EmailPattern[] = emailResults.status === "fulfilled" ? emailResults.value : [];
  const profiles = linkedInResults.status === "fulfilled" ? linkedInResults.value : [];

  if (emails.length === 0 && opts.hunterKey) {
    try {
      const res = await http.get("https://api.hunter.io/v2/email-finder", {
        params: { domain: clean, first_name: firstName, last_name: lastName, api_key: opts.hunterKey },
      });
      if (res.data.data?.email) {
        emails.push({
          email: res.data.data.email,
          confidence: res.data.data.score ? `${res.data.data.score}%` : "medium",
          mxVerified: true,
          src: "hunter",
        });
      }
    } catch {}
  }

  return {
    firstName,
    lastName,
    domain: clean,
    emails,
    linkedInProfiles: profiles,
    confidence: emails.length > 0 ? (emails[0].src === "hunter" ? "high" : "medium") : profiles.length > 0 ? "low" : "none",
  };
}

export async function searchLocal(type: string, city: string, state = "", limit = 25): Promise<{ type: string; location: string; total: number; businesses: LocalBusiness[]; linkedin: LinkedInProfile[] }> {
  const location = [city, state].filter(Boolean).join(", ");

  const [ypResults, mantaResults, webResults, linkedInResults] = await Promise.allSettled([
    scrapeYellowPages(type, location, limit),
    scrapeManta(type, location, Math.ceil(limit / 2)),
    searchDDG(`${type} ${location} contact phone email`, Math.ceil(limit / 2)),
    searchLinkedIn("", type, location),
  ]);

  const yp = ypResults.status === "fulfilled" ? ypResults.value : [];
  const manta = mantaResults.status === "fulfilled" ? mantaResults.value : [];
  const web = webResults.status === "fulfilled" ? webResults.value : [];
  const linkedin = linkedInResults.status === "fulfilled" ? linkedInResults.value : [];

  const seen = new Set<string>();
  const all: LocalBusiness[] = [];

  for (const biz of [...yp, ...manta]) {
    const key = biz.name?.toLowerCase().replace(/\s+/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    all.push(biz);
  }

  const DIRS = new Set(["yellowpages.com", "manta.com", "whitepages.com", "yelp.com"]);
  for (const r of web) {
    if (!r.domain || DIRS.has(r.domain) || seen.has(r.domain)) continue;
    seen.add(r.domain);
    all.push({
      name: r.title?.split(/[|\-]/)[0].trim(),
      website: r.url,
      domain: r.domain,
      snippet: r.snippet,
      phone: null,
      address: "",
      src: "web",
    });
  }

  return {
    type,
    location,
    total: all.length,
    businesses: all.slice(0, limit),
    linkedin: linkedin.slice(0, 5),
  };
}

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════
export function cleanDomain(input = ""): string {
  try {
    if (!input.includes("http")) input = "https://" + input;
    return new URL(input).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return input.replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

export function cleanPhone(raw = ""): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return raw.trim() || null;
}

function scoreResult(result: SearchResult, filters: { industry?: string; location?: string; q?: string } = {}): number {
  let score = 50;
  const snip = (result.snippet || "").toLowerCase();
  const ttl = (result.title || "").toLowerCase();

  if (filters.industry && snip.includes(filters.industry.toLowerCase())) score += 18;
  if (filters.location && snip.includes(filters.location.toLowerCase())) score += 15;
  if (filters.q && (snip.includes(filters.q.toLowerCase()) || ttl.includes(filters.q.toLowerCase()))) score += 12;
  if (snip.includes("contact") || snip.includes("about us")) score += 8;
  if (result.domain?.match(/\.(com|io|co|net)$/)) score += 5;
  if (result.domain?.length < 20) score += 5;

  return Math.min(100, score);
}
