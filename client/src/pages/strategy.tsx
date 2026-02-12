import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import {
  Sparkles,
  RefreshCw,
  Target,
  Users,
  BarChart3,
  Zap,
  Calendar,
  TrendingUp,
  CheckCircle,
  Loader2,
  Building2,
  Search,
  Globe,
  BrainCircuit,
  FileText,
  Rocket,
  ArrowRight,
  ArrowDown,
  Phone,
  Mail,
  MessageSquare,
  Bot,
  Save,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AnimatedFlowchart } from "@/components/animated-flowchart";
import type { MarketingStrategy } from "@shared/schema";

const industryOptions = [
  { value: "Marketing Agency", labelKey: "marketingAgency" },
  { value: "Real Estate", labelKey: "realEstate" },
  { value: "Healthcare", labelKey: "healthcare" },
  { value: "Legal Services", labelKey: "legalServices" },
  { value: "Financial Services", labelKey: "financialServices" },
  { value: "E-Commerce", labelKey: "eCommerce" },
  { value: "SaaS / Software", labelKey: "saas" },
  { value: "Consulting", labelKey: "consulting" },
  { value: "Construction", labelKey: "construction" },
  { value: "Home Services", labelKey: "homeServices" },
  { value: "Fitness & Wellness", labelKey: "fitnessWellness" },
  { value: "Education", labelKey: "education" },
  { value: "Insurance", labelKey: "insurance" },
  { value: "Automotive", labelKey: "automotive" },
  { value: "Restaurant / Food", labelKey: "restaurantFood" },
  { value: "Other", labelKey: "other" },
];


