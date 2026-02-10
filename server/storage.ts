import {
  leads, appointments, aiAgents, dashboardStats, admins, users, userSettings, aiChatMessages, marketingStrategies,
  funnels, funnelStages, funnelDeals,
  type Lead, type InsertLead,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, asc } from "drizzle-orm";

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { email: string; passwordHash: string; firstName: string; lastName: string }): Promise<User>;
  getLeadsByUser(userId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  deleteLead(id: string, userId: string): Promise<void>;
  deleteAllLeadsByUser(userId: string): Promise<void>;
  getAppointmentsByUser(userId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAiAgentsByUser(userId: string): Promise<AiAgent[]>;
  createAiAgent(agent: InsertAiAgent): Promise<AiAgent>;
  updateAiAgent(id: string, userId: string, data: Partial<Pick<AiAgent, "name" | "status" | "description" | "type">>): Promise<AiAgent | undefined>;
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
  updateUser(id: string, data: Partial<Pick<User, "companyName" | "industry" | "website" | "companyDescription" | "onboardingCompleted">>): Promise<User | undefined>;
  getMarketingStrategy(userId: string): Promise<MarketingStrategy | undefined>;
  upsertMarketingStrategy(strategy: InsertMarketingStrategy): Promise<MarketingStrategy>;
  getFunnelById(id: string): Promise<Funnel | undefined>;
  getFunnelsByUser(userId: string): Promise<Funnel[]>;
  createFunnel(funnel: InsertFunnel): Promise<Funnel>;
  deleteFunnel(id: string, userId: string): Promise<void>;
  getFunnelStages(funnelId: string): Promise<FunnelStage[]>;
  createFunnelStage(stage: InsertFunnelStage): Promise<FunnelStage>;
  deleteFunnelStages(funnelId: string): Promise<void>;
  getFunnelDeals(funnelId: string): Promise<FunnelDeal[]>;
  createFunnelDeal(deal: InsertFunnelDeal): Promise<FunnelDeal>;
  updateFunnelDeal(id: string, data: Partial<Pick<FunnelDeal, "stageId" | "contactName" | "contactEmail" | "value" | "status">>): Promise<FunnelDeal | undefined>;
  deleteFunnelDeal(id: string, userId: string): Promise<void>;
  deleteFunnelDeals(funnelId: string): Promise<void>;
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

  async getLeadsByUser(userId: string): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.userId, userId)).orderBy(desc(leads.createdAt));
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [result] = await db.insert(leads).values(lead).returning();
    return result;
  }

  async deleteLead(id: string, userId: string): Promise<void> {
    await db.delete(leads).where(and(eq(leads.id, id), eq(leads.userId, userId)));
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

  async getAiAgentsByUser(userId: string): Promise<AiAgent[]> {
    return db.select().from(aiAgents).where(eq(aiAgents.userId, userId));
  }

  async createAiAgent(agent: InsertAiAgent): Promise<AiAgent> {
    const [result] = await db.insert(aiAgents).values(agent).returning();
    return result;
  }

  async updateAiAgent(id: string, userId: string, data: Partial<Pick<AiAgent, "name" | "status" | "description" | "type">>): Promise<AiAgent | undefined> {
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

  async updateUser(id: string, data: Partial<Pick<User, "companyName" | "industry" | "website" | "companyDescription" | "onboardingCompleted">>): Promise<User | undefined> {
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

  async deleteFunnel(id: string, userId: string): Promise<void> {
    await db.delete(funnels).where(and(eq(funnels.id, id), eq(funnels.userId, userId)));
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

  async getFunnelDeals(funnelId: string): Promise<FunnelDeal[]> {
    return db.select().from(funnelDeals).where(eq(funnelDeals.funnelId, funnelId)).orderBy(desc(funnelDeals.createdAt));
  }

  async createFunnelDeal(deal: InsertFunnelDeal): Promise<FunnelDeal> {
    const [result] = await db.insert(funnelDeals).values(deal).returning();
    return result;
  }

  async updateFunnelDeal(id: string, data: Partial<Pick<FunnelDeal, "stageId" | "contactName" | "contactEmail" | "value" | "status">>): Promise<FunnelDeal | undefined> {
    const [result] = await db.update(funnelDeals).set(data).where(eq(funnelDeals.id, id)).returning();
    return result;
  }

  async deleteFunnelDeal(id: string, userId: string): Promise<void> {
    await db.delete(funnelDeals).where(and(eq(funnelDeals.id, id), eq(funnelDeals.userId, userId)));
  }

  async deleteFunnelDeals(funnelId: string): Promise<void> {
    await db.delete(funnelDeals).where(eq(funnelDeals.funnelId, funnelId));
  }
}

export const storage = new DatabaseStorage();
