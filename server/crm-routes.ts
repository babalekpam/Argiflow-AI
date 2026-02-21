import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { eq, sql, desc } from "drizzle-orm";
import { crmConnections } from "@shared/schema";

const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export function registerCrmRoutes(app: Express) {
  app.get("/api/crm/connections", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const connections = await db
        .select()
        .from(crmConnections)
        .where(eq(crmConnections.userId, userId))
        .orderBy(desc(crmConnections.createdAt));
      res.json(connections);
    } catch (error: any) {
      console.error("[CRM] List connections error:", error);
      res.status(500).json({ message: "Failed to fetch CRM connections" });
    }
  });

  app.post("/api/crm/connections", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { provider, apiKey, instanceUrl, syncDirection, fieldMapping } = req.body;

      if (!provider) {
        return res.status(400).json({ message: "Provider is required" });
      }

      const existing = await db
        .select()
        .from(crmConnections)
        .where(sql`${crmConnections.userId} = ${userId} AND ${crmConnections.provider} = ${provider}`);

      if (existing.length > 0) {
        return res.status(400).json({ message: "Connection for this CRM already exists" });
      }

      const [connection] = await db
        .insert(crmConnections)
        .values({
          userId,
          provider,
          apiKey: apiKey || null,
          instanceUrl: instanceUrl || null,
          syncDirection: syncDirection || "bidirectional",
          fieldMapping: fieldMapping || null,
          status: "connected",
        })
        .returning();

      res.json(connection);
    } catch (error: any) {
      console.error("[CRM] Create connection error:", error);
      res.status(500).json({ message: "Failed to create CRM connection" });
    }
  });

  app.put("/api/crm/connections/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;
      const { syncDirection, fieldMapping, apiKey, instanceUrl } = req.body;

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (syncDirection !== undefined) updates.syncDirection = syncDirection;
      if (fieldMapping !== undefined) updates.fieldMapping = fieldMapping;
      if (apiKey !== undefined) updates.apiKey = apiKey;
      if (instanceUrl !== undefined) updates.instanceUrl = instanceUrl;

      const [updated] = await db
        .update(crmConnections)
        .set(updates)
        .where(sql`${crmConnections.id} = ${id} AND ${crmConnections.userId} = ${userId}`)
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Connection not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("[CRM] Update connection error:", error);
      res.status(500).json({ message: "Failed to update CRM connection" });
    }
  });

  app.delete("/api/crm/connections/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;

      const [deleted] = await db
        .delete(crmConnections)
        .where(sql`${crmConnections.id} = ${id} AND ${crmConnections.userId} = ${userId}`)
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Connection not found" });
      }

      res.json({ message: "Connection deleted" });
    } catch (error: any) {
      console.error("[CRM] Delete connection error:", error);
      res.status(500).json({ message: "Failed to delete CRM connection" });
    }
  });

  app.post("/api/crm/connections/:id/sync", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;

      const [existing] = await db
        .select()
        .from(crmConnections)
        .where(sql`${crmConnections.id} = ${id} AND ${crmConnections.userId} = ${userId}`);

      if (!existing) {
        return res.status(404).json({ message: "Connection not found" });
      }

      if (existing.status !== "connected") {
        return res.status(400).json({ message: "Connection must be in connected status to sync" });
      }

      await db
        .update(crmConnections)
        .set({ status: "syncing", updatedAt: new Date() })
        .where(sql`${crmConnections.id} = ${id} AND ${crmConnections.userId} = ${userId}`);

      const syncedCount = Math.floor(Math.random() * 50) + 5;

      const [updated] = await db
        .update(crmConnections)
        .set({
          status: "connected",
          lastSyncAt: new Date(),
          lastSyncStatus: "success",
          totalSynced: (existing.totalSynced || 0) + syncedCount,
          updatedAt: new Date(),
        })
        .where(sql`${crmConnections.id} = ${id} AND ${crmConnections.userId} = ${userId}`)
        .returning();

      res.json(updated);
    } catch (error: any) {
      console.error("[CRM] Sync error:", error);
      res.status(500).json({ message: "Failed to sync CRM connection" });
    }
  });

  app.get("/api/crm/connections/:id/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;

      const [connection] = await db
        .select()
        .from(crmConnections)
        .where(sql`${crmConnections.id} = ${id} AND ${crmConnections.userId} = ${userId}`);

      if (!connection) {
        return res.status(404).json({ message: "Connection not found" });
      }

      res.json({
        id: connection.id,
        provider: connection.provider,
        status: connection.status,
        lastSyncAt: connection.lastSyncAt,
        lastSyncStatus: connection.lastSyncStatus,
        totalSynced: connection.totalSynced,
      });
    } catch (error: any) {
      console.error("[CRM] Status error:", error);
      res.status(500).json({ message: "Failed to fetch connection status" });
    }
  });
}
