import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Webhook,
  Plus,
  ChevronDown,
  ChevronRight,
  Send,
  Trash2,
  Pencil,
  Play,
  Pause,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Globe,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Key,
  Link2,
} from "lucide-react";
import type { WebhookEndpoint, WebhookDelivery } from "@shared/schema";
import { useState } from "react";

const AVAILABLE_EVENTS = [
  { group: "Leads", events: ["lead.created", "lead.updated", "lead.scored"] },
  { group: "Sequences", events: ["sequence.enrolled", "sequence.completed", "sequence.replied"] },
  { group: "Appointments", events: ["appointment.booked", "appointment.cancelled"] },
  { group: "Deals", events: ["deal.created", "deal.won", "deal.lost"] },
];

const ALL_EVENTS = AVAILABLE_EVENTS.flatMap((g) => g.events);

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" data-testid="badge-status-active">
        Active
      </Badge>
    );
  }
  if (status === "paused") {
    return (
      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20" data-testid="badge-status-paused">
        Paused
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20" data-testid="badge-status-disabled">
      Disabled
    </Badge>
  );
}

function DeliveryStatusBadge({ status }: { status: string }) {
  if (status === "delivered") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Delivered
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">
      <Clock className="w-3 h-3 mr-1" />
      Pending
    </Badge>
  );
}

