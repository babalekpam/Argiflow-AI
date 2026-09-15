import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVerifiedTenantBusinessContext,
  toStrategyBrief,
  type SavedTenantBusinessContext,
} from "./tenant-business-context";

const savedContext: SavedTenantBusinessContext = {
  businessContext: "Owner-saved offer and eligibility rules",
  goals: ["Book qualified practice calls"],
  updatedAt: new Date("2026-02-01T12:00:00.000Z"),
  source: "business_manager",
  saved: true,
};

test("saved Business Manager context takes precedence over legacy prose", () => {
  const prompt = buildVerifiedTenantBusinessContext({
    facts: ["Company: Example Practice Services"],
    savedContext,
    ownerProvidedContext: "generic Aria profile prose",
    priorStrategy: "historical strategy claims an unverified conversion outcome",
  });

  const savedContextIndex = prompt.indexOf("Owner-saved offer and eligibility rules");
  const rulesIndex = prompt.indexOf("FACTUAL GROUNDING RULES:");

  assert.notEqual(savedContextIndex, -1);
  assert.equal(prompt.includes("generic Aria profile prose"), false);
  assert.notEqual(prompt.indexOf("historical strategy claims an unverified conversion outcome"), -1);
  assert.ok(savedContextIndex < rulesIndex);
  assert.match(prompt, /historical strategy, manager decisions\/reports, and Aria chat\/discovery messages are context only and never verified action evidence/i);
  assert.match(prompt, /Saved goals \(owner intent, not action evidence\): Book qualified practice calls/);
});

test("strategy brief is an isolated, non-secret projection of one tenant read", () => {
  const brief = toStrategyBrief(savedContext);

  assert.deepEqual(Object.keys(brief).sort(), [
    "businessContext",
    "goals",
    "saved",
    "source",
    "updatedAt",
  ]);
  assert.deepEqual(brief, {
    businessContext: savedContext.businessContext,
    goals: savedContext.goals,
    updatedAt: savedContext.updatedAt,
    source: "business_manager",
    saved: true,
  });
  assert.equal("autonomyLevel" in brief, false);
  assert.equal("enabled" in brief, false);
  assert.equal("credentials" in brief, false);

  const otherTenantBrief = toStrategyBrief({
    ...savedContext,
    businessContext: "Other tenant context",
    goals: ["Other tenant goal"],
  });
  assert.equal(brief.businessContext, savedContext.businessContext);
  assert.deepEqual(brief.goals, savedContext.goals);
  assert.notEqual(otherTenantBrief.businessContext, brief.businessContext);
});