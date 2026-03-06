import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Globe,
  Plus,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  Monitor,
  Smartphone,
  Tablet,
  Upload,
  Layout,
  Star,
  Image,
  Type,
  MessageSquare,
  HelpCircle,
  Play,
  Grid3X3,
  Columns,
  Minus,
  ChevronRight,
  ExternalLink,
  Loader2,
} from "lucide-react";

type SiteData = {
  id: string;
  name: string;
  url: string | null;
  status: string;
  visitors: number;
  blocks: string;
  template: string;
  createdAt: string;
  updatedAt: string;
};

type Block = {
  id: string;
  type: string;
  label: string;
  height: number;
};

const TEMPLATES = [
  { id: "blank", label: "Blank Canvas", icon: "⬜", desc: "Start from scratch" },
  { id: "saas", label: "SaaS Landing", icon: "🚀", desc: "Hero · Features · Pricing · CTA" },
  { id: "agency", label: "Agency Site", icon: "💼", desc: "Services · Portfolio · Contact" },
  { id: "portfolio", label: "Portfolio", icon: "🎨", desc: "About · Work · Testimonials" },
  { id: "ecommerce", label: "E-commerce", icon: "🛍", desc: "Products · Cart · Checkout" },
  { id: "blog", label: "Blog / Media", icon: "📰", desc: "Posts · Categories · Newsletter" },
];

const SECTIONS = [
  { id: "hero", label: "Hero", icon: Star, color: "text-blue-500" },
  { id: "features", label: "Features", icon: Grid3X3, color: "text-violet-500" },
  { id: "pricing", label: "Pricing", icon: Star, color: "text-emerald-500" },
  { id: "testimonial", label: "Testimonials", icon: MessageSquare, color: "text-amber-500" },
  { id: "cta", label: "CTA", icon: ChevronRight, color: "text-teal-500" },
  { id: "contact", label: "Contact Form", icon: MessageSquare, color: "text-blue-500" },
  { id: "faq", label: "FAQ", icon: HelpCircle, color: "text-violet-500" },
  { id: "gallery", label: "Gallery", icon: Image, color: "text-amber-500" },
  { id: "video", label: "Video", icon: Play, color: "text-red-500" },
  { id: "footer", label: "Footer", icon: Minus, color: "text-muted-foreground" },
];

const ELEMENTS = [
  { label: "Heading", icon: Type, color: "text-foreground" },
  { label: "Text", icon: Type, color: "text-muted-foreground" },
  { label: "Button", icon: Layout, color: "text-blue-500" },
  { label: "Image", icon: Image, color: "text-violet-500" },
  { label: "Video", icon: Play, color: "text-red-500" },
  { label: "Form", icon: MessageSquare, color: "text-teal-500" },
  { label: "Columns", icon: Columns, color: "text-violet-500" },
  { label: "Card", icon: Layout, color: "text-blue-500" },
];

const DEFAULT_BLOCKS: Record<string, Block[]> = {
  blank: [],
  saas: [
    { id: "b1", type: "hero", label: "Hero Section", height: 200 },
    { id: "b2", type: "features", label: "Features Grid", height: 160 },
    { id: "b3", type: "pricing", label: "Pricing Table", height: 180 },
    { id: "b4", type: "cta", label: "Call to Action", height: 120 },
  ],
  agency: [
    { id: "b1", type: "hero", label: "Hero Section", height: 200 },
    { id: "b2", type: "features", label: "Services", height: 160 },
    { id: "b3", type: "gallery", label: "Portfolio", height: 180 },
    { id: "b4", type: "contact", label: "Contact Form", height: 140 },
  ],
  portfolio: [
    { id: "b1", type: "hero", label: "About Me", height: 200 },
    { id: "b2", type: "gallery", label: "My Work", height: 200 },
    { id: "b3", type: "testimonial", label: "Testimonials", height: 160 },
    { id: "b4", type: "contact", label: "Get In Touch", height: 140 },
  ],
  ecommerce: [
    { id: "b1", type: "hero", label: "Featured Products", height: 200 },
    { id: "b2", type: "features", label: "Product Grid", height: 200 },
    { id: "b3", type: "pricing", label: "Pricing Tiers", height: 160 },
    { id: "b4", type: "cta", label: "Shop Now", height: 120 },
  ],
  blog: [
    { id: "b1", type: "hero", label: "Latest Posts", height: 200 },
    { id: "b2", type: "features", label: "Categories", height: 160 },
    { id: "b3", type: "cta", label: "Newsletter Signup", height: 120 },
    { id: "b4", type: "footer", label: "Footer", height: 100 },
  ],
};

