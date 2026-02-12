import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Settings,
  Bell,
  MessageSquare,
  Bot,
  Target,
  Calendar,
  BarChart3,
  Moon,
  Shield,
  User,
  Mail,
  Phone,
  Link2,
  Webhook,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Save,
  Building2,
  Globe,
  Sparkles,
  Loader2,
  GraduationCap,
  RefreshCw,
  BookOpen,
  Users,
  DollarSign,
  HelpCircle,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiTwilio } from "react-icons/si";
import { Server } from "lucide-react";
import type { UserSettings, WebsiteProfile } from "@shared/schema";

type SettingKey = keyof Omit<UserSettings, "id" | "userId" | "updatedAt">;

interface SettingItem {
  key: SettingKey;
  labelKey: string;
  descKey: string;
  icon: any;
  iconColor: string;
}

const settingsGroups: { titleKey: string; sectionDescKey: string; items: SettingItem[] }[] = [
  {
    titleKey: "settings.notificationsTitle",
    sectionDescKey: "settings.notificationsDesc",
    items: [
      { key: "emailNotifications", labelKey: "settings.emailNotifications", descKey: "settings.emailNotificationsDesc", icon: Mail, iconColor: "text-primary" },
      { key: "smsNotifications", labelKey: "settings.smsNotifications", descKey: "settings.smsNotificationsDesc", icon: MessageSquare, iconColor: "text-chart-2" },
      { key: "appointmentReminders", labelKey: "settings.appointmentReminders", descKey: "settings.appointmentRemindersDesc", icon: Calendar, iconColor: "text-chart-3" },
      { key: "weeklyReport", labelKey: "settings.weeklyReport", descKey: "settings.weeklyReportDesc", icon: BarChart3, iconColor: "text-chart-4" },
    ],
  },
  {
    titleKey: "settings.aiAutomation",
    sectionDescKey: "settings.aiAutomationDesc",
    items: [
      { key: "aiAutoRespond", labelKey: "settings.aiAutoRespond", descKey: "settings.aiAutoRespondDesc", icon: Bot, iconColor: "text-primary" },
      { key: "leadScoring", labelKey: "settings.leadScoring", descKey: "settings.leadScoringDesc", icon: Target, iconColor: "text-chart-2" },
    ],
  },
  {
    titleKey: "settings.preferences",
    sectionDescKey: "settings.preferencesDesc",
    items: [
      { key: "darkMode", labelKey: "settings.darkMode", descKey: "settings.darkModeDesc", icon: Moon, iconColor: "text-muted-foreground" },
      { key: "twoFactorAuth", labelKey: "settings.twoFactorAuth", descKey: "settings.twoFactorAuthDesc", icon: Shield, iconColor: "text-emerald-400" },
    ],
  },
];

interface IntegrationField {
  key: SettingKey;
  labelKey: string;
  placeholder: string;
  sensitive: boolean;
}

interface IntegrationConfig {
  titleKey: string;
  descKey: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  fields: IntegrationField[];
}

const integrations: IntegrationConfig[] = [
  {
    titleKey: "settings.grasshopperPhone",
    descKey: "settings.grasshopperDesc",
    icon: Phone,
    iconColor: "text-chart-3",
    iconBg: "bg-chart-3/10",
    fields: [
      { key: "grasshopperNumber", labelKey: "settings.businessNumber", placeholder: "+1 (555) 123-4567", sensitive: false },
    ],
  },
  {
    titleKey: "settings.calendarLink",
    descKey: "settings.calendarLinkDesc",
    icon: Calendar,
    iconColor: "text-chart-4",
    iconBg: "bg-chart-4/10",
    fields: [
      { key: "calendarLink", labelKey: "settings.bookingUrl", placeholder: "https://calendly.com/your-name", sensitive: false },
    ],
  },
  {
    titleKey: "settings.webhookUrl",
    descKey: "settings.webhookDesc",
    icon: Webhook,
    iconColor: "text-muted-foreground",
    iconBg: "bg-secondary/50",
    fields: [
      { key: "webhookUrl", labelKey: "settings.webhookEndpoint", placeholder: "https://hooks.zapier.com/...", sensitive: false },
    ],
  },
];

