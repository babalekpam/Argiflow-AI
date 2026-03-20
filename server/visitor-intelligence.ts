import { pool } from "./db";

export interface VisitorProfile {
  visitor_id: string;
  ip: string;
  browser: string;
  device: string;
  visit_count: number;
  first_seen: string;
  last_seen: string;
  identified: boolean;
  name: string | null;
  email: string | null;
  company: string | null;
  lead_id: string | null;
  lead_status: string | null;
  lead_score: number | null;
  match_method: string | null;
}

export interface VisitorActivity {
  visitor: VisitorProfile;
  pages_viewed: { page: string; title: string | null; time: string }[];
  clicks: { element_text: string; href: string | null; page: string; time: string }[];
  session_duration: number | null;
  entry_page: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  intent_score: number;
  intent_signals: string[];
}

const BILLING_KEYWORDS = [
  "billing", "pricing", "services", "rcm", "revenue-cycle",
  "medical-billing", "coding", "claims", "insurance", "collections",
  "credentialing", "ehr", "practice-management", "contact", "demo",
  "schedule", "appointment", "consultation", "quote", "get-started",
];

function computeIntentScore(pages: string[], clicks: any[]): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  for (const page of pages) {
    const lower = page.toLowerCase();
    if (BILLING_KEYWORDS.some(k => lower.includes(k))) {
      score += 15;
      signals.push(`Viewed billing-related page: ${page}`);
    }
    if (lower.includes("pricing") || lower.includes("quote")) {
      score += 20;
      signals.push(`Checked pricing/quote page`);
    }
    if (lower.includes("contact") || lower.includes("demo") || lower.includes("schedule")) {
      score += 25;
      signals.push(`Visited contact/demo page`);
    }
  }

  for (const click of clicks) {
    const text = (click.element_text || "").toLowerCase();
    const href = (click.href || "").toLowerCase();
    if (text.includes("contact") || text.includes("demo") || text.includes("schedule") || text.includes("call")) {
      score += 30;
      signals.push(`Clicked CTA: "${click.element_text}"`);
    }
    if (text.includes("billing") || text.includes("service") || href.includes("billing") || href.includes("service")) {
      score += 20;
      signals.push(`Clicked billing content: "${click.element_text}"`);
    }
    if (text.includes("pricing") || href.includes("pricing")) {
      score += 25;
      signals.push(`Clicked pricing link`);
    }
  }

  if (pages.length >= 3) {
    score += 10;
    signals.push(`Viewed ${pages.length} pages (engaged visitor)`);
  }

  return { score: Math.min(score, 100), signals: [...new Set(signals)] };
}

