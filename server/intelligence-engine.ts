// ============================================================
// ARGILETTE B2B SALES INTELLIGENCE ENGINE
// Drop this into: server/intelligence-engine.ts
// Core logic: search, enrich, intent detection, tech scanning
// ============================================================

import Anthropic from "@anthropic-ai/sdk";

// ============================================================
// INDUSTRY & TECHNOLOGY DATABASES
// ============================================================

const INDUSTRY_MAP: Record<string, string[]> = {
  "Healthcare": ["Medical Billing", "Revenue Cycle Management", "Practice Management", "Telehealth", "EHR/EMR", "Dental", "Mental Health", "Physical Therapy", "Pharmacy", "Home Health"],
  "Technology": ["SaaS", "Cloud", "AI/ML", "Cybersecurity", "DevOps", "Fintech", "EdTech", "HealthTech", "MarTech", "E-commerce"],
  "Finance": ["Banking", "Insurance", "Investment", "Accounting", "Wealth Management", "Mortgage", "Credit Union"],
  "Real Estate": ["Commercial", "Residential", "Property Management", "Construction", "Architecture"],
  "Manufacturing": ["Automotive", "Aerospace", "Food & Beverage", "Pharmaceutical", "Electronics"],
  "Professional Services": ["Legal", "Consulting", "Marketing Agency", "Staffing", "IT Services"],
  "Education": ["K-12", "Higher Education", "EdTech", "Training", "E-Learning"],
  "Retail": ["E-commerce", "Brick & Mortar", "Fashion", "Consumer Goods", "Grocery"],
};

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

// ============================================================
// INTELLIGENCE ENGINE CLASS
// ============================================================

export class IntelligenceEngine {

  // ── PEOPLE SEARCH ─────────────────────────────────────────

  searchPeople(filters: {
    jobTitle?: string;
    seniorityLevel?: string[];
    department?: string[];
    companyName?: string;
    industry?: string;
    employeeRange?: string[];
    revenueRange?: string[];
    location?: { city?: string; state?: string; country?: string };
    technologies?: string[];
    keywords?: string;
    hasEmail?: boolean;
    hasPhone?: boolean;
    page?: number;
    limit?: number;
  }): { results: any[]; total: number; page: number; pages: number; filters: any } {
    // In production: query contactProfiles + companyProfiles with full-text search
    // For now: AI-powered generation based on filters

    const limit = filters.limit || 25;
    const page = filters.page || 1;

    // Generate realistic results based on filters
    const results = this.generatePeopleResults(filters, limit);

    return {
      results,
      total: 150 + Math.floor(Math.random() * 500), // Simulated total
      page,
      pages: Math.ceil(650 / limit),
      filters,
    };
  }

  // ── COMPANY SEARCH ────────────────────────────────────────

  searchCompanies(filters: {
    name?: string;
    industry?: string;
    subIndustry?: string;
    employeeRange?: string[];
    revenueRange?: string[];
    location?: { city?: string; state?: string; country?: string };
    technologies?: string[];
    fundingStage?: string[];
    companyType?: string[];
    keywords?: string;
    hasIntent?: boolean;
    page?: number;
    limit?: number;
  }): { results: any[]; total: number; page: number; pages: number } {
    const limit = filters.limit || 25;
    const page = filters.page || 1;

    const results = this.generateCompanyResults(filters, limit);

    return {
      results,
      total: 80 + Math.floor(Math.random() * 300),
      page,
      pages: Math.ceil(380 / limit),
    };
  }

  // ── CONTACT ENRICHMENT ────────────────────────────────────

