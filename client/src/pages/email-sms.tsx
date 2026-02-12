import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Mail,
  Send,
  Bot,
  User,
  Trash2,
  Sparkles,
  Clock,
  BarChart3,
  Eye,
  MousePointerClick,
  Flame,
  TrendingUp,
  Users,
  MessageSquare,
  Activity,
  Phone,
  CheckCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AiChatMessage } from "@shared/schema";
import emailRobotImg from "@assets/robot-email-outreach.png";

interface EmailAnalytics {
  totalSent: number;
  totalOpens: number;
  totalClicks: number;
  engaged: number;
  openRate: number;
  clickRate: number;
  byLevel: {
    hot: number;
    warm: number;
    interested: number;
    none: number;
  };
}

export default function EmailSmsPage() {
  const { t } = useTranslation();
  usePageTitle(t("emailSms.title"));
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"campaigns" | "analytics" | "sms">("campaigns");
  const [smsRecipient, setSmsRecipient] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery<AiChatMessage[]>({
    queryKey: ["/api/chat/messages"],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<EmailAnalytics>({
    queryKey: ["/api/email-analytics"],
  });

  const { data: leads } = useQuery<any[]>({
    queryKey: ["/api/leads"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/email-analytics"] });
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

  const smsMutation = useMutation({
    mutationFn: async ({ leadId, body }: { leadId: number; body: string }) => {
      await apiRequest("POST", `/api/leads/${leadId}/send-sms`, { body });
    },
    onSuccess: () => {
      toast({ title: t("emailSms.smsSentSuccess") });
      setSmsBody("");
      setSmsRecipient("");
    },
    onError: (err: any) => {
      toast({ title: t("emailSms.smsFailedSend"), description: err.message, variant: "destructive" });
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
    t("emailSms.quickAction1"),
    t("emailSms.quickAction2"),
    t("emailSms.quickAction3"),
    t("emailSms.quickAction4"),
  ];

  const smsTemplates = [
    t("emailSms.smsTemplate1"),
    t("emailSms.smsTemplate2"),
    t("emailSms.smsTemplate3"),
  ];

  const recentlyEngaged = (leads || [])
    .filter((l: any) => l.outreachSentAt)
    .sort((a: any, b: any) => {
      const aDate = a.lastEngagedAt || a.outreachSentAt;
      const bDate = b.lastEngagedAt || b.outreachSentAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    })
    .slice(0, 5);

  const totalSent = analytics?.totalSent || 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-email-sms-title">{t("emailSms.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("emailSms.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <Sparkles className="w-3 h-3 mr-1.5" />
            {t("emailSms.aiPowered")}
          </Badge>
        </div>
      </div>

      <Card className="relative overflow-hidden">
        <img src={emailRobotImg} alt={t("emailSms.title")} className="w-full h-40 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
        <div className="absolute inset-0 flex items-center p-6">
          <div>
            <p className="text-lg font-bold">{t("emailSms.heroTitle")}</p>
            <p className="text-sm text-muted-foreground max-w-sm">{t("emailSms.heroDesc")}</p>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeTab === "campaigns" ? "default" : "outline"}
          onClick={() => setActiveTab("campaigns")}
          data-testid="tab-campaigns"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          {t("emailSms.campaigns")}
        </Button>
        <Button
          variant={activeTab === "sms" ? "default" : "outline"}
          onClick={() => setActiveTab("sms")}
          data-testid="tab-sms"
        >
          <Phone className="w-4 h-4 mr-2" />
          {t("emailSms.sms")}
        </Button>
        <Button
          variant={activeTab === "analytics" ? "default" : "outline"}
          onClick={() => setActiveTab("analytics")}
          data-testid="tab-analytics"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          {t("emailSms.emailTracking")}
        </Button>
      </div>

      {activeTab === "sms" ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-chart-2" />
              <h3 className="font-semibold">{t("emailSms.sendSms")}</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("emailSms.recipient")}</Label>
                <Select value={smsRecipient} onValueChange={setSmsRecipient}>
                  <SelectTrigger data-testid="select-sms-recipient">
                    <SelectValue placeholder={t("emailSms.recipientPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(leads || [])
                      .filter((l: any) => l.phone)
                      .map((lead: any) => (
                        <SelectItem key={lead.id} value={String(lead.id)} data-testid={`sms-recipient-${lead.id}`}>
                          {lead.name || lead.email} — {lead.phone}
                        </SelectItem>
                      ))}
                    {(leads || []).filter((l: any) => l.phone).length === 0 && (
                      <SelectItem value="none" disabled>{t("emailSms.noLeadsWithPhone")}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sms-compose-body">{t("emailSms.message")}</Label>
                <Textarea
                  id="sms-compose-body"
                  data-testid="input-sms-compose-body"
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  rows={5}
                  placeholder={t("emailSms.msgPlaceholder")}
                  maxLength={1600}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {t("emailSms.charactersCount", { count: smsBody.length })}
                  {smsBody.length > 160 ? ` ${t("emailSms.segmentsCount", { count: Math.ceil(smsBody.length / 160) })}` : ""}
                </p>
              </div>

              <Button
                onClick={() => smsMutation.mutate({ leadId: Number(smsRecipient), body: smsBody })}
                disabled={smsMutation.isPending || !smsRecipient || !smsBody.trim()}
                data-testid="button-send-sms-compose"
              >
                {smsMutation.isPending ? (
                  <>{t("common.sending")}</>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {t("emailSms.sendSms")}
                  </>
                )}
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {t("emailSms.smsTips")}
              </h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>{t("emailSms.tip1")}</p>
                <p>{t("emailSms.tip2")}</p>
                <p>{t("emailSms.tip3")}</p>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-chart-2" />
                {t("emailSms.smsTemplates")}
              </h3>
              <div className="space-y-2">
                {smsTemplates.map((template, i) => (
                  <Button
                    key={i}
                    variant="secondary"
                    onClick={() => setSmsBody(template)}
                    className="w-full justify-start text-left text-xs font-normal"
                    data-testid={`button-sms-template-${i}`}
                  >
                    {template.substring(0, 60)}...
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : activeTab === "campaigns" ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 flex flex-col" style={{ height: "500px" }}>
            <div className="flex items-center justify-between gap-4 p-4 border-b border-border/50 flex-wrap">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">{t("emailSms.aiAssistant")}</h3>
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
                  {t("common.clear")}
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
                  <h3 className="font-semibold mb-1">{t("emailSms.yourAiManager")}</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {t("emailSms.aiAssistantDesc")}
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
                  placeholder={t("emailSms.chatPlaceholder")}
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
                {t("emailSms.quickActions")}
              </h3>
              <div className="space-y-2">
                {quickActions.map((action, i) => (
                  <Button
                    key={i}
                    variant="secondary"
                    onClick={() => setMessage(action)}
                    className="w-full justify-start text-left text-sm font-normal"
                    data-testid={`button-quick-action-${i}`}
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-chart-2" />
                {t("emailSms.quickStats")}
              </h3>
              {analyticsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : totalSent > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("emailSms.emailsSent")}</span>
                    <span className="font-semibold">{totalSent}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("emailSms.openRate")}</span>
                    <span className="font-semibold text-sky-400">{analytics?.openRate || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("emailSms.clickRate")}</span>
                    <span className="font-semibold text-emerald-400">{analytics?.clickRate || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("emailSms.hotLeads")}</span>
                    <span className="font-semibold text-orange-400">{analytics?.byLevel?.hot || 0}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setActiveTab("analytics")}
                    data-testid="button-view-full-analytics"
                  >
                    {t("emailSms.viewFullAnalytics")}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <Mail className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  {t("emailSms.noEmailsSent")}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                {t("emailSms.scheduledTitle")}
              </h3>
              <div className="text-center py-4 text-muted-foreground text-sm">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                {t("emailSms.noScheduled")}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4" data-testid="stat-total-sent">
                  <div className="flex items-center gap-2 mb-2">
                    <Send className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t("emailSms.totalSent")}</span>
                  </div>
                  <div className="text-2xl font-bold">{analytics?.totalSent || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t("emailSms.totalSentDesc")}</p>
                </Card>

                <Card className="p-4" data-testid="stat-open-rate">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-sky-400" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t("emailSms.openRate")}</span>
                  </div>
                  <div className="text-2xl font-bold text-sky-400">{analytics?.openRate || 0}%</div>
                  <p className="text-xs text-muted-foreground mt-1">{t("emailSms.openRateDesc", { count: analytics?.totalOpens || 0 })}</p>
                </Card>

                <Card className="p-4" data-testid="stat-click-rate">
                  <div className="flex items-center gap-2 mb-2">
                    <MousePointerClick className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t("emailSms.clickRate")}</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">{analytics?.clickRate || 0}%</div>
                  <p className="text-xs text-muted-foreground mt-1">{t("emailSms.clickRateDesc", { count: analytics?.totalClicks || 0 })}</p>
                </Card>

                <Card className="p-4" data-testid="stat-engaged">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-chart-4" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t("emailSms.engaged")}</span>
                  </div>
                  <div className="text-2xl font-bold">{analytics?.engaged || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t("emailSms.engagedDesc")}</p>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-5" data-testid="card-engagement-breakdown">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    {t("emailSms.engagementBreakdown")}
                  </h3>
                  {totalSent > 0 ? (
                    <div className="space-y-4">
                      <EngagementBar label={t("emailSms.hot")} count={analytics?.byLevel?.hot || 0} total={totalSent} color="bg-orange-500" />
                      <EngagementBar label={t("emailSms.warm")} count={analytics?.byLevel?.warm || 0} total={totalSent} color="bg-amber-500" />
                      <EngagementBar label={t("emailSms.interested")} count={analytics?.byLevel?.interested || 0} total={totalSent} color="bg-sky-500" />
                      <EngagementBar label={t("emailSms.noEngagement")} count={analytics?.byLevel?.none || 0} total={totalSent} color="bg-muted-foreground/30" />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Activity className="w-8 h-8 mx-auto mb-3 opacity-40" />
                      <p>{t("emailSms.sendToSee")}</p>
                      <p className="text-xs mt-1">{t("emailSms.goToLeads")}</p>
                    </div>
                  )}
                </Card>

                <Card className="p-5" data-testid="card-recent-activity">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-chart-3" />
                    {t("emailSms.recentActivity")}
                  </h3>
                  {recentlyEngaged.length > 0 ? (
                    <div className="space-y-3">
                      {recentlyEngaged.map((lead: any) => (
                        <div key={lead.id} className="flex items-center gap-3 p-2 rounded-md bg-secondary/20" data-testid={`activity-lead-${lead.id}`}>
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {(lead.name || lead.email || "?").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{lead.name || lead.email}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" /> {lead.emailOpens || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <MousePointerClick className="w-3 h-3" /> {lead.emailClicks || 0}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {lead.engagementLevel === "hot" && (
                              <Badge variant="outline" className="text-orange-400 border-orange-400/30">
                                <Flame className="w-3 h-3 mr-1" />
                                {t("emailSms.hot")}
                              </Badge>
                            )}
                            {lead.engagementLevel === "warm" && (
                              <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                {t("emailSms.warm")}
                              </Badge>
                            )}
                            {lead.engagementLevel === "interested" && (
                              <Badge variant="outline" className="text-sky-400 border-sky-400/30">
                                <Eye className="w-3 h-3 mr-1" />
                                {t("emailSms.interested")}
                              </Badge>
                            )}
                            {(!lead.engagementLevel || lead.engagementLevel === "none") && (
                              <Badge variant="outline" className="text-muted-foreground">
                                {t("common.sent")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Mail className="w-8 h-8 mx-auto mb-3 opacity-40" />
                      <p>{t("emailSms.noOutreach")}</p>
                      <p className="text-xs mt-1">{t("emailSms.useCampaigns")}</p>
                    </div>
                  )}
                </Card>
              </div>

              {totalSent > 0 && (
                <Card className="p-5" data-testid="card-engagement-funnel">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    {t("emailSms.emailFunnel")}
                  </h3>
                  <div className="flex items-end justify-center gap-4 h-48">
                    <FunnelBar label={t("emailSms.funnelSent")} value={analytics?.totalSent || 0} maxValue={analytics?.totalSent || 1} color="bg-primary/60" />
                    <FunnelBar label={t("emailSms.funnelOpened")} value={analytics?.engaged || 0} maxValue={analytics?.totalSent || 1} color="bg-sky-500/60" />
                    <FunnelBar label={t("emailSms.funnelClicked")} value={(leads || []).filter((l: any) => (l.emailClicks || 0) > 0).length} maxValue={analytics?.totalSent || 1} color="bg-emerald-500/60" />
                    <FunnelBar label={t("emailSms.funnelHot")} value={analytics?.byLevel?.hot || 0} maxValue={analytics?.totalSent || 1} color="bg-orange-500/60" />
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EngagementBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{count} <span className="text-xs text-muted-foreground">({pct}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
    </div>
  );
}

function FunnelBar({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
  const pct = maxValue > 0 ? Math.max((value / maxValue) * 100, 5) : 5;
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <span className="text-lg font-bold">{value}</span>
      <div className="w-full rounded-md overflow-hidden bg-secondary/30" style={{ height: "120px" }}>
        <div className={`w-full ${color} rounded-md`} style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
