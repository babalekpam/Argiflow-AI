import assert from "node:assert/strict";
import {
  buildInboxRoutes,
  canAgentAutoReply,
  canAutoRespond,
  classifyInboundReply,
  hasExplicitAgentAutoReplyOptIn,
  matchInboundReply,
  type InboxLeadForMatch,
} from "./inbox-reliability";

const routeBuild = buildInboxRoutes({
  settings: [
    {
      userId: "tenant-a",
      senderEmail: "sales-a@gmail.test",
      smtpHost: "smtp.gmail.com",
      smtpUsername: "sales-a@gmail.test",
      smtpPassword: "test-only-secret-a",
    },
    {
      userId: "tenant-b",
      senderEmail: "sales-b@gmail.test",
      smtpHost: "smtp.gmail.com",
      smtpUsername: "sales-b@gmail.test",
      smtpPassword: "test-only-secret-b",
    },
  ],
});

assert.equal(routeBuild.routes.length, 2);
assert.equal(routeBuild.routes.find(route => route.userId === "tenant-a")?.imapHost, "imap.gmail.com");
// Passwords are route internals and must never be part of diagnostics.
assert.equal(routeBuild.diagnostics.some(diagnostic => diagnostic.source.includes("test-only-secret")), false);

const sharedMailbox = buildInboxRoutes({
  accounts: [
    {
      userId: "tenant-a",
      accountId: "account-a",
      email: "shared@example.test",
      smtpHost: "smtp.example.test",
      imapHost: "imap.example.test",
      smtpPassword: "test-only-secret-a",
    },
    {
      userId: "tenant-b",
      accountId: "account-b",
      email: "shared@example.test",
      smtpHost: "smtp.example.test",
      imapHost: "imap.example.test",
      smtpPassword: "test-only-secret-b",
    },
  ],
});
assert.equal(sharedMailbox.routes.length, 0);
assert.equal(sharedMailbox.diagnostics.some(diagnostic => diagnostic.code === "duplicate_mailbox_ownership"), true);
assert.deepEqual(new Set(sharedMailbox.blockedUserIds), new Set(["tenant-a", "tenant-b"]));

const tenantARoute = routeBuild.routes.find(route => route.userId === "tenant-a");
assert.ok(tenantARoute);

const sameSenderInTwoTenants: InboxLeadForMatch[] = [
  {
    id: "lead-a",
    userId: "tenant-a",
    email: "prospect@example.test",
    outreachSentAt: new Date("2025-01-01T00:00:00.000Z"),
    name: "Synthetic Prospect A",
  },
  {
    id: "lead-b",
    userId: "tenant-b",
    email: "prospect@example.test",
    outreachSentAt: new Date("2025-01-01T00:00:00.000Z"),
    name: "Synthetic Prospect B",
  },
];

const tenantAMatch = matchInboundReply({
  route: tenantARoute,
  envelopeFrom: "prospect@example.test",
  headerFrom: "Prospect <prospect@example.test>",
  recipients: ["sales-a+reply@gmail.test"],
  leads: sameSenderInTwoTenants,
});
assert.equal(tenantAMatch.kind, "matched");
if (tenantAMatch.kind === "matched") {
  assert.equal(tenantAMatch.lead.id, "lead-a");
  assert.equal(tenantAMatch.lead.userId, "tenant-a");
  assert.equal(tenantAMatch.toEmail, "sales-a+reply@gmail.test");
}

const wrongMailbox = matchInboundReply({
  route: tenantARoute,
  envelopeFrom: "prospect@example.test",
  headerFrom: "prospect@example.test",
  recipients: ["sales-b@gmail.test"],
  leads: sameSenderInTwoTenants,
});
assert.equal(wrongMailbox.kind, "no_recipient");

const spoofedFrom = matchInboundReply({
  route: tenantARoute,
  envelopeFrom: "relay@example.test",
  headerFrom: "prospect@example.test",
  recipients: ["sales-a@gmail.test"],
  leads: sameSenderInTwoTenants,
});
assert.equal(spoofedFrom.kind, "from_header_mismatch");

const ambiguousWithinTenant = matchInboundReply({
  route: tenantARoute,
  envelopeFrom: "prospect@example.test",
  headerFrom: "prospect@example.test",
  recipients: ["sales-a@gmail.test"],
  leads: [
    sameSenderInTwoTenants[0],
    {
      ...sameSenderInTwoTenants[0],
      id: "lead-a-duplicate",
    },
  ],
});
assert.equal(ambiguousWithinTenant.kind, "ambiguous");

const qualified = classifyInboundReply({
  bodyText: "Yes, this is useful. Please send times for a short call.",
  subject: "Re: hello",
});
assert.equal(qualified.status, "qualified");
assert.equal(qualified.qualifies, true);
assert.equal(qualified.reason, "positive_reply");
assert.equal("isHuman" in qualified, false);