  enrichContact(data: { email?: string; name?: string; company?: string; linkedinUrl?: string }): any {
    // In production: call Apollo/Clearbit/Lusha/RocketReach APIs in waterfall
    const domain = data.email?.split("@")[1] || data.company?.toLowerCase().replace(/\s+/g, "") + ".com";
    const firstName = data.name?.split(" ")[0] || "Unknown";
    const lastName = data.name?.split(" ").slice(1).join(" ") || "";

    return {
      firstName, lastName, fullName: data.name || `${firstName} ${lastName}`,
      workEmail: data.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
      emailVerified: Math.random() < 0.85,
      emailConfidence: 75 + Math.floor(Math.random() * 25),
      directPhone: Math.random() < 0.6 ? `+1${Math.floor(2000000000 + Math.random() * 8000000000)}` : null,
      mobilePhone: Math.random() < 0.4 ? `+1${Math.floor(2000000000 + Math.random() * 8000000000)}` : null,
      jobTitle: this.inferJobTitle(data),
      seniorityLevel: "manager",
      department: "operations",
      companyName: data.company || domain?.split(".")[0] || "Unknown",
      companyDomain: domain,
      linkedinUrl: data.linkedinUrl || `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
      city: "New York", state: "NY", country: "US",
      bio: `Experienced professional at ${data.company || "their organization"}.`,
      skills: ["Operations", "Team Management", "Process Improvement"],
      dataQualityScore: 65 + Math.floor(Math.random() * 30),
      dataSource: "enrichment",
    };
  }

  // ── COMPANY ENRICHMENT ────────────────────────────────────

  enrichCompany(data: { domain?: string; name?: string }): any {
    // In production: call Clearbit Company API / Apollo / ZoomInfo
    const domain = data.domain || data.name?.toLowerCase().replace(/\s+/g, "") + ".com";
    const name = data.name || domain?.split(".")[0] || "Unknown";

    const industries = Object.keys(INDUSTRY_MAP);
    const industry = industries[Math.floor(Math.random() * industries.length)];
    const subIndustries = INDUSTRY_MAP[industry];

    return {
      name, domain, description: `${name} is a leading ${industry.toLowerCase()} company.`,
      industry, subIndustry: subIndustries[Math.floor(Math.random() * subIndustries.length)],
      employeeCount: 10 + Math.floor(Math.random() * 500),
      employeeRange: "51-200",
      annualRevenue: 1000000 + Math.floor(Math.random() * 50000000),
      revenueRange: "1-10M",
      foundedYear: 2000 + Math.floor(Math.random() * 23),
      companyType: "private",
      headquarters: "New York, NY",
      hqCity: "New York", hqState: "NY", hqCountry: "US",
      linkedinUrl: `https://linkedin.com/company/${domain?.split(".")[0]}`,
      websiteUrl: `https://${domain}`,
      mainPhone: `+1${Math.floor(2000000000 + Math.random() * 8000000000)}`,
      techStack: this.detectTechStack(domain || ""),
      employeeGrowth6m: -5 + Math.floor(Math.random() * 30),
      dataSource: "enrichment",
    };
  }

  // ── EMAIL FINDER ──────────────────────────────────────────

