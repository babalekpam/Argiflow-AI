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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Plus,
  Trash2,
  Building2,
  Globe,
  FileText,
  CheckCircle2,
  Clock,
  Megaphone,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type GBPAccount = {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: string;
  category: string;
};

type GBPPost = {
  id: string;
  accountId: string;
  content: string;
  type: string;
  status: string;
  createdAt: string;
};

function PostStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; icon: any }> = {
    published: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    draft: { class: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: FileText },
    scheduled: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
  };
  const s = styles[status] || styles.draft;
  const Icon = s.icon;
  return (
    <Badge className={s.class} data-testid={`badge-post-status-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function CreatePostDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ content: "", type: "update", status: "draft" });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gbp/posts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gbp/posts"] });
      toast({ title: "Post created" });
      setOpen(false);
      setForm({ content: "", type: "update", status: "draft" });
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
          <DialogTitle>Create GBP Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Post Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger data-testid="select-post-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="product">Product</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Content *</Label>
            <Textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="Write your post content..."
              className="min-h-[120px]"
              data-testid="input-post-content"
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger data-testid="select-post-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate(form)}
            disabled={!form.content || mutation.isPending}
            data-testid="button-submit-post"
          >
            {mutation.isPending ? "Creating..." : "Create Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function GoogleBusinessPage() {
  const { toast } = useToast();

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<GBPAccount[]>({
    queryKey: ["/api/gbp/accounts"],
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<GBPPost[]>({
    queryKey: ["/api/gbp/posts"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/gbp/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gbp/posts"] });
      toast({ title: "Post deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isLoading = accountsLoading || postsLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="gbp-loading">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="gbp-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <MapPin className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Google Business Profile</h1>
            <p className="text-muted-foreground text-sm">Manage your Google Business profiles and posts</p>
          </div>
        </div>
        <CreatePostDialog />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-accounts">{accounts.length}</p>
              <p className="text-sm text-muted-foreground">Business Profiles</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-posts">{posts.length}</p>
              <p className="text-sm text-muted-foreground">Total Posts</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{posts.filter((p) => p.status === "published").length}</p>
              <p className="text-sm text-muted-foreground">Published</p>
            </div>
          </div>
        </Card>
      </div>

      {accounts.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Business Profiles</h3>
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-4 p-3 rounded-md bg-background/50" data-testid={`gbp-account-${acc.id}`}>
                <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" data-testid={`text-account-name-${acc.id}`}>{acc.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {acc.address && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {acc.address}
                      </span>
                    )}
                    {acc.category && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Globe className="w-3 h-3" />
                        {acc.category}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  {acc.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-semibold mb-4" data-testid="text-posts-section">Posts</h3>
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm" data-testid="text-no-posts">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No posts yet. Create your first GBP post.
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="flex items-center gap-4 p-3 rounded-md bg-background/50" data-testid={`gbp-post-${post.id}`}>
                <Megaphone className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                    </Badge>
                    <PostStatusBadge status={post.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate" data-testid={`text-post-content-${post.id}`}>{post.content}</p>
                  {post.createdAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
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
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
