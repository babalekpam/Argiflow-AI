import test from "node:test";
import assert from "node:assert/strict";
import {
  getPreparedSequenceIssues,
  parseStringIdArray,
  validateCampaignPreparationPayload,
} from "./campaign-preparation-validators";

const validPayload = {
  name: "Owner-approved sequence",
  businessContext: "Owner-saved business context",
  goals: ["Book qualified calls"],
  steps: [
    { subject: "Initial", body: "Hello {{firstName}}", delayDays: 0 },
    { subject: "Follow-up 1", body: "Following up", delayDays: 2 },
    { subject: "Follow-up 2", body: "One more note", delayDays: 4 },
    { subject: "Follow-up 3", body: "Closing the loop", delayDays: 7 },
  ],
  leadIds: ["lead-1"],
  accountIds: ["account-1"],
};

test("accepts the exact four-step user-click preparation contract", () => {
  const result = validateCampaignPreparationPayload(validPayload);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.steps.length, 4);
});

test("rejects malformed steps, duplicate selections, and non-string account ids", () => {
  const result = validateCampaignPreparationPayload({
    ...validPayload,
    steps: validPayload.steps.slice(0, 3),
    accountIds: [1],
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.errors.some(error => /steps/i.test(error)));
    assert.ok(result.errors.some(error => /accountIds/i.test(error)));
  }

  const duplicateSelection = validateCampaignPreparationPayload({
    ...validPayload,
    leadIds: ["lead-1", "lead-1"],
  });
  assert.equal(duplicateSelection.success, false);
  if (!duplicateSelection.success) {
    assert.ok(duplicateSelection.errors.some(error => /leadIds/i.test(error)));
  }
});

test("readiness validator requires four ordered active non-empty steps", () => {
  const issues = getPreparedSequenceIssues([
    { stepNumber: 1, subject: "Initial", body: "Hello", isActive: true },
    { stepNumber: 3, subject: "", body: "Follow-up", isActive: false },
    { stepNumber: 2, subject: "Follow-up", body: "Follow-up", isActive: true },
    { stepNumber: 4, subject: "Follow-up", body: "Follow-up", isActive: true },
  ]);
  assert.ok(issues.some(issue => /ordered/i.test(issue)));
  assert.ok(issues.some(issue => /active/i.test(issue)));
  assert.ok(issues.some(issue => /subject/i.test(issue)));
});

test("child selection ids are trimmed, unique strings", () => {
  assert.deepEqual(parseStringIdArray([" lead-1 "]), ["lead-1"]);
  assert.equal(parseStringIdArray(["lead-1", "lead-1"]), null);
  assert.equal(parseStringIdArray(["lead-1", 2]), null);
  assert.equal(parseStringIdArray(undefined), null);
});