export default function WebBuilderPage() {
  const [view, setView] = useState<"gallery" | "editor">("gallery");
  const [editingSite, setEditingSite] = useState<SiteData | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selBlock, setSelBlock] = useState<string | null>(null);
  const [device, setDevice] = useState("desktop");
  const [tab, setTab] = useState<"sections" | "elements">("sections");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("New Site");
  const [newTemplate, setNewTemplate] = useState("blank");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ sites: SiteData[] }>({
    queryKey: ["/api/sites"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; template: string }) => {
      const res = await apiRequest("POST", "/api/sites", payload);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      const site = data.site;
      const templateBlocks = DEFAULT_BLOCKS[site.template] || [];
      setBlocks(templateBlocks);
      setEditingSite(site);
      setView("editor");
      setCreateOpen(false);
      toast({ title: "Site created", description: `${site.name} is ready to edit` });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, blocks, name }: { id: string; blocks: Block[]; name?: string }) => {
      return apiRequest("POST", `/api/sites/${id}/save`, { blocks, name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      toast({ title: "Saved", description: "Site changes saved" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/sites/${id}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      toast({ title: "Published", description: "Your site is now live" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/sites/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      setView("gallery");
      setEditingSite(null);
    },
  });

  const moveBlock = (id: string, dir: "up" | "dn") => {
    setBlocks(prev => {
      const arr = [...prev];
      const i = arr.findIndex(b => b.id === id);
      if ((dir === "up" && i === 0) || (dir === "dn" && i === arr.length - 1)) return prev;
      const ti = dir === "up" ? i - 1 : i + 1;
      [arr[i], arr[ti]] = [arr[ti], arr[i]];
      return arr;
    });
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selBlock === id) setSelBlock(null);
  };

  const addSection = (sec: typeof SECTIONS[0]) => {
    const nb: Block = { id: `b${Date.now()}`, type: sec.id, label: sec.label, height: 150 };
    setBlocks(prev => [...prev, nb]);
    setSelBlock(nb.id);
  };

  const openEditor = (site: SiteData) => {
    setEditingSite(site);
    try {
      const parsed = JSON.parse(site.blocks || "[]");
      setBlocks(Array.isArray(parsed) ? parsed : []);
    } catch {
      setBlocks(DEFAULT_BLOCKS[site.template] || []);
    }
    setView("editor");
  };

  const sites = data?.sites || [];
  const selBlockObj = blocks.find(b => b.id === selBlock);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-web-builder">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  if (view === "gallery") {
    return (
      <div className="p-6 space-y-6" data-testid="page-web-builder">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-web-builder-title">Website Builder</h1>
            <p className="text-muted-foreground mt-1 text-sm">Create and manage your websites with the visual builder</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-site">
            <Plus className="w-4 h-4 mr-1.5" /> New Site
          </Button>
        </div>

        {sites.length === 0 ? (
          <Card className="p-12 text-center">
            <Globe className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sites yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first website using one of our templates</p>
            <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-site">
              <Plus className="w-4 h-4 mr-1.5" /> Create Site
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map(site => (
              <Card key={site.id} className="overflow-hidden hover:shadow-md transition-all" data-testid={`card-site-${site.id}`}>
                <div className="h-32 bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center border-b border-border/50">
                  <Globe className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm truncate" data-testid={`text-site-name-${site.id}`}>{site.name}</h3>
                    <Badge className={site.status === "live" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-secondary text-muted-foreground"}>
                      {site.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Template: {site.template} · {site.visitors} visitors</p>
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" className="flex-1 text-xs" onClick={() => openEditor(site)} data-testid={`button-edit-site-${site.id}`}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => deleteMutation.mutate(site.id)} data-testid={`button-delete-site-${site.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Site</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Site Name</label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="My Website"
                  data-testid="input-site-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Template</label>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map(t => (
                    <div
                      key={t.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${newTemplate === t.id ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/20"}`}
                      onClick={() => setNewTemplate(t.id)}
                      data-testid={`template-${t.id}`}
                    >
                      <div className="text-xl mb-1">{t.icon}</div>
                      <p className="text-xs font-semibold">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate({ name: newName, template: newTemplate })}
                disabled={createMutation.isPending}
                data-testid="button-confirm-create-site"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="page-web-builder-editor">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-secondary/30 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView("gallery")} data-testid="button-back-gallery">← Sites</Button>
          <span className="text-sm font-semibold">{editingSite?.name}</span>
          <Badge className={editingSite?.status === "live" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-secondary text-muted-foreground"}>
            {editingSite?.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded-lg overflow-hidden">
            {[
              { id: "desktop", icon: Monitor },
              { id: "tablet", icon: Tablet },
              { id: "mobile", icon: Smartphone },
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setDevice(d.id)}
                className={`px-2.5 py-1.5 ${device === d.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                data-testid={`button-device-${d.id}`}
              >
                <d.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => editingSite && saveMutation.mutate({ id: editingSite.id, blocks })}
            disabled={saveMutation.isPending}
            data-testid="button-save-site"
          >
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            Save
          </Button>
          <Button
            size="sm"
            onClick={() => editingSite && publishMutation.mutate(editingSite.id)}
            disabled={publishMutation.isPending}
            data-testid="button-publish-site"
          >
            {publishMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
            Publish
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 shrink-0 border-r border-border/50 overflow-y-auto bg-card">
          <div className="flex border-b border-border/50">
            {(["sections", "elements"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-3 py-2 text-xs font-semibold capitalize ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
                data-testid={`tab-${t}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="p-3 space-y-1.5">
            {tab === "sections" ? SECTIONS.map(sec => (
              <button
                key={sec.id}
                onClick={() => addSection(sec)}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left hover:bg-secondary transition-colors"
                data-testid={`add-section-${sec.id}`}
              >
                <sec.icon className={`w-4 h-4 ${sec.color}`} />
                <span className="text-xs font-medium">{sec.label}</span>
                <Plus className="w-3 h-3 text-muted-foreground ml-auto" />
              </button>
            )) : ELEMENTS.map(el => (
              <button
                key={el.label}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left hover:bg-secondary transition-colors"
                data-testid={`add-element-${el.label.toLowerCase()}`}
              >
                <el.icon className={`w-4 h-4 ${el.color}`} />
                <span className="text-xs font-medium">{el.label}</span>
                <Plus className="w-3 h-3 text-muted-foreground ml-auto" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-background p-6">
          <div
            className={`mx-auto bg-card border border-border rounded-lg overflow-hidden min-h-[400px] ${
              device === "mobile" ? "max-w-[375px]" : device === "tablet" ? "max-w-[768px]" : "max-w-full"
            }`}
          >
            {blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                <Layout className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">Empty canvas</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Add sections from the left panel to start building</p>
              </div>
            ) : (
              blocks.map(block => {
                const isSel = selBlock === block.id;
                const secMeta = SECTIONS.find(s => s.id === block.type);
                return (
                  <div
                    key={block.id}
                    onClick={() => setSelBlock(block.id)}
                    className={`relative cursor-pointer border-b border-border/30 transition-all ${isSel ? "ring-2 ring-primary/30 bg-primary/5" : "hover:bg-secondary/30"}`}
                    style={{ minHeight: block.height }}
                    data-testid={`block-${block.id}`}
                  >
                    <div className="flex items-center justify-center h-full p-6" style={{ minHeight: block.height }}>
                      <div className="text-center">
                        {secMeta && <secMeta.icon className={`w-6 h-6 ${secMeta.color} mx-auto mb-2 opacity-30`} />}
                        <p className="text-xs text-muted-foreground">{block.label}</p>
                      </div>
                    </div>
                    {isSel && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); moveBlock(block.id, "up"); }}>
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); moveBlock(block.id, "dn"); }}>
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={e => { e.stopPropagation(); removeBlock(block.id); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    {isSel && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l" />}
                  </div>
                );
              })
            )}
            <div
              className="h-16 border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all"
              onClick={() => setTab("sections")}
            >
              <span className="text-xs text-muted-foreground">+ Add Section</span>
            </div>
          </div>
        </div>

        <div className="w-56 shrink-0 border-l border-border/50 overflow-y-auto bg-card">
          <div className="p-3 border-b border-border/50">
            <h4 className="text-xs font-semibold">Block Settings</h4>
            {selBlockObj && <p className="text-[10px] text-muted-foreground mt-0.5">{selBlockObj.label}</p>}
          </div>
          {selBlockObj ? (
            <div className="p-3 space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Name</label>
                <Input
                  defaultValue={selBlockObj.label}
                  className="text-xs"
                  onBlur={e => {
                    setBlocks(prev => prev.map(b => b.id === selBlockObj.id ? { ...b, label: e.target.value } : b));
                  }}
                  data-testid="input-block-name"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block">Background</label>
                <div className="flex gap-1.5">
                  {["bg-card", "bg-blue-50 dark:bg-blue-950/30", "bg-emerald-50 dark:bg-emerald-950/30", "bg-amber-50 dark:bg-amber-950/30"].map((bg, i) => (
                    <div key={i} className={`w-7 h-7 rounded-md ${bg} border-2 ${i === 0 ? "border-primary" : "border-border"} cursor-pointer`} />
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-border/50 space-y-2">
                <Button variant="default" size="sm" className="w-full text-xs">Edit Content</Button>
                <Button variant="destructive" size="sm" className="w-full text-xs" onClick={() => removeBlock(selBlockObj.id)} data-testid="button-remove-block">
                  Remove Section
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center p-4 opacity-40">
              <Layout className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Click a block to configure</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
