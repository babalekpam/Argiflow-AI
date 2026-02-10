import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import type { Lead, Appointment, DashboardStats } from "@shared/schema";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
}) {
  return (
    <Card className="p-5" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold mb-0.5">{value}</p>
      <p className="text-sm text-muted-foreground">{title}</p>
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

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
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
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard Overview</h1>
          <p className="text-muted-foreground text-sm">Track your business performance at a glance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
            AI Active
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
              title="Total Leads"
              value={stats?.totalLeads?.toLocaleString() || "0"}
              icon={Users}
              color="bg-primary/10 text-primary"
            />
            <StatCard
              title="Active Leads"
              value={stats?.activeLeads?.toLocaleString() || "0"}
              icon={TrendingUp}
              color="bg-chart-2/10 text-chart-2"
            />
            <StatCard
              title="Appointments"
              value={stats?.appointmentsBooked?.toLocaleString() || "0"}
              icon={Calendar}
              color="bg-chart-3/10 text-chart-3"
            />
            <StatCard
              title="Revenue"
              value={`$${(stats?.revenue || 0).toLocaleString()}`}
              icon={DollarSign}
              color="bg-chart-4/10 text-chart-4"
            />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <h3 className="font-semibold" data-testid="text-recent-leads">Recent Leads</h3>
            <a href="/dashboard/leads">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </a>
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
                    <p className="text-xs text-muted-foreground">From {lead.source}</p>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                </div>
              ))
            )}
            {!leadsLoading && (!leads || leads.length === 0) && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No leads yet. Your AI agents will start generating them.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <h3 className="font-semibold" data-testid="text-upcoming-appointments">Upcoming Appointments</h3>
            <a href="/dashboard/appointments">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </a>
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
                      <Button size="icon" variant="ghost">
                        <Video className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost">
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
                No upcoming appointments.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h3 className="font-semibold">AI Activity Feed</h3>
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
            Live
          </Badge>
        </div>
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No activity yet. Your AI agents will log actions here.
        </div>
      </Card>
    </div>
  );
}
