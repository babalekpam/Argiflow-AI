import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Megaphone,
  Search,
  ExternalLink,
  Copy,
  CheckCircle,
  Globe,
  Loader2,
  Sparkles,
  RefreshCw,
  Clock,
  BarChart3,
  Play,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";

interface PromotionRun {
  id: number;
  status: string;
  searchQuery: string;
  postsFound: number | null;
  draftsGenerated: number | null;
  results: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface PostResult {
  title: string;
  url: string;
  platform: string;
  snippet: string;
  postedDate?: string;
  relevanceScore?: number;
  draftReply: string;
}

export default function PlatformPromoterPage() {
  const { toast } = useToast();
  const [customQuery, setCustomQuery] = useState("");
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);
  const [editedReplies, setEditedReplies] = useState<Record<string, string>>({});

  const { data: statusData, isLoading } = useQuery<{ runs: PromotionRun[] }>({
    queryKey: ["/api/platform-promoter/status"],
    refetchInterval: 15000,
  });

  const triggerMutation = useMutation({
    mutationFn: async (query?: string) => {
      const res = await apiRequest("POST", "/api/platform-promoter/trigger", {
        query: query || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Promotion run started",
        description: `Searching: ${data.query}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/platform-promoter/status"] });
    },
    onError: () => {
      toast({
        title: "Failed to start",
        description: "Could not trigger promotion run. Try again.",
        variant: "destructive",
      });
    },
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(key);
    toast({ title: "Copied!", description: "Reply copied to clipboard." });
    setTimeout(() => setCopiedIdx(null), 3000);
  };

  const runs = statusData?.runs || [];
  const totalPosts = runs.reduce((sum, r) => sum + (r.postsFound || 0), 0);
  const totalDrafts = runs.reduce((sum, r) => sum + (r.draftsGenerated || 0), 0);
  const completedRuns = runs.filter(r => r.status === "completed").length;
  const runningRun = runs.find(r => r.status === "running");

  const parseResults = (resultsJson: string | null): PostResult[] => {
    if (!resultsJson) return [];
    try {
      return JSON.parse(resultsJson);
    } catch {
      return [];
    }
  };

  const getPlatformColor = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes("reddit")) return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    if (p.includes("quora")) return "bg-red-500/10 text-red-400 border-red-500/20";
    if (p.includes("g2") || p.includes("capterra")) return "bg-green-500/10 text-green-400 border-green-500/20";
    return "bg-sky-500/10 text-sky-400 border-sky-500/20";
  };

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6" data-testid="platform-promoter-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Megaphone className="w-6 h-6 text-sky-400" />
            Platform Promoter
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automatically finds people searching for automation tools and drafts helpful responses mentioning ArgiFlow
          </p>
        </div>
        <div className="flex items-center gap-2">
          {runningRun && (
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Running
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <BarChart3 className="w-4 h-4" />
            Total Runs
          </div>
          <p className="text-2xl font-bold" data-testid="text-total-runs">{runs.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Globe className="w-4 h-4" />
            Posts Found
          </div>
          <p className="text-2xl font-bold" data-testid="text-total-posts">{totalPosts}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <MessageSquare className="w-4 h-4" />
            Drafts Generated
          </div>
          <p className="text-2xl font-bold" data-testid="text-total-drafts">{totalDrafts}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <CheckCircle className="w-4 h-4" />
            Success Rate
          </div>
          <p className="text-2xl font-bold" data-testid="text-success-rate">
            {runs.length > 0 ? Math.round((completedRuns / runs.length) * 100) : 0}%
          </p>
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-sky-400" />
          Manual Search
        </h2>
        <p className="text-sm text-muted-foreground">
          Trigger a custom search or let the system use its rotation of 15 different queries
        </p>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Custom search query (optional)..."
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            className="flex-1 min-w-[200px]"
            data-testid="input-custom-query"
          />
          <Button
            onClick={() => {
              triggerMutation.mutate(customQuery || undefined);
              setCustomQuery("");
            }}
            disabled={triggerMutation.isPending || !!runningRun}
            data-testid="button-trigger-search"
          >
            {triggerMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {runningRun ? "Running..." : "Run Now"}
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold">Recent Runs</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/platform-promoter/status"] })}
            data-testid="button-refresh-runs"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <Card className="p-8 text-center">
            <Megaphone className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No promotion runs yet. Trigger one above or wait for the auto-scheduler.</p>
          </Card>
        ) : (
          runs.map((run) => {
            const isExpanded = expandedRunId === run.id;
            const results = parseResults(run.results);

            return (
              <Card key={run.id} className="overflow-visible" data-testid={`card-run-${run.id}`}>
                <button
                  className="w-full p-4 text-left hover-elevate rounded-md"
                  onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                  data-testid={`button-expand-run-${run.id}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge
                        variant="outline"
                        className={
                          run.status === "completed"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : run.status === "running"
                            ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }
                      >
                        {run.status === "running" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                        {run.status}
                      </Badge>
                      <span className="text-sm font-medium truncate">{run.searchQuery}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {run.postsFound !== null && (
                        <span>{run.postsFound} posts</span>
                      )}
                      {run.draftsGenerated !== null && (
                        <span>{run.draftsGenerated} drafts</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(run.startedAt).toLocaleDateString()}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {isExpanded && results.length > 0 && (
                  <div className="border-t px-4 pb-4 space-y-4 pt-4">
                    {results.map((post, idx) => {
                      const replyKey = `${run.id}-${idx}`;
                      const currentReply = editedReplies[replyKey] ?? post.draftReply;
                      return (
                        <Card key={idx} className="p-4 space-y-3" data-testid={`card-post-${run.id}-${idx}`}>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge variant="outline" className={getPlatformColor(post.platform)}>
                                  {post.platform}
                                </Badge>
                                {post.relevanceScore && (
                                  <Badge variant="outline" className="text-xs">
                                    {post.relevanceScore}% relevant
                                  </Badge>
                                )}
                                {post.postedDate && (
                                  <span className="text-xs text-muted-foreground">{post.postedDate}</span>
                                )}
                              </div>
                              <h4 className="font-medium text-sm">{post.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{post.snippet}</p>
                            </div>
                            {post.url && (
                              <a
                                href={post.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button variant="ghost" size="icon" data-testid={`button-open-post-${run.id}-${idx}`}>
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </a>
                            )}
                          </div>

                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Draft Reply:</p>
                            <Textarea
                              value={currentReply}
                              onChange={(e) =>
                                setEditedReplies((prev) => ({
                                  ...prev,
                                  [replyKey]: e.target.value,
                                }))
                              }
                              rows={4}
                              className="text-sm"
                              data-testid={`textarea-reply-${run.id}-${idx}`}
                            />
                            <div className="flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopy(currentReply, replyKey)}
                                data-testid={`button-copy-reply-${run.id}-${idx}`}
                              >
                                {copiedIdx === replyKey ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1 text-green-400" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copy Reply
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {isExpanded && run.errorMessage && (
                  <div className="border-t px-4 pb-4 pt-3">
                    <p className="text-sm text-red-400">{run.errorMessage}</p>
                  </div>
                )}

                {isExpanded && results.length === 0 && !run.errorMessage && run.status === "completed" && (
                  <div className="border-t px-4 pb-4 pt-3 text-center">
                    <p className="text-sm text-muted-foreground">No posts found for this query.</p>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
