import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Users,
  Mail,
  Phone,
  TrendingUp,
  Cpu,
  GitBranch,
  Newspaper,
  Brain,
  ListChecks,
  Bookmark,
  Plus,
  ArrowRight,
  RefreshCw,
  Download,
  Eye,
  Trash2,
  ExternalLink,
  Briefcase,
  MapPin,
  Globe,
  Sparkles,
  Activity,
  BarChart3,
  Target,
  Zap,
  ChevronRight,
  UserPlus,
  Crown,
  AlertTriangle,
  Database,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";

type Tab = "people" | "companies" | "enrichment" | "email_finder" | "phone_finder" | "intent" | "technographics" | "org_chart" | "news" | "research" | "lists" | "searches";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "people", label: "People Search", icon: Users },
  { key: "companies", label: "Companies", icon: Building2 },
  { key: "enrichment", label: "Enrichment", icon: Sparkles },
  { key: "email_finder", label: "Email Finder", icon: Mail },
  { key: "phone_finder", label: "Phone Finder", icon: Phone },
  { key: "intent", label: "Intent Data", icon: TrendingUp },
  { key: "technographics", label: "Technographics", icon: Cpu },
  { key: "org_chart", label: "Org Charts", icon: GitBranch },
  { key: "news", label: "News & Events", icon: Newspaper },
  { key: "research", label: "AI Research", icon: Brain },
  { key: "lists", label: "Prospect Lists", icon: ListChecks },
  { key: "searches", label: "Saved Searches", icon: Bookmark },
];

function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

