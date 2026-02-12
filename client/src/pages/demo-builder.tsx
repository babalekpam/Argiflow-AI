import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
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

export default function DemoBuilderPage() {
  const { t } = useTranslation();
  usePageTitle(t("demoBuilder.title"));
  const [activeTab, setActiveTab] = useState<TabKey>("voice-demo");
  const { toast } = useToast();

  const tabs: { key: TabKey; label: string; icon: typeof Mic }[] = [
    { key: "voice-demo", label: t("demoBuilder.voiceDemoBuilder"), icon: Mic },
    { key: "ai-demo", label: t("demoBuilder.aiDemoBuilder"), icon: Sparkles },
    { key: "checklist", label: t("demoBuilder.installationChecklist"), icon: ListChecks },
  ];

  const voiceOptions = [
    { value: "professional-female", label: t("demoBuilder.professionalFemale") },
    { value: "professional-male", label: t("demoBuilder.professionalMale") },
    { value: "friendly-female", label: t("demoBuilder.friendlyFemale") },
    { value: "friendly-male", label: t("demoBuilder.friendlyMale") },
    { value: "authoritative", label: t("demoBuilder.authoritative") },
    { value: "warm-casual", label: t("demoBuilder.warmCasual") },
  ];

  const industries = [
    { value: "Real Estate", label: t("demoBuilder.realEstate") },
    { value: "Dental / Medical", label: t("demoBuilder.dentalMedical") },
    { value: "Law Firm", label: t("demoBuilder.lawFirm") },
    { value: "Automotive", label: t("demoBuilder.automotive") },
    { value: "Home Services", label: t("demoBuilder.homeServices") },
    { value: "Restaurant", label: t("demoBuilder.restaurant") },
    { value: "Insurance", label: t("demoBuilder.insurance") },
    { value: "Fitness / Wellness", label: t("demoBuilder.fitnessWellness") },
    { value: "Education", label: t("demoBuilder.education") },
    { value: "Other", label: t("demoBuilder.other") },
  ];

  const checklistItems = [
    {
      phase: t("demoBuilder.setup"),
      items: [
        { title: t("demoBuilder.checkItem1"), time: t("demoBuilder.checkItem1Time"), description: t("demoBuilder.checkItem1Desc") },
        { title: t("demoBuilder.checkItem2"), time: t("demoBuilder.checkItem2Time"), description: t("demoBuilder.checkItem2Desc") },
        { title: t("demoBuilder.checkItem3"), time: t("demoBuilder.checkItem3Time"), description: t("demoBuilder.checkItem3Desc") },
        { title: t("demoBuilder.checkItem4"), time: t("demoBuilder.checkItem4Time"), description: t("demoBuilder.checkItem4Desc") },
      ],
    },
    {
      phase: t("demoBuilder.connectPhase"),
      items: [
        { title: t("demoBuilder.checkItem5"), time: t("demoBuilder.checkItem5Time"), description: t("demoBuilder.checkItem5Desc") },
        { title: t("demoBuilder.checkItem6"), time: t("demoBuilder.checkItem6Time"), description: t("demoBuilder.checkItem6Desc") },
        { title: t("demoBuilder.checkItem7"), time: t("demoBuilder.checkItem7Time"), description: t("demoBuilder.checkItem7Desc") },
        { title: t("demoBuilder.checkItem8"), time: t("demoBuilder.checkItem8Time"), description: t("demoBuilder.checkItem8Desc") },
      ],
    },
    {
      phase: t("demoBuilder.testLaunch"),
      items: [
        { title: t("demoBuilder.checkItem9"), time: t("demoBuilder.checkItem9Time"), description: t("demoBuilder.checkItem9Desc") },
        { title: t("demoBuilder.checkItem10"), time: t("demoBuilder.checkItem10Time"), description: t("demoBuilder.checkItem10Desc") },
        { title: t("demoBuilder.checkItem11"), time: t("demoBuilder.checkItem11Time"), description: t("demoBuilder.checkItem11Desc") },
        { title: t("demoBuilder.checkItem12"), time: t("demoBuilder.checkItem12Time"), description: t("demoBuilder.checkItem12Desc") },
      ],
    },
  ];

  const lifetimeUpdates = [
    { title: t("demoBuilder.newBotTemplates"), description: t("demoBuilder.newBotTemplatesDesc") },
    { title: t("demoBuilder.aiModelUpgrades"), description: t("demoBuilder.aiModelUpgradesDesc") },
    { title: t("demoBuilder.featureReleases"), description: t("demoBuilder.featureReleasesDesc") },
    { title: t("demoBuilder.strategyUpdates"), description: t("demoBuilder.strategyUpdatesDesc") },
    { title: t("demoBuilder.bugFixesSecurity"), description: t("demoBuilder.bugFixesSecurityDesc") },
  ];

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
      toast({ title: t("demoBuilder.missingFields"), description: t("demoBuilder.missingFieldsDesc"), variant: "destructive" });
      return;
    }
    setVoiceGenerating(true);
    setTimeout(() => {
      setVoiceGenerating(false);
      setVoiceDemoGenerated(true);
      toast({ title: t("demoBuilder.demoGenerated"), description: t("demoBuilder.voiceDemoReadyDesc", { name: voiceForm.businessName }) });
    }, 2500);
  };

  const generateAiDemo = () => {
    if (!demoForm.businessName || !demoForm.industry) {
      toast({ title: t("demoBuilder.missingFieldsAi"), description: t("demoBuilder.missingFieldsAiDesc"), variant: "destructive" });
      return;
    }
    setAiGenerating(true);
    setTimeout(() => {
      setAiGenerating(false);
      setAiDemoGenerated(true);
      toast({ title: t("demoBuilder.demoGenerated"), description: t("demoBuilder.aiDemoReadyDesc", { name: demoForm.businessName }) });
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
          <h1 className="text-2xl font-bold" data-testid="text-demo-builder-title">{t("demoBuilder.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("demoBuilder.subtitle")}
          </p>
        </div>
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <Zap className="w-3 h-3 mr-1.5" />
          {t("demoBuilder.oneClickTools")}
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
                <h3 className="font-semibold text-lg mb-1">{t("demoBuilder.oneClickVoiceDemo")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("demoBuilder.voiceDemoDesc")}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-voice-demo-form">
            <h3 className="font-semibold mb-4">{t("demoBuilder.createVoiceDemo")}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vd-business">{t("demoBuilder.businessName")}</Label>
                <Input
                  id="vd-business"
                  data-testid="input-vd-business"
                  placeholder={t("demoBuilder.businessNamePlaceholder")}
                  value={voiceForm.businessName}
                  onChange={(e) => setVoiceForm({ ...voiceForm, businessName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vd-industry">{t("demoBuilder.industryLabel")}</Label>
                <Select
                  value={voiceForm.industry}
                  onValueChange={(v) => setVoiceForm({ ...voiceForm, industry: v })}
                >
                  <SelectTrigger data-testid="select-vd-industry">
                    <SelectValue placeholder={t("demoBuilder.selectIndustry")} />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vd-voice">{t("demoBuilder.voiceType")}</Label>
                <Select
                  value={voiceForm.voice}
                  onValueChange={(v) => setVoiceForm({ ...voiceForm, voice: v })}
                >
                  <SelectTrigger data-testid="select-vd-voice">
                    <SelectValue placeholder={t("demoBuilder.selectVoice")} />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vd-greeting">{t("demoBuilder.customGreeting")}</Label>
                <Input
                  id="vd-greeting"
                  data-testid="input-vd-greeting"
                  placeholder={t("demoBuilder.customGreetingPlaceholder")}
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
                    {t("demoBuilder.generating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    {t("demoBuilder.generateVoiceDemo")}
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
                  {t("demoBuilder.newDemo")}
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
                  <h3 className="font-semibold">{t("demoBuilder.demoReadyFor", { name: voiceForm.businessName })}</h3>
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
                    <p className="text-sm font-medium">{t("demoBuilder.aiVoicePreview")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("demoBuilder.voicePreviewText", { name: voiceForm.businessName })}
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
                    toast({ title: t("demoBuilder.linkCopied"), description: t("demoBuilder.linkCopiedDesc") });
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  {t("demoBuilder.copyLink")}
                </Button>
                <Button size="sm" data-testid="button-share-demo">
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  {t("demoBuilder.shareWithProspect")}
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
                <h3 className="font-semibold text-lg mb-1">{t("demoBuilder.oneClickAiDemo")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("demoBuilder.aiDemoDesc")}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6" data-testid="card-ai-demo-form">
            <h3 className="font-semibold mb-4">{t("demoBuilder.createPersonalizedDemo")}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ad-business">{t("demoBuilder.businessNameAi")}</Label>
                <Input
                  id="ad-business"
                  data-testid="input-ad-business"
                  placeholder={t("demoBuilder.businessNameAiPlaceholder")}
                  value={demoForm.businessName}
                  onChange={(e) => setDemoForm({ ...demoForm, businessName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-industry">{t("demoBuilder.industryAi")}</Label>
                <Select
                  value={demoForm.industry}
                  onValueChange={(v) => setDemoForm({ ...demoForm, industry: v })}
                >
                  <SelectTrigger data-testid="select-ad-industry">
                    <SelectValue placeholder={t("demoBuilder.selectIndustry")} />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-website">{t("demoBuilder.websiteUrl")}</Label>
                <Input
                  id="ad-website"
                  data-testid="input-ad-website"
                  placeholder={t("demoBuilder.websitePlaceholder")}
                  value={demoForm.website}
                  onChange={(e) => setDemoForm({ ...demoForm, website: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-pain">{t("demoBuilder.keyPainPoints")}</Label>
                <Input
                  id="ad-pain"
                  data-testid="input-ad-pain"
                  placeholder={t("demoBuilder.painPointsPlaceholder")}
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
                    {t("demoBuilder.buildingDemo")}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    {t("demoBuilder.generateAiDemo")}
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
                  {t("demoBuilder.newDemo")}
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
                  <h3 className="font-semibold">{t("demoBuilder.demoReadyFor", { name: demoForm.businessName })}</h3>
                  <p className="text-xs text-muted-foreground">{demoForm.industry}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-secondary/30 rounded-md p-4 text-center">
                  <p className="text-2xl font-bold text-primary">32%</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("demoBuilder.callsCurrentlyMissed")}</p>
                </div>
                <div className="bg-secondary/30 rounded-md p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">$14,200</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("demoBuilder.monthlyRevenueRecovered")}</p>
                </div>
                <div className="bg-secondary/30 rounded-md p-4 text-center">
                  <p className="text-2xl font-bold text-chart-2">14.2x</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("demoBuilder.projectedRoi")}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {[
                  t("demoBuilder.feature1"),
                  t("demoBuilder.feature2"),
                  t("demoBuilder.feature3"),
                  t("demoBuilder.feature4"),
                  t("demoBuilder.feature5"),
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
                    toast({ title: t("demoBuilder.aiLinkCopied"), description: t("demoBuilder.aiLinkCopiedDesc") });
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  {t("demoBuilder.copyAiLink")}
                </Button>
                <Button size="sm" data-testid="button-share-ai-demo">
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  {t("demoBuilder.shareDemo")}
                </Button>
                <Button variant="outline" size="sm" data-testid="button-preview-ai-demo">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  {t("demoBuilder.preview")}
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
                  <h3 className="font-semibold text-lg">{t("demoBuilder.fifteenMinInstall")}</h3>
                  <Badge className={`${checkProgress === 100 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-primary/10 text-primary border-primary/20"}`}>
                    {completedCheckItems}/{totalCheckItems} {t("demoBuilder.done")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("demoBuilder.checklistDesc")}
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
                <h3 className="font-semibold">{t("demoBuilder.lifetimeUpdates")}</h3>
                <p className="text-xs text-muted-foreground">{t("demoBuilder.lifetimeUpdatesDesc")}</p>
              </div>
              <Badge className="ml-auto bg-chart-3/10 text-chart-3 border-chart-3/20">
                <Star className="w-3 h-3 mr-1" />
                {t("demoBuilder.included")}
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
