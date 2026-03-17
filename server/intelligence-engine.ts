import OpenAI from "openai";
import { searchBing, searchDDG, scrapeWebsite } from "./free-scraper";

const OPENAI_MODEL = "gpt-4o";
const OPENAI_MODEL_FAST = "gpt-4o-mini";

const TECH_DATABASE: Record<string, { category: string; competitors: string[] }> = {
  "Salesforce": { category: "CRM", competitors: ["HubSpot", "Zoho CRM", "Pipedrive"] },
  "HubSpot": { category: "CRM", competitors: ["Salesforce", "Zoho CRM", "ActiveCampaign"] },
  "Epic": { category: "EHR", competitors: ["Cerner", "Allscripts", "eClinicalWorks", "Athenahealth"] },
  "Cerner": { category: "EHR", competitors: ["Epic", "Allscripts", "MEDITECH"] },
  "Athenahealth": { category: "EHR", competitors: ["Epic", "eClinicalWorks", "NextGen"] },
  "eClinicalWorks": { category: "EHR", competitors: ["Epic", "Athenahealth", "DrChrono"] },
  "Kareo": { category: "Billing", competitors: ["AdvancedMD", "TherapyNotes", "SimplePractice"] },
  "AdvancedMD": { category: "Billing", competitors: ["Kareo", "CureMD", "Tebra"] },
  "Google Analytics": { category: "Analytics", competitors: ["Mixpanel", "Amplitude", "Heap"] },
  "Mailchimp": { category: "Marketing", competitors: ["SendGrid", "ConvertKit", "ActiveCampaign"] },
  "Slack": { category: "Communication", competitors: ["Microsoft Teams", "Discord", "Google Chat"] },
  "Zoom": { category: "Communication", competitors: ["Microsoft Teams", "Google Meet", "Webex"] },
  "QuickBooks": { category: "Finance", competitors: ["Xero", "FreshBooks", "Wave"] },
  "Stripe": { category: "Finance", competitors: ["PayPal", "Square", "Braintree"] },
  "WordPress": { category: "CMS", competitors: ["Squarespace", "Wix", "Webflow"] },
  "AWS": { category: "Cloud", competitors: ["Azure", "Google Cloud", "DigitalOcean"] },
  "Shopify": { category: "E-commerce", competitors: ["WooCommerce", "BigCommerce", "Magento"] },
};

const JOB_TITLE_SENIORITY: Record<string, string> = {
  "ceo": "c_suite", "cfo": "c_suite", "cto": "c_suite", "coo": "c_suite",
  "cmo": "c_suite", "cio": "c_suite", "chief": "c_suite", "president": "c_suite",
  "founder": "c_suite", "co-founder": "c_suite", "partner": "c_suite",
  "vp": "vp", "vice president": "vp", "svp": "vp", "evp": "vp",
  "director": "director", "head of": "director",
  "manager": "manager", "team lead": "manager", "supervisor": "manager",
  "senior": "senior", "sr.": "senior", "lead": "senior", "principal": "senior",
  "specialist": "individual", "coordinator": "individual", "analyst": "individual",
  "associate": "individual", "representative": "individual",
  "intern": "intern", "trainee": "intern",
};

const JOB_TITLE_DEPARTMENTS: Record<string, string> = {
  "engineer": "engineering", "developer": "engineering", "devops": "engineering",
  "architect": "engineering", "qa": "engineering", "cto": "engineering",
  "sales": "sales", "business development": "sales", "account executive": "sales",
  "sdr": "sales", "bdr": "sales", "revenue": "sales",
  "marketing": "marketing", "content": "marketing", "seo": "marketing",
  "growth": "marketing", "brand": "marketing", "cmo": "marketing",
  "operations": "operations", "coo": "operations", "logistics": "operations",
  "supply chain": "operations", "procurement": "operations",
  "finance": "finance", "accounting": "finance", "cfo": "finance",
  "controller": "finance", "bookkeeper": "finance",
  "hr": "hr", "human resources": "hr", "talent": "hr", "recruiting": "hr",
  "people": "hr",
  "legal": "legal", "compliance": "legal", "general counsel": "legal",
  "ceo": "executive", "president": "executive", "founder": "executive",
  "it": "it", "system admin": "it", "cio": "it", "security": "it",
  "product": "product", "ux": "product", "ui": "product", "design": "product",
  "customer success": "customer_success", "client services": "customer_success",
  "support": "support", "help desk": "support", "customer service": "support",
  "billing": "finance", "practice manager": "operations", "office manager": "operations",
  "medical director": "executive", "physician": "operations", "nurse": "operations",
};

async function youSearchRaw(query: string): Promise<any> {
  const apiKey = process.env.YOU_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch(`https://api.ydc-index.io/search?query=${encodeURIComponent(query)}`, {
      headers: { "X-API-Key": apiKey },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      results: (data.hits || []).map((h: any) => ({
        title: h.title || "",
        url: h.url || "",
        content: (h.snippets || [h.description]).join("\n"),
      })),
    };
  } catch { return null; }
}

async function freeWebSearch(query: string): Promise<any> {
  try {
    const bingResults = await searchBing(query, 10);
    if (bingResults.length > 0) {
      console.log(`[Intelligence] Bing free search returned ${bingResults.length} results for "${query.substring(0, 50)}..."`);
      return {
        results: bingResults.map(r => ({
          title: r.title,
          url: r.url,
          content: r.snippet,
        })),
      };
    }
    const ddgResults = await searchDDG(query, 10);
    if (ddgResults.length > 0) {
      console.log(`[Intelligence] DDG free search returned ${ddgResults.length} results for "${query.substring(0, 50)}..."`);
      return {
        results: ddgResults.map(r => ({
          title: r.title,
          url: r.url,
          content: r.snippet,
        })),
      };
    }
    return null;
  } catch (e: any) {
    console.warn(`[Intelligence] Free web search error: ${e.message}`);
    return null;
  }
}

let tavilySkipUntil = 0;

async function tavilySearchRaw(query: string): Promise<any> {
  const apiKey = process.env.TAVILY_API_KEY;
  const now = Date.now();
  if (!apiKey || now < tavilySkipUntil) {
    if (now < tavilySkipUntil) {
      console.warn("[Intelligence] Tavily rate-limited, skipping to fallbacks");
    }
    const youResult = await youSearchRaw(query);
    if (youResult && youResult.results?.length > 0) return youResult;
    return freeWebSearch(query);
  }
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        max_results: 10,
        include_answer: true,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      if (response.status === 429 || response.status === 432) {
        tavilySkipUntil = now + 30 * 60 * 1000;
        console.warn(`[Intelligence] Tavily rate-limited (${response.status}), skipping for 30 min`);
      } else {
        console.warn(`[Intelligence] Tavily search failed (${response.status})`);
      }
      const youResult = await youSearchRaw(query);
      if (youResult && youResult.results?.length > 0) return youResult;
      return freeWebSearch(query);
    }
    return response.json();
  } catch (e: any) {
    console.warn(`[Intelligence] Tavily error: ${e.message}, trying fallbacks`);
    const youResult = await youSearchRaw(query);
    if (youResult && youResult.results?.length > 0) return youResult;
    return freeWebSearch(query);
  }
}

