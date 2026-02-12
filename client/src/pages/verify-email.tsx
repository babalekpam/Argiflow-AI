import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { useLocation } from "wouter";

export default function VerifyEmailPage() {
  usePageTitle("Verify Email");
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage(t("auth.verifyEmail.noToken"));
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.message || t("auth.verifyEmail.failed"));
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage(t("auth.verifyEmail.somethingWrong"));
      });
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-chart-4/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-6" data-testid="link-verify-home">
            <Zap className="w-7 h-7 text-primary" />
            <span className="text-2xl font-bold gradient-text">{t("common.brandName")}</span>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{t("common.brandTag")}</Badge>
          </a>
        </div>

        <Card className="p-8 gradient-border text-center">
          {status === "loading" && (
            <div className="space-y-4" data-testid="verify-loading">
              <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
              <h2 className="text-xl font-semibold">{t("auth.verifyEmail.verifying")}</h2>
              <p className="text-sm text-muted-foreground">{t("auth.verifyEmail.pleaseWait")}</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4" data-testid="verify-success">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
              <h2 className="text-xl font-semibold">{t("auth.verifyEmail.verified")}</h2>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button className="w-full" onClick={() => setLocation("/login")} data-testid="button-go-to-login">
                {t("auth.verifyEmail.goToLogin")}
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4" data-testid="verify-error">
              <XCircle className="w-14 h-14 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">{t("auth.verifyEmail.failed")}</h2>
              <p className="text-sm text-muted-foreground">{message}</p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full" onClick={() => setLocation("/login")} data-testid="button-back-to-login">
                  <Mail className="w-4 h-4 mr-2" />
                  {t("auth.verifyEmail.backToLogin")}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
