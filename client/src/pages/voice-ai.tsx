import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
    nameKey: "voiceAi.receptionist",
    descKey: "voiceAi.receptionistDesc",
    type: "Voice AI",
    description: "Answers inbound calls 24/7, qualifies leads, and books appointments automatically.",
    icon: PhoneIncoming,
    color: "text-primary",
    bgColor: "bg-primary/10",
    defaultScript: `OPENING:
"Thank you for calling [Company Name], this is [Agent Name]. How can I help you today?"

QUALIFYING THE CALLER:
- Ask: "May I have your name, please?"
- Ask: "And what is this regarding?" or "How can I direct your call?"
- If they need services: "Great, let me get some details so I can connect you with the right person."
- Ask: "What's the best number to reach you at?"
- Ask: "And your email address?"

BOOKING APPOINTMENTS:
- "I'd love to get you scheduled. We have availability [suggest times]. What works best for you?"
- Confirm: "Perfect, I have you down for [date/time]. You'll receive a confirmation shortly."

HANDLING COMMON QUESTIONS:
- Hours: "Our office hours are Monday through Friday, 9 AM to 5 PM."
- Location: "We're located at [address]. Would you like directions?"
- Pricing: "I can have someone reach out with a detailed quote. May I take your contact info?"

OBJECTION HANDLING:
- "I understand. Would it help if I had someone call you back at a more convenient time?"
- "No problem at all. Can I take your information so we can follow up?"

CLOSING:
- "Thank you for calling [Company Name]. We'll be in touch shortly. Have a great day!"`,
  },
  {
    name: "Outbound Caller",
    nameKey: "voiceAi.outbound",
    descKey: "voiceAi.outboundDesc",
    type: "Voice AI",
    description: "Makes automated follow-up calls, appointment reminders, and lead outreach campaigns.",
    icon: PhoneOutgoing,
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
    defaultScript: `OPENING:
"Hi [Lead Name], this is [Agent Name] from [Company Name]. How are you doing today?"
(Wait for response, then continue)
"Great! I'm reaching out because [reason for call / how they came to your attention]."

DISCOVERY PHASE:
- "I'd love to learn a little about your current situation. What are you currently using for [relevant service]?"
- "What's your biggest challenge with [pain point area] right now?"
- "If you could change one thing about how you handle [topic], what would it be?"

VALUE PROPOSITION:
- "That's actually exactly what we help with. We [brief description of solution]."
- "Our clients typically see [specific benefit, e.g., 30% increase in efficiency]."
- "What makes us different is [key differentiator]."

OBJECTION HANDLING:
- "I'm not interested": "I totally understand. Many of our best clients felt the same way initially. Could I just share one quick thing that might change your mind?"
- "I'm too busy": "I completely respect your time. How about I send you a quick summary by email, and we can chat for just 10 minutes when it's convenient?"
- "We already have a solution": "That's great! I'm curious, how's that working out for you? A lot of people come to us when they want to [specific improvement]."
- "It's too expensive": "I hear you. The good news is we offer flexible plans. Most clients find it pays for itself within the first month."

CLOSING / BOOKING:
- "Based on what you've shared, I think a quick 15-minute demo would be really valuable. Would [day] at [time] work, or is [alternative] better?"
- "I'll send you a calendar invite right away. Looking forward to showing you what we can do!"

WRAP-UP:
- "Thanks so much for your time, [Lead Name]. I'll follow up with an email. Have a wonderful day!"`,
  },
  {
    name: "IVR Navigator",
    nameKey: "voiceAi.ivr",
    descKey: "voiceAi.ivrDesc",
    type: "Voice AI",
    description: "Intelligent call routing with natural language understanding — no more press-1 menus.",
    icon: Phone,
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
    defaultScript: `OPENING:
"Welcome to [Company Name]. I'm your virtual assistant and I can help route your call. Just tell me what you need and I'll connect you to the right person."

UNDERSTANDING INTENT:
- If they mention sales/buying: "Let me connect you with our sales team right away."
- If they mention support/help/issue: "I'll get you to our support team. Can you briefly describe the issue?"
- If they mention billing/payment: "I'll transfer you to our billing department."
- If they mention appointments/scheduling: "I can help you schedule or manage an appointment."
- If unclear: "Could you tell me a bit more about what you're looking for? I want to make sure I connect you with the right department."

GATHERING INFO BEFORE TRANSFER:
- "Before I transfer you, may I have your name?"
- "And your account number or the phone number on your account?"
- "Got it. Let me connect you now. One moment please."

IF NO AGENTS AVAILABLE:
- "It looks like all of our team members are currently assisting other callers. Would you like to leave a message, or should I have someone call you back?"
- "What's the best number and time to reach you?"

CLOSING:
- "I'm transferring you now. Thank you for calling [Company Name]!"`,
  },
  {
    name: "Survey Caller",
    nameKey: "voiceAi.survey",
    descKey: "voiceAi.surveyDesc",
    type: "Voice AI",
    description: "Conducts automated customer satisfaction surveys and collects structured feedback.",
    icon: Mic,
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
    defaultScript: `OPENING:
"Hi [Name], this is [Agent Name] from [Company Name]. I hope I'm not catching you at a bad time. We're doing a quick satisfaction survey and your feedback would really help us improve. Do you have about 2 minutes?"

IF THEY AGREE:
"Wonderful, thank you! I just have a few quick questions."

SURVEY QUESTIONS:
1. "On a scale of 1 to 10, how satisfied are you with our [product/service] overall?"
   - Follow up if low (1-6): "I'm sorry to hear that. What's the main thing we could improve?"
   - Follow up if high (7-10): "That's great to hear! What do you like most about working with us?"

2. "How would you rate your most recent experience with our team? Was it excellent, good, fair, or poor?"
   - If fair/poor: "Could you tell me what happened? We want to make it right."

3. "How likely are you to recommend us to a friend or colleague? Very likely, somewhat likely, or not likely?"
   - If not likely: "I understand. What would need to change for you to feel comfortable recommending us?"

4. "Is there anything else you'd like us to know or any suggestions for improvement?"

CLOSING:
- "That's all I have. Your feedback is incredibly valuable to us and we'll use it to keep improving."
- "As a thank you, [mention any incentive if applicable, e.g., we'll send you a 10% discount code]."
- "Thank you so much for your time, [Name]. Have a wonderful day!"

IF THEY DECLINE:
- "No problem at all! Would there be a better time for me to call back?"
- If no: "Understood. Thank you for your time, and feel free to reach out if you ever need anything. Take care!"`,
  },
];

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  if (status === "active") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
        {t("voiceAi.statusLive")}
      </Badge>
    );
  }
  if (status === "paused") {
    return (
      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
        {t("voiceAi.statusPaused")}
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">
      {t("voiceAi.statusInactive")}
    </Badge>
  );
}

function CallStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  switch (status) {
    case "completed":
      return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"><CheckCircle className="w-3 h-3 mr-1" />{t("voiceAi.statusCompleted")}</Badge>;
    case "in-progress":
      return <Badge className="bg-primary/10 text-primary border-primary/20"><Loader2 className="w-3 h-3 mr-1 animate-spin" />{t("voiceAi.statusInProgress")}</Badge>;
    case "ringing":
    case "initiated":
      return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20"><Phone className="w-3 h-3 mr-1" />{t("voiceAi.statusRinging")}</Badge>;
    case "queued":
      return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20"><Clock className="w-3 h-3 mr-1" />{t("voiceAi.statusQueued")}</Badge>;
    case "failed":
      return <Badge className="bg-red-500/10 text-red-400 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />{t("voiceAi.statusFailed")}</Badge>;
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
  const { t } = useTranslation();
  usePageTitle(t("voiceAi.title"));
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
  const [deployScript, setDeployScript] = useState("");
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
    mutationFn: async (data: { name: string; type: string; description: string; status: string; script?: string }) => {
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
      toast({ title: t("voiceAi.callInitiated"), description: t("voiceAi.callInitiatedDesc") });
      setShowCallDialog(false);
      setCallPhone("");
      setCallAgentId("");
      setCallScript("");
    },
    onError: (err: any) => {
      toast({ title: t("voiceAi.callFailed"), description: err.message || t("voiceAi.callFailedDesc"), variant: "destructive" });
    },
  });

  const openDeployDialog = (template: typeof voiceAgentTemplates[0]) => {
    setSelectedTemplate(template);
    setDeployName(template.name);
    setDeployDesc(template.description);
    setDeployScript(template.defaultScript);
    setShowDeploy(true);
  };

  const deployAgent = () => {
    if (!selectedTemplate || !deployName.trim()) return;
    createMutation.mutate(
      {
        name: deployName,
        type: "Voice AI",
        description: deployDesc,
        script: deployScript,
        status: "active",
      },
      {
        onSuccess: () => {
          toast({ title: t("voiceAi.voiceDeployed"), description: t("voiceAi.voiceDeployedDesc", { name: deployName }) });
          setShowDeploy(false);
          setSelectedTemplate(null);
          setDeployName("");
          setDeployDesc("");
          setDeployScript("");
        },
        onError: () => {
          toast({ title: t("voiceAi.deployError"), description: t("voiceAi.deployErrorDesc"), variant: "destructive" });
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
          toast({ title: t("voiceAi.agentUpdated"), description: t("voiceAi.agentUpdatedDesc", { name: editName }) });
          setConfigAgent(null);
        },
        onError: () => {
          toast({ title: t("voiceAi.updateError"), description: t("voiceAi.updateErrorDesc"), variant: "destructive" });
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
            title: newStatus === "active" ? t("voiceAi.agentActivated") : t("voiceAi.agentPaused"),
            description: t("voiceAi.agentStatusDesc", { name: agent.name, status: newStatus }),
          });
        },
        onError: () => {
          toast({ title: t("voiceAi.toggleError"), description: t("voiceAi.toggleErrorDesc"), variant: "destructive" });
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
          <h1 className="text-2xl font-bold" data-testid="text-voice-ai-title">{t("voiceAi.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("voiceAi.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20">
            <Mic className="w-3 h-3 mr-1.5" />
            {t("voiceAi.liveCount", { count: activeCount })}
          </Badge>
          <Button onClick={() => setShowCallDialog(true)} data-testid="button-make-call">
            <PhoneCall className="w-4 h-4 mr-1.5" />
            {t("voiceAi.makeCall")}
          </Button>
        </div>
      </div>

      <Card className="relative overflow-hidden">
        <img src={voiceRobotImg} alt={t("voiceAi.title")} className="w-full h-40 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
        <div className="absolute inset-0 flex items-center p-6">
          <div>
            <p className="text-lg font-bold">{t("voiceAi.heroTitle")}</p>
            <p className="text-sm text-muted-foreground max-w-sm">{t("voiceAi.heroDesc")}</p>
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
              <p className="text-sm text-muted-foreground">{t("voiceAi.activeLines")}</p>
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
              <p className="text-sm text-muted-foreground">{t("voiceAi.totalCalls")}</p>
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
              <p className="text-sm text-muted-foreground">{t("voiceAi.successRate")}</p>
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
              <p className="text-sm text-muted-foreground">{t("voiceAi.totalAgents")}</p>
            </div>
          </div>
        </Card>
      </div>

      {voiceAgents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">{t("voiceAi.yourVoiceAgents")}</h2>
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
                    <span className="text-muted-foreground">{t("voiceAi.successRate")}</span>
                    <span className="font-medium">{agent.successRate}%</span>
                  </div>
                  <Progress value={agent.successRate || 0} className="h-1.5" />
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {t("voiceAi.callsHandled", { count: agent.tasksCompleted })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t("voiceAi.allDay")}
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
                    {t("voiceAi.configure")}
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
                    {t("voiceAi.call")}
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
          {voiceAgents.length > 0 ? t("voiceAi.deployMore") : t("voiceAi.deployFirst")}
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
                    <p className="font-semibold text-sm">{t(template.nameKey)}</p>
                    {alreadyDeployed && (
                      <p className="text-xs text-emerald-400">{t("voiceAi.deployed")}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{t(template.descKey)}</p>
                <Button
                  variant={alreadyDeployed ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                  disabled={alreadyDeployed}
                  data-testid={`button-deploy-${template.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {alreadyDeployed ? t("voiceAi.alreadyDeployed") : (
                    <>
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      {t("voiceAi.deployAgent")}
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
          <h2 className="text-lg font-semibold mb-3">{t("voiceAi.callHistory")}</h2>
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
                      {t("voiceAi.transcript")}
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
          {t("voiceAi.voiceCapabilities")}
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: PhoneIncoming, title: t("voiceAi.capInbound"), desc: t("voiceAi.capInboundDesc") },
            { icon: PhoneOutgoing, title: t("voiceAi.capOutbound"), desc: t("voiceAi.capOutboundDesc") },
            { icon: Clock, title: t("voiceAi.capAppointment"), desc: t("voiceAi.capAppointmentDesc") },
            { icon: Activity, title: t("voiceAi.capSentiment"), desc: t("voiceAi.capSentimentDesc") },
            { icon: BarChart3, title: t("voiceAi.capAnalytics"), desc: t("voiceAi.capAnalyticsDesc") },
            { icon: Zap, title: t("voiceAi.capTransfers"), desc: t("voiceAi.capTransfersDesc") },
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
              {t("voiceAi.makeAiCall")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="call-phone">{t("voiceAi.phoneNumber")}</Label>
              <Input
                id="call-phone"
                data-testid="input-call-phone"
                value={callPhone}
                onChange={(e) => setCallPhone(e.target.value)}
                placeholder={t("voiceAi.phonePlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("voiceAi.phoneHint")}</p>
            </div>
            {voiceAgents.length > 0 && (
              <div className="space-y-2">
                <Label>{t("voiceAi.voiceAgent")}</Label>
                <Select value={callAgentId} onValueChange={setCallAgentId}>
                  <SelectTrigger data-testid="select-call-agent">
                    <SelectValue placeholder={t("voiceAi.selectAgentOptional")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("voiceAi.defaultAiAgent")}</SelectItem>
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
              <Label htmlFor="call-script">{t("voiceAi.callScriptLabel")}</Label>
              <Textarea
                id="call-script"
                data-testid="input-call-script"
                value={callScript}
                onChange={(e) => setCallScript(e.target.value)}
                rows={5}
                placeholder={t("voiceAi.callScriptPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("voiceAi.callScriptHint")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCallDialog(false)} data-testid="button-cancel-call">
              {t("voiceAi.cancel")}
            </Button>
            <Button
              onClick={initiateCall}
              disabled={callMutation.isPending || !callPhone.trim()}
              data-testid="button-confirm-call"
            >
              {callMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  {t("voiceAi.calling")}
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4 mr-1.5" />
                  {t("voiceAi.callNow")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeploy} onOpenChange={(open) => !open && setShowDeploy(false)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" data-testid="dialog-deploy-voice">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate && <selectedTemplate.icon className={`w-5 h-5 ${selectedTemplate.color}`} />}
              {t("voiceAi.deployTitle", { name: selectedTemplate?.name })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="deploy-name">{t("voiceAi.agentName")}</Label>
              <Input
                id="deploy-name"
                data-testid="input-deploy-name"
                value={deployName}
                onChange={(e) => setDeployName(e.target.value)}
                placeholder={t("voiceAi.agentNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deploy-desc">{t("voiceAi.description")}</Label>
              <Textarea
                id="deploy-desc"
                data-testid="input-deploy-desc"
                value={deployDesc}
                onChange={(e) => setDeployDesc(e.target.value)}
                rows={3}
                placeholder={t("voiceAi.descPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deploy-script">{t("voiceAi.deployScriptLabel")}</Label>
              <Textarea
                id="deploy-script"
                data-testid="input-deploy-script"
                value={deployScript}
                onChange={(e) => setDeployScript(e.target.value)}
                rows={10}
                placeholder={t("voiceAi.deployScriptPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("voiceAi.deployScriptHint")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeploy(false)} data-testid="button-cancel-deploy">
              {t("voiceAi.cancel")}
            </Button>
            <Button
              onClick={deployAgent}
              disabled={createMutation.isPending || !deployName.trim()}
              data-testid="button-confirm-deploy"
            >
              {createMutation.isPending ? t("voiceAi.deploying") : t("voiceAi.deployNow")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!configAgent} onOpenChange={(open) => !open && setConfigAgent(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" data-testid="dialog-configure-voice">
          <DialogHeader>
            <DialogTitle>{t("voiceAi.configureVoiceAgent")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="voice-name">{t("voiceAi.name")}</Label>
              <Input
                id="voice-name"
                data-testid="input-voice-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voice-desc">{t("voiceAi.descriptionLabel")}</Label>
              <Textarea
                id="voice-desc"
                data-testid="input-voice-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voice-script">{t("voiceAi.voiceScriptLabel")}</Label>
              <Textarea
                id="voice-script"
                data-testid="input-voice-script"
                value={editScript}
                onChange={(e) => setEditScript(e.target.value)}
                rows={8}
                placeholder={t("voiceAi.voiceScriptPlaceholder")}
              />
              <p className="text-xs text-muted-foreground">{t("voiceAi.voiceScriptHint")}</p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="voice-active">{t("voiceAi.activeLive")}</Label>
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
              {t("voiceAi.cancel")}
            </Button>
            <Button onClick={saveConfig} disabled={updateMutation.isPending} data-testid="button-save-voice-config">
              {updateMutation.isPending ? t("voiceAi.saving") : t("voiceAi.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showTranscript} onOpenChange={(open) => !open && setShowTranscript(null)}>
        <DialogContent className="max-w-lg" data-testid="dialog-transcript">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              {t("voiceAi.callTranscript")}
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
                    {entry.role === "agent" ? t("voiceAi.aiAgentLabel") : t("voiceAi.callerLabel")}
                  </p>
                  {entry.text}
                </div>
              </div>
            ))}
            {showTranscript && parseTranscript(showTranscript.transcript).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t("voiceAi.noTranscript")}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTranscript(null)} data-testid="button-close-transcript">
              {t("voiceAi.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
