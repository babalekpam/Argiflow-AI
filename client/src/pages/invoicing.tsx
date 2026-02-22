import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Receipt,
  Plus,
  Trash2,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Mail,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Invoice = {
  id: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  status: string;
  dueDate: string;
  invoiceNumber: string;
  createdAt: string;
};

function InvoiceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; icon: any }> = {
    draft: { class: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: Clock },
    sent: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Send },
    paid: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    overdue: { class: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertTriangle },
  };
  const s = styles[status] || styles.draft;
  const Icon = s.icon;
  return (
    <Badge className={s.class} data-testid={`badge-invoice-status-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function CreateInvoiceDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    amount: "",
    dueDate: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice created" });
      setOpen(false);
      setForm({ clientName: "", clientEmail: "", amount: "", dueDate: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-invoice">
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-invoice">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Client Name *</Label>
            <Input
              value={form.clientName}
              onChange={(e) => set("clientName", e.target.value)}
              placeholder="Acme Corp"
              data-testid="input-invoice-client-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Client Email *</Label>
            <Input
              type="email"
              value={form.clientEmail}
              onChange={(e) => set("clientEmail", e.target.value)}
              placeholder="billing@acme.com"
              data-testid="input-invoice-client-email"
            />
          </div>
          <div className="space-y-2">
            <Label>Amount ($) *</Label>
            <Input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="0.00"
              data-testid="input-invoice-amount"
            />
          </div>
          <div className="space-y-2">
            <Label>Due Date *</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              data-testid="input-invoice-due-date"
            />
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                clientName: form.clientName,
                clientEmail: form.clientEmail,
                amount: parseFloat(form.amount) || 0,
                dueDate: form.dueDate,
                status: "draft",
              })
            }
            disabled={!form.clientName || !form.clientEmail || !form.amount || !form.dueDate || mutation.isPending}
            data-testid="button-save-invoice"
          >
            {mutation.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InvoicingPage() {
  const { toast } = useToast();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice deleted" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/invoices/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice updated" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="invoicing-loading">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const list = invoices || [];
  const totalAmount = list.reduce((s, inv) => s + (inv.amount || 0), 0);
  const paidAmount = list.filter((i) => i.status === "paid").reduce((s, inv) => s + (inv.amount || 0), 0);
  const overdueAmount = list.filter((i) => i.status === "overdue").reduce((s, inv) => s + (inv.amount || 0), 0);

  return (
    <div className="p-6 space-y-6" data-testid="invoicing-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Receipt className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Invoicing</h1>
            <p className="text-sm text-muted-foreground">Create and manage invoices & payments</p>
          </div>
        </div>
        <CreateInvoiceDialog />
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-invoices">{list.length}</p>
              <p className="text-sm text-muted-foreground">Total Invoices</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-sky-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-amount">${totalAmount.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Billed</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">${paidAmount.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Paid</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">${overdueAmount.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </div>
        </Card>
      </div>

      {list.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground" data-testid="text-empty-state">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium mb-1">No invoices yet</p>
            <p className="text-sm">Create your first invoice to start billing clients</p>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">All Invoices</h3>
          <div className="space-y-3">
            {list.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-4 p-4 rounded-md bg-background/50 flex-wrap"
                data-testid={`card-invoice-${inv.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" data-testid={`text-invoice-client-${inv.id}`}>
                    {inv.clientName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {inv.clientEmail}
                    </span>
                    {inv.invoiceNumber && <span>#{inv.invoiceNumber}</span>}
                  </div>
                </div>
                <p className="text-lg font-bold" data-testid={`text-invoice-amount-${inv.id}`}>
                  ${(inv.amount || 0).toLocaleString()}
                </p>
                <div className="text-xs text-muted-foreground text-right">
                  <p>Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                </div>
                <InvoiceStatusBadge status={inv.status} />
                <div className="flex items-center gap-1">
                  {inv.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusMutation.mutate({ id: inv.id, status: "sent" })}
                      data-testid={`button-send-invoice-${inv.id}`}
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Send
                    </Button>
                  )}
                  {inv.status === "sent" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusMutation.mutate({ id: inv.id, status: "paid" })}
                      data-testid={`button-mark-paid-${inv.id}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Paid
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(inv.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-invoice-${inv.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}