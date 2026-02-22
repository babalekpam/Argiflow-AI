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
  Star,
  Plus,
  Trash2,
  MessageCircle,
  ThumbsUp,
  Send,
  Globe,
  Search,
  AlertTriangle,
  ExternalLink,
  Reply,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ReviewPlatform = {
  id: string;
  userId: string;
  name: string;
  platform: string;
  url: string | null;
  averageRating: number;
  totalReviews: number;
  isActive: boolean;
  createdAt: string;
};

type Review = {
  id: string;
  platformId: string;
  userId: string;
  reviewerName: string;
  rating: number;
  content: string | null;
  response: string | null;
  respondedAt: string | null;
  reviewDate: string | null;
  createdAt: string;
};

function StarRating({ rating, size = "sm", interactive, onRate }: {
  rating: number;
  size?: string;
  interactive?: boolean;
  onRate?: (r: number) => void;
}) {
  const sizeClass = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5" data-testid={`star-rating-${rating}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${sizeClass} ${i <= rating ? "text-amber-400 fill-amber-400" : "text-gray-600"} ${interactive ? "cursor-pointer" : ""}`}
          onClick={() => interactive && onRate?.(i)}
        />
      ))}
    </div>
  );
}

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google",
  yelp: "Yelp",
  trustpilot: "Trustpilot",
  facebook: "Facebook",
};

