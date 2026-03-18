import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Brain, Play, Send, Zap, TrendingUp, Mail, Users, Calendar,
  BarChart3, Clock, CheckCircle, AlertCircle, Loader2, FileText,
  Settings, Sparkles, Activity, MessageCircle, Shield, ShieldCheck,
  Rocket, X, Check, Plug, ArrowRight, Star, Sun
} from "lucide-react";

function AriaAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "w-6 h-6" : size === "lg" ? "w-12 h-12" : "w-8 h-8";
  return (
    <div className={`${s} rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center flex-shrink-0`}>
      <Bot className={size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-7 h-7" : "w-4.5 h-4.5"} style={{ color: "white" }} />
    </div>
  );
}

function AutonomyBadge({ level }: { level: string }) {
  const config: Record<string, { icon: any; label: string; cls: string }> = {
    supervised: { icon: Shield, label: "Supervised", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    "semi-auto": { icon: ShieldCheck, label: "Semi-Auto", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    autopilot: { icon: Rocket, label: "Autopilot", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  };
  const c = config[level] || config.supervised;
  const Icon = c.icon;
  return (
    <Badge className={c.cls} data-testid="badge-autonomy">
      <Icon className="w-3 h-3 mr-1" />
      {c.label}
    </Badge>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-400",
    thinking: "bg-yellow-400 animate-pulse",
    onboarding: "bg-sky-400",
    error: "bg-red-400",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || "bg-gray-400"}`} />;
}

function DiscoveryChat({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: history = [], isSuccess: historyLoaded } = useQuery<Array<{ role: string; content: string }>>({
    queryKey: ["/api/aria/discovery/history"],
  });

  const [initSent, setInitSent] = useState(false);

  const discoveryMut = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/aria/discovery", { message });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/aria/discovery/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aria/status"] });
      if (data.status?.onboarded) {
        toast({ title: "Setup Complete!", description: "Aria is ready to manage your business." });
        onComplete();
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  useEffect(() => {
    if (historyLoaded && history.length === 0 && !initSent) {
      setInitSent(true);
      discoveryMut.mutate("Hi, I'd like to set up my business manager.");
    }
  }, [historyLoaded, history.length]);

  const handleSend = () => {
    if (!input.trim() || discoveryMut.isPending) return;
    discoveryMut.mutate(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <AriaAvatar size="lg" />
        <div>
          <h2 className="text-lg font-semibold text-white">Meet Aria</h2>
          <p className="text-sm text-gray-400">Your AI Business Manager — Let's get you set up</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role !== "user" && <AriaAvatar size="sm" />}
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === "user"
                ? "bg-sky-600 text-white rounded-br-sm"
                : "bg-white/5 text-gray-200 rounded-bl-sm"
            }`} data-testid={`discovery-msg-${i}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {discoveryMut.isPending && (
          <div className="flex gap-3">
            <AriaAvatar size="sm" />
            <div className="bg-white/5 rounded-2xl px-4 py-3 rounded-bl-sm">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Tell Aria about your business..."
            className="bg-white/5 border-white/10"
            disabled={discoveryMut.isPending}
            data-testid="input-discovery"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || discoveryMut.isPending}
            size="icon"
            className="bg-sky-600 hover:bg-sky-700"
            data-testid="button-discovery-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChatPanel() {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: history = [] } = useQuery<Array<{ id: number; role: string; content: string; created_at: string }>>({
    queryKey: ["/api/aria/chat/history"],
    refetchInterval: 5000,
  });

  const chatMut = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/aria/chat", { message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aria/chat/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aria/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aria/actions/pending"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleSend = () => {
    if (!input.trim() || chatMut.isPending) return;
    chatMut.mutate(input.trim());
    setInput("");
  };

  return (
    <Card className="bg-gray-900/50 border-white/10 flex flex-col h-[500px]">
      <CardHeader className="py-3 px-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-sky-400" />
          <CardTitle className="text-sm font-medium">Chat with Aria</CardTitle>
        </div>
      </CardHeader>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <AriaAvatar size="lg" />
            <p className="mt-3 text-sm">Ask me anything about your business!</p>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              {["What did you do today?", "Who needs follow up?", "Send emails to cold leads"].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-gray-400 hover:bg-white/10 transition"
                  data-testid={`button-suggestion-${q.slice(0, 10)}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {history.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role !== "user" && <AriaAvatar size="sm" />}
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
              msg.role === "user"
                ? "bg-sky-600 text-white rounded-br-sm"
                : "bg-white/5 text-gray-200 rounded-bl-sm"
            }`} data-testid={`chat-msg-${msg.id}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {chatMut.isPending && (
          <div className="flex gap-2">
            <AriaAvatar size="sm" />
            <div className="bg-white/5 rounded-2xl px-4 py-3 rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-white/10">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask Aria anything..."
            className="bg-white/5 border-white/10 text-sm"
            disabled={chatMut.isPending}
            data-testid="input-chat"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || chatMut.isPending}
            size="icon"
            className="bg-sky-600 hover:bg-sky-700"
            data-testid="button-chat-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ApprovalQueue() {
  const { toast } = useToast();
  const { data: pending = [] } = useQuery<any[]>({
    queryKey: ["/api/aria/actions/pending"],
    refetchInterval: 10000,
  });

  const approveMut = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/aria/actions/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aria/actions/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aria/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aria/dashboard"] });
      toast({ title: "Action approved" });
    },
  });

  const rejectMut = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/aria/actions/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aria/actions/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aria/actions"] });
      toast({ title: "Action rejected" });
    },
  });

  if (pending.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
        <p className="text-sm">No actions waiting for approval</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pending.map((action: any) => (
        <div key={action.id} className="bg-white/5 rounded-xl p-4 border border-white/10" data-testid={`approval-${action.id}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs">{action.category}</Badge>
              </div>
              <p className="text-sm font-medium text-white">{action.title}</p>
              {action.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{action.description}</p>}
              {action.output_preview && (
                <div className="mt-2 p-2 bg-black/30 rounded-lg text-xs text-gray-300 line-clamp-3">
                  {action.output_preview}
                </div>
              )}
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Button
                size="sm"
                onClick={() => approveMut.mutate(action.id)}
                disabled={approveMut.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 h-8 px-3"
                data-testid={`button-approve-${action.id}`}
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => rejectMut.mutate(action.id)}
                disabled={rejectMut.isPending}
                className="border-white/10 h-8 px-3"
                data-testid={`button-reject-${action.id}`}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = "sky" }: { icon: any; label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    sky: "from-sky-500/10 to-sky-600/5 border-sky-500/20",
    emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
    violet: "from-violet-500/10 to-violet-600/5 border-violet-500/20",
    amber: "from-amber-500/10 to-amber-600/5 border-amber-500/20",
    rose: "from-rose-500/10 to-rose-600/5 border-rose-500/20",
  };
  const iconColors: Record<string, string> = {
    sky: "text-sky-400",
    emerald: "text-emerald-400",
    violet: "text-violet-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`} data-testid={`stat-${label}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${iconColors[color]}`} />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function ConnectorsPanel() {
  const { data: connectors = [] } = useQuery<Array<{ name: string; id: string; connected: boolean; description: string }>>({
    queryKey: ["/api/aria/connectors"],
  });

  return (
    <div className="space-y-3">
      {connectors.map(c => (
        <div key={c.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10" data-testid={`connector-${c.id}`}>
          <Plug className={`w-5 h-5 ${c.connected ? "text-emerald-400" : "text-gray-500"}`} />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{c.name}</p>
            <p className="text-xs text-gray-400">{c.description}</p>
          </div>
          <Badge className={c.connected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"}>
            {c.connected ? "Connected" : "Not Connected"}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function SettingsPanel() {
  const { toast } = useToast();

  const { data: dashboard } = useQuery<any>({ queryKey: ["/api/aria/dashboard"] });
  const biz = dashboard?.business;

  const settingsMut = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/aria/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aria/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aria/status"] });
      toast({ title: "Settings updated" });
    },
  });

  if (!biz) return null;

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm text-gray-400 mb-2 block">Autonomy Level</label>
        <p className="text-xs text-gray-500 mb-3">Controls how much Aria can do without asking you first.</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "supervised", icon: Shield, label: "Supervised", desc: "Aria proposes everything, you approve" },
            { id: "semi-auto", icon: ShieldCheck, label: "Semi-Auto", desc: "Low-risk actions run automatically" },
            { id: "autopilot", icon: Rocket, label: "Autopilot", desc: "Aria handles everything autonomously" },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => settingsMut.mutate({ autonomy: opt.id })}
              className={`p-4 rounded-xl border text-left transition ${
                biz.autonomy === opt.id
                  ? "bg-sky-500/10 border-sky-500/30"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
              data-testid={`button-autonomy-${opt.id}`}
            >
              <opt.icon className={`w-5 h-5 mb-2 ${biz.autonomy === opt.id ? "text-sky-400" : "text-gray-500"}`} />
              <p className="text-sm font-medium text-white">{opt.label}</p>
              <p className="text-xs text-gray-400 mt-1">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-2 block">Daily Briefing Time</label>
        <Select defaultValue={biz.briefing_time || "08:00"} onValueChange={v => settingsMut.mutate({ briefing_time: v })}>
          <SelectTrigger className="bg-white/5 border-white/10 w-48" data-testid="select-briefing-time">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["06:00", "07:00", "08:00", "09:00", "10:00", "12:00"].map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm text-gray-400 mb-2 block">Briefing Delivery</label>
        <Select defaultValue={biz.briefing_via || "email"} onValueChange={v => settingsMut.mutate({ briefing_via: v })}>
          <SelectTrigger className="bg-white/5 border-white/10 w-48" data-testid="select-briefing-via">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="both">Both</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default function BusinessManagerPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: ariaStatus, isLoading: statusLoading } = useQuery<any>({
    queryKey: ["/api/aria/status"],
  });

  const { data: dashboard, isLoading: dashLoading } = useQuery<any>({
    queryKey: ["/api/aria/dashboard"],
    refetchInterval: 10000,
    enabled: ariaStatus?.onboarded === true,
  });

  const { data: actions = [] } = useQuery<any[]>({
    queryKey: ["/api/aria/actions"],
    enabled: ariaStatus?.onboarded === true,
  });

  const { data: briefings = [] } = useQuery<any[]>({
    queryKey: ["/api/aria/briefings"],
    enabled: ariaStatus?.onboarded === true,
  });

  const cycleMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/aria/run-cycle");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/aria/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aria/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aria/actions/pending"] });
      toast({ title: "Cycle Complete", description: `${data.actions} actions taken: ${data.message}` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const briefingMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/aria/briefing");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aria/briefings"] });
      toast({ title: "Briefing Generated" });
    },
  });

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    );
  }

  if (!ariaStatus?.onboarded) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card className="bg-gray-900/50 border-white/10 overflow-hidden">
          <DiscoveryChat onComplete={() => queryClient.invalidateQueries({ queryKey: ["/api/aria/status"] })} />
        </Card>
      </div>
    );
  }

  const biz = dashboard?.business;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AriaAvatar size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Aria
              <StatusDot status={biz?.status || "active"} />
            </h1>
            <p className="text-sm text-gray-400">
              AI Business Manager for {biz?.name || "your business"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AutonomyBadge level={biz?.autonomy || "supervised"} />
          <Button
            onClick={() => cycleMut.mutate()}
            disabled={cycleMut.isPending}
            className="bg-sky-600 hover:bg-sky-700"
            data-testid="button-run-cycle"
          >
            {cycleMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Run Now
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10" data-testid="tabs-main">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="chat" data-testid="tab-chat">Chat</TabsTrigger>
          <TabsTrigger value="approvals" data-testid="tab-approvals">
            Approvals
            {dashboard?.pendingApprovals > 0 && (
              <Badge className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0">{dashboard.pendingApprovals}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
          <TabsTrigger value="briefings" data-testid="tab-briefings">Briefings</TabsTrigger>
          <TabsTrigger value="connectors" data-testid="tab-connectors">Connectors</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon={Users} label="Active Leads" value={dashboard?.leads || 0} color="sky" />
            <StatCard icon={Mail} label="Emails Sent" value={dashboard?.emailsSent || 0} color="violet" />
            <StatCard icon={Calendar} label="Meetings" value={dashboard?.upcomingMeetings || 0} color="emerald" />
            <StatCard icon={Zap} label="Actions Today" value={dashboard?.todayActions || 0} color="amber" />
            <StatCard icon={AlertCircle} label="Pending" value={dashboard?.pendingApprovals || 0} color="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChatPanel />

            <Card className="bg-gray-900/50 border-white/10 h-[500px] flex flex-col">
              <CardHeader className="py-3 px-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" />
                    <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {(dashboard?.recentActions || []).length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No activity yet. Run a cycle to get started.
                  </div>
                )}
                {(dashboard?.recentActions || []).map((action: any) => (
                  <div key={action.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg" data-testid={`activity-${action.id}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      action.status === "completed" ? "bg-emerald-400" :
                      action.status === "pending" ? "bg-yellow-400" :
                      action.status === "rejected" ? "bg-red-400" : "bg-gray-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{action.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge className="bg-white/5 text-gray-400 border-white/10 text-xs">{action.category}</Badge>
                        <span className="text-xs text-gray-500">{new Date(action.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <div className="max-w-3xl mx-auto">
            <ChatPanel />
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <Card className="bg-gray-900/50 border-white/10">
            <CardHeader className="border-b border-white/10">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-yellow-400" />
                <CardTitle className="text-base">Actions Waiting for Your Approval</CardTitle>
              </div>
              <p className="text-sm text-gray-400">Aria proposed these actions. Review and approve or reject them.</p>
            </CardHeader>
            <CardContent className="p-4">
              <ApprovalQueue />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="bg-gray-900/50 border-white/10">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-sky-400" />
                All Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {actions.map((action: any) => (
                  <div key={action.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg" data-testid={`action-${action.id}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      action.status === "completed" ? "bg-emerald-400" :
                      action.status === "pending" ? "bg-yellow-400" :
                      action.status === "approved" ? "bg-blue-400" :
                      action.status === "rejected" ? "bg-red-400" : "bg-gray-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{action.title}</p>
                      {action.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{action.description}</p>}
                      {action.output_preview && (
                        <div className="mt-1.5 p-2 bg-black/30 rounded text-xs text-gray-300 line-clamp-3">{action.output_preview}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-white/5 text-gray-400 border-white/10 text-xs">{action.category}</Badge>
                        <Badge className={`text-xs ${
                          action.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          action.status === "pending" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                          action.status === "rejected" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>{action.status}</Badge>
                        {action.tool_used && <span className="text-xs text-gray-500">via {action.tool_used}</span>}
                        <span className="text-xs text-gray-500">{new Date(action.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {actions.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">No actions yet. Run a cycle to get started.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="briefings" className="mt-4">
          <Card className="bg-gray-900/50 border-white/10">
            <CardHeader className="border-b border-white/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sun className="w-5 h-5 text-amber-400" />
                  Daily Briefings
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => briefingMut.mutate()}
                  disabled={briefingMut.isPending}
                  className="bg-sky-600 hover:bg-sky-700"
                  data-testid="button-generate-briefing"
                >
                  {briefingMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <FileText className="w-3.5 h-3.5 mr-1" />}
                  Generate Now
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {briefings.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No briefings yet. Generate one to see your daily summary.
                </div>
              )}
              {briefings.map((b: any) => (
                <div key={b.id} className="p-4 bg-white/5 rounded-xl border border-white/10 mb-3" data-testid={`briefing-${b.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{new Date(b.sent_at).toLocaleString()}</span>
                    {b.sent_via && <Badge className="bg-white/5 text-gray-400 border-white/10 text-xs">via {b.sent_via}</Badge>}
                  </div>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">{b.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connectors" className="mt-4">
          <Card className="bg-gray-900/50 border-white/10">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-base flex items-center gap-2">
                <Plug className="w-5 h-5 text-sky-400" />
                Connected Tools
              </CardTitle>
              <p className="text-sm text-gray-400">Tools Aria can use to manage your business.</p>
            </CardHeader>
            <CardContent className="p-4">
              <ConnectorsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card className="bg-gray-900/50 border-white/10">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-400" />
                Aria Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <SettingsPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
