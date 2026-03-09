export interface AgentCatalogEntry {
  type: string;
  name: string;
  description: string;
  category: string;
  region: "western" | "africa" | "both";
  icon: string;
  color: string;
  phases: string[];
  defaultSettings: Record<string, unknown>;
  settingsSchema: SettingsField[];
}

export interface SettingsField {
  key: string;
  label: string;
  type: "text" | "number" | "toggle" | "select" | "multi-select";
  description?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

export const AGENT_CATALOG: AgentCatalogEntry[] = [
  {
    type: "govt-contracts-us",
    name: "Govt Contracts Agent",
    description: "Scans SAM.gov and federal procurement portals for relevant contract opportunities.",
    category: "Government",
    region: "western",
    icon: "FileText",
    color: "from-amber-500 to-orange-600",
    phases: ["Crawl procurement sites", "Filter by NAICS codes", "Evaluate requirements", "Prepare bid materials", "Track submissions"],
    defaultSettings: {
      naicsCodes: [],
      minContractValue: 25000,
      maxContractValue: 500000,
      setAsides: ["small_business", "8a", "hubzone"],
    },
    settingsSchema: [
      { key: "minContractValue", label: "Min Contract Value ($)", type: "number", min: 1000, max: 10000000 },
      { key: "maxContractValue", label: "Max Contract Value ($)", type: "number", min: 1000, max: 10000000 },
    ],
  },
  {
    type: "arbitrage",
    name: "Arbitrage Agent",
    description: "Finds profitable arbitrage opportunities across e-commerce platforms like Amazon, eBay, and Walmart.",
    category: "E-Commerce",
    region: "western",
    icon: "Package",
    color: "from-pink-500 to-rose-600",
    phases: ["Scan product listings", "Price comparison", "Profit calculation", "Inventory check", "Auto-list (optional)"],
    defaultSettings: {
      platforms: ["amazon", "ebay", "walmart"],
      minProfit: 5,
      minROI: 20,
      categories: ["electronics", "toys", "home"],
    },
    settingsSchema: [
      { key: "minProfit", label: "Min Profit ($)", type: "number", min: 1, max: 1000 },
      { key: "minROI", label: "Min ROI (%)", type: "number", min: 5, max: 500 },
    ],
  },
  {
    type: "lead-gen",
    name: "Lead Gen Agent",
    description: "Generates qualified leads for your business using AI-powered prospecting across multiple channels.",
    category: "Services",
    region: "western",
    icon: "Target",
    color: "from-cyan-500 to-blue-600",
    phases: ["Identify prospects", "Verify contact info", "Score & qualify", "Outreach sequence", "Follow-up automation"],
    defaultSettings: {
      industry: "",
      targetTitle: "",
      dailyLimit: 50,
      channels: ["linkedin", "email"],
    },
    settingsSchema: [
      { key: "industry", label: "Target Industry", type: "text" },
      { key: "targetTitle", label: "Target Job Title", type: "text" },
      { key: "dailyLimit", label: "Daily Lead Limit", type: "number", min: 10, max: 500 },
    ],
  },
  {
    type: "govt-tender-africa",
    name: "Government Tender Agent",
    description: "Monitors African government tender portals, matches opportunities to your business profile, and assists with bid preparation.",
    category: "Government",
    region: "africa",
    icon: "FileText",
    color: "from-amber-500 to-orange-600",
    phases: ["Crawl tender portals", "Match to profile", "Due diligence", "Bid preparation", "Submission tracking"],
    defaultSettings: {
      targetCountries: ["NG", "KE", "GH", "ZA"],
      sectors: ["construction", "IT", "healthcare", "education"],
      minValue: 10000,
      autoApply: false,
    },
    settingsSchema: [
      { key: "targetCountries", label: "Target Countries", type: "multi-select", options: [
        { value: "NG", label: "Nigeria" }, { value: "KE", label: "Kenya" }, { value: "GH", label: "Ghana" },
        { value: "ZA", label: "South Africa" }, { value: "TZ", label: "Tanzania" }, { value: "UG", label: "Uganda" },
        { value: "RW", label: "Rwanda" }, { value: "ET", label: "Ethiopia" },
      ]},
      { key: "minValue", label: "Min Tender Value (USD)", type: "number", min: 1000, max: 10000000 },
      { key: "autoApply", label: "Auto-Apply for Tenders", type: "toggle", description: "Automatically submit bids for matching tenders" },
    ],
  },
  {
    type: "cross-border-trade",
    name: "Cross-Border Trade Agent",
    description: "Finds cross-border trade opportunities, arbitrage deals, and supplier connections across African and Asian markets.",
    category: "Trade",
    region: "africa",
    icon: "Ship",
    color: "from-blue-500 to-indigo-600",
    phases: ["Scan trade platforms", "Price arbitrage analysis", "Supplier matching", "Logistics planning", "Deal execution"],
    defaultSettings: {
      tradeRoutes: ["china-nigeria", "india-kenya", "turkey-ghana"],
      productCategories: ["electronics", "textiles", "machinery"],
      minProfitMargin: 15,
    },
    settingsSchema: [
      { key: "productCategories", label: "Product Categories", type: "multi-select", options: [
        { value: "electronics", label: "Electronics" }, { value: "textiles", label: "Textiles" },
        { value: "machinery", label: "Machinery" }, { value: "agriculture", label: "Agriculture" },
        { value: "chemicals", label: "Chemicals" }, { value: "consumer_goods", label: "Consumer Goods" },
      ]},
      { key: "minProfitMargin", label: "Min Profit Margin (%)", type: "number", min: 5, max: 100 },
    ],
  },
  {
    type: "agri-market",
    name: "Agri Market Agent",
    description: "Connects farmers with buyers, tracks commodity prices, and finds profitable agricultural trade opportunities.",
    category: "Agriculture",
    region: "africa",
    icon: "Wheat",
    color: "from-green-500 to-emerald-600",
    phases: ["Track commodity prices", "Match buyers & sellers", "Logistics coordination", "Quality verification", "Payment facilitation"],
    defaultSettings: {
      commodities: ["cocoa", "coffee", "cashew", "sesame"],
      buyerCountries: ["EU", "US", "CN"],
      minOrderValue: 5000,
    },
    settingsSchema: [
      { key: "commodities", label: "Commodities", type: "multi-select", options: [
        { value: "cocoa", label: "Cocoa" }, { value: "coffee", label: "Coffee" },
        { value: "cashew", label: "Cashew Nuts" }, { value: "sesame", label: "Sesame Seeds" },
        { value: "shea", label: "Shea Butter" }, { value: "rubber", label: "Rubber" },
      ]},
      { key: "minOrderValue", label: "Min Order Value (USD)", type: "number", min: 500, max: 1000000 },
    ],
  },
  {
    type: "diaspora-services",
    name: "Diaspora Agent",
    description: "Helps diaspora communities find investment opportunities, property deals, and business partnerships in their home countries.",
    category: "Diaspora",
    region: "africa",
    icon: "Globe",
    color: "from-purple-500 to-violet-600",
    phases: ["Scan investment portals", "Property matching", "Business partnership search", "Due diligence", "Transaction support"],
    defaultSettings: {
      homeCountries: ["NG", "GH", "KE"],
      investmentTypes: ["real_estate", "business", "stocks"],
      minInvestment: 1000,
    },
    settingsSchema: [
      { key: "homeCountries", label: "Home Countries", type: "multi-select", options: [
        { value: "NG", label: "Nigeria" }, { value: "GH", label: "Ghana" }, { value: "KE", label: "Kenya" },
        { value: "ZA", label: "South Africa" }, { value: "ET", label: "Ethiopia" }, { value: "TZ", label: "Tanzania" },
      ]},
      { key: "minInvestment", label: "Min Investment (USD)", type: "number", min: 100, max: 1000000 },
    ],
  },
];

export function getAgentsByRegion(region: string): AgentCatalogEntry[] {
  return AGENT_CATALOG.filter(a => a.region === region || a.region === "both");
}

export function getAgentByType(type: string): AgentCatalogEntry | undefined {
  return AGENT_CATALOG.find(a => a.type === type);
}

export interface V5AgentMeta {
  vertical: string;
  color: string;
  icon: string;
  examples: string[];
}

export const V5_AGENT_META: Record<string, V5AgentMeta> = {
  "trackmed-scout": {
    vertical: "Track-Med", color: "#0DAD74", icon: "Search",
    examples: [
      "Find 10 solo orthopedic surgeons in Texas who are likely doing prior auth manually",
      "Find pain management clinics with 1-5 providers in Florida that accept UnitedHealthcare",
      "List solo mental health practices in Georgia - high prior auth burden specialty",
      "Find dental oral surgery practices in Illinois with no billing software mentioned online",
      "Find physical therapy clinics in Ohio that posted a billing job in the last 60 days",
    ],
  },
  "trackmed-email": {
    vertical: "Track-Med", color: "#0DAD74", icon: "Mail",
    examples: [
      "Write a cold email to Dr. Sarah Kim, solo orthopedic surgeon in Dallas, TX - she does 30+ knee replacements/month, likely heavy UHC prior auth burden",
      "Write an email to a solo chiropractor in Atlanta - focus on the denial write-off angle, they accept Aetna and Cigna",
      "Write a cold email to the office manager of a 2-physician pain management clinic in Chicago - they recently posted a prior auth specialist job",
      "Email to Dr. James Osei, DMD oral surgeon in Houston - implant procedures require predetermination, they're on Cigna Dental",
      "Write a mental health practice email - behavioral health has 28% national denial rate, this is a solo LPC in Ohio",
    ],
  },
  "trackmed-denial": {
    vertical: "Track-Med", color: "#0DAD74", icon: "FileText",
    examples: [
      "Write a denial appeal for CPT 27447 (total knee replacement) denied by UnitedHealthcare with CO-50 (not medically necessary)",
      "Appeal CO-97 (bundled) denial from Aetna for CPT 99213 + 90834 billed together by a psychiatry practice",
      "Appeal prior auth denial for MRI lumbar spine CPT 72148, denied by Cigna, patient has 3 months of low back pain, failed PT",
      "Appeal for CPT 43239 (upper GI endoscopy with biopsy) denied as not medically necessary by BCBS",
      "Write appeal for CO-4 modifier denial on CPT 99213-25 with 96127 (psychiatric screening), denied by Humana",
    ],
  },
  "trackmed-audit": {
    vertical: "Track-Med", color: "#0DAD74", icon: "ClipboardList",
    examples: [
      "Build a discovery script for a solo orthopedic surgeon - 2 providers, 500 procedures/month, currently using manual fax for prior auth",
      "Create an A/R audit conversation for a 3-dentist oral surgery practice in Texas",
      "Discovery script for a pain management clinic - 1 physician, doing 80 injections/month, 22% denial rate",
      "A/R audit for a solo psychiatrist - sees 30 patients/week, bills BCBS and Medicare",
      "Script for a physical therapy clinic - 2 PTs, Medicare patients, high prior auth burden for ongoing therapy approvals",
    ],
  },
  "navimed-scout": {
    vertical: "NaviMed", color: "#4B6CF7", icon: "Globe",
    examples: [
      "Find Ministry of Health digital health directors in Niger",
      "List top 5 decision makers at USAID health offices in West Africa who oversee digital health programs",
      "Find US Embassy health attaches in Nigeria, Kenya, and Ghana",
      "Identify WHO country representatives in Francophone Africa running digital health transformation projects",
      "Find private hospital group CEOs in Lagos and Nairobi with 50+ beds who don't have a modern EHR system",
    ],
  },
  "navimed-email": {
    vertical: "NaviMed", color: "#4B6CF7", icon: "Mail",
    examples: [
      "Write an outreach email to the Director of Digital Health at Niger's Ministry of Health",
      "Write to the USAID Health Officer at the US Embassy in Abuja, Nigeria",
      "Draft an email to Dr. Aminata Diallo, Director of eHealth at Senegal's Ministry of Health",
      "Write to the CEO of a 200-bed private hospital in Accra, Ghana",
      "Outreach email to a Partners in Health program director in Rwanda",
    ],
  },
  "navimed-proposal": {
    vertical: "NaviMed", color: "#4B6CF7", icon: "FileText",
    examples: [
      "Generate a full NaviMed implementation proposal for Niger",
      "Country proposal for Kenya - align with Kenya Health Sector Strategic Plan 2023-2030",
      "Implementation proposal for a 300-bed teaching hospital in Lagos, Nigeria",
      "Proposal for Rwanda - pilot at 5 district hospitals",
      "NaviMed proposal for a USAID-funded health project in Cote d'Ivoire",
    ],
  },
  "argilette-scout": {
    vertical: "ARGILETTE", color: "#7B5BFB", icon: "Search",
    examples: [
      "Find real estate team leaders in St. Louis and Chicago with 5-15 agents who are manually doing lead follow-up",
      "Find independent insurance brokers in Texas with 2-10 employees who posted a virtual assistant job in the last 90 days",
      "List mortgage broker offices in Florida with 3-10 loan officers",
      "Find solo law firms and 2-partner practices in Illinois that do personal injury",
      "HVAC and plumbing companies in the Midwest with 5-20 techs",
    ],
  },
  "argilette-email": {
    vertical: "ARGILETTE", color: "#7B5BFB", icon: "Mail",
    examples: [
      "Write a cold email to Marcus Johnson, owner of a 12-agent real estate team in Dallas",
      "Email to Sandra Lee, independent insurance broker in Houston with 4 employees",
      "Cold email to a 6-person mortgage brokerage in Miami",
      "Write to a solo immigration attorney in Chicago",
      "Email to a pest control company owner in St. Louis with 8 technicians",
    ],
  },
  "linkedin-scout": {
    vertical: "Universal", color: "#0691A1", icon: "Linkedin",
    examples: [
      "Give me a LinkedIn Sales Navigator search string for solo orthopedic and pain management physicians in Texas",
      "Build a LinkedIn prospecting strategy for ARGILETTE Agency targeting real estate team leaders in the Midwest",
      "LinkedIn search for Ministry of Health digital health officials in West Africa",
      "Connection request and follow-up sequence for a Practice Manager at a 3-physician internal medicine clinic",
      "LinkedIn outreach sequence for USAID health program officers based in Washington DC or West Africa",
    ],
  },
  "intent-monitor": {
    vertical: "Universal", color: "#0691A1", icon: "Activity",
    examples: [
      "Analyze Acme Orthopedics (acme-ortho.com) for buying signals",
      "What buying signals should I look for that indicate a solo medical practice is about to switch billing companies?",
      "Analyze intent signals for Nigeria's Federal Ministry of Health",
      "A real estate brokerage owner just posted on LinkedIn: 'We're growing fast and I'm drowning in admin work.' What does this signal?",
      "What job postings and news events indicate a small insurance brokerage is ready to invest in automation tools?",
    ],
  },
  "sequence-builder": {
    vertical: "Universal", color: "#0691A1", icon: "RefreshCw",
    examples: [
      "Build a 5-touch 12-day outreach sequence for a solo pain management physician in Texas",
      "Create a Track-Med sequence for a dental oral surgery practice",
      "Build a NaviMed email + LinkedIn sequence for the Director of eHealth at a West African Ministry of Health",
      "5-touch sequence for a real estate team leader - automation ROI angle",
      "Outreach sequence for a USAID health program officer",
    ],
  },
  "meeting-booker": {
    vertical: "Universal", color: "#0691A1", icon: "CalendarCheck",
    examples: [
      "They replied: 'Yes, I'd be open to learning more about how you handle prior auth for orthopedics.' Book the free A/R audit call.",
      "MoH official replied: 'Please send more information about your digital health platform.' Convert this to a formal 30-minute NaviMed demo.",
      "Reply: 'We've been thinking about automating our follow-up process. What does your onboarding look like?' - Book the ARGILETTE free ROI call.",
      "Dentist replied: 'Our billing situation is a mess right now. We just lost our biller.' Urgent - book the Track-Med audit immediately.",
      "USAID officer replied: 'This looks interesting, are you available for a call next week?' Schedule the NaviMed demo.",
    ],
  },
};

export const VERTICAL_CONFIG: Record<string, { color: string; label: string }> = {
  "Track-Med": { color: "#0DAD74", label: "Track-Med / CureMedAuth" },
  "NaviMed": { color: "#4B6CF7", label: "NaviMed EHR" },
  "ARGILETTE": { color: "#7B5BFB", label: "ARGILETTE Agency" },
  "Universal": { color: "#0691A1", label: "Universal" },
};

export const VERTICAL_ORDER = ["Track-Med", "NaviMed", "ARGILETTE", "Universal"];

export function getV5AgentMeta(agentId: string): V5AgentMeta | undefined {
  return V5_AGENT_META[agentId];
}
