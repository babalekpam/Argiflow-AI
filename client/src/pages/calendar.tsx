import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ChevronLeft,
  ChevronRight,
  Video,
  Phone as PhoneIcon,
  Users,
  Link2,
  Presentation,
  Building2,
  List,
  LayoutGrid,
  CalendarRange,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

const EVENT_TYPES = {
  demo: { label: "Demo", color: "bg-violet-500", textColor: "text-violet-400", bgLight: "bg-violet-500/10", borderColor: "border-violet-500/20", icon: Presentation },
  meeting: { label: "Meeting", color: "bg-blue-500", textColor: "text-blue-400", bgLight: "bg-blue-500/10", borderColor: "border-blue-500/20", icon: Video },
  call: { label: "Call", color: "bg-emerald-500", textColor: "text-emerald-400", bgLight: "bg-emerald-500/10", borderColor: "border-emerald-500/20", icon: PhoneIcon },
  internal: { label: "Internal", color: "bg-amber-500", textColor: "text-amber-400", bgLight: "bg-amber-500/10", borderColor: "border-amber-500/20", icon: Building2 },
};

function getEventStyle(type: string) {
  return EVENT_TYPES[type as keyof typeof EVENT_TYPES] || EVENT_TYPES.meeting;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function CreateEventDialog({ defaultDate }: { defaultDate?: Date }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const getDefaultStartTime = () => {
    const d = defaultDate || new Date();
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const getDefaultEndTime = () => {
    const d = defaultDate || new Date();
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "meeting",
    startTime: getDefaultStartTime(),
    endTime: getDefaultEndTime(),
    location: "",
    meetingUrl: "",
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/calendar/events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event created successfully" });
      setOpen(false);
      setForm({ title: "", description: "", type: "meeting", startTime: getDefaultStartTime(), endTime: getDefaultEndTime(), location: "", meetingUrl: "" });
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
          Add Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-create-event">
        <DialogHeader>
          <DialogTitle>Create Calendar Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Team Meeting" data-testid="input-event-title" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger data-testid="select-event-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Event description..." data-testid="input-event-description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Time *</Label>
              <Input type="datetime-local" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} data-testid="input-event-start" />
            </div>
            <div>
              <Label>End Time *</Label>
              <Input type="datetime-local" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} data-testid="input-event-end" />
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Office / Conference Room" data-testid="input-event-location" />
          </div>
          <div>
            <Label>Meeting URL</Label>
            <Input value={form.meetingUrl} onChange={(e) => set("meetingUrl", e.target.value)} placeholder="https://zoom.us/j/..." data-testid="input-event-meeting-url" />
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

function EventTypeBadge({ type }: { type: string }) {
  const style = getEventStyle(type);
  const Icon = style.icon;
  return (
    <Badge className={`${style.bgLight} ${style.textColor} ${style.borderColor}`} data-testid={`badge-event-type-${type}`}>
      <Icon className="w-3 h-3 mr-1" />
      {style.label}
    </Badge>
  );
}

function MonthView({ events, currentDate }: { events: CalendarEvent[]; currentDate: Date }) {
  const { toast } = useToast();
  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/calendar/events/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/calendar/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event deleted" });
    },
  });

  const eventsForDay = (day: number) => {
    const date = new Date(year, month, day);
    return events.filter((e) => isSameDay(new Date(e.startTime), date));
  };

  const cells: { day: number; currentMonth: boolean }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, currentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, currentMonth: false });
    }
  }

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  return (
    <div className="space-y-4">
      <Card className="overflow-visible">
        <div className="grid grid-cols-7">
          {weekDays.map((d) => (
            <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground border-b border-border/50">
              {d}
            </div>
          ))}
          {cells.map((cell, idx) => {
            const isToday = cell.currentMonth && isSameDay(new Date(year, month, cell.day), today);
            const dayEvents = cell.currentMonth ? eventsForDay(cell.day) : [];
            const isSelected = cell.currentMonth && selectedDay === cell.day;

            return (
              <div
                key={idx}
                className={`min-h-[100px] p-1.5 border-b border-r border-border/30 cursor-pointer transition-colors
                  ${!cell.currentMonth ? "bg-muted/30" : ""}
                  ${isSelected ? "bg-primary/5 ring-1 ring-primary/30 ring-inset" : ""}
                  ${cell.currentMonth ? "hover-elevate" : ""}
                `}
                onClick={() => cell.currentMonth && setSelectedDay(cell.day === selectedDay ? null : cell.day)}
                data-testid={cell.currentMonth ? `calendar-day-${cell.day}` : undefined}
              >
                <div className={`flex items-center justify-center w-7 h-7 rounded-md text-sm mb-1
                  ${isToday ? "bg-primary text-primary-foreground font-bold" : ""}
                  ${!cell.currentMonth ? "text-muted-foreground/40" : "font-medium"}
                `}>
                  {cell.day}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((evt) => {
                    const style = getEventStyle(evt.type);
                    return (
                      <div
                        key={evt.id}
                        className={`text-[10px] leading-tight truncate rounded-sm px-1 py-0.5 ${style.bgLight} ${style.textColor}`}
                        title={evt.title}
                        data-testid={`event-dot-${evt.id}`}
                      >
                        {formatTime(evt.startTime)} {evt.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {selectedDay !== null && (
        <Card className="p-4" data-testid="selected-day-events">
          <h3 className="font-semibold mb-3" data-testid="text-selected-date">
            {new Date(year, month, selectedDay).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-day-events">No events scheduled</p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((evt) => (
                <div key={evt.id} className="flex items-start justify-between gap-3" data-testid={`event-detail-${evt.id}`}>
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className={`w-1 rounded-full shrink-0 ${getEventStyle(evt.type).color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate" data-testid={`text-event-title-${evt.id}`}>{evt.title}</span>
                        <EventTypeBadge type={evt.type} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatTime(evt.startTime)} - {formatTime(evt.endTime)}
                        </span>
                        {evt.location && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {evt.location}
                          </span>
                        )}
                        {evt.meetingUrl && (
                          <a href={evt.meetingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline" data-testid={`link-meeting-url-${evt.id}`}>
                            <Link2 className="w-3 h-3" />
                            Join
                          </a>
                        )}
                      </div>
                      {evt.description && <p className="text-xs text-muted-foreground mt-1">{evt.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {evt.status === "scheduled" && (
                      <Button size="icon" variant="ghost" onClick={() => statusMutation.mutate({ id: evt.id, status: "completed" })} data-testid={`button-complete-event-${evt.id}`}>
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(evt.id)} data-testid={`button-delete-event-${evt.id}`}>
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function WeekView({ events, currentDate }: { events: CalendarEvent[]; currentDate: Date }) {
  const { toast } = useToast();
  const today = new Date();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/calendar/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event deleted" });
    },
  });

  const startOfWeek = new Date(currentDate);
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  const getEventsForDayHour = (day: Date, hour: number) => {
    return events.filter((e) => {
      const start = new Date(e.startTime);
      return isSameDay(start, day) && start.getHours() === hour;
    });
  };

  return (
    <Card className="overflow-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-8 border-b border-border/50 sticky top-0 bg-card z-10">
          <div className="p-2 text-xs text-muted-foreground text-center border-r border-border/30" />
          {weekDays.map((d, i) => {
            const isToday = isSameDay(d, today);
            return (
              <div key={i} className={`p-2 text-center border-r border-border/30 ${isToday ? "bg-primary/5" : ""}`}>
                <div className="text-xs text-muted-foreground">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                <div className={`text-sm font-semibold mt-0.5 ${isToday ? "text-primary" : ""}`}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        {hours.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-border/20">
            <div className="p-2 text-xs text-muted-foreground text-right pr-3 border-r border-border/30">
              {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
            </div>
            {weekDays.map((day, i) => {
              const dayHourEvents = getEventsForDayHour(day, hour);
              return (
                <div key={i} className="min-h-[48px] p-0.5 border-r border-border/20">
                  {dayHourEvents.map((evt) => {
                    const style = getEventStyle(evt.type);
                    const startH = new Date(evt.startTime).getHours();
                    const endH = new Date(evt.endTime).getHours();
                    const span = Math.max(1, endH - startH);
                    return (
                      <div
                        key={evt.id}
                        className={`rounded-sm px-1.5 py-1 text-[10px] leading-tight ${style.bgLight} ${style.textColor} border ${style.borderColor}`}
                        style={{ minHeight: `${span * 48 - 4}px` }}
                        data-testid={`week-event-${evt.id}`}
                      >
                        <div className="font-semibold truncate">{evt.title}</div>
                        <div className="opacity-70">{formatTime(evt.startTime)}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

function ListView({ events }: { events: CalendarEvent[] }) {
  const { toast } = useToast();

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/calendar/events/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/calendar/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event deleted" });
    },
  });

  const sorted = [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const grouped = sorted.reduce<Record<string, CalendarEvent[]>>((acc, evt) => {
    const dateKey = new Date(evt.startTime).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(evt);
    return acc;
  }, {});

  if (sorted.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center py-12 text-muted-foreground text-sm" data-testid="text-no-events">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No events found</p>
          <p className="text-xs mt-1">Create your first event to get started.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([dateKey, dayEvents]) => (
        <div key={dateKey}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2" data-testid={`text-date-group-${dateKey}`}>{dateKey}</h3>
          <div className="space-y-2">
            {dayEvents.map((evt) => (
              <Card key={evt.id} className="p-4" data-testid={`event-${evt.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className={`w-1 rounded-full shrink-0 self-stretch ${getEventStyle(evt.type).color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm truncate" data-testid={`text-event-title-${evt.id}`}>{evt.title}</h4>
                        <EventTypeBadge type={evt.type} />
                        {evt.status === "completed" && (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Done
                          </Badge>
                        )}
                        {evt.status === "cancelled" && (
                          <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                            <XCircle className="w-3 h-3 mr-1" />
                            Cancelled
                          </Badge>
                        )}
                      </div>
                      {evt.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{evt.description}</p>}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 shrink-0" />
                          {formatTime(evt.startTime)} - {formatTime(evt.endTime)}
                        </span>
                        {evt.location && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[200px]">{evt.location}</span>
                          </span>
                        )}
                        {evt.meetingUrl && (
                          <a href={evt.meetingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 hover:underline" data-testid={`link-meeting-url-${evt.id}`}>
                            <Link2 className="w-3 h-3 shrink-0" />
                            Join Meeting
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {evt.status === "scheduled" && (
                      <Button size="icon" variant="ghost" onClick={() => statusMutation.mutate({ id: evt.id, status: "completed" })} data-testid={`button-complete-event-${evt.id}`}>
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                    {evt.status === "scheduled" && (
                      <Button size="icon" variant="ghost" onClick={() => statusMutation.mutate({ id: evt.id, status: "cancelled" })} data-testid={`button-cancel-event-${evt.id}`}>
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(evt.id)} data-testid={`button-delete-event-${evt.id}`}>
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "list">("month");

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
  });

  const navigateMonth = (direction: number) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (view === "week") {
        d.setDate(d.getDate() + direction * 7);
      } else {
        d.setMonth(d.getMonth() + direction);
      }
      return d;
    });
  };

  const goToToday = () => setCurrentDate(new Date());

  const monthLabel = currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const weekLabel = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }, [currentDate]);

  const demoCount = events.filter((e) => e.type === "demo").length;
  const meetingCount = events.filter((e) => e.type === "meeting").length;
  const callCount = events.filter((e) => e.type === "call").length;
  const internalCount = events.filter((e) => e.type === "internal").length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="calendar-loading">
        <Skeleton className="h-16 w-full rounded-md" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-[500px] w-full" />
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
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Calendar</h1>
              <p className="text-muted-foreground text-sm">Manage demos, meetings, calls & internal events</p>
            </div>
          </div>
          <CreateEventDialog />
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: "Demos", count: demoCount, style: EVENT_TYPES.demo },
          { label: "Meetings", count: meetingCount, style: EVENT_TYPES.meeting },
          { label: "Calls", count: callCount, style: EVENT_TYPES.call },
          { label: "Internal", count: internalCount, style: EVENT_TYPES.internal },
        ].map((item) => {
          const Icon = item.style.icon;
          return (
            <Card key={item.label} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-md ${item.style.bgLight} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${item.style.textColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid={`text-${item.label.toLowerCase()}-count`}>{item.count}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => navigateMonth(-1)} data-testid="button-prev-period">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center" data-testid="text-current-period">
            {view === "week" ? weekLabel : monthLabel}
          </h2>
          <Button size="icon" variant="ghost" onClick={() => navigateMonth(1)} data-testid="button-next-period">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
            Today
          </Button>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week" | "list")}>
          <TabsList data-testid="tabs-view-selector">
            <TabsTrigger value="month" data-testid="tab-month">
              <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
              Month
            </TabsTrigger>
            <TabsTrigger value="week" data-testid="tab-week">
              <CalendarRange className="w-3.5 h-3.5 mr-1.5" />
              Week
            </TabsTrigger>
            <TabsTrigger value="list" data-testid="tab-list">
              <List className="w-3.5 h-3.5 mr-1.5" />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "month" && <MonthView events={events} currentDate={currentDate} />}
      {view === "week" && <WeekView events={events} currentDate={currentDate} />}
      {view === "list" && <ListView events={events} />}
    </div>
  );
}
