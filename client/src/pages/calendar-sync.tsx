import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  CalendarClock,
  Search,
  Video,
  Phone as PhoneIcon,
  ListTodo,
  Bell,
  Users,
  Link2,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function safeJsonParse(val: string | null | undefined, fallback: any = []) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

type CalendarEvent = {
  id: string;
  userId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  meetingUrl: string;
  attendees: string | null;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

function EventTypeBadge({ type }: { type: string }) {
  const styles: Record<string, { class: string; icon: typeof CalendarDays }> = {
    meeting: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Video },
    call: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: PhoneIcon },
    task: { class: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: ListTodo },
    reminder: { class: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Bell },
  };
  const s = styles[type] || styles.meeting;
  const Icon = s.icon;
  return (
    <Badge className={s.class} data-testid={`badge-event-type-${type}`}>
      <Icon className="w-3 h-3 mr-1" />
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  );
}

function EventStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; icon: typeof Clock }> = {
    scheduled: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
    completed: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    cancelled: { class: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
  };
  const s = styles[status] || styles.scheduled;
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
    type: "meeting",
    startTime: "",
    endTime: "",
    location: "",
    meetingUrl: "",
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/calendar/events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event created successfully" });
      setOpen(false);
      setForm({ title: "", description: "", type: "meeting", startTime: "", endTime: "", location: "", meetingUrl: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create event", description: err.message, variant: "destructive" });
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
      <DialogContent className="sm:max-w-lg" data-testid="dialog-create-event">
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
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger data-testid="select-event-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
              </SelectContent>
            </Select>
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
              placeholder="Office / Conference Room"
              data-testid="input-event-location"
            />
          </div>
          <div>
            <Label>Meeting URL</Label>
            <Input
              value={form.meetingUrl}
              onChange={(e) => set("meetingUrl", e.target.value)}
              placeholder="https://zoom.us/j/..."
              data-testid="input-event-meeting-url"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate(form)}
            disabled={!form.title || !form.startTime || !form.endTime || mutation.isPending}
            data-testid="button-submit-event"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            {mutation.isPending ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CalendarSyncPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");

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

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/calendar/events/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const now = new Date();
  const upcomingEvents = events.filter((e) => e.status === "scheduled" && new Date(e.startTime) >= now);
  const pastEvents = events.filter((e) => e.status === "completed" || (e.status === "scheduled" && new Date(e.startTime) < now));
  const meetingCount = events.filter((e) => e.type === "meeting").length;
  const callCount = events.filter((e) => e.type === "call").length;

  const getFilteredEvents = () => {
    let filtered = events;
    if (activeTab === "upcoming") {
      filtered = upcomingEvents;
    } else if (activeTab === "past") {
      filtered = pastEvents;
    } else if (activeTab === "cancelled") {
      filtered = events.filter((e) => e.status === "cancelled");
    }
    if (searchQuery) {
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return filtered.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  };

  const filteredEvents = getFilteredEvents();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="calendar-loading">
        <Skeleton className="h-24 w-full rounded-md" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="calendar-page">
      <div className="rounded-md bg-gradient-to-r from-blue-600/20 via-purple-500/10 to-transparent p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-blue-500/20 flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">
                Calendar & Events
              </h1>
              <p className="text-muted-foreground text-sm">
                Schedule meetings, calls, tasks, and reminders
              </p>
            </div>
          </div>
          <CreateEventDialog />
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
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
              <p className="text-2xl font-bold" data-testid="text-upcoming-count">{upcomingEvents.length}</p>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Video className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-meetings-count">{meetingCount}</p>
              <p className="text-sm text-muted-foreground">Meetings</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-cyan-500/10 flex items-center justify-center">
              <PhoneIcon className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-calls-count">{callCount}</p>
              <p className="text-sm text-muted-foreground">Calls</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-event-filter">
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">Past</TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="cancelled" data-testid="tab-cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-events"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <Card className="p-5">
            <div className="text-center py-12 text-muted-foreground text-sm" data-testid="text-no-events">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No events found</p>
              <p className="text-xs mt-1">Create your first event to get started with scheduling.</p>
            </div>
          </Card>
        ) : (
          filteredEvents.map((evt) => (
            <Card key={evt.id} className="p-5" data-testid={`event-${evt.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4 flex-1 min-w-0">
                  <div className="flex flex-col items-center text-center shrink-0 w-14">
                    <span className="text-xs text-muted-foreground uppercase">
                      {new Date(evt.startTime).toLocaleDateString(undefined, { month: "short" })}
                    </span>
                    <span className="text-2xl font-bold">
                      {new Date(evt.startTime).getDate()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(evt.startTime).toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold truncate" data-testid={`text-event-title-${evt.id}`}>
                        {evt.title}
                      </h4>
                      <EventTypeBadge type={evt.type} />
                      <EventStatusBadge status={evt.status} />
                    </div>
                    {evt.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{evt.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 shrink-0" />
                        {new Date(evt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" - "}
                        {new Date(evt.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {evt.location && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[200px]">{evt.location}</span>
                        </span>
                      )}
                      {evt.meetingUrl && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Link2 className="w-3 h-3 shrink-0" />
                          <a
                            href={evt.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline truncate max-w-[200px]"
                            data-testid={`link-meeting-url-${evt.id}`}
                          >
                            Join Meeting
                          </a>
                        </span>
                      )}
                      {safeJsonParse(evt.attendees).length > 0 && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="w-3 h-3 shrink-0" />
                          {safeJsonParse(evt.attendees).length} attendee{safeJsonParse(evt.attendees).length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {evt.status === "scheduled" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusMutation.mutate({ id: evt.id, status: "completed" })}
                      disabled={statusMutation.isPending}
                      data-testid={`button-complete-event-${evt.id}`}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Complete
                    </Button>
                  )}
                  {evt.status === "scheduled" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => statusMutation.mutate({ id: evt.id, status: "cancelled" })}
                      disabled={statusMutation.isPending}
                      data-testid={`button-cancel-event-${evt.id}`}
                    >
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  )}
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
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
