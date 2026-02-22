import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { eq, and, sql, count, desc } from "drizzle-orm";
import { linkedinProfiles, leads, userSettings, users } from "@shared/schema";
import { storage } from "./storage";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

const filterJobs = new Map<string, {
  status: "detecting_industry" | "filtering" | "done" | "error";
  industry: string;
  totalProfiles: number;
  processed: number;
  kept: number;
  removed: number;
  message: string;
  startedAt: number;
}>();

async function detectUserIndustry(userId: string): Promise<string | null> {
  try {
    const [user] = await db.select({
      companyName: users.companyName,
      jobTitle: users.jobTitle,
      industry: users.industry,
      companyDescription: users.companyDescription,
    }).from(users).where(eq(users.id, userId));

    if (!user) return null;
    if (user.industry && user.industry.trim().length > 1) return user.industry.trim();

    const context = [
      user.companyName && `Company: ${user.companyName}`,
      user.jobTitle && `Job Title: ${user.jobTitle}`,
      user.companyDescription && `Description: ${user.companyDescription}`,
    ].filter(Boolean).join(", ");

    if (!context) return null;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You detect a user's industry from their business info. Return ONLY the industry name as a single short phrase (e.g. 'healthcare', 'real estate', 'technology', 'finance', 'legal', 'education'). Nothing else." },
        { role: "user", content: context }
      ],
      temperature: 0,
      max_tokens: 50,
    });
    const industry = (response.choices[0]?.message?.content || "").trim().toLowerCase();
    if (industry.length >= 2 && industry.length <= 100) {
      await db.update(users).set({ industry }).where(eq(users.id, userId));
      return industry;
    }
    return null;
  } catch (err: any) {
    console.error("[LinkedIn] Industry detection error:", err.message);
    return null;
  }
}

