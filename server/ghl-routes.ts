import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { eq, and, desc, lte, sql } from "drizzle-orm";
import {
  leads,
  landingPages, landingPageSteps,
  formBuilders, formSubmissions,
  chatWidgets, chatConversations, chatMessages,
  invoices,
  socialAccounts, socialPosts,
  reviewPlatforms, reviews,
  whatsappAccounts, whatsappMessages,
  metaAccounts, metaMessages,
  calendarEvents,
  documents,
  gbpAccounts, gbpPosts,
  membershipSites, membershipCourses, membershipLessons,
  abTests,
  proposals,
  affiliatePrograms, affiliates,
  blogSites, blogPosts,
  communitySpaces, communityChannels, communityPosts,
} from "@shared/schema";

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
  next();
};

function parseDates(body: any, dateFields: string[]) {
  const result = { ...body };
  for (const field of dateFields) {
    if (result[field] && typeof result[field] === "string") {
      result[field] = new Date(result[field]);
    }
  }
  return result;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientIp(req: Request): string | null {
  const fwd = req.headers["x-forwarded-for"];
  const raw = (Array.isArray(fwd) ? fwd[0] : fwd) || req.ip || req.socket.remoteAddress;
  return raw ? String(raw).split(",")[0].trim() : null;
}

// A public form submission is the conversion event for the whole funnel. Turn it
// into a CRM lead so the outreach agents can pick it up — dedupe on (userId, email)
// so a repeat submitter updates rather than duplicates.
async function captureLead(opts: {
  userId: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  company?: string | null;
  source: string;
  notes?: string | null;
}): Promise<void> {
  const email = opts.email.trim().toLowerCase();
  const [existing] = await db.select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.userId, opts.userId), eq(leads.email, email)))
    .limit(1);

  if (existing) {
    await db.update(leads)
      .set({ status: "warm", lastEngagedAt: new Date() })
      .where(eq(leads.id, existing.id));
    return;
  }

  await db.insert(leads).values({
    userId: opts.userId,
    name: (opts.name || "").trim() || email.split("@")[0],
    email,
    phone: opts.phone || null,
    company: opts.company || null,
    source: opts.source,
    status: "new",
    notes: opts.notes || null,
  });
}

