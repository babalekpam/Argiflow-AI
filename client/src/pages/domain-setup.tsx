import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Globe, Plus, Trash2, RefreshCw, Copy, Check, Shield, Mail, AlertTriangle, CheckCircle2, Clock, Info, Pencil } from "lucide-react";

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  description: string;
}

interface Domain {
  id: string;
  domain: string;
  status: string;
  sesVerified: boolean;
  dkimVerified: boolean;
  defaultFromEmail: string;
  defaultFromName: string;
  sesDkimTokens: string;
  createdAt: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 px-2 text-xs"
      data-testid={`copy-btn-${text.slice(0, 10)}`}
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function StatusBadge({ verified, label }: { verified: boolean; label: string }) {
  return (
    <Badge
      variant={verified ? "default" : "secondary"}
      className={verified ? "bg-green-600/20 text-green-400 border-green-600/30" : "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"}
      data-testid={`status-${label.toLowerCase()}`}
    >
      {verified ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}

export default function DomainSetup() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<Record<string, DnsRecord> | null>(null);
  const [form, setForm] = useState({ domain: "", fromName: "", fromEmail: "" });
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fromName: "", fromEmail: "" });

  const { data, isLoading } = useQuery<{ domains: Domain[] }>({
    queryKey: ["/api/domains"],
  });
  const domains = data?.domains || [];

