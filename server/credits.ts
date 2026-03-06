import { db } from "./db";
import { creditsLedger, users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export const CREDIT_COSTS: Record<string, number> = {
  ai_email: 8,
  lead_enrich: 15,
  agent_run: 50,
  reply_analyze: 10,
  intent_scan: 20,
  email_sequence: 30,
};

export async function deductCredits(userId: string, action: string): Promise<{ success: boolean; remaining: number; error?: string }> {
  const cost = CREDIT_COSTS[action];
  if (!cost) return { success: true, remaining: 0 };

  try {
    const result = await db.execute(
      sql`UPDATE users SET credits = COALESCE(credits, 3000) - ${cost}
          WHERE id = ${userId} AND COALESCE(credits, 3000) >= ${cost}
          RETURNING credits`
    );

    if (!result.rows || result.rows.length === 0) {
      return { success: false, remaining: 0, error: "Insufficient credits" };
    }

    await db.insert(creditsLedger).values({
      userId,
      action,
      creditsUsed: cost,
    });

    return { success: true, remaining: (result.rows[0] as any).credits };
  } catch (err: any) {
    console.error("[Credits] Deduction error:", err.message);
    return { success: false, remaining: 0, error: err.message };
  }
}

export async function refundCredits(userId: string, action: string): Promise<void> {
  const cost = CREDIT_COSTS[action] || 0;
  if (!cost || !userId) return;

  try {
    await db.execute(
      sql`UPDATE users SET credits = COALESCE(credits, 0) + ${cost} WHERE id = ${userId}`
    );

    await db.insert(creditsLedger).values({
      userId,
      action: `${action}_refund`,
      creditsUsed: -cost,
    });
  } catch (err: any) {
    console.error("[Credits] Refund error:", err.message);
  }
}

export async function getCreditsBalance(userId: string): Promise<number> {
  try {
    const result = await db.execute(
      sql`SELECT COALESCE(credits, 3000) as credits FROM users WHERE id = ${userId}`
    );
    return (result.rows?.[0] as any)?.credits ?? 3000;
  } catch {
    return 3000;
  }
}

export async function getCreditHistory(userId: string, limit = 50) {
  try {
    const result = await db
      .select({
        action: creditsLedger.action,
        amount: creditsLedger.creditsUsed,
        provider: creditsLedger.provider,
        model: creditsLedger.model,
        date: creditsLedger.createdAt,
      })
      .from(creditsLedger)
      .where(eq(creditsLedger.userId, userId))
      .orderBy(sql`${creditsLedger.createdAt} DESC`)
      .limit(limit);

    return result;
  } catch {
    return [];
  }
}
