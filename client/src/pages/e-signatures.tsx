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
  PenTool,
  Plus,
  Trash2,
  Send,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  FilePen,
  Search,
  FileSignature,
  ScrollText,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function safeJsonParse(val: string | null | undefined, fallback: any = []) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

type Document = {
  id: string;
  userId: string;
  title: string;
  type: string;
  content: string;
  fileUrl: string;
  signers: string | null;
  status: string;
  sentAt: string | null;
  signedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function DocStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; icon: typeof FileText }> = {
    draft: { class: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: FilePen },
    sent: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Send },
    viewed: { class: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Eye },
    signed: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    expired: { class: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
  };
  const s = styles[status] || styles.draft;
  const Icon = s.icon;
  return (
    <Badge className={s.class} data-testid={`badge-doc-status-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function DocTypeBadge({ type }: { type: string }) {
  const styles: Record<string, { class: string; icon: typeof FileText }> = {
    contract: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: ScrollText },
    agreement: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: FileSignature },
    proposal: { class: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: FileText },
    nda: { class: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Shield },
  };
  const s = styles[type] || styles.contract;
  const Icon = s.icon;
  return (
    <Badge className={s.class} data-testid={`badge-doc-type-${type}`}>
      <Icon className="w-3 h-3 mr-1" />
      {type.toUpperCase() === "NDA" ? "NDA" : type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  );
}

function CreateDocumentDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "contract", content: "", signers: "" });

  const mutation = useMutation({
    mutationFn: (data: { title: string; type: string; content: string; signers: string; status: string }) =>
      apiRequest("POST", "/api/documents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document created" });
      setOpen(false);
      setForm({ title: "", type: "contract", content: "", signers: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create document", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-document">
          <Plus className="w-4 h-4 mr-2" />
          Create Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-document">
        <DialogHeader>
          <DialogTitle>Create Document for Signing</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Service Agreement"
              data-testid="input-doc-title"
            />
          </div>
          <div>
            <Label>Document Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger data-testid="select-doc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="agreement">Agreement</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="nda">NDA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Content *</Label>
            <Textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="Document content or terms..."
              className="min-h-[120px]"
              data-testid="input-doc-content"
            />
          </div>
          <div>
            <Label>Signers (comma-separated emails) *</Label>
            <Input
              value={form.signers}
              onChange={(e) => set("signers", e.target.value)}
              placeholder="john@example.com, jane@example.com"
              data-testid="input-doc-signers"
            />
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                title: form.title,
                type: form.type,
                content: form.content,
                signers: JSON.stringify(form.signers.split(",").map((s) => s.trim()).filter(Boolean)),
                status: "draft",
              })
            }
            disabled={!form.title || !form.content || !form.signers || mutation.isPending}
            data-testid="button-submit-document"
          >
            <PenTool className="w-4 h-4 mr-2" />
            {mutation.isPending ? "Creating..." : "Create Document"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ESignaturesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/documents/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const pendingCount = documents.filter((d) => d.status === "sent" || d.status === "viewed").length;
  const signedCount = documents.filter((d) => d.status === "signed").length;
  const expiredCount = documents.filter((d) => d.status === "expired").length;

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "draft" && doc.status === "draft") ||
      (activeTab === "sent" && (doc.status === "sent" || doc.status === "viewed")) ||
      (activeTab === "signed" && doc.status === "signed") ||
      (activeTab === "expired" && doc.status === "expired");
    return matchesSearch && matchesTab;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="esignatures-loading">
        <Skeleton className="h-24 w-full rounded-md" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="esignatures-page">
      <div className="rounded-md bg-gradient-to-r from-indigo-600/20 via-purple-500/10 to-transparent p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-indigo-500/20 flex items-center justify-center">
              <PenTool className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">
                Document E-Signatures
              </h1>
              <p className="text-muted-foreground text-sm">
                Create, send, and track document signatures
              </p>
            </div>
          </div>
          <CreateDocumentDialog />
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-docs">{documents.length}</p>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-pending-count">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending Signature</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-signed-count">{signedCount}</p>
              <p className="text-sm text-muted-foreground">Signed</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-expired-count">{expiredCount}</p>
              <p className="text-sm text-muted-foreground">Expired</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-doc-filter">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="draft" data-testid="tab-draft">Draft</TabsTrigger>
            <TabsTrigger value="sent" data-testid="tab-sent">Sent</TabsTrigger>
            <TabsTrigger value="signed" data-testid="tab-signed">Signed</TabsTrigger>
            <TabsTrigger value="expired" data-testid="tab-expired">Expired</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-documents"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredDocuments.length === 0 ? (
          <Card className="p-5">
            <div className="text-center py-12 text-muted-foreground text-sm" data-testid="text-no-documents">
              <PenTool className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No documents found</p>
              <p className="text-xs mt-1">Create your first document to start collecting signatures.</p>
            </div>
          </Card>
        ) : (
          filteredDocuments.map((doc) => (
            <Card key={doc.id} className="p-5" data-testid={`document-${doc.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold truncate" data-testid={`text-doc-title-${doc.id}`}>
                        {doc.title}
                      </h4>
                      <DocTypeBadge type={doc.type} />
                      <DocStatusBadge status={doc.status} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{doc.content}</p>
                    {safeJsonParse(doc.signers).length > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Signers:</span>
                        {safeJsonParse(doc.signers).map((signer: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs" data-testid={`badge-signer-${doc.id}-${i}`}>
                            {signer}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span>Created: {new Date(doc.createdAt).toLocaleDateString()}</span>
                      {doc.sentAt && <span>Sent: {new Date(doc.sentAt).toLocaleDateString()}</span>}
                      {doc.signedAt && <span>Signed: {new Date(doc.signedAt).toLocaleDateString()}</span>}
                      {doc.expiresAt && (
                        <span className={new Date(doc.expiresAt) < new Date() ? "text-red-400" : ""}>
                          Expires: {new Date(doc.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {doc.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusMutation.mutate({ id: doc.id, status: "sent" })}
                      disabled={statusMutation.isPending}
                      data-testid={`button-send-doc-${doc.id}`}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Send
                    </Button>
                  )}
                  {doc.status === "sent" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusMutation.mutate({ id: doc.id, status: "viewed" })}
                      disabled={statusMutation.isPending}
                      data-testid={`button-mark-viewed-${doc.id}`}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Mark Viewed
                    </Button>
                  )}
                  {doc.status === "viewed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusMutation.mutate({ id: doc.id, status: "signed" })}
                      disabled={statusMutation.isPending}
                      data-testid={`button-mark-signed-${doc.id}`}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Mark Signed
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(doc.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-doc-${doc.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
