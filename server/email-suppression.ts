import { sql } from "drizzle-orm";
import { db } from "./db";
import { emailSuppressions, leads } from "@shared/schema";

export function isValidRecipientEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  if (normalized.length > 254 || /\s/.test(normalized)) return false;
  if (/^(n\/a|none|unknown|not available)/i.test(normalized)) return false;
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(normalized);
}

export async function isEmailSuppressed(userId: string, email: string | null | undefined): Promise<boolean> {
  const normalizedEmail = email?.toLowerCase().trim();
  if (!userId || !normalizedEmail) return true;

  const durableMatches = await db
    .select({ id: emailSuppressions.id })
    .from(emailSuppressions)
    .where(sql`
      ${emailSuppressions.userId} = ${userId}
      AND ${emailSuppressions.email} = ${normalizedEmail}
    `)
    .limit(1);
  if (durableMatches.length > 0) return true;

  const legacyMatches = await db
    .select({ id: leads.id })
    .from(leads)
    .where(sql`
      ${leads.userId} = ${userId}
      AND lower(trim(${leads.email})) = ${normalizedEmail}
      AND lower(${leads.status}) = 'unsubscribed'
    `)
    .limit(1);

  return legacyMatches.length > 0;
}

export async function suppressEmail(userId: string, email: string, reason = "unsubscribe"): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!userId || !normalizedEmail) return;
  await db
    .insert(emailSuppressions)
    .values({ userId, email: normalizedEmail, reason })
    .onConflictDoNothing();
}