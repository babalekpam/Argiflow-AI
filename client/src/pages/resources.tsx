import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Bot,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Megaphone,
  MousePointerClick,
  Layers,
  BookOpen,
  Target,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  Briefcase,
  ShieldCheck,
  Star,
  TrendingUp,
  Play,
  Zap,
  ArrowRight,
  Phone,
  Home,
  Stethoscope,
  Scale,
  Car,
  Dumbbell,
  Wrench,
  Store,
  GraduationCap,
  Heart,
  Landmark,
  Building2,
  Key,
  FileCheck,
  Package,
  Crosshair,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import resourcesRobotImg from "@assets/image_1770823658874.png";

type TabKey = "bot-templates" | "ad-templates" | "funnels" | "blueprint" | "sops";

const botTemplateDefs = [
  { nameKey: "resources.botRealEstate", industryKey: "resources.botRealEstateIndustry", descKey: "resources.botRealEstateDesc", icon: Home, conversations: "12,400+", price: "$2,500", featureKeys: ["resources.featureLeadQualification", "resources.featureShowingScheduler", "resources.featureFollowUpSequences", "resources.featureMarketAnalysisChat"] },
  { nameKey: "resources.botDental", industryKey: "resources.botDentalIndustry", descKey: "resources.botDentalDesc", icon: Stethoscope, conversations: "8,200+", price: "$2,500", featureKeys: ["resources.featureAppointmentBooking", "resources.featureInsuranceVerification", "resources.featureReminderSystem", "resources.featureEmergencyRouting"] },
  { nameKey: "resources.botLegal", industryKey: "resources.botLegalIndustry", descKey: "resources.botLegalDesc", icon: Scale, conversations: "6,800+", price: "$2,500", featureKeys: ["resources.featureCaseScreening", "resources.featureIntakeForms", "resources.featureConsultationBooking", "resources.featureConflictChecks"] },
  { nameKey: "resources.botAuto", industryKey: "resources.botAutoIndustry", descKey: "resources.botAutoDesc", icon: Car, conversations: "9,100+", price: "$2,500", featureKeys: ["resources.featureInventorySearch", "resources.featureTestDriveBooking", "resources.featureTradeInEstimator", "resources.featureFinancingPreQual"] },
  { nameKey: "resources.botFitness", industryKey: "resources.botFitnessIndustry", descKey: "resources.botFitnessDesc", icon: Dumbbell, conversations: "5,600+", price: "$2,500", featureKeys: ["resources.featureClassBooking", "resources.featureMembershipManagement", "resources.featurePtUpsells", "resources.featureTrialOffers"] },
  { nameKey: "resources.botHomeServices", industryKey: "resources.botHomeServicesIndustry", descKey: "resources.botHomeServicesDesc", icon: Wrench, conversations: "11,300+", price: "$2,500", featureKeys: ["resources.featureServiceBooking", "resources.featureEmergencyDispatch", "resources.featureQuoteGeneration", "resources.featureMaintenanceReminders"] },
  { nameKey: "resources.botRestaurant", industryKey: "resources.botRestaurantIndustry", descKey: "resources.botRestaurantDesc", icon: Store, conversations: "7,400+", price: "$2,500", featureKeys: ["resources.featureReservations", "resources.featureCateringQuotes", "resources.featureWaitlistManagement", "resources.featureEventBooking"] },
  { nameKey: "resources.botEducation", industryKey: "resources.botEducationIndustry", descKey: "resources.botEducationDesc", icon: GraduationCap, conversations: "4,900+", price: "$2,500", featureKeys: ["resources.featureEnrollmentGuidance", "resources.featureTourScheduling", "resources.featureApplicationStatus", "resources.featureFinancialAidInfo"] },
  { nameKey: "resources.botInsurance", industryKey: "resources.botInsuranceIndustry", descKey: "resources.botInsuranceDesc", icon: ShieldCheck, conversations: "10,200+", price: "$2,500", featureKeys: ["resources.featureQuoteCollection", "resources.featurePolicyComparison", "resources.featureClaimsGuidance", "resources.featureRenewalReminders"] },
  { nameKey: "resources.botWellness", industryKey: "resources.botWellnessIndustry", descKey: "resources.botWellnessDesc", icon: Heart, conversations: "6,100+", price: "$2,500", featureKeys: ["resources.featureTreatmentBooking", "resources.featureConsultationIntake", "resources.featurePackageUpsells", "resources.featureAftercareGuidance"] },
  { nameKey: "resources.botMedBilling", industryKey: "resources.botMedBillingIndustry", descKey: "resources.botMedBillingDesc", icon: DollarSign, conversations: "9,800+", price: "$3,500", featureKeys: ["resources.featureClaimStatusLookup", "resources.featurePaymentPlanSetup", "resources.featureBalanceInquiries", "resources.featureInsuranceVerification"] },
  { nameKey: "resources.botRevCycle", industryKey: "resources.botRevCycleIndustry", descKey: "resources.botRevCycleDesc", icon: Briefcase, conversations: "7,600+", price: "$3,500", featureKeys: ["resources.featureEligibilityVerification", "resources.featurePriorAuthTracking", "resources.featureDenialFollowUp", "resources.featurePaymentReminders"] },
  { nameKey: "resources.botTaxLien", industryKey: "resources.botTaxLienIndustry", descKey: "resources.botTaxLienDesc", icon: Landmark, conversations: "6,300+", price: "$3,500", featureKeys: ["resources.featureCountyDatabaseCrawling", "resources.featureRoiAnalysis", "resources.featureAuctionMonitoring", "resources.featureAutoBidStrategies", "resources.featurePortfolioTracking"] },
  { nameKey: "resources.botTaxDeed", industryKey: "resources.botTaxDeedIndustry", descKey: "resources.botTaxDeedDesc", icon: Building2, conversations: "5,400+", price: "$3,500", featureKeys: ["resources.featureDeedPropertyDiscovery", "resources.featureTitleRiskAnalysis", "resources.featureArvEstimation", "resources.featureRedemptionTracking", "resources.featureAuctionAlerts"] },
  { nameKey: "resources.botWholesale", industryKey: "resources.botWholesaleIndustry", descKey: "resources.botWholesaleDesc", icon: Key, conversations: "8,900+", price: "$3,500", featureKeys: ["resources.featureOffMarketDiscovery", "resources.featureCompAnalysis", "resources.featureContractGeneration", "resources.featureBuyerMatching", "resources.featureDealScoring"] },
  { nameKey: "resources.botGovt", industryKey: "resources.botGovtIndustry", descKey: "resources.botGovtDesc", icon: FileCheck, conversations: "4,200+", price: "$3,500", featureKeys: ["resources.featureSamGovMonitoring", "resources.featureRfpAnalysis", "resources.featureDeadlineTracking", "resources.featureWinProbabilityScoring", "resources.featureSetAsideFiltering"] },
  { nameKey: "resources.botArbitrage", industryKey: "resources.botArbitrageIndustry", descKey: "resources.botArbitrageDesc", icon: Package, conversations: "11,200+", price: "$3,500", featureKeys: ["resources.featurePriceScanning", "resources.featureRoiCalculation", "resources.featureInventoryMonitoring", "resources.featureFeeAnalysis", "resources.featureProfitAlerts"] },
  { nameKey: "resources.botLeadGen", industryKey: "resources.botLeadGenIndustry", descKey: "resources.botLeadGenDesc", icon: Crosshair, conversations: "14,800+", price: "$3,500", featureKeys: ["resources.featureMultiSourceScraping", "resources.featureContactEnrichment", "resources.featureIntentScoring", "resources.featureOutreachDrafting", "resources.featurePipelineAutomation"] },
];

