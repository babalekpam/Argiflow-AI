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
  Layout,
  Plus,
  Trash2,
  Eye,
  MousePointerClick,
  Globe,
  FileEdit,
  Search,
  TrendingUp,
  Rocket,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type LandingPage = {
  id: string;
  userId: string;
  name: string;
  type: string;
  slug: string;
  status: string;
  pageContent: any;
  settings: any;
  seo: any;
  customDomain: string | null;
  totalVisits: number;
  totalConversions: number;
  createdAt: string;
  updatedAt: string;
};

const PAGE_TEMPLATES = [
  { value: "blank", label: "Blank Page", description: "Start from scratch" },
  { value: "lead_capture", label: "Lead Capture", description: "Collect leads with a conversion-optimized form" },
  { value: "webinar", label: "Webinar Registration", description: "Drive registrations for your webinar" },
  { value: "sales", label: "Sales Page", description: "High-converting long-form sales page" },
  { value: "product_launch", label: "Product Launch", description: "Build hype for your next product" },
];

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

function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    landing_page: "Landing Page",
    funnel: "Funnel",
    popup: "Popup",
  };
  return (
    <Badge variant="outline" className="text-xs" data-testid={`badge-type-${type}`}>
      {labels[type] || type}
    </Badge>
  );
}

export default function LandingPagesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "draft" | "published">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LandingPage | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "landing_page",
    slug: "",
    template: "blank",
  });

  const { data: pages, isLoading } = useQuery<LandingPage[]>({
    queryKey: ["/api/landing-pages"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/landing-pages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landing-pages"] });
      toast({ title: "Landing page created successfully" });
      setCreateOpen(false);
      setForm({ name: "", type: "landing_page", slug: "", template: "blank" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/landing-pages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landing-pages"] });
      toast({ title: "Landing page deleted" });
      setDeleteTarget(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/landing-pages/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landing-pages"] });
      toast({ title: "Status updated" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const autoSlug = (name: string) => {
    set("name", name);
    if (!form.slug || form.slug === slugify(form.name)) {
      set("slug", slugify(name));
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="landing-pages-loading">
        <Skeleton className="h-20 w-full" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const list = pages || [];
  const filtered = list
    .filter((p) => tab === "all" || p.status === tab)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const published = list.filter((p) => p.status === "published");
  const totalVisits = list.reduce((s, p) => s + (p.totalVisits || 0), 0);
  const totalConversions = list.reduce((s, p) => s + (p.totalConversions || 0), 0);
  const conversionRate = totalVisits > 0 ? ((totalConversions / totalVisits) * 100).toFixed(1) : "0.0";

  const tabs = [
    { key: "all", label: "All", count: list.length },
    { key: "draft", label: "Draft", count: list.filter((p) => p.status === "draft").length },
    { key: "published", label: "Published", count: published.length },
  ] as const;

  return (
    <div className="p-6 space-y-6" data-testid="landing-pages-page">
      <div className="rounded-md bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
              <Layout className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Landing Page Builder</h1>
              <p className="text-sm text-muted-foreground">Build and manage high-converting landing pages, funnels, and popups</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-landing-page">
            <Plus className="w-4 h-4 mr-2" />
            Create Page
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
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
              <p className="text-2xl font-bold" data-testid="text-published-count">{published.length}</p>
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
              <p className="text-2xl font-bold" data-testid="text-total-visits">{totalVisits.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Visits</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-conversion-rate">{conversionRate}%</p>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
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
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
            data-testid="input-search-pages"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12">
          <div className="text-center" data-testid="text-empty-state">
            <Layout className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-1">
              {list.length === 0 ? "No landing pages yet" : "No pages match your filters"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {list.length === 0
                ? "Create your first landing page to start capturing leads and driving conversions"
                : "Try adjusting your search or filter criteria"}
            </p>
            {list.length === 0 && (
              <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-page">
                <Rocket className="w-4 h-4 mr-2" />
                Create Your First Page
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <Table data-testid="table-landing-pages">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
                <TableHead className="text-right">Conv. Rate</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((page) => {
                const rate = page.totalVisits > 0
                  ? ((page.totalConversions / page.totalVisits) * 100).toFixed(1)
                  : "0.0";
                return (
                  <TableRow key={page.id} data-testid={`row-page-${page.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium" data-testid={`text-page-name-${page.id}`}>{page.name}</p>
                        <p className="text-xs text-muted-foreground">/{page.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell><TypeBadge type={page.type} /></TableCell>
                    <TableCell><StatusBadge status={page.status} /></TableCell>
                    <TableCell className="text-right" data-testid={`text-visits-${page.id}`}>
                      {(page.totalVisits || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-conversions-${page.id}`}>
                      {(page.totalConversions || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{rate}%</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(page.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {page.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => statusMutation.mutate({ id: page.id, status: "published" })}
                            data-testid={`button-publish-page-${page.id}`}
                          >
                            <Globe className="w-3.5 h-3.5 mr-1" />
                            Publish
                          </Button>
                        )}
                        {page.status === "published" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => statusMutation.mutate({ id: page.id, status: "draft" })}
                            data-testid={`button-unpublish-page-${page.id}`}
                          >
                            <FileEdit className="w-3.5 h-3.5 mr-1" />
                            Unpublish
                          </Button>
                        )}
                        {page.status === "published" && page.slug && (
                          <Button size="icon" variant="ghost" data-testid={`button-view-page-${page.id}`}>
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteTarget(page)}
                          data-testid={`button-delete-page-${page.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-create-landing-page">
          <DialogHeader>
            <DialogTitle>Create Landing Page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Page Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => autoSlug(e.target.value)}
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
              <Label>Page Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger data-testid="select-landing-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landing_page">Landing Page</SelectItem>
                  <SelectItem value="funnel">Funnel</SelectItem>
                  <SelectItem value="popup">Popup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <div className="grid grid-cols-1 gap-2">
                {PAGE_TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.value}
                    className={`p-3 rounded-md border cursor-pointer transition-colors ${
                      form.template === tpl.value
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onClick={() => set("template", tpl.value)}
                    data-testid={`template-${tpl.value}`}
                  >
                    <p className="text-sm font-medium">{tpl.label}</p>
                    <p className="text-xs text-muted-foreground">{tpl.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  name: form.name,
                  type: form.type,
                  slug: form.slug,
                  status: "draft",
                  pageContent: { template: form.template },
                  totalVisits: 0,
                  totalConversions: 0,
                })
              }
              disabled={!form.name || !form.slug || createMutation.isPending}
              data-testid="button-save-landing-page"
            >
              {createMutation.isPending ? "Creating..." : "Create Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent data-testid="dialog-delete-confirmation">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Landing Page
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
