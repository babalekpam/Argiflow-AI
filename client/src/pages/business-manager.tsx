import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Brain, Play, Pause, Zap, TrendingUp, Mail, Users, Calendar,
  BarChart3, Clock, CheckCircle, AlertCircle, Loader2, FileText,
  Settings, Target, Sparkles, Activity, ChevronRight
} from "lucide-react";

const CAPABILITY_OPTIONS = [
  { id: "lead_generation", label: "Lead Generation", icon: Users, desc: "Find and qualify new prospects" },
  { id: "email_outreach", label: "Email Outreach", icon: Mail, desc: "Send cold emails and campaigns" },
  { id: "follow_ups", label: "Follow-Ups", icon: ChevronRight, desc: "Automated follow-up sequences" },
  { id: "pipeline_management", label: "Pipeline Management", icon: TrendingUp, desc: "Manage deals and stages" },
  { id: "marketing", label: "Marketing", icon: Sparkles, desc: "Content and campaign creation" },
  { id: "analytics_review", label: "Analytics Review", icon: BarChart3, desc: "Performance analysis and insights" },
  { id: "inbox_management", label: "Inbox Management", icon: Mail, desc: "Monitor and respond to emails" },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    thinking: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    running: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
    paused: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };
  const icons: Record<string, any> = {
    idle: CheckCircle,
    thinking: Brain,
    running: Activity,
    error: AlertCircle,
    paused: Pause,
  };
  const Icon = icons[status] || Activity;
  return (
    <Badge className={colors[status] || colors.idle} data-testid={`status-badge-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    high: "bg-red-500/10 text-red-400 border-red-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  return <Badge className={colors[priority] || colors.medium}>{priority}</Badge>;
}

export default function BusinessManagerPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["/api/business-manager/config"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/business-manager/stats"],
    refetchInterval: 10000,
  });

  const { data: decisions } = useQuery({
    queryKey: ["/api/business-manager/decisions"],
  });

  const { data: reports } = useQuery({
    queryKey: ["/api/business-manager/reports"],
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/business-manager/config", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-manager/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/business-manager/stats"] });
      setEditMode(false);
      toast({ title: "Configuration saved" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: () => apiRequest("/api/business-manager/toggle", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-manager/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/business-manager/stats"] });
      toast({ title: config?.enabled ? "Manager paused" : "Manager activated" });
    },
  });

  const runNowMutation = useMutation({
    mutationFn: () => apiRequest("/api/business-manager/run-now", { method: "POST" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-manager/decisions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/business-manager/stats"] });
      toast({ title: `Cycle complete: ${data.decisions} decisions, ${data.actions} actions` });
    },
    onError: (err: any) => {
      toast({ title: "Cycle failed", description: err.message, variant: "destructive" });
    },
  });

  const reportMutation = useMutation({
    mutationFn: () => apiRequest("/api/business-manager/report", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-manager/reports"] });
      toast({ title: "Daily report generated" });
    },
  });

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    );
  }

  const isConfigured = !!config;
  const isEnabled = config?.enabled;

  return (
    <div className="space-y-6" data-testid="business-manager-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-sky-500/20 border border-violet-500/30">
            <Bot className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Business Manager</h1>
            <p className="text-sm text-muted-foreground">Your autonomous AI agent that runs the business like a tenant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isConfigured && stats && <StatusBadge status={stats.status || "idle"} />}
          {isConfigured && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runNowMutation.mutate()}
                disabled={runNowMutation.isPending || !isEnabled}
                data-testid="button-run-now"
              >
                {runNowMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                Run Now
              </Button>
              <Button
                variant={isEnabled ? "destructive" : "default"}
                size="sm"
                onClick={() => toggleMutation.mutate()}
                disabled={toggleMutation.isPending}
                data-testid="button-toggle-manager"
              >
                {isEnabled ? <Pause className="w-4 h-4 mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
                {isEnabled ? "Pause" : "Activate"}
              </Button>
            </>
          )}
        </div>
      </div>

      {stats?.currentThought && isEnabled && (
        <Card className="border-violet-500/20 bg-violet-500/5">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Brain className="w-5 h-5 text-violet-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-violet-300 font-medium">Current Thought</p>
              <p className="text-sm text-foreground" data-testid="text-current-thought">{stats.currentThought}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isConfigured && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Decisions Today", value: stats.todayDecisions || 0, icon: Brain, color: "text-violet-400" },
            { label: "Actions Today", value: stats.todayActions || 0, icon: Zap, color: "text-sky-400" },
            { label: "Total Decisions", value: stats.totalDecisions || 0, icon: Target, color: "text-emerald-400" },
            { label: "Total Actions", value: stats.totalActions || 0, icon: Activity, color: "text-orange-400" },
            { label: "Credits Used", value: stats.creditsUsedToday || 0, icon: BarChart3, color: "text-yellow-400" },
            { label: "Last Run", value: stats.lastRunAt ? new Date(stats.lastRunAt).toLocaleTimeString() : "Never", icon: Clock, color: "text-gray-400" },
          ].map((stat, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-xl font-bold mt-1" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="decisions" data-testid="tab-decisions">Decisions</TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">Reports</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {!isConfigured ? (
            <SetupWizard onSave={(data: any) => saveMutation.mutate(data)} isPending={saveMutation.isPending} />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="w-4 h-4 text-violet-400" />
                    Agent Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{config.agentName || "AI Business Manager"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Personality</span>
                    <Badge variant="outline">{config.personality || "professional"}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Autonomy</span>
                    <Badge variant="outline">{config.autonomyLevel || "moderate"}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge status={config.status || "idle"} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-sky-400" />
                    Active Capabilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(config.activeCapabilities || []).map((cap: string) => {
                      const opt = CAPABILITY_OPTIONS.find(c => c.id === cap);
                      return (
                        <Badge key={cap} variant="outline" className="text-xs">
                          {opt?.label || cap}
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="w-4 h-4 text-violet-400" />
                    Recent Decisions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(decisions as any[])?.length > 0 ? (
                    <div className="space-y-3">
                      {(decisions as any[]).slice(0, 5).map((d: any) => (
                        <div key={d.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{d.category}</Badge>
                              <PriorityBadge priority={d.priority} />
                              <span className="text-xs text-muted-foreground">
                                {new Date(d.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm font-medium">{d.decision}</p>
                            {d.reasoning && <p className="text-xs text-muted-foreground mt-1">{d.reasoning}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">No decisions yet. Activate the manager or click "Run Now" to start.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Decision Log</CardTitle>
            </CardHeader>
            <CardContent>
              {(decisions as any[])?.length > 0 ? (
                <div className="space-y-3">
                  {(decisions as any[]).map((d: any) => (
                    <div key={d.id} className="p-4 rounded-lg bg-muted/30 border border-border/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{d.category}</Badge>
                        <PriorityBadge priority={d.priority} />
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(d.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1">{d.decision}</p>
                      {d.reasoning && <p className="text-xs text-muted-foreground mb-2">{d.reasoning}</p>}
                      {d.actionsTaken && (d.actionsTaken as any[]).length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Actions:</p>
                          {(d.actionsTaken as any[]).map((a: any, i: number) => (
                            <div key={i} className="text-xs p-2 rounded bg-background/50 border border-border/20">
                              <span className="font-medium text-sky-400">{a.type}</span>: {a.detail}
                              {a.result && <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{a.result.slice(0, 300)}{a.result.length > 300 ? "..." : ""}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No decisions recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => reportMutation.mutate()}
              disabled={reportMutation.isPending || !isConfigured}
              data-testid="button-generate-report"
            >
              {reportMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
              Generate Report Now
            </Button>
          </div>
          {(reports as any[])?.length > 0 ? (
            <div className="space-y-4">
              {(reports as any[]).map((r: any) => (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Report — {r.reportDate}</CardTitle>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{r.decisionsCount} decisions</span>
                        <span>{r.actionsCount} actions</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{r.summary}</p>
                    {r.highlights && (r.highlights as string[]).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-emerald-400 mb-1">Highlights</p>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                          {(r.highlights as string[]).map((h: string, i: number) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                              {h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {r.recommendations && (r.recommendations as string[]).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-sky-400 mb-1">Recommendations</p>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                          {(r.recommendations as string[]).map((rec: string, i: number) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <Target className="w-3 h-3 text-sky-400 mt-0.5 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {r.pipelineHealth && (
                      <div className="flex gap-4 text-xs pt-2 border-t border-border/30">
                        <span>Total: <strong>{r.pipelineHealth.total}</strong></span>
                        <span className="text-red-400">Hot: {r.pipelineHealth.hot}</span>
                        <span className="text-yellow-400">Warm: {r.pipelineHealth.warm}</span>
                        <span className="text-blue-400">Cold: {r.pipelineHealth.cold}</span>
                        <span className="text-emerald-400">Converted: {r.pipelineHealth.converted}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No reports yet. Click "Generate Report Now" to create one.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <SettingsPanel config={config} onSave={(data: any) => saveMutation.mutate(data)} isPending={saveMutation.isPending} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SetupWizard({ onSave, isPending }: { onSave: (data: any) => void; isPending: boolean }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    agentName: "AI Business Manager",
    businessContext: "",
    goals: ["Generate qualified leads", "Close more deals", "Grow revenue"],
    personality: "professional",
    autonomyLevel: "moderate",
    activeCapabilities: ["lead_generation", "email_outreach", "follow_ups", "pipeline_management", "marketing", "analytics_review", "inbox_management"],
  });

  const steps = [
    {
      title: "Business Context",
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Agent Name</label>
            <Input
              value={data.agentName}
              onChange={(e) => setData(d => ({ ...d, agentName: e.target.value }))}
              placeholder="e.g. TrackBot, BizManager"
              data-testid="input-agent-name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Describe Your Business</label>
            <Textarea
              value={data.businessContext}
              onChange={(e) => setData(d => ({ ...d, businessContext: e.target.value }))}
              placeholder="e.g. We are a medical billing company serving dental and mental health practices in the US. Our target customers are practice owners who need help with billing, coding, and revenue cycle management."
              rows={4}
              data-testid="input-business-context"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Goals & Personality",
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Business Goals (one per line)</label>
            <Textarea
              value={data.goals.join("\n")}
              onChange={(e) => setData(d => ({ ...d, goals: e.target.value.split("\n").filter(g => g.trim()) }))}
              rows={4}
              placeholder="Generate qualified leads&#10;Close more deals&#10;Grow revenue"
              data-testid="input-goals"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Personality</label>
              <Select value={data.personality} onValueChange={(v) => setData(d => ({ ...d, personality: v }))}>
                <SelectTrigger data-testid="select-personality"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                  <SelectItem value="consultative">Consultative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Autonomy Level</label>
              <Select value={data.autonomyLevel} onValueChange={(v) => setData(d => ({ ...d, autonomyLevel: v }))}>
                <SelectTrigger data-testid="select-autonomy"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative (Safe actions only)</SelectItem>
                  <SelectItem value="moderate">Moderate (Balanced)</SelectItem>
                  <SelectItem value="aggressive">Aggressive (Maximize growth)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Capabilities",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Select what the AI Manager is allowed to do:</p>
          {CAPABILITY_OPTIONS.map((cap) => (
            <div key={cap.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-sky-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <cap.icon className="w-4 h-4 text-sky-400" />
                <div>
                  <p className="text-sm font-medium">{cap.label}</p>
                  <p className="text-xs text-muted-foreground">{cap.desc}</p>
                </div>
              </div>
              <Switch
                checked={data.activeCapabilities.includes(cap.id)}
                onCheckedChange={(checked) => {
                  setData(d => ({
                    ...d,
                    activeCapabilities: checked
                      ? [...d.activeCapabilities, cap.id]
                      : d.activeCapabilities.filter(c => c !== cap.id),
                  }));
                }}
                data-testid={`switch-capability-${cap.id}`}
              />
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-sky-500/20">
            <Bot className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Set Up Your AI Business Manager</CardTitle>
            <p className="text-sm text-muted-foreground">Step {step + 1} of {steps.length}: {steps[step].title}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-violet-500" : "bg-muted"}`} />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {steps[step].content}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0} data-testid="button-wizard-back">
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} data-testid="button-wizard-next">
              Next
            </Button>
          ) : (
            <Button onClick={() => onSave(data)} disabled={isPending} data-testid="button-wizard-create">
              {isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              Create AI Manager
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsPanel({ config, onSave, isPending }: { config: any; onSave: (data: any) => void; isPending: boolean }) {
  const [data, setData] = useState({
    agentName: config?.agentName || "AI Business Manager",
    businessContext: config?.businessContext || "",
    goals: config?.goals || [],
    personality: config?.personality || "professional",
    autonomyLevel: config?.autonomyLevel || "moderate",
    activeCapabilities: config?.activeCapabilities || [],
    dailyBudgetCredits: config?.dailyBudgetCredits || 500,
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="w-4 h-4" /> Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Agent Name</label>
            <Input value={data.agentName} onChange={(e) => setData(d => ({ ...d, agentName: e.target.value }))} data-testid="input-settings-agent-name" />
          </div>
          <div>
            <label className="text-sm font-medium">Business Context</label>
            <Textarea value={data.businessContext} onChange={(e) => setData(d => ({ ...d, businessContext: e.target.value }))} rows={3} data-testid="input-settings-context" />
          </div>
          <div>
            <label className="text-sm font-medium">Goals (one per line)</label>
            <Textarea
              value={(data.goals || []).join("\n")}
              onChange={(e) => setData(d => ({ ...d, goals: e.target.value.split("\n").filter((g: string) => g.trim()) }))}
              rows={3}
              data-testid="input-settings-goals"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Personality</label>
              <Select value={data.personality} onValueChange={(v) => setData(d => ({ ...d, personality: v }))}>
                <SelectTrigger data-testid="select-settings-personality"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                  <SelectItem value="consultative">Consultative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Autonomy</label>
              <Select value={data.autonomyLevel} onValueChange={(v) => setData(d => ({ ...d, autonomyLevel: v }))}>
                <SelectTrigger data-testid="select-settings-autonomy"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Daily Credit Budget</label>
              <Input type="number" value={data.dailyBudgetCredits} onChange={(e) => setData(d => ({ ...d, dailyBudgetCredits: parseInt(e.target.value) || 500 }))} data-testid="input-settings-budget" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Active Capabilities</label>
            <div className="grid grid-cols-2 gap-2">
              {CAPABILITY_OPTIONS.map(cap => (
                <div key={cap.id} className="flex items-center justify-between p-2 rounded border border-border/50">
                  <span className="text-xs">{cap.label}</span>
                  <Switch
                    checked={(data.activeCapabilities || []).includes(cap.id)}
                    onCheckedChange={(checked) => {
                      setData(d => ({
                        ...d,
                        activeCapabilities: checked
                          ? [...(d.activeCapabilities || []), cap.id]
                          : (d.activeCapabilities || []).filter((c: string) => c !== cap.id),
                      }));
                    }}
                    data-testid={`switch-settings-${cap.id}`}
                  />
                </div>
              ))}
            </div>
          </div>
          <Button onClick={() => onSave(data)} disabled={isPending} className="w-full" data-testid="button-save-settings">
            {isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            Save Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
