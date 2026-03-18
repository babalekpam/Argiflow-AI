import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DashboardPage from "./dashboard";
import LeadsPage from "./leads";
import VoiceAiPage from "./voice-ai";
import SettingsPage from "./settings";
import DemoBuilderPage from "./demo-builder";
import SalesFunnelsPage from "./sales-funnels";
import PlansPage from "./plans";
import ForumProspectorPage from "./forum-prospector";
import PlatformPromoterPage from "./platform-promoter";
import EmailInfrastructurePage from "./email-infrastructure";
import OutreachAgentPage from "./outreach-agent";
import SequencesPage from "./sequences";
import LinkedInPage from "./linkedin";
import IntentDataPage from "./intent-data";
import TeamPage from "./team";
import CrmIntegrationsPage from "./crm-integrations";
import WebhooksPage from "./webhooks";
import AgencyPage from "./agency";
import LandingPagesPage from "./landing-pages";
import FormBuilderPage from "./form-builder";
import ChatWidgetPage from "./chat-widget";
import InvoicingPage from "./invoicing";
import SocialMediaPage from "./social-media";
import ReputationPage from "./reputation";
import WhatsAppPage from "./whatsapp";
import MetaDmsPage from "./meta-dms";
import CalendarPage from "./calendar";
import ESignaturesPage from "./e-signatures";
import GoogleBusinessPage from "./google-business";
import MembershipPage from "./membership";
import AbTestingPage from "./ab-testing";
import ProposalsPage from "./proposals";
import AffiliateManagementPage from "./affiliate-management";
import BlogBuilderPage from "./blog-builder";
import CommunitiesPage from "./communities";
import AiProvidersPage from "./ai-providers";
import CreditsPage from "./credits";
import WebBuilderPage from "./web-builder";
import VisitorTrackingPage from "./visitor-tracking";
import DomainSetupPage from "./domain-setup";
import MarketingSuitePage from "./marketing-suite";
import UnifiedAgentsPage from "./unified-agents";
import UnifiedAnalyticsPage from "./unified-analytics";
import UnifiedAutomationsPage from "./unified-automations";
import UnifiedEmailPage from "./unified-email";
import UnifiedIntelligencePage from "./unified-intelligence";
import UnifiedLearningPage from "./unified-learning";
import BusinessManagerPage from "./business-manager";
import { AiChatDialog } from "@/components/ai-chat-dialog";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { LanguageSwitcher } from "@/components/language-switcher";

type SubscriptionData = {
  subscription: {
    plan: string;
    status: string;
    trialEndsAt: string | null;
  } | null;
  trialActive: boolean;
  trialExpired: boolean;
  daysRemaining: number;
};

function TrialBanner({ subData }: { subData: SubscriptionData }) {
  const { t } = useTranslation();
  if (!subData) return null;

  if (subData.trialActive && subData.daysRemaining > 0) {
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-primary/10 border-b border-primary/20" data-testid="banner-trial-active">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{t("dashboardLayout.proTrial")}</span> — {t("dashboardLayout.daysRemaining", { count: subData.daysRemaining })}{" "}
            {t("dashboardLayout.fullAccess")}
          </span>
        </div>
        <a href="/dashboard/plans" data-testid="link-trial-upgrade">
          <Button size="sm" variant="default">{t("dashboardLayout.choosePlan")}</Button>
        </a>
      </div>
    );
  }

  if (subData.trialExpired || subData.subscription?.status === "expired") {
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-destructive/10 border-b border-destructive/20" data-testid="banner-trial-expired">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{t("dashboardLayout.trialEnded")}</span> {t("dashboardLayout.continueUsing")}
          </span>
        </div>
        <a href="/dashboard/plans" data-testid="link-expired-upgrade">
          <Button size="sm" variant="default">{t("dashboardLayout.upgradeNow")}</Button>
        </a>
      </div>
    );
  }

  return null;
}

function getPlanLabel(subData: SubscriptionData | undefined, user: any, t: (key: string, options?: any) => string) {
  if (subData?.subscription) {
    const { plan, status } = subData.subscription;
    const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
    if (status === "trial") return t("dashboardLayout.trialPlan", { plan: planName });
    if (status === "active") return t("dashboardLayout.activePlan", { plan: planName });
    if (status === "expired" || status === "cancelled") return t("dashboardLayout.noPlan");
    return planName;
  }
  if (user?.planLabel) return user.planLabel;
  return t("dashboardLayout.free");
}

