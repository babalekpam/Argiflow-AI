import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Bot,
  Search,
  Mail,
  MessageSquare,
  Activity,
  CalendarCheck,
  Globe,
  Play,
  Loader2,
  Zap,
  CheckCircle2,
  Trash2,
  Coins,
  FileText,
  ClipboardList,
  RefreshCw,
  Linkedin,
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  Search, Mail, MessageSquare, Activity, CalendarCheck, Globe,
  Bot, FileText, ClipboardList, RefreshCw, Linkedin, Zap,
};

type Agent = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: string;
  runs: number;
  rate: number;
  lastRun: string | null;
  vertical: string;
  examples: string[];
  verticalColor: string;
  icon: string;
};

type VerticalConfig = Record<string, { color: string; label: string }>;

const FALLBACK_VERTICAL_CONFIG: VerticalConfig = {
  "Track-Med": { color: "#0DAD74", label: "Track-Med / CureMedAuth" },
  "NaviMed": { color: "#4B6CF7", label: "NaviMed EHR" },
  "ARGILETTE": { color: "#7B5BFB", label: "ARGILETTE Agency" },
  "Universal": { color: "#0691A1", label: "Universal" },
  "Prospecting": { color: "#3b82f6", label: "Prospecting" },
  "Outreach": { color: "#8b5cf6", label: "Outreach" },
  "Intelligence": { color: "#0691A1", label: "Intelligence" },
  "CRM": { color: "#10b981", label: "CRM" },
};

