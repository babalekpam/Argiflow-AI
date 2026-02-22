import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FlaskConical,
  Plus,
  Trash2,
  Play,
  Square,
  Trophy,
  BarChart3,
  TrendingUp,
  Search,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ABTest = {
  id: string;
  userId: string;
  name: string;
  type: string;
  variants: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  winningVariant: string | null;
  createdAt: string;
  updatedAt: string;
};

type VariantData = {
  name: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
};

function parseVariants(variants: string): VariantData[] {
  try {
    const parsed = JSON.parse(variants);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    running: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  return (
    <Badge className={styles[status] || styles.draft} data-testid={`badge-status-${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    page: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    email: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    cta: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    form: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };
  return (
    <Badge className={styles[type] || "bg-zinc-500/10 text-zinc-400"} data-testid={`badge-type-${type}`}>
      {type.toUpperCase()}
    </Badge>
  );
}

function CreateTestDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "page",
    variantAName: "Control",
    variantAContent: "",
    variantBName: "Variation",
    variantBContent: "",
    startDate: "",
    endDate: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ab-tests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ab-tests"] });
      toast({ title: "A/B test created successfully" });
      setOpen(false);
      setForm({
        name: "", type: "page", variantAName: "Control", variantAContent: "",
        variantBName: "Variation", variantBContent: "", startDate: "", endDate: "",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const variants = JSON.stringify([
      { name: form.variantAName, content: form.variantAContent, impressions: 0, conversions: 0, conversionRate: 0 },
      { name: form.variantBName, content: form.variantBContent, impressions: 0, conversions: 0, conversionRate: 0 },
    ]);
    mutation.mutate({
      name: form.name,
      type: form.type,
      variants,
      status: "draft",
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-test">
          <Plus className="w-4 h-4 mr-2" />
          Create Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-create-test">
        <DialogHeader>
          <DialogTitle>Create A/B Test</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label>Test Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Homepage CTA Test"
                data-testid="input-test-name"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Test Type *</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger data-testid="select-test-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="page">Page</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="cta">CTA</SelectItem>
                  <SelectItem value="form">Form</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Variant A Name *</Label>
              <Input
                value={form.variantAName}
                onChange={(e) => set("variantAName", e.target.value)}
                placeholder="Control"
                data-testid="input-variant-a-name"
              />
            </div>
            <div>
              <Label>Variant B Name *</Label>
              <Input
                value={form.variantBName}
                onChange={(e) => set("variantBName", e.target.value)}
                placeholder="Variation"
                data-testid="input-variant-b-name"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Variant A Content</Label>
              <Textarea
                value={form.variantAContent}
                onChange={(e) => set("variantAContent", e.target.value)}
                placeholder="Original version..."
                data-testid="input-variant-a-content"
              />
            </div>
            <div>
              <Label>Variant B Content</Label>
              <Textarea
                value={form.variantBContent}
                onChange={(e) => set("variantBContent", e.target.value)}
                placeholder="New variation..."
                data-testid="input-variant-b-content"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                data-testid="input-end-date"
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!form.name.trim() || mutation.isPending}
            data-testid="button-submit-test"
          >
            {mutation.isPending ? "Creating..." : "Create Test"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TestCard({
  test,
  onDelete,
  onStatusChange,
  onDeclareWinner,
}: {
  test: ABTest;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onDeclareWinner: (id: string, winner: string) => void;
}) {
  const variants = parseVariants(test.variants);
  const variantA = variants[0];
  const variantB = variants[1];

  const getBetterVariant = () => {
    if (!variantA || !variantB) return null;
    if (variantA.conversionRate > variantB.conversionRate) return variantA.name;
    if (variantB.conversionRate > variantA.conversionRate) return variantB.name;
    return null;
  };

  const betterVariant = getBetterVariant();

  return (
    <Card className="p-5" data-testid={`card-test-${test.id}`}>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate" data-testid={`text-test-name-${test.id}`}>{test.name}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <TypeBadge type={test.type} />
              {test.startDate && (
                <span className="text-xs text-muted-foreground">
                  {new Date(test.startDate).toLocaleDateString()}
                  {test.endDate && ` - ${new Date(test.endDate).toLocaleDateString()}`}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={test.status} />
          {test.winningVariant && (
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
              <Trophy className="w-3 h-3 mr-1" />
              {test.winningVariant}
            </Badge>
          )}
          {test.status === "draft" && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onStatusChange(test.id, "running")}
              title="Start test"
              data-testid={`button-start-${test.id}`}
            >
              <Play className="w-4 h-4 text-emerald-400" />
            </Button>
          )}
          {test.status === "running" && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onStatusChange(test.id, "completed")}
              title="Stop test"
              data-testid={`button-stop-${test.id}`}
            >
              <Square className="w-4 h-4 text-amber-400" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(test.id)}
            data-testid={`button-delete-${test.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {variants.length >= 2 && (
        <div className="grid grid-cols-2 gap-4 mb-3">
          {variants.slice(0, 2).map((variant, idx) => {
            const isWinner = test.winningVariant === variant.name || (!test.winningVariant && betterVariant === variant.name && test.status === "completed");
            return (
              <div
                key={idx}
                className={`p-3 rounded-md bg-background/50 ${isWinner ? "ring-1 ring-emerald-500/30" : ""}`}
                data-testid={`variant-card-${idx}-${test.id}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-medium">{variant.name}</span>
                  {isWinner && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Winner</Badge>}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Impressions</span>
                    <span data-testid={`text-impressions-${idx}-${test.id}`}>{(variant.impressions || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Conversions</span>
                    <span data-testid={`text-conversions-${idx}-${test.id}`}>{(variant.conversions || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Conv. Rate</span>
                    <span className="font-bold" data-testid={`text-rate-${idx}-${test.id}`}>
                      {(variant.conversionRate || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                {test.status === "completed" && !test.winningVariant && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => onDeclareWinner(test.id, variant.name)}
                    data-testid={`button-declare-winner-${idx}-${test.id}`}
                  >
                    <Trophy className="w-3.5 h-3.5 mr-1.5" />
                    Declare Winner
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-4 pt-3 border-t text-xs text-muted-foreground flex-wrap">
        <span>Created: {new Date(test.createdAt).toLocaleDateString()}</span>
        {test.updatedAt && <span>Updated: {new Date(test.updatedAt).toLocaleDateString()}</span>}
      </div>
    </Card>
  );
}

export default function ABTestingPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const { data: tests, isLoading } = useQuery<ABTest[]>({
    queryKey: ["/api/ab-tests"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/ab-tests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ab-tests"] });
      toast({ title: "Test deleted" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/ab-tests/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ab-tests"] });
      toast({ title: "Test updated" });
    },
  });

  const winnerMutation = useMutation({
    mutationFn: ({ id, winningVariant }: { id: string; winningVariant: string }) =>
      apiRequest("PATCH", `/api/ab-tests/${id}`, { winningVariant }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ab-tests"] });
      toast({ title: "Winner declared" });
    },
  });

  const allTests = tests || [];
  const running = allTests.filter((t) => t.status === "running").length;
  const completed = allTests.filter((t) => t.status === "completed").length;
  const avgImprovement = (() => {
    const completedTests = allTests.filter((t) => t.status === "completed");
    if (completedTests.length === 0) return 0;
    const improvements = completedTests.map((t) => {
      const v = parseVariants(t.variants);
      if (v.length < 2) return 0;
      const base = v[0].conversionRate || 0;
      const variation = v[1].conversionRate || 0;
      return base > 0 ? ((variation - base) / base) * 100 : 0;
    });
    return improvements.reduce((a, b) => a + b, 0) / improvements.length;
  })();

  const filtered = allTests
    .filter((t) => activeTab === "all" || t.status === activeTab)
    .filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.type.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="ab-testing-page">
      <div className="rounded-md bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-purple-500/10 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-gradient-to-br from-indigo-500/30 to-violet-500/30 flex items-center justify-center shrink-0">
              <FlaskConical className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">A/B Testing Suite</h1>
              <p className="text-muted-foreground text-sm">Split test your pages, emails, CTAs & forms to optimize conversions</p>
            </div>
          </div>
          <CreateTestDialog />
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-indigo-500/10 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-tests">{allTests.length}</p>
              <p className="text-sm text-muted-foreground">Total Tests</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-running-tests">{running}</p>
              <p className="text-sm text-muted-foreground">Running</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-completed-tests">{completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-avg-improvement">{avgImprovement.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Avg Improvement</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-filter">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="draft" data-testid="tab-draft">Draft</TabsTrigger>
            <TabsTrigger value="running" data-testid="tab-running">Running</TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 w-64"
            placeholder="Search tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold mb-1">No A/B tests found</h3>
            <p className="text-sm">
              {allTests.length === 0
                ? "Create your first A/B test to start optimizing your conversions."
                : "No tests match your current filters."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              onDelete={(id) => deleteMutation.mutate(id)}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              onDeclareWinner={(id, winningVariant) => winnerMutation.mutate({ id, winningVariant })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
