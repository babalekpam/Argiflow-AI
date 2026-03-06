import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";

const AGENT_META: Record<string, { icon: any; color: string; bgColor: string; placeholder: string }> = {
  scout: { icon: Search, color: "text-blue-500", bgColor: "bg-blue-500/10", placeholder: 'Find 20 dental practice owners in Texas with verified emails' },
  writer: { icon: Mail, color: "text-violet-500", bgColor: "bg-violet-500/10", placeholder: 'Write a cold email to a CFO at a mid-size SaaS company about our billing automation' },
  reply: { icon: MessageSquare, color: "text-amber-500", bgColor: "bg-amber-500/10", placeholder: 'Analyze this reply: "Thanks for reaching out. We\'re currently evaluating options..."' },
  intent: { icon: Activity, color: "text-teal-500", bgColor: "bg-teal-500/10", placeholder: 'Check buying signals for acme-corp.com — are they in a buying cycle?' },
  booker: { icon: CalendarCheck, color: "text-emerald-500", bgColor: "bg-emerald-500/10", placeholder: 'A prospect replied "Sounds interesting, tell me more" — book a meeting' },
  forum: { icon: Globe, color: "text-pink-500", bgColor: "bg-pink-500/10", placeholder: 'Find Reddit threads where people are looking for medical billing solutions' },
};

const CATEGORY_COLORS: Record<string, string> = {
  Intelligence: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Outreach: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  CRM: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
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
};

export default function AgentConsolePage() {
  const [selectedId, setSelectedId] = useState<string>("scout");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [runError, setRunError] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: catalogData, isLoading } = useQuery<{ agents: Agent[] }>({
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
  const credits = balanceData?.credits ?? 0;
  const selected = agents.find(a => a.id === selectedId) || agents[0];
  const meta = AGENT_META[selectedId] || AGENT_META.scout;
  const Icon = meta.icon;

  const handleRun = () => {
    if (!prompt.trim()) return;
    setOutput("");
    setRunError(null);
    runMutation.mutate({ agentId: selectedId, prompt: prompt.trim() });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-agent-console">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-agent-console">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-agent-console-title">AI Agent Console</h1>
          <p className="text-muted-foreground mt-1 text-sm">Run specialized AI agents powered by your active LLM provider</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg border border-border/50">
            <Coins className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono font-bold" data-testid="text-agent-credit-balance">{credits.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">credits</span>
          </div>
          <Badge variant="outline" className="text-xs">50 cr/run</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {agents.map(agent => {
          const agentMeta = AGENT_META[agent.id] || AGENT_META.scout;
          const AgentIcon = agentMeta.icon;
          const isSel = selectedId === agent.id;
          return (
            <Card
              key={agent.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${isSel ? "border-primary/40 ring-1 ring-primary/20 bg-primary/5" : ""}`}
              onClick={() => { setSelectedId(agent.id); setOutput(""); setRunError(null); }}
              data-testid={`card-agent-${agent.id}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${agentMeta.bgColor} flex items-center justify-center shrink-0`}>
                  <AgentIcon className={`w-4 h-4 ${agentMeta.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate" data-testid={`text-agent-name-${agent.id}`}>{agent.name}</h3>
                    <Badge className={`text-[9px] ${CATEGORY_COLORS[agent.category] || ""}`}>{agent.category}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{agent.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-muted-foreground font-mono">{agent.runs} runs</span>
                    {agent.rate > 0 && <span className="text-[10px] text-emerald-500 font-mono">{agent.rate}%</span>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden" data-testid="card-agent-runner">
        <div className="px-5 py-3 border-b border-border/50 flex items-center gap-3 bg-secondary/30">
          <div className={`w-8 h-8 rounded-lg ${meta.bgColor} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${meta.color}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold" data-testid="text-selected-agent">{selected?.name || "Select an Agent"}</h3>
            <p className="text-[11px] text-muted-foreground">{selected?.description}</p>
          </div>
          {runMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prompt</label>
              <span className="text-xs text-muted-foreground">
                Balance: <strong className="font-mono text-foreground">{credits.toLocaleString()}</strong> credits
              </span>
            </div>
            <div className="flex gap-3">
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={meta.placeholder}
                rows={3}
                className="flex-1 resize-none"
                data-testid="input-agent-prompt"
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRun(); }}
              />
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

          <div
            ref={outputRef}
            className="min-h-[180px] max-h-[320px] overflow-auto rounded-lg bg-secondary/50 border border-border/50 p-4"
            data-testid="output-agent-result"
          >
            {!output && !runMutation.isPending && !runError && (
              <p className="text-sm text-muted-foreground/50 italic">Output streams here after you hit Run…</p>
            )}
            {runMutation.isPending && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Running {selected?.name}…
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
            <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
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
      </Card>
    </div>
  );
}
