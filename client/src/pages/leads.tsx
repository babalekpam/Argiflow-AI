import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Trash2,
  ChevronDown,
  ChevronRight,
  Target,
  Send,
  Building2,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
  Eye,
  MousePointerClick,
  Flame,
  TrendingUp,
  ArrowRight,
  BarChart3,
  Activity,
  Clock,
  Sparkles,
  UserCheck,
  Pencil,
  CalendarClock,
  X,
  PhoneCall,
  MessageSquare,
} from "lucide-react";
import type { Lead } from "@shared/schema";
import { useState, useEffect } from "react";

function getAddLeadSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t("leads.validation.nameRequired")),
    email: z.string().email(t("leads.validation.invalidEmail")),
    phone: z.string().optional(),
    source: z.string().min(1, t("leads.validation.sourceRequired")),
    status: z.string().default("new"),
  });
}

function LeadStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    hot: "bg-red-500/10 text-red-400 border-red-500/20",
    warm: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    cold: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    qualified: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  const statusLabels: Record<string, string> = {
    hot: t("leads.statuses.hot"),
    warm: t("leads.statuses.warm"),
    new: t("leads.statuses.new"),
    cold: t("leads.statuses.cold"),
    qualified: t("leads.statuses.qualified"),
  };
  return (
    <Badge className={styles[status] || styles.new}>
      {statusLabels[status] || status.toUpperCase()}
    </Badge>
  );
}

function EngagementLevelBadge({ level }: { level: string }) {
  const { t } = useTranslation();
  const config: Record<string, { style: string; label: string; icon: any }> = {
    hot: { style: "bg-red-500/10 text-red-400 border-red-500/20", label: t("leads.engagement.hot").toUpperCase(), icon: Flame },
    warm: { style: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: t("leads.engagement.warm").toUpperCase(), icon: TrendingUp },
    interested: { style: "bg-sky-500/10 text-sky-400 border-sky-500/20", label: t("leads.engagement.interested").toUpperCase(), icon: Eye },
    none: { style: "bg-slate-500/10 text-slate-400 border-slate-500/20", label: t("leads.engagement.noActivity"), icon: Clock },
  };
  const c = config[level] || config.none;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`text-xs ${c.style}`}>
      <Icon className="w-3 h-3 mr-1" />
      {c.label}
    </Badge>
  );
}

function EmailAnalyticsSummary() {
  const { t } = useTranslation();
  const { data: analytics } = useQuery<{
    totalSent: number;
    totalOpens: number;
    totalClicks: number;
    engaged: number;
    openRate: number;
    clickRate: number;
    byLevel: { hot: number; warm: number; interested: number; none: number };
  }>({
    queryKey: ["/api/email-analytics"],
  });

  if (!analytics || analytics.totalSent === 0) return null;

  return (
    <Card className="p-4 mb-6" data-testid="card-email-analytics">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">{t("leads.engagement.overview")}</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="text-center">
          <div className="text-lg font-bold" data-testid="text-total-sent">{analytics.totalSent}</div>
          <div className="text-xs text-muted-foreground">{t("leads.engagement.emailsSent")}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-sky-400" data-testid="text-total-opens">{analytics.totalOpens}</div>
          <div className="text-xs text-muted-foreground">{t("leads.engagement.totalOpens")}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-400" data-testid="text-total-clicks">{analytics.totalClicks}</div>
          <div className="text-xs text-muted-foreground">{t("leads.engagement.totalClicks")}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-400" data-testid="text-open-rate">{analytics.openRate}%</div>
          <div className="text-xs text-muted-foreground">{t("leads.engagement.openRate")}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-400" data-testid="text-click-rate">{analytics.clickRate}%</div>
          <div className="text-xs text-muted-foreground">{t("leads.engagement.clickRate")}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-400" data-testid="text-hot-leads">{analytics.byLevel.hot}</div>
          <div className="text-xs text-muted-foreground">{t("leads.engagement.hotLeads")}</div>
        </div>
      </div>
    </Card>
  );
}

