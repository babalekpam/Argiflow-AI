import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
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
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Trash2,
  ChevronDown,
  ChevronRight,
  Target,
  Send,
  Building2,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type { Lead } from "@shared/schema";
import { useState } from "react";

const addLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  source: z.string().min(1, "Source is required"),
  status: z.string().default("new"),
});

function LeadStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    hot: "bg-red-500/10 text-red-400 border-red-500/20",
    warm: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    cold: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    qualified: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  return (
    <Badge className={styles[status] || styles.new}>
      {status.toUpperCase()}
    </Badge>
  );
}

export default function LeadsPage() {
  usePageTitle("Leads & CRM");
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const form = useForm({
    resolver: zodResolver(addLeadSchema),
    defaultValues: { name: "", email: "", phone: "", source: "", status: "new" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addLeadSchema>) => {
      const res = await apiRequest("POST", "/api/leads", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Lead created successfully" });
      form.reset();
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create lead", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Lead deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete lead", variant: "destructive" });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/leads");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "All leads cleared" });
    },
    onError: () => {
      toast({ title: "Failed to clear leads", variant: "destructive" });
    },
  });

  const sendOutreachMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const res = await apiRequest("POST", `/api/leads/${leadId}/send-outreach`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: data.message || "Outreach email sent" });
    },
    onError: async (error: any) => {
      let message = "Failed to send outreach";
      try {
        if (error?.message) message = error.message;
      } catch {}
      toast({ title: message, variant: "destructive" });
    },
  });

  const sendAllOutreachMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/leads/send-all-outreach");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      const msg = `Sent ${data.sent} email${data.sent !== 1 ? "s" : ""}${data.failed > 0 ? `, ${data.failed} failed` : ""}`;
      toast({ title: msg });
    },
    onError: async (error: any) => {
      let message = "Failed to send outreach emails";
      try {
        if (error?.message) message = error.message;
      } catch {}
      toast({ title: message, variant: "destructive" });
    },
  });

  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyOutreach = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Outreach email copied to clipboard" });
  };

  const filteredLeads = (leads || []).filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      (l.company || "").toLowerCase().includes(search.toLowerCase())
  );

  const unsentCount = (leads || []).filter(l => l.outreach && l.email && !l.outreachSentAt).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-leads-title">Leads & CRM</h1>
          <p className="text-muted-foreground text-sm">
            Manage and track all your leads in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unsentCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => sendAllOutreachMutation.mutate()}
              disabled={sendAllOutreachMutation.isPending}
              data-testid="button-send-all-outreach"
            >
              {sendAllOutreachMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" />Engage All ({unsentCount})</>
              )}
            </Button>
          )}
          {(leads?.length || 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Are you sure you want to delete all leads? This cannot be undone.")) {
                  deleteAllMutation.mutate();
                }
              }}
              disabled={deleteAllMutation.isPending}
              data-testid="button-clear-all-leads"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteAllMutation.isPending ? "Clearing..." : "Clear All"}
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-lead">
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} data-testid="input-lead-name" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@company.com" {...field} data-testid="input-lead-email" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 000-0000" {...field} data-testid="input-lead-phone" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lead-source">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Google Ads">Google Ads</SelectItem>
                          <SelectItem value="Facebook">Facebook</SelectItem>
                          <SelectItem value="Instagram">Instagram</SelectItem>
                          <SelectItem value="Referral">Referral</SelectItem>
                          <SelectItem value="Website">Website</SelectItem>
                          <SelectItem value="Cold Outreach">Cold Outreach</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lead-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="warm">Warm</SelectItem>
                          <SelectItem value="hot">Hot</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="cold">Cold</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-lead">
                  {createMutation.isPending ? "Creating..." : "Add Lead"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-leads"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-9 h-9 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No leads found</p>
            <p className="text-sm">Add your first lead to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map((lead) => {
              const isExpanded = expandedLeads.has(lead.id);
              const hasDetails = lead.outreach || lead.intentSignal || lead.notes;
              const isSent = !!lead.outreachSentAt;
              return (
                <div
                  key={lead.id}
                  className="border rounded-md overflow-visible"
                  data-testid={`lead-row-${lead.id}`}
                >
                  <div
                    className={`flex items-center gap-3 p-3 ${hasDetails ? "cursor-pointer hover-elevate" : ""}`}
                    onClick={() => hasDetails && toggleExpand(lead.id)}
                    data-testid={`lead-header-${lead.id}`}
                  >
                    {hasDetails && (
                      <div className="text-muted-foreground">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    )}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                      {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" data-testid={`text-lead-name-${lead.id}`}>{lead.name}</span>
                        {lead.company && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-lead-company-${lead.id}`}>
                            <Building2 className="w-3 h-3" />
                            {lead.company}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {lead.email && (
                          <span className="flex items-center gap-1" data-testid={`text-lead-email-${lead.id}`}>
                            <Mail className="w-3 h-3" />
                            {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1" data-testid={`text-lead-phone-${lead.id}`}>
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {lead.intentSignal && (
                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
                          <Target className="w-3 h-3 mr-1" />
                          Intent
                        </Badge>
                      )}
                      {lead.outreach && isSent && (
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Sent
                        </Badge>
                      )}
                      {lead.outreach && !isSent && (
                        <Badge variant="outline" className="text-xs bg-sky-500/10 text-sky-400 border-sky-500/20">
                          <Send className="w-3 h-3 mr-1" />
                          Ready
                        </Badge>
                      )}
                      <span data-testid={`badge-lead-status-${lead.id}`}><LeadStatusBadge status={lead.status} /></span>
                      <span className="text-xs font-medium w-10 text-right" data-testid={`text-lead-score-${lead.id}`}>{lead.score}/100</span>
                      <span className="text-xs text-muted-foreground w-20 text-right" data-testid={`text-lead-date-${lead.id}`}>
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ""}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(lead.id); }}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-lead-${lead.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && hasDetails && (
                    <div className="border-t p-4 space-y-3 bg-muted/30" data-testid={`lead-details-${lead.id}`}>
                      {lead.intentSignal && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Intent Signal</span>
                          </div>
                          <p className="text-sm pl-6" data-testid={`text-intent-${lead.id}`}>{lead.intentSignal}</p>
                        </div>
                      )}
                      {lead.notes && (
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Research Notes</span>
                          </div>
                          <p className="text-sm pl-6" data-testid={`text-notes-${lead.id}`}>{lead.notes}</p>
                        </div>
                      )}
                      {lead.outreach && (
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <Send className="w-4 h-4 text-sky-400" />
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {isSent ? "Outreach Email (Sent)" : "Outreach Email Draft"}
                              </span>
                              {isSent && lead.outreachSentAt && (
                                <span className="text-xs text-emerald-400">
                                  Sent {new Date(lead.outreachSentAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); copyOutreach(lead.id, lead.outreach!); }}
                                data-testid={`button-copy-outreach-${lead.id}`}
                              >
                                {copiedId === lead.id ? (
                                  <><Check className="w-3 h-3 mr-1" /> Copied</>
                                ) : (
                                  <><Copy className="w-3 h-3 mr-1" /> Copy</>
                                )}
                              </Button>
                              {!isSent && lead.email && (
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); sendOutreachMutation.mutate(lead.id); }}
                                  disabled={sendOutreachMutation.isPending}
                                  data-testid={`button-send-outreach-${lead.id}`}
                                >
                                  {sendOutreachMutation.isPending ? (
                                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Sending...</>
                                  ) : (
                                    <><Send className="w-3 h-3 mr-1" /> Send Email</>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className={`pl-6 p-3 rounded-md bg-background border text-sm whitespace-pre-wrap ${isSent ? "border-emerald-500/20" : ""}`} data-testid={`text-outreach-${lead.id}`}>
                            {lead.outreach}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
