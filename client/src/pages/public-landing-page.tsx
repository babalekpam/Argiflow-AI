import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2, CheckCircle, ArrowRight, Star, Shield, Zap, Users } from "lucide-react";

type PageData = {
  id: string;
  name: string;
  slug: string;
  type: string;
  pageContent: string | null;
  seo: string | null;
};

type TemplateType = "blank" | "lead_capture" | "webinar" | "sales" | "product_launch";

export default function PublicLandingPage() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { data: page, isLoading, error } = useQuery<PageData>({
    queryKey: ["/api/public/landing-pages", params.slug],
    enabled: !!params.slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07090f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-[#07090f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">Page Not Found</h1>
          <p className="text-gray-400">This page doesn't exist or hasn't been published yet.</p>
          <Button variant="outline" onClick={() => setLocation("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const content = page.pageContent ? (typeof page.pageContent === "string" ? (() => { try { return JSON.parse(page.pageContent!); } catch { return {}; } })() : page.pageContent) : {};
  const template = (content?.template || "blank") as TemplateType;

  return <TemplateRenderer page={page} template={template} content={content} />;
}

function TemplateRenderer({ page, template, content }: { page: PageData; template: TemplateType; content: any }) {
  switch (template) {
    case "lead_capture":
      return <LeadCaptureTemplate page={page} content={content} />;
    case "webinar":
      return <WebinarTemplate page={page} content={content} />;
    case "sales":
      return <SalesTemplate page={page} content={content} />;
    case "product_launch":
      return <ProductLaunchTemplate page={page} content={content} />;
    default:
      return <BlankTemplate page={page} content={content} />;
  }
}

function BlankTemplate({ page, content }: { page: PageData; content: any }) {
  return (
    <div className="min-h-screen bg-[#07090f] text-white">
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-6">
          {content?.headline || page.name}
        </h1>
        <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
          {content?.subheadline || "Welcome to our page. We're building something amazing."}
        </p>
        <LeadForm buttonText={content?.ctaText || "Get Started"} />
      </div>
    </div>
  );
}

function LeadCaptureTemplate({ page, content }: { page: PageData; content: any }) {
  return (
    <div className="min-h-screen bg-[#07090f] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-600/10" />
        <div className="relative max-w-6xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm">
                <Zap className="w-4 h-4" /> Limited Time Offer
              </div>
              <h1 className="text-5xl font-bold leading-tight">
                {content?.headline || page.name}
              </h1>
              <p className="text-xl text-gray-300">
                {content?.subheadline || "Get exclusive access to our premium resources. Enter your email below to get started."}
              </p>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Free to join</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> No credit card</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Cancel anytime</div>
              </div>
            </div>
            <div className="bg-[#0d1119] border border-gray-800 rounded-2xl p-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Get Instant Access</h2>
                <p className="text-gray-400 text-sm">Fill out the form below to get started</p>
              </div>
              <LeadForm buttonText={content?.ctaText || "Get Free Access"} showName />
              <p className="text-xs text-gray-500 text-center">We respect your privacy. Unsubscribe at any time.</p>
            </div>
          </div>
        </div>
      </div>
      <TrustSection />
    </div>
  );
}

function WebinarTemplate({ page, content }: { page: PageData; content: any }) {
  return (
    <div className="min-h-screen bg-[#07090f] text-white">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-transparent" />
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium">
            Live Webinar
          </div>
          <h1 className="text-5xl font-bold leading-tight">
            {content?.headline || page.name}
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {content?.subheadline || "Join our exclusive live session and learn strategies that will transform your business."}
          </p>
          <div className="flex justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-purple-400" /> 500+ Attendees</div>
            <div className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> 4.9 Rating</div>
            <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400" /> Free Access</div>
          </div>
          <div className="max-w-md mx-auto bg-[#0d1119] border border-gray-800 rounded-2xl p-8 space-y-6">
            <h2 className="text-xl font-bold">Reserve Your Spot</h2>
            <LeadForm buttonText={content?.ctaText || "Register Now"} showName />
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">What You'll Learn</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {["Proven strategies for growth", "Actionable tactics you can implement today", "Expert Q&A session"].map((item, i) => (
            <div key={i} className="bg-[#0d1119] border border-gray-800 rounded-xl p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-gray-300">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SalesTemplate({ page, content }: { page: PageData; content: any }) {
  return (
    <div className="min-h-screen bg-[#07090f] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-600/5" />
        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center space-y-8">
          <h1 className="text-6xl font-bold leading-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            {content?.headline || page.name}
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {content?.subheadline || "The all-in-one solution that helps businesses grow faster with AI-powered automation."}
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8">
              {content?.ctaText || "Start Free Trial"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Zap, title: "Lightning Fast", desc: "Automate workflows in minutes, not hours" },
            { icon: Shield, title: "Enterprise Security", desc: "Bank-level encryption for all your data" },
            { icon: Users, title: "Team Collaboration", desc: "Work together seamlessly across departments" },
          ].map((feature, i) => (
            <div key={i} className="bg-[#0d1119] border border-gray-800 rounded-xl p-6 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold mb-6">Ready to Get Started?</h2>
        <LeadForm buttonText={content?.ctaText || "Get Started Now"} showName />
      </div>
    </div>
  );
}

function ProductLaunchTemplate({ page, content }: { page: PageData; content: any }) {
  return (
    <div className="min-h-screen bg-[#07090f] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-500/20 to-blue-600/20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-28 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium">
            <Star className="w-4 h-4" /> Coming Soon
          </div>
          <h1 className="text-6xl font-bold leading-tight">
            {content?.headline || page.name}
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {content?.subheadline || "Be the first to know when we launch. Join our waitlist for early access and exclusive perks."}
          </p>
          <div className="max-w-md mx-auto">
            <LeadForm buttonText={content?.ctaText || "Join the Waitlist"} />
          </div>
          <p className="text-sm text-gray-500">Join 1,000+ others already on the waitlist</p>
        </div>
      </div>
    </div>
  );
}

function LeadForm({ buttonText, showName = false }: { buttonText: string; showName?: boolean }) {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  if (submitted) {
    return (
      <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle className="w-5 h-5 text-emerald-400" />
        <p className="text-emerald-400 font-medium">Thank you! We'll be in touch soon.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
      className="space-y-3"
    >
      {showName && (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className="bg-[#131a26] border-gray-700 h-12 text-white placeholder:text-gray-500"
          data-testid="input-lead-name"
        />
      )}
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        className="bg-[#131a26] border-gray-700 h-12 text-white placeholder:text-gray-500"
        data-testid="input-lead-email"
      />
      <Button
        type="submit"
        className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold"
        data-testid="button-submit-lead"
      >
        {buttonText} <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </form>
  );
}

function TrustSection() {
  return (
    <div className="border-t border-gray-800 bg-[#0a0d14]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <p className="text-center text-sm text-gray-500 mb-8">Trusted by businesses worldwide</p>
        <div className="grid grid-cols-3 gap-8">
          {[
            { value: "10,000+", label: "Active Users" },
            { value: "98%", label: "Satisfaction Rate" },
            { value: "24/7", label: "Support" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
