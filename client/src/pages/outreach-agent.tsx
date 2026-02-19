import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Square,
  RefreshCw,
  Settings,
  Activity,
  BarChart3,
  Send,
  Mail,
  Users,
  Calendar,
  Search,
  Brain,
  MessageSquare,
  Target,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Inbox,
  Bot,
  Link2,
  Pause,
} from "lucide-react";

function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-5 w-40 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </Card>
      ))}
    </div>
  );
}

function AgentStatusPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery<any>({ queryKey: ["/api/outreach-agent/status"] });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/outreach-agent/start", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach-agent/status"] });
      toast({ title: "Outreach Agent started" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/outreach-agent/stop", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach-agent/status"] });
      toast({ title: "Outreach Agent stopped" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cycleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/outreach-agent/run-cycle", {});
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach-agent/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/outreach-agent/activity"] });
      toast({ title: "Cycle complete", description: `Discovered: ${data.results?.discovered || 0}, Sent: ${data.results?.sent || 0}, Replies: ${data.results?.replies || 0}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sendPendingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/leads/send-all-outreach", {});
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach-agent/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/outreach-agent/activity"] });
      toast({ title: "Sending outreach", description: data.message || `Sending ${data.total || 0} emails in background...` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadingCards count={4} />;

  const isRunning = status?.isRunning;
  const stats = status?.stats || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"}`} />
          <span className="font-medium" data-testid="text-agent-status">
            {isRunning ? "Agent Running" : "Agent Stopped"}
          </span>
        </div>
        <div className="flex gap-2">
          {isRunning ? (
            <Button variant="outline" onClick={() => stopMutation.mutate()} disabled={stopMutation.isPending} data-testid="button-stop-agent">
              <Square className="w-4 h-4 mr-2" /> Stop Agent
            </Button>
          ) : (
            <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} data-testid="button-start-agent">
              <Play className="w-4 h-4 mr-2" /> Start Agent
            </Button>
          )}
          <Button variant="outline" onClick={() => cycleMutation.mutate()} disabled={cycleMutation.isPending} data-testid="button-run-cycle">
            {cycleMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Run Cycle
          </Button>
          <Button variant="outline" onClick={() => sendPendingMutation.mutate()} disabled={sendPendingMutation.isPending} data-testid="button-send-pending">
            {sendPendingMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send Pending
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground">Prospects Found</p>
          </div>
          <p className="text-2xl font-bold" data-testid="text-stat-discovered">{stats.totalDiscovered || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Today: {stats.discoveredToday || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Send className="w-4 h-4 text-chart-3" />
            <p className="text-xs text-muted-foreground">Emails Sent</p>
          </div>
          <p className="text-2xl font-bold" data-testid="text-stat-sent">{stats.totalSent || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Today: {stats.sentToday || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-chart-4" />
            <p className="text-xs text-muted-foreground">Replies</p>
          </div>
          <p className="text-2xl font-bold" data-testid="text-stat-replies">{stats.totalReplies || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Interested: {stats.interested || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-chart-2" />
            <p className="text-xs text-muted-foreground">Meetings Booked</p>
          </div>
          <p className="text-2xl font-bold" data-testid="text-stat-booked">{stats.meetingsBooked || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">This week: {stats.bookedThisWeek || 0}</p>
        </Card>
      </div>

      {status?.pipeline && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Pipeline Overview
          </h3>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {["Discover", "Enroll", "Send", "Monitor", "Classify", "Respond", "Book", "Repeat"].map((step, i) => (
              <div key={step} className="flex items-center gap-2 shrink-0">
                <div className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  i <= (status.pipeline?.currentStep || 0) ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground"
                }`}>
                  {step}
                </div>
                {i < 7 && <span className="text-muted-foreground/40">&#8594;</span>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function AgentConfigPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery<any>({ queryKey: ["/api/outreach-agent/config"] });

  const [localConfig, setLocalConfig] = useState<any>(null);

  const updateField = (key: string, value: any) => {
    setLocalConfig((prev: any) => ({ ...(prev || config || {}), [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/outreach-agent/config", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach-agent/config"] });
      toast({ title: "Configuration saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadingCards count={2} />;

  const cfg = localConfig || config || {};

  const BUSINESS_PRESETS: { value: string; label: string; desc: string; audience: string; valueProp: string; queries: string[]; competitors: string[] }[] = [
    { value: "medical_billing", label: "Medical Billing", desc: "medical billing and revenue cycle management", audience: "dental offices, chiropractors, medical practices, clinics", valueProp: "streamline their billing operations, reduce claim denials, and increase revenue collection", queries: ["dental practice billing issues", "chiropractor practice needs billing help", "medical practice hiring billing staff"], competitors: ["billing company", "billing service", "RCM company", "revenue cycle management"] },
    { value: "marketing_agency", label: "Marketing Agency", desc: "digital marketing and advertising services", audience: "small businesses, local shops, restaurants, service companies needing marketing", valueProp: "grow their business with targeted digital marketing, SEO, and social media campaigns", queries: ["small business needs marketing help", "local business looking for advertising", "restaurant needs more customers online"], competitors: ["marketing agency", "advertising firm", "digital marketing company"] },
    { value: "web_design", label: "Web Design / Dev", desc: "website design and development", audience: "businesses without websites, companies with outdated websites", valueProp: "build a professional website that converts visitors into customers", queries: ["business needs new website", "company looking for web designer", "small business website redesign"], competitors: ["web design agency", "web development company", "website design firm"] },
    { value: "insurance", label: "Insurance", desc: "insurance brokerage services", audience: "businesses needing commercial insurance, homeowners, auto owners", valueProp: "find the best coverage at competitive rates with personalized service", queries: ["business needs insurance quote", "company looking for commercial insurance", "small business insurance options"], competitors: ["insurance broker", "insurance agency", "insurance company"] },
    { value: "real_estate", label: "Real Estate", desc: "real estate services", audience: "home sellers, property investors, commercial landlords", valueProp: "sell their property faster and at the best price with expert market knowledge", queries: ["property owner looking to sell", "real estate investment opportunities", "commercial property for sale"], competitors: ["real estate brokerage", "real estate agency", "realtor firm"] },
    { value: "accounting", label: "Accounting / Tax", desc: "accounting and tax preparation services", audience: "small businesses needing bookkeeping, individuals needing tax prep, startups", valueProp: "save money on taxes, stay compliant, and gain clarity on their financial health", queries: ["small business needs accountant", "company looking for bookkeeping", "business tax preparation help"], competitors: ["accounting firm", "CPA firm", "tax preparation service"] },
    { value: "consulting", label: "Business Consulting", desc: "business consulting and advisory services", audience: "growing businesses, startups needing guidance, companies facing operational challenges", valueProp: "overcome growth challenges, optimize operations, and scale profitably", queries: ["business looking for consultant", "company needs operational improvement", "startup needs business advisor"], competitors: ["consulting firm", "management consulting", "advisory firm"] },
    { value: "cleaning", label: "Cleaning Services", desc: "commercial and residential cleaning services", audience: "offices, medical facilities, restaurants, property managers", valueProp: "maintain a spotless, healthy environment with reliable professional cleaning", queries: ["office needs cleaning service", "business looking for janitorial service", "commercial cleaning company needed"], competitors: ["cleaning company", "janitorial service", "commercial cleaning firm"] },
    { value: "legal", label: "Legal Services", desc: "legal services and representation", audience: "businesses needing legal counsel, individuals with legal needs, startups needing incorporation", valueProp: "protect their business and rights with experienced legal counsel", queries: ["business needs attorney", "company looking for legal help", "startup needs lawyer"], competitors: ["law firm", "legal practice", "attorney group"] },
    { value: "fitness", label: "Fitness / Wellness", desc: "fitness training and wellness services", audience: "individuals wanting personal training, corporate wellness programs, gyms needing trainers", valueProp: "achieve their health goals with personalized coaching and proven programs", queries: ["personal training clients needed", "corporate wellness program", "gym looking for trainers"], competitors: ["fitness company", "personal training studio", "wellness center"] },
    { value: "custom", label: "Custom Business", desc: "", audience: "", valueProp: "", queries: [], competitors: [] },
  ];

  const applyPreset = (presetValue: string) => {
    const preset = BUSINESS_PRESETS.find(p => p.value === presetValue);
    if (preset && preset.value !== "custom") {
      setLocalConfig((prev: any) => ({
        ...(prev || config || {}),
        businessType: preset.value,
        businessDescription: preset.desc,
        targetAudience: preset.audience,
        valueProposition: preset.valueProp,
        discoveryQueries: preset.queries,
        competitorKeywords: preset.competitors,
      }));
    } else {
      updateField("businessType", presetValue);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Business Profile
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Tell the AI what your business does and who you want to reach. The agent will find leads matching your target audience.
        </p>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Business Type</Label>
            <Select value={cfg.businessType || "custom"} onValueChange={applyPreset}>
              <SelectTrigger data-testid="select-business-type"><SelectValue placeholder="Select your business type" /></SelectTrigger>
              <SelectContent>
                {BUSINESS_PRESETS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">What does your business do?</Label>
            <Textarea placeholder="e.g. We provide digital marketing services for local restaurants and retail stores" value={cfg.businessDescription || ""} onChange={(e) => updateField("businessDescription", e.target.value)} className="min-h-[60px]" data-testid="input-business-desc" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Target Audience (who are your ideal customers?)</Label>
            <Textarea placeholder="e.g. dental offices, chiropractors, small medical practices that need billing help" value={cfg.targetAudience || ""} onChange={(e) => updateField("targetAudience", e.target.value)} className="min-h-[60px]" data-testid="input-target-audience" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Your Value Proposition (why should they choose you?)</Label>
            <Textarea placeholder="e.g. We help businesses increase revenue by 30% with targeted ad campaigns" value={cfg.valueProposition || ""} onChange={(e) => updateField("valueProposition", e.target.value)} className="min-h-[60px]" data-testid="input-value-prop" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Competitor Keywords (we will exclude these from results, one per line)</Label>
            <Textarea placeholder="e.g. marketing agency&#10;advertising firm&#10;digital marketing company" value={(cfg.competitorKeywords || []).join("\n")} onChange={(e) => updateField("competitorKeywords", e.target.value.split("\n").filter(Boolean))} className="min-h-[60px]" data-testid="input-competitor-keywords" />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          Agent Settings
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <Label>Auto-Discovery</Label>
                <p className="text-xs text-muted-foreground">Automatically find new prospects every hour</p>
              </div>
              <Switch checked={cfg.discoveryEnabled ?? true} onCheckedChange={(v) => updateField("discoveryEnabled", v)} data-testid="switch-discovery" />
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <Label>Auto-Reply</Label>
                <p className="text-xs text-muted-foreground">AI generates contextual replies to prospects</p>
              </div>
              <Switch checked={cfg.autoReplyEnabled ?? true} onCheckedChange={(v) => updateField("autoReplyEnabled", v)} data-testid="switch-auto-reply" />
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <Label>Auto-Book Meetings</Label>
                <p className="text-xs text-muted-foreground">Automatically create appointments on interest</p>
              </div>
              <Switch checked={cfg.autoBookEnabled ?? false} onCheckedChange={(v) => updateField("autoBookEnabled", v)} data-testid="switch-auto-book" />
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <Label>Pause on Negative</Label>
                <p className="text-xs text-muted-foreground">Stop sequences when negative reply detected</p>
              </div>
              <Switch checked={cfg.pauseOnNegative ?? true} onCheckedChange={(v) => updateField("pauseOnNegative", v)} data-testid="switch-pause-negative" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">AI Personality</Label>
              <Select value={cfg.aiPersonality || "professional"} onValueChange={(v) => updateField("aiPersonality", v)}>
                <SelectTrigger data-testid="select-personality"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual & Friendly</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Daily Prospect Limit</Label>
              <Input type="number" value={cfg.dailyProspectLimit || 50} onChange={(e) => updateField("dailyProspectLimit", parseInt(e.target.value) || 50)} data-testid="input-daily-limit" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Max Emails Per Day</Label>
              <Input type="number" value={cfg.maxEmailsPerDay || 100} onChange={(e) => updateField("maxEmailsPerDay", parseInt(e.target.value) || 100)} data-testid="input-max-emails" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Max Follow-Ups</Label>
              <Input type="number" value={cfg.maxFollowUps || 5} onChange={(e) => updateField("maxFollowUps", parseInt(e.target.value) || 5)} data-testid="input-max-followups" />
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Calendar Link</Label>
            <Input placeholder="https://calendly.com/you/30min" value={cfg.calendarLink || ""} onChange={(e) => updateField("calendarLink", e.target.value)} data-testid="input-calendar-link" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Discovery Queries (one per line — leave blank for AI-generated queries based on your business profile)</Label>
            <Textarea placeholder="e.g. dental offices in Nashville&#10;chiropractor needs billing help Tennessee&#10;Leave blank to auto-generate from your business profile" value={(cfg.discoveryQueries || []).join("\n")} onChange={(e) => updateField("discoveryQueries", e.target.value.split("\n").filter(Boolean))} className="min-h-[80px]" data-testid="input-discovery-queries" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Blacklist Domains (one per line)</Label>
            <Textarea placeholder="competitor.com&#10;spammer.com" value={(cfg.blacklistDomains || []).join("\n")} onChange={(e) => updateField("blacklistDomains", e.target.value.split("\n").filter(Boolean))} className="min-h-[60px]" data-testid="input-blacklist" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={() => saveMutation.mutate(localConfig || config)} disabled={saveMutation.isPending} data-testid="button-save-config">
            {saveMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          Link Campaign
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Link an email campaign so discovered prospects are automatically enrolled into it.
        </p>
        <div className="flex gap-3">
          <Input placeholder="Campaign ID from Email Infrastructure" value={cfg.autoCampaignId || ""} onChange={(e) => updateField("autoCampaignId", e.target.value)} className="flex-1" data-testid="input-campaign-id" />
          <Button variant="outline" onClick={() => {
            if (cfg.autoCampaignId) saveMutation.mutate({ ...cfg, autoCampaignId: cfg.autoCampaignId });
          }} disabled={saveMutation.isPending} data-testid="button-link-campaign">
            <Link2 className="w-4 h-4 mr-2" /> Link
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ActivityLogPanel() {
  const { data: activities, isLoading } = useQuery<any[]>({
    queryKey: ["/api/outreach-agent/activity"],
    refetchInterval: 15000,
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "discovery": return <Search className="w-3.5 h-3.5 text-primary" />;
      case "enroll": return <Users className="w-3.5 h-3.5 text-chart-3" />;
      case "send": return <Send className="w-3.5 h-3.5 text-chart-4" />;
      case "reply": return <MessageSquare className="w-3.5 h-3.5 text-chart-2" />;
      case "classify": return <Brain className="w-3.5 h-3.5 text-primary" />;
      case "respond": return <Mail className="w-3.5 h-3.5 text-chart-3" />;
      case "book": return <Calendar className="w-3.5 h-3.5 text-chart-2" />;
      case "error": return <AlertTriangle className="w-3.5 h-3.5 text-destructive" />;
      default: return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary" />
        Activity Log
      </h3>

      {isLoading ? <LoadingCards count={4} /> : !activities?.length ? (
        <Card className="p-8 text-center">
          <Activity className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No activity yet. Start the agent or run a cycle to see activity here.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {activities.map((act: any, i: number) => (
            <Card key={act.id || i} className="p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {getActivityIcon(act.type || act.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium">{act.message || act.description}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : ""}
                    </span>
                  </div>
                  {act.details && <p className="text-xs text-muted-foreground mt-0.5">{act.details}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

type PageTab = "dashboard" | "config" | "activity";

export default function OutreachAgentPage() {
  usePageTitle("AI Outreach Agent");
  const [activeTab, setActiveTab] = useState<PageTab>("dashboard");

  const tabs: { key: PageTab; label: string; icon: any }[] = [
    { key: "dashboard", label: "Dashboard", icon: BarChart3 },
    { key: "config", label: "Configuration", icon: Settings },
    { key: "activity", label: "Activity Log", icon: Activity },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4 flex-wrap p-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Bot className="w-5 h-5 text-primary" />
            AI Outreach Agent
          </h1>
          <p className="text-sm text-muted-foreground">Autonomous prospect discovery, outreach, and meeting booking</p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Zap className="w-3 h-3" />
          8-Step Pipeline
        </Badge>
      </div>

      <div className="flex border-b border-border/50 px-4 gap-1 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "dashboard" && <AgentStatusPanel />}
        {activeTab === "config" && <AgentConfigPanel />}
        {activeTab === "activity" && <ActivityLogPanel />}
      </div>
    </div>
  );
}
