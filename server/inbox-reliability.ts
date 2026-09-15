/**
 * Pure inbox routing and reply classification helpers.
 *
 * The monitor deliberately keeps these decisions independent from IMAP,
 * storage, and mail sending.  That makes it possible to regression-test
 * tenant ownership and the HOT gate without contacting a mailbox or an LLM.
 */

export type InboxRoute = {
  userId: string;
  accountId?: string;
  source: "email_account" | "tenant_settings";
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  senderEmail: string;
  recipientAddresses: string[];
};

export type InboxRoutingDiagnosticCode =
  | "missing_imap_host"
  | "missing_imap_credentials"
  | "oauth_imap_not_supported"
  | "duplicate_mailbox_ownership"
  | "invalid_route_address"
  | "imap_host_not_inferable";

export type InboxRoutingDiagnostic = {
  code: InboxRoutingDiagnosticCode;
  source: string;
};

export type InboxRoutingAccountInput = {
  userId: string;
  accountId?: string | null;
  email?: string | null;
  senderEmail?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  imapHost?: string | null;
  imapPort?: number | null;
  smtpPassword?: string | null;
  provider?: string | null;
  authType?: string | null;
  accessToken?: string | null;
  isActive?: boolean | null;
};

export type InboxRoutingSettingsInput = {
  userId: string;
  senderEmail?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUsername?: string | null;
  smtpPassword?: string | null;
  smtpSecure?: boolean | null;
};

export type InboxRoutingBuildResult = {
  routes: InboxRoute[];
  diagnostics: InboxRoutingDiagnostic[];
  blockedUserIds: string[];
};

/**
 * Automatic sending is opt-in.  Missing, null, or truthy non-boolean values
 * stay in draft-first mode so a legacy or incomplete settings row cannot send.
 */
export function canAutoRespond(value: unknown): boolean {
  return value === true;
}

/**
 * The parallel outreach agent has a second opt-in.  A legacy/default value
 * must not enable replies: the agent flag must be explicitly persisted true
 * and the tenant's AI setting must also be explicitly true.
 */
export function canAgentAutoReply(input: {
  agentAutoReplyEnabled?: unknown;
  agentAutoReplyExplicitlyEnabled?: unknown;
  tenantAiAutoRespond?: unknown;
}): boolean {
  return input.agentAutoReplyEnabled === true &&
    input.agentAutoReplyExplicitlyEnabled === true &&
    input.tenantAiAutoRespond === true;
}

export function hasExplicitAgentAutoReplyOptIn(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    Object.prototype.hasOwnProperty.call(value, "autoReplyEnabled") &&
    (value as { autoReplyEnabled?: unknown }).autoReplyEnabled === true,
  );
}

export type InboxLeadForMatch = {
  id: string;
  userId: string;
  name?: string;
  email?: string | null;
  company?: string | null;
  outreach?: string | null;
  engagementScore?: number | null;
  outreachSentAt?: Date | string | null;
  status?: string | null;
};

export type InboxReplyMatchResult =
  | {
      kind: "matched";
      lead: InboxLeadForMatch;
      fromEmail: string;
      toEmail: string;
    }
  | {
      kind: "no_recipient" | "no_sender" | "from_header_mismatch" | "no_lead" | "ambiguous";
      reason: string;
    };

export type ReplyClassification = {
  status:
    | "qualified"
    | "unsubscribed"
    | "negative"
    | "automated"
    | "quarantined_parse_failed";
  isOptOut: boolean;
  isNegative: boolean;
  isAutomated: boolean;
  qualifies: boolean;
  parseFailed: boolean;
  reason:
     | "positive_reply"
    | "unsubscribe_request"
    | "negative_reply"
    | "automated_reply"
    | "body_parse_failed";
};

const EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/**
 * Normalize a mailbox address without changing the local part.  Sender
 * matching must not collapse plus aliases because doing so can map two
 * distinct contacts to one lead.
 */
export function normalizeEmailAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const unwrapped = value.trim().replace(/^["']|["']$/g, "").replace(/^.*<([^>]+)>.*$/, "$1").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(unwrapped)) return null;
  return unwrapped;
}

/**
 * Normalize an address for mailbox delivery headers.  Plus addressing is
 * accepted for the recipient side only (e.g. account+tenant@example.com).
 */
export function canonicalizeEmailAddress(value: unknown): string | null {
  const normalized = normalizeEmailAddress(value);
  if (!normalized) return null;
  const at = normalized.lastIndexOf("@");
  const local = normalized.slice(0, at).split("+", 1)[0];
  return `${local}@${normalized.slice(at + 1)}`;
}

/**
 * Mailparser and ImapFlow use different address shapes.  Keep extraction
 * defensive: malformed headers are a routing failure, never a reason to
 * guess a tenant.
 */
export function extractEmailAddresses(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === "string") {
    const matches = value.match(/<?[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}>?/gi) || [];
    return matches.map(normalizeEmailAddress).filter((address): address is string => Boolean(address));
  }
  if (Array.isArray(value)) {
    return value.flatMap(extractEmailAddresses);
  }
  if (typeof value === "object") {
    const candidate = value as { address?: unknown; value?: unknown };
    if (candidate.address) return extractEmailAddresses(candidate.address);
    if (candidate.value) return extractEmailAddresses(candidate.value);
  }
  return [];
}

