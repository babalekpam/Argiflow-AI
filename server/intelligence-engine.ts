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

    const searches: Promise<any>[] = [];
    searches.push(tavilySearchRaw(`Find business professionals: ${parts.join(", ")}. LinkedIn profiles, company websites, team pages.`).catch(() => null));
    if (filters.company) searches.push(tavilySearchRaw(`"${filters.company}" team leadership staff directory email phone contact`).catch(() => null));
    if (filters.industry && filters.location) searches.push(tavilySearchRaw(`${filters.jobTitle || "professional"} ${filters.industry} ${filters.location} email phone LinkedIn`).catch(() => null));

    try {
      const searchResults = await Promise.all(searches);
      const allContent: string[] = [];
      for (const sr of searchResults) {
        if (!sr) continue;
        if (sr.answer) allContent.push(sr.answer);
        for (const r of (sr.results || [])) {
          allContent.push(`Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`);
        }
      }
      const searchContent = allContent.join("\n\n---\n\n");

      const result = await aiExtract(
        `You are an expert B2B sales intelligence data extractor performing DEEP research. Extract real professional contacts with maximum detail from web search results. Cross-reference data across sources. Return ONLY real people with real information. Do NOT fabricate any data.`,
        `From these web search results, extract real business contacts matching: ${parts.join(", ")}.

Search Results:
${searchContent}

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
      "source": "primary source URL where found",
      "dataQualityScore": 0-100 based on verified data
    }
  ],
  "totalEstimated": number of total possible matches
}

CRITICAL: Only include people you actually found in the search results. Real names, real companies. Cross-reference across sources. If the search returned no relevant people, return {"contacts": [], "totalEstimated": 0}.`
      );

      const contacts = (result.contacts || []).map((c: any, i: number) => ({
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
        source: c.source || "web search",
        dataQualityScore: c.dataQualityScore || (c.email && c.phone ? 90 : c.email ? 75 : 55),
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

    try {
      const searches: Promise<any>[] = [];

      if (filters.name) {
        searches.push(tavilySearchRaw(`"${filters.name}" company website about phone email contact address`).catch(() => null));
        searches.push(tavilySearchRaw(`"${filters.name}" owner founder CEO leadership team management`).catch(() => null));
        if (filters.location) {
          searches.push(tavilySearchRaw(`"${filters.name}" ${filters.location} business phone email website`).catch(() => null));
        }
      } else {
        searches.push(tavilySearchRaw(`Find businesses: ${parts.join(", ")}. Company websites, business directories.`).catch(() => null));
        if (filters.industry && filters.location) {
          searches.push(tavilySearchRaw(`${filters.industry} companies ${filters.location} directory list phone email`).catch(() => null));
        }
      }

      const searchResults = await Promise.all(searches);
      const allContent: string[] = [];
      for (const sr of searchResults) {
        if (!sr) continue;
        if (sr.answer) allContent.push(sr.answer);
        for (const r of (sr.results || [])) {
          allContent.push(`Source: ${r.url}\nTitle: ${r.title}\n${r.content || ""}`);
        }
      }
      const searchContent = allContent.join("\n\n---\n\n");

      if (!searchContent.trim()) {
        return { results: [], total: 0, page, pages: 0, source: "no_results" };
      }

      const result = await aiExtract(
        `You are a B2B company intelligence analyst combining Apollo.io and ZoomInfo-style data extraction. Extract comprehensive company profiles from web search results with maximum detail. Return ONLY real companies with verified information. Do NOT fabricate any data.`,
        `From these search results, extract real companies matching: ${parts.join(", ")}.

Search Results:
${searchContent}

Return JSON with comprehensive company profiles:
{
  "companies": [
    {
      "name": "real company name",
      "domain": "company website domain (e.g. acme.com)",
      "website": "full website URL",
      "description": "detailed description of what the company does (2-3 sentences)",
      "industry": "primary industry",
      "subIndustry": "specific niche/specialty",
      "location": "headquarters city, state",
      "employeeCount": estimated number or null,
      "employeeRange": "range like 1-10, 11-50, 51-200, 201-500, 501-1000, 1000+",
      "phone": "main company phone if found",
      "email": "main company email if found",
      "yearFounded": year or null,
      "revenue": "estimated annual revenue range if found",
      "ownerName": "owner/founder/CEO name if found",
      "ownerTitle": "their title",
      "ownerEmail": "owner's email if found",
      "ownerPhone": "owner's direct phone if found",
      "ownerLinkedin": "owner's LinkedIn URL if found",
      "keyContacts": [
        {"name": "contact name", "title": "their title", "email": "email if found", "phone": "phone if found"}
      ],
      "technologies": ["known technologies/software used"],
      "socialMedia": {"linkedin": "url", "facebook": "url", "twitter": "url"},
      "source": "primary source URL"
    }
  ],
  "totalEstimated": number
}

CRITICAL RULES:
- Only include companies you actually found in the search results
- Extract ALL contact details visible in search results (phone, email, addresses)
- Always try to identify the owner/founder/CEO from leadership searches
- Cross-reference information across multiple search results for accuracy
- Include key contacts (decision makers) found in the results`
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
        email: c.email || null,
        foundedYear: c.yearFounded || null,
        revenue: c.revenue || null,
        ownerName: c.ownerName || null,
        ownerTitle: c.ownerTitle || null,
        ownerEmail: c.ownerEmail || null,
        ownerPhone: c.ownerPhone || null,
        ownerLinkedin: c.ownerLinkedin || null,
        keyContacts: c.keyContacts || [],
        technologies: c.technologies || [],
        socialMedia: c.socialMedia || {},
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
    confidence: string;
    notes: string;
    source: string;
  }> {
    try {
      const company = data.company;
      if (!company) return { name: null, title: null, email: null, phone: null, linkedinUrl: null, confidence: "low", notes: "No company provided", source: "" };

      const searches: Promise<any>[] = [
        tavilySearchRaw(`"${company}" owner OR CEO OR founder OR physician OR "managing partner" OR director contact`).catch(() => null),
        tavilySearchRaw(`"${company}" practice owner dentist doctor chiropractor email phone`).catch(() => null),
        tavilySearchRaw(`"${company}" team leadership about us staff`).catch(() => null),
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

      if (allContent.length === 0) {
        return { name: null, title: null, email: null, phone: null, linkedinUrl: null, confidence: "low", notes: "No web results found", source: "" };
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

Return JSON:
{
  "name": "Full Name with title (e.g., Dr. John Smith, DDS)",
  "title": "Their title (Owner, CEO, Lead Dentist, Medical Director, etc.)",
  "email": "their email from search results, or null if not found",
  "phone": "their phone from search results, or null if not found",
  "linkedinUrl": "LinkedIn URL if found, or null",
  "confidence": "high (found in multiple sources) | medium (found in one source) | low (inferred/uncertain)",
  "notes": "How you identified this person as the decision maker",
  "source": "Primary URL where found"
}

CRITICAL: Only return data you actually found in the search results. Use null for anything you cannot verify. Never return phone numbers with 555. Never fabricate emails.`
      );

      return {
        name: result.name || null,
        title: result.title || null,
        email: result.email && result.email !== "null" ? result.email : null,
        phone: result.phone && result.phone !== "null" ? result.phone : null,
        linkedinUrl: result.linkedinUrl && result.linkedinUrl !== "null" ? result.linkedinUrl : null,
        confidence: result.confidence || "low",
        notes: result.notes || "",
        source: result.source || allSources[0] || "",
      };
    } catch (err: any) {
      console.error("[Intelligence] Find decision maker error:", err.message);
      return { name: null, title: null, email: null, phone: null, linkedinUrl: null, confidence: "low", notes: `Error: ${err.message}`, source: "" };
    }
  }

  async enrichCompany(data: { domain?: string; name?: string }): Promise<any> {
    try {
      const companyName = data.name || "";
      const domain = data.domain || "";
      const searches: Promise<any>[] = [];

      searches.push(tavilySearchRaw(`"${companyName || domain}" company profile employees industry revenue headquarters founded`).catch(() => null));
      if (domain) searches.push(tavilySearchRaw(`site:${domain} about us company team leadership contact`).catch(() => null));
      searches.push(tavilySearchRaw(`"${companyName || domain}" funding investors valuation acquisition partnership news`).catch(() => null));
      searches.push(tavilySearchRaw(`"${companyName || domain}" reviews Glassdoor BBB clients customers testimonials`).catch(() => null));

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
        `You are an expert B2B company intelligence analyst performing DEEP research. Extract every verifiable data point. Cross-reference multiple sources for accuracy. Be thorough and comprehensive.`,
        `Perform DEEP enrichment on this company using ALL search results below. Cross-reference data across sources.

Target Company:
- Name: ${companyName || "Unknown"}
- Domain: ${domain || "Unknown"}

Search Results (from ${allSources.length} sources):
${searchContent}

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
      const searches = await Promise.all([
        tavilySearchRaw(`"${domain}" company profile products services competitors target market`).catch(() => null),
        tavilySearchRaw(`"${domain}" hiring jobs openings team growth expansion news`).catch(() => null),
        tavilySearchRaw(`"${domain}" reviews testimonials clients case studies partnerships`).catch(() => null),
      ]);

      const allContent: string[] = [];
      const allSources: string[] = [];
      for (const sr of searches) {
        if (!sr) continue;
        if (sr.answer) allContent.push(sr.answer);
        for (const r of (sr.results || [])) {
          allContent.push(`Source: ${r.url}\n${r.title}: ${r.content || ""}`);
          allSources.push(r.url);
        }
      }
      const searchContent = allContent.join("\n\n---\n\n");

      return await aiExtract(
        `You are an expert B2B sales intelligence researcher providing DEEP, actionable company research. Cross-reference multiple sources. Be thorough and specific.`,
        `Deep research the company at ${domain} for B2B sales approach. Use ALL search results below.

Search Results (${allSources.length} sources):
${searchContent}

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
  "sources": ${JSON.stringify(allSources.slice(0, 10))}
}`
      );
    } catch (err: any) {
      console.error("[Intelligence] AI company research error:", err.message);
      return { error: "Research failed: " + err.message };
    }
  }

  async aiResearchContact(name: string, company: string, title: string): Promise<any> {
    try {
      const searches = await Promise.all([
        tavilySearchRaw(`"${name}" "${company}" ${title} professional profile LinkedIn`).catch(() => null),
        tavilySearchRaw(`"${name}" ${company} speaking events publications awards interviews`).catch(() => null),
        tavilySearchRaw(`"${name}" ${title} insights articles posts thought leadership`).catch(() => null),
      ]);

      const allContent: string[] = [];
      const allSources: string[] = [];
      for (const sr of searches) {
        if (!sr) continue;
        if (sr.answer) allContent.push(sr.answer);
        for (const r of (sr.results || [])) {
          allContent.push(`Source: ${r.url}\n${r.title}: ${r.content || ""}`);
          allSources.push(r.url);
        }
      }
      const searchContent = allContent.join("\n\n---\n\n");

      return await aiExtract(
        `You are an expert B2B sales intelligence researcher specializing in DEEP prospect analysis. Provide comprehensive, actionable sales insights. Cross-reference multiple sources.`,
        `Deep research this prospect for a sales approach using ALL search results:
Name: ${name}, Company: ${company}, Title: ${title}

Search Results (${allSources.length} sources):
${searchContent}

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
  "sources": ${JSON.stringify(allSources.slice(0, 10))}
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
