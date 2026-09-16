/**
 * The owner-approved Track-Med offer is deliberately kept in one dependency-free
 * module.  Server lead generation and the campaign preparation UI must consume
 * this source instead of independently paraphrasing the offer.
 */

export const TRACKMED_CALENDAR_URL = "https://calendly.com/track-med-info/30min";

export const TRACKMED_APPROVED_OFFER_TERMS =
  "Offer terms: One offer per new qualifying medical or dental practice signing a billing-services agreement. $250 off each of the first four monthly Track-Med billing-service invoices; monthly fees must be at least $1,000 before credit. Applies only to Track-Med service fees, not third-party costs, insurance payments, or patient balances. No cash value, transfer, or refund of unused credit. Cancellation ends unused credits without reclaiming correctly applied credits. Includes free code analysis; the 90-day prior-authorization promotion is an alternative, not an additional discount. No guarantee of recovered revenue or approvals.";

export const TRACKMED_APPROVED_OFFER_CONTEXT =
  "Track-Med billing services for qualifying new medical or dental billing service clients signing a billing-services agreement. The approved offer is $250 off each of the first four monthly Track-Med billing-service invoices ($1,000 in total service credits), with monthly service fees of at least $1,000 before the credit. Include free code analysis. The 90-day prior-authorization promotion is an alternative, not an additional discount. Credits apply only to Track-Med billing-service fees, not third-party costs, insurance payments, or patient balances. Credits have no cash value and cannot be refunded or transferred. Unused credits stop when service is cancelled, with no clawback of correctly applied credits. Do not promise recovered revenue or approvals.";

export const TRACKMED_APPROVED_OFFER_GOALS = [
  "Introduce the approved Track-Med credit offer to qualifying new medical or dental billing service clients.",
  "Invite interested prospects to a 30-minute information call.",
  "Keep the offer terms, no-stacking rule, and polite opt-out clear.",
];

export interface TrackMedApprovedOfferEmailOptions {
  firstName?: string | null;
  practiceName?: string | null;
  senderName?: string | null;
  senderTitle?: string | null;
  bookingURL?: string | null;
}

export interface TrackMedCampaignStep {
  subject: string;
  body: string;
  delayDays: number;
}

function safeText(value: string | null | undefined, fallback: string): string {
  const normalized = typeof value === "string"
    ? value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim()
    : "";
  return normalized || fallback;
}

export function safeBookingURL(value: string | null | undefined): string {
  const candidate = safeText(value, TRACKMED_CALENDAR_URL);
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : TRACKMED_CALENDAR_URL;
  } catch {
    return TRACKMED_CALENDAR_URL;
  }
}

export function isTrackMedTenant(companyName: string | null | undefined): boolean {
  return typeof companyName === "string" && /track[\s-]?med/i.test(companyName);
}