function WorkflowVisual() {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);

  const workflowSteps = [
    { icon: Building2, label: t("strategy.workflowStep1Label"), description: t("strategy.workflowStep1Desc") },
    { icon: Search, label: t("strategy.workflowStep2Label"), description: t("strategy.workflowStep2Desc") },
    { icon: Globe, label: t("strategy.workflowStep3Label"), description: t("strategy.workflowStep3Desc") },
    { icon: Target, label: t("strategy.workflowStep4Label"), description: t("strategy.workflowStep4Desc") },
    { icon: BrainCircuit, label: t("strategy.workflowStep5Label"), description: t("strategy.workflowStep5Desc") },
    { icon: FileText, label: t("strategy.workflowStep6Label"), description: t("strategy.workflowStep6Desc") },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < workflowSteps.length - 1 ? prev + 1 : prev));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const progress = ((activeStep + 1) / workflowSteps.length) * 100;

  return (
    <Card className="p-6" data-testid="card-workflow-visual">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
        </div>
        <div>
          <h3 className="text-base font-semibold">{t("strategy.buildingYourStrategy")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("strategy.stepOf", { current: activeStep + 1, total: workflowSteps.length })}
          </p>
        </div>
        <Badge className="ml-auto bg-amber-500/10 text-amber-400 border-amber-500/20 no-default-hover-elevate no-default-active-elevate">
          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
          {t("strategy.processing")}
        </Badge>
      </div>

      <div className="w-full h-1.5 bg-muted rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-chart-3 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid gap-3">
        {workflowSteps.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === activeStep;
          const isComplete = i < activeStep;
          const isPending = i > activeStep;

          return (
            <div
              key={i}
              className={`flex items-center gap-4 p-3 rounded-md transition-all duration-500 ${
                isActive
                  ? "bg-primary/5 border border-primary/20"
                  : isComplete
                  ? "bg-muted/30"
                  : "opacity-40"
              }`}
              data-testid={`workflow-step-${i}`}
            >
              <div
                className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-colors duration-500 ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : isComplete
                    ? "bg-chart-3/10 text-chart-3"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isComplete ? (
                  <CheckCircle className="w-4 h-4" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium transition-colors duration-500 ${
                    isActive
                      ? "text-foreground"
                      : isComplete
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {step.label}
                </p>
                {(isActive || isComplete) && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                )}
              </div>

              {isActive && (
                <div className="flex gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
              {isComplete && (
                <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20 text-[10px] no-default-hover-elevate no-default-active-elevate">
                  {t("strategy.done")}
                </Badge>
              )}
              {isPending && (
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span>{t("strategy.poweredByAi")}</span>
      </div>
    </Card>
  );
}

function CompanyInfoForm({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    website: "",
    companyDescription: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      await apiRequest("POST", "/api/onboarding", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/strategy"] });
      toast({ title: t("strategy.companyProfileSaved"), description: t("strategy.generatingNow") });
      onSuccess();
    },
    onError: () => {
      toast({ title: t("strategy.failedToSave"), description: t("strategy.checkFields"), variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!form.companyName || !form.industry || form.companyDescription.length < 10) {
      toast({ title: t("strategy.missingInfo"), description: t("strategy.missingInfoDesc"), variant: "destructive" });
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-strategy-title">
          <Sparkles className="w-6 h-6 inline-block mr-2 text-primary" />
          {t("strategy.aiMarketingStrategy")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("strategy.tellUsAboutBusiness")}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6" data-testid="card-company-info-form">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t("strategy.yourBusinessProfile")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("strategy.businessProfileDesc")}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("strategy.companyName")}</Label>
              <Input
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder={t("strategy.companyNamePlaceholder")}
                data-testid="input-strategy-company-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("strategy.industry")}</Label>
              <Select
                value={form.industry}
                onValueChange={(v) => setForm({ ...form, industry: v })}
              >
                <SelectTrigger data-testid="select-strategy-industry">
                  <SelectValue placeholder={t("strategy.selectIndustry")} />
                </SelectTrigger>
                <SelectContent>
                  {industryOptions.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>{t(`auth.signup.industries.${ind.labelKey}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("strategy.website")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></Label>
              <Input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder={t("strategy.websitePlaceholder")}
                data-testid="input-strategy-website"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("strategy.whatDoesCompanyDo")}</Label>
              <Textarea
                value={form.companyDescription}
                onChange={(e) => setForm({ ...form, companyDescription: e.target.value })}
                placeholder={t("strategy.companyDescPlaceholder")}
                className="resize-none min-h-[100px]"
                data-testid="input-strategy-description"
              />
              <p className="text-xs text-muted-foreground">{t("strategy.minCharsDesc")}</p>
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={mutation.isPending}
              data-testid="button-generate-strategy-submit"
            >
              {mutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {mutation.isPending ? t("strategy.savingGenerating") : t("strategy.generateMyStrategy")}
            </Button>
          </div>
        </Card>

        <AnimatedFlowchart />
      </div>
    </div>
  );
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const items = listItems.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2 text-sm leading-relaxed">
          <CheckCircle className="w-3.5 h-3.5 text-chart-3 shrink-0 mt-1" />
          <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
        </li>
      ));
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-2 my-3 ml-1">
          {items}
        </ul>
      );
      listItems = [];
      listType = null;
    }
  };

  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const inlineFormat = (text: string): string => {
    const escaped = escapeHtml(text);
    return escaped
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs">$1</code>');
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      flushList();
      const text = trimmed.replace("## ", "");
      const iconMap: Record<string, any> = {
        "Executive Summary": Sparkles,
        "Target Audience": Users,
        "Lead Generation": Target,
        "AI Automation": Zap,
        "90-Day Action": Calendar,
        "Key Metrics": BarChart3,
        "Competitive Edge": TrendingUp,
      };
      let Icon = Sparkles;
      for (const [key, val] of Object.entries(iconMap)) {
        if (text.includes(key)) { Icon = val; break; }
      }
      elements.push(
        <div key={`h2-${i}`} className="flex items-center gap-3 mt-8 mb-3 first:mt-0">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold">{text}</h2>
        </div>
      );
    } else if (trimmed.startsWith("### ")) {
      flushList();
      const text = trimmed.replace("### ", "");
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-semibold mt-5 mb-2 text-foreground/90">{text}</h3>
      );
    } else if (trimmed.startsWith("# ")) {
      flushList();
      const text = trimmed.replace("# ", "");
      elements.push(
        <h1 key={`h1-${i}`} className="text-xl font-bold mb-2">{text}</h1>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listType = "ul";
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
    } else if (/^\d+\.\s/.test(trimmed)) {
      listType = "ol";
      listItems.push(trimmed.replace(/^\d+\.\s+/, ""));
    } else if (trimmed === "---") {
      flushList();
      elements.push(<hr key={`hr-${i}`} className="border-border/50 my-4" />);
    } else if (trimmed === "") {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={`p-${i}`} className="text-sm text-muted-foreground leading-relaxed my-2" dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }} />
      );
    }
  }
  flushList();

  return elements;
}

export default function StrategyPage() {
  const { t } = useTranslation();
  usePageTitle(t("strategy.title"));
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: strategy, isLoading } = useQuery<MarketingStrategy | null>({
    queryKey: ["/api/strategy"],
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.status === "generating") return 3000;
      return false;
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/strategy/regenerate");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategy"] });
      toast({ title: t("strategy.regeneratingStrategy"), description: t("strategy.regeneratingDesc") });
    },
    onError: (error: any) => {
      if (error?.message?.includes("Company info missing")) {
        toast({ title: t("strategy.companyInfoNeeded"), description: t("strategy.fillProfileFirst"), variant: "destructive" });
      } else {
        toast({ title: t("strategy.failedToRegenerate"), description: t("strategy.pleaseTryAgain"), variant: "destructive" });
      }
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <Card className="p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </Card>
      </div>
    );
  }

  const hasCompanyInfo = user?.companyName && user?.industry && user?.companyDescription;

  if (!strategy && !hasCompanyInfo) {
    return (
      <CompanyInfoForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/strategy"] })} />
    );
  }

  if (!strategy) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-strategy-title">
            <Sparkles className="w-6 h-6 inline-block mr-2 text-primary" />
            {t("strategy.aiMarketingStrategy")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("strategy.generateCustomStrategy")}
          </p>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-8 flex flex-col items-center justify-center text-center">
            <Sparkles className="w-12 h-12 text-primary mb-4 opacity-50" />
            <h2 className="text-lg font-semibold mb-2">{t("strategy.readyToGenerate")}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("strategy.readyToGenerateDesc")} <span className="text-foreground font-medium">{user?.companyName}</span>.
            </p>
            <Button
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
              data-testid="button-generate-strategy"
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {regenerateMutation.isPending ? t("strategy.generating") : t("strategy.generateStrategy")}
            </Button>
          </Card>
          <AnimatedFlowchart />
        </div>
      </div>
    );
  }

  const isGenerating = strategy.status === "generating";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold" data-testid="text-strategy-title">
              <Sparkles className="w-6 h-6 inline-block mr-2 text-primary" />
              {t("strategy.yourMarketingStrategy")}
            </h1>
            {isGenerating ? (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {t("strategy.generating")}
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                {t("strategy.ready")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("strategy.customStrategyFor")} <span className="text-foreground font-medium">{strategy.companyName}</span> {t("strategy.in")} <span className="text-foreground font-medium">{strategy.industry}</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => regenerateMutation.mutate()}
          disabled={regenerateMutation.isPending || isGenerating}
          data-testid="button-regenerate-strategy"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
          {t("strategy.regenerate")}
        </Button>
      </div>

      {isGenerating ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <WorkflowVisual />
          <AnimatedFlowchart />
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatedFlowchart />
          <Card className="p-6" data-testid="card-strategy-content">
            <div className="prose-sm">
              {renderMarkdown(strategy.strategy)}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
