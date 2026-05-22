# ArgiFlow AI — CLAUDE.md

## Project Overview

ArgiFlow is a multi-region SaaS B2B platform for AI-powered client acquisition. It combines lead generation, email/SMS/voice outreach, CRM, workflow automation, AI agents, email infrastructure, website builder, and analytics into a single platform. It supports two market regions: **Western** (ArgiFlow branding) and **African** (TradeFlow branding).

## Rules & Constraints

- **Do NOT modify anything inside the `Z/` folder.**
- Ask before making major architectural changes.
- Prefer iterative development; break large changes into small steps.
- Default AI model for new AI calls: `claude-sonnet-4-6` (Anthropic) or `gpt-4o` (OpenAI).

---

## Tech Stack

| Layer       | Technology                                                        |
|-------------|-------------------------------------------------------------------|
| Frontend    | React 18, TypeScript, Vite, TailwindCSS v3, shadcn/ui (Radix UI) |
| Routing     | `wouter` (client-side), Express.js (server-side)                 |
| Backend     | Express.js 5, TypeScript, `tsx` for dev execution                |
| Database    | PostgreSQL via `drizzle-orm` (node-postgres driver)              |
| ORM/Schema  | Drizzle ORM + drizzle-zod for validation schemas                 |
| Auth        | `passport` + `passport-local`, `express-session`, `connect-pg-simple` |
| AI          | Anthropic SDK, OpenAI SDK, multi-LLM router (9 providers)        |
| Email       | AWS SES, SendGrid, Nodemailer/SMTP, Postal (self-hosted)         |
| Voice       | Twilio + Deepgram (real-time STT/TTS via WebSocket)              |
| Payments    | Stripe                                                           |
| State mgmt  | TanStack Query v5                                                |
| i18n        | i18next (EN/FR)                                                  |

---

## Directory Structure