const adTemplateDefs = [
  { nameKey: "resources.adProblemSolution", type: "Facebook / Instagram", spend: "$8,200", revenue: "$73,800", roi: "9x", hook: "Your phone rings. Nobody answers. That customer just called your competitor.", description: "Pain-point focused ad that highlights missed calls and lost revenue. Proven performer across 50+ campaigns." },
  { nameKey: "resources.adBeforeAfter", type: "Facebook / Instagram", spend: "$12,400", revenue: "$111,600", roi: "9x", hook: "Before AI: 23% of calls answered. After AI: 100% of calls answered. 24/7.", description: "Side-by-side comparison showing transformation. Works especially well with real client data." },
  { nameKey: "resources.adDemoVideo", type: "Facebook Video", spend: "$6,800", revenue: "$61,200", roi: "9x", hook: "Watch this AI answer a real call in 0.3 seconds...", description: "Short-form video showing the AI in action. Highest engagement rate of all our creatives." },
  { nameKey: "resources.adRoiCalc", type: "Facebook Lead Form", spend: "$9,600", revenue: "$86,400", roi: "9x", hook: "How much revenue are you losing from missed calls? Enter your numbers.", description: "Interactive lead form ad that pre-qualifies prospects by having them calculate their own lost revenue." },
  { nameKey: "resources.adTestimonial", type: "Facebook / Instagram", spend: "$5,200", revenue: "$46,800", roi: "9x", hook: "3 business owners. 3 industries. Same result: Never miss a call again.", description: "Multi-slide carousel with real client testimonials and results. High trust factor." },
  { nameKey: "resources.adScarcity", type: "Facebook / Instagram", spend: "$7,800", revenue: "$70,200", roi: "9x", hook: "We only onboard 5 new AI voice clients per week. 2 spots left.", description: "Urgency-driven ad with limited availability messaging. Best for filling pipeline fast." },
];

