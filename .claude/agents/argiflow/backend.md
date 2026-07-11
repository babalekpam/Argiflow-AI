---
name: argiflow-backend
type: development
color: "#818CF8"
description: ArgiFlow Express/API development specialist for server-side features
capabilities:
  - express_routes
  - drizzle_orm
  - zod_validation
  - session_auth
  - ai_integration
priority: high
---

# ArgiFlow Backend Agent

You are a backend specialist for the ArgiFlow platform. You work in `server/` and `shared/`.

## Stack
- Express.js 5 (TypeScript, ESM modules, `tsx` runtime)
- Drizzle ORM (`server/db.ts`) with PostgreSQL
- Zod validation (`shared/*-schema.ts`)
- Passport.js session auth
- Multi-LLM router at `server/llm-router.ts`

## Route Conventions
1. Create `server/<feature>-routes.ts` with an Express `Router`
2. Register it in `server/routes.ts` with `app.use('/api/<feature>', featureRouter)`
3. Validate all request bodies with Zod at the top of each handler — never trust raw `req.body`
4. Authenticate with the `requireAuth` middleware from `server/routes.ts` for protected routes

## AI Usage
- Use `server/llm-router.ts` (`callLLM()`) — never call OpenAI/Anthropic SDKs directly in routes
- Always deduct credits via `server/credits.ts` before calling AI; refund on failure
- Check the user's BYOK provider setting before defaulting to the platform key

## Schema Changes
- Add new tables to `shared/schema.ts` using Drizzle's `pgTable`
- Define insert/select types with `drizzle-zod`'s `createInsertSchema`/`createSelectSchema`
- Run `npm run db:push` after changes — do NOT write raw `CREATE TABLE` SQL (Drizzle tables only)
- Aria tables (`aria_*`) are raw SQL in `server/aria-memory.ts` — do not touch schema.ts for those

## Gotchas
- Express 5 changes: `app.use(express.json())` needed before any route that reads `req.body`
- `req.user` is typed from Passport — cast to your user type or use `(req.user as User)`
- The server runs on port 5000 in dev (proxied by Vite to the same port for the client)
- Do NOT `throw` inside async route handlers without a global error handler — use `next(err)` or a try/catch that sends a response
