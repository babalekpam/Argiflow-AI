import Anthropic from "@anthropic-ai/sdk";

export interface TaxLienSettings {
  targetStates: string[];
  targetCounties: string[];
  propertyTypes: string[];
  minLienAmount: number;
  maxLienAmount: number;
  minInterestRate: number;
  bidStrategy: "conservative" | "moderate" | "aggressive";
  autoBid: boolean;
}

export interface TaxLienProperty {
  title: string;
  parcelNumber: string;
  ownerName: string;
  ownerAddress: string;
  propertyAddress: string;
  propertyType: string;
  county: string;
  state: string;
  assessedValue: number;
  marketValue: number;
  amountOwed: number;
  interestRate: number;
  penaltyRate: number;
  auctionDate: string | null;
  auctionPlatform: string | null;
  registrationDeadline: string | null;
  redemptionPeriod: string;
  lienPosition: string;
  yearDelinquent: number;
  totalInvestmentNeeded: number;
  projectedROI: number;
  riskScore: number;
  riskFactors: string[];
  status: string;
  sourceUrl: string;
  purchaseSteps: PurchaseStep[];
  dueDiligenceChecklist: string[];
}

export interface PurchaseStep {
  step: number;
  title: string;
  description: string;
  actionRequired: "automated" | "investor_action" | "review";
  status: "pending" | "ready" | "completed";
  deadline?: string;
  link?: string;
}

export interface AuctionEvent {
  county: string;
  state: string;
  date: string;
  platform: string;
  registrationDeadline: string;
  estimatedParcels: number;
  url: string;
  auctionType: "online" | "in-person" | "hybrid";
}

export interface DiscoveryResult {
  properties: TaxLienProperty[];
  auctionCalendar: AuctionEvent[];
  summary: {
    totalFound: number;
    matchingCriteria: number;
    topDeals: number;
    statesSearched: string[];
    nextAuctions: string;
  };
}

