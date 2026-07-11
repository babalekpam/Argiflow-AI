# API & Server Rules

## Route Structure
- One file per feature: `server/<feature>-routes.ts`
- Register all routes centrally in `server/routes.ts`
- Mount path: `/api/<feature>`

## Validation
- Validate every `req.body` with Zod before touching it — reject with 400 on failure
- Validate `req.params` / `req.query` with Zod when they influence DB queries
- Never trust client-supplied IDs without confirming ownership (check `userId` in query)

## Auth
- Apply `requireAuth` (defined in `server/routes.ts`) on every protected endpoint
- `req.user` is the Passport-authenticated user — cast it when typed access is needed
- Never expose password hashes or session tokens in API responses

## AI / LLM Calls
- Use `callLLM()` from `server/llm-router.ts` — never import provider SDKs directly in routes
- Always deduct credits before the call via `server/credits.ts`; refund atomically on failure
- Respect the user's BYOK provider setting before falling back to the platform key

## Error Handling
- Wrap async handlers in try/catch and call `next(err)` on unexpected errors
- Return consistent error shape: `{ error: string, code?: string }`
- Never leak stack traces to the client in production

## Multi-Region
- Read region from `server/region-config.ts` — never hardcode "USD" or market names in routes
- Region-specific pricing, agent catalogs, and feature flags all live in that config
