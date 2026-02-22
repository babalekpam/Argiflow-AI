import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  Search,
  Trash2,
  Pencil,
  Link,
  Link2Off,
  UserCheck,
  MessageSquare,
  Send,
  Loader2,
  Building2,
  MapPin,
  ExternalLink,
  Upload,
  Download,
  UserPlus,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet,
  Zap,
  ArrowRight,
  Filter,
} from "lucide-react";
import type { LinkedinProfile } from "@shared/schema";
import { useState, useMemo, useRef, useEffect } from "react";

type StatsData = {
  totalProfiles: number;
  connected: number;
  messagesSent: number;
  replies: number;
};

type AccountStatus = {
  linked: boolean;
  profileUrl: string | null;
  email: string | null;
};

function ConnectionBadge({ status }: { status: string }) {
  const config: Record<string, { style: string; label: string }> = {
    none: { style: "bg-slate-500/10 text-slate-400 border-slate-500/20", label: "None" },
    pending: { style: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", label: "Pending" },
    connected: { style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Connected" },
  };
  const c = config[status] || config.none;
  return <Badge className={c.style} data-testid={`badge-connection-${status}`}>{c.label}</Badge>;
}

function OutreachBadge({ status }: { status: string }) {
  const config: Record<string, { style: string; label: string }> = {
    none: { style: "bg-slate-500/10 text-slate-400 border-slate-500/20", label: "None" },
    message_sent: { style: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Message Sent" },
    replied: { style: "bg-green-500/10 text-green-400 border-green-500/20", label: "Replied" },
    meeting_booked: { style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Meeting Booked" },
  };
  const c = config[status] || config.none;
  return <Badge className={c.style} data-testid={`badge-outreach-${status}`}>{c.label}</Badge>;
}

function LinkedInAccountPanel() {
  const { toast } = useToast();
  const [linkUrl, setLinkUrl] = useState("");
  const [linkEmail, setLinkEmail] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);

  const { data: accountStatus, isLoading } = useQuery<AccountStatus>({
    queryKey: ["/api/linkedin/account-status"],
  });

  const linkMutation = useMutation({
    mutationFn: async (data: { linkedinProfileUrl: string; linkedinEmail: string }) => {
      const res = await apiRequest("POST", "/api/linkedin/link-account", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/account-status"] });
      toast({ title: "LinkedIn account linked" });
      setShowLinkForm(false);
      setLinkUrl("");
      setLinkEmail("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/linkedin/unlink-account", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/account-status"] });
      toast({ title: "LinkedIn account unlinked" });
    },
  });

  if (isLoading) return <Skeleton className="h-20 w-full" />;

  if (accountStatus?.linked) {
    return (
      <Card className="p-4 border-emerald-500/20 bg-emerald-500/5" data-testid="card-linkedin-linked">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-sm flex items-center gap-2">
                LinkedIn Connected
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Linked</Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                {accountStatus.email} &middot;{" "}
                <a href={accountStatus.profileUrl || "#"} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" data-testid="link-linkedin-profile">
                  View Profile
                </a>
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => unlinkMutation.mutate()} disabled={unlinkMutation.isPending} data-testid="button-unlink-linkedin">
            <Link2Off className="w-4 h-4 mr-1" />
            Unlink
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4" data-testid="card-linkedin-unlinked">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Link className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-sm">Link Your LinkedIn Account</p>
            <p className="text-xs text-muted-foreground">Connect your LinkedIn to import and leverage your connections</p>
          </div>
        </div>
        {!showLinkForm && (
          <Button size="sm" onClick={() => setShowLinkForm(true)} data-testid="button-link-linkedin">
            <Link className="w-4 h-4 mr-1" />
            Link Account
          </Button>
        )}
      </div>
      {showLinkForm && (
        <div className="mt-4 space-y-3 border-t pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="linkUrl" className="text-xs">LinkedIn Profile URL</Label>
              <Input
                id="linkUrl"
                placeholder="https://linkedin.com/in/yourname"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                data-testid="input-link-url"
              />
            </div>
            <div>
              <Label htmlFor="linkEmail" className="text-xs">LinkedIn Email</Label>
              <Input
                id="linkEmail"
                type="email"
                placeholder="your@email.com"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                data-testid="input-link-email"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => linkMutation.mutate({ linkedinProfileUrl: linkUrl, linkedinEmail: linkEmail })}
              disabled={!linkUrl.trim() || !linkEmail.trim() || linkMutation.isPending}
              data-testid="button-submit-link"
            >
              {linkMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Connect
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowLinkForm(false)} data-testid="button-cancel-link">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function CsvImportPanel() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);

  const importMutation = useMutation({
    mutationFn: async (connections: any[]) => {
      const res = await apiRequest("POST", "/api/linkedin/import-csv", { connections });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/filter-status"] });
      toast({ title: "Import complete", description: data.autoFilterStarted
        ? `${data.message}. AI is now filtering by your industry...`
        : data.message });
      setParsedData(null);
    },
    onError: (err: Error) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  function parseCSV(text: string): any[] {
    const cleanText = text.replace(/^\uFEFF/, "");
    const lines = cleanText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    const headerAliases: Record<string, string[]> = {
      "First Name": ["first name", "firstname", "first_name", "prénom", "prenom"],
      "Last Name": ["last name", "lastname", "last_name", "nom", "nom de famille"],
      "Email Address": ["email address", "emailaddress", "email", "e-mail", "adresse e-mail"],
      "Company": ["company", "société", "societe", "organization", "organisation", "entreprise"],
      "Position": ["position", "title", "job title", "jobtitle", "titre", "poste", "headline"],
      "Connected On": ["connected on", "connectedon", "connected_on", "date de connexion", "connecté le"],
      "URL": ["url", "profile url", "profileurl", "linkedin url", "lien"],
    };

    let headerLine = 0;
    const rawHeaders = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
    const firstLower = rawHeaders.map(h => h.toLowerCase());
    const allAliasValues = Object.values(headerAliases).flat();
    if (!firstLower.some(h => allAliasValues.includes(h))) {
      if (lines.length < 3) return [];
      headerLine = 1;
    }

    const finalHeaders = lines[headerLine].split(",").map(h => h.replace(/^"|"$/g, "").trim());

    const normalizedHeaders = finalHeaders.map(h => {
      const lower = h.toLowerCase();
      for (const [canonical, aliases] of Object.entries(headerAliases)) {
        if (aliases.includes(lower) || lower === canonical.toLowerCase()) return canonical;
      }
      return h;
    });

    const rows: any[] = [];
    for (let i = headerLine + 1; i < lines.length; i++) {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      if (values.every(v => !v)) continue;

      const row: any = {};
      normalizedHeaders.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });

      if ((row["First Name"] || "").trim() || (row["Last Name"] || "").trim()) {
        rows.push(row);
      }
    }

    return rows;
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const data = parseCSV(text);
      if (data.length === 0) {
        toast({ title: "Invalid CSV", description: "Could not parse any connections from this file.", variant: "destructive" });
        return;
      }
      setParsedData(data);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <Card className="p-4" data-testid="card-csv-import">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <p className="font-medium text-sm">Import LinkedIn Connections</p>
            <p className="text-xs text-muted-foreground">
              Export your connections from LinkedIn as CSV and upload here
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://www.linkedin.com/mypreferences/d/download-my-data"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
            data-testid="link-linkedin-export"
          >
            <Download className="w-3 h-3" />
            How to export
          </a>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-csv-file"
          />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="button-upload-csv">
            <Upload className="w-4 h-4 mr-1" />
            Upload CSV
          </Button>
        </div>
      </div>

      {parsedData && (
        <div className="mt-4 border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" data-testid="text-parsed-count">
              {parsedData.length} connections found in CSV
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setParsedData(null)} data-testid="button-cancel-import">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => importMutation.mutate(parsedData)}
                disabled={importMutation.isPending}
                data-testid="button-confirm-import"
              >
                {importMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Import All
              </Button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 sticky top-0">
                <tr>
                  <th className="p-2 text-left font-medium text-muted-foreground">Name</th>
                  <th className="p-2 text-left font-medium text-muted-foreground">Company</th>
                  <th className="p-2 text-left font-medium text-muted-foreground">Position</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{`${row["First Name"] || ""} ${row["Last Name"] || ""}`.trim() || row.fullName || "-"}</td>
                    <td className="p-2 text-muted-foreground">{row.Company || row.company || "-"}</td>
                    <td className="p-2 text-muted-foreground">{row.Position || row.position || "-"}</td>
                  </tr>
                ))}
                {parsedData.length > 20 && (
                  <tr className="border-t">
                    <td colSpan={3} className="p-2 text-center text-muted-foreground">
                      ...and {parsedData.length - 20} more
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

function BulkActionsBar({ profileCount, unconvertedCount }: { profileCount: number; unconvertedCount: number }) {
  const { toast } = useToast();
  const [filterIndustry, setFilterIndustry] = useState("");
  const [showFilterInput, setShowFilterInput] = useState(false);

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/linkedin/convert-to-leads", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/stats"] });
      toast({ title: "Conversion complete", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const enrichMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/linkedin/enrich", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/profiles"] });
      toast({ title: "Enrichment complete", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filterMutation = useMutation({
    mutationFn: async (industry: string) => {
      const res = await apiRequest("POST", "/api/linkedin/filter-industry", { industry });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/filter-status"] });
      toast({ title: "AI Filter Started", description: data.message });
      setShowFilterInput(false);
      setFilterIndustry("");
    },
    onError: (err: Error) => {
      toast({ title: "Filter failed", description: err.message, variant: "destructive" });
    },
  });

  if (profileCount === 0) return null;

  return (
    <Card className="p-3 bg-muted/20" data-testid="card-bulk-actions">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-primary" />
          <span className="font-medium">Quick Actions</span>
          <span className="text-muted-foreground text-xs">({profileCount} profiles)</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => enrichMutation.mutate()}
            disabled={enrichMutation.isPending}
            data-testid="button-enrich-all"
          >
            {enrichMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            AI Enrich
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilterInput(!showFilterInput)}
            data-testid="button-filter-industry"
          >
            <Filter className="w-4 h-4 mr-1" />
            AI Industry Filter
          </Button>
          {unconvertedCount > 0 && (
            <Button
              size="sm"
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending}
              data-testid="button-convert-all"
            >
              {convertMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
              Convert {unconvertedCount} to Leads
            </Button>
          )}
        </div>
      </div>
      {showFilterInput && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Type industry (e.g. Healthcare, Tech, Finance...)"
            value={filterIndustry}
            onChange={(e) => setFilterIndustry(e.target.value)}
            className="max-w-xs text-sm"
            data-testid="input-filter-industry"
          />
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (!filterIndustry.trim()) {
                toast({ title: "Enter an industry", description: "Type the industry you want to keep", variant: "destructive" });
                return;
              }
              filterMutation.mutate(filterIndustry.trim());
            }}
            disabled={filterMutation.isPending || !filterIndustry.trim()}
            data-testid="button-apply-filter"
          >
            {filterMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Filter className="w-4 h-4 mr-1" />}
            {filterMutation.isPending ? "AI Filtering..." : `Keep Only ${filterIndustry || "..."} Contacts`}
          </Button>
          <span className="text-xs text-muted-foreground">AI will analyze all {profileCount} profiles and remove non-matching ones</span>
        </div>
      )}
    </Card>
  );
}

type FilterStatus = {
  active: boolean;
  status?: "detecting_industry" | "filtering" | "done" | "error";
  industry?: string;
  totalProfiles?: number;
  processed?: number;
  kept?: number;
  removed?: number;
  message?: string;
  elapsedSeconds?: number;
};

function FilterProgressBanner() {
  const wasActiveRef = useRef(false);

  const { data: filterStatus } = useQuery<FilterStatus>({
    queryKey: ["/api/linkedin/filter-status"],
    refetchInterval: (query) => {
      const data = query.state.data as FilterStatus | undefined;
      if (data?.active) return 2000;
      return false;
    },
  });

  useEffect(() => {
    if (filterStatus?.active) {
      wasActiveRef.current = true;
    }
    if (wasActiveRef.current && filterStatus && !filterStatus.active) {
      wasActiveRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/stats"] });
    }
  }, [filterStatus]);

  if (!filterStatus || (!filterStatus.active && !filterStatus.status)) {
    return null;
  }

  if (!filterStatus.active && filterStatus.status !== "done" && filterStatus.status !== "error") {
    return null;
  }

  const progress = filterStatus.totalProfiles && filterStatus.totalProfiles > 0
    ? Math.round((filterStatus.processed! / filterStatus.totalProfiles) * 100)
    : 0;

  return (
    <Card className="p-4 border-sky-500/30 bg-sky-500/5" data-testid="card-filter-progress">
      <div className="flex items-center gap-3">
        {filterStatus.active ? (
          <Loader2 className="w-5 h-5 text-sky-400 animate-spin flex-shrink-0" />
        ) : filterStatus.status === "done" ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        ) : (
          <Filter className="w-5 h-5 text-red-400 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium" data-testid="text-filter-message">
              {filterStatus.status === "detecting_industry" && "AI is detecting your industry..."}
              {filterStatus.status === "filtering" && `Filtering for "${filterStatus.industry}"...`}
              {filterStatus.status === "done" && filterStatus.message}
              {filterStatus.status === "error" && filterStatus.message}
            </p>
            {filterStatus.active && filterStatus.totalProfiles! > 0 && (
              <span className="text-xs text-muted-foreground flex-shrink-0" data-testid="text-filter-progress">
                {filterStatus.processed}/{filterStatus.totalProfiles} ({progress}%)
              </span>
            )}
          </div>
          {filterStatus.active && filterStatus.totalProfiles! > 0 && (
            <div className="mt-2 h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
                data-testid="progress-filter-bar"
              />
            </div>
          )}
          {filterStatus.active && (
            <p className="text-xs text-muted-foreground mt-1">
              {filterStatus.kept} kept &middot; {filterStatus.removed} removed
              {filterStatus.elapsedSeconds! > 0 && ` &middot; ${filterStatus.elapsedSeconds}s elapsed`}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function LinkedInPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<LinkedinProfile | null>(null);
  const [logMessageProfile, setLogMessageProfile] = useState<LinkedinProfile | null>(null);
  const [logMessageText, setLogMessageText] = useState("");

  const [formData, setFormData] = useState({
    linkedinUrl: "",
    fullName: "",
    headline: "",
    company: "",
    location: "",
    connectionStatus: "none",
    outreachStatus: "none",
    notes: "",
  });

  const { data: stats, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ["/api/linkedin/stats"],
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery<LinkedinProfile[]>({
    queryKey: ["/api/linkedin/profiles"],
  });

  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter(
      (p) =>
        (p.fullName || "").toLowerCase().includes(q) ||
        (p.headline || "").toLowerCase().includes(q) ||
        (p.company || "").toLowerCase().includes(q) ||
        (p.linkedinUrl || "").toLowerCase().includes(q) ||
        (p.location || "").toLowerCase().includes(q)
    );
  }, [profiles, searchQuery]);

  const unconvertedCount = profiles.filter(p => !p.leadId).length;

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/linkedin/profiles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/stats"] });
      setAddDialogOpen(false);
      resetForm();
      toast({ title: "Profile added", description: "LinkedIn profile has been added successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData & { id: string }) => {
      const { id, ...rest } = data;
      return apiRequest("PUT", `/api/linkedin/profiles/${id}`, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/stats"] });
      setEditProfile(null);
      resetForm();
      toast({ title: "Profile updated", description: "LinkedIn profile has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/linkedin/profiles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/stats"] });
      toast({ title: "Profile deleted", description: "LinkedIn profile has been removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const logMessageMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      apiRequest("POST", `/api/linkedin/profiles/${id}/log-message`, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/stats"] });
      setLogMessageProfile(null);
      setLogMessageText("");
      toast({ title: "Message logged", description: "Outreach message has been recorded." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setFormData({
      linkedinUrl: "",
      fullName: "",
      headline: "",
      company: "",
      location: "",
      connectionStatus: "none",
      outreachStatus: "none",
      notes: "",
    });
  }

  function openEditDialog(profile: LinkedinProfile) {
    setFormData({
      linkedinUrl: profile.linkedinUrl || "",
      fullName: profile.fullName || "",
      headline: profile.headline || "",
      company: profile.company || "",
      location: profile.location || "",
      connectionStatus: profile.connectionStatus || "none",
      outreachStatus: profile.outreachStatus || "none",
      notes: profile.notes || "",
    });
    setEditProfile(profile);
  }

  function handleSubmit() {
    if (!formData.linkedinUrl.trim()) {
      toast({ title: "Error", description: "LinkedIn URL is required.", variant: "destructive" });
      return;
    }
    if (editProfile) {
      updateMutation.mutate({ ...formData, id: editProfile.id });
    } else {
      createMutation.mutate(formData);
    }
  }

  const statCards = [
    { label: "Total Profiles", value: stats?.totalProfiles ?? 0, icon: Users, testId: "stat-total-profiles" },
    { label: "Connected", value: stats?.connected ?? 0, icon: UserCheck, testId: "stat-connected" },
    { label: "Messages Sent", value: stats?.messagesSent ?? 0, icon: Send, testId: "stat-messages-sent" },
    { label: "Replies", value: stats?.replies ?? 0, icon: MessageSquare, testId: "stat-replies" },
  ];

  const isFormPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">LinkedIn Integration</h1>
          <p className="text-sm text-muted-foreground mt-1">Link your account, import connections, and convert them to leads</p>
        </div>
        <Button
          onClick={() => { resetForm(); setAddDialogOpen(true); }}
          data-testid="button-add-profile"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Profile
        </Button>
      </div>

      <LinkedInAccountPanel />

      <FilterProgressBanner />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.testId} className="p-4" data-testid={stat.testId}>
            {statsLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid={`text-${stat.testId}-value`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <CsvImportPanel />

      <Card className="p-4 bg-muted/10" data-testid="card-workflow-steps">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">LinkedIn Connection Pipeline</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {[
            { icon: Link, label: "Link Account", desc: "Connect LinkedIn" },
            { icon: Upload, label: "Import CSV", desc: "Upload connections" },
            { icon: Sparkles, label: "AI Enrich", desc: "Find emails & data" },
            { icon: UserPlus, label: "Convert", desc: "Create leads" },
            { icon: Send, label: "Outreach", desc: "Auto-sequence" },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex items-center gap-1 shrink-0">
              <div className="px-3 py-2 rounded-lg border border-border/50 bg-muted/20 flex flex-col items-center min-w-[90px]" data-testid={`pipeline-step-${step.label.toLowerCase().replace(/\s/g, "-")}`}>
                <step.icon className="w-4 h-4 mb-1 text-primary" />
                <span className="text-xs font-medium">{step.label}</span>
                <span className="text-[10px] text-muted-foreground">{step.desc}</span>
              </div>
              {i < arr.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
            </div>
          ))}
        </div>
      </Card>

      <BulkActionsBar profileCount={profiles.length} unconvertedCount={unconvertedCount} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search profiles by name, company, headline..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-profiles"
        />
      </div>

      {profilesLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <Card className="p-8 text-center" data-testid="text-no-profiles">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {searchQuery ? "No profiles match your search." : "No LinkedIn profiles yet. Import your connections or add one manually."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-profiles">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3 font-medium text-muted-foreground">Name</th>
                  <th className="p-3 font-medium text-muted-foreground hidden md:table-cell">Headline</th>
                  <th className="p-3 font-medium text-muted-foreground hidden lg:table-cell">Company</th>
                  <th className="p-3 font-medium text-muted-foreground">Connection</th>
                  <th className="p-3 font-medium text-muted-foreground">Outreach</th>
                  <th className="p-3 font-medium text-muted-foreground hidden xl:table-cell">Lead</th>
                  <th className="p-3 font-medium text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="border-b last:border-b-0 hover-elevate"
                    data-testid={`row-profile-${profile.id}`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                          {(profile.fullName || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate" data-testid={`text-profile-name-${profile.id}`}>
                            {profile.fullName || "Unknown"}
                          </div>
                          <a
                            href={profile.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary flex items-center gap-1 truncate"
                            data-testid={`link-linkedin-${profile.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            Profile
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <span className="text-muted-foreground truncate block max-w-[200px]" data-testid={`text-profile-headline-${profile.id}`}>
                        {profile.headline || "-"}
                      </span>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <span className="flex items-center gap-1 text-muted-foreground" data-testid={`text-profile-company-${profile.id}`}>
                        {profile.company ? (
                          <>
                            <Building2 className="w-3 h-3 shrink-0" />
                            {profile.company}
                          </>
                        ) : "-"}
                      </span>
                    </td>
                    <td className="p-3">
                      <ConnectionBadge status={profile.connectionStatus} />
                    </td>
                    <td className="p-3">
                      <OutreachBadge status={profile.outreachStatus} />
                    </td>
                    <td className="p-3 hidden xl:table-cell">
                      {profile.leadId ? (
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20" data-testid={`badge-lead-linked-${profile.id}`}>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Lead
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setLogMessageProfile(profile)}
                          data-testid={`button-log-message-${profile.id}`}
                          title="Log message"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(profile)}
                          data-testid={`button-edit-profile-${profile.id}`}
                          title="Edit profile"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(profile.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-profile-${profile.id}`}
                          title="Delete profile"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={addDialogOpen || !!editProfile} onOpenChange={(open) => { if (!open) { setAddDialogOpen(false); setEditProfile(null); resetForm(); } }}>
        <DialogContent className="max-w-lg" data-testid="dialog-profile-form">
          <DialogHeader>
            <DialogTitle>{editProfile ? "Edit Profile" : "Add LinkedIn Profile"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="linkedinUrl">LinkedIn URL *</Label>
              <Input
                id="linkedinUrl"
                placeholder="https://linkedin.com/in/username"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                data-testid="input-linkedin-url"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  data-testid="input-full-name"
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Acme Corp"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  data-testid="input-company"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                placeholder="CEO at Acme Corp"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                data-testid="input-headline"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="New York, NY"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                data-testid="input-location"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Connection Status</Label>
                <Select value={formData.connectionStatus} onValueChange={(v) => setFormData({ ...formData, connectionStatus: v })}>
                  <SelectTrigger data-testid="select-connection-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="connected">Connected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Outreach Status</Label>
                <Select value={formData.outreachStatus} onValueChange={(v) => setFormData({ ...formData, outreachStatus: v })}>
                  <SelectTrigger data-testid="select-outreach-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="message_sent">Message Sent</SelectItem>
                    <SelectItem value="replied">Replied</SelectItem>
                    <SelectItem value="meeting_booked">Meeting Booked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="textarea-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); setEditProfile(null); resetForm(); }} data-testid="button-cancel-form">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isFormPending} data-testid="button-submit-form">
              {isFormPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editProfile ? "Update" : "Add Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!logMessageProfile} onOpenChange={(open) => { if (!open) { setLogMessageProfile(null); setLogMessageText(""); } }}>
        <DialogContent className="max-w-md" data-testid="dialog-log-message">
          <DialogHeader>
            <DialogTitle>Log Message to {logMessageProfile?.fullName || "Profile"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="logMessage">Message Content</Label>
              <Textarea
                id="logMessage"
                placeholder="Enter the message you sent..."
                value={logMessageText}
                onChange={(e) => setLogMessageText(e.target.value)}
                rows={4}
                data-testid="textarea-log-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLogMessageProfile(null); setLogMessageText(""); }} data-testid="button-cancel-log">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (logMessageProfile && logMessageText.trim()) {
                  logMessageMutation.mutate({ id: logMessageProfile.id, message: logMessageText.trim() });
                }
              }}
              disabled={logMessageMutation.isPending || !logMessageText.trim()}
              data-testid="button-submit-log"
            >
              {logMessageMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Log Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
