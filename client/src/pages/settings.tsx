import { useState, useEffect } from "react";
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
import type { UserSettings, WebsiteProfile } from "@shared/schema";

type SettingKey = keyof Omit<UserSettings, "id" | "userId" | "updatedAt">;

interface SettingItem {
  key: SettingKey;
  label: string;
  description: string;
  icon: any;
  iconColor: string;
}

const settingsGroups: { title: string; sectionDescription: string; items: SettingItem[] }[] = [
  {
    title: "Notifications",
    sectionDescription: "Control how and when ArgiFlow notifies you about activity on your account. When turned on, you'll receive alerts through the channels you've connected below (like SendGrid for email or Twilio for SMS).",
    items: [
      {
        key: "emailNotifications",
        label: "Email Notifications",
        description: "When ON: You'll get email alerts whenever a new lead comes in, an appointment is booked, or a campaign finishes. Requires SendGrid integration below.",
        icon: Mail,
        iconColor: "text-primary",
      },
      {
        key: "smsNotifications",
        label: "SMS Notifications",
        description: "When ON: You'll receive text messages for time-sensitive updates like new leads and appointment confirmations. Requires Twilio integration below.",
        icon: MessageSquare,
        iconColor: "text-chart-2",
      },
      {
        key: "appointmentReminders",
        label: "Appointment Reminders",
        description: "When ON: Both you and your clients get automatic reminders before scheduled meetings so nobody forgets.",
        icon: Calendar,
        iconColor: "text-chart-3",
      },
      {
        key: "weeklyReport",
        label: "Weekly Report",
        description: "When ON: Every Monday you'll receive a summary showing how many leads, appointments, and conversions happened last week.",
        icon: BarChart3,
        iconColor: "text-chart-4",
      },
    ],
  },
  {
    title: "AI & Automation",
    sectionDescription: "These controls turn on AI-powered features that work in the background to help you capture and manage leads automatically.",
    items: [
      {
        key: "aiAutoRespond",
        label: "AI Auto-Respond",
        description: "When ON: Your AI bots will automatically reply to new leads and inquiries the moment they come in — even outside business hours.",
        icon: Bot,
        iconColor: "text-primary",
      },
      {
        key: "leadScoring",
        label: "Lead Scoring",
        description: "When ON: Each lead gets an automatic quality score (1-100) based on their engagement level, helping you focus on the hottest prospects first.",
        icon: Target,
        iconColor: "text-chart-2",
      },
    ],
  },
  {
    title: "Preferences",
    sectionDescription: "General account preferences for your ArgiFlow experience.",
    items: [
      {
        key: "darkMode",
        label: "Dark Mode",
        description: "When ON: Switches the platform to a darker color scheme that's easier on your eyes.",
        icon: Moon,
        iconColor: "text-muted-foreground",
      },
      {
        key: "twoFactorAuth",
        label: "Two-Factor Authentication",
        description: "When ON: Adds an extra security step when logging in to protect your account.",
        icon: Shield,
        iconColor: "text-emerald-400",
      },
    ],
  },
];

interface IntegrationField {
  key: SettingKey;
  label: string;
  placeholder: string;
  sensitive: boolean;
}

interface IntegrationConfig {
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  fields: IntegrationField[];
}

