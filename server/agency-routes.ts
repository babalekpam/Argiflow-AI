import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { eq, sql, desc, count, sum } from "drizzle-orm";
import { agencyClients } from "@shared/schema";

const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export function registerAgencyRoutes(app: Express) {
  app.get("/api/agency/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      const clients = await db
        .select()
        .from(agencyClients)
        .where(eq(agencyClients.ownerId, userId));

      const total = clients.length;
      const active = clients.filter((c) => c.status === "active").length;
      const totalLeads = clients.reduce((sum, c) => sum + (c.totalLeads || 0), 0);
      const monthlyRevenue = clients.reduce((sum, c) => sum + (c.monthlyBudget || 0), 0);

      res.json({ total, active, totalLeads, monthlyRevenue });
    } catch (error: any) {
      console.error("[Agency] Stats error:", error);
      res.status(500).json({ message: "Failed to fetch agency stats" });
    }
  });

  app.get("/api/agency/clients", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      const clients = await db
        .select()
        .from(agencyClients)
        .where(eq(agencyClients.ownerId, userId))
        .orderBy(desc(agencyClients.createdAt));

      res.json(clients);
    } catch (error: any) {
      console.error("[Agency] List clients error:", error);
      res.status(500).json({ message: "Failed to fetch agency clients" });
    }
  });

  app.get("/api/agency/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;

      const [client] = await db
        .select()
        .from(agencyClients)
        .where(sql`${agencyClients.id} = ${id} AND ${agencyClients.ownerId} = ${userId}`);

      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.json(client);
    } catch (error: any) {
      console.error("[Agency] Get client error:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/agency/clients", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { name, domain, logo, brandColor, industry, contactEmail, contactName, monthlyBudget, notes } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Client name is required" });
      }

      const [client] = await db
        .insert(agencyClients)
        .values({
          ownerId: userId,
          name,
          domain: domain || null,
          logo: logo || null,
          brandColor: brandColor || "#00e5a0",
          industry: industry || null,
          contactEmail: contactEmail || null,
          contactName: contactName || null,
          monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : 0,
          notes: notes || null,
        })
        .returning();

      res.json(client);
    } catch (error: any) {
      console.error("[Agency] Create client error:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.put("/api/agency/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;
      const { name, domain, logo, brandColor, industry, contactEmail, contactName, monthlyBudget, notes, totalLeads, totalDeals } = req.body;

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (domain !== undefined) updates.domain = domain;
      if (logo !== undefined) updates.logo = logo;
      if (brandColor !== undefined) updates.brandColor = brandColor;
      if (industry !== undefined) updates.industry = industry;
      if (contactEmail !== undefined) updates.contactEmail = contactEmail;
      if (contactName !== undefined) updates.contactName = contactName;
      if (monthlyBudget !== undefined) updates.monthlyBudget = parseFloat(monthlyBudget);
      if (notes !== undefined) updates.notes = notes;
      if (totalLeads !== undefined) updates.totalLeads = parseInt(totalLeads);
      if (totalDeals !== undefined) updates.totalDeals = parseInt(totalDeals);

      const [client] = await db
        .update(agencyClients)
        .set(updates)
        .where(sql`${agencyClients.id} = ${id} AND ${agencyClients.ownerId} = ${userId}`)
        .returning();

      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.json(client);
    } catch (error: any) {
      console.error("[Agency] Update client error:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.put("/api/agency/clients/:id/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;
      const { status } = req.body;

      if (!["active", "paused", "churned"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const [client] = await db
        .update(agencyClients)
        .set({ status, updatedAt: new Date() })
        .where(sql`${agencyClients.id} = ${id} AND ${agencyClients.ownerId} = ${userId}`)
        .returning();

      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.json(client);
    } catch (error: any) {
      console.error("[Agency] Update status error:", error);
      res.status(500).json({ message: "Failed to update client status" });
    }
  });

  app.delete("/api/agency/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;

      const [deleted] = await db
        .delete(agencyClients)
        .where(sql`${agencyClients.id} = ${id} AND ${agencyClients.ownerId} = ${userId}`)
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Client not found" });
      }

      res.json({ message: "Client deleted" });
    } catch (error: any) {
      console.error("[Agency] Delete client error:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });
}
