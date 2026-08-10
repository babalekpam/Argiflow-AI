import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { eq, sql, desc } from "drizzle-orm";
import { campaignReports } from "@shared/schema";
import { campaigns } from "@shared/instantly-schema";

const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// campaign_reports only ever holds manually-created reports — nothing in the
// sending pipeline writes to it. The live per-campaign counters are the real
// source of truth, so totals merge both. (campaigns has no click counter, so
// click figures still come from reports only.)
async function aggregateCampaignTotals(userId: string) {
  const [liveCampaigns, reports] = await Promise.all([
    db.select().from(campaigns).where(eq(campaigns.userId, userId)),
    db.select().from(campaignReports).where(eq(campaignReports.userId, userId)),
  ]);

  const sum = <T>(rows: T[], pick: (row: T) => number | null | undefined) =>
    rows.reduce((total, row) => total + (pick(row) || 0), 0);

  return {
    totalCampaigns: liveCampaigns.length + reports.length,
    totalSent: sum(liveCampaigns, c => c.emailsSent) + sum(reports, r => r.totalSent),
    totalOpened: sum(liveCampaigns, c => c.emailsOpened) + sum(reports, r => r.totalOpened),
    totalClicked: sum(reports, r => r.totalClicked),
    totalReplied: sum(liveCampaigns, c => c.emailsReplied) + sum(reports, r => r.totalReplied),
    totalConverted: sum(liveCampaigns, c => c.opportunities) + sum(reports, r => r.totalConverted),
    totalRevenue: sum(reports, r => r.revenue),
    totalCost: sum(reports, r => r.cost),
  };
}

export function registerAnalyticsRoutes(app: Express) {
  app.get("/api/analytics/overview", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const {
        totalCampaigns, totalSent, totalOpened, totalClicked,
        totalReplied, totalConverted, totalRevenue, totalCost,
      } = await aggregateCampaignTotals(userId);

      const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 10000) / 100 : 0;
      const clickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 10000) / 100 : 0;
      const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 10000) / 100 : 0;

      res.json({
        totalCampaigns,
        totalSent,
        totalOpened,
        totalClicked,
        totalReplied,
        totalConverted,
        totalRevenue,
        totalCost,
        openRate,
        clickRate,
        replyRate,
      });
    } catch (error: any) {
      console.error("[Analytics] Overview error:", error);
      res.status(500).json({ message: "Failed to fetch analytics overview" });
    }
  });

  app.get("/api/analytics/reports", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const reports = await db
        .select()
        .from(campaignReports)
        .where(eq(campaignReports.userId, userId))
        .orderBy(desc(campaignReports.createdAt));
      res.json(reports);
    } catch (error: any) {
      console.error("[Analytics] List reports error:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post("/api/analytics/reports", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const {
        name, type, channel,
        totalSent, totalOpened, totalClicked, totalReplied,
        totalConverted, totalBounced, totalUnsubscribed,
        revenue, cost, abTestVariant, abTestGroup,
        periodStart, periodEnd,
      } = req.body;

      if (!name || !type) {
        return res.status(400).json({ message: "Name and type are required" });
      }

      const [report] = await db
        .insert(campaignReports)
        .values({
          userId,
          name,
          type,
          channel: channel || null,
          totalSent: totalSent || 0,
          totalOpened: totalOpened || 0,
          totalClicked: totalClicked || 0,
          totalReplied: totalReplied || 0,
          totalConverted: totalConverted || 0,
          totalBounced: totalBounced || 0,
          totalUnsubscribed: totalUnsubscribed || 0,
          revenue: revenue || 0,
          cost: cost || 0,
          abTestVariant: abTestVariant || null,
          abTestGroup: abTestGroup || null,
          periodStart: periodStart ? new Date(periodStart) : null,
          periodEnd: periodEnd ? new Date(periodEnd) : null,
        })
        .returning();

      res.json(report);
    } catch (error: any) {
      console.error("[Analytics] Create report error:", error);
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  app.delete("/api/analytics/reports/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;

      const result = await db
        .delete(campaignReports)
        .where(sql`${campaignReports.id} = ${id} AND ${campaignReports.userId} = ${userId}`)
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ message: "Report not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Analytics] Delete report error:", error);
      res.status(500).json({ message: "Failed to delete report" });
    }
  });

  app.get("/api/analytics/funnel", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const totals = await aggregateCampaignTotals(userId);
      const sent = totals.totalSent;
      const opened = totals.totalOpened;
      const clicked = totals.totalClicked;
      const replied = totals.totalReplied;
      const converted = totals.totalConverted;

      res.json({
        stages: [
          { name: "Sent", value: sent, percentage: 100 },
          { name: "Opened", value: opened, percentage: sent > 0 ? Math.round((opened / sent) * 10000) / 100 : 0 },
          { name: "Clicked", value: clicked, percentage: sent > 0 ? Math.round((clicked / sent) * 10000) / 100 : 0 },
          { name: "Replied", value: replied, percentage: sent > 0 ? Math.round((replied / sent) * 10000) / 100 : 0 },
          { name: "Converted", value: converted, percentage: sent > 0 ? Math.round((converted / sent) * 10000) / 100 : 0 },
        ],
      });
    } catch (error: any) {
      console.error("[Analytics] Funnel error:", error);
      res.status(500).json({ message: "Failed to fetch funnel data" });
    }
  });

  app.get("/api/analytics/ab-tests", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const reports = await db
        .select()
        .from(campaignReports)
        .where(eq(campaignReports.userId, userId));

      const grouped: Record<string, any[]> = {};
      for (const r of reports) {
        if (r.abTestGroup) {
          if (!grouped[r.abTestGroup]) grouped[r.abTestGroup] = [];
          grouped[r.abTestGroup].push(r);
        }
      }

      const abTests = Object.entries(grouped).map(([group, variants]) => ({
        group,
        variants: variants.map((v) => ({
          id: v.id,
          name: v.name,
          variant: v.abTestVariant || "Default",
          totalSent: v.totalSent || 0,
          totalOpened: v.totalOpened || 0,
          totalClicked: v.totalClicked || 0,
          totalReplied: v.totalReplied || 0,
          openRate: (v.totalSent || 0) > 0 ? Math.round(((v.totalOpened || 0) / (v.totalSent || 1)) * 10000) / 100 : 0,
          clickRate: (v.totalSent || 0) > 0 ? Math.round(((v.totalClicked || 0) / (v.totalSent || 1)) * 10000) / 100 : 0,
          replyRate: (v.totalSent || 0) > 0 ? Math.round(((v.totalReplied || 0) / (v.totalSent || 1)) * 10000) / 100 : 0,
          revenue: v.revenue || 0,
        })),
      }));

      res.json(abTests);
    } catch (error: any) {
      console.error("[Analytics] AB tests error:", error);
      res.status(500).json({ message: "Failed to fetch A/B test data" });
    }
  });
}
