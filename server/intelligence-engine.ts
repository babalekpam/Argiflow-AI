import OpenAI from "openai";

const OPENAI_MODEL = "gpt-4o-mini";

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

async function tavilySearchRaw(query: string): Promise<any> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("Tavily API key not configured");
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
  });
  if (!response.ok) throw new Error(`Tavily search failed: ${response.status}`);
  return response.json();
}

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

async function aiExtract(systemPrompt: string, userPrompt: string): Promise<any> {
  const openai = getOpenAI();
  if (!openai) throw new Error("OpenAI API key not configured");
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });
  const text = response.choices[0]?.message?.content || "{}";
  return JSON.parse(text);
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

    const searchQuery = `Find business professionals: ${parts.join(", ")}. LinkedIn profiles, company websites, team pages.`;

    try {
      const searchData = await tavilySearchRaw(searchQuery);
      const searchContent = [
        searchData.answer || "",
        ...(searchData.results || []).map((r: any) => `Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`)
      ].join("\n\n");

      const result = await aiExtract(
        `You are a B2B sales intelligence data extractor. Extract real professional contacts from web search results. Return ONLY real people with real information found in the search results. Do NOT fabricate any data. If you cannot find real people, return an empty array. Never use example.com, fake phone numbers, or made-up names.`,
        `From these web search results, extract real business contacts matching: ${parts.join(", ")}.

Search Results:
${searchContent}

Return JSON:
{
  "contacts": [
    {
      "firstName": "real first name",
      "lastName": "real last name",
      "fullName": "full name",
      "jobTitle": "their actual job title",
      "companyName": "real company name",
      "companyDomain": "company website domain",
      "location": "city, state if available",
      "industry": "their industry",
      "linkedinUrl": "linkedin URL if found",
      "email": "email if publicly available, otherwise null",
      "phone": "phone if publicly available, otherwise null",
      "source": "where this info was found",
      "summary": "1-2 sentence summary of this person"
    }
  ],
  "totalEstimated": number of total possible matches
}

CRITICAL: Only include people you actually found in the search results. Real names, real companies. If the search returned no relevant people, return {"contacts": [], "totalEstimated": 0}.`
      );

      const contacts = (result.contacts || []).map((c: any, i: number) => ({
        id: `si_${Date.now()}_${i}`,
        firstName: c.firstName || "",
        lastName: c.lastName || "",
        fullName: c.fullName || `${c.firstName} ${c.lastName}`,
        jobTitle: c.jobTitle || "",
        seniorityLevel: this.classifySeniority(c.jobTitle || ""),
        department: this.classifyDepartment(c.jobTitle || ""),
        companyName: c.companyName || "",
        companyDomain: c.companyDomain || "",
        workEmail: c.email || null,
        directPhone: c.phone || null,
        linkedinUrl: c.linkedinUrl || null,
        city: c.location?.split(",")[0]?.trim() || "",
        state: c.location?.split(",")[1]?.trim() || "",
        country: "US",
        industry: c.industry || filters.industry || "",
        summary: c.summary || "",
        source: c.source || "web search",
        dataQualityScore: c.email ? 85 : 65,
      }));

      return {
        results: contacts.slice(0, limit),
        total: result.totalEstimated || contacts.length,
        page,
        pages: Math.ceil((result.totalEstimated || contacts.length) / limit),
        source: "ai_web_search",
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

    const searchQuery = `Find real businesses and companies: ${parts.join(", ")}. Company websites, business directories, LinkedIn company pages.`;

    try {
      const searchData = await tavilySearchRaw(searchQuery);
      const searchContent = [
        searchData.answer || "",
        ...(searchData.results || []).map((r: any) => `Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`)
      ].join("\n\n");

      const result = await aiExtract(
        `You are a B2B company intelligence extractor. Extract real company information from web search results. Return ONLY real companies with verified information. Do NOT fabricate any data.`,
        `From these search results, extract real companies matching: ${parts.join(", ")}.

Search Results:
${searchContent}

Return JSON:
{
  "companies": [
    {
      "name": "real company name",
      "domain": "company website domain",
      "description": "what the company does",
      "industry": "primary industry",
      "subIndustry": "specific niche",
      "location": "headquarters location",
      "employeeCount": estimated number or null,
      "employeeRange": "range like 11-50",
      "website": "full website URL",
      "phone": "company phone if found",
      "yearFounded": year or null,
      "source": "where info was found"
    }
  ],
  "totalEstimated": number
}

CRITICAL: Only include companies you actually found. Real names, real websites. No fabricated data.`
      );

      const companies = (result.companies || []).map((c: any, i: number) => ({
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
        foundedYear: c.yearFounded || null,
        companyType: "private",
        source: c.source || "web search",
      }));

      return {
        results: companies.slice(0, limit),
        total: result.totalEstimated || companies.length,
        page,
        pages: Math.ceil((result.totalEstimated || companies.length) / limit),
        source: "ai_web_search",
      };
    } catch (err: any) {
      console.error("[Intelligence] Company search error:", err.message);
      return { results: [], total: 0, page, pages: 0, source: "error" };
    }
  }

  async enrichContact(data: { email?: string; name?: string; company?: string; linkedinUrl?: string }): Promise<any> {
    const searchQuery = `${data.name || ""} ${data.company || ""} ${data.email || ""} professional profile LinkedIn`;

    try {
      const searchData = await tavilySearchRaw(searchQuery);
      const searchContent = [
        searchData.answer || "",
        ...(searchData.results || []).map((r: any) => `${r.title}: ${r.content || ""} (${r.url})`)
      ].join("\n\n");

      const result = await aiExtract(
        `You are a contact enrichment specialist. Extract real professional information from search results. Only return verified data found in the results.`,
        `Enrich this contact using the search results below:
Name: ${data.name || "Unknown"}
Email: ${data.email || "Unknown"}
Company: ${data.company || "Unknown"}

Search Results:
${searchContent}

Return JSON with only data you can verify from the search:
{
  "firstName": "", "lastName": "", "fullName": "",
  "jobTitle": "actual title found or best guess",
  "seniorityLevel": "c_suite|vp|director|manager|senior|individual",
  "department": "department name",
  "companyName": "", "companyDomain": "",
  "workEmail": "verified email or null",
  "directPhone": "phone if found or null",
  "linkedinUrl": "LinkedIn URL if found or null",
  "city": "", "state": "", "country": "",
  "bio": "short professional summary",
  "skills": ["skill1", "skill2"],
  "dataSource": "web_search_enrichment",
  "dataQualityScore": 0-100 based on how much real data was found
}`
      );

      return {
        firstName: result.firstName || data.name?.split(" ")[0] || "",
        lastName: result.lastName || data.name?.split(" ").slice(1).join(" ") || "",
        fullName: result.fullName || data.name || "",
        workEmail: result.workEmail || data.email || null,
        emailVerified: !!result.workEmail,
        emailConfidence: result.workEmail ? 80 : 0,
        directPhone: result.directPhone || null,
        mobilePhone: null,
        jobTitle: result.jobTitle || "Professional",
        seniorityLevel: result.seniorityLevel || "individual",
        department: result.department || "operations",
        companyName: result.companyName || data.company || "",
        companyDomain: result.companyDomain || "",
        linkedinUrl: result.linkedinUrl || data.linkedinUrl || null,
        city: result.city || "",
        state: result.state || "",
        country: result.country || "US",
        bio: result.bio || "",
        skills: result.skills || [],
        dataQualityScore: result.dataQualityScore || 50,
        dataSource: "web_search_enrichment",
        lastEnrichedAt: new Date(),
      };
    } catch (err: any) {
      console.error("[Intelligence] Enrich contact error:", err.message);
      const domain = data.email?.split("@")[1] || "";
      return {
        firstName: data.name?.split(" ")[0] || "", lastName: data.name?.split(" ").slice(1).join(" ") || "",
        fullName: data.name || "", workEmail: data.email || null, emailVerified: false, emailConfidence: 0,
        directPhone: null, mobilePhone: null, jobTitle: "Professional", seniorityLevel: "individual",
        department: "operations", companyName: data.company || "", companyDomain: domain,
        linkedinUrl: null, city: "", state: "", country: "US", bio: "", skills: [],
        dataQualityScore: 20, dataSource: "fallback", lastEnrichedAt: new Date(),
      };
    }
  }

  async enrichCompany(data: { domain?: string; name?: string }): Promise<any> {
    const searchQuery = `"${data.name || data.domain}" company profile employees industry revenue`;

    try {
      const searchData = await tavilySearchRaw(searchQuery);
      const searchContent = [
        searchData.answer || "",
        ...(searchData.results || []).map((r: any) => `${r.title}: ${r.content || ""} (${r.url})`)
      ].join("\n\n");

      const result = await aiExtract(
        `You are a company intelligence analyst. Extract real company data from search results. Only include verified information.`,
        `Research this company using the search results:
Name: ${data.name || "Unknown"}
Domain: ${data.domain || "Unknown"}

Search Results:
${searchContent}

Return JSON:
{
  "name": "", "domain": "", "description": "what the company does",
  "industry": "", "subIndustry": "",
  "employeeCount": number or null, "employeeRange": "",
  "annualRevenue": number or null, "revenueRange": "",
  "foundedYear": number or null, "companyType": "private|public",
  "headquarters": "city, state", "hqCity": "", "hqState": "", "hqCountry": "",
  "linkedinUrl": "", "websiteUrl": "", "mainPhone": "",
  "techStack": ["technologies they use"],
  "dataSource": "web_search_enrichment"
}`
      );

      return {
        name: result.name || data.name || "", domain: result.domain || data.domain || "",
        description: result.description || "", industry: result.industry || "",
        subIndustry: result.subIndustry || "", employeeCount: result.employeeCount || null,
        employeeRange: result.employeeRange || "", annualRevenue: result.annualRevenue || null,
        revenueRange: result.revenueRange || "", foundedYear: result.foundedYear || null,
        companyType: result.companyType || "private", headquarters: result.headquarters || "",
        hqCity: result.hqCity || "", hqState: result.hqState || "", hqCountry: result.hqCountry || "US",
        linkedinUrl: result.linkedinUrl || "", websiteUrl: result.websiteUrl || `https://${data.domain || ""}`,
        mainPhone: result.mainPhone || "", techStack: result.techStack || [],
        dataSource: "web_search_enrichment", lastEnrichedAt: new Date(),
      };
    } catch (err: any) {
      console.error("[Intelligence] Enrich company error:", err.message);
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
    const searchQuery = `"${domain}" company profile products services competitors target market`;

    try {
      const searchData = await tavilySearchRaw(searchQuery);
      const searchContent = [
        searchData.answer || "",
        ...(searchData.results || []).map((r: any) => `Source: ${r.url}\n${r.title}: ${r.content || ""}`)
      ].join("\n\n");

      return await aiExtract(
        `You are an expert B2B sales intelligence researcher. Provide deep, actionable research about companies to help sales teams. Base your analysis on the search results provided.`,
        `Deep research the company at ${domain} for B2B sales approach.

Search Results:
${searchContent}

Return comprehensive JSON:
{
  "name": "Company Name",
  "description": "What they do in 2-3 sentences",
  "industry": "Primary industry",
  "subIndustry": "Specific niche",
  "estimatedEmployees": "range like 51-200",
  "estimatedRevenue": "range like 10-50M",
  "keyProducts": ["product1", "product2"],
  "targetMarket": "Who they sell to",
  "competitors": ["competitor1", "competitor2"],
  "recentNews": "Notable recent activity",
  "painPoints": ["potential pain point 1", "potential pain point 2"],
  "decisionMakers": [{"title": "title", "department": "dept"}],
  "bestApproachAngle": "How to position your pitch",
  "sources": ["url1", "url2"]
}`
      );
    } catch (err: any) {
      console.error("[Intelligence] AI company research error:", err.message);
      return { error: "Research failed: " + err.message };
    }
  }

  async aiResearchContact(name: string, company: string, title: string): Promise<any> {
    const searchQuery = `"${name}" "${company}" ${title} professional profile`;

    try {
      const searchData = await tavilySearchRaw(searchQuery);
      const searchContent = [
        searchData.answer || "",
        ...(searchData.results || []).map((r: any) => `Source: ${r.url}\n${r.title}: ${r.content || ""}`)
      ].join("\n\n");

      return await aiExtract(
        `You are a B2B sales intelligence researcher specializing in prospect analysis. Provide actionable sales insights based on search results.`,
        `Research this prospect for a sales approach:
Name: ${name}, Company: ${company}, Title: ${title}

Search Results:
${searchContent}

Return JSON:
{
  "likelyResponsibilities": ["resp1", "resp2"],
  "decisionMakingPower": "high|medium|low",
  "likelyChallenges": ["challenge1", "challenge2"],
  "bestOutreachChannel": "email|linkedin|phone",
  "bestTimeToContact": "suggestion",
  "icebreaker": "personalized opening line based on research",
  "talkingPoints": ["point1", "point2", "point3"],
  "objections": ["likely objection 1", "likely objection 2"],
  "buyerPersonaType": "analytical|driver|amiable|expressive",
  "sources": ["url1"]
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
