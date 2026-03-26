import { useState } from "react";
import { ArrowLeft, Zap, Mail, MapPin, Phone, Clock, Send, MessageSquare, Building2 } from "lucide-react";

export default function PublicContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", company: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) setSubmitted(true);
    } catch {
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 h-16">
          <a href="/" className="flex items-center gap-2.5 no-underline" data-testid="link-home">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">Argi<span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Flow</span></span>
          </a>
          <a href="/" className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors no-underline" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </a>
        </div>
      </nav>

      <div className="pt-32 pb-24 px-6 max-w-[1000px] mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-300 uppercase tracking-widest px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-5">
            <MessageSquare className="w-3.5 h-3.5" />
            Contact Us
          </span>
          <h1 className="text-[clamp(32px,5vw,52px)] font-extrabold tracking-tight mb-4" data-testid="text-contact-title">
            Get in <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Touch</span>
          </h1>
          <p className="text-lg text-white/40 max-w-[560px] mx-auto leading-relaxed">
            Have a question, need a demo, or want to discuss how ArgiFlow can help your business grow? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {[
            { icon: Mail, title: "Email Us", detail: "info@argilette.com", sub: "We respond within 24 hours" },
            { icon: MapPin, title: "Headquarters", detail: "United States", sub: "Serving businesses globally" },
            { icon: Clock, title: "Business Hours", detail: "Mon-Fri, 9am-6pm CT", sub: "24/7 platform support" },
          ].map((c, i) => (
            <div key={i} className="rounded-2xl p-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] text-center" data-testid={`card-contact-${i}`}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                <c.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-[15px] font-semibold text-white mb-1">{c.title}</h3>
              <p className="text-[14px] text-indigo-400 font-medium mb-1">{c.detail}</p>
              <p className="text-[12px] text-white/30">{c.sub}</p>
            </div>
          ))}
        </div>

        <div className="max-w-[640px] mx-auto">
          <div className="rounded-2xl p-8 md:p-10 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]">
            {submitted ? (
              <div className="text-center py-12" data-testid="text-contact-success">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                  <Send className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
                <p className="text-white/40 text-sm">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h3 className="text-lg font-bold mb-6" data-testid="text-form-title">Send Us a Message</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Full Name</label>
                    <input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} data-testid="input-contact-name" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none border border-white/10 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 bg-white/5 placeholder:text-white/20" placeholder="John Smith" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Email</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} data-testid="input-contact-email" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none border border-white/10 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 bg-white/5 placeholder:text-white/20" placeholder="john@company.com" />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Company</label>
                  <input value={formData.company} onChange={e => setFormData(p => ({...p, company: e.target.value}))} data-testid="input-contact-company" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none border border-white/10 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 bg-white/5 placeholder:text-white/20" placeholder="Acme Corp" />
                </div>
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Subject</label>
                  <select value={formData.subject} onChange={e => setFormData(p => ({...p, subject: e.target.value}))} data-testid="select-contact-subject" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none border border-white/10 focus:border-indigo-500/50 bg-white/5">
                    <option value="" className="bg-[#0a0a0f]">Select a topic</option>
                    <option value="demo" className="bg-[#0a0a0f]">Request a Demo</option>
                    <option value="sales" className="bg-[#0a0a0f]">Sales Inquiry</option>
                    <option value="support" className="bg-[#0a0a0f]">Technical Support</option>
                    <option value="partnership" className="bg-[#0a0a0f]">Partnership Opportunity</option>
                    <option value="other" className="bg-[#0a0a0f]">Other</option>
                  </select>
                </div>
                <div className="mb-6">
                  <label className="block text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">Message</label>
                  <textarea required value={formData.message} onChange={e => setFormData(p => ({...p, message: e.target.value}))} data-testid="input-contact-message" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none border border-white/10 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 bg-white/5 placeholder:text-white/20 resize-y min-h-[120px]" placeholder="Tell us how we can help..." />
                </div>
                <button type="submit" disabled={sending} data-testid="button-contact-submit" className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50">
                  <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <footer className="py-8 px-6 max-w-[900px] mx-auto border-t border-white/5 text-center">
        <p className="text-[12px] text-white/15">&copy; {new Date().getFullYear()} ArgiFlow AI by ARGILETTE Labs. All rights reserved.</p>
      </footer>
    </div>
  );
}
