import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateEmailFunnelEvidence,
  getQualifiedReplyLeadIdsFromRecords,
  isConservativeQualifyingReply,
  type EvidenceDateRange,
  type EvidenceEmailRecord,
  type EvidenceReplyRecord,
} from "./evidence-routes";
import { classifyInboundReply } from "./inbox-reliability";

const range: EvidenceDateRange = {
  from: new Date("2026-01-01T00:00:00.000Z"),
  to: new Date("2026-02-01T00:00:00.000Z"),
};

function log(
  userId: string,
  recipientEmail: string,
  status: string,
  overrides: Partial<EvidenceEmailRecord> = {},
): EvidenceEmailRecord {
  return {
    userId,
    recipientEmail,
    status,
    provider: "postal",
    source: "outreach",
    retryCount: 0,
    createdAt: "2026-01-15T12:00:00.000Z",
    ...overrides,
  };
}

function reply(
  userId: string,
  leadId: string,
  body: string,
  overrides: Partial<EvidenceReplyRecord> = {},
): EvidenceReplyRecord {
  return {
    userId,
    leadId,
    direction: "inbound",
    fromEmail: "person@example.com",
    body,
    subject: "Re: hello",
    status: "received",
    createdAt: "2026-01-15T12:00:00.000Z",
    ...overrides,
  };
}

test("evidence is scoped to the requested tenant and date range", () => {
  const result = calculateEmailFunnelEvidence(
    "tenant-a",
    [
      log("tenant-a", "one@example.com", "sent"),
      log("tenant-b", "two@example.com", "sent"),
      log("tenant-a", "old@example.com", "sent", {
        createdAt: "2025-12-31T23:59:59.000Z",
      }),
    ],
    [
      reply("tenant-a", "lead-a", "Can we talk?"),
      reply("tenant-b", "lead-b", "Can we talk?"),
    ],
    range,
  );

  assert.equal(result.attempts, 1);
  assert.equal(result.uniqueRecipients, 1);
  assert.equal(result.acceptedRecords, 1);
  assert.equal(result.unknownDelivery, 1);
  assert.equal(result.replies, 1);
});

test("empty evidence returns zero metrics without a denominator rate", () => {
  const result = calculateEmailFunnelEvidence("tenant-a", [], [], range);

  assert.equal(result.attempts, 0);
  assert.equal(result.uniqueRecipients, 0);
  assert.equal(result.acceptedRecords, 0);
  assert.equal(result.unknownDelivery, 0);
  assert.equal(result.bounceReports, 0);
  assert.equal(result.replies, 0);
  assert.equal("successRate" in result, false);
});

test("retry records count attempts but deduplicate unique recipients", () => {
  const result = calculateEmailFunnelEvidence(
    "tenant-a",
    [
      log("tenant-a", "retry@example.com", "failed"),
      log("tenant-a", "retry@example.com", "sent", { retryCount: 1 }),
      log("tenant-a", "bounce@example.com", "bounced"),
    ],
    [],
    range,
  );

  assert.equal(result.attempts, 3);
  assert.equal(result.uniqueRecipients, 2);
  assert.equal(result.failedRecords, 1);
  assert.equal(result.acceptedRecords, 1);
  assert.equal(result.unknownDelivery, 1);
  assert.equal(result.bounceReports, 1);
  assert.equal(result.retryRecords, 1);
  assert.equal(result.retryCount, 1);
});

test("qualifying HOT safety gate excludes unsubscribed and negative replies", () => {
  const suppressed = new Set(["person@example.com"]);
  const base = {
    direction: "inbound",
    fromEmail: "person@example.com",
    subject: "Re: hello",
    body: "Sounds useful, can we talk?",
    status: "qualified",
  } as const;

  assert.equal(
    isConservativeQualifyingReply(base, { suppressedEmails: suppressed }),
    false,
  );
  assert.equal(
    isConservativeQualifyingReply(
      { ...base, fromEmail: "other@example.com", body: "Please unsubscribe me." },
      { suppressedEmails: new Set() },
    ),
    false,
  );
  assert.equal(
    isConservativeQualifyingReply(
      { ...base, fromEmail: "other@example.com" },
      { suppressedEmails: new Set() },
    ),
    true,
  );
  assert.equal(
    isConservativeQualifyingReply(
      { ...base, fromEmail: "other@example.com" },
      { leadStatus: "unsubscribed", suppressedEmails: new Set() },
    ),
    false,
  );
  assert.equal(
    isConservativeQualifyingReply(
      { ...base, fromEmail: "other@example.com" },
      { leadStatus: "cold", suppressedEmails: new Set() },
    ),
    false,
  );
});

test("header-only automated replies never requalify persisted HOT records", () => {
  const classification = classifyInboundReply({
    bodyText: "Your message was received by this mailbox.",
    subject: "Automatic response",
    headers: new Map([["auto-submitted", "auto-replied"]]),
  });
  assert.equal(classification.status, "automated");
  assert.equal(classification.qualifies, false);

  assert.equal(
    isConservativeQualifyingReply({
      direction: "inbound",
      fromEmail: "person@example.com",
      subject: "Automatic response",
      body: "Your message was received by this mailbox.",
      status: classification.status,
    }),
    false,
  );
  // Legacy rows with only the generic received status are unknown, not HOT.
  assert.equal(
    isConservativeQualifyingReply({
      direction: "inbound",
      fromEmail: "person@example.com",
      subject: "Re: hello",
      body: "Sounds useful, can we talk?",
      status: "received",
    }),
    false,
  );
});

test("latest disqualifying reply prevents an earlier qualified reply from qualifying HOT", () => {
  const leads = [{ id: "lead-a", email: "person@example.com", status: "hot" }];
  const replies = [
    reply("tenant-a", "lead-a", "Sounds useful, can we talk?", {
      status: "qualified",
      createdAt: "2026-01-15T12:00:00.000Z",
    }),
    reply("tenant-a", "lead-a", "Please unsubscribe me.", {
      status: "unsubscribed",
      createdAt: "2026-01-16T12:00:00.000Z",
    }),
  ];
  assert.deepEqual(
    Array.from(getQualifiedReplyLeadIdsFromRecords(leads, replies)),
    [],
  );
});