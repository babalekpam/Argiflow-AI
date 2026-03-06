import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, TrendingDown, Clock, Zap, Mail, Search, Bot, MessageSquare, GitBranch, Activity } from "lucide-react";

const ACTION_META: Record<string, { label: string; icon: any; color: string }> = {
  ai_email: { label: "AI Email Write", icon: Mail, color: "text-violet-500" },
  lead_enrich: { label: "Lead Enrichment", icon: Search, color: "text-blue-500" },
  agent_run: { label: "Agent Run", icon: Bot, color: "text-emerald-500" },
  reply_analyze: { label: "Reply Analysis", icon: MessageSquare, color: "text-amber-500" },
  intent_scan: { label: "Intent Scan", icon: Activity, color: "text-teal-500" },
  email_sequence: { label: "Email Sequence", icon: GitBranch, color: "text-pink-500" },
};

function formatDate(d: string | null) {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function CreditsPage() {
  const { data: balanceData, isLoading: balanceLoading } = useQuery<{
    credits: number;
    costs: Record<string, number>;
  }>({
    queryKey: ["/api/credits/balance"],
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<{
    history: Array<{ action: string; amount: number; provider: string | null; model: string | null; date: string }>;
  }>({
    queryKey: ["/api/credits/history"],
  });

  const credits = balanceData?.credits ?? 0;
  const costs = balanceData?.costs ?? {};
  const history = historyData?.history ?? [];

  if (balanceLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-credits">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const totalUsed = history.filter(h => h.amount > 0).reduce((sum, h) => sum + h.amount, 0);
  const totalRefunded = history.filter(h => h.amount < 0).reduce((sum, h) => sum + Math.abs(h.amount), 0);

  return (
    <div className="p-6 space-y-6" data-testid="page-credits">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-credits-title">Credits & Billing</h1>
        <p className="text-muted-foreground mt-1">Track your AI credit usage and transaction history</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5" data-testid="card-credit-balance">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Credit Balance</p>
              <p className="text-2xl font-bold font-mono" data-testid="text-credit-balance">{credits.toLocaleString()}</p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min((credits / 10000) * 100, 100)}%` }} />
          </div>
        </Card>

        <Card className="p-5" data-testid="card-credits-used">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Used</p>
              <p className="text-2xl font-bold font-mono">{totalUsed.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{history.filter(h => h.amount > 0).length} transactions</p>
        </Card>

        <Card className="p-5" data-testid="card-credits-refunded">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Refunded</p>
              <p className="text-2xl font-bold font-mono">{totalRefunded.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Auto-refunded on failed AI calls</p>
        </Card>
      </div>

      <Card className="p-5" data-testid="card-cost-breakdown">
        <h3 className="font-semibold text-sm mb-4">Credit Cost per Action</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(costs).map(([action, cost]) => {
            const meta = ACTION_META[action] || { label: action, icon: Zap, color: "text-muted-foreground" };
            const Icon = meta.icon;
            return (
              <div key={action} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50" data-testid={`cost-${action}`}>
                <Icon className={`w-4 h-4 ${meta.color} shrink-0`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{meta.label}</p>
                  <p className="text-lg font-bold font-mono text-primary">{cost}<span className="text-xs text-muted-foreground ml-1">cr</span></p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5" data-testid="card-credit-history">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Transaction History</h3>
          <Badge variant="outline" className="text-[10px]">{history.length} entries</Badge>
        </div>

        {historyLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Credits will be deducted when you use AI features</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-auto">
            {history.map((entry, idx) => {
              const isRefund = entry.amount < 0;
              const baseAction = entry.action.replace(/_refund$/, "");
              const meta = ACTION_META[baseAction] || { label: entry.action, icon: Zap, color: "text-muted-foreground" };
              const Icon = meta.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30"
                  data-testid={`history-entry-${idx}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isRefund ? "bg-emerald-500/10" : "bg-secondary"}`}>
                    <Icon className={`w-4 h-4 ${isRefund ? "text-emerald-500" : meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {isRefund ? `Refund: ${meta.label}` : meta.label}
                    </p>
                    {entry.provider && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {entry.provider} · {entry.model}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold font-mono ${isRefund ? "text-emerald-500" : "text-amber-500"}`}>
                      {isRefund ? "+" : "-"}{Math.abs(entry.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(entry.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
