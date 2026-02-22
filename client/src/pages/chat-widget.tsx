import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MessageSquare,
  Plus,
  Trash2,
  MessagesSquare,
  Bot,
  Code,
  Copy,
  Search,
  AlertTriangle,
  Circle,
  Eye,
  Power,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ChatWidget = {
  id: string;
  userId: string;
  name: string;
  settings: any;
  welcomeMessage: string | null;
  offlineMessage: string | null;
  botEnabled: boolean;
  botFlows: any;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ChatConversation = {
  id: string;
  widgetId: string;
  userId: string | null;
  visitorName: string | null;
  visitorEmail: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function ChatWidgetPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "inactive">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatWidget | null>(null);
  const [embedTarget, setEmbedTarget] = useState<ChatWidget | null>(null);
  const [convTarget, setConvTarget] = useState<ChatWidget | null>(null);
  const [form, setForm] = useState({
    name: "",
    welcomeMessage: "Hi there! How can we help you today?",
    offlineMessage: "We're currently offline. Leave a message and we'll get back to you.",
    botEnabled: false,
  });

  const { data: widgets, isLoading } = useQuery<ChatWidget[]>({
    queryKey: ["/api/chat/widgets"],
  });

  const { data: conversations } = useQuery<ChatConversation[]>({
    queryKey: ["/api/chat/widgets", convTarget?.id, "conversations"],
    enabled: !!convTarget,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/chat/widgets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/widgets"] });
      toast({ title: "Chat widget created" });
      setCreateOpen(false);
      setForm({
        name: "",
        welcomeMessage: "Hi there! How can we help you today?",
        offlineMessage: "We're currently offline. Leave a message and we'll get back to you.",
        botEnabled: false,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/chat/widgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/widgets"] });
      toast({ title: "Widget deleted" });
      setDeleteTarget(null);
    },
  });

  const toggleBotMutation = useMutation({
    mutationFn: ({ id, botEnabled }: { id: string; botEnabled: boolean }) =>
      apiRequest("PATCH", `/api/chat/widgets/${id}`, { botEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/widgets"] });
      toast({ title: "Bot setting updated" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/chat/widgets/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/widgets"] });
      toast({ title: "Widget status updated" });
    },
  });

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const getEmbedCode = (widget: ChatWidget) =>
    `<script src="${window.location.origin}/widget/${widget.id}.js" async></script>`;

  const copyEmbed = (widget: ChatWidget) => {
    navigator.clipboard.writeText(getEmbedCode(widget));
    toast({ title: "Embed code copied to clipboard" });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="chat-widget-loading">
        <Skeleton className="h-20 w-full" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const list = widgets || [];
  const filtered = list
    .filter((w) => tab === "all" || w.status === tab)
    .filter((w) => !search || w.name.toLowerCase().includes(search.toLowerCase()));

  const activeCount = list.filter((w) => w.status === "active").length;
  const botEnabledCount = list.filter((w) => w.botEnabled).length;

  const tabs = [
    { key: "all", label: "All", count: list.length },
    { key: "active", label: "Active", count: activeCount },
    { key: "inactive", label: "Inactive", count: list.length - activeCount },
  ] as const;

  return (
    <div className="p-6 space-y-6" data-testid="chat-widget-page">
      <div className="rounded-md bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-cyan-500/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Live Chat & Bot Builder</h1>
              <p className="text-sm text-muted-foreground">Manage chat widgets, automated bots, and visitor conversations</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-chat-widget">
            <Plus className="w-4 h-4 mr-2" />
            Create Widget
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
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
              <p className="text-2xl font-bold" data-testid="text-active-widgets">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-purple-500/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-bot-enabled">{botEnabledCount}</p>
              <p className="text-sm text-muted-foreground">Bot Enabled</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-sky-500/10 flex items-center justify-center">
              <MessagesSquare className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-conversations">--</p>
              <p className="text-sm text-muted-foreground">Conversations</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {tabs.map((t) => (
            <Button
              key={t.key}
              variant={tab === t.key ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(t.key)}
              data-testid={`tab-${t.key}`}
            >
              {t.label} ({t.count})
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search widgets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
            data-testid="input-search-widgets"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12">
          <div className="text-center" data-testid="text-empty-state">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-1">
              {list.length === 0 ? "No chat widgets yet" : "No widgets match your filters"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {list.length === 0 ? "Create a chat widget to engage with your website visitors in real-time" : "Try adjusting your filters"}
            </p>
            {list.length === 0 && (
              <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-widget">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Widget
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((widget) => (
            <Card key={widget.id} className="p-5" data-testid={`card-widget-${widget.id}`}>
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <h3 className="font-semibold truncate" data-testid={`text-widget-name-${widget.id}`}>{widget.name}</h3>
                <Badge
                  className={widget.status === "active"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-gray-500/10 text-gray-400 border-gray-500/20"}
                  data-testid={`badge-widget-status-${widget.id}`}
                >
                  {widget.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>

              {widget.welcomeMessage && (
                <p className="text-xs text-muted-foreground mb-2 truncate" data-testid={`text-welcome-${widget.id}`}>
                  {widget.welcomeMessage}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" />
                  Bot: {widget.botEnabled ? "On" : "Off"}
                </span>
              </div>

              <div className="flex items-center gap-2 border-t pt-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Bot</Label>
                  <Switch
                    checked={widget.botEnabled}
                    onCheckedChange={(checked) =>
                      toggleBotMutation.mutate({ id: widget.id, botEnabled: checked })
                    }
                    data-testid={`switch-bot-${widget.id}`}
                  />
                </div>
                <div className="flex-1" />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    toggleStatusMutation.mutate({
                      id: widget.id,
                      status: widget.status === "active" ? "inactive" : "active",
                    })
                  }
                  data-testid={`button-toggle-status-${widget.id}`}
                >
                  <Power className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setConvTarget(widget)}
                  data-testid={`button-conversations-${widget.id}`}
                >
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEmbedTarget(widget)}
                  data-testid={`button-embed-${widget.id}`}
                >
                  <Code className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeleteTarget(widget)}
                  data-testid={`button-delete-widget-${widget.id}`}
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
              <Label>Welcome Message</Label>
              <Textarea
                value={form.welcomeMessage}
                onChange={(e) => set("welcomeMessage", e.target.value)}
                placeholder="Hi there! How can we help?"
                data-testid="input-chat-welcome"
              />
            </div>
            <div className="space-y-2">
              <Label>Offline Message</Label>
              <Textarea
                value={form.offlineMessage}
                onChange={(e) => set("offlineMessage", e.target.value)}
                placeholder="We're currently offline..."
                data-testid="input-chat-offline"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Enable Bot</Label>
              <Switch
                checked={form.botEnabled}
                onCheckedChange={(checked) => set("botEnabled", checked)}
                data-testid="switch-chat-bot"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  name: form.name,
                  welcomeMessage: form.welcomeMessage,
                  offlineMessage: form.offlineMessage,
                  botEnabled: form.botEnabled,
                  status: "active",
                })
              }
              disabled={!form.name || createMutation.isPending}
              data-testid="button-save-chat-widget"
            >
              {createMutation.isPending ? "Creating..." : "Create Widget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!embedTarget} onOpenChange={() => setEmbedTarget(null)}>
        <DialogContent data-testid="dialog-embed-code">
          <DialogHeader>
            <DialogTitle>Embed Code - {embedTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add this code to your website to display the chat widget:
            </p>
            <div className="relative">
              <pre className="p-4 rounded-md bg-muted text-xs overflow-x-auto">
                {embedTarget && getEmbedCode(embedTarget)}
              </pre>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => embedTarget && copyEmbed(embedTarget)}
                data-testid="button-copy-embed"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!convTarget} onOpenChange={() => setConvTarget(null)}>
        <DialogContent className="sm:max-w-2xl" data-testid="dialog-conversations">
          <DialogHeader>
            <DialogTitle>Conversations - {convTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-auto">
            {!conversations || conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessagesSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversations.map((conv) => (
                    <TableRow key={conv.id} data-testid={`row-conversation-${conv.id}`}>
                      <TableCell className="text-sm">{conv.visitorName || "Anonymous"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{conv.visitorEmail || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{conv.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(conv.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent data-testid="dialog-delete-widget-confirmation">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Widget
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? All conversations will also be removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-widget"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
