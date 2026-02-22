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
  MessageCircle,
  Plus,
  Trash2,
  Send,
  Phone,
  CheckCircle2,
  Clock,
  XCircle,
  Smartphone,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  Power,
  PowerOff,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type WhatsAppAccount = {
  id: string;
  userId: string;
  phoneNumber: string;
  displayName: string;
  provider: string;
  isActive: boolean;
  createdAt: string;
};

type WhatsAppMessage = {
  id: string;
  accountId: string;
  userId: string;
  toNumber: string;
  fromNumber: string;
  content: string;
  direction: string;
  status: string;
  createdAt: string;
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; icon: typeof Send }> = {
    sent: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Send },
    delivered: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    read: { class: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: Eye },
    failed: { class: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
  };
  const s = styles[status] || styles.sent;
  const Icon = s.icon;
  return (
    <Badge className={s.class} data-testid={`badge-status-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function DirectionBadge({ direction }: { direction: string }) {
  if (direction === "outbound") {
    return (
      <Badge variant="outline" className="text-xs bg-blue-500/5 text-blue-400 border-blue-500/20" data-testid={`badge-direction-${direction}`}>
        <ArrowUpRight className="w-3 h-3 mr-1" />
        Outbound
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs bg-emerald-500/5 text-emerald-400 border-emerald-500/20" data-testid={`badge-direction-${direction}`}>
      <ArrowDownLeft className="w-3 h-3 mr-1" />
      Inbound
    </Badge>
  );
}

function SendMessageDialog({ accounts }: { accounts: WhatsAppAccount[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ accountId: "", toNumber: "", content: "" });

  const mutation = useMutation({
    mutationFn: (data: { accountId: string; toNumber: string; content: string }) =>
      apiRequest("POST", "/api/whatsapp/messages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/messages"] });
      toast({ title: "Message sent successfully" });
      setOpen(false);
      setForm({ accountId: "", toNumber: "", content: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send message", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const activeAccounts = accounts.filter((a) => a.isActive);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-send-message">
          <Plus className="w-4 h-4 mr-2" />
          Send Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-send-message">
        <DialogHeader>
          <DialogTitle>Send WhatsApp Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>From Account *</Label>
            <Select value={form.accountId} onValueChange={(v) => set("accountId", v)}>
              <SelectTrigger data-testid="select-message-account">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={String(acc.id)}>
                    {acc.displayName} ({acc.phoneNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>To Phone Number *</Label>
            <Input
              value={form.toNumber}
              onChange={(e) => set("toNumber", e.target.value)}
              placeholder="+1 555-0123"
              data-testid="input-message-to-number"
            />
          </div>
          <div>
            <Label>Message Content *</Label>
            <Textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="Type your message..."
              data-testid="input-message-content"
            />
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                accountId: form.accountId,
                toNumber: form.toNumber,
                content: form.content,
              })
            }
            disabled={!form.accountId || !form.toNumber || !form.content || mutation.isPending}
            data-testid="button-submit-message"
          >
            <Send className="w-4 h-4 mr-2" />
            {mutation.isPending ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WhatsAppPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<WhatsAppAccount[]>({
    queryKey: ["/api/whatsapp/accounts"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<WhatsAppMessage[]>({
    queryKey: ["/api/whatsapp/messages"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/whatsapp/messages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/messages"] });
      toast({ title: "Message deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isLoading = accountsLoading || messagesLoading;

  const sentCount = messages.filter((m) => m.direction === "outbound").length;
  const deliveredCount = messages.filter((m) => m.status === "delivered").length;
  const readCount = messages.filter((m) => m.status === "read").length;
  const readRate = sentCount > 0 ? ((readCount / sentCount) * 100).toFixed(1) : "0.0";

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      !searchQuery ||
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.toNumber.includes(searchQuery) ||
      msg.fromNumber.includes(searchQuery);
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "outbound" && msg.direction === "outbound") ||
      (activeTab === "inbound" && msg.direction === "inbound") ||
      (activeTab === "failed" && msg.status === "failed");
    const matchesAccount = selectedAccountId === null || msg.accountId === selectedAccountId;
    return matchesSearch && matchesTab && matchesAccount;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="whatsapp-loading">
        <Skeleton className="h-24 w-full rounded-md" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="whatsapp-page">
      <div className="rounded-md bg-gradient-to-r from-emerald-600/20 via-emerald-500/10 to-transparent p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-emerald-500/20 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">
                WhatsApp Business Messaging
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage accounts, send messages, and track delivery across WhatsApp
              </p>
            </div>
          </div>
          <SendMessageDialog accounts={accounts} />
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-accounts">{accounts.length}</p>
              <p className="text-sm text-muted-foreground">Accounts</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-messages-sent">{sentCount}</p>
              <p className="text-sm text-muted-foreground">Messages Sent</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-cyan-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-delivered-count">{deliveredCount}</p>
              <p className="text-sm text-muted-foreground">Delivered</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-purple-500/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-read-rate">{readRate}%</p>
              <p className="text-sm text-muted-foreground">Read Rate</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-1">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            Connected Accounts
          </h3>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm" data-testid="text-no-accounts">
              <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No WhatsApp accounts connected yet.
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                    selectedAccountId === acc.id
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : "bg-background/50"
                  }`}
                  onClick={() => setSelectedAccountId(selectedAccountId === acc.id ? null : acc.id)}
                  data-testid={`account-${acc.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`text-account-name-${acc.id}`}>
                      {acc.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">{acc.phoneNumber}</p>
                    <p className="text-xs text-muted-foreground capitalize">{acc.provider}</p>
                  </div>
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
          )}
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-messages"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList data-testid="tabs-message-filter">
              <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
              <TabsTrigger value="outbound" data-testid="tab-outbound">Outbound</TabsTrigger>
              <TabsTrigger value="inbound" data-testid="tab-inbound">Inbound</TabsTrigger>
              <TabsTrigger value="failed" data-testid="tab-failed">Failed</TabsTrigger>
            </TabsList>
          </Tabs>

          <Card className="p-5">
            <h3 className="font-semibold mb-4" data-testid="text-messages-section">
              Message Thread
              {selectedAccountId !== null && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (Filtered by account)
                </span>
              )}
            </h3>
            <div className="space-y-3">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm" data-testid="text-no-messages">
                  <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No messages found</p>
                  <p className="text-xs mt-1">Send your first WhatsApp message to get started.</p>
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-4 p-4 rounded-md ${
                      msg.direction === "outbound" ? "bg-blue-500/5" : "bg-emerald-500/5"
                    }`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <DirectionBadge direction={msg.direction} />
                        <StatusBadge status={msg.status} />
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        {msg.direction === "outbound" ? (
                          <span data-testid={`text-message-to-${msg.id}`}>To: {msg.toNumber}</span>
                        ) : (
                          <span>From: {msg.fromNumber}</span>
                        )}
                      </div>
                      <p className="text-sm mt-2" data-testid={`text-message-content-${msg.id}`}>
                        {msg.content}
                      </p>
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
                      data-testid={`button-delete-message-${msg.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