function renderApprovedOfferStep(
  step: 0 | 1 | 2 | 3,
  options: TrackMedApprovedOfferEmailOptions,
): TrackMedCampaignStep {
  const firstNameValue = safeText(options.firstName, "{{firstName}}");
  const firstName = firstNameValue === "{{firstName}}"
    ? firstNameValue
    : firstNameValue
      .replace(/^(?:dr|mr|ms|mrs|miss|prof)\.?\s+/i, "")
      .split(" ")[0] || "{{firstName}}";
  const practiceName = safeText(options.practiceName, "{{companyName}}");
  const senderName = safeText(options.senderName, "{{senderName}}");
  const senderTitle = safeText(options.senderTitle, "Track-Med Billing Solutions");
  const bookingURL = safeBookingURL(options.bookingURL);
  const signoff = `\n\nBest,\n${senderName}\n${senderTitle}`;

  const steps: TrackMedCampaignStep[] = [
    {
      subject: "Track-Med: $250 credit and free code analysis",
      body: `Hi ${firstName},

I’m reaching out from Track-Med about billing services for ${practiceName}. For qualifying new medical or dental practice clients signing a billing-services agreement, the approved offer is $250 off each of the first four monthly Track-Med billing-service invoices, for $1,000 in total service credits, when the monthly service fee is at least $1,000 before the credit. We also include a free code analysis.

Credits apply only to Track-Med billing-service fees, not third-party costs, insurance payments, or patient balances. They have no cash value and cannot be refunded or transferred. The 90-day prior-authorization promotion is an alternative, not an additional discount. This offer does not promise recovered revenue or approvals.

If this could be useful, you can choose a 30-minute information call here: ${bookingURL}

If this is not relevant, reply “no” and I won’t follow up.${signoff}`,
      delayDays: 0,
    },
    {
      subject: "A quick follow-up on the Track-Med offer",
      body: `Hi ${firstName},

Just following up on my note about Track-Med billing services. For qualifying new medical or dental billing service clients, the approved structure is $250 off each of the first four monthly invoices (up to $1,000 in service credits), with a monthly service fee of at least $1,000 before the credit, plus a free code analysis.

The credit is for Track-Med billing-service fees only, with no cash value, refund, or transfer. The 90-day prior-authorization promotion cannot be stacked with it.

Would a short conversation be helpful? You can pick a time here: ${bookingURL}

If you would rather not hear from me, reply “no” and I’ll close this out.${signoff}`,
      delayDays: 3,
    },
    {
      subject: "Would a Track-Med information call help?",
      body: `Hi ${firstName},

Should I keep a Track-Med billing-services conversation open? The approved offer is for qualifying new medical or dental billing service clients: $250 off each of the first four monthly billing-service invoices, with monthly fees of at least $1,000 before the credit, and a free code analysis.

Unused credits stop on cancellation without reclaiming credits correctly applied. Credits are not cash, refundable, or transferable, and the 90-day prior-authorization promotion is an alternative rather than an additional discount. We do not promise recovered revenue or approvals.

If you’d like to review the details, here is the calendar: ${bookingURL}

If this is not a fit, a quick “no” is perfect and I won’t follow up.${signoff}`,
      delayDays: 7,
    },
    {
      subject: "Last note about Track-Med billing services",
      body: `Hi ${firstName},

This is my last note about the Track-Med approved offer. Qualifying new medical or dental billing service clients may receive $250 off each of the first four monthly billing-service invoices (up to $1,000 in service credits) when the monthly service fee is at least $1,000 before the credit. A free code analysis is included.

The credit applies only to Track-Med billing-service fees, has no cash value, and is not refundable or transferable. The 90-day prior-authorization promotion is not stackable with this offer. Unused credits stop if service is cancelled, without clawing back credits correctly applied.

If a 30-minute information call makes sense, you can choose one here: ${bookingURL}

If I should stop, reply “no” and I’ll respect that.${signoff}`,
      delayDays: 14,
    },
  ];

  return {
    ...steps[step],
    body: `${steps[step].body.replace(signoff, "")}\n\n${TRACKMED_APPROVED_OFFER_TERMS}${signoff}`,
  };
}

export function buildTrackMedApprovedOfferEmail(
  options: TrackMedApprovedOfferEmailOptions = {},
): { subject: string; outreach: string } {
  const initial = renderApprovedOfferStep(0, options);
  return {
    subject: initial.subject,
    outreach: `Subject: ${initial.subject}\n\n${initial.body}`,
  };
}

/** Campaign preparation uses these placeholders; the campaign engine resolves lead fields at send time. */
export function getTrackMedApprovedOfferCampaignSteps(): TrackMedCampaignStep[] {
  return ([0, 1, 2, 3] as const).map((step) => renderApprovedOfferStep(step, {
    firstName: "{{firstName}}",
    practiceName: "{{companyName}}",
    senderName: "{{senderName}}",
    bookingURL: TRACKMED_CALENDAR_URL,
  }));
}

/**
 * This recognizes only the known Track-Med denial-rate draft.  A subject match
 * alone is intentionally insufficient, so an owner's custom email is never
 * blocked by the stale-draft guard.
 */
export function isObsoleteTrackMedInitialDraft(outreach: string | null | undefined): boolean {
  if (typeof outreach !== "string") return false;
  const subjectMatches = /^Subject:\s*Quick question about your claim denial rate\s*$/im.test(outreach);
  const contentMatches =
    /(?:8\s*[-–—]\s*15%|8\s*to\s*15%)/i.test(outreach) &&
    /AI claim scrubbing/i.test(outreach) &&
    /(?:free\s+20-minute\s+A\/R\s+audit|A\/R\s+audit)/i.test(outreach);
  return subjectMatches && contentMatches;
}
