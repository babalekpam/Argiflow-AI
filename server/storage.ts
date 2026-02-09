import {
  leads, appointments, aiAgents, dashboardStats,
  type Lead, type InsertLead,
  type Appointment, type InsertAppointment,
  type AiAgent, type InsertAiAgent,
  type DashboardStats, type InsertDashboardStats,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getLeadsByUser(userId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  deleteLead(id: string, userId: string): Promise<void>;
  getAppointmentsByUser(userId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAiAgentsByUser(userId: string): Promise<AiAgent[]>;
  createAiAgent(agent: InsertAiAgent): Promise<AiAgent>;
  getStatsByUser(userId: string): Promise<DashboardStats | undefined>;
  upsertStats(stats: InsertDashboardStats): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
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
}

export const storage = new DatabaseStorage();
