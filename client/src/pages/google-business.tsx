import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Search,
  BadgeCheck,
  Phone,
  Tag,
  ExternalLink,
  Image,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type GBPAccount = {
  id: string;
  userId: string;
  businessName: string;
  address: string;
  phone: string;
  category: string;
  placeId: string;
  isVerified: boolean;
  createdAt: string;
};

type GBPPost = {
  id: string;
  accountId: string;
  userId: string;
  type: string;
  content: string;
  imageUrl: string;
  callToAction: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
};

function PostTypeBadge({ type }: { type: string }) {
  const styles: Record<string, { class: string; icon: typeof Megaphone }> = {
    update: { class: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Megaphone },
    offer: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: Tag },
    event: { class: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Clock },
  };
  const s = styles[type] || styles.update;
  const Icon = s.icon;
  return (
    <Badge className={s.class} data-testid={`badge-post-type-${type}`}>
      <Icon className="w-3 h-3 mr-1" />
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  );
}

function PostStatusBadge({ status }: { status: string }) {
  const styles: Record<string, { class: string; icon: typeof FileText }> = {
    published: { class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    draft: { class: "bg-gray-500/10 text-gray-400 border-gray-500/20", icon: FileText },
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

function CreatePostDialog({ accounts }: { accounts: GBPAccount[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    accountId: "",
    type: "update",
    content: "",
    callToAction: "",
    imageUrl: "",
    status: "draft",
  });

  const mutation = useMutation({
    mutationFn: (data: {
      accountId: string;
      type: string;
      content: string;
      callToAction: string;
      imageUrl: string;
      status: string;
    }) => apiRequest("POST", "/api/gbp/posts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gbp/posts"] });
      toast({ title: "Post created" });
      setOpen(false);
      setForm({ accountId: "", type: "update", content: "", callToAction: "", imageUrl: "", status: "draft" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create post", description: err.message, variant: "destructive" });
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
            <Label>Business Profile *</Label>
            <Select value={form.accountId} onValueChange={(v) => set("accountId", v)}>
              <SelectTrigger data-testid="select-post-account">
                <SelectValue placeholder="Select business" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={String(acc.id)}>
                    {acc.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <Label>Call to Action</Label>
            <Input
              value={form.callToAction}
              onChange={(e) => set("callToAction", e.target.value)}
              placeholder="Learn More, Book Now, Call Us..."
              data-testid="input-post-cta"
            />
          </div>
          <div>
            <Label>Image URL</Label>
            <Input
              value={form.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
              placeholder="https://example.com/image.jpg"
              data-testid="input-post-image"
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
                accountId: form.accountId,
                type: form.type,
                content: form.content,
                callToAction: form.callToAction,
                imageUrl: form.imageUrl,
                status: form.status,
              })
            }
            disabled={!form.accountId || !form.content || mutation.isPending}
            data-testid="button-submit-post"
          >
            <Megaphone className="w-4 h-4 mr-2" />
            {mutation.isPending ? "Creating..." : "Create Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function GoogleBusinessPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("profiles");

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<GBPAccount[]>({
    queryKey: ["/api/gbp/accounts"],
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<GBPPost[]>({
    queryKey: ["/api/gbp/posts"],
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/gbp/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gbp/posts"] });
      toast({ title: "Post deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/gbp/posts/${id}`, { status: "published" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gbp/posts"] });
      toast({ title: "Post published" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isLoading = accountsLoading || postsLoading;
  const verifiedCount = accounts.filter((a) => a.isVerified).length;
  const publishedCount = posts.filter((p) => p.status === "published").length;

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="gbp-loading">
        <Skeleton className="h-24 w-full rounded-md" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="gbp-page">
      <div className="rounded-md bg-gradient-to-r from-blue-600/20 via-green-500/10 to-transparent p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-blue-500/20 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">
                Google Business Profile
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage your business profiles and publish updates
              </p>
            </div>
          </div>
          <CreatePostDialog accounts={accounts} />
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-profiles">{accounts.length}</p>
              <p className="text-sm text-muted-foreground">Business Profiles</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <BadgeCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-verified-count">{verifiedCount}</p>
              <p className="text-sm text-muted-foreground">Verified</p>
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
            <div className="w-10 h-10 rounded-md bg-cyan-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-published-count">{publishedCount}</p>
              <p className="text-sm text-muted-foreground">Published</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-gbp-filter">
            <TabsTrigger value="profiles" data-testid="tab-profiles">Profiles</TabsTrigger>
            <TabsTrigger value="posts" data-testid="tab-posts">Posts</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === "profiles" ? "Search businesses..." : "Search posts..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-gbp"
          />
        </div>
      </div>

      {activeTab === "profiles" && (
        <div className="space-y-3">
          {accounts.length === 0 ? (
            <Card className="p-5">
              <div className="text-center py-12 text-muted-foreground text-sm" data-testid="text-no-profiles">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No business profiles found</p>
                <p className="text-xs mt-1">Connect your Google Business Profile to get started.</p>
              </div>
            </Card>
          ) : (
            accounts
              .filter(
                (acc) =>
                  !searchQuery ||
                  acc.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (acc.address && acc.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (acc.category && acc.category.toLowerCase().includes(searchQuery.toLowerCase()))
              )
              .map((acc) => (
                <Card key={acc.id} className="p-5" data-testid={`gbp-account-${acc.id}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold" data-testid={`text-business-name-${acc.id}`}>
                          {acc.businessName}
                        </h4>
                        {acc.isVerified ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            <BadgeCheck className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                            <Clock className="w-3 h-3 mr-1" />
                            Unverified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        {acc.address && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {acc.address}
                          </span>
                        )}
                        {acc.phone && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3 shrink-0" />
                            {acc.phone}
                          </span>
                        )}
                        {acc.category && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Tag className="w-3 h-3 shrink-0" />
                            {acc.category}
                          </span>
                        )}
                        {acc.placeId && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Globe className="w-3 h-3 shrink-0" />
                            Place ID: {acc.placeId}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Connected: {new Date(acc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
          )}
        </div>
      )}

      {activeTab === "posts" && (
        <div className="space-y-3">
          {posts.length === 0 ? (
            <Card className="p-5">
              <div className="text-center py-12 text-muted-foreground text-sm" data-testid="text-no-posts">
                <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No posts yet</p>
                <p className="text-xs mt-1">Create your first GBP post to engage customers.</p>
              </div>
            </Card>
          ) : (
            posts
              .filter(
                (post) =>
                  !searchQuery ||
                  post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (post.callToAction && post.callToAction.toLowerCase().includes(searchQuery.toLowerCase()))
              )
              .map((post) => {
                const account = accountMap.get(post.accountId);
                return (
                  <Card key={post.id} className="p-5" data-testid={`gbp-post-${post.id}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <PostTypeBadge type={post.type} />
                          <PostStatusBadge status={post.status} />
                          {account && (
                            <span className="text-xs text-muted-foreground">
                              {account.businessName}
                            </span>
                          )}
                        </div>
                        <p className="text-sm mt-2" data-testid={`text-post-content-${post.id}`}>
                          {post.content}
                        </p>
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          {post.callToAction && (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              CTA: {post.callToAction}
                            </span>
                          )}
                          {post.imageUrl && (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Image className="w-3 h-3 shrink-0" />
                              Has image
                            </span>
                          )}
                          {post.publishedAt && (
                            <span className="text-xs text-muted-foreground">
                              Published: {new Date(post.publishedAt).toLocaleDateString()}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Created: {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {post.status === "draft" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => publishMutation.mutate(post.id)}
                            disabled={publishMutation.isPending}
                            data-testid={`button-publish-post-${post.id}`}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Publish
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deletePostMutation.mutate(post.id)}
                          disabled={deletePostMutation.isPending}
                          data-testid={`button-delete-post-${post.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}
