import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import DiscoveryPage from "@/pages/discovery";
import DashboardLayout from "@/pages/dashboard-layout";
import AdminLoginPage from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import VerifyEmailPage from "@/pages/verify-email";
import PublicLandingPage from "@/pages/public-landing-page";
import PublicSitePage from "@/pages/public-site";
import PublicAboutPage from "@/pages/public-about";
import PublicBlogPage from "@/pages/public-blog";
import PublicContactPage from "@/pages/public-contact";
import PublicDocsPage from "@/pages/public-docs";
import PublicHelpPage from "@/pages/public-help";
import PublicStatusPage from "@/pages/public-status";
import PublicPrivacyPage from "@/pages/public-privacy";
import PublicTermsPage from "@/pages/public-terms";
import PublicSecurityPage from "@/pages/public-security";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";

function HomeRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
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

  if (isAuthenticated) {
    return null;
  }

  return <LandingPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRouter} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/discovery" component={DiscoveryPage} />
      <Route path="/p/:slug" component={PublicLandingPage} />
      <Route path="/site/:slug" component={PublicSitePage} />
      <Route path="/about" component={PublicAboutPage} />
      <Route path="/blog" component={PublicBlogPage} />
      <Route path="/contact" component={PublicContactPage} />
      <Route path="/docs" component={PublicDocsPage} />
      <Route path="/help" component={PublicHelpPage} />
      <Route path="/status" component={PublicStatusPage} />
      <Route path="/privacy" component={PublicPrivacyPage} />
      <Route path="/terms" component={PublicTermsPage} />
      <Route path="/security" component={PublicSecurityPage} />
      <Route path="/dashboard/lp/:slug" component={PublicLandingPage} />
      <Route path="/dashboard" component={DashboardLayout} />
      <Route path="/dashboard/:rest*" component={DashboardLayout} />
      <Route path="/admin" component={AdminLoginPage} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
