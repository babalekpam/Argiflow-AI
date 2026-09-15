import { Router } from "express";
import { and, eq, gte, lt, inArray } from "drizzle-orm";
import {
  emailLogs,
  emailReplies,
  emailSuppressions,
  leads,
  type Lead,
} from "@shared/schema";
import { classifyInboundReply } from "./inbox-reliability";

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;

export interface EvidenceDateRange {
  from: Date;
  to: Date;
}

export interface EvidenceEmailRecord {
  userId: string;
  recipientEmail: string | null;
  status: string | null;
  provider?: string | null;
  source?: string | null;
  retryCount?: number | null;
  createdAt: Date | string | null | undefined;
}

export interface EvidenceReplyRecord {
  userId: string;
  leadId: string;
  direction: string | null;
  fromEmail: string | null;
  subject?: string | null;
  body?: string | null;
  status?: string | null;
  createdAt: Date | string | null | undefined;
}

export interface EmailFunnelEvidence {
  range: {
    from: string;
    to: string;
    toExclusive: boolean;
  };
  attempts: number;
  uniqueRecipients: number;
  acceptedRecords: number;
  unknownDelivery: number;
  bounceReports: number;
  replies: number;
  failedRecords: number;
  pendingRecords: number;
  retryRecords: number;
  retryCount: number;
  deliveryCallbacks: number;
  providerBreakdown: Record<string, number>;
  limitations: string[];
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inRange(value: Date | string | null | undefined, range: EvidenceDateRange): boolean {
  const date = asDate(value);
  return !!date && date >= range.from && date < range.to;
}

function normalizeEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase();
}

/**
 * Parse an API date range. Date-only `to` values include the complete day,
 * while timestamp values are treated as an exclusive upper bound.
 */
