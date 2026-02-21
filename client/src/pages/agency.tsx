import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Plus,
  Users,
  TrendingUp,
  DollarSign,
  Globe,
  Mail,
  User,
  Pencil,
  FileText,
  Pause,
  Play,
  Trash2,
  Download,
  X,
  Loader2,
  BarChart3,
  Target,
  Briefcase,
  Palette,
  Settings2,
} from "lucide-react";
import type { AgencyClient } from "@shared/schema";
import { useState } from "react";

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Real Estate",
  "E-commerce",
  "Education",
  "Legal",
  "Marketing",
  "Construction",
  "Hospitality",
  "Other",
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    churned: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <Badge className={styles[status] || styles.active} data-testid={`badge-status-${status}`}>
      {status.toUpperCase()}
    </Badge>
  );
}

type FormData = {
  name: string;
  domain: string;
  industry: string;
  contactName: string;
  contactEmail: string;
  brandColor: string;
  monthlyBudget: string;
  logo: string;
  notes: string;
};

const emptyForm: FormData = {
  name: "",
  domain: "",
  industry: "",
  contactName: "",
  contactEmail: "",
  brandColor: "#00e5a0",
  monthlyBudget: "",
  logo: "",
  notes: "",
};

export default function AgencyPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<AgencyClient | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [reportClient, setReportClient] = useState<AgencyClient | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<{
    total: number;
    active: number;
    totalLeads: number;
    monthlyRevenue: number;
  }>({
    queryKey: ["/api/agency/stats"],
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery<AgencyClient[]>({
    queryKey: ["/api/agency/clients"],
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("POST", "/api/agency/clients", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agency/stats"] });
      setDialogOpen(false);
      setFormData(emptyForm);
      toast({ title: "Client created", description: "New agency client added successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      apiRequest("PUT", `/api/agency/clients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agency/stats"] });
      setDialogOpen(false);
      setEditingClient(null);
      setFormData(emptyForm);
      toast({ title: "Client updated", description: "Client details saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PUT", `/api/agency/clients/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agency/stats"] });
      toast({ title: "Status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/agency/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agency/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agency/stats"] });
      toast({ title: "Client deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openAddDialog = () => {
    setEditingClient(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (client: AgencyClient) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      domain: client.domain || "",
      industry: client.industry || "",
      contactName: client.contactName || "",
      contactEmail: client.contactEmail || "",
      brandColor: client.brandColor || "#00e5a0",
      monthlyBudget: client.monthlyBudget?.toString() || "",
      logo: client.logo || "",
      notes: client.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Name required", description: "Please enter a client name.", variant: "destructive" });
      return;
    }
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-agency">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Agency OS</h1>
              <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">White-Label Client Management</p>
            </div>
          </div>
        </div>
        <Button onClick={openAddDialog} data-testid="button-add-client">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))
        ) : (
          <>
            <Card className="p-4" data-testid="card-stat-total-clients">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Total Clients</span>
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold mt-1" data-testid="text-stat-total-clients">{stats?.total || 0}</div>
            </Card>
            <Card className="p-4" data-testid="card-stat-active-clients">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Active Clients</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold mt-1 text-emerald-400" data-testid="text-stat-active-clients">{stats?.active || 0}</div>
            </Card>
            <Card className="p-4" data-testid="card-stat-total-leads">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Total Leads</span>
                <Target className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-bold mt-1 text-sky-400" data-testid="text-stat-total-leads">{stats?.totalLeads || 0}</div>
            </Card>
            <Card className="p-4" data-testid="card-stat-monthly-revenue">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold mt-1 text-amber-400" data-testid="text-stat-monthly-revenue">
                ${(stats?.monthlyRevenue || 0).toLocaleString()}
              </div>
            </Card>
          </>
        )}
      </div>

      {clientsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-6 w-40 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card className="p-12 text-center" data-testid="card-no-clients">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-semibold mb-1">No clients yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add your first white-label client to get started.</p>
          <Button onClick={openAddDialog} data-testid="button-add-first-client">
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Card key={client.id} className="p-5 space-y-3" data-testid={`card-client-${client.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: client.brandColor || "#00e5a0" }}
                    data-testid={`indicator-brand-color-${client.id}`}
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg truncate" data-testid={`text-client-name-${client.id}`}>
                      {client.name}
                    </h3>
                    {client.domain && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Globe className="w-3 h-3" />
                        <span data-testid={`text-client-domain-${client.id}`}>{client.domain}</span>
                      </div>
                    )}
                  </div>
                </div>
                <StatusBadge status={client.status} />
              </div>

              {client.industry && (
                <Badge variant="outline" className="text-xs" data-testid={`badge-industry-${client.id}`}>
                  <Briefcase className="w-3 h-3 mr-1" />
                  {client.industry}
                </Badge>
              )}

              {(client.contactName || client.contactEmail) && (
                <div className="space-y-1">
                  {client.contactName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-3.5 h-3.5" />
                      <span data-testid={`text-contact-name-${client.id}`}>{client.contactName}</span>
                    </div>
                  )}
                  {client.contactEmail && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      <span data-testid={`text-contact-email-${client.id}`}>{client.contactEmail}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                <div className="text-center">
                  <div className="text-sm font-bold" data-testid={`text-leads-${client.id}`}>{client.totalLeads || 0}</div>
                  <div className="text-xs text-muted-foreground">Leads</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold" data-testid={`text-deals-${client.id}`}>{client.totalDeals || 0}</div>
                  <div className="text-xs text-muted-foreground">Deals</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold" data-testid={`text-budget-${client.id}`}>
                    ${(client.monthlyBudget || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Budget</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/50 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDialog(client)}
                  data-testid={`button-edit-client-${client.id}`}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReportClient(client)}
                  data-testid={`button-view-report-${client.id}`}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Report
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    statusMutation.mutate({
                      id: client.id,
                      status: client.status === "active" ? "paused" : "active",
                    })
                  }
                  disabled={statusMutation.isPending}
                  data-testid={`button-toggle-status-${client.id}`}
                >
                  {client.status === "active" ? (
                    <><Pause className="w-3 h-3 mr-1" />Pause</>
                  ) : (
                    <><Play className="w-3 h-3 mr-1" />Activate</>
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(client.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-client-${client.id}`}
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-6 space-y-4" data-testid="card-white-label-settings">
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">White-Label Settings</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <Label className="font-medium">Custom Domain</Label>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-custom-domain-info">
              Point your CNAME record to <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">app.argiflow.ai</span> to use your own domain for client-facing reports and dashboards.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <Label className="font-medium">Brand Color for Reports</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                defaultValue="#00e5a0"
                className="w-9 h-9 rounded-md border border-border cursor-pointer"
                data-testid="input-report-brand-color"
              />
              <span className="text-sm text-muted-foreground">Used as default accent in generated reports</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <Label className="font-medium">Agency Name</Label>
            </div>
            <Input
              placeholder="Your Agency Name"
              defaultValue=""
              data-testid="input-agency-name"
            />
            <p className="text-xs text-muted-foreground">Displayed on client-facing materials</p>
          </div>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-client-form">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingClient ? "Edit Client" : "Add New Client"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Client company name"
                data-testid="input-client-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="client.com"
                data-testid="input-client-domain"
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Select
                value={formData.industry}
                onValueChange={(val) => setFormData({ ...formData, industry: val })}
              >
                <SelectTrigger data-testid="select-industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="John Doe"
                  data-testid="input-contact-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="john@client.com"
                  data-testid="input-contact-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Brand Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.brandColor}
                  onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                  className="w-9 h-9 rounded-md border border-border cursor-pointer"
                  data-testid="input-brand-color"
                />
                <Input
                  value={formData.brandColor}
                  onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                  placeholder="#00e5a0"
                  className="flex-1"
                  data-testid="input-brand-color-hex"
                />
                <div
                  className="w-9 h-9 rounded-md border border-border"
                  style={{ backgroundColor: formData.brandColor }}
                  data-testid="preview-brand-color"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Monthly Budget ($)</Label>
              <Input
                type="number"
                value={formData.monthlyBudget}
                onChange={(e) => setFormData({ ...formData, monthlyBudget: e.target.value })}
                placeholder="0"
                data-testid="input-monthly-budget"
              />
            </div>
            <div className="space-y-2">
              <Label>Logo URL (optional)</Label>
              <Input
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                placeholder="https://..."
                data-testid="input-logo-url"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes about this client..."
                rows={3}
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-form">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving} data-testid="button-save-client">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingClient ? "Save Changes" : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reportClient} onOpenChange={(open) => !open && setReportClient(null)}>
        <DialogContent className="max-w-md" data-testid="dialog-client-report">
          {reportClient && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2" data-testid="text-report-title">
                  <BarChart3 className="w-5 h-5" style={{ color: reportClient.brandColor || "#00e5a0" }} />
                  {reportClient.name} — Report
                </DialogTitle>
              </DialogHeader>
              <div
                className="rounded-md p-4 space-y-4"
                style={{ borderLeft: `4px solid ${reportClient.brandColor || "#00e5a0"}` }}
              >
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: reportClient.brandColor || "#00e5a0" }} data-testid="text-report-leads">
                      {reportClient.totalLeads || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Leads Generated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: reportClient.brandColor || "#00e5a0" }} data-testid="text-report-deals">
                      {reportClient.totalDeals || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Deals Closed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: reportClient.brandColor || "#00e5a0" }} data-testid="text-report-revenue">
                      ${(reportClient.monthlyBudget || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Status:</span>{" "}
                  <span className="capitalize">{reportClient.status}</span>
                  {reportClient.industry && (
                    <> | <span className="font-medium">Industry:</span> {reportClient.industry}</>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast({ title: "Coming soon", description: "PDF export will be available in a future update." })
                  }
                  data-testid="button-download-pdf"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download as PDF
                </Button>
                <Button variant="outline" onClick={() => setReportClient(null)} data-testid="button-close-report">
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
