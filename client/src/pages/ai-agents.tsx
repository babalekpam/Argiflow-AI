import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import type { AiAgent } from "@shared/schema";

const agentIcons: Record<string, any> = {
  "Lead Qualifier": Target,
  "Email Nurturing": Mail,
  "Appointment Setter": Calendar,
  "Chat Responder": MessageSquare,
  "Ad Optimizer": BarChart3,
  "Follow-Up Agent": Bot,
};

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

export default function AiAgentsPage() {
  const { data: agents, isLoading } = useQuery<AiAgent[]>({
    queryKey: ["/api/ai-agents"],
  });

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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
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

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                    <Button variant="ghost" size="sm" className="flex-1">
                      <Settings className="w-3.5 h-3.5 mr-1.5" />
                      Configure
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Power className="w-3.5 h-3.5" />
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
            Set up your first AI agent to start automating your business.
          </p>
        </Card>
      )}
    </div>
  );
}
