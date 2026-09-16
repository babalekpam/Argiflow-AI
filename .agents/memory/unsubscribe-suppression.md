---
name: unsubscribe suppression must be status-overwrite-proof
description: Why unsubscribe can silently break in this app, and the invariant that keeps it working.
---

# Unsubscribe suppression is status-based and fragile

Outreach send-eligibility keys off `leads.status`. Send functions return early when
`status === "unsubscribed"`. There is no dedicated suppression column — the status
value IS the suppression flag.

**Why this is fragile:** engagement tracking overwrites `status`. Email opens (`/t/o/:leadId`),
link clicks (`/t/c/:leadId`), the `/api/email-analytics` recompute, and the startup
engagement-repair job all promote leads to `hot`/`warm` based on `calculateEngagement`.
If any of these flips an unsubscribed lead back to `hot`, the send guards stop
blocking and the lead gets emailed again — a CAN-SPAM violation.

**Invariant to preserve:** every place that writes `status` must never move a lead
OUT of `unsubscribed`. The "hot" promotion condition is guarded with
`&& lead.status !== "unsubscribed"` at all sites (open, click, analytics, recompute,
repair). Warm promotions are already safe because they only promote from `new`/`cold`.

**How to apply:** if you add any new path that sets `leads.status`, add the same
`status !== "unsubscribed"` guard, or better, gate on it before assigning. Grep for
`level === "hot"` to find the promotion sites. A cleaner long-term fix (not yet done
due to the db:push data-loss trap) is a dedicated immutable `unsubscribedAt` column
enforced in send-selection queries.
