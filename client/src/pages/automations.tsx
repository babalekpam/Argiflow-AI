import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import type { Automation } from "@shared/schema";

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

const workflowTemplates = [
  {
    templateKey: "lead_capture_email",
    title: "Lead Capture \u2192 CRM \u2192 Email Sequence",
    icon: "Target",
    steps: ["New Lead", "CRM Entry", "Score Lead", "Email Drip"],
    description: "Automatically capture leads, add to CRM, score them, and start email nurture sequences",
  },
  {
    templateKey: "appointment_reminder",
    title: "Appointment Booking \u2192 Reminder \u2192 Follow-up",
    icon: "Calendar",
    steps: ["Booking", "Confirmation", "Reminder", "Follow-up"],
    description: "Auto-confirm bookings, send reminders to cut no-shows, and follow up after meetings",
  },
  {
    templateKey: "inbound_qualification",
    title: "Inbound Lead \u2192 Qualification \u2192 Assignment",
    icon: "Users",
    steps: ["Capture", "AI Qualify", "Score", "Assign"],
    description: "AI qualifies inbound leads, scores them by intent, and routes to the right rep",
  },
  {
    templateKey: "email_campaign_retarget",
    title: "Email Campaign \u2192 Track \u2192 Retarget",
    icon: "Mail",
    steps: ["Send", "Track Opens", "Analyze", "Retarget"],
    description: "Send campaigns, track engagement, and automatically retarget non-openers",
  },
  {
    templateKey: "client_onboarding",
    title: "Client Onboarding \u2192 Tasks \u2192 Check-in",
    icon: "CheckCircle2",
    steps: ["Welcome", "Setup Tasks", "Progress", "Check-in"],
    description: "Auto-send welcome emails, create onboarding tasks, and schedule check-in calls",
  },
  {
    templateKey: "review_collection",
    title: "Review Collection \u2192 Response \u2192 Showcase",
    icon: "BarChart3",
    steps: ["Request", "Collect", "Respond", "Publish"],
    description: "Request reviews after positive interactions, auto-respond, and showcase them",
  },
];

export default function AutomationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      toast({ title: "Automation activated", description: "Workflow is now running" });
    },
    onError: () => {
      toast({ title: "Failed to activate", variant: "destructive" });
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
        title: data.status === "active" ? "Automation resumed" : "Automation paused",
        description: data.title,
      });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/automations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({ title: "Automation removed" });
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  const activeAutomations = automationsData || [];
  const activatedKeys = new Set(activeAutomations.map((a) => a.templateKey));
  const availableTemplates = workflowTemplates.filter((t) => !activatedKeys.has(t.templateKey));
  const activeCount = activeAutomations.filter((a) => a.status === "active").length;
  const totalRuns = activeAutomations.reduce((sum, a) => sum + (a.runs || 0), 0);
  const runningAutomations = activeAutomations.filter((a) => (a.runs || 0) > 0);
  const avgSuccess = runningAutomations.length > 0
    ? (runningAutomations.reduce((sum, a) => sum + (a.successRate || 0), 0) / runningAutomations.length).toFixed(1)
    : "0";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-automations-title">Automations</h1>
          <p className="text-muted-foreground text-sm">
            End-to-end workflows automating your business processes.
          </p>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20 no-default-hover-elevate no-default-active-elevate">
          <Workflow className="w-3 h-3 mr-1.5" />
          {activeCount} Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5" data-testid="stat-auto-workflows">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Workflow className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeAutomations.length}</p>
              <p className="text-sm text-muted-foreground">My Workflows</p>
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
              <p className="text-sm text-muted-foreground">Total Runs</p>
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
              <p className="text-sm text-muted-foreground">Avg Success Rate</p>
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
              <h2 className="text-lg font-semibold" data-testid="text-active-section">Your Automations</h2>
              {activeAutomations.map((automation) => {
                const steps: string[] = (() => {
                  try { return JSON.parse(automation.steps); } catch { return []; }
                })();
                const template = workflowTemplates.find((t) => t.templateKey === automation.templateKey);
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
                            {(automation.runs || 0).toLocaleString()} runs
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
                            Pause
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
                            Resume
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
                {activeAutomations.length > 0 ? "Add More Automations" : "Available Automations"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Activate any of these pre-built workflows to automate your business processes.
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
                        Activate
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
            <h3 className="font-semibold">Automation Arsenal</h3>
            <p className="text-xs text-muted-foreground">Run your entire agency in 10 hours/week</p>
          </div>
          <Badge className="ml-auto bg-chart-4/10 text-chart-4 border-chart-4/20 no-default-hover-elevate no-default-active-elevate">Included</Badge>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { title: "Client Onboarding Automation", desc: "Auto-send welcome emails, create CRM entries, and schedule kickoff calls" },
            { title: "Lead Nurture Sequences", desc: "7-day email/SMS drip that converts cold leads into booked calls" },
            { title: "Appointment Reminders", desc: "Multi-channel reminders that cut no-shows by 80%" },
            { title: "Monthly Report Generator", desc: "Auto-compile client metrics and send branded performance reports" },
            { title: "Review Collection Bot", desc: "Trigger review requests after positive interactions" },
            { title: "Invoice & Payment Automation", desc: "Auto-generate invoices and chase overdue payments" },
          ].map((item, i) => (
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
