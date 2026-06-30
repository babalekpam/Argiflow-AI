import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
  Expand,
  Target,
  Eye,
  Zap,
  Crown,
  RotateCcw,
} from "lucide-react";

type AdvisorResult = {
  name: string;
  response: string;
};

type CouncilResult = {
  question: string;
  advisors: AdvisorResult[];
  peerReviews: string[];
  chairman: string;
  anonymizationMap: string;
};

type Phase = "idle" | "advisors" | "review" | "synthesis" | "done";

const ADVISOR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "The Contrarian": AlertTriangle,
  "The First Principles Thinker": Target,
  "The Expansionist": Expand,
  "The Outsider": Eye,
  "The Executor": Zap,
};

const ADVISOR_COLORS: Record<string, string> = {
  "The Contrarian": "bg-red-500/10 text-red-400 border-red-500/20",
  "The First Principles Thinker": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "The Expansionist": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "The Outsider": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "The Executor": "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const PHASE_LABELS: Record<Phase, string> = {
  idle: "",
  advisors: "Convening the 5 advisors...",
  review: "Running anonymous peer review...",
  synthesis: "Chairman synthesizing verdict...",
  done: "",
};

function parseChairmanSections(text: string): Record<string, string> {
  const headings = [
    "Where the Council Agrees",
    "Where the Council Clashes",
    "Blind Spots the Council Caught",
    "The Recommendation",
    "The One Thing to Do First",
  ];
  const result: Record<string, string> = {};
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const start = text.indexOf(`## ${heading}`);
    if (start === -1) continue;
    const contentStart = start + `## ${heading}`.length;
    const nextHeadingIdx = headings
      .slice(i + 1)
      .map((h) => text.indexOf(`## ${h}`, contentStart))
      .filter((idx) => idx !== -1);
    const end = nextHeadingIdx.length > 0 ? Math.min(...nextHeadingIdx) : text.length;
    result[heading] = text.slice(contentStart, end).trim();
  }
  return result;
}

function AdvisorCard({ advisor, index }: { advisor: AdvisorResult; index: number }) {
  const [open, setOpen] = useState(false);
  const Icon = ADVISOR_ICONS[advisor.name] ?? Users;
  const colorClass = ADVISOR_COLORS[advisor.name] ?? "bg-muted text-muted-foreground border-border";

  return (
    <Card className="p-4">
      <button
        className="w-full flex items-center justify-between gap-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center border ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">{advisor.name}</p>
            <p className="text-xs text-muted-foreground">Advisor {index + 1}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {advisor.response}
        </div>
      )}
    </Card>
  );
}

