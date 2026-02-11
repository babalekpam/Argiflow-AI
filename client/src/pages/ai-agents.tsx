import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  MessageSquare,
  Mail,
  Calendar,
  Target,
  TrendingUp,
  Settings,
  Power,
  Activity,
  Zap,
  BarChart3,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Phone,
  Shield,
  DollarSign,
  ArrowDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AiAgent } from "@shared/schema";

const agentIcons: Record<string, any> = {
  "Lead Qualifier": Target,
  "Email Nurturing": Mail,
  "Appointment Setter": Calendar,
  "Chat Responder": MessageSquare,
  "Ad Optimizer": BarChart3,
  "Follow-Up Agent": Bot,
};

const workflowIconMap: Record<string, any> = {
  MessageSquare,
  UserCheck,
  Calendar,
  Mail,
  Phone,
  Target,
  BarChart: BarChart3,
  Clock,
  Shield,
  Zap,
  FileText,
  DollarSign,
  Bot,
};

interface WorkflowStep {
  title: string;
  description: string;
  icon: string;
}

function AgentStatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
        Active
      </Badge>
    );
  }
  if (status === "paused") {
    return (
      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
        Paused
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">
      Inactive
    </Badge>
  );
}

function WorkflowDiagram({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="space-y-1" data-testid="workflow-diagram">
      {steps.map((step, i) => {
        const StepIcon = workflowIconMap[step.icon] || Zap;
        return (
          <div key={i}>
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <StepIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Step {i + 1}
                  </Badge>
                  <p className="text-sm font-medium">{step.title}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ArrowDown className="w-3.5 h-3.5 text-muted-foreground/40" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScriptViewer({ script }: { script: string }) {
  const sections = script.split(/^## /m).filter(Boolean);
  return (
    <div className="space-y-3 text-sm" data-testid="script-viewer">
      {sections.map((section, i) => {
        const lines = section.split("\n");
        const title = lines[0]?.trim();
        const body = lines.slice(1).join("\n").trim();
        return (
          <div key={i}>
            {title && (
              <h4 className="font-semibold text-foreground mb-1">{title}</h4>
            )}
            <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {body}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AiAgentsPage() {
  usePageTitle("AI Agents");
  const { toast } = useToast();
  const [configAgent, setConfigAgent] = useState<AiAgent | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"workflow" | "script">("workflow");

  const { data: agents, isLoading } = useQuery<AiAgent[]>({
    queryKey: ["/api/ai-agents"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, string> }) => {
      const res = await apiRequest("PATCH", `/api/ai-agents/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
    },
  });

  const openConfig = (agent: AiAgent) => {
    setConfigAgent(agent);
    setEditName(agent.name);
    setEditDescription(agent.description || "");
    setEditType(agent.type);
    setEditStatus(agent.status);
  };

  const saveConfig = () => {
    if (!configAgent) return;
    updateMutation.mutate(
      {
        id: configAgent.id,
        data: {
          name: editName,
          description: editDescription,
          type: editType,
          status: editStatus,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Agent updated", description: `${editName} configuration saved.` });
          setConfigAgent(null);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update agent.", variant: "destructive" });
        },
      }
    );
  };

  const togglePower = (agent: AiAgent) => {
    const newStatus = agent.status === "active" ? "paused" : "active";
    updateMutation.mutate(
      { id: agent.id, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({
            title: newStatus === "active" ? "Agent activated" : "Agent paused",
            description: `${agent.name} is now ${newStatus}.`,
          });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to toggle agent.", variant: "destructive" });
        },
      }
    );
  };

  const toggleExpand = (agentId: string) => {
    setExpandedAgent((prev) => (prev === agentId ? null : agentId));
    setViewTab("workflow");
  };

  const activeCount = agents?.filter((a) => a.status === "active").length || 0;
  const totalTasks = agents?.reduce((sum, a) => sum + (a.tasksCompleted || 0), 0) || 0;
  const avgSuccess =
    agents && agents.length > 0
      ? (agents.reduce((sum, a) => sum + (a.successRate || 0), 0) / agents.length).toFixed(1)
      : "0";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-agents-title">AI Agents</h1>
          <p className="text-muted-foreground text-sm">
            Your AI team working 24/7 to grow your business.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
            {activeCount} Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5" data-testid="stat-active-agents">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Active Agents</p>
            </div>
          </div>
        </Card>
        <Card className="p-5" data-testid="stat-total-tasks">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalTasks.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Tasks Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-5" data-testid="stat-success-rate">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-md bg-chart-4/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgSuccess}%</p>
              <p className="text-sm text-muted-foreground">Avg Success Rate</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="w-10 h-10 rounded-md" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-3/4 mb-4" />
                <Skeleton className="h-2 w-full rounded-full" />
              </Card>
            ))
          : (agents || []).map((agent) => {
              const Icon = agentIcons[agent.name] || Bot;
              const isExpanded = expandedAgent === agent.id;
              const hasScript = !!agent.script;
              let workflowSteps: WorkflowStep[] = [];
              try {
                if (agent.workflowSteps) {
                  workflowSteps = JSON.parse(agent.workflowSteps);
                }
              } catch {}
              const hasWorkflow = workflowSteps.length > 0;

              return (
                <Card
                  key={agent.id}
                  className="p-5"
                  data-testid={`agent-card-${agent.id}`}
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.type}</p>
                      </div>
                    </div>
                    <AgentStatusBadge status={agent.status} />
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {agent.description}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">Success Rate</span>
                      <span className="font-medium">{agent.successRate}%</span>
                    </div>
                    <Progress value={agent.successRate || 0} className="h-1.5" />
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {agent.tasksCompleted} tasks
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        24/7
                      </div>
                    </div>
                  </div>

                  {(hasScript || hasWorkflow) && (
                    <>
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between"
                          data-testid={`button-expand-${agent.id}`}
                          onClick={() => toggleExpand(agent.id)}
                        >
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            AI Script & Workflow
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 space-y-3" data-testid={`expanded-${agent.id}`}>
                          <div className="flex gap-1">
                            {hasWorkflow && (
                              <Button
                                variant={viewTab === "workflow" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewTab("workflow")}
                                data-testid={`tab-workflow-${agent.id}`}
                              >
                                Workflow
                              </Button>
                            )}
                            {hasScript && (
                              <Button
                                variant={viewTab === "script" ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setViewTab("script")}
                                data-testid={`tab-script-${agent.id}`}
                              >
                                Bot Script
                              </Button>
                            )}
                          </div>

                          {viewTab === "workflow" && hasWorkflow && (
                            <WorkflowDiagram steps={workflowSteps} />
                          )}

                          {viewTab === "script" && hasScript && (
                            <div className="max-h-80 overflow-y-auto rounded-md bg-muted/30 p-4">
                              <ScriptViewer script={agent.script!} />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      data-testid={`button-configure-${agent.id}`}
                      onClick={() => openConfig(agent)}
                    >
                      <Settings className="w-3.5 h-3.5 mr-1.5" />
                      Configure
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`button-power-${agent.id}`}
                      onClick={() => togglePower(agent)}
                      disabled={updateMutation.isPending}
                    >
                      <Power className={`w-3.5 h-3.5 ${agent.status === "active" ? "text-emerald-400" : "text-muted-foreground"}`} />
                    </Button>
                  </div>
                </Card>
              );
            })}
      </div>

      {!isLoading && (!agents || agents.length === 0) && (
        <Card className="p-12 text-center">
          <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">No AI Agents Yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Install bot templates from Resources to get started with AI-powered scripts.
          </p>
        </Card>
      )}

      <Dialog open={!!configAgent} onOpenChange={(open) => !open && setConfigAgent(null)}>
        <DialogContent data-testid="dialog-configure-agent">
          <DialogHeader>
            <DialogTitle>Configure Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                data-testid="input-agent-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-type">Category</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger data-testid="select-agent-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lead Generation">Lead Generation</SelectItem>
                  <SelectItem value="Nurturing">Nurturing</SelectItem>
                  <SelectItem value="Scheduling">Scheduling</SelectItem>
                  <SelectItem value="Communication">Communication</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Retention">Retention</SelectItem>
                  <SelectItem value="Chat Responder">Chat Responder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-desc">Description</Label>
              <Textarea
                id="agent-desc"
                data-testid="input-agent-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="agent-active">Active</Label>
              <Switch
                id="agent-active"
                data-testid="switch-agent-status"
                checked={editStatus === "active"}
                onCheckedChange={(checked) => setEditStatus(checked ? "active" : "paused")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigAgent(null)} data-testid="button-cancel-config">
              Cancel
            </Button>
            <Button onClick={saveConfig} disabled={updateMutation.isPending} data-testid="button-save-config">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
