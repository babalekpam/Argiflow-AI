import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Video,
  Clock,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Phone,
  Building2,
} from "lucide-react";
import type { Appointment } from "@shared/schema";

type EnrichedAppointment = Appointment & {
  leadEmail?: string | null;
  leadPhone?: string | null;
  leadCompany?: string | null;
};

function AppointmentStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const styles: Record<string, { class: string; icon: any }> = {
    scheduled: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
    completed: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    cancelled: { class: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
    pending: { class: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: AlertCircle },
  };
  const s = styles[status] || styles.scheduled;
  const Icon = s.icon;
  const statusLabels: Record<string, string> = {
    scheduled: t("appointments.statuses.scheduled"),
    completed: t("appointments.statuses.completed"),
    cancelled: t("appointments.statuses.cancelled"),
    pending: t("appointments.statuses.pending"),
  };
  return (
    <Badge className={s.class}>
      <Icon className="w-3 h-3 mr-1" />
      {statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function AppointmentCard({ apt, opaque }: { apt: EnrichedAppointment; opaque?: boolean }) {
  const d = new Date(apt.date);
  const hasContact = apt.leadEmail || apt.leadPhone || apt.leadCompany;

  return (
    <div
      className={`flex flex-col gap-2 p-4 rounded-md bg-background/50 ${opaque ? "opacity-70" : ""}`}
      data-testid={`apt-${apt.id}`}
    >
      <div className="flex items-center gap-4">
        <div className="w-16 text-center shrink-0">
          <p className="text-sm font-bold" data-testid={`apt-time-${apt.id}`}>
            {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
          </p>
          <p className="text-xs text-muted-foreground">
            {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" data-testid={`apt-name-${apt.id}`}>{apt.leadName}</p>
          <p className="text-xs text-muted-foreground">{apt.type}</p>
        </div>
        <AppointmentStatusBadge status={apt.status} />
        {!opaque && (
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" data-testid={`button-video-${apt.id}`}>
              <Video className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" data-testid={`button-more-${apt.id}`}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      {hasContact && (
        <div className="flex items-center gap-4 pl-20 flex-wrap">
          {apt.leadCompany && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid={`apt-company-${apt.id}`}>
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[200px]">{apt.leadCompany}</span>
            </span>
          )}
          {apt.leadEmail && (
            <a
              href={`mailto:${apt.leadEmail}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              data-testid={`apt-email-${apt.id}`}
            >
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[200px]">{apt.leadEmail}</span>
            </a>
          )}
          {apt.leadPhone && (
            <a
              href={`tel:${apt.leadPhone}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              data-testid={`apt-phone-${apt.id}`}
            >
              <Phone className="w-3 h-3 shrink-0" />
              <span>{apt.leadPhone}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  const { t } = useTranslation();
  usePageTitle(t("appointments.title"));
  const { data: appointments, isLoading } = useQuery<EnrichedAppointment[]>({
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
          <h1 className="text-2xl font-bold" data-testid="text-appointments-title">{t("appointments.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("appointments.subtitle")}
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
              <p className="text-sm text-muted-foreground">{t("appointments.total")}</p>
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
              <p className="text-sm text-muted-foreground">{t("appointments.upcoming")}</p>
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
              <p className="text-sm text-muted-foreground">{t("appointments.completed")}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-4" data-testid="text-upcoming-section">{t("appointments.upcomingAppointments")}</h3>
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
              {t("appointments.noUpcoming")}
            </div>
          ) : (
            upcoming.map((apt) => (
              <AppointmentCard key={apt.id} apt={apt} />
            ))
          )}
        </div>
      </Card>

      {past.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">{t("appointments.pastAppointments")}</h3>
          <div className="space-y-3">
            {past.map((apt) => (
              <AppointmentCard key={apt.id} apt={apt} opaque />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
