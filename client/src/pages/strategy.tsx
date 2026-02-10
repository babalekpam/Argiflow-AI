import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";
import type { MarketingStrategy } from "@shared/schema";

const workflowSteps = [
  { icon: Building2, label: "Analyzing Business Profile", description: "Reading your company details and goals" },
  { icon: Search, label: "Researching Industry Trends", description: "Scanning market data for your sector" },
  { icon: Globe, label: "Mapping Competitor Strategies", description: "Identifying gaps and opportunities" },
  { icon: Target, label: "Building Lead Gen Plan", description: "Designing your acquisition funnel" },
  { icon: BrainCircuit, label: "Crafting AI Automation", description: "Selecting the best AI agent workflows" },
  { icon: FileText, label: "Finalizing Your Strategy", description: "Compiling the full marketing plan" },
];

function WorkflowVisual() {
  const [activeStep, setActiveStep] = useState(0);

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
          <h3 className="text-base font-semibold">Building Your Strategy</h3>
          <p className="text-xs text-muted-foreground">
            Step {activeStep + 1} of {workflowSteps.length}
          </p>
        </div>
        <Badge className="ml-auto bg-amber-500/10 text-amber-400 border-amber-500/20 no-default-hover-elevate no-default-active-elevate">
          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
          Processing
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
                  Done
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
        <span>Powered by AI &mdash; your custom strategy is almost ready</span>
      </div>
    </Card>
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
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs">$1</code>');
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
  const { toast } = useToast();
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
      toast({ title: "Regenerating strategy", description: "Your updated strategy will be ready in a moment." });
    },
    onError: () => {
      toast({ title: "Failed to regenerate", description: "Please try again.", variant: "destructive" });
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

  if (!strategy) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-8 text-center">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-semibold mb-2">No Marketing Strategy Yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Complete your company profile to get a custom AI-generated marketing strategy.
          </p>
        </Card>
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
              Your Marketing Strategy
            </h1>
            {isGenerating ? (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Generating...
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                Ready
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Custom strategy for <span className="text-foreground font-medium">{strategy.companyName}</span> in <span className="text-foreground font-medium">{strategy.industry}</span>
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
          Regenerate
        </Button>
      </div>

      {isGenerating ? (
        <WorkflowVisual />
      ) : (
        <Card className="p-6" data-testid="card-strategy-content">
          <div className="prose-sm">
            {renderMarkdown(strategy.strategy)}
          </div>
        </Card>
      )}
    </div>
  );
}
