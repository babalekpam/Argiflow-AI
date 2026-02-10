import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  Play,
  Phone,
  Globe,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Clock,
  Share2,
  Copy,
  ExternalLink,
  Zap,
  Star,
  TrendingUp,
  ListChecks,
  FileCheck,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TabKey = "voice-demo" | "ai-demo" | "checklist";

const tabs: { key: TabKey; label: string; icon: typeof Mic }[] = [
  { key: "voice-demo", label: "Voice Demo Builder", icon: Mic },
  { key: "ai-demo", label: "AI Demo Builder", icon: Sparkles },
  { key: "checklist", label: "Installation Checklist", icon: ListChecks },
];

const voiceOptions = [
  { value: "professional-female", label: "Professional Female" },
  { value: "professional-male", label: "Professional Male" },
  { value: "friendly-female", label: "Friendly Female" },
  { value: "friendly-male", label: "Friendly Male" },
  { value: "authoritative", label: "Authoritative" },
  { value: "warm-casual", label: "Warm & Casual" },
];

const industries = [
  "Real Estate",
  "Dental / Medical",
  "Law Firm",
  "Automotive",
  "Home Services",
  "Restaurant",
  "Insurance",
  "Fitness / Wellness",
  "Education",
  "Other",
];

const checklistItems = [
  {
    phase: "Setup",
    items: [
      { title: "Log into ArgiFlow dashboard", time: "30 sec", description: "Access your client's workspace and navigate to Voice AI." },
      { title: "Select bot template for client's industry", time: "1 min", description: "Choose from 10 proven templates. Each has pre-built conversation flows." },
      { title: "Customize greeting with business name", time: "1 min", description: "Update the welcome message, business hours, and key services offered." },
      { title: "Set business hours & after-hours behavior", time: "1 min", description: "Configure when AI answers live vs. takes messages for callback." },
    ],
  },
  {
    phase: "Connect",
    items: [
      { title: "Connect phone number (port or new)", time: "2 min", description: "Forward existing number or provision a new local/toll-free number." },
      { title: "Set up calendar integration", time: "2 min", description: "Connect Google Calendar, Calendly, or other scheduling tool." },
      { title: "Configure CRM connection", time: "2 min", description: "Route leads to client's CRM automatically. Supports all major CRMs." },
      { title: "Set up notification preferences", time: "1 min", description: "Configure email/SMS alerts for new leads, bookings, and urgent calls." },
    ],
  },
  {
    phase: "Test & Launch",
    items: [
      { title: "Run 3 test calls (inbound scenarios)", time: "3 min", description: "Test booking, inquiry, and after-hours scenarios." },
      { title: "Verify CRM entries are created", time: "1 min", description: "Confirm leads from test calls appear in the client's CRM." },
      { title: "Send client welcome email + training video", time: "30 sec", description: "Use the pre-written template. Includes dashboard login and quick-start video." },
      { title: "Mark installation complete", time: "15 sec", description: "Flag the account as live. Monitoring begins automatically." },
    ],
  },
];

const lifetimeUpdates = [
  { title: "New Bot Templates", description: "Every new industry template added to the library, included free." },
  { title: "AI Model Upgrades", description: "When AI models improve, your bots automatically get smarter." },
  { title: "Feature Releases", description: "New platform features, integrations, and tools as they ship." },
  { title: "Strategy Updates", description: "Updated playbooks, ad templates, and SOPs based on market changes." },
  { title: "Bug Fixes & Security", description: "Continuous platform improvements and security patches." },
];