async function runBackgroundIndustryFilter(userId: string, industry: string) {
  const job = filterJobs.get(userId);
  if (!job) return;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const allProfiles = await db.select({
      id: linkedinProfiles.id,
      fullName: linkedinProfiles.fullName,
      headline: linkedinProfiles.headline,
      company: linkedinProfiles.company,
    }).from(linkedinProfiles).where(eq(linkedinProfiles.userId, userId));

    job.totalProfiles = allProfiles.length;
    job.status = "filtering";

    if (allProfiles.length === 0) {
      job.status = "done";
      job.message = "No profiles to filter";
      return;
    }

    const batchSize = 100;
    for (let i = 0; i < allProfiles.length; i += batchSize) {
      const batch = allProfiles.slice(i, i + batchSize);

      try {
        const compact = batch.map(p =>
          `${p.id}|${p.fullName || ""}|${p.headline || ""}|${p.company || ""}`
        ).join("\n");

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `Classify profiles as "${industry}" or not. Input: lines of "id|name|headline|company". Return ONLY a JSON array of IDs that belong to ${industry}. Be inclusive — if there's a reasonable chance they're in ${industry}, keep them.` },
            { role: "user", content: compact }
          ],
          temperature: 0.1,
          max_tokens: 8000,
        });

        const content = response.choices[0]?.message?.content || "";
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          job.kept += batch.length;
          job.processed += batch.length;
          continue;
        }

        let keepIds: string[];
        try {
          keepIds = JSON.parse(jsonMatch[0]);
          if (!Array.isArray(keepIds)) throw new Error("bad");
        } catch {
          job.kept += batch.length;
          job.processed += batch.length;
          continue;
        }

        const batchIds = new Set(batch.map(p => p.id));
        const keepSet = new Set(keepIds.filter(id => typeof id === "string" && batchIds.has(id)));
        const removeIds = batch.filter(p => !keepSet.has(p.id)).map(p => p.id);

        if (removeIds.length > 0) {
          await db.delete(linkedinProfiles).where(
            sql`${linkedinProfiles.id} IN (${sql.join(removeIds.map(id => sql`${id}`), sql`,`)}) AND ${linkedinProfiles.userId} = ${userId}`
          );
        }

        job.kept += keepSet.size;
        job.removed += removeIds.length;
        job.processed += batch.length;
        console.log(`[LinkedIn] Filter ${industry} batch: +${keepSet.size} kept, -${removeIds.length} removed (${job.processed}/${job.totalProfiles})`);
      } catch (aiErr: any) {
        console.warn(`[LinkedIn] AI filter batch error: ${aiErr.message}`);
        job.kept += batch.length;
        job.processed += batch.length;
      }
    }

    job.status = "done";
    job.message = `Kept ${job.kept} ${industry} contacts, removed ${job.removed} non-${industry} contacts`;
    console.log(`[LinkedIn] Filter complete: ${job.message}`);
  } catch (err: any) {
    console.error("[LinkedIn] Background filter error:", err.message);
    job.status = "error";
    job.message = `Filter failed: ${err.message}`;
  }
}

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

      if (connections.length > 0) {
        console.log("[LinkedIn] CSV headers/keys from first row:", Object.keys(connections[0]));
        console.log("[LinkedIn] First row sample:", JSON.stringify(connections[0]).slice(0, 500));
      }

      for (const conn of connections) {
        const keys = Object.keys(conn);
        const get = (aliases: string[]) => {
          for (const alias of aliases) {
            const found = keys.find(k => k.toLowerCase().replace(/[_\s-]/g, "") === alias.toLowerCase().replace(/[_\s-]/g, ""));
            if (found && conn[found]) return conn[found];
          }
          return "";
        };

        const firstName = get(["First Name", "firstName", "first_name", "Prénom", "prenom"]).trim();
        const lastName = get(["Last Name", "lastName", "last_name", "Nom", "nom de famille"]).trim();
        const fullName = `${firstName} ${lastName}`.trim();
        const email = get(["Email Address", "emailAddress", "email", "E-mail", "adresse e-mail"]).trim();
        const company = get(["Company", "société", "societe", "organization", "Organisation", "entreprise"]).trim();
        const position = get(["Position", "title", "Job Title", "jobtitle", "headline", "Poste", "titre"]).trim();
        const connectedOn = get(["Connected On", "connectedOn", "connected_on", "Date de connexion"]);
        const linkedinUrl = get(["URL", "Profile URL", "profileurl", "linkedin url", "Lien"]);

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

      let autoFilterStarted = false;
      if (imported > 0) {
        const existingJob = filterJobs.get(userId);
        if (!existingJob || existingJob.status === "done" || existingJob.status === "error") {
          autoFilterStarted = true;
          filterJobs.set(userId, {
            status: "detecting_industry",
            industry: "",
            totalProfiles: 0,
            processed: 0,
            kept: 0,
            removed: 0,
            message: "Detecting your industry...",
            startedAt: Date.now(),
          });

          (async () => {
            const job = filterJobs.get(userId)!;
            try {
              const industry = await detectUserIndustry(userId);
              if (!industry) {
                job.status = "error";
                job.message = "Could not detect industry — please set your industry in Settings to enable auto-filtering";
                return;
              }
              job.industry = industry;
              job.message = `Filtering contacts for "${industry}"...`;
              console.log(`[LinkedIn] Auto-filter: detected industry "${industry}" for user ${userId}`);
              await runBackgroundIndustryFilter(userId, industry);
            } catch (err: any) {
              console.error("[LinkedIn] Auto-filter error:", err.message);
              job.status = "error";
              job.message = `Auto-filter failed: ${err.message}`;
            }
          })();
        }
      }

      res.json({
        success: true,
        imported,
        skipped,
        total: connections.length,
        message: `Imported ${imported} connections, skipped ${skipped} duplicates`,
        autoFilterStarted,
      });
    } catch (error: any) {
      console.error("[LinkedIn] CSV import error:", error);
      res.status(500).json({ message: "Failed to import connections" });
    }
  });

  app.get("/api/linkedin/filter-status", isAuthenticated, async (req, res) => {
    const userId = req.session!.userId!;
    const job = filterJobs.get(userId);
    if (!job) {
      return res.json({ active: false });
    }
    const elapsed = Math.round((Date.now() - job.startedAt) / 1000);
    res.json({
      active: job.status === "detecting_industry" || job.status === "filtering",
      status: job.status,
      industry: job.industry,
      totalProfiles: job.totalProfiles,
      processed: job.processed,
      kept: job.kept,
      removed: job.removed,
      message: job.message,
      elapsedSeconds: elapsed,
    });
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

  app.post("/api/linkedin/filter-industry", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { industry } = req.body;

      if (!industry || typeof industry !== "string" || industry.trim().length < 2 || industry.trim().length > 100) {
        return res.status(400).json({ message: "Please specify a valid industry name (2-100 characters)" });
      }

      const existingJob = filterJobs.get(userId);
      if (existingJob && (existingJob.status === "detecting_industry" || existingJob.status === "filtering")) {
        return res.status(409).json({ message: "A filter is already running. Check progress via the status endpoint." });
      }

      filterJobs.set(userId, {
        status: "filtering",
        industry: industry.trim(),
        totalProfiles: 0,
        processed: 0,
        kept: 0,
        removed: 0,
        message: `Filtering contacts for "${industry.trim()}"...`,
        startedAt: Date.now(),
      });

      runBackgroundIndustryFilter(userId, industry.trim());

      res.json({
        started: true,
        message: `AI industry filter started for "${industry.trim()}". Check /api/linkedin/filter-status for progress.`,
      });
    } catch (error: any) {
      console.error("[LinkedIn] Industry filter error:", error);
      res.status(500).json({ message: "Failed to start industry filter" });
    }
  });

  app.post("/api/linkedin/seed-profiles", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const seedFile = path.join(process.cwd(), "server", "seed-linkedin-profiles.json");
      if (!fs.existsSync(seedFile)) {
        return res.status(404).json({ message: "No seed data available" });
      }

      const raw = fs.readFileSync(seedFile, "utf-8");
      const profiles = JSON.parse(raw);
      if (!Array.isArray(profiles) || profiles.length === 0) {
        return res.status(400).json({ message: "No profiles in seed file" });
      }

      const existing = await db
        .select({ url: linkedinProfiles.linkedinUrl })
        .from(linkedinProfiles)
        .where(eq(linkedinProfiles.userId, userId));
      const existingUrls = new Set(existing.map((e) => e.url?.trim().toLowerCase()));

      const toInsert = profiles
        .filter((p: any) => !existingUrls.has(p.linkedin_url?.trim().toLowerCase()))
        .map((p: any) => ({
          userId,
          linkedinUrl: p.linkedin_url || "",
          fullName: p.full_name || "",
          headline: p.headline || "",
          company: p.company || "",
          location: p.location || "",
          connectionStatus: p.connection_status || "none",
          outreachStatus: p.outreach_status || "none",
          enrichmentData: p.enrichment_data || null,
        }));

      if (toInsert.length === 0) {
        return res.json({ imported: 0, message: "All profiles already exist" });
      }

      const batchSize = 100;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        await db.insert(linkedinProfiles).values(toInsert.slice(i, i + batchSize));
      }

      console.log(`[LinkedIn] Seeded ${toInsert.length} profiles for user ${userId}`);
      res.json({ imported: toInsert.length, message: `Imported ${toInsert.length} profiles` });
    } catch (error: any) {
      console.error("[LinkedIn] Seed error:", error);
      res.status(500).json({ message: "Failed to seed profiles" });
    }
  });
}