export function readHeader(headers: unknown, name: string): string {
  if (!headers || typeof (headers as { get?: unknown }).get !== "function") return "";
  try {
    const value = (headers as { get(name: string): unknown }).get(name);
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(item => String(item)).join(" ");
    if (value && typeof value === "object" && "value" in value) {
      return String((value as { value: unknown }).value);
    }
  } catch {
    // A malformed header is handled as absent by the caller.
  }
  return "";
}

export function normalizeMessageId(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^<|>$/g, "").toLowerCase();
}

function inferImapHost(smtpHost: string): string | null {
  const normalized = smtpHost.trim().toLowerCase();
  const knownHosts: Record<string, string> = {
    "smtp.gmail.com": "imap.gmail.com",
    "smtp.office365.com": "outlook.office365.com",
    "smtp-mail.outlook.com": "outlook.office365.com",
    "smtp.live.com": "outlook.office365.com",
    "smtp.mail.yahoo.com": "imap.mail.yahoo.com",
    "smtp.zoho.com": "imap.zoho.com",
    "smtp.zoho.eu": "imap.zoho.eu",
    "smtp.fastmail.com": "imap.fastmail.com",
  };
  if (knownHosts[normalized]) return knownHosts[normalized];
  return null;
}

function routeAddresses(values: unknown[]): string[] {
  const addresses = values.flatMap(extractEmailAddresses);
  return Array.from(new Set(addresses.map(canonicalizeEmailAddress).filter((address): address is string => Boolean(address))));
}

function makeAccountRoute(account: InboxRoutingAccountInput): { route?: InboxRoute; diagnostic?: InboxRoutingDiagnostic } {
  const source = account.accountId || "email_account";
  const imapUser = normalizeEmailAddress(account.email);
  const smtpUser = normalizeEmailAddress(account.email);
  const senderEmail = normalizeEmailAddress(account.senderEmail) || normalizeEmailAddress(account.email);
  const imapHost = account.imapHost?.trim();

  if (!imapHost) {
    return {
      diagnostic: {
        code: account.authType === "oauth" || account.provider === "google" || account.provider === "microsoft"
          ? "oauth_imap_not_supported"
          : "missing_imap_host",
        source,
      },
    };
  }
  if (!imapUser || !senderEmail || !account.smtpPassword) {
    return {
      diagnostic: {
        code: account.authType === "oauth" || account.provider === "google" || account.provider === "microsoft"
          ? "oauth_imap_not_supported"
          : "missing_imap_credentials",
        source,
      },
    };
  }
  if (!account.userId || !imapHost) {
    return { diagnostic: { code: "invalid_route_address", source } };
  }

  return {
    route: {
      userId: account.userId,
      accountId: account.accountId || undefined,
      source: "email_account",
      imapHost,
      imapPort: account.imapPort || 993,
      imapUser,
      imapPassword: account.smtpPassword,
      smtpHost: account.smtpHost || undefined,
      smtpPort: account.smtpPort || 587,
      smtpUser: smtpUser || undefined,
      smtpPassword: account.smtpPassword,
      smtpSecure: (account.smtpPort || 587) === 465,
      senderEmail,
      recipientAddresses: routeAddresses([imapUser, senderEmail]),
    },
  };
}

function makeSettingsRoute(settings: InboxRoutingSettingsInput): { route?: InboxRoute; diagnostic?: InboxRoutingDiagnostic } {
  const source = "tenant_settings";
  const imapUser = normalizeEmailAddress(settings.smtpUsername);
  const senderEmail = normalizeEmailAddress(settings.senderEmail) || imapUser;
  const smtpHost = settings.smtpHost?.trim();
  const imapHost = smtpHost ? inferImapHost(smtpHost) : null;

  if (!smtpHost || !imapHost) {
    return {
      diagnostic: {
        code: smtpHost ? "imap_host_not_inferable" : "missing_imap_host",
        source,
      },
    };
  }
  if (!imapUser || !settings.smtpPassword) {
    return { diagnostic: { code: "missing_imap_credentials", source } };
  }

  return {
    route: {
      userId: settings.userId,
      source,
      imapHost,
      imapPort: 993,
      imapUser,
      imapPassword: settings.smtpPassword,
      smtpHost,
      smtpPort: settings.smtpPort || 587,
      smtpUser: settings.smtpUsername || undefined,
      smtpPassword: settings.smtpPassword,
      smtpSecure: settings.smtpSecure ?? (settings.smtpPort || 587) === 465,
      senderEmail: senderEmail || imapUser,
      recipientAddresses: routeAddresses([imapUser, senderEmail]),
    },
  };
}

