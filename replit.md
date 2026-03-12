# ArgiFlow - Automated Client Acquisition Platform

## Overview
ArgiFlow is a SaaS platform for automated client acquisition, using AI agents to drive business growth. It automates lead generation, nurturing, appointment booking, and ad optimization. The platform supports both Western (ArgiFlow) and African (TradeFlow) markets with region-specific features and pricing, aiming to provide a comprehensive solution for efficient client acquisition and management.

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
**Authentication**: Email/password with session-based authentication using scrypt hashing, including email verification and password reset.
**AI Integration**: OpenAI GPT-4o as primary AI provider for B2B Intelligence Engine (strong reasoning). GPT-4o-mini used for general chat and lightweight tasks. Anthropic Claude available as optional override via per-user API keys. OpenAI-to-Anthropic compatibility wrapper ensures seamless provider switching.
**B2B Intelligence Data Pipeline**: Multi-source data aggregation from 7+ databases: OpenCorporates (government registries), SEC EDGAR (public company filings), Wikidata/Wikipedia (knowledge base), GitHub API (developer/tech companies), RDAP/WHOIS (domain registration), DuckDuckGo Instant Answers (knowledge graph), plus Tavily/You.com web search. GPT-4o cross-references all sources for comprehensive, ZoomInfo/Apollo-level company and people intelligence.
**UI/UX Design**: Dark theme with sky blue gradient accents and Inter font.
**Core Features**:
- **User Management**: Standard authentication and account management.
- **Dashboard**: Centralized overview of business metrics.
- **CRM & Leads**: Tracking, scoring, engagement analysis, and automated outreach, supporting multiple business profiles per user.
- **Sales Funnels**: Kanban-style pipeline with deal management and analytics.
- **Appointment Scheduling**: Client appointment management.
- **AI Agent Management**: Catalog of specialized AI agents with configuration and task management.
- **Email & SMS Campaigns**: AI-assisted creation, bulk sending, and tracking.
- **Marketing Strategy**: AI-generated personalized marketing strategies.
- **Website Training**: AI analysis of user websites for personalized agent responses.
- **Automations**: Workflow automation with templates.
- **Notifications**: Real-time alerts for agent activities and system events.
- **Admin Panel**: Super admin access for system management.
- **Multi-Region Support**: Distinct branding, agent catalogs, pricing, and currencies for Western and African markets.
- **Lead Management**: Scheduling and canceling outreach for leads.
- **Agent-to-Funnel Auto-Pipeline**: Automatic assignment of leads discovered by agents to predefined sales funnels.
- **Voice AI Calling**: AI-powered phone calls via Twilio with real-time streaming pipeline (Twilio Media Streams → Deepgram STT → Claude AI streaming → Deepgram TTS → Twilio). Falls back to TwiML Gather/Say if Deepgram not configured. WebSocket at `/api/voice/stream/:callLogId`.
- **Automated Lead Generation**: Background jobs for generating specialized leads (e.g., medical billing) using AI.
- **Automated Follow-Up Sequences**: AI-generated, multi-step email sequences for leads, stopping on engagement.
- **Workflow Automation Engine**: An n8n-style engine with event bus, execution, and API endpoints, supporting various action types and AI-powered workflow generation from templates.
- **AI Inbox Monitor & Auto-Reply**: Monitors IMAP inbox for lead replies, generates AI responses, and updates lead status.
- **Email Infrastructure Engine**: Comprehensive email management including account management, warmup, campaign builder, unified inbox (Unibox) with AI classification, website visitor identification, email verification, and inbox placement testing. Includes an AI Copilot for content generation.
- **B2B Sales Intelligence Engine**: Provides Apollo.io/ZoomInfo-style capabilities for people and company search, contact/company enrichment, email/phone finding, intent data detection, technographic scanning, org chart building, news & events, AI-powered deep research, and prospect list management.
- **AI Outreach Agent**: An autonomous agent that integrates email infrastructure, sales intelligence, and CRM for an 8-step outreach loop: discover, enroll, send, monitor, classify, respond, book, and repeat.
- **Free Lead Intelligence Scraper**: Zero-cost lead discovery and enrichment engine using 12 free data sources (DuckDuckGo, Bing, YellowPages, Manta, LinkedIn dorks, website scraping, RDAP/WHOIS, DNS/MX verification, email pattern generation, Hunter.io free tier, SEC EDGAR, Clearbit logos). API at `/api/free-leads/*`, frontend at `/dashboard/lead-intelligence`. Features: lead search, local business finder, domain enrichment, contact/email finder, CSV export, saved leads.
- **Multi-LLM Router**: Universal LLM provider switching via environment variables (`LLM_PROVIDER`, `LLM_MODEL`). Supports Anthropic, OpenAI, Google Gemini, Mistral, Groq, Together AI. Backend: `server/llm-router.ts`. Frontend: `/dashboard/ai-providers`.
- **Credits System**: Per-action credit billing with atomic deduct-before-call and auto-refund on failure. Costs: ai_email=8, lead_enrich=15, agent_run=50, reply_analyze=10, intent_scan=20, email_sequence=30. Backend: `server/credits.ts`. Frontend: `/dashboard/credits`. DB: `credits_ledger` table.
- **Intent Watchlist**: Domain-level buying signal monitoring with AI analysis. API: `/api/intent-watchlist/*`. DB: `intent_watchlist_signals`, `monitored_domains` tables.
- **AI Agent Console**: Run 13+ built-in agents organized by vertical (Track-Med, NaviMed, ARGILETTE, Universal). Includes: trackmed-scout, trackmed-email, trackmed-denial, trackmed-audit, navimed-scout, navimed-email, navimed-proposal, argilette-scout, argilette-email, linkedin-scout, intent-monitor, sequence-builder, meeting-booker. Each agent has 5 example prompts, vertical color coding, and comprehensive system prompts. API: `/api/agent-console/run` or `/api/agent-console/:id/run`. DB: `agent_runs` table.
- **Aria AI Chatbot**: AI-powered sales representative widget on the landing page. Promotes ArgiFlow 24/7, handles objections, qualifies visitors, and books demos. Rate-limited (15 req/min per IP) with input validation. Backend: `server/chatbot-routes.ts`. API: `POST /api/chatbot/message`, `GET /api/chatbot/greeting`. Frontend: `client/src/components/aria-widget.tsx`.
- **Calendar**: Full calendar page with month/week/list views, event management (demo, meeting, call, internal types), month navigation, and event CRUD. Frontend: `client/src/pages/calendar.tsx` at `/dashboard/calendar`.
- **AI Website Builder**: Users describe their vision in natural language and AI generates complete website structure with content, sections, copy, and layout. Supports manual template-based creation as well. E-commerce sites get supplier integration and AI pricing optimization. API: `POST /api/sites/ai-generate`, `/api/sites/:id/import-supplier`, `/api/sites/:id/ai-pricing`, `/api/sites/:id/products`. Frontend: `/dashboard/website-builder`. DB: `sites`, `supplier_products` tables. Supported suppliers: AliExpress, Amazon, Alibaba, CJ Dropshipping, Walmart, Temu, DHgate, Made-in-China.
- **Email Quota System**: Per-user monthly email sending quotas with plan tiers (Starter 2,500/Growth 10,000/Pro 50,000/Agency 150,000). All emails route through Postal mail server. Tracks usage, auto-resets monthly. Schema: `shared/email-quota-schema.ts`. Backend: `server/email-quota-engine.ts`, `server/email-quota-routes.ts`. Frontend: `client/src/pages/email-dashboard.tsx` at `/dashboard/email-service`. API: `/api/email/*`. DB: `email_quotas`, `email_sends_log` tables.
- **Visitor Tracking & Analytics Engine**: Full website visitor intelligence system. Embeddable `argiflow-tracker.js` snippet tracks: page views (including SPA), sessions (entry/exit/duration/bounce), clicks + rage clicks, scroll depth, search queries, form behavior (start/focus/abandon/submit), and custom events. Email tracking with open/click pixel tracking. Backend: `server/tracker-routes.ts` (raw SQL via `pool`). Frontend: `/dashboard/visitor-tracking`. DB: 12 tables (`track_visitors`, `track_sessions`, `track_pageviews`, `track_clicks`, `track_searches`, `track_search_terms`, `track_scroll`, `track_forms`, `track_custom_events`, `track_email_sends`, `track_email_links`, `track_email_events`). Public APIs at `/api/tracker/*` (no auth required for write endpoints). Dashboard APIs require no auth. JS API: `ArgiFlow.identify()`, `ArgiFlow.track()`.

