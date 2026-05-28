import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, CheckCheck, Loader2, FileText, Wrench, MailOpen, Calendar, Network } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function OutputBox({ output, skill }: { output: string; skill: string }) {
  if (!output) return null;
  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Output — {skill}</Label>
        <CopyButton text={output} />
      </div>
      <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 border rounded-lg p-4 leading-relaxed max-h-[480px] overflow-y-auto">
        {output}
      </pre>
    </div>
  );
}

// ── Ticket Notes ─────────────────────────────────────────────────────────────
function TicketNotesTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({ ticketId: "", platform: "", severity: "", symptoms: "", cliDump: "", actionsTaken: "" });
  const [output, setOutput] = useState("");

  const mutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/iptrc/ticket-notes", data),
    onSuccess: async (res) => {
      const json = await res.json();
      setOutput(json.output);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label>Ticket ID (optional)</Label>
          <Input placeholder="AOTS123456789" value={form.ticketId} onChange={set("ticketId")} />
        </div>
        <div>
          <Label>Platform *</Label>
          <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
            <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
            <SelectContent>
              {["Cisco IOS-XR", "Cisco IOS-XE", "Juniper Junos", "Arista EOS", "Drivenets", "Ciena", "Nokia SR-OS", "Other"].map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Severity / Impact (optional)</Label>
          <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}>
            <SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger>
            <SelectContent>
              {["P1 — Complete Outage", "P2 — Partial Outage", "P3 — Degraded", "P4 — Low", "Monitoring"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Symptoms / Ticket Description *</Label>
        <Textarea rows={4} placeholder="Describe the issue, alarms, customer impact..." value={form.symptoms} onChange={set("symptoms")} />
      </div>
      <div>
        <Label>CLI Output / Logs (paste here)</Label>
        <Textarea rows={6} placeholder="show interface, show optics, show log, platform output..." className="font-mono text-xs" value={form.cliDump} onChange={set("cliDump")} />
      </div>
      <div>
        <Label>Actions Already Taken</Label>
        <Textarea rows={3} placeholder="e.g. Rebooted LC, cleared counters, checked far end admin state..." value={form.actionsTaken} onChange={set("actionsTaken")} />
      </div>
      <Button onClick={() => mutation.mutate(form)} disabled={!form.platform || !form.symptoms || mutation.isPending} className="gap-2">
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        Generate Work Notes
      </Button>
      <OutputBox output={output} skill="Ticket Notes" />
    </div>
  );
}

// ── SMOP/GMOP ─────────────────────────────────────────────────────────────────
function SmopDraftTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({ hostname: "", platform: "", osVersion: "", workType: "", windowStart: "", windowEnd: "", timezone: "", riskNotes: "" });
  const [output, setOutput] = useState("");

  const mutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/iptrc/smop-draft", data),
    onSuccess: async (res) => { const j = await res.json(); setOutput(j.output); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Device Hostname *</Label>
          <Input placeholder="e.g. dal13-cr5.ip.att.net" value={form.hostname} onChange={set("hostname")} className="font-mono" />
        </div>
        <div>
          <Label>Platform *</Label>
          <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
            <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
            <SelectContent>
              {["Cisco ASR9000 (IOS-XR)", "Cisco NCS5500 (IOS-XR)", "Cisco CRS", "Juniper MX (Junos)", "Juniper PTX", "Arista 7500 (EOS)", "Drivenets NCP", "Ciena Waveserver", "Nokia 7750 SR", "Other"].map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>OS Version</Label>
          <Input placeholder="e.g. IOS-XR 7.9.2" value={form.osVersion} onChange={set("osVersion")} />
        </div>
        <div>
          <Label>Work Type *</Label>
          <Select value={form.workType} onValueChange={(v) => setForm((f) => ({ ...f, workType: v }))}>
            <SelectTrigger><SelectValue placeholder="Select work type" /></SelectTrigger>
            <SelectContent>
              {["RE Toggle (Route Engine Switchover)", "Optics Replacement", "PEM Replacement", "FPC / Line Card Replacement", "Software Upgrade", "Hardware RMA", "Configuration Change", "Other"].map((w) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Window Start *</Label>
          <Input type="datetime-local" value={form.windowStart} onChange={set("windowStart")} />
        </div>
        <div>
          <Label>Window End *</Label>
          <Input type="datetime-local" value={form.windowEnd} onChange={set("windowEnd")} />
        </div>
        <div>
          <Label>Timezone Label *</Label>
          <Input placeholder="e.g. CST, UTC, EST" value={form.timezone} onChange={set("timezone")} />
        </div>
      </div>
      <div>
        <Label>Risk Notes (optional)</Label>
        <Textarea rows={2} placeholder="Any known risks, customer commitments, SLA concerns..." value={form.riskNotes} onChange={set("riskNotes")} />
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={() => mutation.mutate(form)} disabled={!form.hostname || !form.platform || !form.workType || !form.windowStart || !form.windowEnd || !form.timezone || mutation.isPending} className="gap-2">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
          Generate SMOP/GMOP Scaffold
        </Button>
        <Badge variant="outline" className="text-amber-600 border-amber-400">Always outputs as DRAFT</Badge>
      </div>
      <OutputBox output={output} skill="SMOP/GMOP Draft" />
    </div>
  );
}

// ── RMA Email ─────────────────────────────────────────────────────────────────
function RmaEmailTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    aotsTicket: "", platform: "", problemDescription: "", additionalInfo: "",
    defectivePartFailure: "", defectivePidSn: "", hostname: "", ficNumber: "",
    clli: "", oswfTicket: "", shippingAddress: "", onsiteContact: "",
    vendorCase: "", nocTicket: "", sameOrNextDay: "", efaRequired: "",
    showChassisFirmware: "", showChassisHardware: "", showVersion: "",
    showLicense: "", showLicenseKeys: "",
  });
  const [output, setOutput] = useState("");

  const mutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/iptrc/rma-email", data),
    onSuccess: async (res) => { const j = await res.json(); setOutput(j.output); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const required = !form.aotsTicket || !form.platform || !form.problemDescription || !form.defectivePartFailure || !form.defectivePidSn || !form.hostname || !form.clli || !form.oswfTicket || !form.shippingAddress || !form.onsiteContact || !form.sameOrNextDay || !form.efaRequired;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>AOTS Ticket # *</Label>
          <Input placeholder="AOTS123456789012" value={form.aotsTicket} onChange={set("aotsTicket")} className="font-mono" />
        </div>
        <div>
          <Label>Platform *</Label>
          <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
            <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
            <SelectContent>
              {["Cisco", "Juniper", "Arista", "Ciena", "Drivenets", "Nokia", "Other"].map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Problem Description *</Label>
        <Textarea rows={3} placeholder="Describe the hardware failure, symptoms observed, impact..." value={form.problemDescription} onChange={set("problemDescription")} />
      </div>
      <div>
        <Label>Additional Info (corrective action, snapshots etc.)</Label>
        <Textarea rows={2} placeholder="Actions taken, diagnostic snapshots captured..." value={form.additionalInfo} onChange={set("additionalInfo")} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Defective Part Failure / Requested Part *</Label>
          <Input placeholder="e.g. FPC failed, requesting replacement" value={form.defectivePartFailure} onChange={set("defectivePartFailure")} />
        </div>
        <div>
          <Label>Defective PID / Serial Number *</Label>
          <Input placeholder="e.g. A9K-MOD80-SE / XXXXXXXXXX" value={form.defectivePidSn} onChange={set("defectivePidSn")} className="font-mono" />
        </div>
        <div>
          <Label>Device Hostname *</Label>
          <Input placeholder="e.g. dal13-cr5.ip.att.net" value={form.hostname} onChange={set("hostname")} className="font-mono" />
        </div>
        <div>
          <Label>FIC Number</Label>
          <Input placeholder="FIC number if applicable" value={form.ficNumber} onChange={set("ficNumber")} />
        </div>
        <div>
          <Label>Site CLLI *</Label>
          <Input placeholder="e.g. DLSTX123" value={form.clli} onChange={set("clli")} className="font-mono" />
        </div>
        <div>
          <Label>OSWF / WMS Ticket *</Label>
          <Input placeholder="Onsite workforce ticket #" value={form.oswfTicket} onChange={set("oswfTicket")} className="font-mono" />
        </div>
      </div>
      <div>
        <Label>Shipping Address *</Label>
        <Textarea rows={2} placeholder="Full shipping address for defective part return" value={form.shippingAddress} onChange={set("shippingAddress")} />
      </div>
      <div>
        <Label>Onsite Contact (name, number, email) *</Label>
        <Input placeholder="John Smith, 555-123-4567, jsmith@att.com" value={form.onsiteContact} onChange={set("onsiteContact")} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Vendor Case (if open)</Label>
          <Input placeholder="Cisco/Juniper case #" value={form.vendorCase} onChange={set("vendorCase")} className="font-mono" />
        </div>
        <div>
          <Label>AT&T NOC Ticket</Label>
          <Input placeholder="NOC ticket #" value={form.nocTicket} onChange={set("nocTicket")} className="font-mono" />
        </div>
        <div>
          <Label>Same Day or Next Day *</Label>
          <Select value={form.sameOrNextDay} onValueChange={(v) => setForm((f) => ({ ...f, sameOrNextDay: v }))}>
            <SelectTrigger><SelectValue placeholder="Select delivery" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Same Day">Same Day</SelectItem>
              <SelectItem value="Next Day">Next Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Engineering Failure Analysis (EFA) Required? *</Label>
          <Select value={form.efaRequired} onValueChange={(v) => setForm((f) => ({ ...f, efaRequired: v }))}>
            <SelectTrigger><SelectValue placeholder="Yes or No" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CLI Snapshots (paste output)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "show chassis firmware", key: "showChassisFirmware" as const },
            { label: "show chassis hardware", key: "showChassisHardware" as const },
            { label: "show version", key: "showVersion" as const },
            { label: "show system license", key: "showLicense" as const },
            { label: "show system license keys", key: "showLicenseKeys" as const },
          ].map(({ label, key }) => (
            <div key={key}>
              <Label className="text-xs">{label}</Label>
              <Textarea rows={2} placeholder={`Paste output of "${label}"...`} className="font-mono text-xs" value={form[key]} onChange={set(key)} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={() => mutation.mutate(form)} disabled={required || mutation.isPending} className="gap-2">
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailOpen className="w-4 h-4" />}
          Compose RMA Email
        </Button>
        <Badge variant="outline" className="text-blue-600 border-blue-400">Text-only, KGPCo compliant</Badge>
      </div>
      <OutputBox output={output} skill="RMA Email (KGPCo Format)" />
    </div>
  );
}

