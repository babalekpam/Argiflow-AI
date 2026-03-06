import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  Plus,
  Trash2,
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
  Loader2,
  Sparkles,
  ShoppingCart,
  Package,
  DollarSign,
  TrendingUp,
  Search,
  BarChart3,
  Zap,
  X,
  ExternalLink,
} from "lucide-react";

type SiteData = {
  id: string;
  name: string;
  slug: string | null;
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
  content?: {
    heading?: string;
    subheading?: string;
    buttonText?: string;
    items?: Array<{ title: string; description: string; icon?: string }>;
  };
};

type SupplierProduct = {
  id: string;
  productName: string;
  description: string | null;
  category: string;
  supplierName: string;
  supplierPrice: number;
  suggestedRetailPrice: number;
  margin: number;
  aiNotes: string | null;
  imageUrl: string | null;
  status: string;
};

const SUPPLIERS = [
  { id: "AliExpress", label: "AliExpress", color: "text-red-500", desc: "Global dropshipping" },
  { id: "Amazon", label: "Amazon", color: "text-amber-500", desc: "Wholesale & FBA" },
  { id: "Alibaba", label: "Alibaba", color: "text-orange-500", desc: "Bulk manufacturing" },
  { id: "CJ Dropshipping", label: "CJ Dropshipping", color: "text-blue-500", desc: "Auto-fulfillment" },
  { id: "Walmart", label: "Walmart", color: "text-sky-500", desc: "Retail arbitrage" },
  { id: "Temu", label: "Temu", color: "text-orange-400", desc: "Budget products" },
  { id: "DHgate", label: "DHgate", color: "text-green-500", desc: "Wholesale lots" },
  { id: "Made-in-China", label: "Made-in-China", color: "text-rose-500", desc: "Factory direct" },
];

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

