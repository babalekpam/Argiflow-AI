import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Check,
  ChevronRight,
  Crown,
  Sparkles,
  Zap,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { SiVenmo } from "react-icons/si";

type SubscriptionData = {
  subscription: {
    plan: string;
    status: string;
    trialEndsAt: string | null;
  } | null;
  trialActive: boolean;
  trialExpired: boolean;
  daysRemaining: number;
};

const PLAN_CONFIG = [
  {
    id: "starter",
    amount: 197,
    venmoNote: "ArgiFlow%20Starter%20Plan%20-%20Monthly%20Subscription",
    icon: Zap,
    iconColor: "text-chart-3",
    nameKey: "plans.starterName",
    priceKey: "plans.starterPrice",
    descKey: "plans.starterDesc",
    featuresKey: "plans.starterFeatures",
  },
  {
    id: "pro",
    amount: 397,
    venmoNote: "ArgiFlow%20Pro%20Plan%20-%20Monthly%20Subscription",
    icon: Crown,
    iconColor: "text-primary",
    popular: true,
    nameKey: "plans.proName",
    priceKey: "plans.proPrice",
    descKey: "plans.proDesc",
    featuresKey: "plans.proFeatures",
  },
  {
    id: "enterprise",
    amount: 997,
    venmoNote: "ArgiFlow%20Enterprise%20Plan%20-%20Monthly%20Subscription",
    icon: Sparkles,
    iconColor: "text-chart-4",
    nameKey: "plans.entName",
    priceKey: "plans.entPrice",
    descKey: "plans.entDesc",
    featuresKey: "plans.entFeatures",
  },
];

export default function PlansPage() {
  const { t } = useTranslation();
  usePageTitle(t("plans.title"));
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subData, isLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription"],
  });

  const selectPlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest("POST", "/api/subscription/select-plan", { plan: planId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({
        title: t("plans.planSelected"),
        description: t("plans.planSelectedDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("plans.selectFailed"),
        description: error.message || t("plans.selectFailedDesc"),
        variant: "destructive",
      });
    },
  });

  const currentPlan = subData?.subscription?.plan;
  const currentStatus = subData?.subscription?.status;
  const isActive = currentStatus === "active";
  const isTrial = currentStatus === "trial";

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-plans-title">
          {t("plans.title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("plans.subtitle")}
        </p>
      </div>

      {subData && (isTrial || currentStatus === "expired") && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3 flex-wrap">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              {isTrial && subData.daysRemaining > 0 ? (
                <p className="text-sm">
                  <span className="font-medium">{t("plans.trialActive")}</span>{" "}
                  {t("plans.trialDaysLeft", { count: subData.daysRemaining })}
                </p>
              ) : (
                <p className="text-sm font-medium text-destructive">
                  {t("plans.trialExpired")}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {PLAN_CONFIG.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          const PlanIcon = plan.icon;
          return (
            <Card
              key={plan.id}
              className={`p-6 relative flex flex-col ${
                plan.popular ? "border-primary/40" : ""
              } ${isCurrentPlan && isActive ? "border-chart-3/50 bg-chart-3/5" : ""}`}
              data-testid={`card-plan-${plan.id}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  {t("plans.mostPopular")}
                </Badge>
              )}
              {isCurrentPlan && isActive && (
                <Badge className="absolute -top-3 right-4 bg-chart-3 text-white">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {t("plans.currentPlan")}
                </Badge>
              )}
              <div className="text-center mb-6 pt-2">
                <div className="w-12 h-12 rounded-md bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                  <PlanIcon className={`w-6 h-6 ${plan.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold mb-1" data-testid={`text-plan-name-${plan.id}`}>
                  {t(plan.nameKey)}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t(plan.descKey)}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold" data-testid={`text-plan-price-${plan.id}`}>
                    {t(plan.priceKey)}
                  </span>
                  <span className="text-muted-foreground">{t("plans.perMonth")}</span>
                </div>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                {(t(plan.featuresKey, { returnObjects: true }) as string[]).map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-chart-3 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                {isCurrentPlan && isActive ? (
                  <Button className="w-full" variant="outline" disabled data-testid={`button-plan-current-${plan.id}`}>
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    {t("plans.activePlan")}
                  </Button>
                ) : (
                  <>
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => selectPlanMutation.mutate(plan.id)}
                      disabled={selectPlanMutation.isPending}
                      data-testid={`button-select-plan-${plan.id}`}
                    >
                      {selectPlanMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mr-1" />
                      )}
                      {isTrial || currentStatus === "expired"
                        ? t("plans.upgradeToPlan", { plan: t(plan.nameKey) })
                        : t("plans.selectPlan")}
                    </Button>
                    <a
                      href={`https://venmo.com/argilette?txn=pay&amount=${plan.amount}&note=${plan.venmoNote}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button
                        className="w-full bg-[#008CFF] border-[#008CFF] text-white"
                        variant="outline"
                        data-testid={`button-venmo-${plan.id}`}
                      >
                        <SiVenmo className="w-4 h-4 mr-1" />
                        {t("plans.payWithVenmo")}
                      </Button>
                    </a>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>{t("plans.paymentNote")}</p>
          <p>{t("plans.contactSupport")}</p>
        </div>
      </Card>
    </div>
  );
}
