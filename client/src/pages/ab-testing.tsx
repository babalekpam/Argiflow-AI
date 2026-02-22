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
  FlaskConical,
  Plus,
  Trash2,
  Play,
  Square,
  BarChart3,
  TrendingUp,
  Users,
  Target,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ABTest = {
  id: string;
  name: string;
  description: string;
  status: string;
  variantA: string;
  variantB: string;
  trafficSplit: number;
  impressionsA: number;
  impressionsB: number;
  conversionsA: number;
  conversionsB: number;
  createdAt: string;
};

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

function CreateTestDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    variantA: "Variant A",
    variantB: "Variant B",
    trafficSplit: "50",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ab-tests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ab-tests"] });
      toast({ title: "A/B test created successfully" });
      setOpen(false);
      setForm({ name: "", description: "", variantA: "Variant A", variantB: "Variant B", trafficSplit: "50" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-test">
          <Plus className="w-4 h-4 mr-2" />
          Create Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-test">
        <DialogHeader>
          <DialogTitle>Create A/B Test</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Test Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Homepage CTA Test"
              data-testid="input-test-name"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Testing different CTA button text..."
              data-testid="input-test-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Variant A</Label>
              <Input
                value={form.variantA}
                onChange={(e) => set("variantA", e.target.value)}
                placeholder="Variant A"
                data-testid="input-variant-a"
              />
            </div>
            <div>
              <Label>Variant B</Label>
              <Input
                value={form.variantB}
                onChange={(e) => set("variantB", e.target.value)}
                placeholder="Variant B"
                data-testid="input-variant-b"
              />
            </div>
          </div>
          <div>
            <Label>Traffic Split (% to Variant A)</Label>
            <Input
              type="number"
              min="1"
              max="99"
              value={form.trafficSplit}
              onChange={(e) => set("trafficSplit", e.target.value)}
              data-testid="input-traffic-split"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {form.trafficSplit}% / {100 - parseInt(form.trafficSplit || "50")}% split
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                name: form.name,
                description: form.description || null,
                variantA: form.variantA,
                variantB: form.variantB,
                trafficSplit: parseInt(form.trafficSplit) || 50,
                status: "draft",
              })
            }
            disabled={!form.name || mutation.isPending}
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
}: {
  test: ABTest;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const convRateA = test.impressionsA > 0 ? ((test.conversionsA / test.impressionsA) * 100).toFixed(1) : "0.0";
  const convRateB = test.impressionsB > 0 ? ((test.conversionsB / test.impressionsB) * 100).toFixed(1) : "0.0";
  const winner = parseFloat(convRateA) > parseFloat(convRateB) ? "A" : parseFloat(convRateB) > parseFloat(convRateA) ? "B" : null;

  return (
    <Card className="p-5" data-testid={`card-test-${test.id}`}>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate" data-testid={`text-test-name-${test.id}`}>{test.name}</h3>
            {test.description && (
              <p className="text-xs text-muted-foreground truncate">{test.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={test.status} />
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
              title="Complete test"
              data-testid={`button-complete-${test.id}`}
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

      <div className="grid grid-cols-2 gap-4">
        <div className={`p-3 rounded-md bg-background/50 ${winner === "A" ? "ring-1 ring-emerald-500/30" : ""}`}>
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span className="text-sm font-medium">{test.variantA}</span>
            {winner === "A" && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Winner</Badge>}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Impressions</span>
              <span data-testid={`text-impressions-a-${test.id}`}>{test.impressionsA.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Conversions</span>
              <span data-testid={`text-conversions-a-${test.id}`}>{test.conversionsA.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Conv. Rate</span>
              <span className="font-bold text-primary" data-testid={`text-rate-a-${test.id}`}>{convRateA}%</span>
            </div>
          </div>
        </div>
        <div className={`p-3 rounded-md bg-background/50 ${winner === "B" ? "ring-1 ring-emerald-500/30" : ""}`}>
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span className="text-sm font-medium">{test.variantB}</span>
            {winner === "B" && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Winner</Badge>}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Impressions</span>
              <span data-testid={`text-impressions-b-${test.id}`}>{test.impressionsB.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Conversions</span>
              <span data-testid={`text-conversions-b-${test.id}`}>{test.conversionsB.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Conv. Rate</span>
              <span className="font-bold text-primary" data-testid={`text-rate-b-${test.id}`}>{convRateB}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Target className="w-3 h-3" />
          Split: {test.trafficSplit}% / {100 - test.trafficSplit}%
        </span>
        <span>Created: {new Date(test.createdAt).toLocaleDateString()}</span>
      </div>
    </Card>
  );
}

export default function ABTestingPage() {
  const { toast } = useToast();
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

  const running = (tests || []).filter((t) => t.status === "running").length;
  const completed = (tests || []).filter((t) => t.status === "completed").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="ab-testing-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">A/B Testing</h1>
            <p className="text-muted-foreground text-sm">Split test your campaigns and optimize conversions</p>
          </div>
        </div>
        <CreateTestDialog />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-tests">{(tests || []).length}</p>
              <p className="text-sm text-muted-foreground">Total Tests</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Play className="w-5 h-5 text-emerald-400" />
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
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-completed-tests">{completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (tests || []).length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold mb-1">No A/B tests yet</h3>
            <p className="text-sm">Create your first test to start optimizing conversions.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {(tests || []).map((test) => (
            <TestCard
              key={test.id}
              test={test}
              onDelete={(id) => deleteMutation.mutate(id)}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
