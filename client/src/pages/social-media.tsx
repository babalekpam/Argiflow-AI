import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Share2,
  Plus,
  Trash2,
  Send,
  Clock,
  CheckCircle2,
  FileEdit,
  Users,
  CalendarClock,
  Globe,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SocialAccount = {
  id: string;
  platform: string;
  accountName: string;
  followers: number;
  connected: boolean;
};

type SocialPost = {
  id: string;
  content: string;
  platform: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
};

function PostStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; icon: any }> = {
    draft: { class: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: FileEdit },
    scheduled: { class: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
    published: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  };
  const s = styles[status] || styles.draft;
  const Icon = s.icon;
  return (
    <Badge className={s.class}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function CreatePostDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    content: "",
    platform: "all",
    status: "draft",
    scheduledAt: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/social/posts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      toast({ title: "Post created" });
      setOpen(false);
      setForm({ content: "", platform: "all", status: "draft", scheduledAt: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-post">
          <Plus className="w-4 h-4 mr-2" />
          Create Post
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-post">
        <DialogHeader>
          <DialogTitle>Create Social Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Content *</Label>
            <Textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="Write your post content..."
              rows={4}
              data-testid="input-post-content"
            />
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={form.platform} onValueChange={(v) => set("platform", v)}>
              <SelectTrigger data-testid="select-post-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="twitter">Twitter / X</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger data-testid="select-post-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.status === "scheduled" && (
            <div className="space-y-2">
              <Label>Schedule Date & Time</Label>
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => set("scheduledAt", e.target.value)}
                data-testid="input-post-schedule"
              />
            </div>
          )}
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                content: form.content,
                platform: form.platform,
                status: form.status,
                scheduledAt: form.scheduledAt || null,
              })
            }
            disabled={!form.content || mutation.isPending}
            data-testid="button-save-post"
          >
            {mutation.isPending ? "Creating..." : "Create Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SocialMediaPage() {
  const { toast } = useToast();

  const { data: accounts, isLoading: accountsLoading } = useQuery<SocialAccount[]>({
    queryKey: ["/api/social/accounts"],
  });

  const { data: posts, isLoading: postsLoading } = useQuery<SocialPost[]>({
    queryKey: ["/api/social/posts"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/social/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      toast({ title: "Post deleted" });
    },
  });

  const isLoading = accountsLoading || postsLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="social-media-loading">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const accountList = accounts || [];
  const postList = posts || [];

  return (
    <div className="p-6 space-y-6" data-testid="social-media-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Share2 className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Social Media</h1>
            <p className="text-sm text-muted-foreground">Manage your social media accounts and posts</p>
          </div>
        </div>
        <CreatePostDialog />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-accounts">{accountList.length}</p>
              <p className="text-sm text-muted-foreground">Connected Accounts</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-sky-500/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{postList.filter((p) => p.status === "published").length}</p>
              <p className="text-sm text-muted-foreground">Published Posts</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{postList.filter((p) => p.status === "scheduled").length}</p>
              <p className="text-sm text-muted-foreground">Scheduled</p>
            </div>
          </div>
        </Card>
      </div>

      {accountList.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Connected Accounts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {accountList.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center gap-3 p-3 rounded-md bg-background/50"
                data-testid={`card-social-account-${acc.id}`}
              >
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" data-testid={`text-account-name-${acc.id}`}>
                    {acc.accountName}
                  </p>
                  <p className="text-xs text-muted-foreground">{acc.platform} &middot; {acc.followers} followers</p>
                </div>
                <Badge
                  className={acc.connected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"}
                >
                  {acc.connected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {postList.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground" data-testid="text-empty-state">
            <Share2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium mb-1">No posts yet</p>
            <p className="text-sm">Create your first social media post to get started</p>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Posts</h3>
          <div className="space-y-3">
            {postList.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-4 p-4 rounded-md bg-background/50 flex-wrap"
                data-testid={`card-post-${post.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" data-testid={`text-post-content-${post.id}`}>
                    {post.content}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    <Badge variant="outline" className="text-xs">{post.platform}</Badge>
                    {post.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" />
                        {new Date(post.scheduledAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <PostStatusBadge status={post.status} />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(post.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-post-${post.id}`}
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}