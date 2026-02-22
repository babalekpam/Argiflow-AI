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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Plus,
  Trash2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Inbox,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type FormItem = {
  id: string;
  name: string;
  description: string;
  type: string;
  submissions: number;
  fields: number;
  status: string;
  createdAt: string;
};

function CreateFormDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", type: "form" });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/forms", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({ title: "Form created" });
      setOpen(false);
      setForm({ name: "", description: "", type: "form" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-form">
          <Plus className="w-4 h-4 mr-2" />
          Create Form
        </Button>
      </DialogTrigger>
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
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="A brief description of this form"
              data-testid="input-form-description"
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
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate({ ...form, submissions: 0, fields: 0, status: "active" })}
            disabled={!form.name || mutation.isPending}
            data-testid="button-save-form"
          >
            {mutation.isPending ? "Creating..." : "Create Form"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FormCard({ item, onDelete }: { item: FormItem; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="p-5" data-testid={`card-form-${item.id}`}>
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <h3 className="font-semibold truncate" data-testid={`text-form-name-${item.id}`}>{item.name}</h3>
        <Badge
          className={item.type === "survey"
            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
            : "bg-blue-500/10 text-blue-400 border-blue-500/20"}
        >
          {item.type === "survey" ? "Survey" : "Form"}
        </Badge>
      </div>
      {item.description && (
        <p className="text-xs text-muted-foreground mb-3">{item.description}</p>
      )}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Inbox className="w-3.5 h-3.5" />
          {item.submissions || 0} submissions
        </span>
        <span className="flex items-center gap-1">
          <ClipboardList className="w-3.5 h-3.5" />
          {item.fields || 0} fields
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setExpanded(!expanded)}
          data-testid={`button-toggle-submissions-${item.id}`}
        >
          {expanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
          Submissions
        </Button>
        <div className="flex-1" />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDelete(item.id)}
          data-testid={`button-delete-form-${item.id}`}
        >
          <Trash2 className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t">
          {(item.submissions || 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No submissions yet</p>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {item.submissions} submission{item.submissions !== 1 ? "s" : ""} received
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

export default function FormBuilderPage() {
  const { toast } = useToast();

  const { data: forms, isLoading } = useQuery<FormItem[]>({
    queryKey: ["/api/forms"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/forms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({ title: "Form deleted" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="form-builder-loading">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const list = forms || [];

  return (
    <div className="p-6 space-y-6" data-testid="form-builder-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Forms & Surveys</h1>
            <p className="text-sm text-muted-foreground">Create and manage forms to collect data</p>
          </div>
        </div>
        <CreateFormDialog />
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
              <Inbox className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{list.reduce((s, f) => s + (f.submissions || 0), 0)}</p>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-purple-500/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{list.filter((f) => f.type === "survey").length}</p>
              <p className="text-sm text-muted-foreground">Surveys</p>
            </div>
          </div>
        </Card>
      </div>

      {list.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground" data-testid="text-empty-state">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium mb-1">No forms yet</p>
            <p className="text-sm">Create your first form or survey to start collecting responses</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((item) => (
            <FormCard
              key={item.id}
              item={item}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}