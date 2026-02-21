import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { eq, and, sql, count, desc } from "drizzle-orm";
import { linkedinProfiles } from "@shared/schema";

const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export function registerLinkedinRoutes(app: Express) {
  app.get("/api/linkedin/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      const profiles = await db
        .select()
        .from(linkedinProfiles)
        .where(eq(linkedinProfiles.userId, userId));

      const totalProfiles = profiles.length;
      const connected = profiles.filter((p) => p.connectionStatus === "connected").length;
      const messagesSent = profiles.filter((p) => p.outreachStatus === "message_sent" || p.outreachStatus === "replied" || p.outreachStatus === "meeting_booked").length;
      const replies = profiles.filter((p) => p.outreachStatus === "replied" || p.outreachStatus === "meeting_booked").length;

      res.json({ totalProfiles, connected, messagesSent, replies });
    } catch (error: any) {
      console.error("[LinkedIn] Stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/linkedin/profiles", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      const profiles = await db
        .select()
        .from(linkedinProfiles)
        .where(eq(linkedinProfiles.userId, userId))
        .orderBy(desc(linkedinProfiles.createdAt));

      res.json(profiles);
    } catch (error: any) {
      console.error("[LinkedIn] List error:", error);
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  app.post("/api/linkedin/profiles", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { linkedinUrl, fullName, headline, company, location, connectionStatus, outreachStatus, notes, leadId } = req.body;

      if (!linkedinUrl || typeof linkedinUrl !== "string") {
        return res.status(400).json({ message: "LinkedIn URL is required" });
      }

      const [profile] = await db
        .insert(linkedinProfiles)
        .values({
          userId,
          linkedinUrl,
          fullName: fullName || null,
          headline: headline || null,
          company: company || null,
          location: location || null,
          connectionStatus: connectionStatus || "none",
          outreachStatus: outreachStatus || "none",
          notes: notes || null,
          leadId: leadId || null,
        })
        .returning();

      res.json(profile);
    } catch (error: any) {
      console.error("[LinkedIn] Create error:", error);
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  app.put("/api/linkedin/profiles/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;
      const { linkedinUrl, fullName, headline, company, location, connectionStatus, outreachStatus, notes, leadId } = req.body;

      const [existing] = await db
        .select()
        .from(linkedinProfiles)
        .where(sql`${linkedinProfiles.id} = ${id} AND ${linkedinProfiles.userId} = ${userId}`);

      if (!existing) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const [updated] = await db
        .update(linkedinProfiles)
        .set({
          linkedinUrl: linkedinUrl ?? existing.linkedinUrl,
          fullName: fullName ?? existing.fullName,
          headline: headline ?? existing.headline,
          company: company ?? existing.company,
          location: location ?? existing.location,
          connectionStatus: connectionStatus ?? existing.connectionStatus,
          outreachStatus: outreachStatus ?? existing.outreachStatus,
          notes: notes ?? existing.notes,
          leadId: leadId ?? existing.leadId,
          updatedAt: new Date(),
        })
        .where(sql`${linkedinProfiles.id} = ${id} AND ${linkedinProfiles.userId} = ${userId}`)
        .returning();

      res.json(updated);
    } catch (error: any) {
      console.error("[LinkedIn] Update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.delete("/api/linkedin/profiles/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;

      const [existing] = await db
        .select()
        .from(linkedinProfiles)
        .where(sql`${linkedinProfiles.id} = ${id} AND ${linkedinProfiles.userId} = ${userId}`);

      if (!existing) {
        return res.status(404).json({ message: "Profile not found" });
      }

      await db
        .delete(linkedinProfiles)
        .where(sql`${linkedinProfiles.id} = ${id} AND ${linkedinProfiles.userId} = ${userId}`);

      res.json({ success: true });
    } catch (error: any) {
      console.error("[LinkedIn] Delete error:", error);
      res.status(500).json({ message: "Failed to delete profile" });
    }
  });

  app.post("/api/linkedin/profiles/:id/log-message", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;
      const { message } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message text is required" });
      }

      const [existing] = await db
        .select()
        .from(linkedinProfiles)
        .where(sql`${linkedinProfiles.id} = ${id} AND ${linkedinProfiles.userId} = ${userId}`);

      if (!existing) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const [updated] = await db
        .update(linkedinProfiles)
        .set({
          lastMessageSent: message,
          lastMessageAt: new Date(),
          outreachStatus: existing.outreachStatus === "none" ? "message_sent" : existing.outreachStatus,
          updatedAt: new Date(),
        })
        .where(sql`${linkedinProfiles.id} = ${id} AND ${linkedinProfiles.userId} = ${userId}`)
        .returning();

      res.json(updated);
    } catch (error: any) {
      console.error("[LinkedIn] Log message error:", error);
      res.status(500).json({ message: "Failed to log message" });
    }
  });
}
