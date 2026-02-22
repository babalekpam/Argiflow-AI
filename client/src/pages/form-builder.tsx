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
  FileText,
  Plus,
  Trash2,
  ClipboardList,
  Inbox,
  Search,
  CheckCircle2,
  Copy,
  ExternalLink,
  AlertTriangle,
  Link2,
  Eye,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type FormBuilder = {
  id: string;
  userId: string;
  name: string;
  type: string;
  fields: any;
  settings: any;
  styling: any;
  status: string;
  redirectUrl: string | null;
  successMessage: string | null;
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
};

type FormSubmission = {
  id: string;
  formId: string;
  data: any;
  contactEmail: string | null;
  ipAddress: string | null;
  sourceUrl: string | null;
  submittedAt: string;
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    draft: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return (
    <Badge className={styles[status] || styles.draft} data-testid={`badge-status-${status}`}>
      {status === "active" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function FormBuilderPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "form" | "survey" | "quiz">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FormBuilder | null>(null);
  const [viewSubmissions, setViewSubmissions] = useState<FormBuilder | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "form",
    successMessage: "Thank you for your submission!",
    redirectUrl: "",
  });

  const { data: forms, isLoading } = useQuery<FormBuilder[]>({
    queryKey: ["/api/forms"],
  });

  const { data: submissions } = useQuery<FormSubmission[]>({
    queryKey: ["/api/forms", viewSubmissions?.id, "submissions"],
    enabled: !!viewSubmissions,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/forms", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({ title: "Form created successfully" });
      setCreateOpen(false);
      setForm({ name: "", type: "form", successMessage: "Thank you for your submission!", redirectUrl: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/forms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({ title: "Form deleted" });
      setDeleteTarget(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/forms/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({ title: "Status updated" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const copyShareLink = (formItem: FormBuilder) => {
    const link = `${window.location.origin}/f/${formItem.id}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Share link copied to clipboard" });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="form-builder-loading">
        <Skeleton className="h-20 w-full" />
        <div className="grid sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const list = forms || [];
  const filtered = list
    .filter((f) => tab === "all" || f.type === tab)
    .filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()));

  const activeCount = list.filter((f) => f.status === "active").length;
  const totalSubmissions = list.reduce((s, f) => s + (f.submissionCount || 0), 0);

  const tabs = [
    { key: "all", label: "All", count: list.length },
    { key: "form", label: "Forms", count: list.filter((f) => f.type === "form").length },
    { key: "survey", label: "Surveys", count: list.filter((f) => f.type === "survey").length },
    { key: "quiz", label: "Quizzes", count: list.filter((f) => f.type === "quiz").length },
  ] as const;

  return (
    <div className="p-6 space-y-6" data-testid="form-builder-page">
      <div className="rounded-md bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Forms & Surveys</h1>
              <p className="text-sm text-muted-foreground">Create forms, surveys, and quizzes to collect data and feedback</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-form">
            <Plus className="w-4 h-4 mr-2" />
            Create Form
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-forms">{list.length}</p>
              <p className="text-sm text-muted-foreground">Total Forms</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-active-count">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-sky-500/10 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-submissions">{totalSubmissions.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
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
            placeholder="Search forms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
            data-testid="input-search-forms"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12">
          <div className="text-center" data-testid="text-empty-state">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-1">
              {list.length === 0 ? "No forms yet" : "No forms match your filters"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {list.length === 0 ? "Create your first form or survey to start collecting responses" : "Try adjusting your filters"}
            </p>
            {list.length === 0 && (
              <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-form">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Form
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <Table data-testid="table-forms">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Submissions</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} data-testid={`row-form-${item.id}`}>
                  <TableCell>
                    <p className="font-medium" data-testid={`text-form-name-${item.id}`}>{item.name}</p>
                    {item.successMessage && (
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{item.successMessage}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                  </TableCell>
                  <TableCell><StatusBadge status={item.status} /></TableCell>
                  <TableCell className="text-right" data-testid={`text-submissions-${item.id}`}>
                    {(item.submissionCount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {item.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => statusMutation.mutate({ id: item.id, status: "active" })}
                          data-testid={`button-activate-form-${item.id}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Activate
                        </Button>
                      )}
                      {item.status === "active" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyShareLink(item)}
                          data-testid={`button-share-form-${item.id}`}
                        >
                          <Link2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setViewSubmissions(item)}
                        data-testid={`button-view-submissions-${item.id}`}
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(item)}
                        data-testid={`button-delete-form-${item.id}`}
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
        <DialogContent className="sm:max-w-md" data-testid="dialog-create-form">
          <DialogHeader>
            <DialogTitle>Create Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Form Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Contact Form"
                data-testid="input-form-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger data-testid="select-form-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="form">Form</SelectItem>
                  <SelectItem value="survey">Survey</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Success Message</Label>
              <Textarea
                value={form.successMessage}
                onChange={(e) => set("successMessage", e.target.value)}
                placeholder="Thank you for your submission!"
                data-testid="input-form-success-message"
              />
            </div>
            <div className="space-y-2">
              <Label>Redirect URL (optional)</Label>
              <Input
                value={form.redirectUrl}
                onChange={(e) => set("redirectUrl", e.target.value)}
                placeholder="https://example.com/thank-you"
                data-testid="input-form-redirect-url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  name: form.name,
                  type: form.type,
                  status: "draft",
                  successMessage: form.successMessage,
                  redirectUrl: form.redirectUrl || null,
                  submissionCount: 0,
                })
              }
              disabled={!form.name || createMutation.isPending}
              data-testid="button-save-form"
            >
              {createMutation.isPending ? "Creating..." : "Create Form"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent data-testid="dialog-delete-form-confirmation">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Form
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? All submissions will also be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-form"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewSubmissions} onOpenChange={() => setViewSubmissions(null)}>
        <DialogContent className="sm:max-w-2xl" data-testid="dialog-view-submissions">
          <DialogHeader>
            <DialogTitle>Submissions - {viewSubmissions?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-auto">
            {!submissions || submissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No submissions yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id} data-testid={`row-submission-${sub.id}`}>
                      <TableCell className="text-sm">{sub.contactEmail || "N/A"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-xs">
                        {sub.sourceUrl || "Direct"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(sub.submittedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
