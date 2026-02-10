import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import type { UserSettings } from "@shared/schema";

type SettingKey = keyof Omit<UserSettings, "id" | "userId" | "updatedAt">;

interface SettingItem {
  key: SettingKey;
  label: string;
  description: string;
  icon: any;
  iconColor: string;
}

const settingsGroups: { title: string; items: SettingItem[] }[] = [
  {
    title: "Notifications",
    items: [
      {
        key: "emailNotifications",
        label: "Email Notifications",
        description: "Receive email alerts for new leads, appointments, and campaign updates",
        icon: Mail,
        iconColor: "text-primary",
      },
      {
        key: "smsNotifications",
        label: "SMS Notifications",
        description: "Get text messages for urgent updates and appointment reminders",
        icon: MessageSquare,
        iconColor: "text-chart-2",
      },
      {
        key: "appointmentReminders",
        label: "Appointment Reminders",
        description: "Automatic reminders before scheduled meetings",
        icon: Calendar,
        iconColor: "text-chart-3",
      },
      {
        key: "weeklyReport",
        label: "Weekly Report",
        description: "Receive a weekly summary of your business performance",
        icon: BarChart3,
        iconColor: "text-chart-4",
      },
    ],
  },
  {
    title: "AI & Automation",
    items: [
      {
        key: "aiAutoRespond",
        label: "AI Auto-Respond",
        description: "Let AI automatically respond to new leads and inquiries",
        icon: Bot,
        iconColor: "text-primary",
      },
      {
        key: "leadScoring",
        label: "Lead Scoring",
        description: "Automatically score and prioritize leads based on engagement",
        icon: Target,
        iconColor: "text-chart-2",
      },
    ],
  },
  {
    title: "Preferences",
    items: [
      {
        key: "darkMode",
        label: "Dark Mode",
        description: "Use dark theme across the platform",
        icon: Moon,
        iconColor: "text-muted-foreground",
      },
      {
        key: "twoFactorAuth",
        label: "Two-Factor Authentication",
        description: "Add an extra layer of security to your account",
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
    description: "Connect SendGrid to send automated email campaigns, drip sequences, and newsletters to your leads.",
    icon: Mail,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    fields: [
      { key: "sendgridApiKey", label: "API Key", placeholder: "SG.xxxxxxxxxxxxxxxx", sensitive: true },
    ],
  },
  {
    title: "Twilio (SMS)",
    description: "Connect Twilio to send SMS follow-ups, appointment reminders, and marketing texts.",
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
    description: "Enter your Grasshopper business phone number to link with Voice AI agents and call tracking.",
    icon: Phone,
    iconColor: "text-chart-3",
    iconBg: "bg-chart-3/10",
    fields: [
      { key: "grasshopperNumber", label: "Business Number", placeholder: "+1 (555) 123-4567", sensitive: false },
    ],
  },
  {
    title: "Calendar Link",
    description: "Your booking link (Calendly, Cal.com, etc.) used by AI agents when scheduling appointments.",
    icon: Calendar,
    iconColor: "text-chart-4",
    iconBg: "bg-chart-4/10",
    fields: [
      { key: "calendarLink", label: "Booking URL", placeholder: "https://calendly.com/your-name", sensitive: false },
    ],
  },
  {
    title: "Webhook URL",
    description: "Send lead and appointment data to external tools like Zapier, Make, or your own CRM.",
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
  "Marketing Agency", "Real Estate", "Healthcare", "Legal Services",
  "Financial Services", "E-Commerce", "SaaS / Software", "Consulting",
  "Construction", "Home Services", "Fitness & Wellness", "Education",
  "Insurance", "Automotive", "Restaurant / Food", "Other",
];

export default function SettingsPage() {
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
        <p className="text-muted-foreground text-sm mt-1">Manage your account, preferences, and integrations.</p>
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
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Company Profile
        </h2>
        <Card className="p-5" data-testid="card-company-profile">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Business Information</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                This information powers your AI-generated marketing strategy and personalized recommendations.
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
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Integrations
        </h2>
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
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group.title}</h2>
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
