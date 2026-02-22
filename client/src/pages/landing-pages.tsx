import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Layout,
  Plus,
  Trash2,
  Eye,
  MousePointerClick,
  Globe,
  FileEdit,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type LandingPage = {
  id: string;
  name: string;
  slug: string;
  template: string;
  status: string;
  views: number;
  conversions: number;
  createdAt: string;
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    draft: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return (
    <Badge className={styles[status] || styles.draft} data-testid={`badge-status-${status}`}>
      {status === "published" ? <Globe className="w-3 h-3 mr-1" /> : <FileEdit className="w-3 h-3 mr-1" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function CreateLandingPageDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", template: "blank" });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/landing-pages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landing-pages"] });
      toast({ title: "Landing page created" });
      setOpen(false);
      setForm({ name: "", slug: "", template: "blank" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-landing-page">
          <Plus className="w-4 h-4 mr-2" />
          Create Page
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-landing-page">
        <DialogHeader>
          <DialogTitle>Create Landing Page</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Page Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="My Landing Page"
              data-testid="input-landing-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Slug *</Label>
            <Input
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="my-landing-page"
              data-testid="input-landing-slug"
            />
          </div>
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={form.template} onValueChange={(v) => set("template", v)}>
              <SelectTrigger data-testid="select-landing-template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">Blank</SelectItem>
                <SelectItem value="lead-capture">Lead Capture</SelectItem>
                <SelectItem value="webinar">Webinar Registration</SelectItem>
                <SelectItem value="sales">Sales Page</SelectItem>
                <SelectItem value="thank-you">Thank You Page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate({ ...form, status: "draft", views: 0, conversions: 0 })}
            disabled={!form.name || !form.slug || mutation.isPending}
            data-testid="button-save-landing-page"
          >
            {mutation.isPending ? "Creating..." : "Create Page"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function LandingPagesPage() {
  const { toast } = useToast();

  const { data: pages, isLoading } = useQuery<LandingPage[]>({
    queryKey: ["/api/landing-pages"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/landing-pages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landing-pages"] });
      toast({ title: "Landing page deleted" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="landing-pages-loading">
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

  const list = pages || [];

  return (
    <div className="p-6 space-y-6" data-testid="landing-pages-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Layout className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Landing Pages</h1>
            <p className="text-sm text-muted-foreground">Build and manage your landing pages and funnels</p>
          </div>
        </div>
        <CreateLandingPageDialog />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Layout className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-pages">{list.length}</p>
              <p className="text-sm text-muted-foreground">Total Pages</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{list.filter((p) => p.status === "published").length}</p>
              <p className="text-sm text-muted-foreground">Published</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-sky-500/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{list.reduce((s, p) => s + (p.views || 0), 0)}</p>
              <p className="text-sm text-muted-foreground">Total Views</p>
            </div>
          </div>
        </Card>
      </div>

      {list.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground" data-testid="text-empty-state">
            <Layout className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium mb-1">No landing pages yet</p>
            <p className="text-sm">Create your first landing page to start capturing leads</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((page) => (
            <Card key={page.id} className="p-5" data-testid={`card-landing-page-${page.id}`}>
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <h3 className="font-semibold truncate" data-testid={`text-page-name-${page.id}`}>{page.name}</h3>
                <StatusBadge status={page.status} />
              </div>
              <p className="text-xs text-muted-foreground mb-3">/{page.slug}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {page.views || 0} views
                </span>
                <span className="flex items-center gap-1">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  {page.conversions || 0} conversions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {page.template}
                </Badge>
                <div className="flex-1" />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(page.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-page-${page.id}`}
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}