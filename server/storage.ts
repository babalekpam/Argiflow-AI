import {
  leads, appointments, aiAgents, dashboardStats, admins, users, userSettings, aiChatMessages, marketingStrategies,
  funnels, funnelStages, funnelDeals, websiteProfiles, automations, emailEvents, subscriptions,
  agentConfigs, agentTasks, notifications, passwordResetTokens, emailVerificationTokens, voiceCalls, businesses, emailReplies,
  type Lead, type InsertLead,
  type Business, type InsertBusiness,
  type Appointment, type InsertAppointment,
  type AiAgent, type InsertAiAgent,
  type DashboardStats, type InsertDashboardStats,
  type Admin, type InsertAdmin,
  type User,
  type UserSettings, type InsertUserSettings,
  type AiChatMessage, type InsertAiChatMessage,
  type MarketingStrategy, type InsertMarketingStrategy,
  type Funnel, type InsertFunnel,
  type FunnelStage, type InsertFunnelStage,
  type FunnelDeal, type InsertFunnelDeal,
  type WebsiteProfile, type InsertWebsiteProfile,
  type Automation, type InsertAutomation,
  type EmailEvent, type InsertEmailEvent,
  type Subscription, type InsertSubscription,
  type AgentConfig, type InsertAgentConfig,
  type AgentTask, type InsertAgentTask,
  type Notification, type InsertNotification,
  type PasswordResetToken, type InsertPasswordResetToken,
  type EmailVerificationToken, type InsertEmailVerificationToken,
  type VoiceCall, type InsertVoiceCall,
  type EmailReply, type InsertEmailReply,
  usageTracking, type UsageTracking, type InsertUsageTracking,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, asc, isNull, sql, lte } from "drizzle-orm";

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { email: string; passwordHash: string; firstName: string; lastName: string }): Promise<User>;
  getBusinessesByUser(userId: string): Promise<Business[]>;
  getBusinessById(id: string): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: string, userId: string, data: Partial<Pick<Business, "name" | "industry" | "description" | "color">>): Promise<Business | undefined>;
  deleteBusiness(id: string, userId: string): Promise<boolean>;
  getLeadsByUser(userId: string, businessId?: string): Promise<Lead[]>;
  getLeadById(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, data: Partial<Pick<Lead, "status" | "score" | "notes" | "outreach" | "outreachSentAt" | "scheduledSendAt" | "engagementScore" | "engagementLevel" | "lastEngagedAt" | "emailOpens" | "emailClicks" | "nextStep" | "followUpStep" | "followUpStatus" | "followUpNextAt" | "followUpLastSentAt">>): Promise<Lead | undefined>;
  getScheduledLeadsToSend(): Promise<Lead[]>;
  getLeadsDueForFollowUp(): Promise<Lead[]>;
  deleteLead(id: string, userId: string): Promise<boolean>;
  deleteAllLeadsByUser(userId: string): Promise<void>;
  getAppointmentsByUser(userId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, userId: string, data: Partial<Appointment>): Promise<Appointment>;
  deleteAppointment(id: string, userId: string): Promise<boolean>;
  getAiAgentsByUser(userId: string): Promise<AiAgent[]>;
  createAiAgent(agent: InsertAiAgent): Promise<AiAgent>;
  updateAiAgent(id: string, userId: string, data: Partial<Pick<AiAgent, "name" | "status" | "description" | "type" | "script" | "workflowSteps">>): Promise<AiAgent | undefined>;
  getStatsByUser(userId: string): Promise<DashboardStats | undefined>;
  upsertStats(stats: InsertDashboardStats): Promise<DashboardStats>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  getAdminById(id: string): Promise<Admin | undefined>;
  getAllLeads(): Promise<Lead[]>;
  getAllAppointments(): Promise<Appointment[]>;
  getAllAiAgents(): Promise<AiAgent[]>;
  getAllStats(): Promise<DashboardStats[]>;
  getSettingsByUser(userId: string): Promise<UserSettings | undefined>;
  upsertSettings(settings: InsertUserSettings): Promise<UserSettings>;
  getChatMessages(userId: string): Promise<AiChatMessage[]>;
  createChatMessage(message: InsertAiChatMessage): Promise<AiChatMessage>;
  clearChatMessages(userId: string): Promise<void>;
  updateUser(id: string, data: Partial<Pick<User, "companyName" | "industry" | "website" | "companyDescription" | "onboardingCompleted" | "jobTitle" | "firstName" | "lastName" | "passwordHash" | "email">>): Promise<User | undefined>;
  getMarketingStrategy(userId: string): Promise<MarketingStrategy | undefined>;
  upsertMarketingStrategy(strategy: InsertMarketingStrategy): Promise<MarketingStrategy>;
  getFunnelById(id: string): Promise<Funnel | undefined>;
  getFunnelsByUser(userId: string): Promise<Funnel[]>;
  createFunnel(funnel: InsertFunnel): Promise<Funnel>;
  deleteFunnel(id: string, userId: string): Promise<boolean>;
  getFunnelStages(funnelId: string): Promise<FunnelStage[]>;
  createFunnelStage(stage: InsertFunnelStage): Promise<FunnelStage>;
  deleteFunnelStages(funnelId: string): Promise<void>;
  getFunnelDeal(id: string): Promise<FunnelDeal | undefined>;
  getFunnelDeals(funnelId: string): Promise<FunnelDeal[]>;
  createFunnelDeal(deal: InsertFunnelDeal): Promise<FunnelDeal>;
  updateFunnelDeal(id: string, userId: string, data: Partial<Pick<FunnelDeal, "stageId" | "contactName" | "contactEmail" | "value" | "status">>): Promise<FunnelDeal | undefined>;
  deleteFunnelDeal(id: string, userId: string): Promise<boolean>;
  deleteFunnelDeals(funnelId: string): Promise<void>;
  getWebsiteProfile(userId: string): Promise<WebsiteProfile | undefined>;
  upsertWebsiteProfile(profile: InsertWebsiteProfile): Promise<WebsiteProfile>;
  getAutomationsByUser(userId: string): Promise<Automation[]>;
  createAutomation(automation: InsertAutomation): Promise<Automation>;
  updateAutomation(id: string, userId: string, data: Partial<Pick<Automation, "status" | "runs" | "successRate" | "lastRunAt">>): Promise<Automation | undefined>;
  deleteAutomation(id: string, userId: string): Promise<boolean>;
  createEmailEvent(event: InsertEmailEvent): Promise<EmailEvent>;
  getEmailEventsByLead(leadId: string): Promise<EmailEvent[]>;
  getEmailEventsByUser(userId: string): Promise<EmailEvent[]>;
  getAllUsers(): Promise<User[]>;
  getSubscriptionByUser(userId: string): Promise<Subscription | undefined>;
  getAllSubscriptions(): Promise<Subscription[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, data: Partial<Pick<Subscription, "plan" | "status" | "amount" | "paymentMethod" | "venmoHandle" | "trialEndsAt" | "currentPeriodStart" | "currentPeriodEnd" | "cancelledAt" | "notes">>): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<void>;
  getAgentConfigsByUser(userId: string): Promise<AgentConfig[]>;
  getAgentConfig(userId: string, agentType: string): Promise<AgentConfig | undefined>;
  upsertAgentConfig(config: InsertAgentConfig): Promise<AgentConfig>;
  updateAgentConfig(id: string, userId: string, data: Partial<Pick<AgentConfig, "enabled" | "agentSettings" | "isRunning" | "lastRun" | "nextRun" | "lastError" | "totalLeadsFound" | "totalDealsCompleted" | "healthScore" | "runFrequency">>): Promise<AgentConfig | undefined>;
  deleteAgentConfig(id: string, userId: string): Promise<boolean>;
  getAgentTasksByUser(userId: string): Promise<AgentTask[]>;
  createAgentTask(task: InsertAgentTask): Promise<AgentTask>;
  updateAgentTask(id: string, data: Partial<Pick<AgentTask, "status" | "result" | "completedAt">>): Promise<AgentTask | undefined>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string, userId: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<boolean>;
  createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<void>;
  invalidateUserResetTokens(userId: string): Promise<void>;
  updateUserPassword(id: string, passwordHash: string): Promise<void>;
  createEmailVerificationToken(data: InsertEmailVerificationToken): Promise<EmailVerificationToken>;
  getEmailVerificationToken(tokenHash: string): Promise<EmailVerificationToken | undefined>;
  invalidateUserVerificationTokens(userId: string): Promise<void>;
  markEmailVerified(userId: string): Promise<void>;
  createVoiceCall(call: InsertVoiceCall): Promise<VoiceCall>;
  updateVoiceCall(id: string, data: Partial<Pick<VoiceCall, "status" | "durationSec" | "outcome" | "recordingUrl" | "transcript" | "twilioCallSid" | "startedAt" | "endedAt" | "fromNumber">>): Promise<VoiceCall | undefined>;
  getVoiceCallsByUser(userId: string): Promise<VoiceCall[]>;
  getVoiceCallById(id: string): Promise<VoiceCall | undefined>;
  getVoiceCallByTwilioSid(sid: string): Promise<VoiceCall | undefined>;
  createEmailReply(reply: InsertEmailReply): Promise<EmailReply>;
  getEmailRepliesByLead(leadId: string): Promise<EmailReply[]>;
  getEmailRepliesByUser(userId: string): Promise<EmailReply[]>;
  getEmailReplyByMessageId(messageId: string): Promise<EmailReply | undefined>;
  getOrCreateUsage(userId: string): Promise<UsageTracking>;
  incrementUsage(userId: string, field: "aiChats" | "smsSent" | "emailsSent" | "voiceCalls" | "leadsGenerated", amount?: number): Promise<UsageTracking>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.id, id));
    return result;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.email, email));
    return result;
  }

  async createUser(user: { email: string; passwordHash: string; firstName: string; lastName: string }): Promise<User> {
    const [result] = await db.insert(users).values(user).returning();
    return result;
  }

  async getBusinessesByUser(userId: string): Promise<Business[]> {
    return db.select().from(businesses).where(eq(businesses.userId, userId)).orderBy(asc(businesses.createdAt));
  }

  async getBusinessById(id: string): Promise<Business | undefined> {
    const [result] = await db.select().from(businesses).where(eq(businesses.id, id));
    return result;
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    const [result] = await db.insert(businesses).values(business).returning();
    return result;
  }

  async updateBusiness(id: string, userId: string, data: Partial<Pick<Business, "name" | "industry" | "description" | "color">>): Promise<Business | undefined> {
    const [result] = await db.update(businesses).set(data).where(and(eq(businesses.id, id), eq(businesses.userId, userId))).returning();
    return result;
  }

  async deleteBusiness(id: string, userId: string): Promise<boolean> {
    await db.update(leads).set({ businessId: null }).where(and(eq(leads.businessId, id), eq(leads.userId, userId)));
    const result = await db.delete(businesses).where(and(eq(businesses.id, id), eq(businesses.userId, userId))).returning({ id: businesses.id });
    return result.length > 0;
  }

  async getLeadsByUser(userId: string, businessId?: string): Promise<Lead[]> {
    if (businessId) {
      return db.select().from(leads).where(and(eq(leads.userId, userId), eq(leads.businessId, businessId))).orderBy(desc(leads.createdAt));
    }
    return db.select().from(leads).where(eq(leads.userId, userId)).orderBy(desc(leads.createdAt));
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [result] = await db.insert(leads).values(lead).returning();
    return result;
  }

  async deleteLead(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(leads).where(and(eq(leads.id, id), eq(leads.userId, userId))).returning({ id: leads.id });
    return result.length > 0;
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    const [result] = await db.select().from(leads).where(eq(leads.id, id));
    return result;
  }

  async updateLead(id: string, data: Partial<Pick<Lead, "status" | "score" | "notes" | "outreach" | "outreachSentAt" | "scheduledSendAt" | "engagementScore" | "engagementLevel" | "lastEngagedAt" | "emailOpens" | "emailClicks" | "nextStep" | "followUpStep" | "followUpStatus" | "followUpNextAt" | "followUpLastSentAt">>): Promise<Lead | undefined> {
    const [result] = await db.update(leads).set(data).where(eq(leads.id, id)).returning();
    return result;
  }

  async getScheduledLeadsToSend(): Promise<Lead[]> {
    return db.select().from(leads).where(
      and(
        isNull(leads.outreachSentAt),
        lte(leads.scheduledSendAt, new Date())
      )
    );
  }

  async getLeadsDueForFollowUp(): Promise<Lead[]> {
    return db.select().from(leads).where(
      and(
        eq(leads.followUpStatus, "active"),
        lte(leads.followUpNextAt, new Date())
      )
    );
  }

  async deleteAllLeadsByUser(userId: string): Promise<void> {
    await db.delete(leads).where(eq(leads.userId, userId));
  }

  async getAppointmentsByUser(userId: string): Promise<Appointment[]> {
    return db.select().from(appointments).where(eq(appointments.userId, userId)).orderBy(desc(appointments.date));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [result] = await db.insert(appointments).values(appointment).returning();
    return result;
  }

  async updateAppointment(id: string, userId: string, data: Partial<Appointment>): Promise<Appointment> {
    const [result] = await db.update(appointments).set(data).where(and(eq(appointments.id, id), eq(appointments.userId, userId))).returning();
    return result;
  }

  async deleteAppointment(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(appointments).where(and(eq(appointments.id, id), eq(appointments.userId, userId))).returning({ id: appointments.id });
    return result.length > 0;
  }

  async getAiAgentsByUser(userId: string): Promise<AiAgent[]> {
    return db.select().from(aiAgents).where(eq(aiAgents.userId, userId));
  }

  async createAiAgent(agent: InsertAiAgent): Promise<AiAgent> {
    const [result] = await db.insert(aiAgents).values(agent).returning();
    return result;
  }

  async updateAiAgent(id: string, userId: string, data: Partial<Pick<AiAgent, "name" | "status" | "description" | "type" | "script" | "workflowSteps">>): Promise<AiAgent | undefined> {
    const [result] = await db.update(aiAgents).set(data).where(and(eq(aiAgents.id, id), eq(aiAgents.userId, userId))).returning();
    return result;
  }

  async getStatsByUser(userId: string): Promise<DashboardStats | undefined> {
    const [result] = await db.select().from(dashboardStats).where(eq(dashboardStats.userId, userId));
    return result;
  }

  async upsertStats(stats: InsertDashboardStats): Promise<DashboardStats> {
    const existing = await this.getStatsByUser(stats.userId);
    if (existing) {
      const [result] = await db
        .update(dashboardStats)
        .set({ ...stats, updatedAt: new Date() })
        .where(eq(dashboardStats.userId, stats.userId))
        .returning();
      return result;
    }
    const [result] = await db.insert(dashboardStats).values(stats).returning();
    return result;
  }
  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [result] = await db.select().from(admins).where(eq(admins.email, email));
    return result;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const [result] = await db.insert(admins).values(admin).returning();
    return result;
  }

  async getAdminById(id: string): Promise<Admin | undefined> {
    const [result] = await db.select().from(admins).where(eq(admins.id, id));
    return result;
  }

  async getAllLeads(): Promise<Lead[]> {
    return db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return db.select().from(appointments).orderBy(desc(appointments.date));
  }

  async getAllAiAgents(): Promise<AiAgent[]> {
    return db.select().from(aiAgents);
  }

  async getAllStats(): Promise<DashboardStats[]> {
    return db.select().from(dashboardStats);
  }

  async getSettingsByUser(userId: string): Promise<UserSettings | undefined> {
    const [result] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return result;
  }

  async upsertSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const existing = await this.getSettingsByUser(settings.userId);
    if (existing) {
      const [result] = await db
        .update(userSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(userSettings.userId, settings.userId))
        .returning();
      return result;
    }
    const [result] = await db.insert(userSettings).values(settings).returning();
    return result;
  }

  async getChatMessages(userId: string): Promise<AiChatMessage[]> {
    return db.select().from(aiChatMessages).where(eq(aiChatMessages.userId, userId)).orderBy(asc(aiChatMessages.createdAt));
  }

  async createChatMessage(message: InsertAiChatMessage): Promise<AiChatMessage> {
    const [result] = await db.insert(aiChatMessages).values(message).returning();
    return result;
  }

  async clearChatMessages(userId: string): Promise<void> {
    await db.delete(aiChatMessages).where(eq(aiChatMessages.userId, userId));
  }

  async updateUser(id: string, data: Partial<Pick<User, "companyName" | "industry" | "website" | "companyDescription" | "onboardingCompleted" | "jobTitle" | "firstName" | "lastName" | "passwordHash" | "email">>): Promise<User | undefined> {
    const [result] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return result;
  }

  async getMarketingStrategy(userId: string): Promise<MarketingStrategy | undefined> {
    const [result] = await db.select().from(marketingStrategies).where(eq(marketingStrategies.userId, userId));
    return result;
  }

  async upsertMarketingStrategy(strategy: InsertMarketingStrategy): Promise<MarketingStrategy> {
    const existing = await this.getMarketingStrategy(strategy.userId);
    if (existing) {
      const [result] = await db
        .update(marketingStrategies)
        .set({ ...strategy, updatedAt: new Date() })
        .where(eq(marketingStrategies.userId, strategy.userId))
        .returning();
      return result;
    }
    const [result] = await db.insert(marketingStrategies).values(strategy).returning();
    return result;
  }

  async getFunnelById(id: string): Promise<Funnel | undefined> {
    const [result] = await db.select().from(funnels).where(eq(funnels.id, id));
    return result;
  }

  async getFunnelsByUser(userId: string): Promise<Funnel[]> {
    return db.select().from(funnels).where(eq(funnels.userId, userId)).orderBy(desc(funnels.createdAt));
  }

  async createFunnel(funnel: InsertFunnel): Promise<Funnel> {
    const [result] = await db.insert(funnels).values(funnel).returning();
    return result;
  }

  async deleteFunnel(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(funnels).where(and(eq(funnels.id, id), eq(funnels.userId, userId))).returning({ id: funnels.id });
    return result.length > 0;
  }

  async getFunnelStages(funnelId: string): Promise<FunnelStage[]> {
    return db.select().from(funnelStages).where(eq(funnelStages.funnelId, funnelId)).orderBy(asc(funnelStages.position));
  }

  async createFunnelStage(stage: InsertFunnelStage): Promise<FunnelStage> {
    const [result] = await db.insert(funnelStages).values(stage).returning();
    return result;
  }

  async deleteFunnelStages(funnelId: string): Promise<void> {
    await db.delete(funnelStages).where(eq(funnelStages.funnelId, funnelId));
  }

  async getFunnelDeal(id: string): Promise<FunnelDeal | undefined> {
    const [result] = await db.select().from(funnelDeals).where(eq(funnelDeals.id, id));
    return result;
  }

  async getFunnelDeals(funnelId: string): Promise<FunnelDeal[]> {
    return db.select().from(funnelDeals).where(eq(funnelDeals.funnelId, funnelId)).orderBy(desc(funnelDeals.createdAt));
  }

  async createFunnelDeal(deal: InsertFunnelDeal): Promise<FunnelDeal> {
    const [result] = await db.insert(funnelDeals).values(deal).returning();
    return result;
  }

  async updateFunnelDeal(id: string, userId: string, data: Partial<Pick<FunnelDeal, "stageId" | "contactName" | "contactEmail" | "value" | "status">>): Promise<FunnelDeal | undefined> {
    const [result] = await db.update(funnelDeals).set(data).where(and(eq(funnelDeals.id, id), eq(funnelDeals.userId, userId))).returning();
    return result;
  }

  async deleteFunnelDeal(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(funnelDeals).where(and(eq(funnelDeals.id, id), eq(funnelDeals.userId, userId))).returning({ id: funnelDeals.id });
    return result.length > 0;
  }

  async deleteFunnelDeals(funnelId: string): Promise<void> {
    await db.delete(funnelDeals).where(eq(funnelDeals.funnelId, funnelId));
  }

  async getWebsiteProfile(userId: string): Promise<WebsiteProfile | undefined> {
    const [result] = await db.select().from(websiteProfiles).where(eq(websiteProfiles.userId, userId));
    return result;
  }

  async upsertWebsiteProfile(profile: InsertWebsiteProfile): Promise<WebsiteProfile> {
    const existing = await this.getWebsiteProfile(profile.userId);
    if (existing) {
      const [result] = await db
        .update(websiteProfiles)
        .set(profile)
        .where(eq(websiteProfiles.userId, profile.userId))
        .returning();
      return result;
    }
    const [result] = await db.insert(websiteProfiles).values(profile).returning();
    return result;
  }

  async getAutomationsByUser(userId: string): Promise<Automation[]> {
    return db.select().from(automations).where(eq(automations.userId, userId)).orderBy(desc(automations.createdAt));
  }

  async createAutomation(automation: InsertAutomation): Promise<Automation> {
    const [result] = await db.insert(automations).values(automation).returning();
    return result;
  }

  async updateAutomation(id: string, userId: string, data: Partial<Pick<Automation, "status" | "runs" | "successRate" | "lastRunAt">>): Promise<Automation | undefined> {
    const [result] = await db.update(automations).set(data).where(and(eq(automations.id, id), eq(automations.userId, userId))).returning();
    return result;
  }

  async deleteAutomation(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(automations).where(and(eq(automations.id, id), eq(automations.userId, userId))).returning({ id: automations.id });
    return result.length > 0;
  }

  async createEmailEvent(event: InsertEmailEvent): Promise<EmailEvent> {
    const [result] = await db.insert(emailEvents).values(event).returning();
    return result;
  }

  async getEmailEventsByLead(leadId: string): Promise<EmailEvent[]> {
    return db.select().from(emailEvents).where(eq(emailEvents.leadId, leadId)).orderBy(desc(emailEvents.createdAt));
  }

  async getEmailEventsByUser(userId: string): Promise<EmailEvent[]> {
    return db.select().from(emailEvents).where(eq(emailEvents.userId, userId)).orderBy(desc(emailEvents.createdAt));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getSubscriptionByUser(userId: string): Promise<Subscription | undefined> {
    const [result] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return result;
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [result] = await db.insert(subscriptions).values(subscription).returning();
    return result;
  }

  async updateSubscription(id: string, data: Partial<Pick<Subscription, "plan" | "status" | "amount" | "paymentMethod" | "venmoHandle" | "trialEndsAt" | "currentPeriodStart" | "currentPeriodEnd" | "cancelledAt" | "notes">>): Promise<Subscription | undefined> {
    const [result] = await db.update(subscriptions).set({ ...data, updatedAt: new Date() }).where(eq(subscriptions.id, id)).returning();
    return result;
  }

  async deleteSubscription(id: string): Promise<void> {
    await db.delete(subscriptions).where(eq(subscriptions.id, id));
  }

  async getAgentConfigsByUser(userId: string): Promise<AgentConfig[]> {
    return db.select().from(agentConfigs).where(eq(agentConfigs.userId, userId)).orderBy(desc(agentConfigs.createdAt));
  }

  async getAgentConfig(userId: string, agentType: string): Promise<AgentConfig | undefined> {
    const [result] = await db.select().from(agentConfigs).where(and(eq(agentConfigs.userId, userId), eq(agentConfigs.agentType, agentType)));
    return result;
  }

  async upsertAgentConfig(config: InsertAgentConfig): Promise<AgentConfig> {
    const existing = await this.getAgentConfig(config.userId, config.agentType);
    if (existing) {
      const [result] = await db.update(agentConfigs).set(config).where(eq(agentConfigs.id, existing.id)).returning();
      return result;
    }
    const [result] = await db.insert(agentConfigs).values(config).returning();
    return result;
  }

  async updateAgentConfig(id: string, userId: string, data: Partial<Pick<AgentConfig, "enabled" | "agentSettings" | "isRunning" | "lastRun" | "nextRun" | "lastError" | "totalLeadsFound" | "totalDealsCompleted" | "healthScore" | "runFrequency">>): Promise<AgentConfig | undefined> {
    const [result] = await db.update(agentConfigs).set(data).where(and(eq(agentConfigs.id, id), eq(agentConfigs.userId, userId))).returning();
    return result;
  }

  async deleteAgentConfig(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(agentConfigs).where(and(eq(agentConfigs.id, id), eq(agentConfigs.userId, userId))).returning({ id: agentConfigs.id });
    return result.length > 0;
  }

  async getAgentTasksByUser(userId: string): Promise<AgentTask[]> {
    return db.select().from(agentTasks).where(eq(agentTasks.userId, userId)).orderBy(desc(agentTasks.createdAt));
  }

  async createAgentTask(task: InsertAgentTask): Promise<AgentTask> {
    const [result] = await db.insert(agentTasks).values(task).returning();
    return result;
  }

  async updateAgentTask(id: string, data: Partial<Pick<AgentTask, "status" | "result" | "completedAt">>): Promise<AgentTask | undefined> {
    const [result] = await db.update(agentTasks).set(data).where(eq(agentTasks.id, id)).returning();
    return result;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const results = await db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return results.length;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }

  async markNotificationRead(id: string, userId: string): Promise<Notification | undefined> {
    const [result] = await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId))).returning();
    return result;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId))).returning({ id: notifications.id });
    return result.length > 0;
  }

  async createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [result] = await db.insert(passwordResetTokens).values(data).returning();
    return result;
  }

  async getPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | undefined> {
    const [result] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, tokenHash));
    return result;
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
  }

  async invalidateUserResetTokens(userId: string): Promise<void> {
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }

  async createEmailVerificationToken(data: InsertEmailVerificationToken): Promise<EmailVerificationToken> {
    const [result] = await db.insert(emailVerificationTokens).values(data).returning();
    return result;
  }

  async getEmailVerificationToken(tokenHash: string): Promise<EmailVerificationToken | undefined> {
    const [result] = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.token, tokenHash));
    return result;
  }

  async invalidateUserVerificationTokens(userId: string): Promise<void> {
    await db.update(emailVerificationTokens).set({ usedAt: new Date() }).where(and(eq(emailVerificationTokens.userId, userId), isNull(emailVerificationTokens.usedAt)));
  }

  async markEmailVerified(userId: string): Promise<void> {
    await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, userId));
  }

  async createVoiceCall(call: InsertVoiceCall): Promise<VoiceCall> {
    const [result] = await db.insert(voiceCalls).values(call).returning();
    return result;
  }

  async updateVoiceCall(id: string, data: Partial<Pick<VoiceCall, "status" | "durationSec" | "outcome" | "recordingUrl" | "transcript" | "twilioCallSid" | "startedAt" | "endedAt" | "fromNumber">>): Promise<VoiceCall | undefined> {
    const [result] = await db.update(voiceCalls).set(data).where(eq(voiceCalls.id, id)).returning();
    return result;
  }

  async getVoiceCallsByUser(userId: string): Promise<VoiceCall[]> {
    return db.select().from(voiceCalls).where(eq(voiceCalls.userId, userId)).orderBy(desc(voiceCalls.createdAt));
  }

  async getVoiceCallById(id: string): Promise<VoiceCall | undefined> {
    const [result] = await db.select().from(voiceCalls).where(eq(voiceCalls.id, id));
    return result;
  }

  async getVoiceCallByTwilioSid(sid: string): Promise<VoiceCall | undefined> {
    const [result] = await db.select().from(voiceCalls).where(eq(voiceCalls.twilioCallSid, sid));
    return result;
  }

  async createEmailReply(reply: InsertEmailReply): Promise<EmailReply> {
    const [result] = await db.insert(emailReplies).values(reply).returning();
    return result;
  }

  async getEmailRepliesByLead(leadId: string): Promise<EmailReply[]> {
    return db.select().from(emailReplies).where(eq(emailReplies.leadId, leadId)).orderBy(asc(emailReplies.createdAt));
  }

  async getEmailRepliesByUser(userId: string): Promise<EmailReply[]> {
    return db.select().from(emailReplies).where(eq(emailReplies.userId, userId)).orderBy(desc(emailReplies.createdAt));
  }

  async getEmailReplyByMessageId(messageId: string): Promise<EmailReply | undefined> {
    const [result] = await db.select().from(emailReplies).where(eq(emailReplies.messageId, messageId));
    return result;
  }

  async getOrCreateUsage(userId: string): Promise<UsageTracking> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [existing] = await db.select().from(usageTracking).where(
      and(
        eq(usageTracking.userId, userId),
        lte(usageTracking.periodStart, now),
      )
    ).orderBy(desc(usageTracking.periodStart)).limit(1);

    if (existing && new Date(existing.periodStart).getMonth() === now.getMonth() && new Date(existing.periodStart).getFullYear() === now.getFullYear()) {
      return existing;
    }

    const [created] = await db.insert(usageTracking).values({
      userId,
      periodStart,
      periodEnd,
      aiChats: 0,
      smsSent: 0,
      emailsSent: 0,
      voiceCalls: 0,
      voiceMinutes: 0,
      leadsGenerated: 0,
    }).returning();
    return created;
  }

  async incrementUsage(userId: string, field: "aiChats" | "smsSent" | "emailsSent" | "voiceCalls" | "leadsGenerated", amount: number = 1): Promise<UsageTracking> {
    const usage = await this.getOrCreateUsage(userId);
    const columnMap = {
      aiChats: usageTracking.aiChats,
      smsSent: usageTracking.smsSent,
      emailsSent: usageTracking.emailsSent,
      voiceCalls: usageTracking.voiceCalls,
      leadsGenerated: usageTracking.leadsGenerated,
    };
    const col = columnMap[field];
    const [updated] = await db.update(usageTracking)
      .set({ [field]: sql`${col} + ${amount}`, updatedAt: new Date() })
      .where(eq(usageTracking.id, usage.id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
