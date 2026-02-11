import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, LogOut, Users, CalendarDays, Bot, DollarSign, BarChart3,
  CreditCard, Plus, Pencil, Trash2, Building2, Mail, Globe, Eye,
  UserCheck, AlertCircle, Settings, CheckCircle2, XCircle,
} from "lucide-react";
import type { Lead, Appointment, AiAgent, Subscription } from "@shared/schema";

interface AdminStats {
  totalUsers: number;
  totalLeads: number;
  totalAppointments: number;
  totalAgents: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  revenue: number;
}

interface ClientData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  industry: string | null;
  website: string | null;
  createdAt: string | null;
  subscription: Subscription | null;
  leadsCount: number;
  agentsCount: number;
}

interface SubWithUser extends Subscription {
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
  } | null;
}

function useAdmin() {
  const { data, isLoading } = useQuery<{ id: string; email: string; name: string } | null>({
    queryKey: ["/api/admin/me"],
    queryFn: async () => {
      const res = await fetch("/api/admin/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
  return { admin: data, isLoading, isAuthenticated: !!data };
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: any; accent?: boolean }) {
  return (
    <Card className={`p-5 ${accent ? "border-primary/40" : ""}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${accent ? "bg-primary/20" : "bg-primary/10"}`}>
          <Icon className={`w-5 h-5 ${accent ? "text-primary" : "text-primary"}`} />
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    contacted: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    qualified: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    converted: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    lost: "bg-red-500/10 text-red-400 border-red-500/20",
    scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    paused: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    trial: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    expired: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    past_due: "bg-red-500/10 text-red-400 border-red-500/20",
    warm: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    hot: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <Badge className={colors[status] || ""} data-testid={`badge-status-${status}`}>{status}</Badge>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    starter: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    pro: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    enterprise: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return (
    <Badge className={colors[plan] || ""} data-testid={`badge-plan-${plan}`}>{plan}</Badge>
  );
}

function CreateSubscriptionDialog({ clients, onCreated }: { clients: ClientData[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [plan, setPlan] = useState("starter");
  const [status, setStatus] = useState("trial");
  const [venmoHandle, setVenmoHandle] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      const amount = plan === "starter" ? 297 : plan === "pro" ? 597 : 1497;
      await apiRequest("POST", "/api/admin/subscriptions", {
        userId, plan, status, amount,
        paymentMethod: "venmo",
        venmoHandle: venmoHandle || null,
        notes: notes || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Subscription created" });
      onCreated();
      setOpen(false);
      setUserId("");
      setPlan("starter");
      setStatus("trial");
      setVenmoHandle("");
      setNotes("");
    },
    onError: () => {
      toast({ title: "Failed to create subscription", variant: "destructive" });
    },
  });

  const clientsWithoutSub = clients.filter(c => !c.subscription);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-subscription">
          <Plus className="w-4 h-4 mr-2" />
          Add Subscription
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Subscription</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Client</label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger data-testid="select-sub-client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clientsWithoutSub.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName || ""} {c.lastName || ""} ({c.email})
                  </SelectItem>
                ))}
                {clientsWithoutSub.length === 0 && (
                  <SelectItem value="__none" disabled>All clients have subscriptions</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Plan</label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger data-testid="select-sub-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter ($297/mo)</SelectItem>
                <SelectItem value="pro">Pro ($597/mo)</SelectItem>
                <SelectItem value="enterprise">Enterprise ($1,497/mo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-sub-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial (14-day)</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Venmo Handle</label>
            <Input
              placeholder="@handle"
              value={venmoHandle}
              onChange={e => setVenmoHandle(e.target.value)}
              data-testid="input-sub-venmo"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Notes</label>
            <Textarea
              placeholder="Internal notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="resize-none"
              data-testid="input-sub-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!userId || createMutation.isPending}
            data-testid="button-confirm-create-sub"
          >
            {createMutation.isPending ? "Creating..." : "Create Subscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditSubscriptionDialog({ sub, onUpdated }: { sub: SubWithUser; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(sub.plan);
  const [status, setStatus] = useState(sub.status);
  const [venmoHandle, setVenmoHandle] = useState(sub.venmoHandle || "");
  const [notes, setNotes] = useState(sub.notes || "");
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async () => {
      const amount = plan === "starter" ? 297 : plan === "pro" ? 597 : 1497;
      await apiRequest("PATCH", `/api/admin/subscriptions/${sub.id}`, {
        plan, status, amount,
        venmoHandle: venmoHandle || null,
        notes: notes || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Subscription updated" });
      onUpdated();
      setOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to update subscription", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" data-testid={`button-edit-sub-${sub.id}`}>
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Client: {sub.user?.firstName} {sub.user?.lastName} ({sub.user?.email})
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Plan</label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter ($297/mo)</SelectItem>
                <SelectItem value="pro">Pro ($597/mo)</SelectItem>
                <SelectItem value="enterprise">Enterprise ($1,497/mo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Venmo Handle</label>
            <Input value={venmoHandle} onChange={e => setVenmoHandle(e.target.value)} placeholder="@handle" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Notes</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="resize-none" placeholder="Internal notes..." />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDashboard() {
  usePageTitle("Admin Dashboard");
  const { admin, isLoading, isAuthenticated } = useAdmin();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/admin/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
      setLocation("/admin");
    },
  });

  const switchToUserMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/switch-to-user", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Cannot switch",
        description: error?.message || "No user account found.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/admin");
    }
  }, [isLoading, isAuthenticated]);

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
  });

  const { data: clients } = useQuery<ClientData[]>({
    queryKey: ["/api/admin/clients"],
    enabled: isAuthenticated,
  });

  const { data: subscriptionsList } = useQuery<SubWithUser[]>({
    queryKey: ["/api/admin/subscriptions"],
    enabled: isAuthenticated,
  });

  const { data: leads } = useQuery<Lead[]>({
    queryKey: ["/api/admin/leads"],
    enabled: isAuthenticated,
  });

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/admin/appointments"],
    enabled: isAuthenticated,
  });

  const { data: agents } = useQuery<AiAgent[]>({
    queryKey: ["/api/admin/agents"],
    enabled: isAuthenticated,
  });

  interface PlatformConfig {
    sendgridApiKey: boolean;
    twilioAccountSid: boolean;
    twilioAuthToken: boolean;
    twilioPhoneNumber: boolean;
    anthropicApiKey: boolean;
    sessionSecret: boolean;
    adminPassword: boolean;
    platformSenderEmail: string;
  }

  const { data: platformConfig } = useQuery<PlatformConfig>({
    queryKey: ["/api/admin/platform-config"],
    enabled: isAuthenticated,
  });

  const deleteSubMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/subscriptions/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Subscription deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-primary/30 bg-primary/5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold" data-testid="text-admin-header">ARGILETTE</h1>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Platform Admin</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{admin?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => switchToUserMutation.mutate()}
              disabled={switchToUserMutation.isPending}
              data-testid="button-go-to-dashboard"
            >
              <Eye className="w-4 h-4 mr-2" />
              {switchToUserMutation.isPending ? "Switching..." : "My Account"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-admin-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Clients" value={stats?.totalUsers || 0} icon={Users} />
          <StatCard label="Active Subs" value={stats?.activeSubscriptions || 0} icon={UserCheck} accent />
          <StatCard label="MRR" value={`$${(stats?.monthlyRevenue || 0).toLocaleString()}`} icon={DollarSign} accent />
          <StatCard label="Total Leads" value={stats?.totalLeads || 0} icon={BarChart3} />
          <StatCard label="Appointments" value={stats?.totalAppointments || 0} icon={CalendarDays} />
          <StatCard label="AI Agents" value={stats?.totalAgents || 0} icon={Bot} />
        </div>

        <Tabs defaultValue="clients">
          <TabsList data-testid="tabs-admin">
            <TabsTrigger value="clients" data-testid="tab-admin-clients">
              Clients ({clients?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="subscriptions" data-testid="tab-admin-subscriptions">
              Subscriptions ({subscriptionsList?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="leads" data-testid="tab-admin-leads">
              Leads ({leads?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="appointments" data-testid="tab-admin-appointments">
              Appointments ({appointments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="agents" data-testid="tab-admin-agents">
              Agents ({agents?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="platform" data-testid="tab-admin-platform">
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Platform
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients">
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Leads</TableHead>
                      <TableHead>Agents</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(clients || []).map((client) => (
                      <TableRow key={client.id} data-testid={`admin-client-row-${client.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{client.firstName} {client.lastName}</p>
                            <p className="text-xs text-muted-foreground">{client.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {client.companyName ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{client.companyName}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{client.industry || "-"}</TableCell>
                        <TableCell>
                          {client.subscription ? (
                            <PlanBadge plan={client.subscription.plan} />
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">No plan</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {client.subscription ? (
                            <StatusBadge status={client.subscription.status} />
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{client.leadsCount}</TableCell>
                        <TableCell className="text-sm">{client.agentsCount}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!clients || clients.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No clients yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Subscription Management</span>
                </div>
                <Badge variant="outline">
                  {subscriptionsList?.filter(s => s.status === "active").length || 0} active
                </Badge>
                <Badge variant="outline">
                  {subscriptionsList?.filter(s => s.status === "trial").length || 0} trials
                </Badge>
              </div>
              <CreateSubscriptionDialog clients={clients || []} onCreated={refreshAll} />
            </div>
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Period End</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(subscriptionsList || []).map((sub) => (
                      <TableRow key={sub.id} data-testid={`admin-sub-row-${sub.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{sub.user?.firstName} {sub.user?.lastName}</p>
                            <p className="text-xs text-muted-foreground">{sub.user?.email}</p>
                            {sub.user?.companyName && (
                              <p className="text-xs text-muted-foreground">{sub.user.companyName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell><PlanBadge plan={sub.plan} /></TableCell>
                        <TableCell><StatusBadge status={sub.status} /></TableCell>
                        <TableCell className="text-sm font-medium">${(sub.amount || 0).toLocaleString()}/mo</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="capitalize">{sub.paymentMethod || "venmo"}</span>
                            {sub.venmoHandle && (
                              <p className="text-xs text-muted-foreground">{sub.venmoHandle}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {sub.notes || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <EditSubscriptionDialog sub={sub} onUpdated={refreshAll} />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("Delete this subscription?")) {
                                  deleteSubMutation.mutate(sub.id);
                                }
                              }}
                              data-testid={`button-delete-sub-${sub.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!subscriptionsList || subscriptionsList.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <AlertCircle className="w-6 h-6 text-muted-foreground/50" />
                            <span>No subscriptions yet</span>
                            <span className="text-xs">Add a subscription to start tracking payments</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="leads">
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Engagement</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(leads || []).map((lead) => (
                      <TableRow key={lead.id} data-testid={`admin-lead-row-${lead.id}`}>
                        <TableCell className="font-medium text-sm">{lead.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{lead.email}</TableCell>
                        <TableCell className="text-sm">{lead.source}</TableCell>
                        <TableCell><StatusBadge status={lead.status} /></TableCell>
                        <TableCell className="text-sm">{lead.score}/100</TableCell>
                        <TableCell>
                          {lead.engagementLevel && lead.engagementLevel !== "none" ? (
                            <StatusBadge status={lead.engagementLevel} />
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono max-w-[120px] truncate">{lead.userId}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!leads || leads.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No leads found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="appointments">
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>User ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(appointments || []).map((apt) => (
                      <TableRow key={apt.id} data-testid={`admin-apt-row-${apt.id}`}>
                        <TableCell className="font-medium text-sm">{apt.leadName}</TableCell>
                        <TableCell className="text-sm">{apt.type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(apt.date).toLocaleString()}
                        </TableCell>
                        <TableCell><StatusBadge status={apt.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono max-w-[120px] truncate">{apt.userId}</TableCell>
                      </TableRow>
                    ))}
                    {(!appointments || appointments.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No appointments found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="agents">
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tasks Done</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>User ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(agents || []).map((agent) => (
                      <TableRow key={agent.id} data-testid={`admin-agent-row-${agent.id}`}>
                        <TableCell className="font-medium text-sm">{agent.name}</TableCell>
                        <TableCell className="text-sm">{agent.type}</TableCell>
                        <TableCell><StatusBadge status={agent.status} /></TableCell>
                        <TableCell className="text-sm">{agent.tasksCompleted}</TableCell>
                        <TableCell className="text-sm">{agent.successRate}%</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono max-w-[120px] truncate">{agent.userId}</TableCell>
                      </TableRow>
                    ))}
                    {(!agents || agents.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No agents found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="platform">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Email Service (SendGrid)
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">API Key</span>
                    <div className="flex items-center gap-1.5" data-testid="status-sendgrid-key">
                      {platformConfig?.sendgridApiKey ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm text-emerald-500">Configured</span></>
                      ) : (
                        <><XCircle className="w-4 h-4 text-red-500" /><span className="text-sm text-red-500">Missing</span></>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">Platform Sender</span>
                    <span className="text-sm font-mono" data-testid="text-platform-sender">{platformConfig?.platformSenderEmail || "N/A"}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  SMS Service (Twilio)
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">Account SID</span>
                    <div className="flex items-center gap-1.5" data-testid="status-twilio-sid">
                      {platformConfig?.twilioAccountSid ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm text-emerald-500">Configured</span></>
                      ) : (
                        <><XCircle className="w-4 h-4 text-red-500" /><span className="text-sm text-red-500">Missing</span></>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">Auth Token</span>
                    <div className="flex items-center gap-1.5" data-testid="status-twilio-token">
                      {platformConfig?.twilioAuthToken ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm text-emerald-500">Configured</span></>
                      ) : (
                        <><XCircle className="w-4 h-4 text-red-500" /><span className="text-sm text-red-500">Missing</span></>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">Phone Number</span>
                    <div className="flex items-center gap-1.5" data-testid="status-twilio-phone">
                      {platformConfig?.twilioPhoneNumber ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm text-emerald-500">Configured</span></>
                      ) : (
                        <><XCircle className="w-4 h-4 text-red-500" /><span className="text-sm text-red-500">Missing</span></>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  AI Service (Anthropic)
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">API Key</span>
                    <div className="flex items-center gap-1.5" data-testid="status-anthropic-key">
                      {platformConfig?.anthropicApiKey ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm text-emerald-500">Configured</span></>
                      ) : (
                        <><XCircle className="w-4 h-4 text-red-500" /><span className="text-sm text-red-500">Missing</span></>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Security
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">Session Secret</span>
                    <div className="flex items-center gap-1.5" data-testid="status-session-secret">
                      {platformConfig?.sessionSecret ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm text-emerald-500">Configured</span></>
                      ) : (
                        <><XCircle className="w-4 h-4 text-red-500" /><span className="text-sm text-red-500">Missing</span></>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <span className="text-sm text-muted-foreground">Admin Password</span>
                    <div className="flex items-center gap-1.5" data-testid="status-admin-password">
                      {platformConfig?.adminPassword ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm text-emerald-500">Configured</span></>
                      ) : (
                        <><XCircle className="w-4 h-4 text-red-500" /><span className="text-sm text-red-500">Missing</span></>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Platform secrets are managed via environment variables. To update them, go to the Secrets tab in your project settings.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