function MaskedInput({ value, onChange, placeholder, sensitive, testId }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  sensitive: boolean;
  testId: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={sensitive && !visible ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
      />
      {sensitive && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0"
          onClick={() => setVisible(!visible)}
          data-testid={`${testId}-toggle`}
          type="button"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      )}
    </div>
  );
}

const industryOptionKeys = [
  { value: "Medical Billing / RCM", labelKey: "settings.industryMedBilling" },
  { value: "Healthcare", labelKey: "settings.industryHealthcare" },
  { value: "Marketing Agency", labelKey: "settings.industryMarketing" },
  { value: "Real Estate", labelKey: "settings.industryRealEstate" },
  { value: "Legal Services", labelKey: "settings.industryLegal" },
  { value: "Financial Services", labelKey: "settings.industryFinancial" },
  { value: "E-Commerce", labelKey: "settings.industryEcommerce" },
  { value: "SaaS / Software", labelKey: "settings.industrySaas" },
  { value: "Consulting", labelKey: "settings.industryConsulting" },
  { value: "Construction", labelKey: "settings.industryConstruction" },
  { value: "Home Services", labelKey: "settings.industryHomeServices" },
  { value: "Fitness & Wellness", labelKey: "settings.industryFitness" },
  { value: "Education", labelKey: "settings.industryEducation" },
  { value: "Insurance", labelKey: "settings.industryInsurance" },
  { value: "Automotive", labelKey: "settings.industryAutomotive" },
  { value: "Restaurant / Food", labelKey: "settings.industryRestaurant" },
  { value: "Other", labelKey: "settings.industryOther" },
];

