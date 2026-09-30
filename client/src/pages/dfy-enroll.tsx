// ============================================================================
// TEMPORARY PAGE — DFY manual sequence enrollment (SAFE TO DELETE AFTER USE)
// Created 2026-09-30. One-off tool: enrolls 10 DFY prospect leads into the
// production "DFY Outbound - Agency Clients" sequence. There is no UI for
// sequence enrollment, so this page exists only to run the enrollment manually.
// Route: /dfy-enroll
// ============================================================================

import { useState } from "react";

// Production sequence "DFY Outbound - Agency Clients" (verified 2026-09-30,
// 0 enrolled at time of page creation).
const SEQUENCE_ID = "cb99b3fc-9d0d-49c4-a997-59e9f391a22a";
const SEQUENCE_NAME = "DFY Outbound - Agency Clients";

interface DfyLead {
  id: string;
  name: string;
  email: string;
}

// Production DFY prospect leads — IDs re-verified against production on
// 2026-09-30 (Source "Instagram", Status "New"). Do not replace with older IDs.
const DFY_LEADS: DfyLead[] = [
  { id: "76ce50ef-6aba-41ba-b142-a60a44d57445", name: "Richard Taveira", email: "info@northtexas-webdesign.com" },
  { id: "31735fca-538d-4df0-9d7b-8abb7eb84df5", name: "Rolando Rojas", email: "hello@ellipticmarketing.com" },
  { id: "6f971549-0806-4f41-81a9-7319bb1d153a", name: "Kalle Santalahti", email: "hello@kublamarketing.com" },
  { id: "6cea275e-0d61-4bb5-b645-10cdc8698291", name: "Chris Fasick", email: "chris@crave.digital" },
  { id: "80b52876-deff-41d2-a0dd-c537270c66e9", name: "Sean Parnell", email: "info@innovaxisinc.com" },
  { id: "8408db40-ea98-4cf0-92d8-012fd9c3e854", name: "Julie Fisher", email: "juliefisher@fisher-marketing.com" },
  { id: "b96b57eb-1ac8-4456-9793-3b2ed8ec4458", name: "Wayne Herring", email: "wayne.herring@businessbuildercamp.com" },
  { id: "8ccc314e-e05d-4de2-87fc-453bf9365454", name: "Ryan Jackson", email: "info@icreateatl.com" },
  { id: "7fa686e5-b5f3-438f-9a60-c0ec5bd75971", name: "Neil Colvin", email: "neil@columbusmarketingexperts.com" },
  { id: "7843b61e-ffc8-4745-a7bb-d4dd48028bdc", name: "Amanda Dyer", email: "info@landslidecreative.com" },
];

type EnrollStatus = "idle" | "pending" | "enrolled" | "already-enrolled" | "failed";

const STATUS_LABEL: Record<EnrollStatus, string> = {
  idle: "Not started",
  pending: "Enrolling...",
  enrolled: "Enrolled",
  "already-enrolled": "Already enrolled",
  failed: "Failed",
};

const STATUS_COLOR: Record<EnrollStatus, string> = {
  idle: "#6b7280",
  pending: "#d97706",
  enrolled: "#059669",
  "already-enrolled": "#2563eb",
  failed: "#dc2626",
};

export default function DfyEnrollPage() {
  const [statuses, setStatuses] = useState<Record<string, EnrollStatus>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);

  const enrollAll = async () => {
    if (running) return;
    setRunning(true);
    const nextStatuses: Record<string, EnrollStatus> = {};
    DFY_LEADS.forEach((lead) => {
      nextStatuses[lead.id] = "pending";
    });
    setStatuses(nextStatuses);
    setMessages({});

    const nextMessages: Record<string, string> = {};
    for (const lead of DFY_LEADS) {
      try {
        const res = await fetch("/api/sequence-automation/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: lead.id, sequenceId: SEQUENCE_ID }),
        });
        const data: any = await res.json().catch(() => ({}));
        if (res.ok && data && data.success === true) {
          nextStatuses[lead.id] = "enrolled";
          nextMessages[lead.id] = data.message || "Lead enrolled in sequence";
        } else if (res.ok) {
          nextStatuses[lead.id] = "already-enrolled";
          nextMessages[lead.id] = data.message || "Already enrolled or no active sequence";
        } else {
          nextStatuses[lead.id] = "failed";
          nextMessages[lead.id] = data.message || "Request failed (HTTP " + res.status + ")";
        }
      } catch {
        nextStatuses[lead.id] = "failed";
        nextMessages[lead.id] = "Network error";
      }
      setStatuses({ ...nextStatuses });
      setMessages({ ...nextMessages });
    }
    setRunning(false);
  };

  return (
    <div style={{ maxWidth: 820, margin: "40px auto", padding: "0 20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: "12px 16px", marginBottom: 24 }}>
        <strong>TEMPORARY PAGE</strong> — one-off manual enrollment tool. Safe to delete after the enrollment is done.
      </div>
      <h1>DFY Manual Enrollment</h1>
      <p>
        Sequence: <strong>{SEQUENCE_NAME}</strong>
        <br />
        Sequence ID: <code>{SEQUENCE_ID}</code>
      </p>
      <button
        onClick={enrollAll}
        disabled={running}
        style={{
          background: running ? "#9ca3af" : "#4f46e5",
          color: "#ffffff",
          border: "none",
          borderRadius: 8,
          padding: "12px 24px",
          fontSize: 16,
          cursor: running ? "not-allowed" : "pointer",
          marginBottom: 24,
        }}
      >
        {running ? "Enrolling..." : "Enroll all 10 in DFY sequence"}
      </button>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
            <th style={{ padding: 8 }}>Name</th>
            <th style={{ padding: 8 }}>Email</th>
            <th style={{ padding: 8 }}>Result</th>
          </tr>
        </thead>
        <tbody>
          {DFY_LEADS.map((lead) => {
            const status: EnrollStatus = statuses[lead.id] || "idle";
            return (
              <tr key={lead.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: 8 }}>{lead.name}</td>
                <td style={{ padding: 8 }}>{lead.email}</td>
                <td style={{ padding: 8 }}>
                  <span style={{ color: STATUS_COLOR[status], fontWeight: 600 }}>{STATUS_LABEL[status]}</span>
                  {messages[lead.id] ? (
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{messages[lead.id]}</div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