const automated = classifyInboundReply({
  bodyText: "I am away from the office until Monday.",
  subject: "Automatic reply",
  headers: new Map([["auto-submitted", "auto-replied"]]),
});
assert.equal(automated.status, "automated");
assert.equal(automated.qualifies, false);

const negative = classifyInboundReply({
  bodyText: "Thanks, but we are not interested.",
});
assert.equal(negative.status, "negative");
assert.equal(negative.qualifies, false);

const unsubscribe = classifyInboundReply({
  bodyText: "Please unsubscribe me and do not contact me again.",
});
assert.equal(unsubscribe.status, "unsubscribed");
assert.equal(unsubscribe.qualifies, false);

const parsedFailure = classifyInboundReply({ parseFailed: true, bodyText: "" });
assert.equal(parsedFailure.status, "quarantined_parse_failed");
assert.equal(parsedFailure.qualifies, false);

assert.equal(canAutoRespond(true), true);
assert.equal(canAutoRespond(false), false);
assert.equal(canAutoRespond(undefined), false);
assert.equal(canAutoRespond("true"), false);
assert.equal(canAgentAutoReply({
  agentAutoReplyEnabled: true,
  agentAutoReplyExplicitlyEnabled: true,
  tenantAiAutoRespond: true,
}), true);
assert.equal(canAgentAutoReply({
  agentAutoReplyEnabled: true,
  agentAutoReplyExplicitlyEnabled: false,
  tenantAiAutoRespond: true,
}), false);
assert.equal(canAgentAutoReply({
  agentAutoReplyEnabled: true,
  agentAutoReplyExplicitlyEnabled: true,
  tenantAiAutoRespond: false,
}), false);
assert.equal(canAgentAutoReply({
  agentAutoReplyEnabled: "true",
  agentAutoReplyExplicitlyEnabled: true,
  tenantAiAutoRespond: true,
}), false);
assert.equal(hasExplicitAgentAutoReplyOptIn({}), false);
assert.equal(hasExplicitAgentAutoReplyOptIn({ autoReplyEnabled: false }), false);
assert.equal(hasExplicitAgentAutoReplyOptIn({ autoReplyEnabled: true }), true);
assert.equal(hasExplicitAgentAutoReplyOptIn(Object.create({ autoReplyEnabled: true })), false);

// Controlled persistence regression: this is an in-memory fake, with no IMAP,
// SMTP, AI, customer contacts, or workflow side effects.
const persistedReplies: Array<{ userId: string; leadId: string; status: string }> = [];
const leadStates = new Map(sameSenderInTwoTenants.map(lead => [lead.id, { status: "warm" }]));
const durableSuppressions = new Set<string>();
const hotEvents: string[] = [];

function persistSyntheticReply(bodyText: string, fromEmail = "prospect@example.test") {
  const match = matchInboundReply({
    route: tenantARoute,
    envelopeFrom: fromEmail,
    headerFrom: fromEmail,
    recipients: ["sales-a@gmail.test"],
    leads: sameSenderInTwoTenants,
  });
  assert.equal(match.kind, "matched");
  if (match.kind !== "matched") return;
  const classification = classifyInboundReply({ bodyText });
  persistedReplies.push({ userId: tenantARoute.userId, leadId: match.lead.id, status: classification.status });
  if (classification.isOptOut) durableSuppressions.add(`${tenantARoute.userId}:${match.fromEmail}`);
  if (classification.qualifies) {
    leadStates.get(match.lead.id)!.status = "hot";
    hotEvents.push(match.lead.id);
  } else if (classification.isOptOut) {
    leadStates.get(match.lead.id)!.status = "unsubscribed";
  } else if (classification.isNegative && !classification.isAutomated) {
    leadStates.get(match.lead.id)!.status = "cold";
  }
}

persistSyntheticReply("Yes, please send availability.");
persistSyntheticReply("No thanks, not interested.");
persistSyntheticReply("Please remove me from your list.");
persistSyntheticReply("");

assert.deepEqual(persistedReplies.map(reply => reply.leadId), ["lead-a", "lead-a", "lead-a", "lead-a"]);
assert.deepEqual(persistedReplies.map(reply => reply.userId), ["tenant-a", "tenant-a", "tenant-a", "tenant-a"]);
assert.deepEqual(hotEvents, ["lead-a"]);
assert.equal(leadStates.get("lead-a")?.status, "unsubscribed");
assert.equal(leadStates.get("lead-b")?.status, "warm");
assert.equal(durableSuppressions.has("tenant-a:prospect@example.test"), true);
assert.deepEqual(
  persistedReplies.map(reply => reply.status),
  ["qualified", "negative", "unsubscribed", "quarantined_parse_failed"],
);

console.log("inbox reliability regression tests passed");
