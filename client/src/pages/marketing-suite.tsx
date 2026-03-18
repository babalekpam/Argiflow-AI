import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Check, Loader2, Mail, Sparkles, Search, PenLine, Rocket, DollarSign, Target, BarChart3 } from "lucide-react";

interface ToolField {
  key: string;
  label: string;
  placeholder: string;
  optional?: boolean;
  textarea?: boolean;
}

interface Tool {
  id: string;
  name: string;
  icon: typeof Mail;
  tag: string;
  tagColor: string;
  description: string;
  fields: ToolField[];
  emailsField?: boolean;
  endpoint: string;
}

const TOOLS: Tool[] = [
  {
    id: "cold-email",
    name: "Cold Email Builder",
    icon: Mail,
    tag: "OUTREACH",
    tagColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    description: "Generate a complete 4-touch sequence tailored to any prospect.",
    fields: [
      { key: "target_role", label: "Target Role / Title", placeholder: "e.g. Office Manager, Medical Billing Director" },
      { key: "company_name", label: "Company / Industry", placeholder: "e.g. dental practice, SaaS startup" },
      { key: "industry", label: "Industry", placeholder: "e.g. Healthcare, B2B SaaS" },
      { key: "pain_point", label: "Their #1 Pain Point", placeholder: "e.g. claim denials eating revenue, low reply rates" },
      { key: "your_offer", label: "Your Offer / Solution", placeholder: "e.g. Track-Med handles your prior auth end-to-end" },
      { key: "tone", label: "Tone", placeholder: "peer-level / warm / direct / consultative", optional: true }
    ],
    endpoint: "/cold-email"
  },
  {
    id: "email-sequence",
    name: "Email Sequence Designer",
    icon: Sparkles,
    tag: "NURTURE",
    tagColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    description: "Build welcome, onboarding, re-engagement, or nurture sequences.",
    fields: [
      { key: "sequence_type", label: "Sequence Type", placeholder: "welcome / onboarding / lead-nurture / re-engagement" },
      { key: "audience", label: "Who Enters This Sequence?", placeholder: "e.g. Trial signups who haven't activated" },
      { key: "goal", label: "Conversion Goal", placeholder: "e.g. Get them to book a demo, upgrade to paid" },
      { key: "num_emails", label: "Number of Emails", placeholder: "5", optional: true },
      { key: "product_context", label: "Extra Context", placeholder: "Anything specific about your product/offer", optional: true }
    ],
    endpoint: "/email-sequence"
  },
  {
    id: "page-audit",
    name: "Landing Page Auditor",
    icon: Search,
    tag: "CRO",
    tagColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    description: "Paste your page copy. Get a score, quick wins, and rewritten headlines.",
    fields: [
      { key: "page_type", label: "Page Type", placeholder: "homepage / landing page / pricing / feature page" },
      { key: "goal", label: "Conversion Goal", placeholder: "e.g. Free trial signup, book a demo" },
      { key: "page_url", label: "Page URL (optional)", placeholder: "https://...", optional: true },
      { key: "traffic_source", label: "Main Traffic Source", placeholder: "organic / paid / email / social", optional: true },
      { key: "page_copy", label: "Paste Page Copy or Key Sections", placeholder: "Paste your headline, subhead, body copy, CTAs...", textarea: true }
    ],
    endpoint: "/page-audit"
  },
  {
    id: "copy-writer",
    name: "AI Copywriter",
    icon: PenLine,
    tag: "COPY",
    tagColor: "bg-green-500/20 text-green-300 border-green-500/30",
    description: "Write headlines, taglines, CTAs, value props — polished and ready to publish.",
    fields: [
      { key: "copy_type", label: "What to Write", placeholder: "homepage headline, email subject lines, ad copy, value prop..." },
      { key: "audience", label: "Target Audience", placeholder: "e.g. Medical office managers at small practices" },
      { key: "tone", label: "Tone", placeholder: "e.g. professional, urgent, peer-level, warm" },
      { key: "key_points", label: "Key Points to Hit", placeholder: "e.g. saves 10hrs/week, no setup fee, instant results" },
      { key: "existing_copy", label: "Existing Copy to Improve (optional)", placeholder: "Paste current copy here...", textarea: true, optional: true }
    ],
    endpoint: "/copy-writer"
  },
  {
    id: "launch-planner",
    name: "Launch Planner",
    icon: Rocket,
    tag: "GTM",
    tagColor: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    description: "Full go-to-market plan: pre-launch checklist, launch day schedule, 30-day post-plan.",
    fields: [
      { key: "launch_type", label: "What Are You Launching?", placeholder: "new feature / product launch / beta / major update" },
      { key: "product_name", label: "Product / Feature Name", placeholder: "e.g. Marketing Suite, MedAuth v2" },
      { key: "target_audience", label: "Target Audience", placeholder: "e.g. Medical billing companies, SMB founders" },
      { key: "timeline", label: "Launch Timeline", placeholder: "e.g. 2 weeks, launching March 30" },
      { key: "channels_available", label: "Available Channels", placeholder: "email list, LinkedIn, Twitter, Product Hunt, community..." }
    ],
    endpoint: "/launch-planner"
  },
  {
    id: "pricing-advisor",
    name: "Pricing Advisor",
    icon: DollarSign,
    tag: "MONETIZATION",
    tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    description: "Get a full pricing structure recommendation with tiers, value metric, and psychology tactics.",
    fields: [
      { key: "product_type", label: "Product Type", placeholder: "SaaS / service / marketplace / tool" },
      { key: "current_pricing", label: "Current Pricing (if any)", placeholder: "e.g. $49/mo flat, or none yet", optional: true },
      { key: "target_market", label: "Target Market", placeholder: "e.g. SMB healthcare practices, solo founders" },
      { key: "competitors", label: "Competitors + Their Prices", placeholder: "e.g. Apollo $99/mo, ZoomInfo $15k/yr" },
      { key: "goal", label: "Pricing Goal", placeholder: "e.g. maximize signups, move upmarket, increase ARPU" }
    ],
    endpoint: "/pricing-advisor"
  },
  {
    id: "ad-creative",
    name: "Ad Creative Generator",
    icon: Target,
    tag: "PAID ADS",
    tagColor: "bg-red-500/20 text-red-300 border-red-500/30",
    description: "Headlines, body copy, and CTAs for Facebook, Google, LinkedIn ads.",
    fields: [
      { key: "platform", label: "Ad Platform", placeholder: "Facebook/Meta / Google / LinkedIn / Twitter" },
      { key: "audience", label: "Target Audience", placeholder: "e.g. dental office managers, 35-55, US" },
      { key: "offer", label: "The Offer", placeholder: "e.g. Free 30-day trial of ArgiFlow, no credit card" },
      { key: "goal", label: "Campaign Goal", placeholder: "e.g. click to landing page, app installs, lead gen" },
      { key: "tone", label: "Tone", placeholder: "direct / professional / urgency / friendly", optional: true }
    ],
    endpoint: "/ad-creative"
  },
  {
    id: "sequence-review",
    name: "Sequence Reviewer",
    icon: BarChart3,
    tag: "AI REVIEW",
    tagColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    description: "Paste an existing sequence. Get a quality score and specific rewrites before you hit send.",
    fields: [
      { key: "sequence_name", label: "Sequence Name", placeholder: "e.g. Track-Med -- Dental Offices Outreach" },
      { key: "target_segment", label: "Target Segment", placeholder: "e.g. Dental office owners, 5-20 person practices" }
    ],
    emailsField: true,
    endpoint: "/sequence-review"
  }
];