const funnelTemplateDefs = [
  { nameKey: "resources.funnelVoiceDemo", pages: 5, conversionRate: "34%", description: "Complete VSL funnel with demo video, ROI calculator, social proof, and booking page. Import-ready.", steps: ["Landing Page", "VSL Video", "ROI Calculator", "Testimonials", "Book Call"] },
  { nameKey: "resources.funnelWebinar", pages: 4, conversionRate: "28%", description: "Automated webinar funnel that educates prospects and books demos. Includes replay and follow-up emails.", steps: ["Registration", "Thank You + Reminder", "Webinar / Replay", "Book Demo"] },
  { nameKey: "resources.funnelAudit", pages: 3, conversionRate: "41%", description: "Offer a free missed-call audit to prospects. Captures info, delivers report, books strategy call.", steps: ["Audit Request", "Instant Report", "Strategy Call"] },
  { nameKey: "resources.funnelCaseStudy", pages: 4, conversionRate: "22%", description: "Showcase client success stories with data. Builds credibility and drives warm leads to booking.", steps: ["Case Study Page", "Results Breakdown", "Social Proof", "Book Call"] },
];

const blueprintStepDefs = [
  { step: 1, titleKey: "resources.blueprintStep1Title", descKey: "resources.blueprintStep1Desc", timeframe: "Day 1" },
  { step: 2, titleKey: "resources.blueprintStep2Title", descKey: "resources.blueprintStep2Desc", timeframe: "Day 1-2" },
  { step: 3, titleKey: "resources.blueprintStep3Title", descKey: "resources.blueprintStep3Desc", timeframe: "Day 2-3" },
  { step: 4, titleKey: "resources.blueprintStep4Title", descKey: "resources.blueprintStep4Desc", timeframe: "Day 3-5" },
  { step: 5, titleKey: "resources.blueprintStep5Title", descKey: "resources.blueprintStep5Desc", timeframe: "Day 5-7" },
  { step: 6, titleKey: "resources.blueprintStep6Title", descKey: "resources.blueprintStep6Desc", timeframe: "Day 7-10" },
];

const outreachTemplateDefs = [
  { nameKey: "resources.outreach1Name", subjectKey: "resources.outreach1Subject", previewKey: "resources.outreach1Preview" },
  { nameKey: "resources.outreach2Name", subjectKey: "resources.outreach2Subject", previewKey: "resources.outreach2Preview" },
  { nameKey: "resources.outreach3Name", subjectKey: "", previewKey: "resources.outreach3Preview" },
  { nameKey: "resources.outreach4Name", subjectKey: "resources.outreach4Subject", previewKey: "resources.outreach4Preview" },
];

