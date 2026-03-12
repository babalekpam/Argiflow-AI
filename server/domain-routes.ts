// ============================================================
// DOMAIN ROUTES — ArgiFlow White-Label Sending
// Mount: app.use("/api/domains", domainRoutes)
// ============================================================

import { Router } from "express";
import domainEngine from "./domain-engine";
import quotaEngine from "./email-quota-engine";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const userId = req.session?.userId || req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

// ── ADD DOMAIN ────────────────────────────────────────────────
// POST /api/domains/add
router.post("/add", requireAuth, async (req: any, res) => {
  try {
    const { domain, fromName, fromEmail } = req.body;

    if (!domain) return res.status(400).json({ error: "domain is required" });

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain.replace(/^https?:\/\//, "").split("/")[0])) {
      return res.status(400).json({ error: "Invalid domain format" });
    }

    const result = await domainEngine.addClientDomain(req.userId, domain, fromName, fromEmail);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── VERIFY DOMAIN DNS ─────────────────────────────────────────
// POST /api/domains/:id/verify
router.post("/:id/verify", requireAuth, async (req: any, res) => {
  try {
    const result = await domainEngine.verifyClientDomain(req.params.id, req.userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── LIST USER DOMAINS ─────────────────────────────────────────
// GET /api/domains
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const domains = await domainEngine.getUserDomains(req.userId);
    res.json({ domains });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE DOMAIN ─────────────────────────────────────────────
// DELETE /api/domains/:id
router.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const deleted = await domainEngine.deleteDomain(req.params.id, req.userId);
    if (!deleted) return res.status(404).json({ error: "Domain not found" });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── SEND FROM CUSTOM DOMAIN ───────────────────────────────────
// POST /api/domains/send
// Same as /api/email/send but auto-uses verified domain
router.post("/send", requireAuth, async (req: any, res) => {
  try {
    const { to, subject, htmlBody, plainBody, tag, firstName, lastName, company } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: "to and subject are required" });
    }

    // Get active domain for this user
    const activeDomain = await domainEngine.getActiveDomainForUser(req.userId);

    const fromEmail = activeDomain?.defaultFromEmail || "partnerships@argilette.co";
    const fromName = activeDomain?.defaultFromName || "ArgiFlow";

    const result = await quotaEngine.sendEmailWithQuota({
      userId: req.userId,
      to,
      from: fromEmail,
      fromName,
      subject,
      htmlBody,
      plainBody,
      tag,
      firstName,
      lastName,
      company,
    });

    if (result.quotaError) {
      return res.status(429).json({ error: result.error, quotaExceeded: true });
    }

    res.json({
      ...result,
      sentFrom: fromEmail,
      domainStatus: activeDomain ? "custom" : "default",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
