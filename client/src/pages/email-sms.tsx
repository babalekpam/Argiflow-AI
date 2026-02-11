import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Mail,
  MessageSquare,
  Send,
  Bot,
  User,
  Trash2,
  Sparkles,
  Clock,
  BarChart3,
} from "lucide-react";
import type { AiChatMessage } from "@shared/schema";
import emailRobotImg from "@assets/robot-email-outreach.png";


export default function EmailSmsPage() {
  usePageTitle("Email & SMS Campaigns");
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery<AiChatMessage[]>({
    queryKey: ["/api/chat/messages"],
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/chat/messages", { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setMessage("");
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/chat/messages");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || sendMutation.isPending) return;
    sendMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    "Create an email campaign for warm leads",
    "Send SMS follow-ups to no-shows",
    "Draft a nurture sequence for new leads",
    "Schedule a weekly newsletter",
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-email-sms-title">Email & SMS</h1>
          <p className="text-muted-foreground text-sm">
            Tell your AI assistant what campaigns to run. It handles everything.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <Sparkles className="w-3 h-3 mr-1.5" />
            AI Powered
          </Badge>
        </div>
      </div>

      <Card className="relative overflow-hidden">
        <img src={emailRobotImg} alt="Email & SMS AI" className="w-full h-40 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
        <div className="absolute inset-0 flex items-center p-6">
          <div>
            <p className="text-lg font-bold">AI Campaign Assistant</p>
            <p className="text-sm text-muted-foreground max-w-sm">Tell your AI what campaigns to run — it crafts copy, sends emails, and tracks engagement automatically.</p>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex flex-col" style={{ height: "500px" }}>
          <div className="flex items-center justify-between gap-4 p-4 border-b border-border/50 flex-wrap">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">AI Campaign Assistant</h3>
            </div>
            {messages && messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearMutation.mutate()}
                disabled={clearMutation.isPending}
                data-testid="button-clear-chat"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Clear
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <Skeleton className="h-16 flex-1 rounded-md" />
                  </div>
                ))}
              </div>
            ) : messages && messages.length > 0 ? (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    data-testid={`chat-message-${msg.id}`}
                  >
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className={msg.role === "user" ? "bg-primary/10 text-primary text-xs" : "bg-chart-3/10 text-chart-3 text-xs"}>
                        {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[75%] rounded-md p-3 text-sm whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary/10 text-foreground"
                          : "bg-secondary/50 text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {sendMutation.isPending && (
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="bg-chart-3/10 text-chart-3 text-xs">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="max-w-[75%] rounded-md p-3 bg-secondary/50 text-foreground">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Your AI Campaign Manager</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Tell me what campaigns you want to run. I'll handle the email copy, SMS messages, scheduling, and optimization.
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-border/50">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell AI what campaign to create..."
                disabled={sendMutation.isPending}
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sendMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => setMessage(action)}
                  className="w-full text-left p-3 rounded-md bg-secondary/30 text-sm hover-elevate transition-colors"
                  data-testid={`button-quick-action-${i}`}
                >
                  {action}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-chart-2" />
              Recent Campaigns
            </h3>
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Mail className="w-6 h-6 mx-auto mb-2 opacity-50" />
              No campaigns yet. Ask the AI to create one.
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Scheduled
            </h3>
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
              No scheduled campaigns.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
