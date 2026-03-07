import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Eye, Users, Clock, MousePointerClick, Search, FileText,
  Mail, AlertTriangle, Monitor, Smartphone, Globe, Activity,
  BarChart3, TrendingUp, ArrowUpRight, Zap, Copy, Code
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VisitorTrackingPage() {
  const [days, setDays] = useState("7");
  const { toast } = useToast();

  const { data: dashboard, isLoading } = useQuery<any>({
    queryKey: ["/api/tracker/dashboard", days],
    queryFn: async () => {
      const res = await fetch(`/api/tracker/dashboard?days=${days}`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: realtime } = useQuery<any>({
    queryKey: ["/api/tracker/realtime"],
    queryFn: async () => {
      const res = await fetch("/api/tracker/realtime");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: visitorList } = useQuery<any>({
    queryKey: ["/api/tracker/visitors", days],
    queryFn: async () => {
      const res = await fetch(`/api/tracker/visitors?days=${days}`);
      return res.json();
    },
  });

  const { data: emailData } = useQuery<any>({
    queryKey: ["/api/tracker/emails"],
    queryFn: async () => {
      const res = await fetch("/api/tracker/emails");
      return res.json();
    },
  });

  const snippetCode = `<script src="${window.location.origin}/argiflow-tracker.js" data-host="${window.location.origin}"></script>`;

  const copySnippet = () => {
    navigator.clipboard.writeText(snippetCode);
    toast({ title: "Copied!", description: "Tracker snippet copied to clipboard" });
  };

  const v = dashboard?.visitors || {};
  const s = dashboard?.sessions || {};
  const em = dashboard?.email || {};

  return (
    <div className="space-y-6" data-testid="visitor-tracking-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Visitor Tracking & Analytics</h1>
          <p className="text-muted-foreground mt-1">Real-time website visitor intelligence, behavior tracking, and email analytics</p>
        </div>
        <div className="flex items-center gap-3">
          {realtime && (
            <Badge variant="outline" className="gap-1.5 py-1 px-3" data-testid="badge-realtime">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {realtime.active_visitors} active now
            </Badge>
          )}
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px]" data-testid="select-days">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Total Visitors"
          value={v.total || 0}
          sub={`${v.new_visitors || 0} new · ${v.returning_visitors || 0} returning`}
          testId="stat-visitors"
        />
        <StatCard
          icon={<Eye className="h-4 w-4" />}
          label="Sessions"
          value={s.total || 0}
          sub={`${s.avg_pages || 0} avg pages · ${s.bounces || 0} bounces`}
          testId="stat-sessions"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Avg Duration"
          value={formatDuration(s.avg_duration)}
          sub={`${s.avg_pages || 0} pages per session`}
          testId="stat-duration"
        />
        <StatCard
          icon={<Mail className="h-4 w-4" />}
          label="Emails Tracked"
          value={em.sent || 0}
          sub={`${em.open_rate || 0}% open · ${em.ctr || 0}% CTR`}
          testId="stat-emails"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList data-testid="tabs-tracking">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="visitors" data-testid="tab-visitors">Visitors</TabsTrigger>
          <TabsTrigger value="behavior" data-testid="tab-behavior">Behavior</TabsTrigger>
          <TabsTrigger value="emails" data-testid="tab-emails">Email Tracking</TabsTrigger>
          <TabsTrigger value="setup" data-testid="tab-setup">Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Top Pages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-muted-foreground text-sm">Loading...</div>
                ) : dashboard?.top_pages?.length ? (
                  <div className="space-y-3">
                    {dashboard.top_pages.map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between" data-testid={`row-page-${i}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                          <span className="text-sm truncate max-w-[200px]">{p.page}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground">{p.unique_visitors} visitors</span>
                          <Badge variant="secondary">{p.views} views</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm text-center py-8">No page view data yet. Install the tracking snippet to start collecting data.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" /> Top Searches
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.top_searches?.length ? (
                  <div className="space-y-3">
                    {dashboard.top_searches.slice(0, 10).map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between" data-testid={`row-search-${i}`}>
                        <span className="text-sm truncate max-w-[200px]">"{s.query}"</span>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground">{s.unique_searchers} users</span>
                          <Badge variant="secondary">{s.count}x</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm text-center py-8">No search data yet</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Monitor className="h-4 w-4" /> Devices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.devices?.length ? (
                  <div className="space-y-3">
                    {dashboard.devices.map((d: any, i: number) => (
                      <div key={i} className="flex items-center justify-between" data-testid={`row-device-${i}`}>
                        <div className="flex items-center gap-2">
                          {d.device === "iOS" || d.device === "Android" ? (
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">{d.device}</span>
                        </div>
                        <Badge variant="outline">{d.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm text-center py-8">No device data yet</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Browsers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.browsers?.length ? (
                  <div className="space-y-3">
                    {dashboard.browsers.map((b: any, i: number) => (
                      <div key={i} className="flex items-center justify-between" data-testid={`row-browser-${i}`}>
                        <span className="text-sm">{b.browser}</span>
                        <Badge variant="outline">{b.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm text-center py-8">No browser data yet</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="visitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Recent Visitors</CardTitle>
            </CardHeader>
            <CardContent>
              {visitorList?.visitors?.length ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground font-medium pb-2 border-b">
                    <span>Visitor</span>
                    <span>Company</span>
                    <span>Device</span>
                    <span>Pages</span>
                    <span>Source</span>
                    <span>Last Seen</span>
                  </div>
                  {visitorList.visitors.map((v: any, i: number) => (
                    <div key={i} className="grid grid-cols-6 gap-2 text-sm py-2 border-b border-border/50" data-testid={`row-visitor-${i}`}>
                      <div className="truncate">
                        {v.name || v.email || (
                          <span className="text-muted-foreground">Anonymous</span>
                        )}
                      </div>
                      <div className="truncate text-muted-foreground">{v.company || "—"}</div>
                      <div className="truncate text-muted-foreground">{v.first_device || "—"}</div>
                      <div>{v.total_pageviews || 0}</div>
                      <div className="truncate text-muted-foreground">{v.utm_source || "direct"}</div>
                      <div className="text-muted-foreground text-xs">{timeAgo(v.last_seen)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm text-center py-12">
                  No visitors tracked yet. Add the tracking snippet to your website to start collecting visitor data.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" /> Rage Clicks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.rage_clicks?.length ? (
                  <div className="space-y-3">
                    {dashboard.rage_clicks.map((r: any, i: number) => (
                      <div key={i} className="flex items-center justify-between" data-testid={`row-rage-${i}`}>
                        <div className="min-w-0">
                          <div className="text-sm truncate max-w-[250px]">{r.page}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {r.element_text || r.element_id || "Unknown element"}
                          </div>
                        </div>
                        <Badge variant="destructive">{r.rage_count}x</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm text-center py-8">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    No rage clicks detected — good UX!
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-500" /> Form Abandonment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.form_abandons?.length ? (
                  <div className="space-y-3">
                    {dashboard.form_abandons.map((f: any, i: number) => (
                      <div key={i} className="space-y-1" data-testid={`row-form-${i}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{f.form_name}</span>
                          <Badge variant={parseFloat(f.abandon_rate) > 50 ? "destructive" : "secondary"}>
                            {f.abandon_rate || 0}% abandoned
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {f.started} started · {f.submitted} submitted · {f.abandoned} abandoned
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{f.page}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm text-center py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    No form abandonment data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {realtime?.recent_activity?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" /> Live Activity (Last 5 min)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {realtime.recent_activity.map((a: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm" data-testid={`row-live-${i}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="truncate">{a.name || a.company || "Anonymous"}</span>
                        <span className="text-muted-foreground truncate">→ {a.page}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{a.first_device}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="emails" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              icon={<Mail className="h-4 w-4" />}
              label="Emails Sent"
              value={em.sent || 0}
              sub="Total tracked emails"
              testId="stat-email-sent"
            />
            <StatCard
              icon={<Eye className="h-4 w-4" />}
              label="Open Rate"
              value={`${em.open_rate || 0}%`}
              sub={`${em.opened || 0} opened of ${em.sent || 0}`}
              testId="stat-email-opens"
            />
            <StatCard
              icon={<MousePointerClick className="h-4 w-4" />}
              label="Click Rate"
              value={`${em.ctr || 0}%`}
              sub={`${em.clicked || 0} clicked`}
              testId="stat-email-clicks"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Recent Tracked Emails</CardTitle>
            </CardHeader>
            <CardContent>
              {emailData?.emails?.length ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground font-medium pb-2 border-b">
                    <span>Recipient</span>
                    <span>Subject</span>
                    <span>Campaign</span>
                    <span>Opens</span>
                    <span>Clicks</span>
                    <span>Sent</span>
                  </div>
                  {emailData.emails.map((e: any, i: number) => (
                    <div key={i} className="grid grid-cols-6 gap-2 text-sm py-2 border-b border-border/50" data-testid={`row-email-${i}`}>
                      <div className="truncate">{e.recipient_name || e.recipient_email}</div>
                      <div className="truncate text-muted-foreground">{e.subject || "—"}</div>
                      <div className="truncate text-muted-foreground">{e.campaign || "—"}</div>
                      <div>
                        <Badge variant={e.opens > 0 ? "default" : "secondary"} className="text-xs">
                          {e.opens}
                        </Badge>
                      </div>
                      <div>
                        <Badge variant={e.clicks > 0 ? "default" : "secondary"} className="text-xs">
                          {e.clicks}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{timeAgo(e.created_at)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm text-center py-12">
                  No tracked emails yet. Use the email tracking API to register emails and track opens/clicks.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Code className="h-4 w-4" /> Install Tracking Snippet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add this snippet to the <code className="bg-muted px-1 py-0.5 rounded text-xs">&lt;head&gt;</code> of any website you want to track. It automatically captures page views, sessions, clicks, rage clicks, scroll depth, search queries, and form behavior.
              </p>
              <div className="relative">
                <pre className="bg-muted/50 border rounded-lg p-4 text-xs overflow-x-auto" data-testid="text-snippet">
                  {snippetCode}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={copySnippet}
                  data-testid="button-copy-snippet"
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>

              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-medium">What Gets Tracked</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { icon: <Eye className="h-4 w-4" />, title: "Page Views", desc: "Every page visit including SPA route changes" },
                    { icon: <Clock className="h-4 w-4" />, title: "Sessions", desc: "Entry/exit pages, duration, bounce rate" },
                    { icon: <MousePointerClick className="h-4 w-4" />, title: "Clicks & Rage Clicks", desc: "All clicks + frustration detection (3+ rapid clicks)" },
                    { icon: <TrendingUp className="h-4 w-4" />, title: "Scroll Depth", desc: "How far visitors scroll on each page" },
                    { icon: <Search className="h-4 w-4" />, title: "Search Queries", desc: "Auto-detects search inputs and tracks queries" },
                    { icon: <FileText className="h-4 w-4" />, title: "Form Behavior", desc: "Start, field focus, abandonment, and submissions" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                      <div className="mt-0.5 text-sky-400">{item.icon}</div>
                      <div>
                        <div className="text-sm font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-medium">JavaScript API</h3>
                <div className="space-y-2">
                  <div className="bg-muted/50 border rounded-lg p-3">
                    <code className="text-xs">ArgiFlow.identify({"{"} user_id: "...", email: "...", name: "...", company: "..." {"}"})</code>
                    <p className="text-xs text-muted-foreground mt-1">Link anonymous visitors to known users after login</p>
                  </div>
                  <div className="bg-muted/50 border rounded-lg p-3">
                    <code className="text-xs">ArgiFlow.track("event_name", "category", {"{"} key: "value" {"}"})</code>
                    <p className="text-xs text-muted-foreground mt-1">Track custom events (button hover, video play, feature use)</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-medium">Email Tracking API</h3>
                <div className="bg-muted/50 border rounded-lg p-3">
                  <code className="text-xs whitespace-pre">{`POST /api/tracker/email/send
{
  "user_id": "your-user-id",
  "recipient_email": "lead@company.com",
  "recipient_name": "John Doe",
  "subject": "Quick question",
  "campaign": "cold-outreach-q1",
  "links": [{ "url": "https://...", "label": "CTA" }]
}

Response: { token, pixel_url, tracked_links }`}</code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Insert the pixel_url as an image in your email for open tracking.
                    Replace links with tracked_links URLs for click tracking.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value, sub, testId }: { icon: any; label: string; value: any; sub: string; testId: string }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">{icon} {label}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0s";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "—";
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
