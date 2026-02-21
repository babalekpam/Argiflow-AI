import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Activity,
  Mail,
  MousePointer,
  Globe,
  Search,
  FileText,
  Eye,
  Plus,
  Trash2,
  TrendingUp,
  Building2,
  Zap,
  CalendarDays,
  BarChart3,
  Loader2,
} from "lucide-react";
import type { IntentActivity } from "@shared/schema";
import { useState } from "react";

const SIGNAL_TYPES = [
  { value: "email_open", label: "Email Open", icon: Mail },
  { value: "link_click", label: "Link Click", icon: MousePointer },
  { value: "page_visit", label: "Page Visit", icon: Globe },
  { value: "search", label: "Search", icon: Search },
  { value: "form_submit", label: "Form Submit", icon: FileText },
  { value: "proposal_viewed", label: "Proposal Viewed", icon: Eye },
] as const;

const SIGNAL_SOURCES = [
  { value: "email", label: "Email" },
  { value: "website", label: "Website" },
  { value: "ad", label: "Ad" },
  { value: "social", label: "Social" },
  { value: "direct", label: "Direct" },
] as const;

function getSignalIcon(type: string) {
  const found = SIGNAL_TYPES.find((s) => s.value === type);
  return found ? found.icon : Activity;
}

function getSignalLabel(type: string) {
  const found = SIGNAL_TYPES.find((s) => s.value === type);
  return found ? found.label : type;
}