export default function MarketingSuitePage() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [emails, setEmails] = useState([{ subject: "", body: "" }]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const openTool = (tool: Tool) => {
    setActiveTool(tool);
    setFormData({});
    setEmails([{ subject: "", body: "" }]);
    setResult("");
    setError("");
  };

  const addEmail = () => setEmails([...emails, { subject: "", body: "" }]);
  const removeEmail = (i: number) => setEmails(emails.filter((_, idx) => idx !== i));
  const updateEmail = (i: number, field: "subject" | "body", value: string) => {
    const updated = [...emails];
    updated[i][field] = value;
    setEmails(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setResult("");
    setError("");

    try {
      const payload: Record<string, any> = { ...formData };
      if (activeTool?.emailsField) payload.emails = emails;

      const res = await fetch(`/api/marketing-suite${activeTool!.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.result);
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch (e: any) {
      setError("Network error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeTool) {
    return (
      <div className="p-6 space-y-6" data-testid="marketing-suite-page">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-sky-600 flex items-center justify-center text-sm font-bold text-white">
              AF
            </div>
            <span className="text-muted-foreground text-sm font-medium tracking-widest uppercase">ArgiFlow</span>
          </div>
          <h1 className="text-3xl font-bold mb-1" data-testid="marketing-suite-title">Marketing Suite</h1>
          <p className="text-muted-foreground">AI-powered marketing tools. Built for outreach that actually converts.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TOOLS.map((tool) => {
            const IconComp = tool.icon;
            return (
              <Card
                key={tool.id}
                className="cursor-pointer hover:border-sky-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-sky-500/5 group"
                onClick={() => openTool(tool)}
                data-testid={`tool-card-${tool.id}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <IconComp className="w-5 h-5 text-sky-400" />
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold ${tool.tagColor}`}>
                      {tool.tag}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm mb-1.5 group-hover:text-sky-300 transition-colors" data-testid={`tool-name-${tool.id}`}>
                    {tool.name}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">{tool.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-sky-500/20 bg-sky-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-sky-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">All tools are pre-loaded with ArgiFlow context</p>
              <p className="text-muted-foreground text-xs mt-0.5">Your ICP, positioning, and offer are baked in — no need to re-explain your business every time.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const IconComp = activeTool.icon;

  return (
    <div className="p-6" data-testid="marketing-suite-tool-view">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTool(null)}
          data-testid="back-to-tools"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <IconComp className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-semibold">{activeTool.name}</h2>
          <Badge variant="outline" className={`text-[10px] font-bold ${activeTool.tagColor}`}>
            {activeTool.tag}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">{activeTool.description}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeTool.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  {field.label}
                  {field.optional && <span className="text-muted-foreground/50 ml-1">(optional)</span>}
                </label>
                {field.textarea ? (
                  <Textarea
                    rows={4}
                    placeholder={field.placeholder}
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    data-testid={`input-${field.key}`}
                  />
                ) : (
                  <Input
                    placeholder={field.placeholder}
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    data-testid={`input-${field.key}`}
                  />
                )}
              </div>
            ))}

            {activeTool.emailsField && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-muted-foreground">Emails to Review</label>
                  <Button variant="ghost" size="sm" onClick={addEmail} data-testid="add-email-btn">
                    + Add Email
                  </Button>
                </div>
                {emails.map((email, i) => (
                  <Card key={i} className="mb-3">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">Email {i + 1}</span>
                        {emails.length > 1 && (
                          <Button variant="ghost" size="sm" className="text-xs text-red-400 hover:text-red-300 h-6" onClick={() => removeEmail(i)}>
                            Remove
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="Subject line"
                        value={email.subject}
                        onChange={(e) => updateEmail(i, "subject", e.target.value)}
                        data-testid={`email-subject-${i}`}
                      />
                      <Textarea
                        rows={3}
                        placeholder="Email body..."
                        value={email.body}
                        onChange={(e) => updateEmail(i, "body", e.target.value)}
                        data-testid={`email-body-${i}`}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button
              className="w-full bg-gradient-to-r from-sky-600 to-violet-600 hover:from-sky-500 hover:to-violet-500"
              onClick={handleSubmit}
              disabled={loading}
              data-testid="generate-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate with AI"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="min-h-[400px] flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Output</CardTitle>
            {result && (
              <Button
                variant="ghost"
                size="sm"
                onClick={copyResult}
                data-testid="copy-result-btn"
              >
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? "Copied" : "Copy all"}
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm" data-testid="error-message">
                {error}
              </div>
            )}
            {!result && !error && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <IconComp className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground text-sm">Fill in the form and click Generate</p>
              </div>
            )}
            {loading && !result && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-3" />
                <p className="text-muted-foreground text-sm">AI is crafting your content...</p>
              </div>
            )}
            {result && (
              <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono" data-testid="result-output">
                {result}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