export const STATE_DATA: Record<string, {
  interestRate: number;
  redemptionPeriod: string;
  redemptionMonths: number;
  auctionType: string;
  penaltyStructure: string;
  keyCounties: string[];
  auctionPlatforms: string[];
  searchQueries: string[];
}> = {
  FL: {
    interestRate: 18,
    redemptionPeriod: "2 years",
    redemptionMonths: 24,
    auctionType: "online",
    penaltyStructure: "Up to 18% annual interest, bid-down",
    keyCounties: ["Miami-Dade", "Broward", "Palm Beach", "Orange", "Hillsborough", "Duval", "Pinellas", "Lee", "Polk", "Brevard"],
    auctionPlatforms: ["RealAuction.com", "LienHub.com"],
    searchQueries: [
      "Florida tax lien certificate sale {year}",
      "{county} county Florida delinquent tax list",
      "{county} county Florida tax certificate auction",
    ],
  },
  AZ: {
    interestRate: 16,
    redemptionPeriod: "3 years",
    redemptionMonths: 36,
    auctionType: "online",
    penaltyStructure: "Up to 16% annual interest",
    keyCounties: ["Maricopa", "Pima", "Pinal", "Yavapai", "Mohave", "Coconino"],
    auctionPlatforms: ["Bid4Assets.com", "PublicSurplus.com"],
    searchQueries: [
      "Arizona tax lien auction {year}",
      "{county} county Arizona treasurer tax lien sale",
    ],
  },
  IN: {
    interestRate: 10,
    redemptionPeriod: "1 year",
    redemptionMonths: 12,
    auctionType: "in-person/online",
    penaltyStructure: "10% penalty first 6 months, 15% after",
    keyCounties: ["Marion", "Lake", "Allen", "Hamilton", "St. Joseph", "Tippecanoe"],
    auctionPlatforms: ["SRI Inc", "GovEase.com"],
    searchQueries: [
      "Indiana tax sale {county} county {year}",
      "{county} county Indiana tax lien sale properties list",
    ],
  },
  NJ: {
    interestRate: 18,
    redemptionPeriod: "2 years",
    redemptionMonths: 24,
    auctionType: "in-person/online",
    penaltyStructure: "Up to 18% + subsequent tax penalties",
    keyCounties: ["Essex", "Hudson", "Bergen", "Passaic", "Middlesex", "Camden", "Monmouth", "Ocean", "Union", "Mercer"],
    auctionPlatforms: ["GovPilot", "GrantStreet"],
    searchQueries: [
      "New Jersey tax lien sale {year} {county}",
      "{county} county NJ tax sale list",
    ],
  },
  IL: {
    interestRate: 18,
    redemptionPeriod: "2.5 years",
    redemptionMonths: 30,
    auctionType: "in-person",
    penaltyStructure: "Up to 18% penalty per 6-month period",
    keyCounties: ["Cook", "DuPage", "Lake", "Will", "Kane", "McHenry"],
    auctionPlatforms: ["Cook County Clerk"],
    searchQueries: [
      "Illinois tax lien sale {county} county",
      "Cook county annual tax sale delinquent list",
    ],
  },
  MD: {
    interestRate: 12,
    redemptionPeriod: "6 months",
    redemptionMonths: 6,
    auctionType: "online/in-person",
    penaltyStructure: "6-24% interest depending on bid",
    keyCounties: ["Baltimore City", "Baltimore County", "Prince George's", "Montgomery", "Anne Arundel", "Howard"],
    auctionPlatforms: ["RealAuction.com", "Bid4Assets.com"],
    searchQueries: [
      "Maryland tax lien certificate sale {year}",
      "{county} Maryland tax sale properties",
    ],
  },
  SC: {
    interestRate: 12,
    redemptionPeriod: "1 year",
    redemptionMonths: 12,
    auctionType: "in-person/online",
    penaltyStructure: "3-12% depending on redemption timing",
    keyCounties: ["Charleston", "Greenville", "Richland", "Horry", "Lexington"],
    auctionPlatforms: ["DTC Systems"],
    searchQueries: [
      "South Carolina delinquent tax sale {county} county",
      "{county} county SC tax sale list {year}",
    ],
  },
  CO: {
    interestRate: 9,
    redemptionPeriod: "3 years",
    redemptionMonths: 36,
    auctionType: "online",
    penaltyStructure: "9% annual interest + penalties",
    keyCounties: ["Denver", "El Paso", "Arapahoe", "Jefferson", "Adams", "Douglas"],
    auctionPlatforms: ["GovEase.com", "Bid4Assets.com"],
    searchQueries: [
      "Colorado tax lien sale {county} county {year}",
      "{county} county Colorado treasurer tax lien certificate",
    ],
  },
  IA: {
    interestRate: 24,
    redemptionPeriod: "2 years",
    redemptionMonths: 24,
    auctionType: "in-person",
    penaltyStructure: "24% annual interest (highest in US)",
    keyCounties: ["Polk", "Linn", "Scott", "Black Hawk", "Johnson"],
    auctionPlatforms: ["County auctions"],
    searchQueries: [
      "Iowa tax sale {county} county delinquent property",
      "Polk county Iowa annual tax sale list",
    ],
  },
  WV: {
    interestRate: 12,
    redemptionPeriod: "18 months",
    redemptionMonths: 18,
    auctionType: "in-person",
    penaltyStructure: "12% annual interest",
    keyCounties: ["Kanawha", "Berkeley", "Cabell", "Raleigh", "Putnam"],
    auctionPlatforms: ["County sheriff sales"],
    searchQueries: [
      "West Virginia delinquent tax sale {county} county",
      "{county} county WV tax lien sale list",
    ],
  },
};

