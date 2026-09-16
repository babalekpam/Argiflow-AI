import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildTrackMedApprovedOfferEmail } from "@shared/trackmed-credit-offer";

const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const routeStart = routes.indexOf('app.post("/api/campaign/apply"');
const routeEnd = routes.indexOf('app.get("/api/admin/platform-config"', routeStart);
const campaignApplyRoute = routes.slice(routeStart, routeEnd);

test("legacy campaign apply maps to the canonical Track-Med credit campaign", () => {
  assert.ok(routeStart >= 0);
  assert.match(campaignApplyRoute, /"90-day-pa-free": canonicalCampaignId/);
  assert.match(campaignApplyRoute, /canonicalCampaignId = "trackmed-credit-offer"/);
  assert.match(campaignApplyRoute, /updatedCampaignId/);
  assert.match(campaignApplyRoute, /updatedCampaignName: canonicalCampaignName/);
  assert.match(campaignApplyRoute, /buildTrackMedApprovedOfferEmail/);
  assert.doesNotMatch(campaignApplyRoute, /90 Days Free|Prior Authorization Automation for/);
  assert.doesNotMatch(campaignApplyRoute, /softwareclaims|AI claim scrubbing|claim denial rate/);
});

test("campaign correction is tenant-owned, history-safe, and draft-only", () => {
  assert.match(campaignApplyRoute, /isTrackMedTenant\(tenantCompanyName\)/);
  assert.doesNotMatch(campaignApplyRoute, /req\.body\??\.companyName/);
  assert.match(campaignApplyRoute, /getPendingEmailSendClaim\(userId, lead\.id, "outreach"\)/);
  assert.match(campaignApplyRoute, /getSentEmailLogs\(userId, lead\.id, "outreach"\)/);
  assert.match(campaignApplyRoute, /isEmailSuppressed\(userId, lead\.email\)/);
  assert.match(campaignApplyRoute, /lead\.outreachSentAt/);
  assert.match(campaignApplyRoute, /lead\.scheduledSendAt/);
  assert.doesNotMatch(campaignApplyRoute, /outreachSentAt\s*:/);
  assert.doesNotMatch(campaignApplyRoute, /followUpStep|followUpStatus|followUpNextAt/);
  assert.doesNotMatch(campaignApplyRoute, /sendOutreachEmail|processBulkOutreachSend|setImmediate/);
});

test("canonical builder produces the corrected campaign message", () => {
  const { subject, outreach } = buildTrackMedApprovedOfferEmail({
    firstName: "Taylor",
    practiceName: "Taylor Dental",
    senderName: "Owner",
  });

  assert.equal(subject, "Track-Med: $250 credit and free code analysis");
  assert.match(outreach, /\$250 off each of the first four/i);
  assert.match(outreach, /free code analysis/i);
  assert.doesNotMatch(outreach, /claim denial rate|AI claim scrubbing|softwareclaims/i);
});