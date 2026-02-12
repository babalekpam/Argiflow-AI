import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Workflow,
  Zap,
  ArrowRight,
  Activity,
  CheckCircle2,
  Mail,
  Users,
  Calendar,
  Bot,
  BarChart3,
  RefreshCw,
  Target,
  Play,
  Pause,
  Trash2,
  Plus,
  Power,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Automation } from "@shared/schema";
import automationRobotImg from "@assets/robot-automation.png";

function StatusDot({ status }: { status: string }) {
  if (status === "active") {
    return <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />;
  }
  if (status === "paused") {
    return <div className="w-2 h-2 rounded-full bg-amber-400" />;
  }
  return <div className="w-2 h-2 rounded-full bg-slate-500" />;
}

const iconMap: Record<string, any> = {
  Target, Calendar, Users, Mail, CheckCircle2, BarChart3, Bot,
};

export default function AutomationsPage() {
  const { t } = useTranslation();
  usePageTitle(t("automations.title"));
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const workflowTemplates = [
    {
      templateKey: "lead_capture_email",
      title: t("automations.templateLeadCaptureTitle"),
      icon: "Target",
      steps: [t("automations.templateLeadCaptureStep1"), t("automations.templateLeadCaptureStep2"), t("automations.templateLeadCaptureStep3"), t("automations.templateLeadCaptureStep4")],
      description: t("automations.templateLeadCaptureDesc"),
    },
    {
      templateKey: "appointment_reminder",
      title: t("automations.templateAppointmentTitle"),
      icon: "Calendar",
      steps: [t("automations.templateAppointmentStep1"), t("automations.templateAppointmentStep2"), t("automations.templateAppointmentStep3"), t("automations.templateAppointmentStep4")],
      description: t("automations.templateAppointmentDesc"),
    },
    {
      templateKey: "inbound_qualification",
      title: t("automations.templateInboundTitle"),
      icon: "Users",
      steps: [t("automations.templateInboundStep1"), t("automations.templateInboundStep2"), t("automations.templateInboundStep3"), t("automations.templateInboundStep4")],
      description: t("automations.templateInboundDesc"),
    },
    {
      templateKey: "email_campaign_retarget",
      title: t("automations.templateEmailCampaignTitle"),
      icon: "Mail",
      steps: [t("automations.templateEmailCampaignStep1"), t("automations.templateEmailCampaignStep2"), t("automations.templateEmailCampaignStep3"), t("automations.templateEmailCampaignStep4")],
      description: t("automations.templateEmailCampaignDesc"),
    },
    {
      templateKey: "client_onboarding",
      title: t("automations.templateClientOnboardingTitle"),
      icon: "CheckCircle2",
      steps: [t("automations.templateClientOnboardingStep1"), t("automations.templateClientOnboardingStep2"), t("automations.templateClientOnboardingStep3"), t("automations.templateClientOnboardingStep4")],
      description: t("automations.templateClientOnboardingDesc"),
    },
    {
      templateKey: "review_collection",
      title: t("automations.templateReviewTitle"),
      icon: "BarChart3",
      steps: [t("automations.templateReviewStep1"), t("automations.templateReviewStep2"), t("automations.templateReviewStep3"), t("automations.templateReviewStep4")],
      description: t("automations.templateReviewDesc"),
    },
  ];

  const { data: automationsData, isLoading } = useQuery<Automation[]>({
    queryKey: ["/api/automations"],
  });

  const activateMutation = useMutation({
    mutationFn: async (template: typeof workflowTemplates[0]) => {
      const res = await apiRequest("POST", "/api/automations", {
        templateKey: template.templateKey,
        title: template.title,
        description: template.description,
        steps: template.steps,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({ title: t("automations.automationActivated"), description: t("automations.workflowRunning") });
    },
    onError: () => {
      toast({ title: t("automations.failedToActivate"), variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/automations/${id}`, { status });
      return res.json();
    },
    onSuccess: (data: Automation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({
        title: data.status === "active" ? t("automations.automationResumed") : t("automations.automationPaused"),
        description: data.title,
      });
    },
    onError: () => {
      toast({ title: t("automations.failedToUpdate"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/automations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({ title: t("automations.automationRemoved") });
    },
    onError: () => {
      toast({ title: t("automations.failedToDelete"), variant: "destructive" });
    },
  });

  const activeAutomations = automationsData || [];
  const activatedKeys = new Set(activeAutomations.map((a) => a.templateKey));
  const availableTemplates = workflowTemplates.filter((tmpl) => !activatedKeys.has(tmpl.templateKey));
  const activeCount = activeAutomations.filter((a) => a.status === "active").length;
  const totalRuns = activeAutomations.reduce((sum, a) => sum + (a.runs || 0), 0);
  const runningAutomations = activeAutomations.filter((a) => (a.runs || 0) > 0);
  const avgSuccess = runningAutomations.length > 0
    ? (runningAutomations.reduce((sum, a) => sum + (a.successRate || 0), 0) / runningAutomations.length).toFixed(1)
    : "0";

  const arsenalItems = [
    { title: t("automations.arsenalClientOnboarding"), desc: t("automations.arsenalClientOnboardingDesc") },
    { title: t("automations.arsenalLeadNurture"), desc: t("automations.arsenalLeadNurtureDesc") },
    { title: t("automations.arsenalAppointmentReminders"), desc: t("automations.arsenalAppointmentRemindersDesc") },
    { title: t("automations.arsenalMonthlyReport"), desc: t("automations.arsenalMonthlyReportDesc") },
    { title: t("automations.arsenalReviewBot"), desc: t("automations.arsenalReviewBotDesc") },
    { title: t("automations.arsenalInvoice"), desc: t("automations.arsenalInvoiceDesc") },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-automations-title">{t("automations.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("automations.subtitle")}
          </p>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20 no-default-hover-elevate no-default-active-elevate">
          <Workflow className="w-3 h-3 mr-1.5" />
          {t("automations.activeCount", { count: activeCount })}
        </Badge>
      </div>

      <Card className="relative overflow-hidden">
        <img src={automationRobotImg} alt={t("automations.title")} className="w-full h-40 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
        <div className="absolute inset-0 flex items-center p-6">
          <div>
            <p className="text-lg font-bold">{t("automations.workflowAutomation")}</p>
            <p className="text-sm text-muted-foreground max-w-sm">{t("automations.workflowAutomationDesc")}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5" data-testid="stat-auto-workflows">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Workflow className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeAutomations.length}</p>
              <p className="text-sm text-muted-foreground">{t("automations.myWorkflows")}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5" data-testid="stat-auto-runs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRuns.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{t("automations.totalRuns")}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5" data-testid="stat-auto-success">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgSuccess}%</p>
              <p className="text-sm text-muted-foreground">{t("automations.avgSuccessRate")}</p>
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-6 w-64 mb-3" />
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-4 w-48" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          {activeAutomations.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold" data-testid="text-active-section">{t("automations.yourAutomations")}</h2>
              {activeAutomations.map((automation) => {
                const steps: string[] = (() => {
                  try { return JSON.parse(automation.steps); } catch { return []; }
                })();
                const template = workflowTemplates.find((tmpl) => tmpl.templateKey === automation.templateKey);
                const IconComponent = template ? iconMap[template.icon] || Workflow : Workflow;

                return (
                  <Card key={automation.id} className="p-5" data-testid={`card-automation-${automation.id}`}>
                    <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{automation.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StatusDot status={automation.status} />
                            <span className="text-xs text-muted-foreground capitalize">{automation.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mr-2">
                          <div className="flex items-center gap-1">
                            <RefreshCw className="w-3.5 h-3.5" />
                            {t("automations.runs", { count: automation.runs || 0 })}
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {(automation.successRate || 0)}%
                          </div>
                        </div>
                        {automation.status === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleMutation.mutate({ id: automation.id, status: "paused" })}
                            disabled={toggleMutation.isPending}
                            data-testid={`button-pause-${automation.id}`}
                          >
                            <Pause className="w-3.5 h-3.5 mr-1.5" />
                            {t("automations.pause")}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleMutation.mutate({ id: automation.id, status: "active" })}
                            disabled={toggleMutation.isPending}
                            data-testid={`button-resume-${automation.id}`}
                          >
                            <Play className="w-3.5 h-3.5 mr-1.5" />
                            {t("automations.resume")}
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(automation.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${automation.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      {steps.map((step: string, si: number) => (
                        <div key={si} className="flex items-center gap-1 shrink-0">
                          <div
                            className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                              automation.status === "active"
                                ? "bg-primary/10 text-primary"
                                : "bg-secondary/50 text-muted-foreground"
                            }`}
                          >
                            {step}
                          </div>
                          {si < steps.length - 1 && (
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>

                    {automation.status === "active" && (
                      <div className="mt-3">
                        <Progress value={automation.successRate || 0} className="h-1" />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {availableTemplates.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold" data-testid="text-templates-section">
                {activeAutomations.length > 0 ? t("automations.addMoreAutomations") : t("automations.availableAutomations")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("automations.availableDesc")}
              </p>
              {availableTemplates.map((template, idx) => {
                const IconComponent = iconMap[template.icon] || Workflow;
                return (
                  <Card key={template.templateKey} className="p-5" data-testid={`card-template-${idx}`}>
                    <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-secondary/50 flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{template.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => activateMutation.mutate(template)}
                        disabled={activateMutation.isPending}
                        data-testid={`button-activate-${template.templateKey}`}
                      >
                        <Power className="w-3.5 h-3.5 mr-1.5" />
                        {t("automations.activate")}
                      </Button>
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      {template.steps.map((step, si) => (
                        <div key={si} className="flex items-center gap-1 shrink-0">
                          <div className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary/50 text-muted-foreground">
                            {step}
                          </div>
                          {si < template.steps.length - 1 && (
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <Card className="p-6" data-testid="card-automation-arsenal">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-md bg-chart-4/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-chart-4" />
          </div>
          <div>
            <h3 className="font-semibold">{t("automations.automationArsenal")}</h3>
            <p className="text-xs text-muted-foreground">{t("automations.arsenalDesc")}</p>
          </div>
          <Badge className="ml-auto bg-chart-4/10 text-chart-4 border-chart-4/20 no-default-hover-elevate no-default-active-elevate">{t("automations.included")}</Badge>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {arsenalItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-md bg-secondary/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-chart-3 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium">{item.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
