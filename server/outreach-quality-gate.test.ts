import test from "node:test";
import assert from "node:assert/strict";
import {
  FOLLOW_UP_MAX_ATTEMPTS,
  getEmailSendReconciliationDecision,
  getFollowUpFailureDecision,
  getFollowUpPreflightIssue,
  getFollowUpRetryDelayMs,
  getLeadContactIssue,
  getManualRetryDecision,
  getOutreachPreflightIssue,
  getTenantSmtpConfigIssue,
  isPermanentEmailFailure,
} from "./outreach-quality-gate";

test("blocks missing and obvious placeholder contact data", () => {
  assert.match(getLeadContactIssue({ name: "Jane Doe", email: "jane@example.com" }) || "", /placeholder|fabricated/i);
  assert.match(getLeadContactIssue({ name: "A Real Person", email: "real@real-company.test", notes: "example line" }) || "", /example|synthetic|unverified/i);
  assert.match(getLeadContactIssue({ name: "A Real Person" }) || "", /missing.*email/i);
});

test("does not claim a public source verifies email syntax", () => {
  assert.equal(
    getLeadContactIssue({ name: "A Real Person", email: "person@public-directory.invalid", source: "Public directory" }),
    null,
  );
  assert.match(
    getLeadContactIssue({
      name: "A Real Person",
      email: "person@public-directory.invalid",
      source: "Public directory — unverified",
    }) || "",
    /human verification|unverified/i,
  );
  assert.match(
    getLeadContactIssue({
      name: "A Real Person",
      email: "person@public-directory.invalid",
      source: "web",
      notes: "Email inferred from a public source",
    }) || "",
    /human verification|unverified/i,
  );
});

test("fails closed when tenant SMTP is incomplete", () => {
  assert.match(getTenantSmtpConfigIssue({ smtpHost: "smtp.example.test" }) || "", /SMTP/i);
  assert.equal(
    getTenantSmtpConfigIssue({
      smtpHost: "smtp.example.test",
      smtpUsername: "sender@example.test",
      smtpPassword: "secret",
      senderEmail: "sender@example.test",
    }),
    null,
  );
});

test("retry schedule is bounded and classifies permanent errors", () => {
  assert.equal(FOLLOW_UP_MAX_ATTEMPTS, 5);
  assert.ok(getFollowUpRetryDelayMs(1) < getFollowUpRetryDelayMs(4));
  assert.equal(getFollowUpRetryDelayMs(99), getFollowUpRetryDelayMs(FOLLOW_UP_MAX_ATTEMPTS - 1));
  assert.equal(isPermanentEmailFailure(new Error("535 authentication failed")), true);
  assert.equal(isPermanentEmailFailure(new Error("connect ETIMEDOUT")), false);
});

test("outreach and follow-up send preflight stays tenant-owned and durable", () => {
  const lead = { name: "A Real Person", email: "person@company.test", source: "manual", outreach: "Hello" };
  assert.equal(getLeadContactIssue(lead), null);
  assert.match(
    getOutreachPreflightIssue(lead, {}, { companyName: "Tenant Co" }) || "",
    /Tenant SMTP is not configured/i,
  );
  assert.match(
    getFollowUpPreflightIssue(lead, "A follow-up", {}, { companyName: "Tenant Co" }) || "",
    /Tenant SMTP is not configured/i,
  );
  assert.match(
    getTenantSmtpConfigIssue({ senderEmail: "owner@company.test" }) || "",
    /Tenant SMTP is not configured/i,
  );
  assert.equal(
    getTenantSmtpConfigIssue({
      smtpHost: "smtp.company.test",
      smtpUsername: "owner@company.test",
      smtpPassword: "secret",
      senderEmail: "owner@company.test",
    }),
    null,
  );

  const retry = getFollowUpFailureDecision(2, "connection timeout", 1_000);
  assert.equal(retry.status, "active");
  assert.equal(retry.nextAt?.getTime(), 1_000 + getFollowUpRetryDelayMs(2));

  const paused = getFollowUpFailureDecision(FOLLOW_UP_MAX_ATTEMPTS, "authentication failed", 1_000);
  assert.equal(paused.status, "paused");
  assert.equal(paused.nextAt, null);
  assert.match(paused.nextStep, /resume manually/i);
});

test("manual retry policy never routes follow-ups through initial outreach", () => {
  assert.deepEqual(
    getManualRetryDecision({ source: "follow-up", status: "failed", attempts: 1, errorMessage: "timeout" }),
    { allowed: true, action: "follow-up", reason: "Retry through the original follow-up sequence processor" },
  );
  assert.equal(
    getManualRetryDecision({ source: "outreach", status: "sent", attempts: 0 }).allowed,
    false,
  );
  assert.equal(
    getManualRetryDecision({ source: "agent", status: "failed", attempts: 1, errorMessage: "timeout" }).allowed,
    false,
  );
  assert.equal(
    getManualRetryDecision({ source: "outreach", status: "failed", attempts: FOLLOW_UP_MAX_ATTEMPTS, errorMessage: "timeout" }).allowed,
    false,
  );
  assert.equal(
    getManualRetryDecision({ source: "outreach", status: "failed", attempts: 1, errorMessage: "535 authentication failed" }).allowed,
    false,
  );
});

test("accepted or unknown SMTP outcomes never become automatic retries", () => {
  assert.deepEqual(
    getEmailSendReconciliationDecision({
      transportAccepted: true,
      bookkeepingPersisted: false,
    }),
    { status: "pending", retryable: false, requiresReview: true },
  );
  assert.deepEqual(
    getEmailSendReconciliationDecision({
      transportAccepted: false,
      bookkeepingPersisted: false,
      transportOutcomeKnown: false,
    }),
    { status: "pending", retryable: false, requiresReview: true },
  );
  assert.deepEqual(
    getEmailSendReconciliationDecision({
      transportAccepted: false,
      bookkeepingPersisted: true,
      transportOutcomeKnown: true,
      permanent: false,
    }),
    { status: "failed", retryable: true, requiresReview: false },
  );
});
