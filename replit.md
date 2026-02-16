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
**AI Integration**: Multi-tenant Anthropic Claude integration, allowing users to provide their own API keys for isolation.
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
- **Automated Lead Generation**: Background jobs for generating specialized leads (e.g., medical billing, tax lien) using AI.
- **Automated Follow-Up Sequences**: AI-generated, multi-step email sequences for leads, stopping on engagement.
- **Workflow Automation Engine**: An n8n-style engine with event bus, execution, and API endpoints, supporting various action types and AI-powered workflow generation from templates.
- **County-Level Tax Lien Discovery**: Dedicated search system for tax lien data, including ROI/risk scoring and due diligence checklists.
- **AI Inbox Monitor & Auto-Reply**: Monitors IMAP inbox for lead replies, generates AI responses, and updates lead status.
- **Email Infrastructure Engine**: Comprehensive email management including account management, warmup, campaign builder, unified inbox (Unibox) with AI classification, website visitor identification, email verification, and inbox placement testing. Includes an AI Copilot for content generation.
- **B2B Sales Intelligence Engine**: Provides Apollo.io/ZoomInfo-style capabilities for people and company search, contact/company enrichment, email/phone finding, intent data detection, technographic scanning, org chart building, news & events, AI-powered deep research, and prospect list management.
- **AI Outreach Agent**: An autonomous agent that integrates email infrastructure, sales intelligence, and CRM for an 8-step outreach loop: discover, enroll, send, monitor, classify, respond, book, and repeat.

## External Dependencies
- **Anthropic Claude**: AI model for conversational AI, strategy generation, and intelligent automation.
- **SendGrid**: Email service for system emails and user outreach campaigns.
- **Twilio**: SMS and Voice service for text messages and AI-powered phone calls.
- **Deepgram**: Speech-to-text (Nova-2) and text-to-speech (Aura) for real-time Voice AI streaming. Optional ELEVENLABS_API_KEY for higher quality TTS.
- **Venmo**: Payment gateway for subscription billing.
- **Replit AI Integrations**: Platform for integrating Anthropic Claude.
- **Replit Connectors**: Used for Twilio integration.