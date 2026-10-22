-- ════════════════════════════════════════════════════════════════════
-- 2026-10-22 — Email tracking & lead scoring fix (ArgiFlow)
--
-- Additive only: new columns, new indexes, value clamps, one new
-- CHECK constraint pair (added AFTER the clamps, so it cannot fail),
-- and an idempotent backfill that re-derives engagement counters
-- from the email_events log. No table or column is dropped or
-- renamed; no RLS / auth policy is touched.
--
-- The schema changes below are mirrored in the Drizzle definitions
-- (shared/outreach-schema.ts), so `npm run db:push` afterwards is a
-- no-op for these objects. Run this file once, in order.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Attribution + bot columns on the engagement event log ──────
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS campaign_id varchar;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS message_id  varchar;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS link_url    text;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS is_bot      boolean NOT NULL DEFAULT false;
ALTER TABLE email_events ADD COLUMN IF NOT EXISTS bot_reason  text;

CREATE INDEX IF NOT EXISTS email_events_lead_bot_idx  ON email_events (lead_id, is_bot);
CREATE INDEX IF NOT EXISTS email_events_message_idx   ON email_events (message_id);

-- ── 2. Per-send id on the send log ────────────────────────────────
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS tracking_message_id varchar;
CREATE INDEX IF NOT EXISTS email_logs_tracking_message_idx ON email_logs (tracking_message_id);

-- ── 3. Website/email tracker (tracker-routes) bot flag ────────────
ALTER TABLE track_email_events ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;

-- ── 4. Clamp out-of-range scores already stored ───────────────────
-- (The bug: LLM/import write paths stored fit scores verbatim,
-- producing "105/100" and "120/100" in the UI.)
UPDATE leads SET score = LEAST(100, GREATEST(0, score))                WHERE score < 0 OR score > 100;
UPDATE leads SET engagement_score = LEAST(100, GREATEST(0, engagement_score))
  WHERE engagement_score < 0 OR engagement_score > 100;

-- ── 5. Guard rails so it cannot recur ─────────────────────────────
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_score_range;
ALTER TABLE leads ADD  CONSTRAINT leads_score_range
  CHECK (score IS NULL OR (score >= 0 AND score <= 100));
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_engagement_score_range;
ALTER TABLE leads ADD  CONSTRAINT leads_engagement_score_range
  CHECK (engagement_score IS NULL OR (engagement_score >= 0 AND engagement_score <= 100));

-- ── 6. Backfill bot flags on historical events ────────────────────
-- 6a. UA/IP classification (mirrors server/engagement.ts lists;
--     only the durable, unambiguous signatures are applied in SQL).
UPDATE email_events SET is_bot = true, bot_reason = 'bot-user-agent'
WHERE is_bot = false AND (
  user_agent IS NULL OR length(user_agent) < 20
  OR lower(user_agent) ~ '(bot|crawler|spider|scan|check|monitor|wget|curl|python-requests|node-fetch|axios|headlesschrome|phantomjs|selenium|barracuda|proofpoint|mimecast|fireeye|forcepoint|symantec|mcafee|sophos|trendmicro|fortinet|ironport|messagelabs|spamhaus|returnpath|validity|250ok|urldefense|safelinks|protection\.outlook|googleimageproxy|yahoomailproxy|facebookexternalhit|linkedinbot|twitterbot|slackbot|discordbot|telegrambot|whatsapp|embedly|linkpreview|bingpreview|applebot|qualys|tenable|rapid7|nessus|sucuri|wordfence)'
);
UPDATE email_events SET is_bot = true, bot_reason = 'bot-ip'
WHERE is_bot = false AND (
  ip_address LIKE '66.249.%' OR ip_address LIKE '74.125.%' OR ip_address LIKE '209.85.%'
  OR ip_address LIKE '216.239.%' OR ip_address LIKE '64.233.%' OR ip_address LIKE '72.14.%'
  OR ip_address LIKE '108.177.%' OR ip_address LIKE '142.250.%' OR ip_address LIKE '172.217.%'
  OR ip_address LIKE '173.194.%'
  OR ip_address IN ('81.161.59.17', '54.198.58.157', '51.54.38.120')
);

-- 6b. Link-burst signature: >= 3 clicks over >= 3 distinct URLs
--     inside any 10-second window for the same lead (+ message when
--     known). All clicks in such a window are scanner clicks.
UPDATE email_events e SET is_bot = true, bot_reason = 'link-burst'
WHERE e.event_type = 'click' AND e.is_bot = false AND EXISTS (
  SELECT 1
  FROM email_events o
  WHERE o.lead_id = e.lead_id
    AND o.event_type = 'click'
    AND COALESCE(o.message_id, '') = COALESCE(e.message_id, '')
    AND o.created_at BETWEEN e.created_at - INTERVAL '10 seconds'
                         AND e.created_at + INTERVAL '10 seconds'
  GROUP BY o.lead_id
  HAVING COUNT(*) >= 3
     AND COUNT(DISTINCT COALESCE(
           o.link_url,
           CASE WHEN o.metadata ~ '^\s*\{' THEN (o.metadata::jsonb ->> 'url') END,
           '')) >= 3
);

-- ── 7. Re-derive counters + engagement score from human events ────
-- Same tier math as server/engagement.ts calculateEngagement():
-- opens +25/+15/+10 at 1/2/3, clicks +35/+15 at 1/2 (max exactly 100).
WITH human AS (
  SELECT lead_id,
         COUNT(*) FILTER (WHERE event_type = 'open')  AS opens,
         COUNT(*) FILTER (WHERE event_type = 'click') AS clicks,
         MAX(created_at)                              AS last_at
  FROM email_events WHERE is_bot = false
  GROUP BY lead_id
),
scored AS (
  SELECT lead_id, opens, clicks, last_at,
         (CASE WHEN opens  >= 1 THEN 25 ELSE 0 END
        + CASE WHEN opens  >= 2 THEN 15 ELSE 0 END
        + CASE WHEN opens  >= 3 THEN 10 ELSE 0 END
        + CASE WHEN clicks >= 1 THEN 35 ELSE 0 END
        + CASE WHEN clicks >= 2 THEN 15 ELSE 0 END) AS score
  FROM human
)
UPDATE leads l SET
  email_opens       = s.opens,
  email_clicks      = s.clicks,
  engagement_score  = LEAST(100, s.score),
  engagement_level  = CASE WHEN s.score >= 40 THEN 'hot'
                           WHEN s.score >= 25 THEN 'warm'
                           WHEN s.score >= 10 THEN 'interested'
                           ELSE 'none' END,
  last_engaged_at   = s.last_at
FROM scored s
WHERE l.id = s.lead_id
  AND (l.email_opens IS DISTINCT FROM s.opens
    OR l.email_clicks IS DISTINCT FROM s.clicks
    OR l.engagement_score IS DISTINCT FROM LEAST(100, s.score));

-- Leads whose every event is a bot event: counters back to zero.
UPDATE leads l SET email_opens = 0, email_clicks = 0, engagement_score = 0,
                   engagement_level = 'none', last_engaged_at = NULL
WHERE (COALESCE(l.email_opens, 0) > 0 OR COALESCE(l.email_clicks, 0) > 0)
  AND NOT EXISTS (
    SELECT 1 FROM email_events e
    WHERE e.lead_id = l.id AND e.is_bot = false
      AND e.event_type IN ('open', 'click')
  );

COMMIT;

-- Notes:
-- * next_step text is intentionally not backfilled; the app refreshes
--   it on the next event or recalculate.
-- * Rollback: DROP the added columns/indexes/constraints; counter
--   values are derived data and need no rollback.
