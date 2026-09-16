import { useEffect, useRef } from "react";
import { Switch, Route, useLocation, Redirect, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
  useAuth,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import LandingPage from "@/pages/landing";
import DiscoveryPage from "@/pages/discovery";
import DashboardLayout from "@/pages/dashboard-layout";
import AdminLoginPage from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
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

// REQUIRED — copy verbatim. Resolves key from window.location.hostname for custom-domain support.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim. Empty in dev (intentional), auto-set in prod.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Strip base prefix before passing to wouter's setLocation (which adds it back).
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#38bdf8",
    colorForeground: "#e6edf3",
    colorMutedForeground: "#8b949e",
    colorDanger: "#f87171",
    colorBackground: "#0d1117",
    colorInput: "#161b22",
    colorInputForeground: "#e6edf3",
    colorNeutral: "#30363d",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0d1117] border border-[#30363d] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#e6edf3] font-bold",
    headerSubtitle: "text-[#8b949e]",
    socialButtonsBlockButtonText: "text-[#e6edf3]",
    formFieldLabel: "text-[#e6edf3]",
    footerActionLink: "text-[#38bdf8] hover:text-[#7dd3fc]",
    footerActionText: "text-[#8b949e]",
    dividerText: "text-[#8b949e]",
    identityPreviewEditButton: "text-[#38bdf8]",
    formFieldSuccessText: "text-[#4ade80]",
    alertText: "text-[#e6edf3]",
    logoBox: "flex justify-center py-2",
    logoImage: "h-10",
    socialButtonsBlockButton: "border-[#30363d] bg-[#161b22] hover:bg-[#21262d] text-[#e6edf3]",
    formButtonPrimary: "bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#0d1117] font-semibold",
    formFieldInput: "bg-[#161b22] border-[#30363d] text-[#e6edf3] focus:border-[#38bdf8]",
    footerAction: "bg-[#0d1117]",
    dividerLine: "bg-[#30363d]",
    alert: "border-[#30363d] bg-[#161b22]",
    otpCodeFieldInput: "bg-[#161b22] border-[#30363d] text-[#e6edf3]",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0d1117] px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0d1117] px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

// Invalidate React Query cache on Clerk user change
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRouter() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setLocation("/dashboard");
    }
  }, [isSignedIn, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    return null;
  }

  return <LandingPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRouter} />
      {/* REQUIRED — copy "/sign-in/*?" and "/sign-up/*?" verbatim */}
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      {/* Legacy login/signup routes redirect to Clerk pages */}
      <Route path="/login">{() => <Redirect to="/sign-in" />}</Route>
      <Route path="/signup">{() => <Redirect to="/sign-up" />}</Route>
      <Route path="/forgot-password">{() => <Redirect to="/sign-in" />}</Route>
      <Route path="/reset-password">{() => <Redirect to="/sign-in" />}</Route>
      <Route path="/verify-email">{() => <Redirect to="/sign-in" />}</Route>
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

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to your ArgiFlow account",
          },
        },
        signUp: {
          start: {
            title: "Get started",
            subtitle: "Create your ArgiFlow account",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
