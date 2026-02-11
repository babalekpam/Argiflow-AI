import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Video,
  Phone,
  Clock,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { Appointment } from "@shared/schema";

function AppointmentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; icon: any }> = {
    scheduled: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
    completed: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    cancelled: { class: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
    pending: { class: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: AlertCircle },
  };
  const s = styles[status] || styles.scheduled;
  const Icon = s.icon;
  return (
    <Badge className={s.class}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function AppointmentsPage() {
  usePageTitle("Appointments");
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const upcoming = (appointments || []).filter(
    (a) => a.status === "scheduled" && new Date(a.date) >= new Date()
  );
  const past = (appointments || []).filter(
    (a) => a.status !== "scheduled" || new Date(a.date) < new Date()
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-appointments-title">Appointments</h1>
          <p className="text-muted-foreground text-sm">
            Manage your schedule and upcoming calls.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-appointments">{appointments?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcoming.length}</p>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-chart-4/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {(appointments || []).filter((a) => a.status === "completed").length}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-4" data-testid="text-upcoming-section">Upcoming Appointments</h3>
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-md bg-background/50">
                <Skeleton className="w-16 h-14" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))
          ) : upcoming.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No upcoming appointments.
            </div>
          ) : (
            upcoming.map((apt) => {
              const d = new Date(apt.date);
              return (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 p-4 rounded-md bg-background/50"
                  data-testid={`upcoming-apt-${apt.id}`}
                >
                  <div className="w-16 text-center shrink-0">
                    <p className="text-sm font-bold">
                      {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{apt.leadName}</p>
                    <p className="text-xs text-muted-foreground">{apt.type}</p>
                  </div>
                  <AppointmentStatusBadge status={apt.status} />
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
        </div>
      </Card>

      {past.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Past Appointments</h3>
          <div className="space-y-3">
            {past.map((apt) => {
              const d = new Date(apt.date);
              return (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 p-4 rounded-md bg-background/50 opacity-70"
                  data-testid={`past-apt-${apt.id}`}
                >
                  <div className="w-16 text-center shrink-0">
                    <p className="text-sm font-bold">
                      {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{apt.leadName}</p>
                    <p className="text-xs text-muted-foreground">{apt.type}</p>
                  </div>
                  <AppointmentStatusBadge status={apt.status} />
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
