-- Conversion pipeline diagnostic.
--
-- Run against production to separate "nobody is converting" from "conversions
-- are not being recorded":
--   psql "$DATABASE_URL" -f script/diagnose-conversions.sql
--
-- Interpreting the results is in the header comment above each query.

\echo '=== 1. Landing page traffic vs recorded conversions ==='
-- Visits climbing while conversions stay 0 means the capture path is broken,
-- not the traffic. Before the lead-capture fix, total_conversions was never
-- written by any code path, so 0 here is expected on historical rows.
SELECT
  name,
  slug,
  status,
  total_visits,
  total_conversions,
  CASE WHEN total_visits > 0
       THEN ROUND((total_conversions::numeric / total_visits) * 100, 2)
       ELSE 0 END AS conversion_pct
FROM landing_pages
ORDER BY total_visits DESC
LIMIT 20;

\echo ''
\echo '=== 2. Form submissions actually received ==='
-- Rows here with total_conversions = 0 above prove submissions arrived and were
-- simply never counted. An empty result means nothing ever reached the server.
SELECT
  date_trunc('day', submitted_at) AS day,
  COUNT(*)                        AS submissions,
  COUNT(contact_email)            AS with_email
FROM form_submissions
GROUP BY 1
ORDER BY 1 DESC
LIMIT 30;

\echo ''
\echo '=== 3. Submissions that never became leads ==='
-- Every row returned is a captured prospect that never entered the CRM.
SELECT
  fs.contact_email,
  fs.source_url,
  fs.submitted_at
FROM form_submissions fs
LEFT JOIN leads l ON lower(l.email) = lower(fs.contact_email)
WHERE fs.contact_email IS NOT NULL
  AND l.id IS NULL
ORDER BY fs.submitted_at DESC
LIMIT 50;

\echo ''
\echo '=== 4. Campaign send/engagement counters ==='
-- emails_sent > 0 with emails_opened = 0 across every campaign means open
-- tracking is not wiring up, not that no one opened.
SELECT
  name,
  status,
  total_leads,
  emails_sent,
  emails_opened,
  emails_replied,
  emails_bounced,
  opportunities
FROM campaigns
ORDER BY emails_sent DESC
LIMIT 20;

\echo ''
\echo '=== 5. Per-recipient engagement (ground truth) ==='
-- campaign_leads is written per send. Compare its totals against the campaign
-- counters above; a mismatch localizes the break to the roll-up.
SELECT
  status,
  COUNT(*)             AS enrollments,
  SUM(sent_count)      AS sends,
  SUM(open_count)      AS opens,
  SUM(click_count)     AS clicks
FROM campaign_leads
GROUP BY status
ORDER BY enrollments DESC;

\echo ''
\echo '=== 6. Raw email events (pixel + click redirect hits) ==='
-- These rows are written directly by /t/o/:leadId and /t/c/:leadId. Events here
-- with zeroed campaign counters confirm tracking works and roll-up does not.
SELECT
  event_type,
  date_trunc('day', created_at) AS day,
  COUNT(*)                      AS events
FROM email_events
GROUP BY 1, 2
ORDER BY 2 DESC, 1
LIMIT 30;

\echo ''
\echo '=== 7. Lead pipeline by status ==='
-- conversion_rate counts qualified/won/customer/converted only. If everything
-- is stuck in new/contacted, the funnel really is stalling at outreach.
SELECT
  status,
  COUNT(*) AS leads,
  ROUND((COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER (), 0)) * 100, 1) AS pct
FROM leads
GROUP BY status
ORDER BY leads DESC;

\echo ''
\echo '=== 8. Lead source attribution ==='
-- Shows whether any leads originate from landing pages or forms at all.
SELECT
  source,
  COUNT(*)          AS leads,
  MAX(created_at)   AS most_recent
FROM leads
GROUP BY source
ORDER BY leads DESC
LIMIT 25;

\echo ''
\echo '=== 9. Appointments booked (the end of the funnel) ==='
SELECT
  date_trunc('week', created_at) AS week,
  COUNT(*)                       AS appointments
FROM appointments
GROUP BY 1
ORDER BY 1 DESC
LIMIT 12;

\echo ''
\echo '=== 10. Stored dashboard stats ==='
-- conversion_rate was previously copied forward rather than computed, so any
-- non-zero value predates that bug or was written manually.
SELECT user_id, total_leads, active_leads, appointments_booked, conversion_rate, revenue, updated_at
FROM dashboard_stats
ORDER BY updated_at DESC
LIMIT 10;