export function registerGhlRoutes(app: Express) {

  // ============================================================
  // 1. Landing Pages
  // ============================================================
  app.get("/api/public/landing-pages/:slug", async (req, res) => {
    try {
      const [row] = await db.select({
        id: landingPages.id,
        name: landingPages.name,
        slug: landingPages.slug,
        type: landingPages.type,
        pageContent: landingPages.pageContent,
        seo: landingPages.seo,
        totalVisits: landingPages.totalVisits,
        totalConversions: landingPages.totalConversions,
      }).from(landingPages).where(and(eq(landingPages.slug, req.params.slug), eq(landingPages.status, "published")));
      if (!row) return res.status(404).json({ message: "Page not found" });
      await db.update(landingPages)
        .set({ totalVisits: sql`${landingPages.totalVisits} + 1` })
        .where(eq(landingPages.id, row.id));
      res.json(row);
    } catch (e: any) {
      console.error("[LandingPages] Public fetch error:", e.message);
      res.status(500).json({ message: "Failed to fetch page" });
    }
  });

  // Lead capture for the public landing page templates. Records the submission,
  // counts the conversion, and creates the CRM lead.
  app.post("/api/public/landing-pages/:slug/submit", async (req, res) => {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";

      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ message: "A valid email address is required" });
      }

      const [page] = await db.select({
        id: landingPages.id,
        userId: landingPages.userId,
        slug: landingPages.slug,
      }).from(landingPages)
        .where(and(eq(landingPages.slug, req.params.slug), eq(landingPages.status, "published")))
        .limit(1);
      if (!page) return res.status(404).json({ message: "Page not found" });

      // Landing pages have no form_builders row of their own, so submissions are
      // stored against the page id. Page ids and form ids never collide.
      await db.insert(formSubmissions).values({
        formId: page.id,
        data: JSON.stringify({ name, email, phone }),
        contactEmail: email,
        ipAddress: clientIp(req),
        sourceUrl: typeof req.body?.sourceUrl === "string" ? req.body.sourceUrl : null,
      });

      await db.update(landingPages)
        .set({ totalConversions: sql`${landingPages.totalConversions} + 1`, updatedAt: new Date() })
        .where(eq(landingPages.id, page.id));

      await captureLead({
        userId: page.userId,
        email,
        name,
        phone: phone || null,
        source: `landing_page:${page.slug || page.id}`,
      });

      res.json({ success: true });
    } catch (e: any) {
      console.error("[LandingPages] Submit error:", e.message);
      res.status(500).json({ message: "Failed to submit" });
    }
  });

  app.get("/api/landing-pages", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(landingPages).where(eq(landingPages.userId, userId)).orderBy(desc(landingPages.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch landing pages" });
    }
  });

  app.post("/api/landing-pages", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(landingPages).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create landing page" });
    }
  });

  app.get("/api/landing-pages/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(landingPages).where(and(eq(landingPages.id, (req.params.id as string)), eq(landingPages.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch landing page" });
    }
  });

  app.put("/api/landing-pages/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(landingPages).set({ ...req.body, updatedAt: new Date() }).where(and(eq(landingPages.id, (req.params.id as string)), eq(landingPages.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update landing page" });
    }
  });

  app.patch("/api/landing-pages/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(landingPages).set({ ...req.body, updatedAt: new Date() }).where(and(eq(landingPages.id, (req.params.id as string)), eq(landingPages.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[LandingPages] Patch error:", e.message);
      res.status(500).json({ message: "Failed to update landing page" });
    }
  });

  app.delete("/api/landing-pages/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(landingPages).where(and(eq(landingPages.id, (req.params.id as string)), eq(landingPages.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete landing page" });
    }
  });

  app.get("/api/landing-pages/:id/steps", requireAuth, async (req, res) => {
    try {
      const rows = await db.select().from(landingPageSteps).where(eq(landingPageSteps.pageId, (req.params.id as string))).orderBy(landingPageSteps.orderIndex);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch steps" });
    }
  });

  app.post("/api/landing-pages/:id/steps", requireAuth, async (req, res) => {
    try {
      const [row] = await db.insert(landingPageSteps).values({ ...req.body, pageId: req.params.id }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create step" });
    }
  });

  app.delete("/api/landing-pages/:pageId/steps/:id", requireAuth, async (req, res) => {
    try {
      const [row] = await db.delete(landingPageSteps).where(and(eq(landingPageSteps.id, (req.params.id as string)), eq(landingPageSteps.pageId, (req.params.pageId as string)))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete step" });
    }
  });

  // ============================================================
  // 2. Forms & Surveys
  // ============================================================
  app.get("/api/forms", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(formBuilders).where(eq(formBuilders.userId, userId)).orderBy(desc(formBuilders.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch forms" });
    }
  });

  app.post("/api/forms", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(formBuilders).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create form" });
    }
  });

  app.get("/api/forms/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(formBuilders).where(and(eq(formBuilders.id, (req.params.id as string)), eq(formBuilders.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch form" });
    }
  });

  app.put("/api/forms/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(formBuilders).set({ ...req.body, updatedAt: new Date() }).where(and(eq(formBuilders.id, (req.params.id as string)), eq(formBuilders.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update form" });
    }
  });

  app.patch("/api/forms/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(formBuilders).set({ ...req.body, updatedAt: new Date() }).where(and(eq(formBuilders.id, (req.params.id as string)), eq(formBuilders.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[Forms] Patch error:", e.message);
      res.status(500).json({ message: "Failed to update form" });
    }
  });

  app.delete("/api/forms/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(formBuilders).where(and(eq(formBuilders.id, (req.params.id as string)), eq(formBuilders.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete form" });
    }
  });

  app.get("/api/forms/:id/submissions", requireAuth, async (req, res) => {
    try {
      const rows = await db.select().from(formSubmissions).where(eq(formSubmissions.formId, (req.params.id as string))).orderBy(desc(formSubmissions.submittedAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.post("/api/forms/:id/submit", async (req, res) => {
    try {
      const [form] = await db.select({ id: formBuilders.id, userId: formBuilders.userId, name: formBuilders.name })
        .from(formBuilders).where(eq(formBuilders.id, req.params.id)).limit(1);
      if (!form) return res.status(404).json({ message: "Form not found" });

      const contactEmail = typeof req.body?.contactEmail === "string" ? req.body.contactEmail.trim() : "";

      const [row] = await db.insert(formSubmissions).values({
        formId: req.params.id,
        data: JSON.stringify(req.body.data),
        contactEmail: contactEmail || null,
        ipAddress: clientIp(req),
        sourceUrl: req.body.sourceUrl || null,
      }).returning();

      await db.update(formBuilders)
        .set({ submissionCount: sql`${formBuilders.submissionCount} + 1`, updatedAt: new Date() })
        .where(eq(formBuilders.id, req.params.id));

      if (EMAIL_RE.test(contactEmail)) {
        const fields = req.body?.data && typeof req.body.data === "object" ? req.body.data : {};
        await captureLead({
          userId: form.userId,
          email: contactEmail,
          name: fields.name || fields.fullName || "",
          phone: fields.phone || null,
          company: fields.company || null,
          source: `form:${form.name}`,
        });
      }

      res.json(row);
    } catch (e: any) {
      console.error("[Forms] Submit error:", e.message);
      res.status(500).json({ message: "Failed to submit form" });
    }
  });

  // ============================================================
  // 3. Chat Widgets
  // ============================================================
  app.get("/api/chat/widgets", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(chatWidgets).where(eq(chatWidgets.userId, userId)).orderBy(desc(chatWidgets.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch chat widgets" });
    }
  });

  app.post("/api/chat/widgets", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(chatWidgets).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create chat widget" });
    }
  });

  app.get("/api/chat/widgets/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(chatWidgets).where(and(eq(chatWidgets.id, (req.params.id as string)), eq(chatWidgets.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch chat widget" });
    }
  });

  app.put("/api/chat/widgets/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(chatWidgets).set({ ...req.body, updatedAt: new Date() }).where(and(eq(chatWidgets.id, (req.params.id as string)), eq(chatWidgets.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update chat widget" });
    }
  });

  app.patch("/api/chat/widgets/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(chatWidgets).set({ ...req.body, updatedAt: new Date() }).where(and(eq(chatWidgets.id, (req.params.id as string)), eq(chatWidgets.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[ChatWidgets] Patch error:", e.message);
      res.status(500).json({ message: "Failed to update chat widget" });
    }
  });

  app.delete("/api/chat/widgets/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(chatWidgets).where(and(eq(chatWidgets.id, (req.params.id as string)), eq(chatWidgets.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete chat widget" });
    }
  });

  app.get("/api/chat/widgets/:id/conversations", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(chatConversations).where(and(eq(chatConversations.widgetId, (req.params.id as string)), eq(chatConversations.userId, userId))).orderBy(desc(chatConversations.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/chat/conversations", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(chatConversations).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get("/api/chat/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const rows = await db.select().from(chatMessages).where(eq(chatMessages.conversationId, (req.params.id as string))).orderBy(chatMessages.sentAt);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const [row] = await db.insert(chatMessages).values({ ...req.body, conversationId: req.params.id }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ============================================================
  // 4. Invoices
  // ============================================================
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["issueDate", "dueDate", "paidAt"]);
      const [row] = await db.insert(invoices).values({ ...data, userId }).returning();
      res.json(row);
    } catch (e: any) {
      console.error("[Invoices] Create error:", e.message);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.get("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(invoices).where(and(eq(invoices.id, (req.params.id as string)), eq(invoices.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.put("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["issueDate", "dueDate", "paidAt"]);
      const [row] = await db.update(invoices).set({ ...data, updatedAt: new Date() }).where(and(eq(invoices.id, (req.params.id as string)), eq(invoices.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.patch("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["issueDate", "dueDate", "paidAt"]);
      const [row] = await db.update(invoices).set({ ...data, updatedAt: new Date() }).where(and(eq(invoices.id, (req.params.id as string)), eq(invoices.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(invoices).where(and(eq(invoices.id, (req.params.id as string)), eq(invoices.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // ============================================================
  // 5. Social Media
  // ============================================================
  app.get("/api/social/accounts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(socialAccounts).where(eq(socialAccounts.userId, userId)).orderBy(desc(socialAccounts.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch social accounts" });
    }
  });

  app.post("/api/social/accounts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(socialAccounts).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create social account" });
    }
  });

  app.get("/api/social/accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(socialAccounts).where(and(eq(socialAccounts.id, (req.params.id as string)), eq(socialAccounts.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch social account" });
    }
  });

  app.put("/api/social/accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(socialAccounts).set(req.body).where(and(eq(socialAccounts.id, (req.params.id as string)), eq(socialAccounts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update social account" });
    }
  });

  app.delete("/api/social/accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(socialAccounts).where(and(eq(socialAccounts.id, (req.params.id as string)), eq(socialAccounts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete social account" });
    }
  });

  app.get("/api/social/posts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(socialPosts).where(eq(socialPosts.userId, userId)).orderBy(desc(socialPosts.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch social posts" });
    }
  });

  app.post("/api/social/posts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["scheduledAt", "publishedAt"]);
      const [row] = await db.insert(socialPosts).values({ ...data, userId }).returning();
      res.json(row);
    } catch (e: any) {
      console.error("[SocialPosts] Create error:", e.message);
      res.status(500).json({ message: "Failed to create social post" });
    }
  });

  app.get("/api/social/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(socialPosts).where(and(eq(socialPosts.id, (req.params.id as string)), eq(socialPosts.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch social post" });
    }
  });

  app.put("/api/social/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["scheduledAt", "publishedAt"]);
      const [row] = await db.update(socialPosts).set({ ...data, updatedAt: new Date() }).where(and(eq(socialPosts.id, (req.params.id as string)), eq(socialPosts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[SocialPosts] Update error:", e.message);
      res.status(500).json({ message: "Failed to update social post" });
    }
  });

  app.patch("/api/social/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["scheduledAt", "publishedAt"]);
      const [row] = await db.update(socialPosts).set({ ...data, updatedAt: new Date() }).where(and(eq(socialPosts.id, (req.params.id as string)), eq(socialPosts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[SocialPosts] Patch error:", e.message);
      res.status(500).json({ message: "Failed to update social post" });
    }
  });

  app.delete("/api/social/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(socialPosts).where(and(eq(socialPosts.id, (req.params.id as string)), eq(socialPosts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete social post" });
    }
  });

  // ============================================================
  // 6. Reputation Management
  // ============================================================
  app.get("/api/reputation/platforms", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(reviewPlatforms).where(eq(reviewPlatforms.userId, userId)).orderBy(desc(reviewPlatforms.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch review platforms" });
    }
  });

  app.post("/api/reputation/platforms", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(reviewPlatforms).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create review platform" });
    }
  });

  app.get("/api/reputation/platforms/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(reviewPlatforms).where(and(eq(reviewPlatforms.id, (req.params.id as string)), eq(reviewPlatforms.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch review platform" });
    }
  });

  app.put("/api/reputation/platforms/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(reviewPlatforms).set(req.body).where(and(eq(reviewPlatforms.id, (req.params.id as string)), eq(reviewPlatforms.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update review platform" });
    }
  });

  app.delete("/api/reputation/platforms/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(reviewPlatforms).where(and(eq(reviewPlatforms.id, (req.params.id as string)), eq(reviewPlatforms.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete review platform" });
    }
  });

  app.get("/api/reputation/reviews", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(reviews).where(eq(reviews.userId, userId)).orderBy(desc(reviews.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.get("/api/reputation/platforms/:id/reviews", requireAuth, async (req, res) => {
    try {
      const rows = await db.select().from(reviews).where(eq(reviews.platformId, (req.params.id as string))).orderBy(desc(reviews.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reputation/reviews", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["respondedAt", "reviewDate"]);
      const [row] = await db.insert(reviews).values({ ...data, userId }).returning();
      res.json(row);
    } catch (e: any) {
      console.error("[Reviews] Create error:", e.message);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.put("/api/reputation/reviews/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["respondedAt", "reviewDate"]);
      const [row] = await db.update(reviews).set(data).where(and(eq(reviews.id, (req.params.id as string)), eq(reviews.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[Reviews] Update error:", e.message);
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  app.patch("/api/reputation/reviews/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["respondedAt"]);
      const [row] = await db.update(reviews).set({ ...data, updatedAt: new Date() }).where(and(eq(reviews.id, (req.params.id as string)), eq(reviews.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[Reviews] Patch error:", e.message);
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  app.put("/api/reputation/reviews/:id/respond", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(reviews).set({ response: req.body.response, respondedAt: new Date() }).where(and(eq(reviews.id, (req.params.id as string)), eq(reviews.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to respond to review" });
    }
  });

  app.delete("/api/reputation/reviews/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(reviews).where(and(eq(reviews.id, (req.params.id as string)), eq(reviews.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // ============================================================
  // 7. WhatsApp
  // ============================================================
  app.get("/api/whatsapp/accounts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(whatsappAccounts).where(eq(whatsappAccounts.userId, userId)).orderBy(desc(whatsappAccounts.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch WhatsApp accounts" });
    }
  });

  app.post("/api/whatsapp/accounts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(whatsappAccounts).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create WhatsApp account" });
    }
  });

  app.get("/api/whatsapp/accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(whatsappAccounts).where(and(eq(whatsappAccounts.id, (req.params.id as string)), eq(whatsappAccounts.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch WhatsApp account" });
    }
  });

  app.put("/api/whatsapp/accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(whatsappAccounts).set(req.body).where(and(eq(whatsappAccounts.id, (req.params.id as string)), eq(whatsappAccounts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update WhatsApp account" });
    }
  });

  app.delete("/api/whatsapp/accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(whatsappAccounts).where(and(eq(whatsappAccounts.id, (req.params.id as string)), eq(whatsappAccounts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete WhatsApp account" });
    }
  });

  app.get("/api/whatsapp/messages", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(whatsappMessages).where(eq(whatsappMessages.userId, userId)).orderBy(desc(whatsappMessages.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch WhatsApp messages" });
    }
  });

  app.post("/api/whatsapp/messages", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(whatsappMessages).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to send WhatsApp message" });
    }
  });

  app.get("/api/whatsapp/accounts/:id/messages", requireAuth, async (req, res) => {
    try {
      const rows = await db.select().from(whatsappMessages).where(eq(whatsappMessages.accountId, (req.params.id as string))).orderBy(desc(whatsappMessages.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // ============================================================
  // 8. Meta DMs (Facebook / Instagram)
  // ============================================================
  app.get("/api/meta/accounts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(metaAccounts).where(eq(metaAccounts.userId, userId)).orderBy(desc(metaAccounts.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch Meta accounts" });
    }
  });

  app.post("/api/meta/accounts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(metaAccounts).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create Meta account" });
    }
  });

  app.get("/api/meta/accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(metaAccounts).where(and(eq(metaAccounts.id, (req.params.id as string)), eq(metaAccounts.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch Meta account" });
    }
  });

  app.put("/api/meta/accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(metaAccounts).set(req.body).where(and(eq(metaAccounts.id, (req.params.id as string)), eq(metaAccounts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update Meta account" });
    }
  });

  app.delete("/api/meta/accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(metaAccounts).where(and(eq(metaAccounts.id, (req.params.id as string)), eq(metaAccounts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete Meta account" });
    }
  });

  app.get("/api/meta/messages", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(metaMessages).where(eq(metaMessages.userId, userId)).orderBy(desc(metaMessages.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch Meta messages" });
    }
  });

  app.post("/api/meta/messages", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(metaMessages).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to send Meta message" });
    }
  });

  app.get("/api/meta/accounts/:id/messages", requireAuth, async (req, res) => {
    try {
      const rows = await db.select().from(metaMessages).where(eq(metaMessages.accountId, (req.params.id as string))).orderBy(desc(metaMessages.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // ============================================================
  // 9. Calendar Events
  // ============================================================
  app.get("/api/calendar/events", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(calendarEvents).where(eq(calendarEvents.userId, userId)).orderBy(desc(calendarEvents.startTime));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  app.post("/api/calendar/events", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["startTime", "endTime"]);
      const [row] = await db.insert(calendarEvents).values({ ...data, userId }).returning();
      res.json(row);
    } catch (e: any) {
      console.error("[CalendarEvents] Create error:", e.message);
      res.status(500).json({ message: "Failed to create calendar event" });
    }
  });

  app.get("/api/calendar/events/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(calendarEvents).where(and(eq(calendarEvents.id, (req.params.id as string)), eq(calendarEvents.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch calendar event" });
    }
  });

  app.put("/api/calendar/events/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["startTime", "endTime"]);
      const [row] = await db.update(calendarEvents).set({ ...data, updatedAt: new Date() }).where(and(eq(calendarEvents.id, (req.params.id as string)), eq(calendarEvents.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[CalendarEvents] Update error:", e.message);
      res.status(500).json({ message: "Failed to update calendar event" });
    }
  });

  app.patch("/api/calendar/events/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["startTime", "endTime"]);
      const [row] = await db.update(calendarEvents).set({ ...data, updatedAt: new Date() }).where(and(eq(calendarEvents.id, (req.params.id as string)), eq(calendarEvents.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[Calendar] Patch error:", e.message);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/calendar/events/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(calendarEvents).where(and(eq(calendarEvents.id, (req.params.id as string)), eq(calendarEvents.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete calendar event" });
    }
  });

  // ============================================================
  // 10. Documents & E-Signatures
  // ============================================================
  app.get("/api/documents", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/documents", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["sentAt", "signedAt"]);
      const [row] = await db.insert(documents).values({ ...data, userId }).returning();
      res.json(row);
    } catch (e: any) {
      console.error("[Documents] Create error:", e.message);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.get("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(documents).where(and(eq(documents.id, (req.params.id as string)), eq(documents.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.put("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["sentAt", "signedAt"]);
      const [row] = await db.update(documents).set({ ...data, updatedAt: new Date() }).where(and(eq(documents.id, (req.params.id as string)), eq(documents.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[Documents] Update error:", e.message);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.patch("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["sentAt", "signedAt"]);
      const [row] = await db.update(documents).set({ ...data, updatedAt: new Date() }).where(and(eq(documents.id, (req.params.id as string)), eq(documents.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[Documents] Patch error:", e.message);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete("/api/documents/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(documents).where(and(eq(documents.id, (req.params.id as string)), eq(documents.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  app.put("/api/documents/:id/send", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(documents).set({ status: "sent", sentAt: new Date(), updatedAt: new Date() }).where(and(eq(documents.id, (req.params.id as string)), eq(documents.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to send document" });
    }
  });

  app.put("/api/documents/:id/sign", requireAuth, async (req, res) => {
    try {
      const [row] = await db.update(documents).set({ status: "signed", signedAt: new Date(), signatureData: req.body.signatureData || null, updatedAt: new Date() }).where(eq(documents.id, (req.params.id as string))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to sign document" });
    }
  });

  // ============================================================
  // 11. Google Business Profile
  // ============================================================
  app.get("/api/gbp/accounts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(gbpAccounts).where(eq(gbpAccounts.userId, userId)).orderBy(desc(gbpAccounts.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch GBP accounts" });
    }
  });

  app.post("/api/gbp/accounts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(gbpAccounts).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create GBP account" });
    }
  });

  app.get("/api/gbp/accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(gbpAccounts).where(and(eq(gbpAccounts.id, (req.params.id as string)), eq(gbpAccounts.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch GBP account" });
    }
  });

  app.put("/api/gbp/accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(gbpAccounts).set(req.body).where(and(eq(gbpAccounts.id, (req.params.id as string)), eq(gbpAccounts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update GBP account" });
    }
  });

  app.delete("/api/gbp/accounts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(gbpAccounts).where(and(eq(gbpAccounts.id, (req.params.id as string)), eq(gbpAccounts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete GBP account" });
    }
  });

  app.get("/api/gbp/posts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(gbpPosts).where(eq(gbpPosts.userId, userId)).orderBy(desc(gbpPosts.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch GBP posts" });
    }
  });

  app.post("/api/gbp/posts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["publishedAt"]);
      const [row] = await db.insert(gbpPosts).values({ ...data, userId }).returning();
      res.json(row);
    } catch (e: any) {
      console.error("[GBPPosts] Create error:", e.message);
      res.status(500).json({ message: "Failed to create GBP post" });
    }
  });

  app.get("/api/gbp/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(gbpPosts).where(and(eq(gbpPosts.id, (req.params.id as string)), eq(gbpPosts.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch GBP post" });
    }
  });

  app.put("/api/gbp/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["publishedAt"]);
      const [row] = await db.update(gbpPosts).set(data).where(and(eq(gbpPosts.id, (req.params.id as string)), eq(gbpPosts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[GBPPosts] Update error:", e.message);
      res.status(500).json({ message: "Failed to update GBP post" });
    }
  });

  app.patch("/api/gbp/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["publishedAt"]);
      const [row] = await db.update(gbpPosts).set({ ...data, updatedAt: new Date() }).where(and(eq(gbpPosts.id, (req.params.id as string)), eq(gbpPosts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[GBP] Patch error:", e.message);
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  app.delete("/api/gbp/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(gbpPosts).where(and(eq(gbpPosts.id, (req.params.id as string)), eq(gbpPosts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete GBP post" });
    }
  });

  app.get("/api/gbp/accounts/:id/posts", requireAuth, async (req, res) => {
    try {
      const rows = await db.select().from(gbpPosts).where(eq(gbpPosts.accountId, (req.params.id as string))).orderBy(desc(gbpPosts.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  // ============================================================
  // 12. Membership / Courses
  // ============================================================
  app.get("/api/membership/sites", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(membershipSites).where(eq(membershipSites.userId, userId)).orderBy(desc(membershipSites.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch membership sites" });
    }
  });

  app.post("/api/membership/sites", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(membershipSites).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create membership site" });
    }
  });

  app.get("/api/membership/sites/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(membershipSites).where(and(eq(membershipSites.id, (req.params.id as string)), eq(membershipSites.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch membership site" });
    }
  });

  app.put("/api/membership/sites/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(membershipSites).set(req.body).where(and(eq(membershipSites.id, (req.params.id as string)), eq(membershipSites.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update membership site" });
    }
  });

  app.delete("/api/membership/sites/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(membershipSites).where(and(eq(membershipSites.id, (req.params.id as string)), eq(membershipSites.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete membership site" });
    }
  });

  app.get("/api/membership/courses", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(membershipCourses).where(eq(membershipCourses.userId, userId)).orderBy(desc(membershipCourses.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get("/api/membership/sites/:id/courses", requireAuth, async (req, res) => {
    try {
      const rows = await db.select().from(membershipCourses).where(eq(membershipCourses.siteId, (req.params.id as string))).orderBy(desc(membershipCourses.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.post("/api/membership/courses", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(membershipCourses).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  app.get("/api/membership/courses/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(membershipCourses).where(and(eq(membershipCourses.id, (req.params.id as string)), eq(membershipCourses.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  app.put("/api/membership/courses/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(membershipCourses).set({ ...req.body, updatedAt: new Date() }).where(and(eq(membershipCourses.id, (req.params.id as string)), eq(membershipCourses.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  app.patch("/api/membership/courses/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(membershipCourses).set({ ...req.body, updatedAt: new Date() }).where(and(eq(membershipCourses.id, (req.params.id as string)), eq(membershipCourses.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[Membership] Patch error:", e.message);
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  app.delete("/api/membership/courses/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(membershipCourses).where(and(eq(membershipCourses.id, (req.params.id as string)), eq(membershipCourses.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  app.get("/api/membership/courses/:id/lessons", requireAuth, async (req, res) => {
    try {
      const rows = await db.select().from(membershipLessons).where(eq(membershipLessons.courseId, (req.params.id as string))).orderBy(membershipLessons.orderIndex);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  app.post("/api/membership/courses/:id/lessons", requireAuth, async (req, res) => {
    try {
      const [row] = await db.insert(membershipLessons).values({ ...req.body, courseId: req.params.id }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create lesson" });
    }
  });

  app.put("/api/membership/lessons/:id", requireAuth, async (req, res) => {
    try {
      const [row] = await db.update(membershipLessons).set(req.body).where(eq(membershipLessons.id, (req.params.id as string))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update lesson" });
    }
  });

  app.delete("/api/membership/lessons/:id", requireAuth, async (req, res) => {
    try {
      const [row] = await db.delete(membershipLessons).where(eq(membershipLessons.id, (req.params.id as string))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete lesson" });
    }
  });

  // ============================================================
  // 13. A/B Testing
  // ============================================================
  app.get("/api/ab-tests", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(abTests).where(eq(abTests.userId, userId)).orderBy(desc(abTests.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch A/B tests" });
    }
  });

  app.post("/api/ab-tests", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(abTests).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create A/B test" });
    }
  });

  app.get("/api/ab-tests/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(abTests).where(and(eq(abTests.id, (req.params.id as string)), eq(abTests.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch A/B test" });
    }
  });

  app.put("/api/ab-tests/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(abTests).set({ ...req.body, updatedAt: new Date() }).where(and(eq(abTests.id, (req.params.id as string)), eq(abTests.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update A/B test" });
    }
  });

  app.patch("/api/ab-tests/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(abTests).set({ ...req.body, updatedAt: new Date() }).where(and(eq(abTests.id, (req.params.id as string)), eq(abTests.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update A/B test" });
    }
  });

  app.delete("/api/ab-tests/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(abTests).where(and(eq(abTests.id, (req.params.id as string)), eq(abTests.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete A/B test" });
    }
  });

  // ============================================================
  // 14. Proposals & Estimates
  // ============================================================
  app.get("/api/proposals", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(proposals).where(eq(proposals.userId, userId)).orderBy(desc(proposals.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch proposals" });
    }
  });

  app.post("/api/proposals", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["validUntil", "sentAt", "acceptedAt"]);
      const [row] = await db.insert(proposals).values({ ...data, userId }).returning();
      res.json(row);
    } catch (e: any) {
      console.error("[Proposals] Create error:", e.message);
      res.status(500).json({ message: "Failed to create proposal" });
    }
  });

  app.get("/api/proposals/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(proposals).where(and(eq(proposals.id, (req.params.id as string)), eq(proposals.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch proposal" });
    }
  });

  app.put("/api/proposals/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["validUntil", "sentAt", "acceptedAt"]);
      const [row] = await db.update(proposals).set({ ...data, updatedAt: new Date() }).where(and(eq(proposals.id, (req.params.id as string)), eq(proposals.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[Proposals] Update error:", e.message);
      res.status(500).json({ message: "Failed to update proposal" });
    }
  });

  app.patch("/api/proposals/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["validUntil", "sentAt", "acceptedAt"]);
      const [row] = await db.update(proposals).set({ ...data, updatedAt: new Date() }).where(and(eq(proposals.id, (req.params.id as string)), eq(proposals.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[Proposals] Patch error:", e.message);
      res.status(500).json({ message: "Failed to update proposal" });
    }
  });

  app.delete("/api/proposals/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(proposals).where(and(eq(proposals.id, (req.params.id as string)), eq(proposals.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete proposal" });
    }
  });

  app.put("/api/proposals/:id/send", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(proposals).set({ status: "sent", sentAt: new Date(), updatedAt: new Date() }).where(and(eq(proposals.id, (req.params.id as string)), eq(proposals.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to send proposal" });
    }
  });

  app.put("/api/proposals/:id/accept", requireAuth, async (req, res) => {
    try {
      const [row] = await db.update(proposals).set({ status: "accepted", acceptedAt: new Date(), updatedAt: new Date() }).where(eq(proposals.id, (req.params.id as string))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to accept proposal" });
    }
  });

  // ============================================================
  // 15. Affiliates
  // ============================================================
  app.get("/api/affiliates/programs", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(affiliatePrograms).where(eq(affiliatePrograms.userId, userId)).orderBy(desc(affiliatePrograms.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch affiliate programs" });
    }
  });

  app.post("/api/affiliates/programs", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(affiliatePrograms).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create affiliate program" });
    }
  });

  app.get("/api/affiliates/programs/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(affiliatePrograms).where(and(eq(affiliatePrograms.id, (req.params.id as string)), eq(affiliatePrograms.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch affiliate program" });
    }
  });

  app.put("/api/affiliates/programs/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(affiliatePrograms).set(req.body).where(and(eq(affiliatePrograms.id, (req.params.id as string)), eq(affiliatePrograms.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update affiliate program" });
    }
  });

  app.delete("/api/affiliates/programs/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(affiliatePrograms).where(and(eq(affiliatePrograms.id, (req.params.id as string)), eq(affiliatePrograms.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete affiliate program" });
    }
  });

  app.get("/api/affiliates/members", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(affiliates).where(eq(affiliates.userId, userId)).orderBy(desc(affiliates.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch affiliates" });
    }
  });

  app.get("/api/affiliates/programs/:id/members", requireAuth, async (req, res) => {
    try {
      const rows = await db.select().from(affiliates).where(eq(affiliates.programId, (req.params.id as string))).orderBy(desc(affiliates.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch affiliates" });
    }
  });

  app.post("/api/affiliates/members", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(affiliates).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create affiliate" });
    }
  });

  app.get("/api/affiliates/members/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(affiliates).where(and(eq(affiliates.id, (req.params.id as string)), eq(affiliates.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch affiliate" });
    }
  });

  app.put("/api/affiliates/members/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(affiliates).set(req.body).where(and(eq(affiliates.id, (req.params.id as string)), eq(affiliates.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update affiliate" });
    }
  });

  app.delete("/api/affiliates/members/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(affiliates).where(and(eq(affiliates.id, (req.params.id as string)), eq(affiliates.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete affiliate" });
    }
  });

  // ============================================================
  // 16. Blog
  // ============================================================
  app.get("/api/blog/sites", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(blogSites).where(eq(blogSites.userId, userId)).orderBy(desc(blogSites.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch blog sites" });
    }
  });

  app.post("/api/blog/sites", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(blogSites).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create blog site" });
    }
  });

  app.get("/api/blog/sites/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(blogSites).where(and(eq(blogSites.id, (req.params.id as string)), eq(blogSites.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch blog site" });
    }
  });

  app.put("/api/blog/sites/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(blogSites).set(req.body).where(and(eq(blogSites.id, (req.params.id as string)), eq(blogSites.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update blog site" });
    }
  });

  app.delete("/api/blog/sites/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(blogSites).where(and(eq(blogSites.id, (req.params.id as string)), eq(blogSites.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete blog site" });
    }
  });

  app.get("/api/blog/posts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(blogPosts).where(eq(blogPosts.userId, userId)).orderBy(desc(blogPosts.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.get("/api/blog/sites/:id/posts", requireAuth, async (req, res) => {
    try {
      const rows = await db.select().from(blogPosts).where(eq(blogPosts.siteId, (req.params.id as string))).orderBy(desc(blogPosts.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.post("/api/blog/posts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["publishedAt"]);
      const [row] = await db.insert(blogPosts).values({ ...data, userId }).returning();
      res.json(row);
    } catch (e: any) {
      console.error("[BlogPosts] Create error:", e.message);
      res.status(500).json({ message: "Failed to create blog post" });
    }
  });

  app.get("/api/blog/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(blogPosts).where(and(eq(blogPosts.id, (req.params.id as string)), eq(blogPosts.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  app.put("/api/blog/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["publishedAt"]);
      const [row] = await db.update(blogPosts).set({ ...data, updatedAt: new Date() }).where(and(eq(blogPosts.id, (req.params.id as string)), eq(blogPosts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[BlogPosts] Update error:", e.message);
      res.status(500).json({ message: "Failed to update blog post" });
    }
  });

  app.patch("/api/blog/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const data = parseDates(req.body, ["publishedAt"]);
      const [row] = await db.update(blogPosts).set({ ...data, updatedAt: new Date() }).where(and(eq(blogPosts.id, (req.params.id as string)), eq(blogPosts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      console.error("[BlogPosts] Patch error:", e.message);
      res.status(500).json({ message: "Failed to update blog post" });
    }
  });

  app.delete("/api/blog/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(blogPosts).where(and(eq(blogPosts.id, (req.params.id as string)), eq(blogPosts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete blog post" });
    }
  });

  // ============================================================
  // 17. Communities
  // ============================================================
  app.get("/api/communities/spaces", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(communitySpaces).where(eq(communitySpaces.userId, userId)).orderBy(desc(communitySpaces.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch community spaces" });
    }
  });

  app.post("/api/communities/spaces", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(communitySpaces).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create community space" });
    }
  });

  app.get("/api/communities/spaces/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(communitySpaces).where(and(eq(communitySpaces.id, (req.params.id as string)), eq(communitySpaces.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch community space" });
    }
  });

  app.put("/api/communities/spaces/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(communitySpaces).set(req.body).where(and(eq(communitySpaces.id, (req.params.id as string)), eq(communitySpaces.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update community space" });
    }
  });

  app.delete("/api/communities/spaces/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(communitySpaces).where(and(eq(communitySpaces.id, (req.params.id as string)), eq(communitySpaces.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete community space" });
    }
  });

  app.get("/api/communities/channels", requireAuth, async (req, res) => {
    try {
      const rows = await db.select().from(communityChannels).orderBy(desc(communityChannels.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });

  app.get("/api/communities/spaces/:id/channels", requireAuth, async (req, res) => {
    try {
      const rows = await db.select().from(communityChannels).where(eq(communityChannels.spaceId, (req.params.id as string))).orderBy(communityChannels.createdAt);
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });

  app.post("/api/communities/channels", requireAuth, async (req, res) => {
    try {
      const [row] = await db.insert(communityChannels).values(req.body).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create channel" });
    }
  });

  app.get("/api/communities/channels/:id", requireAuth, async (req, res) => {
    try {
      const [row] = await db.select().from(communityChannels).where(eq(communityChannels.id, (req.params.id as string)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch channel" });
    }
  });

  app.put("/api/communities/channels/:id", requireAuth, async (req, res) => {
    try {
      const [row] = await db.update(communityChannels).set(req.body).where(eq(communityChannels.id, (req.params.id as string))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update channel" });
    }
  });

  app.delete("/api/communities/channels/:id", requireAuth, async (req, res) => {
    try {
      const [row] = await db.delete(communityChannels).where(eq(communityChannels.id, (req.params.id as string))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete channel" });
    }
  });

  app.get("/api/communities/posts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const rows = await db.select().from(communityPosts).where(eq(communityPosts.userId, userId)).orderBy(desc(communityPosts.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch community posts" });
    }
  });

  app.get("/api/communities/channels/:id/posts", requireAuth, async (req, res) => {
    try {
      const rows = await db.select().from(communityPosts).where(eq(communityPosts.channelId, (req.params.id as string))).orderBy(desc(communityPosts.createdAt));
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.post("/api/communities/posts", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.insert(communityPosts).values({ ...req.body, userId }).returning();
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to create community post" });
    }
  });

  app.get("/api/communities/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.select().from(communityPosts).where(and(eq(communityPosts.id, (req.params.id as string)), eq(communityPosts.userId, userId)));
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to fetch community post" });
    }
  });

  app.put("/api/communities/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.update(communityPosts).set(req.body).where(and(eq(communityPosts.id, (req.params.id as string)), eq(communityPosts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to update community post" });
    }
  });

  app.delete("/api/communities/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [row] = await db.delete(communityPosts).where(and(eq(communityPosts.id, (req.params.id as string)), eq(communityPosts.userId, userId))).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Failed to delete community post" });
    }
  });

  async function processScheduledSocialPosts() {
    try {
      const now = new Date();
      const duePosts = await db.select().from(socialPosts)
        .where(
          and(
            eq(socialPosts.status, "scheduled"),
            lte(socialPosts.scheduledAt, now)
          )
        );

      if (duePosts.length === 0) return;

      for (const post of duePosts) {
        try {
          await db.update(socialPosts)
            .set({
              status: "published",
              publishedAt: now,
              updatedAt: now,
            })
            .where(eq(socialPosts.id, post.id));

          const platforms = post.platforms || "unknown";
          console.log(`[SocialScheduler] Published post ${post.id} to ${platforms}`);
        } catch (err: any) {
          console.error(`[SocialScheduler] Failed to publish post ${post.id}:`, err.message);
          await db.update(socialPosts)
            .set({ status: "failed", updatedAt: now })
            .where(eq(socialPosts.id, post.id));
        }
      }

      console.log(`[SocialScheduler] Processed ${duePosts.length} scheduled post(s)`);
    } catch (err: any) {
      console.error("[SocialScheduler] Error:", err.message);
    }
  }

  setInterval(processScheduledSocialPosts, 60_000);
  setTimeout(processScheduledSocialPosts, 5_000);
  console.log("[SocialScheduler] Background publisher started — checks every 60 seconds");

  app.post("/api/social/posts/:id/publish-now", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const [post] = await db.select().from(socialPosts)
        .where(and(eq(socialPosts.id, (req.params.id as string)), eq(socialPosts.userId, userId)));
      if (!post) return res.status(404).json({ message: "Post not found" });

      const now = new Date();
      const [updated] = await db.update(socialPosts)
        .set({ status: "published", publishedAt: now, updatedAt: now })
        .where(eq(socialPosts.id, post.id))
        .returning();

      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: "Failed to publish post" });
    }
  });
}
