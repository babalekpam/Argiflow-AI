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
  FileSignature,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  DollarSign,
  Clock,
  Mail,
  User,
  Calendar,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Proposal = {
  id: string;
  title: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  status: string;
  validUntil: string;
  description: string;
  createdAt: string;
};

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

function CreateProposalDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    clientName: "",
    clientEmail: "",
    amount: "",
    validUntil: "",
    description: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/proposals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({ title: "Proposal created successfully" });
      setOpen(false);
      setForm({ title: "", clientName: "", clientEmail: "", amount: "", validUntil: "", description: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-proposal">
          <Plus className="w-4 h-4 mr-2" />
          Create Proposal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-proposal">
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Client Name *</Label>
              <Input
                value={form.clientName}
                onChange={(e) => set("clientName", e.target.value)}
                placeholder="John Smith"
                data-testid="input-client-name"
              />
            </div>
            <div>
              <Label>Client Email *</Label>
              <Input
                value={form.clientEmail}
                onChange={(e) => set("clientEmail", e.target.value)}
                placeholder="john@example.com"
                data-testid="input-client-email"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount ($) *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="5000.00"
                data-testid="input-amount"
              />
            </div>
            <div>
              <Label>Valid Until</Label>
              <Input
                type="date"
                value={form.validUntil}
                onChange={(e) => set("validUntil", e.target.value)}
                data-testid="input-valid-until"
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Proposal details..."
              data-testid="input-proposal-description"
            />
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                title: form.title,
                clientName: form.clientName,
                clientEmail: form.clientEmail,
                amount: parseFloat(form.amount) || 0,
                validUntil: form.validUntil || null,
                description: form.description || null,
                status: "draft",
              })
            }
            disabled={!form.title || !form.clientName || !form.clientEmail || !form.amount || mutation.isPending}
            data-testid="button-submit-proposal"
          >
            {mutation.isPending ? "Creating..." : "Create Proposal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProposalCard({
  proposal,
  onDelete,
  onSend,
  onAccept,
}: {
  proposal: Proposal;
  onDelete: (id: string) => void;
  onSend: (id: string) => void;
  onAccept: (id: string) => void;
}) {
  const isExpired = proposal.validUntil && new Date(proposal.validUntil) < new Date();

  return (
    <Card className="p-5" data-testid={`card-proposal-${proposal.id}`}>
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <FileSignature className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate" data-testid={`text-proposal-title-${proposal.id}`}>{proposal.title}</h3>
            <p className="text-xs text-muted-foreground truncate">{proposal.description}</p>
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
          <span className="truncate" data-testid={`text-client-name-${proposal.id}`}>{proposal.clientName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="truncate" data-testid={`text-client-email-${proposal.id}`}>{proposal.clientEmail}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="font-bold" data-testid={`text-amount-${proposal.id}`}>${proposal.amount.toLocaleString()}</span>
        </div>
        {proposal.validUntil && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{new Date(proposal.validUntil).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 border-t flex-wrap">
        <span className="text-xs text-muted-foreground">
          Created: {new Date(proposal.createdAt).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-1">
          {proposal.status === "draft" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSend(proposal.id)}
              data-testid={`button-send-${proposal.id}`}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send
            </Button>
          )}
          {proposal.status === "sent" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAccept(proposal.id)}
              data-testid={`button-accept-${proposal.id}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Accept
            </Button>
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

  const totalValue = (proposals || []).reduce((sum, p) => sum + p.amount, 0);
  const accepted = (proposals || []).filter((p) => p.status === "accepted");
  const acceptedValue = accepted.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="proposals-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FileSignature className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Proposals & Estimates</h1>
            <p className="text-muted-foreground text-sm">Create and manage client proposals</p>
          </div>
        </div>
        <CreateProposalDialog />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <FileSignature className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-proposals">{(proposals || []).length}</p>
              <p className="text-sm text-muted-foreground">Total Proposals</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-value">${totalValue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Value</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-accepted-value">${acceptedValue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Accepted Value</p>
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (proposals || []).length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <FileSignature className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold mb-1">No proposals yet</h3>
            <p className="text-sm">Create your first proposal to send to clients.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {(proposals || []).map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onDelete={(id) => deleteMutation.mutate(id)}
              onSend={(id) => statusMutation.mutate({ id, status: "sent" })}
              onAccept={(id) => statusMutation.mutate({ id, status: "accepted" })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
