import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Building2,
  MapPin,
  Microscope,
  UserSearch,
  Bookmark,
  Download,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  Shield,
  Server,
  Clock,
  Star,
  Brain,
  Sparkles,
  Lightbulb,
  Target,
  TrendingUp,
} from "lucide-react";
import { SiLinkedin } from "react-icons/si";

const API_BASE = "/api/free-leads";

type Tab = "search" | "local" | "enrich" | "contact" | "saved";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "search", label: "Find Leads", icon: Search },
  { id: "local", label: "Local Search", icon: MapPin },
  { id: "enrich", label: "Enrich Domain", icon: Microscope },
  { id: "contact", label: "Find Contact", icon: UserSearch },
  { id: "saved", label: "Saved", icon: Bookmark },
];

const INDUSTRIES = [
  "Healthcare", "Technology / SaaS", "Real Estate", "Legal Services",
  "Financial Services", "Manufacturing", "Retail", "Construction",
  "Education", "Hospitality", "Logistics", "Media & Marketing",
];

const BIZ_TYPES = [
  "medical practice", "dental office", "law firm", "accounting firm",
  "physical therapy", "chiropractic", "mental health counseling",
  "optometry", "veterinary clinic", "real estate agency",
  "insurance agency", "auto repair",
];

function scoreColor(s: number): string {
  if (s >= 75) return "text-chart-2";
  if (s >= 50) return "text-chart-5";
  return "text-muted-foreground";
}

function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-5 w-40 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </Card>
      ))}
    </div>
  );
}

function SrcBadge({ src }: { src: string }) {
  const labels: Record<string, string> = {
    ddg: "DuckDuckGo", bing: "Bing", yellowpages: "YellowPages",
    manta: "Manta", linkedin_dork: "LinkedIn", web: "Web",
    website: "Website", rdap: "RDAP", dns: "DNS",
    hunter: "Hunter.io", sec_edgar: "SEC EDGAR", pattern: "Pattern",
  };
  return <Badge variant="secondary" data-testid={`badge-src-${src}`}>{labels[src] || src}</Badge>;
}

