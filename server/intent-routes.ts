import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { eq, and, sql, count, gte, desc } from "drizzle-orm";
import { intentActivity } from "@shared/schema";

const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export function registerIntentRoutes(app: Express) {
  app.get("/api/intent-signals/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      const allSignals = await db
        .select()
        .from(intentActivity)
        .where(eq(intentActivity.userId, userId));

      const total = allSignals.length;
      const highIntent = allSignals.filter((s) => s.strength > 70).length;

      const uniqueCompanies = new Set(
        allSignals.filter((s) => s.company).map((s) => s.company)
      ).size;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeek = allSignals.filter(
        (s) => s.createdAt && new Date(s.createdAt) >= oneWeekAgo
      ).length;

      res.json({ total, highIntent, uniqueCompanies, thisWeek });
    } catch (error: any) {
      console.error("Intent stats error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/intent-signals/breakdown", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      const results = await db
        .select({
          signalType: intentActivity.signalType,
          count: count(),
        })
        .from(intentActivity)
        .where(eq(intentActivity.userId, userId))
        .groupBy(intentActivity.signalType);

      const breakdown: Record<string, number> = {};
      for (const r of results) {
        breakdown[r.signalType] = r.count;
      }

      res.json(breakdown);
    } catch (error: any) {
      console.error("Intent breakdown error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/intent-signals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { type, source, minStrength } = req.query;

      const conditions = [eq(intentActivity.userId, userId)];

      if (type && typeof type === "string") {
        conditions.push(eq(intentActivity.signalType, type));
      }
      if (source && typeof source === "string") {
        conditions.push(eq(intentActivity.signalSource, source));
      }
      if (minStrength && typeof minStrength === "string") {
        const min = parseInt(minStrength, 10);
        if (!isNaN(min)) {
          conditions.push(gte(intentActivity.strength, min));
        }
      }

      const signals = await db
        .select()
        .from(intentActivity)
        .where(and(...conditions))
        .orderBy(desc(intentActivity.createdAt))
        .limit(200);

      res.json(signals);
    } catch (error: any) {
      console.error("Intent signals error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/intent-signals", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { company, leadId, signalType, signalSource, strength, description, metadata } = req.body;

      if (!signalType || !signalSource) {
        return res.status(400).json({ message: "signalType and signalSource are required" });
      }

      const [signal] = await db
        .insert(intentActivity)
        .values({
          userId,
          company: company || null,
          leadId: leadId || null,
          signalType,
          signalSource,
          strength: strength ?? 50,
          description: description || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
        })
        .returning();

      res.json(signal);
    } catch (error: any) {
      console.error("Intent create error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/intent-signals/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;

      const [deleted] = await db
        .delete(intentActivity)
        .where(sql`${intentActivity.id} = ${id} AND ${intentActivity.userId} = ${userId}`)
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Signal not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Intent delete error:", error);
      res.status(500).json({ message: error.message });
    }
  });
}
