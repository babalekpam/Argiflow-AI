# ArgiFlow - Automated Client Acquisition Platform

## Overview
ArgiFlow is a SaaS platform for automated client acquisition with AI agents. It helps businesses scale by automating lead generation, nurturing, appointment booking, and ad optimization.

## Architecture
- **Frontend**: React + TypeScript with Vite, TailwindCSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect)

## Key Routes
- `/` - Landing page (unauthenticated) or Dashboard redirect (authenticated)
- `/dashboard` - Main dashboard overview
- `/dashboard/leads` - Leads & CRM management
- `/dashboard/appointments` - Appointment scheduling
- `/dashboard/ai-agents` - AI agent management

## API Endpoints
- `GET /api/auth/user` - Get authenticated user
- `GET /api/stats` - Dashboard statistics
- `GET /api/leads` - List user's leads
- `POST /api/leads` - Create a new lead (validated with insertLeadSchema)
- `DELETE /api/leads/:id` - Delete a lead by ID
- `GET /api/appointments` - List user's appointments
- `GET /api/ai-agents` - List user's AI agents
- All authenticated routes call ensureSeeded(userId) to populate sample data on first access

## Database Schema
- `users` & `sessions` - Auth tables (Replit Auth)
- `leads` - Lead tracking with scoring
- `appointments` - Scheduled meetings
- `ai_agents` - AI automation agents
- `dashboard_stats` - Aggregated metrics

## Design
- Dark theme with indigo/purple gradient accents
- Font: Inter
- Color scheme: Deep dark backgrounds (240 15% 6%) with purple primary (245 75% 60%)

## Recent Changes
- Initial build: Landing page, Dashboard, Leads CRM, Appointments, AI Agents pages
- Replit Auth integration
- PostgreSQL database with seed data
