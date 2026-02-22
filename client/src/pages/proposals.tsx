import { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileSignature,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock,
  Mail,
  User,
  Calendar,
  Building2,
  Search,
  TrendingUp,
  FileText,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type Proposal = {
  id: string;
  userId: string;
  title: string;
  contactName: string;
  contactEmail: string;
  contactCompany: string | null;
  content: string | null;
  lineItems: string | null;
  total: number;
  status: string;
  validUntil: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function parseLineItems(lineItems: string | null): LineItem[] {
  if (!lineItems) return [];
  try {
    const parsed = JSON.parse(lineItems);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ProposalStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <Badge className={styles[status] || styles.draft} data-testid={`badge-status-${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function LineItemsEditor({
  items,
  onChange,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}) {
  const addItem = () => {
    onChange([...items, { description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    if (field === "quantity" || field === "unitPrice") {
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    }
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label>Line Items</Label>
        <Button type="button" size="sm" variant="outline" onClick={addItem} data-testid="button-add-line-item">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Item
        </Button>
      </div>
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end" data-testid={`line-item-${idx}`}>
              <div className="col-span-5">
                {idx === 0 && <Label className="text-xs text-muted-foreground">Description</Label>}
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(idx, "description", e.target.value)}
                  placeholder="Service description"
                  data-testid={`input-item-desc-${idx}`}
                />
              </div>
              <div className="col-span-2">
                {idx === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                  data-testid={`input-item-qty-${idx}`}
                />
              </div>
              <div className="col-span-2">
                {idx === 0 && <Label className="text-xs text-muted-foreground">Price</Label>}
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                  data-testid={`input-item-price-${idx}`}
                />
              </div>
              <div className="col-span-2">
                {idx === 0 && <Label className="text-xs text-muted-foreground">Total</Label>}
                <Input
                  value={`$${(item.quantity * item.unitPrice).toFixed(2)}`}
                  disabled
                  data-testid={`text-item-total-${idx}`}
                />
              </div>
              <div className="col-span-1">
                <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} data-testid={`button-remove-item-${idx}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          <div className="text-right text-sm font-bold pt-2 border-t">
            Total: ${items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0).toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateProposalDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    contactName: "",
    contactEmail: "",
    contactCompany: "",
    content: "",
    validUntil: "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/proposals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({ title: "Proposal created successfully" });
      setOpen(false);
      setForm({ title: "", contactName: "", contactEmail: "", contactCompany: "", content: "", validUntil: "" });
      setLineItems([]);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const totalAmount = lineItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const handleSubmit = () => {
    if (!form.title.trim() || !form.contactName.trim() || !form.contactEmail.trim()) return;
    mutation.mutate({
      title: form.title,
      contactName: form.contactName,
      contactEmail: form.contactEmail,
      contactCompany: form.contactCompany || null,
      content: form.content || null,
      lineItems: lineItems.length > 0 ? JSON.stringify(lineItems) : null,
      total: totalAmount,
      status: "draft",
      validUntil: form.validUntil || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-proposal">
          <Plus className="w-4 h-4 mr-2" />
          Create Proposal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-proposal">
        <DialogHeader>
          <DialogTitle>Create Proposal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Website Redesign Proposal"
              data-testid="input-proposal-title"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Contact Name *</Label>
              <Input
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
                placeholder="John Smith"
                data-testid="input-contact-name"
              />
            </div>
            <div>
              <Label>Contact Email *</Label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                placeholder="john@example.com"
                data-testid="input-contact-email"
              />
            </div>
            <div>
              <Label>Company</Label>
              <Input
                value={form.contactCompany}
                onChange={(e) => set("contactCompany", e.target.value)}
                placeholder="Acme Inc"
                data-testid="input-contact-company"
              />
            </div>
          </div>
          <div>
            <Label>Content / Description</Label>
            <Textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="Proposal details and scope of work..."
              className="min-h-[100px]"
              data-testid="input-proposal-content"
            />
          </div>
          <LineItemsEditor items={lineItems} onChange={setLineItems} />
          <div>
            <Label>Valid Until</Label>
            <Input
              type="date"
              value={form.validUntil}
              onChange={(e) => set("validUntil", e.target.value)}
              data-testid="input-valid-until"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!form.title.trim() || !form.contactName.trim() || !form.contactEmail.trim() || mutation.isPending}
            data-testid="button-submit-proposal"
          >
            {mutation.isPending ? "Creating..." : `Create Proposal${totalAmount > 0 ? ` ($${totalAmount.toFixed(2)})` : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProposalCard({
  proposal,
  onDelete,
  onStatusChange,
}: {
  proposal: Proposal;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const isExpired = proposal.validUntil && new Date(proposal.validUntil) < new Date();
  const items = parseLineItems(proposal.lineItems);

  return (
    <Card className="p-5" data-testid={`card-proposal-${proposal.id}`}>
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center shrink-0">
            <FileSignature className="w-5 h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate" data-testid={`text-proposal-title-${proposal.id}`}>{proposal.title}</h3>
            {proposal.content && (
              <p className="text-xs text-muted-foreground truncate max-w-md">{proposal.content}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProposalStatusBadge status={proposal.status} />
          {isExpired && proposal.status === "sent" && (
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Expired</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="truncate" data-testid={`text-contact-name-${proposal.id}`}>{proposal.contactName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="truncate" data-testid={`text-contact-email-${proposal.id}`}>{proposal.contactEmail}</span>
        </div>
        {proposal.contactCompany && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate" data-testid={`text-contact-company-${proposal.id}`}>{proposal.contactCompany}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="font-bold" data-testid={`text-total-${proposal.id}`}>${(proposal.total || 0).toLocaleString()}</span>
        </div>
      </div>

      {items.length > 0 && (
        <div className="mb-3 rounded-md bg-background/50 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Line Items ({items.length})</p>
          <div className="space-y-1">
            {items.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{item.description}</span>
                <span className="shrink-0 font-medium">{item.quantity} x ${item.unitPrice.toFixed(2)}</span>
              </div>
            ))}
            {items.length > 3 && (
              <p className="text-xs text-muted-foreground">+{items.length - 3} more items</p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-3 border-t flex-wrap">
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span>Created: {new Date(proposal.createdAt).toLocaleDateString()}</span>
          {proposal.sentAt && <span>Sent: {new Date(proposal.sentAt).toLocaleDateString()}</span>}
          {proposal.acceptedAt && <span>Accepted: {new Date(proposal.acceptedAt).toLocaleDateString()}</span>}
          {proposal.validUntil && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Valid until: {new Date(proposal.validUntil).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {proposal.status === "draft" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(proposal.id, "sent")}
              data-testid={`button-send-${proposal.id}`}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send
            </Button>
          )}
          {proposal.status === "sent" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(proposal.id, "accepted")}
                data-testid={`button-accept-${proposal.id}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(proposal.id, "rejected")}
                data-testid={`button-reject-${proposal.id}`}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Reject
              </Button>
            </>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(proposal.id)}
            data-testid={`button-delete-${proposal.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function ProposalsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const { data: proposals, isLoading } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/proposals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({ title: "Proposal deleted" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/proposals/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({ title: "Proposal updated" });
    },
  });

  const allProposals = proposals || [];
  const pending = allProposals.filter((p) => p.status === "sent").length;
  const accepted = allProposals.filter((p) => p.status === "accepted");
  const acceptedValue = accepted.reduce((sum, p) => sum + (p.total || 0), 0);
  const decidedCount = allProposals.filter((p) => p.status === "accepted" || p.status === "rejected").length;
  const winRate = decidedCount > 0 ? ((accepted.length / decidedCount) * 100).toFixed(1) : "0.0";

  const filtered = allProposals
    .filter((p) => activeTab === "all" || p.status === activeTab)
    .filter((p) =>
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.contactName.toLowerCase().includes(search.toLowerCase()) ||
      (p.contactCompany || "").toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="proposals-page">
      <div className="rounded-md bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center shrink-0">
              <FileSignature className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Proposals & Estimates</h1>
              <p className="text-muted-foreground text-sm">Create, send and track client proposals with line items</p>
            </div>
          </div>
          <CreateProposalDialog />
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-violet-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-proposals">{allProposals.length}</p>
              <p className="text-sm text-muted-foreground">Total Proposals</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-pending">{pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-accepted-value">${acceptedValue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Accepted Value</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-win-rate">{winRate}%</p>
              <p className="text-sm text-muted-foreground">Win Rate</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-filter">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="draft" data-testid="tab-draft">Draft</TabsTrigger>
            <TabsTrigger value="sent" data-testid="tab-sent">Sent</TabsTrigger>
            <TabsTrigger value="accepted" data-testid="tab-accepted">Accepted</TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 w-64"
            placeholder="Search proposals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <FileSignature className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold mb-1">No proposals found</h3>
            <p className="text-sm">
              {allProposals.length === 0
                ? "Create your first proposal to send to clients."
                : "No proposals match your current filters."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onDelete={(id) => deleteMutation.mutate(id)}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
