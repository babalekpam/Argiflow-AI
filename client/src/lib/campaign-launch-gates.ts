export function campaignLaunchGates({
  ready,
  busy,
  confirmRecipients,
  confirmTerms,
}: {
  ready: boolean;
  busy: boolean;
  confirmRecipients: boolean;
  confirmTerms: boolean;
}) {
  const canReview = ready && !busy;
  return {
    canReview,
    canLaunch: canReview && confirmRecipients && confirmTerms,
  };
}