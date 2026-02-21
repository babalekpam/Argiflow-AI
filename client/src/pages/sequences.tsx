import { useState } from "react";
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
  Mail,
  MessageSquare,
  Phone,
  Linkedin,
  Plus,
  Trash2,
  Pencil,
  Play,
  Pause,
  Users,
  CheckCircle2,
  Reply,
  BarChart3,
  Loader2,
  ArrowDown,
} from "lucide-react";
import type { Sequence, SequenceStep } from "@shared/schema";

type SequenceWithMeta = Sequence & { stepCount: number; channels: string[] };
type StatsData = { totalSequences: number; activeCount: number; totalEnrolled: number; replyRate: number };

type StepDraft = {
  channel: string;
  subject: string;
  content: string;
  delayDays: number;
  delayHours: number;
};

const CHANNEL_CONFIG: Record<string, { label: string; icon: typeof Mail; color: string }> = {
  email: { label: "Email", icon: Mail, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  sms: { label: "SMS", icon: MessageSquare, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  call: { label: "Call", icon: Phone, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };
  return (
    <Badge className={styles[status] || styles.draft} data-testid={`badge-status-${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const config = CHANNEL_CONFIG[channel];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`text-xs ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function emptyStep(): StepDraft {
  return { channel: "email", subject: "", content: "", delayDays: 1, delayHours: 0 };
}

export default function SequencesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([emptyStep()]);

  const { data: sequencesList = [], isLoading } = useQuery<SequenceWithMeta[]>({
    queryKey: ["/api/sequences"],
  });

  const { data: stats } = useQuery<StatsData>({
    queryKey: ["/api/sequences/stats"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; steps: StepDraft[] }) => {
      const res = await apiRequest("POST", "/api/sequences", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sequences/stats"] });
      toast({ title: "Sequence created", description: "Your sequence has been created successfully." });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; status?: string }) => {
      const res = await apiRequest("PUT", `/api/sequences/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sequences/stats"] });
      toast({ title: "Sequence updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateStepsMutation = useMutation({
    mutationFn: async ({ id, steps: stepsData }: { id: string; steps: StepDraft[] }) => {
      const res = await apiRequest("POST", `/api/sequences/${id}/steps`, { steps: stepsData });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      toast({ title: "Steps updated" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/sequences/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sequences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sequences/stats"] });
      toast({ title: "Sequence deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setSteps([emptyStep()]);
  }

  function openCreate() {
    setEditingId(null);
    setName("");
    setDescription("");
    setSteps([emptyStep()]);
    setDialogOpen(true);
  }

  async function openEdit(seq: SequenceWithMeta) {
    setEditingId(seq.id);
    setName(seq.name);
    setDescription(seq.description || "");
    try {
      const res = await fetch(`/api/sequences/${seq.id}/steps`, { credentials: "include" });
      const stepsData: SequenceStep[] = await res.json();
      if (stepsData.length > 0) {
        setSteps(
          stepsData.map((s) => ({
            channel: s.channel,
            subject: s.subject || "",
            content: s.content,
            delayDays: s.delayDays,
            delayHours: s.delayHours,
          }))
        );
      } else {
        setSteps([emptyStep()]);
      }
    } catch {
      setSteps([emptyStep()]);
    }
    setDialogOpen(true);
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyStep()]);
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateStep(idx: number, field: keyof StepDraft, value: string | number) {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  }

  function handleSave() {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter a sequence name.", variant: "destructive" });
      return;
    }
    const validSteps = steps.filter((s) => s.content.trim());
    if (validSteps.length === 0) {
      toast({ title: "Steps required", description: "Add at least one step with content.", variant: "destructive" });
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, name, description });
      updateStepsMutation.mutate({ id: editingId, steps: validSteps });
    } else {
      createMutation.mutate({ name, description, steps: validSteps });
    }
  }

  function toggleStatus(seq: SequenceWithMeta) {
    const newStatus = seq.status === "active" ? "paused" : "active";
    updateMutation.mutate({ id: seq.id, status: newStatus });
  }

  const isSaving = createMutation.isPending || updateMutation.isPending || updateStepsMutation.isPending;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Multi-Channel Sequences</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build automated outreach sequences across email, SMS, LinkedIn, and calls
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-sequence">
          <Plus className="w-4 h-4 mr-2" />
          Create Sequence
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4" data-testid="card-stat-total">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-stat-total">{stats?.totalSequences ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Sequences</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" data-testid="card-stat-active">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Play className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-stat-active">{stats?.activeCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" data-testid="card-stat-enrolled">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-stat-enrolled">{stats?.totalEnrolled ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Enrolled</p>
            </div>
          </div>
        </Card>
        <Card className="p-4" data-testid="card-stat-reply-rate">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-purple-500/10 flex items-center justify-center">
              <Reply className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-stat-reply-rate">{stats?.replyRate ?? 0}%</p>
              <p className="text-xs text-muted-foreground">Reply Rate</p>
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-md" />
          ))}
        </div>
      ) : sequencesList.length === 0 ? (
        <Card className="p-12 text-center" data-testid="card-empty-state">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-semibold mb-2">No sequences yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first multi-channel outreach sequence to automate follow-ups
          </p>
          <Button onClick={openCreate} data-testid="button-create-first-sequence">
            <Plus className="w-4 h-4 mr-2" />
            Create Sequence
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {sequencesList.map((seq) => (
            <Card
              key={seq.id}
              className="p-4"
              data-testid={`card-sequence-${seq.id}`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold" data-testid={`text-sequence-name-${seq.id}`}>{seq.name}</h3>
                    <StatusBadge status={seq.status} />
                  </div>
                  {seq.description && (
                    <p className="text-sm text-muted-foreground mt-1" data-testid={`text-sequence-desc-${seq.id}`}>
                      {seq.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {seq.channels.map((ch) => (
                      <ChannelBadge key={ch} channel={ch} />
                    ))}
                    <span className="text-xs text-muted-foreground">
                      {seq.stepCount} step{seq.stepCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex gap-4 text-center">
                    <div>
                      <p className="text-sm font-bold" data-testid={`text-enrolled-${seq.id}`}>{seq.totalEnrolled || 0}</p>
                      <p className="text-xs text-muted-foreground">Enrolled</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold" data-testid={`text-completed-${seq.id}`}>{seq.totalCompleted || 0}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold" data-testid={`text-replied-${seq.id}`}>{seq.totalReplied || 0}</p>
                      <p className="text-xs text-muted-foreground">Replied</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleStatus(seq)}
                      data-testid={`button-toggle-status-${seq.id}`}
                      title={seq.status === "active" ? "Pause" : "Activate"}
                    >
                      {seq.status === "active" ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(seq)}
                      data-testid={`button-edit-sequence-${seq.id}`}
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(seq.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-sequence-${seq.id}`}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingId ? "Edit Sequence" : "Create Sequence"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="seq-name">Name</Label>
              <Input
                id="seq-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cold outreach sequence"
                data-testid="input-sequence-name"
              />
            </div>
            <div>
              <Label htmlFor="seq-desc">Description</Label>
              <Input
                id="seq-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                data-testid="input-sequence-description"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-sm font-semibold">Steps</Label>
                <Button size="sm" variant="outline" onClick={addStep} data-testid="button-add-step">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Step
                </Button>
              </div>

              {steps.map((step, idx) => {
                const channelConfig = CHANNEL_CONFIG[step.channel];
                const ChannelIcon = channelConfig?.icon || Mail;
                return (
                  <Card key={idx} className="p-4 space-y-3" data-testid={`card-step-${idx}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium">Step {idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {idx > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>Wait</span>
                            <Input
                              type="number"
                              min={0}
                              value={step.delayDays}
                              onChange={(e) => updateStep(idx, "delayDays", parseInt(e.target.value) || 0)}
                              className="w-14 text-center"
                              data-testid={`input-delay-days-${idx}`}
                            />
                            <span>d</span>
                            <Input
                              type="number"
                              min={0}
                              max={23}
                              value={step.delayHours}
                              onChange={(e) => updateStep(idx, "delayHours", parseInt(e.target.value) || 0)}
                              className="w-14 text-center"
                              data-testid={`input-delay-hours-${idx}`}
                            />
                            <span>h</span>
                          </div>
                        )}
                        {steps.length > 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeStep(idx)}
                            data-testid={`button-remove-step-${idx}`}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Channel</Label>
                      <Select
                        value={step.channel}
                        onValueChange={(val) => updateStep(idx, "channel", val)}
                      >
                        <SelectTrigger data-testid={`select-channel-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => {
                            const Icon = cfg.icon;
                            return (
                              <SelectItem key={key} value={key}>
                                <span className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  {cfg.label}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {step.channel === "email" && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Subject</Label>
                        <Input
                          value={step.subject}
                          onChange={(e) => updateStep(idx, "subject", e.target.value)}
                          placeholder="Email subject line"
                          data-testid={`input-subject-${idx}`}
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-muted-foreground">Content</Label>
                      <Textarea
                        value={step.content}
                        onChange={(e) => updateStep(idx, "content", e.target.value)}
                        placeholder={`Write your ${channelConfig?.label || "message"} content...`}
                        className="min-h-[80px] resize-none"
                        data-testid={`textarea-content-${idx}`}
                      />
                    </div>

                    {idx < steps.length - 1 && (
                      <div className="flex justify-center pt-1">
                        <ArrowDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-sequence">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Update Sequence" : "Create Sequence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
