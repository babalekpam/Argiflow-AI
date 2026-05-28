import { Router, type RequestHandler } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicForUser } from "./routes";

const router = Router();

// Patterns that must never appear in logs or prompts
const SECRET_PATTERNS = [
  /password\s*[:=]\s*\S+/gi,
  /enable\s+secret\s+\S+/gi,
  /enable\s+password\s+\S+/gi,
  /tacacs[+-]?\s*key\s+\S+/gi,
  /radius\s*key\s+\S+/gi,
  /snmp(-v3)?\s+(auth|priv)\s+\S+/gi,
  /secret\s+\d+\s+\S+/gi,
  /api[_-]?key\s*[:=]\s*\S+/gi,
  /token\s*[:=]\s*\S+/gi,
  /bearer\s+\S+/gi,
  /vpn[_-]?(key|secret|pass)\s*[:=]\s*\S+/gi,
  /ssh\s+(key|rsa|dsa|ecdsa)\s+\S+/gi,
  /crypto\s+isakmp\s+key\s+\S+/gi,
  /pre-share\s+key\s+\S+/gi,
];

function sanitizeInput(text: string): string {
  let out = text;
  for (const pat of SECRET_PATTERNS) {
    out = out.replace(pat, "[REDACTED]");
  }
  return out;
}

function validateHeadings(output: string, required: string[]): boolean {
  return required.every((h) => output.includes(h));
}

function containsProhibited(output: string): boolean {
  const phrases = [
    /\b(official|approved)\s+mop\b/i,
    /\bthis\s+is\s+(the\s+)?(official|approved|final)\b/i,
  ];
  return phrases.some((p) => p.test(output));
}

