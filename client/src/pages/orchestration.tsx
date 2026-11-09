import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pause, Play, RefreshCw } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  OrchestrationGraph,
  ORCHESTRATION_ICON_SVG,
  type OrchestrationGraphHandle,
  type OrchestrationIconKind,
  type OrchestrationNode,
} from "@/components/orchestration-graph";

type LeadRow = {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  source: string;
  status: string;
  score?: number | null;
  companyResearch?: string | null;
  companyResearchedAt?: string | null;
  outreachSentAt?: string | null;
  createdAt?: string | null;
};

type StatsData = {
  totalLeads: number;
  activeLeads: number;
  appointmentsBooked: number;
  conversionRate: number;
  revenue: number;
};

type SequenceStats = {
  totalSequences: number;
  activeCount: number;
  totalEnrolled: number;
  replyRate: number;
};

type AppointmentRow = {
  id: string;
  leadName: string;
  type: string;
  date: string;
  status: string;
};

const POLL_MS = 20000;

type StageId = "sourcing" | "qualification" | "enrichment" | "sequences" | "booked";

const STAGE_META: Record<
  StageId,
  { label: string; sub: string; color: string; icon: OrchestrationIconKind; x: number; y: number; r: number; description: string }
> = {
  sourcing: {
    label: "Lead Sourcing",
    sub: "Trigger",
    color: "#f97316",
    icon: "zap",
    x: 0.12,
    y: 0.5,
    r: 30,
    description:
      "Every lead that enters ArgiFlow, from the scraper, imports, forms and integrations. This is where work enters the pipeline.",
  },
  qualification: {
    label: "Qualification",
    sub: "Condition",
    color: "#fbbf24",
    icon: "branch",
    x: 0.32,
    y: 0.28,
    r: 30,
    description:
      "Leads are scored and sorted by status. Hot and qualified leads have passed the gate; new and cold leads are still waiting at it.",
  },
  enrichment: {
    label: "Enrichment",
    sub: "Agent Step",
    color: "#fb7185",
    icon: "bot",
    x: 0.54,
    y: 0.52,
    r: 38,
    description:
      "Company research fills in the picture — what the business does, who decides, and why they would care — before any outreach is written.",
  },
  sequences: {
    label: "Sequences",
    sub: "API / Approval",
    color: "#38bdf8",
    icon: "plug",
    x: 0.76,
    y: 0.3,
    r: 30,
    description:
      "Enrolled leads move through your outreach sequences across email and other channels, with follow-ups driven by engagement.",
  },
  booked: {
    label: "Booked & Converted",
    sub: "Done",
    color: "#a3e635",
    icon: "badge",
    x: 0.62,
    y: 0.84,
    r: 28,
    description:
      "Meetings booked and leads converted. The graph ends where the pipeline pays off.",
  },
};

const EDGES: [StageId, StageId][] = [
  ["sourcing", "qualification"],
  ["qualification", "enrichment"],
  ["enrichment", "sequences"],
  ["sequences", "booked"],
  ["qualification", "sequences"],
];

const INCOMING: Record<StageId, StageId[]> = {
  sourcing: [],
  qualification: ["sourcing"],
  enrichment: ["qualification"],
  sequences: ["enrichment", "qualification"],
  booked: ["sequences"],
};

function ago(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatDistanceToNow(d, { addSuffix: true });
}