export default function SettingsPage() {
  const { t } = useTranslation();
  usePageTitle(t("settings.title"));
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [integrationValues, setIntegrationValues] = useState<Record<string, string>>({});
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const [companyProfile, setCompanyProfile] = useState({
    companyName: "",
    industry: "",
    website: "",
    companyDescription: "",
  });
  const [companyLoaded, setCompanyLoaded] = useState(false);

  useEffect(() => {
    if (user && !companyLoaded) {
      setCompanyProfile({
        companyName: (user as any).companyName || "",
        industry: (user as any).industry || "",
        website: (user as any).website || "",
        companyDescription: (user as any).companyDescription || "",
      });
      setCompanyLoaded(true);
    }
  }, [user, companyLoaded]);

  const companyMutation = useMutation({
    mutationFn: async (data: typeof companyProfile) => {
      await apiRequest("POST", "/api/onboarding", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/strategy"] });
      toast({ title: t("settings.companyProfileSaved"), description: t("settings.companyProfileSavedDesc") });
    },
    onError: () => {
      toast({ title: t("settings.failedToSave"), description: t("settings.failedToSaveDesc"), variant: "destructive" });
    },
  });

  const [websiteExpanded, setWebsiteExpanded] = useState(false);

  const { data: websiteProfile, isLoading: websiteLoading } = useQuery<WebsiteProfile | null>({
    queryKey: ["/api/website-profile"],
    refetchInterval: (query) => {
      const data = query.state.data;
      return data && (data as WebsiteProfile | null)?.status === "training" ? 3000 : false;
    },
  });

  const trainMutation = useMutation({
    mutationFn: async (websiteUrl?: string) => {
      const res = await apiRequest("POST", "/api/website-train", websiteUrl ? { websiteUrl } : {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/website-profile"] });
      toast({ title: t("settings.websiteAnalysisStarted"), description: t("settings.websiteAnalysisStartedDesc") });
    },
    onError: () => {
      toast({ title: t("settings.trainingFailed"), description: t("settings.trainingFailedDesc"), variant: "destructive" });
    },
  });

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const updateMutation = useMutation({
    mutationFn: async (update: Partial<UserSettings>) => {
      const res = await apiRequest("PATCH", "/api/settings", update);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/settings"], data);
      toast({ title: t("settings.settingsUpdated"), description: t("settings.settingsUpdatedDesc") });
    },
    onError: () => {
      toast({ title: t("settings.failedToUpdate"), description: t("settings.failedToUpdateDesc"), variant: "destructive" });
    },
  });

  const handleToggle = (key: SettingKey, currentValue: boolean | null) => {
    updateMutation.mutate({ [key]: !currentValue });
  };

  const getFieldValue = (key: string): string => {
    if (key in integrationValues) return integrationValues[key];
    if (settings) return (settings as any)[key] || "";
    return "";
  };

  const setFieldValue = (key: string, value: string) => {
    setIntegrationValues((prev) => ({ ...prev, [key]: value }));
    setDirtyFields((prev) => new Set(prev).add(key));
  };

  const saveIntegration = (config: IntegrationConfig) => {
    const update: Record<string, string> = {};
    config.fields.forEach((f) => {
      const val = getFieldValue(f.key);
      update[f.key] = val;
    });
    updateMutation.mutate(update as any, {
      onSuccess: (data) => {
        queryClient.setQueryData(["/api/settings"], data);
        const newDirty = new Set(dirtyFields);
        config.fields.forEach((f) => newDirty.delete(f.key));
        setDirtyFields(newDirty);
        toast({ title: t("settings.integrationSaved", { title: t(config.titleKey) }), description: t("settings.integrationSavedDesc") });
      },
    });
  };

  const isIntegrationConnected = (config: IntegrationConfig): boolean => {
    return config.fields.every((f) => {
      const val = getFieldValue(f.key);
      return val && val.trim().length > 0;
    });
  };

  const hasUnsavedChanges = (config: IntegrationConfig): boolean => {
    return config.fields.some((f) => dirtyFields.has(f.key));
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-settings-title">
          <Settings className="w-6 h-6 inline-block mr-2 text-muted-foreground" />
          {t("settings.title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("settings.subtitle")}
        </p>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg" data-testid="text-settings-user-name">
              {user?.firstName || t("settings.user")} {user?.lastName || ""}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="text-settings-user-email">{user?.email}</p>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20">{t("settings.proPlan")}</Badge>
        </div>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          {t("settings.companyProfile")}
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          {t("settings.companyProfileDesc")}
        </p>
        <Card className="p-5" data-testid="card-company-profile">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{t("settings.businessInformation")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("settings.businessInfoDesc")}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("settings.companyName")}</Label>
              <Input
                value={companyProfile.companyName}
                onChange={(e) => setCompanyProfile({ ...companyProfile, companyName: e.target.value })}
                placeholder={t("settings.companyNamePlaceholder")}
                data-testid="input-company-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("settings.industry")}</Label>
              <Select
                value={companyProfile.industry}
                onValueChange={(v) => setCompanyProfile({ ...companyProfile, industry: v })}
              >
                <SelectTrigger data-testid="select-company-industry">
                  <SelectValue placeholder={t("settings.selectIndustry")} />
                </SelectTrigger>
                <SelectContent>
                  {industryOptionKeys.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>{t(ind.labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("settings.websiteOptional")} <span className="text-muted-foreground/60">({t("settings.optional")})</span></Label>
              <Input
                value={companyProfile.website}
                onChange={(e) => setCompanyProfile({ ...companyProfile, website: e.target.value })}
                placeholder={t("settings.websitePlaceholder")}
                data-testid="input-company-website"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("settings.whatDoesCompanyDo")}</Label>
              <Textarea
                value={companyProfile.companyDescription}
                onChange={(e) => setCompanyProfile({ ...companyProfile, companyDescription: e.target.value })}
                placeholder={t("settings.companyDescPlaceholder")}
                className="resize-none min-h-[80px]"
                data-testid="input-company-description"
              />
              <p className="text-[10px] text-muted-foreground">{t("settings.minCharsDesc")}</p>
            </div>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => {
                if (!companyProfile.companyName || !companyProfile.industry || companyProfile.companyDescription.length < 10) {
                  toast({ title: t("settings.missingInfo"), description: t("settings.missingInfoDesc"), variant: "destructive" });
                  return;
                }
                companyMutation.mutate(companyProfile);
              }}
              disabled={companyMutation.isPending}
              data-testid="button-save-company-profile"
            >
              {companyMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              {companyMutation.isPending ? t("settings.saving") : t("settings.saveCompanyProfile")}
            </Button>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          {t("settings.websiteTraining")}
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          {t("settings.websiteTrainingDesc")}
        </p>
        <Card className="p-5" data-testid="card-website-training">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-chart-2" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm">{t("settings.aiWebsiteAnalysis")}</h3>
                {websiteProfile?.status === "trained" && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" data-testid="badge-trained">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {t("settings.trained")}
                  </Badge>
                )}
                {websiteProfile?.status === "training" && (
                  <Badge className="bg-primary/10 text-primary border-primary/20" data-testid="badge-training">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    {t("settings.analyzing")}
                  </Badge>
                )}
                {websiteProfile?.status === "failed" && (
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20" data-testid="badge-failed">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {t("settings.failed")}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {websiteProfile?.status === "trained"
                  ? `${t("settings.lastTrainedFrom", { url: websiteProfile.websiteUrl })}${websiteProfile.trainedAt ? t("settings.lastTrainedOn", { date: new Date(websiteProfile.trainedAt).toLocaleDateString() }) : ""}`
                  : websiteProfile?.status === "training"
                  ? t("settings.trainingInProgressDesc")
                  : websiteProfile?.status === "failed"
                  ? (websiteProfile.rawSummary || t("settings.trainingFailedDefault"))
                  : t("settings.clickToAnalyze")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => {
                const url = companyProfile.website || (user as any)?.website;
                if (!url) {
                  toast({ title: t("settings.noWebsiteUrl"), description: t("settings.noWebsiteUrlDesc"), variant: "destructive" });
                  return;
                }
                trainMutation.mutate(url);
              }}
              disabled={trainMutation.isPending || websiteProfile?.status === "training"}
              data-testid="button-train-website"
            >
              {trainMutation.isPending || websiteProfile?.status === "training" ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : websiteProfile?.status === "trained" ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              ) : (
                <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
              )}
              {websiteProfile?.status === "training"
                ? t("settings.analyzing")
                : websiteProfile?.status === "trained"
                ? t("settings.retrainFromWebsite")
                : t("settings.trainAiFromWebsite")}
            </Button>
            {websiteProfile?.status === "trained" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWebsiteExpanded(!websiteExpanded)}
                data-testid="button-toggle-knowledge"
              >
                {websiteExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 mr-1.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
                )}
                {websiteExpanded ? t("settings.hideKnowledge") : t("settings.viewLearnedKnowledge")}
              </Button>
            )}
          </div>

          {websiteExpanded && websiteProfile?.status === "trained" && (
            <div className="mt-4 space-y-3" data-testid="website-knowledge-panel">
              {websiteProfile.services && (
                <div className="rounded-md bg-secondary/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("settings.servicesOffered")}</h4>
                  </div>
                  <p className="text-sm whitespace-pre-line" data-testid="text-services">{websiteProfile.services}</p>
                </div>
              )}
              {websiteProfile.valuePropositions && (
                <div className="rounded-md bg-secondary/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-chart-2" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("settings.valuePropositions")}</h4>
                  </div>
                  <p className="text-sm whitespace-pre-line" data-testid="text-value-props">{websiteProfile.valuePropositions}</p>
                </div>
              )}
              {websiteProfile.targetAudience && (
                <div className="rounded-md bg-secondary/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Users className="w-4 h-4 text-chart-3" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("settings.targetAudience")}</h4>
                  </div>
                  <p className="text-sm whitespace-pre-line" data-testid="text-target-audience">{websiteProfile.targetAudience}</p>
                </div>
              )}
              {websiteProfile.pricing && (
                <div className="rounded-md bg-secondary/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <DollarSign className="w-4 h-4 text-chart-4" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("settings.pricing")}</h4>
                  </div>
                  <p className="text-sm whitespace-pre-line" data-testid="text-pricing">{websiteProfile.pricing}</p>
                </div>
              )}
              {websiteProfile.faqs && (
                <div className="rounded-md bg-secondary/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("settings.faqs")}</h4>
                  </div>
                  <p className="text-sm whitespace-pre-line" data-testid="text-faqs">{websiteProfile.faqs}</p>
                </div>
              )}
              {websiteProfile.contactInfo && (
                <div className="rounded-md bg-secondary/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("settings.contactInformation")}</h4>
                  </div>
                  <p className="text-sm whitespace-pre-line" data-testid="text-contact-info">{websiteProfile.contactInfo}</p>
                </div>
              )}
              {websiteProfile.rawSummary && (
                <div className="rounded-md bg-secondary/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Bot className="w-4 h-4 text-chart-2" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("settings.aiSummary")}</h4>
                  </div>
                  <p className="text-sm whitespace-pre-line" data-testid="text-summary">{websiteProfile.rawSummary}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          {t("settings.integrationsSection")}
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          {t("settings.integrationsSectionDesc")}
        </p>
        <div className="space-y-4">
          <Card className="p-5" data-testid="integration-email-provider">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm">{t("settings.emailProvider")}</h3>
                  {(() => {
                    const provider = getFieldValue("emailProvider") || settings?.emailProvider || "sendgrid";
                    const isSmtp = provider === "smtp";
                    const connected = isSmtp
                      ? !!(getFieldValue("smtpHost") && getFieldValue("smtpUsername") && getFieldValue("smtpPassword") && getFieldValue("senderEmail"))
                      : !!(getFieldValue("sendgridApiKey") && getFieldValue("senderEmail"));
                    return connected ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t("settings.connected")}
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {t("settings.notConnected")}
                      </Badge>
                    );
                  })()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t("settings.emailProviderDesc")}</p>
              </div>
            </div>
            {isLoading ? (
              <div className="space-y-3"><Skeleton className="h-9 w-full" /></div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("settings.emailProviderType")}</Label>
                  <Select
                    value={getFieldValue("emailProvider") || settings?.emailProvider || "sendgrid"}
                    onValueChange={(v) => {
                      setFieldValue("emailProvider", v);
                    }}
                  >
                    <SelectTrigger data-testid="select-email-provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sendgrid">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" />
                          SendGrid
                        </div>
                      </SelectItem>
                      <SelectItem value="smtp">
                        <div className="flex items-center gap-2">
                          <Server className="w-3.5 h-3.5" />
                          {t("settings.smtpServer")}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t("settings.verifiedSenderEmail")}</Label>
                  <MaskedInput
                    value={getFieldValue("senderEmail")}
                    onChange={(v) => setFieldValue("senderEmail", v)}
                    placeholder="you@yourdomain.com"
                    sensitive={false}
                    testId="input-senderEmail"
                  />
                </div>

                {(getFieldValue("emailProvider") || settings?.emailProvider || "sendgrid") === "sendgrid" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("settings.sendgridApiKey")}</Label>
                    <MaskedInput
                      value={getFieldValue("sendgridApiKey")}
                      onChange={(v) => setFieldValue("sendgridApiKey", v)}
                      placeholder="SG.xxxxxxxxxxxx"
                      sensitive={true}
                      testId="input-sendgridApiKey"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t("settings.smtpHost")}</Label>
                      <MaskedInput
                        value={getFieldValue("smtpHost")}
                        onChange={(v) => setFieldValue("smtpHost", v)}
                        placeholder="smtp.yourdomain.com"
                        sensitive={false}
                        testId="input-smtpHost"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t("settings.smtpPort")}</Label>
                      <MaskedInput
                        value={getFieldValue("smtpPort")}
                        onChange={(v) => setFieldValue("smtpPort", v)}
                        placeholder="587"
                        sensitive={false}
                        testId="input-smtpPort"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t("settings.smtpUsername")}</Label>
                      <MaskedInput
                        value={getFieldValue("smtpUsername")}
                        onChange={(v) => setFieldValue("smtpUsername", v)}
                        placeholder="user@yourdomain.com"
                        sensitive={false}
                        testId="input-smtpUsername"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t("settings.smtpPassword")}</Label>
                      <MaskedInput
                        value={getFieldValue("smtpPassword")}
                        onChange={(v) => setFieldValue("smtpPassword", v)}
                        placeholder="********"
                        sensitive={true}
                        testId="input-smtpPassword"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Switch
                        checked={(() => {
                          const v = getFieldValue("smtpSecure");
                          if (v === "") return settings?.smtpSecure ?? true;
                          return v === "true";
                        })()}
                        onCheckedChange={(checked) => setFieldValue("smtpSecure", String(checked))}
                        data-testid="switch-smtp-secure"
                      />
                      <Label className="text-xs text-muted-foreground">{t("settings.smtpSecure")}</Label>
                    </div>
                  </>
                )}

                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const provider = getFieldValue("emailProvider") || settings?.emailProvider || "sendgrid";
                    const update: Record<string, any> = {
                      emailProvider: provider,
                      senderEmail: getFieldValue("senderEmail"),
                    };
                    if (provider === "sendgrid") {
                      update.sendgridApiKey = getFieldValue("sendgridApiKey");
                    } else {
                      update.smtpHost = getFieldValue("smtpHost");
                      update.smtpPort = parseInt(getFieldValue("smtpPort")) || 587;
                      update.smtpUsername = getFieldValue("smtpUsername");
                      update.smtpPassword = getFieldValue("smtpPassword");
                      const secVal = getFieldValue("smtpSecure");
                      update.smtpSecure = secVal === "" ? (settings?.smtpSecure ?? true) : secVal === "true";
                    }
                    updateMutation.mutate(update as any, {
                      onSuccess: (data) => {
                        queryClient.setQueryData(["/api/settings"], data);
                        setDirtyFields(new Set());
                        toast({ title: t("settings.integrationSaved", { title: t("settings.emailProvider") }), description: t("settings.integrationSavedDesc") });
                      },
                    });
                  }}
                  disabled={updateMutation.isPending || dirtyFields.size === 0}
                  data-testid="button-save-email-provider"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {updateMutation.isPending ? t("settings.saving") : t("settings.save")}
                </Button>
              </div>
            )}
          </Card>
          {integrations.map((config) => {
            const connected = isIntegrationConnected(config);
            const unsaved = hasUnsavedChanges(config);
            const integrationTitle = t(config.titleKey);
            return (
              <Card key={config.titleKey} className="p-5" data-testid={`integration-${integrationTitle.toLowerCase().replace(/[^a-z]/g, "-")}`}>
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-md ${config.iconBg} flex items-center justify-center shrink-0`}>
                    <config.icon className={`w-5 h-5 ${config.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{integrationTitle}</h3>
                      {connected ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t("settings.connected")}
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {t("settings.notConnected")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t(config.descKey)}</p>
                  </div>
                </div>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {config.fields.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t(field.labelKey)}</Label>
                        <MaskedInput
                          value={getFieldValue(field.key)}
                          onChange={(v) => setFieldValue(field.key, v)}
                          placeholder={field.placeholder}
                          sensitive={field.sensitive}
                          testId={`input-${field.key}`}
                        />
                      </div>
                    ))}
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => saveIntegration(config)}
                      disabled={updateMutation.isPending || !unsaved}
                      data-testid={`button-save-${integrationTitle.toLowerCase().replace(/[^a-z]/g, "-")}`}
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {updateMutation.isPending ? t("settings.saving") : t("settings.save")}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {settingsGroups.map((group) => (
        <div key={group.titleKey}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t(group.titleKey)}</h2>
          <p className="text-xs text-muted-foreground mb-3">{t(group.sectionDescKey)}</p>
          <Card className="divide-y divide-border/50">
            {group.items.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4 p-4" data-testid={`setting-${item.key}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-secondary/50 flex items-center justify-center shrink-0">
                    <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t(item.labelKey)}</p>
                    <p className="text-xs text-muted-foreground">{t(item.descKey)}</p>
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-6 w-11 rounded-full shrink-0" />
                ) : (
                  <Switch
                    checked={!!(settings as any)?.[item.key]}
                    onCheckedChange={() => handleToggle(item.key, (settings as any)?.[item.key] ?? false)}
                    disabled={updateMutation.isPending}
                    data-testid={`switch-${item.key}`}
                  />
                )}
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}