export default function DashboardLayout() {
  const { t } = useTranslation();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: subData } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: t("dashboardLayout.unauthorized"),
        description: t("dashboardLayout.loggingIn"),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const initials = user
    ? `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase() || "U"
    : "U";

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("dashboardLayout.search")}
                  className="pl-10 w-64 bg-secondary/50"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hidden sm:flex">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                {t("common.aiActive")}
              </Badge>
              <LanguageSwitcher variant="compact" />
              <NotificationsDropdown />
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.profileImageUrl || ""} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium" data-testid="text-user-name">{user?.firstName || t("dashboardLayout.defaultUser")}</p>
                  <p className="text-xs text-muted-foreground" data-testid="text-plan-label">{getPlanLabel(subData, user, t)}</p>
                </div>
              </div>
            </div>
          </header>
          {subData && <TrialBanner subData={subData} />}
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/dashboard/leads" component={LeadsPage} />
              <Route path="/dashboard/funnels" component={SalesFunnelsPage} />
              <Route path="/dashboard/calendar" component={CalendarPage} />
              <Route path="/dashboard/analytics" component={UnifiedAnalyticsPage} />
              <Route path="/dashboard/visitor-tracking" component={VisitorTrackingPage} />
              <Route path="/dashboard/team" component={TeamPage} />
              <Route path="/dashboard/ai-agents" component={UnifiedAgentsPage} />
              <Route path="/dashboard/marketing-suite" component={MarketingSuitePage} />
              <Route path="/dashboard/outreach-agent" component={OutreachAgentPage} />
              <Route path="/dashboard/sequences" component={SequencesPage} />
              <Route path="/dashboard/email" component={UnifiedEmailPage} />
              <Route path="/dashboard/email-infra" component={EmailInfrastructurePage} />
              <Route path="/dashboard/domain" component={DomainSetupPage} />
              <Route path="/dashboard/voice-ai" component={VoiceAiPage} />
              <Route path="/dashboard/intelligence" component={UnifiedIntelligencePage} />
              <Route path="/dashboard/intent-data" component={IntentDataPage} />
              <Route path="/dashboard/linkedin" component={LinkedInPage} />
              <Route path="/dashboard/automations" component={UnifiedAutomationsPage} />
              <Route path="/dashboard/crm-integrations" component={CrmIntegrationsPage} />
              <Route path="/dashboard/webhooks" component={WebhooksPage} />
              <Route path="/dashboard/agency" component={AgencyPage} />
              <Route path="/dashboard/website-builder" component={WebBuilderPage} />
              <Route path="/dashboard/landing-pages" component={LandingPagesPage} />
              <Route path="/dashboard/forms" component={FormBuilderPage} />
              <Route path="/dashboard/chat-widget" component={ChatWidgetPage} />
              <Route path="/dashboard/invoicing" component={InvoicingPage} />
              <Route path="/dashboard/social-media" component={SocialMediaPage} />
              <Route path="/dashboard/reputation" component={ReputationPage} />
              <Route path="/dashboard/whatsapp" component={WhatsAppPage} />
              <Route path="/dashboard/meta-dms" component={MetaDmsPage} />
              <Route path="/dashboard/e-signatures" component={ESignaturesPage} />
              <Route path="/dashboard/google-business" component={GoogleBusinessPage} />
              <Route path="/dashboard/membership" component={MembershipPage} />
              <Route path="/dashboard/ab-testing" component={AbTestingPage} />
              <Route path="/dashboard/proposals" component={ProposalsPage} />
              <Route path="/dashboard/affiliates" component={AffiliateManagementPage} />
              <Route path="/dashboard/blog" component={BlogBuilderPage} />
              <Route path="/dashboard/communities" component={CommunitiesPage} />
              <Route path="/dashboard/learning" component={UnifiedLearningPage} />
              <Route path="/dashboard/ai-providers" component={AiProvidersPage} />
              <Route path="/dashboard/credits" component={CreditsPage} />
              <Route path="/dashboard/plans" component={PlansPage} />
              <Route path="/dashboard/forum-prospector" component={ForumProspectorPage} />
              <Route path="/dashboard/platform-promoter" component={PlatformPromoterPage} />
              <Route path="/dashboard/business-manager" component={BusinessManagerPage} />
              <Route path="/dashboard/demos" component={DemoBuilderPage} />
              <Route path="/dashboard/settings" component={SettingsPage} />
              <Route>
                <DashboardPage />
              </Route>
            </Switch>
          </main>
        </div>
      </div>
      <AiChatDialog />
    </SidebarProvider>
  );
}