export default function DemoBuilderPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("voice-demo");
  const { toast } = useToast();

  const [voiceForm, setVoiceForm] = useState({
    businessName: "",
    industry: "",
    voice: "",
    greeting: "",
  });
  const [voiceDemoGenerated, setVoiceDemoGenerated] = useState(false);
  const [voiceGenerating, setVoiceGenerating] = useState(false);

  const [demoForm, setDemoForm] = useState({
    businessName: "",
    industry: "",
    website: "",
    painPoints: "",
  });
  const [aiDemoGenerated, setAiDemoGenerated] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const generateVoiceDemo = () => {
    if (!voiceForm.businessName || !voiceForm.industry || !voiceForm.voice) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setVoiceGenerating(true);
    setTimeout(() => {
      setVoiceGenerating(false);
      setVoiceDemoGenerated(true);
      toast({ title: "Demo Generated", description: `Voice demo for ${voiceForm.businessName} is ready to share.` });
    }, 2500);
  };

  const generateAiDemo = () => {
    if (!demoForm.businessName || !demoForm.industry) {
      toast({ title: "Missing fields", description: "Please fill in business name and industry.", variant: "destructive" });
      return;
    }
    setAiGenerating(true);
    setTimeout(() => {
      setAiGenerating(false);
      setAiDemoGenerated(true);
      toast({ title: "Demo Generated", description: `AI demo for ${demoForm.businessName} is ready to share.` });
    }, 3000);
  };

  const toggleCheckItem = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalCheckItems = checklistItems.reduce((s, p) => s + p.items.length, 0);
  const completedCheckItems = checkedItems.size;
  const checkProgress = totalCheckItems > 0 ? Math.round((completedCheckItems / totalCheckItems) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-demo-builder-title">Demos & Install</h1>
          <p className="text-muted-foreground text-sm">
            Generate personalized demos for prospects and install AI for clients in minutes.
          </p>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <Zap className="w-3 h-3 mr-1.5" />
          1-Click Tools
        </Badge>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon className="w-3.5 h-3.5 mr-1.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "voice-demo" && (
        <div className="space-y-4">
          <Card className="p-6" data-testid="card-voice-demo-info">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-md bg-chart-3/10 flex items-center justify-center shrink-0">
                <Mic className="w-6 h-6 text-chart-3" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">1-Click AI Voice Demo Builder</h3>
                <p className="text-sm text-muted-foreground">
                  Generate personalized voice demos for prospects instantly. They hear exactly how their
                  AI receptionist will sound with their business name. One click creates an instant wow factor that closes deals.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-voice-demo-form">
            <h3 className="font-semibold mb-4">Create Voice Demo</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vd-business">Business Name *</Label>
                <Input
                  id="vd-business"
                  data-testid="input-vd-business"
                  placeholder="e.g. Smith Family Dental"
                  value={voiceForm.businessName}
                  onChange={(e) => setVoiceForm({ ...voiceForm, businessName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vd-industry">Industry *</Label>
                <Select
                  value={voiceForm.industry}
                  onValueChange={(v) => setVoiceForm({ ...voiceForm, industry: v })}
                >
                  <SelectTrigger data-testid="select-vd-industry">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vd-voice">Voice Type *</Label>
                <Select
                  value={voiceForm.voice}
                  onValueChange={(v) => setVoiceForm({ ...voiceForm, voice: v })}
                >
                  <SelectTrigger data-testid="select-vd-voice">
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vd-greeting">Custom Greeting (optional)</Label>
                <Input
                  id="vd-greeting"
                  data-testid="input-vd-greeting"
                  placeholder="e.g. Thank you for calling..."
                  value={voiceForm.greeting}
                  onChange={(e) => setVoiceForm({ ...voiceForm, greeting: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6 flex-wrap">
              <Button
                onClick={generateVoiceDemo}
                disabled={voiceGenerating}
                data-testid="button-generate-voice-demo"
              >
                {voiceGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Generate Voice Demo
                  </>
                )}
              </Button>
              {voiceDemoGenerated && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setVoiceDemoGenerated(false);
                    setVoiceForm({ businessName: "", industry: "", voice: "", greeting: "" });
                  }}
                  data-testid="button-reset-voice-demo"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  New Demo
                </Button>
              )}
            </div>
          </Card>

          {voiceDemoGenerated && (
            <Card className="p-6 border-primary/30" data-testid="card-voice-demo-result">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Demo Ready for {voiceForm.businessName}</h3>
                  <p className="text-xs text-muted-foreground">
                    {voiceForm.industry} | {voiceOptions.find((v) => v.value === voiceForm.voice)?.label}
                  </p>
                </div>
              </div>

              <div className="bg-secondary/30 rounded-md p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">AI Voice Preview</p>
                    <p className="text-xs text-muted-foreground">
                      "Thank you for calling {voiceForm.businessName}. How can I help you today?"
                    </p>
                  </div>
                  <Button size="icon" variant="outline" data-testid="button-play-voice-demo">
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
                <div className="w-full bg-secondary/50 rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full w-0" />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-copy-demo-link"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://demo.argiflow.com/${voiceForm.businessName.toLowerCase().replace(/\s+/g, "-")}`);
                    toast({ title: "Link copied", description: "Share this link with your prospect." });
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy Link
                </Button>
                <Button size="sm" data-testid="button-share-demo">
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  Share with Prospect
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "ai-demo" && (
        <div className="space-y-4">
          <Card className="p-6" data-testid="card-ai-demo-info">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">1-Click AI Demo Builder</h3>
                <p className="text-sm text-muted-foreground">
                  Creates personalized demos with the prospect's business in 3 minutes. They watch their business
                  with AI already working. See exact savings. Book themselves. No calls needed. The demo closes them.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-ai-demo-form">
            <h3 className="font-semibold mb-4">Create Personalized Demo</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ad-business">Business Name *</Label>
                <Input
                  id="ad-business"
                  data-testid="input-ad-business"
                  placeholder="e.g. Pacific Coast Realty"
                  value={demoForm.businessName}
                  onChange={(e) => setDemoForm({ ...demoForm, businessName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-industry">Industry *</Label>
                <Select
                  value={demoForm.industry}
                  onValueChange={(v) => setDemoForm({ ...demoForm, industry: v })}
                >
                  <SelectTrigger data-testid="select-ad-industry">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-website">Website URL (optional)</Label>
                <Input
                  id="ad-website"
                  data-testid="input-ad-website"
                  placeholder="e.g. https://pacificcoastrealty.com"
                  value={demoForm.website}
                  onChange={(e) => setDemoForm({ ...demoForm, website: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-pain">Key Pain Points (optional)</Label>
                <Input
                  id="ad-pain"
                  data-testid="input-ad-pain"
                  placeholder="e.g. Missing calls, slow response time"
                  value={demoForm.painPoints}
                  onChange={(e) => setDemoForm({ ...demoForm, painPoints: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6 flex-wrap">
              <Button
                onClick={generateAiDemo}
                disabled={aiGenerating}
                data-testid="button-generate-ai-demo"
              >
                {aiGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
                    Building Demo...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Generate AI Demo
                  </>
                )}
              </Button>
              {aiDemoGenerated && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setAiDemoGenerated(false);
                    setDemoForm({ businessName: "", industry: "", website: "", painPoints: "" });
                  }}
                  data-testid="button-reset-ai-demo"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  New Demo
                </Button>
              )}
            </div>
          </Card>

          {aiDemoGenerated && (
            <Card className="p-6 border-primary/30" data-testid="card-ai-demo-result">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Demo Ready for {demoForm.businessName}</h3>
                  <p className="text-xs text-muted-foreground">{demoForm.industry}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-secondary/30 rounded-md p-4 text-center">
                  <p className="text-2xl font-bold text-primary">32%</p>
                  <p className="text-xs text-muted-foreground mt-1">Calls Currently Missed</p>
                </div>
                <div className="bg-secondary/30 rounded-md p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">$14,200</p>
                  <p className="text-xs text-muted-foreground mt-1">Monthly Revenue Recovered</p>
                </div>
                <div className="bg-secondary/30 rounded-md p-4 text-center">
                  <p className="text-2xl font-bold text-chart-2">14.2x</p>
                  <p className="text-xs text-muted-foreground mt-1">Projected ROI</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {[
                  "AI receptionist answers 100% of calls within 0.3 seconds",
                  "Automatically qualifies leads and books appointments",
                  "Personalized greetings using business name and services",
                  "After-hours handling with smart voicemail and callbacks",
                  "Real-time analytics dashboard with call recordings",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-3.5 h-3.5 text-chart-3 shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-copy-ai-demo-link"
                  onClick={() => {
                    navigator.clipboard.writeText(`https://demo.argiflow.com/ai/${demoForm.businessName.toLowerCase().replace(/\s+/g, "-")}`);
                    toast({ title: "Link copied", description: "Share this personalized demo with your prospect." });
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy Link
                </Button>
                <Button size="sm" data-testid="button-share-ai-demo">
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  Share Demo
                </Button>
                <Button variant="outline" size="sm" data-testid="button-preview-ai-demo">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Preview
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "checklist" && (
        <div className="space-y-4">
          <Card className="p-5" data-testid="card-checklist-header">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-md bg-chart-2/10 flex items-center justify-center shrink-0">
                <ListChecks className="w-6 h-6 text-chart-2" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-lg">15-Minute Installation Process</h3>
                  <Badge className={`${checkProgress === 100 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-primary/10 text-primary border-primary/20"}`}>
                    {completedCheckItems}/{totalCheckItems} Done
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  The checklist that turns 5-hour custom jobs into 15-minute profits.
                  Login, paste, connect, test, deliver, get paid. Refined over 500+ installations.
                </p>
                <div className="w-full bg-secondary/50 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${checkProgress === 100 ? "bg-emerald-400" : "bg-primary"}`}
                    style={{ width: `${checkProgress}%` }}
                    data-testid="progress-checklist"
                  />
                </div>
              </div>
            </div>
          </Card>

          {checklistItems.map((phase, pi) => (
            <div key={pi} className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {pi + 1}
                </span>
                {phase.phase}
              </h3>
              {phase.items.map((item, ii) => {
                const key = `${pi}-${ii}`;
                const checked = checkedItems.has(key);
                return (
                  <Card
                    key={key}
                    className={`p-4 cursor-pointer hover-elevate ${checked ? "border-emerald-500/30" : ""}`}
                    onClick={() => toggleCheckItem(key)}
                    data-testid={`checklist-item-${pi}-${ii}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        checked
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                          : "border-border text-transparent"
                      }`}>
                        <CheckCircle className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className={`text-sm font-medium ${checked ? "line-through text-muted-foreground" : ""}`}>
                            {item.title}
                          </p>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            <Clock className="w-2.5 h-2.5 mr-1" />
                            {item.time}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ))}

          <Card className="p-5 border-primary/20" data-testid="card-lifetime-updates">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Lifetime Updates</h3>
                <p className="text-xs text-muted-foreground">Every new bot, improvement, and strategy - free forever.</p>
              </div>
              <Badge className="ml-auto bg-chart-3/10 text-chart-3 border-chart-3/20">
                <Star className="w-3 h-3 mr-1" />
                Included
              </Badge>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {lifetimeUpdates.map((update, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-chart-3 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">{update.title}</p>
                    <p className="text-[10px] text-muted-foreground">{update.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