function PeopleSearchTab() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    jobTitle: "", seniority: "", department: "", company: "", industry: "", location: "",
  });
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const searchMutation = useMutation({
    mutationFn: async (params: any) => {
      const res = await apiRequest("POST", "/api/intelligence/people/search", params);
      return res.json();
    },
    onSuccess: (data: any) => {
      setResults(data.results || []);
      setHasSearched(true);
    },
    onError: (e: any) => toast({ title: "Search failed", description: e.message, variant: "destructive" }),
  });

  const saveToCrmMutation = useMutation({
    mutationFn: async (contact: any) => {
      const email = contact.workEmail || contact.email || "";
      const phone = contact.directPhone || contact.phone || contact.mobilePhone || "";
      if (!email && !phone) {
        throw new Error("No email or phone found for this contact. Cannot save without contact info.");
      }
      const leadData: any = {
        businessName: contact.companyName || "",
        contactName: contact.fullName || `${contact.firstName} ${contact.lastName}`,
        email,
        phone,
        website: contact.companyDomain ? `https://${contact.companyDomain}` : "",
        industry: contact.industry || contact.companyIndustry || "",
        location: [contact.city, contact.state].filter(Boolean).join(", "),
        source: "sales_intelligence",
        status: "new",
        notes: [
          contact.summary || contact.bio || "",
          contact.jobTitle ? `Title: ${contact.jobTitle}` : "",
          contact.linkedinUrl ? `LinkedIn: ${contact.linkedinUrl}` : "",
          contact.icebreaker ? `Icebreaker: ${contact.icebreaker}` : "",
        ].filter(Boolean).join("\n"),
      };
      const res = await apiRequest("POST", "/api/leads", leadData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Saved to CRM", description: "Contact added as a new lead" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Find Decision Makers
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label className="text-xs text-muted-foreground">Job Title</Label>
            <Input placeholder="e.g. CEO, VP Sales, Director" value={filters.jobTitle}
              onChange={(e) => setFilters(f => ({ ...f, jobTitle: e.target.value }))} data-testid="input-people-job-title" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Seniority</Label>
            <Select value={filters.seniority} onValueChange={(v) => setFilters(f => ({ ...f, seniority: v }))}>
              <SelectTrigger data-testid="select-people-seniority"><SelectValue placeholder="Any level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="c_suite">C-Suite</SelectItem>
                <SelectItem value="vp">VP</SelectItem>
                <SelectItem value="director">Director</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
                <SelectItem value="entry">Entry Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Department</Label>
            <Select value={filters.department} onValueChange={(v) => setFilters(f => ({ ...f, department: v }))}>
              <SelectTrigger data-testid="select-people-department"><SelectValue placeholder="Any department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="executive">Executive</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="hr">Human Resources</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Company</Label>
            <Input placeholder="Company name" value={filters.company}
              onChange={(e) => setFilters(f => ({ ...f, company: e.target.value }))} data-testid="input-people-company" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Industry</Label>
            <Input placeholder="e.g. Healthcare, SaaS" value={filters.industry}
              onChange={(e) => setFilters(f => ({ ...f, industry: e.target.value }))} data-testid="input-people-industry" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Location</Label>
            <Input placeholder="City, State or Country" value={filters.location}
              onChange={(e) => setFilters(f => ({ ...f, location: e.target.value }))} data-testid="input-people-location" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={() => searchMutation.mutate(filters)} disabled={searchMutation.isPending} data-testid="button-people-search">
            {searchMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Search People
          </Button>
        </div>
      </Card>

      {searchMutation.isPending && <LoadingCards count={6} />}

      {hasSearched && !searchMutation.isPending && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{results.length} contacts found via AI-powered web search</p>
          {results.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No contacts found. Try different search terms or broaden your criteria.</p>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {results.map((contact: any, i: number) => (
                <Card key={contact.id || i} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate" data-testid={`text-contact-name-${i}`}>{contact.fullName || `${contact.firstName} ${contact.lastName}`}</p>
                      <p className="text-sm text-muted-foreground truncate">{contact.jobTitle}</p>
                      <p className="text-xs text-muted-foreground/70 truncate flex items-center gap-1 mt-1">
                        <Building2 className="w-3 h-3" /> {contact.companyName}
                      </p>
                      {(contact.city || contact.state) && (
                        <p className="text-xs text-muted-foreground/70 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {[contact.city, contact.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {contact.summary && (
                        <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2">{contact.summary}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => saveToCrmMutation.mutate(contact)}
                        disabled={saveToCrmMutation.isPending} data-testid={`button-save-contact-crm-${i}`}
                        title="Save to CRM">
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      {(contact.workEmail || contact.email) && <Badge variant="outline" className="text-[10px]"><Mail className="w-3 h-3 mr-1" />{contact.workEmail || contact.email}</Badge>}
                      {(contact.directPhone || contact.phone) && <Badge variant="outline" className="text-[10px]"><Phone className="w-3 h-3 mr-1" />{contact.directPhone || contact.phone}</Badge>}
                      {contact.linkedinUrl && (
                        <a href={contact.linkedinUrl} target="_blank" rel="noreferrer">
                          <Badge variant="outline" className="text-[10px]"><ExternalLink className="w-3 h-3 mr-1" />LinkedIn</Badge>
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CompanySearchTab() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({ name: "", industry: "", location: "", minEmployees: "", maxEmployees: "" });
  const [results, setResults] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<string>("");
  const [hasSearched, setHasSearched] = useState(false);

  const searchMutation = useMutation({
    mutationFn: async (params: any) => {
      const res = await apiRequest("POST", "/api/intelligence/companies/search", params);
      return res.json();
    },
    onSuccess: (data: any) => {
      setResults(data.results || []);
      setDataSource(data.source || "");
      setHasSearched(true);
    },
    onError: (e: any) => toast({ title: "Search failed", description: e.message, variant: "destructive" }),
  });

  const saveToCrmMutation = useMutation({
    mutationFn: async (company: any) => {
      const email = company.ownerEmail || company.email || "";
      const phone = company.ownerPhone || company.phone || "";
      if (!email && !phone) {
        throw new Error("No email or phone found for this company. Cannot save without contact info.");
      }
      const leadData: any = {
        businessName: company.name,
        contactName: company.ownerName || "",
        email,
        phone,
        website: company.website || (company.domain ? `https://${company.domain}` : ""),
        industry: company.industry || "",
        location: company.location || "",
        source: "sales_intelligence",
        status: "new",
        notes: [
          company.description,
          company.ownerName ? `Owner/CEO: ${company.ownerName} (${company.ownerTitle || "Owner"})` : "",
          company.employeeRange ? `Employees: ${company.employeeRange}` : "",
          company.revenue ? `Revenue: ${company.revenue}` : "",
          (company.keyContacts || []).length > 0 ? `Key Contacts: ${company.keyContacts.map((c: any) => `${c.name} - ${c.title}`).join("; ")}` : "",
        ].filter(Boolean).join("\n"),
      };
      const res = await apiRequest("POST", "/api/leads", leadData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Saved to CRM", description: "Company added as a new lead" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          Discover Companies
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label className="text-xs text-muted-foreground">Company Name</Label>
            <Input placeholder="e.g. Acme Corp" value={filters.name}
              onChange={(e) => setFilters(f => ({ ...f, name: e.target.value }))} data-testid="input-company-name" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Industry</Label>
            <Input placeholder="e.g. Healthcare, Fintech" value={filters.industry}
              onChange={(e) => setFilters(f => ({ ...f, industry: e.target.value }))} data-testid="input-company-industry" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Location</Label>
            <Input placeholder="City, State or Country" value={filters.location}
              onChange={(e) => setFilters(f => ({ ...f, location: e.target.value }))} data-testid="input-company-location" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Min Employees</Label>
            <Input type="number" placeholder="e.g. 10" value={filters.minEmployees}
              onChange={(e) => setFilters(f => ({ ...f, minEmployees: e.target.value }))} data-testid="input-company-min-emp" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max Employees</Label>
            <Input type="number" placeholder="e.g. 500" value={filters.maxEmployees}
              onChange={(e) => setFilters(f => ({ ...f, maxEmployees: e.target.value }))} data-testid="input-company-max-emp" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={() => searchMutation.mutate(filters)} disabled={searchMutation.isPending} data-testid="button-company-search">
            {searchMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Search Companies
          </Button>
        </div>
      </Card>

      {searchMutation.isPending && <LoadingCards count={6} />}

      {hasSearched && !searchMutation.isPending && (
        <div className="space-y-3">
          {dataSource === "ai_knowledge" && results.some((r: any) => r.confidence === "low") && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-sm" data-testid="warning-ai-knowledge">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-500">Results from AI Knowledge</p>
                <p className="text-muted-foreground text-xs mt-0.5">Web search is temporarily unavailable. Results may be less accurate for smaller or newer companies. Use the "Enrich" feature for more detailed, AI-researched data on specific companies.</p>
              </div>
            </div>
          )}
          {dataSource.startsWith("multi_source") && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-sm" data-testid="info-multi-source">
              <Database className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-emerald-500">Multi-Source Intelligence (GPT-4o)</p>
                <p className="text-muted-foreground text-xs mt-0.5">Results cross-referenced from {dataSource.match(/\d+/)?.[0] || "multiple"} data sources: Government registries, SEC filings, Wikidata, GitHub, WHOIS, and web search.</p>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{results.length} companies found via B2B Intelligence Engine {dataSource.startsWith("multi_source") ? `(${dataSource.match(/\d+/)?.[0] || ""} sources)` : ""}</p>
          {results.length === 0 ? (
            <Card className="p-8 text-center">
              <Building2 className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No companies found. Try different search terms.</p>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {results.map((co: any, i: number) => (
                <Card key={co.id || i} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate" data-testid={`text-company-name-${i}`}>{co.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{co.industry}{co.subIndustry ? ` - ${co.subIndustry}` : ""}</p>
                      {co.description && <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2">{co.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      {(co.website || co.domain) && (
                        <a href={co.website || `https://${co.domain}`} target="_blank" rel="noreferrer" data-testid={`link-company-website-${i}`}>
                          <Button size="icon" variant="ghost" data-testid={`button-open-website-${i}`}><ExternalLink className="w-4 h-4" /></Button>
                        </a>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => saveToCrmMutation.mutate(co)}
                        disabled={saveToCrmMutation.isPending} data-testid={`button-save-crm-${i}`}
                        title="Save to CRM">
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {co.confidence === "low" && <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20"><AlertTriangle className="w-3 h-3 mr-1" />AI Estimate</Badge>}
                    {co.confidence === "high" && (co.dataSources || []).length > 1 && <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><Database className="w-3 h-3 mr-1" />{(co.dataSources || []).length} Sources Verified</Badge>}
                    {co.location && <Badge variant="outline" className="text-[10px]"><MapPin className="w-3 h-3 mr-1" />{co.location}</Badge>}
                    {(co.employeeCount || co.employeeRange) && <Badge variant="outline" className="text-[10px]"><Users className="w-3 h-3 mr-1" />{co.employeeCount || co.employeeRange}</Badge>}
                    {co.phone && <Badge variant="outline" className="text-[10px]"><Phone className="w-3 h-3 mr-1" />{co.phone}</Badge>}
                    {co.email && <Badge variant="outline" className="text-[10px]"><Mail className="w-3 h-3 mr-1" />{co.email}</Badge>}
                    {co.revenue && <Badge variant="outline" className="text-[10px]"><BarChart3 className="w-3 h-3 mr-1" />{co.revenue}</Badge>}
                  </div>

                  {co.ownerName && (
                    <div className="border-t pt-2">
                      <p className="text-xs font-medium flex items-center gap-1 mb-1">
                        <Crown className="w-3 h-3 text-amber-500" />
                        {co.ownerName} {co.ownerTitle ? `- ${co.ownerTitle}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {co.ownerEmail && <Badge variant="outline" className="text-[10px]"><Mail className="w-3 h-3 mr-1" />{co.ownerEmail}</Badge>}
                        {co.ownerPhone && <Badge variant="outline" className="text-[10px]"><Phone className="w-3 h-3 mr-1" />{co.ownerPhone}</Badge>}
                        {co.ownerLinkedin && (
                          <a href={co.ownerLinkedin} target="_blank" rel="noreferrer">
                            <Badge variant="outline" className="text-[10px]"><ExternalLink className="w-3 h-3 mr-1" />LinkedIn</Badge>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {(co.keyContacts || []).length > 0 && (
                    <div className="border-t pt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Key Contacts</p>
                      {co.keyContacts.slice(0, 3).map((kc: any, ki: number) => (
                        <div key={ki} className="text-xs text-muted-foreground/80 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{kc.name} - {kc.title}</span>
                          {kc.email && <span className="text-muted-foreground/60">({kc.email})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EnrichmentTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [enrichType, setEnrichType] = useState<"contact" | "company">("contact");
  const [enrichInput, setEnrichInput] = useState({ email: "", domain: "" });

  const { data: jobs, isLoading } = useQuery<any[]>({ queryKey: ["/api/intelligence/enrichment/jobs"] });

  const enrichMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = enrichType === "contact" ? "/api/intelligence/contacts/enrich" : "/api/intelligence/companies/enrich";
      const res = await apiRequest("POST", endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/enrichment/jobs"] });
      toast({ title: "Enrichment started" });
      setEnrichInput({ email: "", domain: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/intelligence/enrichment/bulk-from-leads", {});
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/enrichment/jobs"] });
      toast({ title: "Bulk enrichment started", description: `Processing ${data.count || 0} leads` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Enrich Data
          </h3>
          <div className="flex gap-2 mb-4">
            <Button size="sm" variant={enrichType === "contact" ? "default" : "outline"} onClick={() => setEnrichType("contact")} data-testid="button-enrich-contact">Contact</Button>
            <Button size="sm" variant={enrichType === "company" ? "default" : "outline"} onClick={() => setEnrichType("company")} data-testid="button-enrich-company">Company</Button>
          </div>
          {enrichType === "contact" ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Email Address</Label>
                <Input placeholder="contact@company.com" value={enrichInput.email}
                  onChange={(e) => setEnrichInput(f => ({ ...f, email: e.target.value }))} data-testid="input-enrich-email" />
              </div>
              <Button className="w-full" onClick={() => enrichMutation.mutate({ email: enrichInput.email })} disabled={enrichMutation.isPending} data-testid="button-enrich-submit">
                {enrichMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Enrich Contact
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Company Domain</Label>
                <Input placeholder="company.com" value={enrichInput.domain}
                  onChange={(e) => setEnrichInput(f => ({ ...f, domain: e.target.value }))} data-testid="input-enrich-domain" />
              </div>
              <Button className="w-full" onClick={() => enrichMutation.mutate({ domain: enrichInput.domain })} disabled={enrichMutation.isPending} data-testid="button-enrich-company-submit">
                {enrichMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Building2 className="w-4 h-4 mr-2" />}
                Enrich Company
              </Button>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Bulk Enrichment
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Automatically enrich all leads in your CRM with company data, contact info, and social profiles.
          </p>
          <Button className="w-full" variant="outline" onClick={() => bulkMutation.mutate()} disabled={bulkMutation.isPending} data-testid="button-bulk-enrich">
            {bulkMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
            Enrich All CRM Leads
          </Button>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Recent Enrichment Jobs</h3>
        {isLoading ? <LoadingCards count={2} /> : !jobs?.length ? (
          <Card className="p-6 text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No enrichment jobs yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {jobs.map((job: any) => (
              <Card key={job.id} className="p-3 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium">{job.type || job.jobType} enrichment</p>
                  <p className="text-xs text-muted-foreground">{job.totalRecords} records - {job.enrichedCount || 0} enriched</p>
                </div>
                <Badge variant={job.status === "completed" ? "default" : "outline"}>{job.status}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmailFinderTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({ firstName: "", lastName: "", domain: "" });
  const [result, setResult] = useState<any>(null);

  const findMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/intelligence/email/find", data);
      return res.json();
    },
    onSuccess: (data: any) => setResult(data),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          Find Email Address
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label className="text-xs text-muted-foreground">First Name</Label>
            <Input placeholder="John" value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} data-testid="input-email-first" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Last Name</Label>
            <Input placeholder="Smith" value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} data-testid="input-email-last" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Company Domain</Label>
            <Input placeholder="company.com" value={form.domain} onChange={(e) => setForm(f => ({ ...f, domain: e.target.value }))} data-testid="input-email-domain" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={() => findMutation.mutate(form)} disabled={findMutation.isPending} data-testid="button-find-email">
            {findMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Find Email
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="p-5">
          <h4 className="text-sm font-medium mb-3">Results</h4>
          {result.email ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="font-medium" data-testid="text-found-email">{result.email}</span>
                </div>
                <Badge>{result.confidence || 0}% confidence</Badge>
              </div>
              {result.alternatives?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Alternative patterns:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.alternatives.map((alt: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{alt.email} ({alt.confidence}%)</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No email found for this combination.</p>
          )}
        </Card>
      )}
    </div>
  );
}

function PhoneFinderTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({ firstName: "", lastName: "", company: "" });
  const [result, setResult] = useState<any>(null);

  const findMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/intelligence/phone/find", data);
      return res.json();
    },
    onSuccess: (data: any) => setResult(data),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Phone className="w-4 h-4 text-primary" />
          Find Phone Number
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label className="text-xs text-muted-foreground">First Name</Label>
            <Input placeholder="John" value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} data-testid="input-phone-first" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Last Name</Label>
            <Input placeholder="Smith" value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} data-testid="input-phone-last" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Company</Label>
            <Input placeholder="Acme Corp" value={form.company} onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))} data-testid="input-phone-company" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={() => findMutation.mutate(form)} disabled={findMutation.isPending} data-testid="button-find-phone">
            {findMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Find Phone
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="p-5">
          <h4 className="text-sm font-medium mb-3">Results</h4>
          {result.phones?.length > 0 ? (
            <div className="space-y-2">
              {result.phones.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <span className="font-medium" data-testid={`text-found-phone-${i}`}>{p.number}</span>
                    <Badge variant="outline" className="text-[10px]">{p.type}</Badge>
                  </div>
                  <Badge>{p.confidence || 0}% confidence</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No phone numbers found.</p>
          )}
        </Card>
      )}
    </div>
  );
}

function IntentDataTab() {
  const { data: dashboard, isLoading } = useQuery<any>({ queryKey: ["/api/intelligence/intent/dashboard"] });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Buying Intent Signals
          </h3>
          <p className="text-sm text-muted-foreground">Track companies showing purchase intent for your solutions</p>
        </div>
      </div>

      {isLoading ? <LoadingCards count={4} /> : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-primary" data-testid="text-intent-total">{dashboard?.totalSignals || 0}</p>
              <p className="text-xs text-muted-foreground">Total Signals</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-chart-3" data-testid="text-intent-surge">{dashboard?.surgeSignals || 0}</p>
              <p className="text-xs text-muted-foreground">Surge Signals</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold" data-testid="text-intent-companies">{dashboard?.companiesTracked || 0}</p>
              <p className="text-xs text-muted-foreground">Companies Tracked</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold" data-testid="text-intent-topics">{dashboard?.topicsTracked || 0}</p>
              <p className="text-xs text-muted-foreground">Topics Tracked</p>
            </Card>
          </div>

          {dashboard?.byCompany?.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Signals by Company</h4>
              {dashboard.byCompany.map((co: any, i: number) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
                    <p className="font-medium">{co.companyName}</p>
                    <Badge variant={co.maxStrength === "surge" ? "default" : "outline"}>{co.maxStrength}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {co.topics?.map((t: string, j: number) => (
                      <Badge key={j} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No intent signals detected yet. Run enrichment or AI research to discover buying signals.</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function TechnographicsTab() {
  const { toast } = useToast();
  const [searchTech, setSearchTech] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const searchMutation = useMutation({
    mutationFn: async (tech: string) => {
      const res = await apiRequest("GET", `/api/intelligence/technographics/search?technology=${encodeURIComponent(tech)}`);
      return res.json();
    },
    onSuccess: (data: any) => setResults(data.results || []),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" />
          Technology Stack Intelligence
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Find companies using specific technologies (CRM, EHR, Marketing tools, etc.)</p>
        <div className="flex gap-3">
          <Input placeholder="e.g. Salesforce, Epic EHR, HubSpot" value={searchTech}
            onChange={(e) => setSearchTech(e.target.value)} className="flex-1" data-testid="input-tech-search" />
          <Button onClick={() => searchMutation.mutate(searchTech)} disabled={searchMutation.isPending} data-testid="button-tech-search">
            {searchMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Search
          </Button>
        </div>
      </Card>

      {results.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {results.map((item: any, i: number) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-2">
                <p className="font-medium" data-testid={`text-tech-company-${i}`}>{item.companyDomain || item.companyName || item.company || "Unknown"}</p>
                {item.status && <Badge variant="outline" className="text-[10px]">{item.status}</Badge>}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge className="text-xs">{item.technology}</Badge>
              </div>
              {item.category && <p className="text-xs text-muted-foreground mt-2">Category: {item.category}</p>}
              {item.confidence && <p className="text-xs text-muted-foreground">Confidence: {Math.round(item.confidence * 100)}%</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function OrgChartTab() {
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [chart, setChart] = useState<any[]>([]);

  const buildMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", `/api/intelligence/org-chart/${encodeURIComponent(name)}/build`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      setChart(data.entries || data || []);
      toast({ title: "Org chart built" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary" />
          Organization Chart Builder
        </h3>
        <p className="text-sm text-muted-foreground mb-4">Build org charts for target companies. AI searches the web to find real leadership teams, decision makers, and key contacts.</p>
        <div className="flex gap-3">
          <Input placeholder="Enter company name (e.g. Microsoft, Salesforce)" value={companyName}
            onChange={(e) => setCompanyName(e.target.value)} className="flex-1" data-testid="input-org-company-name" />
          <Button onClick={() => buildMutation.mutate(companyName)} disabled={buildMutation.isPending || !companyName} data-testid="button-build-org">
            {buildMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <GitBranch className="w-4 h-4 mr-2" />}
            Build Chart
          </Button>
        </div>
      </Card>

      {buildMutation.isPending && <LoadingCards count={4} />}

      {chart.length > 0 && !buildMutation.isPending && (
        <div className="space-y-2">
          {chart.map((entry: any, i: number) => (
            <Card key={i} className="p-3 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium" data-testid={`text-org-person-${i}`}>{entry.name || entry.personName}</p>
                <p className="text-xs text-muted-foreground">{entry.title} {entry.department ? `- ${entry.department}` : ""}</p>
              </div>
              <div className="flex gap-1">
                {entry.isDecisionMaker && <Badge className="text-[10px]">Decision Maker</Badge>}
                {entry.isBudgetHolder && <Badge variant="outline" className="text-[10px]">Budget Holder</Badge>}
                {entry.isInfluencer && <Badge variant="outline" className="text-[10px]">Influencer</Badge>}
                {entry.linkedinUrl && (
                  <a href={entry.linkedinUrl} target="_blank" rel="noreferrer">
                    <Badge variant="outline" className="text-[10px]"><ExternalLink className="w-3 h-3 mr-1" />LinkedIn</Badge>
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewsEventsTab() {
  const { data: events, isLoading } = useQuery<any[]>({ queryKey: ["/api/intelligence/events/recent"] });

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold flex items-center gap-2">
        <Newspaper className="w-4 h-4 text-primary" />
        Company News & Events
      </h3>

      {isLoading ? <LoadingCards count={4} /> : !events?.length ? (
        <Card className="p-8 text-center">
          <Newspaper className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No events tracked yet. Run AI research or enrichment to discover company events.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((ev: any, i: number) => (
            <Card key={ev.id || i} className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">{ev.eventType?.replace(/_/g, " ")}</Badge>
                    {ev.relevanceScore && <Badge className="text-[10px]">{ev.relevanceScore}/10</Badge>}
                  </div>
                  <p className="text-sm font-medium" data-testid={`text-event-title-${i}`}>{ev.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{ev.summary}</p>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">{ev.eventDate ? new Date(ev.eventDate).toLocaleDateString() : ""}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AIResearchTab() {
  const { toast } = useToast();
  const [researchType, setResearchType] = useState<"company" | "contact">("company");
  const [companyDomain, setCompanyDomain] = useState("");
  const [contactForm, setContactForm] = useState({ name: "", company: "", title: "" });
  const [result, setResult] = useState<any>(null);

  const researchMutation = useMutation({
    mutationFn: async (data: { type: string; target: string; body?: any }) => {
      const res = await apiRequest("POST", `/api/intelligence/research/${data.type}/${encodeURIComponent(data.target)}`, data.body || {});
      return res.json();
    },
    onSuccess: (data: any) => {
      setResult(data);
      toast({ title: "Research complete" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleResearch = () => {
    if (researchType === "company") {
      if (!companyDomain) return;
      researchMutation.mutate({ type: "company", target: companyDomain });
    } else {
      if (!contactForm.name) return;
      researchMutation.mutate({ type: "contact", target: contactForm.name, body: { company: contactForm.company, title: contactForm.title } });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          AI-Powered Deep Research
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          AI searches the web and analyzes companies and contacts to find pain points, competitors, best approach angles, buyer personas, and icebreakers.
        </p>
        <div className="flex gap-2 mb-4">
          <Button size="sm" variant={researchType === "company" ? "default" : "outline"} onClick={() => setResearchType("company")} data-testid="button-research-company">Company</Button>
          <Button size="sm" variant={researchType === "contact" ? "default" : "outline"} onClick={() => setResearchType("contact")} data-testid="button-research-contact">Contact</Button>
        </div>
        {researchType === "company" ? (
          <div className="flex gap-3">
            <Input placeholder="Enter company domain (e.g. acme.com)" value={companyDomain}
              onChange={(e) => setCompanyDomain(e.target.value)} className="flex-1" data-testid="input-research-domain" />
            <Button onClick={handleResearch} disabled={researchMutation.isPending || !companyDomain} data-testid="button-research-run">
              {researchMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              Research Company
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <Input placeholder="e.g. John Smith" value={contactForm.name}
                  onChange={(e) => setContactForm(f => ({ ...f, name: e.target.value }))} data-testid="input-research-name" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Company</Label>
                <Input placeholder="e.g. Acme Corp" value={contactForm.company}
                  onChange={(e) => setContactForm(f => ({ ...f, company: e.target.value }))} data-testid="input-research-company" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Title</Label>
                <Input placeholder="e.g. VP of Sales" value={contactForm.title}
                  onChange={(e) => setContactForm(f => ({ ...f, title: e.target.value }))} data-testid="input-research-title" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleResearch} disabled={researchMutation.isPending || !contactForm.name} data-testid="button-research-run">
                {researchMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                Research Contact
              </Button>
            </div>
          </div>
        )}
      </Card>

      {researchMutation.isPending && <LoadingCards count={2} />}

      {result && !researchMutation.isPending && (
        <Card className="p-5">
          <h4 className="text-sm font-medium mb-3">Research Results</h4>
          {result.error ? (
            <p className="text-sm text-destructive">{result.error}</p>
          ) : (
            <div className="space-y-4">
              {result.name && <div><p className="text-sm font-medium">{result.name}</p>{result.description && <p className="text-xs text-muted-foreground">{result.description}</p>}</div>}
              {result.industry && <div><Label className="text-xs text-muted-foreground">Industry</Label><p className="text-sm">{result.industry}{result.subIndustry ? ` / ${result.subIndustry}` : ""}</p></div>}
              {result.targetMarket && <div><Label className="text-xs text-muted-foreground">Target Market</Label><p className="text-sm">{result.targetMarket}</p></div>}
              {result.estimatedEmployees && <div><Label className="text-xs text-muted-foreground">Estimated Employees</Label><p className="text-sm">{result.estimatedEmployees}</p></div>}
              {result.estimatedRevenue && <div><Label className="text-xs text-muted-foreground">Estimated Revenue</Label><p className="text-sm">{result.estimatedRevenue}</p></div>}
              {result.keyProducts?.length > 0 && <div><Label className="text-xs text-muted-foreground">Key Products</Label><div className="flex flex-wrap gap-1 mt-1">{result.keyProducts.map((p: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{p}</Badge>)}</div></div>}
              {result.competitors?.length > 0 && <div><Label className="text-xs text-muted-foreground">Competitors</Label><div className="flex flex-wrap gap-1 mt-1">{result.competitors.map((c: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{c}</Badge>)}</div></div>}
              {result.recentNews && <div><Label className="text-xs text-muted-foreground">Recent News</Label><p className="text-sm mt-1">{result.recentNews}</p></div>}
              {(result.painPoints?.length > 0 || result.likelyChallenges?.length > 0) && <div><Label className="text-xs text-muted-foreground">Pain Points / Challenges</Label><ul className="text-sm text-muted-foreground mt-1 list-disc pl-4">{(result.painPoints || result.likelyChallenges || []).map((p: string, i: number) => <li key={i}>{p}</li>)}</ul></div>}
              {result.decisionMakers?.length > 0 && <div><Label className="text-xs text-muted-foreground">Decision Makers</Label><div className="flex flex-wrap gap-1 mt-1">{result.decisionMakers.map((d: any, i: number) => <Badge key={i} variant="outline" className="text-xs">{typeof d === "string" ? d : `${d.title} (${d.department})`}</Badge>)}</div></div>}
              {result.likelyResponsibilities?.length > 0 && <div><Label className="text-xs text-muted-foreground">Likely Responsibilities</Label><ul className="text-sm text-muted-foreground mt-1 list-disc pl-4">{result.likelyResponsibilities.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul></div>}
              {result.decisionMakingPower && <div><Label className="text-xs text-muted-foreground">Decision Making Power</Label><Badge variant="outline" className="text-xs mt-1">{result.decisionMakingPower}</Badge></div>}
              {result.buyerPersonaType && <div><Label className="text-xs text-muted-foreground">Buyer Persona</Label><Badge variant="outline" className="text-xs mt-1">{result.buyerPersonaType}</Badge></div>}
              {result.bestOutreachChannel && <div><Label className="text-xs text-muted-foreground">Best Outreach Channel</Label><p className="text-sm mt-1">{result.bestOutreachChannel}</p></div>}
              {result.bestTimeToContact && <div><Label className="text-xs text-muted-foreground">Best Time to Contact</Label><p className="text-sm mt-1">{result.bestTimeToContact}</p></div>}
              {result.bestApproachAngle && <div><Label className="text-xs text-muted-foreground">Best Approach Angle</Label><p className="text-sm mt-1">{result.bestApproachAngle}</p></div>}
              {result.talkingPoints?.length > 0 && <div><Label className="text-xs text-muted-foreground">Talking Points</Label><ul className="text-sm text-muted-foreground mt-1 list-disc pl-4">{result.talkingPoints.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul></div>}
              {result.objections?.length > 0 && <div><Label className="text-xs text-muted-foreground">Likely Objections</Label><ul className="text-sm text-muted-foreground mt-1 list-disc pl-4">{result.objections.map((o: string, i: number) => <li key={i}>{o}</li>)}</ul></div>}
              {result.icebreaker && <div><Label className="text-xs text-muted-foreground">Icebreaker</Label><p className="text-sm italic mt-1">"{result.icebreaker}"</p></div>}
              {result.sources?.length > 0 && <div><Label className="text-xs text-muted-foreground">Sources</Label><div className="flex flex-col gap-1 mt-1">{result.sources.map((s: string, i: number) => <a key={i} href={s} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate">{s}</a>)}</div></div>}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function ProspectListsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newListName, setNewListName] = useState("");

  const { data: lists, isLoading } = useQuery<any[]>({ queryKey: ["/api/intelligence/prospect-lists"] });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/intelligence/prospect-lists", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/prospect-lists"] });
      toast({ title: "List created" });
      setNewListName("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/intelligence/prospect-lists/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intelligence/prospect-lists"] });
      toast({ title: "List deleted" });
    },
  });

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" />
          Prospect Lists
        </h3>
        <div className="flex gap-3">
          <Input placeholder="New list name" value={newListName} onChange={(e) => setNewListName(e.target.value)} className="flex-1" data-testid="input-new-list" />
          <Button onClick={() => createMutation.mutate(newListName)} disabled={createMutation.isPending || !newListName} data-testid="button-create-list">
            <Plus className="w-4 h-4 mr-2" /> Create List
          </Button>
        </div>
      </Card>

      {isLoading ? <LoadingCards count={3} /> : !lists?.length ? (
        <Card className="p-8 text-center">
          <ListChecks className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No prospect lists yet. Create one to organize your leads.</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lists.map((list: any) => (
            <Card key={list.id} className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-medium" data-testid={`text-list-name-${list.id}`}>{list.name}</p>
                  <p className="text-xs text-muted-foreground">{list.contactCount || 0} contacts - Created {new Date(list.createdAt).toLocaleDateString()}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(list.id)} data-testid={`button-delete-list-${list.id}`}>
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

function SavedSearchesTab() {
  const { data: searches, isLoading } = useQuery<any[]>({ queryKey: ["/api/intelligence/saved-searches"] });

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold flex items-center gap-2">
        <Bookmark className="w-4 h-4 text-primary" />
        Saved Searches
      </h3>
      <p className="text-sm text-muted-foreground">Your saved search queries. Re-run anytime or set up alerts.</p>

      {isLoading ? <LoadingCards count={3} /> : !searches?.length ? (
        <Card className="p-8 text-center">
          <Bookmark className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No saved searches yet. Save a search from People or Company tabs.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {searches.map((s: any) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.searchType} search - {s.alertFrequency || "no alerts"}</p>
                </div>
                <Badge variant="outline">{s.resultCount || 0} results</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreditsPanel() {
  const { data: credits, isLoading } = useQuery<any>({ queryKey: ["/api/intelligence/credits/balance"] });

  if (isLoading) return <Skeleton className="h-8 w-32" />;

  return (
    <div className="flex items-center gap-3">
      <Badge variant="outline" className="text-xs gap-1">
        <Activity className="w-3 h-3" />
        {credits?.balance ?? 0} credits
      </Badge>
    </div>
  );
}

export default function SalesIntelligencePage() {
  usePageTitle("Sales Intelligence");
  const [activeTab, setActiveTab] = useState<Tab>("people");

  const tabContent: Record<Tab, JSX.Element> = {
    people: <PeopleSearchTab />,
    companies: <CompanySearchTab />,
    enrichment: <EnrichmentTab />,
    email_finder: <EmailFinderTab />,
    phone_finder: <PhoneFinderTab />,
    intent: <IntentDataTab />,
    technographics: <TechnographicsTab />,
    org_chart: <OrgChartTab />,
    news: <NewsEventsTab />,
    research: <AIResearchTab />,
    lists: <ProspectListsTab />,
    searches: <SavedSearchesTab />,
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4 flex-wrap p-4 pb-2 border-b border-border/50">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Search className="w-5 h-5 text-primary" />
            B2B Sales Intelligence
          </h1>
          <p className="text-sm text-muted-foreground">AI-powered prospecting with real web search, enrichment, and intent data</p>
        </div>
        <CreditsPanel />
      </div>

      <div className="flex overflow-x-auto border-b border-border/50 px-4 gap-1 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tabContent[activeTab]}
      </div>
    </div>
  );
}
