/**
 * Conservative contact-quality checks for automated outbound email.
 *
 * This deliberately does not claim that an address is deliverable or that a
 * public source has been independently verified. It only blocks values that
 * are plainly missing, synthetic, or explicitly marked as unverified.
 */

export interface LeadContactForQuality {
  name?: unknown;
  email?: unknown;
  notes?: unknown;
  source?: unknown;
  company?: unknown;
  outreach?: unknown;
}

const PLACEHOLDER_NAME_PATTERNS = [
  /\b(?:jane|john)\s+doe\b/i,
  /\b(?:jane|john)\s+smith\b/i,
  /^(?:test|sample|example|dummy|placeholder|fake|unknown|no\s+name|n\/a)(?:\b|$)/i,
  /\b(?:prospect|lead|contact)\s*#?\s*\d+\b/i,
  /\b(?:test|sample|example|dummy|placeholder|fake)\s+(?:lead|contact|person|prospect)\b/i,
];

const PLACEHOLDER_EMAIL_PATTERNS = [
  /@(example|example\.(?:com|org|net)|test|fake|dummy|placeholder|sample|mailinator|tempmail|guerrillamail)\./i,
  /^(?:test|fake|dummy|placeholder|sample|noreply|no-reply)@/i,
];

const UNSAFE_NOTE_PATTERNS = [
  /\bexample\s+line\b/i,
  /\b(?:placeholder|dummy|fake|synthetic|sample|test)\s+(?:data|lead|contact|record|email)\b/i,
  /\b(?:email|contact)\s+(?:was\s+)?(?:guessed|inferred|made\s+up|fabricated)\b/i,
  /\b(?:email|contact|address)\b[^.\n]{0,40}\b(?:guessed|inferred|made\s+up|fabricated)\b/i,
  /\b(?:(?:not\s+)?verified|unverified)\s+(?:email|contact|address|lead)\b/i,
  /\bdo\s+not\s+contact\b/i,
  /\blorem\s+ipsum\b/i,
];

const UNSAFE_SOURCE_PATTERNS = [
  /\b(?:synthetic|generated|ai[-\s]?generated|test|sample|example|dummy|fake|placeholder)\b/i,
  /\b(?:unverified|not\s+verified|guessed|inferred|pattern[-\s]?generated)\b/i,
];

const PUBLIC_SOURCE_PATTERNS = [
  /\bpublic\b/i,
  /\b(?:web|internet|online)\b/i,
  /\b(?:directory|google(?:\s+maps)?|yelp|yellow\s+pages|scrap(?:ed|ing)|search)\b/i,
];

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Return an actionable reason that a lead must not be automatically
 * contacted, or null when no obvious quality issue is present.
 *
 * Email syntax/deliverability is intentionally checked separately by
 * isValidRecipientEmail. A syntactically shaped address is not treated as
 * verified merely because this function returns null.
 */
export function getLeadContactIssue(lead: LeadContactForQuality): string | null {
  const name = asText(lead.name);
  const email = asText(lead.email);
  const notes = asText(lead.notes);
  const source = asText(lead.source);

  if (!email) return "Lead contact is missing an email address";
  if (!name) return "Lead contact is missing a name";

  if (PLACEHOLDER_NAME_PATTERNS.some(pattern => pattern.test(name))) {
    return "Lead contact name appears to be a placeholder or fabricated value";
  }

  if (PLACEHOLDER_EMAIL_PATTERNS.some(pattern => pattern.test(email))) {
    return "Lead email appears to be a placeholder or fabricated address";
  }

  if (UNSAFE_NOTE_PATTERNS.some(pattern => pattern.test(notes))) {
    return "Lead notes flag this contact as example, synthetic, guessed, or unverified";
  }

  if (UNSAFE_SOURCE_PATTERNS.some(pattern => pattern.test(source))) {
    return "Lead source is marked as synthetic, guessed, or unverified";
  }

  // Public sources are allowed when there is no explicit quality warning.
  // We do not infer that the address is verified from the source label alone.
  if (PUBLIC_SOURCE_PATTERNS.some(pattern => pattern.test(source)) &&
      /\b(?:unverified|not\s+verified|guessed|inferred|example|placeholder|synthetic)\b/i.test(`${notes} ${source}`)) {
    return "Public-source contact requires human verification before automatic sending";
  }

  return null;
}

export interface TenantSmtpSettings {
  smtpHost?: unknown;
  smtpUsername?: unknown;
  smtpPassword?: unknown;
  senderEmail?: unknown;
}

/**
 * Campaign mail must use a complete tenant-owned SMTP configuration. This
 * helper is intentionally pure so every automated sender can fail closed
 * before constructing a transport.
 */
export function getTenantSmtpConfigIssue(settings: TenantSmtpSettings | null | undefined): string | null {
  if (!asText(settings?.smtpHost) || !asText(settings?.smtpUsername) || !asText(settings?.smtpPassword)) {
    return "Tenant SMTP is not configured. Add the saved SMTP host, username, and password before sending campaign email.";
  }
  if (!asText(settings?.senderEmail)) {
    return "Tenant sender email is not configured. Add the verified sender email before sending campaign email.";
  }
  return null;
}

export function getOutreachPreflightIssue(
  lead: LeadContactForQuality,
  settings: TenantSmtpSettings | null | undefined,
  user: { companyName?: unknown } | null | undefined,
): string | null {
  const contactIssue = getLeadContactIssue(lead);
  if (contactIssue) return contactIssue;
  if (!asText(lead.outreach)) return "Lead has no outreach draft";
  if (!asText(user?.companyName)) {
    return "Company identity required. Configure the tenant company profile before sending outreach.";
  }
  return getTenantSmtpConfigIssue(settings);
}