// ─── SKILL: Ticket Notes ────────────────────────────────────────────────────
router.post("/ticket-notes", async (req, res) => {
  try {
    const { ticketId, platform, symptoms, cliDump, actionsTaken, severity } = req.body as {
      ticketId?: string;
      platform: string;
      symptoms: string;
      cliDump?: string;
      actionsTaken?: string;
      severity?: string;
    };

    if (!platform || !symptoms) {
      return res.status(400).json({ error: "platform and symptoms are required" });
    }

    const userId = (req as any).session?.userId;
    const { client, model } = await getAnthropicForUser(userId);

    const cleanCli = sanitizeInput(cliDump || "");
    const cleanActions = sanitizeInput(actionsTaken || "");
    const cleanSymptoms = sanitizeInput(symptoms);

    const systemPrompt = `You are an IPTRC network operations assistant at AT&T. \
Produce concise, audit-safe work notes for a trouble ticket.

STRICT RULES:
1. Never invent commands or outputs not present in the user input.
2. "Actions completed" MUST only contain actions explicitly listed in actions_taken — never infer or add.
3. "Next steps" MUST be phrased as suggestions (prefix with "Suggested:"), never as completed facts.
4. "Observations" must cite the pasted CLI output or notes — no fabrication.
5. Keep the output to plain text, no markdown tables or HTML.
6. If a field has no data, write "N/A" — never fabricate.

OUTPUT FORMAT (use these exact headings):
WORK NOTES:
- Summary:
- Observations (from outputs):
- Actions completed:
- Current status:
- Next steps (Suggested):
- Risks/Watch-outs:
- Evidence captured (commands/logs referenced):`;

    const userPrompt = `Platform: ${platform}
Ticket ID: ${ticketId || "N/A"}
Severity/Impact: ${severity || "N/A"}

SYMPTOMS / TICKET DESCRIPTION:
${cleanSymptoms}

CLI OUTPUT / LOGS:
${cleanCli || "None provided"}

ACTIONS ALREADY TAKEN:
${cleanActions || "None provided"}

Generate the work notes now.`;

    const message = await client.messages.create({
      model,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    let output = (message.content[0] as { type: string; text: string }).text;

    // Validate required headings; repair if violated
    const required = ["WORK NOTES:", "Summary:", "Actions completed:", "Next steps (Suggested):", "Current status:"];
    if (!validateHeadings(output, required)) {
      const repairMsg = await client.messages.create({
        model,
        max_tokens: 1400,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
          { role: "assistant", content: output },
          {
            role: "user",
            content:
              "Your response is missing required headings. Rewrite it strictly following the output format with all required headings present. Keep all facts the same.",
          },
        ],
      });
      output = (repairMsg.content[0] as { type: string; text: string }).text;
    }

    res.json({ output, skill: "ticket_notes", ticketId: ticketId || null });
  } catch (err: any) {
    if (err.message === "AI_SUBSCRIPTION_REQUIRED") {
      return res.status(402).json({ error: "AI subscription required" });
    }
    console.error("[iptrc/ticket-notes]", err.message);
    res.status(500).json({ error: "Failed to generate ticket notes" });
  }
});

// ─── SKILL: SMOP/GMOP Draft ─────────────────────────────────────────────────
router.post("/smop-draft", async (req, res) => {
  try {
    const { hostname, platform, osVersion, workType, windowStart, windowEnd, timezone, riskNotes } = req.body as {
      hostname: string;
      platform: string;
      osVersion?: string;
      workType: string;
      windowStart: string;
      windowEnd: string;
      timezone: string;
      riskNotes?: string;
    };

    if (!hostname || !platform || !workType || !windowStart || !windowEnd || !timezone) {
      return res.status(400).json({ error: "hostname, platform, workType, windowStart, windowEnd, and timezone are required" });
    }

    const userId = (req as any).session?.userId;
    const { client, model } = await getAnthropicForUser(userId);

    const systemPrompt = `You are an IPTRC network operations assistant at AT&T. \
Draft a SMOP/GMOP scaffold for engineer review.

STRICT RULES:
1. ALWAYS label this output as "DRAFT — NOT OFFICIAL MOP — REQUIRES REVIEW AND APPROVAL".
2. Include placeholder blocks like [APPROVER SIGNATURE] and [ROLLBACK: describe steps here].
3. Provide platform-specific command bundles under PRE-CHECKS and POST-CHECKS.
4. Never claim this is an official or approved procedure.
5. Include a ROLLBACK PLAN section with explicit placeholders.
6. Plain text only — no HTML, no markdown tables.

OUTPUT FORMAT (use these exact headings):
SMOP/GMOP SCAFFOLD — DRAFT
TITLE:
SCOPE:
PREREQS:
RISK/IMPACT:
MAINTENANCE WINDOW:
PRE-CHECKS:
BACKUP / SNAPSHOT:
EXECUTION STEPS (DRAFT):
VALIDATION / POST-CHECKS:
ROLLBACK PLAN:
COMMUNICATIONS:
APPROVALS REQUIRED:
ATTACHMENTS / EVIDENCE:`;

    const userPrompt = `Device hostname: ${sanitizeInput(hostname)}
Platform: ${platform}
OS Version: ${osVersion || "N/A"}
Work type: ${workType}
Window start: ${windowStart}
Window end: ${windowEnd}
Timezone: ${timezone}
Risk notes: ${riskNotes ? sanitizeInput(riskNotes) : "None provided"}

Generate the SMOP/GMOP scaffold now.`;

    const message = await client.messages.create({
      model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    let output = (message.content[0] as { type: string; text: string }).text;

    if (containsProhibited(output)) {
      const repairMsg = await client.messages.create({
        model,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
          { role: "assistant", content: output },
          {
            role: "user",
            content:
              'Remove any language implying this is an official or approved MOP. The top must say "DRAFT — NOT OFFICIAL MOP — REQUIRES REVIEW AND APPROVAL". Rewrite now.',
          },
        ],
      });
      output = (repairMsg.content[0] as { type: string; text: string }).text;
    }

    if (!output.includes("DRAFT")) {
      output = "DRAFT — NOT OFFICIAL MOP — REQUIRES REVIEW AND APPROVAL\n\n" + output;
    }

    res.json({ output, skill: "smop_draft" });
  } catch (err: any) {
    if (err.message === "AI_SUBSCRIPTION_REQUIRED") {
      return res.status(402).json({ error: "AI subscription required" });
    }
    console.error("[iptrc/smop-draft]", err.message);
    res.status(500).json({ error: "Failed to generate SMOP draft" });
  }
});

// ─── SKILL: RMA Email ────────────────────────────────────────────────────────
router.post("/rma-email", async (req, res) => {
  try {
    const {
      problemDescription,
      additionalInfo,
      defectivePartFailure,
      defectivePidSn,
      hostname,
      ficNumber,
      clli,
      oswfTicket,
      shippingAddress,
      onsiteContact,
      vendorCase,
      nocTicket,
      sameOrNextDay,
      efaRequired,
      aotsTicket,
      platform,
      showChassisFirmware,
      showChassisHardware,
      showVersion,
      showLicense,
      showLicenseKeys,
    } = req.body as {
      problemDescription: string;
      additionalInfo?: string;
      defectivePartFailure: string;
      defectivePidSn: string;
      hostname: string;
      ficNumber?: string;
      clli: string;
      oswfTicket: string;
      shippingAddress: string;
      onsiteContact: string;
      vendorCase?: string;
      nocTicket?: string;
      sameOrNextDay: string;
      efaRequired: string;
      aotsTicket: string;
      platform: string;
      showChassisFirmware?: string;
      showChassisHardware?: string;
      showVersion?: string;
      showLicense?: string;
      showLicenseKeys?: string;
    };

    if (!problemDescription || !defectivePartFailure || !defectivePidSn || !hostname || !clli || !oswfTicket || !shippingAddress || !onsiteContact || !sameOrNextDay || !efaRequired || !aotsTicket || !platform) {
      return res.status(400).json({ error: "Missing required RMA fields" });
    }

    const userId = (req as any).session?.userId;
    const { client, model } = await getAnthropicForUser(userId);

    const systemPrompt = `You are an IPTRC network operations assistant at AT&T. \
Generate a KGPCo-compliant RMA email.

STRICT RULES:
1. Output must be TEXT ONLY — absolutely no HTML, no tables, no markdown.
2. Follow the required field order exactly as specified.
3. Problem Description and Additional Info come FIRST.
4. Leave unknown/empty fields as "TBD" — never fabricate.
5. The subject line format: RMA: <PLATFORM> AT&T Ticket [AOTS<ticket_number>]
6. Output only the SUBJECT line and BODY — nothing else before or after.`;

    const f = (v: string | undefined) => sanitizeInput(v || "TBD");

    const userPrompt = `Generate the RMA email with these field values:

AOTS Ticket: ${f(aotsTicket)}
Platform: ${f(platform)}

Problem Description: ${f(problemDescription)}
Additional Information (corrective action, snapshots etc.): ${f(additionalInfo)}
Defective part failure/requested part: ${f(defectivePartFailure)}
Defective part serial number (PID/SN): ${f(defectivePidSn)}
Defective device hostname: ${f(hostname)}
Defective device FIC number: ${f(ficNumber)}
Onsite site CLLI: ${f(clli)}
Onsite workforce ticket (OSWF/WMS): ${f(oswfTicket)}
Defective device shipping address: ${f(shippingAddress)}
Onsite Contact information (name, number and email address): ${f(onsiteContact)}
Vendor Case (Juniper/Cisco if applicable): ${f(vendorCase)}
AT&T NOC ticket: ${f(nocTicket)}
Same day or Next Day: ${f(sameOrNextDay)}
Engineering Failure analysis? (y/n): ${f(efaRequired)}
Show chassis firmware: ${f(showChassisFirmware)}
Show chassis hardware: ${f(showChassisHardware)}
Show version: ${f(showVersion)}
Show system license: ${f(showLicense)}
Show system license keys: ${f(showLicenseKeys)}`;

    const message = await client.messages.create({
      model,
      max_tokens: 1600,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    let output = (message.content[0] as { type: string; text: string }).text;

    // Hard-fail if any HTML slipped in
    if (/<[a-z][\s\S]*>/i.test(output)) {
      const repairMsg = await client.messages.create({
        model,
        max_tokens: 1600,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
          { role: "assistant", content: output },
          { role: "user", content: "Remove all HTML tags, tables, and markdown. Plain text only. Rewrite now." },
        ],
      });
      output = (repairMsg.content[0] as { type: string; text: string }).text;
    }

    res.json({ output, skill: "rma_email" });
  } catch (err: any) {
    if (err.message === "AI_SUBSCRIPTION_REQUIRED") {
      return res.status(402).json({ error: "AI subscription required" });
    }
    console.error("[iptrc/rma-email]", err.message);
    res.status(500).json({ error: "Failed to generate RMA email" });
  }
});

// ─── SKILL: Maintenance Email Summary ────────────────────────────────────────
router.post("/maint-email", async (req, res) => {
  try {
    const { emailBody } = req.body as { emailBody: string };

    if (!emailBody || emailBody.trim().length < 20) {
      return res.status(400).json({ error: "emailBody is required" });
    }

    const userId = (req as any).session?.userId;
    const { client, model } = await getAnthropicForUser(userId);

    const systemPrompt = `You are an IPTRC network operations assistant at AT&T. \
Extract structured data from a carrier maintenance notification email.

STRICT RULES:
1. Timezone MUST be quoted exactly as written in the email — do not convert or assume.
2. If a field is not found in the email, write "Not found in email" — never fabricate.
3. Provide an "IPTRC Actions" checklist that engineers should take — phrased as action items.
4. Do not claim any action has been completed — only list what should be done.
5. Plain text only — no HTML, no markdown tables.

OUTPUT FORMAT (use these exact headings):
MAINTENANCE SUMMARY:
- Supplier/Reference:
- Maintenance Window Start:
- Maintenance Window End:
- Timezone (as stated in email):
- Estimated Outage Duration:
- Affected Circuits/Services:
- Affected Customers:
- Work Description:

IPTRC ACTIONS CHECKLIST:
[ ] (list each action item)`;

    const message = await client.messages.create({
      model,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: `MAINTENANCE EMAIL:\n\n${sanitizeInput(emailBody)}` }],
    });

    let output = (message.content[0] as { type: string; text: string }).text;

    const required = ["MAINTENANCE SUMMARY:", "Timezone (as stated in email):", "IPTRC ACTIONS CHECKLIST:"];
    if (!validateHeadings(output, required)) {
      const repairMsg = await client.messages.create({
        model,
        max_tokens: 1400,
        system: systemPrompt,
        messages: [
          { role: "user", content: `MAINTENANCE EMAIL:\n\n${sanitizeInput(emailBody)}` },
          { role: "assistant", content: output },
          {
            role: "user",
            content: "Missing required headings. Rewrite following the exact output format. Timezone must be quoted exactly from the email.",
          },
        ],
      });
      output = (repairMsg.content[0] as { type: string; text: string }).text;
    }

    res.json({ output, skill: "maint_email" });
  } catch (err: any) {
    if (err.message === "AI_SUBSCRIPTION_REQUIRED") {
      return res.status(402).json({ error: "AI subscription required" });
    }
    console.error("[iptrc/maint-email]", err.message);
    res.status(500).json({ error: "Failed to summarize maintenance email" });
  }
});

export default router;
