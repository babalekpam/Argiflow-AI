import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, LogOut, Users, CalendarDays, Bot, DollarSign, BarChart3,
} from "lucide-react";
import type { Lead, Appointment, AiAgent } from "@shared/schema";

interface AdminStats {
  totalUsers: number;
  totalLeads: number;
  totalAppointments: number;
  totalAgents: number;
  revenue: number;
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

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
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
  };
  return (
    <Badge className={colors[status] || ""}>{status}</Badge>
  );
}

export default function AdminDashboard() {
  usePageTitle("Admin Dashboard");
  const { admin, isLoading, isAuthenticated } = useAdmin();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/admin/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      setLocation("/admin");
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

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold" data-testid="text-admin-header">ArgiFlow Admin</h1>
              <p className="text-xs text-muted-foreground">{admin?.email}</p>
            </div>
          </div>
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
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Total Users" value={stats?.totalUsers || 0} icon={Users} />
          <StatCard label="Total Leads" value={stats?.totalLeads || 0} icon={BarChart3} />
          <StatCard label="Appointments" value={stats?.totalAppointments || 0} icon={CalendarDays} />
          <StatCard label="AI Agents" value={stats?.totalAgents || 0} icon={Bot} />
          <StatCard label="Revenue" value={`$${(stats?.revenue || 0).toLocaleString()}`} icon={DollarSign} />
        </div>

        <Tabs defaultValue="leads">
          <TabsList data-testid="tabs-admin">
            <TabsTrigger value="leads" data-testid="tab-admin-leads">Leads ({leads?.length || 0})</TabsTrigger>
            <TabsTrigger value="appointments" data-testid="tab-admin-appointments">Appointments ({appointments?.length || 0})</TabsTrigger>
            <TabsTrigger value="agents" data-testid="tab-admin-agents">AI Agents ({agents?.length || 0})</TabsTrigger>
          </TabsList>

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
                        <TableCell className="text-xs text-muted-foreground font-mono max-w-[120px] truncate">{lead.userId}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!leads || leads.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
        </Tabs>
      </div>
    </div>
  );
}
