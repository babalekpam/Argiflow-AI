import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, ArrowRight, ArrowLeft, Eye, EyeOff, Check, Building2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function SignupPage() {
  const { t } = useTranslation();
  usePageTitle(t("auth.signup.title"));
  const { register } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    industry: "",
    website: "",
    companyDescription: "",
  });

  const industryKeys = [
    "marketingAgency", "realEstate", "healthcare", "legalServices", "financialServices",
    "eCommerce", "saas", "consulting", "construction", "homeServices",
    "fitnessWellness", "education", "insurance", "automotive", "restaurantFood", "other"
  ];

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.companyName || !companyForm.industry || companyForm.companyDescription.length < 10) {
      toast({
        title: t("auth.signup.missingInfo"),
        description: t("auth.signup.missingInfoDesc"),
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t("auth.signup.registrationFailed"));

      await apiRequest("POST", "/api/onboarding", companyForm);

      const { queryClient } = await import("@/lib/queryClient");
      queryClient.setQueryData(["/api/auth/user"], data);
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: t("auth.signup.registrationFailed"),
        description: error?.message || t("auth.signup.tryAgain"),
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
          <a href="/" className="inline-flex items-center gap-2 mb-2" data-testid="link-signup-home">
            <Zap className="w-7 h-7 text-primary" />
            <span className="text-2xl font-bold gradient-text">{t("common.brandName")}</span>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{t("common.brandTag")}</Badge>
          </a>
          <p className="text-[11px] text-muted-foreground/70 mb-4" data-testid="text-signup-product-of">{t("landing.footer.productOf")}</p>
          {step === 1 ? (
            <>
              <h1 className="text-2xl font-bold mb-2" data-testid="text-signup-title">{t("auth.signup.title")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("auth.signup.step1")}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2" data-testid="text-signup-step2-title">
                <Building2 className="w-5 h-5 inline-block mr-2 text-primary" />
                {t("auth.signup.step2Title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("auth.signup.step2")}
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className={`h-1.5 w-16 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-1.5 w-16 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>

        {step === 1 ? (
          <Card className="p-6 gradient-border">
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("auth.signup.firstName")}</Label>
                  <Input
                    id="firstName"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder={t("auth.signup.firstNamePlaceholder")}
                    data-testid="input-signup-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("auth.signup.lastName")}</Label>
                  <Input
                    id="lastName"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder={t("auth.signup.lastNamePlaceholder")}
                    data-testid="input-signup-lastname"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.signup.workEmail")}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={t("auth.signup.emailPlaceholder")}
                  data-testid="input-signup-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.signup.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={t("auth.signup.passwordPlaceholder")}
                    className="pr-10"
                    data-testid="input-signup-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-signup-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" data-testid="button-signup-next">
                {t("auth.signup.continue")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {t("auth.signup.alreadyHaveAccount")}{" "}
              <a href="/login" className="text-primary hover:underline" data-testid="link-login">
                {t("auth.signup.signIn")}
              </a>
            </div>
          </Card>
        ) : (
          <Card className="p-6 gradient-border">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">{t("auth.signup.companyName")}</Label>
                <Input
                  id="companyName"
                  required
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  placeholder={t("auth.signup.companyNamePlaceholder")}
                  data-testid="input-signup-company"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">{t("auth.signup.industry")}</Label>
                <Select
                  value={companyForm.industry}
                  onValueChange={(v) => setCompanyForm({ ...companyForm, industry: v })}
                >
                  <SelectTrigger data-testid="select-signup-industry">
                    <SelectValue placeholder={t("auth.signup.industryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {industryKeys.map((key) => (
                      <SelectItem key={key} value={t(`auth.signup.industries.${key}`)} data-testid={`industry-${key}`}>
                        {t(`auth.signup.industries.${key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">{t("auth.signup.website")} <span className="text-muted-foreground text-xs">({t("common.optional")})</span></Label>
                <Input
                  id="website"
                  value={companyForm.website}
                  onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                  placeholder={t("auth.signup.websitePlaceholder")}
                  data-testid="input-signup-website"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyDescription">{t("auth.signup.whatDoesCompanyDo")}</Label>
                <Textarea
                  id="companyDescription"
                  required
                  value={companyForm.companyDescription}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyDescription: e.target.value })}
                  placeholder={t("auth.signup.companyDescPlaceholder")}
                  className="resize-none min-h-[100px]"
                  data-testid="input-signup-description"
                />
                <p className="text-xs text-muted-foreground">{t("auth.signup.minChars")}</p>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} data-testid="button-signup-back">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {t("auth.signup.back")}
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading} data-testid="button-signup-submit">
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      {t("auth.signup.creatingAccount")}
                    </div>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t("auth.signup.createAccount")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="mt-6 space-y-2">
          {step === 1 ? (
            [
              t("auth.signup.feature1"),
              t("auth.signup.feature2"),
              t("auth.signup.feature3"),
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <Check className="w-3 h-3 text-chart-3" />
                <span>{f}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center p-3 rounded-md bg-primary/5 border border-primary/10">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>{t("auth.signup.aiAnalyze")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}