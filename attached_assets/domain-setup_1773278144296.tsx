// ============================================================
// DOMAIN SETUP UI — ArgiFlow White-Label Sending
// Add to: client/src/pages/domain-setup.tsx
// Route: /dashboard/domain
// ============================================================

import { useState, useEffect } from "react";

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
  spfVerified: boolean;
  dkimVerified: boolean;
  returnPathVerified: boolean;
  defaultFromEmail: string;
  defaultFromName: string;
  dkimSelector: string;
  spfRecord: string;
  dkimPublicKey: string;
  returnPathHost: string;
  createdAt: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ background: copied ? "#16a34a" : "#6366f1", color: "white", border: "none", borderRadius: "6px", padding: "4px 12px", fontSize: "12px", cursor: "pointer", minWidth: "60px" }}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function StatusBadge({ verified, label }: { verified: boolean; label: string }) {
  return (
    <span style={{
      background: verified ? "#dcfce7" : "#fef3c7",
      color: verified ? "#16a34a" : "#d97706",
      padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600
    }}>
      {verified ? "✓" : "⏳"} {label}
    </span>
  );
}

export default function DomainSetup() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<Record<string, DnsRecord> | null>(null);
  const [form, setForm] = useState({ domain: "", fromName: "", fromEmail: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadDomains(); }, []);

  async function loadDomains() {
    const res = await fetch("/api/domains");
    const data = await res.json();
    setDomains(data.domains || []);
    setLoading(false);
  }

  async function handleAddDomain() {
    if (!form.domain) return;
    setAdding(true);
    setError(null);

    const res = await fetch("/api/domains/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (data.success) {
      setDnsRecords(data.dnsRecords);
      setShowAddForm(false);
      await loadDomains();
    } else {
      setError(data.error || "Failed to add domain");
    }
    setAdding(false);
  }

  async function handleVerify(domainId: string) {
    setVerifying(domainId);
    const res = await fetch(`/api/domains/${domainId}/verify`, { method: "POST" });
    await res.json();
    await loadDomains();
    setVerifying(null);
  }

  async function handleDelete(domainId: string) {
    if (!confirm("Remove this domain?")) return;
    await fetch(`/api/domains/${domainId}`, { method: "DELETE" });
    await loadDomains();
    setDnsRecords(null);
  }

  const s = { fontFamily: "Inter, Arial, sans-serif", maxWidth: "860px", margin: "0 auto", padding: "24px", color: "#1a1a2e" };
  const card = { background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: "20px" };
  const input = { padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px", width: "100%", outline: "none", boxSizing: "border-box" as const };
  const btn = (color = "#6366f1") => ({ background: color, color: "white", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: 600, cursor: "pointer" });

  if (loading) return <div style={{ ...s, textAlign: "center", paddingTop: "60px" }}>Loading...</div>;

  return (
    <div style={s}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0 }}>🌐 Sending Domain</h1>
          <p style={{ color: "#666", marginTop: "6px" }}>Connect your domain so emails come from <strong>you@yourdomain.com</strong> — not ArgiFlow.</p>
        </div>
        {domains.length === 0 && (
          <button style={btn()} onClick={() => setShowAddForm(true)}>+ Connect Domain</button>
        )}
      </div>

      {/* Add Domain Form */}
      {showAddForm && (
        <div style={card}>
          <h3 style={{ margin: "0 0 16px", fontSize: "16px" }}>Connect Your Domain</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#444", display: "block", marginBottom: "6px" }}>Domain Name *</label>
              <input style={input} placeholder="yourdomain.com" value={form.domain}
                onChange={e => setForm(p => ({ ...p, domain: e.target.value }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#444", display: "block", marginBottom: "6px" }}>From Name</label>
                <input style={input} placeholder="John Smith" value={form.fromName}
                  onChange={e => setForm(p => ({ ...p, fromName: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#444", display: "block", marginBottom: "6px" }}>From Email</label>
                <input style={input} placeholder="hello@yourdomain.com" value={form.fromEmail}
                  onChange={e => setForm(p => ({ ...p, fromEmail: e.target.value }))} />
              </div>
            </div>
            {error && <div style={{ color: "#ef4444", fontSize: "14px" }}>{error}</div>}
            <div style={{ display: "flex", gap: "10px" }}>
              <button style={btn()} onClick={handleAddDomain} disabled={adding}>
                {adding ? "Adding..." : "Add Domain"}
              </button>
              <button style={{ ...btn("#9ca3af") }} onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* DNS Records (shown after adding) */}
      {dnsRecords && (
        <div style={{ ...card, border: "2px solid #6366f1" }}>
          <h3 style={{ margin: "0 0 8px", color: "#6366f1" }}>📋 Add These DNS Records</h3>
          <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>
            Log into your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add these records.
            Then click <strong>Verify DNS</strong> on your domain below.
          </p>
          {Object.values(dnsRecords).map((record, i) => (
            <div key={i} style={{ background: "#f8fafc", borderRadius: "8px", padding: "14px", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ background: "#e0e7ff", color: "#4f46e5", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700 }}>{record.type}</span>
                  <span style={{ fontSize: "13px", color: "#666" }}>{record.description}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "8px", alignItems: "center", background: "white", borderRadius: "6px", padding: "10px 12px", border: "1px solid #e5e7eb" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#444", minWidth: "50px" }}>Name:</span>
                <code style={{ fontSize: "13px", wordBreak: "break-all" }}>{record.name}</code>
                <CopyButton text={record.name} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "8px", alignItems: "start", background: "white", borderRadius: "6px", padding: "10px 12px", border: "1px solid #e5e7eb", marginTop: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#444", minWidth: "50px" }}>Value:</span>
                <code style={{ fontSize: "12px", wordBreak: "break-all", lineHeight: "1.5" }}>{record.value}</code>
                <CopyButton text={record.value} />
              </div>
            </div>
          ))}
          <button style={{ ...btn("#16a34a"), marginTop: "8px" }} onClick={() => setDnsRecords(null)}>
            ✓ I've added these records
          </button>
        </div>
      )}

      {/* Domain List */}
      {domains.length === 0 && !showAddForm ? (
        <div style={{ ...card, textAlign: "center", padding: "48px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🌐</div>
          <h3 style={{ margin: "0 0 8px" }}>No domain connected yet</h3>
          <p style={{ color: "#666", marginBottom: "20px" }}>Connect your domain to send emails from your own address.</p>
          <button style={btn()} onClick={() => setShowAddForm(true)}>+ Connect Domain</button>
        </div>
      ) : (
        domains.map(domain => (
          <div key={domain.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px" }}>{domain.domain}</h3>
                  <span style={{
                    background: domain.status === "active" ? "#dcfce7" : domain.status === "pending" ? "#fef3c7" : "#fee2e2",
                    color: domain.status === "active" ? "#16a34a" : domain.status === "pending" ? "#d97706" : "#ef4444",
                    padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, textTransform: "capitalize"
                  }}>
                    {domain.status === "active" ? "✓ Active" : domain.status === "pending" ? "⏳ Pending DNS" : domain.status}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", color: "#666", fontSize: "14px" }}>
                  Sending as: <strong>{domain.defaultFromEmail}</strong>
                  {domain.defaultFromName && ` (${domain.defaultFromName})`}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {domain.status !== "active" && (
                  <button
                    style={btn("#6366f1")}
                    onClick={() => handleVerify(domain.id)}
                    disabled={verifying === domain.id}
                  >
                    {verifying === domain.id ? "Checking..." : "Verify DNS"}
                  </button>
                )}
                <button style={btn("#ef4444")} onClick={() => handleDelete(domain.id)}>Remove</button>
              </div>
            </div>

            {/* DNS Status */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <StatusBadge verified={domain.spfVerified} label="SPF" />
              <StatusBadge verified={domain.dkimVerified} label="DKIM" />
              <StatusBadge verified={domain.returnPathVerified} label="Return Path" />
            </div>

            {/* DNS Records reminder if not active */}
            {domain.status !== "active" && (
              <div style={{ background: "#fffbeb", borderRadius: "8px", padding: "14px", marginTop: "16px", fontSize: "13px" }}>
                <strong>⚠ DNS records not yet verified.</strong> Make sure you've added all 3 records to your DNS provider, then click <strong>Verify DNS</strong>. DNS changes can take up to 24 hours to propagate.
                <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div><strong>SPF TXT (@):</strong> <code style={{ fontSize: "12px" }}>{domain.spfRecord}</code> <CopyButton text={domain.spfRecord || ""} /></div>
                  <div><strong>DKIM TXT ({domain.dkimSelector}._domainkey):</strong> <CopyButton text={domain.dkimPublicKey || ""} /> <span style={{ color: "#666" }}>(long key — use copy button)</span></div>
                  <div><strong>Return Path CNAME (psrp):</strong> <code style={{ fontSize: "12px" }}>{domain.returnPathHost}</code> <CopyButton text={domain.returnPathHost || ""} /></div>
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Info Box */}
      <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "20px", border: "1px solid #bbf7d0" }}>
        <h4 style={{ margin: "0 0 8px", color: "#16a34a" }}>✓ How White-Label Sending Works</h4>
        <ul style={{ margin: 0, paddingLeft: "20px", color: "#444", fontSize: "14px", lineHeight: "1.8" }}>
          <li>Your emails come from <strong>you@yourdomain.com</strong> — not from ArgiFlow</li>
          <li>Recipients never see any mention of ArgiFlow in the email</li>
          <li>Your domain builds its own sending reputation over time</li>
          <li>Full DKIM signatures improve deliverability and inbox placement</li>
        </ul>
      </div>
    </div>
  );
}
