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
  Star,
  Plus,
  Trash2,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Send,
  Globe,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ReviewPlatform = {
  id: string;
  name: string;
  url: string;
  averageRating: number;
  totalReviews: number;
  connected: boolean;
};

type Review = {
  id: string;
  platform: string;
  author: string;
  rating: number;
  content: string;
  response: string | null;
  createdAt: string;
};

function StarRating({ rating, size = "sm" }: { rating: number; size?: string }) {
  const sizeClass = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5" data-testid={`star-rating-${rating}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${sizeClass} ${i <= rating ? "text-amber-400 fill-amber-400" : "text-gray-600"}`}
        />
      ))}
    </div>
  );
}

function RespondDialog({ review, onSuccess }: { review: Review; onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState(review.response || "");

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/reputation/reviews/${review.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reputation/reviews"] });
      toast({ title: "Response sent" });
      setOpen(false);
      onSuccess();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`button-respond-review-${review.id}`}>
          <MessageCircle className="w-3.5 h-3.5 mr-1" />
          {review.response ? "Edit Response" : "Respond"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid={`dialog-respond-review-${review.id}`}>
        <DialogHeader>
          <DialogTitle>Respond to Review</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-md bg-background/50">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-medium text-sm">{review.author}</span>
              <StarRating rating={review.rating} />
            </div>
            <p className="text-sm text-muted-foreground">{review.content}</p>
          </div>
          <div className="space-y-2">
            <Label>Your Response</Label>
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Thank you for your feedback..."
              rows={4}
              data-testid="input-review-response"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate({ response })}
            disabled={!response || mutation.isPending}
            data-testid="button-save-response"
          >
            {mutation.isPending ? "Sending..." : "Send Response"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddPlatformDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", url: "" });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/reputation/platforms", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reputation/platforms"] });
      toast({ title: "Platform added" });
      setOpen(false);
      setForm({ name: "", url: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-platform">
          <Plus className="w-4 h-4 mr-2" />
          Add Platform
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-add-platform">
        <DialogHeader>
          <DialogTitle>Add Review Platform</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Platform Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Google Business"
              data-testid="input-platform-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Profile URL</Label>
            <Input
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://g.page/your-business"
              data-testid="input-platform-url"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => mutation.mutate({ ...form, averageRating: 0, totalReviews: 0, connected: true })}
            disabled={!form.name || mutation.isPending}
            data-testid="button-save-platform"
          >
            {mutation.isPending ? "Adding..." : "Add Platform"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ReputationPage() {
  const { toast } = useToast();

  const { data: platforms, isLoading: platformsLoading } = useQuery<ReviewPlatform[]>({
    queryKey: ["/api/reputation/platforms"],
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["/api/reputation/reviews"],
  });

  const deletePlatformMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/reputation/platforms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reputation/platforms"] });
      toast({ title: "Platform removed" });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/reputation/reviews/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reputation/reviews"] });
      toast({ title: "Review deleted" });
    },
  });

  const isLoading = platformsLoading || reviewsLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="reputation-loading">
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

  const platformList = platforms || [];
  const reviewList = reviews || [];
  const avgRating = reviewList.length > 0
    ? Math.round((reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length) * 10) / 10
    : 0;
  const positiveCount = reviewList.filter((r) => r.rating >= 4).length;
  const negativeCount = reviewList.filter((r) => r.rating <= 2).length;

  return (
    <div className="p-6 space-y-6" data-testid="reputation-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Star className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Reputation Management</h1>
            <p className="text-sm text-muted-foreground">Monitor and manage your online reviews</p>
          </div>
        </div>
        <AddPlatformDialog />
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-avg-rating">{avgRating}</p>
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
              <p className="text-2xl font-bold">{positiveCount}</p>
              <p className="text-sm text-muted-foreground">Positive</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-red-500/10 flex items-center justify-center">
              <ThumbsDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{negativeCount}</p>
              <p className="text-sm text-muted-foreground">Negative</p>
            </div>
          </div>
        </Card>
      </div>

      {platformList.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Review Platforms</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {platformList.map((plat) => (
              <div
                key={plat.id}
                className="flex items-center gap-3 p-4 rounded-md bg-background/50"
                data-testid={`card-platform-${plat.id}`}
              >
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" data-testid={`text-platform-name-${plat.id}`}>
                    {plat.name}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StarRating rating={Math.round(plat.averageRating)} />
                    <span className="text-xs text-muted-foreground">{plat.totalReviews} reviews</span>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deletePlatformMutation.mutate(plat.id)}
                  disabled={deletePlatformMutation.isPending}
                  data-testid={`button-delete-platform-${plat.id}`}
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {reviewList.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground" data-testid="text-empty-state">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium mb-1">No reviews yet</p>
            <p className="text-sm">Reviews from your connected platforms will appear here</p>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Recent Reviews</h3>
          <div className="space-y-4">
            {reviewList.map((review) => (
              <div
                key={review.id}
                className="p-4 rounded-md bg-background/50"
                data-testid={`card-review-${review.id}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm" data-testid={`text-review-author-${review.id}`}>
                      {review.author}
                    </span>
                    <StarRating rating={review.rating} />
                    <Badge variant="outline" className="text-xs">{review.platform}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3" data-testid={`text-review-content-${review.id}`}>
                  {review.content}
                </p>
                {review.response && (
                  <div className="p-3 rounded-md bg-primary/5 border border-primary/10 mb-3">
                    <p className="text-xs font-medium text-primary mb-1">Your Response</p>
                    <p className="text-sm text-muted-foreground">{review.response}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <RespondDialog review={review} onSuccess={() => {}} />
                  <div className="flex-1" />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteReviewMutation.mutate(review.id)}
                    disabled={deleteReviewMutation.isPending}
                    data-testid={`button-delete-review-${review.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}