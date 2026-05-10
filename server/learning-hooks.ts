// ============================================================
// LEARNING SYSTEM — EVENT HOOKS
// Cloned from workflow-hooks.ts for independent learning rebuild
//
// USAGE: Import and call these from your existing route handlers
//   import { learningHooks } from "./learning-hooks";
//   // In your lead creation handler:
//   learningHooks.onLeadCreated(userId, lead);
// ============================================================

import { learningEventBus, type LearningEvent } from "./learning-engine";
import { LEARNING_TRIGGER_TYPES } from "@shared/learning-schema";

export const learningHooks = {
  // ============================================================
  // LEAD EVENTS
  // ============================================================

  async onLeadCreated(userId: string, lead: any) {
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.LEAD_CREATED,
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

  async onLeadStatusChanged(userId: string, lead: any, oldStatus: string, newStatus: string) {
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.LEAD_STATUS_CHANGED,
      userId,
      entityId: lead.id,
      entityType: "lead",
      data: { ...lead, oldStatus, newStatus },
      timestamp: new Date(),
    });
  },

  async onLeadScoreChanged(userId: string, lead: any, newScore: number) {
    if (newScore >= 80) {
      await learningEventBus.emit({
        type: LEARNING_TRIGGER_TYPES.LEAD_SCORE_THRESHOLD,
        userId,
        entityId: lead.id,
        entityType: "lead",
        data: { ...lead, score: newScore, threshold: 80 },
        timestamp: new Date(),
      });
    }
  },

  async onLeadEmailOpened(userId: string, lead: any) {
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.LEAD_EMAIL_OPENED,
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

  async onLeadEmailClicked(userId: string, lead: any) {
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.LEAD_EMAIL_CLICKED,
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

    if ((lead.engagementScore || 0) >= 60) {
      await learningEventBus.emit({
        type: LEARNING_TRIGGER_TYPES.LEAD_ENGAGEMENT_HOT,
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
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.APPOINTMENT_BOOKED,
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
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.APPOINTMENT_COMPLETED,
      userId,
      entityId: appointment.id,
      entityType: "appointment",
      data: { ...appointment },
      timestamp: new Date(),
    });
  },

  async onAppointmentCancelled(userId: string, appointment: any) {
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.APPOINTMENT_CANCELLED,
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
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.DEAL_CREATED,
      userId,
      entityId: deal.id,
      entityType: "deal",
      data: { ...deal },
      timestamp: new Date(),
    });
  },

  async onDealStageChanged(userId: string, deal: any, oldStageId: string, newStageId: string) {
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.DEAL_STAGE_CHANGED,
      userId,
      entityId: deal.id,
      entityType: "deal",
      data: { ...deal, oldStageId, newStageId },
      timestamp: new Date(),
    });
  },

  async onDealWon(userId: string, deal: any) {
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.DEAL_WON,
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
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.AGENT_RUN_COMPLETED,
      userId,
      entityType: "agent",
      data: { agentType, ...result },
      timestamp: new Date(),
    });

    if (result.leadsFound && result.leadsFound > 0) {
      await learningEventBus.emit({
        type: LEARNING_TRIGGER_TYPES.AGENT_LEADS_FOUND,
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
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.VOICE_CALL_COMPLETED,
      userId,
      entityId: call.id,
      entityType: "voice_call",
      data: { ...call },
      timestamp: new Date(),
    });
  },

  async onChatMessageReceived(userId: string, message: any) {
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.CHAT_MESSAGE_RECEIVED,
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
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.DISCOVERY_SUBMITTED,
      userId: "discovery",
      entityType: "discovery",
      data: { ...leadData },
      timestamp: new Date(),
    });
  },

  async onUserRegistered(userId: string, user: any) {
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.USER_REGISTERED,
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
    await learningEventBus.emit({
      type: LEARNING_TRIGGER_TYPES.WEBHOOK_RECEIVED,
      userId,
      entityType: "webhook",
      data: webhookData,
      timestamp: new Date(),
    });
  },
};
