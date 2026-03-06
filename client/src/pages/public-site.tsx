import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2, Globe, ArrowRight, Star, Check, Mail, Phone, MapPin, Zap, ShieldCheck, Users, BarChart3, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type Block = {
  type: string;
  label: string;
  content: Record<string, any>;
};

const BLOCK_ICONS: Record<string, any> = {
  hero: Zap,
  features: Star,
  pricing: BarChart3,
  testimonials: Users,
  about: Heart,
  contact: Mail,
  cta: ArrowRight,
  faq: ShieldCheck,
  gallery: Sparkles,
};

function safeJsonParse(val: string | null | undefined, fallback: any = []) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function HeroBlock({ content }: { content: any }) {
  return (
    <section className="relative py-24 md:py-32 px-6 text-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 overflow-hidden" data-testid="section-hero">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
      <div className="relative max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight" data-testid="text-hero-heading">
          {content?.heading || "Welcome"}
        </h1>
        {content?.subheading && (
          <p className="text-lg md:text-xl text-blue-200/80 max-w-2xl mx-auto" data-testid="text-hero-subheading">
            {content.subheading}
          </p>
        )}
        <div className="flex flex-wrap gap-4 justify-center pt-4">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8" data-testid="button-hero-cta">
            Get Started <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Button size="lg" variant="outline" className="border-blue-400/30 text-blue-200 hover:bg-blue-500/10" data-testid="button-hero-secondary">
            Learn More
          </Button>
        </div>
      </div>
    </section>
  );
}

