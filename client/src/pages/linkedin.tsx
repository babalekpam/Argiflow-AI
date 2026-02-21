import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  Search,
  Trash2,
  Pencil,
  Link,
  UserCheck,
  MessageSquare,
  Send,
  Loader2,
  Building2,
  MapPin,
  ExternalLink,
} from "lucide-react";
import type { LinkedinProfile } from "@shared/schema";
import { useState, useMemo } from "react";

type StatsData = {
  totalProfiles: number;
  connected: number;
  messagesSent: number;
  replies: number;
};

function ConnectionBadge({ status }: { status: string }) {
  const config: Record<string, { style: string; label: string }> = {
    none: { style: "bg-slate-500/10 text-slate-400 border-slate-500/20", label: "None" },
    pending: { style: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", label: "Pending" },
    connected: { style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Connected" },
  };
  const c = config[status] || config.none;
  return <Badge className={c.style} data-testid={`badge-connection-${status}`}>{c.label}</Badge>;
}

function OutreachBadge({ status }: { status: string }) {
  const config: Record<string, { style: string; label: string }> = {
    none: { style: "bg-slate-500/10 text-slate-400 border-slate-500/20", label: "None" },
    message_sent: { style: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Message Sent" },
    replied: { style: "bg-green-500/10 text-green-400 border-green-500/20", label: "Replied" },
    meeting_booked: { style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Meeting Booked" },
  };
  const c = config[status] || config.none;
  return <Badge className={c.style} data-testid={`badge-outreach-${status}`}>{c.label}</Badge>;
}

export default function LinkedInPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<LinkedinProfile | null>(null);
  const [logMessageProfile, setLogMessageProfile] = useState<LinkedinProfile | null>(null);
  const [logMessageText, setLogMessageText] = useState("");

  const [formData, setFormData] = useState({
    linkedinUrl: "",
    fullName: "",
    headline: "",
    company: "",
    location: "",
    connectionStatus: "none",
    outreachStatus: "none",
    notes: "",
  });

  const { data: stats, isLoading: statsLoading } = useQuery<StatsData>({
    queryKey: ["/api/linkedin/stats"],
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery<LinkedinProfile[]>({
    queryKey: ["/api/linkedin/profiles"],
  });

  const filteredProfiles = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter(
      (p) =>
        (p.fullName || "").toLowerCase().includes(q) ||
        (p.headline || "").toLowerCase().includes(q) ||
        (p.company || "").toLowerCase().includes(q) ||
        (p.linkedinUrl || "").toLowerCase().includes(q) ||
        (p.location || "").toLowerCase().includes(q)
    );
  }, [profiles, searchQuery]);

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/linkedin/profiles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/stats"] });
      setAddDialogOpen(false);
      resetForm();
      toast({ title: "Profile added", description: "LinkedIn profile has been added successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData & { id: string }) => {
      const { id, ...rest } = data;
      return apiRequest("PUT", `/api/linkedin/profiles/${id}`, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/stats"] });
      setEditProfile(null);
      resetForm();
      toast({ title: "Profile updated", description: "LinkedIn profile has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/linkedin/profiles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/stats"] });
      toast({ title: "Profile deleted", description: "LinkedIn profile has been removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const logMessageMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      apiRequest("POST", `/api/linkedin/profiles/${id}/log-message`, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linkedin/stats"] });
      setLogMessageProfile(null);
      setLogMessageText("");
      toast({ title: "Message logged", description: "Outreach message has been recorded." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setFormData({
      linkedinUrl: "",
      fullName: "",
      headline: "",
      company: "",
      location: "",
      connectionStatus: "none",
      outreachStatus: "none",
      notes: "",
    });
  }

  function openEditDialog(profile: LinkedinProfile) {
    setFormData({
      linkedinUrl: profile.linkedinUrl || "",
      fullName: profile.fullName || "",
      headline: profile.headline || "",
      company: profile.company || "",
      location: profile.location || "",
      connectionStatus: profile.connectionStatus || "none",
      outreachStatus: profile.outreachStatus || "none",
      notes: profile.notes || "",
    });
    setEditProfile(profile);
  }

  function handleSubmit() {
    if (!formData.linkedinUrl.trim()) {
      toast({ title: "Error", description: "LinkedIn URL is required.", variant: "destructive" });
      return;
    }
    if (editProfile) {
      updateMutation.mutate({ ...formData, id: editProfile.id });
    } else {
      createMutation.mutate(formData);
    }
  }

  const statCards = [
    { label: "Total Profiles", value: stats?.totalProfiles ?? 0, icon: Users, testId: "stat-total-profiles" },
    { label: "Connected", value: stats?.connected ?? 0, icon: UserCheck, testId: "stat-connected" },
    { label: "Messages Sent", value: stats?.messagesSent ?? 0, icon: Send, testId: "stat-messages-sent" },
    { label: "Replies", value: stats?.replies ?? 0, icon: MessageSquare, testId: "stat-replies" },
  ];

  const isFormPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">LinkedIn Integration</h1>
          <p className="text-sm text-muted-foreground mt-1">Track LinkedIn outreach and manage connections</p>
        </div>
        <Button
          onClick={() => { resetForm(); setAddDialogOpen(true); }}
          data-testid="button-add-profile"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Profile
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.testId} className="p-4" data-testid={stat.testId}>
            {statsLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid={`text-${stat.testId}-value`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search profiles by name, company, headline..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-profiles"
        />
      </div>

      {profilesLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <Card className="p-8 text-center" data-testid="text-no-profiles">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {searchQuery ? "No profiles match your search." : "No LinkedIn profiles yet. Add one to get started."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-profiles">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3 font-medium text-muted-foreground">Name</th>
                  <th className="p-3 font-medium text-muted-foreground hidden md:table-cell">Headline</th>
                  <th className="p-3 font-medium text-muted-foreground hidden lg:table-cell">Company</th>
                  <th className="p-3 font-medium text-muted-foreground">Connection</th>
                  <th className="p-3 font-medium text-muted-foreground">Outreach</th>
                  <th className="p-3 font-medium text-muted-foreground hidden xl:table-cell">Last Message</th>
                  <th className="p-3 font-medium text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="border-b last:border-b-0 hover-elevate"
                    data-testid={`row-profile-${profile.id}`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                          {(profile.fullName || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate" data-testid={`text-profile-name-${profile.id}`}>
                            {profile.fullName || "Unknown"}
                          </div>
                          <a
                            href={profile.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary flex items-center gap-1 truncate"
                            data-testid={`link-linkedin-${profile.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            Profile
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <span className="text-muted-foreground truncate block max-w-[200px]" data-testid={`text-profile-headline-${profile.id}`}>
                        {profile.headline || "-"}
                      </span>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <span className="flex items-center gap-1 text-muted-foreground" data-testid={`text-profile-company-${profile.id}`}>
                        {profile.company ? (
                          <>
                            <Building2 className="w-3 h-3 shrink-0" />
                            {profile.company}
                          </>
                        ) : "-"}
                      </span>
                    </td>
                    <td className="p-3">
                      <ConnectionBadge status={profile.connectionStatus} />
                    </td>
                    <td className="p-3">
                      <OutreachBadge status={profile.outreachStatus} />
                    </td>
                    <td className="p-3 hidden xl:table-cell">
                      <div className="max-w-[200px]">
                        {profile.lastMessageSent ? (
                          <div>
                            <div className="truncate text-muted-foreground" data-testid={`text-last-message-${profile.id}`}>
                              {profile.lastMessageSent}
                            </div>
                            {profile.lastMessageAt && (
                              <div className="text-xs text-muted-foreground/60">
                                {new Date(profile.lastMessageAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setLogMessageProfile(profile)}
                          data-testid={`button-log-message-${profile.id}`}
                          title="Log message"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(profile)}
                          data-testid={`button-edit-profile-${profile.id}`}
                          title="Edit profile"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(profile.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-profile-${profile.id}`}
                          title="Delete profile"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={addDialogOpen || !!editProfile} onOpenChange={(open) => { if (!open) { setAddDialogOpen(false); setEditProfile(null); resetForm(); } }}>
        <DialogContent className="max-w-lg" data-testid="dialog-profile-form">
          <DialogHeader>
            <DialogTitle>{editProfile ? "Edit Profile" : "Add LinkedIn Profile"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="linkedinUrl">LinkedIn URL *</Label>
              <Input
                id="linkedinUrl"
                placeholder="https://linkedin.com/in/username"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                data-testid="input-linkedin-url"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  data-testid="input-full-name"
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Acme Corp"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  data-testid="input-company"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                placeholder="CEO at Acme Corp"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                data-testid="input-headline"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="New York, NY"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                data-testid="input-location"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Connection Status</Label>
                <Select value={formData.connectionStatus} onValueChange={(v) => setFormData({ ...formData, connectionStatus: v })}>
                  <SelectTrigger data-testid="select-connection-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="connected">Connected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Outreach Status</Label>
                <Select value={formData.outreachStatus} onValueChange={(v) => setFormData({ ...formData, outreachStatus: v })}>
                  <SelectTrigger data-testid="select-outreach-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="message_sent">Message Sent</SelectItem>
                    <SelectItem value="replied">Replied</SelectItem>
                    <SelectItem value="meeting_booked">Meeting Booked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="textarea-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); setEditProfile(null); resetForm(); }} data-testid="button-cancel-form">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isFormPending} data-testid="button-submit-form">
              {isFormPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editProfile ? "Update" : "Add Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!logMessageProfile} onOpenChange={(open) => { if (!open) { setLogMessageProfile(null); setLogMessageText(""); } }}>
        <DialogContent className="max-w-md" data-testid="dialog-log-message">
          <DialogHeader>
            <DialogTitle>Log Message to {logMessageProfile?.fullName || "Profile"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="logMessage">Message Content</Label>
              <Textarea
                id="logMessage"
                placeholder="Enter the message you sent..."
                value={logMessageText}
                onChange={(e) => setLogMessageText(e.target.value)}
                rows={4}
                data-testid="textarea-log-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLogMessageProfile(null); setLogMessageText(""); }} data-testid="button-cancel-log">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (logMessageProfile && logMessageText.trim()) {
                  logMessageMutation.mutate({ id: logMessageProfile.id, message: logMessageText.trim() });
                }
              }}
              disabled={logMessageMutation.isPending || !logMessageText.trim()}
              data-testid="button-submit-log"
            >
              {logMessageMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Log Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
