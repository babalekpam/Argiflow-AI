import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  Plus,
  Trash2,
  Globe,
  FileText,
  Eye,
  PenLine,
  ExternalLink,
  Search,
  Image,
  Tag,
  Palette,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type BlogSite = {
  id: string;
  userId: string;
  name: string;
  domain: string;
  description: string | null;
  theme: string | null;
  isActive: boolean;
  createdAt: string;
};

type BlogPost = {
  id: string;
  siteId: string;
  userId: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  coverImage: string | null;
  tags: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return tags.split(",").map((t) => t.trim()).filter(Boolean);
  }
}

function CreateSiteDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    domain: "",
    description: "",
    theme: "default",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/blog/sites", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/sites"] });
      toast({ title: "Blog site created successfully" });
      setOpen(false);
      setForm({ name: "", domain: "", description: "", theme: "default" });
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
          <div>
            <Label>Theme</Label>
            <Select value={form.theme} onValueChange={(v) => set("theme", v)}>
              <SelectTrigger data-testid="select-site-theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                name: form.name,
                domain: form.domain,
                description: form.description || null,
                theme: form.theme,
                isActive: true,
              })
            }
            disabled={!form.name.trim() || !form.domain.trim() || mutation.isPending}
            data-testid="button-submit-site"
          >
            {mutation.isPending ? "Creating..." : "Create Site"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreatePostDialog({ siteId, siteName }: { siteId: string; siteName: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    coverImage: "",
    tags: "",
    status: "draft",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/blog/posts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog/sites"] });
      toast({ title: "Post created successfully" });
      setOpen(false);
      setForm({ title: "", slug: "", content: "", excerpt: "", coverImage: "", tags: "", status: "draft" });
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-create-post">
        <DialogHeader>
          <DialogTitle>New Post for {siteName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
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
            <div className="col-span-2">
              <Label>Slug *</Label>
              <Input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="getting-started-with"
                data-testid="input-post-slug"
              />
            </div>
          </div>
          <div>
            <Label>Excerpt</Label>
            <Textarea
              value={form.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              placeholder="Brief summary of this post..."
              data-testid="input-post-excerpt"
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
            <Label>Cover Image URL</Label>
            <Input
              value={form.coverImage}
              onChange={(e) => set("coverImage", e.target.value)}
              placeholder="https://example.com/image.jpg"
              data-testid="input-post-cover-image"
            />
          </div>
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="marketing, tips, guide"
              data-testid="input-post-tags"
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
            onClick={() => {
              const tagsArray = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
              mutation.mutate({
                siteId,
                title: form.title,
                slug: form.slug,
                content: form.content || null,
                excerpt: form.excerpt || null,
                coverImage: form.coverImage || null,
                tags: tagsArray.length > 0 ? JSON.stringify(tagsArray) : null,
                status: form.status,
              });
            }}
            disabled={!form.title.trim() || !form.slug.trim() || mutation.isPending}
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
  onTogglePostStatus,
}: {
  site: BlogSite;
  posts: BlogPost[];
  onDeleteSite: (id: string) => void;
  onDeletePost: (id: string) => void;
  onTogglePostStatus: (id: string, status: string) => void;
}) {
  const sitePosts = posts.filter((p) => p.siteId === site.id);
  const publishedCount = sitePosts.filter((p) => p.status === "published").length;

  return (
    <Card className="p-5" data-testid={`card-site-${site.id}`}>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-orange-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate" data-testid={`text-site-name-${site.id}`}>{site.name}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                {site.domain}
              </span>
              {site.theme && (
                <span className="flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  {site.theme}
                </span>
              )}
            </div>
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
          <Badge className={site.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}>
            {site.isActive ? "Active" : "Inactive"}
          </Badge>
          <CreatePostDialog siteId={site.id} siteName={site.name} />
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
        <div className="border-t pt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sitePosts.map((post) => {
                const tags = parseTags(post.tags);
                return (
                  <TableRow key={post.id} data-testid={`row-post-${post.id}`}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]" data-testid={`text-post-title-${post.id}`}>{post.title}</p>
                        {post.excerpt && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{post.excerpt}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">/{post.slug}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {tags.slice(0, 2).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5">
                            {tag}
                          </Badge>
                        ))}
                        {tags.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{tags.length - 2}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PostStatusBadge status={post.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString()
                        : new Date(post.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onTogglePostStatus(post.id, post.status === "draft" ? "published" : "draft")}
                          title={post.status === "draft" ? "Publish" : "Unpublish"}
                          data-testid={`button-toggle-status-${post.id}`}
                        >
                          {post.status === "draft" ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <PenLine className="w-3.5 h-3.5 text-amber-400" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDeletePost(post.id)}
                          data-testid={`button-delete-post-${post.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

export default function BlogBuilderPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("sites");
  const [search, setSearch] = useState("");

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

  const togglePostStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/blog/posts/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog/posts"] });
      toast({ title: "Post status updated" });
    },
  });

  const isLoading = sitesLoading || postsLoading;
  const allSites = sites || [];
  const totalPosts = posts.length;
  const publishedPosts = posts.filter((p) => p.status === "published").length;
  const draftPosts = posts.filter((p) => p.status === "draft").length;

  const filteredSites = allSites.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.domain.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPosts = posts.filter((p) => {
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase());
    if (activeTab === "published") return matchesSearch && p.status === "published";
    if (activeTab === "drafts") return matchesSearch && p.status === "draft";
    if (activeTab === "all-posts") return matchesSearch;
    return matchesSearch;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="blog-builder-page">
      <div className="rounded-md bg-gradient-to-r from-orange-500/10 via-red-500/10 to-pink-500/10 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-gradient-to-br from-orange-500/30 to-red-500/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Blog CMS</h1>
              <p className="text-muted-foreground text-sm">Manage your blog sites, create and publish posts</p>
            </div>
          </div>
          <CreateSiteDialog />
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-orange-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-sites">{allSites.length}</p>
              <p className="text-sm text-muted-foreground">Sites</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-red-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-posts">{totalPosts}</p>
              <p className="text-sm text-muted-foreground">Total Posts</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-published-posts">{publishedPosts}</p>
              <p className="text-sm text-muted-foreground">Published</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center">
              <PenLine className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-draft-posts">{draftPosts}</p>
              <p className="text-sm text-muted-foreground">Drafts</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-filter">
            <TabsTrigger value="sites" data-testid="tab-sites">Sites</TabsTrigger>
            <TabsTrigger value="all-posts" data-testid="tab-all-posts">All Posts</TabsTrigger>
            <TabsTrigger value="published" data-testid="tab-published">Published</TabsTrigger>
            <TabsTrigger value="drafts" data-testid="tab-drafts">Drafts</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 w-64"
            placeholder={activeTab === "sites" ? "Search sites..." : "Search posts..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : activeTab === "sites" ? (
        filteredSites.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-semibold mb-1">No blog sites yet</h3>
              <p className="text-sm">Create your first blog site to start publishing content.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSites.map((site) => (
              <SiteCard
                key={site.id}
                site={site}
                posts={posts}
                onDeleteSite={(id) => deleteSiteMutation.mutate(id)}
                onDeletePost={(id) => deletePostMutation.mutate(id)}
                onTogglePostStatus={(id, status) => togglePostStatusMutation.mutate({ id, status })}
              />
            ))}
          </div>
        )
      ) : (
        filteredPosts.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-semibold mb-1">No posts found</h3>
              <p className="text-sm">
                {posts.length === 0
                  ? "Create a blog site first, then add posts to it."
                  : "No posts match your current filters."}
              </p>
            </div>
          </Card>
        ) : (
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Excerpt</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.map((post) => {
                  const tags = parseTags(post.tags);
                  return (
                    <TableRow key={post.id} data-testid={`row-post-list-${post.id}`}>
                      <TableCell>
                        <p className="text-sm font-medium truncate max-w-[200px]">{post.title}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">/{post.slug}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{post.excerpt || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {tags.slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5">{tag}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <PostStatusBadge status={post.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : new Date(post.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => togglePostStatusMutation.mutate({ id: post.id, status: post.status === "draft" ? "published" : "draft" })}
                            data-testid={`button-toggle-list-${post.id}`}
                          >
                            {post.status === "draft" ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <PenLine className="w-3.5 h-3.5 text-amber-400" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deletePostMutation.mutate(post.id)} data-testid={`button-delete-list-${post.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )
      )}
    </div>
  );
}