function FeaturesBlock({ content }: { content: any }) {
  const items = content?.items || [];
  return (
    <section className="py-20 px-6 bg-slate-950" data-testid="section-features">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" data-testid="text-features-heading">
            {content?.heading || "Features"}
          </h2>
          {content?.subheading && (
            <p className="text-blue-200/60 text-lg max-w-2xl mx-auto">{content.subheading}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item: any, i: number) => (
            <div key={i} className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/30 transition-all" data-testid={`card-feature-${i}`}>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <Check className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title || item.name}</h3>
              <p className="text-sm text-slate-400">{item.description || item.desc || ""}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingBlock({ content }: { content: any }) {
  const items = content?.items || [];
  return (
    <section className="py-20 px-6 bg-slate-900" data-testid="section-pricing">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{content?.heading || "Pricing"}</h2>
          {content?.subheading && <p className="text-blue-200/60 text-lg">{content.subheading}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item: any, i: number) => (
            <div key={i} className={`p-6 rounded-xl border ${i === 1 ? "bg-blue-600/10 border-blue-500/40 ring-1 ring-blue-500/20" : "bg-slate-900/60 border-slate-800"}`} data-testid={`card-pricing-${i}`}>
              <h3 className="text-lg font-bold text-white mb-1">{item.title || item.name}</h3>
              <p className="text-3xl font-bold text-blue-400 mb-4">{item.price || item.description || ""}</p>
              <p className="text-sm text-slate-400 mb-6">{item.description || item.desc || ""}</p>
              <Button className={i === 1 ? "w-full bg-blue-600 hover:bg-blue-700" : "w-full"} variant={i === 1 ? "default" : "outline"}>
                Choose Plan
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsBlock({ content }: { content: any }) {
  const items = content?.items || [];
  return (
    <section className="py-20 px-6 bg-slate-950" data-testid="section-testimonials">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{content?.heading || "What Our Clients Say"}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item: any, i: number) => (
            <div key={i} className="p-6 rounded-xl bg-slate-900/60 border border-slate-800" data-testid={`card-testimonial-${i}`}>
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, s) => (
                  <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-slate-300 mb-4 italic">"{item.description || item.quote || item.desc || ""}"</p>
              <p className="text-sm font-semibold text-white">{item.title || item.name || "Happy Client"}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutBlock({ content }: { content: any }) {
  return (
    <section className="py-20 px-6 bg-slate-900" data-testid="section-about">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">{content?.heading || "About Us"}</h2>
        <p className="text-lg text-slate-400 leading-relaxed">{content?.subheading || content?.description || ""}</p>
      </div>
    </section>
  );
}

function ContactBlock({ content }: { content: any }) {
  return (
    <section className="py-20 px-6 bg-slate-950" data-testid="section-contact">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-4">{content?.heading || "Get in Touch"}</h2>
          {content?.subheading && <p className="text-slate-400">{content.subheading}</p>}
        </div>
        <div className="space-y-4 p-8 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Your Name" className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500" data-testid="input-contact-name" />
            <input placeholder="Your Email" className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500" data-testid="input-contact-email" />
          </div>
          <textarea placeholder="Your Message" rows={4} className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" data-testid="input-contact-message" />
          <Button className="w-full bg-blue-600 hover:bg-blue-700" data-testid="button-contact-submit">
            <Mail className="w-4 h-4 mr-2" /> Send Message
          </Button>
        </div>
      </div>
    </section>
  );
}

function CtaBlock({ content }: { content: any }) {
  return (
    <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-blue-800" data-testid="section-cta">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{content?.heading || "Ready to Get Started?"}</h2>
        {content?.subheading && <p className="text-blue-100/80 text-lg mb-8">{content.subheading}</p>}
        <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 px-10 font-semibold" data-testid="button-cta-action">
          Start Now <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </section>
  );
}

function FaqBlock({ content }: { content: any }) {
  const items = content?.items || [];
  return (
    <section className="py-20 px-6 bg-slate-900" data-testid="section-faq">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-12">{content?.heading || "FAQ"}</h2>
        <div className="space-y-4">
          {items.map((item: any, i: number) => (
            <div key={i} className="p-5 rounded-xl bg-slate-900/60 border border-slate-800" data-testid={`faq-item-${i}`}>
              <h3 className="text-white font-semibold mb-2">{item.title || item.name || `Question ${i + 1}`}</h3>
              <p className="text-sm text-slate-400">{item.description || item.answer || item.desc || ""}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GenericBlock({ block }: { block: Block }) {
  const Icon = BLOCK_ICONS[block.type] || Globe;
  return (
    <section className="py-16 px-6 bg-slate-950" data-testid={`section-${block.type}`}>
      <div className="max-w-4xl mx-auto text-center">
        <Icon className="w-8 h-8 text-blue-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-4">{block.content?.heading || block.label}</h2>
        {block.content?.subheading && <p className="text-slate-400">{block.content.subheading}</p>}
      </div>
    </section>
  );
}

function SiteRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "hero": return <HeroBlock key={i} content={block.content} />;
          case "features": return <FeaturesBlock key={i} content={block.content} />;
          case "pricing": return <PricingBlock key={i} content={block.content} />;
          case "testimonials": return <TestimonialsBlock key={i} content={block.content} />;
          case "about": return <AboutBlock key={i} content={block.content} />;
          case "contact": return <ContactBlock key={i} content={block.content} />;
          case "cta": return <CtaBlock key={i} content={block.content} />;
          case "faq": return <FaqBlock key={i} content={block.content} />;
          default: return <GenericBlock key={i} block={block} />;
        }
      })}
    </>
  );
}

export default function PublicSitePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/public/sites", slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/sites/${slug}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Site not found");
        throw new Error("Failed to load site");
      }
      return res.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <p className="text-sm text-slate-400">Loading site...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" data-testid="site-not-found">
        <div className="text-center space-y-4">
          <Globe className="w-16 h-16 text-slate-600 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Site Not Found</h1>
          <p className="text-slate-400">This site doesn't exist or hasn't been published yet.</p>
          <a href="/" className="inline-block">
            <Button variant="outline" data-testid="link-go-home">Go Home</Button>
          </a>
        </div>
      </div>
    );
  }

  const blocks: Block[] = safeJsonParse(data.blocks, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800" data-testid="site-navbar">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          <span className="font-bold text-white text-lg" data-testid="text-site-name">{data.name}</span>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs" data-testid="button-site-cta">
          Contact Us
        </Button>
      </nav>

      {blocks.length > 0 ? (
        <SiteRenderer blocks={blocks} />
      ) : (
        <div className="py-32 text-center">
          <p className="text-slate-400">This site is being set up.</p>
        </div>
      )}

      <footer className="py-8 px-6 bg-slate-900 border-t border-slate-800 text-center" data-testid="site-footer">
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} {data.name}. Powered by{" "}
          <a href="/" className="text-blue-400 hover:text-blue-300">ArgiFlow</a>
        </p>
      </footer>
    </div>
  );
}