export const STATE_NAMES: Record<string, string> = {
  FL: "Florida", AZ: "Arizona", IN: "Indiana", NJ: "New Jersey",
  IL: "Illinois", MD: "Maryland", SC: "South Carolina", CO: "Colorado",
  IA: "Iowa", WV: "West Virginia", TX: "Texas", GA: "Georgia",
  MS: "Mississippi", AL: "Alabama", CT: "Connecticut", RI: "Rhode Island",
  VT: "Vermont", NH: "New Hampshire", ME: "Maine", WY: "Wyoming",
  SD: "South Dakota", ND: "North Dakota", MT: "Montana", NE: "Nebraska",
  CA: "California", NY: "New York", PA: "Pennsylvania", OH: "Ohio",
  MI: "Michigan", WI: "Wisconsin", MN: "Minnesota", MO: "Missouri",
  TN: "Tennessee", KY: "Kentucky", VA: "Virginia", NC: "North Carolina",
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function calculateROIAndRisk(
  property: TaxLienProperty,
  settings: TaxLienSettings,
): { projectedROI: number; riskScore: number; riskFactors: string[] } {
  const riskFactors: string[] = [];
  let riskScore = 30;

  const annualReturn = property.interestRate;
  const projectedROI = annualReturn;

  if (property.amountOwed > 20000) {
    riskScore += 15;
    riskFactors.push("High investment amount (>$20k)");
  }

  if (property.assessedValue > 0 && property.amountOwed > property.assessedValue * 0.5) {
    riskScore += 20;
    riskFactors.push("Taxes owed exceed 50% of assessed value");
  }

  if (property.propertyType === "vacant_land") {
    riskScore += 10;
    riskFactors.push("Vacant land — harder to foreclose profitably");
  }

  if (property.propertyType === "commercial") {
    riskScore += 10;
    riskFactors.push("Commercial property — complex due diligence");
  }

  const yearsDelinquent = new Date().getFullYear() - property.yearDelinquent;
  if (yearsDelinquent > 3) {
    riskScore += 15;
    riskFactors.push(`${yearsDelinquent} years delinquent — potential title issues`);
  }

  if (property.marketValue > 0 && property.marketValue < property.amountOwed * 3) {
    riskScore += 10;
    riskFactors.push("Low property value relative to lien amount");
  }

  if (settings.bidStrategy === "conservative" && riskScore > 50) {
    riskFactors.push("Exceeds conservative risk threshold");
  }

  return {
    projectedROI: Math.round(projectedROI * 100) / 100,
    riskScore: Math.min(100, riskScore),
    riskFactors,
  };
}

export function generatePurchaseSteps(property: TaxLienProperty): PurchaseStep[] {
  const stateInfo = STATE_DATA[property.state];
  const isOnline = stateInfo?.auctionType.includes("online");
  const stateName = STATE_NAMES[property.state] || property.state;

  return [
    {
      step: 1,
      title: "Verify Property Data",
      description: `Search "${property.county} County ${stateName} property appraiser" and look up parcel ${property.parcelNumber}. Confirm owner name (${property.ownerName}), assessed value ($${property.assessedValue?.toLocaleString()}), and verify no federal tax liens or environmental issues.`,
      actionRequired: "automated",
      status: "ready",
    },
    {
      step: 2,
      title: "Check Title & Liens",
      description: `Run a title search on ${property.propertyAddress}. Check for: existing mortgages, HOA liens, IRS liens, other tax liens. A clean title = lower risk.`,
      actionRequired: "review",
      status: "pending",
    },
    {
      step: 3,
      title: "Verify Delinquent Amount",
      description: `Contact ${property.county} County Tax Collector to confirm the current amount owed is $${property.amountOwed?.toLocaleString()}. Taxes accrue penalties, so the final amount at auction may be higher.`,
      actionRequired: "automated",
      status: "pending",
    },
    {
      step: 4,
      title: "Register for Auction",
      description: isOnline
        ? `Register online at ${stateInfo?.auctionPlatforms[0] || 'the county auction portal'}. You'll need: government-issued ID, proof of funds or deposit (typically 5-10%), and a valid payment method.${property.registrationDeadline ? ` Registration deadline: ${property.registrationDeadline}` : ''}`
        : `Contact ${property.county} County Tax Collector's office to register for the in-person tax sale. Bring: government-issued ID, cashier's check for deposit (typically 5-10%), and completed registration form.`,
      actionRequired: "investor_action",
      status: "pending",
      deadline: property.registrationDeadline || undefined,
      link: property.auctionPlatform ? `https://www.${property.auctionPlatform.toLowerCase().replace(/\s/g, '')}` : undefined,
    },
    {
      step: 5,
      title: "Set Max Bid Amount",
      description: `Property assessed value: $${property.assessedValue?.toLocaleString()}\nAmount owed: $${property.amountOwed?.toLocaleString()}\nInterest rate: ${property.interestRate}%\nProjected ROI: ${property.projectedROI}%\n\nRecommended max bid: $${property.amountOwed?.toLocaleString()} at ${property.interestRate}%.${property.state === 'FL' ? ' In Florida, you bid DOWN the interest rate. Competitive rate is typically 5-12%.' : ''}`,
      actionRequired: "review",
      status: "pending",
    },
    {
      step: 6,
      title: property.auctionDate ? `Attend Auction (${property.auctionDate})` : "Attend Auction",
      description: isOnline
        ? `Log into the online auction platform on the auction date. Place your bid on parcel ${property.parcelNumber} (${property.propertyAddress}).`
        : `Attend the in-person auction at the ${property.county} County Courthouse. Bring your bidder number, cashier's checks, and your bid sheet.`,
      actionRequired: "investor_action",
      status: "pending",
      deadline: property.auctionDate || undefined,
    },
    {
      step: 7,
      title: "Payment & Certificate",
      description: `If you win the bid:\n1. Pay the full lien amount (${isOnline ? 'online via ACH/wire' : "cashier's check at the courthouse"})\n2. Receive your Tax Lien Certificate\n3. Record the certificate number and redemption date\n4. Payment typically due within 24-48 hours of winning`,
      actionRequired: "investor_action",
      status: "pending",
    },
    {
      step: 8,
      title: "Track Redemption Period",
      description: `Monitor the ${stateInfo?.redemptionPeriod || '2 year'} redemption period for parcel ${property.parcelNumber}.\n\nIf owner pays: You receive $${property.amountOwed?.toLocaleString()} + ${property.interestRate}% interest = ~$${Math.round(property.amountOwed * (1 + property.interestRate / 100))?.toLocaleString()}\nIf owner doesn't pay: You can begin foreclosure proceedings after the redemption period expires`,
      actionRequired: "automated",
      status: "pending",
    },
    {
      step: 9,
      title: "Post-Redemption Action",
      description: `After redemption period (${stateInfo?.redemptionPeriod || '2 years'}):\n\nREDEEMED: Collect your principal + interest. Log profit.\nNOT REDEEMED: File for foreclosure with the ${property.county} County court. This typically costs $1,500-3,000 in legal fees. You may acquire the property for the cost of the lien.\n\nProperty market value: ~$${property.marketValue?.toLocaleString() || 'Unknown'}`,
      actionRequired: "investor_action",
      status: "pending",
    },
  ];
}

export function generateDueDiligence(property: TaxLienProperty): string[] {
  return [
    `Verify parcel ${property.parcelNumber} on ${property.county} County Property Appraiser website`,
    `Confirm owner "${property.ownerName}" matches public records`,
    `Check for IRS federal tax liens on property`,
    `Search for existing mortgages or bank liens`,
    `Check for HOA liens or assessments`,
    `Verify no environmental issues (EPA, brownfield sites)`,
    `Confirm property is not in bankruptcy proceedings`,
    `Check if property is occupied or vacant`,
    `Research neighborhood and comparable property values`,
    `Verify total amount owed includes all penalties and interest`,
    `Confirm auction date and registration requirements`,
    `Review ${property.state} tax lien laws and redemption rights`,
    `Prepare funds: $${property.amountOwed?.toLocaleString()} + registration deposit`,
    `Set maximum bid based on ${property.projectedROI}% target ROI`,
  ];
}

export async function searchCountyTaxLiens(
  client: Anthropic,
  model: string,
  stateCode: string,
  county: string,
  stateInfo: typeof STATE_DATA[string],
  settings: TaxLienSettings,
  year: number,
): Promise<{ properties: TaxLienProperty[]; auctions: AuctionEvent[] }> {

  const stateName = STATE_NAMES[stateCode] || stateCode;

  const response = await client.messages.create({
    model,
    max_tokens: 4000,
    tools: [
      {
        type: "web_search_20250305" as any,
        name: "web_search",
      } as any,
    ],
    messages: [
      {
        role: "user",
        content: `You are a tax lien property researcher. Find REAL tax lien properties and upcoming auctions for ${county} County, ${stateName} (${stateCode}).

SEARCH FOR:
1. Delinquent property tax lists for ${county} County ${stateName} ${year}
2. Upcoming tax lien certificate auctions in ${county} County
3. Properties with unpaid taxes between $${settings.minLienAmount} and $${settings.maxLienAmount}
4. The county tax collector or treasurer's tax sale page

IMPORTANT: Only return REAL data you find. Do NOT make up addresses or property information.

For each property found, provide:
- Property address (full street address)
- Owner name
- Parcel/tax ID number
- Amount of taxes owed
- Assessed value
- Property type (residential/commercial/vacant)
- Year(s) delinquent
- Auction date if upcoming

For auctions found, provide:
- Date and time
- Platform (online/in-person)
- Registration deadline
- Number of parcels available
- URL to register

State interest rate: ${stateInfo.interestRate}%
Redemption period: ${stateInfo.redemptionPeriod}

Return your findings as JSON in this exact format:
{
  "properties": [
    {
      "propertyAddress": "123 Main St, City, ${stateCode} 12345",
      "ownerName": "John Doe",
      "parcelNumber": "12-34-56-789",
      "amountOwed": 5000,
      "assessedValue": 150000,
      "marketValue": 200000,
      "propertyType": "residential",
      "yearDelinquent": 2023,
      "auctionDate": "2025-06-15",
      "sourceUrl": "https://..."
    }
  ],
  "auctions": [
    {
      "date": "2025-06-15",
      "platform": "RealAuction.com",
      "auctionType": "online",
      "registrationDeadline": "2025-06-01",
      "estimatedParcels": 500,
      "url": "https://..."
    }
  ],
  "dataSource": "where you found this data"
}

If you cannot find specific property listings, at least find:
- The county's tax sale schedule and dates
- Where investors can access the delinquent tax list
- Registration requirements
- Any upcoming auction information`,
      },
    ],
  });

  let responseText = "";
  for (const block of response.content) {
    if (block.type === "text") {
      responseText += block.text;
    }
  }

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*"properties"[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`[tax-lien] No structured data found for ${county}, ${stateCode}`);
      return { properties: [], auctions: [] };
    }

    const data = JSON.parse(jsonMatch[0]);

    const properties: TaxLienProperty[] = (data.properties || []).map((p: any) => ({
      title: `Tax Lien — ${p.propertyAddress || p.parcelNumber}`,
      parcelNumber: p.parcelNumber || "N/A",
      ownerName: p.ownerName || "Unknown",
      ownerAddress: p.ownerAddress || "",
      propertyAddress: p.propertyAddress || "",
      propertyType: p.propertyType || "residential",
      county,
      state: stateCode,
      assessedValue: p.assessedValue || 0,
      marketValue: p.marketValue || p.assessedValue || 0,
      amountOwed: p.amountOwed || 0,
      interestRate: stateInfo.interestRate,
      penaltyRate: 0,
      auctionDate: p.auctionDate || null,
      auctionPlatform: stateInfo.auctionPlatforms[0] || null,
      registrationDeadline: null,
      redemptionPeriod: stateInfo.redemptionPeriod,
      lienPosition: "1st",
      yearDelinquent: p.yearDelinquent || new Date().getFullYear() - 1,
      totalInvestmentNeeded: p.amountOwed || 0,
      projectedROI: 0,
      riskScore: 50,
      riskFactors: [],
      status: "available",
      sourceUrl: p.sourceUrl || "",
      purchaseSteps: [],
      dueDiligenceChecklist: [],
    }));

    const auctions: AuctionEvent[] = (data.auctions || []).map((a: any) => ({
      county,
      state: stateCode,
      date: a.date || "TBD",
      platform: a.platform || stateInfo.auctionPlatforms[0] || "County",
      registrationDeadline: a.registrationDeadline || "Contact county",
      estimatedParcels: a.estimatedParcels || 0,
      url: a.url || "",
      auctionType: (a.auctionType || (stateInfo.auctionType.includes("online") ? "online" : "in-person")) as AuctionEvent["auctionType"],
    }));

    return { properties, auctions };
  } catch (err: any) {
    console.warn(`[tax-lien] Failed to parse results for ${county}, ${stateCode}:`, err.message);
    return { properties: [], auctions: [] };
  }
}

