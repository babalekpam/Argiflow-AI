// ============================================================
// POSTAL ROUTES — ArgiFlow
// Mount: app.use("/api/postal", postalRoutes)
// ============================================================

import { Router } from "express";
import postalService from "./postal";

const router = Router();

// ── SEND SINGLE EMAIL ─────────────────────────────────────────
// POST /api/postal/send
router.post("/send", async (req, res) => {
  try {
    const { to, from, fromName, replyTo, subject, htmlBody, plainBody, tag } = req.body;

    if (!to || !subject || (!htmlBody && !plainBody)) {
      return res.status(400).json({ error: "Missing required fields: to, subject, htmlBody or plainBody" });
    }

    const result = await postalService.sendEmail({
      to, from, fromName, replyTo, subject, htmlBody, plainBody, tag,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── SEND SEQUENCE EMAIL (with variable substitution) ──────────
// POST /api/postal/sequence
router.post("/sequence", async (req, res) => {
  try {
    const { to, firstName, lastName, company, subject, htmlBody, from, fromName, sequenceName, stepNumber } = req.body;

    if (!to || !subject || !htmlBody) {
      return res.status(400).json({ error: "Missing required fields: to, subject, htmlBody" });
    }

    const result = await postalService.sendSequenceEmail({
      to, firstName, lastName, company, subject, htmlBody, from, fromName, sequenceName, stepNumber,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── SEND BULK EMAILS ──────────────────────────────────────────
// POST /api/postal/bulk
router.post("/bulk", async (req, res) => {
  try {
    const { emails, delayMs } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "emails array is required" });
    }

    if (emails.length > 100) {
      return res.status(400).json({ error: "Max 100 emails per bulk request" });
    }

    const result = await postalService.sendBulkEmails(emails, delayMs);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── SEND WELCOME EMAIL ────────────────────────────────────────
// POST /api/postal/welcome
router.post("/welcome", async (req, res) => {
  try {
    const { to, name } = req.body;
    if (!to || !name) return res.status(400).json({ error: "to and name are required" });

    const result = await postalService.sendWelcomeEmail(to, name);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── SEND LEAD NOTIFICATION ────────────────────────────────────
// POST /api/postal/lead-notification
router.post("/lead-notification", async (req, res) => {
  try {
    const { to, leadName, leadEmail, leadCompany } = req.body;
    if (!to || !leadName || !leadEmail) {
      return res.status(400).json({ error: "to, leadName, leadEmail are required" });
    }

    const result = await postalService.sendLeadNotificationEmail(to, leadName, leadEmail, leadCompany || "");
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── CHECK MESSAGE STATUS ──────────────────────────────────────
// GET /api/postal/status/:messageId
router.get("/status/:messageId", async (req, res) => {
  try {
    const result = await postalService.getMessageStatus(req.params.messageId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── TEST ENDPOINT ─────────────────────────────────────────────
// POST /api/postal/test
router.post("/test", async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: "to is required" });

    const result = await postalService.sendEmail({
      to,
      fromName: "Abel at ArgiFlow",
      subject: "ArgiFlow Email Test ✓",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #6366f1;">✓ Postal is working!</h2>
          <p>Your ArgiFlow email infrastructure is live and sending.</p>
          <p style="color: #666; font-size: 14px; margin-top: 24px;">
            Sent via Postal from mail.argilette.co<br>
            Server: ARGILETTE Hetzner VPS
          </p>
        </div>
      `,
      tag: "test",
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
