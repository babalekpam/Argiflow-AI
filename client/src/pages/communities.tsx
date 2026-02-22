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
  MessagesSquare,
  Plus,
  Trash2,
  Users,
  Hash,
  Lock,
  Globe,
  MessageCircle,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type CommunitySpace = {
  id: string;
  name: string;
  description: string;
  visibility: string;
  memberCount: number;
  channelCount: number;
  status: string;
  createdAt: string;
};

type Channel = {
  id: string;
  spaceId: string;
  name: string;
  description: string;
  type: string;
  createdAt: string;
};

function VisibilityBadge({ visibility }: { visibility: string }) {
  if (visibility === "private") {
    return (
      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20" data-testid={`badge-visibility-${visibility}`}>
        <Lock className="w-3 h-3 mr-1" />
        Private
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" data-testid={`badge-visibility-${visibility}`}>
      <Globe className="w-3 h-3 mr-1" />
      Public
    </Badge>
  );
}

function CreateSpaceDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    visibility: "public",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/communities/spaces", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities/spaces"] });
      toast({ title: "Community space created successfully" });
      setOpen(false);
      setForm({ name: "", description: "", visibility: "public" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-space">
          <Plus className="w-4 h-4 mr-2" />
          Create Space
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-space">
        <DialogHeader>
          <DialogTitle>Create Community Space</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Space Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="General Discussion"
              data-testid="input-space-name"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="A space for community members to..."
              data-testid="input-space-description"
            />
          </div>
          <div>
            <Label>Visibility</Label>
            <Select value={form.visibility} onValueChange={(v) => set("visibility", v)}>
              <SelectTrigger data-testid="select-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                name: form.name,
                description: form.description || null,
                visibility: form.visibility,
              })
            }
            disabled={!form.name || mutation.isPending}
            data-testid="button-submit-space"
          >
            {mutation.isPending ? "Creating..." : "Create Space"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateChannelDialog({ spaceId }: { spaceId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "text",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/communities/spaces/${spaceId}/channels`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities/spaces"] });
      toast({ title: "Channel created successfully" });
      setOpen(false);
      setForm({ name: "", description: "", type: "text" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`button-create-channel-${spaceId}`}>
          <Hash className="w-3.5 h-3.5 mr-1.5" />
          Add Channel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-channel">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Channel Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="general"
              data-testid="input-channel-name"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Channel description..."
              data-testid="input-channel-description"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger data-testid="select-channel-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="announcements">Announcements</SelectItem>
                <SelectItem value="resources">Resources</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                name: form.name,
                description: form.description || null,
                type: form.type,
              })
            }
            disabled={!form.name || mutation.isPending}
            data-testid="button-submit-channel"
          >
            {mutation.isPending ? "Creating..." : "Create Channel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SpaceCard({
  space,
  onDelete,
}: {
  space: CommunitySpace;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="p-5" data-testid={`card-space-${space.id}`}>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <MessagesSquare className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate" data-testid={`text-space-name-${space.id}`}>{space.name}</h3>
            {space.description && (
              <p className="text-xs text-muted-foreground truncate">{space.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <VisibilityBadge visibility={space.visibility} />
          <CreateChannelDialog spaceId={space.id} />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(space.id)}
            data-testid={`button-delete-space-${space.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-3 rounded-md bg-background/50">
          <Users className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-lg font-bold" data-testid={`text-member-count-${space.id}`}>{space.memberCount}</p>
            <p className="text-xs text-muted-foreground">Members</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-md bg-background/50">
          <Hash className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-lg font-bold" data-testid={`text-channel-count-${space.id}`}>{space.channelCount}</p>
            <p className="text-xs text-muted-foreground">Channels</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground flex-wrap">
        <span>Created: {new Date(space.createdAt).toLocaleDateString()}</span>
      </div>
    </Card>
  );
}

export default function CommunitiesPage() {
  const { toast } = useToast();

  const { data: spaces, isLoading } = useQuery<CommunitySpace[]>({
    queryKey: ["/api/communities/spaces"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/communities/spaces/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities/spaces"] });
      toast({ title: "Space deleted" });
    },
  });

  const totalMembers = (spaces || []).reduce((sum, s) => sum + s.memberCount, 0);
  const totalChannels = (spaces || []).reduce((sum, s) => sum + s.channelCount, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="communities-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <MessagesSquare className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Communities</h1>
            <p className="text-muted-foreground text-sm">Build and manage community spaces and channels</p>
          </div>
        </div>
        <CreateSpaceDialog />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <MessagesSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-spaces">{(spaces || []).length}</p>
              <p className="text-sm text-muted-foreground">Spaces</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-members">{totalMembers}</p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Hash className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-channels">{totalChannels}</p>
              <p className="text-sm text-muted-foreground">Total Channels</p>
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
      ) : (spaces || []).length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <MessagesSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold mb-1">No community spaces yet</h3>
            <p className="text-sm">Create your first space to start building your community.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {(spaces || []).map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
