---
name: Production email sending & custom-domain routing
description: Why prod emails 535'd and why the custom domain's POSTs fail — how to reach the real backend and fix stale SMTP creds
---

## Custom domain does NOT reach the backend
The user's custom domain (apex + www) is fronted by an external static proxy that only serves GET/HEAD — any POST returns a bare `405` with `allow: GET, HEAD` (no `via: google`, no `x-powered-by: Express`). The real autoscale backend is only reachable at the generated Replit `*.replit.app` URL (POST there hits Express).
**How to apply:** To drive prod admin/API endpoints or curl the live backend, use the `.replit.app` URL from `getDeploymentInfo().additionalUrls`, NOT the custom domain. The custom-domain misrouting is a user-side DNS/proxy issue to fix separately; it does not affect server-side cron.

## SMTP 535 root cause
Per-user SMTP settings stored in the DB (encrypted) take precedence over env `SMTP_*` in the send-config resolvers. A stale stored password (decrypts fine but wrong) caused `535 Invalid Username or Password` on every send, masking the valid env creds.
**Why:** a decrypt failure returns null (which would harmlessly fall back to env), so a persistent 535 means the stored value is genuinely wrong, not a key mismatch.
**How to apply:** The env `SMTP_*` secrets ARE valid and the mail server accepts the configured From address. Fix = clear the per-user override so sends fall back to env (admin-guarded endpoint nulls the stored smtp_* fields, keeps sender identity). Prefer this over editing the stored password.

## Cron reliability caveat
Outreach/follow-up run via `setInterval` inside the web process (small batches on a timer). On autoscale (scale-to-zero) these only fire while an instance is warm. For guaranteed background sending, a Reserved VM is more reliable.
