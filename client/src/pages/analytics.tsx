import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  Plus,
  Mail,
  MousePointerClick,
  Reply,
  DollarSign,
  TrendingUp,
  Trash2,
  Loader2,
  ArrowDown,
  Megaphone,
  Eye,
  Users,
  FlaskConical,
} from "lucide-react";
import { useState } from "react";
import type { CampaignReport } from "@shared/schema";

type OverviewData = {
  totalCampaigns: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  totalConverted: number;
  totalRevenue: number;
  totalCost: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
};

type FunnelStage = {
  name: string;
  value: number;
  percentage: number;
};

type FunnelData = {
  stages: FunnelStage[];
};

type ABTestVariant = {
  id: string;
  name: string;
  variant: string;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  revenue: number;
};

type ABTestGroup = {
  group: string;
  variants: ABTestVariant[];
};

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    email: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    sms: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    linkedin: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    call: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    mixed: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  return (
    <Badge className={styles[type] || styles.mixed} data-testid={`badge-type-${type}`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  );
}

function OverviewCards({ data }: { data: OverviewData }) {
  const cards = [
    { label: "Total Campaigns", value: data.totalCampaigns.toLocaleString(), icon: Megaphone, testId: "stat-total-campaigns" },
    { label: "Emails Sent", value: data.totalSent.toLocaleString(), icon: Mail, testId: "stat-emails-sent" },
    { label: "Open Rate", value: `${data.openRate}%`, icon: Eye, testId: "stat-open-rate" },
    { label: "Click Rate", value: `${data.clickRate}%`, icon: MousePointerClick, testId: "stat-click-rate" },
    { label: "Reply Rate", value: `${data.replyRate}%`, icon: Reply, testId: "stat-reply-rate" },
    { label: "Revenue", value: `$${data.totalRevenue.toLocaleString()}`, icon: DollarSign, testId: "stat-revenue" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" data-testid="overview-stats-row">
      {cards.map((c) => (
        <Card key={c.testId} className="p-4" data-testid={c.testId}>
          <div className="flex items-center gap-2 mb-2">
            <c.icon className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">{c.label}</span>
          </div>
          <div className="text-xl font-bold">{c.value}</div>
        </Card>
      ))}
    </div>
  );
}

function ConversionFunnel({ data }: { data: FunnelData }) {
  const colors = [
    "bg-blue-500",
    "bg-sky-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-primary",
  ];

  return (
    <Card className="p-6" data-testid="conversion-funnel">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Conversion Funnel</h3>
      </div>
      <div className="space-y-4">
        {data.stages.map((stage, i) => (
          <div key={stage.name} data-testid={`funnel-stage-${stage.name.toLowerCase()}`}>
            <div className="flex items-center justify-between gap-4 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{stage.name}</span>
                {i > 0 && (
                  <span className="flex items-center text-xs text-muted-foreground">
                    <ArrowDown className="w-3 h-3 mr-0.5" />
                    {stage.percentage}%
                  </span>
                )}
              </div>
              <span className="text-sm font-bold" data-testid={`funnel-value-${stage.name.toLowerCase()}`}>
                {stage.value.toLocaleString()}
              </span>
            </div>
            <Progress value={stage.percentage} className={`h-3 ${colors[i]}`} data-testid={`funnel-bar-${stage.name.toLowerCase()}`} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function CampaignTable({
  reports,
  onDelete,
  isDeleting,
}: {
  reports: CampaignReport[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  return (
    <Card className="overflow-visible" data-testid="campaign-performance-table">
      <div className="flex items-center gap-2 p-6 pb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Campaign Performance</h3>
      </div>
      {reports.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground" data-testid="text-no-reports">
          No campaign reports yet. Create your first report to see performance data.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Open Rate</TableHead>
                <TableHead className="text-right">Click Rate</TableHead>
                <TableHead className="text-right">Reply Rate</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">ROI</TableHead>
                <TableHead>A/B</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => {
                const openRate = (r.totalSent || 0) > 0 ? Math.round(((r.totalOpened || 0) / (r.totalSent || 1)) * 10000) / 100 : 0;
                const clickRate = (r.totalSent || 0) > 0 ? Math.round(((r.totalClicked || 0) / (r.totalSent || 1)) * 10000) / 100 : 0;
                const replyRate = (r.totalSent || 0) > 0 ? Math.round(((r.totalReplied || 0) / (r.totalSent || 1)) * 10000) / 100 : 0;
                const roi = (r.cost || 0) > 0 ? Math.round((((r.revenue || 0) - (r.cost || 0)) / (r.cost || 1)) * 10000) / 100 : 0;
                return (
                  <TableRow key={r.id} data-testid={`report-row-${r.id}`}>
                    <TableCell className="font-medium" data-testid={`text-report-name-${r.id}`}>{r.name}</TableCell>
                    <TableCell><TypeBadge type={r.type} /></TableCell>
                    <TableCell className="text-right" data-testid={`text-report-sent-${r.id}`}>{(r.totalSent || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{openRate}%</TableCell>
                    <TableCell className="text-right">{clickRate}%</TableCell>
                    <TableCell className="text-right">{replyRate}%</TableCell>
                    <TableCell className="text-right">${(r.revenue || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <span className={roi >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {roi}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.abTestVariant && (
                        <Badge variant="outline" className="text-xs">
                          {r.abTestVariant}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(r.id)}
                        disabled={isDeleting}
                        data-testid={`button-delete-report-${r.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

function ABTestSection({ abTests }: { abTests: ABTestGroup[] }) {
  if (abTests.length === 0) return null;

  return (
    <Card className="p-6" data-testid="ab-test-section">
      <div className="flex items-center gap-2 mb-6">
        <FlaskConical className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">A/B Test Comparison</h3>
      </div>
      <div className="space-y-6">
        {abTests.map((test) => (
          <div key={test.group} data-testid={`ab-group-${test.group}`}>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {test.group}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {test.variants.map((v) => (
                <Card key={v.id} className="p-4" data-testid={`ab-variant-${v.id}`}>
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <span className="font-medium text-sm">{v.name}</span>
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                      {v.variant}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-sky-400">{v.openRate}%</div>
                      <div className="text-xs text-muted-foreground">Open Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-400">{v.clickRate}%</div>
                      <div className="text-xs text-muted-foreground">Click Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-amber-400">{v.replyRate}%</div>
                      <div className="text-xs text-muted-foreground">Reply Rate</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t text-sm text-muted-foreground flex-wrap">
                    <span>Sent: {v.totalSent.toLocaleString()}</span>
                    <span className="font-medium text-foreground">${v.revenue.toLocaleString()}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

const campaignChartConfig = {
  openRate: { label: "Open Rate %", color: "hsl(var(--chart-1))" },
  clickRate: { label: "Click Rate %", color: "hsl(var(--chart-2))" },
  replyRate: { label: "Reply Rate %", color: "hsl(var(--chart-3))" },
};

function CampaignPerformanceChart({ reports }: { reports: CampaignReport[] }) {
  if (reports.length === 0) return null;

  const data = reports.slice(0, 8).map((r) => ({
    name: r.name.length > 14 ? r.name.slice(0, 14) + "…" : r.name,
    openRate:
      (r.totalSent || 0) > 0
        ? Math.round(((r.totalOpened || 0) / (r.totalSent || 1)) * 10000) / 100
        : 0,
    clickRate:
      (r.totalSent || 0) > 0
        ? Math.round(((r.totalClicked || 0) / (r.totalSent || 1)) * 10000) / 100
        : 0,
    replyRate:
      (r.totalSent || 0) > 0
        ? Math.round(((r.totalReplied || 0) / (r.totalSent || 1)) * 10000) / 100
        : 0,
  }));

  return (
    <Card className="p-6" data-testid="campaign-performance-chart">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Performance Overview</h3>
      </div>
      <ChartContainer config={campaignChartConfig} className="h-64">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 100]} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="openRate" fill="var(--color-openRate)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="clickRate" fill="var(--color-clickRate)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="replyRate" fill="var(--color-replyRate)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </Card>
  );
}

function CreateReportDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "email",
    channel: "",
    totalSent: "",
    totalOpened: "",
    totalClicked: "",
    totalReplied: "",
    totalConverted: "",
    totalBounced: "",
    revenue: "",
    cost: "",
    abTestVariant: "",
    abTestGroup: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/analytics/reports", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/funnel"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/ab-tests"] });
      toast({ title: "Report created", description: "Campaign report has been added." });
      setOpen(false);
      setForm({
        name: "", type: "email", channel: "",
        totalSent: "", totalOpened: "", totalClicked: "", totalReplied: "",
        totalConverted: "", totalBounced: "", revenue: "", cost: "",
        abTestVariant: "", abTestGroup: "",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Validation", description: "Report name is required.", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      name: form.name.trim(),
      type: form.type,
      channel: form.channel || null,
      totalSent: parseInt(form.totalSent) || 0,
      totalOpened: parseInt(form.totalOpened) || 0,
      totalClicked: parseInt(form.totalClicked) || 0,
      totalReplied: parseInt(form.totalReplied) || 0,
      totalConverted: parseInt(form.totalConverted) || 0,
      totalBounced: parseInt(form.totalBounced) || 0,
      revenue: parseFloat(form.revenue) || 0,
      cost: parseFloat(form.cost) || 0,
      abTestVariant: form.abTestVariant || null,
      abTestGroup: form.abTestGroup || null,
    });
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-report">
          <Plus className="w-4 h-4 mr-2" />
          Create Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-create-report">
        <DialogHeader>
          <DialogTitle>Create Campaign Report</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Report Name</Label>
            <Input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Q1 Email Campaign"
              data-testid="input-report-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => updateField("type", v)}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Input
                value={form.channel}
                onChange={(e) => updateField("channel", e.target.value)}
                placeholder="e.g. Newsletter"
                data-testid="input-report-channel"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Sent</Label>
              <Input type="number" value={form.totalSent} onChange={(e) => updateField("totalSent", e.target.value)} placeholder="0" data-testid="input-total-sent" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Opened</Label>
              <Input type="number" value={form.totalOpened} onChange={(e) => updateField("totalOpened", e.target.value)} placeholder="0" data-testid="input-total-opened" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Clicked</Label>
              <Input type="number" value={form.totalClicked} onChange={(e) => updateField("totalClicked", e.target.value)} placeholder="0" data-testid="input-total-clicked" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Replied</Label>
              <Input type="number" value={form.totalReplied} onChange={(e) => updateField("totalReplied", e.target.value)} placeholder="0" data-testid="input-total-replied" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Converted</Label>
              <Input type="number" value={form.totalConverted} onChange={(e) => updateField("totalConverted", e.target.value)} placeholder="0" data-testid="input-total-converted" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bounced</Label>
              <Input type="number" value={form.totalBounced} onChange={(e) => updateField("totalBounced", e.target.value)} placeholder="0" data-testid="input-total-bounced" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Revenue ($)</Label>
              <Input type="number" step="0.01" value={form.revenue} onChange={(e) => updateField("revenue", e.target.value)} placeholder="0.00" data-testid="input-revenue" />
            </div>
            <div className="space-y-2">
              <Label>Cost ($)</Label>
              <Input type="number" step="0.01" value={form.cost} onChange={(e) => updateField("cost", e.target.value)} placeholder="0.00" data-testid="input-cost" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>A/B Variant (optional)</Label>
              <Input
                value={form.abTestVariant}
                onChange={(e) => updateField("abTestVariant", e.target.value)}
                placeholder="e.g. Variant A"
                data-testid="input-ab-variant"
              />
            </div>
            <div className="space-y-2">
              <Label>A/B Group (optional)</Label>
              <Input
                value={form.abTestGroup}
                onChange={(e) => updateField("abTestGroup", e.target.value)}
                placeholder="e.g. Subject Line Test"
                data-testid="input-ab-group"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-report">
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AnalyticsPage() {
  const { toast } = useToast();

  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewData>({
    queryKey: ["/api/analytics/overview"],
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery<CampaignReport[]>({
    queryKey: ["/api/analytics/reports"],
  });

  const { data: funnel, isLoading: funnelLoading } = useQuery<FunnelData>({
    queryKey: ["/api/analytics/funnel"],
  });

  const { data: abTests = [], isLoading: abLoading } = useQuery<ABTestGroup[]>({
    queryKey: ["/api/analytics/ab-tests"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/analytics/reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/funnel"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/ab-tests"] });
      toast({ title: "Report deleted", description: "Campaign report removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isLoading = overviewLoading || reportsLoading || funnelLoading || abLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="analytics-loading">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="analytics-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Reporting & Analytics</h1>
        </div>
        <CreateReportDialog />
      </div>

      {overview && <OverviewCards data={overview} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {funnel && <ConversionFunnel data={funnel} />}

        {abTests.length > 0 && <ABTestSection abTests={abTests} />}
      </div>

      <CampaignPerformanceChart reports={reports} />

      <CampaignTable
        reports={reports}
        onDelete={(id) => deleteMutation.mutate(id)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
