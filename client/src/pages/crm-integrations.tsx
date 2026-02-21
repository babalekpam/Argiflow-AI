import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Link2,
  Unlink,
  RefreshCw,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  CircleDot,
} from "lucide-react";
import { SiHubspot, SiSalesforce } from "react-icons/si";
import type { CrmConnection } from "@shared/schema";

const CRM_PROVIDERS = [
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Marketing, sales, and service software that helps your business grow.",
    icon: SiHubspot,
    color: "#FF7A59",
    bgColor: "bg-[#FF7A59]/10",
    borderColor: "border-[#FF7A59]/20",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "The world's #1 CRM platform for sales, service, and marketing.",
    icon: SiSalesforce,
    color: "#00A1E0",
    bgColor: "bg-[#00A1E0]/10",
    borderColor: "border-[#00A1E0]/20",
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Sales CRM and pipeline management software for growing teams.",
    icon: CircleDot,
    color: "#017737",
    bgColor: "bg-[#017737]/10",
    borderColor: "border-[#017737]/20",
  },
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; label: string }> = {
    disconnected: { className: "bg-slate-500/10 text-slate-400 border-slate-500/20", label: "Disconnected" },
    connected: { className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Connected" },
    syncing: { className: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Syncing" },
    error: { className: "bg-red-500/10 text-red-400 border-red-500/20", label: "Error" },
  };
  const c = config[status] || config.disconnected;
  return (
    <Badge className={c.className} data-testid={`badge-status-${status}`}>
      {status === "syncing" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
      {status === "connected" && <CheckCircle2 className="w-3 h-3 mr-1" />}
      {status === "error" && <AlertCircle className="w-3 h-3 mr-1" />}
      {c.label}
    </Badge>
  );
}

function SyncDirectionLabel({ direction }: { direction: string }) {
  const config: Record<string, { icon: any; label: string }> = {
    to_crm: { icon: ArrowRight, label: "To CRM" },
    from_crm: { icon: ArrowLeft, label: "From CRM" },
    bidirectional: { icon: ArrowLeftRight, label: "Bidirectional" },
  };
  const c = config[direction] || config.bidirectional;
  const Icon = c.icon;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

export default function CrmIntegrationsPage() {
  const { toast } = useToast();
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [instanceUrl, setInstanceUrl] = useState("");
  const [syncDirection, setSyncDirection] = useState("bidirectional");
  const [fieldMapping, setFieldMapping] = useState('{\n  "name": "contact_name",\n  "email": "contact_email",\n  "phone": "contact_phone",\n  "company": "company_name"\n}');

  const { data: connections = [], isLoading } = useQuery<CrmConnection[]>({
    queryKey: ["/api/crm/connections"],
  });

  const connectMutation = useMutation({
    mutationFn: async (data: { provider: string; apiKey?: string; instanceUrl?: string; syncDirection: string; fieldMapping?: string }) => {
      const res = await apiRequest("POST", "/api/crm/connections", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/connections"] });
      toast({ title: "CRM Connected", description: "Your CRM connection has been established." });
      resetDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Connection Failed", description: error.message, variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/crm/connections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/connections"] });
      toast({ title: "CRM Disconnected", description: "Your CRM connection has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Disconnect Failed", description: error.message, variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/crm/connections/${id}/sync`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/connections"] });
      toast({ title: "Sync Complete", description: "CRM data has been synchronized." });
    },
    onError: (error: Error) => {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; syncDirection?: string; fieldMapping?: string }) => {
      const res = await apiRequest("PUT", `/api/crm/connections/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/connections"] });
      toast({ title: "Connection Updated", description: "CRM settings have been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  function resetDialog() {
    setConnectDialogOpen(false);
    setSelectedProvider(null);
    setApiKey("");
    setInstanceUrl("");
    setSyncDirection("bidirectional");
    setFieldMapping('{\n  "name": "contact_name",\n  "email": "contact_email",\n  "phone": "contact_phone",\n  "company": "company_name"\n}');
  }

  function getConnectionForProvider(providerId: string): CrmConnection | undefined {
    return connections.find((c) => c.provider === providerId);
  }

  function handleConnect() {
    if (!selectedProvider) return;
    connectMutation.mutate({
      provider: selectedProvider,
      apiKey: apiKey || undefined,
      instanceUrl: instanceUrl || undefined,
      syncDirection,
      fieldMapping: fieldMapping || undefined,
    });
  }

  const providerInfo = selectedProvider
    ? CRM_PROVIDERS.find((p) => p.id === selectedProvider)
    : null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8" data-testid="page-crm-integrations">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">CRM Integrations</h1>
        <p className="text-muted-foreground mt-1" data-testid="text-page-subtitle">
          Connect your existing CRM tools to sync leads, contacts, and deals automatically.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-10 w-10 rounded-md mb-4" />
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-9 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CRM_PROVIDERS.map((provider) => {
            const connection = getConnectionForProvider(provider.id);
            const isConnected = connection?.status === "connected" || connection?.status === "syncing";
            const Icon = provider.icon;

            return (
              <Card
                key={provider.id}
                className="p-6 flex flex-col"
                data-testid={`card-crm-${provider.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
                  <div className={`w-12 h-12 rounded-md flex items-center justify-center ${provider.bgColor} border ${provider.borderColor}`}>
                    <Icon style={{ color: provider.color }} className="w-6 h-6" />
                  </div>
                  {connection && <StatusBadge status={connection.status} />}
                  {!connection && <StatusBadge status="disconnected" />}
                </div>

                <h3 className="text-lg font-semibold mb-1" data-testid={`text-crm-name-${provider.id}`}>
                  {provider.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 flex-1" data-testid={`text-crm-desc-${provider.id}`}>
                  {provider.description}
                </p>

                {isConnected && connection && (
                  <div className="space-y-3 mb-4 p-3 rounded-md bg-muted/30 border">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Sync Direction</span>
                      <SyncDirectionLabel direction={connection.syncDirection} />
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Total Synced</span>
                      <span className="text-xs font-medium" data-testid={`text-total-synced-${provider.id}`}>
                        {connection.totalSynced || 0} records
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Last Sync</span>
                      <span className="text-xs font-medium flex items-center gap-1" data-testid={`text-last-sync-${provider.id}`}>
                        <Clock className="w-3 h-3" />
                        {connection.lastSyncAt
                          ? new Date(connection.lastSyncAt).toLocaleString()
                          : "Never"}
                      </span>
                    </div>
                    {connection.lastSyncStatus && (
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Last Status</span>
                        <Badge
                          className={
                            connection.lastSyncStatus === "success"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }
                        >
                          {connection.lastSyncStatus}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {isConnected && connection ? (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => syncMutation.mutate(connection.id)}
                        disabled={syncMutation.isPending}
                        data-testid={`button-sync-${provider.id}`}
                      >
                        <RefreshCw className={`w-4 h-4 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                        Sync Now
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnectMutation.mutate(connection.id)}
                        disabled={disconnectMutation.isPending}
                        data-testid={`button-disconnect-${provider.id}`}
                      >
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedProvider(provider.id);
                        setConnectDialogOpen(true);
                      }}
                      data-testid={`button-connect-${provider.id}`}
                    >
                      <Link2 className="w-4 h-4 mr-1.5" />
                      Connect
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {connections.length > 0 && (
        <div data-testid="section-connections-table">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Connected CRMs
          </h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sync Direction</TableHead>
                  <TableHead>Total Synced</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((conn) => {
                  const provider = CRM_PROVIDERS.find((p) => p.id === conn.provider);
                  const Icon = provider?.icon || SiHubspot;
                  return (
                    <TableRow key={conn.id} data-testid={`row-connection-${conn.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon style={{ color: provider?.color || "#888" }} className="w-4 h-4" />
                          <span className="font-medium">{provider?.name || conn.provider}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={conn.status} />
                      </TableCell>
                      <TableCell>
                        <SyncDirectionLabel direction={conn.syncDirection} />
                      </TableCell>
                      <TableCell data-testid={`text-table-synced-${conn.id}`}>
                        {conn.totalSynced || 0}
                      </TableCell>
                      <TableCell data-testid={`text-table-last-sync-${conn.id}`}>
                        {conn.lastSyncAt
                          ? new Date(conn.lastSyncAt).toLocaleString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {conn.status === "connected" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => syncMutation.mutate(conn.id)}
                              disabled={syncMutation.isPending}
                              data-testid={`button-table-sync-${conn.id}`}
                            >
                              <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => disconnectMutation.mutate(conn.id)}
                            disabled={disconnectMutation.isPending}
                            data-testid={`button-table-disconnect-${conn.id}`}
                          >
                            <Unlink className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      <Dialog open={connectDialogOpen} onOpenChange={(open) => { if (!open) resetDialog(); }}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-connect-crm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {providerInfo && (
                <providerInfo.icon style={{ color: providerInfo.color }} className="w-5 h-5" />
              )}
              Connect {providerInfo?.name || "CRM"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                data-testid="input-api-key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instanceUrl">Instance URL</Label>
              <Input
                id="instanceUrl"
                placeholder="https://your-instance.crm.com"
                value={instanceUrl}
                onChange={(e) => setInstanceUrl(e.target.value)}
                data-testid="input-instance-url"
              />
            </div>

            <div className="space-y-2">
              <Label>Sync Direction</Label>
              <Select value={syncDirection} onValueChange={setSyncDirection}>
                <SelectTrigger data-testid="select-sync-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to_crm">To CRM</SelectItem>
                  <SelectItem value="from_crm">From CRM</SelectItem>
                  <SelectItem value="bidirectional">Bidirectional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fieldMapping">Field Mapping (JSON)</Label>
              <Textarea
                id="fieldMapping"
                value={fieldMapping}
                onChange={(e) => setFieldMapping(e.target.value)}
                className="font-mono text-sm min-h-[120px]"
                data-testid="textarea-field-mapping"
              />
              <p className="text-xs text-muted-foreground">
                Map your ArgiFlow fields to CRM fields. Keys are local fields, values are CRM fields.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog} data-testid="button-cancel-connect">
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={connectMutation.isPending}
              data-testid="button-save-connect"
            >
              {connectMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Save & Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
