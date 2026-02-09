import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
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

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-settings-title">
          <Settings className="w-6 h-6 inline-block mr-2 text-muted-foreground" />
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account preferences and notifications.</p>
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