export default function AgentConsolePage() {
  const [selectedId, setSelectedId] = useState<string>("trackmed-scout");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [runError, setRunError] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: catalogData, isLoading } = useQuery<{
    agents: Agent[];
    verticalConfig: VerticalConfig;
    verticalOrder: string[];
  }>({
    queryKey: ["/api/agent-console/catalog"],
  });

  const { data: balanceData } = useQuery<{ credits: number }>({
    queryKey: ["/api/credits/balance"],
  });

  const runMutation = useMutation({
    mutationFn: async (payload: { agentId: string; prompt: string }) => {
      const res = await apiRequest("POST", "/api/agent-console/run", payload);
      return res.json();
    },
    onSuccess: (data: any) => {
      setOutput(data.output || "No output returned");
      queryClient.invalidateQueries({ queryKey: ["/api/agent-console/catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits/balance"] });
      if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
    },
    onError: (err: any) => {
      setRunError(err.message || "Agent run failed");
    },
  });

  const agents = catalogData?.agents || [];
  const verticalConfig = catalogData?.verticalConfig || FALLBACK_VERTICAL_CONFIG;
  const verticalOrder = catalogData?.verticalOrder || ["Track-Med", "NaviMed", "ARGILETTE", "Universal"];
  const credits = balanceData?.credits ?? 0;
  const selected = agents.find(a => a.id === selectedId) || agents[0];

  const grouped = agents.reduce<Record<string, Agent[]>>((acc, ag) => {
    const v = ag.vertical || ag.category || "Universal";
    if (!acc[v]) acc[v] = [];
    acc[v].push(ag);
    return acc;
  }, {});

  const allVerticals = Array.from(new Set([...verticalOrder, ...Object.keys(grouped)]));
  const orderedVerticals = allVerticals.filter(v => grouped[v]?.length);

  const selectedMeta = selected ? {
    icon: ICON_MAP[selected.icon] || Bot,
    color: selected.verticalColor || "#0691A1",
    examples: selected.examples || [],
    vertical: selected.vertical || selected.category,
  } : { icon: Bot, color: "#0691A1", examples: [], vertical: "Universal" };

  const Icon = selectedMeta.icon;
  const vConfig = verticalConfig[selectedMeta.vertical] || { color: selectedMeta.color, label: selectedMeta.vertical };

  const handleRun = () => {
    if (!prompt.trim()) return;
    setOutput("");
    setRunError(null);
    runMutation.mutate({ agentId: selectedId, prompt: prompt.trim() });
  };

  if (isLoading) {
    return (
      <div className="flex h-full" data-testid="page-agent-console">
        <div className="w-60 shrink-0 border-r border-border p-4 space-y-3">
          <Skeleton className="h-6 w-32" />
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-12" />)}
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full" data-testid="page-agent-console">
      <div className="w-60 shrink-0 border-r border-border flex flex-col bg-card">
        <div className="p-3 border-b border-border">
          <h2 className="text-sm font-bold" data-testid="text-agent-sidebar-title">AI Agents</h2>
          <p className="text-[11px] text-muted-foreground mt-1">Select an agent to run</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="py-1">
            {orderedVerticals.map(v => {
              const vc = verticalConfig[v] || { color: "#0691A1", label: v };
              return (
                <div key={v}>
                  <div
                    className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest font-mono"
                    style={{ color: vc.color }}
                    data-testid={`text-vertical-label-${v}`}
                  >
                    {vc.label}
                  </div>
                  {grouped[v]?.map(ag => {
                    const isSel = selectedId === ag.id;
                    const AgIcon = ICON_MAP[ag.icon] || Bot;
                    return (
                      <div
                        key={ag.id}
                        className={`flex items-center gap-2.5 px-3 py-2 mx-1.5 my-0.5 rounded-md cursor-pointer transition-colors ${
                          isSel
                            ? "bg-primary/10 border border-primary/20"
                            : "border border-transparent hover-elevate"
                        }`}
                        onClick={() => { setSelectedId(ag.id); setOutput(""); setPrompt(""); setRunError(null); }}
                        data-testid={`card-agent-${ag.id}`}
                      >
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                            isSel ? "bg-primary/10" : "bg-secondary"
                          }`}
                        >
                          <AgIcon className="w-3.5 h-3.5" style={{ color: isSel ? vc.color : undefined }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs truncate ${isSel ? "font-bold" : "font-medium text-muted-foreground"}`} data-testid={`text-agent-name-${ag.id}`}>
                            {ag.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {ag.runs > 0 ? `${ag.runs} runs` : "ready"}
                          </div>
                        </div>
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: ag.status === "active" ? "#0DAD74" : "#E79109" }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {selected && (
          <div className="px-5 py-3 border-b border-border flex items-center gap-3 bg-card shrink-0">
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${vConfig.color}15`, border: `1px solid ${vConfig.color}30` }}
            >
              <Icon className="w-4 h-4" style={{ color: vConfig.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold" data-testid="text-selected-agent">{selected.name}</h3>
              <p className="text-[11px] text-muted-foreground truncate">{selected.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-md border border-border/50">
                <Coins className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-mono font-bold" data-testid="text-agent-credit-balance">{credits.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">credits</span>
              </div>
              <Badge variant="outline" className="text-[10px]">50 cr/run</Badge>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-4">
            {selectedMeta.examples.length > 0 && !prompt && (
              <div data-testid="section-example-prompts">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono mb-2">
                  Example prompts — click to use
                </div>
                <div className="flex flex-col gap-1.5">
                  {selectedMeta.examples.map((ex, i) => (
                    <div
                      key={i}
                      onClick={() => setPrompt(ex)}
                      className="px-3.5 py-2.5 bg-secondary border border-border rounded-md cursor-pointer text-xs text-muted-foreground leading-relaxed hover-elevate transition-colors"
                      data-testid={`button-example-prompt-${i}`}
                    >
                      <span className="font-semibold mr-1.5" style={{ color: vConfig.color }}>-&gt;</span>
                      {ex}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Your prompt for {selected?.name || "Agent"}
                </label>
                <div className="flex items-center gap-3">
                  {prompt && (
                    <button
                      onClick={() => { setPrompt(""); setOutput(""); setRunError(null); }}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                      data-testid="button-clear-prompt"
                    >
                      Clear
                    </button>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    Balance: <strong className="font-mono text-foreground">{credits.toLocaleString()}</strong> credits
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <Textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={selectedMeta.examples[0] || `Describe what you want ${selected?.name || "the agent"} to do...`}
                  rows={4}
                  className="flex-1 resize-none"
                  data-testid="input-agent-prompt"
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRun(); }}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleRun}
                    disabled={runMutation.isPending || !prompt.trim() || credits < 50}
                    className="self-end px-6"
                    data-testid="button-run-agent"
                  >
                    {runMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Running</>
                    ) : (
                      <><Play className="w-4 h-4 mr-1.5" /> Run</>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div
              ref={outputRef}
              className="min-h-[180px] max-h-[320px] overflow-auto rounded-md bg-secondary/50 border border-border/50 p-4"
              data-testid="output-agent-result"
            >
              {!output && !runMutation.isPending && !runError && (
                <p className="text-sm text-muted-foreground/50 italic">Output streams here after you hit Run...</p>
              )}
              {runMutation.isPending && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running {selected?.name}...
                </div>
              )}
              {runError && (
                <p className="text-sm text-destructive" data-testid="text-agent-error">{runError}</p>
              )}
              {output && (
                <pre className="text-sm whitespace-pre-wrap leading-relaxed" data-testid="text-agent-output">{output}</pre>
              )}
            </div>

            {output && !runMutation.isPending && (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-md">
                <div className="w-9 h-9 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Agent completed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Review the output and take action on the results.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setOutput(""); setPrompt(""); }} data-testid="button-clear-output">
                  <Trash2 className="w-4 h-4 mr-1" /> Clear
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