function getStrengthConfig(strength: number) {
  if (strength > 70) return { label: "High", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  if (strength >= 30) return { label: "Medium", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
  return { label: "Low", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
}

function getStrengthBarColor(strength: number) {
  if (strength > 70) return "bg-emerald-500";
  if (strength >= 30) return "bg-amber-500";
  return "bg-slate-500";
}

type StatsData = {
  total: number;
  highIntent: number;
  uniqueCompanies: number;
  thisWeek: number;
};

export default function IntentDataPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterMinStrength, setFilterMinStrength] = useState<number>(0);

  const [formCompany, setFormCompany] = useState("");
  const [formLeadId, setFormLeadId] = useState("");
  const [formSignalType, setFormSignalType] = useState("email_open");
  const [formSource, setFormSource] = useState("email");
  const [formStrength, setFormStrength] = useState(50);
  const [formDescription, setFormDescription] = useState("");

  const buildQueryKey = () => {
    const params = new URLSearchParams();
    if (filterType !== "all") params.set("type", filterType);
    if (filterSource !== "all") params.set("source", filterSource);
    if (filterMinStrength > 0) params.set("minStrength", String(filterMinStrength));
    const qs = params.toString();
    return ["/api/intent-signals" + (qs ? `?${qs}` : "")];
  };

  const { data: signals = [], isLoading: signalsLoading } = useQuery<IntentActivity[]>({
    queryKey: buildQueryKey(),
  });

  const { data: stats, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ["/api/intent-signals/stats"],
  });

  const { data: breakdown = {}, isLoading: breakdownLoading } = useQuery<Record<string, number>>({
    queryKey: ["/api/intent-signals/breakdown"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/intent-signals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intent-signals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intent-signals/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intent-signals/breakdown"] });
      toast({ title: "Signal logged", description: "Intent signal has been recorded." });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/intent-signals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intent-signals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intent-signals/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intent-signals/breakdown"] });
      toast({ title: "Deleted", description: "Signal removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setFormCompany("");
    setFormLeadId("");
    setFormSignalType("email_open");
    setFormSource("email");
    setFormStrength(50);
    setFormDescription("");
  }

  function handleSubmit() {
    createMutation.mutate({
      company: formCompany || undefined,
      leadId: formLeadId || undefined,
      signalType: formSignalType,
      signalSource: formSource,
      strength: formStrength,
      description: formDescription || undefined,
    });
  }

  const maxBreakdownCount = Math.max(1, ...Object.values(breakdown));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-intent-data">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Intent Data & Signals</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and analyze prospect intent signals across channels</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-log-signal">
              <Plus className="w-4 h-4 mr-2" />
              Log Signal
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-log-signal">
            <DialogHeader>
              <DialogTitle>Log Intent Signal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Company</Label>
                <Input
                  placeholder="Company name"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  data-testid="input-signal-company"
                />
              </div>
              <div>
                <Label>Lead ID (optional)</Label>
                <Input
                  placeholder="Lead ID"
                  value={formLeadId}
                  onChange={(e) => setFormLeadId(e.target.value)}
                  data-testid="input-signal-lead-id"
                />
              </div>
              <div>
                <Label>Signal Type</Label>
                <Select value={formSignalType} onValueChange={setFormSignalType}>
                  <SelectTrigger data-testid="select-signal-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIGNAL_TYPES.map((st) => (
                      <SelectItem key={st.value} value={st.value} data-testid={`option-signal-type-${st.value}`}>
                        {st.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Source</Label>
                <Select value={formSource} onValueChange={setFormSource}>
                  <SelectTrigger data-testid="select-signal-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIGNAL_SOURCES.map((ss) => (
                      <SelectItem key={ss.value} value={ss.value} data-testid={`option-signal-source-${ss.value}`}>
                        {ss.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Strength: {formStrength}</Label>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[formStrength]}
                  onValueChange={([v]) => setFormStrength(v)}
                  data-testid="slider-signal-strength"
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the signal..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  data-testid="input-signal-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                data-testid="button-submit-signal"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Log Signal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="stats-row">
          <Card className="p-4" data-testid="card-total-signals">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Signals</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-total-signals">{stats?.total ?? 0}</div>
          </Card>
          <Card className="p-4" data-testid="card-high-intent">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-muted-foreground">High Intent</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400" data-testid="text-high-intent">{stats?.highIntent ?? 0}</div>
          </Card>
          <Card className="p-4" data-testid="card-companies-tracked">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span className="text-sm text-muted-foreground">Companies Tracked</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-companies-tracked">{stats?.uniqueCompanies ?? 0}</div>
          </Card>
          <Card className="p-4" data-testid="card-this-week">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-muted-foreground">This Week</span>
            </div>
            <div className="text-2xl font-bold" data-testid="text-this-week">{stats?.thisWeek ?? 0}</div>
          </Card>
        </div>
      )}

      <Card className="p-4" data-testid="card-signal-breakdown">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Signal Type Breakdown</h2>
        </div>
        {breakdownLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {SIGNAL_TYPES.map((st) => {
              const c = breakdown[st.value] || 0;
              const Icon = st.icon;
              const pct = maxBreakdownCount > 0 ? (c / maxBreakdownCount) * 100 : 0;
              return (
                <div key={st.value} className="flex items-center gap-3" data-testid={`breakdown-row-${st.value}`}>
                  <div className="flex items-center gap-2 w-36 shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{st.label}</span>
                  </div>
                  <div className="flex-1 h-5 rounded-md bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-md bg-primary/60 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right" data-testid={`text-breakdown-count-${st.value}`}>{c}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-4" data-testid="card-filters">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Type:</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40" data-testid="select-filter-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {SIGNAL_TYPES.map((st) => (
                  <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Source:</Label>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-40" data-testid="select-filter-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {SIGNAL_SOURCES.map((ss) => (
                  <SelectItem key={ss.value} value={ss.value}>{ss.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 min-w-[200px]">
            <Label className="text-sm whitespace-nowrap">Min Strength: {filterMinStrength}</Label>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[filterMinStrength]}
              onValueChange={([v]) => setFilterMinStrength(v)}
              data-testid="slider-filter-strength"
              className="w-32"
            />
          </div>
        </div>
      </Card>

      <div data-testid="activity-timeline">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Activity Timeline</h2>
        </div>
        {signalsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : signals.length === 0 ? (
          <Card className="p-8 text-center" data-testid="text-no-signals">
            <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No intent signals yet. Click "Log Signal" to add one.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {signals.map((signal) => {
              const Icon = getSignalIcon(signal.signalType);
              const strengthConfig = getStrengthConfig(signal.strength);
              const barColor = getStrengthBarColor(signal.strength);
              return (
                <Card key={signal.id} className="p-4" data-testid={`signal-row-${signal.id}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" data-testid={`text-signal-type-${signal.id}`}>
                          {getSignalLabel(signal.signalType)}
                        </span>
                        {signal.company && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1" data-testid={`text-signal-company-${signal.id}`}>
                            <Building2 className="w-3 h-3" />
                            {signal.company}
                          </span>
                        )}
                        <Badge variant="outline" className={strengthConfig.className} data-testid={`badge-signal-strength-${signal.id}`}>
                          {strengthConfig.label} ({signal.strength})
                        </Badge>
                        <Badge variant="secondary" data-testid={`badge-signal-source-${signal.id}`}>
                          {signal.signalSource}
                        </Badge>
                      </div>
                      {signal.description && (
                        <p className="text-sm text-muted-foreground mt-1" data-testid={`text-signal-desc-${signal.id}`}>
                          {signal.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 max-w-[200px] h-1.5 rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor} transition-all`}
                            style={{ width: `${signal.strength}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground" data-testid={`text-signal-time-${signal.id}`}>
                          {signal.createdAt ? new Date(signal.createdAt).toLocaleString() : ""}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(signal.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-signal-${signal.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
