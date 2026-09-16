import {
  buildTrackMedApprovedOfferEmail,
  isTrackMedTenant,
  TRACKMED_APPROVED_OFFER_CONTEXT,
  TRACKMED_APPROVED_OFFER_TERMS,
} from "../shared/trackmed-credit-offer";

export function isCampaignOffer(text: string): boolean {
  // Operational reports often mention "campaign" or "outreach"; those words
  // alone are not evidence that the message is a promotional offer.
  return /\bcode analysis\b|\bservice credits?\b|\b90[\s-]day\s+(?:free\s+)?(?:trial|prior[\s-]auth)|\bfree\s+(?:for\s+)?90[\s-]days?\b/i.test(text);
}

export function approvedCampaignContext(companyName?: string | null): string {
  if (!isTrackMedTenant(companyName)) return "";
  const sample = buildTrackMedApprovedOfferEmail();
  return `OWNER-APPROVED CURRENT CAMPAIGN (supersedes historical drafts, chat, and prior strategy):
${TRACKMED_APPROVED_OFFER_CONTEXT}
${TRACKMED_APPROVED_OFFER_TERMS}
Use the following approved copy for campaign previews, owner test emails, and prospect drafts. Do not substitute the old 90-day-trial pitch. Offer approval is NOT permission to send or launch. Prepare campaign email actions for review.
${sample.outreach}`;
}

/** Finalize new drafts before storing them. Never rewrite an already-approved send. */
export function normalizeAriaCampaignAction<T extends {
  category?: string; tool?: string; title?: string; description?: string;
  execute_now?: boolean;
  tool_params?: { to?: string; subject?: string; body?: string; [key: string]: unknown };
}>(action: T, companyName?: string | null, senderName?: string | null): T {
  const text = `${action.title || ""} ${action.description || ""} ${action.tool_params?.subject || ""} ${action.tool_params?.body || ""}`;
  if (!isTrackMedTenant(companyName) ||
      !(action.category === "email" || action.tool === "ses") || !isCampaignOffer(text)) return action;
  const email = buildTrackMedApprovedOfferEmail({ senderName });
  const body = email.outreach.replace(/^Subject:.*\n+/i, "");
  return {
    ...action,
    category: "email",
    tool: "ses",
    execute_now: false,
    title: "Review approved Track-Med campaign email",
    description: email.outreach,
    tool_params: {
      ...action.tool_params,
      subject: email.subject,
      body: body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>"),
    },
  };
}

/** Reject stale saved offers at the last shared ARIA transport boundary. */
export function campaignOfferSendError(
  companyName: string | null | undefined, subject: string, body: string,
): string | null {
  const text = `${subject}\n${body}`.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ");
  if (!isTrackMedTenant(companyName) || !isCampaignOffer(text)) return null;
  const terms = TRACKMED_APPROVED_OFFER_TERMS.replace(/\s+/g, " ");
  if (!text.includes(terms) || /\b90[\s-]day\s+(?:free\s+)?trial\b|\bfree\s+(?:for\s+)?90[\s-]days?\b/i.test(text)) {
    return "This saved Track-Med campaign draft does not contain the approved credit-offer terms. Regenerate the campaign email in ARIA and review the new draft before approving a send.";
  }
  return null;
}