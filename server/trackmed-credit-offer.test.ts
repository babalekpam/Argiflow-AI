import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildTrackMedApprovedOfferEmail,
  getTrackMedApprovedOfferCampaignSteps,
  isObsoleteTrackMedInitialDraft,
  isTrackMedTenant,
  TRACKMED_APPROVED_OFFER_TERMS,
  TRACKMED_CALENDAR_URL,
} from "@shared/trackmed-credit-offer";
import {
  getFollowUpForSpecialty,
  getTemplateInstructions,
  getTouch1ForSpecialty,
} from "./outreach-templates";

test("canonical Track-Med offer preserves every approved term", () => {
  const email = buildTrackMedApprovedOfferEmail({
    firstName: "Avery",
    practiceName: "Avery Medical",
    senderName: "Jordan Sender",
    bookingURL: "https://book.example.test/track-med",
  }).outreach;

  for (const requiredTerm of [
    "$250",
    "first four",
    "$1,000",
    "at least $1,000",
    "free code analysis",
    "90-day prior-authorization",
    "no cash value",
    "cannot be refunded or transferred",
    "Unused credits",
    "No guarantee of recovered revenue or approvals",
  ]) {
    assert.match(email, new RegExp(requiredTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
  assert.match(email, /https:\/\/book\.example\.test\/track-med/);
  assert.match(email, /Jordan Sender/);
  assert.match(email, /Avery Medical/);
  assert.equal(email.includes("8–15%"), false);
  assert.equal(email.includes("AI claim scrubbing"), false);
});

test("personalization is line-safe and campaign loader uses the same source", () => {
  const email = buildTrackMedApprovedOfferEmail({
    firstName: "Dr. Pamela\nInjected",
    practiceName: "Practice\r\nInjected",
    senderName: "Sender\tInjected",
    bookingURL: "not-a-url",
  }).outreach;

  assert.equal(email.includes("\nInjected"), false);
  assert.equal(email.includes("\r"), false);
  assert.match(email, /Hi Pamela/);
  assert.match(email, new RegExp(TRACKMED_CALENDAR_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const campaignInitial = getTrackMedApprovedOfferCampaignSteps()[0];
  assert.equal(campaignInitial.subject, "Track-Med: $250 credit and free code analysis");
  assert.match(campaignInitial.body, /{{firstName}}/);
  assert.match(campaignInitial.body, /{{companyName}}/);
  assert.match(campaignInitial.body, /{{senderName}}/);
  assert.match(campaignInitial.body, /first four/);
});

test("Track-Med detection and stale-draft guard are tenant and content scoped", () => {
  assert.equal(isTrackMedTenant("Track-Med Billing Solutions"), true);
  assert.equal(isTrackMedTenant("Other Billing Solutions"), false);
  assert.equal(isObsoleteTrackMedInitialDraft(
    "Subject: Quick question about your claim denial rate\n\nMost practices lose 8–15% of revenue. AI claim scrubbing can help with a free 20-minute A/R audit.",
  ), true);
  assert.equal(isObsoleteTrackMedInitialDraft(
    "Subject: Quick question about your claim denial rate\n\nOwner-written message about our new offer.",
  ), false);
});

test("specialty helpers share the approved initial and follow-up offer", () => {
  const initial = getTouch1ForSpecialty("dental", "Taylor Lead", "Taylor Dental");
  const followUp = getFollowUpForSpecialty("hospital", 1, "Taylor Lead", "Taylor Health");

  assert.match(initial, /Subject: Track-Med: \$250 credit and free code analysis/);
  assert.match(initial, /Taylor Dental/);
  assert.match(followUp?.body || "", /approved structure is \$250 off/i);
  assert.doesNotMatch(`${initial}\n${followUp?.body || ""}`, /claim denial rate|AI claim scrubbing|A\/R audit/i);
});

test("all Track-Med initial-draft paths reference the deterministic helper", () => {
  const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  assert.ok((routes.match(/buildTrackMedApprovedOfferEmail/g) || []).length >= 5);
  assert.match(routes, /isTrackMedOutreach[\s\S]*buildTrackMedApprovedOfferEmail/);
  assert.match(routes, /isMedBillUser[\s\S]*buildTrackMedApprovedOfferEmail/);
  assert.match(routes, /instantSenderName[\s\S]*buildTrackMedApprovedOfferEmail/);
  assert.match(routes, /getPendingEmailSendClaim\(userId, lead\.id, "outreach"\)/);
  assert.match(routes, /getSentEmailLogs\(userId, lead\.id, "outreach"\)/);
  assert.match(routes, /status \|\| ""\)\.trim\(\)\.toLowerCase\(\) === "unsubscribed"/);
  assert.doesNotMatch(routes, /lead\.outreach\s*&&\s*isExplicitOptOutText/);
  assert.match(getTemplateInstructions(), /approved credit offer/i);
  assert.doesNotMatch(getTemplateInstructions(), /claim denial rate|AI claim scrubbing|A\/R audit/i);
  assert.match(TRACKMED_APPROVED_OFFER_TERMS, /no cash value/i);
});