/**
 * Build tenant-owned routes only.  A platform SMTP/IMAP environment variable
 * is intentionally not accepted here: the partnership mailbox cannot safely
 * be used to infer campaign ownership.
 */
export function buildInboxRoutes(input: {
  accounts?: InboxRoutingAccountInput[];
  settings?: InboxRoutingSettingsInput[];
}): InboxRoutingBuildResult {
  const diagnostics: InboxRoutingDiagnostic[] = [];
  const candidates: InboxRoute[] = [];

  for (const account of input.accounts || []) {
    if (account.isActive === false) continue;
    const result = makeAccountRoute(account);
    if (result.route) candidates.push(result.route);
    if (result.diagnostic) diagnostics.push(result.diagnostic);
  }

  for (const settings of input.settings || []) {
    const result = makeSettingsRoute(settings);
    if (result.route) candidates.push(result.route);
    if (result.diagnostic) diagnostics.push({ ...result.diagnostic, source: `${settings.userId}:tenant_settings` });
  }

  // An explicit email account is authoritative over the legacy tenant
  // settings route for that same mailbox.
  const deduped: InboxRoute[] = [];
  const routeKey = (route: InboxRoute) =>
    `${route.userId}|${route.imapHost.toLowerCase()}|${route.imapPort}|${canonicalizeEmailAddress(route.imapUser) || route.imapUser}`;
  for (const candidate of candidates) {
    const duplicate = deduped.find(existing => routeKey(existing) === routeKey(candidate));
    if (!duplicate) {
      deduped.push(candidate);
    } else if (duplicate.source === "tenant_settings" && candidate.source === "email_account") {
      deduped[deduped.indexOf(duplicate)] = candidate;
    }
  }

  // Never let one shared mailbox be attributed to multiple tenants.  Remove
  // every route in a collision rather than choosing based on insertion order.
  const mailboxOwners = new Map<string, Set<string>>();
  for (const route of deduped) {
    const key = `${route.imapHost.toLowerCase()}|${route.imapPort}|${canonicalizeEmailAddress(route.imapUser) || route.imapUser}`;
    const owners = mailboxOwners.get(key) || new Set<string>();
    owners.add(route.userId);
    mailboxOwners.set(key, owners);
  }
  const ambiguousMailboxes = new Set<string>();
  for (const [key, owners] of Array.from(mailboxOwners.entries())) {
    if (owners.size > 1) ambiguousMailboxes.add(key);
  }
  if (ambiguousMailboxes.size) {
    for (const _key of Array.from(ambiguousMailboxes)) diagnostics.push({ code: "duplicate_mailbox_ownership", source: "mailbox" });
  }

  return {
    routes: deduped.filter(route => {
      const key = `${route.imapHost.toLowerCase()}|${route.imapPort}|${canonicalizeEmailAddress(route.imapUser) || route.imapUser}`;
      return !ambiguousMailboxes.has(key);
    }),
    diagnostics,
    blockedUserIds: Array.from(ambiguousMailboxes).flatMap(key => Array.from(mailboxOwners.get(key) || [])),
  };
}

function sameHeaderAddress(left: string, right: string): boolean {
  return normalizeEmailAddress(left) === normalizeEmailAddress(right);
}

/**
 * Match only within the route's tenant and only against leads that have a
 * recorded outbound send.  Recipient and sender headers are both required;
 * sender-only matching is unsafe with a shared mailbox.
 */
