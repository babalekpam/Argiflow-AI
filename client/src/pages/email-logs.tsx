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
  MailX, ArrowLeftRight, Users, HelpCircle, MessageSquare, Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";

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
  bounced: number;
  todaySent: number;
  todayFailed: number;
  todayBounced: number;
  successRate: number;
  bySource: Record<string, { sent: number; failed: number; bounced: number }>;
  recentErrors: { id: string; email: string; error: string; source: string; status: string; time: string }[];
};

type FunnelEvidence = {
  range: { from: string; to: string; toExclusive: boolean };
  attempts: number;
  uniqueRecipients: number;
  acceptedRecords: number;
  unknownDelivery: number;
  bounceReports: number;
  replies: number;
  failedRecords: number;
  pendingRecords: number;
  retryRecords: number;
  retryCount: number;
  deliveryCallbacks: number;
  providerBreakdown: Record<string, number>;
  limitations: string[];
};

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function EmailLogsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [toDate, setToDate] = useState(() => dateInputValue(new Date()));
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 29);
    return dateInputValue(date);
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/email-logs/stats"],
  });

  const evidenceUrl = `/api/evidence/email-funnel?${new URLSearchParams({
    from: fromDate,
    to: toDate,
  }).toString()}`;
  const { data: evidence, isLoading: evidenceLoading, isError: evidenceError, error: evidenceQueryError } = useQuery<FunnelEvidence>({
    queryKey: [evidenceUrl],
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
      queryClient.invalidateQueries({ queryKey: [evidenceUrl] });
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
      queryClient.invalidateQueries({ queryKey: [evidenceUrl] });
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
    const map: Record<string, string> = { outreach: "Outreach", sequence: "Sequence", system: "System", agent: "AI Agent", "medbill-auto-outreach": "MedBill Auto", "platform-promoter": "Promoter" };
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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Email Attempt Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">Track provider handoffs, failures, bounce reports, and stored replies without overstating delivery</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { queryClient.invalidateQueries({ queryKey: ["/api/email-logs"] }); queryClient.invalidateQueries({ queryKey: ["/api/email-logs/stats"] }); queryClient.invalidateQueries({ queryKey: [evidenceUrl] }); }} data-testid="button-refresh-logs">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => clearMutation.mutate()} data-testid="button-clear-logs">
            <Trash2 className="w-4 h-4 mr-1" /> Clear All
          </Button>
        </div>
      </div>

      <Card data-testid="card-funnel-evidence">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-400" /> Outreach funnel evidence
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Read-only tenant evidence. Every metric below uses the same date range; no rate is calculated from total leads.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="text-muted-foreground" htmlFor="evidence-from">From</label>
              <Input
                id="evidence-from"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-8 w-[135px] text-xs"
                data-testid="input-evidence-from"
              />
              <label className="text-muted-foreground" htmlFor="evidence-to">Through</label>
              <Input
                id="evidence-to"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="h-8 w-[135px] text-xs"
                data-testid="input-evidence-to"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {evidenceLoading ? (
            <div className="py-5 text-center text-sm text-muted-foreground">Loading evidence...</div>
          ) : evidenceError ? (
            <div className="py-5 text-center text-sm text-red-400" data-testid="evidence-error">
              Evidence unavailable: {evidenceQueryError instanceof Error ? evidenceQueryError.message : "The tenant evidence request failed."}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="rounded-lg border p-3" data-testid="evidence-attempts">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Send className="w-3.5 h-3.5" /> Attempts</div>
                  <div className="text-xl font-bold mt-1">{evidence?.attempts ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground">each log record</div>
                </div>
                <div className="rounded-lg border p-3" data-testid="evidence-unique-recipients">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="w-3.5 h-3.5" /> Recipients</div>
                  <div className="text-xl font-bold mt-1">{evidence?.uniqueRecipients ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground">unique addresses</div>
                </div>
                <div className="rounded-lg border p-3" data-testid="evidence-accepted">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 className="w-3.5 h-3.5" /> Accepted</div>
                  <div className="text-xl font-bold mt-1">{evidence?.acceptedRecords ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground">provider handoff</div>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3" data-testid="evidence-unknown-delivery">
                  <div className="flex items-center gap-1.5 text-xs text-amber-400"><HelpCircle className="w-3.5 h-3.5" /> Unknown delivery</div>
                  <div className="text-xl font-bold text-amber-400 mt-1">{evidence?.unknownDelivery ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground">no callback</div>
                </div>
                <div className="rounded-lg border p-3" data-testid="evidence-bounces">
                  <div className="flex items-center gap-1.5 text-xs text-orange-400"><MailX className="w-3.5 h-3.5" /> Bounce reports</div>
                  <div className="text-xl font-bold text-orange-400 mt-1">{evidence?.bounceReports ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground">labelled bounced</div>
                </div>
                <div className="rounded-lg border p-3" data-testid="evidence-replies">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MessageSquare className="w-3.5 h-3.5" /> Replies</div>
                  <div className="text-xl font-bold mt-1">{evidence?.replies ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground">stored inbound</div>
                </div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 space-y-1.5 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">What these records can and cannot show</p>
                <p>Accepted means provider handoff, not delivery. Delivery callbacks stored: {evidence?.deliveryCallbacks ?? 0}; accepted records therefore remain unknown.</p>
                <p>Retries count as additional attempts but are deduplicated in unique recipients. Retried records: {evidence?.retryRecords ?? 0} ({evidence?.retryCount ?? 0} retry count).</p>
                <p>Reply count is limited to stored inbound records. Historical provider labels are not transport proof: some older SES labels were sent through Postal.</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card data-testid="stat-total-sent">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Send className="w-3.5 h-3.5" /> Accepted Handoffs</div>
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
        <Card data-testid="stat-total-bounced">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-orange-400 text-xs mb-1"><MailX className="w-3.5 h-3.5" /> Bounced</div>
            <div className="text-2xl font-bold text-orange-400">{stats?.bounced ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Today: {stats?.todayBounced ?? 0}</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-success-rate">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><BarChart3 className="w-3.5 h-3.5" /> Recorded handoffs</div>
            <div className="text-2xl font-bold">{stats?.sent ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-0.5">All-time · not delivery</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-by-source">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><ArrowUpRight className="w-3.5 h-3.5" /> By Source</div>
            {stats?.bySource && Object.entries(stats.bySource).map(([src, counts]) => (
              <div key={src} className="flex items-center justify-between text-xs mt-1">
                <span>{sourceLabel(src)}</span>
                <span className="text-muted-foreground">{counts.sent} handoff / {counts.failed} fail{counts.bounced > 0 ? ` / ${counts.bounced} bounce` : ""}</span>
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
              <div key={e.id} className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 ${e.status === "bounced" ? "bg-orange-500/5" : "bg-red-500/5"}`}>
                <div className="flex items-center gap-2">
                  {e.status === "bounced" ? (
                    <MailX className="w-3.5 h-3.5 text-orange-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className="font-medium">{e.email}</span>
                  <Badge variant="outline" className={`text-[10px] py-0 ${e.status === "bounced" ? "text-orange-400 border-orange-500/30" : ""}`}>
                    {e.status === "bounced" ? "Bounced" : "Failed"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] py-0">{sourceLabel(e.source)}</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`max-w-[300px] truncate ${e.status === "bounced" ? "text-orange-400/80" : "text-red-400/80"}`}>{e.error}</span>
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
            <SelectItem value="sent">Accepted handoff</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
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
            <SelectItem value="medbill-auto-outreach">MedBill Auto</SelectItem>
            <SelectItem value="platform-promoter">Promoter</SelectItem>
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
                      <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : log.status === "bounced" ? (
                      <MailX className="w-4 h-4 text-orange-400 shrink-0" />
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
                    {log.status === "sent" && (
                      <Badge variant="outline" className="text-[10px] py-0 text-amber-400 border-amber-500/30">Handoff · delivery unknown</Badge>
                    )}
                    {log.retryCount > 0 && <Badge variant="outline" className="text-[10px] py-0">Retry #{log.retryCount}</Badge>}
                    <span className="text-xs text-muted-foreground w-[70px] text-right">
                      <Clock className="w-3 h-3 inline mr-1" />{formatTime(log.sentAt || log.createdAt)}
                    </span>
                    {log.status === "bounced" && (
                      <Badge variant="outline" className="text-[10px] py-0 text-orange-400 border-orange-500/30">Bounced</Badge>
                    )}
                    {(log.status === "failed" || log.status === "bounced") && log.leadId && (
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
