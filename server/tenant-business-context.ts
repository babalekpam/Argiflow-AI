import { eq } from "drizzle-orm";
import { db } from "./db";
import { businesses, marketingStrategies, users, userSettings, websiteProfiles } from "@shared/schema";
import { businessManager } from "@shared/business-manager-schema";

const FACTUAL_GROUNDING_RULES = `
FACTUAL GROUNDING RULES:
- Treat only VERIFIED TENANT FACTS and the owner-saved BUSINESS MANAGER CONTEXT below as authoritative business facts.
- The owner-saved BUSINESS MANAGER CONTEXT and GOALS take precedence over generic Aria profile fields, historical strategy prose, and chat/discovery claims.
- Goals describe owner intent; they are not evidence that an action happened, a customer converted, or an outcome was achieved.
- Historical strategy, manager decisions/reports, and Aria chat/discovery messages are context only and never verified action evidence.
- Never turn platform features into the tenant's services or products.
- Never invent services, software capabilities, prices, savings, approval rates, integrations, testimonials, certifications, guarantees, or outcomes.
- If a fact is missing, omit it or ask the owner; do not fill gaps with assumptions.
- Opens and clicks are delivery diagnostics, not buying intent. Only genuine human replies, booked meetings, and explicit conversions are outcome signals.
- Use a specific, low-friction CTA and a clear opt-out path for outreach.
`.trim();

export interface SavedTenantBusinessContext {
  businessContext: string | null;
  goals: string[];
  updatedAt: Date | null;
  source: "business_manager" | "none";
  saved: boolean;
}

export interface StrategyBrief {
  businessContext: string | null;
  goals: string[];
  updatedAt: Date | null;
  source: SavedTenantBusinessContext["source"];
  saved: boolean;
}

/**
 * Read only the tenant's saved Business Manager context. This is deliberately
 * a narrow projection so callers cannot accidentally expose credentials or
 * other Business Manager configuration to the UI or an AI prompt.
 */
export async function getSavedTenantBusinessContext(
  userId: string,
): Promise<SavedTenantBusinessContext> {
  const [saved] = await db
    .select({
      businessContext: businessManager.businessContext,
      goals: businessManager.goals,
      updatedAt: businessManager.updatedAt,
    })
    .from(businessManager)
    .where(eq(businessManager.userId, userId))
    .limit(1);

  const goals = Array.isArray(saved?.goals)
    ? saved.goals.filter((goal): goal is string => typeof goal === "string" && goal.trim().length > 0).map(goal => goal.trim())
    : [];
  const businessContext = typeof saved?.businessContext === "string" && saved.businessContext.trim()
    ? saved.businessContext.trim()
    : null;

  return {
    businessContext,
    goals,
    updatedAt: saved?.updatedAt || null,
    source: saved ? "business_manager" : "none",
    saved: Boolean(saved),
  };
}

/**
 * Keep the strategy-brief API and Aria prompts on the same read model.
 */
export function toStrategyBrief(
  savedContext: SavedTenantBusinessContext,
): StrategyBrief {
  return {
    businessContext: savedContext.businessContext,
    goals: [...savedContext.goals],
    updatedAt: savedContext.updatedAt,
    source: savedContext.source,
    saved: savedContext.saved,
  };
}

export function buildVerifiedTenantBusinessContext({
  facts,
  savedContext,
  ownerProvidedContext,
  priorStrategy,
}: {
  facts: string[];
  savedContext: SavedTenantBusinessContext;
  ownerProvidedContext?: string | null;
  priorStrategy?: string | null;
}): string {
  const savedBusinessContext = savedContext.businessContext || ownerProvidedContext?.trim() || null;
  const savedContextBlock = [
    `<BUSINESS_MANAGER_CONTEXT source="${savedContext.source}" saved="${savedContext.saved}">`,
    `Saved business context: ${savedBusinessContext || "Not provided"}`,
    `Saved goals (owner intent, not action evidence): ${savedContext.goals.join(" | ") || "Not provided"}`,
    "</BUSINESS_MANAGER_CONTEXT>",
  ].join("\n");

  const nonAuthoritativeStrategy = priorStrategy?.trim()
    ? `\nNON-AUTHORITATIVE PRIOR STRATEGY (ideas only; not a source of business facts or verified action evidence):\n${priorStrategy.trim()}`
    : "";

  return `<VERIFIED_TENANT_CONTEXT>
${savedContextBlock}
${facts.join("\n")}
</VERIFIED_TENANT_CONTEXT>

${FACTUAL_GROUNDING_RULES}${nonAuthoritativeStrategy}`;
}

export async function getVerifiedTenantBusinessContext(
  userId: string,
  ownerProvidedContext?: string | null,
): Promise<string> {
  const [[user], [business], [website], [strategy], [settings], savedContext] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(businesses).where(eq(businesses.userId, userId)).limit(1),
    db.select().from(websiteProfiles).where(eq(websiteProfiles.userId, userId)).limit(1),
    db.select().from(marketingStrategies).where(eq(marketingStrategies.userId, userId)).limit(1),
    db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1),
    getSavedTenantBusinessContext(userId),
  ]);

  if (!user) throw new Error("Tenant business owner not found");

  const facts = [
    `Company: ${user.companyName || business?.name || "Unknown"}`,
    `Industry: ${user.industry || business?.industry || "Unknown"}`,
    `Owner-entered company description: ${user.companyDescription || business?.description || "Not provided"}`,
    `Website: ${user.website || website?.websiteUrl || "Not provided"}`,
    `Website-sourced services: ${website?.status === "trained" ? website.services || "Not provided" : "Not verified"}`,
    `Website-sourced value propositions: ${website?.status === "trained" ? website.valuePropositions || "Not provided" : "Not verified"}`,
    `Website-sourced target audience: ${website?.status === "trained" ? website.targetAudience || "Not provided" : "Not verified"}`,
    `Website-sourced pricing: ${website?.status === "trained" ? website.pricing || "Not provided" : "Not verified"}`,
    `Verified booking link: ${settings?.calendarLink || "Not provided"}`,
  ];

  return buildVerifiedTenantBusinessContext({
    facts,
    savedContext,
    ownerProvidedContext,
    priorStrategy: strategy?.status === "active" ? strategy.strategy : null,
  });
}

export { FACTUAL_GROUNDING_RULES };
