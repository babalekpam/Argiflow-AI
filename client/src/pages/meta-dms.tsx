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
  XCircle,
  Facebook,
  Instagram,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type MetaAccount = {
  id: string;
  name: string;
  platform: string;
  status: string;
  pageId: string;
};

type MetaMessage = {
  id: string;
  accountId: string;
  recipientId: string;
  recipientName: string;
  body: string;
  direction: string;
  status: string;
  platform: string;
  createdAt: string;
};

function PlatformBadge({ platform }: { platform: string }) {
  const styles: Record<string, { class: string; icon: any }> = {
    facebook: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Facebook },
    instagram: { class: "bg-pink-500/10 text-pink-400 border-pink-500/20", icon: Instagram },
  };
  const s = styles[platform] || styles.facebook;
  const Icon = s.icon;
  return (
    <Badge className={s.class}>
      <Icon className="w-3 h-3 mr-1" />
      {platform.charAt(0).toUpperCase() + platform.slice(1)}
    </Badge>
  );
}

function MessageStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; icon: any }> = {
    delivered: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    sent: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Send },
    pending: { class: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
    failed: { class: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
  };
  const s = styles[status] || styles.pending;
  const Icon = s.icon;
  return (
    <Badge className={s.class}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function SendDMDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ recipientId: "", recipientName: "", body: "", platform: "facebook" });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/meta/messages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meta/messages"] });
      toast({ title: "Message sent" });
      setOpen(false);
      setForm({ recipientId: "", recipientName: "", body: "", platform: "facebook" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

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
            <Label>Platform *</Label>
            <Select value={form.platform} onValueChange={(v) => set("platform", v)}>
              <SelectTrigger data-testid="select-dm-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Recipient Name *</Label>
            <Input
              value={form.recipientName}
              onChange={(e) => set("recipientName", e.target.value)}
              placeholder="Jane Doe"
              data-testid="input-dm-recipient-name"
            />
          </div>
          <div>
            <Label>Recipient ID *</Label>
            <Input
              value={form.recipientId}
              onChange={(e) => set("recipientId", e.target.value)}
              placeholder="User ID"
              data-testid="input-dm-recipient-id"
            />
          </div>
          <div>
            <Label>Message *</Label>
            <Textarea
              value={form.body}
              onChange={(e) => set("body", e.target.value)}
              placeholder="Type your message..."
              data-testid="input-dm-body"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate(form)}
            disabled={!form.recipientId || !form.recipientName || !form.body || mutation.isPending}
            data-testid="button-submit-dm"
          >
            {mutation.isPending ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MetaDMsPage() {
  const { toast } = useToast();

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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="meta-dms-loading">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const fbCount = messages.filter((m) => m.platform === "facebook").length;
  const igCount = messages.filter((m) => m.platform === "instagram").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="meta-dms-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <MessagesSquare className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Meta DMs</h1>
            <p className="text-muted-foreground text-sm">Facebook & Instagram direct messages</p>
          </div>
        </div>
        <SendDMDialog />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-accounts">{accounts.length}</p>
              <p className="text-sm text-muted-foreground">Connected Accounts</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-600/10 flex items-center justify-center">
              <Facebook className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-fb-messages">{fbCount}</p>
              <p className="text-sm text-muted-foreground">Facebook Messages</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-pink-500/10 flex items-center justify-center">
              <Instagram className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-ig-messages">{igCount}</p>
              <p className="text-sm text-muted-foreground">Instagram Messages</p>
            </div>
          </div>
        </Card>
      </div>

      {accounts.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Connected Accounts</h3>
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-4 p-3 rounded-md bg-background/50" data-testid={`meta-account-${acc.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" data-testid={`text-account-name-${acc.id}`}>{acc.name}</p>
                  <p className="text-xs text-muted-foreground">Page ID: {acc.pageId}</p>
                </div>
                <PlatformBadge platform={acc.platform} />
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  {acc.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-semibold mb-4" data-testid="text-conversations-section">Conversations</h3>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm" data-testid="text-no-messages">
              <MessagesSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No conversations yet. Send your first DM.
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex items-center gap-4 p-3 rounded-md bg-background/50" data-testid={`dm-${msg.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium" data-testid={`text-dm-recipient-${msg.id}`}>{msg.recipientName}</p>
                    <PlatformBadge platform={msg.platform} />
                    <MessageStatusBadge status={msg.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{msg.body}</p>
                  {msg.createdAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {msg.direction === "outgoing" ? "Sent" : "Received"}
                </Badge>
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
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