// ── Maintenance Email Summary ──────────────────────────────────────────────────
function MaintEmailTab() {
  const { toast } = useToast();
  const [emailBody, setEmailBody] = useState("");
  const [output, setOutput] = useState("");

  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/iptrc/maint-email", { emailBody }),
    onSuccess: async (res) => { const j = await res.json(); setOutput(j.output); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>Paste Maintenance Email Body *</Label>
        <Textarea
          rows={14}
          className="font-mono text-xs"
          placeholder="Paste the full text of the carrier maintenance notification email here..."
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
        />
      </div>
      <Button onClick={() => mutation.mutate()} disabled={emailBody.trim().length < 20 || mutation.isPending} className="gap-2">
        {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
        Summarize &amp; Extract Actions
      </Button>
      <OutputBox output={output} skill="Maintenance Email Summary + IPTRC Actions" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function IptrcOpsCopilotPage() {
  return (
    <div className="px-4 sm:px-6 pt-6 pb-10 space-y-6 max-w-4xl">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <Network className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">IPTRC Ops Copilot</h1>
          <Badge variant="outline">AT&T Internal</Badge>
        </div>
        <p className="text-muted-foreground">
          Turn CLI outputs, emails, and ticket text into copy/paste-ready operational artifacts.
          All outputs are drafts — review before use.
        </p>
      </div>

      <Tabs defaultValue="ticket-notes">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="ticket-notes" className="gap-1.5">
            <FileText className="w-4 h-4" />
            Ticket Notes
          </TabsTrigger>
          <TabsTrigger value="smop" className="gap-1.5">
            <Wrench className="w-4 h-4" />
            SMOP / GMOP
          </TabsTrigger>
          <TabsTrigger value="rma" className="gap-1.5">
            <MailOpen className="w-4 h-4" />
            RMA Email
          </TabsTrigger>
          <TabsTrigger value="maint" className="gap-1.5">
            <Calendar className="w-4 h-4" />
            Maintenance Summary
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <TabsContent value="ticket-notes" className="mt-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Ticket Work Notes Generator</CardTitle>
              <CardDescription>Paste CLI output and symptoms → get structured, audit-safe work notes.</CardDescription>
            </CardHeader>
            <CardContent><TicketNotesTab /></CardContent>
          </TabsContent>

          <TabsContent value="smop" className="mt-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">SMOP / GMOP Scaffold</CardTitle>
              <CardDescription>Enter device and window details → get a DRAFT MOP skeleton with pre/post checks and rollback placeholders.</CardDescription>
            </CardHeader>
            <CardContent><SmopDraftTab /></CardContent>
          </TabsContent>

          <TabsContent value="rma" className="mt-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">RMA Email Composer</CardTitle>
              <CardDescription>Fill in RMA fields → get a text-only, KGPCo-compliant email body ready to send.</CardDescription>
            </CardHeader>
            <CardContent><RmaEmailTab /></CardContent>
          </TabsContent>

          <TabsContent value="maint" className="mt-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Maintenance Email Summarizer</CardTitle>
              <CardDescription>Paste a carrier maintenance notification → get window/timezone/circuits extracted and an IPTRC actions checklist.</CardDescription>
            </CardHeader>
            <CardContent><MaintEmailTab /></CardContent>
          </TabsContent>
        </Card>
      </Tabs>

      <p className="text-xs text-muted-foreground border-t pt-3">
        All outputs are AI-generated drafts. Never paste credentials or enable passwords into any field.
        Verify all operational steps before execution. SMOP outputs are not official MOPs.
      </p>
    </div>
  );
}
