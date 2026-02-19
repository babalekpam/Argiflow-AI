import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Bot,
  MessageSquare,
  TrendingUp,
  Mail,
  MousePointerClick,
  Eye,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Activity,
} from "lucide-react";

type AiKpiData = {
  overview: {
    totalLeads: number;
    aiGeneratedLeads: number;
    manualLeads: number;
    totalConversations: number;
    totalAiResponses: number;
    totalAppointments: number;
    conversionRate: number;
  };
  outreach: {
    totalOutreached: number;
    totalEngaged: number;
    totalOpens: number;
    totalClicks: number;
    openRate: number;
    clickRate: number;
    responseRate: number;
    followUpsActive: number;
  };
  agents: {
    total: number;
    active: number;
    byType: Record<string, number>;
  };
  breakdown: {
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
  };
  leadsTrend: { date: string; count: number }[];
};

function KpiStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  testId,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color: string;
  trend?: { value: number; positive: boolean };
  testId: string;
}) {
  return (
    <Card className="p-5" data-testid={testId}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trend.positive ? "text-chart-2" : "text-destructive"}`}>
            {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold mb-0.5" data-testid={`${testId}-value`}>{value}</p>
      <p className="text-sm text-muted-foreground" data-testid={`${testId}-label`}>{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground/70 mt-0.5" data-testid={`${testId}-subtitle`}>{subtitle}</p>}
    </Card>
  );
}

function MiniBarChart({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const recentData = data.slice(-14);

  return (
    <div className="flex items-end gap-1 h-24 w-full" data-testid="chart-leads-trend">
      {recentData.map((d, i) => {
        const height = maxCount > 0 ? Math.max((d.count / maxCount) * 100, 4) : 4;
        const isToday = i === recentData.length - 1;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full rounded-sm transition-all ${isToday ? "bg-chart-1" : "bg-chart-1/30"}`}
              data-testid={`chart-bar-${i}`}
              style={{ height: `${height}%` }}
              title={`${d.date}: ${d.count} leads`}
            />
            {(i === 0 || i === recentData.length - 1 || i === Math.floor(recentData.length / 2)) && (
              <span className="text-[9px] text-muted-foreground/60">
                {new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BreakdownList({
  data,
  colorFn,
  testId,
}: {
  data: Record<string, number>;
  colorFn: (key: string, index: number) => string;
  testId: string;
}) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, v]) => sum + v, 0);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm" data-testid={testId}>
        No data yet
      </div>
    );
  }

  return (
    <div className="space-y-2.5" data-testid={testId}>
      {sorted.map(([key, count], idx) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={key} data-testid={`breakdown-row-${key.toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="flex items-center justify-between gap-4 mb-1">
              <span className="text-sm truncate capitalize" data-testid={`breakdown-label-${key.toLowerCase().replace(/\s+/g, "-")}`}>{key.replace(/_/g, " ")}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-medium" data-testid={`breakdown-value-${key.toLowerCase().replace(/\s+/g, "-")}`}>{count}</span>
                <span className="text-xs text-muted-foreground">({pct}%)</span>
              </div>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${colorFn(key, idx)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const statusColors: Record<string, string> = {
  new: "bg-primary",
  warm: "bg-chart-4",
  hot: "bg-destructive",
  cold: "bg-muted-foreground",
  qualified: "bg-chart-2",
  contacted: "bg-chart-5",
  converted: "bg-chart-2",
};

const sourceColors = [
  "bg-primary",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-primary/70",
  "bg-chart-2/70",
  "bg-chart-3/70",
];

export default function AiKpiPage() {
  const { t } = useTranslation();
  usePageTitle("AI Performance");

  const { data: kpi, isLoading } = useQuery<AiKpiData>({
    queryKey: ["/api/ai-kpi"],
  });

  const SkeletonCard = () => (
    <Card className="p-5">
      <Skeleton className="h-10 w-10 rounded-md mb-3" />
      <Skeleton className="h-7 w-24 mb-1" />
      <Skeleton className="h-4 w-20" />
    </Card>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-kpi-title">AI Performance Dashboard</h1>
          <p className="text-muted-foreground text-sm">Track AI-generated leads, conversations, and outreach performance</p>
        </div>
        <Badge variant="outline">
          <Activity className="w-3 h-3 mr-1.5" />
          Real-time Metrics
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiStatCard
              title="Total Leads"
              value={kpi?.overview.totalLeads ?? 0}
              subtitle={`${kpi?.overview.aiGeneratedLeads ?? 0} AI-generated`}
              icon={Users}
              color="bg-chart-1/10 text-chart-1"
              testId="stat-total-leads"
            />
            <KpiStatCard
              title="AI Conversations"
              value={kpi?.overview.totalConversations ?? 0}
              subtitle={`${kpi?.overview.totalAiResponses ?? 0} AI responses`}
              icon={MessageSquare}
              color="bg-chart-2/10 text-chart-2"
              testId="stat-conversations"
            />
            <KpiStatCard
              title="Conversion Rate"
              value={`${kpi?.overview.conversionRate ?? 0}%`}
              subtitle="Leads progressing to warm/hot/qualified"
              icon={TrendingUp}
              color="bg-chart-2/10 text-chart-2"
              testId="stat-conversion-rate"
            />
            <KpiStatCard
              title="Active AI Agents"
              value={kpi?.agents.active ?? 0}
              subtitle={`${kpi?.agents.total ?? 0} total configured`}
              icon={Bot}
              color="bg-chart-3/10 text-chart-3"
              testId="stat-active-agents"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiStatCard
              title="Outreach Sent"
              value={kpi?.outreach.totalOutreached ?? 0}
              subtitle={`${kpi?.outreach.followUpsActive ?? 0} follow-ups active`}
              icon={Mail}
              color="bg-chart-5/10 text-chart-5"
              testId="stat-outreach-sent"
            />
            <KpiStatCard
              title="Open Rate"
              value={`${kpi?.outreach.openRate ?? 0}%`}
              subtitle={`${kpi?.outreach.totalOpens ?? 0} total opens`}
              icon={Eye}
              color="bg-chart-4/10 text-chart-4"
              testId="stat-open-rate"
            />
            <KpiStatCard
              title="Click Rate"
              value={`${kpi?.outreach.clickRate ?? 0}%`}
              subtitle={`${kpi?.outreach.totalClicks ?? 0} total clicks`}
              icon={MousePointerClick}
              color="bg-destructive/10 text-destructive"
              testId="stat-click-rate"
            />
            <KpiStatCard
              title="Response Rate"
              value={`${kpi?.outreach.responseRate ?? 0}%`}
              subtitle={`${kpi?.outreach.totalEngaged ?? 0} engaged leads`}
              icon={Target}
              color="bg-chart-3/10 text-chart-3"
              testId="stat-response-rate"
            />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold" data-testid="text-leads-trend-title">Lead Generation Trend</h3>
            </div>
            <Badge variant="outline" className="text-xs">Last 14 days</Badge>
          </div>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : kpi?.leadsTrend ? (
            <MiniBarChart data={kpi.leadsTrend} />
          ) : (
            <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">No trend data</div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold" data-testid="text-agents-title">AI Agents</h3>
            </div>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          ) : kpi?.agents.byType && Object.keys(kpi.agents.byType).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(kpi.agents.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between gap-4" data-testid={`agent-type-${type.toLowerCase().replace(/\s+/g, "-")}`}>
                  <span className="text-sm" data-testid={`agent-type-label-${type.toLowerCase().replace(/\s+/g, "-")}`}>{type}</span>
                  <Badge variant="secondary" data-testid={`agent-type-count-${type.toLowerCase().replace(/\s+/g, "-")}`}>{count}</Badge>
                </div>
              ))}
              <div className="border-t border-border/50 pt-3 mt-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium">Active</span>
                  <span className="text-sm font-bold text-chart-2" data-testid="text-agents-active-count">{kpi.agents.active} / {kpi.agents.total}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <Bot className="w-6 h-6 mx-auto mb-2 opacity-50" />
              No agents configured
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold" data-testid="text-status-breakdown-title">Lead Status Breakdown</h3>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <BreakdownList
              data={kpi?.breakdown.byStatus || {}}
              colorFn={(key, _i) => statusColors[key] || "bg-primary"}
              testId="breakdown-status"
            />
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold" data-testid="text-source-breakdown-title">Lead Sources</h3>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <BreakdownList
              data={kpi?.breakdown.bySource || {}}
              colorFn={(_, i) => sourceColors[(typeof i === 'number' ? i : 0) % sourceColors.length]}
              testId="breakdown-source"
            />
          )}
        </Card>
      </div>
    </div>
  );
}
