---
name: Outreach auto-send gating
description: How cold-email sending is gated in this app — score threshold + CAN-SPAM — so bulk lead changes don't trigger accidental sends.
---

# Outreach auto-send gating

**Rule:** A scheduler (AutoEngage, `server/routes.ts`) runs every ~10 min and automatically
generates + SENDS outreach to any lead with `score >= 40`. The platform SES sender is always
available, so **score is effectively the only gate** on whether a lead gets cold-emailed.

**Why it matters:** Any bulk lead import/enrichment that raises `score` to >= 40 will cause
those leads to be cold-emailed with no further confirmation. Enrichment code must therefore
**cap** score below 40, not just floor it: `Math.min(Math.max(existing, 25), 39)`. A floor-only
`Math.max(existing, 25)` leaves any pre-existing >=40 lead sendable.

**Compliance gate (separate, also required before ANY send):** US CAN-SPAM requires a real
physical mailing address + a working unsubscribe link/footer in every cold email. As of the
Atlanta private-practice campaign, the tenant (Track-Med) had provided **neither** — the user
declined to give a mailing address. Do NOT arm sending until both exist, regardless of score.

**How to apply:** When writing any feature that mutates lead score in bulk (import, enrichment,
scoring), keep leads < 40 until the user explicitly arms outreach AND compliance footer/address
are in place.

## AI provider note (related, may go stale)
This repl's `OPENAI_API_KEY` was invalid (401) and `ANTHROPIC_API_KEY` is NOT a real `sk-ant-`
key. The working AI path is the Replit Anthropic proxy (`AI_INTEGRATIONS_ANTHROPIC_*`).
`intelligence-engine.ts` `aiExtract` falls back OpenAI -> Anthropic-proxy for this reason.
Re-check whether OpenAI has been fixed before assuming it's still down.
