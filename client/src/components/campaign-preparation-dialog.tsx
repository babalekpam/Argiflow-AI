import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  Rocket,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { campaignLaunchGates } from "@/lib/campaign-launch-gates";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface CampaignStrategyBrief {
  businessContext: string | null;
  goals: string[];
  updatedAt: string | null;
  source: "business_manager";
  saved: boolean;
}

interface CampaignStep {
  subject: string;
  body: string;
  delayDays: number;
}

interface CampaignDraftForm {
  name: string;
  businessContext: string;
  goals: string;
  steps: CampaignStep[];
}

interface LaunchLead {
  id: string | number;
  name: string;
  email: string;
  status: string;
}

interface LaunchAccount {
  id: string;
  email: string;
  status: string;
}

interface LaunchOptions {
  leads: LaunchLead[];
  accounts: LaunchAccount[];
  smtpReady: boolean;
}

interface LaunchReadiness {
  ready: boolean;
  blockers: string[];
  leadCount: number;
  stepCount: number;
}

interface SavedSmtpSender {
  id: string;
  email: string;
  status: string;
}

interface CampaignPreparationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brief?: CampaignStrategyBrief;
}

const TRACK_MED_CALENDAR_URL = "https://calendly.com/track-med-info/30min";
const TRACK_MED_OFFER_TERMS = "Offer terms: One offer per new qualifying medical or dental practice signing a billing-services agreement. $250 off each of the first four monthly Track-Med billing-service invoices; monthly fees must be at least $1,000 before credit. Applies only to Track-Med service fees, not third-party costs, insurance payments, or patient balances. No cash value, transfer, or refund of unused credit. Cancellation ends unused credits without reclaiming correctly applied credits. Includes free code analysis; cannot be combined with the 90-day prior-authorization promotion. No guarantee of recovered revenue or approvals.";

/*
 * Keep the approved offer as an explicit, user-invoked template. The ordinary
 * draft below deliberately has no Track-Med language so that one tenant's
 * approved offer can never become another tenant's default campaign.
 */
const TRACK_MED_TEMPLATE: CampaignDraftForm = {
  name: "Track-Med approved credit offer",
  businessContext:
    "Track-Med billing services for qualifying new medical or dental billing service clients signing a billing-services agreement. The approved offer is $250 off each of the first four monthly Track-Med billing-service invoices ($1,000 in total service credits), with monthly service fees of at least $1,000 before the credit. Include free code analysis. The 90-day prior-authorization promotion is an alternative, not an additional discount. Credits apply only to Track-Med billing-service fees, not third-party costs, insurance payments, or patient balances. Credits have no cash value and cannot be refunded or transferred. Unused credits stop when service is cancelled, with no clawback of correctly applied credits. Do not promise recovered revenue or approvals.",
  goals:
    "Introduce the approved Track-Med credit offer to qualifying new medical or dental billing service clients.\nInvite interested prospects to a 30-minute information call.\nKeep the offer terms, no-stacking rule, and polite opt-out clear.",
  steps: [
    {
      subject: "Track-Med: $250 credit and free code analysis",
      body: `Hi {{firstName}},

I’m reaching out from Track-Med about billing services for qualifying new medical or dental practice clients signing a billing-services agreement. The approved offer is $250 off each of the first four monthly Track-Med billing-service invoices, for $1,000 in total service credits, when the monthly service fee is at least $1,000 before the credit. We also include a free code analysis.

Credits apply only to Track-Med billing-service fees, not third-party costs, insurance payments, or patient balances. They have no cash value and cannot be refunded or transferred. The 90-day prior-authorization promotion is an alternative, not an additional discount. This offer does not promise recovered revenue or approvals.

If this could be useful, you can choose a 30-minute information call here: ${TRACK_MED_CALENDAR_URL}

If this is not relevant, reply “no” and I won’t follow up.`,
      delayDays: 0,
    },
    {
      subject: "A quick follow-up on the Track-Med offer",
      body: `Hi {{firstName}},

Just following up on my note about Track-Med billing services. For qualifying new medical or dental billing service clients, the approved structure is $250 off each of the first four monthly invoices (up to $1,000 in service credits), with a monthly service fee of at least $1,000 before the credit, plus a free code analysis.

The credit is for Track-Med billing-service fees only, with no cash value, refund, or transfer. The 90-day prior-authorization promotion cannot be stacked with it.

Would a short conversation be helpful? You can pick a time here: ${TRACK_MED_CALENDAR_URL}

If you would rather not hear from me, reply “no” and I’ll close this out.`,
      delayDays: 3,
    },
    {
      subject: "Would a Track-Med information call help?",
      body: `Hi {{firstName}},

Should I keep a Track-Med billing-services conversation open? The approved offer is for qualifying new medical or dental billing service clients: $250 off each of the first four monthly billing-service invoices, with monthly fees of at least $1,000 before the credit, and a free code analysis.

Unused credits stop on cancellation without reclaiming credits correctly applied. Credits are not cash, refundable, or transferable, and the 90-day prior-authorization promotion is an alternative rather than an additional discount. We do not promise recovered revenue or approvals.

If you’d like to review the details, here is the calendar: ${TRACK_MED_CALENDAR_URL}

If this is not a fit, a quick “no” is perfect and I won’t follow up.`,
      delayDays: 7,
    },
    {
      subject: "Last note about Track-Med billing services",
      body: `Hi {{firstName}},

This is my last note about the Track-Med approved offer. Qualifying new medical or dental billing service clients may receive $250 off each of the first four monthly billing-service invoices (up to $1,000 in service credits) when the monthly service fee is at least $1,000 before the credit. A free code analysis is included.

The credit applies only to Track-Med billing-service fees, has no cash value, and is not refundable or transferable. The 90-day prior-authorization promotion is not stackable with this offer. Unused credits stop if service is cancelled, without clawing back credits correctly applied.

If a 30-minute information call makes sense, you can choose one here: ${TRACK_MED_CALENDAR_URL}

If I should stop, reply “no” and I’ll respect that.`,
      delayDays: 14,
    },
  ].map((step) => ({ ...step, body: `${step.body}\n\n${TRACK_MED_OFFER_TERMS}` })),
};

