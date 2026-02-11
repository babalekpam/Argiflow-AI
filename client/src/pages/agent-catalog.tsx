import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bot,
  Play,
  Settings2,
  Zap,
  Search,
  Globe,
  FileText,
  Tractor,
  Users,
  Landmark,
  Building2,
  RefreshCw,
  CheckCircle2,
  Clock,
  Activity,
  Loader2,
} from "lucide-react";

const AGENT_ICONS: Record<string, typeof Bot> = {
  "tax-lien": Landmark,
  "tax-deed": FileText,
  "wholesale-re": Building2,
  "govt-contracts-us": Landmark,
  "arbitrage": RefreshCw,
  "lead-gen": Search,
  "govt-tender-africa": Globe,
  "cross-border-trade": Globe,
  "agri-market": Tractor,
  "diaspora-services": Users,
};

const REGION_LABELS: Record<string, string> = {
  all: "All Regions",
  western: "Western (ArgiFlow)",
  africa: "Africa (TradeFlow)",
};

interface CatalogAgent {
  type: string;
  name: string;
  description: string;
  region: string;
  category: string;
  phases: string[];
  defaultSettings: Record<string, unknown>;
  settingsSchema: Record<string, unknown>;
  configured: boolean;
  enabled: boolean;
  configId: string | null;
  config: {
    id: string;
    agentSettings: string;
    runFrequency: string;
    isRunning: boolean;
    lastRun: string | null;
    totalLeadsFound: number;
    lifecycleState: string;
  } | null;
}

interface CatalogResponse {
  agents: CatalogAgent[];
  userRegion: string;
}

export default function AgentCatalogPage() {
  const { toast } = useToast();
  const [configDialog, setConfigDialog] = useState<CatalogAgent | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState("daily");
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");

  const { data, isLoading } = useQuery<CatalogResponse>({
    queryKey: ["/api/agent-catalog", regionFilter],
    queryFn: () => fetch(`/api/agent-catalog?region=${regionFilter}`, { credentials: "include" }).then(r => r.json()),
  });

  const agents = data?.agents || [];

  const enableMutation = useMutation({
    mutationFn: async ({ agentType, enabled }: { agentType: string; enabled: boolean; configId?: string | null }) => {
      const existing = agents.find(a => a.type === agentType);
      if (existing?.configId) {
        return apiRequest("PATCH", `/api/agent-configs/${existing.configId}`, { enabled });
      }
      return apiRequest("POST", "/api/agent-configs", { agentType, enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Agent updated" });
    },
  });

  const configureMutation = useMutation({
    mutationFn: async (data: { agentType: string; enabled: boolean; runFrequency: string }) => {
      return apiRequest("POST", "/api/agent-configs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      setConfigDialog(null);
      toast({ title: "Agent configured successfully" });
    },
  });

  const runMutation = useMutation({
    mutationFn: async (configId: string) => {
      return apiRequest("POST", `/api/agent-configs/${configId}/run`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Agent running...", description: "Results will appear in your notifications" });
    },
  });

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const enabledCount = agents.filter(a => a.enabled).length;
  const runningCount = agents.filter(a => a.config?.isRunning).length;
  const totalLeads = agents.reduce((sum, a) => sum + (a.config?.totalLeadsFound || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Agent Catalog</h1>
          <p className="text-muted-foreground mt-1">Configure and deploy specialized AI agents for your business</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="gap-1.5">
            <Bot className="w-3 h-3" />
            {enabledCount} Active
          </Badge>
          {runningCount > 0 && (
            <Badge className="gap-1.5 bg-primary/10 text-primary border-primary/20">
              <Activity className="w-3 h-3 animate-pulse" />
              {runningCount} Running
            </Badge>
          )}
          {totalLeads > 0 && (
            <Badge variant="outline" className="gap-1.5">
              <Zap className="w-3 h-3" />
              {totalLeads} Leads Found
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1.5" data-testid="region-tabs">
          {Object.entries(REGION_LABELS).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={regionFilter === key ? "default" : "outline"}
              onClick={() => setRegionFilter(key)}
              data-testid={`button-region-${key}`}
            >
              {key === "africa" && <Globe className="w-3.5 h-3.5 mr-1.5" />}
              {label}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-agents"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((agent) => {
          const Icon = AGENT_ICONS[agent.type] || Bot;
          const regionBadge = agent.region === "western" ? "Western" : agent.region === "africa" ? "Africa" : "Global";
          return (
            <Card key={agent.type} className="flex flex-col" data-testid={`card-agent-${agent.type}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{agent.name}</CardTitle>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        {agent.category}
                      </Badge>
                      {regionFilter === "all" && (
                        <Badge variant="secondary" className="text-[10px]">
                          {regionBadge}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={agent.enabled}
                  onCheckedChange={(checked) =>
                    enableMutation.mutate({ agentType: agent.type, enabled: checked, configId: agent.configId })
                  }
                  data-testid={`switch-agent-${agent.type}`}
                />
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{agent.description}</p>

                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {(agent.phases || []).slice(0, 3).map((cap) => (
                    <Badge key={cap} variant="secondary" className="text-[10px]">
                      {cap}
                    </Badge>
                  ))}
                  {(agent.phases || []).length > 3 && (
                    <Badge variant="secondary" className="text-[10px]">
                      +{(agent.phases || []).length - 3}
                    </Badge>
                  )}
                </div>

                {agent.config && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
                    {agent.config.isRunning ? (
                      <span className="flex items-center gap-1 text-primary">
                        <Loader2 className="w-3 h-3 animate-spin" /> Running
                      </span>
                    ) : agent.config.lastRun ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Last: {new Date(agent.config.lastRun).toLocaleDateString()}
                      </span>
                    ) : null}
                    {agent.config.totalLeadsFound > 0 && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {agent.config.totalLeadsFound} leads
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedFrequency(agent.config?.runFrequency || "daily");
                      setConfigDialog(agent);
                    }}
                    data-testid={`button-configure-${agent.type}`}
                  >
                    <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                    Configure
                  </Button>
                  {agent.configId && agent.enabled && (
                    <Button
                      size="sm"
                      onClick={() => runMutation.mutate(agent.configId!)}
                      disabled={agent.config?.isRunning || runMutation.isPending}
                      data-testid={`button-run-${agent.type}`}
                    >
                      {agent.config?.isRunning ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Run Now
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-medium">No agents found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or region filter</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!configDialog} onOpenChange={() => setConfigDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {configDialog?.name}</DialogTitle>
            <DialogDescription>{configDialog?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Run Frequency</Label>
              <Select value={selectedFrequency} onValueChange={setSelectedFrequency}>
                <SelectTrigger data-testid="select-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Every Hour</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Workflow Phases</Label>
              <div className="flex flex-wrap gap-1.5">
                {(configDialog?.phases || []).map((phase) => (
                  <Badge key={phase} variant="secondary" className="text-xs">{phase}</Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog(null)} data-testid="button-cancel-config">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!configDialog) return;
                configureMutation.mutate({
                  agentType: configDialog.type,
                  enabled: true,
                  runFrequency: selectedFrequency,
                });
              }}
              disabled={configureMutation.isPending}
              data-testid="button-save-config"
            >
              {configureMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enable Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
