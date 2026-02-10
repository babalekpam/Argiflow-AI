import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DashboardPage from "./dashboard";
import LeadsPage from "./leads";
import AppointmentsPage from "./appointments";
import AiAgentsPage from "./ai-agents";
import VoiceAiPage from "./voice-ai";
import AutomationsPage from "./automations";
import EmailSmsPage from "./email-sms";
import TrainingPage from "./training";
import SettingsPage from "./settings";
import StrategyPage from "./strategy";
import ResourcesPage from "./resources";
import DemoBuilderPage from "./demo-builder";
import SalesFunnelsPage from "./sales-funnels";
import { AiChatDialog } from "@/components/ai-chat-dialog";

export default function DashboardLayout() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Logging in again...",
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
          <p className="text-sm text-muted-foreground">Loading...</p>
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
                  placeholder="Search..."
                  className="pl-10 w-64 bg-secondary/50"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hidden sm:flex">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                AI Active
              </Badge>
              <Button size="icon" variant="ghost" data-testid="button-notifications">
                <Bell className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.profileImageUrl || ""} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{user?.firstName || "User"}</p>
                  <p className="text-xs text-muted-foreground">Pro Plan</p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/dashboard/strategy" component={StrategyPage} />
              <Route path="/dashboard/leads" component={LeadsPage} />
              <Route path="/dashboard/funnels" component={SalesFunnelsPage} />
              <Route path="/dashboard/appointments" component={AppointmentsPage} />
              <Route path="/dashboard/ai-agents" component={AiAgentsPage} />
              <Route path="/dashboard/voice-ai" component={VoiceAiPage} />
              <Route path="/dashboard/automations" component={AutomationsPage} />
              <Route path="/dashboard/resources" component={ResourcesPage} />
              <Route path="/dashboard/demos" component={DemoBuilderPage} />
              <Route path="/dashboard/email" component={EmailSmsPage} />
              <Route path="/dashboard/training" component={TrainingPage} />
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
