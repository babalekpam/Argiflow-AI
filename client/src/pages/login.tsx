import { useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, Eye, EyeOff, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { FaGoogle, FaMicrosoft } from "react-icons/fa";

export default function LoginPage() {
  const { t } = useTranslation();
  usePageTitle(t("auth.login.title"));
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }
      const { queryClient } = await import("@/lib/queryClient");
      queryClient.setQueryData(["/api/auth/user"], data);
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: t("auth.login.loginFailed"),
        description: error?.message || t("auth.login.invalidCredentials"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
          <a href="/" className="inline-flex items-center gap-2 mb-2" data-testid="link-login-home">
            <Zap className="w-7 h-7 text-primary" />
            <span className="text-2xl font-bold gradient-text">{t("common.brandName")}</span>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{t("common.brandTag")}</Badge>
          </a>
          <p className="text-[11px] text-muted-foreground/70 mb-4" data-testid="text-login-product-of">{t("landing.footer.productOf")}</p>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-login-title">{t("auth.login.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.login.subtitle")}
          </p>
        </div>

        <Card className="p-6 gradient-border">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.login.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder={t("auth.login.emailPlaceholder")}
                    data-testid="input-login-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.login.password")}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={t("auth.login.passwordPlaceholder")}
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
                      {t("auth.login.signIn")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
              <div className="mt-3 text-right">
                <a href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary" data-testid="link-forgot-password">
                  {t("auth.login.forgotPassword")}
                </a>
              </div>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t("auth.login.orContinueWith")}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => setLocation("/signup?provider=google")}
                  data-testid="button-login-google"
                >
                  <FaGoogle className="w-4 h-4 text-red-500" />
                  <span className="flex-1 text-left">{t("auth.login.connectGoogle")}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => setLocation("/signup?provider=microsoft")}
                  data-testid="button-login-microsoft"
                >
                  <FaMicrosoft className="w-4 h-4 text-blue-500" />
                  <span className="flex-1 text-left">{t("auth.login.connectMicrosoft")}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => setLocation("/signup?provider=email")}
                  data-testid="button-login-email"
                >
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-left">{t("auth.login.connectEmail")}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                {t("auth.login.notClient")}{" "}
                <a href="/discovery" className="text-primary hover:underline" data-testid="link-discovery">
                  {t("auth.login.bookDiscovery")}
                </a>
              </div>
        </Card>
      </div>
    </div>
  );
}