const sopCategoryDefs = [
  {
    titleKey: "resources.sopInstallation", icon: Wrench, count: 6,
    items: ["Voice AI Setup Checklist (15 min)", "Phone Number Porting Guide", "Greeting Script Configuration", "Calendar Integration Setup", "CRM Connection Walkthrough", "Go-Live Testing Protocol"],
  },
  {
    titleKey: "resources.sopSales", icon: DollarSign, count: 5,
    items: ["Discovery Call Framework", "Demo Presentation Script", "Proposal Template + Pricing", "Objection Handling Guide", "Contract & Onboarding Flow"],
  },
  {
    titleKey: "resources.sopSupport", icon: Heart, count: 4,
    items: ["Monthly Check-in Template", "Performance Report Guide", "Escalation & Troubleshooting", "Upsell Opportunity Identification"],
  },
  {
    titleKey: "resources.sopQuality", icon: ShieldCheck, count: 4,
    items: ["Call Quality Audit Checklist", "Bot Response Accuracy Review", "Customer Satisfaction Survey", "Weekly Performance Dashboard"],
  },
  {
    titleKey: "resources.sopScaling", icon: Users, count: 5,
    items: ["Hiring Your First VA", "VA Task Delegation Template", "Team Training Curriculum", "Agency Growth Milestones", "Referral Program Setup"],
  },
  {
    titleKey: "resources.sopMarketing", icon: Megaphone, count: 4,
    items: ["Content Calendar Template", "Social Media Posting Guide", "Testimonial Collection Process", "Case Study Creation Framework"],
  },
];