## External Dependencies
- **OpenAI**: Primary AI provider (GPT-4o-mini) for all AI features — chat, lead generation, content creation, research. Cost-effective at ~$0.15/$0.60 per 1M tokens.
- **Anthropic Claude**: Available as optional per-user override via Settings > Integrations. Also used for built-in web search fallback.
- **Tavily**: Default web search provider for company research and AI agents. Uses advanced search with AI summaries. Platform-managed key.
- **You.com Search API**: Alternative web search provider. Configured per-user via Settings > Integrations. Uses `https://api.ydc-index.io/v1/search` with `X-API-Key` header. User settings: `webSearchProvider` ("tavily"|"claude"|"you"), `youApiKey`.
- **Postal (mail.argilette.co)**: Primary email provider for all system and outreach emails. Self-hosted at `mail.argilette.co`, uses API key auth (`X-Server-API-Key`). Default sender: `partnerships@argilette.co`. Falls back to SMTP/SendGrid if Postal fails. Backend: `sendViaPostal()` in `server/routes.ts`. Env: `POSTAL_API_KEY`, `POSTAL_API_URL`.
- **SendGrid**: Fallback email service for system emails and user outreach campaigns.
- **Twilio**: SMS and Voice service for text messages and AI-powered phone calls.
- **Deepgram**: Speech-to-text (Nova-2) and text-to-speech (Aura) for real-time Voice AI streaming. Optional ELEVENLABS_API_KEY for higher quality TTS.
- **Venmo**: Payment gateway for subscription billing.
- **Replit AI Integrations**: Platform for integrating Anthropic Claude.
- **Replit Connectors**: Used for Twilio integration.