import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Calendar,
  Video,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Phone,
  Building2,
  Plus,
  Trash2,
  StickyNote,
  Globe,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Appointment } from "@shared/schema";

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

function SourceBadge({ source }: { source: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className="text-xs">
      <Globe className="w-3 h-3 mr-1" />
      {t(`appointments.sources.${source}`, source)}
    </Badge>
  );
}

function AppointmentCard({
  apt,
  opaque,
  onDelete,
  onStatusChange,
}: {
  apt: Appointment;
  opaque?: boolean;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const d = new Date(apt.date);
  const hasContact = apt.email || apt.phone || apt.company;

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
        {apt.source && <SourceBadge source={apt.source} />}
        <div className="flex items-center gap-1">
          {apt.status === "scheduled" && (
            <>
              <Button
                size="icon"
                variant="ghost"
                data-testid={`button-complete-${apt.id}`}
                onClick={() => onStatusChange(apt.id, "completed")}
                title="Mark completed"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                data-testid={`button-cancel-${apt.id}`}
                onClick={() => onStatusChange(apt.id, "cancelled")}
                title="Cancel"
              >
                <XCircle className="w-4 h-4 text-red-400" />
              </Button>
            </>
          )}
          <Button
            size="icon"
            variant="ghost"
            data-testid={`button-delete-${apt.id}`}
            onClick={() => onDelete(apt.id)}
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {(hasContact || apt.notes) && (
        <div className="flex items-center gap-4 pl-20 flex-wrap">
          {apt.company && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid={`apt-company-${apt.id}`}>
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[200px]">{apt.company}</span>
            </span>
          )}
          {apt.email && (
            <a
              href={`mailto:${apt.email}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover-elevate transition-colors"
              data-testid={`apt-email-${apt.id}`}
            >
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[200px]">{apt.email}</span>
            </a>
          )}
          {apt.phone && (
            <a
              href={`tel:${apt.phone}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover-elevate transition-colors"
              data-testid={`apt-phone-${apt.id}`}
            >
              <Phone className="w-3 h-3 shrink-0" />
              <span>{apt.phone}</span>
            </a>
          )}
          {apt.notes && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid={`apt-notes-${apt.id}`}>
              <StickyNote className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[300px]">{apt.notes}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AddAppointmentDialog({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    leadName: "",
    email: "",
    phone: "",
    company: "",
    type: "Discovery Call",
    date: "",
    time: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const dateTime = new Date(`${form.date}T${form.time}`);
      return apiRequest("POST", "/api/appointments", {
        leadName: form.leadName,
        email: form.email || null,
        phone: form.phone || null,
        company: form.company || null,
        type: form.type,
        date: dateTime.toISOString(),
        notes: form.notes || null,
        source: "manual",
        status: "scheduled",
      });
    },
    onSuccess: () => {
      toast({ title: t("appointments.addSuccess") });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setOpen(false);
      setForm({ leadName: "", email: "", phone: "", company: "", type: "Discovery Call", date: "", time: "", notes: "" });
      onSuccess();
    },
    onError: () => {
      toast({ title: t("appointments.addError"), variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-appointment">
          <Plus className="w-4 h-4 mr-2" />
          {t("appointments.addNew")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("appointments.addNew")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("appointments.form.name")} *</Label>
            <Input
              value={form.leadName}
              onChange={(e) => set("leadName", e.target.value)}
              placeholder="John Smith"
              data-testid="input-apt-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("appointments.form.email")}</Label>
              <Input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="john@example.com"
                data-testid="input-apt-email"
              />
            </div>
            <div>
              <Label>{t("appointments.form.phone")}</Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 555-0123"
                data-testid="input-apt-phone"
              />
            </div>
          </div>
          <div>
            <Label>{t("appointments.form.company")}</Label>
            <Input
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
              placeholder="Acme Corp"
              data-testid="input-apt-company"
            />
          </div>
          <div>
            <Label>{t("appointments.form.type")} *</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger data-testid="select-apt-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Discovery Call">Discovery Call</SelectItem>
                <SelectItem value="Strategy Session">Strategy Session</SelectItem>
                <SelectItem value="Sales Call">Sales Call</SelectItem>
                <SelectItem value="Demo Call">Demo Call</SelectItem>
                <SelectItem value="Consultation">Consultation</SelectItem>
                <SelectItem value="Follow-Up Call">Follow-Up Call</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("appointments.form.date")} *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                data-testid="input-apt-date"
              />
            </div>
            <div>
              <Label>{t("appointments.form.time")} *</Label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => set("time", e.target.value)}
                data-testid="input-apt-time"
              />
            </div>
          </div>
          <div>
            <Label>{t("appointments.form.notes")}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder={t("appointments.form.notesPlaceholder")}
              data-testid="input-apt-notes"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={!form.leadName || !form.date || !form.time || mutation.isPending}
            data-testid="button-save-appointment"
          >
            {mutation.isPending ? t("appointments.saving") : t("appointments.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AppointmentsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  usePageTitle(t("appointments.title"));
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/appointments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: t("appointments.deleted") });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/appointments/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: t("appointments.updated") });
    },
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
        <AddAppointmentDialog onSuccess={() => {}} />
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
              <AppointmentCard
                key={apt.id}
                apt={apt}
                onDelete={(id) => deleteMutation.mutate(id)}
                onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              />
            ))
          )}
        </div>
      </Card>

      {past.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">{t("appointments.pastAppointments")}</h3>
          <div className="space-y-3">
            {past.map((apt) => (
              <AppointmentCard
                key={apt.id}
                apt={apt}
                opaque
                onDelete={(id) => deleteMutation.mutate(id)}
                onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
