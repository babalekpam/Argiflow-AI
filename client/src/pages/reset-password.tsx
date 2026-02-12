import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Zap, Eye, EyeOff, Lock, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

function useSearchParam(name: string): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

export default function ResetPasswordPage() {
  usePageTitle("Reset Password");
  const { t } = useTranslation();
  const { toast } = useToast();
  const token = useSearchParam("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: t("auth.resetPassword.dontMatch"),
        description: t("auth.resetPassword.dontMatchDesc"),
        variant: "destructive",
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: t("auth.resetPassword.tooShort"),
        description: t("auth.resetPassword.tooShortDesc"),
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (error: any) {
      toast({
        title: t("auth.resetPassword.resetFailed"),
        description: error?.message || t("auth.resetPassword.invalidOrExpired"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-6 max-w-md w-full text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t("auth.resetPassword.invalidLink")}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t("auth.resetPassword.invalidLinkDesc")}</p>
          <a href="/forgot-password">
            <Button data-testid="button-request-new-reset">{t("auth.resetPassword.requestNew")}</Button>
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-chart-4/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-6" data-testid="link-reset-home">
            <Zap className="w-7 h-7 text-primary" />
            <span className="text-2xl font-bold gradient-text">{t("common.brandName")}</span>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{t("common.brandTag")}</Badge>
          </a>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-reset-title">
            {success ? t("auth.resetPassword.passwordReset") : t("auth.resetPassword.setNewPassword")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {success ? t("auth.resetPassword.passwordUpdated") : t("auth.resetPassword.enterNew")}
          </p>
        </div>

        <Card className="p-6 gradient-border">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-sm text-muted-foreground">{t("auth.resetPassword.canSignIn")}</p>
              <a href="/login">
                <Button className="w-full" data-testid="button-go-login">
                  {t("auth.resetPassword.goToSignIn")}
                </Button>
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.resetPassword.newPassword")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.resetPassword.minChars")}
                    className="pr-10"
                    data-testid="input-reset-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-reset-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("auth.resetPassword.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("auth.resetPassword.confirmPlaceholder")}
                  data-testid="input-reset-confirm-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-reset-submit">
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    {t("auth.resetPassword.resetBtn")}
                  </>
                )}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
