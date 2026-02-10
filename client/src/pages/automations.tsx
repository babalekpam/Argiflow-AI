import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Workflow,
  Zap,
  ArrowRight,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Mail,
  Users,
  Calendar,
  Bot,
  BarChart3,
  RefreshCw,
  Target,
} from "lucide-react";
import type { AiAgent } from "@shared/schema";

function StatusDot({ status }: { status: string }) {
  if (status === "active") {
    return <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />;
  }
  if (status === "paused") {
    return <div className="w-2 h-2 rounded-full bg-amber-400" />;
  }
  return <div className="w-2 h-2 rounded-full bg-slate-500" />;
}

const workflowTemplates = [
  {
    title: "Lead Capture → CRM → Email Sequence",
    icon: Target,
    steps: ["New Lead", "CRM Entry", "Score Lead", "Email Drip"],
    status: "active",
    runs: 847,
    successRate: 94,
  },
  {
    title: "Appointment Booking → Reminder → Follow-up",
    icon: Calendar,
    steps: ["Booking", "Confirmation", "Reminder", "Follow-up"],
    status: "active",
    runs: 523,
    successRate: 97,
  },
  {
    title: "Inbound Lead → Qualification → Assignment",
    icon: Users,
    steps: ["Capture", "AI Qualify", "Score", "Assign"],
    status: "active",
    runs: 1250,
    successRate: 91,
  },
  {
    title: "Email Campaign → Track → Retarget",
    icon: Mail,
    steps: ["Send", "Track Opens", "Analyze", "Retarget"],
    status: "paused",
    runs: 312,
    successRate: 88,
  },
  {
    title: "Client Onboarding → Tasks → Check-in",
    icon: CheckCircle2,
    steps: ["Welcome", "Setup Tasks", "Progress", "Check-in"],
    status: "inactive",
    runs: 0,
    successRate: 0,
  },
  {
    title: "Review Collection → Response → Showcase",
    icon: BarChart3,
    steps: ["Request", "Collect", "Respond", "Publish"],
    status: "paused",
    runs: 156,
    successRate: 82,
  },
];

export default function AutomationsPage() {
  const { data: agents, isLoading } = useQuery<AiAgent[]>({
    queryKey: ["/api/ai-agents"],
  });

  const totalRuns = workflowTemplates.reduce((sum, w) => sum + w.runs, 0);
  const activeWorkflows = workflowTemplates.filter((w) => w.status === "active").length;
  const avgSuccess =
    workflowTemplates.filter((w) => w.runs > 0).length > 0
      ? (
          workflowTemplates.filter((w) => w.runs > 0).reduce((sum, w) => sum + w.successRate, 0) /
          workflowTemplates.filter((w) => w.runs > 0).length
        ).toFixed(1)
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
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <Workflow className="w-3 h-3 mr-1.5" />
          {activeWorkflows} Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5" data-testid="stat-auto-workflows">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Workflow className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{workflowTemplates.length}</p>
              <p className="text-sm text-muted-foreground">Total Workflows</p>
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

      <div className="space-y-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-6 w-64 mb-3" />
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-4 w-48" />
              </Card>
            ))
          : workflowTemplates.map((workflow, idx) => (
              <Card
                key={idx}
                className="p-5"
                data-testid={`card-workflow-${idx}`}
              >
                <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <workflow.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{workflow.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusDot status={workflow.status} />
                        <span className="text-xs text-muted-foreground capitalize">{workflow.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5" />
                      {workflow.runs.toLocaleString()} runs
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {workflow.successRate}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  {workflow.steps.map((step, si) => (
                    <div key={si} className="flex items-center gap-1 shrink-0">
                      <div
                        className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                          workflow.status === "active"
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary/50 text-muted-foreground"
                        }`}
                      >
                        {step}
                      </div>
                      {si < workflow.steps.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                {workflow.status === "active" && (
                  <div className="mt-3">
                    <Progress value={workflow.successRate} className="h-1" />
                  </div>
                )}
              </Card>
            ))}
      </div>
    </div>
  );
}