export async function discoverTaxLiens(
  client: Anthropic,
  model: string,
  settings: TaxLienSettings,
): Promise<DiscoveryResult> {

  const currentYear = new Date().getFullYear();
  const allProperties: TaxLienProperty[] = [];
  const allAuctions: AuctionEvent[] = [];

  for (const stateCode of settings.targetStates) {
    const stateInfo = STATE_DATA[stateCode];
    if (!stateInfo) continue;

    const countiesToSearch = settings.targetCounties.length > 0
      ? settings.targetCounties.filter(c =>
          stateInfo.keyCounties.some(kc => kc.toLowerCase().includes(c.toLowerCase())))
      : stateInfo.keyCounties.slice(0, 3);

    for (const county of countiesToSearch) {
      try {
        console.log(`[tax-lien] Searching ${county} County, ${stateCode}...`);
        const result = await searchCountyTaxLiens(
          client, model, stateCode, county, stateInfo, settings, currentYear
        );
        allProperties.push(...result.properties);
        allAuctions.push(...result.auctions);
        console.log(`[tax-lien] Found ${result.properties.length} properties, ${result.auctions.length} auctions in ${county}, ${stateCode}`);
      } catch (err: any) {
        console.error(`[tax-lien] Error searching ${county}, ${stateCode}:`, err.message);
      }

      await delay(1500);
    }
  }

  const scoredProperties = allProperties.map(p => ({
    ...p,
    ...calculateROIAndRisk(p, settings),
  }));

  const filtered = scoredProperties.filter(p => {
    if (p.amountOwed < settings.minLienAmount) return false;
    if (p.amountOwed > settings.maxLienAmount) return false;
    if (settings.propertyTypes.length > 0 && !settings.propertyTypes.includes(p.propertyType)) return false;
    if (p.interestRate < settings.minInterestRate) return false;
    return true;
  });

  filtered.sort((a, b) => b.projectedROI - a.projectedROI);

  const withSteps = filtered.map(p => ({
    ...p,
    purchaseSteps: generatePurchaseSteps(p),
    dueDiligenceChecklist: generateDueDiligence(p),
  }));

  return {
    properties: withSteps,
    auctionCalendar: allAuctions,
    summary: {
      totalFound: allProperties.length,
      matchingCriteria: withSteps.length,
      topDeals: withSteps.filter(p => p.projectedROI > 12).length,
      statesSearched: settings.targetStates,
      nextAuctions: allAuctions.length > 0
        ? `${allAuctions.length} upcoming auctions, next: ${allAuctions[0]?.date || "TBD"}`
        : "No upcoming auctions found",
    },
  };
}