export function getFollowUpPreflightIssue(
  lead: LeadContactForQuality,
  emailBody: unknown,
  settings: TenantSmtpSettings | null | undefined,
  user: { companyName?: unknown } | null | undefined,
): string | null {
  const contactIssue = getLeadContactIssue(lead);
  if (contactIssue) return contactIssue;
  if (!asText(emailBody)) return "No follow-up body was generated";
  if (!asText(user?.companyName)) {
    return "Missing company identity. Configure the tenant company profile before sending follow-ups.";
  }
  return getTenantSmtpConfigIssue(settings);
}

export const FOLLOW_UP_MAX_ATTEMPTS = 5;
export const FOLLOW_UP_RETRY_DELAYS_MS = [
  15 * 60 * 1000,
  60 * 60 * 1000,
  4 * 60 * 60 * 1000,
  12 * 60 * 60 * 1000,
] as const;

export function getFollowUpRetryDelayMs(failedAttempts: number): number {
  const index = Math.max(0, Math.min(failedAttempts - 1, FOLLOW_UP_RETRY_DELAYS_MS.length - 1));
  return FOLLOW_UP_RETRY_DELAYS_MS[index];
}

export interface FollowUpFailureDecision {
  status: "active" | "paused";
  nextAt: Date | null;
  nextStep: string;
}

/**
 * Convert a persisted failure count into the next durable sequence state.
 * The caller persists this state on the lead row; no in-memory retry counter
 * is required, so restarts cannot reset the retry budget.
 */
export function getFollowUpFailureDecision(
  failedAttempts: number,
  error: string,
  now = Date.now(),
): FollowUpFailureDecision {
  const attempts = Math.max(1, failedAttempts);
  if (attempts >= FOLLOW_UP_MAX_ATTEMPTS) {
    return {
      status: "paused",
      nextAt: null,
      nextStep: `Follow-up paused after ${attempts} failed attempts: ${error}. Fix the tenant SMTP or recipient issue, then resume manually.`,
    };
  }
  return {
    status: "active",
    nextAt: new Date(now + getFollowUpRetryDelayMs(attempts)),
    nextStep: `Follow-up send failed (attempt ${attempts}/${FOLLOW_UP_MAX_ATTEMPTS}): ${error}. Retry scheduled with backoff.`,
  };
}

export interface ManualRetryDecision {
  allowed: boolean;
  action: "outreach" | "follow-up" | "reject";
  reason: string;
}

/**
 * Email-log retry policy. A follow-up log must return to the follow-up
 * sequence processor; it must never be resent through the initial-outreach
 * path. Other sources are deliberately rejected because their original
 * sender/enrollment state is not available here.
 */
export function getManualRetryDecision(input: {
  source?: unknown;
  status?: unknown;
  attempts: number;
  errorMessage?: unknown;
}): ManualRetryDecision {
  const source = asText(input.source);
  const status = asText(input.status).toLowerCase();
  const attempts = Math.max(0, input.attempts);

  if (status !== "failed" && status !== "bounced") {
    return { allowed: false, action: "reject", reason: "Only failed or bounced email logs can be retried" };
  }
  if (source !== "outreach" && source !== "follow-up") {
    return {
      allowed: false,
      action: "reject",
      reason: `Manual retry is unsupported for email source "${source || "unknown"}"; use the original sending sequence`,
    };
  }
  if (status === "bounced" || isPermanentEmailFailure(input.errorMessage)) {
    return {
      allowed: false,
      action: "reject",
      reason: "This failure is permanent; fix the recipient or tenant sender configuration before resuming",
    };
  }
  if (attempts >= FOLLOW_UP_MAX_ATTEMPTS) {
    return {
      allowed: false,
      action: "reject",
      reason: `Retry cap reached (${FOLLOW_UP_MAX_ATTEMPTS} attempts); resume only after fixing the sender or recipient`,
    };
  }

  return source === "follow-up"
    ? { allowed: true, action: "follow-up", reason: "Retry through the original follow-up sequence processor" }
    : { allowed: true, action: "outreach", reason: "Retry through the tenant outreach sender" };
}

/**
 * SMTP failures that indicate a bad recipient or tenant configuration must
 * not be retried. Network/service failures remain retryable up to the
 * durable attempt cap above.
 */
export function isPermanentEmailFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return /\b(?:550|551|552|553|554|535|530)\b/.test(message) ||
    /(?:authentication|auth failed|invalid credential|invalid sender|sender rejected|recipient rejected|mailbox.*(?:not found|unavailable)|user unknown|does not exist|undeliverable|unsubscrib|invalid.*(?:recipient|email)|not configured)/i.test(message);
}

export interface EmailSendReconciliationDecision {
  status: "sent" | "failed" | "pending";
  retryable: boolean;
  requiresReview: boolean;
}

/**
 * Once transport may have accepted a message, a bookkeeping failure is not a
 * send failure. Keep the durable claim pending and require review instead of
 * allowing a retry to duplicate an accepted or unknown delivery.
 */
export function getEmailSendReconciliationDecision(input: {
  transportAccepted: boolean;
  bookkeepingPersisted: boolean;
  transportOutcomeKnown?: boolean;
  permanent?: boolean;
}): EmailSendReconciliationDecision {
  if (input.transportAccepted) {
    return input.bookkeepingPersisted
      ? { status: "sent", retryable: false, requiresReview: false }
      : { status: "pending", retryable: false, requiresReview: true };
  }
  if (!input.bookkeepingPersisted || input.transportOutcomeKnown === false) {
    return { status: "pending", retryable: false, requiresReview: true };
  }
  if (input.permanent) {
    return { status: "failed", retryable: false, requiresReview: false };
  }
  return { status: "failed", retryable: true, requiresReview: false };
}