function LeadCard({
  lead,
  isExpanded,
  toggleExpand,
  copiedId,
  copyOutreach,
  sendOutreachMutation,
  deleteMutation,
  updateLeadMutation,
  scheduleMutation,
  cancelScheduleMutation,
  callMutation,
  onSmsClick,
}: {
  lead: Lead;
  isExpanded: boolean;
  toggleExpand: (id: string) => void;
  copiedId: string | null;
  copyOutreach: (id: string, text: string) => void;
  sendOutreachMutation: any;
  deleteMutation: any;
  updateLeadMutation: any;
  scheduleMutation: any;
  cancelScheduleMutation: any;
  callMutation: any;
  onSmsClick: (lead: Lead) => void;
}) {
  const { t } = useTranslation();
  const isSent = !!lead.outreachSentAt;
  const isScheduled = !!lead.scheduledSendAt && !isSent;
  const hasEngagement = (lead.emailOpens || 0) > 0 || (lead.emailClicks || 0) > 0;
  const [isEditingOutreach, setIsEditingOutreach] = useState(false);
  const [draftText, setDraftText] = useState(lead.outreach || "");
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState("");

  useEffect(() => {
    if (!isEditingOutreach) {
      setDraftText(lead.outreach || "");
    }
  }, [lead.outreach, isEditingOutreach]);

  const handleSaveDraft = () => {
    if (!draftText.trim()) return;
    updateLeadMutation.mutate(
      { id: lead.id, outreach: draftText.trim() },
      { onSuccess: () => setIsEditingOutreach(false) }
    );
  };

  return (
    <div
      className="border rounded-md overflow-visible"
      data-testid={`lead-row-${lead.id}`}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover-elevate"
        onClick={() => toggleExpand(lead.id)}
        data-testid={`lead-header-${lead.id}`}
      >
        <div className="text-muted-foreground">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
          {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm" data-testid={`text-lead-name-${lead.id}`}>{lead.name}</span>
            {lead.company && (
              <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-lead-company-${lead.id}`}>
                <Building2 className="w-3 h-3" />
                {lead.company}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
            {lead.email && (
              <span className="flex items-center gap-1" data-testid={`text-lead-email-${lead.id}`}>
                <Mail className="w-3 h-3" />
                {lead.email}
              </span>
            )}
            {lead.phone && (
              <span className="flex items-center gap-1" data-testid={`text-lead-phone-${lead.id}`}>
                <Phone className="w-3 h-3" />
                {lead.phone}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {lead.intentSignal && (
            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
              <Target className="w-3 h-3 mr-1" />
              {t("leads.intent")}
            </Badge>
          )}
          {isSent && hasEngagement && (
            <EngagementLevelBadge level={lead.engagementLevel || "none"} />
          )}
          {isSent && hasEngagement && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid={`text-engagement-stats-${lead.id}`}>
              <span className="flex items-center gap-0.5" title={t("leads.engagement.opens")}>
                <Eye className="w-3 h-3 text-sky-400" />
                {lead.emailOpens || 0}
              </span>
              <span className="flex items-center gap-0.5" title={t("leads.engagement.clicks")}>
                <MousePointerClick className="w-3 h-3 text-emerald-400" />
                {lead.emailClicks || 0}
              </span>
            </div>
          )}
          {lead.outreach && isSent && !hasEngagement && (
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {t("common.sent")}
            </Badge>
          )}
          {lead.outreach && !isSent && isScheduled && (
            <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-400 border-violet-500/20">
              <CalendarClock className="w-3 h-3 mr-1" />
              {t("common.scheduled")}
            </Badge>
          )}
          {lead.outreach && !isSent && !isScheduled && (
            <Badge variant="outline" className="text-xs bg-sky-500/10 text-sky-400 border-sky-500/20">
              <Send className="w-3 h-3 mr-1" />
              {t("leads.ready")}
            </Badge>
          )}
          {!lead.outreach && !isSent && (
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20">
              <Pencil className="w-3 h-3 mr-1" />
              {t("leads.noDraft")}
            </Badge>
          )}
          <span data-testid={`badge-lead-status-${lead.id}`}><LeadStatusBadge status={lead.status} /></span>
          <span className="text-xs font-medium w-10 text-right" data-testid={`text-lead-score-${lead.id}`}>{lead.score}/100</span>
          <span className="text-xs text-muted-foreground w-20 text-right" data-testid={`text-lead-date-${lead.id}`}>
            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ""}
          </span>
          {lead.phone && (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); onSmsClick(lead); }}
                data-testid={`button-sms-lead-${lead.id}`}
                title={t("leads.smsLead")}
              >
                <MessageSquare className="w-4 h-4 text-chart-2" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); callMutation.mutate({ toNumber: lead.phone!, leadId: lead.id }); }}
                disabled={callMutation.isPending}
                data-testid={`button-call-lead-${lead.id}`}
                title={t("leads.callLead")}
              >
                <PhoneCall className="w-4 h-4 text-primary" />
              </Button>
            </>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(lead.id); }}
            disabled={deleteMutation.isPending}
            data-testid={`button-delete-lead-${lead.id}`}
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t p-4 space-y-3 bg-muted/30" data-testid={`lead-details-${lead.id}`}>
          {isSent && hasEngagement && (
            <div className="border rounded-md p-3 bg-background" data-testid={`engagement-panel-${lead.id}`}>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("leads.engagement.emailEngagement")}</span>
                <EngagementLevelBadge level={lead.engagementLevel || "none"} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <div className="text-sm font-bold text-sky-400">{lead.emailOpens || 0}</div>
                  <div className="text-xs text-muted-foreground">{t("leads.engagement.opens")}</div>
                </div>
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <div className="text-sm font-bold text-emerald-400">{lead.emailClicks || 0}</div>
                  <div className="text-xs text-muted-foreground">{t("leads.engagement.clicks")}</div>
                </div>
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <div className="text-sm font-bold">{lead.engagementScore || 0}</div>
                  <div className="text-xs text-muted-foreground">{t("leads.engagement.score")}</div>
                </div>
                <div className="text-center p-2 rounded-md bg-muted/50">
                  <div className="text-sm font-bold text-muted-foreground">
                    {lead.lastEngagedAt ? new Date(lead.lastEngagedAt).toLocaleDateString() : t("leads.engagement.na")}
                  </div>
                  <div className="text-xs text-muted-foreground">{t("leads.engagement.lastActive")}</div>
                </div>
              </div>
              {lead.nextStep && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-primary/5 border border-primary/10">
                  <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-primary">{t("leads.engagement.recommendedNextStep")}</span>
                    <p className="text-sm" data-testid={`text-next-step-${lead.id}`}>{lead.nextStep}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {isSent && !hasEngagement && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t("leads.engagement.waitingEngagement", { date: lead.outreachSentAt ? new Date(lead.outreachSentAt).toLocaleDateString() : "" })}
              </span>
            </div>
          )}

          {lead.intentSignal && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("leads.intentSignal")}</span>
              </div>
              <p className="text-sm pl-6" data-testid={`text-intent-${lead.id}`}>{lead.intentSignal}</p>
            </div>
          )}
          {lead.notes && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("leads.researchNotes")}</span>
              </div>
              <p className="text-sm pl-6" data-testid={`text-notes-${lead.id}`}>{lead.notes}</p>
            </div>
          )}

          {lead.outreach && !isEditingOutreach && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {isSent ? t("leads.outreachSent") : t("leads.outreachDraft")}
                  </span>
                  {isSent && lead.outreachSentAt && (
                    <span className="text-xs text-emerald-400">
                      {t("leads.sentOn", { date: new Date(lead.outreachSentAt).toLocaleDateString() })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isSent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setDraftText(lead.outreach || ""); setIsEditingOutreach(true); }}
                      data-testid={`button-edit-outreach-${lead.id}`}
                    >
                      <Pencil className="w-3 h-3 mr-1" /> {t("common.edit")}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); copyOutreach(lead.id, lead.outreach!); }}
                    data-testid={`button-copy-outreach-${lead.id}`}
                  >
                    {copiedId === lead.id ? (
                      <><Check className="w-3 h-3 mr-1" /> {t("leads.copied")}</>
                    ) : (
                      <><Copy className="w-3 h-3 mr-1" /> {t("leads.copy")}</>
                    )}
                  </Button>
                  {!isSent && lead.email && !isScheduled && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setShowScheduler(!showScheduler); }}
                        data-testid={`button-schedule-outreach-${lead.id}`}
                      >
                        <CalendarClock className="w-3 h-3 mr-1" /> {t("leads.scheduleOutreach")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); sendOutreachMutation.mutate(lead.id); }}
                        disabled={sendOutreachMutation.isPending}
                        data-testid={`button-send-outreach-${lead.id}`}
                      >
                        {sendOutreachMutation.isPending ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {t("common.sending")}</>
                        ) : (
                          <><Send className="w-3 h-3 mr-1" /> {t("leads.sendNow")}</>
                        )}
                      </Button>
                    </>
                  )}
                  {isScheduled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); cancelScheduleMutation.mutate(lead.id); }}
                      disabled={cancelScheduleMutation.isPending}
                      data-testid={`button-cancel-schedule-${lead.id}`}
                    >
                      <X className="w-3 h-3 mr-1" /> {t("leads.cancelSchedule")}
                    </Button>
                  )}
                </div>
              </div>

              {isScheduled && lead.scheduledSendAt && (
                <div className="pl-6 mb-2 flex items-center gap-2 p-2 rounded-md bg-violet-500/5 border border-violet-500/20" data-testid={`schedule-info-${lead.id}`}>
                  <CalendarClock className="w-4 h-4 text-violet-400" />
                  <span className="text-sm text-violet-400">
                    {t("leads.scheduledToSend", { date: new Date(lead.scheduledSendAt).toLocaleDateString(), time: new Date(lead.scheduledSendAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })}
                  </span>
                </div>
              )}

              {showScheduler && !isScheduled && !isSent && (
                <div className="pl-6 mb-2 flex items-center gap-2 p-3 rounded-md bg-muted/50 border" data-testid={`schedule-picker-${lead.id}`}>
                  <CalendarClock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    type="datetime-local"
                    value={scheduleDateTime}
                    onChange={(e) => setScheduleDateTime(e.target.value)}
                    min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                    className="max-w-[220px]"
                    data-testid={`input-schedule-datetime-${lead.id}`}
                  />
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!scheduleDateTime) return;
                      scheduleMutation.mutate(
                        { id: lead.id, scheduledSendAt: new Date(scheduleDateTime).toISOString() },
                        { onSuccess: () => { setShowScheduler(false); setScheduleDateTime(""); } }
                      );
                    }}
                    disabled={!scheduleDateTime || scheduleMutation.isPending}
                    data-testid={`button-confirm-schedule-${lead.id}`}
                  >
                    {scheduleMutation.isPending ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {t("leads.scheduling")}</>
                    ) : (
                      <><Check className="w-3 h-3 mr-1" /> {t("common.confirm")}</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setShowScheduler(false); setScheduleDateTime(""); }}
                    data-testid={`button-close-scheduler-${lead.id}`}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              )}

              <div className={`pl-6 p-3 rounded-md bg-background border text-sm whitespace-pre-wrap ${isSent ? "border-emerald-500/20" : ""}`} data-testid={`text-outreach-${lead.id}`}>
                {lead.outreach}
              </div>
            </div>
          )}

          {(isEditingOutreach || (!lead.outreach && !isSent)) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Pencil className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {lead.outreach ? t("leads.editOutreachDraft") : t("leads.writeOutreachEmail")}
                </span>
              </div>
              <Textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder={t("leads.outreachPlaceholder", { name: lead.name.split(" ")[0] })}
                className="min-h-[120px] text-sm"
                data-testid={`textarea-outreach-${lead.id}`}
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                {lead.outreach && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setDraftText(lead.outreach || ""); setIsEditingOutreach(false); }}
                    data-testid={`button-cancel-outreach-${lead.id}`}
                  >
                    {t("common.cancel")}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={!draftText.trim() || updateLeadMutation.isPending}
                  data-testid={`button-save-outreach-${lead.id}`}
                >
                  {updateLeadMutation.isPending ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {t("common.saving")}</>
                  ) : (
                    <><Check className="w-3 h-3 mr-1" /> {t("leads.saveDraft")}</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  const { t } = useTranslation();
  usePageTitle(t("leads.title"));
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "engaged">("new");
  const [smsLead, setSmsLead] = useState<Lead | null>(null);
  const [smsBody, setSmsBody] = useState("");

  const addLeadSchema = getAddLeadSchema(t);

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const form = useForm({
    resolver: zodResolver(addLeadSchema),
    defaultValues: { name: "", email: "", phone: "", source: "", status: "new" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addLeadSchema>) => {
      const res = await apiRequest("POST", "/api/leads", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-analytics"] });
      toast({ title: t("leads.leadCreated") });
      form.reset();
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: t("leads.createFailed"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-analytics"] });
      toast({ title: t("leads.leadDeleted") });
    },
    onError: () => {
      toast({ title: t("leads.deleteFailed"), variant: "destructive" });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/leads");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-analytics"] });
      toast({ title: t("leads.allCleared") });
    },
    onError: () => {
      toast({ title: t("leads.clearFailed"), variant: "destructive" });
    },
  });

  const sendOutreachMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const res = await apiRequest("POST", `/api/leads/${leadId}/send-outreach`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-analytics"] });
      toast({ title: data.message || t("leads.outreachEmailSent") });
    },
    onError: async (error: any) => {
      let message = t("leads.sendOutreachFailed");
      try {
        if (error?.message) message = error.message;
      } catch {}
      toast({ title: message, variant: "destructive" });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, outreach }: { id: string; outreach: string }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}`, { outreach });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: t("leads.draftSaved") });
    },
    onError: () => {
      toast({ title: t("leads.draftSaveFailed"), variant: "destructive" });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async ({ id, scheduledSendAt }: { id: string; scheduledSendAt: string }) => {
      const res = await apiRequest("POST", `/api/leads/${id}/schedule-outreach`, { scheduledSendAt });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: data.message || t("leads.outreachScheduled") });
    },
    onError: async (error: any) => {
      let message = t("leads.scheduleFailed");
      try { if (error?.message) message = error.message; } catch {}
      toast({ title: message, variant: "destructive" });
    },
  });

  const cancelScheduleMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const res = await apiRequest("POST", `/api/leads/${leadId}/cancel-schedule`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: data.message || t("leads.scheduleCancelled") });
    },
    onError: () => {
      toast({ title: t("leads.cancelScheduleFailed"), variant: "destructive" });
    },
  });

  const callMutation = useMutation({
    mutationFn: async (data: { toNumber: string; leadId: string }) => {
      const res = await apiRequest("POST", "/api/voice/calls", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("leads.callInitiated"), description: t("leads.callingNow") });
    },
    onError: (err: any) => {
      toast({ title: t("leads.callFailed"), description: err.message || t("leads.couldNotCall"), variant: "destructive" });
    },
  });

  const smsMutation = useMutation({
    mutationFn: async ({ leadId, body }: { leadId: string; body: string }) => {
      const res = await apiRequest("POST", `/api/leads/${leadId}/send-sms`, { body });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: t("leads.smsSentTitle"), description: t("leads.smsSentDesc", { name: data.leadName || "lead" }) });
      setSmsLead(null);
      setSmsBody("");
    },
    onError: (err: any) => {
      toast({ title: t("leads.smsFailedTitle"), description: err.message || t("leads.couldNotSms"), variant: "destructive" });
    },
  });

  const sendAllOutreachMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/leads/send-all-outreach");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-analytics"] });
      const msg = `${t("leads.sentEmailsCount", { sent: data.sent })}${data.failed > 0 ? `, ${t("leads.sentEmailsFailed", { failed: data.failed })}` : ""}`;
      toast({ title: msg });
    },
    onError: async (error: any) => {
      let message = t("leads.sendAllFailed");
      try {
        if (error?.message) message = error.message;
      } catch {}
      toast({ title: message, variant: "destructive" });
    },
  });

  const generateOutreachMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/leads/generate-outreach");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: data.message || t("leads.outreachGenerated") });
    },
    onError: (err: any) => {
      toast({ title: err.message || t("leads.outreachGenerateFailed"), variant: "destructive" });
    },
  });

  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyOutreach = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: t("leads.outreachCopied") });
  };

  const allLeads = leads || [];

  const newLeads = allLeads.filter(l => !l.outreachSentAt);
  const engagedLeads = allLeads.filter(l => !!l.outreachSentAt);

  const currentLeads = activeTab === "new" ? newLeads : engagedLeads;

  const filteredLeads = currentLeads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      (l.company || "").toLowerCase().includes(search.toLowerCase())
  );

  const unsentCount = newLeads.filter(l => l.outreach && l.email).length;
  const missingOutreachCount = newLeads.filter(l => !l.outreach || l.outreach.trim() === "").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-leads-title">{t("leads.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("leads.manageAndTrack")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(allLeads.length || 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(t("leads.confirmDeleteAll"))) {
                  deleteAllMutation.mutate();
                }
              }}
              disabled={deleteAllMutation.isPending}
              data-testid="button-clear-all-leads"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteAllMutation.isPending ? t("leads.clearing") : t("leads.clearAll")}
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-lead">
                <Plus className="w-4 h-4 mr-2" />
                {t("leads.addLead")}
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("leads.addNewLead")}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("leads.fullName")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("leads.leadNamePlaceholder")} {...field} data-testid="input-lead-name" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.email")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("leads.emailPlaceholder")} {...field} data-testid="input-lead-email" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.phone")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("leads.phonePlaceholder")} {...field} data-testid="input-lead-phone" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("leads.source")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lead-source">
                            <SelectValue placeholder={t("leads.selectSource")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Google Ads">{t("leads.googleAds")}</SelectItem>
                          <SelectItem value="Facebook">{t("leads.facebook")}</SelectItem>
                          <SelectItem value="Instagram">{t("leads.instagram")}</SelectItem>
                          <SelectItem value="Referral">{t("leads.referral")}</SelectItem>
                          <SelectItem value="Website">{t("leads.website")}</SelectItem>
                          <SelectItem value="Cold Outreach">{t("leads.coldOutreach")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("common.status")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lead-status">
                            <SelectValue placeholder={t("leads.selectStatus")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">{t("leads.statusNew")}</SelectItem>
                          <SelectItem value="warm">{t("leads.statusWarm")}</SelectItem>
                          <SelectItem value="hot">{t("leads.statusHot")}</SelectItem>
                          <SelectItem value="qualified">{t("leads.statusQualified")}</SelectItem>
                          <SelectItem value="cold">{t("leads.statusCold")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-lead">
                  {createMutation.isPending ? t("leads.creating") : t("leads.addLead")}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <EmailAnalyticsSummary />

      <div className="flex items-center border-b gap-0" data-testid="leads-tab-bar">
        <button
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "new"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("new")}
          data-testid="tab-new-leads"
        >
          <Sparkles className="w-4 h-4" />
          {t("leads.newLeads")}
          <Badge variant="secondary" className="text-xs ml-1">{newLeads.length}</Badge>
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "engaged"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("engaged")}
          data-testid="tab-engaged-leads"
        >
          <UserCheck className="w-4 h-4" />
          {t("leads.engagedLeads")}
          <Badge variant="secondary" className="text-xs ml-1">{engagedLeads.length}</Badge>
        </button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === "new" ? t("leads.searchNewLeads") : t("leads.searchEngagedLeads")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-leads"
            />
          </div>
          {activeTab === "new" && missingOutreachCount > 0 && (
            <Button
              variant="outline"
              onClick={() => generateOutreachMutation.mutate()}
              disabled={generateOutreachMutation.isPending}
              data-testid="button-generate-outreach"
            >
              {generateOutreachMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("leads.generatingDrafts")}</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />{t("leads.generateDrafts", { count: missingOutreachCount })}</>
              )}
            </Button>
          )}
          {activeTab === "new" && unsentCount > 0 && (
            <Button
              onClick={() => sendAllOutreachMutation.mutate()}
              disabled={sendAllOutreachMutation.isPending}
              data-testid="button-send-all-outreach"
            >
              {sendAllOutreachMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("common.sending")}</>
              ) : (
                <><Send className="w-4 h-4 mr-2" />{t("leads.engageAll", { count: unsentCount })}</>
              )}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-9 h-9 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {activeTab === "new" ? (
              <>
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">{t("leads.noNewLeads")}</p>
                <p className="text-sm">{t("leads.addLeadsManually")}</p>
              </>
            ) : (
              <>
                <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">{t("leads.noEngagedLeads")}</p>
                <p className="text-sm">{t("leads.sendOutreachToSee")}</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isExpanded={expandedLeads.has(lead.id)}
                toggleExpand={toggleExpand}
                copiedId={copiedId}
                copyOutreach={copyOutreach}
                sendOutreachMutation={sendOutreachMutation}
                deleteMutation={deleteMutation}
                updateLeadMutation={updateLeadMutation}
                scheduleMutation={scheduleMutation}
                cancelScheduleMutation={cancelScheduleMutation}
                callMutation={callMutation}
                onSmsClick={(lead) => { setSmsLead(lead); setSmsBody(""); }}
              />
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!smsLead} onOpenChange={(open) => !open && setSmsLead(null)}>
        <DialogContent data-testid="dialog-send-sms">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-chart-2" />
              {t("leads.sendSmsTo", { name: smsLead?.name })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">
              {t("leads.sendingTo")} <span className="font-medium text-foreground">{smsLead?.phone}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-body">{t("leads.message")}</Label>
              <Textarea
                id="sms-body"
                data-testid="input-sms-body"
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                rows={4}
                placeholder={t("leads.msgPlaceholder")}
                maxLength={1600}
              />
              <p className="text-xs text-muted-foreground text-right">{t("leads.charCount", { count: smsBody.length })} {smsBody.length > 160 ? t("leads.segmentInfo", { count: Math.ceil(smsBody.length / 160) }) : ""}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSmsLead(null)} data-testid="button-cancel-sms">
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => smsLead && smsMutation.mutate({ leadId: smsLead.id, body: smsBody })}
              disabled={smsMutation.isPending || !smsBody.trim()}
              data-testid="button-send-sms"
            >
              {smsMutation.isPending ? t("common.sending") : t("leads.sendSms")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