const integrations: IntegrationConfig[] = [
  {
    title: "SendGrid (Email)",
    description: "SendGrid is an email delivery service. Once connected, ArgiFlow can automatically send emails to your leads — like welcome messages, follow-ups, and campaign blasts. You'll need a free SendGrid account to get your API key.",
    icon: Mail,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    fields: [
      { key: "sendgridApiKey", label: "API Key", placeholder: "SG.xxxxxxxxxxxxxxxx", sensitive: true },
    ],
  },
  {
    title: "Twilio (SMS)",
    description: "Twilio lets ArgiFlow send text messages on your behalf — appointment reminders, lead follow-ups, and more. You'll need a Twilio account with a phone number. Find your credentials at twilio.com/console.",
    icon: MessageSquare,
    iconColor: "text-chart-2",
    iconBg: "bg-chart-2/10",
    fields: [
      { key: "twilioAccountSid", label: "Account SID", placeholder: "ACxxxxxxxxxxxxxxxx", sensitive: true },
      { key: "twilioAuthToken", label: "Auth Token", placeholder: "Your auth token", sensitive: true },
      { key: "twilioPhoneNumber", label: "Phone Number", placeholder: "+1234567890", sensitive: false },
    ],
  },
  {
    title: "Grasshopper (Phone)",
    description: "If you use Grasshopper as your business phone, enter the number here so your Voice AI agents can be linked to it for call routing and tracking.",
    icon: Phone,
    iconColor: "text-chart-3",
    iconBg: "bg-chart-3/10",
    fields: [
      { key: "grasshopperNumber", label: "Business Number", placeholder: "+1 (555) 123-4567", sensitive: false },
    ],
  },
  {
    title: "Calendar Link",
    description: "Paste your online booking link here (from Calendly, Cal.com, or similar). When your AI bot wants to schedule a meeting with a lead, it will share this link automatically.",
    icon: Calendar,
    iconColor: "text-chart-4",
    iconBg: "bg-chart-4/10",
    fields: [
      { key: "calendarLink", label: "Booking URL", placeholder: "https://calendly.com/your-name", sensitive: false },
    ],
  },
  {
    title: "Webhook URL",
    description: "A webhook sends your lead and appointment data to other tools you use — like Zapier, Make, or your own CRM system. If you don't use these tools, you can skip this one.",
    icon: Webhook,
    iconColor: "text-muted-foreground",
    iconBg: "bg-secondary/50",
    fields: [
      { key: "webhookUrl", label: "Webhook Endpoint", placeholder: "https://hooks.zapier.com/...", sensitive: false },
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

const industryOptions = [
  "Medical Billing / RCM", "Healthcare", "Marketing Agency", "Real Estate",
  "Legal Services", "Financial Services", "E-Commerce", "SaaS / Software",
  "Consulting", "Construction", "Home Services", "Fitness & Wellness",
  "Education", "Insurance", "Automotive", "Restaurant / Food", "Other",
];

export default function SettingsPage() {
  usePageTitle("Settings");
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
      toast({ title: "Company profile saved", description: "Your business information has been updated." });
    },
    onError: () => {
      toast({ title: "Failed to save", description: "Please check all fields and try again.", variant: "destructive" });
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
      toast({ title: "Website analysis started", description: "Our AI is reading your website now. This usually takes 30-60 seconds." });
    },
    onError: () => {
      toast({ title: "Training failed", description: "Could not analyze your website. Please check the URL and try again.", variant: "destructive" });
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
      toast({ title: "Settings updated", description: "Your preferences have been saved." });
    },
    onError: () => {
      toast({ title: "Failed to update", description: "Please try again.", variant: "destructive" });
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
        toast({ title: `${config.title} saved`, description: "Integration settings updated successfully." });
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
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          This is your control center. Update your business info, connect external services, and turn features on or off. Each section below explains what it does and how it helps your business.
        </p>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg" data-testid="text-settings-user-name">
              {user?.firstName || "User"} {user?.lastName || ""}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="text-settings-user-email">{user?.email}</p>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20">Pro Plan</Badge>
        </div>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Company Profile
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Tell ArgiFlow about your business so the AI can create strategies and bot scripts tailored specifically to your industry and services.
        </p>
        <Card className="p-5" data-testid="card-company-profile">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Business Information</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                This info powers your AI marketing strategy, customizes your bot scripts, and helps the AI chat assistant understand your business. The more detail you add, the better results you'll get.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Company Name</Label>
              <Input
                value={companyProfile.companyName}
                onChange={(e) => setCompanyProfile({ ...companyProfile, companyName: e.target.value })}
                placeholder="Acme Corp"
                data-testid="input-company-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Industry</Label>
              <Select
                value={companyProfile.industry}
                onValueChange={(v) => setCompanyProfile({ ...companyProfile, industry: v })}
              >
                <SelectTrigger data-testid="select-company-industry">
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {industryOptions.map((ind) => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Website <span className="text-muted-foreground/60">(optional)</span></Label>
              <Input
                value={companyProfile.website}
                onChange={(e) => setCompanyProfile({ ...companyProfile, website: e.target.value })}
                placeholder="https://www.yourcompany.com"
                data-testid="input-company-website"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">What does your company do?</Label>
              <Textarea
                value={companyProfile.companyDescription}
                onChange={(e) => setCompanyProfile({ ...companyProfile, companyDescription: e.target.value })}
                placeholder="Describe your products, services, target customers, and goals. The more detail you provide, the better strategy our AI can generate..."
                className="resize-none min-h-[80px]"
                data-testid="input-company-description"
              />
              <p className="text-[10px] text-muted-foreground">Min 10 characters. Be specific for a better AI strategy.</p>
            </div>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => {
                if (!companyProfile.companyName || !companyProfile.industry || companyProfile.companyDescription.length < 10) {
                  toast({ title: "Missing information", description: "Please fill in company name, industry, and description (at least 10 characters).", variant: "destructive" });
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
              {companyMutation.isPending ? "Saving..." : "Save Company Profile"}
            </Button>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          Website Training
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Let AI read your website and learn about your services, pricing, and target audience. This knowledge is used to configure your AI agents so they can represent your business accurately and generate leads.
        </p>
        <Card className="p-5" data-testid="card-website-training">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-chart-2" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm">AI Website Analysis</h3>
                {websiteProfile?.status === "trained" && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" data-testid="badge-trained">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Trained
                  </Badge>
                )}
                {websiteProfile?.status === "training" && (
                  <Badge className="bg-primary/10 text-primary border-primary/20" data-testid="badge-training">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Analyzing...
                  </Badge>
                )}
                {websiteProfile?.status === "failed" && (
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20" data-testid="badge-failed">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Failed
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {websiteProfile?.status === "trained"
                  ? `Last trained from ${websiteProfile.websiteUrl}${websiteProfile.trainedAt ? ` on ${new Date(websiteProfile.trainedAt).toLocaleDateString()}` : ""}`
                  : websiteProfile?.status === "training"
                  ? "AI is currently reading and analyzing your website. This usually takes 30-60 seconds..."
                  : websiteProfile?.status === "failed"
                  ? (websiteProfile.rawSummary || "Training failed. Please check your website URL and try again.")
                  : "Click the button below to have AI analyze your website and learn about your business."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => {
                const url = companyProfile.website || (user as any)?.website;
                if (!url) {
                  toast({ title: "No website URL", description: "Please enter your website URL in the Company Profile section above first.", variant: "destructive" });
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
                ? "Analyzing..."
                : websiteProfile?.status === "trained"
                ? "Re-train from Website"
                : "Train AI from My Website"}
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
                {websiteExpanded ? "Hide Knowledge" : "View Learned Knowledge"}
              </Button>
            )}
          </div>

          {websiteExpanded && websiteProfile?.status === "trained" && (
            <div className="mt-4 space-y-3" data-testid="website-knowledge-panel">
              {websiteProfile.services && (
                <div className="rounded-md bg-secondary/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Services Offered</h4>
                  </div>
                  <p className="text-sm whitespace-pre-line" data-testid="text-services">{websiteProfile.services}</p>
                </div>
              )}
              {websiteProfile.valuePropositions && (
                <div className="rounded-md bg-secondary/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-chart-2" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value Propositions</h4>
                  </div>
                  <p className="text-sm whitespace-pre-line" data-testid="text-value-props">{websiteProfile.valuePropositions}</p>
                </div>
              )}
              {websiteProfile.targetAudience && (
                <div className="rounded-md bg-secondary/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Users className="w-4 h-4 text-chart-3" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Audience</h4>
                  </div>
                  <p className="text-sm whitespace-pre-line" data-testid="text-target-audience">{websiteProfile.targetAudience}</p>
                </div>
              )}
              {websiteProfile.pricing && (
                <div className="rounded-md bg-secondary/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <DollarSign className="w-4 h-4 text-chart-4" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pricing</h4>
                  </div>
                  <p className="text-sm whitespace-pre-line" data-testid="text-pricing">{websiteProfile.pricing}</p>
                </div>
              )}
              {websiteProfile.faqs && (
                <div className="rounded-md bg-secondary/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">FAQs</h4>
                  </div>
                  <p className="text-sm whitespace-pre-line" data-testid="text-faqs">{websiteProfile.faqs}</p>
                </div>
              )}
              {websiteProfile.contactInfo && (
                <div className="rounded-md bg-secondary/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Information</h4>
                  </div>
                  <p className="text-sm whitespace-pre-line" data-testid="text-contact-info">{websiteProfile.contactInfo}</p>
                </div>
              )}
              {websiteProfile.rawSummary && (
                <div className="rounded-md bg-secondary/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Bot className="w-4 h-4 text-chart-2" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Summary</h4>
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
          Integrations
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Connect your external services here so ArgiFlow can send emails, texts, and sync data on your behalf. Each card explains what the service does — only connect the ones you need.
        </p>
        <div className="space-y-4">
          {integrations.map((config) => {
            const connected = isIntegrationConnected(config);
            const unsaved = hasUnsavedChanges(config);
            return (
              <Card key={config.title} className="p-5" data-testid={`integration-${config.title.toLowerCase().replace(/[^a-z]/g, "-")}`}>
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-md ${config.iconBg} flex items-center justify-center shrink-0`}>
                    <config.icon className={`w-5 h-5 ${config.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{config.title}</h3>
                      {connected ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Not Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
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
                        <Label className="text-xs text-muted-foreground">{field.label}</Label>
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
                      data-testid={`button-save-${config.title.toLowerCase().replace(/[^a-z]/g, "-")}`}
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {updateMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {settingsGroups.map((group) => (
        <div key={group.title}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">{group.title}</h2>
          <p className="text-xs text-muted-foreground mb-3">{group.sectionDescription}</p>
          <Card className="divide-y divide-border/50">
            {group.items.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4 p-4" data-testid={`setting-${item.key}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-secondary/50 flex items-center justify-center shrink-0">
                    <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
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
