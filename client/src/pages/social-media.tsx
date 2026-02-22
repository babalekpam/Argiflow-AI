import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
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
  Share2,
  Plus,
  Trash2,
  Send,
  Clock,
  CheckCircle2,
  FileEdit,
  CalendarClock,
  Globe,
  Search,
  AlertTriangle,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  Video,
  Users,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function safeJsonParse(val: string | null | undefined, fallback: any = []) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

type SocialAccount = {
  id: string;
  userId: string;
  platform: string;
  accountName: string;
  accountId: string | null;
  profileImage: string | null;
  isActive: boolean;
  createdAt: string;
};

type SocialPost = {
  id: string;
  userId: string;
  content: string;
  mediaUrls: string | null;
  platforms: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  status: string;
  createdAt: string;
};

const PLATFORM_ICONS: Record<string, any> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  tiktok: Video,
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "text-blue-500",
  instagram: "text-pink-500",
  twitter: "text-sky-500",
  linkedin: "text-blue-600",
  tiktok: "text-rose-500",
};

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = PLATFORM_ICONS[platform] || Globe;
  const color = PLATFORM_COLORS[platform] || "text-muted-foreground";
  return <Icon className={`${className || "w-4 h-4"} ${color}`} />;
}

function PostStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { cls: string; icon: any }> = {
    draft: { cls: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: FileEdit },
    scheduled: { cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
    published: { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  };
  const s = styles[status] || styles.draft;
  const Icon = s.icon;
  return (
    <Badge className={s.cls} data-testid={`badge-post-status-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function SocialMediaPage() {
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState<"posts" | "accounts">("posts");
  const [postFilter, setPostFilter] = useState<"all" | "draft" | "scheduled" | "published">("all");
  const [search, setSearch] = useState("");
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [deletePostTarget, setDeletePostTarget] = useState<SocialPost | null>(null);
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<SocialAccount | null>(null);

  const [postForm, setPostForm] = useState({
    content: "",
    platforms: [] as string[],
    status: "draft",
    scheduledAt: "",
  });

  const [accountForm, setAccountForm] = useState({
    platform: "facebook",
    accountName: "",
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery<SocialAccount[]>({
    queryKey: ["/api/social/accounts"],
  });

  const { data: posts, isLoading: postsLoading } = useQuery<SocialPost[]>({
    queryKey: ["/api/social/posts"],
  });

  const createPostMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/social/posts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      toast({ title: "Post created" });
      setCreatePostOpen(false);
      setPostForm({ content: "", platforms: [], status: "draft", scheduledAt: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/social/accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/accounts"] });
      toast({ title: "Account connected" });
      setCreateAccountOpen(false);
      setAccountForm({ platform: "facebook", accountName: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/social/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      toast({ title: "Post deleted" });
      setDeletePostTarget(null);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/social/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/accounts"] });
      toast({ title: "Account removed" });
      setDeleteAccountTarget(null);
    },
  });

  const togglePlatform = (platform: string) => {
    setPostForm((f) => ({
      ...f,
      platforms: f.platforms.includes(platform)
        ? f.platforms.filter((p) => p !== platform)
        : [...f.platforms, platform],
    }));
  };

  const isLoading = accountsLoading || postsLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="social-media-loading">
        <Skeleton className="h-20 w-full" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const accountList = accounts || [];
  const postList = posts || [];
  const filteredPosts = postList
    .filter((p) => postFilter === "all" || p.status === postFilter)
    .filter((p) => !search || p.content.toLowerCase().includes(search.toLowerCase()));

  const publishedCount = postList.filter((p) => p.status === "published").length;
  const scheduledCount = postList.filter((p) => p.status === "scheduled").length;
  const activeAccounts = accountList.filter((a) => a.isActive).length;

  const postTabs = [
    { key: "all", label: "All", count: postList.length },
    { key: "draft", label: "Draft", count: postList.filter((p) => p.status === "draft").length },
    { key: "scheduled", label: "Scheduled", count: scheduledCount },
    { key: "published", label: "Published", count: publishedCount },
  ] as const;

  return (
    <div className="p-6 space-y-6" data-testid="social-media-page">
      <div className="rounded-md bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-transparent p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-pink-500/20 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Social Media Management</h1>
              <p className="text-sm text-muted-foreground">Schedule posts, manage accounts, and grow your social presence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCreateAccountOpen(true)} data-testid="button-connect-account">
              <Users className="w-4 h-4 mr-2" />
              Connect Account
            </Button>
            <Button onClick={() => setCreatePostOpen(true)} data-testid="button-create-post">
              <Plus className="w-4 h-4 mr-2" />
              Create Post
            </Button>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-accounts">{activeAccounts}</p>
              <p className="text-sm text-muted-foreground">Active Accounts</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-sky-500/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-published-posts">{publishedCount}</p>
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
              <p className="text-2xl font-bold" data-testid="text-scheduled-posts">{scheduledCount}</p>
              <p className="text-sm text-muted-foreground">Scheduled</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-purple-500/10 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-posts">{postList.length}</p>
              <p className="text-sm text-muted-foreground">Total Posts</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={mainTab === "posts" ? "default" : "outline"}
          onClick={() => setMainTab("posts")}
          data-testid="tab-posts"
        >
          Posts ({postList.length})
        </Button>
        <Button
          variant={mainTab === "accounts" ? "default" : "outline"}
          onClick={() => setMainTab("accounts")}
          data-testid="tab-accounts"
        >
          Accounts ({accountList.length})
        </Button>
      </div>

      {mainTab === "posts" && (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {postTabs.map((t) => (
                <Button
                  key={t.key}
                  variant={postFilter === t.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPostFilter(t.key)}
                  data-testid={`filter-${t.key}`}
                >
                  {t.label} ({t.count})
                </Button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
                data-testid="input-search-posts"
              />
            </div>
          </div>

          {filteredPosts.length === 0 ? (
            <Card className="p-12">
              <div className="text-center" data-testid="text-empty-posts">
                <Share2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-1">No posts yet</p>
                <p className="text-sm text-muted-foreground mb-4">Create your first social media post to get started</p>
                <Button onClick={() => setCreatePostOpen(true)} data-testid="button-create-first-post">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Post
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <Table data-testid="table-posts">
                <TableHeader>
                  <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead>Platforms</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPosts.map((post) => (
                    <TableRow key={post.id} data-testid={`row-post-${post.id}`}>
                      <TableCell className="max-w-xs">
                        <p className="text-sm truncate" data-testid={`text-post-content-${post.id}`}>
                          {post.content}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {safeJsonParse(post.platforms).map((p: string) => (
                            <PlatformIcon key={p} platform={p} className="w-4 h-4" />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell><PostStatusBadge status={post.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : "--"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletePostTarget(post)}
                            data-testid={`button-delete-post-${post.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}

      {mainTab === "accounts" && (
        <>
          {accountList.length === 0 ? (
            <Card className="p-12">
              <div className="text-center" data-testid="text-empty-accounts">
                <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-1">No accounts connected</p>
                <p className="text-sm text-muted-foreground mb-4">Connect your social media accounts to start managing them</p>
                <Button onClick={() => setCreateAccountOpen(true)} data-testid="button-connect-first-account">
                  <Plus className="w-4 h-4 mr-2" />
                  Connect Account
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accountList.map((acc) => (
                <Card key={acc.id} className="p-5" data-testid={`card-account-${acc.id}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                      <PlatformIcon platform={acc.platform} className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" data-testid={`text-account-name-${acc.id}`}>{acc.accountName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{acc.platform}</p>
                    </div>
                    <Badge
                      className={acc.isActive
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-gray-500/10 text-gray-400 border-gray-500/20"}
                    >
                      {acc.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteAccountTarget(acc)}
                      data-testid={`button-delete-account-${acc.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={createPostOpen} onOpenChange={setCreatePostOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-create-post">
          <DialogHeader>
            <DialogTitle>Create Social Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                value={postForm.content}
                onChange={(e) => setPostForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Write your post content..."
                rows={4}
                data-testid="input-post-content"
              />
            </div>
            <div className="space-y-2">
              <Label>Platforms</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {["facebook", "instagram", "twitter", "linkedin", "tiktok"].map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={postForm.platforms.includes(p) ? "default" : "outline"}
                    onClick={() => togglePlatform(p)}
                    className="toggle-elevate"
                    data-testid={`toggle-platform-${p}`}
                  >
                    <PlatformIcon platform={p} className="w-4 h-4 mr-1" />
                    <span className="capitalize">{p}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={postForm.status}
                onValueChange={(v) => setPostForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger data-testid="select-post-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {postForm.status === "scheduled" && (
              <div className="space-y-2">
                <Label>Schedule Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={postForm.scheduledAt}
                  onChange={(e) => setPostForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  data-testid="input-post-schedule"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePostOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createPostMutation.mutate({
                  content: postForm.content,
                  platforms: JSON.stringify(postForm.platforms),
                  status: postForm.status,
                  scheduledAt: postForm.scheduledAt || null,
                })
              }
              disabled={!postForm.content || postForm.platforms.length === 0 || createPostMutation.isPending}
              data-testid="button-save-post"
            >
              {createPostMutation.isPending ? "Creating..." : "Create Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createAccountOpen} onOpenChange={setCreateAccountOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-connect-account">
          <DialogHeader>
            <DialogTitle>Connect Social Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={accountForm.platform}
                onValueChange={(v) => setAccountForm((f) => ({ ...f, platform: v }))}
              >
                <SelectTrigger data-testid="select-account-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="twitter">Twitter / X</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input
                value={accountForm.accountName}
                onChange={(e) => setAccountForm((f) => ({ ...f, accountName: e.target.value }))}
                placeholder="@yourbusiness"
                data-testid="input-account-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateAccountOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createAccountMutation.mutate({
                  platform: accountForm.platform,
                  accountName: accountForm.accountName,
                  isActive: true,
                })
              }
              disabled={!accountForm.accountName || createAccountMutation.isPending}
              data-testid="button-save-account"
            >
              {createAccountMutation.isPending ? "Connecting..." : "Connect Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletePostTarget} onOpenChange={() => setDeletePostTarget(null)}>
        <DialogContent data-testid="dialog-delete-post-confirmation">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Post
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this post?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePostTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletePostTarget && deletePostMutation.mutate(deletePostTarget.id)}
              disabled={deletePostMutation.isPending}
              data-testid="button-confirm-delete-post"
            >
              {deletePostMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteAccountTarget} onOpenChange={() => setDeleteAccountTarget(null)}>
        <DialogContent data-testid="dialog-delete-account-confirmation">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove Account
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove <strong>{deleteAccountTarget?.accountName}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAccountTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccountTarget && deleteAccountMutation.mutate(deleteAccountTarget.id)}
              disabled={deleteAccountMutation.isPending}
              data-testid="button-confirm-delete-account"
            >
              {deleteAccountMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
