/**
 * engagement.ts — single source of truth for lead email-engagement
 * scoring and bot/scanner classification.
 *
 * Pure functions only: this module must never import the database,
 * storage, or Express, so it can be unit-tested in isolation
 * (see engagement.test.ts) and reused by every writer of engagement
 * data (tracking endpoints, analytics recalculation, startup repair).
 *
 * History (2026-10-22 fix): scoring and bot filtering used to live as
 * near-duplicate copies inside server/routes.ts. The copies disagreed
 * (the startup repair counted bot events, the recalculate endpoint
 * filtered them, the live endpoints read-modify-wrote counters), so
 * the same lead showed different opens/clicks/score depending on
 * which code path ran last. All of them now delegate here, and the
 * counters on `leads` are a derived cache of the append-only
 * `email_events` log (see engagement-refresh.ts).
 */

// ── Score clamping ────────────────────────────────────────────────
// Every score that reaches the database or the UI passes through
// here. Lead "fit" scores arrive from LLM tool output and imports
// and were previously stored verbatim — values like 105 and 120
// were displayed as "120/100".
export function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value as any);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ── Engagement scoring ────────────────────────────────────────────
// Tiered weights. The tiers sum to exactly 100 at maximum
// (opens 25+15+10 = 50, clicks 35+15 = 50), so a "perfect" lead is
// 100 by construction — the clamp is a safety net, not the mechanism.
export interface EngagementResult {
  score: number;
  level: "hot" | "warm" | "interested" | "none";
  nextStep: string;
}

export function calculateEngagement(opens: number, clicks: number): EngagementResult {
  const o = Math.max(0, Math.floor(opens) || 0);
  const c = Math.max(0, Math.floor(clicks) || 0);
  let score = 0;
  if (o >= 1) score += 25;
  if (o >= 2) score += 15;
  if (o >= 3) score += 10;
  if (c >= 1) score += 35;
  if (c >= 2) score += 15;
  score = clampScore(score);

  let level: EngagementResult["level"];
  let nextStep: string;
  if (score >= 40) {
    level = "hot";
    nextStep = "Schedule a call immediately — this lead is highly engaged";
  } else if (score >= 25) {
    level = "warm";
    nextStep = "Send a follow-up email with a case study or booking link";
  } else if (score >= 10) {
    level = "interested";
    nextStep = "Send a value-add follow-up in 2-3 days";
  } else {
    level = "none";
    nextStep = "Wait for engagement or try a different channel (SMS/call)";
  }
  return { score, level, nextStep };
}

// ── Bot / scanner classification ──────────────────────────────────
// Opens and clicks are heavily polluted by mail-security scanners
// (Proofpoint, Mimecast, Barracuda, Safe Links…), mailbox-provider
// image proxies (Gmail, Apple MPP), and link prefetchers. Events are
// ALWAYS recorded (append-only log); classification only decides
// whether an event counts toward opens/clicks/score.

export const BOT_UA_PATTERNS = [
  // crawlers / generic automation
  "googlebot", "bingbot", "slurp", "duckduckbot", "baiduspider",
  "yandexbot", "facebot", "facebookexternalhit", "ia_archiver",
  "mj12bot", "semrushbot", "ahrefsbot", "dotbot", "petalbot",
  "bytespider", "applebot", "linkedinbot", "twitterbot",
  "pinterestbot", "redditbot", "telegrambot", "slackbot",
  "discordbot", "whatsapp", "skypeuripreview", "embedly",
  "linkpreview", "link preview", "bingpreview",
  "bot", "crawler", "spider", "scan", "check", "monitor",
  "wget", "curl", "python-requests", "node-fetch", "axios",
  "headlesschrome", "phantomjs", "selenium",
  // mail security scanners / gateways
  "barracuda", "proofpoint", "mimecast", "fireeye", "forcepoint",
  "symantec", "mcafee", "sophos", "trendmicro", "fortinet",
  "cisco", "ironport", "messagelabs", "spamhaus", "returnpath",
  "validity", "250ok", "mailgun", "postmark", "sparkpost",
  "urldefense", "safelinks", "protection.outlook",
  "qualys", "tenable", "rapid7", "nessus", "sucuri", "wordfence",
  // mailbox-provider image proxies (prefetch, not a human read)
  "googleimageproxy", "yahoomailproxy", "ggpht",
];

