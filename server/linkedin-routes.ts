import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { eq, and, sql, count, desc } from "drizzle-orm";
import { linkedinProfiles, leads, userSettings } from "@shared/schema";
import { storage } from "./storage";

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

  app.post("/api/linkedin/link-account", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { linkedinProfileUrl, linkedinEmail } = req.body;

      if (!linkedinProfileUrl || !linkedinEmail) {
        return res.status(400).json({ message: "LinkedIn profile URL and email are required" });
      }

      const [existing] = await db.select().from(userSettings)
        .where(eq(userSettings.userId, userId));

      if (existing) {
        await db.update(userSettings)
          .set({ linkedinProfileUrl, linkedinEmail, linkedinConnected: true, updatedAt: new Date() })
          .where(eq(userSettings.userId, userId));
      } else {
        await db.insert(userSettings).values({ userId, linkedinProfileUrl, linkedinEmail, linkedinConnected: true });
      }

      res.json({ success: true, message: "LinkedIn account linked" });
    } catch (error: any) {
      console.error("[LinkedIn] Link error:", error);
      res.status(500).json({ message: "Failed to link account" });
    }
  });

  app.post("/api/linkedin/unlink-account", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      await db.update(userSettings)
        .set({ linkedinProfileUrl: null, linkedinEmail: null, linkedinConnected: false, updatedAt: new Date() })
        .where(eq(userSettings.userId, userId));
      res.json({ success: true, message: "LinkedIn account unlinked" });
    } catch (error: any) {
      console.error("[LinkedIn] Unlink error:", error);
      res.status(500).json({ message: "Failed to unlink account" });
    }
  });

  app.get("/api/linkedin/account-status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [settings] = await db.select().from(userSettings)
        .where(eq(userSettings.userId, userId));

      res.json({
        linked: settings?.linkedinConnected || false,
        profileUrl: settings?.linkedinProfileUrl || null,
        email: settings?.linkedinEmail || null,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to check account status" });
    }
  });

  app.post("/api/linkedin/import-csv", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { connections } = req.body;

      if (!connections || !Array.isArray(connections) || connections.length === 0) {
        return res.status(400).json({ message: "No connections data provided" });
      }

      if (connections.length > 50000) {
        return res.status(400).json({ message: "Maximum 50,000 connections per import. Please split your CSV." });
      }

      const existingProfiles = await db.select({
        fullName: linkedinProfiles.fullName,
        company: linkedinProfiles.company,
        linkedinUrl: linkedinProfiles.linkedinUrl,
      }).from(linkedinProfiles).where(eq(linkedinProfiles.userId, userId));

      const existingKeys = new Set(
        existingProfiles.map(p => `${(p.fullName || "").toLowerCase()}|${(p.company || "").toLowerCase()}`)
      );
      const existingUrls = new Set(
        existingProfiles.map(p => (p.linkedinUrl || "").toLowerCase()).filter(Boolean)
      );

      let imported = 0;
      let skipped = 0;
      const batchSize = 100;
      const toInsert: any[] = [];

      for (const conn of connections) {
        const firstName = (conn["First Name"] || conn.firstName || "").trim();
        const lastName = (conn["Last Name"] || conn.lastName || "").trim();
        const fullName = `${firstName} ${lastName}`.trim();
        const email = (conn["Email Address"] || conn.emailAddress || conn.email || "").trim();
        const company = (conn["Company"] || conn.company || "").trim();
        const position = (conn["Position"] || conn.position || conn.headline || "").trim();
        const connectedOn = conn["Connected On"] || conn.connectedOn || "";
        const linkedinUrl = conn["URL"] || conn.url || conn.linkedinUrl || "";

        if (!fullName || fullName.length < 2) {
          skipped++;
          continue;
        }

        const key = `${fullName.toLowerCase()}|${company.toLowerCase()}`;
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }
        if (linkedinUrl && existingUrls.has(linkedinUrl.toLowerCase())) {
          skipped++;
          continue;
        }

        existingKeys.add(key);
        if (linkedinUrl) existingUrls.add(linkedinUrl.toLowerCase());

        toInsert.push({
          userId,
          linkedinUrl: linkedinUrl || `https://linkedin.com/in/${fullName.toLowerCase().replace(/\s+/g, "-")}`,
          fullName,
          headline: position || null,
          company: company || null,
          location: null,
          connectionStatus: "connected",
          outreachStatus: "none",
          notes: connectedOn ? `Connected on: ${connectedOn}` : null,
          enrichmentData: email ? JSON.stringify({ email }) : null,
        });
      }

      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        await db.insert(linkedinProfiles).values(batch);
      }
      imported = toInsert.length;
      skipped = connections.length - imported;

      res.json({
        success: true,
        imported,
        skipped,
        total: connections.length,
        message: `Imported ${imported} connections, skipped ${skipped} duplicates`,
      });
    } catch (error: any) {
      console.error("[LinkedIn] CSV import error:", error);
      res.status(500).json({ message: "Failed to import connections" });
    }
  });

  app.post("/api/linkedin/convert-to-leads", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { profileIds } = req.body;

      let profilesToConvert;
      if (profileIds && Array.isArray(profileIds) && profileIds.length > 0) {
        const allProfiles = await db.select().from(linkedinProfiles)
          .where(eq(linkedinProfiles.userId, userId));
        const idSet = new Set(profileIds as string[]);
        profilesToConvert = allProfiles.filter(p => idSet.has(p.id));
      } else {
        profilesToConvert = await db.select().from(linkedinProfiles)
          .where(sql`${linkedinProfiles.userId} = ${userId} AND ${linkedinProfiles.leadId} IS NULL`);
      }

      if (profilesToConvert.length === 0) {
        return res.json({ converted: 0, message: "No profiles to convert" });
      }

      let converted = 0;
      const convertedLeadIds: string[] = [];
      for (const profile of profilesToConvert) {
        let email = "";
        try {
          if (profile.enrichmentData) {
            const data = JSON.parse(profile.enrichmentData);
            email = data.email || "";
          }
        } catch {}

        const existingLead = email
          ? await db.select().from(leads)
              .where(sql`${leads.userId} = ${userId} AND LOWER(${leads.email}) = LOWER(${email})`)
          : [];

        if (existingLead.length > 0) {
          await db.update(linkedinProfiles)
            .set({ leadId: existingLead[0].id, updatedAt: new Date() })
            .where(eq(linkedinProfiles.id, profile.id));
          continue;
        }

        const [newLead] = await db.insert(leads).values({
          userId,
          name: profile.fullName || "Unknown",
          email: email || `${(profile.fullName || "contact").toLowerCase().replace(/\s+/g, ".")}@linkedin.import`,
          company: profile.company || null,
          source: "LinkedIn Import",
          status: "new",
          score: 50,
          notes: `LinkedIn: ${profile.linkedinUrl}\nHeadline: ${profile.headline || "N/A"}\nLocation: ${profile.location || "N/A"}`,
          engagementLevel: "cold",
          intentSignal: profile.headline ? `Works as ${profile.headline}` : null,
        }).returning();

        await db.update(linkedinProfiles)
          .set({ leadId: newLead.id, updatedAt: new Date() })
          .where(eq(linkedinProfiles.id, profile.id));

        convertedLeadIds.push(newLead.id);
        converted++;
      }

      try {
        const { autoEnrollLeadInSequence } = await import("./sequence-automation");
        let enrolled = 0;
        for (const leadId of convertedLeadIds) {
          const ok = await autoEnrollLeadInSequence(userId, leadId);
          if (ok) enrolled++;
        }
        if (enrolled > 0) {
          console.log(`[LinkedIn] Auto-enrolled ${enrolled} converted leads into sequences`);
        }
      } catch (seqErr: any) {
        console.warn(`[LinkedIn] Sequence enrollment error: ${seqErr.message}`);
      }

      res.json({
        converted,
        total: profilesToConvert.length,
        message: `Converted ${converted} LinkedIn connections to leads`,
      });
    } catch (error: any) {
      console.error("[LinkedIn] Convert error:", error);
      res.status(500).json({ message: "Failed to convert to leads" });
    }
  });

  app.post("/api/linkedin/enrich", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { profileIds } = req.body;

      let profilesToEnrich;
      if (profileIds && Array.isArray(profileIds) && profileIds.length > 0) {
        const allProfiles = await db.select().from(linkedinProfiles)
          .where(eq(linkedinProfiles.userId, userId));
        const idSet = new Set(profileIds as string[]);
        profilesToEnrich = allProfiles.filter(p => idSet.has(p.id));
      } else {
        profilesToEnrich = await db.select().from(linkedinProfiles)
          .where(sql`${linkedinProfiles.userId} = ${userId} AND ${linkedinProfiles.enrichmentData} IS NULL`)
          .limit(50);
      }

      if (profilesToEnrich.length === 0) {
        return res.json({ enriched: 0, message: "No profiles to enrich" });
      }

      let enriched = 0;
      for (const profile of profilesToEnrich) {
        try {
          const enrichmentData: any = {};

          if (profile.company) {
            const emailPatterns = [
              `${(profile.fullName || "").split(" ")[0]?.toLowerCase() || "info"}@${profile.company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
              `${(profile.fullName || "").toLowerCase().replace(/\s+/g, ".")}@${profile.company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
            ];
            enrichmentData.possibleEmails = emailPatterns;
            enrichmentData.email = emailPatterns[0];
            enrichmentData.companyDomain = `${profile.company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
          }

          if (profile.headline) {
            enrichmentData.role = profile.headline;
            const seniorKeywords = ["ceo", "cto", "cfo", "vp", "director", "head", "founder", "owner", "president", "chief", "partner"];
            const isDecisionMaker = seniorKeywords.some(k => (profile.headline || "").toLowerCase().includes(k));
            enrichmentData.isDecisionMaker = isDecisionMaker;
            enrichmentData.leadScore = isDecisionMaker ? 85 : 55;
          }

          enrichmentData.source = "linkedin_enrichment";
          enrichmentData.enrichedAt = new Date().toISOString();

          await db.update(linkedinProfiles)
            .set({ enrichmentData: JSON.stringify(enrichmentData), updatedAt: new Date() })
            .where(eq(linkedinProfiles.id, profile.id));

          enriched++;
        } catch (eErr: any) {
          console.warn(`[LinkedIn] Enrich error for ${profile.fullName}: ${eErr.message}`);
        }
      }

      res.json({
        enriched,
        total: profilesToEnrich.length,
        message: `Enriched ${enriched} profiles with company data and email patterns`,
      });
    } catch (error: any) {
      console.error("[LinkedIn] Enrich error:", error);
      res.status(500).json({ message: "Failed to enrich profiles" });
    }
  });
}
