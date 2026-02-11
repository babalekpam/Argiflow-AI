export interface RegionConfig {
  id: string;
  brand: string;
  tagline: string;
  defaultCurrency: string;
  supportedCurrencies: string[];
  paymentProcessors: string[];
  billingModel: string;
  plans: Record<string, RegionPlan>;
}

export interface RegionPlan {
  name: string;
  price: Record<string, number>;
  interval: string;
  agentLimit: number;
  leadsPerMonth: number;
  successFee?: number;
  features: string[];
}

export const REGIONS: Record<string, RegionConfig> = {
  western: {
    id: "western",
    brand: "ArgiFlow",
    tagline: "AI Agents That Make You Money While You Sleep",
    defaultCurrency: "USD",
    supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
    paymentProcessors: ["venmo"],
    billingModel: "subscription",
    plans: {
      starter: {
        name: "Starter",
        price: { USD: 297, EUR: 269, GBP: 239 },
        interval: "month",
        agentLimit: 1,
        leadsPerMonth: 100,
        features: ["1 AI Agent", "100 leads/month", "Email notifications", "Basic dashboard"],
      },
      pro: {
        name: "Pro",
        price: { USD: 597, EUR: 539, GBP: 479 },
        interval: "month",
        agentLimit: 3,
        leadsPerMonth: 500,
        features: ["3 AI Agents", "500 leads/month", "SMS + Email alerts", "Pipeline view", "Auto-bidding", "Priority support"],
      },
      enterprise: {
        name: "Enterprise",
        price: { USD: 1497, EUR: 1349, GBP: 1199 },
        interval: "month",
        agentLimit: -1,
        leadsPerMonth: -1,
        features: ["Unlimited Agents", "Unlimited leads", "All channels", "API access", "Custom agents", "Dedicated support", "White-label option"],
      },
    },
  },
  africa: {
    id: "africa",
    brand: "TradeFlow",
    tagline: "AI-Powered Business Automation for African Entrepreneurs",
    defaultCurrency: "USD",
    supportedCurrencies: ["USD", "NGN", "KES", "GHS", "ZAR"],
    paymentProcessors: ["flutterwave", "paystack"],
    billingModel: "hybrid",
    plans: {
      hustle: {
        name: "Hustle",
        price: { USD: 5, NGN: 5000, KES: 700, GHS: 60, ZAR: 90 },
        interval: "month",
        agentLimit: 1,
        leadsPerMonth: 50,
        successFee: 5,
        features: ["1 AI Agent", "50 leads/month", "WhatsApp alerts", "Mobile dashboard"],
      },
      business: {
        name: "Business",
        price: { USD: 15, NGN: 15000, KES: 2100, GHS: 180, ZAR: 270 },
        interval: "month",
        agentLimit: 3,
        leadsPerMonth: 200,
        successFee: 3,
        features: ["3 AI Agents", "200 leads/month", "WhatsApp + SMS alerts", "Full dashboard", "Tender auto-apply", "Trade matching"],
      },
      mogul: {
        name: "Mogul",
        price: { USD: 25, NGN: 25000, KES: 3500, GHS: 300, ZAR: 450 },
        interval: "month",
        agentLimit: -1,
        leadsPerMonth: -1,
        successFee: 2,
        features: ["Unlimited Agents", "Unlimited leads", "All channels", "Priority matching", "Diaspora connect", "API access"],
      },
      payPerResult: {
        name: "Pay Per Result",
        price: { USD: 0 },
        interval: "none",
        agentLimit: 1,
        leadsPerMonth: 20,
        successFee: 8,
        features: ["1 AI Agent", "20 leads/month", "WhatsApp alerts", "No monthly fee", "Pay only when you earn"],
      },
    },
  },
};

const AFRICAN_COUNTRIES = [
  "NG", "KE", "GH", "ZA", "TZ", "UG", "RW", "ET", "SN", "CI",
  "CM", "CD", "AO", "MZ", "ZM", "ZW", "MW", "BW", "NA", "MU",
  "MA", "TN", "EG", "DZ", "ML", "BF", "NE", "TG", "BJ", "GA",
];

export function detectRegion(countryCode?: string): string {
  if (!countryCode) return "western";
  return AFRICAN_COUNTRIES.includes(countryCode.toUpperCase()) ? "africa" : "western";
}

export function getRegionConfig(region: string): RegionConfig {
  return REGIONS[region] || REGIONS.western;
}
