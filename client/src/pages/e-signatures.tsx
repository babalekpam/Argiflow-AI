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
  PenTool,
  Plus,
  Trash2,
  Send,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FilePen,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Document = {
  id: string;
  title: string;
  content: string;
  signers: string[];
  status: string;
  createdAt: string;
};

function DocStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; icon: any }> = {
    draft: { class: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: FileText },
    sent: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Send },
    signed: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    expired: { class: "bg-red-500/10 text-red-400 border-red-500/20", icon: XCircle },
    pending: { class: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
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

function CreateDocumentDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", signers: "" });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/documents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document created" });
      setOpen(false);
      setForm({ title: "", content: "", signers: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
                content: form.content,
                signers: form.signers.split(",").map((s) => s.trim()).filter(Boolean),
                status: "draft",
              })
            }
            disabled={!form.title || !form.content || !form.signers || mutation.isPending}
            data-testid="button-submit-document"
          >
            {mutation.isPending ? "Creating..." : "Create Document"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ESignaturesPage() {
  const { toast } = useToast();

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

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/documents/${id}`, { status: "sent" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document sent for signature" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="esignatures-loading">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const draftCount = documents.filter((d) => d.status === "draft").length;
  const sentCount = documents.filter((d) => d.status === "sent").length;
  const signedCount = documents.filter((d) => d.status === "signed").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="esignatures-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <PenTool className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">E-Signatures</h1>
            <p className="text-muted-foreground text-sm">Create and manage document signatures</p>
          </div>
        </div>
        <CreateDocumentDialog />
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
            <div className="w-10 h-10 rounded-md bg-gray-500/10 flex items-center justify-center">
              <FilePen className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-draft-count">{draftCount}</p>
              <p className="text-sm text-muted-foreground">Drafts</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-sent-count">{sentCount}</p>
              <p className="text-sm text-muted-foreground">Sent</p>
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
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-4" data-testid="text-documents-section">Documents</h3>
        <div className="space-y-3">
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm" data-testid="text-no-documents">
              <PenTool className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No documents yet. Create your first document for signing.
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="flex flex-col gap-2 p-4 rounded-md bg-background/50" data-testid={`document-${doc.id}`}>
                <div className="flex items-center gap-4">
                  <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" data-testid={`text-doc-title-${doc.id}`}>{doc.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.content}</p>
                  </div>
                  <DocStatusBadge status={doc.status} />
                  <div className="flex items-center gap-1">
                    {doc.status === "draft" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => sendMutation.mutate(doc.id)}
                        disabled={sendMutation.isPending}
                        title="Send for signature"
                        data-testid={`button-send-doc-${doc.id}`}
                      >
                        <Send className="w-4 h-4 text-blue-400" />
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
                {doc.signers && doc.signers.length > 0 && (
                  <div className="flex items-center gap-2 pl-9 flex-wrap">
                    <span className="text-xs text-muted-foreground">Signers:</span>
                    {doc.signers.map((signer, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {signer}
                      </Badge>
                    ))}
                  </div>
                )}
                {doc.createdAt && (
                  <p className="text-xs text-muted-foreground pl-9">
                    Created: {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
