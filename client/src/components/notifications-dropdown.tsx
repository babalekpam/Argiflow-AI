import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, CheckCheck, Trash2, Bot, Zap, Info, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  type: string;
  agentType: string | null;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsData {
  notifications: Notification[];
  unreadCount: number;
}

const TYPE_ICONS: Record<string, typeof Bot> = {
  new_lead: Zap,
  system: Info,
  warning: AlertTriangle,
  action_required: AlertTriangle,
};

export function NotificationsDropdown() {
  const { data } = useQuery<NotificationsData>({
    queryKey: ["/api/notifications"],
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const unread = data?.unreadCount || 0;
  const notifications = data?.notifications || [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="relative" data-testid="button-notifications">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium" data-testid="badge-unread-count">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between gap-2 p-3 border-b border-border/50">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unread > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => markAllReadMutation.mutate()}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <Bell className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || Bot;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 p-3 border-b border-border/30 last:border-0 ${!n.isRead ? "bg-primary/5" : ""}`}
                    data-testid={`notification-${n.id}`}
                  >
                    <div className={`p-1.5 rounded-md shrink-0 ${n.priority === "high" ? "bg-destructive/10" : "bg-primary/10"}`}>
                      <Icon className={`w-3.5 h-3.5 ${n.priority === "high" ? "text-destructive" : "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {!n.isRead && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-6 h-6"
                          onClick={() => markReadMutation.mutate(n.id)}
                          data-testid={`button-mark-read-${n.id}`}
                        >
                          <CheckCheck className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-6 h-6"
                        onClick={() => deleteMutation.mutate(n.id)}
                        data-testid={`button-delete-notification-${n.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