function MarginBadge({ margin }: { margin: number }) {
  const color = margin >= 60 ? "text-emerald-500" : margin >= 40 ? "text-amber-500" : "text-red-500";
  const bg = margin >= 60 ? "bg-emerald-500/10" : margin >= 40 ? "bg-amber-500/10" : "bg-red-500/10";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color} ${bg}`} data-testid="badge-margin">
      {margin.toFixed(1)}%
    </span>
  );
}

export default function WebBuilderPage() {
  const [view, setView] = useState<"gallery" | "editor">("gallery");
  const [editingSite, setEditingSite] = useState<SiteData | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selBlock, setSelBlock] = useState<string | null>(null);
  const [device, setDevice] = useState("desktop");
  const [sideTab, setSideTab] = useState<"sections" | "elements" | "suppliers" | "products">("sections");
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"template" | "ai">("ai");
  const [newName, setNewName] = useState("New Site");
  const [newTemplate, setNewTemplate] = useState("blank");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSiteType, setAiSiteType] = useState("general");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("AliExpress");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);
  const [productForm, setProductForm] = useState({ productName: "", description: "", category: "General", supplierPrice: "", suggestedRetailPrice: "", images: [""] as string[] });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ sites: SiteData[] }>({
    queryKey: ["/api/sites"],
  });

  const { data: productsData } = useQuery<{ products: SupplierProduct[] }>({
    queryKey: ["/api/sites", editingSite?.id, "products"],
    enabled: !!editingSite?.id,
    queryFn: async () => {
      const res = await fetch(`/api/sites/${editingSite!.id}/products`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    },
  });

  const aiGenerateMutation = useMutation({
    mutationFn: async (payload: { description: string; siteType?: string }) => {
      const res = await apiRequest("POST", "/api/sites/ai-generate", payload);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      const site = data.site;
      const gen = data.generated;
      const genBlocks = gen?.blocks || [];
      setBlocks(genBlocks);
      setEditingSite(site);
      setView("editor");
      setCreateOpen(false);
      setAiPrompt("");
      toast({
        title: "Website generated!",
        description: `"${site.name}" created with ${genBlocks.length} sections. You can now customize it.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
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
    mutationFn: async ({ id, blocks }: { id: string; blocks: Block[] }) => {
      return apiRequest("POST", `/api/sites/${id}/save`, { blocks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      toast({ title: "Saved", description: "Site changes saved" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/sites/${id}/publish`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      if (data?.url) {
        toast({
          title: "Published!",
          description: `Your site is live at: ${data.url}`,
          duration: 10000,
        });
      } else {
        toast({ title: "Published", description: "Your site is now live" });
      }
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

  const importSupplierMutation = useMutation({
    mutationFn: async (payload: { supplierName: string; searchQuery: string }) => {
      const res = await apiRequest("POST", `/api/sites/${editingSite!.id}/import-supplier`, payload);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites", editingSite?.id, "products"] });
      setSupplierSearch("");
      toast({
        title: "Products imported",
        description: `${data.count} products found from ${selectedSupplier} with AI-optimized pricing`,
      });
      setSideTab("products");
    },
    onError: (err: any) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  const aiPricingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/sites/${editingSite!.id}/ai-pricing`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites", editingSite?.id, "products"] });
      toast({
        title: "Pricing optimized",
        description: `AI re-analyzed ${data.optimized} products for maximum profit margins`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Pricing analysis failed", description: err.message, variant: "destructive" });
    },
  });

  const addProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", `/api/sites/${editingSite!.id}/products`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites", editingSite?.id, "products"] });
      setProductDialogOpen(false);
      setEditingProduct(null);
      setProductForm({ productName: "", description: "", category: "General", supplierPrice: "", suggestedRetailPrice: "", images: [""] });
      toast({ title: "Product added" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add product", description: err.message, variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ productId, payload }: { productId: string; payload: any }) => {
      const res = await apiRequest("PUT", `/api/sites/${editingSite!.id}/products/${productId}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites", editingSite?.id, "products"] });
      setProductDialogOpen(false);
      setEditingProduct(null);
      setProductForm({ productName: "", description: "", category: "General", supplierPrice: "", suggestedRetailPrice: "", images: [""] });
      toast({ title: "Product updated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update product", description: err.message, variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiRequest("DELETE", `/api/sites/${editingSite!.id}/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites", editingSite?.id, "products"] });
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
  const products = productsData?.products || [];
  const selBlockObj = blocks.find(b => b.id === selBlock);
  const isEcommerce = editingSite?.template === "ecommerce";

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-web-builder">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
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
            <p className="text-muted-foreground mt-1 text-sm">Describe your vision and let AI build it, or start from a template</p>
          </div>
          <Button onClick={() => { setCreateOpen(true); setCreateMode("ai"); }} data-testid="button-create-site">
            <Sparkles className="w-4 h-4 mr-1.5" /> New Site
          </Button>
        </div>

        <Card className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="card-ai-quick-build">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">AI Quick Build</h3>
              <p className="text-xs text-muted-foreground mb-3">Describe your business and what you need. AI will design and build your entire website in seconds.</p>
              <div className="flex gap-2">
                <Textarea
                  placeholder="e.g. I'm launching an online store selling handmade jewelry. I need a modern, elegant site with product showcase, about us story, and easy checkout..."
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  className="min-h-[80px] text-sm flex-1"
                  data-testid="input-ai-quick-prompt"
                />
              </div>
              <div className="flex items-center gap-3 mt-3">
                <Select value={aiSiteType} onValueChange={setAiSiteType}>
                  <SelectTrigger className="w-40 h-8 text-xs" data-testid="select-site-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="ecommerce">E-commerce Store</SelectItem>
                    <SelectItem value="saas">SaaS Product</SelectItem>
                    <SelectItem value="agency">Agency/Services</SelectItem>
                    <SelectItem value="portfolio">Portfolio</SelectItem>
                    <SelectItem value="blog">Blog/Media</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="medical">Medical/Health</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="nonprofit">Non-Profit</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    if (aiPrompt.trim().length < 5) {
                      toast({ title: "Too short", description: "Please describe what you want to build", variant: "destructive" });
                      return;
                    }
                    aiGenerateMutation.mutate({ description: aiPrompt, siteType: aiSiteType });
                  }}
                  disabled={aiGenerateMutation.isPending}
                  data-testid="button-ai-quick-generate"
                >
                  {aiGenerateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Building...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-1.5" /> Generate Website</>
                  )}
                </Button>
              </div>
              {aiGenerateMutation.isPending && (
                <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    AI is designing your website structure, writing copy, and optimizing layout...
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {sites.length === 0 ? (
          <Card className="p-12 text-center">
            <Globe className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sites yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Use AI Quick Build above or create from a template</p>
            <Button variant="outline" onClick={() => { setCreateOpen(true); setCreateMode("template"); }} data-testid="button-create-from-template">
              <Plus className="w-4 h-4 mr-1.5" /> Start from Template
            </Button>
          </Card>
        ) : (
          <div>
            <h3 className="font-semibold text-sm mb-3">Your Sites ({sites.length})</h3>
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
                    <p className="text-xs text-muted-foreground mb-1">Template: {site.template} · {site.visitors} visitors</p>
                    {site.status === "live" && site.slug && (
                      <a
                        href={`/site/${site.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2 truncate"
                        data-testid={`link-live-url-${site.id}`}
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" /> /site/{site.slug}
                      </a>
                    )}
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
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Site</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2 mb-4">
              <Button
                variant={createMode === "ai" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setCreateMode("ai")}
                data-testid="button-mode-ai"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI Build
              </Button>
              <Button
                variant={createMode === "template" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setCreateMode("template")}
                data-testid="button-mode-template"
              >
                <Layout className="w-3.5 h-3.5 mr-1.5" /> From Template
              </Button>
            </div>

            {createMode === "ai" ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Describe your website</label>
                  <Textarea
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="I need a professional website for my dental practice. It should have appointment booking, services list, team bios, patient testimonials, and insurance information..."
                    className="min-h-[120px] text-sm"
                    data-testid="input-ai-description"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Site Type</label>
                  <Select value={aiSiteType} onValueChange={setAiSiteType}>
                    <SelectTrigger data-testid="select-ai-site-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="ecommerce">E-commerce Store</SelectItem>
                      <SelectItem value="saas">SaaS Product</SelectItem>
                      <SelectItem value="agency">Agency/Services</SelectItem>
                      <SelectItem value="portfolio">Portfolio</SelectItem>
                      <SelectItem value="blog">Blog/Media</SelectItem>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="medical">Medical/Health</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="nonprofit">Non-Profit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
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
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)} data-testid="button-cancel-create">Cancel</Button>
              {createMode === "ai" ? (
                <Button
                  onClick={() => aiGenerateMutation.mutate({ description: aiPrompt, siteType: aiSiteType })}
                  disabled={aiGenerateMutation.isPending || aiPrompt.trim().length < 5}
                  data-testid="button-confirm-ai-generate"
                >
                  {aiGenerateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                  Generate
                </Button>
              ) : (
                <Button
                  onClick={() => createMutation.mutate({ name: newName, template: newTemplate })}
                  disabled={createMutation.isPending}
                  data-testid="button-confirm-create-site"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
                  Create
                </Button>
              )}
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
          {isEcommerce && products.length > 0 && (
            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
              <Package className="w-3 h-3 mr-1" /> {products.length} products
            </Badge>
          )}
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
          {editingSite?.status === "live" && editingSite?.slug && (
            <a
              href={`/site/${editingSite.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 ml-1"
              data-testid="link-view-live-site"
            >
              <ExternalLink className="w-3 h-3" /> View Live
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-60 shrink-0 border-r border-border/50 overflow-y-auto bg-card flex flex-col">
          <div className="flex border-b border-border/50 flex-wrap">
            {(["sections", "elements", ...(isEcommerce ? ["suppliers", "products"] as const : [])] as const).map(t => (
              <button
                key={t}
                onClick={() => setSideTab(t as any)}
                className={`flex-1 px-2 py-2 text-[11px] font-semibold capitalize ${sideTab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
                data-testid={`tab-${t}`}
              >
                {t === "suppliers" ? "Import" : t === "products" ? `Products${products.length ? ` (${products.length})` : ""}` : t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {sideTab === "sections" && (
              <div className="p-3 space-y-1.5">
                {SECTIONS.map(sec => (
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
                ))}
              </div>
            )}

            {sideTab === "elements" && (
              <div className="p-3 space-y-1.5">
                {ELEMENTS.map(el => (
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
            )}

            {sideTab === "suppliers" && (
              <div className="p-3 space-y-3">
                <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <p className="text-[10px] text-blue-400 font-medium mb-1">Connect Suppliers</p>
                  <p className="text-[10px] text-muted-foreground">Search products from major suppliers. AI will suggest optimal pricing.</p>
                </div>

                <div>
                  <label className="text-[11px] font-medium mb-1.5 block">Supplier</label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-supplier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIERS.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <ShoppingCart className={`w-3 h-3 ${s.color}`} />
                            {s.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-[11px] font-medium mb-1.5 block">Search Products</label>
                  <div className="flex gap-1.5">
                    <Input
                      value={supplierSearch}
                      onChange={e => setSupplierSearch(e.target.value)}
                      placeholder="e.g. wireless earbuds"
                      className="h-8 text-xs flex-1"
                      data-testid="input-supplier-search"
                    />
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    if (!supplierSearch.trim()) {
                      toast({ title: "Enter a search query", variant: "destructive" });
                      return;
                    }
                    importSupplierMutation.mutate({
                      supplierName: selectedSupplier,
                      searchQuery: supplierSearch,
                    });
                  }}
                  disabled={importSupplierMutation.isPending}
                  data-testid="button-import-products"
                >
                  {importSupplierMutation.isPending ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Importing...</>
                  ) : (
                    <><Search className="w-3.5 h-3.5 mr-1" /> Find & Import</>
                  )}
                </Button>

                <div className="border-t border-border/50 pt-3">
                  <p className="text-[10px] font-medium text-muted-foreground mb-2">Supported Suppliers</p>
                  <div className="space-y-1">
                    {SUPPLIERS.map(s => (
                      <div key={s.id} className="flex items-center gap-2 p-1.5 rounded text-[10px]" data-testid={`supplier-${s.id}`}>
                        <ShoppingCart className={`w-3 h-3 ${s.color}`} />
                        <span className="font-medium">{s.label}</span>
                        <span className="text-muted-foreground ml-auto">{s.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {sideTab === "products" && (
              <div className="p-3 space-y-3">
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({ productName: "", description: "", category: "General", supplierPrice: "", suggestedRetailPrice: "", imageUrl: "" });
                      setProductDialogOpen(true);
                    }}
                    data-testid="button-add-product"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
                  </Button>
                  {products.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => aiPricingMutation.mutate()}
                      disabled={aiPricingMutation.isPending}
                      data-testid="button-optimize-pricing"
                    >
                      {aiPricingMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                </div>

                {products.length === 0 ? (
                  <div className="text-center py-6">
                    <Package className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No products yet</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Add your own or import from suppliers</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {products.map(p => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-lg border border-border/50 bg-secondary/20 group cursor-pointer hover:border-blue-500/30 transition-all"
                        onClick={() => {
                          setEditingProduct(p);
                          const existingImages = (p as any).images?.length ? (p as any).images : (p.imageUrl ? [p.imageUrl] : [""]);
                          setProductForm({
                            productName: p.productName,
                            description: p.description || "",
                            category: p.category || "General",
                            supplierPrice: String(p.supplierPrice || ""),
                            suggestedRetailPrice: String(p.suggestedRetailPrice || ""),
                            images: existingImages.length ? existingImages : [""],
                          });
                          setProductDialogOpen(true);
                        }}
                        data-testid={`product-${p.id}`}
                      >
                        <div className="flex items-start gap-2">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.productName}
                              className="w-10 h-10 rounded object-cover shrink-0 bg-secondary"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-xs font-medium truncate">{p.productName}</p>
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                                onClick={(e) => { e.stopPropagation(); deleteProductMutation.mutate(p.id); }}
                                data-testid={`button-delete-product-${p.id}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{p.category} · {p.supplierName}</p>
                            {p.description && (
                              <p className="text-[10px] text-muted-foreground/70 line-clamp-1 mt-0.5">{p.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Cost:</span>
                            <span className="text-xs font-mono font-bold">${p.supplierPrice.toFixed(2)}</span>
                          </div>
                          <TrendingUp className="w-3 h-3 text-muted-foreground" />
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Sell:</span>
                            <span className="text-xs font-mono font-bold text-emerald-500">${p.suggestedRetailPrice?.toFixed(2) || "—"}</span>
                          </div>
                          <MarginBadge margin={p.margin || 0} />
                        </div>
                        {p.aiNotes && (
                          <p className="text-[10px] text-muted-foreground/70 mt-1.5 line-clamp-2">{p.aiNotes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {products.length > 0 && (
                  <div className="border-t border-border/50 pt-3">
                    <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[11px] font-semibold text-emerald-500">Profit Summary</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-muted-foreground">Avg Cost:</span>
                          <span className="font-mono font-bold ml-1">
                            ${(products.reduce((s, p) => s + p.supplierPrice, 0) / products.length).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Sell:</span>
                          <span className="font-mono font-bold text-emerald-500 ml-1">
                            ${(products.reduce((s, p) => s + (p.suggestedRetailPrice || 0), 0) / products.length).toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Margin:</span>
                          <span className="font-mono font-bold ml-1">
                            {(products.reduce((s, p) => s + (p.margin || 0), 0) / products.length).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Products:</span>
                          <span className="font-mono font-bold ml-1">{products.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                const content = block.content;
                return (
                  <div
                    key={block.id}
                    onClick={() => setSelBlock(block.id)}
                    className={`relative cursor-pointer border-b border-border/30 transition-all ${isSel ? "ring-2 ring-primary/30 bg-primary/5" : "hover:bg-secondary/30"}`}
                    style={{ minHeight: block.height }}
                    data-testid={`block-${block.id}`}
                  >
                    <div className="flex items-center justify-center h-full p-6" style={{ minHeight: block.height }}>
                      <div className="text-center max-w-lg">
                        {secMeta && <secMeta.icon className={`w-6 h-6 ${secMeta.color} mx-auto mb-2 opacity-30`} />}
                        {content?.heading ? (
                          <>
                            <h3 className="text-lg font-bold mb-1">{content.heading}</h3>
                            {content.subheading && <p className="text-xs text-muted-foreground mb-2">{content.subheading}</p>}
                            {content.buttonText && (
                              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs rounded-md">{content.buttonText}</span>
                            )}
                            {content.items && content.items.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 mt-3 text-left">
                                {content.items.slice(0, 4).map((item, i) => (
                                  <div key={i} className="p-2 rounded bg-secondary/30 border border-border/30">
                                    <p className="text-[11px] font-semibold">{item.title}</p>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2">{item.description}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">{block.label}</p>
                        )}
                      </div>
                    </div>
                    {isSel && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); moveBlock(block.id, "up"); }} data-testid={`button-move-up-${block.id}`}>
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); moveBlock(block.id, "dn"); }} data-testid={`button-move-down-${block.id}`}>
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={e => { e.stopPropagation(); removeBlock(block.id); }} data-testid={`button-remove-${block.id}`}>
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
              onClick={() => setSideTab("sections")}
              data-testid="button-add-section-canvas"
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
              {selBlockObj.content?.heading && (
                <div>
                  <label className="text-xs font-medium mb-1 block">Heading</label>
                  <Input
                    defaultValue={selBlockObj.content.heading}
                    className="text-xs"
                    onBlur={e => {
                      setBlocks(prev => prev.map(b =>
                        b.id === selBlockObj.id ? { ...b, content: { ...b.content, heading: e.target.value } } : b
                      ));
                    }}
                    data-testid="input-block-heading"
                  />
                </div>
              )}
              {selBlockObj.content?.subheading && (
                <div>
                  <label className="text-xs font-medium mb-1 block">Subheading</label>
                  <Textarea
                    defaultValue={selBlockObj.content.subheading}
                    className="text-xs min-h-[60px]"
                    onBlur={e => {
                      setBlocks(prev => prev.map(b =>
                        b.id === selBlockObj.id ? { ...b, content: { ...b.content, subheading: e.target.value } } : b
                      ));
                    }}
                    data-testid="input-block-subheading"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium mb-1.5 block">Background</label>
                <div className="flex gap-1.5">
                  {["bg-card", "bg-blue-50 dark:bg-blue-950/30", "bg-emerald-50 dark:bg-emerald-950/30", "bg-amber-50 dark:bg-amber-950/30"].map((bg, i) => (
                    <div key={i} className={`w-7 h-7 rounded-md ${bg} border-2 ${i === 0 ? "border-primary" : "border-border"} cursor-pointer`} />
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-border/50 space-y-2">
                <Button variant="default" size="sm" className="w-full text-xs" data-testid="button-edit-content">Edit Content</Button>
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

      <Dialog open={productDialogOpen} onOpenChange={(open) => {
        setProductDialogOpen(open);
        if (!open) {
          setEditingProduct(null);
          setProductForm({ productName: "", description: "", category: "General", supplierPrice: "", suggestedRetailPrice: "", images: [""] });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Product Name *</Label>
              <Input
                value={productForm.productName}
                onChange={e => setProductForm(f => ({ ...f, productName: e.target.value }))}
                placeholder="e.g. Wireless Bluetooth Earbuds"
                data-testid="input-product-name"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={productForm.description}
                onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe your product — features, benefits, what makes it special..."
                rows={3}
                data-testid="input-product-description"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Product Images (up to 5)</Label>
                <span className="text-[10px] text-muted-foreground">{productForm.images.filter(u => u.trim()).length}/5</span>
              </div>
              <div className="space-y-2">
                {productForm.images.map((url, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="flex-1 space-y-1">
                      <Input
                        value={url}
                        onChange={e => {
                          const updated = [...productForm.images];
                          updated[idx] = e.target.value;
                          setProductForm(f => ({ ...f, images: updated }));
                        }}
                        placeholder={`Image URL ${idx + 1}`}
                        className="text-xs h-8"
                        data-testid={`input-product-image-${idx}`}
                      />
                      {url.trim() && (
                        <div className="w-16 h-16 rounded-md overflow-hidden bg-secondary border border-border/50">
                          <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                      )}
                    </div>
                    {productForm.images.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          const updated = productForm.images.filter((_, i) => i !== idx);
                          setProductForm(f => ({ ...f, images: updated.length ? updated : [""] }));
                        }}
                        data-testid={`button-remove-image-${idx}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {productForm.images.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 text-xs h-7"
                  onClick={() => setProductForm(f => ({ ...f, images: [...f.images, ""] }))}
                  data-testid="button-add-image-slot"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Another Image
                </Button>
              )}
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={productForm.category} onValueChange={v => setProductForm(f => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="select-product-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["General", "Electronics", "Fashion", "Home & Garden", "Beauty", "Sports", "Toys", "Automotive", "Health", "Food", "Office", "Pet", "Baby", "Services"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cost Price ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.supplierPrice}
                  onChange={e => setProductForm(f => ({ ...f, supplierPrice: e.target.value }))}
                  placeholder="0.00"
                  data-testid="input-product-cost"
                />
              </div>
              <div>
                <Label className="text-xs">Retail Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.suggestedRetailPrice}
                  onChange={e => setProductForm(f => ({ ...f, suggestedRetailPrice: e.target.value }))}
                  placeholder="Auto-calculated"
                  data-testid="input-product-retail"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)} data-testid="button-cancel-product">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!productForm.productName.trim() || !productForm.supplierPrice) {
                  toast({ title: "Name and cost price are required", variant: "destructive" });
                  return;
                }
                const cleanImages = productForm.images.filter(u => u.trim()).slice(0, 5);
                const payload = {
                  ...productForm,
                  supplierPrice: parseFloat(productForm.supplierPrice) || 0,
                  suggestedRetailPrice: productForm.suggestedRetailPrice ? parseFloat(productForm.suggestedRetailPrice) : undefined,
                  images: cleanImages,
                  imageUrl: cleanImages[0] || undefined,
                };
                if (editingProduct) {
                  updateProductMutation.mutate({ productId: editingProduct.id, payload });
                } else {
                  addProductMutation.mutate(payload);
                }
              }}
              disabled={addProductMutation.isPending || updateProductMutation.isPending}
              data-testid="button-save-product"
            >
              {(addProductMutation.isPending || updateProductMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {editingProduct ? "Update Product" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
