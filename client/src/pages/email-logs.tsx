import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, CheckCircle2, XCircle, RefreshCw, BarChart3,
  ArrowUpRight, Clock, AlertTriangle, Send, Trash2, Filter,
} from "lucide-react";

type EmailLog = {
  id: string;
  userId: string;
  leadId: string | null;
  recipientEmail: string;
  recipientName: string | null;
  subject: string | null;
  provider: string;
  source: string;
  status: string;
  errorMessage: string | null;
  retryCount: number;
  sentAt: string | null;
  createdAt: string;
};

type Stats = {
  total: number;
  sent: number;
  failed: number;
  todaySent: number;
  todayFailed: number;
  successRate: number;
  bySource: Record<string, { sent: number; failed: number }>;
  recentErrors: { id: string; email: string; error: string; source: string; time: string }[];
};

export default function EmailLogsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const { data: statsData, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/email-logs/stats"],
  });

  const logsUrl = `/api/email-logs?${new URLSearchParams({ ...(statusFilter !== "all" ? { status: statusFilter } : {}), ...(sourceFilter !== "all" ? { source: sourceFilter } : {}), limit: "100" }).toString()}`;
  const { data: logsData, isLoading: logsLoading } = useQuery<{ logs: EmailLog[]; total: number }>({
    queryKey: [logsUrl],
  });

  const retryMutation = useMutation({
    mutationFn: async (logId: string) => {
      const res = await apiRequest("POST", `/api/email-logs/${logId}/retry`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: "Email resent successfully" });
      } else {
        toast({ title: "Retry failed", description: data.error, variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/email-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-logs/stats"] });
    },
    onError: () => {
      toast({ title: "Retry failed", variant: "destructive" });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/email-logs");
    },
    onSuccess: () => {
      toast({ title: "Logs cleared" });
      queryClient.invalidateQueries({ queryKey: ["/api/email-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-logs/stats"] });
    },
  });

  const stats = statsData;
  const logs = logsData?.logs || [];

  const formatTime = (ts: string | null) => {
    if (!ts) return "—";
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const sourceLabel = (s: string) => {
    const map: Record<string, string> = { outreach: "Outreach", sequence: "Sequence", system: "System", agent: "AI Agent" };
    return map[s] || s;
  };

  const providerLabel = (p: string) => {
    const map: Record<string, string> = { smtp: "SMTP", sendgrid: "SendGrid", none: "None" };
    return map[p] || p;
  };

  return (
    <div className="space-y-6" data-testid="page-email-logs">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Email Delivery Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">Track every email sent by your agents, sequences, and outreach campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { queryClient.invalidateQueries({ queryKey: ["/api/email-logs"] }); queryClient.invalidateQueries({ queryKey: ["/api/email-logs/stats"] }); }} data-testid="button-refresh-logs">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => clearMutation.mutate()} data-testid="button-clear-logs">
            <Trash2 className="w-4 h-4 mr-1" /> Clear All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card data-testid="stat-total-sent">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Send className="w-3.5 h-3.5" /> Total Sent</div>
            <div className="text-2xl font-bold">{stats?.sent ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Today: {stats?.todaySent ?? 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-total-failed">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-red-400 text-xs mb-1"><XCircle className="w-3.5 h-3.5" /> Failed</div>
            <div className="text-2xl font-bold text-red-400">{stats?.failed ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Today: {stats?.todayFailed ?? 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-success-rate">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><BarChart3 className="w-3.5 h-3.5" /> Success Rate</div>
            <div className="text-2xl font-bold">{stats?.successRate ?? 0}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stats?.total ?? 0} total attempts</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-by-source">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><ArrowUpRight className="w-3.5 h-3.5" /> By Source</div>
            {stats?.bySource && Object.entries(stats.bySource).map(([src, counts]) => (
              <div key={src} className="flex items-center justify-between text-xs mt-1">
                <span>{sourceLabel(src)}</span>
                <span className="text-muted-foreground">{counts.sent} sent / {counts.failed} failed</span>
              </div>
            ))}
            {(!stats?.bySource || Object.keys(stats.bySource).length === 0) && <div className="text-sm text-muted-foreground">No data yet</div>}
          </CardContent>
        </Card>
      </div>

      {stats && stats.recentErrors && stats.recentErrors.length > 0 && (
        <Card className="border-red-500/30" data-testid="card-recent-errors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /> Recent Failures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.recentErrors.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-center justify-between text-xs bg-red-500/5 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  <span className="font-medium">{e.email}</span>
                  <Badge variant="outline" className="text-[10px] py-0">{sourceLabel(e.source)}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-red-400/80 max-w-[300px] truncate">{e.error}</span>
                  <span className="text-muted-foreground">{formatTime(e.time)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-source-filter">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="outreach">Outreach</SelectItem>
            <SelectItem value="sequence">Sequence</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="agent">AI Agent</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{logsData?.total ?? 0} results</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {logsLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading email logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground" data-testid="text-no-logs">
              <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No email logs yet</p>
              <p className="text-xs mt-1">Emails sent by your agents, sequences, and campaigns will appear here</p>
            </div>
          ) : (
            <div className="divide-y" data-testid="email-log-list">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors" data-testid={`email-log-row-${log.id}`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {log.status === "sent" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{log.recipientName || log.recipientEmail}</span>
                        {log.recipientName && <span className="text-xs text-muted-foreground truncate">{log.recipientEmail}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {log.subject && <span className="text-xs text-muted-foreground truncate max-w-[250px]">{log.subject}</span>}
                        {log.errorMessage && <span className="text-xs text-red-400 truncate max-w-[200px]">{log.errorMessage}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className="text-[10px] py-0">{sourceLabel(log.source)}</Badge>
                    <Badge variant="outline" className="text-[10px] py-0">{providerLabel(log.provider)}</Badge>
                    {log.retryCount > 0 && <Badge variant="outline" className="text-[10px] py-0">Retry #{log.retryCount}</Badge>}
                    <span className="text-xs text-muted-foreground w-[70px] text-right">
                      <Clock className="w-3 h-3 inline mr-1" />{formatTime(log.sentAt || log.createdAt)}
                    </span>
                    {log.status === "failed" && log.leadId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => retryMutation.mutate(log.id)}
                        disabled={retryMutation.isPending}
                        data-testid={`button-retry-${log.id}`}
                      >
                        <RefreshCw className={`w-3 h-3 mr-1 ${retryMutation.isPending ? "animate-spin" : ""}`} /> Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
