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
  BookOpen,
  Plus,
  Trash2,
  Globe,
  FileText,
  Eye,
  PenLine,
  ExternalLink,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type BlogSite = {
  id: string;
  name: string;
  domain: string;
  description: string;
  postCount: number;
  status: string;
  createdAt: string;
};

type BlogPost = {
  id: string;
  siteId: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  author: string;
  publishedAt: string | null;
  createdAt: string;
};

function PostStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    published: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  return (
    <Badge className={styles[status] || styles.draft} data-testid={`badge-post-status-${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function CreateSiteDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    domain: "",
    description: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/blog/sites", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/sites"] });
      toast({ title: "Blog site created successfully" });
      setOpen(false);
      setForm({ name: "", domain: "", description: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-site">
          <Plus className="w-4 h-4 mr-2" />
          Create Site
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-site">
        <DialogHeader>
          <DialogTitle>Create Blog Site</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Site Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="My Company Blog"
              data-testid="input-site-name"
            />
          </div>
          <div>
            <Label>Domain *</Label>
            <Input
              value={form.domain}
              onChange={(e) => set("domain", e.target.value)}
              placeholder="blog.example.com"
              data-testid="input-site-domain"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="A blog about..."
              data-testid="input-site-description"
            />
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                name: form.name,
                domain: form.domain,
                description: form.description || null,
              })
            }
            disabled={!form.name || !form.domain || mutation.isPending}
            data-testid="button-submit-site"
          >
            {mutation.isPending ? "Creating..." : "Create Site"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreatePostDialog({ siteId }: { siteId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    status: "draft",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/blog/posts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog/sites"] });
      toast({ title: "Post created successfully" });
      setOpen(false);
      setForm({ title: "", slug: "", content: "", status: "draft" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`button-create-post-${siteId}`}>
          <PenLine className="w-3.5 h-3.5 mr-1.5" />
          New Post
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-create-post">
        <DialogHeader>
          <DialogTitle>Create Blog Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => {
                set("title", e.target.value);
                if (!form.slug) set("slug", generateSlug(e.target.value));
              }}
              placeholder="Getting Started with..."
              data-testid="input-post-title"
            />
          </div>
          <div>
            <Label>Slug *</Label>
            <Input
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="getting-started-with"
              data-testid="input-post-slug"
            />
          </div>
          <div>
            <Label>Content *</Label>
            <Textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="Write your blog post content..."
              className="min-h-[150px]"
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
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                siteId,
                title: form.title,
                slug: form.slug,
                content: form.content,
                status: form.status,
              })
            }
            disabled={!form.title || !form.slug || !form.content || mutation.isPending}
            data-testid="button-submit-post"
          >
            {mutation.isPending ? "Creating..." : "Create Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SiteCard({
  site,
  posts,
  onDeleteSite,
  onDeletePost,
}: {
  site: BlogSite;
  posts: BlogPost[];
  onDeleteSite: (id: string) => void;
  onDeletePost: (id: string) => void;
}) {
  const sitePosts = posts.filter((p) => p.siteId === site.id);
  const publishedCount = sitePosts.filter((p) => p.status === "published").length;

  return (
    <Card className="p-5" data-testid={`card-site-${site.id}`}>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate" data-testid={`text-site-name-${site.id}`}>{site.name}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              {site.domain}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            {sitePosts.length} posts
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Eye className="w-3 h-3 mr-1" />
            {publishedCount} published
          </Badge>
          <CreatePostDialog siteId={site.id} />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDeleteSite(site.id)}
            data-testid={`button-delete-site-${site.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {site.description && (
        <p className="text-sm text-muted-foreground mb-4">{site.description}</p>
      )}

      {sitePosts.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          {sitePosts.map((post) => (
            <div
              key={post.id}
              className="flex items-center justify-between gap-4 p-3 rounded-md bg-background/50 flex-wrap"
              data-testid={`post-${post.id}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" data-testid={`text-post-title-${post.id}`}>{post.title}</p>
                <p className="text-xs text-muted-foreground">/{post.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <PostStatusBadge status={post.status} />
                {post.publishedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.publishedAt).toLocaleDateString()}
                  </span>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDeletePost(post.id)}
                  data-testid={`button-delete-post-${post.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function BlogBuilderPage() {
  const { toast } = useToast();

  const { data: sites, isLoading: sitesLoading } = useQuery<BlogSite[]>({
    queryKey: ["/api/blog/sites"],
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog/posts"],
  });

  const deleteSiteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/blog/sites/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/sites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts"] });
      toast({ title: "Blog site deleted" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/blog/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog/sites"] });
      toast({ title: "Post deleted" });
    },
  });

  const isLoading = sitesLoading || postsLoading;
  const totalPosts = posts.length;
  const publishedPosts = posts.filter((p) => p.status === "published").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="blog-builder-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Blog Builder</h1>
            <p className="text-muted-foreground text-sm">Create and manage blog sites and posts</p>
          </div>
        </div>
        <CreateSiteDialog />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-sites">{(sites || []).length}</p>
              <p className="text-sm text-muted-foreground">Blog Sites</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-posts">{totalPosts}</p>
              <p className="text-sm text-muted-foreground">Total Posts</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-published-posts">{publishedPosts}</p>
              <p className="text-sm text-muted-foreground">Published</p>
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (sites || []).length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold mb-1">No blog sites yet</h3>
            <p className="text-sm">Create your first blog site to start publishing content.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {(sites || []).map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              posts={posts}
              onDeleteSite={(id) => deleteSiteMutation.mutate(id)}
              onDeletePost={(id) => deletePostMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