  findEmail(firstName: string, lastName: string, domain: string): {
    email: string; confidence: number; pattern: string; alternatives: { email: string; confidence: number }[];
  } {
    // In production: Hunter.io / Apollo / Snov.io waterfall
    const patterns = [
      { pattern: "first.last", email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`, confidence: 92 },
      { pattern: "firstlast", email: `${firstName.toLowerCase()}${lastName.toLowerCase()}@${domain}`, confidence: 78 },
      { pattern: "first_last", email: `${firstName.toLowerCase()}_${lastName.toLowerCase()}@${domain}`, confidence: 65 },
      { pattern: "flast", email: `${firstName[0].toLowerCase()}${lastName.toLowerCase()}@${domain}`, confidence: 60 },
      { pattern: "first", email: `${firstName.toLowerCase()}@${domain}`, confidence: 45 },
    ];

    const best = patterns[0];
    return {
      email: best.email,
      confidence: best.confidence,
      pattern: best.pattern,
      alternatives: patterns.slice(1).map(p => ({ email: p.email, confidence: p.confidence })),
    };
  }

  // ── PHONE FINDER ──────────────────────────────────────────

  findPhone(contactId: string, name: string, company: string): {
    directPhone: string | null; mobilePhone: string | null; companyPhone: string | null; confidence: number;
  } {
    // In production: ZoomInfo / Lusha / Cognism waterfall
    const hasDirect = Math.random() < 0.5;
    const hasMobile = Math.random() < 0.35;

    return {
      directPhone: hasDirect ? `+1${Math.floor(2000000000 + Math.random() * 8000000000)}` : null,
      mobilePhone: hasMobile ? `+1${Math.floor(2000000000 + Math.random() * 8000000000)}` : null,
      companyPhone: `+1${Math.floor(2000000000 + Math.random() * 8000000000)}`,
      confidence: hasDirect ? 85 : hasMobile ? 70 : 50,
    };
  }

  // ── INTENT DATA DETECTION ─────────────────────────────────

  detectIntent(companyDomain: string, topics: string[]): any[] {
    // In production: Bombora / G2 / TrustRadius intent data APIs
    const signals: any[] = [];
    const signalTypes = ["content_consumption", "job_posting", "tech_install", "hiring_surge", "expansion"];
    const sources = ["g2", "capterra", "linkedin", "indeed", "web", "technews"];

    for (const topic of topics) {
      if (Math.random() < 0.6) { // 60% chance of signal per topic
        signals.push({
          companyDomain,
          topicCategory: topic,
          signalType: signalTypes[Math.floor(Math.random() * signalTypes.length)],
          signalStrength: Math.random() < 0.3 ? "high" : Math.random() < 0.6 ? "medium" : "low",
          score: 30 + Math.floor(Math.random() * 70),
          source: sources[Math.floor(Math.random() * sources.length)],
          evidence: `${companyDomain} showing strong ${topic} research activity`,
          detectedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 86400000), // 30 day decay
        });
      }
    }

    return signals;
  }

  // ── TECHNOGRAPHIC SCANNING ────────────────────────────────

  detectTechStack(domain: string): string[] {
    // In production: BuiltWith / Wappalyzer / HG Insights APIs
    const allTechs = Object.keys(TECH_DATABASE);
    const count = 3 + Math.floor(Math.random() * 8);
    const stack: string[] = [];

    for (let i = 0; i < count; i++) {
      const tech = allTechs[Math.floor(Math.random() * allTechs.length)];
      if (!stack.includes(tech)) stack.push(tech);
    }

    return stack;
  }

  getTechDetails(technology: string): { category: string; competitors: string[] } | null {
    return TECH_DATABASE[technology] || null;
  }

  // ── ORG CHART BUILDING ────────────────────────────────────

  buildOrgChart(companyName: string, companyId: string): any[] {
    // In production: ZoomInfo / Apollo org chart API
    const departments = ["Executive", "Sales", "Marketing", "Operations", "Finance", "Engineering"];
    const chart: any[] = [];

    // CEO
    chart.push({
      companyId, name: `CEO of ${companyName}`, title: "Chief Executive Officer",
      department: "Executive", seniorityLevel: "c_suite", level: 0,
      isDecisionMaker: true, isBudgetHolder: true, isInfluencer: true,
      email: `ceo@${companyName.toLowerCase().replace(/\s+/g, "")}.com`,
    });

    // C-Suite
    const cSuite = [
      { title: "Chief Financial Officer", dept: "Finance" },
      { title: "Chief Operating Officer", dept: "Operations" },
      { title: "Chief Technology Officer", dept: "Engineering" },
    ];
    for (const exec of cSuite) {
      chart.push({
        companyId, name: `${exec.dept} Lead`, title: exec.title,
        department: exec.dept, seniorityLevel: "c_suite", level: 1,
        reportsToId: chart[0].id, isDecisionMaker: true, isBudgetHolder: true, isInfluencer: true,
      });
    }

    // Directors
    for (const dept of departments.slice(1)) {
      chart.push({
        companyId, name: `${dept} Director`, title: `Director of ${dept}`,
        department: dept, seniorityLevel: "director", level: 2,
        isDecisionMaker: true, isBudgetHolder: false, isInfluencer: true,
      });
    }

    return chart;
  }

  // ── COMPANY NEWS & EVENTS ─────────────────────────────────

  getCompanyEvents(companyDomain: string): any[] {
    // In production: Google News API / Crunchbase / PitchBook
    const eventTypes = ["funding", "expansion", "leadership_change", "product_launch", "partnership", "hiring_surge"];
    const events: any[] = [];

    const count = 1 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const daysAgo = Math.floor(Math.random() * 90);
      events.push({
        companyDomain,
        eventType,
        title: this.generateEventTitle(companyDomain, eventType),
        summary: `Recent ${eventType.replace("_", " ")} activity detected for ${companyDomain}.`,
        eventDate: new Date(Date.now() - daysAgo * 86400000),
        relevanceScore: 40 + Math.floor(Math.random() * 60),
      });
    }

    return events.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());
  }

  // ── AI-POWERED PROSPECT RESEARCH ──────────────────────────

  async aiResearchCompany(domain: string, anthropicKey: string): Promise<any> {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: "You are a B2B sales intelligence researcher. Return ONLY valid JSON.",
        messages: [{
          role: "user",
          content: `Research the company at ${domain}. Return JSON with:
{
  "name": "Company Name",
  "description": "What they do in 1-2 sentences",
  "industry": "Primary industry",
  "subIndustry": "Specific niche",
  "estimatedEmployees": "employee range like 51-200",
  "estimatedRevenue": "revenue range like 10-50M",
  "keyProducts": ["product1", "product2"],
  "targetMarket": "Who they sell to",
  "competitors": ["competitor1", "competitor2"],
  "recentNews": "Any notable recent activity",
  "painPoints": ["potential pain point 1", "potential pain point 2"],
  "decisionMakers": [{"title": "CEO", "department": "Executive"}, {"title": "VP of Operations", "department": "Operations"}],
  "bestApproachAngle": "How to position your pitch to this company"
}
Only return the JSON, nothing else.`
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "{}";
      return JSON.parse(text.replace(/```json?|```/g, "").trim());
    } catch (err: any) {
      console.error(`[Intelligence] AI research error:`, err.message);
      return null;
    }
  }

  async aiResearchContact(name: string, company: string, title: string, anthropicKey: string): Promise<any> {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: "You are a B2B sales intelligence researcher. Return ONLY valid JSON.",
        messages: [{
          role: "user",
          content: `Research this person for a sales approach:
Name: ${name}
Company: ${company}
Title: ${title}

Return JSON with:
{
  "likelyResponsibilities": ["responsibility1", "responsibility2"],
  "decisionMakingPower": "high | medium | low",
  "likelyChallenges": ["challenge1", "challenge2"],
  "personalInterests": ["interest1", "interest2"],
  "bestOutreachChannel": "email | linkedin | phone",
  "bestTimeToContact": "Suggested day/time",
  "icebreaker": "A personalized opening line",
  "talkingPoints": ["point1", "point2", "point3"],
  "objections": ["likely objection 1", "likely objection 2"],
  "buyerPersonaType": "analytical | driver | amiable | expressive"
}
Only return the JSON.`
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "{}";
      return JSON.parse(text.replace(/```json?|```/g, "").trim());
    } catch (err: any) {
      return null;
    }
  }

  // ── HELPERS ───────────────────────────────────────────────

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

  private inferJobTitle(data: any): string {
    if (data.email?.includes("ceo") || data.email?.includes("chief")) return "CEO";
    if (data.email?.includes("admin") || data.email?.includes("office")) return "Office Manager";
    return "Practice Administrator";
  }

  private generateEventTitle(domain: string, eventType: string): string {
    const company = domain.split(".")[0];
    const titles: Record<string, string[]> = {
      funding: [`${company} raises new funding round`, `${company} secures growth capital`],
      expansion: [`${company} opens new office`, `${company} expands into new market`],
      leadership_change: [`${company} appoints new executive`, `New leadership at ${company}`],
      product_launch: [`${company} launches new product`, `${company} announces new platform feature`],
      partnership: [`${company} announces strategic partnership`, `${company} partners with industry leader`],
      hiring_surge: [`${company} on hiring spree`, `${company} expanding team rapidly`],
    };
    const options = titles[eventType] || [`${company} — recent activity`];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generatePeopleResults(filters: any, limit: number): any[] {
    const results: any[] = [];
    const firstNames = ["Sarah", "Michael", "Jennifer", "David", "Lisa", "Robert", "Emily", "James", "Amanda", "William", "Jessica", "Daniel", "Ashley", "Christopher", "Nicole"];
    const lastNames = ["Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Martinez", "Robinson", "Clark", "Lewis", "Hall"];
    const companies = [
      { name: "Premier Medical Group", domain: "premiermedical.com", industry: "Healthcare", size: "51-200" },
      { name: "Valley Health Partners", domain: "valleyhealth.org", industry: "Healthcare", size: "11-50" },
      { name: "Sunrise Family Practice", domain: "sunrisefp.com", industry: "Healthcare", size: "1-10" },
      { name: "Metro Physicians Network", domain: "metrophy.com", industry: "Healthcare", size: "201-500" },
      { name: "Coastal Care Clinic", domain: "coastalcare.com", industry: "Healthcare", size: "11-50" },
      { name: "Pinnacle Health Systems", domain: "pinnaclehs.com", industry: "Healthcare", size: "501-1000" },
      { name: "Riverside Medical Center", domain: "riversidemc.org", industry: "Healthcare", size: "201-500" },
      { name: "Summit Health Associates", domain: "summithealth.com", industry: "Healthcare", size: "51-200" },
    ];
    const titles = filters.jobTitle
      ? [filters.jobTitle]
      : ["Practice Administrator", "Office Manager", "Billing Manager", "Medical Director", "VP of Operations", "Revenue Cycle Director", "CFO", "CEO", "Operations Manager"];

    for (let i = 0; i < limit; i++) {
      const first = firstNames[i % firstNames.length];
      const last = lastNames[(i + 3) % lastNames.length];
      const company = companies[i % companies.length];
      const title = titles[i % titles.length];

      results.push({
        id: `cp_${Date.now()}_${i}`,
        firstName: first, lastName: last, fullName: `${first} ${last}`,
        jobTitle: title,
        seniorityLevel: this.classifySeniority(title),
        department: this.classifyDepartment(title),
        companyName: company.name, companyDomain: company.domain,
        workEmail: `${first.toLowerCase()}.${last.toLowerCase()}@${company.domain}`,
        emailVerified: Math.random() < 0.8,
        emailConfidence: 70 + Math.floor(Math.random() * 30),
        directPhone: Math.random() < 0.5 ? `+1${Math.floor(2000000000 + Math.random() * 8000000000)}` : null,
        linkedinUrl: `https://linkedin.com/in/${first.toLowerCase()}-${last.toLowerCase()}`,
        city: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"][i % 5],
        state: ["NY", "CA", "IL", "TX", "AZ"][i % 5],
        country: "US",
        industry: company.industry,
        employeeRange: company.size,
        dataQualityScore: 60 + Math.floor(Math.random() * 35),
      });
    }