function PeerReviewsCard({ reviews }: { reviews: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-4">
      <button
        className="w-full flex items-center justify-between gap-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md flex items-center justify-center border bg-muted/50">
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm">Peer Reviews</p>
            <p className="text-xs text-muted-foreground">{reviews.length} anonymous cross-reviews</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t space-y-4">
          {reviews.map((review, i) => (
            <div key={i}>
              <p className="text-xs font-medium text-muted-foreground mb-1">Review {i + 1}</p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{review}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Where the Council Agrees": Users,
  "Where the Council Clashes": AlertTriangle,
  "Blind Spots the Council Caught": Eye,
  "The Recommendation": Sparkles,
  "The One Thing to Do First": Zap,
};

const SECTION_COLORS: Record<string, string> = {
  "Where the Council Agrees": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Where the Council Clashes": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Blind Spots the Council Caught": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "The Recommendation": "bg-primary/10 text-primary border-primary/20",
  "The One Thing to Do First": "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

function VerdictSection({ title, content }: { title: string; content: string }) {
  const Icon = SECTION_ICONS[title] ?? Crown;
  const colorClass = SECTION_COLORS[title] ?? "bg-muted text-muted-foreground border-border";
  const isHighlight = title === "The Recommendation" || title === "The One Thing to Do First";

  return (
    <div className={`rounded-lg border p-4 ${isHighlight ? "border-primary/30 bg-primary/5" : ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center border ${colorClass}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}

export default function LlmCouncilPage() {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<CouncilResult | null>(null);

  const mutation = useMutation({
    mutationFn: async (q: string) => {
      // Simulate phase progression
      setPhase("advisors");
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
    onSuccess: (data) => {
      setPhase("done");
      setResult(data);
    },
    onError: (err: Error) => {
      setPhase("idle");
      toast({ title: "Council failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (question.trim().length < 10) {
      toast({ title: "Too short", description: "Please enter a meaningful question for the council.", variant: "destructive" });
      return;
    }
    setResult(null);
    mutation.mutate(question.trim());
  };

  const handleReset = () => {
    setPhase("idle");
    setResult(null);
    setQuestion("");
  };

  const sections = result ? parseChairmanSections(result.chairman) : {};

  return (
    <div className="px-6 pt-6 pb-10 max-w-4xl mx-auto space-y-6" data-testid="llm-council-page">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Crown className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold" data-testid="text-page-title">LLM Council</h1>
        </div>
        <p className="text-muted-foreground">
          Pressure-test any decision through 5 independent AI advisors, peer review, and a chairman synthesis — based on Karpathy's LLM Council methodology.
        </p>
      </div>

      {/* Input section */}
      {phase === "idle" && !result && (
        <Card className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Your question or decision</label>
            <Textarea
              data-testid="input-council-question"
              placeholder="e.g. Should I launch a $97 workshop or a $497 course? My audience is early-stage founders who've been following me for 6 months..."
              className="min-h-[120px] resize-none"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Best for genuine decisions with stakes. Include context — the more specific, the sharper the advice.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {["The Contrarian", "First Principles", "The Expansionist", "The Outsider", "The Executor"].map((label) => (
                <Badge key={label} variant="outline" className="text-xs">{label}</Badge>
              ))}
            </div>
            <Button onClick={handleSubmit} disabled={mutation.isPending} data-testid="btn-convene-council">
              <Sparkles className="w-4 h-4 mr-1.5" />
              Convene Council
            </Button>
          </div>
        </Card>
      )}

      {/* Loading state */}
      {mutation.isPending && (
        <Card className="p-8 flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 border-primary/20 flex items-center justify-center">
              <Crown className="w-7 h-7 text-primary/40" />
            </div>
            <Loader2 className="w-14 h-14 animate-spin text-primary absolute inset-0" />
          </div>
          <div>
            <p className="font-semibold">{PHASE_LABELS[phase]}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Running all phases in parallel — advisors → peer review → chairman synthesis
            </p>
          </div>
          <div className="flex gap-2">
            {(["advisors", "review", "synthesis"] as Phase[]).map((p) => (
              <div
                key={p}
                className={`h-1.5 w-16 rounded-full transition-all ${
                  phase === "advisors" && p === "advisors" ? "bg-primary" :
                  phase === "review" && (p === "advisors" || p === "review") ? "bg-primary" :
                  phase === "synthesis" ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Results */}
      {result && phase === "done" && (
        <div className="space-y-6">
          {/* Question recap */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Question counciled</p>
              <p className="text-sm font-medium">{result.question}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset} data-testid="btn-new-council">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              New Question
            </Button>
          </div>

          {/* Chairman verdict */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-primary" />
              <h2 className="font-bold text-lg">Chairman's Verdict</h2>
            </div>
            <div className="space-y-3" data-testid="chairman-verdict">
              {[
                "Where the Council Agrees",
                "Where the Council Clashes",
                "Blind Spots the Council Caught",
                "The Recommendation",
                "The One Thing to Do First",
              ].map((title) =>
                sections[title] ? (
                  <VerdictSection key={title} title={title} content={sections[title]} />
                ) : null
              )}
              {Object.keys(sections).length === 0 && (
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.chairman}</p>
                </Card>
              )}
            </div>
          </div>

          {/* Advisor responses */}
          <div>
            <h2 className="font-bold text-base mb-3">Advisor Responses</h2>
            <div className="space-y-2" data-testid="advisor-responses">
              {result.advisors.map((advisor, i) => (
                <AdvisorCard key={advisor.name} advisor={advisor} index={i} />
              ))}
            </div>
          </div>

          {/* Peer reviews */}
          <div data-testid="peer-reviews">
            <PeerReviewsCard reviews={result.peerReviews} />
          </div>
        </div>
      )}
    </div>
  );
}
