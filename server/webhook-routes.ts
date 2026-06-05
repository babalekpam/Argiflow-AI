import type { Express } from "express";
import { db } from "./db";
import { webhookEndpoints, webhookDeliveries } from "@shared/schema";
import { eq, sql, desc, count } from "drizzle-orm";
import { randomBytes } from "crypto";

function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { valid: false, error: "Only http and https URLs are allowed" };
  }
  const hostname = parsed.hostname.toLowerCase();
  // Block loopback, link-local, and private ranges
  const blocked = [
    /^localhost$/,
    /^127\./,
    /^0\.0\.0\.0$/,
    /^::1$/,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^fc00:/,
    /^fe80:/,
  ];
  if (blocked.some(re => re.test(hostname))) {
    return { valid: false, error: "URL resolves to a blocked address" };
  }
  return { valid: true };
}

export function registerWebhookRoutes(app: Express) {
  app.get("/api/webhooks/stats", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
      const endpoints = await db
        .select()
        .from(webhookEndpoints)
        .where(eq(webhookEndpoints.userId, userId));

      const totalEndpoints = endpoints.length;
      const activeEndpoints = endpoints.filter((e) => e.status === "active").length;
      const totalDeliveries = endpoints.reduce((sum, e) => sum + (e.totalDeliveries || 0), 0);

      res.json({ totalEndpoints, activeEndpoints, totalDeliveries });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/webhooks", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
      const endpoints = await db
        .select()
        .from(webhookEndpoints)
        .where(eq(webhookEndpoints.userId, userId))
        .orderBy(desc(webhookEndpoints.createdAt));

      res.json(endpoints);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch webhooks" });
    }
  });

  app.post("/api/webhooks", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
      const { name, url, secret, events, status } = req.body;

      if (!name || !url || !events) {
        return res.status(400).json({ message: "Name, URL, and events are required" });
      }

      const urlCheck = validateWebhookUrl(url);
      if (!urlCheck.valid) {
        return res.status(400).json({ message: urlCheck.error || "Invalid webhook URL" });
      }

      const generatedSecret = secret || randomBytes(32).toString("hex");

      const [endpoint] = await db
        .insert(webhookEndpoints)
        .values({
          userId,
          name,
          url,
          secret: generatedSecret,
          events: Array.isArray(events) ? events.join(",") : events,
          status: status || "active",
        })
        .returning();

      res.json(endpoint);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create webhook" });
    }
  });

  app.put("/api/webhooks/:id", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { name, url, secret, events, status } = req.body;

    try {
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (url !== undefined) {
        const urlCheck = validateWebhookUrl(url);
        if (!urlCheck.valid) return res.status(400).json({ message: urlCheck.error || "Invalid webhook URL" });
        updateData.url = url;
      }
      if (secret !== undefined) updateData.secret = secret;
      if (events !== undefined) updateData.events = Array.isArray(events) ? events.join(",") : events;
      if (status !== undefined) updateData.status = status;

      const [updated] = await db
        .update(webhookEndpoints)
        .set(updateData)
        .where(sql`${webhookEndpoints.id} = ${id} AND ${webhookEndpoints.userId} = ${userId}`)
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update webhook" });
    }
  });

  app.delete("/api/webhooks/:id", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;

    try {
      await db
        .delete(webhookDeliveries)
        .where(eq(webhookDeliveries.endpointId, id));

      const [deleted] = await db
        .delete(webhookEndpoints)
        .where(sql`${webhookEndpoints.id} = ${id} AND ${webhookEndpoints.userId} = ${userId}`)
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      res.json({ message: "Webhook deleted" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete webhook" });
    }
  });

  app.post("/api/webhooks/:id/test", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;

    try {
      const [endpoint] = await db
        .select()
        .from(webhookEndpoints)
        .where(sql`${webhookEndpoints.id} = ${id} AND ${webhookEndpoints.userId} = ${userId}`);

      if (!endpoint) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      const testPayload = {
        event: "test.ping",
        timestamp: new Date().toISOString(),
        data: {
          message: "This is a test webhook delivery from ArgiFlow",
          endpoint_id: endpoint.id,
          endpoint_name: endpoint.name,
        },
      };

      const urlCheck = validateWebhookUrl(endpoint.url);
      if (!urlCheck.valid) {
        return res.status(400).json({ message: "Stored webhook URL is invalid or blocked" });
      }

      let responseStatus = 0;
      let responseBody = "";
      let deliveryStatus = "failed";

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Secret": endpoint.secret || "",
            "X-Webhook-Event": "test.ping",
          },
          body: JSON.stringify(testPayload),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        responseStatus = response.status;
        responseBody = await response.text().catch(() => "");
        deliveryStatus = response.ok ? "delivered" : "failed";
      } catch (fetchError: any) {
        responseBody = fetchError.message || "Connection failed";
        deliveryStatus = "failed";
      }

      const [delivery] = await db
        .insert(webhookDeliveries)
        .values({
          endpointId: endpoint.id,
          event: "test.ping",
          payload: JSON.stringify(testPayload),
          responseStatus: responseStatus || null,
          responseBody: responseBody.slice(0, 2000),
          status: deliveryStatus,
          attempts: 1,
          deliveredAt: deliveryStatus === "delivered" ? new Date() : null,
        })
        .returning();

      await db
        .update(webhookEndpoints)
        .set({
          lastTriggeredAt: new Date(),
          totalDeliveries: sql`${webhookEndpoints.totalDeliveries} + 1`,
          totalFailures:
            deliveryStatus === "failed"
              ? sql`${webhookEndpoints.totalFailures} + 1`
              : webhookEndpoints.totalFailures,
        })
        .where(eq(webhookEndpoints.id, endpoint.id));

      res.json({ delivery, status: deliveryStatus });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to test webhook" });
    }
  });

  app.get("/api/webhooks/:id/deliveries", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;

    try {
      const [endpoint] = await db
        .select()
        .from(webhookEndpoints)
        .where(sql`${webhookEndpoints.id} = ${id} AND ${webhookEndpoints.userId} = ${userId}`);

      if (!endpoint) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      const deliveries = await db
        .select()
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.endpointId, id))
        .orderBy(desc(webhookDeliveries.createdAt))
        .limit(50);

      res.json(deliveries);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch deliveries" });
    }
  });
}