function createGenericSteps(): CampaignStep[] {
  return [
    {
      subject: "A quick idea for your business",
      body: `Hi {{firstName}},

I’m reaching out because your work may be relevant to the business context above. I’d be glad to share a little more and learn whether this is useful for you.

Would a brief conversation be worthwhile? Reply with a time that works for you.

If this is not relevant, reply “no” and I won’t follow up.`,
      delayDays: 0,
    },
    {
      subject: "Following up",
      body: `Hi {{firstName}},

I wanted to follow up on my note. If this is relevant to your current priorities, I’m happy to send a short overview or compare notes.

Would a brief conversation be useful? You can reply with a convenient time.

If you would rather not hear from me, reply “no” and I’ll close the loop.`,
      delayDays: 3,
    },
    {
      subject: "Should I close the loop?",
      body: `Hi {{firstName}},

Should I close the loop on this? If the topic is useful, reply with a time for a short conversation and I’ll work around your schedule.

If it is not relevant, just reply “no” and I won’t follow up.`,
      delayDays: 7,
    },
    {
      subject: "Last note",
      body: `Hi {{firstName}},

This is my last note. If a short conversation would be helpful, reply with a time that works for you.

If this is not a fit, reply “no” and I’ll stop here. Thank you either way.`,
      delayDays: 14,
    },
  ];
}

function cloneSteps(steps: CampaignStep[]): CampaignStep[] {
  return steps.map((step) => ({ ...step }));
}

