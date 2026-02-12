import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Activity,
  Clock,
  BarChart3,
  Zap,
  Settings,
  Power,
  Mic,
  Volume2,
  Plus,
  Bot,
  PhoneOff,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AiAgent, VoiceCall } from "@shared/schema";
import voiceRobotImg from "@assets/image_1770823707603.png";

const voiceAgentTemplates = [
  {
    name: "AI Receptionist",
    type: "Voice AI",
    description: "Answers inbound calls 24/7, qualifies leads, and books appointments automatically.",
    icon: PhoneIncoming,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    name: "Outbound Caller",
    type: "Voice AI",
    description: "Makes automated follow-up calls, appointment reminders, and lead outreach campaigns.",
    icon: PhoneOutgoing,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
  {
    name: "IVR Navigator",
    type: "Voice AI",
    description: "Intelligent call routing with natural language understanding — no more press-1 menus.",
    icon: Phone,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
  },
  {
    name: "Survey Caller",
    type: "Voice AI",
    description: "Conducts automated customer satisfaction surveys and collects structured feedback.",
    icon: Mic,
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
  },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
        Live
      </Badge>
    );
  }
  if (status === "paused") {
    return (
      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
        Paused
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">
      Inactive
    </Badge>
  );
}

function CallStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
    case "in-progress":
      return <Badge className="bg-primary/10 text-primary border-primary/20"><Loader2 className="w-3 h-3 mr-1 animate-spin" />In Progress</Badge>;
    case "ringing":
    case "initiated":
      return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20"><Phone className="w-3 h-3 mr-1" />Ringing</Badge>;
    case "queued":
      return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20"><Clock className="w-3 h-3 mr-1" />Queued</Badge>;
    case "failed":
      return <Badge className="bg-red-500/10 text-red-400 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    default:
      return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">{status}</Badge>;
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatPhoneDisplay(phone: string): string {
  if (phone.length === 12 && phone.startsWith("+1")) {
    return `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
  }
  return phone;
}

export default function VoiceAiPage() {
  usePageTitle("Voice AI Agents");
  const { toast } = useToast();
  const [showDeploy, setShowDeploy] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof voiceAgentTemplates[0] | null>(null);
  const [configAgent, setConfigAgent] = useState<AiAgent | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editScript, setEditScript] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [deployName, setDeployName] = useState("");
  const [deployDesc, setDeployDesc] = useState("");
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callPhone, setCallPhone] = useState("");
  const [callAgentId, setCallAgentId] = useState<string>("");
  const [callScript, setCallScript] = useState("");
  const [showTranscript, setShowTranscript] = useState<VoiceCall | null>(null);

  const { data: allAgents, isLoading } = useQuery<AiAgent[]>({
    queryKey: ["/api/ai-agents"],
  });

  const { data: callLogs, isLoading: callsLoading } = useQuery<VoiceCall[]>({
    queryKey: ["/api/voice/calls"],
    refetchInterval: 10000,
  });

  const voiceAgents = allAgents?.filter((a) => a.type === "Voice AI") || [];

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; type: string; description: string; status: string }) => {
      const res = await apiRequest("POST", "/api/ai-agents", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, string> }) => {
      const res = await apiRequest("PATCH", `/api/ai-agents/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
    },
  });

  const callMutation = useMutation({
    mutationFn: async (data: { toNumber: string; agentId?: string; script?: string }) => {
      const res = await apiRequest("POST", "/api/voice/calls", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voice/calls"] });
      toast({ title: "Call initiated", description: "The AI agent is now calling the number." });
      setShowCallDialog(false);
      setCallPhone("");
      setCallAgentId("");
      setCallScript("");
    },
    onError: (err: any) => {
      toast({ title: "Call failed", description: err.message || "Could not initiate the call.", variant: "destructive" });
    },
  });

  const openDeployDialog = (template: typeof voiceAgentTemplates[0]) => {
    setSelectedTemplate(template);
    setDeployName(template.name);
    setDeployDesc(template.description);
    setShowDeploy(true);
  };

  const deployAgent = () => {
    if (!selectedTemplate || !deployName.trim()) return;
    createMutation.mutate(
      {
        name: deployName,
        type: "Voice AI",
        description: deployDesc,
        status: "active",
      },
      {
        onSuccess: () => {
          toast({ title: "Voice Agent Deployed", description: `${deployName} is now live and handling calls.` });
          setShowDeploy(false);
          setSelectedTemplate(null);
          setDeployName("");
          setDeployDesc("");
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to deploy agent.", variant: "destructive" });
        },
      }
    );
  };

  const openConfig = (agent: AiAgent) => {
    setConfigAgent(agent);
    setEditName(agent.name);
    setEditDescription(agent.description || "");
    setEditScript(agent.script || "");
    setEditStatus(agent.status);
  };

  const saveConfig = () => {
    if (!configAgent) return;
    updateMutation.mutate(
      {
        id: configAgent.id,
        data: { name: editName, description: editDescription, script: editScript, status: editStatus },
      },
      {
        onSuccess: () => {
          toast({ title: "Agent updated", description: `${editName} configuration saved.` });
          setConfigAgent(null);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update agent.", variant: "destructive" });
        },
      }
    );
  };

  const togglePower = (agent: AiAgent) => {
    const newStatus = agent.status === "active" ? "paused" : "active";
    updateMutation.mutate(
      { id: agent.id, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({
            title: newStatus === "active" ? "Agent activated" : "Agent paused",
            description: `${agent.name} is now ${newStatus}.`,
          });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to toggle agent.", variant: "destructive" });
        },
      }
    );
  };

  const initiateCall = () => {
    if (!callPhone.trim()) return;
    const payload: { toNumber: string; agentId?: string; script?: string } = { toNumber: callPhone };
    if (callAgentId && callAgentId !== "none") payload.agentId = callAgentId;
    if (callScript.trim()) payload.script = callScript;
    callMutation.mutate(payload);
  };

  const activeCount = voiceAgents.filter((a) => a.status === "active").length;
  const totalCalls = callLogs?.length || 0;
  const completedCalls = callLogs?.filter(c => c.status === "completed") || [];
  const avgSuccess = totalCalls > 0 ? Math.round((completedCalls.length / totalCalls) * 100) : 0;

  const deployedNames = voiceAgents.map((a) => a.name);

  const parseTranscript = (transcript: string | null): { role: string; text: string }[] => {
    if (!transcript) return [];
    try {
      return JSON.parse(transcript);
    } catch {
      return [];
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-voice-ai-title">Voice AI</h1>
          <p className="text-muted-foreground text-sm">
            Deploy and manage AI-powered voice agents that handle calls 24/7.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20">
            <Mic className="w-3 h-3 mr-1.5" />
            {activeCount} Live
          </Badge>
          <Button onClick={() => setShowCallDialog(true)} data-testid="button-make-call">
            <PhoneCall className="w-4 h-4 mr-1.5" />
            Make a Call
          </Button>
        </div>
      </div>

      <Card className="relative overflow-hidden">
        <img src={voiceRobotImg} alt="Voice AI" className="w-full h-40 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
        <div className="absolute inset-0 flex items-center p-6">
          <div>
            <p className="text-lg font-bold">Voice AI Agents</p>
            <p className="text-sm text-muted-foreground max-w-sm">AI-powered voice agents that handle calls, qualify leads, and book appointments around the clock.</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5" data-testid="stat-voice-active">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Active Lines</p>
            </div>
          </div>
        </Card>
        <Card className="p-5" data-testid="stat-voice-calls">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCalls.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Calls</p>
            </div>
          </div>
        </Card>
        <Card className="p-5" data-testid="stat-voice-success">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgSuccess}%</p>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
          </div>
        </Card>
        <Card className="p-5" data-testid="stat-voice-agents">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-chart-4/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{voiceAgents.length}</p>
              <p className="text-sm text-muted-foreground">Total Agents</p>
            </div>
          </div>
        </Card>
      </div>

      {voiceAgents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Your Voice Agents</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {voiceAgents.map((agent) => (
              <Card key={agent.id} className="p-5" data-testid={`voice-agent-card-${agent.id}`}>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      {agent.name.includes("Receptionist") ? (
                        <PhoneIncoming className="w-5 h-5 text-primary" />
                      ) : agent.name.includes("Outbound") ? (
                        <PhoneOutgoing className="w-5 h-5 text-chart-4" />
                      ) : agent.name.includes("IVR") ? (
                        <Phone className="w-5 h-5 text-chart-2" />
                      ) : (
                        <Mic className="w-5 h-5 text-chart-3" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.type}</p>
                    </div>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {agent.description}
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-medium">{agent.successRate}%</span>
                  </div>
                  <Progress value={agent.successRate || 0} className="h-1.5" />
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {agent.tasksCompleted} calls handled
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      24/7
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    data-testid={`button-configure-voice-${agent.id}`}
                    onClick={() => openConfig(agent)}
                  >
                    <Settings className="w-3.5 h-3.5 mr-1.5" />
                    Configure
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`button-call-with-${agent.id}`}
                    onClick={() => {
                      setCallAgentId(agent.id);
                      setShowCallDialog(true);
                    }}
                  >
                    <PhoneOutgoing className="w-3.5 h-3.5 mr-1.5" />
                    Call
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`button-power-voice-${agent.id}`}
                    onClick={() => togglePower(agent)}
                    disabled={updateMutation.isPending}
                  >
                    <Power className={`w-3.5 h-3.5 ${agent.status === "active" ? "text-emerald-400" : "text-muted-foreground"}`} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">
          {voiceAgents.length > 0 ? "Deploy More Agents" : "Deploy Your First Voice Agent"}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {voiceAgentTemplates.map((template) => {
            const alreadyDeployed = deployedNames.includes(template.name);
            return (
              <Card
                key={template.name}
                className="p-5 hover-elevate cursor-pointer"
                data-testid={`template-${template.name.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => !alreadyDeployed && openDeployDialog(template)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-md ${template.bgColor} flex items-center justify-center`}>
                    <template.icon className={`w-5 h-5 ${template.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{template.name}</p>
                    {alreadyDeployed && (
                      <p className="text-xs text-emerald-400">Deployed</p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                <Button
                  variant={alreadyDeployed ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                  disabled={alreadyDeployed}
                  data-testid={`button-deploy-${template.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {alreadyDeployed ? "Already Deployed" : (
                    <>
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Deploy Agent
                    </>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {(callLogs && callLogs.length > 0) && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Call History</h2>
          <Card className="divide-y divide-border/50">
            {callLogs.slice(0, 20).map((call) => (
              <div key={call.id} className="flex items-center justify-between gap-4 p-4 flex-wrap" data-testid={`call-log-${call.id}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                    {call.direction === "outbound" ? (
                      <PhoneOutgoing className="w-4 h-4 text-primary" />
                    ) : (
                      <PhoneIncoming className="w-4 h-4 text-chart-2" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{formatPhoneDisplay(call.toNumber)}</p>
                    <p className="text-xs text-muted-foreground">
                      {call.createdAt ? new Date(call.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {call.durationSec !== null && call.durationSec > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(call.durationSec)}
                    </span>
                  )}
                  <CallStatusBadge status={call.status} />
                  {call.transcript && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTranscript(call)}
                      data-testid={`button-transcript-${call.id}`}
                    >
                      <Volume2 className="w-3.5 h-3.5 mr-1" />
                      Transcript
                    </Button>
                  )}
                  {call.outcome && call.outcome !== "completed" && (
                    <span className="text-xs text-muted-foreground capitalize">{call.outcome}</span>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      <Card className="p-6" data-testid="card-voice-capabilities">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          Voice AI Capabilities
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: PhoneIncoming, title: "Inbound Call Handling", desc: "Answer every call instantly, qualify leads, and route to the right team" },
            { icon: PhoneOutgoing, title: "Outbound Campaigns", desc: "Automated cold outreach and follow-up sequences at scale" },
            { icon: Clock, title: "Appointment Booking", desc: "Schedule meetings directly during calls with calendar integration" },
            { icon: Activity, title: "Sentiment Analysis", desc: "Real-time emotion detection to adapt conversation tone" },
            { icon: BarChart3, title: "Call Analytics", desc: "Track performance metrics, call duration, and conversion rates" },
            { icon: Zap, title: "Instant Transfers", desc: "Seamlessly hand off to human agents when needed" },
          ].map((cap) => (
            <div key={cap.title} className="flex items-start gap-3 p-3 rounded-md bg-secondary/30">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <cap.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{cap.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cap.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={showCallDialog} onOpenChange={(open) => !open && setShowCallDialog(false)}>
        <DialogContent data-testid="dialog-make-call">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-primary" />
              Make an AI Call
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="call-phone">Phone Number</Label>
              <Input
                id="call-phone"
                data-testid="input-call-phone"
                value={callPhone}
                onChange={(e) => setCallPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
              <p className="text-xs text-muted-foreground">Include country code (e.g. +1 for US)</p>
            </div>
            {voiceAgents.length > 0 && (
              <div className="space-y-2">
                <Label>Voice Agent</Label>
                <Select value={callAgentId} onValueChange={setCallAgentId}>
                  <SelectTrigger data-testid="select-call-agent">
                    <SelectValue placeholder="Select an agent (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default AI Agent</SelectItem>
                    {voiceAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="call-script">Call Script / Talking Points</Label>
              <Textarea
                id="call-script"
                data-testid="input-call-script"
                value={callScript}
                onChange={(e) => setCallScript(e.target.value)}
                rows={5}
                placeholder="Write what the AI should say and discuss on this call. Example: 'Hi, this is Sarah from XYZ Marketing. I'm calling about the proposal we sent last week for your digital advertising campaign. I'd love to walk you through the key benefits and answer any questions.' Leave blank to use the agent's default script."
              />
              <p className="text-xs text-muted-foreground">The AI will use this as its opening greeting and guide for the entire conversation.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCallDialog(false)} data-testid="button-cancel-call">
              Cancel
            </Button>
            <Button
              onClick={initiateCall}
              disabled={callMutation.isPending || !callPhone.trim()}
              data-testid="button-confirm-call"
            >
              {callMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Calling...
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4 mr-1.5" />
                  Call Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeploy} onOpenChange={(open) => !open && setShowDeploy(false)}>
        <DialogContent data-testid="dialog-deploy-voice">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate && <selectedTemplate.icon className={`w-5 h-5 ${selectedTemplate.color}`} />}
              Deploy {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="deploy-name">Agent Name</Label>
              <Input
                id="deploy-name"
                data-testid="input-deploy-name"
                value={deployName}
                onChange={(e) => setDeployName(e.target.value)}
                placeholder="e.g. AI Receptionist"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deploy-desc">Description</Label>
              <Textarea
                id="deploy-desc"
                data-testid="input-deploy-desc"
                value={deployDesc}
                onChange={(e) => setDeployDesc(e.target.value)}
                rows={3}
                placeholder="What should this agent do?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeploy(false)} data-testid="button-cancel-deploy">
              Cancel
            </Button>
            <Button
              onClick={deployAgent}
              disabled={createMutation.isPending || !deployName.trim()}
              data-testid="button-confirm-deploy"
            >
              {createMutation.isPending ? "Deploying..." : "Deploy Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!configAgent} onOpenChange={(open) => !open && setConfigAgent(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" data-testid="dialog-configure-voice">
          <DialogHeader>
            <DialogTitle>Configure Voice Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="voice-name">Name</Label>
              <Input
                id="voice-name"
                data-testid="input-voice-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voice-desc">Description</Label>
              <Textarea
                id="voice-desc"
                data-testid="input-voice-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voice-script">Call Script / Talking Points</Label>
              <Textarea
                id="voice-script"
                data-testid="input-voice-script"
                value={editScript}
                onChange={(e) => setEditScript(e.target.value)}
                rows={8}
                placeholder="Paste or write the script this agent should follow during phone calls. Include the greeting, talking points, objection handling, and closing."
              />
              <p className="text-xs text-muted-foreground">The AI will use this as its conversation guide during calls -- not read it word-for-word.</p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="voice-active">Active (Live)</Label>
              <Switch
                id="voice-active"
                data-testid="switch-voice-status"
                checked={editStatus === "active"}
                onCheckedChange={(checked) => setEditStatus(checked ? "active" : "paused")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigAgent(null)} data-testid="button-cancel-voice-config">
              Cancel
            </Button>
            <Button onClick={saveConfig} disabled={updateMutation.isPending} data-testid="button-save-voice-config">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showTranscript} onOpenChange={(open) => !open && setShowTranscript(null)}>
        <DialogContent className="max-w-lg" data-testid="dialog-transcript">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              Call Transcript
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-80 overflow-y-auto">
            {showTranscript && parseTranscript(showTranscript.transcript).map((entry, i) => (
              <div key={i} className={`flex gap-3 ${entry.role === "agent" ? "" : "flex-row-reverse"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${entry.role === "agent" ? "bg-primary/10" : "bg-chart-2/10"}`}>
                  {entry.role === "agent" ? (
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-chart-2" />
                  )}
                </div>
                <div className={`rounded-md p-3 text-sm max-w-[80%] ${entry.role === "agent" ? "bg-primary/5" : "bg-secondary/50"}`}>
                  <p className="text-xs text-muted-foreground mb-1 font-medium">
                    {entry.role === "agent" ? "AI Agent" : "Caller"}
                  </p>
                  {entry.text}
                </div>
              </div>
            ))}
            {showTranscript && parseTranscript(showTranscript.transcript).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No transcript available for this call.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTranscript(null)} data-testid="button-close-transcript">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