  const addMutation = useMutation({
    mutationFn: async (body: typeof form) => {
      const res = await apiRequest("POST", "/api/domains/add", body);
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        setDnsRecords(data.dnsRecords);
        setShowAddForm(false);
        setForm({ domain: "", fromName: "", fromEmail: "" });
        queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
        toast({ title: "Domain added", description: "Add the DNS records shown below to your domain registrar." });
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    },
    onError: () => toast({ title: "Error", description: "Failed to add domain", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/domains/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      setDnsRecords(null);
      toast({ title: "Domain removed" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, fromName, fromEmail }: { id: string; fromName: string; fromEmail: string }) => {
      const res = await apiRequest("PATCH", `/api/domains/${id}`, { fromName, fromEmail });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      setEditingId(null);
      toast({ title: "Sender info updated" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  async function handleVerify(domainId: string) {
    setVerifyingId(domainId);
    try {
      const res = await apiRequest("POST", `/api/domains/${domainId}/verify`);
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      if (result.allVerified) {
        toast({ title: "Domain verified!", description: "Your domain is now active for sending." });
      } else {
        toast({ title: "Verification incomplete", description: "Some DNS records are not yet detected. DNS changes can take up to 24 hours." });
      }
    } catch {
      toast({ title: "Error", description: "Verification failed", variant: "destructive" });
    }
    setVerifyingId(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-domain-title">
            <Globe className="h-6 w-6 text-sky-400" />
            Sending Domain
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect your domain so emails come from <strong className="text-foreground">you@yourdomain.com</strong> — not ArgiFlow.
          </p>
        </div>
        {domains.length === 0 && !showAddForm && (
          <Button onClick={() => setShowAddForm(true)} data-testid="button-connect-domain">
            <Plus className="h-4 w-4 mr-2" /> Connect Domain
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connect Your Domain</CardTitle>
            <CardDescription>Enter your domain name and default sender information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Domain Name *</Label>
              <Input
                placeholder="yourdomain.com"
                value={form.domain}
                onChange={e => setForm(p => ({ ...p, domain: e.target.value }))}
                data-testid="input-domain"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Name</Label>
                <Input
                  placeholder="John Smith"
                  value={form.fromName}
                  onChange={e => setForm(p => ({ ...p, fromName: e.target.value }))}
                  data-testid="input-from-name"
                />
              </div>
              <div>
                <Label>From Email</Label>
                <Input
                  placeholder="hello@yourdomain.com"
                  value={form.fromEmail}
                  onChange={e => setForm(p => ({ ...p, fromEmail: e.target.value }))}
                  data-testid="input-from-email"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => addMutation.mutate(form)}
                disabled={addMutation.isPending || !form.domain}
                data-testid="button-add-domain"
              >
                {addMutation.isPending ? "Adding..." : "Add Domain"}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)} data-testid="button-cancel-add">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {dnsRecords && (
        <Card className="border-sky-500/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-sky-400">
              <Shield className="h-5 w-5" />
              Add These DNS Records
            </CardTitle>
            <CardDescription>
              Log into your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add these records.
              Then click <strong>Verify DNS</strong> on your domain below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.values(dnsRecords).map((record, i) => (
              <div key={i} className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">{record.type}</Badge>
                  <span className="text-sm text-muted-foreground">{record.description}</span>
                </div>
                <div className="flex items-center gap-2 bg-background rounded-md p-3 border">
                  <span className="text-xs font-semibold text-muted-foreground w-12">Name:</span>
                  <code className="text-sm flex-1 break-all">{record.name}</code>
                  <CopyButton text={record.name} />
                </div>
                <div className="flex items-start gap-2 bg-background rounded-md p-3 border">
                  <span className="text-xs font-semibold text-muted-foreground w-12 mt-0.5">Value:</span>
                  <code className="text-xs flex-1 break-all leading-relaxed">{record.value}</code>
                  <CopyButton text={record.value} />
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              className="border-green-600/30 text-green-400 hover:bg-green-600/10"
              onClick={() => setDnsRecords(null)}
              data-testid="button-dismiss-dns"
            >
              <Check className="h-4 w-4 mr-2" /> I've added these records
            </Button>
          </CardContent>
        </Card>
      )}

      {domains.length === 0 && !showAddForm ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No domain connected yet</h3>
              <p className="text-muted-foreground">Connect your domain to send emails from your own address.</p>
            </div>
            <Button onClick={() => setShowAddForm(true)} data-testid="button-connect-domain-empty">
              <Plus className="h-4 w-4 mr-2" /> Connect Domain
            </Button>
          </CardContent>
        </Card>
      ) : (
        domains.map(domain => (
          <Card key={domain.id} data-testid={`card-domain-${domain.id}`}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{domain.domain}</h3>
                    <Badge
                      className={
                        domain.status === "active"
                          ? "bg-green-600/20 text-green-400 border-green-600/30"
                          : domain.status === "pending"
                          ? "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
                          : "bg-red-600/20 text-red-400 border-red-600/30"
                      }
                      data-testid={`status-domain-${domain.id}`}
                    >
                      {domain.status === "active" ? "Active" : domain.status === "pending" ? "Pending DNS" : domain.status}
                    </Badge>
                  </div>
                  {editingId === domain.id ? (
                    <div className="mt-2 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Sender Name</Label>
                          <Input
                            value={editForm.fromName}
                            onChange={e => setEditForm(p => ({ ...p, fromName: e.target.value }))}
                            placeholder="Your Company Name"
                            data-testid="input-edit-from-name"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Sender Email</Label>
                          <Input
                            value={editForm.fromEmail}
                            onChange={e => setEditForm(p => ({ ...p, fromEmail: e.target.value }))}
                            placeholder={`hello@${domain.domain}`}
                            data-testid="input-edit-from-email"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateMutation.mutate({ id: domain.id, fromName: editForm.fromName, fromEmail: editForm.fromEmail })}
                          disabled={updateMutation.isPending}
                          data-testid="button-save-sender"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {updateMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)} data-testid="button-cancel-edit">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      <Mail className="h-3 w-3 inline mr-1" />
                      Sending as: <strong className="text-foreground">{domain.defaultFromEmail}</strong>
                      {domain.defaultFromName && ` (${domain.defaultFromName})`}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 px-2 text-xs text-sky-400 hover:text-sky-300"
                        onClick={() => {
                          setEditingId(domain.id);
                          setEditForm({ fromName: domain.defaultFromName || "", fromEmail: domain.defaultFromEmail || "" });
                        }}
                        data-testid={`button-edit-sender-${domain.id}`}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {domain.status !== "active" && (
                    <Button
                      size="sm"
                      onClick={() => handleVerify(domain.id)}
                      disabled={verifyingId === domain.id}
                      data-testid={`button-verify-${domain.id}`}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${verifyingId === domain.id ? "animate-spin" : ""}`} />
                      {verifyingId === domain.id ? "Checking..." : "Verify DNS"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Remove this domain?")) deleteMutation.mutate(domain.id);
                    }}
                    data-testid={`button-delete-${domain.id}`}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Remove
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <StatusBadge verified={domain.sesVerified} label="SES Verified" />
                <StatusBadge verified={domain.dkimVerified} label="DKIM" />
              </div>

              {domain.status !== "active" && (
                <div className="bg-yellow-600/10 border border-yellow-600/20 rounded-lg p-4 text-sm space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                    <span>
                      <strong>Domain not yet verified.</strong> Add the CNAME records below at your domain registrar, then click Verify. DNS changes can take 5-15 minutes.
                    </span>
                  </div>
                  {domain.sesDkimTokens && (() => {
                    try {
                      const tokens: string[] = JSON.parse(domain.sesDkimTokens);
                      return (
                        <div className="space-y-2 text-xs font-mono bg-background/50 rounded-md p-3">
                          <p className="text-sm font-sans font-medium text-foreground mb-2">Add these 3 CNAME records:</p>
                          {tokens.map((token, i) => (
                            <div key={i} className="space-y-1 pb-2 border-b border-border/50 last:border-0">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground shrink-0">Name:</span>
                                <code className="break-all">{token}._domainkey.{domain.domain}</code>
                                <CopyButton text={`${token}._domainkey.${domain.domain}`} />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground shrink-0">Value:</span>
                                <code className="break-all">{token}.dkim.amazonses.com</code>
                                <CopyButton text={`${token}.dkim.amazonses.com`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    } catch { return null; }
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <Card className="border-green-600/20 bg-green-600/5">
        <CardContent className="pt-6">
          <h4 className="font-semibold flex items-center gap-2 text-green-400 mb-3">
            <Info className="h-4 w-4" />
            How Domain Verification Works
          </h4>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-5">
            <li>Click <strong className="text-foreground">Connect Domain</strong> and enter your domain name</li>
            <li>We automatically register your domain with Amazon SES and generate 3 CNAME records</li>
            <li>Add the CNAME records at your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</li>
            <li>Click <strong className="text-foreground">Verify</strong> — once verified, all your emails send from your own domain</li>
          </ol>
          <p className="text-sm text-muted-foreground mt-3">
            Verification typically takes 5-15 minutes after adding DNS records. Your domain builds its own sending reputation over time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
