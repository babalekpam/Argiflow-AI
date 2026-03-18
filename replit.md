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
- **Visitor Tracking & Analytics Engine**: Embeddable JavaScript snippet for detailed website visitor intelligence, tracking page views, sessions, clicks, form behavior, and custom events.
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