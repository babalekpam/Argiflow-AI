import { useQuery } from "@tanstack/react-query";
import { BarChart3, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Evidence {
  range: { from: string; to: string };
  acceptedRecords: number;
  unknownDelivery: number;
  failedRecords: number;
  bounceReports: number;
  replies: number;
  uniqueRecipients: number;
}

export function CrmEmailEvidence({ businessId, qualifiedHotCount }: {
  businessId: string | null;
  qualifiedHotCount?: number;
}) {
  const url = `/api/evidence/email-funnel${businessId ? `?${new URLSearchParams({ businessId })}` : ""}`;
  const { data, isPending, isError, isFetching, refetch } = useQuery<Evidence>({
    queryKey: [url],
  });
  const metrics = data ? [
    ["Accepted by provider", data.acceptedRecords, "text-sky-400"],
    ["Delivery unconfirmed", data.unknownDelivery, "text-amber-400"],
    ["Failed send records", data.failedRecords, "text-red-400"],
    ["Bounce reports", data.bounceReports, "text-orange-400"],
    ["Stored inbound replies", data.replies, "text-emerald-400"],
    ["Current reply-qualified HOT leads", qualifiedHotCount ?? "—", "text-purple-400"],
  ] : [];

  return (
    <Card className="p-4 mb-6" data-testid="card-email-analytics">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Email Outreach Evidence
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Last 30 days · {businessId ? "Selected business" : "All businesses"}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} data-testid="button-refresh-email-evidence">
          <RefreshCw className={`w-3 h-3 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh evidence
        </Button>
      </div>
      {isError ? (
        <p role="alert" className="text-sm text-destructive">Email evidence is unavailable. Refresh to try again; no estimated counts are shown.</p>
      ) : isPending ? (
        <p role="status" className="text-sm text-muted-foreground">Loading email evidence…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {metrics.map(([label, value, color]) => (
              <div key={label} className="text-center">
                <div className={`text-lg font-bold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            {data?.uniqueRecipients} unique recipients in email logs. Counts describe log records, not total CRM leads.
            Provider acceptance does not confirm delivery. Opens and clicks can come from scanners, so no engagement rates are inferred.
            HOT is the current reply-qualified count, not a 30-day email metric.
          </p>
          {businessId && <p className="text-xs text-muted-foreground mt-2">Business totals include only records linked to leads currently assigned to this business.</p>}
        </>
      )}
    </Card>
  );
}