async function openCorporatesSearch(companyName: string, jurisdiction?: string): Promise<any> {
  try {
    const params = new URLSearchParams({ q: companyName });
    if (jurisdiction) params.append("jurisdiction_code", jurisdiction);
    const url = `https://api.opencorporates.com/v0.4/companies/search?${params.toString()}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      console.warn(`[DataSource:OpenCorporates] HTTP ${response.status} for "${companyName}"`);
      return null;
    }
    const data = await response.json();
    const companies = (data?.results?.companies || []).map((c: any) => ({
      name: c.company?.name,
      jurisdiction: c.company?.jurisdiction_code,
      companyNumber: c.company?.company_number,
      status: c.company?.current_status,
      incorporationDate: c.company?.incorporation_date,
      companyType: c.company?.company_type,
      registeredAddress: c.company?.registered_address_in_full,
      opencorporatesUrl: c.company?.opencorporates_url,
      source: "opencorporates",
    }));
    console.log(`[DataSource:OpenCorporates] Found ${companies.length} results for "${companyName}"`);
    return companies;
  } catch (e: any) {
    console.warn(`[DataSource:OpenCorporates] Error: ${e.message}`);
    return null;
  }
}

async function secEdgarSearch(companyName: string): Promise<any> {
  try {
    const response = await fetch(`https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(companyName)}%22&forms=10-K,10-Q,8-K`, {
      headers: { "User-Agent": "ArgiletteBot/1.0 info@argilette.com", "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      const altResponse = await fetch(`https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(companyName)}`, {
        headers: { "User-Agent": "ArgiletteBot/1.0 info@argilette.com", "Accept": "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!altResponse.ok) return null;
      const altData = await altResponse.json();
      const altFilings = (altData?.hits?.hits || []).map((h: any) => ({
        filingType: h?._source?.form_type,
        filingDate: h?._source?.file_date,
        company: h?._source?.display_names?.[0],
        source: "sec_edgar",
      })).slice(0, 5);
      console.log(`[DataSource:SEC-EDGAR] Found ${altFilings.length} filings (alt query) for "${companyName}"`);
      return altFilings.length > 0 ? altFilings : null;
    }
    const data = await response.json();
    const filings = (data?.hits?.hits || []).map((h: any) => ({
      filingType: h?._source?.form_type,
      filingDate: h?._source?.file_date,
      company: h?._source?.display_names?.[0],
      source: "sec_edgar",
    })).slice(0, 5);
    console.log(`[DataSource:SEC-EDGAR] Found ${filings.length} filings for "${companyName}"`);
    return filings.length > 0 ? filings : null;
  } catch (e: any) {
    console.warn(`[DataSource:SEC-EDGAR] Error: ${e.message}`);
    return null;
  }
}

async function wikidataSearch(companyName: string): Promise<any> {
  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(companyName)}&language=en&limit=3&format=json`;
    const response = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const data = await response.json();
    const entities = (data?.search || []).map((e: any) => ({
      id: e.id,
      label: e.label,
      description: e.description,
      wikidataUrl: `https://www.wikidata.org/wiki/${e.id}`,
      source: "wikidata",
    }));

    if (entities.length > 0 && entities[0].id) {
      try {
        const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entities[0].id}&format=json&props=claims|labels|descriptions`;
        const entityResp = await fetch(entityUrl, { signal: AbortSignal.timeout(8000) });
        if (entityResp.ok) {
          const entityData = await entityResp.json();
          const entity = entityData?.entities?.[entities[0].id];
          if (entity?.claims) {
            const claims = entity.claims;
            const getClaimValue = (propId: string) => {
              const claim = claims[propId]?.[0]?.mainsnak?.datavalue?.value;
              return claim?.text || claim?.id || claim?.amount || claim?.time || claim || null;
            };
            entities[0].enriched = {
              officialWebsite: getClaimValue("P856"),
              inception: getClaimValue("P571"),
              headquarters: getClaimValue("P159"),
              industry: getClaimValue("P452"),
              ceo: getClaimValue("P169"),
              employees: getClaimValue("P1128"),
              revenue: getClaimValue("P2139"),
              country: getClaimValue("P17"),
              legalForm: getClaimValue("P1454"),
              stockExchange: getClaimValue("P414"),
              isin: getClaimValue("P946"),
            };
          }
        }
      } catch {}
    }

    console.log(`[DataSource:Wikidata] Found ${entities.length} entities for "${companyName}"`);
    return entities.length > 0 ? entities : null;
  } catch (e: any) {
    console.warn(`[DataSource:Wikidata] Error: ${e.message}`);
    return null;
  }
}

async function githubSearch(companyName: string): Promise<any> {
  try {
    const url = `https://api.github.com/search/users?q=${encodeURIComponent(companyName)}+type:org&per_page=3`;
    const response = await fetch(url, {
      headers: { "Accept": "application/vnd.github+json", "User-Agent": "ArgiletteBot/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const orgs = [];
    for (const item of (data?.items || []).slice(0, 2)) {
      try {
        const orgResp = await fetch(`https://api.github.com/orgs/${item.login}`, {
          headers: { "Accept": "application/vnd.github+json", "User-Agent": "ArgiletteBot/1.0" },
          signal: AbortSignal.timeout(5000),
        });
        if (orgResp.ok) {
          const org = await orgResp.json();
          orgs.push({
            name: org.name || org.login,
            login: org.login,
            description: org.description,
            blog: org.blog,
            location: org.location,
            email: org.email,
            twitterUsername: org.twitter_username,
            publicRepos: org.public_repos,
            followers: org.followers,
            avatarUrl: org.avatar_url,
            githubUrl: org.html_url,
            source: "github",
          });
        }
      } catch {}
    }
    console.log(`[DataSource:GitHub] Found ${orgs.length} orgs for "${companyName}"`);
    return orgs.length > 0 ? orgs : null;
  } catch (e: any) {
    console.warn(`[DataSource:GitHub] Error: ${e.message}`);
    return null;
  }
}

async function fetchDomainWhois(domain: string): Promise<any> {
  try {
    const url = `https://rdap.org/domain/${domain}`;
    const response = await fetch(url, {
      headers: { "Accept": "application/rdap+json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const registrant = data?.entities?.find((e: any) => e.roles?.includes("registrant"));
    const result = {
      domainName: data?.ldhName || domain,
      status: data?.status,
      registrationDate: data?.events?.find((e: any) => e.eventAction === "registration")?.eventDate,
      expirationDate: data?.events?.find((e: any) => e.eventAction === "expiration")?.eventDate,
      registrar: data?.entities?.find((e: any) => e.roles?.includes("registrar"))?.vcardArray?.[1]?.find((v: any) => v[0] === "fn")?.[3],
      registrantOrg: registrant?.vcardArray?.[1]?.find((v: any) => v[0] === "org")?.[3],
      registrantCountry: registrant?.vcardArray?.[1]?.find((v: any) => v[0] === "adr")?.[3]?.country,
      nameservers: data?.nameservers?.map((ns: any) => ns.ldhName) || [],
      source: "rdap_whois",
    };
    console.log(`[DataSource:RDAP/WHOIS] Got domain info for "${domain}"`);
    return result;
  } catch (e: any) {
    console.warn(`[DataSource:RDAP/WHOIS] Error: ${e.message}`);
    return null;
  }
}

async function duckDuckGoInstantAnswer(query: string): Promise<any> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.Abstract && !data.AbstractText && !data.RelatedTopics?.length) return null;
    const result = {
      abstract: data.AbstractText || data.Abstract,
      abstractSource: data.AbstractSource,
      abstractUrl: data.AbstractURL,
      heading: data.Heading,
      image: data.Image,
      infobox: data.Infobox?.content?.map((c: any) => ({ label: c.label, value: c.value })) || [],
      relatedTopics: (data.RelatedTopics || []).slice(0, 5).map((t: any) => ({
        text: t.Text,
        url: t.FirstURL,
      })),
      officialWebsite: data.Results?.[0]?.FirstURL || null,
      source: "duckduckgo",
    };
    console.log(`[DataSource:DuckDuckGo] Got instant answer for "${query}"`);
    return result;
  } catch (e: any) {
    console.warn(`[DataSource:DuckDuckGo] Error: ${e.message}`);
    return null;
  }
}

async function multiSourceCompanyData(companyName: string, domain?: string): Promise<{ sources: Record<string, any>; rawText: string }> {
  const sources: Record<string, any> = {};
  const textParts: string[] = [];

  const promises: Promise<void>[] = [];

  promises.push(openCorporatesSearch(companyName).then(r => {
    if (r && r.length > 0) { sources.opencorporates = r; textParts.push(`[OpenCorporates Registry Data]\n${r.map((c: any) => `Company: ${c.name}, Jurisdiction: ${c.jurisdiction}, Status: ${c.status}, Type: ${c.companyType}, Incorporated: ${c.incorporationDate}, Address: ${c.registeredAddress}`).join("\n")}`); }
  }).catch(e => console.warn(`[MultiSource:OpenCorporates] ${e.message}`)));

  promises.push(wikidataSearch(companyName).then(r => {
    if (r && r.length > 0) { sources.wikidata = r; textParts.push(`[Wikidata/Wikipedia Knowledge Base]\n${r.map((e: any) => `Entity: ${e.label} - ${e.description}${e.enriched ? `\nWebsite: ${e.enriched.officialWebsite || 'N/A'}, Founded: ${e.enriched.inception || 'N/A'}, CEO: ${e.enriched.ceo || 'N/A'}, Employees: ${e.enriched.employees || 'N/A'}` : ''}`).join("\n")}`); }
  }).catch(e => console.warn(`[MultiSource:Wikidata] ${e.message}`)));

  promises.push(secEdgarSearch(companyName).then(r => {
    if (r && r.length > 0) { sources.secEdgar = r; textParts.push(`[SEC EDGAR Filings]\n${r.map((f: any) => `Filing: ${f.filingType} on ${f.filingDate} by ${f.company}`).join("\n")}`); }
  }).catch(e => console.warn(`[MultiSource:SEC-EDGAR] ${e.message}`)));

  promises.push(githubSearch(companyName).then(r => {
    if (r && r.length > 0) { sources.github = r; textParts.push(`[GitHub Organization]\n${r.map((o: any) => `Org: ${o.name} (@${o.login}) - ${o.description || 'N/A'}\nLocation: ${o.location || 'N/A'}, Website: ${o.blog || 'N/A'}, Email: ${o.email || 'N/A'}, Repos: ${o.publicRepos}, Twitter: ${o.twitterUsername || 'N/A'}`).join("\n")}`); }
  }).catch(e => console.warn(`[MultiSource:GitHub] ${e.message}`)));

  promises.push(duckDuckGoInstantAnswer(companyName + " company").then(r => {
    if (r) { sources.duckduckgo = r; textParts.push(`[DuckDuckGo Knowledge Graph]\nHeading: ${r.heading}\nAbstract: ${r.abstract || 'N/A'}\nSource: ${r.abstractSource} (${r.abstractUrl})\nOfficial Website: ${r.officialWebsite || 'N/A'}${r.infobox?.length ? `\nInfobox: ${r.infobox.map((i: any) => `${i.label}: ${i.value}`).join(", ")}` : ''}`); }
  }).catch(e => console.warn(`[MultiSource:DuckDuckGo] ${e.message}`)));

  if (domain) {
    promises.push(fetchDomainWhois(domain).then(r => {
      if (r) { sources.whois = r; textParts.push(`[RDAP/WHOIS Domain Data]\nDomain: ${r.domainName}, Registered: ${r.registrationDate || 'N/A'}, Expires: ${r.expirationDate || 'N/A'}, Registrar: ${r.registrar || 'N/A'}, Registrant Org: ${r.registrantOrg || 'N/A'}, Nameservers: ${(r.nameservers || []).join(", ")}`); }
    }).catch(e => console.warn(`[MultiSource:WHOIS] ${e.message}`)));
  }

  const webSearchPromises: Promise<any>[] = [];
  webSearchPromises.push(tavilySearchRaw(`"${companyName}" company about profile revenue employees headquarters`).catch(() => null));
  if (companyName) webSearchPromises.push(tavilySearchRaw(`"${companyName}" CEO founder owner leadership team executive`).catch(() => null));
  if (domain) webSearchPromises.push(tavilySearchRaw(`site:${domain} about team contact`).catch(() => null));
  webSearchPromises.push(tavilySearchRaw(`"${companyName}" news funding partnership acquisition recent`).catch(() => null));

  promises.push(Promise.all(webSearchPromises).then(results => {
    const webContent: string[] = [];
    for (const sr of results) {
      if (!sr) continue;
      if (sr.answer) webContent.push(sr.answer);
      for (const r of (sr.results || [])) {
        webContent.push(`Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`);
      }
    }
    if (webContent.length > 0) {
      sources.webSearch = { resultCount: webContent.length };
      textParts.push(`[Web Search Results]\n${webContent.join("\n\n---\n\n")}`);
    }
  }).catch(e => console.warn(`[MultiSource:WebSearch] ${e.message}`)));

  await Promise.allSettled(promises);

  const sourceCount = Object.keys(sources).length;
  console.log(`[MultiSource] Aggregated ${sourceCount} data sources for "${companyName}": ${Object.keys(sources).join(", ")}`);

  return { sources, rawText: textParts.join("\n\n========================================\n\n") };
}

async function multiSourcePeopleData(name: string, company?: string, title?: string, location?: string): Promise<{ sources: Record<string, any>; rawText: string }> {
  const sources: Record<string, any> = {};
  const textParts: string[] = [];
  const promises: Promise<void>[] = [];

  const webSearches: Promise<any>[] = [];
  webSearches.push(tavilySearchRaw(`"${name}" ${company ? `"${company}"` : ''} ${title || ''} professional LinkedIn profile`).catch(() => null));
  if (company) webSearches.push(tavilySearchRaw(`"${name}" "${company}" email phone contact`).catch(() => null));
  if (company) webSearches.push(tavilySearchRaw(`"${company}" team leadership staff directory about us`).catch(() => null));
  if (location) webSearches.push(tavilySearchRaw(`"${name}" ${title || 'professional'} ${location} business`).catch(() => null));
  webSearches.push(tavilySearchRaw(`"${name}" ${title || ''} career education certifications awards speaking`).catch(() => null));

  promises.push(Promise.all(webSearches).then(results => {
    const webContent: string[] = [];
    for (const sr of results) {
      if (!sr) continue;
      if (sr.answer) webContent.push(sr.answer);
      for (const r of (sr.results || [])) {
        webContent.push(`Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`);
      }
    }
    if (webContent.length > 0) {
      sources.webSearch = { resultCount: webContent.length };
      textParts.push(`[Web Search Results]\n${webContent.join("\n\n---\n\n")}`);
    }
  }).catch(e => console.warn(`[MultiSource:People:WebSearch] ${e.message}`)));

  if (company) {
    promises.push(duckDuckGoInstantAnswer(`${name} ${company}`).then(r => {
      if (r && r.abstract) {
        sources.duckduckgo = r;
        textParts.push(`[DuckDuckGo Knowledge]\n${r.abstract}`);
      }
    }).catch(e => console.warn(`[MultiSource:People:DuckDuckGo] ${e.message}`)));

    promises.push(githubSearch(company).then(r => {
      if (r && r.length > 0) {
        sources.github = r;
        textParts.push(`[GitHub - Company Context]\n${r.map((o: any) => `Org: ${o.name}, Repos: ${o.publicRepos}, Desc: ${o.description || 'N/A'}`).join("\n")}`);
      }
    }).catch(e => console.warn(`[MultiSource:People:GitHub] ${e.message}`)));
  }

  await Promise.allSettled(promises);
  console.log(`[MultiSource:People] Aggregated ${Object.keys(sources).length} sources for "${name}": ${Object.keys(sources).join(", ")}`);
  return { sources, rawText: textParts.join("\n\n========================================\n\n") };
}

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

async function aiExtract(systemPrompt: string, userPrompt: string, useFastModel: boolean = false): Promise<any> {
  const openai = getOpenAI();
  if (!openai) throw new Error("OpenAI API key not configured");
  const model = useFastModel ? OPENAI_MODEL_FAST : OPENAI_MODEL;
  const response = await openai.chat.completions.create({
    model,
    max_tokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });
  const text = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("[Intelligence] JSON parse error, attempting cleanup:", text.substring(0, 200));
    const cleaned = text.replace(/[\x00-\x1F\x7F]/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return {};
    }
  }
}

export class IntelligenceEngine {

  async searchPeople(filters: {
    jobTitle?: string; seniority?: string; department?: string;
    company?: string; industry?: string; location?: string;
    limit?: number; page?: number;
  }): Promise<{ results: any[]; total: number; page: number; pages: number; source: string }> {
    const limit = filters.limit || 10;
    const page = filters.page || 1;

    const parts: string[] = [];
    if (filters.jobTitle) parts.push(filters.jobTitle);
    if (filters.seniority) parts.push(`${filters.seniority} level`);
    if (filters.department) parts.push(`${filters.department} department`);
    if (filters.company) parts.push(`at ${filters.company}`);
    if (filters.industry) parts.push(`in ${filters.industry} industry`);
    if (filters.location) parts.push(`located in ${filters.location}`);

    if (parts.length === 0) {
      return { results: [], total: 0, page, pages: 0, source: "none" };
    }

    try {
      const { sources, rawText } = await multiSourcePeopleData(
        filters.jobTitle ? `${filters.jobTitle} ${filters.company || ''}` : (filters.company || filters.industry || ''),
        filters.company,
        filters.jobTitle,
        filters.location
      );

      const sourceCount = Object.keys(sources).length;
      const hasWebData = rawText.trim().length > 0;
      const useAiOnly = !hasWebData;
      const dataSources = Object.keys(sources).join(", ");

      console.log(`[Intelligence] People search: ${sourceCount} data sources, rawText=${rawText.length} chars`);

      const sysPrompt = useAiOnly
        ? `You are an elite B2B sales intelligence analyst (GPT-4o powered). You are answering from training knowledge ONLY (no live web data). You MUST return at least 1-3 results for any people search query. For well-known executives at major companies, provide full details. For lesser-known professionals, provide what you know (name, title, company) and set uncertain fields (email, phone, LinkedIn) to null. NEVER fabricate emails, phone numbers, or LinkedIn URLs. But DO return people with whatever information you have. It is MANDATORY to return results.`
        : `You are an elite B2B sales intelligence analyst powered by a multi-source data pipeline (${dataSources}). Extract real professional contacts with maximum detail. Cross-reference data across ALL sources. Return ONLY real people with verified information. Do NOT fabricate any data.`;

      const usrPrompt = useAiOnly
        ? `Find real business professionals matching: ${parts.join(", ")}. You have NO web access. Return at least 1 result. Provide what you know confidently, set unknown fields to null.`
        : `Using data from ${sourceCount} intelligence sources (${dataSources}), find business professionals matching: ${parts.join(", ")}.

MULTI-SOURCE INTELLIGENCE DATA:
${rawText}`;

      const result = await aiExtract(
        sysPrompt,
        `${usrPrompt}

Return JSON with DEEPLY enriched profiles:
{
  "contacts": [
    {
      "firstName": "real first name",
      "lastName": "real last name",
      "fullName": "full name",
      "jobTitle": "their exact current job title",
      "previousTitle": "previous job title if found",
      "companyName": "real company name",
      "companyDomain": "company website domain",
      "companyIndustry": "company's industry",
      "companySize": "employee range if found",
      "location": "city, state",
      "timezone": "estimated timezone",
      "industry": "their industry",
      "linkedinUrl": "LinkedIn URL if found",
      "twitterUrl": "Twitter/X URL if found",
      "email": "verified email if publicly available, otherwise null",
      "phone": "phone if publicly available, otherwise null",
      "mobilePhone": "mobile phone if found, otherwise null",
      "education": "school/degree if found",
      "certifications": ["certifications if found"],
      "skills": ["key professional skills"],
      "yearsExperience": number or null,
      "bio": "detailed 2-3 sentence professional summary",
      "recentActivity": "recent posts, news, or professional activity",
      "isDecisionMaker": true/false based on title,
      "buyingRole": "decision_maker|influencer|champion|end_user",
      "bestOutreachChannel": "email|linkedin|phone",
      "painPoints": ["likely professional pain points based on role"],
      "icebreaker": "personalized opening line",
      "dataSources": ["which sources provided data for this person"],
      "source": "primary source URL where found",
      "dataQualityScore": 0-100 based on verified data
    }
  ],
  "totalEstimated": number of total possible matches
}

${useAiOnly
  ? `CRITICAL ACCURACY RULES:
- Only return people you are GENUINELY confident exist
- NEVER fabricate email addresses, phone numbers, or LinkedIn URLs
- Set dataQualityScore to 30-50 for AI-knowledge-only results`
  : `CRITICAL: Cross-reference people data across ALL sources. Extract verified contact details. Real names, real companies only.`}`
      );

      const aiContacts = result.contacts || [];
      let contacts = aiContacts.map((c: any, i: number) => ({
        id: `si_${Date.now()}_${i}`,
        firstName: c.firstName || "",
        lastName: c.lastName || "",
        fullName: c.fullName || `${c.firstName} ${c.lastName}`,
        jobTitle: c.jobTitle || "",
        previousTitle: c.previousTitle || "",
        seniorityLevel: this.classifySeniority(c.jobTitle || ""),
        department: this.classifyDepartment(c.jobTitle || ""),
        companyName: c.companyName || "",
        companyDomain: c.companyDomain || "",
        companyIndustry: c.companyIndustry || "",
        companySize: c.companySize || "",
        workEmail: c.email || null,
        directPhone: c.phone || null,
        mobilePhone: c.mobilePhone || null,
        linkedinUrl: c.linkedinUrl || null,
        twitterUrl: c.twitterUrl || null,
        city: c.location?.split(",")[0]?.trim() || "",
        state: c.location?.split(",")[1]?.trim() || "",
        country: "US",
        timezone: c.timezone || "",
        industry: c.industry || filters.industry || "",
        education: c.education || "",
        certifications: c.certifications || [],
        skills: c.skills || [],
        yearsExperience: c.yearsExperience || null,
        summary: c.bio || c.summary || "",
        recentActivity: c.recentActivity || "",
        isDecisionMaker: c.isDecisionMaker || false,
        buyingRole: c.buyingRole || "end_user",
        bestOutreachChannel: c.bestOutreachChannel || "email",
        painPoints: c.painPoints || [],
        icebreaker: c.icebreaker || "",
        dataSources: c.dataSources || Object.keys(sources),
        source: c.source || `Multi-source (${dataSources})`,
        dataQualityScore: c.dataQualityScore || (c.email && c.phone ? 90 : c.email ? 75 : 55),
      }));

      if (contacts.length === 0 && (filters.jobTitle || filters.company)) {
        console.log(`[Intelligence] AI returned 0 people results, creating minimal fallback`);
        contacts = [{
          id: `si_${Date.now()}_fallback`,
          firstName: "",
          lastName: "",
          fullName: filters.jobTitle ? `${filters.jobTitle} Professional` : "Unknown Professional",
          jobTitle: filters.jobTitle || "Professional",
          previousTitle: "",
          seniorityLevel: this.classifySeniority(filters.jobTitle || ""),
          department: this.classifyDepartment(filters.jobTitle || ""),
          companyName: filters.company || "",
          companyDomain: "",
          companyIndustry: filters.industry || "",
          companySize: "",
          workEmail: null,
          directPhone: null,
          mobilePhone: null,
          linkedinUrl: null,
          twitterUrl: null,
          city: "",
          state: "",
          country: "US",
          timezone: "",
          industry: filters.industry || "",
          education: "",
          certifications: [],
          skills: [],
          yearsExperience: null,
          summary: `Search for ${filters.jobTitle || "professionals"} ${filters.company ? `at ${filters.company}` : ""} - limited data available. Try refining your search or using enrichment tools.`,
          recentActivity: "",
          isDecisionMaker: false,
          buyingRole: "end_user",
          bestOutreachChannel: "email",
          painPoints: [],
          icebreaker: "",
          dataSources: ["AI Knowledge (limited data)"],
          source: "AI Knowledge",
          dataQualityScore: 10,
        }];
      }

      return {
        results: contacts.slice(0, limit),
        total: result.totalEstimated || contacts.length,
        page,
        pages: Math.ceil((result.totalEstimated || contacts.length) / limit),
        source: useAiOnly ? "ai_knowledge" : `multi_source_${sourceCount}_databases`,
      };
    } catch (err: any) {
      console.error("[Intelligence] People search error:", err.message);
      return { results: [], total: 0, page, pages: 0, source: "error" };
    }
  }

  async searchCompanies(filters: {
    name?: string; industry?: string; location?: string;
    minEmployees?: string; maxEmployees?: string;
    limit?: number; page?: number;
  }): Promise<{ results: any[]; total: number; page: number; pages: number; source: string }> {
    const limit = filters.limit || 10;
    const page = filters.page || 1;

    const parts: string[] = [];
    if (filters.name) parts.push(`company name "${filters.name}"`);
    if (filters.industry) parts.push(`in ${filters.industry} industry`);
    if (filters.location) parts.push(`located in ${filters.location}`);
    if (filters.minEmployees || filters.maxEmployees) {
      parts.push(`with ${filters.minEmployees || "1"}-${filters.maxEmployees || "10000"} employees`);
    }

    if (parts.length === 0) {
      return { results: [], total: 0, page, pages: 0, source: "none" };
    }

    try {
      const { sources, rawText } = await multiSourceCompanyData(
        filters.name || filters.industry || "",
        undefined
      );

      const sourceCount = Object.keys(sources).length;
      const hasWebData = rawText.trim().length > 0;
      const useAiOnly = !hasWebData;

      console.log(`[Intelligence] Company search: ${sourceCount} data sources active, rawText=${rawText.length} chars, parts=${parts.join(", ")}`);

      const dataSources = Object.keys(sources).join(", ");

      const systemPrompt = `You are an elite B2B company intelligence analyst powered by a multi-source data pipeline similar to ZoomInfo and Apollo.io. You have access to data from: ${dataSources || "your training knowledge"}. ${useAiOnly 
        ? "You are answering from your training knowledge ONLY (no live data available). You MUST return at least 1 result for any company search query. For well-known companies provide full details. For lesser-known companies, provide what you know and set uncertain fields to null. NEVER fabricate email addresses or phone numbers - set those to null if unknown. But DO return the company with whatever information you have (name, industry, general location, description). It is MANDATORY to return results."
        : "You have REAL-TIME data from multiple authoritative sources: government registries (OpenCorporates), SEC filings (EDGAR), knowledge bases (Wikidata/Wikipedia), developer platforms (GitHub), domain registration (WHOIS/RDAP), and web search. Cross-reference ALL sources to build the most comprehensive and accurate company profiles possible. Extract EVERY detail found in the data."}`;

      const userPrompt = useAiOnly
        ? `Find real companies matching: ${parts.join(", ")}. You have NO web access. Only provide information you are CONFIDENT is accurate. Return at least 1 result.`
        : `Using data from ${sourceCount} authoritative sources (${dataSources}), build comprehensive profiles for companies matching: ${parts.join(", ")}.

MULTI-SOURCE INTELLIGENCE DATA:
${rawText}`;

      const result = await aiExtract(
        systemPrompt,
        `${userPrompt}

Return JSON with comprehensive company profiles enriched from ALL available data sources:
{
  "companies": [
    {
      "name": "real company name",
      "domain": "company website domain",
      "website": "full website URL",
      "description": "detailed description (2-3 sentences)",
      "industry": "primary industry",
      "subIndustry": "specific niche",
      "location": "headquarters city, state",
      "employeeCount": number or null,
      "employeeRange": "range",
      "phone": "main phone if found",
      "email": "main email if found",
      "yearFounded": year or null,
      "revenue": "estimated revenue range",
      "companyStatus": "active/inactive from registry data",
      "incorporationDate": "from registry if found",
      "registeredJurisdiction": "from registry",
      "registeredAddress": "from registry",
      "ownerName": "owner/CEO name",
      "ownerTitle": "their title",
      "ownerEmail": "email if found",
      "ownerPhone": "phone if found",
      "ownerLinkedin": "LinkedIn URL if found",
      "keyContacts": [{"name": "", "title": "", "email": "", "phone": ""}],
      "technologies": ["known tech stack"],
      "githubPresence": {"orgName": "", "repos": 0, "description": ""},
      "secFilings": [{"type": "", "date": ""}],
      "socialMedia": {"linkedin": "", "facebook": "", "twitter": ""},
      "domainAge": "years since domain registration",
      "dataSources": ["which sources provided data for this company"],
      "confidence": "high|medium|low",
      "source": "primary source URL"
    }
  ],
  "totalEstimated": number,
  "sourcesUsed": ["list of data sources that contributed"]
}

CRITICAL: Cross-reference data across ALL sources. Registry data confirms existence. SEC filings confirm public status. GitHub confirms tech orientation. WHOIS confirms domain ownership. Web search provides details. Synthesize the BEST profile from ALL available data.`
      );

      const aiCompanies = result.companies || [];
      console.log(`[Intelligence] AI returned ${aiCompanies.length} companies from ${sourceCount} sources`);

      let companies = aiCompanies.map((c: any, i: number) => ({
        id: `co_${Date.now()}_${i}`,
        name: c.name || "",
        domain: c.domain || "",
        description: c.description || "",
        industry: c.industry || filters.industry || "",
        subIndustry: c.subIndustry || "",
        location: c.location || "",
        employeeCount: c.employeeCount || null,
        employeeRange: c.employeeRange || "",
        website: c.website || (c.domain ? `https://${c.domain}` : ""),
        phone: c.phone || null,
        email: c.email || null,
        foundedYear: c.yearFounded || null,
        revenue: c.revenue || null,
        companyStatus: c.companyStatus || "active",
        incorporationDate: c.incorporationDate || null,
        registeredJurisdiction: c.registeredJurisdiction || null,
        ownerName: c.ownerName || null,
        ownerTitle: c.ownerTitle || null,
        ownerEmail: c.ownerEmail || null,
        ownerPhone: c.ownerPhone || null,
        ownerLinkedin: c.ownerLinkedin || null,
        keyContacts: c.keyContacts || [],
        technologies: c.technologies || [],
        githubPresence: c.githubPresence || null,
        secFilings: c.secFilings || [],
        socialMedia: c.socialMedia || {},
        companyType: c.secFilings?.length > 0 ? "public" : "private",
        confidence: c.confidence || (useAiOnly ? "low" : "high"),
        dataSources: c.dataSources || Object.keys(sources),
        source: c.source || (useAiOnly ? "AI Knowledge" : `Multi-source (${dataSources})`),
      }));

      if (companies.length === 0 && (filters.name || filters.industry || filters.location)) {
        const searchLabel = filters.name || `${filters.industry || ""} ${filters.location || ""}`.trim();
        console.log(`[Intelligence] AI returned 0 results, creating minimal fallback for "${searchLabel}"`);
        companies = [{
          id: `co_${Date.now()}_fallback`,
          name: filters.name || `${filters.industry || "Business"} Company`,
          domain: "",
          description: `Company matching search: ${searchLabel}. Limited data available - try refining your search or using enrichment tools.`,
          industry: filters.industry || "Unknown",
          subIndustry: "",
          location: filters.location || "",
          employeeCount: null,
          employeeRange: "",
          website: "",
          phone: null,
          email: null,
          foundedYear: null,
          revenue: null,
          companyStatus: "unknown",
          incorporationDate: null,
          registeredJurisdiction: null,
          ownerName: null,
          ownerTitle: null,
          ownerEmail: null,
          ownerPhone: null,
          ownerLinkedin: null,
          keyContacts: [],
          technologies: [],
          githubPresence: null,
          secFilings: [],
          socialMedia: {},
          companyType: "private",
          confidence: "low",
          dataSources: ["AI Knowledge (limited data)"],
          source: "AI Knowledge",
        }];
      }

      return {
        results: companies.slice(0, limit),
        total: result.totalEstimated || companies.length,
        page,
        pages: Math.ceil((result.totalEstimated || companies.length) / limit),
        source: useAiOnly ? "ai_knowledge" : `multi_source_${sourceCount}_databases`,
      };
    } catch (err: any) {
      console.error("[Intelligence] Company search error:", err.message);
      return { results: [], total: 0, page, pages: 0, source: "error" };
    }
  }

  async enrichContact(data: { email?: string; name?: string; company?: string; linkedinUrl?: string }): Promise<any> {
    try {
      const searches: Promise<any>[] = [];
      const name = data.name || "";
      const company = data.company || "";
      const email = data.email || "";
      const domain = email.split("@")[1] || "";

      searches.push(tavilySearchRaw(`"${name}" "${company}" professional profile LinkedIn bio title`).catch(() => null));
      if (company) searches.push(tavilySearchRaw(`"${name}" "${company}" email phone contact`).catch(() => null));
      if (name && company) searches.push(tavilySearchRaw(`"${name}" ${company} career education certifications awards publications`).catch(() => null));
      if (domain) searches.push(tavilySearchRaw(`site:${domain} "${name}" OR team OR about OR leadership`).catch(() => null));

      const searchResults = await Promise.all(searches);
      const allContent: string[] = [];
      const allSources: string[] = [];
      for (const sr of searchResults) {
        if (!sr) continue;
        if (sr.answer) allContent.push(sr.answer);
        for (const r of (sr.results || [])) {
          allContent.push(`Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`);
          allSources.push(r.url);
        }
      }
      const searchContent = allContent.join("\n\n---\n\n");

      const result = await aiExtract(
        `You are an expert B2B contact enrichment analyst performing DEEP research. Extract every verifiable data point from the search results. Cross-reference multiple sources for accuracy. Be thorough — the more verified data you return, the higher the quality score.`,
        `Perform DEEP enrichment on this contact using ALL search results below. Cross-reference data across sources for accuracy.

Target Contact:
- Name: ${name || "Unknown"}
- Email: ${email || "Unknown"}
- Company: ${company || "Unknown"}
- LinkedIn: ${data.linkedinUrl || "Unknown"}

Search Results (from ${allSources.length} sources):
${searchContent}

Return comprehensive JSON with ALL data you can verify. Leave null/empty ONLY if truly not found:
{
  "firstName": "",
  "lastName": "",
  "fullName": "",
  "jobTitle": "current exact job title",
  "previousTitles": ["past job titles if found"],
  "seniorityLevel": "c_suite|vp|director|manager|senior|individual",
  "department": "department name",
  "yearsInRole": number or null,
  "companyName": "",
  "companyDomain": "",
  "companyIndustry": "industry of their company",
  "companySize": "employee range if found",
  "workEmail": "verified work email or null",
  "personalEmail": "personal email if found or null",
  "directPhone": "direct phone if found or null",
  "mobilePhone": "mobile phone if found or null",
  "officePhone": "office/main phone if found or null",
  "linkedinUrl": "LinkedIn URL if found",
  "twitterUrl": "Twitter/X URL if found or null",
  "otherSocialUrls": ["other social profile URLs"],
  "city": "",
  "state": "",
  "country": "",
  "timezone": "estimated timezone or null",
  "bio": "detailed professional summary (3-5 sentences)",
  "education": [{"school": "", "degree": "", "field": "", "year": null}],
  "certifications": ["professional certifications"],
  "skills": ["skill1", "skill2", "skill3"],
  "specialties": ["specific domain expertise areas"],
  "publications": ["notable publications or speaking engagements"],
  "awards": ["professional awards or recognitions"],
  "interests": ["professional interests or causes"],
  "languages": ["languages spoken"],
  "workHistory": [{"company": "", "title": "", "duration": ""}],
  "isDecisionMaker": true/false,
  "isBudgetHolder": true/false,
  "buyingRole": "decision_maker|influencer|champion|end_user|gatekeeper",
  "bestOutreachChannel": "email|linkedin|phone|twitter",
  "bestContactTime": "suggestion based on timezone/role",
  "personalityType": "analytical|driver|amiable|expressive",
  "communicationStyle": "formal|casual|technical|executive",
  "painPoints": ["likely professional pain points based on role"],
  "talkingPoints": ["personalized conversation starters"],
  "icebreaker": "personalized opening line based on research findings",
  "mutualConnections": "any notable connections or affiliations",
  "recentActivity": "any recent professional activity, posts, or news",
  "dataQualityScore": 0-100 (score based on how much VERIFIED data was found across multiple sources),
  "verificationNotes": "summary of what was verified and from which sources"
}

SCORING GUIDE:
- 90-100: Found in 3+ sources, verified email+phone+LinkedIn, detailed bio
- 70-89: Found in 2+ sources, at least email or phone verified, good bio
- 50-69: Found in 1 source, limited contact info verified
- 30-49: Sparse data, most fields inferred
- 0-29: Almost nothing found`
      );

      return {
        firstName: result.firstName || name.split(" ")[0] || "",
        lastName: result.lastName || name.split(" ").slice(1).join(" ") || "",
        fullName: result.fullName || name || "",
        workEmail: result.workEmail || email || null,
        personalEmail: result.personalEmail || null,
        emailVerified: !!result.workEmail,
        emailConfidence: result.workEmail ? (result.dataQualityScore > 70 ? 90 : 75) : 0,
        directPhone: result.directPhone || null,
        mobilePhone: result.mobilePhone || null,
        officePhone: result.officePhone || null,
        jobTitle: result.jobTitle || "Professional",
        previousTitles: result.previousTitles || [],
        seniorityLevel: result.seniorityLevel || "individual",
        department: result.department || "operations",
        yearsInRole: result.yearsInRole || null,
        companyName: result.companyName || company || "",
        companyDomain: result.companyDomain || domain,
        companyIndustry: result.companyIndustry || "",
        companySize: result.companySize || "",
        linkedinUrl: result.linkedinUrl || data.linkedinUrl || null,
        twitterUrl: result.twitterUrl || null,
        otherSocialUrls: result.otherSocialUrls || [],
        city: result.city || "",
        state: result.state || "",
        country: result.country || "US",
        timezone: result.timezone || null,
        bio: result.bio || "",
        education: result.education || [],
        certifications: result.certifications || [],
        skills: result.skills || [],
        specialties: result.specialties || [],
        publications: result.publications || [],
        awards: result.awards || [],
        interests: result.interests || [],
        languages: result.languages || [],
        workHistory: result.workHistory || [],
        isDecisionMaker: result.isDecisionMaker || false,
        isBudgetHolder: result.isBudgetHolder || false,
        buyingRole: result.buyingRole || "end_user",
        bestOutreachChannel: result.bestOutreachChannel || "email",
        bestContactTime: result.bestContactTime || null,
        personalityType: result.personalityType || null,
        communicationStyle: result.communicationStyle || null,
        painPoints: result.painPoints || [],
        talkingPoints: result.talkingPoints || [],
        icebreaker: result.icebreaker || "",
        mutualConnections: result.mutualConnections || "",
        recentActivity: result.recentActivity || "",
        dataQualityScore: result.dataQualityScore || 50,
        verificationNotes: result.verificationNotes || "",
        sourcesUsed: allSources.slice(0, 10),
        dataSource: "deep_web_enrichment",
        lastEnrichedAt: new Date(),
      };
    } catch (err: any) {
      console.error("[Intelligence] Deep enrich contact error:", err.message);
      const domain = data.email?.split("@")[1] || "";
      return {
        firstName: data.name?.split(" ")[0] || "", lastName: data.name?.split(" ").slice(1).join(" ") || "",
        fullName: data.name || "", workEmail: data.email || null, personalEmail: null,
        emailVerified: false, emailConfidence: 0,
        directPhone: null, mobilePhone: null, officePhone: null,
        jobTitle: "Professional", previousTitles: [], seniorityLevel: "individual",
        department: "operations", yearsInRole: null,
        companyName: data.company || "", companyDomain: domain, companyIndustry: "", companySize: "",
        linkedinUrl: null, twitterUrl: null, otherSocialUrls: [],
        city: "", state: "", country: "US", timezone: null,
        bio: "", education: [], certifications: [], skills: [], specialties: [],
        publications: [], awards: [], interests: [], languages: [], workHistory: [],
        isDecisionMaker: false, isBudgetHolder: false, buyingRole: "end_user",
        bestOutreachChannel: "email", bestContactTime: null,
        personalityType: null, communicationStyle: null,
        painPoints: [], talkingPoints: [], icebreaker: "", mutualConnections: "", recentActivity: "",
        dataQualityScore: 20, verificationNotes: "", sourcesUsed: [],
        dataSource: "fallback", lastEnrichedAt: new Date(),
      };
    }
  }

  async findDecisionMaker(data: { company: string; currentName?: string; currentEmail?: string; currentPhone?: string }): Promise<{
    name: string | null;
    title: string | null;
    email: string | null;
    phone: string | null;
    linkedinUrl: string | null;
    address: string | null;
    confidence: string;
    notes: string;
    source: string;
  }> {
    try {
      const company = data.company;
      if (!company) return { name: null, title: null, email: null, phone: null, linkedinUrl: null, address: null, confidence: "low", notes: "No company provided", source: "" };

      const searches: Promise<any>[] = [
        tavilySearchRaw(`"${company}" owner OR CEO OR founder OR physician OR "managing partner" OR director contact address`).catch(() => null),
        tavilySearchRaw(`"${company}" practice owner dentist doctor chiropractor email phone address`).catch(() => null),
        tavilySearchRaw(`"${company}" team leadership about us staff location`).catch(() => null),
      ];

      const searchResults = await Promise.all(searches);
      const allContent: string[] = [];
      const allSources: string[] = [];
      for (const sr of searchResults) {
        if (!sr) continue;
        if (sr.answer) allContent.push(sr.answer);
        for (const r of (sr.results || [])) {
          allContent.push(`Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`);
          allSources.push(r.url);
        }
      }

      const skipDomains = ["linkedin.com", "facebook.com", "yelp.com", "google.com", "bbb.org", "bing.com", "yellowpages.com", "wikipedia.org", "healthgrades.com", "vitals.com", "zocdoc.com", "npi.io", "youtube.com"];
      const companyDomains = allSources
        .filter(u => u && !skipDomains.some(sd => u.includes(sd)))
        .map(u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } })
        .filter(d => d && d.length > 3 && d.includes("."));
      const uniqueDomains = [...new Set(companyDomains)].slice(0, 2);

      for (const domain of uniqueDomains) {
        try {
          const siteData = await scrapeWebsite(domain);
          if (siteData) {
            const parts: string[] = [`[Website Scrape: ${domain}]`];
            if (siteData.name) parts.push(`Business Name: ${siteData.name}`);
            if (siteData.email) parts.push(`Email: ${siteData.email}`);
            if (siteData.phone) parts.push(`Phone: ${siteData.phone}`);
            if (siteData.address) parts.push(`Address: ${siteData.address}`);
            if (siteData.description) parts.push(`Description: ${siteData.description}`);
            if (parts.length > 1) {
              allContent.push(parts.join("\n"));
              console.log(`[Intelligence] Website scrape ${domain}: address=${siteData.address || 'none'}, email=${siteData.email || 'none'}`);
            }
          }
        } catch (e: any) {
          console.warn(`[Intelligence] Website scrape ${domain} failed: ${e.message}`);
        }
      }

      if (allContent.length === 0) {
        return { name: null, title: null, email: null, phone: null, linkedinUrl: null, address: null, confidence: "low", notes: "No web results found", source: "" };
      }

      const searchContent = allContent.join("\n\n---\n\n");

      const result = await aiExtract(
        `You are a B2B sales intelligence expert specializing in finding practice owners and decision makers at healthcare practices (dental offices, medical practices, chiropractic clinics, optometry, etc). Your job is to identify the person who makes purchasing/vendor decisions.`,
        `Find the DECISION MAKER at this company using the web search results below.

Company: ${company}
Current Contact Name: ${data.currentName || "Unknown/Generic"}
Current Email: ${data.currentEmail || "None"}
Current Phone: ${data.currentPhone || "None"}

Web Search Results (${allSources.length} sources):
${searchContent}

INSTRUCTIONS:
1. Find the PRACTICE OWNER, CEO, FOUNDER, or LEAD PHYSICIAN — the person who decides which billing/software vendors to use
2. For dental practices: Find the lead dentist (usually DDS/DMD), or practice owner
3. For medical practices: Find the managing physician, medical director, or practice owner
4. For chiropractic offices: Find the lead chiropractor (DC)
5. Extract their REAL email and phone from search results — NEVER fabricate
6. If you can find a personal/direct email (like firstname@domain.com), prefer that over info@ or contact@ emails
7. If the current contact IS already the decision maker, confirm and enhance their info
8. Find the PHYSICAL ADDRESS of the practice/business — street address, city, state, zip code

PHONE NUMBER RULES (CRITICAL):
- We ONLY want the DECISION MAKER's phone — NOT the general practice front desk number
- Phone priority: Direct cell/mobile > Direct office extension > Personal line
- The practice main line (info/reception) is ONLY acceptable for solo practitioners (single doctor, no staff)
- If you can only find the general practice phone, return null for phone — a front desk number is worse than no number
- In "phoneType" specify what kind of number it is: "direct cell", "direct office line", or "solo practice main line"
- NEVER return a phone number without specifying its type

Return JSON:
{
  "name": "Full Name with title (e.g., Dr. John Smith, DDS)",
  "title": "Their title (Owner, CEO, Lead Dentist, Medical Director, etc.)",
  "email": "their email from search results, or null if not found",
  "phone": "DECISION MAKER's DIRECT phone only (cell or personal line), or null if you can only find the front desk number",
  "phoneType": "direct cell | direct office line | solo practice main line | null",
  "linkedinUrl": "LinkedIn URL if found, or null",
  "address": "Full physical address (e.g., 123 Main St, Suite 200, Chicago, IL 60601), or null if not found",
  "confidence": "high (found in multiple sources) | medium (found in one source) | low (inferred/uncertain)",
  "notes": "How you identified this person as the decision maker AND where you found their phone number (which website/source)",
  "source": "Primary URL where found"
}

CRITICAL: Only return data you actually found in the search results. Use null for anything you cannot verify. Never return phone numbers with 555. Never fabricate emails. Never fabricate addresses. If the phone number is the general practice front desk line (shared reception number), return null for phone — we do NOT want front desk numbers.`
      );

      const rawPhoneType = result.phoneType && result.phoneType !== "null" ? result.phoneType.toLowerCase().trim() : null;
      const ALLOWED_PHONE_TYPES = ["direct cell", "direct office line", "solo practice main line"];
      const phoneType = rawPhoneType && ALLOWED_PHONE_TYPES.some(t => rawPhoneType.includes(t)) ? rawPhoneType : null;
      let finalPhone = result.phone && result.phone !== "null" ? result.phone : null;
      if (finalPhone && !phoneType) {
        console.warn(`[Intelligence] Phone returned without valid type classification for ${data.company} (got: "${rawPhoneType}") — rejecting as possible front desk number`);
        finalPhone = null;
      }
      const notesWithPhoneType = phoneType ? `${result.notes || ""} | Phone type: ${phoneType}` : (result.notes || "");

      return {
        name: result.name || null,
        title: result.title || null,
        email: result.email && result.email !== "null" ? result.email : null,
        phone: finalPhone,
        linkedinUrl: result.linkedinUrl && result.linkedinUrl !== "null" ? result.linkedinUrl : null,
        address: result.address && result.address !== "null" ? result.address : null,
        confidence: result.confidence || "low",
        notes: notesWithPhoneType,
        source: result.source || allSources[0] || "",
      };
    } catch (err: any) {
      console.error("[Intelligence] Find decision maker error:", err.message);
      return { name: null, title: null, email: null, phone: null, linkedinUrl: null, address: null, confidence: "low", notes: `Error: ${err.message}`, source: "" };
    }
  }

  async enrichCompany(data: { domain?: string; name?: string }): Promise<any> {
    try {
      const companyName = data.name || "";
      const domain = data.domain || "";

      const { sources, rawText } = await multiSourceCompanyData(companyName || domain, domain || undefined);
      const sourceCount = Object.keys(sources).length;
      const dataSources = Object.keys(sources).join(", ");
      const allSources: string[] = [];

      if (sources.webSearch) {
        allSources.push("Web Search");
      }
      if (sources.opencorporates) allSources.push("OpenCorporates Registry");
      if (sources.wikidata) allSources.push("Wikidata/Wikipedia");
      if (sources.secEdgar) allSources.push("SEC EDGAR");
      if (sources.github) allSources.push("GitHub");
      if (sources.whois) allSources.push("RDAP/WHOIS");
      if (sources.duckduckgo) allSources.push("DuckDuckGo Knowledge Graph");

      console.log(`[Intelligence] Company enrichment: ${sourceCount} sources for "${companyName || domain}": ${dataSources}`);

      const result = await aiExtract(
        `You are an expert B2B company intelligence analyst powered by a multi-source data pipeline (${dataSources}). You have access to government registries, SEC filings, knowledge bases, domain data, and web search results. Cross-reference ALL sources to extract every verifiable data point. Be thorough and comprehensive.`,
        `Perform DEEP enrichment on this company using data from ${sourceCount} authoritative intelligence sources.

Target Company:
- Name: ${companyName || "Unknown"}
- Domain: ${domain || "Unknown"}

MULTI-SOURCE INTELLIGENCE DATA (from ${allSources.join(", ")}):
${rawText}

Return comprehensive JSON with ALL data you can verify:
{
  "name": "",
  "domain": "",
  "website": "full URL",
  "description": "detailed description (3-5 sentences)",
  "tagline": "company tagline or slogan if found",
  "industry": "",
  "subIndustry": "",
  "naicsCode": "NAICS code if determinable or null",
  "sicCode": "SIC code if determinable or null",
  "employeeCount": number or null,
  "employeeRange": "1-10|11-50|51-200|201-500|501-1000|1001-5000|5000+",
  "annualRevenue": number or null,
  "revenueRange": "range like $1M-$5M",
  "foundedYear": number or null,
  "companyType": "private|public|nonprofit|government",
  "stockTicker": "if public, otherwise null",
  "headquarters": "full address if found",
  "hqCity": "",
  "hqState": "",
  "hqCountry": "",
  "otherLocations": ["other office locations"],
  "mainPhone": "",
  "faxNumber": "if found or null",
  "generalEmail": "general contact email if found",
  "linkedinUrl": "",
  "twitterUrl": "",
  "facebookUrl": "",
  "instagramUrl": "",
  "youtubeUrl": "",
  "ceo": "CEO or top leader name if found",
  "ceoLinkedin": "CEO LinkedIn URL if found",
  "founderNames": ["founder names"],
  "keyExecutives": [{"name": "", "title": "", "linkedinUrl": ""}],
  "boardMembers": ["board member names if found"],
  "keyProducts": ["main products or services"],
  "keyClients": ["notable clients or customers"],
  "targetMarket": "who they sell to",
  "valueProposition": "their main value prop",
  "competitors": ["competitor names"],
  "competitiveAdvantage": "what sets them apart",
  "techStack": ["technologies they use"],
  "fundingTotal": "total funding raised if found",
  "fundingRounds": [{"round": "Series A", "amount": "", "date": "", "investors": [""]}],
  "lastFundingDate": "date of last funding or null",
  "investors": ["investor names"],
  "acquisitions": ["companies they acquired"],
  "partnerships": ["key partnerships"],
  "awards": ["awards or recognitions"],
  "certifications": ["industry certifications"],
  "recentNews": [{"headline": "", "date": "", "summary": ""}],
  "hiringSignals": ["what roles they are hiring for"],
  "growthIndicators": ["signs of growth or decline"],
  "painPoints": ["likely business pain points"],
  "glassdoorRating": number or null,
  "bbbRating": "BBB rating if found or null",
  "customerReviewSentiment": "positive|mixed|negative|unknown",
  "dataQualityScore": 0-100,
  "verificationNotes": "summary of what was verified and from which sources"
}

SCORING: 90-100 = verified across 3+ sources with detailed data; 70-89 = 2+ sources; 50-69 = 1 source; below 50 = sparse data`
      );

      return {
        name: result.name || companyName || "",
        domain: result.domain || domain || "",
        website: result.website || (domain ? `https://${domain}` : ""),
        description: result.description || "",
        tagline: result.tagline || "",
        industry: result.industry || "",
        subIndustry: result.subIndustry || "",
        naicsCode: result.naicsCode || null,
        sicCode: result.sicCode || null,
        employeeCount: result.employeeCount || null,
        employeeRange: result.employeeRange || "",
        annualRevenue: result.annualRevenue || null,
        revenueRange: result.revenueRange || "",
        foundedYear: result.foundedYear || null,
        companyType: result.companyType || "private",
        stockTicker: result.stockTicker || null,
        headquarters: result.headquarters || "",
        hqCity: result.hqCity || "",
        hqState: result.hqState || "",
        hqCountry: result.hqCountry || "US",
        otherLocations: result.otherLocations || [],
        mainPhone: result.mainPhone || "",
        faxNumber: result.faxNumber || null,
        generalEmail: result.generalEmail || "",
        linkedinUrl: result.linkedinUrl || "",
        twitterUrl: result.twitterUrl || "",
        facebookUrl: result.facebookUrl || "",
        instagramUrl: result.instagramUrl || "",
        youtubeUrl: result.youtubeUrl || "",
        ceo: result.ceo || "",
        ceoLinkedin: result.ceoLinkedin || "",
        founderNames: result.founderNames || [],
        keyExecutives: result.keyExecutives || [],
        boardMembers: result.boardMembers || [],
        keyProducts: result.keyProducts || [],
        keyClients: result.keyClients || [],
        targetMarket: result.targetMarket || "",
        valueProposition: result.valueProposition || "",
        competitors: result.competitors || [],
        competitiveAdvantage: result.competitiveAdvantage || "",
        techStack: result.techStack || [],
        fundingTotal: result.fundingTotal || "",
        fundingRounds: result.fundingRounds || [],
        lastFundingDate: result.lastFundingDate || null,
        investors: result.investors || [],
        acquisitions: result.acquisitions || [],
        partnerships: result.partnerships || [],
        awards: result.awards || [],
        certifications: result.certifications || [],
        recentNews: result.recentNews || [],
        hiringSignals: result.hiringSignals || [],
        growthIndicators: result.growthIndicators || [],
        painPoints: result.painPoints || [],
        glassdoorRating: result.glassdoorRating || null,
        bbbRating: result.bbbRating || null,
        customerReviewSentiment: result.customerReviewSentiment || "unknown",
        dataQualityScore: result.dataQualityScore || 50,
        verificationNotes: result.verificationNotes || "",
        sourcesUsed: allSources.slice(0, 10),
        dataSource: "deep_web_enrichment",
        websiteUrl: result.website || `https://${domain || ""}`,
        lastEnrichedAt: new Date(),
      };
    } catch (err: any) {
      console.error("[Intelligence] Deep enrich company error:", err.message);
      return {
        name: data.name || "", domain: data.domain || "", description: "",
        industry: "", subIndustry: "", employeeCount: null, employeeRange: "",
        annualRevenue: null, revenueRange: "", foundedYear: null, companyType: "private",
        headquarters: "", hqCity: "", hqState: "", hqCountry: "US",
        linkedinUrl: "", websiteUrl: `https://${data.domain || ""}`, mainPhone: "",
        techStack: [], dataSource: "fallback", lastEnrichedAt: new Date(),
      };
    }
  }

  async findEmail(firstName: string, lastName: string, domain: string): Promise<any> {
    const searchQuery = `"${firstName} ${lastName}" "${domain}" email contact`;

    try {
      const searchData = await tavilySearchRaw(searchQuery);
      const searchContent = [
        searchData.answer || "",
        ...(searchData.results || []).map((r: any) => `${r.title}: ${r.content || ""} (${r.url})`)
      ].join("\n\n");

      const result = await aiExtract(
        `You are an email finder specialist. Find real email addresses from search results and determine the most likely email pattern for the company domain.`,
        `Find the email address for ${firstName} ${lastName} at ${domain}.

Search Results:
${searchContent}

Analyze the company's email pattern and return JSON:
{
  "email": "most likely real email address",
  "confidence": 0-100,
  "pattern": "pattern used (e.g. first.last, flast, firstl)",
  "foundInSearch": true if email was directly found in results,
  "alternatives": [
    {"email": "alternative@domain.com", "confidence": 0-100}
  ],
  "source": "where the email or pattern was found"
}

Generate likely patterns: first.last@domain, firstlast@domain, flast@domain, first_last@domain, first@domain. Rank by what's most common for this company/industry.`
      );

      return {
        email: result.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
        confidence: result.confidence || (result.foundInSearch ? 95 : 70),
        pattern: result.pattern || "first.last",
        alternatives: result.alternatives || [],
        source: result.source || "ai_pattern_analysis",
      };
    } catch (err: any) {
      const patterns = [
        { pattern: "first.last", email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`, confidence: 75 },
        { pattern: "flast", email: `${firstName[0]?.toLowerCase() || ""}${lastName.toLowerCase()}@${domain}`, confidence: 60 },
        { pattern: "first_last", email: `${firstName.toLowerCase()}_${lastName.toLowerCase()}@${domain}`, confidence: 50 },
      ];
      return {
        email: patterns[0].email, confidence: patterns[0].confidence,
        pattern: patterns[0].pattern, alternatives: patterns.slice(1),
        source: "pattern_generation",
      };
    }
  }

  async findPhone(name: string, company: string): Promise<any> {
    const searchQuery = `"${name}" "${company}" phone number contact`;

    try {
      const searchData = await tavilySearchRaw(searchQuery);
      const searchContent = [
        searchData.answer || "",
        ...(searchData.results || []).map((r: any) => `${r.title}: ${r.content || ""} (${r.url})`)
      ].join("\n\n");

      const result = await aiExtract(
        `You are a phone number finder. Extract real phone numbers from search results. Only return numbers you actually found.`,
        `Find phone numbers for ${name} at ${company}.

Search Results:
${searchContent}

Return JSON:
{
  "phones": [
    {"number": "+1XXXXXXXXXX", "type": "direct|mobile|office|main", "confidence": 0-100, "source": "where found"}
  ]
}

CRITICAL: Only include phone numbers actually found in the search results. Do not fabricate numbers.`
      );

      return {
        phones: result.phones || [],
        source: "web_search",
      };
    } catch (err: any) {
      return { phones: [], source: "error" };
    }
  }

  async detectIntent(companyDomain: string, topics: string[]): Promise<any[]> {
    const searchQuery = `"${companyDomain}" ${topics.join(" ")} hiring expansion product launch news`;

    try {
      const searchData = await tavilySearchRaw(searchQuery);
      const searchContent = [
        searchData.answer || "",
        ...(searchData.results || []).map((r: any) => `${r.title}: ${r.content || ""} (${r.url})`)
      ].join("\n\n");

      const result = await aiExtract(
        `You are a buying intent analyst. Detect real buying signals from web search results about a company.`,
        `Analyze buying intent signals for ${companyDomain} related to topics: ${topics.join(", ")}.

Search Results:
${searchContent}

Return JSON:
{
  "signals": [
    {
      "companyDomain": "${companyDomain}",
      "companyName": "company name from results",
      "topicCategory": "which topic this relates to",
      "signalType": "hiring|expansion|tech_evaluation|content_consumption|event_attendance",
      "signalStrength": "high|medium|low",
      "score": 0-100,
      "source": "where signal was found",
      "evidence": "specific evidence text from search results",
      "detectedAt": "current date ISO string"
    }
  ]
}

CRITICAL: Only report signals actually evidenced in search results.`
      );

      return (result.signals || []).map((s: any) => ({
        ...s,
        companyDomain,
        detectedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      }));
    } catch (err: any) {
      console.error("[Intelligence] Intent detection error:", err.message);
      return [];
    }
  }

  async detectTechStack(domain: string): Promise<string[]> {
    const searchQuery = `"${domain}" technology stack tools software platform`;

    try {
      const searchData = await tavilySearchRaw(searchQuery);
      const searchContent = [
        searchData.answer || "",
        ...(searchData.results || []).map((r: any) => `${r.title}: ${r.content || ""} (${r.url})`)
      ].join("\n\n");

      const result = await aiExtract(
        `You are a technographics analyst. Identify real technologies used by a company from search results.`,
        `What technologies, tools, and platforms does ${domain} use?

Search Results:
${searchContent}

Return JSON:
{
  "technologies": ["tech1", "tech2", "tech3"]
}

Only list technologies you can confirm from the search results.`
      );

      return result.technologies || [];
    } catch (err: any) {
      return [];
    }
  }

  getTechDetails(technology: string): { category: string; competitors: string[] } | null {
    return TECH_DATABASE[technology] || null;
  }

  async buildOrgChart(companyName: string, companyId: string): Promise<any[]> {
    const searchQuery = `"${companyName}" leadership team executives management LinkedIn`;

    try {
      const searchData = await tavilySearchRaw(searchQuery);
      const searchContent = [
        searchData.answer || "",
        ...(searchData.results || []).map((r: any) => `${r.title}: ${r.content || ""} (${r.url})`)
      ].join("\n\n");

      const result = await aiExtract(
        `You are an organizational structure analyst. Extract real leadership and team structure from search results.`,
        `Find the leadership team and org structure for ${companyName}.

Search Results:
${searchContent}

Return JSON:
{
  "entries": [
    {
      "name": "real person name",
      "title": "their job title",
      "department": "their department",
      "seniorityLevel": "c_suite|vp|director|manager|senior",
      "level": 0 for CEO, 1 for C-suite, 2 for VPs, 3 for directors,
      "isDecisionMaker": true/false,
      "isBudgetHolder": true/false,
      "isInfluencer": true/false,
      "linkedinUrl": "LinkedIn URL if found"
    }
  ]
}

CRITICAL: Only include real people found in search results.`
      );

      return (result.entries || []).map((e: any) => ({
        companyId,
        name: e.name || "",
        title: e.title || "",
        department: e.department || "",
        seniorityLevel: e.seniorityLevel || "individual",
        level: e.level ?? 3,
        isDecisionMaker: e.isDecisionMaker || false,
        isBudgetHolder: e.isBudgetHolder || false,
        isInfluencer: e.isInfluencer || false,
        linkedinUrl: e.linkedinUrl || null,
      }));
    } catch (err: any) {
      console.error("[Intelligence] Org chart error:", err.message);
      return [];
    }
  }

  async getCompanyEvents(companyDomain: string): Promise<any[]> {
    const searchQuery = `"${companyDomain}" recent news funding expansion partnership announcement`;

    try {
      const searchData = await tavilySearchRaw(searchQuery);
      const searchContent = [
        searchData.answer || "",
        ...(searchData.results || []).map((r: any) => `${r.title}: ${r.content || ""} (${r.url})`)
      ].join("\n\n");

      const result = await aiExtract(
        `You are a company events analyst. Extract real recent events and news about a company from search results.`,
        `Find recent news and events for the company at ${companyDomain}.

Search Results:
${searchContent}

Return JSON:
{
  "events": [
    {
      "eventType": "funding|expansion|leadership_change|product_launch|partnership|hiring_surge|acquisition|award",
      "title": "event headline",
      "summary": "2-3 sentence summary",
      "eventDate": "ISO date string if known",
      "sourceUrl": "source URL",
      "relevanceScore": 0-100
    }
  ]
}

CRITICAL: Only include events actually found in search results.`
      );

      return (result.events || []).map((e: any) => ({
        companyDomain,
        eventType: e.eventType || "news",
        title: e.title || "",
        summary: e.summary || "",
        eventDate: e.eventDate ? new Date(e.eventDate) : new Date(),
        sourceUrl: e.sourceUrl || "",
        relevanceScore: e.relevanceScore || 50,
      }));
    } catch (err: any) {
      console.error("[Intelligence] Events error:", err.message);
      return [];
    }
  }

  async aiResearchCompany(domain: string): Promise<any> {
    try {
      const companyName = domain.replace(/\.(com|io|co|net|org|ai)$/i, "");
      const { sources, rawText } = await multiSourceCompanyData(companyName, domain);
      const sourceCount = Object.keys(sources).length;
      const dataSources = Object.keys(sources).join(", ");
      const allSources = Object.keys(sources);

      console.log(`[Intelligence] Deep research: ${sourceCount} sources for "${domain}": ${dataSources}`);

      return await aiExtract(
        `You are an expert B2B sales intelligence researcher powered by a multi-source data pipeline (${dataSources}). You have access to government registries, SEC filings, knowledge bases, GitHub, domain data, and web search. Provide DEEP, actionable research. Cross-reference ALL sources.`,
        `Deep research the company at ${domain} for B2B sales approach. Use ALL intelligence data from ${sourceCount} sources below.

MULTI-SOURCE INTELLIGENCE DATA (${dataSources}):
${rawText}

Return comprehensive JSON:
{
  "name": "Company Name",
  "description": "What they do in 3-5 detailed sentences",
  "industry": "Primary industry",
  "subIndustry": "Specific niche",
  "estimatedEmployees": "range like 51-200",
  "estimatedRevenue": "range like $10M-$50M",
  "yearFounded": number or null,
  "keyProducts": ["product1", "product2"],
  "keyServices": ["service1", "service2"],
  "targetMarket": "detailed description of who they sell to",
  "competitors": ["competitor1", "competitor2", "competitor3"],
  "competitivePositioning": "how they differentiate from competitors",
  "recentNews": ["notable recent events with dates"],
  "hiringTrends": ["what roles they are hiring for and what it signals"],
  "growthIndicators": ["signs of growth or contraction"],
  "techStack": ["technologies they use"],
  "painPoints": ["pain point 1 with explanation", "pain point 2 with explanation"],
  "buyingTriggers": ["events that would make them ready to buy"],
  "budgetCycle": "when they typically make purchasing decisions if determinable",
  "decisionMakers": [{"name": "if found", "title": "title", "department": "dept", "linkedinUrl": "if found"}],
  "decisionProcess": "how they typically make buying decisions",
  "bestApproachAngle": "detailed strategy for positioning your pitch",
  "emailTemplate": "suggested outreach email opening paragraph",
  "objectionHandling": ["likely objection and how to address it"],
  "keyClients": ["notable clients or partners if found"],
  "awards": ["awards or recognitions"],
  "socialPresence": {"linkedin": "url", "twitter": "url", "facebook": "url"},
  "dataSources": ${JSON.stringify(allSources)},
  "sources": ["URLs from the data"]
}`
      );
    } catch (err: any) {
      console.error("[Intelligence] AI company research error:", err.message);
      return { error: "Research failed: " + err.message };
    }
  }

  async aiResearchContact(name: string, company: string, title: string): Promise<any> {
    try {
      const { sources, rawText } = await multiSourcePeopleData(name, company, title);
      const sourceCount = Object.keys(sources).length;
      const dataSources = Object.keys(sources).join(", ");
      const allSources = Object.keys(sources);

      console.log(`[Intelligence] Deep contact research: ${sourceCount} sources for "${name}" at "${company}"`);

      return await aiExtract(
        `You are an expert B2B sales intelligence researcher powered by a multi-source pipeline (${dataSources}). Provide comprehensive, actionable sales insights. Cross-reference ALL sources.`,
        `Deep research this prospect for a sales approach using ALL intelligence data from ${sourceCount} sources:
Name: ${name}, Company: ${company}, Title: ${title}

MULTI-SOURCE INTELLIGENCE DATA (${dataSources}):
${rawText}

Return comprehensive JSON:
{
  "fullName": "${name}",
  "currentRole": "exact current title and responsibilities",
  "careerPath": "career trajectory summary",
  "yearsInCurrentRole": number or null,
  "likelyResponsibilities": ["detailed responsibility 1", "detailed responsibility 2"],
  "kpis": ["what metrics they likely care about"],
  "decisionMakingPower": "high|medium|low",
  "budgetAuthority": "what they can approve spending on",
  "reportingTo": "who they likely report to",
  "directReports": "who likely reports to them",
  "likelyChallenges": ["specific challenge 1 with context", "challenge 2"],
  "professionalInterests": ["topics they care about"],
  "recentActivity": "recent posts, articles, speaking, or news",
  "publications": ["articles, blog posts, or talks if found"],
  "awards": ["professional recognition"],
  "education": "educational background if found",
  "certifications": ["professional certifications"],
  "bestOutreachChannel": "email|linkedin|phone with reasoning",
  "bestTimeToContact": "suggestion based on timezone and role",
  "communicationStyle": "formal|casual|technical|executive — with reasoning",
  "icebreaker": "highly personalized opening line referencing specific research findings",
  "alternativeIcebreakers": ["2-3 other personalized openers"],
  "talkingPoints": ["specific point referencing their challenges", "point about their industry"],
  "valueProposition": "how to frame your offering for this specific person",
  "objections": ["likely objection with suggested response"],
  "buyerPersonaType": "analytical|driver|amiable|expressive — with reasoning",
  "triggerEvents": ["events that would make them more receptive"],
  "mutualConnections": "any notable affiliations or shared connections",
  "socialProfiles": {"linkedin": "", "twitter": ""},
  "dataSources": ${JSON.stringify(allSources)},
  "sources": ["URLs from the data"]
}`
      );
    } catch (err: any) {
      return { error: "Research failed: " + err.message };
    }
  }

  classifySeniority(title: string): string {
    const lower = title.toLowerCase();
    for (const [keyword, level] of Object.entries(JOB_TITLE_SENIORITY)) {
      if (lower.includes(keyword)) return level;
    }
    return "individual";
  }

  classifyDepartment(title: string): string {
    const lower = title.toLowerCase();
    for (const [keyword, dept] of Object.entries(JOB_TITLE_DEPARTMENTS)) {
      if (lower.includes(keyword)) return dept;
    }
    return "operations";
  }
}

export const intelligenceEngine = new IntelligenceEngine();
