import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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
import {
  Filter,
  Plus,
  Trash2,
  ArrowRight,
  DollarSign,
  Users,
  TrendingUp,
  ChevronRight,
  GripVertical,
  MoreHorizontal,
  CircleDot,
  CheckCircle,
  XCircle,
  BarChart3,
  Zap,
  Loader2,
} from "lucide-react";
import type { Funnel, FunnelStage, FunnelDeal } from "@shared/schema";

const funnelTemplates = [
  {
    name: "AI Agency Sales",
    description: "Standard sales pipeline for AI automation agencies",
    stages: [
      { name: "Lead Captured", color: "#6366f1" },
      { name: "Discovery Call", color: "#8b5cf6" },
      { name: "Proposal Sent", color: "#f59e0b" },
      { name: "Negotiation", color: "#f97316" },
      { name: "Closed Won", color: "#10b981" },
      { name: "Closed Lost", color: "#ef4444" },
    ],
  },
  {
    name: "Voice AI Onboarding",
    description: "Pipeline for voice AI agent deployments",
    stages: [
      { name: "Demo Requested", color: "#6366f1" },
      { name: "Demo Completed", color: "#8b5cf6" },
      { name: "Setup Started", color: "#f59e0b" },
      { name: "Agent Live", color: "#10b981" },
      { name: "Churned", color: "#ef4444" },
    ],
  },
  {
    name: "High-Ticket Closer",
    description: "For $5K+ service packages",
    stages: [
      { name: "Application", color: "#6366f1" },
      { name: "Qualified", color: "#8b5cf6" },
      { name: "Strategy Call", color: "#3b82f6" },
      { name: "Offer Made", color: "#f59e0b" },
      { name: "Enrolled", color: "#10b981" },
      { name: "Not Fit", color: "#ef4444" },
    ],
  },
  {
    name: "Chatbot Lead Funnel",
    description: "Pipeline for chatbot lead generation clients",
    stages: [
      { name: "Interested", color: "#6366f1" },
      { name: "Needs Analysis", color: "#8b5cf6" },
      { name: "Bot Configured", color: "#3b82f6" },
      { name: "Trial Active", color: "#f59e0b" },
      { name: "Subscribed", color: "#10b981" },
      { name: "Declined", color: "#ef4444" },
    ],
  },
];

