import { sql } from "drizzle-orm";
import { db } from "./db";
import { emailSuppressions, leads } from "@shared/schema";

const EXPLICIT_OPTOUT_PATTERN = /\b(?:unsubscribe|remove me|take me off|stop (?:emailing|contacting|sending)|do not (?:email|contact)|don't (?:email|contact)|no more emails|opt me out|opt[- ]?out|never contact)\b/i;

export function isValidRecipientEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  if (normalized.length > 254 || /\s/.test(normalized)) return false;
  if (/^(n\/a|none|unknown|not available)/i.test(normalized)) return false;
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(normalized);
}

/**
 * Keep explicit opt-out detection shared by every inbound path.  This is
 * intentionally limited to direct requests and does not classify generic
 * negative replies as suppression requests.
 */
export function isExplicitOptOutText(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  const directLines: string[] = [];
  for (const line of value.split(/\r?\n/)) {
    if (/^\s*>/.test(line)) continue;
    if (/^\s*(?:on .+wrote:|-----original message-----|begin forwarded message:)\s*$/i.test(line)) break;
    directLines.push(line);
  }
  const directText = directLines.join("\n");
  return EXPLICIT_OPTOUT_PATTERN.test(directText);
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