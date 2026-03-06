import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Cpu, CheckCircle2, ExternalLink, Zap, Brain, Sparkles, Cloud, CircuitBoard, Server } from "lucide-react";

const PROVIDER_META: Record<string, { icon: any; color: string; description: string; docsUrl: string }> = {
  anthropic: { icon: Brain, color: "text-orange-500", description: "Claude models — advanced reasoning and analysis", docsUrl: "https://docs.anthropic.com" },
  openai: { icon: Sparkles, color: "text-green-500", description: "GPT models — versatile, cost-effective AI", docsUrl: "https://platform.openai.com/docs" },
  gemini: { icon: Cloud, color: "text-blue-500", description: "Google's Gemini — multimodal capabilities", docsUrl: "https://ai.google.dev/docs" },
  mistral: { icon: Zap, color: "text-yellow-500", description: "Mistral — European AI with strong performance", docsUrl: "https://docs.mistral.ai" },
  groq: { icon: CircuitBoard, color: "text-purple-500", description: "Groq — ultra-fast inference with free tier", docsUrl: "https://console.groq.com/docs" },
  together: { icon: Server, color: "text-pink-500", description: "Together AI — open-source models at scale", docsUrl: "https://docs.together.ai" },
};

export default function AiProvidersPage() {
  const { data, isLoading } = useQuery<{
    providers: Array<{ id: string; name: string; defaultModel: string; modelOptions: string[]; format: string; hasKey: boolean }>;
    active: { providerId: string; name: string; model: string } | null;
  }>({
    queryKey: ["/api/llm/providers"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-ai-providers">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  const providers = data?.providers || [];
  const active = data?.active;

  return (
    <div className="p-6 space-y-6" data-testid="page-ai-providers">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-ai-providers-title">AI Providers</h1>
        <p className="text-muted-foreground mt-1">
          Switch between LLM providers by setting environment variables. Zero code changes needed.
        </p>
      </div>

      {active && (
        <Card className="p-4 border-primary/30 bg-primary/5" data-testid="card-active-provider">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold text-sm">Active Provider: {active.name}</p>
              <p className="text-xs text-muted-foreground">Model: {active.model}</p>
            </div>
            <Badge className="ml-auto bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Connected</Badge>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map(provider => {
          const meta = PROVIDER_META[provider.id] || { icon: Cpu, color: "text-muted-foreground", description: "", docsUrl: "" };
          const Icon = meta.icon;
          const isActive = active?.providerId === provider.id;

          return (
            <Card
              key={provider.id}
              className={`p-5 transition-all hover:shadow-md ${isActive ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : ""}`}
              data-testid={`card-provider-${provider.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? "bg-primary/10" : "bg-secondary"}`}>
                    <Icon className={`w-5 h-5 ${isActive ? "text-primary" : meta.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm" data-testid={`text-provider-name-${provider.id}`}>{provider.name}</h3>
                    <p className="text-xs text-muted-foreground" data-testid={`text-provider-model-${provider.id}`}>{provider.defaultModel}</p>
                  </div>
                </div>
                {isActive && (
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">ACTIVE</Badge>
                )}
                {!isActive && provider.hasKey && (
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px]">KEY SET</Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{meta.description}</p>

              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Available Models</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.modelOptions.map(model => (
                      <span
                        key={model}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                          active?.model === model ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {model}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
                {meta.docsUrl && (
                  <a href={meta.docsUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-docs-${provider.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      <ExternalLink className="w-3 h-3" /> Docs
                    </Button>
                  </a>
                )}
                <p className="text-[10px] text-muted-foreground ml-auto">
                  {provider.hasKey ? "API key configured" : "Set API key in Secrets"}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5" data-testid="card-switch-instructions">
        <h3 className="font-semibold text-sm mb-3">How to Switch Providers</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <p>Add your provider's API key to Replit Secrets (e.g., <code className="text-xs bg-secondary px-1 py-0.5 rounded">GROQ_API_KEY</code>)</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <p>Set <code className="text-xs bg-secondary px-1 py-0.5 rounded">LLM_PROVIDER</code> to your provider (e.g., <code className="text-xs bg-secondary px-1 py-0.5 rounded">groq</code>)</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <p>Optionally set <code className="text-xs bg-secondary px-1 py-0.5 rounded">LLM_MODEL</code> to choose a specific model</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">4</span>
            <p>Restart the application — all AI features will use the new provider automatically</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-secondary/50 rounded-lg border border-border/50">
          <p className="text-xs font-mono text-muted-foreground">
            <span className="text-primary">LLM_PROVIDER</span>=groq<br/>
            <span className="text-primary">LLM_MODEL</span>=llama-3.3-70b-versatile<br/>
            <span className="text-primary">GROQ_API_KEY</span>=gsk_...
          </p>
        </div>
      </Card>
    </div>
  );
}
