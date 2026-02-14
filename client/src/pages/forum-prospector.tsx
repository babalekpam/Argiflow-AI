import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  ExternalLink,
  Copy,
  CheckCircle,
  MessageSquare,
  Globe,
  Loader2,
  Sparkles,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

interface ForumPost {
  title: string;
  url: string;
  platform: string;
  snippet: string;
  postedDate?: string;
  relevanceScore?: number;
  draftReply: string;
}

export default function ForumProspectorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [editedReplies, setEditedReplies] = useState<Record<number, string>>({});

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest("POST", "/api/forum-prospector/search", {
        query: query || undefined,
        industry: (user as any)?.industry || "medical billing",
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPosts(data.posts || []);
      setEditedReplies({});
      if (!data.posts?.length) {
        toast({
          title: "No posts found",
          description: data.message || "Try a different search query.",
          variant: "destructive",
        });
      } else {
        toast({
          title: `Found ${data.posts.length} discussions`,
          description: "AI has drafted replies for each post. Review and copy them!",
        });
      }
    },
    onError: () => {
      toast({
        title: "Search failed",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast({ title: "Copied!", description: "Reply copied to clipboard. Go paste it on the forum!" });
    setTimeout(() => setCopiedIdx(null), 3000);
  };

  const getReplyText = (idx: number, defaultReply: string) => {
    return editedReplies[idx] !== undefined ? editedReplies[idx] : defaultReply;
  };

  const platformColor = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes("reddit")) return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    if (p.includes("quora")) return "bg-red-500/10 text-red-400 border-red-500/20";
    if (p.includes("facebook")) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (p.includes("linkedin")) return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    return "bg-primary/10 text-primary border-primary/20";
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-forum-title">
          <MessageSquare className="w-6 h-6 text-primary" />
          Forum Prospector
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Find people looking for your services on forums and get AI-drafted replies ready to post.
        </p>
      </div>

      <Card className="p-5" data-testid="card-forum-search">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Search className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Search Forums & Communities</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Search for people asking about your services on Reddit, Quora, Facebook groups, and other communities.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='e.g. "need help with medical billing" or "looking for billing company"'
            onKeyDown={(e) => {
              if (e.key === "Enter" && !searchMutation.isPending) {
                searchMutation.mutate(searchQuery);
              }
            }}
            data-testid="input-forum-search"
          />
          <Button
            onClick={() => searchMutation.mutate(searchQuery)}
            disabled={searchMutation.isPending}
            data-testid="button-forum-search"
          >
            {searchMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Search className="w-4 h-4 mr-1.5" />
            )}
            {searchMutation.isPending ? "Searching..." : "Find Posts"}
          </Button>
        </div>
        {searchMutation.isPending && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-primary" />
              AI is searching forums and drafting replies... This may take 30-60 seconds.
            </p>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-md" />
              ))}
            </div>
          </div>
        )}
      </Card>

      {posts.length > 0 && !searchMutation.isPending && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {posts.length} Forum Discussions Found
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => searchMutation.mutate(searchQuery)}
              disabled={searchMutation.isPending}
              data-testid="button-forum-refresh"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Search Again
            </Button>
          </div>

          {posts.map((post, idx) => (
            <Card key={idx} className="p-5" data-testid={`card-forum-post-${idx}`}>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={platformColor(post.platform)} data-testid={`badge-forum-platform-${idx}`}>
                        {post.platform}
                      </Badge>
                      {post.relevanceScore && post.relevanceScore >= 7 && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" data-testid={`badge-forum-match-${idx}`}>
                          High Match
                        </Badge>
                      )}
                      {post.postedDate && (
                        <span className="text-xs text-muted-foreground" data-testid={`text-forum-date-${idx}`}>{post.postedDate}</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm" data-testid={`text-forum-title-${idx}`}>{post.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`text-forum-snippet-${idx}`}>{post.snippet}</p>
                  </div>
                  {post.url && post.url.startsWith("http") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(post.url, "_blank")}
                      data-testid={`button-forum-visit-${idx}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Visit Post
                    </Button>
                  )}
                </div>

                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      AI-Drafted Reply
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Edit if needed, then copy & paste on the forum</span>
                  </div>
                  <Textarea
                    value={getReplyText(idx, post.draftReply)}
                    onChange={(e) => setEditedReplies({ ...editedReplies, [idx]: e.target.value })}
                    className="resize-none min-h-[80px] text-sm"
                    data-testid={`textarea-forum-reply-${idx}`}
                  />
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => handleCopy(getReplyText(idx, post.draftReply), idx)}
                      data-testid={`button-forum-copy-${idx}`}
                    >
                      {copiedIdx === idx ? (
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      {copiedIdx === idx ? "Copied!" : "Copy Reply"}
                    </Button>
                    {post.url && post.url.startsWith("http") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleCopy(getReplyText(idx, post.draftReply), idx);
                          setTimeout(() => window.open(post.url, "_blank"), 500);
                        }}
                        data-testid={`button-forum-copy-visit-${idx}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Copy & Visit Post
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {posts.length === 0 && !searchMutation.isPending && (
        <Card className="p-8 text-center" data-testid="card-forum-empty">
          <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-semibold text-sm mb-1">Ready to Find Leads on Forums</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Click "Find Posts" to search for people discussing medical billing needs on Reddit, Quora, Facebook groups, and other online communities. The AI will draft helpful replies you can copy and post.
          </p>
        </Card>
      )}
    </div>
  );
}
