import { useState } from "react";
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

const industries = [
  "Marketing Agency",
  "Real Estate",
  "Healthcare",
  "Legal Services",
  "Financial Services",
  "E-Commerce",
  "SaaS / Software",
  "Consulting",
  "Construction",
  "Home Services",
  "Fitness & Wellness",
  "Education",
  "Insurance",
  "Automotive",
  "Restaurant / Food",
  "Other",
];

export default function SignupPage() {
  usePageTitle("Sign Up");
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

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.companyName || !companyForm.industry || companyForm.companyDescription.length < 10) {
      toast({
        title: "Missing information",
        description: "Please fill in your company name, industry, and a brief description (at least 10 characters).",
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
      if (!res.ok) throw new Error(data.message || "Registration failed");

      await apiRequest("POST", "/api/onboarding", companyForm);

      const { queryClient } = await import("@/lib/queryClient");
      queryClient.setQueryData(["/api/auth/user"], data);
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error?.message || "Please try again.",
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
          <a href="/" className="inline-flex items-center gap-2 mb-6" data-testid="link-signup-home">
            <Zap className="w-7 h-7 text-primary" />
            <span className="text-2xl font-bold gradient-text">ArgiFlow</span>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">AI</Badge>
          </a>
          {step === 1 ? (
            <>
              <h1 className="text-2xl font-bold mb-2" data-testid="text-signup-title">Create Your Client Account</h1>
              <p className="text-sm text-muted-foreground">
                Step 1 of 2 — Account details
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2" data-testid="text-signup-step2-title">
                <Building2 className="w-5 h-5 inline-block mr-2 text-primary" />
                Tell Us About Your Business
              </h1>
              <p className="text-sm text-muted-foreground">
                Step 2 of 2 — Our AI will create a custom marketing strategy for you
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
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="John"
                    data-testid="input-signup-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="Smith"
                    data-testid="input-signup-lastname"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="john@company.com"
                  data-testid="input-signup-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 6 characters"
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
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/login" className="text-primary hover:underline" data-testid="link-login">
                Sign in
              </a>
            </div>
          </Card>
        ) : (
          <Card className="p-6 gradient-border">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  required
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  placeholder="Acme Corp"
                  data-testid="input-signup-company"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={companyForm.industry}
                  onValueChange={(v) => setCompanyForm({ ...companyForm, industry: v })}
                >
                  <SelectTrigger data-testid="select-signup-industry">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => (
                      <SelectItem key={ind} value={ind} data-testid={`industry-${ind.toLowerCase().replace(/[^a-z]/g, "-")}`}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  id="website"
                  value={companyForm.website}
                  onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                  placeholder="https://www.yourcompany.com"
                  data-testid="input-signup-website"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyDescription">What does your company do?</Label>
                <Textarea
                  id="companyDescription"
                  required
                  value={companyForm.companyDescription}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyDescription: e.target.value })}
                  placeholder="Tell us about your products, services, target customers, and goals. The more detail, the better strategy our AI can generate..."
                  className="resize-none min-h-[100px]"
                  data-testid="input-signup-description"
                />
                <p className="text-xs text-muted-foreground">Min 10 characters. Be specific for a better AI strategy.</p>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} data-testid="button-signup-back">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading} data-testid="button-signup-submit">
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Creating account...
                    </div>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Account & Generate Strategy
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
              "AI-powered lead management & CRM",
              "Real-time automation dashboards",
              "Direct line to your ArgiFlow team",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <Check className="w-3 h-3 text-chart-3" />
                <span>{f}</span>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center p-3 rounded-md bg-primary/5 border border-primary/10">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>Our AI will analyze your business and generate a complete marketing strategy automatically</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
