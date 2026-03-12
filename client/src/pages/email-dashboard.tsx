import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, ArrowUpCircle, History, AlertTriangle, Check, Loader2 } from "lucide-react";

interface QuotaStatus {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  allowed: boolean;
  planPrice: number;
  resetDateFormatted: string;
}

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  status: string;
  tag: string;
  sentAt: string;
}

interface Plan {
  id: string;
  name: string;
  emails: number;
  price: number;
  priceLabel: string;
}

export default function EmailDashboard() {
  const [sendForm, setSendForm] = useState({ to: "", subject: "", body: "" });
  const [sendResult, setSendResult] = useState<string | null>(null);

  const { data: quota, isLoading: quotaLoading } = useQuery<QuotaStatus>({
    queryKey: ["/api/email/quota"],
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<{ emails: EmailLog[]; count: number }>({
    queryKey: ["/api/email/history"],
  });

  const { data: plansData } = useQuery<{ plans: Plan[] }>({
    queryKey: ["/api/email/plans"],
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: { to: string; subject: string; htmlBody: string }) => {
      const res = await apiRequest("POST", "/api/email/send", payload);
      return res.json();
    },
    onSuccess: (data) => {
      setSendResult(data.success ? "sent" : data.error || "Failed to send");
      queryClient.invalidateQueries({ queryKey: ["/api/email/quota"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/history"] });
      if (data.success) setSendForm({ to: "", subject: "", body: "" });
    },
    onError: (err: any) => setSendResult(err.message),
  });

  const upgradeMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await apiRequest("POST", "/api/email/upgrade", { plan });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/quota"] });
    },
  });

  const history = historyData?.emails || [];
  const plans = plansData?.plans || [];

  if (quotaLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    );
  }

  const barColor = (quota?.percentUsed ?? 0) > 90
    ? "bg-red-500"
    : (quota?.percentUsed ?? 0) > 70
      ? "bg-amber-500"
      : "bg-gradient-to-r from-sky-500 to-blue-600";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2" data-testid="text-page-title">
          <Mail className="w-6 h-6 text-sky-400" />
          Email Service
        </h1>
        <p className="text-sm text-slate-400 mt-1">Send emails to your leads and clients through your own mail server.</p>
      </div>

      <Card className="bg-slate-800/60 border-slate-700">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Badge variant="secondary" className="bg-sky-500/20 text-sky-300 border-sky-500/30 capitalize" data-testid="badge-plan">
                {quota?.plan} Plan
              </Badge>
              <h2 className="text-3xl font-bold text-white mt-2" data-testid="text-usage">
                {quota?.used.toLocaleString()}
                <span className="text-lg text-slate-400 font-normal"> / {quota?.limit.toLocaleString()} emails</span>
              </h2>
              <p className="text-sm text-slate-400 mt-1">Resets {quota?.resetDateFormatted}</p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${(quota?.percentUsed ?? 0) > 90 ? "text-red-400" : (quota?.percentUsed ?? 0) > 70 ? "text-amber-400" : "text-sky-400"}`} data-testid="text-percent">
                {quota?.percentUsed}%
              </div>
              <div className="text-xs text-slate-500">used</div>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.min(quota?.percentUsed ?? 0, 100)}%` }}
            />
          </div>

          <div className="flex justify-between mt-2">
            <span className="text-xs text-slate-400">{quota?.remaining.toLocaleString()} remaining</span>
            {(quota?.percentUsed ?? 0) > 80 && (
              <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Running low
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/60 border-slate-700">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-sky-400" />
            Send Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="To: recipient@example.com"
            value={sendForm.to}
            onChange={e => setSendForm(p => ({ ...p, to: e.target.value }))}
            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
            data-testid="input-email-to"
          />
          <Input
            placeholder="Subject"
            value={sendForm.subject}
            onChange={e => setSendForm(p => ({ ...p, subject: e.target.value }))}
            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
            data-testid="input-email-subject"
          />
          <Textarea
            placeholder="Message body..."
            value={sendForm.body}
            onChange={e => setSendForm(p => ({ ...p, body: e.target.value }))}
            rows={4}
            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 resize-y"
            data-testid="input-email-body"
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                if (!sendForm.to || !sendForm.subject || !sendForm.body) return;
                setSendResult(null);
                sendMutation.mutate({
                  to: sendForm.to,
                  subject: sendForm.subject,
                  htmlBody: `<p>${sendForm.body.replace(/\n/g, "<br>")}</p>`,
                });
              }}
              disabled={sendMutation.isPending || !quota?.allowed || !sendForm.to || !sendForm.subject || !sendForm.body}
              className="bg-sky-500 hover:bg-sky-600 text-white"
              data-testid="button-send-email"
            >
              {sendMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Send Email</>
              )}
            </Button>
            {sendResult === "sent" && (
              <span className="text-sm text-emerald-400 font-medium flex items-center gap-1" data-testid="text-send-success">
                <Check className="w-4 h-4" /> Email sent successfully
              </span>
            )}
            {sendResult && sendResult !== "sent" && (
              <span className="text-sm text-red-400 font-medium" data-testid="text-send-error">{sendResult}</span>
            )}
          </div>
          {!quota?.allowed && (
            <p className="text-sm text-red-400">Monthly quota reached — upgrade to continue sending.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800/60 border-slate-700">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-sky-400" />
            Email Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {plans.map(plan => {
              const isCurrent = quota?.plan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`rounded-lg p-4 text-center border transition-all ${
                    isCurrent
                      ? "border-sky-500 bg-sky-500/10"
                      : "border-slate-600 bg-slate-700/30 hover:border-slate-500"
                  }`}
                  data-testid={`card-plan-${plan.id}`}
                >
                  <div className="text-sm font-semibold text-white">{plan.name}</div>
                  <div className="text-xl font-bold text-sky-400 my-1">{plan.emails.toLocaleString()}</div>
                  <div className="text-xs text-slate-400 mb-3">emails/month</div>
                  <div className="text-sm font-semibold text-white mb-3">{plan.priceLabel}</div>
                  {isCurrent ? (
                    <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 w-full justify-center">
                      Current Plan
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-slate-500 text-slate-300 hover:bg-sky-500/20 hover:text-sky-300 hover:border-sky-500/30"
                      onClick={() => upgradeMutation.mutate(plan.id)}
                      disabled={upgradeMutation.isPending}
                      data-testid={`button-upgrade-${plan.id}`}
                    >
                      Upgrade
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/60 border-slate-700">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            Recent Sends
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No emails sent yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-email-history">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-2 text-slate-400 font-medium">To</th>
                    <th className="text-left p-2 text-slate-400 font-medium">Subject</th>
                    <th className="text-left p-2 text-slate-400 font-medium">Status</th>
                    <th className="text-left p-2 text-slate-400 font-medium">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(email => (
                    <tr key={email.id} className="border-b border-slate-700/50 hover:bg-slate-700/20" data-testid={`row-email-${email.id}`}>
                      <td className="p-2 text-white">{email.to}</td>
                      <td className="p-2 text-slate-300 max-w-[200px] truncate">{email.subject}</td>
                      <td className="p-2">
                        <Badge
                          variant="outline"
                          className={email.status === "sent"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                          }
                        >
                          {email.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-slate-400 text-xs">
                        {new Date(email.sentAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
