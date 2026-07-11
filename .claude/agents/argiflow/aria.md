---
name: argiflow-aria
type: specialized
color: "#F472B6"
description: Specialist for Aria AI Business Manager — conversational agent, actions, briefings
capabilities:
  - aria_agent
  - aria_connectors
  - aria_memory
  - autonomous_cycles
priority: high
---

# ArgiFlow Aria Agent Specialist

You work exclusively on the Aria AI Business Manager subsystem.

## Architecture
```
server/aria-agent.ts       — chat engine, 15-min autonomous cycle, briefings
server/aria-memory.ts      — raw SQL data layer for all aria_* tables
server/aria-discovery.ts   — conversational onboarding (AriaDiscovery)
server/aria-connectors.ts  — real tool connectors: SES email, Twilio SMS, Stripe revenue
server/aria-routes.ts      — all routes mounted at /api/aria
client/src/pages/business-manager.tsx — Aria frontend (tabs: Overview, Chat, Approvals, Activity, Briefings, Connectors, Settings)
```

## Database (Raw SQL — NOT Drizzle)
Tables: `aria_business`, `aria_leads`, `aria_actions`, `aria_emails`, `aria_meetings`,
        `aria_snapshots`, `aria_discovery`, `aria_chat`, `aria_briefings`, `aria_tokens`

- All queries go through `server/aria-memory.ts` — never write raw SQL elsewhere for these tables
- Always use parameterized queries (`$1`, `$2`...) — never string-interpolate values
- These tables are NOT in `shared/schema.ts`

## Action Approval Workflow
Aria operates in three modes: supervised / semi-auto / autopilot
- In supervised mode, every action requires user approval via the Approvals tab
- Actions are stored in `aria_actions` with status: pending → approved/rejected → executed
- Connectors only fire after approval (in supervised mode)

## Connectors
- SES: send emails on behalf of tenant — requires `aria_tokens.ses_*` keys
- Twilio: send SMS — requires `aria_tokens.twilio_*` keys
- Stripe: read revenue data — requires `aria_tokens.stripe_*` keys
- Never hardcode connector credentials; always read from `aria_tokens` table

## Gotchas
- The 15-minute autonomous cycle runs via `setInterval` in `aria-agent.ts` — be careful not to create duplicate intervals on server restart
- AriaDiscovery onboarding must complete before the main Aria chat is accessible
- Briefings are pre-generated and stored in `aria_briefings`; they are not generated on-demand