export function matchInboundReply(input: {
  route: InboxRoute;
  envelopeFrom?: unknown;
  headerFrom?: unknown;
  recipients?: unknown;
  leads: InboxLeadForMatch[];
}): InboxReplyMatchResult {
  const envelopeFroms = extractEmailAddresses(input.envelopeFrom);
  const headerFroms = extractEmailAddresses(input.headerFrom);
  const froms = headerFroms.length ? headerFroms : envelopeFroms;
  if (froms.length !== 1) return { kind: "no_sender", reason: "sender_missing_or_multiple" };
  if (envelopeFroms.length === 1 && headerFroms.length === 1 && !sameHeaderAddress(envelopeFroms[0], headerFroms[0])) {
    return { kind: "from_header_mismatch", reason: "envelope_and_header_sender_differ" };
  }
  const fromEmail = normalizeEmailAddress(froms[0]);
  if (!fromEmail) return { kind: "no_sender", reason: "sender_invalid" };

  const recipients = Array.from(new Set(
    [input.recipients]
      .flatMap(extractEmailAddresses)
      .map(normalizeEmailAddress)
      .filter((address): address is string => Boolean(address)),
  ));
  const routeRecipients = new Set(input.route.recipientAddresses.map(address => canonicalizeEmailAddress(address)).filter((address): address is string => Boolean(address)));
  const matchedRecipient = recipients.find(address => {
    const canonical = canonicalizeEmailAddress(address);
    return Boolean(canonical && routeRecipients.has(canonical));
  });
  if (!matchedRecipient) return { kind: "no_recipient", reason: "recipient_not_owned_by_route" };

  const tenantLeads = input.leads.filter(lead => lead.userId === input.route.userId && Boolean(lead.outreachSentAt));
  const matches = tenantLeads.filter(lead => normalizeEmailAddress(lead.email) === fromEmail);
  if (matches.length === 0) return { kind: "no_lead", reason: "no_sent_lead_for_sender" };
  if (matches.length !== 1) return { kind: "ambiguous", reason: "multiple_sent_leads_for_sender" };

  return { kind: "matched", lead: matches[0], fromEmail, toEmail: matchedRecipient };
}

function getHeader(headers: Map<string, unknown> | { get?: (name: string) => unknown } | undefined, name: string): string {
  return readHeader(headers, name).toLowerCase();
}

function stripQuotedReply(text: string): string {
  const kept: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*>/.test(line)) continue;
    if (/^\s*(on .+wrote:|-----original message-----|begin forwarded message:)\s*$/i.test(line)) break;
    kept.push(line);
  }
  return kept.join("\n").trim();
}

/**
 * Classification is intentionally conservative.  A parse failure, automated
 * response, opt-out, or negative response can never qualify a lead or invoke
 * an automatic reply.
 */
export function classifyInboundReply(input: {
  bodyText?: string | null;
  subject?: string | null;
  parseFailed?: boolean;
  headers?: Map<string, unknown> | { get?: (name: string) => unknown };
  contentType?: string | null;
}): ReplyClassification {
  const body = stripQuotedReply((input.bodyText || "").trim());
  const subject = (input.subject || "").trim();
  const text = `${subject}\n${body}`.toLowerCase();
  const parseFailed = Boolean(input.parseFailed) || !body;
  const autoSubmitted = getHeader(input.headers, "auto-submitted");
  const precedence = getHeader(input.headers, "precedence");
  const autoResponseSuppress = getHeader(input.headers, "x-auto-response-suppress");
  const isAutomated =
    Boolean(autoSubmitted && autoSubmitted !== "no") ||
    /^(bulk|junk|list)$/.test(precedence) ||
    Boolean(autoResponseSuppress) ||
    /multipart\/report/i.test(input.contentType || "") ||
    /\b(out of office|automatic reply|auto.?reply|away from (?:the )?office|delivery status notification|undeliverable|mail delivery subsystem|vacation responder|mailbox full)\b/.test(text);
  const isOptOut = /\b(unsubscribe|remove me|take me off|stop (?:emailing|contacting|sending)|do not (?:email|contact)|don't (?:email|contact)|no more emails|opt me out|opt[- ]?out)\b/.test(text);
  const isNegative = isOptOut || /\b(not interested|no interest|not a fit|no thank(?:s| you)?|please don't|wrong person|do not want|never contact)\b/.test(text);

  if (parseFailed) {
    return {
      status: "quarantined_parse_failed",
      isOptOut,
      isNegative,
      isAutomated,
      qualifies: false,
      parseFailed: true,
      reason: "body_parse_failed",
    };
  }
  if (isOptOut) {
    return {
      status: "unsubscribed",
      isOptOut: true,
      isNegative: true,
      isAutomated,
      qualifies: false,
      parseFailed: false,
      reason: "unsubscribe_request",
    };
  }
  if (isAutomated) {
    return {
      status: "automated",
      isOptOut,
      isNegative,
      isAutomated: true,
      qualifies: false,
      parseFailed: false,
      reason: "automated_reply",
    };
  }
  if (isNegative) {
    return {
      status: "negative",
      isOptOut: false,
      isNegative: true,
      isAutomated: false,
      qualifies: false,
      parseFailed: false,
      reason: "negative_reply",
    };
  }
  return {
    status: "qualified",
    isOptOut: false,
    isNegative: false,
    isAutomated: false,
    qualifies: true,
    parseFailed: false,
      reason: "positive_reply",
  };
}
