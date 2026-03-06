import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  Bot,
  Video,
  MoreVertical,
  Flame,
  Activity,
  Zap,
} from "lucide-react";
import type { Lead, Appointment, DashboardStats } from "@shared/schema";
import { Link } from "wouter";

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
  accent,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: any;
  color: string;
  accent?: string;
}) {
  return (
    <Card className="p-5 relative overflow-hidden" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      {accent && <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold mb-0.5 font-mono">{value}</p>
      <p className="text-sm text-muted-foreground">{title}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>}
    </Card>
  );
}

function LeadStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    hot: "bg-red-500/10 text-red-400 border-red-500/20",
    warm: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    cold: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    qualified: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  return (
    <Badge className={styles[status] || styles.new}>
      {status.toUpperCase()}
    </Badge>
  );
}

function timeAgo(d: string | null) {
  if (!d) return "";
  const date = new Date(d);
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

type EnhancedStats = {
  leads_total: number;
  hot_leads: number;
  pipeline_stages: Array<{ label: string; count: number; pct: number; color: string }>;
  activity: Array<{ text: string; time: string; status: string }>;
  agent_health: Array<{ name: string; status: string; runs: number; rate: number; lastRun: string }>;
};

export default function DashboardPage() {
  const { t } = useTranslation();
  usePageTitle(t("dashboard.title"));

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: enhanced } = useQuery<EnhancedStats>({
    queryKey: ["/api/dashboard/enhanced-stats"],
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
            {t("common.aiActive")}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-10 w-10 rounded-md mb-3" />
              <Skeleton className="h-7 w-24 mb-1" />
              <Skeleton className="h-4 w-20" />
            </Card>
          ))
        ) : (
          <>
            <StatCard
              title={t("dashboard.totalLeads")}
              value={stats?.totalLeads?.toLocaleString() || "0"}
              sub={enhanced ? `${enhanced.hot_leads} hot leads` : undefined}
              icon={Users}
              color="bg-primary/10 text-primary"
              accent="#4B6CF7"
            />
            <StatCard
              title={t("dashboard.activeLeads")}
              value={stats?.activeLeads?.toLocaleString() || "0"}
              icon={TrendingUp}
              color="bg-chart-2/10 text-chart-2"
              accent="#0691A1"
            />
            <StatCard
              title={t("dashboard.appointments")}
              value={stats?.appointmentsBooked?.toLocaleString() || "0"}
              icon={Calendar}
              color="bg-chart-3/10 text-chart-3"
              accent="#E79109"
            />
            <StatCard
              title={t("dashboard.revenue")}
              value={`$${(stats?.revenue || 0).toLocaleString()}`}
              icon={DollarSign}
              color="bg-chart-4/10 text-chart-4"
              accent="#7B5BFB"
            />
          </>
        )}
      </div>

      {enhanced?.pipeline_stages && enhanced.pipeline_stages.length > 0 && (
        <Card className="p-5" data-testid="card-pipeline">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-sm">End-to-End Pipeline</h3>
              <p className="text-xs text-muted-foreground mt-1">Lead found → enriched → contacted → meeting</p>
            </div>
            <Link href="/dashboard/workflows">
              <Button variant="outline" size="sm" className="text-xs" data-testid="link-edit-flow">Edit Flow →</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {enhanced.pipeline_stages.map((stage, i) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: stage.color }} />
                    <span className="text-xs text-muted-foreground w-20">{stage.label}</span>
                    <span className="text-sm font-bold font-mono">{stage.count.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {i > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        ↓{enhanced.pipeline_stages[i - 1].count > 0
                          ? ((stage.count / enhanced.pipeline_stages[i - 1].count) * 100).toFixed(0)
                          : 0}%
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground font-mono w-8 text-right">{stage.pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${stage.pct}%`, background: stage.color, opacity: 0.7 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <h3 className="font-semibold" data-testid="text-recent-leads">{t("dashboard.recentLeads")}</h3>
            <Link href="/dashboard/leads">
              <Button variant="ghost" size="sm" data-testid="link-view-all-leads">
                {t("common.viewAll")}
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {leadsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-background/50">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-28 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-12" />
                </div>
              ))
            ) : (
              (leads || []).slice(0, 5).map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-background/50"
                  data-testid={`lead-item-${lead.id}`}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{t("dashboard.fromSource", { source: lead.source })}</p>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                </div>
              ))
            )}
            {!leadsLoading && (!leads || leads.length === 0) && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                {t("dashboard.noLeads")}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <h3 className="font-semibold" data-testid="text-upcoming-appointments">{t("dashboard.upcomingAppointments")}</h3>
            <Link href="/dashboard/appointments">
              <Button variant="ghost" size="sm" data-testid="link-view-all-appointments">
                {t("common.viewAll")}
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {appointmentsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-background/50">
                  <Skeleton className="w-14 h-12 rounded-md" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-28 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))
            ) : (
              (appointments || []).slice(0, 5).map((apt) => {
                const d = new Date(apt.date);
                const time = d.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                });
                const date = d.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
                return (
                  <div
                    key={apt.id}
                    className="flex items-center gap-3 p-3 rounded-md bg-background/50"
                    data-testid={`appointment-item-${apt.id}`}
                  >
                    <div className="w-14 text-center">
                      <p className="text-sm font-semibold">{time}</p>
                      <p className="text-xs text-muted-foreground">{date}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{apt.leadName}</p>
                      <p className="text-xs text-muted-foreground">{apt.type}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" data-testid={`button-video-${apt.id}`}>
                        <Video className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" data-testid={`button-more-${apt.id}`}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
            {!appointmentsLoading && (!appointments || appointments.length === 0) && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                {t("dashboard.noAppointments")}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {enhanced?.agent_health && enhanced.agent_health.length > 0 && (
          <Card className="p-5" data-testid="card-agent-health">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Agent Health</h3>
              <Link href="/dashboard/agent-console">
                <Button variant="outline" size="sm" className="text-xs" data-testid="link-manage-agents">Manage →</Button>
              </Link>
            </div>
            <div className="space-y-2">
              {enhanced.agent_health.map(ag => (
                <div key={ag.name} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30" data-testid={`agent-health-${ag.name}`}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="flex-1 text-xs font-medium truncate">{ag.name}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{ag.runs.toLocaleString()} runs</span>
                  <span className="text-xs font-bold text-emerald-500 font-mono">{ag.rate}%</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-5" data-testid="card-activity-feed">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <h3 className="font-semibold text-sm">{t("dashboard.aiActivityFeed")}</h3>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              {t("common.live")}
            </Badge>
          </div>
          {enhanced?.activity && enhanced.activity.length > 0 ? (
            <div className="space-y-2">
              {enhanced.activity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-secondary/20" data-testid={`activity-${i}`}>
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground line-clamp-2">{a.text}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">{timeAgo(a.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
              {t("dashboard.noActivity")}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
