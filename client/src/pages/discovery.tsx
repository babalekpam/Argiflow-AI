import { useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Calendar,
  Clock,
  Check,
  Shield,
  ArrowRight,
  Phone,
  Mail,
  Bot,
  TrendingUp,
  Users,
  Star,
  Video,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DiscoveryCallPage() {
  usePageTitle("Discovery Call");
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    website: "",
    teamSize: "",
    revenue: "",
    challenge: "",
    interest: "",
    how: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setSubmitted(true);
    toast({
      title: "Discovery call booked!",
      description: "We'll email you a calendar link within 24 hours.",
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-8 text-center glow-purple gradient-border">
          <div className="w-16 h-16 rounded-2xl bg-chart-3/10 border border-chart-3/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-chart-3" />
          </div>
          <h1 className="text-3xl font-bold mb-3" data-testid="text-discovery-success">You're All Set!</h1>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            We've received your discovery call request. Our team will review your
            information and send you a calendar link within 24 hours.
          </p>
          <div className="space-y-3 text-left mb-8">
            {[
              "Check your email for a short questionnaire",
              "We'll research your business before our call",
              "Come prepared with your biggest challenges",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">{i + 1}</span>
                </div>
                <span>{step}</span>
              </div>
            ))}
          </div>
          <a href="/">
            <Button variant="outline" className="w-full" data-testid="button-back-home">
              Back to Home
            </Button>
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-background/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <a href="/" className="flex items-center gap-2" data-testid="link-discovery-home">
            <Zap className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold gradient-text">ArgiFlow</span>
            <Badge variant="outline" className="text-[10px] ml-1 border-primary/30 text-primary">AI</Badge>
          </a>
          <a href="/login">
            <Button variant="ghost" size="sm" data-testid="button-discovery-login">Client Login</Button>
          </a>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <Badge variant="outline" className="mb-4 py-1.5 px-4 border-primary/30 bg-primary/5">
                Free Discovery Call
              </Badge>
              <h1 className="text-4xl font-extrabold mb-4" data-testid="text-discovery-title">
                Let's Discuss How AI Can{" "}
                <span className="gradient-text">Scale Your Business</span>
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Book a free 30-minute call with our team. We'll learn about your
                business, identify high-ROI automation opportunities, and map out
                a plan to get you results.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: Clock, text: "30-minute focused strategy session" },
                { icon: Shield, text: "100% free, no obligation" },
                { icon: Bot, text: "Get a custom AI automation roadmap" },
                { icon: TrendingUp, text: "Identify your highest-ROI opportunities" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>

            <Card className="p-5">
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm italic text-foreground/90 mb-3">
                "The discovery call alone gave us more actionable insights than 3 months
                with our previous consultant. ArgiFlow actually understands how to apply AI
                to real business problems."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  JR
                </div>
                <div>
                  <p className="text-sm font-medium">Jennifer Rodriguez</p>
                  <p className="text-xs text-muted-foreground">CEO, NovaTech Solutions</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="p-8 gradient-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Book Your Discovery Call</h2>
                  <p className="text-xs text-muted-foreground">
                    Fill out this quick form and we'll schedule your call within 24 hours
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-discovery">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                      data-testid="input-discovery-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Smith"
                      data-testid="input-discovery-lastname"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Work Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@company.com"
                      data-testid="input-discovery-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      data-testid="input-discovery-phone"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name *</Label>
                    <Input
                      id="company"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Acme Corp"
                      data-testid="input-discovery-company"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://acme.com"
                      data-testid="input-discovery-website"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Team Size</Label>
                    <Select
                      value={formData.teamSize}
                      onValueChange={(v) => setFormData({ ...formData, teamSize: v })}
                    >
                      <SelectTrigger data-testid="select-discovery-teamsize"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-5">1-5 people</SelectItem>
                        <SelectItem value="6-20">6-20 people</SelectItem>
                        <SelectItem value="21-50">21-50 people</SelectItem>
                        <SelectItem value="50+">50+ people</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Annual Revenue</Label>
                    <Select
                      value={formData.revenue}
                      onValueChange={(v) => setFormData({ ...formData, revenue: v })}
                    >
                      <SelectTrigger data-testid="select-discovery-revenue"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pre-revenue">Pre-revenue</SelectItem>
                        <SelectItem value="0-250k">$0 - $250K</SelectItem>
                        <SelectItem value="250k-1m">$250K - $1M</SelectItem>
                        <SelectItem value="1m-5m">$1M - $5M</SelectItem>
                        <SelectItem value="5m+">$5M+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>What are you most interested in?</Label>
                  <Select
                    value={formData.interest}
                    onValueChange={(v) => setFormData({ ...formData, interest: v })}
                  >
                    <SelectTrigger data-testid="select-discovery-interest"><SelectValue placeholder="Select a service..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="voice-ai">Voice AI Agents</SelectItem>
                      <SelectItem value="chatbot">Lead Gen Chatbot</SelectItem>
                      <SelectItem value="process">Process Automation</SelectItem>
                      <SelectItem value="crm">CRM Integration</SelectItem>
                      <SelectItem value="receptionist">AI Receptionist</SelectItem>
                      <SelectItem value="custom">Custom AI Solution</SelectItem>
                      <SelectItem value="unsure">Not sure yet -- help me figure it out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="challenge">What's your biggest business challenge right now?</Label>
                  <Textarea
                    id="challenge"
                    rows={3}
                    value={formData.challenge}
                    onChange={(e) => setFormData({ ...formData, challenge: e.target.value })}
                    placeholder="e.g. We're spending too much time on manual follow-ups and losing leads..."
                    data-testid="textarea-discovery-challenge"
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting} data-testid="button-discovery-submit">
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Book My Free Discovery Call
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By submitting, you agree to our Privacy Policy. We'll never share your info.
                </p>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
