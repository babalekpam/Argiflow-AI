# Security Rules

## Authentication
- Every endpoint that accesses user data MUST apply requireAuth
- Never return another user s data -- always filter by req.user.id
- Password reset and email verification tokens must be single-use and time-limited

## Input Validation
- Validate all inputs at the API boundary with Zod -- no exceptions
- Treat URL params and query strings as untrusted user input
- Validate file uploads: check MIME type and size before processing

## SQL / Injection
- Drizzle ORM parameterizes queries automatically -- use it for all standard tables
- Raw SQL (Aria tables) must use dollar-sign placeholders -- never string concatenation
- Never pass raw user strings into LIKE patterns without escaping percent and underscore

## Secrets and Credentials
- Never commit .env files or hardcode API keys in source
- Read secrets from process.env only -- fail fast with a clear error if missing
- Aria connector credentials (SES, Twilio, Stripe) come from aria_tokens table, not per-user env vars

## External APIs
- Validate and sanitize URLs before making outbound requests (SSRF risk)
- The free scraper and intelligence engine make external HTTP calls -- never expose internal endpoints

## Stripe Webhooks
- Verify webhook signatures with stripe.webhooks.constructEvent() before processing
- Raw body must be preserved before any JSON middleware touches the request
- Webhook handler lives in server/stripe-routes.ts

## Do Not
- Do not log full request bodies in production (may contain PII or credentials)
- Do not expose stack traces to clients in production
- Do not store plaintext passwords -- Passport handles hashing; never bypass it