export async function identifyVisitorByIP(
  visitorId: string,
  ip: string,
  userId: string
): Promise<{
  name: string | null; email: string | null; company: string | null;
  lead_id: string | null; lead_status: string | null; lead_score: number | null;
  match_method: string | null;
  confidence: "high" | "medium" | "low";
} | null> {
  const client = await pool.connect();
  try {
    const emailEventMatch = await client.query(`
      SELECT DISTINCT es.recipient_email, es.recipient_name
      FROM track_email_events ee
      JOIN track_email_sends es ON es.token = ee.token
      WHERE ee.ip = $1 AND es.user_id = $2
      ORDER BY es.created_at DESC LIMIT 1
    `, [ip, userId]);

    if (emailEventMatch.rows.length > 0) {
      const { recipient_email, recipient_name } = emailEventMatch.rows[0];

      const leadMatch = await client.query(`
        SELECT id, name, email, company, status, score FROM leads
        WHERE email = $1 AND user_id = $2 LIMIT 1
      `, [recipient_email, userId]);

      if (leadMatch.rows.length > 0) {
        const lead = leadMatch.rows[0];
        return {
          name: lead.name, email: lead.email, company: lead.company,
          lead_id: lead.id, lead_status: lead.status, lead_score: lead.score,
          match_method: "email_open_ip", confidence: "high",
        };
      }

      return {
        name: recipient_name, email: recipient_email, company: null,
        lead_id: null, lead_status: null, lead_score: null,
        match_method: "email_open_ip", confidence: "medium",
      };
    }

    const visitorData = await client.query(`
      SELECT email, name, company FROM track_visitors WHERE visitor_id = $1
    `, [visitorId]);
    if (visitorData.rows.length > 0 && visitorData.rows[0].email) {
      const v = visitorData.rows[0];
      const leadMatch = await client.query(`
        SELECT id, name, email, company, status, score FROM leads
        WHERE email = $1 AND user_id = $2 LIMIT 1
      `, [v.email, userId]);
      if (leadMatch.rows.length > 0) {
        const lead = leadMatch.rows[0];
        return {
          name: lead.name, email: lead.email, company: lead.company,
          lead_id: lead.id, lead_status: lead.status, lead_score: lead.score,
          match_method: "direct_email", confidence: "high",
        };
      }
      return {
        name: v.name, email: v.email, company: v.company,
        lead_id: null, lead_status: null, lead_score: null,
        match_method: "visitor_profile", confidence: "medium",
      };
    }

    let hostname: string | null = null;
    try {
      const dns = await import("dns");
      const result = await new Promise<string[]>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("DNS timeout")), 2000);
        dns.reverse(ip, (err, hostnames) => {
          clearTimeout(timeout);
          if (err) reject(err);
          else resolve(hostnames);
        });
      });
      if (result.length > 0) {
        hostname = result[0];
        const parts = hostname.split(".");
        if (parts.length >= 2) {
          const domain = parts.slice(-2).join(".");
          const genericISPs = ["comcast.net", "att.net", "verizon.net", "spectrum.net", "cox.net",
            "charter.net", "xfinity.com", "googleusercontent.com", "amazonaws.com", "azure.com",
            "cloudfront.net", "akamai.net", "fastly.net", "replit.dev", "replit.com"];
          if (!genericISPs.some(isp => domain.includes(isp))) {
            const companyGuess = parts[parts.length - 2];
            if (companyGuess.length > 2) {
              return {
                name: null, email: null, company: domain,
                lead_id: null, lead_status: null, lead_score: null,
                match_method: "reverse_dns", confidence: "low",
              };
            }
          }
        }
      }
    } catch {}

    return null;
  } finally {
    client.release();
  }
}

