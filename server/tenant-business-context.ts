import { eq } from "drizzle-orm";
import { db } from "./db";
import { businesses, marketingStrategies, users, websiteProfiles } from "@shared/schema";

const FACTUAL_GROUNDING_RULES = `
FACTUAL GROUNDING RULES:
- Treat only VERIFIED TENANT FACTS below as authoritative business facts.
- Never turn platform features into the tenant's services or products.
- Never invent services, software capabilities, prices, savings, approval rates, integrations, testimonials, certifications, guarantees, or outcomes.
- If a fact is missing, omit it or ask the owner; do not fill gaps with assumptions.
- Opens and clicks are delivery diagnostics, not buying intent. Only genuine human replies, booked meetings, and explicit conversions are outcome signals.
- Use a specific, low-friction CTA and a clear opt-out path for outreach.
`.trim();

export async function getVerifiedTenantBusinessContext(
  userId: string,
  ownerProvidedContext?: string | null,
): Promise<string> {
  const [[user], [business], [website], [strategy]] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(businesses).where(eq(businesses.userId, userId)).limit(1),
    db.select().from(websiteProfiles).where(eq(websiteProfiles.userId, userId)).limit(1),
    db.select().from(marketingStrategies).where(eq(marketingStrategies.userId, userId)).limit(1),
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
    `Owner-provided agent context: ${ownerProvidedContext?.trim() || "Not provided"}`,
  ];

  const nonAuthoritativeStrategy = strategy?.status === "active"
    ? `\nNON-AUTHORITATIVE PRIOR STRATEGY (ideas only; not a source of business facts):\n${strategy.strategy}`
    : "";

  return `<VERIFIED_TENANT_CONTEXT>
${facts.join("\n")}
</VERIFIED_TENANT_CONTEXT>

${FACTUAL_GROUNDING_RULES}${nonAuthoritativeStrategy}`;
}

export { FACTUAL_GROUNDING_RULES };