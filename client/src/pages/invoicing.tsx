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
  Receipt,
  Plus,
  Trash2,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Mail,
  Search,
  Building,
  X,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Invoice = {
  id: string;
  userId: string;
  invoiceNumber: string;
  type: string;
  contactName: string;
  contactEmail: string;
  contactCompany: string | null;
  issueDate: string;
  dueDate: string;
  lineItems: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  status: string;
  notes: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

function InvoiceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { cls: string; icon: any }> = {
    draft: { cls: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: Clock },
    sent: { cls: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Send },
    paid: { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    overdue: { cls: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertTriangle },
  };
  const s = styles[status] || styles.draft;
  const Icon = s.icon;
  return (
    <Badge className={s.cls} data-testid={`badge-invoice-status-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function InvoicingPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "draft" | "sent" | "paid" | "overdue">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  const emptyLineItem = (): LineItem => ({ description: "", quantity: 1, unitPrice: 0, total: 0 });

  const [form, setForm] = useState({
    contactName: "",
    contactEmail: "",
    contactCompany: "",
    dueDate: "",
    currency: "USD",
    taxRate: 0,
    notes: "",
    lineItems: [emptyLineItem()],
  });

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice created successfully" });
      setCreateOpen(false);
      setForm({
        contactName: "", contactEmail: "", contactCompany: "", dueDate: "",
        currency: "USD", taxRate: 0, notes: "", lineItems: [emptyLineItem()],
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice deleted" });
      setDeleteTarget(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/invoices/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice status updated" });
    },
  });

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    setForm((f) => {
      const items = [...f.lineItems];
      items[index] = { ...items[index], [field]: value };
      items[index].total = items[index].quantity * items[index].unitPrice;
      return { ...f, lineItems: items };
    });
  };

  const addLineItem = () => setForm((f) => ({ ...f, lineItems: [...f.lineItems, emptyLineItem()] }));
  const removeLineItem = (index: number) =>
    setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== index) }));

  const subtotal = form.lineItems.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * (form.taxRate / 100);
  const total = subtotal + taxAmount;

  const handleCreate = () => {
    createMutation.mutate({
      contactName: form.contactName,
      contactEmail: form.contactEmail,
      contactCompany: form.contactCompany || null,
      dueDate: form.dueDate,
      currency: form.currency,
      taxRate: form.taxRate,
      notes: form.notes || null,
      lineItems: JSON.stringify(form.lineItems),
      subtotal,
      taxAmount,
      total,
      status: "draft",
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="invoicing-loading">
        <Skeleton className="h-20 w-full" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const list = invoices || [];
  const filtered = list
    .filter((inv) => tab === "all" || inv.status === tab)
    .filter((inv) =>
      !search ||
      inv.contactName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
    );

  const totalBilled = list.reduce((s, inv) => s + (inv.total || 0), 0);
  const paidAmount = list.filter((i) => i.status === "paid").reduce((s, inv) => s + (inv.total || 0), 0);
  const overdueAmount = list.filter((i) => i.status === "overdue").reduce((s, inv) => s + (inv.total || 0), 0);

  const tabs = [
    { key: "all", label: "All", count: list.length },
    { key: "draft", label: "Draft", count: list.filter((i) => i.status === "draft").length },
    { key: "sent", label: "Sent", count: list.filter((i) => i.status === "sent").length },
    { key: "paid", label: "Paid", count: list.filter((i) => i.status === "paid").length },
    { key: "overdue", label: "Overdue", count: list.filter((i) => i.status === "overdue").length },
  ] as const;

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  };

  return (
    <div className="p-6 space-y-6" data-testid="invoicing-page">
      <div className="rounded-md bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Invoicing & Payments</h1>
              <p className="text-sm text-muted-foreground">Create, send, and track invoices and payments</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-invoice">
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        </div>
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
              <p className="text-2xl font-bold" data-testid="text-total-billed">{formatCurrency(totalBilled)}</p>
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
              <p className="text-2xl font-bold" data-testid="text-paid-amount">{formatCurrency(paidAmount)}</p>
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
              <p className="text-2xl font-bold" data-testid="text-overdue-amount">{formatCurrency(overdueAmount)}</p>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
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
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
            data-testid="input-search-invoices"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12">
          <div className="text-center" data-testid="text-empty-state">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-1">
              {list.length === 0 ? "No invoices yet" : "No invoices match your filters"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {list.length === 0 ? "Create your first invoice to start billing clients" : "Try adjusting your search or filters"}
            </p>
            {list.length === 0 && (
              <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-invoice">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Invoice
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <Table data-testid="table-invoices">
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                  <TableCell className="font-mono text-sm" data-testid={`text-invoice-number-${inv.id}`}>
                    {inv.invoiceNumber || `INV-${inv.id}`}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm" data-testid={`text-invoice-contact-${inv.id}`}>{inv.contactName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {inv.contactEmail}
                        </span>
                        {inv.contactCompany && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {inv.contactCompany}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell><InvoiceStatusBadge status={inv.status} /></TableCell>
                  <TableCell className="text-right font-semibold" data-testid={`text-invoice-total-${inv.id}`}>
                    {formatCurrency(inv.total || 0, inv.currency)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
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
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => statusMutation.mutate({ id: inv.id, status: "paid" })}
                            data-testid={`button-mark-paid-${inv.id}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => statusMutation.mutate({ id: inv.id, status: "overdue" })}
                            data-testid={`button-mark-overdue-${inv.id}`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                            Overdue
                          </Button>
                        </>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(inv)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-invoice-${inv.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-invoice">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name *</Label>
                <Input
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                  placeholder="John Smith"
                  data-testid="input-invoice-contact-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Email *</Label>
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  placeholder="john@company.com"
                  data-testid="input-invoice-contact-email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  value={form.contactCompany}
                  onChange={(e) => setForm((f) => ({ ...f, contactCompany: e.target.value }))}
                  placeholder="Acme Corp"
                  data-testid="input-invoice-company"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  data-testid="input-invoice-due-date"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}
                >
                  <SelectTrigger data-testid="select-invoice-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.taxRate}
                  onChange={(e) => setForm((f) => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))}
                  data-testid="input-invoice-tax-rate"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-base font-semibold">Line Items</Label>
                <Button size="sm" variant="outline" onClick={addLineItem} data-testid="button-add-line-item">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Item
                </Button>
              </div>
              {form.lineItems.map((item, i) => (
                <div key={i} className="flex items-end gap-2 flex-wrap" data-testid={`line-item-${i}`}>
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(i, "description", e.target.value)}
                      placeholder="Service description"
                      data-testid={`input-line-description-${i}`}
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(i, "quantity", parseInt(e.target.value) || 0)}
                      data-testid={`input-line-qty-${i}`}
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                      data-testid={`input-line-price-${i}`}
                    />
                  </div>
                  <div className="w-24 text-right">
                    <p className="text-sm font-medium">{formatCurrency(item.quantity * item.unitPrice, form.currency)}</p>
                  </div>
                  {form.lineItems.length > 1 && (
                    <Button size="icon" variant="ghost" onClick={() => removeLineItem(i)} data-testid={`button-remove-line-${i}`}>
                      <X className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="border-t pt-3 space-y-1 text-right">
                <p className="text-sm text-muted-foreground">Subtotal: {formatCurrency(subtotal, form.currency)}</p>
                {form.taxRate > 0 && (
                  <p className="text-sm text-muted-foreground">Tax ({form.taxRate}%): {formatCurrency(taxAmount, form.currency)}</p>
                )}
                <p className="text-lg font-bold" data-testid="text-invoice-total-preview">
                  Total: {formatCurrency(total, form.currency)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Payment terms, additional notes..."
                data-testid="input-invoice-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={
                !form.contactName || !form.contactEmail || !form.dueDate ||
                form.lineItems.every((li) => !li.description) || createMutation.isPending
              }
              data-testid="button-save-invoice"
            >
              {createMutation.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent data-testid="dialog-delete-invoice-confirmation">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Invoice
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete invoice <strong>{deleteTarget?.invoiceNumber || `INV-${deleteTarget?.id}`}</strong> for <strong>{deleteTarget?.contactName}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-invoice"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
