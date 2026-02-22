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
  MessageCircle,
  Plus,
  Trash2,
  Send,
  Phone,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type WhatsAppAccount = {
  id: string;
  name: string;
  phoneNumber: string;
  status: string;
};

type WhatsAppMessage = {
  id: string;
  accountId: string;
  to: string;
  body: string;
  status: string;
  createdAt: string;
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; icon: any }> = {
    delivered: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    sent: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Send },
    pending: { class: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
    failed: { class: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
    read: { class: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: CheckCircle2 },
  };
  const s = styles[status] || styles.pending;
  const Icon = s.icon;
  return (
    <Badge className={s.class} data-testid={`badge-status-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function SendMessageDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ to: "", body: "" });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/whatsapp/messages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/messages"] });
      toast({ title: "Message sent" });
      setOpen(false);
      setForm({ to: "", body: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

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
            <Label>Phone Number *</Label>
            <Input
              value={form.to}
              onChange={(e) => set("to", e.target.value)}
              placeholder="+1 555-0123"
              data-testid="input-message-to"
            />
          </div>
          <div>
            <Label>Message *</Label>
            <Textarea
              value={form.body}
              onChange={(e) => set("body", e.target.value)}
              placeholder="Type your message..."
              data-testid="input-message-body"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate({ to: form.to, body: form.body })}
            disabled={!form.to || !form.body || mutation.isPending}
            data-testid="button-submit-message"
          >
            {mutation.isPending ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WhatsAppPage() {
  const { toast } = useToast();

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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="whatsapp-loading">
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="whatsapp-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">WhatsApp Messaging</h1>
            <p className="text-muted-foreground text-sm">Manage WhatsApp accounts and messages</p>
          </div>
        </div>
        <SendMessageDialog />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-accounts">{accounts.length}</p>
              <p className="text-sm text-muted-foreground">Connected Accounts</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-messages">{messages.length}</p>
              <p className="text-sm text-muted-foreground">Total Messages</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-cyan-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{messages.filter((m) => m.status === "delivered").length}</p>
              <p className="text-sm text-muted-foreground">Delivered</p>
            </div>
          </div>
        </Card>
      </div>

      {accounts.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Connected Accounts</h3>
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-4 p-3 rounded-md bg-background/50" data-testid={`account-${acc.id}`}>
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" data-testid={`text-account-name-${acc.id}`}>{acc.name}</p>
                  <p className="text-xs text-muted-foreground">{acc.phoneNumber}</p>
                </div>
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  {acc.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-semibold mb-4" data-testid="text-messages-section">Message History</h3>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm" data-testid="text-no-messages">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No messages yet. Send your first WhatsApp message.
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex items-center gap-4 p-3 rounded-md bg-background/50" data-testid={`message-${msg.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium" data-testid={`text-message-to-${msg.id}`}>To: {msg.to}</p>
                    <StatusBadge status={msg.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{msg.body}</p>
                  {msg.createdAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
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
  );
}