function WebhookDialog({
  open,
  onOpenChange,
  endpoint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint?: WebhookEndpoint | null;
}) {
  const { toast } = useToast();
  const isEditing = !!endpoint;

  const [name, setName] = useState(endpoint?.name || "");
  const [url, setUrl] = useState(endpoint?.url || "");
  const [secret, setSecret] = useState(endpoint?.secret || "");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    endpoint?.events ? endpoint.events.split(",") : []
  );
  const [status, setStatus] = useState(endpoint?.status || "active");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/webhooks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks/stats"] });
      toast({ title: "Webhook created", description: "Your webhook endpoint has been created." });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/webhooks/${endpoint!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks/stats"] });
      toast({ title: "Webhook updated", description: "Your webhook endpoint has been updated." });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const generateSecret = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    setSecret(Array.from(array, (b) => b.toString(16).padStart(2, "0")).join(""));
  };

  const handleSubmit = () => {
    if (!name.trim() || !url.trim() || selectedEvents.length === 0) {
      toast({ title: "Validation Error", description: "Name, URL, and at least one event are required.", variant: "destructive" });
      return;
    }
    const payload = { name: name.trim(), url: url.trim(), secret, events: selectedEvents.join(","), status };
    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-webhook">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">
            {isEditing ? "Edit Webhook" : "Create Webhook"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="webhook-name">Name</Label>
            <Input
              id="webhook-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Zapier Integration"
              data-testid="input-webhook-name"
            />
          </div>

          <div>
            <Label htmlFor="webhook-url">Endpoint URL</Label>
            <Input
              id="webhook-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/..."
              data-testid="input-webhook-url"
            />
          </div>

          <div>
            <Label htmlFor="webhook-secret">Signing Secret</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-secret"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Auto-generated if empty"
                className="flex-1 font-mono text-xs"
                data-testid="input-webhook-secret"
              />
              <Button variant="outline" onClick={generateSecret} data-testid="button-generate-secret">
                <Key className="w-4 h-4 mr-1" />
                Generate
              </Button>
            </div>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-webhook-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Events</Label>
            <div className="mt-2 space-y-3">
              {AVAILABLE_EVENTS.map((group) => (
                <div key={group.group}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {group.group}
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {group.events.map((event) => (
                      <label
                        key={event}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                        data-testid={`checkbox-event-${event}`}
                      >
                        <Checkbox
                          checked={selectedEvents.includes(event)}
                          onCheckedChange={() => toggleEvent(event)}
                        />
                        <code className="text-xs">{event}</code>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-webhook">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-webhook">
            {isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeliveryLog({ endpointId }: { endpointId: string }) {
  const [expanded, setExpanded] = useState(false);

  const { data: deliveries = [], isLoading } = useQuery<WebhookDelivery[]>({
    queryKey: ["/api/webhooks", endpointId, "deliveries"],
    queryFn: async () => {
      const res = await fetch(`/api/webhooks/${endpointId}/deliveries`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: expanded,
  });

  return (
    <div className="border-t">
      <button
        className="flex items-center gap-2 w-full px-4 py-2 text-xs text-muted-foreground hover-elevate"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-toggle-deliveries-${endpointId}`}
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Delivery Log
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2" data-testid={`deliveries-list-${endpointId}`}>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading deliveries...
            </div>
          )}
          {!isLoading && deliveries.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No deliveries yet.</p>
          )}
          {deliveries.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-muted/30 border text-xs flex-wrap"
              data-testid={`delivery-row-${d.id}`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-xs">{d.event}</code>
                <DeliveryStatusBadge status={d.status} />
                {d.responseStatus && (
                  <span className="text-muted-foreground">HTTP {d.responseStatus}</span>
                )}
              </div>
              <span className="text-muted-foreground">
                {d.createdAt ? new Date(d.createdAt).toLocaleString() : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: WebhookEndpoint }) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/webhooks/${endpoint.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks/stats"] });
      toast({ title: "Deleted", description: "Webhook endpoint deleted." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/webhooks/${endpoint.id}/test`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks", endpoint.id, "deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks/stats"] });
      toast({
        title: data.status === "delivered" ? "Test Delivered" : "Test Failed",
        description: data.status === "delivered" ? "Webhook test was delivered successfully." : "Webhook delivery failed. Check the delivery log.",
        variant: data.status === "delivered" ? "default" : "destructive",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const newStatus = endpoint.status === "active" ? "paused" : "active";
      const res = await apiRequest("PUT", `/api/webhooks/${endpoint.id}`, { status: newStatus });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks/stats"] });
      toast({ title: "Status Updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const copySecret = () => {
    if (endpoint.secret) {
      navigator.clipboard.writeText(endpoint.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const events = endpoint.events ? endpoint.events.split(",") : [];
  const truncatedUrl = endpoint.url.length > 50 ? endpoint.url.slice(0, 50) + "..." : endpoint.url;

  return (
    <>
      <Card className="overflow-visible" data-testid={`card-endpoint-${endpoint.id}`}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Webhook className="w-4 h-4 text-primary shrink-0" />
                <h3 className="font-medium text-sm" data-testid={`text-endpoint-name-${endpoint.id}`}>
                  {endpoint.name}
                </h3>
                <StatusBadge status={endpoint.status} />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <Link2 className="w-3 h-3 shrink-0" />
                <span className="font-mono truncate" data-testid={`text-endpoint-url-${endpoint.id}`} title={endpoint.url}>
                  {truncatedUrl}
                </span>
              </div>

              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                {events.map((event) => (
                  <Badge
                    key={event}
                    variant="outline"
                    className="text-xs bg-primary/5 border-primary/20 text-primary"
                    data-testid={`badge-event-${endpoint.id}-${event}`}
                  >
                    {event}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1" data-testid={`text-deliveries-${endpoint.id}`}>
                  <Send className="w-3 h-3" />
                  {endpoint.totalDeliveries || 0} deliveries
                </span>
                <span className="flex items-center gap-1" data-testid={`text-failures-${endpoint.id}`}>
                  <AlertCircle className="w-3 h-3" />
                  {endpoint.totalFailures || 0} failures
                </span>
                <span className="flex items-center gap-1" data-testid={`text-last-triggered-${endpoint.id}`}>
                  <Clock className="w-3 h-3" />
                  {endpoint.lastTriggeredAt
                    ? new Date(endpoint.lastTriggeredAt).toLocaleString()
                    : "Never triggered"}
                </span>
                {endpoint.secret && (
                  <button
                    className="flex items-center gap-1 hover-elevate rounded px-1"
                    onClick={copySecret}
                    data-testid={`button-copy-secret-${endpoint.id}`}
                  >
                    {copiedSecret ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copiedSecret ? "Copied" : "Secret"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setEditOpen(true)}
                data-testid={`button-edit-${endpoint.id}`}
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
                data-testid={`button-test-${endpoint.id}`}
                title="Test"
              >
                {testMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => toggleMutation.mutate()}
                disabled={toggleMutation.isPending}
                data-testid={`button-toggle-${endpoint.id}`}
                title={endpoint.status === "active" ? "Pause" : "Resume"}
              >
                {endpoint.status === "active" ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                data-testid={`button-delete-${endpoint.id}`}
                title="Delete"
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>

        <DeliveryLog endpointId={endpoint.id} />
      </Card>

      {editOpen && (
        <WebhookDialog open={editOpen} onOpenChange={setEditOpen} endpoint={endpoint} />
      )}
    </>
  );
}

export default function WebhooksPage() {
  usePageTitle("Webhooks & Integrations");
  const [createOpen, setCreateOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);

  const { data: endpoints = [], isLoading } = useQuery<WebhookEndpoint[]>({
    queryKey: ["/api/webhooks"],
  });

  const { data: stats } = useQuery<{
    totalEndpoints: number;
    activeEndpoints: number;
    totalDeliveries: number;
  }>({
    queryKey: ["/api/webhooks/stats"],
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto" data-testid="page-webhooks">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Webhook className="w-6 h-6 text-primary" />
            Webhooks & Integrations
          </h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">
            Connect ArgiFlow to Zapier, Make, or any external service
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-create-webhook">
          <Plus className="w-4 h-4 mr-1" />
          Create Webhook
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4" data-testid="card-stat-total">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-stat-total">
                {stats?.totalEndpoints ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Total Endpoints</p>
            </div>
          </div>
        </Card>

        <Card className="p-4" data-testid="card-stat-active">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-stat-active">
                {stats?.activeEndpoints ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>

        <Card className="p-4" data-testid="card-stat-deliveries">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-sky-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-stat-deliveries">
                {stats?.totalDeliveries ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Total Deliveries</p>
            </div>
          </div>
        </Card>
      </div>

      <Collapsible open={eventsOpen} onOpenChange={setEventsOpen}>
        <Card className="overflow-visible">
          <CollapsibleTrigger className="flex items-center justify-between gap-2 w-full p-4 hover-elevate rounded-md" data-testid="button-toggle-events-ref">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Available Events Reference</span>
            </div>
            {eventsOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {AVAILABLE_EVENTS.map((group) => (
                <div key={group.group}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {group.group}
                  </p>
                  <div className="space-y-1">
                    {group.events.map((event) => (
                      <div key={event} className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <code className="text-xs" data-testid={`text-event-ref-${event}`}>{event}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Endpoints
        </h2>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-md" />
            ))}
          </div>
        )}

        {!isLoading && endpoints.length === 0 && (
          <Card className="p-8 text-center" data-testid="empty-state">
            <Webhook className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-3">
              No webhook endpoints configured yet.
            </p>
            <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-webhook">
              <Plus className="w-4 h-4 mr-1" />
              Create Your First Webhook
            </Button>
          </Card>
        )}

        {endpoints.map((endpoint) => (
          <EndpointCard key={endpoint.id} endpoint={endpoint} />
        ))}
      </div>

      {createOpen && (
        <WebhookDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </div>
  );
}