export async function getRecentVisitorActivity(userId: string, hoursBack: number = 24, limit: number = 20): Promise<VisitorActivity[]> {
  const clampedHours = Math.min(Math.max(hoursBack, 1), 168);
  const clampedLimit = Math.min(Math.max(limit, 1), 50);

  const client = await pool.connect();
  try {
    const sessions = await client.query(`
      SELECT s.session_id, s.visitor_id, s.ip, s.browser, s.device,
             s.entry_page, s.exit_page, s.referrer, s.utm_source, s.utm_campaign,
             s.page_count, s.duration_seconds, s.created_at,
             v.email, v.name, v.company, v.visit_count, v.first_seen, v.last_seen
      FROM track_sessions s
      JOIN track_visitors v ON v.visitor_id = s.visitor_id
      WHERE s.created_at >= NOW() - ($1 || ' hours')::INTERVAL
        AND s.ip IS NOT NULL AND s.ip != '127.0.0.1' AND s.ip != 'unknown'
      ORDER BY s.created_at DESC
      LIMIT $2
    `, [clampedHours.toString(), clampedLimit]);

    if (sessions.rows.length === 0) return [];

    const sessionIds = sessions.rows.map((s: any) => s.session_id);
    const visitorIds = [...new Set(sessions.rows.map((s: any) => s.visitor_id))];

    const [pageResult, clickResult] = await Promise.all([
      client.query(`
        SELECT session_id, page, title, created_at FROM track_pageviews
        WHERE session_id = ANY($1) ORDER BY created_at ASC
      `, [sessionIds]),
      client.query(`
        SELECT session_id, element_text, href, page, created_at FROM track_clicks
        WHERE session_id = ANY($1) ORDER BY created_at ASC
      `, [sessionIds]),
    ]);

    const pagesBySession = new Map<string, any[]>();
    for (const p of pageResult.rows) {
      if (!pagesBySession.has(p.session_id)) pagesBySession.set(p.session_id, []);
      pagesBySession.get(p.session_id)!.push(p);
    }

    const clicksBySession = new Map<string, any[]>();
    for (const c of clickResult.rows) {
      if (!clicksBySession.has(c.session_id)) clicksBySession.set(c.session_id, []);
      clicksBySession.get(c.session_id)!.push(c);
    }

    const identityCache = new Map<string, any>();
    const uniqueIPs = [...new Set(sessions.rows.map((s: any) => `${s.visitor_id}:${s.ip}`))];
    for (const key of uniqueIPs.slice(0, 20)) {
      const [vid, ip] = key.split(":");
      try {
        const identity = await identifyVisitorByIP(vid, ip, userId);
        if (identity) identityCache.set(key, identity);
      } catch {}
    }

    const activities: VisitorActivity[] = [];

    for (const session of sessions.rows) {
      const sessionPages = pagesBySession.get(session.session_id) || [];
      const sessionClicks = clicksBySession.get(session.session_id) || [];
      const identity = identityCache.get(`${session.visitor_id}:${session.ip}`) || null;

      const pages = sessionPages.map((p: any) => p.page);
      const { score, signals } = computeIntentScore(pages, sessionClicks);

      const visitor: VisitorProfile = {
        visitor_id: session.visitor_id,
        ip: session.ip,
        browser: session.browser,
        device: session.device,
        visit_count: session.visit_count,
        first_seen: session.first_seen,
        last_seen: session.last_seen,
        identified: !!(identity?.email || identity?.company),
        name: identity?.name || session.name || null,
        email: identity?.email || session.email || null,
        company: identity?.company || session.company || null,
        lead_id: identity?.lead_id || null,
        lead_status: identity?.lead_status || null,
        lead_score: identity?.lead_score || null,
        match_method: identity?.match_method || null,
      };

      activities.push({
        visitor,
        pages_viewed: sessionPages.map((p: any) => ({ page: p.page, title: p.title, time: p.created_at })),
        clicks: sessionClicks.map((c: any) => ({ element_text: c.element_text, href: c.href, page: c.page, time: c.created_at })),
        session_duration: session.duration_seconds,
        entry_page: session.entry_page,
        referrer: session.referrer,
        utm_source: session.utm_source,
        utm_campaign: session.utm_campaign,
        intent_score: score,
        intent_signals: signals,
      });
    }

    return activities.sort((a, b) => b.intent_score - a.intent_score);
  } finally {
    client.release();
  }
}

export async function getHighIntentVisitors(userId: string, hoursBack: number = 48): Promise<VisitorActivity[]> {
  const all = await getRecentVisitorActivity(userId, hoursBack, 50);
  return all.filter(a => a.intent_score >= 20);
}

export function formatVisitorIntelForAria(activities: VisitorActivity[]): string {
  if (activities.length === 0) return "No high-intent visitor activity detected recently.";

  return activities.slice(0, 10).map((a, i) => {
    const who = a.visitor.identified
      ? `${a.visitor.name || "Unknown"} (${a.visitor.email || a.visitor.company || "unresolved"})${a.visitor.lead_id ? ` — existing lead, status: ${a.visitor.lead_status}, score: ${a.visitor.lead_score}` : ""}`
      : `Anonymous visitor (${a.visitor.device}/${a.visitor.browser})${a.visitor.company ? ` — possible company: ${a.visitor.company}` : ""}`;

    const what = a.pages_viewed.map(p => p.page).join(" → ");
    const ctaClicks = a.clicks.filter(c => c.element_text).map(c => `"${c.element_text}"`).join(", ");

    return `${i + 1}. WHO: ${who}
   PAGES: ${what || "none tracked"}
   ${ctaClicks ? `CLICKS: ${ctaClicks}` : ""}
   INTENT SCORE: ${a.intent_score}/100 — ${a.intent_signals.join("; ") || "browsing"}
   ${a.referrer ? `REFERRER: ${a.referrer}` : ""}
   ${a.utm_source ? `UTM: ${a.utm_source}/${a.utm_campaign || ""}` : ""}
   VISIT #${a.visitor.visit_count}, SESSION: ${a.session_duration ? `${a.session_duration}s` : "active"}`;
  }).join("\n\n");
}