export function resolveEvidenceRange(
  params: { from?: string; to?: string } = {},
  now = new Date(),
): EvidenceDateRange {
  const parse = (value: string, field: "from" | "to"): Date => {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const parsed = dateOnly ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid ${field} date`);
    }
    if (field === "to" && dateOnly) {
      parsed.setTime(parsed.getTime() + DAY_MS);
    }
    return parsed;
  };

  const from = params.from
    ? parse(params.from, "from")
    : new Date(now.getTime() - 30 * DAY_MS);
  const to = params.to ? parse(params.to, "to") : now;

  if (from >= to) {
    throw new Error("The evidence range must end after it starts");
  }
  return { from, to };
}

/**
 * Calculate tenant-scoped outreach evidence without inferring delivery,
 * conversion, or open rates. Every record is counted against the same range.
 * This pure function is intentionally exported for regression tests.
 */
export function calculateEmailFunnelEvidence(
  userId: string,
  logs: EvidenceEmailRecord[],
  replies: EvidenceReplyRecord[],
  range: EvidenceDateRange,
): EmailFunnelEvidence {
  const tenantLogs = logs.filter(
    (row) => row.userId === userId && inRange(row.createdAt, range),
  );
  const tenantReplies = replies.filter(
    (row) =>
      row.userId === userId &&
      row.direction === "inbound" &&
      inRange(row.createdAt, range),
  );

  const acceptedStatuses = new Set(["sent", "accepted"]);
  const acceptedRecords = tenantLogs.filter((row) =>
    acceptedStatuses.has((row.status || "").toLowerCase()),
  ).length;
  const bounceReports = tenantLogs.filter(
    (row) => (row.status || "").toLowerCase() === "bounced",
  ).length;
  const failedRecords = tenantLogs.filter(
    (row) => (row.status || "").toLowerCase() === "failed",
  ).length;
  const pendingRecords = tenantLogs.filter(
    (row) => (row.status || "").toLowerCase() === "pending",
  ).length;
  const retryRecords = tenantLogs.filter((row) => (row.retryCount || 0) > 0).length;
  const retryCount = tenantLogs.reduce(
    (total, row) => total + Math.max(0, row.retryCount || 0),
    0,
  );

  const uniqueRecipients = new Set(
    tenantLogs
      .map((row) => normalizeEmail(row.recipientEmail))
      .filter(Boolean),
  ).size;

  const providerBreakdown: Record<string, number> = {};
  for (const row of tenantLogs) {
    const provider = (row.provider || "unknown").trim().toLowerCase() || "unknown";
    providerBreakdown[provider] = (providerBreakdown[provider] || 0) + 1;
  }

  return {
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      toExclusive: true,
    },
    attempts: tenantLogs.length,
    uniqueRecipients,
    acceptedRecords,
    // There is no delivery callback table in this data path. A provider
    // handoff is therefore unknown delivery, never "delivered".
    unknownDelivery: acceptedRecords,
    bounceReports,
    replies: tenantReplies.length,
    failedRecords,
    pendingRecords,
    retryRecords,
    retryCount,
    deliveryCallbacks: 0,
    providerBreakdown,
    limitations: [
      "Accepted means the provider handoff recorded as sent/accepted; it does not mean delivered.",
      "No delivery callbacks are stored here, so accepted records remain unknown delivery.",
      "Bounce reports reflect records currently labelled bounced; a prior sent state may not be retained.",
      "Provider labels are historical metadata. Some older records labelled SES were sent through Postal.",
      "Replies count stored inbound reply records only; no stored reply is not proof that nobody replied.",
      "No open rate, delivered rate, or rate against total leads is calculated from this evidence.",
    ],
  };
}

const DISQUALIFYING_LEAD_STATUSES = new Set([
  "unsubscribed",
  "suppressed",
  "do_not_contact",
  "do-not-contact",
  "opted_out",
  "opted-out",
  "cold",
  "negative",
  "not_interested",
  "not-interested",
]);

/**
 * Safety gate for the dashboard's qualifying HOT count. This deliberately
 * does not claim to prove a human authored a reply; it only excludes known
 * negative, automated, suppressed, and empty records.
 */
export function isConservativeQualifyingReply(
  reply: Pick<
    EvidenceReplyRecord,
    "direction" | "fromEmail" | "subject" | "body" | "status"
  >,
  options: {
    leadEmail?: string | null;
    leadStatus?: string | null;
    suppressedEmails?: Set<string>;
  } = {},
): boolean {
  if (reply.direction !== "inbound") return false;
  // Reply status is classified when the message is ingested, while the
  // original headers are still available. Reclassifying persisted "received"
  // rows here would lose header-only automated-response signals, so only the
  // durable qualified classification can pass this gate.
  if ((reply.status || "").trim().toLowerCase() !== "qualified") return false;
  if (!reply.body || !reply.body.trim() || reply.body === "(Could not parse email body)") {
    return false;
  }
  // Keep the persisted classification as the source of truth for header-only
  // signals, while still rejecting an obviously negative/automated body if a
  // legacy row was misclassified.
  if (!classifyInboundReply({ bodyText: reply.body, subject: reply.subject }).qualifies) {
    return false;
  }

  const suppressedEmails = options.suppressedEmails || new Set<string>();
  const leadStatus = (options.leadStatus || "").trim().toLowerCase();
  const fromEmail = normalizeEmail(reply.fromEmail);
  const leadEmail = normalizeEmail(options.leadEmail);
  if (
    DISQUALIFYING_LEAD_STATUSES.has(leadStatus) ||
    (fromEmail && suppressedEmails.has(fromEmail)) ||
    (leadEmail && suppressedEmails.has(leadEmail))
  ) {
    return false;
  }

  return true;
}

export function getQualifiedReplyLeadIdsFromRecords(
  tenantLeads: Pick<Lead, "id" | "email" | "status">[],
  replies: EvidenceReplyRecord[],
  suppressedEmails: Set<string> = new Set<string>(),
): Set<string> {
  const leadsById = new Map(tenantLeads.map((lead) => [lead.id, lead]));
  const repliesByLead = new Map<string, EvidenceReplyRecord[]>();
  for (const reply of replies) {
    if (reply.direction !== "inbound" || !leadsById.has(reply.leadId)) continue;
    const leadReplies = repliesByLead.get(reply.leadId) || [];
    leadReplies.push(reply);
    repliesByLead.set(reply.leadId, leadReplies);
  }

  const qualifyingLeadIds = new Set<string>();
  repliesByLead.forEach((leadReplies, leadId) => {
    // A missing timestamp means the order of a possible disqualifying reply
    // cannot be established. Exclude that lead rather than guessing.
    if (leadReplies.some((reply) => !asDate(reply.createdAt))) return;
    const latestReply = leadReplies.reduce((latest, reply) => {
      if (!latest) return reply;
      return (asDate(reply.createdAt) as Date) >= (asDate(latest.createdAt) as Date)
        ? reply
        : latest;
    }, null as EvidenceReplyRecord | null);
    const lead = leadsById.get(leadId);
    if (
      lead &&
      latestReply &&
      isConservativeQualifyingReply(latestReply, {
        leadEmail: lead.email,
        leadStatus: lead.status,
        suppressedEmails,
      })
    ) {
      qualifyingLeadIds.add(leadId);
    }
  });
  return qualifyingLeadIds;
}

export async function getConservativeReplyLeadIds(
  userId: string,
  tenantLeads: Pick<Lead, "id" | "email" | "status">[],
): Promise<Set<string>> {
  const { db } = await import("./db");
  const [replies, suppressions] = await Promise.all([
    db.select().from(emailReplies).where(eq(emailReplies.userId, userId)),
    db
      .select({ email: emailSuppressions.email })
      .from(emailSuppressions)
      .where(eq(emailSuppressions.userId, userId)),
  ]);

  const suppressedEmails = new Set(
    suppressions.map((row) => normalizeEmail(row.email)).filter(Boolean),
  );
  return getQualifiedReplyLeadIdsFromRecords(tenantLeads, replies, suppressedEmails);
}

export async function getQualifiedHotLeadIds(
  userId: string,
  tenantLeads: Pick<Lead, "id" | "email" | "status" | "engagementLevel">[],
): Promise<Set<string>> {
  const qualifyingReplyLeadIds = await getConservativeReplyLeadIds(userId, tenantLeads);
  return new Set(
    tenantLeads
      .filter((lead) => lead.engagementLevel === "hot" && qualifyingReplyLeadIds.has(lead.id))
      .map((lead) => lead.id),
  );
}

export function formatEvidenceForCouncil(
  evidence: EmailFunnelEvidence | null,
): string {
  if (!evidence) {
    return [
      "TENANT OUTREACH EVIDENCE: unavailable for this session.",
      "Do not invent counts, delivery states, open rates, reply rates, or thresholds.",
      "State that evidence is unavailable when it matters to the recommendation.",
    ].join("\n");
  }

  return [
    "TENANT OUTREACH EVIDENCE (read-only, selected date range):",
    `- Range: ${evidence.range.from} through ${evidence.range.to} (end is exclusive)`,
    `- Attempts: ${evidence.attempts}`,
    `- Unique recipients: ${evidence.uniqueRecipients}`,
    `- Accepted provider handoffs: ${evidence.acceptedRecords}`,
    `- Delivery state unknown: ${evidence.unknownDelivery}`,
    `- Bounce reports: ${evidence.bounceReports}`,
    `- Stored inbound replies: ${evidence.replies}`,
    `- Retried records: ${evidence.retryRecords} (${evidence.retryCount} retry count)`,
    "- Do not call an accepted handoff delivered. No delivery callbacks are stored.",
    "- Do not infer an open rate, a delivered rate, a human reply, or any threshold not present above.",
    "- Do not calculate a rate using total leads as the denominator.",
  ].join("\n");
}

export async function getEmailFunnelEvidence(
  userId: string,
  range: EvidenceDateRange,
  businessId?: string,
): Promise<EmailFunnelEvidence> {
  const { db } = await import("./db");
  const businessLeads = db.select({ id: leads.id }).from(leads)
    .where(and(eq(leads.userId, userId), eq(leads.businessId, businessId || "")));
  const [logs, replies] = await Promise.all([
    db
      .select({
        userId: emailLogs.userId,
        recipientEmail: emailLogs.recipientEmail,
        status: emailLogs.status,
        provider: emailLogs.provider,
        source: emailLogs.source,
        retryCount: emailLogs.retryCount,
        createdAt: emailLogs.createdAt,
      })
      .from(emailLogs)
      .where(
        and(
          eq(emailLogs.userId, userId),
          gte(emailLogs.createdAt, range.from),
          lt(emailLogs.createdAt, range.to),
          businessId ? inArray(emailLogs.leadId, businessLeads) : undefined,
        ),
      ),
    db
      .select({
        userId: emailReplies.userId,
        leadId: emailReplies.leadId,
        direction: emailReplies.direction,
        fromEmail: emailReplies.fromEmail,
        subject: emailReplies.subject,
        body: emailReplies.body,
        status: emailReplies.status,
        createdAt: emailReplies.createdAt,
      })
      .from(emailReplies)
      .where(
        and(
          eq(emailReplies.userId, userId),
          gte(emailReplies.createdAt, range.from),
          lt(emailReplies.createdAt, range.to),
          businessId ? inArray(emailReplies.leadId, businessLeads) : undefined,
        ),
      ),
  ]);

  return calculateEmailFunnelEvidence(userId, logs, replies, range);
}

router.get("/email-funnel", async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const range = resolveEvidenceRange({ from, to });
    const businessId = typeof req.query.businessId === "string" ? req.query.businessId : undefined;
    const evidence = await getEmailFunnelEvidence(userId, range, businessId);
    res.setHeader("Cache-Control", "private, max-age=60");
    return res.json(evidence);
  } catch (error: any) {
    if (
      error?.message === "Invalid from date" ||
      error?.message === "Invalid to date" ||
      error?.message === "The evidence range must end after it starts"
    ) {
      return res.status(400).json({ message: error.message });
    }
    console.error("[Evidence] Failed to read tenant funnel evidence:", error);
    return res.status(500).json({ message: "Failed to read tenant funnel evidence" });
  }
});

export default router;