export const BOT_IP_PREFIXES = [
  // Google (Gmail image proxy / crawler egress)
  "66.249.", "74.125.", "209.85.", "216.239.", "64.233.",
  "72.14.", "108.177.", "142.250.", "172.217.", "173.194.",
];

export const KNOWN_SCANNER_IPS = ["81.161.59.17", "54.198.58.157", "51.54.38.120"];

export type BotReason =
  | "bot-user-agent"
  | "bot-ip"
  | "inhuman-speed"
  | "prefetch-open"
  | "link-burst";

export interface BotClassification {
  isBot: boolean;
  reason: BotReason | null;
}

/** UA/IP-only classification. Used for stored historical events and
 *  as the first stage of classifyEngagementEvent. */
export function classifyByUaIp(userAgent: string, ipAddress: string): BotClassification {
  const ua = (userAgent || "").toLowerCase();
  const ip = (ipAddress || "").trim();
  if (!ua || ua.length < 20) return { isBot: true, reason: "bot-user-agent" };
  if (BOT_UA_PATTERNS.some((p) => ua.includes(p))) return { isBot: true, reason: "bot-user-agent" };
  if (BOT_IP_PREFIXES.some((p) => ip.startsWith(p))) return { isBot: true, reason: "bot-ip" };
  if (KNOWN_SCANNER_IPS.includes(ip)) return { isBot: true, reason: "bot-ip" };
  return { isBot: false, reason: null };
}

// ── Timing heuristics ─────────────────────────────────────────────
// A click that lands < 3s after the message was sent cannot be a
// human reading the email — it is a scanner detonating the link.
// An "open" < 5s after send is a provider prefetch (Apple MPP /
// Gmail proxy fetch at delivery), not a read.
export const INHUMAN_CLICK_MS = 3000;
export const PREFETCH_OPEN_MS = 5000;

export function classifyEngagementEvent(input: {
  userAgent: string;
  ipAddress: string;
  eventType: "open" | "click";
  /** Milliseconds between the send and this event, if known. */
  msSinceSend?: number | null;
}): BotClassification {
  const base = classifyByUaIp(input.userAgent, input.ipAddress);
  if (base.isBot) return base;
  if (input.msSinceSend != null && Number.isFinite(input.msSinceSend)) {
    if (input.eventType === "click" && input.msSinceSend < INHUMAN_CLICK_MS) {
      return { isBot: true, reason: "inhuman-speed" };
    }
    if (input.eventType === "open" && input.msSinceSend < PREFETCH_OPEN_MS) {
      return { isBot: true, reason: "prefetch-open" };
    }
  }
  return { isBot: false, reason: null };
}

// ── Link-burst signature ──────────────────────────────────────────
// The classic scanner signature: (nearly) ALL links in a message
// clicked within a few seconds. Evaluated over the stored event log
// at refresh time (deterministic, works for historical events):
// >= BURST_MIN_CLICKS clicks covering >= BURST_MIN_DISTINCT_LINKS
// distinct URLs inside any BURST_WINDOW_MS window for the same
// lead + message are all scanner clicks.
export const BURST_WINDOW_MS = 10_000;
export const BURST_MIN_CLICKS = 3;
export const BURST_MIN_DISTINCT_LINKS = 3;

export interface BurstEventInput {
  id: string;
  eventType: string;
  messageId?: string | null;
  linkUrl?: string | null;
  createdAt: Date | string;
}

export function findBurstEventIds(events: BurstEventInput[]): Set<string> {
  const flagged = new Set<string>();
  const clicks = events
    .filter((e) => e.eventType === "click")
    .map((e) => ({
      id: e.id,
      key: e.messageId || "__no_message__",
      url: (e.linkUrl || "").trim(),
      t: new Date(e.createdAt).getTime(),
    }))
    .filter((e) => Number.isFinite(e.t))
    .sort((a, b) => a.t - b.t);

  const groups = new Map<string, typeof clicks>();
  for (const c of clicks) {
    const g = groups.get(c.key) || [];
    g.push(c);
    groups.set(c.key, g);
  }

  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i++) {
      const window = group.filter(
        (c) => c.t >= group[i].t && c.t - group[i].t <= BURST_WINDOW_MS
      );
      if (window.length < BURST_MIN_CLICKS) continue;
      const distinct = new Set(window.map((c) => c.url).filter(Boolean));
      if (distinct.size < BURST_MIN_DISTINCT_LINKS) continue;
      for (const c of window) flagged.add(c.id);
    }
  }
  return flagged;
}
