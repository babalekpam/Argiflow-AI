import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import type { AiAgent } from "@shared/schema";

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

export default function VoiceAiPage() {
  const { data: agents, isLoading } = useQuery<AiAgent[]>({
    queryKey: ["/api/ai-agents"],
  });

  const voiceAgents = agents?.filter(
    (a) => a.type === "Communication" || a.name === "Chat Responder" || a.name === "Follow-Up Agent"
  ) || [];

  const activeCount = voiceAgents.filter((a) => a.status === "active").length;
  const totalCalls = voiceAgents.reduce((sum, a) => sum + (a.tasksCompleted || 0), 0);
  const avgSuccess =
    voiceAgents.length > 0
      ? (voiceAgents.reduce((sum, a) => sum + (a.successRate || 0), 0) / voiceAgents.length).toFixed(1)
      : "0";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-voice-ai-title">Voice AI</h1>
          <p className="text-muted-foreground text-sm">
            AI-powered voice agents handling calls and conversations 24/7.
          </p>
        </div>
        <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20">
          <Mic className="w-3 h-3 mr-1.5" />
          NEW
        </Badge>
      </div>

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
        <Card className="p-5" data-testid="stat-voice-inbound">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-chart-3/10 flex items-center justify-center">
              <PhoneIncoming className="w-5 h-5 text-chart-3" />
            </div>
            <div>
              <p className="text-2xl font-bold">{Math.round(totalCalls * 0.6)}</p>
              <p className="text-sm text-muted-foreground">Inbound</p>
            </div>
          </div>
        </Card>
        <Card className="p-5" data-testid="stat-voice-outbound">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-chart-4/10 flex items-center justify-center">
              <PhoneOutgoing className="w-5 h-5 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{Math.round(totalCalls * 0.4)}</p>
              <p className="text-sm text-muted-foreground">Outbound</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6" data-testid="card-voice-receptionist">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
              <PhoneIncoming className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">AI Receptionist</h3>
                <StatusBadge status={voiceAgents[0]?.status || "inactive"} />
              </div>
              <p className="text-sm text-muted-foreground">Handles inbound calls, qualifies leads, books appointments</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Call Success Rate</span>
              <span className="font-medium">{avgSuccess}%</span>
            </div>
            <Progress value={Number(avgSuccess)} className="h-1.5" />
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="text-center">
                <p className="text-lg font-bold">&lt;3s</p>
                <p className="text-xs text-muted-foreground">Avg Pickup</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">24/7</p>
                <p className="text-xs text-muted-foreground">Availability</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">5+</p>
                <p className="text-xs text-muted-foreground">Languages</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6" data-testid="card-voice-outreach">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-chart-4/10 flex items-center justify-center">
              <PhoneOutgoing className="w-6 h-6 text-chart-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">Outbound Caller</h3>
                <StatusBadge status={voiceAgents[1]?.status || "inactive"} />
              </div>
              <p className="text-sm text-muted-foreground">Automated follow-ups, reminders, and lead outreach</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Connection Rate</span>
              <span className="font-medium">{voiceAgents[1]?.successRate || 0}%</span>
            </div>
            <Progress value={voiceAgents[1]?.successRate || 0} className="h-1.5" />
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="text-center">
                <p className="text-lg font-bold">Smart</p>
                <p className="text-xs text-muted-foreground">Call Timing</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">Auto</p>
                <p className="text-xs text-muted-foreground">Retry Logic</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">CRM</p>
                <p className="text-xs text-muted-foreground">Synced</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

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

      {voiceAgents.length === 0 && !isLoading && (
        <Card className="p-12 text-center">
          <Phone className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">No Voice AI Agents Yet</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Your Voice AI agents will appear here once configured by the ArgiFlow team.
          </p>
        </Card>
      )}
    </div>
  );
}
