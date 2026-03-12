import { Router, type RequestHandler } from "express";
import quotaEngine from "./email-quota-engine";
import { EMAIL_PLAN_PRICES } from "../shared/email-quota-schema";

const router = Router();

const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

router.get("/quota", requireAuth, async (req: any, res) => {
  try {
    const quota = await quotaEngine.checkQuota(req.session.userId);
    const percentUsed = quota.limit > 0 ? Math.round((quota.used / quota.limit) * 100) : 0;

    res.json({
      ...quota,
      percentUsed,
      planPrice: EMAIL_PLAN_PRICES[quota.plan] || 0,
      resetDateFormatted: quota.resetDate.toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric"
      }),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/send", requireAuth, async (req: any, res) => {
  try {
    const { to, from, fromName, subject, htmlBody, plainBody, tag, firstName, lastName, company } = req.body;

    if (!to || !subject || (!htmlBody && !plainBody)) {
      return res.status(400).json({ error: "Missing required: to, subject, htmlBody or plainBody" });
    }

    const result = await quotaEngine.sendEmailWithQuota({
      userId: req.session.userId,
      to, from, fromName, subject, htmlBody, plainBody, tag,
      firstName, lastName, company,
    });

    if (result.quotaError) {
      return res.status(429).json({ error: result.error, quotaExceeded: true });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/bulk", requireAuth, async (req: any, res) => {
  try {
    const { emails, delayMs } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "emails array required" });
    }
    if (emails.length > 500) {
      return res.status(400).json({ error: "Max 500 emails per bulk request" });
    }

    const result = await quotaEngine.sendBulkWithQuota(req.session.userId, emails, delayMs);

    if (result.quotaExceeded && result.sent === 0) {
      return res.status(429).json({ error: "Monthly email quota exceeded", quotaExceeded: true });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/upgrade", requireAuth, async (req: any, res) => {
  try {
    const { plan } = req.body;
    const validPlans = ["starter", "growth", "pro", "agency"];

    if (!plan || !validPlans.includes(plan)) {
      return res.status(400).json({ error: `plan must be one of: ${validPlans.join(", ")}` });
    }

    const updated = await quotaEngine.upgradePlan(req.session.userId, plan);

    res.json({
      success: true,
      plan: updated.plan,
      newLimit: updated.monthlyLimit,
      price: EMAIL_PLAN_PRICES[plan],
      message: `Plan upgraded to ${plan} — ${updated.monthlyLimit.toLocaleString()} emails/month`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/history", requireAuth, async (req: any, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const history = await quotaEngine.getUserEmailHistory(req.session.userId, limit);
    res.json({ emails: history, count: history.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/plans", async (_req, res) => {
  res.json({
    plans: [
      { id: "starter", name: "Starter", emails: 2500, price: 0, priceLabel: "Included" },
      { id: "growth", name: "Growth", emails: 10000, price: 47, priceLabel: "$47/mo" },
      { id: "pro", name: "Pro", emails: 50000, price: 97, priceLabel: "$97/mo" },
      { id: "agency", name: "Agency", emails: 150000, price: 197, priceLabel: "$197/mo" },
    ]
  });
});

router.get("/admin/stats", requireAuth, async (_req, res) => {
  try {
    const stats = await quotaEngine.getAllUsersQuotaStats();
    const totalSentThisMonth = stats.reduce((sum, s) => sum + s.sentThisMonth, 0);
    const totalSentAllTime = stats.reduce((sum, s) => sum + s.sentAllTime, 0);

    res.json({
      users: stats.length,
      totalSentThisMonth,
      totalSentAllTime,
      byPlan: {
        starter: stats.filter(s => s.plan === "starter").length,
        growth: stats.filter(s => s.plan === "growth").length,
        pro: stats.filter(s => s.plan === "pro").length,
        agency: stats.filter(s => s.plan === "agency").length,
      },
      details: stats,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