export default function ReputationPage() {
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState<"reviews" | "platforms">("reviews");
  const [ratingFilter, setRatingFilter] = useState<"all" | "positive" | "negative">("all");
  const [search, setSearch] = useState("");
  const [addPlatformOpen, setAddPlatformOpen] = useState(false);
  const [deletePlatformTarget, setDeletePlatformTarget] = useState<ReviewPlatform | null>(null);
  const [deleteReviewTarget, setDeleteReviewTarget] = useState<Review | null>(null);
  const [respondTarget, setRespondTarget] = useState<Review | null>(null);
  const [responseText, setResponseText] = useState("");

  const [platformForm, setPlatformForm] = useState({
    name: "",
    platform: "google",
    url: "",
  });

  const { data: platforms, isLoading: platformsLoading } = useQuery<ReviewPlatform[]>({
    queryKey: ["/api/reputation/platforms"],
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["/api/reputation/reviews"],
  });

  const addPlatformMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/reputation/platforms", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reputation/platforms"] });
      toast({ title: "Platform added" });
      setAddPlatformOpen(false);
      setPlatformForm({ name: "", platform: "google", url: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deletePlatformMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/reputation/platforms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reputation/platforms"] });
      toast({ title: "Platform removed" });
      setDeletePlatformTarget(null);
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/reputation/reviews/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reputation/reviews"] });
      toast({ title: "Review deleted" });
      setDeleteReviewTarget(null);
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      apiRequest("PATCH", `/api/reputation/reviews/${id}`, { response }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reputation/reviews"] });
      toast({ title: "Response sent" });
      setRespondTarget(null);
      setResponseText("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isLoading = platformsLoading || reviewsLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="reputation-loading">
        <Skeleton className="h-20 w-full" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const platformList = platforms || [];
  const reviewList = reviews || [];

  const avgRating = reviewList.length > 0
    ? Math.round((reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length) * 10) / 10
    : 0;
  const positiveCount = reviewList.filter((r) => r.rating >= 4).length;
  const respondedCount = reviewList.filter((r) => r.response).length;
  const responseRate = reviewList.length > 0 ? Math.round((respondedCount / reviewList.length) * 100) : 0;

  const filteredReviews = reviewList
    .filter((r) => {
      if (ratingFilter === "positive") return r.rating >= 4;
      if (ratingFilter === "negative") return r.rating <= 2;
      return true;
    })
    .filter((r) =>
      !search ||
      r.reviewerName.toLowerCase().includes(search.toLowerCase()) ||
      r.content?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="p-6 space-y-6" data-testid="reputation-page">
      <div className="rounded-md bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-500/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Reputation Management</h1>
              <p className="text-sm text-muted-foreground">Monitor, manage, and respond to reviews across all platforms</p>
            </div>
          </div>
          <Button onClick={() => setAddPlatformOpen(true)} data-testid="button-add-platform">
            <Plus className="w-4 h-4 mr-2" />
            Add Platform
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold" data-testid="text-avg-rating">{avgRating}</p>
                <StarRating rating={Math.round(avgRating)} />
              </div>
              <p className="text-sm text-muted-foreground">Avg Rating</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-reviews">{reviewList.length}</p>
              <p className="text-sm text-muted-foreground">Total Reviews</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <ThumbsUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-positive-count">{positiveCount}</p>
              <p className="text-sm text-muted-foreground">Positive (4-5)</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-sky-500/10 flex items-center justify-center">
              <Reply className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-response-rate">{responseRate}%</p>
              <p className="text-sm text-muted-foreground">Response Rate</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={mainTab === "reviews" ? "default" : "outline"}
          onClick={() => setMainTab("reviews")}
          data-testid="tab-reviews"
        >
          Reviews ({reviewList.length})
        </Button>
        <Button
          variant={mainTab === "platforms" ? "default" : "outline"}
          onClick={() => setMainTab("platforms")}
          data-testid="tab-platforms"
        >
          Platforms ({platformList.length})
        </Button>
      </div>

      {mainTab === "reviews" && (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                variant={ratingFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setRatingFilter("all")}
                data-testid="filter-all-reviews"
              >
                All
              </Button>
              <Button
                variant={ratingFilter === "positive" ? "default" : "outline"}
                size="sm"
                onClick={() => setRatingFilter("positive")}
                data-testid="filter-positive"
              >
                Positive (4-5)
              </Button>
              <Button
                variant={ratingFilter === "negative" ? "default" : "outline"}
                size="sm"
                onClick={() => setRatingFilter("negative")}
                data-testid="filter-negative"
              >
                Negative (1-2)
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
                data-testid="input-search-reviews"
              />
            </div>
          </div>

          {filteredReviews.length === 0 ? (
            <Card className="p-12">
              <div className="text-center" data-testid="text-empty-reviews">
                <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-1">No reviews yet</p>
                <p className="text-sm text-muted-foreground">Reviews from your connected platforms will appear here</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <Card key={review.id} className="p-5" data-testid={`card-review-${review.id}`}>
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium" data-testid={`text-reviewer-${review.id}`}>
                        {review.reviewerName}
                      </span>
                      <StarRating rating={review.rating} />
                      {review.reviewDate && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.reviewDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRespondTarget(review);
                          setResponseText(review.response || "");
                        }}
                        data-testid={`button-respond-${review.id}`}
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1" />
                        {review.response ? "Edit Response" : "Respond"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteReviewTarget(review)}
                        data-testid={`button-delete-review-${review.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  {review.content && (
                    <p className="text-sm text-muted-foreground mb-3" data-testid={`text-review-content-${review.id}`}>
                      {review.content}
                    </p>
                  )}

                  {review.response && (
                    <div className="p-3 rounded-md bg-primary/5 border border-primary/10">
                      <p className="text-xs font-medium text-primary mb-1">Your Response</p>
                      <p className="text-sm text-muted-foreground">{review.response}</p>
                      {review.respondedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Responded {new Date(review.respondedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {mainTab === "platforms" && (
        <>
          {platformList.length === 0 ? (
            <Card className="p-12">
              <div className="text-center" data-testid="text-empty-platforms">
                <Globe className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-1">No platforms connected</p>
                <p className="text-sm text-muted-foreground mb-4">Add your review platforms to start monitoring your reputation</p>
                <Button onClick={() => setAddPlatformOpen(true)} data-testid="button-add-first-platform">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Platform
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {platformList.map((plat) => (
                <Card key={plat.id} className="p-5" data-testid={`card-platform-${plat.id}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" data-testid={`text-platform-name-${plat.id}`}>
                        {plat.name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {PLATFORM_LABELS[plat.platform] || plat.platform}
                      </p>
                    </div>
                    <Badge
                      className={plat.isActive
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-gray-500/10 text-gray-400 border-gray-500/20"}
                    >
                      {plat.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <StarRating rating={Math.round(plat.averageRating)} />
                    <span className="text-sm font-medium">{plat.averageRating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">{plat.totalReviews} reviews</span>
                  </div>
                  <div className="flex items-center justify-between">
                    {plat.url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={plat.url} target="_blank" rel="noreferrer" data-testid={`link-platform-${plat.id}`}>
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          View
                        </a>
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeletePlatformTarget(plat)}
                      data-testid={`button-delete-platform-${plat.id}`}
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

      <Dialog open={addPlatformOpen} onOpenChange={setAddPlatformOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-add-platform">
          <DialogHeader>
            <DialogTitle>Add Review Platform</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Platform Name *</Label>
              <Input
                value={platformForm.name}
                onChange={(e) => setPlatformForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="My Google Business"
                data-testid="input-platform-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={platformForm.platform}
                onValueChange={(v) => setPlatformForm((f) => ({ ...f, platform: v }))}
              >
                <SelectTrigger data-testid="select-platform-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="yelp">Yelp</SelectItem>
                  <SelectItem value="trustpilot">Trustpilot</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Profile URL</Label>
              <Input
                value={platformForm.url}
                onChange={(e) => setPlatformForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://g.page/your-business"
                data-testid="input-platform-url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPlatformOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                addPlatformMutation.mutate({
                  name: platformForm.name,
                  platform: platformForm.platform,
                  url: platformForm.url || null,
                  averageRating: 0,
                  totalReviews: 0,
                  isActive: true,
                })
              }
              disabled={!platformForm.name || addPlatformMutation.isPending}
              data-testid="button-save-platform"
            >
              {addPlatformMutation.isPending ? "Adding..." : "Add Platform"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!respondTarget} onOpenChange={() => setRespondTarget(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-respond-review">
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-muted">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-medium text-sm">{respondTarget?.reviewerName}</span>
                {respondTarget && <StarRating rating={respondTarget.rating} />}
              </div>
              {respondTarget?.content && (
                <p className="text-sm text-muted-foreground">{respondTarget.content}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Your Response</Label>
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Thank you for your feedback..."
                rows={4}
                data-testid="input-review-response"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondTarget(null)}>Cancel</Button>
            <Button
              onClick={() =>
                respondTarget && respondMutation.mutate({ id: respondTarget.id, response: responseText })
              }
              disabled={!responseText || respondMutation.isPending}
              data-testid="button-save-response"
            >
              {respondMutation.isPending ? "Sending..." : "Send Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletePlatformTarget} onOpenChange={() => setDeletePlatformTarget(null)}>
        <DialogContent data-testid="dialog-delete-platform-confirmation">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove Platform
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove <strong>{deletePlatformTarget?.name}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePlatformTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletePlatformTarget && deletePlatformMutation.mutate(deletePlatformTarget.id)}
              disabled={deletePlatformMutation.isPending}
              data-testid="button-confirm-delete-platform"
            >
              {deletePlatformMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteReviewTarget} onOpenChange={() => setDeleteReviewTarget(null)}>
        <DialogContent data-testid="dialog-delete-review-confirmation">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Review
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this review by <strong>{deleteReviewTarget?.reviewerName}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteReviewTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteReviewTarget && deleteReviewMutation.mutate(deleteReviewTarget.id)}
              disabled={deleteReviewMutation.isPending}
              data-testid="button-confirm-delete-review"
            >
              {deleteReviewMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