export default function ResourcesPage() {
  const { t } = useTranslation();
  usePageTitle(t("resources.pageTitle"));
  const [activeTab, setActiveTab] = useState<TabKey>("bot-templates");
  const [installedItems, setInstalledItems] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const tabs: { key: TabKey; label: string; icon: typeof Bot }[] = [
    { key: "bot-templates", label: t("resources.botTemplates"), icon: Bot },
    { key: "ad-templates", label: t("resources.adTemplates"), icon: Megaphone },
    { key: "funnels", label: t("resources.vslFunnels"), icon: Layers },
    { key: "blueprint", label: t("resources.clientBlueprint"), icon: Target },
    { key: "sops", label: t("resources.agencySOPs"), icon: FileText },
  ];

  const markInstalled = (key: string) => {
    setInstalledItems((prev) => ({ ...prev, [key]: true }));
  };

  const [installingKey, setInstallingKey] = useState<string | null>(null);

  const installAgentMutation = useMutation({
    mutationFn: async (data: { name: string; type: string; description: string; templateIndustry: string; templateFeatures: string[] }) => {
      const res = await apiRequest("POST", "/api/ai-agents", {
        name: data.name,
        type: data.type,
        description: data.description,
        status: "active",
        generateScript: true,
        templateIndustry: data.templateIndustry,
        templateFeatures: data.templateFeatures,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agents"] });
    },
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t("resources.copied"), description: t("resources.copiedToClipboard", { label }) });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-resources-title">{t("resources.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("resources.subtitle")}
          </p>
        </div>
        <Badge className="bg-chart-3/10 text-chart-3 border-chart-3/20">
          <Star className="w-3 h-3 mr-1.5" />
          {t("resources.includedFree")}
        </Badge>
      </div>

      <Card className="relative overflow-hidden">
        <img src={resourcesRobotImg} alt={t("resources.title")} className="w-full h-40 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
        <div className="absolute inset-0 flex items-center p-6">
          <div>
            <p className="text-lg font-bold">{t("resources.resourceLibrary")}</p>
            <p className="text-sm text-muted-foreground max-w-sm">{t("resources.resourceLibraryDesc")}</p>
          </div>
        </div>
      </Card>

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

      {activeTab === "bot-templates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {t("resources.botTemplatesDesc", { count: botTemplateDefs.length })}
            </p>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {t("resources.templatesCount", { count: botTemplateDefs.length })}
            </Badge>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {botTemplateDefs.map((template, i) => {
              const key = `bot-${i}`;
              const installed = installedItems[key];
              const name = t(template.nameKey);
              const industry = t(template.industryKey);
              const description = t(template.descKey);
              const features = template.featureKeys.map((fk) => t(fk));
              return (
                <Card key={i} className={`p-5 ${installed ? "border-emerald-500/30" : ""}`} data-testid={`card-bot-template-${i}`}>
                  {installed && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-md bg-emerald-500/10">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-400">
                        {t("resources.agentCreatedActive")}
                      </p>
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 ${installed ? "bg-emerald-500/10" : "bg-primary/10"}`}>
                      {installed ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <template.icon className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-sm">{name}</h3>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                          {template.conversations} {t("resources.conversations")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{industry}</p>
                      <p className="text-xs text-muted-foreground mb-3">{description}</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {features.map((f, fi) => (
                          <Badge key={fi} variant="outline" className="text-[10px] py-0 px-1.5">
                            {f}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {t("resources.chargeClients")} <span className="text-foreground font-semibold">{template.price}</span>
                        </span>
                        {installed ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" data-testid={`badge-installed-bot-${i}`}>
                            <CheckCircle className="w-3 h-3 mr-1.5" />
                            {t("resources.installedActive")}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            data-testid={`button-install-bot-${i}`}
                            disabled={installingKey === key}
                            onClick={async () => {
                              setInstallingKey(key);
                              try {
                                const result = await installAgentMutation.mutateAsync({
                                  name,
                                  type: "Chat Responder",
                                  description: `${industry} bot: ${description} Features: ${features.join(", ")}`,
                                  templateIndustry: industry,
                                  templateFeatures: features,
                                });
                                markInstalled(key);
                                const hasScript = result?.script;
                                toast({
                                  title: t("resources.isLive", { name }),
                                  description: hasScript
                                    ? t("resources.scriptGeneratedDesc")
                                    : t("resources.scriptProcessingDesc"),
                                });
                              } catch {
                                toast({ title: t("resources.installationFailed"), description: t("resources.installationFailedDesc"), variant: "destructive" });
                              } finally {
                                setInstallingKey(null);
                              }
                            }}
                          >
                            {installingKey === key ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            {installingKey === key ? t("resources.generatingAiScript") : t("resources.installTemplate")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "ad-templates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {t("resources.adTemplatesDesc")}
            </p>
            <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20">
              {t("resources.averageRoi")}
            </Badge>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {adTemplateDefs.map((ad, i) => {
              const key = `ad-${i}`;
              const used = installedItems[key];
              const adName = t(ad.nameKey);
              return (
                <Card key={i} className={`p-5 ${used ? "border-emerald-500/30" : ""}`} data-testid={`card-ad-template-${i}`}>
                  {used && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-md bg-emerald-500/10">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-400">
                        {t("resources.copiedToClipboardAd")}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div>
                      <h3 className="font-semibold text-sm">{adName}</h3>
                      <p className="text-xs text-muted-foreground">{ad.type}</p>
                    </div>
                    {used ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t("resources.copied")}
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        {ad.roi} ROI
                      </Badge>
                    )}
                  </div>
                  <div className="bg-secondary/30 rounded-md p-3 mb-3">
                    <p className="text-xs text-muted-foreground mb-1">{t("resources.hookHeadline")}</p>
                    <p className="text-sm font-medium italic">"{ad.hook}"</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{ad.description}</p>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
                    <span>{t("resources.spend")} <span className="text-foreground font-medium">{ad.spend}</span></span>
                    <span>{t("resources.revenue")} <span className="text-emerald-400 font-medium">{ad.revenue}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      data-testid={`button-copy-ad-${i}`}
                      onClick={() => handleCopy(ad.hook, "Ad hook")}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      {t("resources.copyHook")}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      data-testid={`button-use-ad-${i}`}
                      onClick={() => {
                        markInstalled(key);
                        handleCopy(`${ad.hook}\n\n${ad.description}`, "Ad template");
                        toast({ title: t("resources.adCopied", { name: adName }), description: t("resources.adCopiedDesc") });
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      {t("resources.useTemplate")}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "funnels" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {t("resources.funnelsDesc")}
            </p>
            <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20">
              {t("resources.provenFunnels")}
            </Badge>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {funnelTemplateDefs.map((funnel, i) => {
              const key = `funnel-${i}`;
              const imported = installedItems[key];
              const funnelName = t(funnel.nameKey);
              return (
                <Card key={i} className={`p-5 ${imported ? "border-emerald-500/30" : ""}`} data-testid={`card-funnel-${i}`}>
                  {imported && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-md bg-emerald-500/10">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-400">
                        {t("resources.importedGoTo")}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <h3 className="font-semibold text-sm">{funnelName}</h3>
                    {imported ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t("resources.imported")}
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        {funnel.conversionRate} {t("resources.conversion")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">{funnel.description}</p>
                  <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-3">
                    {funnel.steps.map((step, si) => (
                      <div key={si} className="flex items-center gap-1 shrink-0">
                        <div className={`px-2.5 py-1.5 rounded-md text-[10px] font-medium ${imported ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"}`}>
                          {step}
                        </div>
                        {si < funnel.steps.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">{t("resources.pagesIncluded", { count: funnel.pages })}</span>
                    {imported ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" data-testid={`badge-imported-funnel-${i}`}>
                        <CheckCircle className="w-3 h-3 mr-1.5" />
                        {t("resources.imported")}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        data-testid={`button-import-funnel-${i}`}
                        onClick={() => {
                          markInstalled(key);
                          toast({ title: t("resources.funnelImported", { name: funnelName }), description: t("resources.funnelImportedDesc", { pages: funnel.pages }) });
                        }}
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        {t("resources.importFunnel")}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "blueprint" && (
        <div className="space-y-6">
          <Card className="p-6" data-testid="card-blueprint-header">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-md bg-chart-2/10 flex items-center justify-center shrink-0">
                <Target className="w-6 h-6 text-chart-2" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{t("resources.organicClientBlueprint")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("resources.blueprintDesc")}
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">{t("resources.tenDayPlaybook")}</h3>
            {blueprintStepDefs.map((step) => (
              <Card key={step.step} className="p-4" data-testid={`card-blueprint-step-${step.step}`}>
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                    {step.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold text-sm">{t(step.titleKey)}</h4>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        <Clock className="w-2.5 h-2.5 mr-1" />
                        {step.timeframe}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{t(step.descKey)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">{t("resources.outreachTemplates")}</h3>
            {outreachTemplateDefs.map((tpl, i) => {
              const tplName = t(tpl.nameKey);
              const tplSubject = tpl.subjectKey ? t(tpl.subjectKey) : "";
              const tplPreview = t(tpl.previewKey);
              return (
                <Card key={i} className="p-4" data-testid={`card-outreach-${i}`}>
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <h4 className="font-semibold text-sm">{tplName}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`button-copy-outreach-${i}`}
                      onClick={() => handleCopy(tplPreview, "Template")}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      {t("resources.copy")}
                    </Button>
                  </div>
                  {tplSubject && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {t("resources.subject")} <span className="text-foreground">{tplSubject}</span>
                    </p>
                  )}
                  <div className="bg-secondary/30 rounded-md p-3">
                    <p className="text-xs text-muted-foreground italic">{tplPreview}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "sops" && (
        <div className="space-y-4">
          <Card className="p-5" data-testid="card-sops-header">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{t("resources.fiveMinAgencySOPs")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("resources.sopsDesc")}
                </p>
              </div>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sopCategoryDefs.map((cat, i) => {
              const key = `sop-${i}`;
              const viewed = installedItems[key];
              const catTitle = t(cat.titleKey);
              return (
                <Card key={i} className={`p-5 ${viewed ? "border-emerald-500/30" : ""}`} data-testid={`card-sop-category-${i}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center ${viewed ? "bg-emerald-500/10" : "bg-primary/10"}`}>
                      {viewed ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <cat.icon className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{catTitle}</h3>
                      <p className="text-xs text-muted-foreground">{t("resources.procedures", { count: cat.count })}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {cat.items.map((item, ii) => (
                      <div key={ii} className="flex items-center gap-2 text-xs">
                        <CheckCircle className="w-3 h-3 text-chart-3 shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                  {viewed ? (
                    <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-md bg-emerald-500/10">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-400">
                        {t("resources.sopsAccessed")}
                      </p>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      data-testid={`button-view-sops-${i}`}
                      onClick={() => {
                        markInstalled(key);
                        toast({ title: t("resources.sopAccessedTitle", { title: catTitle }), description: t("resources.sopAccessedDesc", { count: cat.count }) });
                      }}
                    >
                      <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                      {t("resources.viewSOPs")}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
