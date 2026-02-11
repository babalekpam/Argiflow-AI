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
    type: "tax-lien",
    name: "Tax Lien Hunter",
    description: "Discovers tax lien properties, analyzes ROI, monitors auctions, and manages your lien portfolio automatically.",
    category: "Real Estate",
    region: "western",
    icon: "Landmark",
    color: "from-emerald-500 to-teal-600",
    phases: ["Crawl county records", "Score & analyze deals", "Track auction dates", "Auto-bid (optional)", "Monitor portfolio"],
    defaultSettings: {
      targetStates: ["FL", "AZ", "IN", "NJ", "IL"],
      propertyTypes: ["residential", "commercial", "vacant_land"],
      minLienAmount: 500,
      maxLienAmount: 15000,
      minInterestRate: 8,
      bidStrategy: "conservative",
      autoBid: false,
    },
    settingsSchema: [
      { key: "targetStates", label: "Target States", type: "multi-select", options: [
        { value: "FL", label: "Florida" }, { value: "AZ", label: "Arizona" }, { value: "IN", label: "Indiana" },
        { value: "NJ", label: "New Jersey" }, { value: "IL", label: "Illinois" }, { value: "MD", label: "Maryland" },
        { value: "SC", label: "South Carolina" }, { value: "CO", label: "Colorado" },
      ]},
      { key: "minLienAmount", label: "Min Lien Amount ($)", type: "number", min: 100, max: 100000 },
      { key: "maxLienAmount", label: "Max Lien Amount ($)", type: "number", min: 100, max: 100000 },
      { key: "minInterestRate", label: "Min Interest Rate (%)", type: "number", min: 1, max: 36 },
      { key: "bidStrategy", label: "Bid Strategy", type: "select", options: [
        { value: "conservative", label: "Conservative" }, { value: "moderate", label: "Moderate" }, { value: "aggressive", label: "Aggressive" },
      ]},
      { key: "autoBid", label: "Auto-Bid at Auctions", type: "toggle", description: "Allow the agent to automatically place bids" },
    ],
  },
  {
    type: "tax-deed",
    name: "Tax Deed Agent",
    description: "Finds tax deed properties selling for pennies on the dollar at county auctions nationwide.",
    category: "Real Estate",
    region: "western",
    icon: "Home",
    color: "from-blue-500 to-indigo-600",
    phases: ["Search deed auctions", "Evaluate properties", "Due diligence check", "Bid preparation", "Acquisition tracking"],
    defaultSettings: {
      targetStates: ["TX", "GA", "CA", "FL"],
      maxBidAmount: 50000,
      minPropertyValue: 30000,
      strategy: "moderate",
    },
    settingsSchema: [
      { key: "targetStates", label: "Target States", type: "multi-select", options: [
        { value: "TX", label: "Texas" }, { value: "GA", label: "Georgia" }, { value: "CA", label: "California" }, { value: "FL", label: "Florida" },
      ]},
      { key: "maxBidAmount", label: "Max Bid Amount ($)", type: "number", min: 1000, max: 500000 },
      { key: "strategy", label: "Strategy", type: "select", options: [
        { value: "conservative", label: "Conservative" }, { value: "moderate", label: "Moderate" }, { value: "aggressive", label: "Aggressive" },
      ]},
    ],
  },
  {
    type: "wholesale-re",
    name: "Wholesale RE Agent",
    description: "Finds off-market wholesale real estate deals, runs comps, and connects with cash buyers.",
    category: "Real Estate",
    region: "western",
    icon: "Key",
    color: "from-purple-500 to-violet-600",
    phases: ["Find distressed properties", "Run comparable analysis", "Estimate ARV", "Match with buyers", "Coordinate closing"],
    defaultSettings: {
      targetMarkets: ["Atlanta", "Houston", "Phoenix"],
      maxAcquisition: 100000,
      minSpread: 20000,
    },
    settingsSchema: [
      { key: "maxAcquisition", label: "Max Acquisition ($)", type: "number", min: 5000, max: 1000000 },
      { key: "minSpread", label: "Min Profit Spread ($)", type: "number", min: 5000, max: 100000 },
    ],
  },
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
