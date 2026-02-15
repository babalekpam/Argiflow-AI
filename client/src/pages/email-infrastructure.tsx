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
  Mail,
  Send,
  Plus,
  Trash2,
  Flame,
  BarChart3,
  Shield,
  Inbox,
  Globe,
  Wand2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Archive,
  Eye,
  Clock,
  Play,
  Pause,
  Square,
  Settings,
  FileText,
  Sparkles,
  TrendingUp,
  Users,
  MousePointerClick,
  RefreshCw,
  Copy,
  ExternalLink,
  Search,
  MailPlus,
  ShieldCheck,
  Activity,
  Server,
  Zap,
} from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { FaMicrosoft } from "react-icons/fa";

type Tab = "accounts" | "warmup" | "campaigns" | "unibox" | "visitors" | "dfy" | "verification" | "placement" | "copilot" | "templates" | "analytics";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "accounts", label: "Email Accounts", icon: Mail },
  { key: "warmup", label: "Warmup", icon: Flame },
  { key: "campaigns", label: "Campaigns", icon: Send },
  { key: "unibox", label: "Unibox", icon: Inbox },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "visitors", label: "Visitors", icon: Globe },
  { key: "verification", label: "Verification", icon: ShieldCheck },
  { key: "placement", label: "Inbox Test", icon: Shield },
  { key: "templates", label: "Templates", icon: FileText },
  { key: "copilot", label: "AI Copilot", icon: Sparkles },
  { key: "dfy", label: "DFY Setup", icon: Server },
];

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

function EmailAccountsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connectMode, setConnectMode] = useState<null | "select" | "smtp">(null);
  const [smtpForm, setSmtpForm] = useState({
    email: "", smtpHost: "", smtpPort: "587", imapHost: "", imapPort: "993", password: "", displayName: "", dailySendLimit: "50",
  });

  const { data: accounts, isLoading } = useQuery<any[]>({ queryKey: ["/api/instantly/email-accounts"] });

  const connectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/instantly/email-accounts/connect/smtp", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instantly/email-accounts"] });
      toast({ title: "Email account connected" });
      setConnectMode(null);
      setSmtpForm({ email: "", smtpHost: "", smtpPort: "587", imapHost: "", imapPort: "993", password: "", displayName: "", dailySendLimit: "50" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/instantly/email-accounts/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instantly/email-accounts"] });
      toast({ title: "Account removed" });
    },
  });

  const toggleWarmupMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await apiRequest("POST", `/api/instantly/email-accounts/${id}/warmup/toggle`, { enabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instantly/email-accounts"] });
    },
  });

  if (isLoading) return <LoadingCards />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-email-accounts-title">Email Accounts</h3>
          <p className="text-sm text-muted-foreground">Connect and manage your sending accounts</p>
        </div>
        <Button onClick={() => setConnectMode("select")} data-testid="button-connect-email">
          <Plus className="w-4 h-4 mr-2" />Connect Account
        </Button>
      </div>

      {connectMode === "select" && (
        <Card className="p-6 space-y-4">
          <div>
            <h4 className="font-semibold text-base mb-3">Connect existing accounts</h4>
            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-chart-3 mt-0.5 shrink-0" />
                <span className="text-sm">Connect any IMAP or SMTP email provider</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-chart-3 mt-0.5 shrink-0" />
                <span className="text-sm">Sync up replies in the Unibox</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Card 
              className="p-4 cursor-pointer hover-elevate border border-border/50 transition-all"
              onClick={() => toast({ title: "Google OAuth coming soon - use SMTP/IMAP" })}
              data-testid="card-provider-google"
            >
              <div className="flex items-center gap-3">
                <SiGoogle className="w-6 h-6" />
                <div>
                  <p className="font-medium text-sm">Google</p>
                  <p className="text-xs text-muted-foreground">Gmail / G-Suite</p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover-elevate border border-border/50 transition-all"
              onClick={() => toast({ title: "Microsoft OAuth coming soon - use SMTP/IMAP" })}
              data-testid="card-provider-microsoft"
            >
              <div className="flex items-center gap-3">
                <FaMicrosoft className="w-6 h-6" />
                <div>
                  <p className="font-medium text-sm">Microsoft</p>
                  <p className="text-xs text-muted-foreground">Office 365 / Outlook</p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover-elevate border-2 border-primary transition-all"
              onClick={() => setConnectMode("smtp")}
              data-testid="card-provider-smtp"
            >
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6" />
                <div>
                  <p className="font-medium text-sm">Any Provider</p>
                  <p className="text-xs text-muted-foreground">IMAP / SMTP</p>
                </div>
              </div>
            </Card>
          </div>

          <Button variant="outline" onClick={() => setConnectMode(null)} className="w-full">Cancel</Button>
        </Card>
      )}

      {connectMode === "smtp" && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Connect SMTP/IMAP Account</h4>
            <Button size="sm" variant="ghost" onClick={() => setConnectMode("select")}>Back</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Email Address</Label><Input value={smtpForm.email} onChange={(e) => setSmtpForm({ ...smtpForm, email: e.target.value })} placeholder="you@domain.com" data-testid="input-smtp-email" /></div>
            <div><Label>Display Name</Label><Input value={smtpForm.displayName} onChange={(e) => setSmtpForm({ ...smtpForm, displayName: e.target.value })} placeholder="John Doe" data-testid="input-smtp-display-name" /></div>
            <div><Label>SMTP Host</Label><Input value={smtpForm.smtpHost} onChange={(e) => setSmtpForm({ ...smtpForm, smtpHost: e.target.value })} placeholder="smtp.domain.com" data-testid="input-smtp-host" /></div>
            <div><Label>SMTP Port</Label><Input value={smtpForm.smtpPort} onChange={(e) => setSmtpForm({ ...smtpForm, smtpPort: e.target.value })} data-testid="input-smtp-port" /></div>
            <div><Label>IMAP Host</Label><Input value={smtpForm.imapHost} onChange={(e) => setSmtpForm({ ...smtpForm, imapHost: e.target.value })} placeholder="imap.domain.com" data-testid="input-imap-host" /></div>
            <div><Label>IMAP Port</Label><Input value={smtpForm.imapPort} onChange={(e) => setSmtpForm({ ...smtpForm, imapPort: e.target.value })} data-testid="input-imap-port" /></div>
            <div><Label>Password</Label><Input type="password" value={smtpForm.password} onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })} data-testid="input-smtp-password" /></div>
            <div><Label>Daily Send Limit</Label><Input type="number" value={smtpForm.dailySendLimit} onChange={(e) => setSmtpForm({ ...smtpForm, dailySendLimit: e.target.value })} data-testid="input-daily-limit" /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => connectMutation.mutate({ ...smtpForm, smtpPort: parseInt(smtpForm.smtpPort), imapPort: parseInt(smtpForm.imapPort), dailySendLimit: parseInt(smtpForm.dailySendLimit) })} disabled={connectMutation.isPending || !smtpForm.email || !smtpForm.smtpHost} data-testid="button-submit-connect">
              {connectMutation.isPending ? "Connecting..." : "Connect"}
            </Button>
            <Button variant="outline" onClick={() => setConnectMode(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      {(!accounts || accounts.length === 0) ? (
        <Card className="p-8 text-center">
          <Mail className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No email accounts connected yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Connect your first SMTP account to start sending</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc: any) => (
            <Card key={acc.id} className="p-4" data-testid={`card-email-account-${acc.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{acc.email}</p>
                  <p className="text-xs text-muted-foreground">{acc.displayName || acc.provider}</p>
                </div>
                <Badge variant={acc.isActive ? "default" : "secondary"}>
                  {acc.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-muted-foreground">Warmup</span>
                  <Switch
                    checked={acc.warmupEnabled}
                    disabled={toggleWarmupMutation.isPending}
                    onCheckedChange={() => toggleWarmupMutation.mutate({ id: acc.id, enabled: !acc.warmupEnabled })}
                    data-testid={`switch-warmup-${acc.id}`}
                  />
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(acc.id)} data-testid={`button-delete-account-${acc.id}`}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-center">
                <div><p className="text-muted-foreground">Sent Today</p><p className="font-medium">{acc.sentToday || 0}</p></div>
                <div><p className="text-muted-foreground">Limit</p><p className="font-medium">{acc.dailySendLimit || 50}</p></div>
                <div><p className="text-muted-foreground">Rep Score</p><p className="font-medium">{acc.reputationScore || 0}</p></div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function WarmupTab() {
  const { data: dashboard, isLoading } = useQuery<any>({ queryKey: ["/api/instantly/warmup/dashboard"] });

  if (isLoading) return <LoadingCards />;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-warmup-title">Email Warmup</h3>
        <p className="text-sm text-muted-foreground">Gradually build sender reputation for your email accounts</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active Accounts</p>
          <p className="text-2xl font-bold" data-testid="text-warmup-total">{dashboard?.activeAccounts || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Emails Sent</p>
          <p className="text-2xl font-bold text-orange-400" data-testid="text-warmup-sent">{dashboard?.totalSent || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Emails Received</p>
          <p className="text-2xl font-bold text-emerald-400" data-testid="text-warmup-received">{dashboard?.totalReceived || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Inbox Rate</p>
          <p className="text-2xl font-bold" data-testid="text-warmup-inbox-rate">{dashboard?.inboxRate || 0}%</p>
        </Card>
      </div>

      {dashboard?.accounts?.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {dashboard.accounts.map((acc: any) => (
            <Card key={acc.id} className="p-4" data-testid={`card-warmup-account-${acc.id}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{acc.email}</p>
                  <p className="text-xs text-muted-foreground">Pool: {acc.pool || "standard"}</p>
                </div>
                <Badge variant={acc.status === "active" ? "default" : "secondary"}>
                  {acc.status || "inactive"}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-center">
                <div><p className="text-muted-foreground">Reputation</p><p className="font-semibold text-emerald-400">{acc.reputation || 0}</p></div>
                <div><p className="text-muted-foreground">Daily Limit</p><p className="font-semibold">{acc.dailyLimit || 20}</p></div>
                <div><p className="text-muted-foreground">Day</p><p className="font-semibold">{acc.currentDay || 0}</p></div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Flame className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No accounts enrolled in warmup</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Enable warmup on your email accounts to get started</p>
        </Card>
      )}
    </div>
  );
}

function CampaignsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", fromName: "", replyTo: "" });

  const { data: campaigns, isLoading } = useQuery<any[]>({ queryKey: ["/api/instantly/campaigns"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/instantly/campaigns", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instantly/campaigns"] });
      toast({ title: "Campaign created" });
      setShowCreate(false);
      setNewCampaign({ name: "", fromName: "", replyTo: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("POST", `/api/instantly/campaigns/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instantly/campaigns"] });
    },
  });

  if (isLoading) return <LoadingCards />;

  const statusIcon = (s: string) => {
    if (s === "active") return <Play className="w-3.5 h-3.5 text-emerald-400" />;
    if (s === "paused") return <Pause className="w-3.5 h-3.5 text-amber-400" />;
    if (s === "stopped" || s === "completed") return <Square className="w-3.5 h-3.5 text-muted-foreground" />;
    return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-campaigns-title">Email Campaigns</h3>
          <p className="text-sm text-muted-foreground">Multi-step sequences with A/Z testing and inbox rotation</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} data-testid="button-create-campaign">
          <Plus className="w-4 h-4 mr-2" />New Campaign
        </Button>
      </div>

      {showCreate && (
        <Card className="p-4 space-y-3">
          <h4 className="font-medium">Create Campaign</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><Label>Campaign Name</Label><Input value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} placeholder="Q1 Outreach" data-testid="input-campaign-name" /></div>
            <div><Label>From Name</Label><Input value={newCampaign.fromName} onChange={(e) => setNewCampaign({ ...newCampaign, fromName: e.target.value })} placeholder="John from ArgiFlow" data-testid="input-campaign-from" /></div>
            <div><Label>Reply-To</Label><Input value={newCampaign.replyTo} onChange={(e) => setNewCampaign({ ...newCampaign, replyTo: e.target.value })} placeholder="reply@domain.com" data-testid="input-campaign-reply" /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => createMutation.mutate(newCampaign)} disabled={createMutation.isPending || !newCampaign.name} data-testid="button-submit-campaign">
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {(!campaigns || campaigns.length === 0) ? (
        <Card className="p-8 text-center">
          <Send className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No campaigns yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Create your first email campaign to start outreach</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {campaigns.map((camp: any) => (
            <Card key={camp.id} className="p-4" data-testid={`card-campaign-${camp.id}`}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {statusIcon(camp.status)}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{camp.name}</p>
                    <p className="text-xs text-muted-foreground">{camp.fromName || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center"><p className="text-xs text-muted-foreground">Sent</p><p className="font-medium">{camp.emailsSent || 0}</p></div>
                  <div className="text-center"><p className="text-xs text-muted-foreground">Opened</p><p className="font-medium">{camp.emailsOpened || 0}</p></div>
                  <div className="text-center"><p className="text-xs text-muted-foreground">Replied</p><p className="font-medium">{camp.emailsReplied || 0}</p></div>
                  <Badge variant={camp.status === "active" ? "default" : "secondary"}>{camp.status}</Badge>
                  <div className="flex gap-1">
                    {camp.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: camp.id, status: "active" })} data-testid={`button-launch-${camp.id}`}>
                        <Play className="w-3.5 h-3.5 mr-1" />Launch
                      </Button>
                    )}
                    {camp.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: camp.id, status: "paused" })} data-testid={`button-pause-${camp.id}`}>
                        <Pause className="w-3.5 h-3.5 mr-1" />Pause
                      </Button>
                    )}
                    {camp.status === "paused" && (
                      <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: camp.id, status: "active" })} data-testid={`button-resume-${camp.id}`}>
                        <Play className="w-3.5 h-3.5 mr-1" />Resume
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function UniboxTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: messages, isLoading } = useQuery<any>({
    queryKey: ["/api/instantly/unibox", filter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("label", filter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/instantly/unibox?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const starMutation = useMutation({
    mutationFn: async ({ id, starred }: { id: string; starred: boolean }) => {
      await apiRequest("PUT", `/api/instantly/unibox/${id}/star`, { starred });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/instantly/unibox"] }),
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/instantly/unibox/${id}/archive`, { archived: true });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/instantly/unibox"] }),
  });

  const labelOptions = ["all", "interested", "not_interested", "meeting_booked", "out_of_office", "referral", "question", "wrong_person"];

  if (isLoading) return <LoadingCards />;

  const msgList = messages?.messages || [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-unibox-title">Unified Inbox</h3>
        <p className="text-sm text-muted-foreground">AI-labeled conversations across all your accounts</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search messages..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-unibox-search" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-unibox-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {labelOptions.map((l) => (
              <SelectItem key={l} value={l}>{l === "all" ? "All Messages" : l.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Total: {messages?.total || 0}</span>
        <span>Unread: {messages?.unread || 0}</span>
      </div>

      {msgList.length === 0 ? (
        <Card className="p-8 text-center">
          <Inbox className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No messages found</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {msgList.map((msg: any) => (
            <Card key={msg.id} className={`p-4 ${!msg.isRead ? "border-l-2 border-l-primary" : ""}`} data-testid={`card-unibox-msg-${msg.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{msg.fromEmail}</p>
                    {msg.aiLabel && (
                      <Badge variant="outline" className="text-[10px]">{msg.aiLabel.replace(/_/g, " ")}</Badge>
                    )}
                    {msg.sentiment && (
                      <Badge variant="secondary" className="text-[10px]">{msg.sentiment}</Badge>
                    )}
                  </div>
                  <p className="text-sm mt-1 font-medium">{msg.subject}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{msg.bodyPreview || msg.bodyText?.slice(0, 120)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => starMutation.mutate({ id: msg.id, starred: !msg.isStarred })} data-testid={`button-star-${msg.id}`}>
                    <Star className={`w-4 h-4 ${msg.isStarred ? "fill-amber-400 text-amber-400" : ""}`} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => archiveMutation.mutate(msg.id)} data-testid={`button-archive-${msg.id}`}>
                    <Archive className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-2">{new Date(msg.receivedAt || msg.createdAt).toLocaleString()}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function VisitorsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading } = useQuery<any>({ queryKey: ["/api/instantly/visitors/dashboard"] });
  const { data: pixels } = useQuery<any[]>({ queryKey: ["/api/instantly/visitors/pixels"] });

  const createPixelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/instantly/visitors/pixel", { domain: window.location.hostname });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instantly/visitors/pixels"] });
      toast({ title: "Tracking pixel created" });
    },
  });

  if (isLoading) return <LoadingCards />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-visitors-title">Website Visitor Identification</h3>
          <p className="text-sm text-muted-foreground">Track and identify anonymous website visitors</p>
        </div>
        <Button onClick={() => createPixelMutation.mutate()} disabled={createPixelMutation.isPending} data-testid="button-create-pixel">
          <Plus className="w-4 h-4 mr-2" />Create Pixel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-sm text-muted-foreground">Total Visitors</p><p className="text-2xl font-bold">{dashboard?.totalVisitors || 0}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Resolved</p><p className="text-2xl font-bold text-emerald-400">{dashboard?.resolvedCount || 0}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Companies</p><p className="text-2xl font-bold">{dashboard?.companies?.length || 0}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Active Pixels</p><p className="text-2xl font-bold">{pixels?.length || 0}</p></Card>
      </div>

      {pixels && pixels.length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium mb-2">Your Tracking Pixels</h4>
          {pixels.map((px: any) => (
            <div key={px.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0" data-testid={`card-pixel-${px.id}`}>
              <div>
                <p className="text-sm font-medium">{px.domain}</p>
                <p className="text-xs text-muted-foreground font-mono">ID: {px.pixelId}</p>
              </div>
              <Badge variant={px.isActive ? "default" : "secondary"}>{px.isActive ? "Active" : "Inactive"}</Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function VerificationTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [singleEmail, setSingleEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");

  const { data: jobs, isLoading } = useQuery<any[]>({ queryKey: ["/api/instantly/verification/jobs"] });

  const singleMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/instantly/verification/single", { email });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Result: ${data.result?.status || "checked"}`, description: `Score: ${data.result?.score || "N/A"}` });
      setSingleEmail("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const bulkMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      const res = await apiRequest("POST", "/api/instantly/verification/bulk", { emails, name: `Bulk verify ${emails.length} emails` });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instantly/verification/jobs"] });
      toast({ title: "Verification job started" });
      setBulkEmails("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadingCards />;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-verification-title">Email Verification</h3>
        <p className="text-sm text-muted-foreground">Verify email addresses before sending to protect reputation</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 space-y-3">
          <h4 className="font-medium">Single Verify</h4>
          <div className="flex gap-2">
            <Input value={singleEmail} onChange={(e) => setSingleEmail(e.target.value)} placeholder="test@example.com" data-testid="input-single-verify" />
            <Button onClick={() => singleMutation.mutate(singleEmail)} disabled={singleMutation.isPending || !singleEmail} data-testid="button-single-verify">
              {singleMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            </Button>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h4 className="font-medium">Bulk Verify</h4>
          <Textarea value={bulkEmails} onChange={(e) => setBulkEmails(e.target.value)} placeholder="One email per line..." rows={3} data-testid="input-bulk-verify" />
          <Button onClick={() => bulkMutation.mutate(bulkEmails.split("\n").map(e => e.trim()).filter(Boolean))} disabled={bulkMutation.isPending || !bulkEmails.trim()} data-testid="button-bulk-verify">
            {bulkMutation.isPending ? "Processing..." : "Verify All"}
          </Button>
        </Card>
      </div>

      {jobs && jobs.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Verification Jobs</h4>
          {jobs.map((job: any) => (
            <Card key={job.id} className="p-4" data-testid={`card-verify-job-${job.id}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{job.name}</p>
                  <p className="text-xs text-muted-foreground">{job.totalEmails} emails</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={job.status === "completed" ? "default" : "secondary"}>{job.status}</Badge>
                  <div className="text-xs text-right">
                    <p className="text-emerald-400">{job.validCount || 0} valid</p>
                    <p className="text-destructive">{job.invalidCount || 0} invalid</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PlacementTestTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: tests, isLoading } = useQuery<any[]>({ queryKey: ["/api/instantly/inbox-tests"] });

  const testMutation = useMutation({
    mutationFn: async (data: { subject: string; body: string }) => {
      const res = await apiRequest("POST", "/api/instantly/inbox-test", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instantly/inbox-tests"] });
      toast({ title: "Inbox placement test started" });
      setSubject("");
      setBody("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadingCards />;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-placement-title">Inbox Placement Testing</h3>
        <p className="text-sm text-muted-foreground">Test deliverability before sending campaigns</p>
      </div>

      <Card className="p-4 space-y-3">
        <h4 className="font-medium">Run New Test</h4>
        <div><Label>Subject Line</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Your email subject..." data-testid="input-test-subject" /></div>
        <div><Label>Email Body</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your email content..." rows={4} data-testid="input-test-body" /></div>
        <Button onClick={() => testMutation.mutate({ subject, body })} disabled={testMutation.isPending || !subject || !body} data-testid="button-run-test">
          {testMutation.isPending ? "Testing..." : "Run Placement Test"}
        </Button>
      </Card>

      {tests && tests.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Test Results</h4>
          {tests.map((test: any) => {
            const results = typeof test.results === "string" ? JSON.parse(test.results) : test.results;
            return (
              <Card key={test.id} className="p-4" data-testid={`card-placement-test-${test.id}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-medium text-sm">"{test.subject}"</p>
                    <p className="text-xs text-muted-foreground">{new Date(test.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {results && (
                      <>
                        <div className="text-center"><p className="text-[10px] text-muted-foreground">Overall</p><p className="text-lg font-bold">{results.overallScore || 0}</p></div>
                        <div className="text-center"><p className="text-[10px] text-muted-foreground">Gmail</p><p className="text-sm font-medium">{results.gmailPlacement || "N/A"}</p></div>
                        <div className="text-center"><p className="text-[10px] text-muted-foreground">Outlook</p><p className="text-sm font-medium">{results.outlookPlacement || "N/A"}</p></div>
                      </>
                    )}
                    <Badge variant={test.status === "completed" ? "default" : "secondary"}>{test.status}</Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CopilotTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [taskType, setTaskType] = useState("sequence");

  const { data: memory } = useQuery<any>({ queryKey: ["/api/instantly/copilot/memory"] });
  const { data: tasks } = useQuery<any[]>({ queryKey: ["/api/instantly/copilot/tasks"] });

  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/instantly/copilot/generate", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/instantly/copilot/tasks"] });
      toast({ title: "Content generated" });
      setPrompt("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-copilot-title">AI Copilot</h3>
        <p className="text-sm text-muted-foreground">Generate email sequences, subject lines, and campaign ideas</p>
      </div>

      <Card className="p-4 space-y-3">
        <h4 className="font-medium">Generate Content</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Content Type</Label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger data-testid="select-copilot-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sequence">Email Sequence</SelectItem>
                <SelectItem value="subject_lines">Subject Lines</SelectItem>
                <SelectItem value="follow_up">Follow-Up Email</SelectItem>
                <SelectItem value="campaign_idea">Campaign Ideas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Context / Prompt</Label>
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe what you need..." data-testid="input-copilot-prompt" />
          </div>
        </div>
        <Button onClick={() => generateMutation.mutate({ taskType, prompt })} disabled={generateMutation.isPending || !prompt} data-testid="button-copilot-generate">
          {generateMutation.isPending ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Generating...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" />Generate</>
          )}
        </Button>
      </Card>

      {memory?.memories?.length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium mb-2">Business Memory</h4>
          <div className="space-y-1">
            {memory.memories.slice(0, 5).map((m: any) => (
              <div key={m.id} className="text-sm py-1.5 border-b last:border-0">
                <Badge variant="outline" className="mr-2 text-[10px]">{m.category}</Badge>
                <span className="text-muted-foreground">{m.content?.slice(0, 100)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tasks && tasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Recent Generations</h4>
          {tasks.map((task: any) => (
            <Card key={task.id} className="p-4" data-testid={`card-copilot-task-${task.id}`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <Badge variant="outline">{task.taskType?.replace(/_/g, " ")}</Badge>
                <Badge variant={task.status === "completed" ? "default" : "secondary"}>{task.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{task.prompt}</p>
              {task.result && (
                <pre className="mt-2 text-xs bg-secondary/50 p-3 rounded-md overflow-auto max-h-48 whitespace-pre-wrap">
                  {typeof task.result === "string" ? task.result : JSON.stringify(task.result, null, 2)}
                </pre>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplatesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", subject: "", body: "", category: "cold_email" });

  const { data: templates, isLoading } = useQuery<any[]>({ queryKey: ["/api/instantly/email-templates"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/instantly/email-templates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instantly/email-templates"] });
      toast({ title: "Template saved" });
      setShowCreate(false);
      setNewTemplate({ name: "", subject: "", body: "", category: "cold_email" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/instantly/email-templates/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instantly/email-templates"] });
      toast({ title: "Template deleted" });
    },
  });

  if (isLoading) return <LoadingCards />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-templates-title">Email Templates</h3>
          <p className="text-sm text-muted-foreground">Reusable templates for cold emails, follow-ups, and more</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} data-testid="button-create-template">
          <Plus className="w-4 h-4 mr-2" />New Template
        </Button>
      </div>

      {showCreate && (
        <Card className="p-4 space-y-3">
          <h4 className="font-medium">Create Template</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Template Name</Label><Input value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="First Touch Cold Email" data-testid="input-template-name" /></div>
            <div>
              <Label>Category</Label>
              <Select value={newTemplate.category} onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v })}>
                <SelectTrigger data-testid="select-template-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cold_email">Cold Email</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="break_up">Break Up</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="nurture">Nurture</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Subject</Label><Input value={newTemplate.subject} onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })} placeholder="{{firstName}}, quick question about {{companyName}}" data-testid="input-template-subject" /></div>
          <div><Label>Body</Label><Textarea value={newTemplate.body} onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })} placeholder="Hi {{firstName}}..." rows={6} data-testid="input-template-body" /></div>
          <div className="flex gap-2">
            <Button onClick={() => createMutation.mutate(newTemplate)} disabled={createMutation.isPending || !newTemplate.name || !newTemplate.subject} data-testid="button-submit-template">
              {createMutation.isPending ? "Saving..." : "Save Template"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {(!templates || templates.length === 0) ? (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No templates yet</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((tpl: any) => (
            <Card key={tpl.id} className="p-4" data-testid={`card-template-${tpl.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{tpl.name}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">{tpl.category?.replace(/_/g, " ")}</Badge>
                  <p className="text-sm text-muted-foreground mt-2 truncate">{tpl.subject}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2">{tpl.body?.slice(0, 100)}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(tpl.id)} data-testid={`button-delete-template-${tpl.id}`}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DfySetupTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState("");
  const [quantity, setQuantity] = useState("3");

  const { data: orders, isLoading } = useQuery<any[]>({ queryKey: ["/api/instantly/dfy/orders"] });

  const checkDomainMutation = useMutation({
    mutationFn: async (d: string) => {
      const res = await apiRequest("POST", "/api/instantly/dfy/check-domain", { domain: d });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: data.available ? "Domain available" : "Domain not available" });
    },
  });

  const orderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/instantly/dfy/order", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instantly/dfy/orders"] });
      toast({ title: "Order submitted" });
      setDomain("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <LoadingCards />;

  const checklistItems = [
    "We Set Up Your Accounts",
    "You Choose The Domain & Account Names",
    "Automatic reconnects",
    "Save time and money",
    "High-quality US IP accounts",
    "Deliverability Optimized",
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-dfy-title">Done-For-You Email Setup</h3>
        <p className="text-sm text-muted-foreground">Domain provisioning with SPF, DKIM, DMARC, and MX records</p>
      </div>

      <Card className="p-6 space-y-4">
        <h4 className="font-semibold text-base mb-3">Done-for-you Email Setup</h4>
        <div className="space-y-2 mb-4">
          {checklistItems.map((item) => (
            <div key={item} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-chart-3 mt-0.5 shrink-0" />
              <span className="text-sm">{item}</span>
            </div>
          ))}
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-chart-3 mt-0.5 shrink-0" />
            <span className="text-sm">Added to the premium warmup pool</span>
            <Badge className="ml-auto text-[10px]">Pro</Badge>
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <p className="text-xs text-muted-foreground mb-3">Accounts that will be set up:</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Card className="p-3 border border-border/50">
              <div className="flex items-center gap-2">
                <SiGoogle className="w-5 h-5" />
                <div>
                  <p className="text-xs font-medium">Google</p>
                  <p className="text-[10px] text-muted-foreground">Gmail / G-Suite</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 border border-border/50">
              <div className="flex items-center gap-2">
                <FaMicrosoft className="w-5 h-5" />
                <div>
                  <p className="text-xs font-medium">Microsoft</p>
                  <p className="text-[10px] text-muted-foreground">Office 365 / Outlook</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 border border-border/50">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                <div>
                  <p className="text-xs font-medium">Any Provider</p>
                  <p className="text-[10px] text-muted-foreground">IMAP / SMTP</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h4 className="font-medium">New Domain Order</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Domain</Label>
            <div className="flex gap-2">
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourdomain.com" data-testid="input-dfy-domain" />
              <Button variant="outline" size="icon" onClick={() => checkDomainMutation.mutate(domain)} disabled={!domain} data-testid="button-check-domain">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label>Email Accounts</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" max="10" data-testid="input-dfy-quantity" />
          </div>
          <div className="flex items-end">
            <Button onClick={() => orderMutation.mutate({ primaryDomain: domain, quantity: parseInt(quantity) })} disabled={orderMutation.isPending || !domain} data-testid="button-dfy-order">
              {orderMutation.isPending ? "Ordering..." : "Place Order"}
            </Button>
          </div>
        </div>
      </Card>

      {orders && orders.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Your Orders</h4>
          {orders.map((order: any) => (
            <Card key={order.id} className="p-4" data-testid={`card-dfy-order-${order.id}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-medium text-sm">{order.primaryDomain}</p>
                  <p className="text-xs text-muted-foreground">{order.quantity} accounts</p>
                </div>
                <Badge variant={order.status === "completed" ? "default" : order.status === "provisioning" ? "secondary" : "outline"}>
                  {order.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsTab() {
  const { data: dashboard, isLoading } = useQuery<any>({
    queryKey: ["/api/instantly/instantly/dashboard"],
  });

  if (isLoading) return <LoadingCards count={6} />;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold" data-testid="text-analytics-title">Campaign Analytics</h3>
        <p className="text-sm text-muted-foreground">Overview of all email campaigns performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><Send className="w-4 h-4 text-primary" /><p className="text-sm text-muted-foreground">Emails Sent</p></div>
          <p className="text-2xl font-bold" data-testid="text-total-sent">{dashboard?.emailsSent || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><Eye className="w-4 h-4 text-blue-400" /><p className="text-sm text-muted-foreground">Open Rate</p></div>
          <p className="text-2xl font-bold" data-testid="text-open-rate">{dashboard?.openRate || 0}%</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><Mail className="w-4 h-4 text-emerald-400" /><p className="text-sm text-muted-foreground">Reply Rate</p></div>
          <p className="text-2xl font-bold" data-testid="text-reply-rate">{dashboard?.replyRate || 0}%</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-destructive" /><p className="text-sm text-muted-foreground">Bounced</p></div>
          <p className="text-2xl font-bold" data-testid="text-bounced">{dashboard?.emailsBounced || 0}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4">
          <h4 className="font-medium mb-3">Overview</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Accounts</span>
              <Badge variant="outline">{dashboard?.accounts || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Warmup Accounts</span>
              <Badge variant="outline">{dashboard?.warmupAccounts || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Avg Reputation</span>
              <Badge variant="outline">{dashboard?.avgReputation || 0}</Badge>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <h4 className="font-medium mb-3">Campaigns</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Campaigns</span>
              <Badge variant="outline">{dashboard?.campaigns || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Emails Opened</span>
              <Badge variant="outline">{dashboard?.emailsOpened || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Emails Replied</span>
              <Badge variant="outline">{dashboard?.emailsReplied || 0}</Badge>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <h4 className="font-medium mb-3">Leads</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Leads</span>
              <Badge variant="outline">{dashboard?.leads || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Opportunities</span>
              <Badge variant="outline">{dashboard?.opportunities || 0}</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function EmailInfrastructurePage() {
  usePageTitle("Email Infrastructure");
  const [activeTab, setActiveTab] = useState<Tab>("accounts");

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="page-email-infrastructure">
      <div className="mb-2">
        <h2 className="text-2xl font-bold" data-testid="text-page-title">Email Infrastructure</h2>
        <p className="text-sm text-muted-foreground">Complete email sending, warmup, campaigns, and deliverability toolkit</p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-border/50">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
              className="shrink-0"
              data-testid={`tab-${tab.key}`}
            >
              <Icon className="w-4 h-4 mr-1.5" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      <div className="mt-4">
        {activeTab === "accounts" && <EmailAccountsTab />}
        {activeTab === "warmup" && <WarmupTab />}
        {activeTab === "campaigns" && <CampaignsTab />}
        {activeTab === "unibox" && <UniboxTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "visitors" && <VisitorsTab />}
        {activeTab === "verification" && <VerificationTab />}
        {activeTab === "placement" && <PlacementTestTab />}
        {activeTab === "copilot" && <CopilotTab />}
        {activeTab === "templates" && <TemplatesTab />}
        {activeTab === "dfy" && <DfySetupTab />}
      </div>
    </div>
  );
}