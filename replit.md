# ArgiFlow - Automated Client Acquisition Platform

## Overview
ArgiFlow is a SaaS platform designed for automated client acquisition, leveraging AI agents to streamline and scale business growth. It automates lead generation, nurturing, appointment booking, and ad optimization, catering to both Western markets (ArgiFlow brand) and African markets (TradeFlow brand) with region-specific features and pricing models. The platform aims to provide businesses with a comprehensive solution for efficient client acquisition and management.

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
**Authentication**: Email/password with session-based authentication using scrypt hashing. Includes email verification and password reset functionalities.
**AI Integration**: Utilizes Anthropic Claude (claude-sonnet-4-5) via Replit AI Integrations for intelligent conversations, strategy generation, and action execution.
**UI/UX Design**: Dark theme with sky blue gradient accents, Inter font.
**Core Features**:
- **User Management**: Registration, login, email verification, password reset.
- **Dashboard**: Centralized overview of business metrics.
- **CRM & Leads**: Lead tracking, scoring, engagement analysis (email opens/clicks), and automated outreach. Supports up to 4 separate business profiles per user, each with its own filtered leads list. Businesses are managed via the `businesses` table and leads reference them via nullable `businessId` column.
- **Sales Funnels**: Kanban-style pipeline with deal management and stage analytics.
- **Appointment Scheduling**: Management of client appointments.
- **AI Agent Management**: Catalog of specialized AI agents (e.g., Tax Lien, Govt Contracts) with configuration, task queuing, and lifecycle management.
- **Email & SMS Campaigns**: AI-assisted campaign creation, bulk sending, and individual outreach, with integrated tracking.
- **Marketing Strategy**: AI-generated and personalized marketing strategies based on company information.
- **Website Training**: AI analysis of user websites to extract business knowledge for personalized agent responses.
- **Automations**: Workflow automation with templates and status management.
- **Notifications**: Real-time alerts for agent activities and system events.
- **Admin Panel**: Super admin access for managing users, subscriptions, and system-wide data.
**Multi-Region Support**: Distinct branding, agent catalogs, pricing, and currencies for Western (ArgiFlow) and African (TradeFlow) regions.

## External Dependencies
- **Anthropic Claude**: AI model for conversational AI, strategy generation, and intelligent automation.
- **SendGrid**: Email service for system emails (verification, password reset) and user outreach campaigns.
- **Twilio**: SMS and Voice service for sending text messages and making AI-powered phone calls to leads.
- **Venmo**: Payment gateway for subscription billing.
- **Replit AI Integrations**: Platform for integrating Anthropic Claude.
- **Replit Connectors**: Used for Twilio integration.

## Key Features
- **Outreach Scheduling**: Leads with outreach drafts can be scheduled for future sending via `POST /api/leads/:id/schedule-outreach` with `{ scheduledSendAt }` (ISO datetime). Schedules can be cancelled via `POST /api/leads/:id/cancel-schedule`. A background job runs every 60 seconds to process due scheduled emails. The `leads` table has a `scheduledSendAt` column. Frontend shows Schedule button, date/time picker, scheduled badge, and cancel option on each lead card.
- **Agent-to-Funnel Auto-Pipeline**: When an agent (e.g., Tax Lien Hunter, Govt Contracts) runs and finds leads, those leads are automatically added to a matching funnel pipeline. Each agent type has its own predefined pipeline with industry-specific stages (e.g., Tax Lien Pipeline: Discovered → Analyzing ROI → Due Diligence → Bidding → Won/Acquired). The funnel is auto-created on first run if it doesn't exist. The AI chat's `generate_leads` tool also supports an `agent_type` parameter for the same behavior. The mapping is defined in `AGENT_FUNNEL_STAGES` in `server/routes.ts`. Supported agent types: tax-lien, tax-deed, wholesale-re, govt-contracts-us, lead-gen, govt-tender-africa, cross-border-trade, agri-market, diaspora-services, arbitrage.
- **Voice AI Calling**: AI-powered phone calls via Twilio Voice API. Users can initiate calls from the Voice AI page or directly from lead cards. The system uses TwiML webhooks for conversational AI (Claude generates responses to caller speech via Twilio's `<Gather>` input). Call logs are stored in the `voice_calls` table with transcript, duration, status, and recording URL. Endpoints: `POST /api/voice/calls` (initiate), `GET /api/voice/calls` (list), `POST /api/twilio/voice/:callLogId/twiml` (TwiML webhook), `POST /api/twilio/voice/status` (status callback).
- **Automatic Medical Billing Lead Generation**: Background job runs every 5 hours, using Claude AI to search for 30 real medical billing leads per batch. Rotates through 12 US regions (Tennessee, Missouri, Georgia, Texas, Florida, Ohio, NC, Illinois, California, Pennsylvania, Virginia, New York) with different focus strategies (hiring signals, new practices, pain points, specialty targeting). Leads are auto-added to the CRM with scoring, outreach drafts, and funnel pipeline assignment. Rate limit handling with retry/backoff. Tracked in `auto_lead_gen_runs` table. Endpoints: `GET /api/auto-lead-gen/status` (history/stats), `POST /api/auto-lead-gen/trigger` (manual trigger). UI panel on Agent Catalog page shows status, recent runs, and manual trigger button.