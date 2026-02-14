// ============================================================
// ARGILETTE WORKFLOW ENGINE — EVENT HOOKS
// Drop this into: server/workflow-hooks.ts
//
// These are the EXACT code snippets to add to your existing routes.ts
// Each hook fires an event into the workflow engine's EventBus
// whenever something happens in your platform.
//
// USAGE: Import and call these from your existing route handlers
//   import { workflowHooks } from "./workflow-hooks";
//   // In your lead creation handler:
//   workflowHooks.onLeadCreated(userId, lead);
// ============================================================

import { eventBus, type WorkflowEvent } from "./workflow-engine";
import { TRIGGER_TYPES } from "@shared/workflow-schema";

export const workflowHooks = {
  // ============================================================
  // LEAD EVENTS
  // ============================================================

  /** Fire when a new lead is created (CRM, AI chat, auto lead gen, etc.) */
  async onLeadCreated(userId: string, lead: any) {
    await eventBus.emit({
      type: TRIGGER_TYPES.LEAD_CREATED,
      userId,
      entityId: lead.id,
      entityType: "lead",
      data: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source: lead.source,
        status: lead.status,
        score: lead.score,
        notes: lead.notes,
        intentSignal: lead.intentSignal,
        outreach: lead.outreach,
      },
      timestamp: new Date(),
    });
  },

  /** Fire when lead status changes */
  async onLeadStatusChanged(userId: string, lead: any, oldStatus: string, newStatus: string) {
    await eventBus.emit({
      type: TRIGGER_TYPES.LEAD_STATUS_CHANGED,
      userId,
      entityId: lead.id,
      entityType: "lead",
      data: {
        ...lead,
        oldStatus,
        newStatus,
      },
      timestamp: new Date(),
    });
  },

  /** Fire when lead score crosses a threshold */
  async onLeadScoreChanged(userId: string, lead: any, newScore: number) {
    if (newScore >= 80) {
      await eventBus.emit({
        type: TRIGGER_TYPES.LEAD_SCORE_THRESHOLD,
        userId,
        entityId: lead.id,
        entityType: "lead",
        data: { ...lead, score: newScore, threshold: 80 },
        timestamp: new Date(),
      });
    }
  },

  /** Fire when lead opens an email */
  async onLeadEmailOpened(userId: string, lead: any) {
    await eventBus.emit({
      type: TRIGGER_TYPES.LEAD_EMAIL_OPENED,
      userId,
      entityId: lead.id,
      entityType: "lead",
      data: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        emailOpens: lead.emailOpens,
        engagementScore: lead.engagementScore,
      },
      timestamp: new Date(),
    });
  },

  /** Fire when lead clicks an email link */
  async onLeadEmailClicked(userId: string, lead: any) {
    await eventBus.emit({
      type: TRIGGER_TYPES.LEAD_EMAIL_CLICKED,
      userId,
      entityId: lead.id,
      entityType: "lead",
      data: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        emailClicks: lead.emailClicks,
        engagementScore: lead.engagementScore,
      },
      timestamp: new Date(),
    });

    // Also fire "hot engagement" if score is high enough
    if ((lead.engagementScore || 0) >= 60) {
      await eventBus.emit({
        type: TRIGGER_TYPES.LEAD_ENGAGEMENT_HOT,
        userId,
        entityId: lead.id,
        entityType: "lead",
        data: { ...lead },
        timestamp: new Date(),
      });
    }
  },

  // ============================================================
  // APPOINTMENT EVENTS
  // ============================================================

  async onAppointmentBooked(userId: string, appointment: any) {
    await eventBus.emit({
      type: TRIGGER_TYPES.APPOINTMENT_BOOKED,
      userId,
      entityId: appointment.id,
      entityType: "appointment",
      data: {
        id: appointment.id,
        leadName: appointment.leadName,
        email: appointment.email,
        phone: appointment.phone,
        company: appointment.company,
        type: appointment.type,
        date: appointment.date,
        source: appointment.source,
      },
      timestamp: new Date(),
    });
  },

  async onAppointmentCompleted(userId: string, appointment: any) {
    await eventBus.emit({
      type: TRIGGER_TYPES.APPOINTMENT_COMPLETED,
      userId,
      entityId: appointment.id,
      entityType: "appointment",
      data: { ...appointment },
      timestamp: new Date(),
    });
  },

  async onAppointmentCancelled(userId: string, appointment: any) {
    await eventBus.emit({
      type: TRIGGER_TYPES.APPOINTMENT_CANCELLED,
      userId,
      entityId: appointment.id,
      entityType: "appointment",
      data: { ...appointment },
      timestamp: new Date(),
    });
  },

  // ============================================================
  // FUNNEL / DEAL EVENTS
  // ============================================================

  async onDealCreated(userId: string, deal: any) {
    await eventBus.emit({
      type: TRIGGER_TYPES.DEAL_CREATED,
      userId,
      entityId: deal.id,
      entityType: "deal",
      data: { ...deal },
      timestamp: new Date(),
    });
  },

  async onDealStageChanged(userId: string, deal: any, oldStageId: string, newStageId: string) {
    await eventBus.emit({
      type: TRIGGER_TYPES.DEAL_STAGE_CHANGED,
      userId,
      entityId: deal.id,
      entityType: "deal",
      data: { ...deal, oldStageId, newStageId },
      timestamp: new Date(),
    });
  },

  async onDealWon(userId: string, deal: any) {
    await eventBus.emit({
      type: TRIGGER_TYPES.DEAL_WON,
      userId,
      entityId: deal.id,
      entityType: "deal",
      data: { ...deal },
      timestamp: new Date(),
    });
  },

  // ============================================================
  // AGENT EVENTS
  // ============================================================

  async onAgentRunCompleted(userId: string, agentType: string, result: any) {
    await eventBus.emit({
      type: TRIGGER_TYPES.AGENT_RUN_COMPLETED,
      userId,
      entityType: "agent",
      data: { agentType, ...result },
      timestamp: new Date(),
    });

    if (result.leadsFound && result.leadsFound > 0) {
      await eventBus.emit({
        type: TRIGGER_TYPES.AGENT_LEADS_FOUND,
        userId,
        entityType: "agent",
        data: { agentType, leadsFound: result.leadsFound, ...result },
        timestamp: new Date(),
      });
    }
  },

  // ============================================================
  // COMMUNICATION EVENTS
  // ============================================================

  async onVoiceCallCompleted(userId: string, call: any) {
    await eventBus.emit({
      type: TRIGGER_TYPES.VOICE_CALL_COMPLETED,
      userId,
      entityId: call.id,
      entityType: "voice_call",
      data: { ...call },
      timestamp: new Date(),
    });
  },

  async onChatMessageReceived(userId: string, message: any) {
    await eventBus.emit({
      type: TRIGGER_TYPES.CHAT_MESSAGE_RECEIVED,
      userId,
      entityType: "chat",
      data: { content: message.content, role: message.role },
      timestamp: new Date(),
    });
  },

  // ============================================================
  // SYSTEM EVENTS
  // ============================================================

  async onDiscoverySubmitted(leadData: any) {
    await eventBus.emit({
      type: TRIGGER_TYPES.DISCOVERY_SUBMITTED,
      userId: "discovery",
      entityType: "discovery",
      data: { ...leadData },
      timestamp: new Date(),
    });
  },

  async onUserRegistered(userId: string, user: any) {
    await eventBus.emit({
      type: TRIGGER_TYPES.USER_REGISTERED,
      userId,
      entityType: "user",
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      timestamp: new Date(),
    });
  },

  async onWebhookReceived(userId: string, webhookData: any) {
    await eventBus.emit({
      type: TRIGGER_TYPES.WEBHOOK_RECEIVED,
      userId,
      entityType: "webhook",
      data: webhookData,
      timestamp: new Date(),
    });
  },
};