export default function LeadIntelligencePage() {
  usePageTitle("Lead Intelligence");
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("search");

  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  const [saved, setSaved] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("argiflow_leads") || "[]"); }
    catch { return []; }
  });

  const [sq, setSq] = useState({ q: "", industry: "", location: "", size: "", limit: "20" });
  const [lq, setLq] = useState({ type: "medical practice", city: "", state: "", limit: "25" });
  const [eq, setEq] = useState({ domain: "" });
  const [cq, setCq] = useState({ firstName: "", lastName: "", domain: "", company: "", title: "" });

  const searchMutation = useMutation({
    mutationFn: async (params: typeof sq) => {
      const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)));
      const res = await fetch(`${API_BASE}/search?${qs}`, { credentials: "include" });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
      return res.json();
    },
    onSuccess: (data) => toast({ title: `Found ${data.total} leads` }),
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const localMutation = useMutation({
    mutationFn: async (params: typeof lq) => {
      const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)));
      const res = await fetch(`${API_BASE}/local?${qs}`, { credentials: "include" });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
      return res.json();
    },
    onSuccess: (data) => toast({ title: `Found ${data.total} businesses` }),
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const enrichMutation = useMutation({
    mutationFn: async (domain: string) => {
      const res = await fetch(`${API_BASE}/enrich?domain=${encodeURIComponent(domain)}`, { credentials: "include" });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
      return res.json();
    },
    onSuccess: (data) => toast({ title: `Enriched ${data.domain}` }),
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const contactMutation = useMutation({
    mutationFn: async (params: typeof cq) => {
      const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)));
      const res = await fetch(`${API_BASE}/contact?${qs}`, { credentials: "include" });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
      return res.json();
    },
    onSuccess: (data) => toast({ title: `Found ${data.emails?.length || 0} emails` }),
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const results = searchMutation.data?.leads || [];
  const localResults = localMutation.data || null;
  const enrichData = enrichMutation.data || null;
  const contactData = contactMutation.data || null;
  const loading = searchMutation.isPending || localMutation.isPending || enrichMutation.isPending || contactMutation.isPending;

  function doSearch() {
    if (!sq.q && !sq.industry && !sq.location) {
      return toast({ title: "Enter at least one search field", variant: "destructive" });
    }
    setSelectedLeads(new Set());
    searchMutation.mutate(sq);
  }

  function doLocal() {
    if (!lq.city) return toast({ title: "Enter a city", variant: "destructive" });
    localMutation.mutate(lq);
  }

  function doEnrich() {
    if (!eq.domain) return toast({ title: "Enter a domain", variant: "destructive" });
    enrichMutation.mutate(eq.domain);
  }

  function doContact() {
    const { firstName, lastName, domain } = cq;
    if (!firstName || !lastName || !domain) return toast({ title: "First name, last name & domain required", variant: "destructive" });
    contactMutation.mutate(cq);
  }

  function saveLead(lead: any) {
    setSaved((prev) => {
      if (prev.find((l: any) => l.domain === lead.domain)) {
        toast({ title: "Already saved" }); return prev;
      }
      const next = [{ ...lead, savedAt: new Date().toISOString() }, ...prev];
      localStorage.setItem("argiflow_leads", JSON.stringify(next));
      toast({ title: `Saved: ${lead.name || lead.domain}` });
      return next;
    });
  }

  function saveSelected() {
    results.filter((r) => selectedLeads.has(r.domain)).forEach(saveLead);
    setSelectedLeads(new Set());
  }

  function removeSaved(domain: string) {
    setSaved((prev) => {
      const next = prev.filter((l: any) => l.domain !== domain);
      localStorage.setItem("argiflow_leads", JSON.stringify(next));
      return next;
    });
  }

  async function exportCSV(leads: any[]) {
    try {
      const res = await fetch(`${API_BASE}/export`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads, format: "csv" }),
      });
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "argiflow-leads.csv";
      a.click();
      toast({ title: "CSV downloaded" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Lead Intelligence</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered lead discovery, scoring, and enrichment from 12+ data sources</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" data-testid="badge-ai-powered">
            <Brain className="w-3 h-3 mr-1" />
            AI-Powered
          </Badge>
          {saved.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setTab("saved")} data-testid="button-view-saved">
              <Bookmark className="w-4 h-4 mr-1" />
              {saved.length} Saved
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab(t.id)}
            data-testid={`tab-${t.id}`}
          >
            <t.icon className="w-4 h-4 mr-1.5" />
            {t.label}
            {t.id === "saved" && saved.length > 0 && (
              <Badge variant="secondary" className="ml-1.5">{saved.length}</Badge>
            )}
          </Button>
        ))}
      </div>

      {tab === "search" && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div className="space-y-1.5">
                <Label>Search Query</Label>
                <Input
                  value={sq.q}
                  placeholder="medical billing, SaaS startup..."
                  onChange={(e) => setSq((s) => ({ ...s, q: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && doSearch()}
                  data-testid="input-search-query"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select value={sq.industry} onValueChange={(v) => setSq((s) => ({ ...s, industry: v === "__all__" ? "" : v }))}>
                  <SelectTrigger data-testid="select-industry">
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Industries</SelectItem>
                    {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input
                  value={sq.location}
                  placeholder="Tampa FL, Chicago..."
                  onChange={(e) => setSq((s) => ({ ...s, location: e.target.value }))}
                  data-testid="input-search-location"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Company Size</Label>
                <Select value={sq.size} onValueChange={(v) => setSq((s) => ({ ...s, size: v === "__any__" ? "" : v }))}>
                  <SelectTrigger data-testid="select-size">
                    <SelectValue placeholder="Any Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">Any Size</SelectItem>
                    <SelectItem value="micro">Micro (1-10)</SelectItem>
                    <SelectItem value="small">Small (11-50)</SelectItem>
                    <SelectItem value="medium">Medium (51-200)</SelectItem>
                    <SelectItem value="large">Large (200+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Results</Label>
                <Select value={sq.limit} onValueChange={(v) => setSq((s) => ({ ...s, limit: v }))}>
                  <SelectTrigger data-testid="select-limit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={doSearch} disabled={loading} data-testid="button-search-leads">
                {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
                {loading ? "Searching..." : "Search Leads"}
              </Button>
              {results.length > 0 && selectedLeads.size > 0 && (
                <Button variant="secondary" onClick={saveSelected} data-testid="button-save-selected">
                  <Bookmark className="w-4 h-4 mr-1" />
                  Save Selected ({selectedLeads.size})
                </Button>
              )}
              {results.length > 0 && (
                <Button variant="outline" onClick={() => exportCSV(results)} data-testid="button-export-csv">
                  <Download className="w-4 h-4 mr-1" />
                  Export CSV
                </Button>
              )}
              {searchMutation.data?.aiPowered !== false && (
                <Badge variant="outline">
                  <Sparkles className="w-3 h-3 mr-1" />
                  GPT-4o AI Analysis
                </Badge>
              )}
              {searchMutation.data?.aiPowered === false && (
                <Badge variant="outline" className="text-muted-foreground">
                  <Shield className="w-3 h-3 mr-1" />
                  12 Data Sources
                </Badge>
              )}
            </div>
          </Card>

          {loading && <LoadingCards count={4} />}

          {results.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <span className="text-sm font-medium" data-testid="text-result-count">{results.length} results</span>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedLeads.size === results.length && results.length > 0}
                    onChange={(e) => setSelectedLeads(e.target.checked ? new Set(results.map((r: any) => r.domain)) : new Set())}
                    data-testid="checkbox-select-all"
                  />
                  Select all
                </label>
              </div>
              <div className="space-y-3">
                {results.map((lead: any, i: number) => (
                  <div key={i} className="p-3 rounded-md border border-border/50 hover-elevate" data-testid={`lead-row-${i}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedLeads.has(lead.domain)}
                        onChange={() => setSelectedLeads((prev) => {
                          const next = new Set(prev);
                          next.has(lead.domain) ? next.delete(lead.domain) : next.add(lead.domain);
                          return next;
                        })}
                        className="mt-1"
                        data-testid={`checkbox-lead-${i}`}
                      />
                      <img
                        src={`https://logo.clearbit.com/${lead.domain}`}
                        alt=""
                        className="w-8 h-8 rounded-md bg-secondary object-contain shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate" data-testid={`text-lead-name-${i}`}>{lead.name}</span>
                          <SrcBadge src={lead.src} />
                          {lead.aiAnalysis && (
                            <Badge variant="outline" className="text-chart-1 border-chart-1/30" data-testid={`badge-ai-scored-${i}`}>
                              <Brain className="w-3 h-3 mr-1" />
                              AI Scored
                            </Badge>
                          )}
                          {lead.aiAnalysis?.buyerIntent && lead.aiAnalysis.buyerIntent !== "unknown" && (
                            <Badge variant={lead.aiAnalysis.buyerIntent === "high" ? "default" : "secondary"} data-testid={`badge-intent-${i}`}>
                              <Target className="w-3 h-3 mr-1" />
                              {lead.aiAnalysis.buyerIntent} intent
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{lead.domain}</p>
                        {lead.aiAnalysis?.reasoning
                          ? <p className="text-xs text-muted-foreground mt-1">{lead.aiAnalysis.reasoning}</p>
                          : lead.snippet && <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{lead.snippet}</p>
                        }
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-bold ${scoreColor(lead.score)}`} data-testid={`text-lead-score-${i}`}>{lead.score}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setEq({ domain: lead.domain }); setTab("enrich"); }}
                          data-testid={`button-enrich-lead-${i}`}
                        >
                          <Microscope className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant={saved.find((s: any) => s.domain === lead.domain) ? "default" : "ghost"}
                          onClick={() => saveLead(lead)}
                          data-testid={`button-save-lead-${i}`}
                        >
                          <Bookmark className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {lead.aiAnalysis && (
                      <div className="mt-3 pt-3 border-t border-border/30 space-y-2" data-testid={`ai-analysis-${i}`}>
                        <div className="grid sm:grid-cols-3 gap-2">
                          {lead.aiAnalysis.industry && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Industry:</span>{" "}
                              <span className="font-medium">{lead.aiAnalysis.industry}</span>
                            </div>
                          )}
                          {lead.aiAnalysis.companySize && lead.aiAnalysis.companySize !== "unknown" && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Size:</span>{" "}
                              <span className="font-medium">{lead.aiAnalysis.companySize}</span>
                            </div>
                          )}
                          {lead.aiAnalysis.idealOutreach && (
                            <div className="text-xs col-span-full">
                              <span className="text-muted-foreground">Outreach:</span>{" "}
                              <span>{lead.aiAnalysis.idealOutreach}</span>
                            </div>
                          )}
                        </div>
                        {lead.aiAnalysis.painPoints?.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap">
                            {lead.aiAnalysis.painPoints.map((p: string, j: number) => (
                              <Badge key={j} variant="secondary" className="text-xs">{p}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!loading && results.length === 0 && (
            <Card className="p-12 text-center">
              <Globe className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-semibold mb-1">Find your next leads</h3>
              <p className="text-sm text-muted-foreground">Enter a search query, industry, or location above</p>
            </Card>
          )}
        </div>
      )}

      {tab === "local" && (
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-sm text-muted-foreground mb-4">
              Searches Yellow Pages + Manta + web — zero cost, no API key.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="space-y-1.5">
                <Label>Business Type</Label>
                <Select value={lq.type} onValueChange={(v) => setLq((s) => ({ ...s, type: v }))}>
                  <SelectTrigger data-testid="select-biz-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BIZ_TYPES.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={lq.city} placeholder="Tampa" onChange={(e) => setLq((s) => ({ ...s, city: e.target.value }))} data-testid="input-local-city" />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={lq.state} placeholder="FL" onChange={(e) => setLq((s) => ({ ...s, state: e.target.value }))} data-testid="input-local-state" />
              </div>
              <div className="space-y-1.5">
                <Label>Limit</Label>
                <Select value={lq.limit} onValueChange={(v) => setLq((s) => ({ ...s, limit: v }))}>
                  <SelectTrigger data-testid="select-local-limit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={doLocal} disabled={loading} data-testid="button-local-search">
                {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MapPin className="w-4 h-4 mr-1" />}
                {loading ? "Searching..." : "Find Businesses"}
              </Button>
              {localResults && (
                <Button variant="outline" onClick={() => {
                  const rows = localResults?.businesses || [];
                  const csv = ["Name,Phone,Address,Website,Source",
                    ...rows.map((r: any) => `"${r.name || ""}","${r.phone || ""}","${r.address || ""}","${r.website || ""}","${r.src || ""}"`)
                  ].join("\n");
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                  a.download = "argiflow-local.csv";
                  a.click();
                  toast({ title: "CSV downloaded" });
                }} data-testid="button-local-export">
                  <Download className="w-4 h-4 mr-1" />
                  Export CSV
                </Button>
              )}
            </div>
          </Card>

          {loading && <LoadingCards count={4} />}

          {localResults && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-sm font-medium" data-testid="text-local-count">{localResults.total} businesses in {localResults.location}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      {["Business", "Phone", "Address", "Source", "Actions"].map((h) => (
                        <th key={h} className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {localResults.businesses.map((biz: any, i: number) => (
                      <tr key={i} className="border-b border-border/30 hover-elevate" data-testid={`local-row-${i}`}>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-sm">{biz.name}</div>
                          {biz.website && <div className="text-xs text-muted-foreground">{biz.website?.replace(/https?:\/\/(www\.)?/, "").split("/")[0]}</div>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-xs text-chart-5">{biz.phone || "—"}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-xs text-muted-foreground">{biz.address || "—"}</span>
                        </td>
                        <td className="py-2.5 px-3"><SrcBadge src={biz.src} /></td>
                        <td className="py-2.5 px-3">
                          <Button size="sm" variant="ghost" onClick={() => saveLead({ ...biz, domain: biz.domain || biz.website?.split("/")[2], src: "local" })} data-testid={`button-save-local-${i}`}>
                            <Bookmark className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {localResults?.aiInsights && (
            <Card className="p-5" data-testid="card-local-ai-insights">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-chart-1" />
                <span className="font-semibold text-sm">AI Market Analysis</span>
                <Badge variant="outline" className="text-chart-1 border-chart-1/30">GPT-4o</Badge>
              </div>
              {localResults.aiInsights.marketInsights && (
                <p className="text-sm text-muted-foreground mb-3">{localResults.aiInsights.marketInsights}</p>
              )}
              {localResults.aiInsights.outreachTips && (
                <div className="text-sm">
                  <span className="text-muted-foreground font-medium">Outreach Tips: </span>
                  <span>{localResults.aiInsights.outreachTips}</span>
                </div>
              )}
              {localResults.aiInsights.topProspects?.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Top prospects: #{localResults.aiInsights.topProspects.join(", #")}
                </div>
              )}
            </Card>
          )}

          {!loading && !localResults && (
            <Card className="p-12 text-center">
              <MapPin className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-semibold mb-1">Local Business Finder</h3>
              <p className="text-sm text-muted-foreground">AI-powered analysis of local businesses — medical practices, law firms, dentists, and more</p>
            </Card>
          )}
        </div>
      )}

      {tab === "enrich" && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <Label>Company Domain</Label>
                <Input
                  value={eq.domain}
                  placeholder="acme.com"
                  onChange={(e) => setEq({ domain: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && doEnrich()}
                  data-testid="input-enrich-domain"
                />
              </div>
              <Button onClick={doEnrich} disabled={loading} data-testid="button-enrich">
                {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Microscope className="w-4 h-4 mr-1" />}
                {loading ? "Enriching..." : "Enrich"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Pulls from: company website, Schema.org, RDAP/WHOIS, DNS, Clearbit Logo (all free)
            </p>
          </Card>

          {loading && <LoadingCards count={2} />}

          {enrichData && (
            <Card className="p-5">
              <div className="flex items-start gap-4 mb-5 flex-wrap">
                <img
                  src={enrichData.logo}
                  alt=""
                  className="w-12 h-12 rounded-md bg-secondary object-contain p-1 shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold" data-testid="text-enrich-name">{enrichData.name || enrichData.domain}</h3>
                  <a href={`https://${enrichData.domain}`} target="_blank" rel="noreferrer" className="text-xs text-chart-1 hover:underline" data-testid="link-enrich-domain">
                    {enrichData.domain}
                  </a>
                </div>
                <div className="flex gap-2 shrink-0">
                  {enrichData.linkedin && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={enrichData.linkedin} target="_blank" rel="noreferrer" data-testid="link-enrich-linkedin">
                        <SiLinkedin className="w-3 h-3 mr-1" />
                        LinkedIn
                      </a>
                    </Button>
                  )}
                  <Button size="sm" onClick={() => saveLead({ domain: enrichData.domain, name: enrichData.name, ...enrichData })} data-testid="button-save-enriched">
                    <Bookmark className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>

              {enrichData.description && (
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{enrichData.description}</p>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                {([
                  ["Email", enrichData.email, Mail],
                  ["Phone", enrichData.phone, Phone],
                  ["Address", enrichData.address, MapPin],
                  ["Employees", enrichData.employees, Building2],
                  ["Founded", enrichData.founded, Clock],
                  ["Domain Created", enrichData.domainCreated, Clock],
                  ["Registrar", enrichData.registrar, Shield],
                  ["DNS Active", enrichData.dnsActive ? "Yes" : "No", Server],
                  ["Has Email Server (MX)", enrichData.hasMX ? "Yes" : "No", Mail],
                ] as [string, any, any][]).filter(([, v]) => v !== null && v !== undefined).map(([label, value, Icon]) => (
                  <div key={label} className="flex items-start gap-2 p-2 rounded-md bg-secondary/30" data-testid={`enrich-field-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <Icon className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="text-sm break-all">{String(value)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {enrichData.mxRecords?.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">MX Records</span>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {enrichData.mxRecords.map((r: string) => <Badge key={r} variant="secondary">{r}</Badge>)}
                  </div>
                </div>
              )}

              {enrichData.sources?.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Data Sources</span>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {enrichData.sources.map((s: string) => <SrcBadge key={s} src={s} />)}
                  </div>
                </div>
              )}
            </Card>
          )}

          {enrichData?.aiInsights && (
            <Card className="p-5" data-testid="card-enrich-ai-insights">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4 text-chart-1" />
                <span className="font-semibold">AI Company Intelligence</span>
                <Badge variant="outline" className="text-chart-1 border-chart-1/30">GPT-4o</Badge>
              </div>
              {enrichData.aiInsights.summary && (
                <p className="text-sm text-muted-foreground mb-4">{enrichData.aiInsights.summary}</p>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                {enrichData.aiInsights.businessModel && (
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Business Model</span>
                    <p className="text-sm font-medium mt-1">{enrichData.aiInsights.businessModel}</p>
                  </div>
                )}
                {enrichData.aiInsights.estimatedRevenue && (
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Est. Revenue</span>
                    <p className="text-sm font-medium mt-1">{enrichData.aiInsights.estimatedRevenue}</p>
                  </div>
                )}
                {enrichData.aiInsights.estimatedEmployees && (
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Est. Employees</span>
                    <p className="text-sm font-medium mt-1">{enrichData.aiInsights.estimatedEmployees}</p>
                  </div>
                )}
                {enrichData.aiInsights.industry && (
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Industry</span>
                    <p className="text-sm font-medium mt-1">{enrichData.aiInsights.industry}</p>
                  </div>
                )}
              </div>
              {enrichData.aiInsights.keyProducts?.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Key Products / Services</span>
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {enrichData.aiInsights.keyProducts.map((p: string, i: number) => (
                      <Badge key={i} variant="secondary">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {enrichData.aiInsights.competitors?.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Competitors</span>
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {enrichData.aiInsights.competitors.map((c: string, i: number) => (
                      <Badge key={i} variant="outline">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {enrichData.aiInsights.technologyStack?.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Technology Stack</span>
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {enrichData.aiInsights.technologyStack.map((t: string, i: number) => (
                      <Badge key={i} variant="secondary">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {enrichData.aiInsights.decisionMakers?.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Key Decision Makers</span>
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {enrichData.aiInsights.decisionMakers.map((d: string, i: number) => (
                      <Badge key={i} variant="outline">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {enrichData.aiInsights.painPoints?.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Pain Points</span>
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {enrichData.aiInsights.painPoints.map((p: string, i: number) => (
                      <Badge key={i} variant="secondary">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {enrichData.aiInsights.outreachStrategy && (
                <div className="mt-4 p-3 rounded-md bg-secondary/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="w-3.5 h-3.5 text-chart-5" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Outreach Strategy</span>
                  </div>
                  <p className="text-sm">{enrichData.aiInsights.outreachStrategy}</p>
                </div>
              )}
              {enrichData.aiInsights.opportunities?.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Sales Opportunities</span>
                  <div className="space-y-1 mt-2">
                    {enrichData.aiInsights.opportunities.map((o: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <TrendingUp className="w-3.5 h-3.5 mt-0.5 text-chart-2 shrink-0" />
                        <span>{o}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {!loading && !enrichData && (
            <Card className="p-12 text-center">
              <Microscope className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-semibold mb-1">Enrich any domain</h3>
              <p className="text-sm text-muted-foreground">AI-powered company intelligence — get deep business insights, competitors, and outreach strategy</p>
            </Card>
          )}
        </div>
      )}

      {tab === "contact" && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={cq.firstName} placeholder="John" onChange={(e) => setCq((s) => ({ ...s, firstName: e.target.value }))} data-testid="input-contact-first" />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={cq.lastName} placeholder="Smith" onChange={(e) => setCq((s) => ({ ...s, lastName: e.target.value }))} data-testid="input-contact-last" />
              </div>
              <div className="space-y-1.5">
                <Label>Domain</Label>
                <Input value={cq.domain} placeholder="acme.com" onChange={(e) => setCq((s) => ({ ...s, domain: e.target.value }))} data-testid="input-contact-domain" />
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input value={cq.company} placeholder="Acme Corp" onChange={(e) => setCq((s) => ({ ...s, company: e.target.value }))} data-testid="input-contact-company" />
              </div>
              <div className="space-y-1.5">
                <Label>Job Title</Label>
                <Input value={cq.title} placeholder="CEO, Practice Manager" onChange={(e) => setCq((s) => ({ ...s, title: e.target.value }))} data-testid="input-contact-title" />
              </div>
            </div>
            <Button onClick={doContact} disabled={loading} data-testid="button-find-contact">
              {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <UserSearch className="w-4 h-4 mr-1" />}
              {loading ? "Searching..." : "Find Contact"}
            </Button>
          </Card>

          {loading && <LoadingCards count={2} />}

          {contactData && (
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold" data-testid="text-contact-heading">
                      {contactData.firstName} {contactData.lastName} — {contactData.domain}
                    </h3>
                    <Badge variant={contactData.confidence === "high" ? "default" : contactData.confidence === "medium" ? "secondary" : "outline"} data-testid="badge-confidence">
                      Confidence: {contactData.confidence}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={saved.find((s: any) => s.domain === contactData.domain) ? "secondary" : "default"}
                      onClick={() => saveLead({
                        name: `${contactData.firstName} ${contactData.lastName}`,
                        domain: contactData.domain,
                        email: contactData.emails?.[0]?.email || "",
                        phone: "",
                        src: "contact",
                        score: contactData.confidence === "high" ? 85 : contactData.confidence === "medium" ? 60 : 40,
                        linkedin: contactData.linkedInProfiles?.[0]?.profileUrl || "",
                        snippet: contactData.aiStrategy?.approachSummary || `${contactData.firstName} ${contactData.lastName} at ${contactData.domain}`,
                        aiAnalysis: contactData.aiStrategy ? { aiPowered: true, reasoning: contactData.aiStrategy.approachSummary } : undefined,
                      })}
                      data-testid="button-save-contact"
                    >
                      <Bookmark className="w-4 h-4 mr-1" />
                      {saved.find((s: any) => s.domain === contactData.domain) ? "Saved" : "Save Lead"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEq({ domain: contactData.domain }); setTab("enrich"); }}
                      data-testid="button-enrich-contact"
                    >
                      <Microscope className="w-4 h-4 mr-1" />
                      Enrich
                    </Button>
                  </div>
                </div>

                {contactData.emails?.length > 0 && (
                  <div className="mb-4">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Email Addresses Found</span>
                    <div className="space-y-2 mt-2">
                      {contactData.emails.map((e: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-md bg-secondary/30" data-testid={`contact-email-${i}`}>
                          {e.mxVerified ? <CheckCircle2 className="w-4 h-4 text-chart-2 shrink-0" /> : <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                          <span className="text-sm font-mono">{e.email}</span>
                          <Badge variant="secondary" className="ml-auto">{e.confidence}</Badge>
                          {e.src && <SrcBadge src={e.src} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {contactData.linkedInProfiles?.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">LinkedIn Profiles</span>
                    <div className="space-y-2 mt-2">
                      {contactData.linkedInProfiles.map((p: any, i: number) => (
                        <a key={i} href={p.profileUrl} target="_blank" rel="noreferrer"
                          className="flex items-center gap-3 p-2 rounded-md bg-secondary/30 hover-elevate"
                          data-testid={`contact-linkedin-${i}`}
                        >
                          <SiLinkedin className="w-4 h-4 text-chart-1 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{p.name}</div>
                            {p.headline && <div className="text-xs text-muted-foreground truncate">{p.headline}</div>}
                          </div>
                          <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {contactData.emails?.length === 0 && contactData.linkedInProfiles?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No contact information found</p>
                )}
              </Card>

              {contactData.aiStrategy && (
                <Card className="p-5" data-testid="card-contact-ai-strategy">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-4 h-4 text-chart-1" />
                    <span className="font-semibold">AI Outreach Strategy</span>
                    <Badge variant="outline" className="text-chart-1 border-chart-1/30">GPT-4o</Badge>
                  </div>
                  {contactData.aiStrategy.approachSummary && (
                    <p className="text-sm text-muted-foreground mb-4">{contactData.aiStrategy.approachSummary}</p>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {contactData.aiStrategy.bestChannel && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Best Channel</span>
                        <p className="text-sm font-medium mt-1">{contactData.aiStrategy.bestChannel}</p>
                      </div>
                    )}
                    {contactData.aiStrategy.bestTimeToReach && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Best Time</span>
                        <p className="text-sm font-medium mt-1">{contactData.aiStrategy.bestTimeToReach}</p>
                      </div>
                    )}
                    {contactData.aiStrategy.estimatedResponseRate && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Est. Response Rate</span>
                        <p className="text-sm font-medium mt-1">{contactData.aiStrategy.estimatedResponseRate}</p>
                      </div>
                    )}
                    {contactData.aiStrategy.personaType && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Persona Type</span>
                        <p className="text-sm font-medium mt-1">{contactData.aiStrategy.personaType}</p>
                      </div>
                    )}
                  </div>
                  {contactData.aiStrategy.talkingPoints?.length > 0 && (
                    <div className="mt-4">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Talking Points</span>
                      <div className="space-y-1.5 mt-2">
                        {contactData.aiStrategy.talkingPoints.map((p: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-chart-5 shrink-0" />
                            <span>{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {contactData.aiStrategy.subjectLineIdeas?.length > 0 && (
                    <div className="mt-4">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Subject Line Ideas</span>
                      <div className="space-y-1.5 mt-2">
                        {contactData.aiStrategy.subjectLineIdeas.map((s: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <Mail className="w-3.5 h-3.5 mt-0.5 text-chart-2 shrink-0" />
                            <span className="italic">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {contactData.aiStrategy.avoidList?.length > 0 && (
                    <div className="mt-4 p-3 rounded-md bg-destructive/5 border border-destructive/10">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Avoid</span>
                      <div className="flex gap-1.5 flex-wrap mt-2">
                        {contactData.aiStrategy.avoidList.map((a: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-destructive border-destructive/30">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {!loading && !contactData && (
            <Card className="p-12 text-center">
              <UserSearch className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-semibold mb-1">Find anyone's email</h3>
              <p className="text-sm text-muted-foreground">AI-powered email discovery with outreach strategy recommendations</p>
            </Card>
          )}
        </div>
      )}

      {tab === "saved" && (
        <div className="space-y-4">
          {saved.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" onClick={() => exportCSV(saved)} data-testid="button-export-saved">
                <Download className="w-4 h-4 mr-1" />
                Export All ({saved.length})
              </Button>
            </div>
          )}

          {saved.length > 0 ? (
            <div className="space-y-3">
              {saved.map((lead: any, i: number) => (
                <Card key={i} className="p-4" data-testid={`saved-lead-${i}`}>
                  <div className="flex items-start gap-3">
                    <img
                      src={`https://logo.clearbit.com/${lead.domain}`}
                      alt=""
                      className="w-8 h-8 rounded-md bg-secondary object-contain shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{lead.name || lead.domain}</span>
                        {lead.src && <SrcBadge src={lead.src} />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{lead.domain}</p>
                      {lead.email && <p className="text-xs text-chart-1 mt-1">{lead.email}</p>}
                      {lead.phone && <p className="text-xs text-chart-5 mt-0.5">{lead.phone}</p>}
                      {lead.linkedin && (
                        <a href={lead.linkedin} target="_blank" rel="noreferrer" className="text-xs text-chart-1 mt-0.5 inline-flex items-center gap-1 hover:underline" data-testid={`link-saved-linkedin-${i}`}>
                          <SiLinkedin className="w-3 h-3" /> LinkedIn
                        </a>
                      )}
                      {lead.aiAnalysis?.reasoning && <p className="text-xs text-muted-foreground/70 mt-1">{lead.aiAnalysis.reasoning}</p>}
                      {lead.savedAt && <p className="text-xs text-muted-foreground/60 mt-1">Saved {new Date(lead.savedAt).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setEq({ domain: lead.domain }); setTab("enrich"); }}
                        data-testid={`button-enrich-saved-${i}`}
                      >
                        <Microscope className="w-4 h-4" />
                      </Button>
                      {lead.website && (
                        <Button size="icon" variant="ghost" asChild>
                          <a href={lead.website} target="_blank" rel="noreferrer" data-testid={`link-saved-website-${i}`}>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeSaved(lead.domain)}
                        data-testid={`button-remove-saved-${i}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Bookmark className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <h3 className="font-semibold mb-1">No saved leads yet</h3>
              <p className="text-sm text-muted-foreground">Search for leads and save them here for later</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
