import { useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, Eye, EyeOff, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  usePageTitle("Log In");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resending, setResending] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setNeedsVerification(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.needsVerification) {
          setNeedsVerification(true);
          setVerificationEmail(data.email || form.email);
          return;
        }
        throw new Error(data.message || "Login failed");
      }
      const { queryClient } = await import("@/lib/queryClient");
      queryClient.setQueryData(["/api/auth/user"], data);
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error?.message || "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail }),
      });
      const data = await res.json();
      toast({
        title: "Verification email sent",
        description: data.message || "Check your inbox for the confirmation link.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to resend verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-chart-4/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-6" data-testid="link-login-home">
            <Zap className="w-7 h-7 text-primary" />
            <span className="text-2xl font-bold gradient-text">ArgiFlow</span>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">AI</Badge>
          </a>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-login-title">Client Portal</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your AI automation dashboard
          </p>
        </div>

        <Card className="p-6 gradient-border">
          {needsVerification ? (
            <div className="text-center space-y-4" data-testid="verification-needed">
              <Mail className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-lg font-semibold">Email Not Verified</h2>
              <p className="text-sm text-muted-foreground">
                Please verify your email address before logging in. Check your inbox at <strong className="text-foreground">{verificationEmail}</strong> for the confirmation link.
              </p>
              <Button
                className="w-full"
                onClick={handleResendVerification}
                disabled={resending}
                data-testid="button-resend-verification"
              >
                {resending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Resend Verification Email
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setNeedsVerification(false)}
                data-testid="button-try-again"
              >
                Try a different account
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="john@company.com"
                    data-testid="input-login-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Enter your password"
                      className="pr-10"
                      data-testid="input-login-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-login-password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login-submit">
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
              <div className="mt-3 text-right">
                <a href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary" data-testid="link-forgot-password">
                  Forgot your password?
                </a>
              </div>
              <div className="mt-3 text-center text-sm text-muted-foreground">
                Not a client yet?{" "}
                <a href="/discovery" className="text-primary hover:underline" data-testid="link-discovery">
                  Book a discovery call
                </a>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