    return results;
  }

  private generateCompanyResults(filters: any, limit: number): any[] {
    const results: any[] = [];
    const companyData = [
      { name: "Premier Medical Group", domain: "premiermedical.com", industry: "Healthcare", sub: "Medical Billing", employees: 120, revenue: 15000000 },
      { name: "Valley Health Partners", domain: "valleyhealth.org", industry: "Healthcare", sub: "Practice Management", employees: 35, revenue: 4500000 },
      { name: "Sunrise Family Practice", domain: "sunrisefp.com", industry: "Healthcare", sub: "Family Medicine", employees: 8, revenue: 1200000 },
      { name: "Metro Physicians Network", domain: "metrophy.com", industry: "Healthcare", sub: "Multi-Specialty", employees: 350, revenue: 45000000 },
      { name: "Coastal Care Clinic", domain: "coastalcare.com", industry: "Healthcare", sub: "Urgent Care", employees: 25, revenue: 3200000 },
      { name: "Pinnacle Health Systems", domain: "pinnaclehs.com", industry: "Healthcare", sub: "Hospital System", employees: 800, revenue: 120000000 },
      { name: "TechFlow Solutions", domain: "techflow.io", industry: "Technology", sub: "SaaS", employees: 60, revenue: 8000000 },
      { name: "GrowthLabs Agency", domain: "growthlabs.co", industry: "Professional Services", sub: "Marketing Agency", employees: 15, revenue: 2000000 },
    ];

    for (let i = 0; i < Math.min(limit, companyData.length); i++) {
      const c = companyData[i];
      results.push({
        id: `co_${Date.now()}_${i}`,
        name: c.name, domain: c.domain, description: `${c.name} is a ${c.sub} company.`,
        industry: c.industry, subIndustry: c.sub,
        employeeCount: c.employees,
        employeeRange: c.employees < 11 ? "1-10" : c.employees < 51 ? "11-50" : c.employees < 201 ? "51-200" : c.employees < 501 ? "201-500" : "501-1000",
        annualRevenue: c.revenue,
        revenueRange: c.revenue < 1000000 ? "<1M" : c.revenue < 10000000 ? "1-10M" : c.revenue < 50000000 ? "10-50M" : "50-100M",
        companyType: "private", headquarters: "New York, NY",
        linkedinUrl: `https://linkedin.com/company/${c.domain.split(".")[0]}`,
        websiteUrl: `https://${c.domain}`,
        techStack: this.detectTechStack(c.domain),
        employeeGrowth6m: -2 + Math.floor(Math.random() * 20),
        intentScore: Math.floor(Math.random() * 100),
      });
    }

    return results;
  }
}

export const intelligenceEngine = new IntelligenceEngine();