// ============================================================
// INTEGRATION POINTS — Exact locations in routes.ts to add hooks
// ============================================================
//
// Below are the EXACT lines to add to your existing routes.ts.
// Each section shows: (1) which route, (2) where in the handler,
// (3) the exact code to add.
//
// STEP 0: At the top of routes.ts, add this import:
// ────────────────────────────────────────────────
//   import { workflowHooks } from "./workflow-hooks";
//
//
// ┌─────────────────────────────────────────────────────────────┐
// │ 1. LEAD CREATED — POST /api/leads                          │
// │    After: const lead = await storage.createLead(parsed.data)│
// │    Add:                                                      │
// │      workflowHooks.onLeadCreated(userId, lead);             │
// └─────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────┐
// │ 2. LEAD STATUS CHANGED — PATCH /api/leads/:id              │
// │    After: const updated = await storage.updateLead(...)     │
// │    Add:                                                      │
// │      if (parsed.data.status && parsed.data.status !== lead.status) {
// │        workflowHooks.onLeadStatusChanged(                   │
// │          userId, updated, lead.status, parsed.data.status   │
// │        );                                                    │
// │      }                                                       │
// └─────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────┐
// │ 3. LEAD CREATED BY AI — In executeAction("generate_leads") │
// │    After: await storage.createLead(leadRecord)              │
// │    Add:                                                      │
// │      workflowHooks.onLeadCreated(userId, leadRecord);       │
// │    NOTE: This fires for EVERY lead the AI creates           │
// └─────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────┐
// │ 4. EMAIL OPENED — GET /t/o/:leadId                         │
// │    After: await storage.updateLead(lead.id, statusUpdate)   │
// │    Add:                                                      │
// │      workflowHooks.onLeadEmailOpened(lead.userId, {         │
// │        ...lead, emailOpens: newOpens,                       │
// │        engagementScore: score                               │
// │      });                                                     │
// └─────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────┐
// │ 5. EMAIL CLICKED — GET /t/c/:leadId                        │
// │    After: await storage.updateLead(lead.id, statusUpdate)   │
// │    Add:                                                      │
// │      workflowHooks.onLeadEmailClicked(lead.userId, {        │
// │        ...lead, emailClicks: newClicks,                     │
// │        engagementScore: score                               │
// │      });                                                     │
// └─────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────┐
// │ 6. APPOINTMENT BOOKED — POST /api/appointments             │
// │    After: const appt = await storage.createAppointment(...) │
// │    Add:                                                      │
// │      workflowHooks.onAppointmentBooked(userId, appt);       │
// └─────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────┐
// │ 7. APPOINTMENT STATUS CHANGED — PATCH /api/appointments/:id│
// │    After: const updated = await storage.updateAppointment() │
// │    Add:                                                      │
// │      if (req.body.status === "completed") {                 │
// │        workflowHooks.onAppointmentCompleted(userId, updated)│
// │      }                                                       │
// │      if (req.body.status === "cancelled") {                 │
// │        workflowHooks.onAppointmentCancelled(userId, updated)│
// │      }                                                       │
// └─────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────┐
// │ 8. DEAL STAGE CHANGED — PATCH /api/deals/:id               │
// │    Before the update, get the old deal:                     │
// │      const oldDeal = await storage.getFunnelDeal(...)       │
// │    After: const updated = await storage.updateFunnelDeal()  │
// │    Add:                                                      │
// │      if (req.body.stageId && req.body.stageId !== oldDeal.stageId) {
// │        workflowHooks.onDealStageChanged(                    │
// │          userId, updated, oldDeal.stageId, req.body.stageId │
// │        );                                                    │
// │      }                                                       │
// │      if (req.body.status === "won") {                       │
// │        workflowHooks.onDealWon(userId, updated);            │
// │      }                                                       │
// └─────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────┐
// │ 9. VOICE CALL COMPLETED — POST /api/twilio/voice/status    │
// │    After: await storage.updateVoiceCall(callLog.id, updateData)
// │    Add (inside the "completed" status check):               │
// │      workflowHooks.onVoiceCallCompleted(callLog.userId, {   │
// │        id: callLog.id, ...updateData                        │
// │      });                                                     │
// └─────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────┐
// │ 10. USER REGISTERED — POST /api/auth/register              │
// │     After: const user = await storage.createUser(...)       │
// │     Add:                                                     │
// │       workflowHooks.onUserRegistered(user.id, user);        │
// └─────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────┐
// │ 11. DISCOVERY SUBMITTED — POST /api/discovery              │
// │     After: const lead = await storage.createLead(...)       │
// │     Add:                                                     │
// │       workflowHooks.onDiscoverySubmitted(req.body);         │
// └─────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────┐
// │ 12. AGENT RUN COMPLETED — POST /api/agent-configs/:id/run  │
// │     Inside the setTimeout callback, after creating leads:   │
// │     Add:                                                     │
// │       workflowHooks.onAgentRunCompleted(userId, config.agentType, {
// │         leadsFound, analyzed: true                          │
// │       });                                                    │
// └─────────────────────────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────────────────────────┐
// │ 13. STARTUP — In server/index.ts (or end of routes.ts)     │
// │     After registerRoutes():                                  │
// │     Add:                                                     │
// │       import { startWorkflowEngine } from "./workflow-engine";
// │       import { registerWorkflowRoutes } from "./workflow-routes";
// │       registerWorkflowRoutes(app);                          │
// │       startWorkflowEngine();                                │
// └─────────────────────────────────────────────────────────────┘
//
// That's it! 13 hook points cover your entire platform.
// Every existing feature now fires events into the workflow engine.
// ============================================================