```
/
├── client/
│   ├── index.html
│   ├── public/              # Static assets (favicon, tracker script, SVGs)
│   └── src/
│       ├── App.tsx          # Root router (wouter Switch)
│       ├── main.tsx         # React entry point
│       ├── index.css        # Global styles + Tailwind directives
│       ├── components/
│       │   ├── ui/          # shadcn/ui primitives (DO NOT edit; regenerate via CLI)
│       │   ├── app-sidebar.tsx
│       │   ├── aria-widget.tsx
│       │   └── ...
│       ├── hooks/
│       │   ├── use-auth.ts   # Auth state (session-based)
│       │   └── ...
│       ├── i18n/
│       │   ├── index.ts
│       │   └── locales/     # en.json, fr.json
│       ├── lib/
│       │   ├── queryClient.ts  # TanStack Query singleton
│       │   └── utils.ts
│       └── pages/           # One file per route/feature page
├── server/
│   ├── index.ts             # Express app entry, WebSocket attach
│   ├── routes.ts            # Master route registry (registers all sub-routers)
│   ├── db.ts                # Drizzle + pg Pool export
│   ├── storage.ts           # IStorage interface + DatabaseStorage class
│   ├── llm-router.ts        # Multi-provider LLM abstraction
│   ├── ai-provider.ts       # Per-user AI provider resolution
│   ├── aria-agent.ts        # Aria conversational AI manager
│   ├── aria-memory.ts       # Raw SQL layer for aria_* tables
│   ├── aria-routes.ts       # /api/aria routes
│   ├── aria-connectors.ts   # SES/Twilio/Stripe connectors for Aria
│   ├── aria-discovery.ts    # Aria onboarding flow
│   ├── agent-catalog.ts     # Agent definitions + region config
│   ├── region-config.ts     # Western/African region branding/pricing
│   ├── intelligence-engine.ts
│   ├── workflow-engine.ts
│   ├── sequence-automation.ts
│   ├── email-quota-engine.ts
│   ├── domain-engine.ts
│   ├── marketing-autopilot.ts
│   ├── outreach-agent.ts
│   ├── free-scraper.ts      # DDG/Bing scraper for free lead discovery
│   ├── visitor-intelligence.ts
│   ├── twilio.ts
│   ├── postal.ts
│   ├── credits.ts
│   ├── voice-stream.ts      # WebSocket voice AI (Twilio + Deepgram)
│   ├── static.ts            # Production static file serving
│   ├── vite.ts              # Dev Vite middleware
│   ├── agents/              # Specialized agent implementations
│   ├── marketing-skills/    # 33-skill AI marketing toolkit
│   └── replit_integrations/ # Auth + Replit-specific helpers
├── shared/
│   ├── schema.ts            # Master Drizzle schema + Zod types (re-exports sub-schemas)
│   ├── models/
│   │   ├── auth.ts          # users, sessions tables + register/login schemas
│   │   └── chat.ts
│   ├── workflow-schema.ts
│   ├── instantly-schema.ts
│   ├── intelligence-schema.ts
│   ├── email-quota-schema.ts
│   ├── domain-schema.ts
│   ├── marketing-autopilot-schema.ts
│   └── business-manager-schema.ts
├── argiflow-ai-adapter/     # Unified ai.chat() package (multi-provider)
├── script/
│   └── build.ts             # Production build (Vite + esbuild)
├── Z/                       # DO NOT MODIFY
├── drizzle.config.ts
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Development Workflow

### Start dev server
```bash
npm run dev          # NODE_ENV=development tsx server/index.ts
```
Server runs on port `5000`. Vite dev middleware is attached in dev mode — the Express server serves both API and the React client.

### Type checking
```bash
npm run check        # tsc --noEmit
```

### Production build
```bash
npm run build        # Vite (client → dist/public) + esbuild (server → dist/index.cjs)
npm run start        # NODE_ENV=production node dist/index.cjs
```

### Database schema push
```bash
npm run db:push      # drizzle-kit push — syncs schema to DATABASE_URL
```
There are no migration files; the project uses `drizzle-kit push` (direct schema sync). Run this after any schema change.

---

## Environment Variables

| Variable              | Required | Purpose                                      |
|-----------------------|----------|----------------------------------------------|
| `DATABASE_URL`        | Yes      | PostgreSQL connection string                 |
| `SESSION_SECRET`      | Yes      | Express session secret                       |
| `ANTHROPIC_API_KEY`   | No       | Default Anthropic key (fallback)             |
| `OPENAI_API_KEY`      | No       | Default OpenAI key (fallback)                |
| `SENDGRID_API_KEY`    | No       | SendGrid email sending                       |
| `AWS_ACCESS_KEY_ID`   | No       | AWS SES                                      |
| `AWS_SECRET_ACCESS_KEY`| No      | AWS SES                                      |
| `AWS_REGION`          | No       | AWS SES region                               |
| `TWILIO_ACCOUNT_SID`  | No       | Twilio SMS/Voice                             |
| `TWILIO_AUTH_TOKEN`   | No       | Twilio SMS/Voice                             |
| `STRIPE_SECRET_KEY`   | No       | Stripe payments                              |
| `STRIPE_WEBHOOK_SECRET`| No      | Stripe webhook validation                    |
| `TAVILY_API_KEY`      | No       | Web search (default provider)                |
| `PORT`                | No       | Server port (default: 5000)                  |

Per-user API keys are stored in `user_settings` (BYOK model) and take precedence over env vars at runtime.

---

## Architecture Patterns

### Path Aliases
```typescript
"@/*"       → client/src/*
"@shared/*" → shared/*
"@assets/*" → attached_assets/*
```

### API Layer
All API routes are mounted under `/api`. Routes are registered in `server/routes.ts` via `registerRoutes(httpServer, app)`, which imports and mounts each domain-specific sub-router.

Pattern for a new route file:
```typescript
// server/my-feature-routes.ts
import type { Express } from "express";
export function registerMyFeatureRoutes(app: Express) {
  app.get("/api/my-feature", async (req, res) => { ... });
}

// in server/routes.ts:
import { registerMyFeatureRoutes } from "./my-feature-routes";
registerMyFeatureRoutes(app);
```

### Authentication
Session-based auth using `passport-local`. All protected routes check `req.isAuthenticated()` or `req.user`. The `use-auth.ts` hook on the client queries `/api/auth/user` to determine auth state.

Auth tables: `users`, `sessions` (PostgreSQL-backed sessions via `connect-pg-simple`).

### Database Access
Use the `db` export from `server/db.ts`. Use `storage` (the `DatabaseStorage` singleton from `server/storage.ts`) for standard CRUD — it implements the `IStorage` interface. Use `db` directly for complex queries not covered by `IStorage`.

```typescript
import { db } from "./db";
import { storage } from "./storage";
import { leads } from "@shared/schema";
import { eq } from "drizzle-orm";

// via storage
const lead = await storage.getLeadById(id);

// direct Drizzle
const rows = await db.select().from(leads).where(eq(leads.userId, userId));
```

### Schema Conventions
- All table PKs: `varchar("id").primaryKey().default(sql\`gen_random_uuid()\`)`
- Timestamps: `timestamp("created_at").defaultNow()`
- Every table has a corresponding `insert*Schema` (drizzle-zod), `type *` (select), and `type Insert*` (insert)
- Sub-schemas live in `shared/*-schema.ts` files and are re-exported via `shared/schema.ts`
- Aria tables (`aria_*`) are managed via raw SQL in `server/aria-memory.ts`, NOT via Drizzle schema

### Multi-LLM Router
`server/llm-router.ts` provides a unified interface for 9 AI providers. `server/ai-provider.ts` resolves the correct provider/model for a given user (checks user settings BYOK keys first, then falls back to env vars). Always use `ai-provider.ts` for per-user AI calls.

### Credits System
Every AI action deducts credits atomically via `server/credits.ts`. Credits are stored on `users.credits`. Auto-refund on failure.

### Plan Limits
Defined as `PLAN_LIMITS` in `shared/schema.ts`. Plans: `starter` ($297), `growth` ($597), `agency` ($1497). Enforced per-user via `subscriptions` table.

### Region System
`server/region-config.ts` defines Western vs. African market configs. User region stored in `users.region`. Agent catalog is filtered by region via `getAgentsByRegion()` in `server/agent-catalog.ts`.

---

## Frontend Conventions

### Routing
`wouter` is used (not React Router). `App.tsx` defines the top-level `<Switch>`. All dashboard sub-pages are rendered inside `DashboardLayout` (`client/src/pages/dashboard-layout.tsx`).

### Data Fetching
TanStack Query v5. Use `queryClient` from `client/src/lib/queryClient.ts`. Standard pattern:
```typescript
const { data } = useQuery({ queryKey: ["/api/leads"], queryFn: () => fetch("/api/leads").then(r => r.json()) });
```

### UI Components
shadcn/ui components live in `client/src/components/ui/`. Do not manually edit these; use the shadcn CLI to add/update primitives. Custom components go in `client/src/components/`.

### Styling
TailwindCSS v3. Dark theme is default (class-based dark mode via `next-themes`). Primary accent: sky blue (`#38bdf8`). Brand green: `#00e5a0`. Use `cn()` from `client/src/lib/utils.ts` for conditional class merging.

### Internationalization
i18next with `react-i18next`. Translation files: `client/src/i18n/locales/en.json` and `fr.json`. Use `useTranslation()` hook in components.

---

## Key Systems

### Aria (AI Business Manager)
- **Backend**: `aria-memory.ts` → `aria-discovery.ts` → `aria-agent.ts` → `aria-connectors.ts` → `aria-routes.ts`
- **DB**: 10 `aria_*` tables created via raw SQL (not in Drizzle schema)
- **API**: All routes at `/api/aria/*`
- **Frontend**: `client/src/pages/business-manager.tsx`

### Workflow Engine
- `server/workflow-engine.ts` — n8n-style event-driven automation
- Schema: `shared/workflow-schema.ts`
- Routes: `server/workflow-routes.ts` + `server/workflow-hooks.ts`

### Email Infrastructure
- Providers: AWS SES (primary) → Postal (secondary) → SendGrid (fallback) → SMTP
- Quota tracking: `server/email-quota-engine.ts` / `shared/email-quota-schema.ts`
- Warmup, campaigns, unified inbox: `server/instantly-engine.ts`

### Voice AI
- WebSocket server attached to HTTP server in `server/voice-stream.ts`
- Twilio for calls, Deepgram for real-time STT/TTS

### Visitor Tracking
- Embeddable snippet: `client/public/argiflow-tracker.js`
- Server routes: `server/tracker-routes.ts`
- Intelligence engine: `server/visitor-intelligence.ts`
- Email-to-web identity bridge: `_afref=TOKEN` query param on clicked links

### Sequence Automation
- Multi-channel drip sequences (email/SMS/LinkedIn)
- Engine: `server/sequence-automation.ts`
- Schema: `sequences`, `sequenceSteps`, `sequenceEnrollments` in `shared/schema.ts`

---

## Logging

`server/index.ts` exports a `log(message, source)` utility. API responses auto-log method, path, status, duration. Sensitive keys (`password`, `token`, `apiKey`, etc.) are redacted in logs.

## Health Check

`GET /health` → `{ status: "ok" }` — no auth required.
