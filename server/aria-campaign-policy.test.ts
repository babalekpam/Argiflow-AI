import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { approvedCampaignContext, campaignOfferSendError, normalizeAriaCampaignAction } from "./aria-campaign-policy";
import { TRACKMED_APPROVED_OFFER_TERMS } from "../shared/trackmed-credit-offer";

const wrong = {
  category: "email", tool: "ses", execute_now: true,
  title: "Send test of current campaign sequence",
  description: "Showcase the current campaign",
  tool_params: {
    to: "owner@example.test",
    subject: "Elevate Your Practice with a Free Code Analysis",
    body: "Dear [Practice Name], complimentary code analysis along with a 90-day trial of our prior authorization services.",
  },
};

test("the reported ARIA draft becomes canonical, review-only copy before storage", () => {
  const fixed = normalizeAriaCampaignAction(wrong, "Track-Med Billing Solutions", "Practice Owner");
  assert.notEqual(fixed, wrong);
  assert.equal(wrong.execute_now, true);
  assert.equal(fixed.execute_now, false);
  assert.equal(fixed.tool_params.to, wrong.tool_params.to);
  assert.match(fixed.tool_params.body, /\$250 off each of the first four/);
  assert.match(fixed.tool_params.body, /\$1,000/);
  assert.match(fixed.tool_params.body, /free code analysis/i);
  assert.match(fixed.tool_params.body, /alternative, not an additional discount/);
  assert.doesNotMatch(fixed.tool_params.body, /\[Practice Name\]|90-day trial/);
  assert.equal(campaignOfferSendError("Track-Med", fixed.tool_params.subject, fixed.tool_params.body), null);
});

test("stale saved campaign actions cannot bypass the shared send boundary", () => {
  assert.match(campaignOfferSendError("Track-Med", wrong.tool_params.subject, wrong.tool_params.body)!, /Regenerate/);
  assert.match(campaignOfferSendError("Track-Med", "Campaign", wrong.tool_params.body + TRACKMED_APPROVED_OFFER_TERMS)!, /Regenerate/);
  const connector = readFileSync(new URL("./aria-connectors.ts", import.meta.url), "utf8");
  assert.ok(connector.indexOf("if (offerError) return") < connector.indexOf("transporter.sendMail("));
  const agent = readFileSync(new URL("./aria-agent.ts", import.meta.url), "utf8");
  assert.equal((agent.match(/const action = normalizeAriaCampaignAction/g) || []).length, 2);
  assert.match(agent, /const isAutoExecute = action === generatedAction/);
});

test("other tenants and ordinary operational emails retain their behavior", () => {
  assert.equal(normalizeAriaCampaignAction(wrong, "Other Practice"), wrong);
  assert.equal(campaignOfferSendError("Other Practice", wrong.tool_params.subject, wrong.tool_params.body), null);
  assert.equal(campaignOfferSendError("Track-Med", "Meeting confirmed", "See you Tuesday"), null);
  const report = { ...wrong, title: "Campaign reporting update", description: "Outreach results",
    tool_params: { ...wrong.tool_params, subject: "Daily campaign briefing", body: "The outreach campaign has three pending approvals." } };
  assert.equal(normalizeAriaCampaignAction(report, "Track-Med"), report);
  assert.equal(campaignOfferSendError("Track-Med", report.tool_params.subject, report.tool_params.body), null);
  assert.equal(approvedCampaignContext("Other Practice"), "");
  assert.match(approvedCampaignContext("Track-Med"), /supersedes historical drafts/);
  assert.match(approvedCampaignContext("Track-Med"), /NOT permission to send/);
});

test("stale approvals are marked rejected, not completed, before transport", () => {
  const routes = readFileSync(new URL("./aria-routes.ts", import.meta.url), "utf8");
  const guard = routes.indexOf("const offerError = campaignOfferSendError");
  assert.ok(guard > 0 && guard < routes.indexOf("const emailResult = await sendEmailViaSES"));
  assert.match(routes.slice(guard), /if \(offerError\) \{\s*await updateActionStatus\(action.id, userId, "rejected", offerError\);\s*return \{ executed: false, error: offerError \}/);
});