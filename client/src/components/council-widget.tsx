import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCouncil } from "@/contexts/council-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Crown,
  X,
  Loader2,
  Sparkles,
  AlertTriangle,
  Target,
  Expand,
  Eye,
  Zap,
  ChevronDown,
  ChevronUp,
  Users,
  RotateCcw,
} from "lucide-react";

type AdvisorResult = { name: string; response: string };
type CouncilResult = {
  question: string;
  advisors: AdvisorResult[];
  peerReviews: string[];
  chairman: string;
};

const ADVISOR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "The Contrarian": AlertTriangle,
  "The First Principles Thinker": Target,
  "The Expansionist": Expand,
  "The Outsider": Eye,
  "The Executor": Zap,
};

const ADVISOR_COLORS: Record<string, string> = {
  "The Contrarian": "text-red-400",
  "The First Principles Thinker": "text-blue-400",
  "The Expansionist": "text-emerald-400",
  "The Outsider": "text-amber-400",
  "The Executor": "text-purple-400",
};

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Where the Council Agrees": Users,
  "Where the Council Clashes": AlertTriangle,
  "Blind Spots the Council Caught": Eye,
  "The Recommendation": Sparkles,
  "The One Thing to Do First": Zap,
};

const SECTION_COLORS: Record<string, string> = {
  "Where the Council Agrees": "text-emerald-400",
  "Where the Council Clashes": "text-amber-400",
  "Blind Spots the Council Caught": "text-blue-400",
  "The Recommendation": "text-primary",
  "The One Thing to Do First": "text-purple-400",
};

function parseChairmanSections(text: string): { title: string; content: string }[] {
  const headings = [
    "Where the Council Agrees",
    "Where the Council Clashes",
    "Blind Spots the Council Caught",
    "The Recommendation",
    "The One Thing to Do First",
  ];
  const sections: { title: string; content: string }[] = [];
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const start = text.indexOf(`## ${heading}`);
    if (start === -1) continue;
    const contentStart = start + `## ${heading}`.length;
    const nextIdx = headings
      .slice(i + 1)
      .map((h) => text.indexOf(`## ${h}`, contentStart))
      .filter((idx) => idx !== -1);
    const end = nextIdx.length > 0 ? Math.min(...nextIdx) : text.length;
    const content = text.slice(contentStart, end).trim();
    if (content) sections.push({ title: heading, content });
  }
  if (sections.length === 0) sections.push({ title: "Verdict", content: text.trim() });
  return sections;
}

function AdvisorRow({ advisor }: { advisor: AdvisorResult }) {
  const [open, setOpen] = useState(false);
  const Icon = ADVISOR_ICONS[advisor.name] ?? Crown;
  const colorClass = ADVISOR_COLORS[advisor.name] ?? "text-muted-foreground";

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        className="w-full flex items-center justify-between gap-2 py-2 px-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />
          <span className="text-xs font-medium">{advisor.name}</span>
        </div>
        {open ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
      </button>
      {open && (
        <p className="px-3 pb-3 text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {advisor.response}
        </p>
      )}
    </div>
  );
}

export function CouncilWidget() {
  const { isOpen, prefill, closeCouncil, openCouncil } = useCouncil();
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<CouncilResult | null>(null);
  const [showAdvisors, setShowAdvisors] = useState(false);

  // Sync prefill into question whenever the panel opens
  useEffect(() => {
    if (isOpen && prefill) {
      setQuestion(prefill);
    }
    if (!isOpen) {
      // Reset state when closed
      setResult(null);
      setShowAdvisors(false);
      setQuestion("");
    }
  }, [isOpen, prefill]);

  const mutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await fetch("/api/council/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Council failed");
      }
      return res.json() as Promise<CouncilResult>;
    },
    onSuccess: (data) => setResult(data),
    onError: (err: Error) => {
      toast({ title: "Council failed", description: err.message, variant: "destructive" });
    },
  });

  const handleRun = () => {
    if (question.trim().length < 10) {
      toast({ title: "Too short", description: "Enter a meaningful question for the council.", variant: "destructive" });
      return;
    }
    setResult(null);
    mutation.mutate(question.trim());
  };

  const handleReset = () => {
    setResult(null);
    setQuestion("");
    setShowAdvisors(false);
  };

  const sections = result ? parseChairmanSections(result.chairman) : [];

  return (
    <>
      {/* Floating trigger button — positioned to the left of the AI chat button */}
      <button
        onClick={() => openCouncil()}
        className="fixed bottom-6 right-24 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 transition-transform hover:scale-105"
        title="LLM Council"
        data-testid="btn-open-council-widget"
      >
        <Crown className="w-5 h-5" />
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[480px] max-w-[calc(100vw-3rem)] bg-card border border-border rounded-md shadow-2xl flex flex-col"
          style={{ maxHeight: "calc(100vh - 8rem)" }}
          data-testid="council-widget-panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-sm">LLM Council</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/30 text-purple-400">5 Advisors</Badge>
            </div>
            <button onClick={closeCouncil} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            {/* Input area — shown when no result or resetting */}
            {!result && (
              <div className="p-3 space-y-3">
                {!mutation.isPending && (
                  <>
                    <Textarea
                      data-testid="input-widget-council-question"
                      placeholder="What decision or question should the council pressure-test?"
                      className="text-sm min-h-[100px] resize-none"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {["Contrarian", "First Principles", "Expansionist", "Outsider", "Executor"].map((label) => (
                        <span key={label} className="text-[10px] px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground">{label}</span>
                      ))}
                    </div>
                    <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700" onClick={handleRun}>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Convene the Council
                    </Button>
                  </>
                )}

                {mutation.isPending && (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 flex items-center justify-center">
                        <Crown className="w-6 h-6 text-purple-400/40" />
                      </div>
                      <Loader2 className="w-12 h-12 animate-spin text-purple-500 absolute inset-0" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Council in session</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        5 advisors → peer review → chairman synthesis
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="flex flex-col">
                {/* Question recap */}
                <div className="px-3 py-2 border-b border-border/50 bg-muted/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Question</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{result.question}</p>
                </div>

                {/* Chairman sections */}
                <div className="p-3 space-y-3">
                  {sections.map(({ title, content }) => {
                    const Icon = SECTION_ICONS[title] ?? Crown;
                    const colorClass = SECTION_COLORS[title] ?? "text-muted-foreground";
                    const isHighlight = title === "The Recommendation" || title === "The One Thing to Do First";
                    return (
                      <div
                        key={title}
                        className={`rounded-md border p-3 ${isHighlight ? "border-purple-500/30 bg-purple-500/5" : "border-border/60"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />
                          <p className="text-[11px] font-semibold">{title}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Advisor responses (collapsible) */}
                <div className="border-t border-border/50">
                  <button
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setShowAdvisors((s) => !s)}
                  >
                    <span className="text-[11px] font-medium text-muted-foreground">Advisor Responses</span>
                    {showAdvisors ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  {showAdvisors && (
                    <div className="border-t border-border/50">
                      {result.advisors.map((advisor) => (
                        <AdvisorRow key={advisor.name} advisor={advisor} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer actions when result shown */}
          {result && (
            <div className="p-3 border-t border-border/50 flex gap-2 shrink-0">
              <Button size="sm" variant="outline" className="flex-1" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                New Question
              </Button>
              <a href="/dashboard/council" className="flex-1">
                <Button size="sm" variant="outline" className="w-full">
                  <Crown className="w-3.5 h-3.5 mr-1.5" />
                  Full Page
                </Button>
              </a>
            </div>
          )}
        </div>
      )}
    </>
  );
}
