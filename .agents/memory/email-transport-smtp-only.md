---
name: Email transport is SMTP-only (Plesk)
description: All email now routes through one nodemailer SMTP helper; SendGrid and Postal were removed by explicit user request.
---
All outbound mail (system/auth, outreach, follow-up, inbox auto-reply, team invites, workflow send_email, marketing autopilot, quota-tracked sends) routes through `server/smtp.ts` `sendViaSmtp()` using env SMTP_HOST/PORT/USERNAME/PASSWORD (port 465 => secure), with optional per-user overrides.

**Why:** User (Track-Med tenant) explicitly said "none will be used, remove them all" for SendGrid + Postal — sends FROM info@track-med.com via direct Plesk SMTP.

**How to apply:**
- Do NOT reintroduce `@sendgrid/mail` or a `postalService`. `server/postal.ts` + `server/postal-routes.ts` were deleted.
- `sendViaSmtp` returns `{success,error,messageId}` — it has NO provider token. Legacy `postalToken`/`postalMsgId` columns still exist but are written null; harmless, leave them.
- White-label sending domains (`server/domain-engine.ts`, SES/Postal-era verification, local `POSTAL_SERVER_ID=1`) are now decoupled from actual transport — all mail goes through the single Plesk SMTP account regardless of domain "verified" state. Feature is effectively cosmetic until reworked for SMTP. Flag before relying on it.
- Some outreach/follow-up/custom-SMTP branches still build their own nodemailer transport inline (still Plesk SMTP, just not via the shared helper). Works; unify only if asked.
