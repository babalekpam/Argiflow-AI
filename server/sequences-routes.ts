import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { eq, and, count, sql, desc } from "drizzle-orm";
import { sequences, sequenceSteps, sequenceEnrollments } from "@shared/schema";

const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export function registerSequenceRoutes(app: Express) {
  app.get("/api/sequences/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      const allSeqs = await db
        .select()
        .from(sequences)
        .where(eq(sequences.userId, userId));

      const totalSequences = allSeqs.length;
      const activeCount = allSeqs.filter((s) => s.status === "active").length;
      const totalEnrolled = allSeqs.reduce((sum, s) => sum + (s.totalEnrolled || 0), 0);
      const totalReplied = allSeqs.reduce((sum, s) => sum + (s.totalReplied || 0), 0);
      const replyRate = totalEnrolled > 0 ? Math.round((totalReplied / totalEnrolled) * 100) : 0;

      res.json({ totalSequences, activeCount, totalEnrolled, replyRate });
    } catch (error: any) {
      console.error("[Sequences] Stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/sequences", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      const seqs = await db
        .select()
        .from(sequences)
        .where(eq(sequences.userId, userId))
        .orderBy(desc(sequences.createdAt));

      const result = await Promise.all(
        seqs.map(async (seq) => {
          const steps = await db
            .select()
            .from(sequenceSteps)
            .where(eq(sequenceSteps.sequenceId, seq.id));

          const channels = [...new Set(steps.map((s) => s.channel))];
          return { ...seq, stepCount: steps.length, channels };
        })
      );

      res.json(result);
    } catch (error: any) {
      console.error("[Sequences] List error:", error);
      res.status(500).json({ message: "Failed to fetch sequences" });
    }
  });

  app.post("/api/sequences", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { name, description, steps: stepsData } = req.body;

      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "Name is required" });
      }

      const [newSeq] = await db
        .insert(sequences)
        .values({
          userId,
          name,
          description: description || null,
          status: "draft",
        })
        .returning();

      if (Array.isArray(stepsData) && stepsData.length > 0) {
        for (let i = 0; i < stepsData.length; i++) {
          const step = stepsData[i];
          await db.insert(sequenceSteps).values({
            sequenceId: newSeq.id,
            stepNumber: i + 1,
            channel: step.channel || "email",
            subject: step.subject || null,
            content: step.content || "",
            delayDays: step.delayDays ?? 1,
            delayHours: step.delayHours ?? 0,
            variants: step.variants || null,
          });
        }
      }

      res.json(newSeq);
    } catch (error: any) {
      console.error("[Sequences] Create error:", error);
      res.status(500).json({ message: "Failed to create sequence" });
    }
  });

  app.put("/api/sequences/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;
      const { name, description, status } = req.body;

      const [existing] = await db
        .select()
        .from(sequences)
        .where(and(eq(sequences.id, id), eq(sequences.userId, userId)));

      if (!existing) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (status !== undefined) updates.status = status;

      const [updated] = await db
        .update(sequences)
        .set(updates)
        .where(and(eq(sequences.id, id), eq(sequences.userId, userId)))
        .returning();

      res.json(updated);
    } catch (error: any) {
      console.error("[Sequences] Update error:", error);
      res.status(500).json({ message: "Failed to update sequence" });
    }
  });

  app.delete("/api/sequences/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;

      const [existing] = await db
        .select()
        .from(sequences)
        .where(and(eq(sequences.id, id), eq(sequences.userId, userId)));

      if (!existing) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      await db.delete(sequenceSteps).where(eq(sequenceSteps.sequenceId, id));
      await db.delete(sequenceEnrollments).where(eq(sequenceEnrollments.sequenceId, id));
      await db.delete(sequences).where(and(eq(sequences.id, id), eq(sequences.userId, userId)));

      res.json({ message: "Sequence deleted" });
    } catch (error: any) {
      console.error("[Sequences] Delete error:", error);
      res.status(500).json({ message: "Failed to delete sequence" });
    }
  });

  app.get("/api/sequences/:id/steps", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;

      const [existing] = await db
        .select()
        .from(sequences)
        .where(and(eq(sequences.id, id), eq(sequences.userId, userId)));

      if (!existing) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      const steps = await db
        .select()
        .from(sequenceSteps)
        .where(eq(sequenceSteps.sequenceId, id))
        .orderBy(sequenceSteps.stepNumber);

      res.json(steps);
    } catch (error: any) {
      console.error("[Sequences] Get steps error:", error);
      res.status(500).json({ message: "Failed to fetch steps" });
    }
  });

  app.post("/api/sequences/:id/steps", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;
      const { steps: stepsData } = req.body;

      const [existing] = await db
        .select()
        .from(sequences)
        .where(and(eq(sequences.id, id), eq(sequences.userId, userId)));

      if (!existing) {
        return res.status(404).json({ message: "Sequence not found" });
      }

      await db.delete(sequenceSteps).where(eq(sequenceSteps.sequenceId, id));

      if (Array.isArray(stepsData) && stepsData.length > 0) {
        for (let i = 0; i < stepsData.length; i++) {
          const step = stepsData[i];
          await db.insert(sequenceSteps).values({
            sequenceId: id,
            stepNumber: i + 1,
            channel: step.channel || "email",
            subject: step.subject || null,
            content: step.content || "",
            delayDays: step.delayDays ?? 1,
            delayHours: step.delayHours ?? 0,
            variants: step.variants || null,
          });
        }
      }

      const updatedSteps = await db
        .select()
        .from(sequenceSteps)
        .where(eq(sequenceSteps.sequenceId, id))
        .orderBy(sequenceSteps.stepNumber);

      res.json(updatedSteps);
    } catch (error: any) {
      console.error("[Sequences] Update steps error:", error);
      res.status(500).json({ message: "Failed to update steps" });
    }
  });
}
