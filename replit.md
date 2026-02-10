# ArgiFlow - Automated Client Acquisition Platform

## Overview
ArgiFlow is a SaaS platform for automated client acquisition with AI agents. It helps businesses scale by automating lead generation, nurturing, appointment booking, and ad optimization.

## Architecture
- **Frontend**: React + TypeScript with Vite, TailwindCSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Email/password with session-based auth (scrypt hashing)
- **AI**: Anthropic Claude (claude-haiku-4-5) via Replit AI Integrations

## Key Routes
- `/` - Landing page (unauthenticated) or redirects to /dashboard (authenticated)
- `/login` - User login page
- `/signup` - User registration page
- `/dashboard` - Main dashboard overview
- `/dashboard/leads` - Leads & CRM management
- `/dashboard/appointments` - Appointment scheduling
- `/dashboard/ai-agents` - AI agent management
- `/dashboard/email` - Email & SMS with AI chat campaign assistant
- `/dashboard/training` - Training center with courses
- `/dashboard/settings` - Settings with working toggles (persisted to DB)
- `/admin` - Super admin login page
- `/admin/dashboard` - Super admin dashboard (all data across users)

## API Endpoints
### User Auth Endpoints (email/password)
- `POST /api/auth/register` - Register new user { email, password, firstName, lastName }
- `POST /api/auth/login` - Login { email, password }
- `POST /api/auth/logout` - Logout (destroys session)
- `GET /api/auth/user` - Get authenticated user

### Data Endpoints (session auth required)
- `GET /api/stats` - Dashboard statistics
- `GET /api/leads` - List user's leads
- `POST /api/leads` - Create a new lead
- `DELETE /api/leads/:id` - Delete a lead by ID
- `GET /api/appointments` - List user's appointments
- `GET /api/ai-agents` - List user's AI agents
- `POST /api/ai-agents` - Create an AI agent
- `GET /api/settings` - Get user settings (auto-creates defaults)
- `PATCH /api/settings` - Update user settings (notifications, integrations)
- `POST /api/onboarding` - Save company info and trigger AI strategy generation
- `GET /api/strategy` - Get user's AI-generated marketing strategy
- `POST /api/strategy/regenerate` - Regenerate the marketing strategy
- `GET /api/chat/messages` - Get AI chat messages
- `POST /api/chat/messages` - Send message, get AI reply { content }
- `DELETE /api/chat/messages` - Clear chat history
- AI chat uses Claude for intelligent conversation with action execution (generates leads, books appointments, etc.)

### Admin Endpoints (email/password auth)
- `POST /api/admin/login` - Admin login with email/password
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/me` - Get current admin
- `GET /api/admin/leads` - All leads across all users
- `GET /api/admin/appointments` - All appointments across all users
- `GET /api/admin/agents` - All agents across all users
- `GET /api/admin/stats` - Aggregated admin stats

## Database Schema
- `users` & `sessions` - Auth tables (email/password, session-based, includes company info fields)
- `leads` - Lead tracking with scoring
- `appointments` - Scheduled meetings
- `ai_agents` - AI automation agents
- `dashboard_stats` - Aggregated metrics
- `user_settings` - User preferences (notifications, AI, toggles, integration API keys)
- `ai_chat_messages` - AI chat conversation history
- `marketing_strategies` - AI-generated marketing strategies per user
- `admins` - Super admin users (email/password auth, scrypt hashing)

## Design
- Dark theme with indigo/purple gradient accents
- Font: Inter
- Color scheme: Deep dark backgrounds (240 15% 6%) with purple primary (245 75% 60%)

## Recent Changes
- Initial build: Landing page, Dashboard, Leads CRM, Appointments, AI Agents pages
- Replaced Replit Auth with email/password auth (register, login, logout)
- Added Email & SMS page with AI chat campaign assistant
- Added Settings page with working toggles (persisted to user_settings table)
- Added Training center page
- Added floating AI chat dialog accessible across all dashboard pages
- Fixed dashboard routing (overview page now loads correctly)
- Removed mock data seeding - users start with empty platform
- Integrated Anthropic Claude (claude-haiku-4-5) for intelligent AI chat with action execution
- AI bot can generate leads, book appointments, activate agents, show stats via natural language
- Added "thinking" animation to chat UIs while waiting for AI response
- Chat history (last 20 messages) passed to Claude for conversational context
- Fallback mode: actions still work even if Claude API is temporarily unavailable
- Added web search capability via Claude's native web_search tool
- Added Voice AI page with agent deployment, configuration, and stats
- Added Automations page with workflow templates
- Added Integrations section to Settings (SendGrid, Twilio, Grasshopper, Calendar, Webhook)
- Two-step signup flow: Step 1 account details, Step 2 company info (name, industry, website, description)
- AI auto-generates a full marketing strategy on signup using Claude
- Strategy page at /dashboard/strategy with markdown rendering, regenerate button, and auto-polling
- Competitive pricing: Starter $1,497 one-time, Ongoing Growth $997/mo, Enterprise custom