function StageColumn({
  stage,
  deals,
  allStages,
  funnelId,
  onMoveDeal,
}: {
  stage: FunnelStage;
  deals: FunnelDeal[];
  allStages: FunnelStage[];
  funnelId: string;
  onMoveDeal: (dealId: string, newStageId: string) => void;
}) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newValue, setNewValue] = useState("");

  const createDealMutation = useMutation({
    mutationFn: async (data: { stageId: string; contactName: string; contactEmail: string; value: number }) => {
      const res = await apiRequest("POST", `/api/funnels/${funnelId}/deals`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/funnels/${funnelId}/deals`] });
      setAddOpen(false);
      setNewName("");
      setNewEmail("");
      setNewValue("");
      toast({ title: "Deal added" });
    },
  });

  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      await apiRequest("DELETE", `/api/deals/${dealId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/funnels/${funnelId}/deals`] });
    },
  });

  const stageDeals = deals.filter((d) => d.stageId === stage.id);
  const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0" data-testid={`stage-column-${stage.id}`}>
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
        <span className="text-sm font-medium truncate">{stage.name}</span>
        <Badge variant="outline" className="ml-auto text-[10px] py-0 px-1.5 shrink-0">
          {stageDeals.length}
        </Badge>
      </div>
      {totalValue > 0 && (
        <div className="text-xs text-muted-foreground px-1 mb-2">
          ${totalValue.toLocaleString()} total
        </div>
      )}

      <div className="flex flex-col gap-2 flex-1 min-h-[120px]">
        {stageDeals.map((deal) => (
          <Card
            key={deal.id}
            className="p-3 group"
            data-testid={`deal-card-${deal.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{deal.contactName}</p>
                {deal.contactEmail && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{deal.contactEmail}</p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() => deleteDealMutation.mutate(deal.id)}
                data-testid={`button-delete-deal-${deal.id}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
            {(deal.value || 0) > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <DollarSign className="w-3 h-3 text-chart-3" />
                <span className="text-xs font-medium text-chart-3">${(deal.value || 0).toLocaleString()}</span>
              </div>
            )}
            <Select
              value={deal.stageId}
              onValueChange={(val) => onMoveDeal(deal.id, val)}
            >
              <SelectTrigger className="mt-2 h-7 text-xs" data-testid={`select-move-deal-${deal.id}`}>
                <SelectValue placeholder="Move to..." />
              </SelectTrigger>
              <SelectContent>
                {allStages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start gap-2 text-muted-foreground" data-testid={`button-add-deal-${stage.id}`}>
            <Plus className="w-3.5 h-3.5" />
            Add deal
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Deal to {stage.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              placeholder="Contact name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              data-testid="input-deal-name"
            />
            <Input
              placeholder="Email (optional)"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              data-testid="input-deal-email"
            />
            <Input
              placeholder="Deal value ($)"
              type="number"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              data-testid="input-deal-value"
            />
            <Button
              className="w-full"
              disabled={!newName.trim() || createDealMutation.isPending}
              onClick={() =>
                createDealMutation.mutate({
                  stageId: stage.id,
                  contactName: newName.trim(),
                  contactEmail: newEmail.trim(),
                  value: parseFloat(newValue) || 0,
                })
              }
              data-testid="button-submit-deal"
            >
              {createDealMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Deal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PipelineView({ funnel }: { funnel: Funnel }) {
  const { data: stages = [], isLoading: stagesLoading } = useQuery<FunnelStage[]>({
    queryKey: [`/api/funnels/${funnel.id}/stages`],
  });

  const { data: deals = [], isLoading: dealsLoading } = useQuery<FunnelDeal[]>({
    queryKey: [`/api/funnels/${funnel.id}/deals`],
  });

  const moveDealMutation = useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      await apiRequest("PATCH", `/api/deals/${dealId}`, { stageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/funnels/${funnel.id}/deals`] });
    },
  });

  const handleMoveDeal = (dealId: string, newStageId: string) => {
    moveDealMutation.mutate({ dealId, stageId: newStageId });
  };

  if (stagesLoading || dealsLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="min-w-[260px] w-[260px] shrink-0 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const totalDeals = deals.length;
  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const wonStage = stages.find((s) => s.name.toLowerCase().includes("won") || s.name.toLowerCase().includes("enrolled") || s.name.toLowerCase().includes("subscribed") || s.name.toLowerCase().includes("live"));
  const lostStage = stages.find((s) => s.name.toLowerCase().includes("lost") || s.name.toLowerCase().includes("churn") || s.name.toLowerCase().includes("declined") || s.name.toLowerCase().includes("not fit"));
  const wonDeals = wonStage ? deals.filter((d) => d.stageId === wonStage.id).length : 0;
  const lostDeals = lostStage ? deals.filter((d) => d.stageId === lostStage.id).length : 0;
  const convRate = totalDeals > 0 ? ((wonDeals / totalDeals) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs">Total Deals</span>
          </div>
          <p className="text-lg font-bold" data-testid="text-total-deals">{totalDeals}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="text-xs">Pipeline Value</span>
          </div>
          <p className="text-lg font-bold" data-testid="text-pipeline-value">${totalValue.toLocaleString()}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-chart-3" />
            <span className="text-xs">Won</span>
          </div>
          <p className="text-lg font-bold text-chart-3" data-testid="text-deals-won">{wonDeals}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs">Win Rate</span>
          </div>
          <p className="text-lg font-bold" data-testid="text-win-rate">{convRate}%</p>
        </Card>
      </div>

      <div className="flex items-center gap-1 mb-2">
        {stages.map((stage, i) => {
          const count = deals.filter((d) => d.stageId === stage.id).length;
          const pct = totalDeals > 0 ? (count / totalDeals) * 100 : 0;
          return (
            <div key={stage.id} className="flex items-center gap-1 flex-1">
              <div
                className="h-2 rounded-full flex-1 min-w-[20px] transition-all"
                style={{
                  backgroundColor: stage.color,
                  opacity: count > 0 ? 1 : 0.2,
                }}
                title={`${stage.name}: ${count} deals (${pct.toFixed(0)}%)`}
              />
              {i < stages.length - 1 && (
                <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" data-testid="pipeline-board">
        {stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            deals={deals}
            allStages={stages}
            funnelId={funnel.id}
            onMoveDeal={handleMoveDeal}
          />
        ))}
      </div>
    </div>
  );
}

export default function SalesFunnelsPage() {
  usePageTitle("Sales Funnels");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");

  const { data: userFunnels = [], isLoading } = useQuery<Funnel[]>({
    queryKey: ["/api/funnels"],
  });

  const createFunnelMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; stages: { name: string; color: string }[] }) => {
      const res = await apiRequest("POST", "/api/funnels", data);
      return res.json();
    },
    onSuccess: (funnel) => {
      queryClient.invalidateQueries({ queryKey: ["/api/funnels"] });
      setSelectedFunnelId(funnel.id);
      setCreateOpen(false);
      setCustomName("");
      setCustomDesc("");
      toast({ title: "Funnel created", description: `"${funnel.name}" is ready to use.` });
    },
    onError: () => {
      toast({ title: "Failed to create funnel", variant: "destructive" });
    },
  });

  const deleteFunnelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/funnels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funnels"] });
      setSelectedFunnelId(null);
      toast({ title: "Funnel deleted" });
    },
  });

  const selectedFunnel = userFunnels.find((f) => f.id === selectedFunnelId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-funnels-title">
            <Filter className="w-6 h-6 text-primary" />
            Sales Funnels
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track deals through your pipeline from lead to close
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-funnel">
              <Plus className="w-4 h-4 mr-2" />
              New Funnel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Sales Funnel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">Choose a template or create custom:</p>
              <div className="grid gap-2">
                {funnelTemplates.map((tpl, i) => (
                  <Card
                    key={i}
                    className="p-3 cursor-pointer hover-elevate"
                    onClick={() =>
                      createFunnelMutation.mutate({
                        name: tpl.name,
                        description: tpl.description,
                        stages: tpl.stages,
                      })
                    }
                    data-testid={`template-funnel-${i}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground">{tpl.description}</p>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        {tpl.stages.slice(0, 4).map((s, si) => (
                          <div key={si} className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        ))}
                        {tpl.stages.length > 4 && (
                          <span className="text-[10px] text-muted-foreground ml-0.5">+{tpl.stages.length - 4}</span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium mb-2 text-muted-foreground">Or create custom:</p>
                <Input
                  placeholder="Funnel name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="mb-2"
                  data-testid="input-custom-funnel-name"
                />
                <Input
                  placeholder="Description (optional)"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  className="mb-2"
                  data-testid="input-custom-funnel-desc"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!customName.trim() || createFunnelMutation.isPending}
                  onClick={() =>
                    createFunnelMutation.mutate({
                      name: customName.trim(),
                      description: customDesc.trim(),
                      stages: [
                        { name: "New Lead", color: "#6366f1" },
                        { name: "Contacted", color: "#8b5cf6" },
                        { name: "Qualified", color: "#3b82f6" },
                        { name: "Proposal", color: "#f59e0b" },
                        { name: "Closed Won", color: "#10b981" },
                        { name: "Closed Lost", color: "#ef4444" },
                      ],
                    })
                  }
                  data-testid="button-create-custom-funnel"
                >
                  {createFunnelMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create Custom Funnel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {userFunnels.length === 0 ? (
        <Card className="p-8 text-center">
          <Filter className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-semibold mb-2">No Funnels Yet</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Create your first sales funnel to start tracking deals through your pipeline. Choose from templates or build your own.
          </p>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-funnel">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Funnel
          </Button>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {userFunnels.map((funnel) => (
              <Button
                key={funnel.id}
                variant={selectedFunnelId === funnel.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFunnelId(funnel.id)}
                className="shrink-0 toggle-elevate"
                data-testid={`button-select-funnel-${funnel.id}`}
              >
                <CircleDot className="w-3.5 h-3.5 mr-1.5" />
                {funnel.name}
              </Button>
            ))}
          </div>

          {selectedFunnel ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold" data-testid="text-selected-funnel-name">{selectedFunnel.name}</h2>
                  {selectedFunnel.description && (
                    <p className="text-xs text-muted-foreground">{selectedFunnel.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm("Delete this funnel and all its deals?")) {
                      deleteFunnelMutation.mutate(selectedFunnel.id);
                    }
                  }}
                  data-testid="button-delete-funnel"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete
                </Button>
              </div>
              <PipelineView funnel={selectedFunnel} />
            </div>
          ) : (
            <Card className="p-8 text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">Select a funnel above to view its pipeline</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
