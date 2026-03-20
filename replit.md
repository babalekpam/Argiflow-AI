# ArgiFlow - Automated Client Acquisition Platform

## Overview
ArgiFlow is a SaaS platform designed for automated client acquisition, leveraging AI agents to drive business growth. It provides a comprehensive solution for lead generation, nurturing, appointment booking, and ad optimization. The platform serves both Western (ArgiFlow) and African (TradeFlow) markets with region-specific features and pricing, aiming to enhance efficiency in client acquisition and management. Key capabilities include AI-powered sales intelligence, autonomous marketing, and a robust workflow automation engine.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.

## System Architecture
**Frontend**: React, TypeScript, Vite, TailwindCSS, shadcn/ui.
**Backend**: Express.js with TypeScript.
**Database**: PostgreSQL with Drizzle ORM.
**Authentication**: Email/password with session-based authentication, email verification, and password reset.
**UI/UX Design**: Dark theme with sky blue gradient accents and Inter font.
**Core Features**:
- **Consolidated Navigation**: Streamlined dashboard with unified pages for AI Agents, Analytics, Automations, Email & Outreach, Intelligence, and Learning.
- **AI Integration**: Utilizes OpenAI (GPT-4o) as the primary AI provider. Multi-LLM router supports 9 providers: OpenAI, Anthropic, Google Gemini, Mistral, Groq, Together AI, Cohere, OpenRouter, Ollama (local). The `argiflow-ai-adapter/` package provides a unified `ai.chat()` API, with `/api/ai/providers` (list), `/api/ai/test` (verify), `/api/ai/provider` (runtime switch). Per-user BYOK (Bring Your Own Key) via Settings > AI Provider.
- **B2B Sales Intelligence Engine**: Aggregates data from multiple sources (OpenCorporates, SEC EDGAR, Wikidata, GitHub, RDAP/WHOIS, DuckDuckGo, web search) to provide comprehensive company and people intelligence, including lead discovery, enrichment, intent data, and technographic scanning. A "Free Lead Intelligence Scraper" offers zero-cost lead discovery.
- **AI Agents**: A console for 13+ specialized AI agents, including those for lead scouting, email outreach, intent monitoring, and meeting booking. The platform also features an autonomous AI Outreach Agent that integrates email, sales intelligence, and CRM for an 8-step outreach loop.
- **Workflow Automation Engine**: An n8n-style engine supporting event-driven automation, various action types, and AI-powered workflow generation.
- **Email Infrastructure Engine**: Comprehensive email management including account management, warmup, campaign builder, unified inbox with AI classification, website visitor identification, email verification, and white-label sending domains via AWS SES. Features an AI Copilot for content generation and a monthly email quota system.
- **Voice AI Calling**: AI-powered phone calls via Twilio, integrating Deepgram for real-time speech-to-text and text-to-speech.
- **AI Marketing Suite & Autopilot**: A 33-skill AI marketing toolkit and an autonomous AI agent that generates 30-day marketing plans and executes campaigns across various channels.
- **AI Website Builder**: Allows users to generate complete website structures with content and layout using natural language, supporting e-commerce with supplier integration and AI pricing optimization.
- **Visitor Tracking & Analytics Engine**: Embeddable JavaScript snippet for detailed website visitor intelligence, tracking page views, sessions, clicks, form behavior, and custom events. Includes **Visitor Intelligence Engine** (`server/visitor-intelligence.ts`) that cross-references anonymous visitor IPs with email tracking data (open/click IPs) to identify visitors, matches them to existing leads, computes intent scores based on pages viewed and CTAs clicked, and feeds this intelligence into Aria's decision-making. API: `/api/aria/visitor-intelligence`.
- **AI Business Manager (Aria)**: An autonomous AI agent that manages the business as the tenant. Two-tier architecture: (1) Legacy Business Manager with form-based config, decision logs, and scheduled cycles (`server/business-manager.ts`, `/api/business-manager/*`). (2) **Aria** — advanced conversational AI manager with: conversational onboarding (AriaDiscovery), chat interface, action approval workflow (supervised/semi-auto/autopilot), real tool connectors (SES email, Twilio SMS, Stripe revenue), daily briefings, and 15-minute autonomous cycles. Backend: `server/aria-memory.ts` (raw SQL data layer for 10 `aria_*` tables), `server/aria-discovery.ts` (onboarding), `server/aria-agent.ts` (chat + cycle engine + briefings), `server/aria-connectors.ts` (SES/Twilio/Stripe), `server/aria-routes.ts` (mounted at `/api/aria`). Frontend: `client/src/pages/business-manager.tsx` (Aria UI with tabs: Overview, Chat, Approvals, Activity, Briefings, Connectors, Settings). DB tables: `aria_business`, `aria_leads`, `aria_actions`, `aria_emails`, `aria_meetings`, `aria_snapshots`, `aria_discovery`, `aria_chat`, `aria_briefings`, `aria_tokens` (created via raw SQL, not Drizzle).
- **Credits System**: A per-action credit billing system with atomic deduction and auto-refund on failure.
- **Multi-Region Support**: Distinct branding, agent catalogs, pricing, and currencies for Western and African markets.

## External Dependencies
- **OpenAI**: Primary AI provider for various AI features.
- **Anthropic Claude**: Optional AI provider, also used for web search fallback.
- **Tavily**: Default web search provider.
- **You.com Search API**: Alternative web search provider.
- **Amazon SES**: Primary email sending service.
- **Postal**: Self-hosted mail server for email fallback.
- **SendGrid**: Fallback email service.
- **Twilio**: SMS and Voice AI services.
- **Deepgram**: Speech-to-text and text-to-speech for Voice AI.
- **Venmo**: Payment gateway.
- **Replit AI Integrations**: Used for Anthropic Claude integration.
- **Replit Connectors**: Used for Twilio integration.