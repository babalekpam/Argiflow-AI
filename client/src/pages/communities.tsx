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
  MessagesSquare,
  Plus,
  Trash2,
  Users,
  Hash,
  Lock,
  Globe,
  Search,
  Megaphone,
  HelpCircle,
  MessageCircle,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type CommunitySpace = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  visibility: string;
  memberCount: number;
  status: string;
  createdAt: string;
};

type CommunityChannel = {
  id: string;
  spaceId: string;
  userId: string;
  name: string;
  description: string | null;
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

function ChannelTypeBadge({ type }: { type: string }) {
  const config: Record<string, { icon: typeof MessageCircle; style: string }> = {
    discussion: { icon: MessageCircle, style: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    announcement: { icon: Megaphone, style: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    qa: { icon: HelpCircle, style: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  };
  const { icon: Icon, style } = config[type] || config.discussion;
  return (
    <Badge className={style} data-testid={`badge-channel-type-${type}`}>
      <Icon className="w-3 h-3 mr-1" />
      {type === "qa" ? "Q&A" : type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    archived: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  return (
    <Badge className={styles[status] || styles.active} data-testid={`badge-status-${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
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
            disabled={!form.name.trim() || mutation.isPending}
            data-testid="button-submit-space"
          >
            {mutation.isPending ? "Creating..." : "Create Space"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateChannelDialog({ spaceId, spaceName }: { spaceId: string; spaceName: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "discussion",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/communities/channels", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities/channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/communities/spaces"] });
      toast({ title: "Channel created successfully" });
      setOpen(false);
      setForm({ name: "", description: "", type: "discussion" });
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
          <DialogTitle>Add Channel to {spaceName}</DialogTitle>
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
                <SelectItem value="discussion">Discussion</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="qa">Q&A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() =>
              mutation.mutate({
                spaceId,
                name: form.name,
                description: form.description || null,
                type: form.type,
              })
            }
            disabled={!form.name.trim() || mutation.isPending}
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
  channels,
  onDeleteSpace,
  onDeleteChannel,
}: {
  space: CommunitySpace;
  channels: CommunityChannel[];
  onDeleteSpace: (id: string) => void;
  onDeleteChannel: (id: string) => void;
}) {
  const spaceChannels = channels.filter((c) => c.spaceId === space.id);

  return (
    <Card className="p-5" data-testid={`card-space-${space.id}`}>
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center shrink-0">
            <MessagesSquare className="w-5 h-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate" data-testid={`text-space-name-${space.id}`}>{space.name}</h3>
            {space.description && (
              <p className="text-xs text-muted-foreground truncate max-w-md">{space.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <VisibilityBadge visibility={space.visibility} />
          <StatusBadge status={space.status} />
          <CreateChannelDialog spaceId={space.id} spaceName={space.name} />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDeleteSpace(space.id)}
            data-testid={`button-delete-space-${space.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-3 p-3 rounded-md bg-background/50">
          <Users className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-lg font-bold" data-testid={`text-member-count-${space.id}`}>{space.memberCount || 0}</p>
            <p className="text-xs text-muted-foreground">Members</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-md bg-background/50">
          <Hash className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-lg font-bold" data-testid={`text-channel-count-${space.id}`}>{spaceChannels.length}</p>
            <p className="text-xs text-muted-foreground">Channels</p>
          </div>
        </div>
      </div>

      {spaceChannels.length > 0 && (
        <div className="border-t pt-3">
          <h4 className="text-sm font-medium mb-2">Channels</h4>
          <div className="space-y-2">
            {spaceChannels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between gap-4 p-3 rounded-md bg-background/50 flex-wrap"
                data-testid={`channel-${channel.id}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`text-channel-name-${channel.id}`}>{channel.name}</p>
                    {channel.description && (
                      <p className="text-xs text-muted-foreground truncate">{channel.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ChannelTypeBadge type={channel.type} />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDeleteChannel(channel.id)}
                    data-testid={`button-delete-channel-${channel.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground flex-wrap">
        <span>Created: {new Date(space.createdAt).toLocaleDateString()}</span>
      </div>
    </Card>
  );
}

export default function CommunitiesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const { data: spaces, isLoading: spacesLoading } = useQuery<CommunitySpace[]>({
    queryKey: ["/api/communities/spaces"],
  });

  const { data: channels = [], isLoading: channelsLoading } = useQuery<CommunityChannel[]>({
    queryKey: ["/api/communities/channels"],
  });

  const deleteSpaceMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/communities/spaces/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities/spaces"] });
      queryClient.invalidateQueries({ queryKey: ["/api/communities/channels"] });
      toast({ title: "Space deleted" });
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/communities/channels/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communities/channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/communities/spaces"] });
      toast({ title: "Channel deleted" });
    },
  });

  const isLoading = spacesLoading || channelsLoading;
  const allSpaces = spaces || [];
  const publicSpaces = allSpaces.filter((s) => s.visibility === "public").length;
  const totalMembers = allSpaces.reduce((sum, s) => sum + (s.memberCount || 0), 0);

  const filtered = allSpaces
    .filter((s) => {
      if (activeTab === "public") return s.visibility === "public";
      if (activeTab === "private") return s.visibility === "private";
      return true;
    })
    .filter((s) =>
      !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.description || "").toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="communities-page">
      <div className="rounded-md bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center shrink-0">
              <MessagesSquare className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Community Hub</h1>
              <p className="text-muted-foreground text-sm">Build and manage community spaces with discussion channels</p>
            </div>
          </div>
          <CreateSpaceDialog />
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <MessagesSquare className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-spaces">{allSpaces.length}</p>
              <p className="text-sm text-muted-foreground">Total Spaces</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-public-spaces">{publicSpaces}</p>
              <p className="text-sm text-muted-foreground">Public</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-cyan-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-members">{totalMembers.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center">
              <Hash className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-total-channels">{channels.length}</p>
              <p className="text-sm text-muted-foreground">Channels</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-filter">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="public" data-testid="tab-public">Public</TabsTrigger>
            <TabsTrigger value="private" data-testid="tab-private">Private</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 w-64"
            placeholder="Search spaces..."
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
      ) : filtered.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <MessagesSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-semibold mb-1">No community spaces found</h3>
            <p className="text-sm">
              {allSpaces.length === 0
                ? "Create your first space to start building your community."
                : "No spaces match your current filters."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              channels={channels}
              onDeleteSpace={(id) => deleteSpaceMutation.mutate(id)}
              onDeleteChannel={(id) => deleteChannelMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