function createInitialDraft(brief?: CampaignStrategyBrief): CampaignDraftForm {
  const context = brief?.saved && typeof brief.businessContext === "string"
    ? brief.businessContext.trim()
    : "";
  const goals = brief?.saved && Array.isArray(brief.goals)
    ? brief.goals.filter((goal) => typeof goal === "string" && goal.trim()).map((goal) => goal.trim()).join("\n")
    : "";

  return {
    name: "",
    businessContext: context,
    goals,
    steps: createGenericSteps(),
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "The server did not provide more details.";
}

function accountKey(account: LaunchAccount): string {
  return String(account.id);
}

function leadKey(lead: LaunchLead): string {
  return String(lead.id);
}

function publicAccountIdMatches(left: string, right: string): boolean {
  return left === right;
}

export function CampaignPreparationDialog({
  open,
  onOpenChange,
  brief,
}: CampaignPreparationDialogProps) {
  const { toast } = useToast();
  const [view, setView] = useState<"editor" | "review" | "complete">("editor");
  const [form, setForm] = useState<CampaignDraftForm>(() => createInitialDraft(brief));
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  // email_accounts uses UUID/text ids. Keep those ids as strings end-to-end;
  // coercing one with Number() would turn a real account id into NaN.
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedSenderMessage, setSavedSenderMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRecipients, setConfirmRecipients] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);
  const saveLockRef = useRef(false);
  const launchLockRef = useRef(false);
  const savedSenderLockRef = useRef(false);

  const launchOptionsQuery = useQuery<LaunchOptions>({
    queryKey: ["/api/instantly/campaign-launch-options"],
    enabled: open,
    retry: false,
  });

  const options = launchOptionsQuery.data;
  const readinessPath = draftId
    ? `/api/instantly/campaigns/${draftId}/launch-readiness`
    : "/api/instantly/campaigns/none/launch-readiness";
  const readinessQuery = useQuery<LaunchReadiness>({
    queryKey: [readinessPath],
    enabled: open && view === "review" && Boolean(draftId),
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const goals = form.goals
        .split(/\r?\n/)
        .map((goal) => goal.trim())
        .filter(Boolean);
      const response = await apiRequest("POST", "/api/instantly/campaign-preparations", {
        name: form.name.trim(),
        businessContext: form.businessContext.trim(),
        goals,
        steps: form.steps.map((step) => ({
          subject: step.subject.trim(),
          body: step.body.trim(),
          delayDays: Math.max(0, Number(step.delayDays) || 0),
        })),
        leadIds: selectedLeadIds,
        accountIds: selectedAccountIds,
      });
      return response.json() as Promise<{ id: string | number; status: string }>;
    },
    onSuccess: (data) => {
      saveLockRef.current = false;
      if (!data?.id) {
        setFormError("The server did not return a draft id. Nothing was launched.");
        return;
      }
      const newDraftId = String(data.id);
      setDraftId(newDraftId);
      setSaveMessage("Brief saved and draft created. Nothing has been sent.");
      setLaunchMessage(null);
      setView("review");
      queryClient.invalidateQueries({ queryKey: ["/api/aria/strategy-brief"] });
      toast({
        title: "Brief saved and draft created",
        description: "Nothing was sent. Review the recipients and sender before launching.",
      });
    },
    onError: (error) => {
      saveLockRef.current = false;
      setFormError(`We could not confirm this save. No automatic retry was made. ${getErrorMessage(error)}`);
    },
    retry: false,
  });

  const launchMutation = useMutation({
    mutationFn: async () => {
      if (!draftId) throw new Error("Save the campaign draft before launching.");
      const response = await apiRequest("POST", `/api/instantly/campaigns/${draftId}/launch`);
      return response.json() as Promise<{ status: string }>;
    },
    onSuccess: () => {
      launchLockRef.current = false;
      setLaunchMessage("Campaign launched and is now active.");
      setConfirmOpen(false);
      setView("complete");
      toast({ title: "Campaign launched", description: "The campaign is active." });
    },
    onError: (error) => {
      launchLockRef.current = false;
      setLaunchMessage(`The launch could not be confirmed. Nothing was retried automatically. ${getErrorMessage(error)}`);
    },
    retry: false,
  });

  const savedSenderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/instantly/campaign-saved-sender");
      return response.json() as Promise<SavedSmtpSender>;
    },
    onSuccess: async (sender) => {
      if (sender?.id === undefined || sender?.id === null || !sender.email) {
        savedSenderLockRef.current = false;
        setFormError("The saved SMTP sender response was incomplete. No account was selected.");
        return;
      }

      try {
        const refreshedOptions = await launchOptionsQuery.refetch();
        const returnedId = String(sender.id);
        const matchingAccount = (refreshedOptions.data?.accounts || []).find(
          (account) => String(account.id) === returnedId,
        );

        if (!matchingAccount) {
          savedSenderLockRef.current = false;
          setFormError("The saved SMTP sender was registered, but it was not returned in launch options. No account was selected.");
          return;
        }

        // This is intentionally the only path that selects this sender
        // automatically, and it follows the user's explicit button click.
        setSelectedAccountIds([matchingAccount.id]);
        setFormError(null);
        setSavedSenderMessage(`Saved SMTP sender ready: ${sender.email}`);
        toast({
          title: "Saved SMTP sender ready",
          description: "The returned sender was selected. Nothing was sent.",
        });
        savedSenderLockRef.current = false;
      } catch (error) {
        savedSenderLockRef.current = false;
        setFormError(`The saved SMTP sender was registered, but launch options could not be refreshed. ${getErrorMessage(error)}`);
      }
    },
    onError: (error) => {
      savedSenderLockRef.current = false;
      setFormError(`Could not use the saved SMTP sender. ${getErrorMessage(error)}`);
    },
    retry: false,
  });

  useEffect(() => {
    if (!open) return;
    setView("editor");
    setForm(createInitialDraft(brief));
    setSelectedLeadIds([]);
    setSelectedAccountIds([]);
    setDraftId(null);
    setFormError(null);
    setSaveMessage(null);
    setConfirmOpen(false);
    setConfirmRecipients(false);
    setConfirmTerms(false);
    setLaunchMessage(null);
    setSavedSenderMessage(null);
    saveMutation.reset();
    launchMutation.reset();
    savedSenderMutation.reset();
    // A new draft starts from the saved brief only when the user opens this
    // dialog. Loading this page never creates or mutates a campaign.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedSenderAccounts = useMemo(
    () => (options?.accounts || []).filter((account) => selectedAccountIds.some((id) => publicAccountIdMatches(id, account.id))),
    [options?.accounts, selectedAccountIds],
  );
  const selectedRecipients = useMemo(
    () => (options?.leads || []).filter((lead) => selectedLeadIds.includes(leadKey(lead))),
    [options?.leads, selectedLeadIds],
  );

  const updateStep = (index: number, field: keyof CampaignStep, value: string) => {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) =>
        stepIndex === index
          ? { ...step, [field]: field === "delayDays" ? Math.max(0, Number(value) || 0) : value }
          : step,
      ),
    }));
  };

  const toggleLead = (id: string) => {
    setSelectedLeadIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((current) => current.some((value) => publicAccountIdMatches(value, id))
      ? current.filter((value) => !publicAccountIdMatches(value, id))
      : [...current, id]);
  };

  const loadTrackMedTemplate = () => {
    setForm({
      ...TRACK_MED_TEMPLATE,
      businessContext: `${TRACK_MED_TEMPLATE.businessContext}\n\n${TRACK_MED_OFFER_TERMS}`,
      steps: cloneSteps(TRACK_MED_TEMPLATE.steps),
    });
    setFormError(null);
    setSaveMessage(null);
    toast({
      title: "Track-Med template loaded",
      description: "Review and edit the approved terms before saving.",
    });
  };

  const validateBeforeSave = (): string | null => {
    if (!form.name.trim()) return "Give this campaign a name before saving.";
    if (!form.businessContext.trim()) return "Add business context before saving the campaign.";
    if (form.steps.length !== 4) return "A campaign must include one initial email and three follow-ups.";
    if (form.steps.some((step) => !step.subject.trim() || !step.body.trim())) {
      return "Each email step needs a subject and body.";
    }
    return null;
  };

  const handleSave = () => {
    if (saveLockRef.current || saveMutation.isPending || launchMutation.isPending || savedSenderMutation.isPending) return;
    const error = validateBeforeSave();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setSaveMessage(null);
    saveLockRef.current = true;
    saveMutation.mutate();
  };

  const handleOpenConfirmation = () => {
    setConfirmRecipients(false);
    setConfirmTerms(false);
    setLaunchMessage(null);
    setConfirmOpen(true);
  };

  const handleUseSavedSmtpSender = () => {
    if (savedSenderLockRef.current || savedSenderMutation.isPending) return;
    savedSenderLockRef.current = true;
    savedSenderMutation.mutate();
  };

  const { canReview, canLaunch } = campaignLaunchGates({
    ready: readinessQuery.data?.ready === true,
    busy: launchMutation.isPending || readinessQuery.isFetching,
    confirmRecipients,
    confirmTerms,
  });
  const finalLaunchDisabled = !canLaunch;

  const handleLaunch = () => {
    if (launchLockRef.current || finalLaunchDisabled) return;
    launchLockRef.current = true;
    launchMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="block max-h-[92vh] w-[calc(100vw-2rem)] min-w-0 max-w-5xl overflow-x-hidden overflow-y-auto break-words border-white/10 bg-gray-950 p-0 text-gray-100"
        data-testid="dialog-prepare-new-campaign"
      >
        <DialogHeader className="border-b border-white/10 px-5 py-4 pr-12 text-left">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-sky-500/10 p-2 text-sky-400">
              {view === "review" || view === "complete" ? <Rocket className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg text-white">
                {view === "editor" ? "Prepare a new campaign" : view === "review" ? "Review campaign draft" : "Campaign launch complete"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-gray-400">
                {view === "editor"
                  ? "Create a draft from your saved brief. Saving does not send email."
                  : view === "review"
                  ? "Confirm readiness, recipients, sender accounts, and terms before anything is sent."
                  : "This campaign is active. No other campaign was changed."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-w-0 space-y-5 px-5 py-5">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200" role="alert" data-testid="campaign-preparation-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span>{formError}</span>
            </div>
          )}

          {saveMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200" role="status" data-testid="campaign-preparation-saved">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>{saveMessage}</span>
            </div>
          )}

          {launchMessage && (
            <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${view === "complete" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-red-500/30 bg-red-500/10 text-red-200"}`} role="alert" data-testid="campaign-launch-message">
              {view === "complete" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />}
              <span>{launchMessage}</span>
            </div>
          )}

          {view === "editor" && (
            <>
              <div className="flex flex-col gap-3 rounded-lg border border-sky-500/20 bg-sky-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Optional approved offer template</p>
                  <p className="mt-1 text-xs text-gray-400">
                    This is an opt-in Track-Med template. It is never loaded into ordinary campaign drafts.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 border-sky-500/30 text-sky-300 hover:bg-sky-500/10"
                  onClick={loadTrackMedTemplate}
                  data-testid="button-load-track-med-template"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Load Track-Med approved offer template
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name" className="text-gray-200">Campaign name</Label>
                  <Input
                    id="campaign-name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="e.g. New practice billing outreach"
                    className="border-white/15 bg-white/5 text-white"
                    data-testid="input-campaign-name"
                  />
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-gray-400">
                  <p className="font-medium text-gray-300">Draft only</p>
                  <p className="mt-1">No email is sent when you save. Recipients and sending accounts are selected explicitly below.</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="campaign-business-context" className="text-gray-200">Business context</Label>
                  <Textarea
                    id="campaign-business-context"
                    value={form.businessContext}
                    onChange={(event) => setForm((current) => ({ ...current, businessContext: event.target.value }))}
                    placeholder="Your saved business context appears here. Edit it for this campaign."
                    className="min-h-[150px] border-white/15 bg-white/5 text-white"
                    data-testid="textarea-campaign-business-context"
                  />
                  <p className="text-xs text-gray-500">Loaded from the saved mailing brief when available.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign-goals" className="text-gray-200">Goals <span className="font-normal text-gray-500">(one per line)</span></Label>
                  <Textarea
                    id="campaign-goals"
                    value={form.goals}
                    onChange={(event) => setForm((current) => ({ ...current, goals: event.target.value }))}
                    placeholder="What should this campaign accomplish?"
                    className="min-h-[150px] border-white/15 bg-white/5 text-white"
                    data-testid="textarea-campaign-goals"
                  />
                </div>
              </div>

              <section aria-labelledby="campaign-steps-heading">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h3 id="campaign-steps-heading" className="text-sm font-semibold text-white">Email sequence</h3>
                    <p className="mt-1 text-xs text-gray-400">One initial email followed by three follow-ups. Plain text is used for this preparation.</p>
                  </div>
                  <Badge className="border-white/10 bg-white/5 text-gray-300">4 steps</Badge>
                </div>
                <div className="space-y-4">
                  {form.steps.map((step, index) => (
                    <div key={index} className="rounded-lg border border-white/10 bg-white/[0.03] p-4" data-testid={`campaign-step-${index}`}>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/15 text-xs font-semibold text-sky-300">{index + 1}</span>
                          <p className="text-sm font-medium text-white">{index === 0 ? "Initial email" : `Follow-up ${index}`}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`campaign-step-${index}-delay`} className="text-xs text-gray-400">Delay days</Label>
                          <Input
                            id={`campaign-step-${index}-delay`}
                            type="number"
                            min={0}
                            value={step.delayDays}
                            onChange={(event) => updateStep(index, "delayDays", event.target.value)}
                            className="h-8 w-20 border-white/15 bg-white/5 text-white"
                            data-testid={`input-campaign-step-${index}-delay`}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor={`campaign-step-${index}-subject`} className="text-xs text-gray-300">Subject</Label>
                          <Input
                            id={`campaign-step-${index}-subject`}
                            value={step.subject}
                            onChange={(event) => updateStep(index, "subject", event.target.value)}
                            className="border-white/15 bg-white/5 text-white"
                            data-testid={`input-campaign-step-${index}-subject`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`campaign-step-${index}-body`} className="text-xs text-gray-300">Plain-text body</Label>
                          <Textarea
                            id={`campaign-step-${index}-body`}
                            value={step.body}
                            onChange={(event) => updateStep(index, "body", event.target.value)}
                            className="min-h-[170px] border-white/15 bg-white/5 font-mono text-sm leading-relaxed text-white"
                            data-testid={`textarea-campaign-step-${index}-body`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4" aria-labelledby="campaign-leads-heading">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 id="campaign-leads-heading" className="flex items-center gap-2 text-sm font-semibold text-white"><Users className="h-4 w-4 text-sky-400" />Recipients</h3>
                      <p className="mt-1 text-xs text-gray-400">Select leads explicitly. None are selected by default.</p>
                    </div>
                    <Badge className="border-white/10 bg-white/5 text-gray-300">{selectedLeadIds.length} selected</Badge>
                  </div>
                  {launchOptionsQuery.isPending && <p className="text-sm text-gray-400" role="status">Loading available leads…</p>}
                  {launchOptionsQuery.isError && (
                    <div className="space-y-2 text-sm text-red-300" role="alert" data-testid="campaign-options-error">
                      <p>Could not load leads and sending accounts. {getErrorMessage(launchOptionsQuery.error)}</p>
                      <Button type="button" size="sm" variant="outline" onClick={() => launchOptionsQuery.refetch()} disabled={launchOptionsQuery.isFetching} data-testid="button-refresh-campaign-options">
                        <RefreshCw className={`mr-2 h-3.5 w-3.5 ${launchOptionsQuery.isFetching ? "animate-spin" : ""}`} />Try again
                      </Button>
                    </div>
                  )}
                  {!launchOptionsQuery.isPending && !launchOptionsQuery.isError && (options?.leads || []).length === 0 && (
                    <p className="text-sm text-gray-400" data-testid="campaign-leads-empty">No eligible leads are available. Add or sync leads before launching.</p>
                  )}
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {(options?.leads || []).map((lead) => {
                      const id = leadKey(lead);
                      return (
                        <label key={id} htmlFor={`campaign-lead-${id}`} className="flex cursor-pointer items-start gap-3 rounded-md border border-white/10 p-3 hover:bg-white/5">
                          <Checkbox
                            id={`campaign-lead-${id}`}
                            checked={selectedLeadIds.includes(id)}
                            onCheckedChange={() => toggleLead(id)}
                            data-testid={`checkbox-campaign-lead-${id}`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-gray-200">{lead.name || "Unnamed lead"}</span>
                            <span className="block truncate text-xs text-gray-500">{lead.email}</span>
                          </span>
                          <span className="text-[11px] capitalize text-gray-500">{lead.status || "unknown"}</span>
                        </label>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4" aria-labelledby="campaign-accounts-heading">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 id="campaign-accounts-heading" className="flex items-center gap-2 text-sm font-semibold text-white"><Mail className="h-4 w-4 text-sky-400" />Sending accounts</h3>
                      <p className="mt-1 text-xs text-gray-400">Select sender accounts explicitly. None are selected by default.</p>
                    </div>
                    <Badge className="border-white/10 bg-white/5 text-gray-300">{selectedAccountIds.length} selected</Badge>
                  </div>
                  {options && !options.smtpReady && (
                    <p className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200" data-testid="campaign-smtp-not-ready">
                      Sending is not ready. Use the saved SMTP sender below, or configure an account before launch.
                    </p>
                  )}
                  <div className="mb-3 flex flex-col gap-2 rounded-md border border-sky-500/20 bg-sky-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-medium text-sky-100">Saved SMTP sender</p>
                      <p className="mt-1 text-xs text-gray-400">Register the saved sender as safe account metadata. No credentials are shown and nothing is sent.</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleUseSavedSmtpSender}
                      disabled={savedSenderMutation.isPending}
                      className="shrink-0 border-sky-500/30 text-sky-200 hover:bg-sky-500/10"
                      data-testid="button-use-saved-smtp-sender"
                    >
                      {savedSenderMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Mail className="mr-2 h-3.5 w-3.5" />}
                      {savedSenderMutation.isPending ? "Registering…" : "Use saved SMTP sender"}
                    </Button>
                  </div>
                  {savedSenderMessage && (
                    <p className="mb-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200" role="status" data-testid="campaign-saved-sender-ready">
                      {savedSenderMessage}
                    </p>
                  )}
                  {!launchOptionsQuery.isPending && !launchOptionsQuery.isError && (options?.accounts || []).length === 0 && (
                    <p className="text-sm text-gray-400" data-testid="campaign-accounts-empty">No sending accounts are available. Connect an account before launching.</p>
                  )}
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {(options?.accounts || []).map((account) => {
                      const id = accountKey(account);
                      return (
                        <label key={id} htmlFor={`campaign-account-${id}`} className="flex cursor-pointer items-start gap-3 rounded-md border border-white/10 p-3 hover:bg-white/5">
                          <Checkbox
                            id={`campaign-account-${id}`}
                            checked={selectedAccountIds.some((selectedId) => publicAccountIdMatches(selectedId, account.id))}
                            onCheckedChange={() => toggleAccount(account.id)}
                            data-testid={`checkbox-campaign-account-${id}`}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-gray-200">{account.email}</span>
                          <span className="text-[11px] capitalize text-gray-500">{account.status || "unknown"}</span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              </div>
            </>
          )}

          {view === "review" && (
            <div className="space-y-4" data-testid="campaign-review">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Draft</p>
                  <p className="mt-1 truncate text-sm font-medium text-white">{form.name}</p>
                  <p className="mt-1 text-xs text-gray-500">ID {draftId}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Recipients</p>
                  <p className="mt-1 text-sm font-medium text-white">{selectedRecipients.length} selected lead{selectedRecipients.length === 1 ? "" : "s"}</p>
                  <p className="mt-1 text-xs text-gray-500">Server readiness count: {readinessQuery.data?.leadCount ?? "checking…"}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Sender</p>
                  <p className="mt-1 text-sm font-medium text-white">{selectedSenderAccounts.length} selected account{selectedSenderAccounts.length === 1 ? "" : "s"}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">{selectedSenderAccounts.map((account) => account.email).join(", ") || "No sender selected"}</p>
                </div>
              </div>

              {readinessQuery.isPending && (
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400" role="status" data-testid="campaign-readiness-loading">
                  <Loader2 className="h-4 w-4 animate-spin text-sky-400" /> Checking launch readiness…
                </div>
              )}
              {readinessQuery.isError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert" data-testid="campaign-readiness-error">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <span>Could not check launch readiness. {getErrorMessage(readinessQuery.error)}</span>
                </div>
              )}
              {readinessQuery.data && !readinessQuery.data.ready && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4" role="alert" data-testid="campaign-readiness-blocked">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    <div>
                      <p className="text-sm font-medium text-amber-100">Launch is blocked until these items are fixed</p>
                      {readinessQuery.data.blockers.length > 0 ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-200">
                          {readinessQuery.data.blockers.map((blocker, index) => <li key={`${blocker}-${index}`}>{blocker}</li>)}
                        </ul>
                      ) : (
                        <p className="mt-1 text-xs text-amber-200">The server has not marked this draft ready.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {readinessQuery.data?.ready && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200" role="status" data-testid="campaign-readiness-ready">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>Ready to review final recipients and sender confirmation. The draft has not sent anything.</span>
                </div>
              )}

              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <h3 className="text-sm font-semibold text-white">Sequence preview</h3>
                <div className="mt-3 space-y-2">
                  {form.steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-3 border-b border-white/5 py-2 last:border-0" data-testid={`review-step-${index}`}>
                      <span className="w-6 text-xs text-sky-300">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-200">{step.subject}</span>
                      <span className="text-xs text-gray-500">day {step.delayDays}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === "complete" && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6 text-center" data-testid="campaign-launch-complete">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
              <h3 className="mt-3 text-lg font-semibold text-white">Campaign active</h3>
              <p className="mt-2 text-sm text-emerald-100">The prepared campaign was launched with the recipients and sender accounts you confirmed.</p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-white/10 px-5 py-4">
          {view === "editor" && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending || launchMutation.isPending || savedSenderMutation.isPending}
              className="bg-sky-600 hover:bg-sky-700"
              data-testid="button-save-campaign-preparation"
            >
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {saveMutation.isPending ? "Saving draft…" : "Save & review"}
            </Button>
          )}
          {view === "review" && (
            <>
              <Button type="button" variant="outline" onClick={() => {
                setForm((current) => ({ ...current, name: `${current.name} — revision ${Date.now()}` }));
                setDraftId(null);
                setSaveMessage("Your previous draft is unchanged. Save this revision as a separate draft before launching.");
                setView("editor");
              }} disabled={launchMutation.isPending} data-testid="button-back-to-campaign-editor">
                <ArrowLeft className="mr-2 h-4 w-4" /> Revise as new draft
              </Button>
              <Button
                type="button"
                onClick={handleOpenConfirmation}
                disabled={!canReview}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="button-open-launch-confirmation"
              >
                <Rocket className="mr-2 h-4 w-4" /> Review & launch
              </Button>
            </>
          )}
          {view === "complete" && (
            <Button type="button" onClick={() => onOpenChange(false)} className="bg-sky-600 hover:bg-sky-700" data-testid="button-close-campaign-preparation">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-lg border-white/10 bg-gray-950 text-gray-100" data-testid="dialog-launch-confirmation">
          <DialogHeader className="text-left">
            <DialogTitle className="text-white">Confirm campaign launch</DialogTitle>
            <DialogDescription className="text-gray-400">
              This is the final confirmation. Launching will activate this draft and may send to the recipients below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              <p className="font-medium">Selected recipients and sender</p>
              <p className="mt-1">{selectedRecipients.length} recipient{selectedRecipients.length === 1 ? "" : "s"} will be contacted.</p>
              <p className="mt-1 break-words text-xs text-amber-200">
                Sender account{selectedSenderAccounts.length === 1 ? "" : "s"}: {selectedSenderAccounts.map((account) => account.email).join(", ") || "none selected"}
              </p>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 p-3" htmlFor="confirm-campaign-recipients">
              <Checkbox
                id="confirm-campaign-recipients"
                checked={confirmRecipients}
                onCheckedChange={(checked) => setConfirmRecipients(checked === true)}
                data-testid="checkbox-confirm-campaign-recipients"
              />
              <span className="text-sm text-gray-200">I confirm the selected recipient count and sender account(s) above.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 p-3" htmlFor="confirm-campaign-terms">
              <Checkbox
                id="confirm-campaign-terms"
                checked={confirmTerms}
                onCheckedChange={(checked) => setConfirmTerms(checked === true)}
                data-testid="checkbox-costs-terms-review"
              />
              <span className="text-sm text-gray-200">I reviewed the campaign costs and offer terms, and understand that launch sends the reviewed plain-text sequence.</span>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={launchMutation.isPending} data-testid="button-cancel-launch">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleLaunch}
              disabled={finalLaunchDisabled}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-confirm-launch"
            >
              {launchMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {launchMutation.isPending ? "Launching…" : "Confirm & launch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}