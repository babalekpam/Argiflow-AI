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
  MessagesSquare,
  Plus,
  Trash2,
  Send,
  Users,
  CheckCircle2,
  Clock,
  Facebook,
  Instagram,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Power,
  PowerOff,
  Globe,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type MetaAccount = {
  id: string;
  userId: string;
  platform: string;
  pageId: string;
  pageName: string;
  accessToken: string;
  isActive: boolean;
  createdAt: string;
};

type MetaMessage = {
  id: string;
  accountId: string;
  userId: string;
  senderId: string;
  recipientId: string;
  content: string;
  direction: string;
  status: string;
  createdAt: string;
};

function PlatformBadge({ platform }: { platform: string }) {
  const styles: Record<string, { class: string; icon: typeof Facebook }> = {
    facebook: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Facebook },
    instagram: { class: "bg-pink-500/10 text-pink-400 border-pink-500/20", icon: Instagram },
  };
  const s = styles[platform] || styles.facebook;
  const Icon = s.icon;
  return (
    <Badge className={s.class} data-testid={`badge-platform-${platform}`}>
      <Icon className="w-3 h-3 mr-1" />
      {platform.charAt(0).toUpperCase() + platform.slice(1)}
    </Badge>
  );
}

function MessageStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; icon: typeof Send }> = {
    sent: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Send },
    delivered: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    read: { class: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: CheckCircle2 },
  };
  const s = styles[status] || styles.sent;
  const Icon = s.icon;
  return (
    <Badge className={s.class} data-testid={`badge-msg-status-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function SendDMDialog({ accounts }: { accounts: MetaAccount[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ accountId: "", recipientId: "", content: "" });

  const mutation = useMutation({
    mutationFn: (data: { accountId: string; recipientId: string; content: string }) =>
      apiRequest("POST", "/api/meta/messages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/messages"] });
      toast({ title: "Direct message sent" });
      setOpen(false);
      setForm({ accountId: "", recipientId: "", content: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send DM", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const activeAccounts = accounts.filter((a) => a.isActive);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-send-dm">
          <Plus className="w-4 h-4 mr-2" />
          Send DM
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-send-dm">
        <DialogHeader>
          <DialogTitle>Send Direct Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>From Page *</Label>
            <Select value={form.accountId} onValueChange={(v) => set("accountId", v)}>
              <SelectTrigger data-testid="select-dm-account">
                <SelectValue placeholder="Select page" />
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={String(acc.id)}>
                    {acc.pageName} ({acc.platform})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Recipient ID *</Label>
            <Input
              value={form.recipientId}
              onChange={(e) => set("recipientId", e.target.value)}
              placeholder="User or Page ID"
              data-testid="input-dm-recipient-id"
            />
          </div>
          <div>
            <Label>Message *</Label>
            <Textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="Type your message..."
              data-testid="input-dm-content"
            />
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                accountId: form.accountId,
                recipientId: form.recipientId,
                content: form.content,
              })
            }
            disabled={!form.accountId || !form.recipientId || !form.content || mutation.isPending}
            data-testid="button-submit-dm"
          >
            <Send className="w-4 h-4 mr-2" />
            {mutation.isPending ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MetaDMsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<MetaAccount[]>({
    queryKey: ["/api/meta/accounts"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<MetaMessage[]>({
    queryKey: ["/api/meta/messages"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/meta/messages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/messages"] });
      toast({ title: "Message deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isLoading = accountsLoading || messagesLoading;

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const fbAccounts = accounts.filter((a) => a.platform === "facebook");
  const igAccounts = accounts.filter((a) => a.platform === "instagram");

  const getAccountPlatform = (accountId: string) => accountMap.get(accountId)?.platform || "unknown";

  const fbMessages = messages.filter((m) => getAccountPlatform(m.accountId) === "facebook");
  const igMessages = messages.filter((m) => getAccountPlatform(m.accountId) === "instagram");

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      !searchQuery ||
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.recipientId.includes(searchQuery) ||
      msg.senderId.includes(searchQuery);
    const platform = getAccountPlatform(msg.accountId);
    const matchesPlatform =
      platformFilter === "all" ||
      platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="meta-dms-loading">
        <Skeleton className="h-24 w-full rounded-md" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="meta-dms-page">
      <div className="rounded-md bg-gradient-to-r from-blue-600/20 via-pink-500/10 to-transparent p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-blue-500/20 flex items-center justify-center">
              <MessagesSquare className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">
                Meta Direct Messages
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage Facebook & Instagram conversations from one place
              </p>
            </div>
          </div>
          <SendDMDialog accounts={accounts} />
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-connected-pages">{accounts.length}</p>
              <p className="text-sm text-muted-foreground">Connected Pages</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-purple-500/10 flex items-center justify-center">
              <MessagesSquare className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-dms">{messages.length}</p>
              <p className="text-sm text-muted-foreground">Total DMs</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-600/10 flex items-center justify-center">
              <Facebook className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-fb-messages">{fbMessages.length}</p>
              <p className="text-sm text-muted-foreground">Facebook</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-pink-500/10 flex items-center justify-center">
              <Instagram className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-ig-messages">{igMessages.length}</p>
              <p className="text-sm text-muted-foreground">Instagram</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={platformFilter} onValueChange={setPlatformFilter}>
        <div className="flex items-center gap-3 flex-wrap">
          <TabsList data-testid="tabs-platform-filter">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="facebook" data-testid="tab-facebook">Facebook</TabsTrigger>
            <TabsTrigger value="instagram" data-testid="tab-instagram">Instagram</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-dms"
            />
          </div>
        </div>
      </Tabs>

      {accounts.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            Connected Accounts
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center gap-3 p-3 rounded-md bg-background/50"
                data-testid={`meta-account-${acc.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" data-testid={`text-account-name-${acc.id}`}>
                    {acc.pageName}
                  </p>
                  <p className="text-xs text-muted-foreground">Page ID: {acc.pageId}</p>
                </div>
                <PlatformBadge platform={acc.platform} />
                {acc.isActive ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    <Power className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                ) : (
                  <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">
                    <PowerOff className="w-3 h-3 mr-1" />
                    Inactive
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-semibold mb-4" data-testid="text-conversations-section">Conversations</h3>
        <div className="space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm" data-testid="text-no-messages">
              <MessagesSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No conversations found</p>
              <p className="text-xs mt-1">Send your first direct message to get started.</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const platform = getAccountPlatform(msg.accountId);
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-4 p-4 rounded-md ${
                    msg.direction === "outbound" ? "bg-blue-500/5" : "bg-emerald-500/5"
                  }`}
                  data-testid={`dm-${msg.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <PlatformBadge platform={platform} />
                      <MessageStatusBadge status={msg.status} />
                      {msg.direction === "outbound" ? (
                        <Badge variant="outline" className="text-xs">
                          <ArrowUpRight className="w-3 h-3 mr-1" />
                          Outbound
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <ArrowDownLeft className="w-3 h-3 mr-1" />
                          Inbound
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span>From: {msg.senderId}</span>
                      <span>To: {msg.recipientId}</span>
                    </div>
                    <p className="text-sm mt-2">{msg.content}</p>
                    {msg.createdAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(msg.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-dm-${msg.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
