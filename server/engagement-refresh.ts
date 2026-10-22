/**
 * engagement-refresh.ts — the ONE derivation of lead engagement
 * counters and score from the append-only `email_events` log.
 *
 * Before 2026-10-22 three writers maintained leads.email_opens /
 * email_clicks / engagement_score with different rules:
 *   - the /t/o and /t/c tracking endpoints did JavaScript
 *     read-modify-write increments (lost updates under the
 *     concurrent hits a scanner burst produces),
 *   - the startup repair (repairSentLeads) recounted ALL events
 *     including scanner traffic,
 *   - POST /api/email-analytics/recalculate recounted with a
 *     UA/IP bot filter.
 * Whichever ran last won, so counts changed between page loads.
 *
 * Now every path calls refreshLeadEngagement(): it re-derives the
 * counters from the event log (human events only, after burst
 * re-classification) and writes the derived values. Re-running it
 * is idempotent — the same log always yields the same numbers.
 */

import { eq } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { emailEvents } from "@shared/schema";
import { calculateEngagement, findBurstEventIds } from "./engagement";

export interface LeadEngagementSummary {
  opens: number;
  clicks: number;
  score: number;
  level: string;
  nextStep: string;
  lastEngagedAt: Date | null;
}

function eventLinkUrl(e: { linkUrl?: string | null; metadata?: string | null }): string | null {
  if (e.linkUrl) return e.linkUrl;
  if (e.metadata) {
    try {
      const parsed = JSON.parse(e.metadata);
      if (parsed && typeof parsed.url === "string") return parsed.url;
    } catch { /* legacy rows may hold non-JSON metadata */ }
  }
  return null;
}

export async function refreshLeadEngagement(leadId: string): Promise<LeadEngagementSummary | null> {
  const lead = await storage.getLeadById(leadId);
  if (!lead) return null;

  const events = await storage.getEmailEventsByLead(leadId);

  // Re-classify scanner link-bursts in the stored log. Historical
  // events predate per-event bot flags, and a burst can only be
  // recognised once several clicks have landed, so this runs on
  // every refresh rather than only at insert time.
  const burstIds = findBurstEventIds(
    events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      messageId: (e as any).messageId ?? null,
      linkUrl: eventLinkUrl(e as any),
      createdAt: e.createdAt as any,
    }))
  );
  for (const e of events) {
    if (burstIds.has(e.id) && !(e as any).isBot) {
      await db
        .update(emailEvents)
        .set({ isBot: true, botReason: "link-burst" } as any)
        .where(eq(emailEvents.id, e.id));
      (e as any).isBot = true;
      (e as any).botReason = "link-burst";
    }
  }

  const human = events.filter((e) => !(e as any).isBot);
  const opens = human.filter((e) => e.eventType === "open").length;
  const clicks = human.filter((e) => e.eventType === "click").length;
  const { score, level, nextStep } = calculateEngagement(opens, clicks);
  // getEmailEventsByLead orders by created_at DESC — first human
  // event is the most recent engagement.
  const lastEngagedAt = human.length > 0 ? (human[0].createdAt ?? null) : null;

  const update: Record<string, any> = {
    emailOpens: opens,
    emailClicks: clicks,
    engagementScore: score,
    engagementLevel: level,
    nextStep,
    lastEngagedAt,
  };
  // Status promotion rules preserved from the old writers:
  // engagement can promote a lead, never demote one.
  if (level === "hot" && lead.status !== "qualified") update.status = "hot";
  else if (level === "warm" && (lead.status === "new" || lead.status === "cold")) update.status = "warm";

  await storage.updateLead(lead.id, update as any);
  return { opens, clicks, score, level, nextStep, lastEngagedAt };
}
