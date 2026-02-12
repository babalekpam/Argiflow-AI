import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowLeft, Mail, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPasswordPage() {
  usePageTitle("Forgot Password");
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email });
      setSent(true);
    } catch (error: any) {
      toast({
        title: t("auth.forgotPassword.error"),
        description: error?.message || t("auth.forgotPassword.somethingWrong"),
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
          <a href="/" className="inline-flex items-center gap-2 mb-6" data-testid="link-forgot-home">
            <Zap className="w-7 h-7 text-primary" />
            <span className="text-2xl font-bold gradient-text">{t("common.brandName")}</span>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{t("common.brandTag")}</Badge>
          </a>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-forgot-title">
            {sent ? t("auth.forgotPassword.checkEmail") : t("auth.forgotPassword.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {sent
              ? t("auth.forgotPassword.checkEmailDesc")
              : t("auth.forgotPassword.subtitle")}
          </p>
        </div>

        <Card className="p-6 gradient-border">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("auth.forgotPassword.sentTo")}</p>
                <p className="font-medium" data-testid="text-sent-email">{email}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center p-3 rounded-md bg-muted/50">
                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{t("auth.forgotPassword.linkExpires")}</span>
              </div>
              <div className="pt-2 space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSent(false)}
                  data-testid="button-resend"
                >
                  {t("auth.forgotPassword.sendAgain")}
                </Button>
                <a href="/login" className="block text-center text-sm text-primary hover:underline" data-testid="link-back-login">
                  {t("auth.forgotPassword.backToSignIn")}
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.forgotPassword.emailAddress")}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.forgotPassword.emailPlaceholder")}
                  data-testid="input-forgot-email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-forgot-submit">
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    {t("auth.forgotPassword.sendResetLink")}
                  </>
                )}
              </Button>
            </form>
          )}
          {!sent && (
            <div className="mt-4 text-center">
              <a href="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back-login">
                <ArrowLeft className="w-3 h-3" />
                {t("auth.forgotPassword.backToSignIn")}
              </a>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
