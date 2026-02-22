import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  MessageSquare,
  Plus,
  Trash2,
  MessagesSquare,
  Settings,
  Circle,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ChatWidget = {
  id: string;
  name: string;
  greeting: string;
  position: string;
  color: string;
  status: string;
  conversations: number;
  createdAt: string;
};

function CreateChatWidgetDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    greeting: "Hi there! How can we help you?",
    position: "bottom-right",
    color: "#00E5FF",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/chat", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
      toast({ title: "Chat widget created" });
      setOpen(false);
      setForm({ name: "", greeting: "Hi there! How can we help you?", position: "bottom-right", color: "#00E5FF" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-chat-widget">
          <Plus className="w-4 h-4 mr-2" />
          Create Widget
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-chat-widget">
        <DialogHeader>
          <DialogTitle>Create Chat Widget</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Widget Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Website Chat"
              data-testid="input-chat-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Greeting Message</Label>
            <Input
              value={form.greeting}
              onChange={(e) => set("greeting", e.target.value)}
              placeholder="Hi there! How can we help?"
              data-testid="input-chat-greeting"
            />
          </div>
          <div className="space-y-2">
            <Label>Position</Label>
            <Select value={form.position} onValueChange={(v) => set("position", v)}>
              <SelectTrigger data-testid="select-chat-position">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                <SelectItem value="top-right">Top Right</SelectItem>
                <SelectItem value="top-left">Top Left</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Widget Color</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                className="w-12 p-1"
                data-testid="input-chat-color"
              />
              <Input
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
                placeholder="#00E5FF"
                data-testid="input-chat-color-hex"
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate({ ...form, status: "active", conversations: 0 })}
            disabled={!form.name || mutation.isPending}
            data-testid="button-save-chat-widget"
          >
            {mutation.isPending ? "Creating..." : "Create Widget"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ChatWidgetPage() {
  const { toast } = useToast();

  const { data: widgets, isLoading } = useQuery<ChatWidget[]>({
    queryKey: ["/api/chat"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/chat/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
      toast({ title: "Chat widget deleted" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="chat-widget-loading">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const list = widgets || [];

  return (
    <div className="p-6 space-y-6" data-testid="chat-widget-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Chat Widgets</h1>
            <p className="text-sm text-muted-foreground">Manage live chat widgets for your websites</p>
          </div>
        </div>
        <CreateChatWidgetDialog />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-widgets">{list.length}</p>
              <p className="text-sm text-muted-foreground">Total Widgets</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Circle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{list.filter((w) => w.status === "active").length}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-sky-500/10 flex items-center justify-center">
              <MessagesSquare className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{list.reduce((s, w) => s + (w.conversations || 0), 0)}</p>
              <p className="text-sm text-muted-foreground">Total Conversations</p>
            </div>
          </div>
        </Card>
      </div>

      {list.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground" data-testid="text-empty-state">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium mb-1">No chat widgets yet</p>
            <p className="text-sm">Create a chat widget to engage with your website visitors</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((widget) => (
            <Card key={widget.id} className="p-5" data-testid={`card-chat-widget-${widget.id}`}>
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: widget.color || "#00E5FF" }}
                  />
                  <h3 className="font-semibold truncate" data-testid={`text-widget-name-${widget.id}`}>{widget.name}</h3>
                </div>
                <Badge
                  className={widget.status === "active"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-gray-500/10 text-gray-400 border-gray-500/20"}
                >
                  {widget.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3 truncate">
                {widget.greeting}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <MessagesSquare className="w-3.5 h-3.5" />
                  {widget.conversations || 0} conversations
                </span>
                <span className="flex items-center gap-1">
                  <Settings className="w-3.5 h-3.5" />
                  {widget.position}
                </span>
              </div>
              <div className="flex items-center justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(widget.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-widget-${widget.id}`}
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}