export default function OrchestrationPage() {
  usePageTitle("Orchestration");
  const graphRef = useRef<OrchestrationGraphHandle | null>(null);
  const [selectedId, setSelectedId] = useState<StageId>("sourcing");
  const [playing, setPlaying] = useState<boolean>(
    () =>
      typeof window === "undefined" ||
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const leadsQuery = useQuery<LeadRow[]>({
    queryKey: ["/api/leads"],
    refetchInterval: POLL_MS,
  });
  const statsQuery = useQuery<StatsData>({
    queryKey: ["/api/stats"],
    refetchInterval: POLL_MS,
  });
  const seqQuery = useQuery<SequenceStats>({
    queryKey: ["/api/sequences/stats"],
    refetchInterval: POLL_MS,
  });
  const apptQuery = useQuery<AppointmentRow[]>({
    queryKey: ["/api/appointments"],
    refetchInterval: POLL_MS,
  });

  const leads = useMemo<LeadRow[]>(
    () => (Array.isArray(leadsQuery.data) ? leadsQuery.data : []),
    [leadsQuery.data],
  );
  const stats = statsQuery.data;
  const seqStats = seqQuery.data;
  const appointments = Array.isArray(apptQuery.data) ? apptQuery.data : [];

  const derived = useMemo(() => {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const status = (l: LeadRow) => (l.status || "").toLowerCase();
    const newLast24h = leads.filter(
      (l) => l.createdAt && new Date(l.createdAt).getTime() >= dayAgo,
    ).length;
    const waiting = leads.filter((l) => status(l) === "new" || status(l) === "cold").length;
    const warming = leads.filter((l) => status(l) === "warm").length;
    const passed = leads.filter((l) => status(l) === "hot" || status(l) === "qualified").length;
    const enriched = leads.filter(
      (l) => (l.companyResearch && l.companyResearch.trim().length > 0) || l.companyResearchedAt,
    ).length;
    const contacted = leads.filter((l) => l.outreachSentAt).length;
    const converted = leads.filter((l) => status(l) === "converted").length;
    const bySource = new Map<string, number>();
    for (const l of leads) bySource.set(l.source || "unknown", (bySource.get(l.source || "unknown") || 0) + 1);
    const topSources = Array.from(bySource.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const scores = leads.map((l) => l.score || 0);
    const avgScore = leads.length ? Math.round(scores.reduce((a, b) => a + b, 0) / leads.length) : 0;
    return {
      newLast24h,
      waiting,
      warming,
      passed,
      enriched,
      pendingEnrichment: leads.length - enriched,
      contacted,
      converted,
      topSources,
      avgScore,
    };
  }, [leads]);

  const counts: Record<StageId, number> = {
    sourcing: leads.length,
    qualification: derived.passed,
    enrichment: derived.enriched,
    sequences: seqStats?.totalEnrolled ?? 0,
    booked: stats?.appointmentsBooked ?? 0,
  };

  const nodes: OrchestrationNode[] = (Object.keys(STAGE_META) as StageId[]).map((id) => {
    const meta = STAGE_META[id];
    return {
      id,
      label: meta.label,
      sub: meta.sub,
      x: meta.x,
      y: meta.y,
      r: meta.r,
      color: meta.color,
      icon: meta.icon,
      count: counts[id],
    };
  });

  const activityLevel =
    leads.length === 0 ? 0 : 0.3 + Math.min(0.55, derived.newLast24h / 30);

  // Flare a stage whenever its live count grows between polls.
  const prevCounts = useRef<Record<StageId, number> | null>(null);
  useEffect(() => {
    if (prevCounts.current) {
      for (const id of Object.keys(counts) as StageId[]) {
        if (counts[id] > (prevCounts.current[id] ?? 0)) {
          graphRef.current?.burstInto(id);
        }
      }
    }
    prevCounts.current = counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts.sourcing, counts.qualification, counts.enrichment, counts.sequences, counts.booked]);

  const detail = useMemo(() => {
    const byCreatedDesc = [...leads].sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || ""),
    );
    switch (selectedId) {
      case "sourcing":
        return {
          stats: [
            ["Total leads", String(leads.length)],
            ["New in last 24h", String(derived.newLast24h)],
            ["Active leads", String(stats?.activeLeads ?? 0)],
          ],
          items: byCreatedDesc.slice(0, 5).map((l) => ({
            title: l.name,
            meta: `${l.company || l.email} · ${l.source} · ${ago(l.createdAt)}`,
          })),
          emptyText: "No leads yet. New leads will land here as they are sourced.",
        };
      case "qualification":
        return {
          stats: [
            ["Passed the gate (hot + qualified)", String(derived.passed)],
            ["Warming up", String(derived.warming)],
            ["Waiting (new + cold)", String(derived.waiting)],
            ["Average lead score", String(derived.avgScore)],
          ],
          items: leads
            .filter((l) => ["hot", "qualified"].includes((l.status || "").toLowerCase()))
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 5)
            .map((l) => ({
              title: l.name,
              meta: `${l.company || l.email} · score ${l.score ?? 0} · ${l.status}`,
            })),
          emptyText: "No leads have passed the gate yet.",
        };
      case "enrichment":
        return {
          stats: [
            ["Researched / enriched", String(derived.enriched)],
            ["Still pending", String(derived.pendingEnrichment)],
            [
              "Coverage",
              leads.length ? `${Math.round((derived.enriched / leads.length) * 100)}%` : "0%",
            ],
          ],
          items: leads
            .filter((l) => l.companyResearchedAt)
            .sort((a, b) => (b.companyResearchedAt || "").localeCompare(a.companyResearchedAt || ""))
            .slice(0, 5)
            .map((l) => ({
              title: l.name,
              meta: `${l.company || l.email} · researched ${ago(l.companyResearchedAt)}`,
            })),
          emptyText: "No company research has run yet.",
        };
      case "sequences":
        return {
          stats: [
            ["Active sequences", String(seqStats?.activeCount ?? 0)],
            ["Total sequences", String(seqStats?.totalSequences ?? 0)],
            ["Leads enrolled", String(seqStats?.totalEnrolled ?? 0)],
            ["Reply rate", `${seqStats?.replyRate ?? 0}%`],
            ["Leads contacted", String(derived.contacted)],
          ],
          items: leads
            .filter((l) => l.outreachSentAt)
            .sort((a, b) => (b.outreachSentAt || "").localeCompare(a.outreachSentAt || ""))
            .slice(0, 5)
            .map((l) => ({
              title: l.name,
              meta: `${l.company || l.email} · outreach sent ${ago(l.outreachSentAt)}`,
            })),
          emptyText: "No outreach has been sent yet.",
        };
      case "booked":
        return {
          stats: [
            ["Appointments booked", String(stats?.appointmentsBooked ?? 0)],
            ["Leads converted", String(derived.converted)],
            ["Conversion rate", `${stats?.conversionRate ?? 0}%`],
          ],
          items: [...appointments]
            .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
            .slice(0, 5)
            .map((a) => ({
              title: a.leadName,
              meta: `${a.type} · ${a.status} · ${ago(a.date)}`,
            })),
          emptyText: "No appointments booked yet.",
        };
    }
  }, [selectedId, leads, derived, stats, seqStats, appointments]);

  const selectedMeta = STAGE_META[selectedId];
  const isLoading = leadsQuery.isLoading && !leadsQuery.data;
  const hasError = leadsQuery.isError || statsQuery.isError || seqQuery.isError;
  const lastUpdated = leadsQuery.dataUpdatedAt
    ? new Date(leadsQuery.dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-orchestration-title">
            Orchestration
          </h1>
          <p className="text-muted-foreground text-sm">
            Your whole lead pipeline as one living picture — sourcing, qualification,
            enrichment, sequences and bookings, fed by your real data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
            Live{lastUpdated ? ` · updated ${lastUpdated}` : ""}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPlaying((p) => !p)}
            data-testid="button-orchestration-motion"
          >
            {playing ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {playing ? "Pause motion" : "Play motion"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              leadsQuery.refetch();
              statsQuery.refetch();
              seqQuery.refetch();
              apptQuery.refetch();
            }}
            data-testid="button-orchestration-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {hasError && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5 text-sm text-amber-200" data-testid="banner-orchestration-error">
          Some pipeline data could not be loaded, so a few counts may be showing as zero.
          The graph keeps polling and will recover on its own.
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.keys(STAGE_META) as StageId[]).map((id) => {
          const meta = STAGE_META[id];
          return (
            <button
              key={id}
              onClick={() => setSelectedId(id)}
              className={`text-left rounded-xl border p-3 transition-colors ${
                selectedId === id
                  ? "border-primary/60 bg-primary/5"
                  : "border-border/60 bg-card hover:border-border"
              }`}
              data-testid={`metric-stage-${id}`}
            >
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {meta.sub}
              </div>
              <div className="text-2xl font-bold mt-1">{counts[id]}</div>
              <div className="text-xs text-muted-foreground">{meta.label}</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden border-border/60">
          <div className="relative h-[440px] bg-[#0d1117]">
            {isLoading ? (
              <div className="absolute inset-0 p-6 space-y-4">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <OrchestrationGraph
                ref={graphRef}
                nodes={nodes}
                edges={EDGES}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId(id as StageId)}
                activityLevel={activityLevel}
                playing={playing}
              />
            )}
            {!isLoading && leads.length === 0 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border/60 bg-background/85 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur-sm" data-testid="text-orchestration-empty">
                No leads yet — this graph lights up as your pipeline starts moving.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 space-y-4 border-border/60" data-testid="panel-orchestration-detail">
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
              style={{ color: selectedMeta.color, borderColor: selectedMeta.color }}
              dangerouslySetInnerHTML={{ __html: ORCHESTRATION_ICON_SVG[selectedMeta.icon] }}
            />
            <div>
              <h3 className="font-semibold leading-tight">
                {selectedMeta.label}{" "}
                <span className="text-muted-foreground font-normal">· {selectedMeta.sub}</span>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{selectedMeta.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            {detail.stats.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border/50 pt-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
              Recent at this stage
            </div>
            {detail.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{detail.emptyText}</p>
            ) : (
              <ul className="space-y-2">
                {detail.items.map((item, i) => (
                  <li key={i} className="text-sm">
                    <div className="font-medium leading-tight">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.meta}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Counts refresh automatically every {POLL_MS / 1000} seconds from your live pipeline
        endpoints. A stage flares when its count grows. Only counts move in this picture —
        never lead content.
      </p>
    </div>
  );
}
