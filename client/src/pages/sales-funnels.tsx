import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
    nameKey: "salesFunnels.templateAiAgencyName",
    descKey: "salesFunnels.templateAiAgencyDesc",
    stages: [
      { nameKey: "salesFunnels.stageLeadCaptured", color: "#6366f1" },
      { nameKey: "salesFunnels.stageDiscoveryCall", color: "#8b5cf6" },
      { nameKey: "salesFunnels.stageProposalSent", color: "#f59e0b" },
      { nameKey: "salesFunnels.stageNegotiation", color: "#f97316" },
      { nameKey: "salesFunnels.stageClosedWon", color: "#10b981" },
      { nameKey: "salesFunnels.stageClosedLost", color: "#ef4444" },
    ],
  },
  {
    nameKey: "salesFunnels.templateVoiceAiName",
    descKey: "salesFunnels.templateVoiceAiDesc",
    stages: [
      { nameKey: "salesFunnels.stageDemoRequested", color: "#6366f1" },
      { nameKey: "salesFunnels.stageDemoCompleted", color: "#8b5cf6" },
      { nameKey: "salesFunnels.stageSetupStarted", color: "#f59e0b" },
      { nameKey: "salesFunnels.stageAgentLive", color: "#10b981" },
      { nameKey: "salesFunnels.stageChurned", color: "#ef4444" },
    ],
  },
  {
    nameKey: "salesFunnels.templateHighTicketName",
    descKey: "salesFunnels.templateHighTicketDesc",
    stages: [
      { nameKey: "salesFunnels.stageApplication", color: "#6366f1" },
      { nameKey: "salesFunnels.stageQualified", color: "#8b5cf6" },
      { nameKey: "salesFunnels.stageStrategyCall", color: "#3b82f6" },
      { nameKey: "salesFunnels.stageOfferMade", color: "#f59e0b" },
      { nameKey: "salesFunnels.stageEnrolled", color: "#10b981" },
      { nameKey: "salesFunnels.stageNotFit", color: "#ef4444" },
    ],
  },
  {
    nameKey: "salesFunnels.templateChatbotName",
    descKey: "salesFunnels.templateChatbotDesc",
    stages: [
      { nameKey: "salesFunnels.stageInterested", color: "#6366f1" },
      { nameKey: "salesFunnels.stageNeedsAnalysis", color: "#8b5cf6" },
      { nameKey: "salesFunnels.stageBotConfigured", color: "#3b82f6" },
      { nameKey: "salesFunnels.stageTrialActive", color: "#f59e0b" },
      { nameKey: "salesFunnels.stageSubscribed", color: "#10b981" },
      { nameKey: "salesFunnels.stageDeclined", color: "#ef4444" },
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
  const { t } = useTranslation();
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
      toast({ title: t("salesFunnels.dealAdded") });
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
          ${totalValue.toLocaleString()} {t("salesFunnels.total")}
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
                <SelectValue placeholder={t("salesFunnels.moveTo")} />
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
            {t("salesFunnels.addDeal")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("salesFunnels.addDealTo", { stage: stage.name })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              placeholder={t("salesFunnels.contactNamePlaceholder")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              data-testid="input-deal-name"
            />
            <Input
              placeholder={t("salesFunnels.contactEmailPlaceholder")}
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              data-testid="input-deal-email"
            />
            <Input
              placeholder={t("salesFunnels.dealValue")}
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
              {t("salesFunnels.addDealBtn")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PipelineView({ funnel }: { funnel: Funnel }) {
  const { t } = useTranslation();
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
            <span className="text-xs">{t("salesFunnels.totalDeals")}</span>
          </div>
          <p className="text-lg font-bold" data-testid="text-total-deals">{totalDeals}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="text-xs">{t("salesFunnels.pipelineValue")}</span>
          </div>
          <p className="text-lg font-bold" data-testid="text-pipeline-value">${totalValue.toLocaleString()}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircle className="w-3.5 h-3.5 text-chart-3" />
            <span className="text-xs">{t("salesFunnels.won")}</span>
          </div>
          <p className="text-lg font-bold text-chart-3" data-testid="text-deals-won">{wonDeals}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs">{t("salesFunnels.winRate")}</span>
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
  const { t } = useTranslation();
  usePageTitle(t("salesFunnels.title"));
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
      toast({ title: t("salesFunnels.funnelCreated"), description: t("salesFunnels.readyToUse", { name: funnel.name }) });
    },
    onError: () => {
      toast({ title: t("salesFunnels.createFunnelFailed"), variant: "destructive" });
    },
  });

  const deleteFunnelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/funnels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/funnels"] });
      setSelectedFunnelId(null);
      toast({ title: t("salesFunnels.funnelDeleted") });
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
            {t("salesFunnels.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("salesFunnels.subtitle")}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-funnel">
              <Plus className="w-4 h-4 mr-2" />
              {t("salesFunnels.newFunnel")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("salesFunnels.createFunnel")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">{t("salesFunnels.chooseTemplate")}</p>
              <div className="grid gap-2">
                {funnelTemplates.map((tpl, i) => (
                  <Card
                    key={i}
                    className="p-3 cursor-pointer hover-elevate"
                    onClick={() =>
                      createFunnelMutation.mutate({
                        name: t(tpl.nameKey),
                        description: t(tpl.descKey),
                        stages: tpl.stages.map(s => ({ name: t(s.nameKey), color: s.color })),
                      })
                    }
                    data-testid={`template-funnel-${i}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{t(tpl.nameKey)}</p>
                        <p className="text-xs text-muted-foreground">{t(tpl.descKey)}</p>
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
                <p className="text-xs font-medium mb-2 text-muted-foreground">{t("salesFunnels.orCreateCustom")}</p>
                <Input
                  placeholder={t("salesFunnels.funnelName")}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="mb-2"
                  data-testid="input-custom-funnel-name"
                />
                <Input
                  placeholder={t("salesFunnels.descriptionOptional")}
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
                        { name: t("salesFunnels.stageNewLead"), color: "#6366f1" },
                        { name: t("salesFunnels.stageContacted"), color: "#8b5cf6" },
                        { name: t("salesFunnels.stageQualified"), color: "#3b82f6" },
                        { name: t("salesFunnels.stageProposal"), color: "#f59e0b" },
                        { name: t("salesFunnels.stageClosedWon"), color: "#10b981" },
                        { name: t("salesFunnels.stageClosedLost"), color: "#ef4444" },
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
                  {t("salesFunnels.createCustomFunnel")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {userFunnels.length === 0 ? (
        <Card className="p-8 text-center">
          <Filter className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-semibold mb-2">{t("salesFunnels.noFunnels")}</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            {t("salesFunnels.noFunnelsDesc")}
          </p>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-funnel">
            <Plus className="w-4 h-4 mr-2" />
            {t("salesFunnels.createFirstFunnel")}
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
                    if (confirm(t("salesFunnels.confirmDeleteFunnel"))) {
                      deleteFunnelMutation.mutate(selectedFunnel.id);
                    }
                  }}
                  data-testid="button-delete-funnel"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  {t("common.delete")}
                </Button>
              </div>
              <PipelineView funnel={selectedFunnel} />
            </div>
          ) : (
            <Card className="p-8 text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">{t("salesFunnels.selectFunnelPrompt")}</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
