import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  CalendarClock,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  status: string;
};

function EventStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; icon: any }> = {
    upcoming: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
    past: { class: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: CheckCircle2 },
    cancelled: { class: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
  };
  const s = styles[status] || styles.upcoming;
  const Icon = s.icon;
  return (
    <Badge className={s.class} data-testid={`badge-event-status-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function CreateEventDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/calendar/events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event created" });
      setOpen(false);
      setForm({ title: "", description: "", startTime: "", endTime: "", location: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-event">
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-event">
        <DialogHeader>
          <DialogTitle>Create Calendar Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Team Meeting"
              data-testid="input-event-title"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Event description..."
              data-testid="input-event-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Time *</Label>
              <Input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                data-testid="input-event-start"
              />
            </div>
            <div>
              <Label>End Time *</Label>
              <Input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                data-testid="input-event-end"
              />
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Office / Zoom Link"
              data-testid="input-event-location"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate(form)}
            disabled={!form.title || !form.startTime || !form.endTime || mutation.isPending}
            data-testid="button-submit-event"
          >
            {mutation.isPending ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CalendarSyncPage() {
  const { toast } = useToast();

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/calendar/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const now = new Date();
  const upcoming = events.filter((e) => e.status !== "cancelled" && new Date(e.startTime) >= now);
  const pastOrCancelled = events.filter((e) => e.status === "cancelled" || new Date(e.startTime) < now);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="calendar-loading">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="calendar-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Calendar Events</h1>
            <p className="text-muted-foreground text-sm">Manage and sync your calendar events</p>
          </div>
        </div>
        <CreateEventDialog />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-events">{events.length}</p>
              <p className="text-sm text-muted-foreground">Total Events</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-upcoming-count">{upcoming.length}</p>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{events.filter((e) => e.status === "cancelled").length}</p>
              <p className="text-sm text-muted-foreground">Cancelled</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-4" data-testid="text-upcoming-section">Upcoming Events</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {upcoming.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground text-sm" data-testid="text-no-events">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No upcoming events. Create your first event.
            </div>
          ) : (
            upcoming
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .map((evt) => (
                <Card key={evt.id} className="p-4" data-testid={`event-${evt.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" data-testid={`text-event-title-${evt.id}`}>{evt.title}</p>
                      {evt.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{evt.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <EventStatusBadge status="upcoming" />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(evt.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-event-${evt.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 shrink-0" />
                      {new Date(evt.startTime).toLocaleString()} - {new Date(evt.endTime).toLocaleTimeString()}
                    </span>
                    {evt.location && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[200px]">{evt.location}</span>
                      </span>
                    )}
                  </div>
                </Card>
              ))
          )}
        </div>
      </Card>

      {pastOrCancelled.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Past & Cancelled Events</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {pastOrCancelled.map((evt) => (
              <Card key={evt.id} className="p-4 opacity-70" data-testid={`event-past-${evt.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{evt.title}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <EventStatusBadge status={evt.status === "cancelled" ? "cancelled" : "past"} />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(evt.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-event-past-${evt.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 shrink-0" />
                    {new Date(evt.startTime).toLocaleString()}
                  </span>
                  {evt.location && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {evt.location}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
