// ============================================================
// POSTAL EMAIL SERVICE — ArgiFlow Integration
// Replaces nodemailer/SMTP with Postal HTTP API
// Server: https://mail.argilette.co
// ============================================================

const POSTAL_API_URL = "https://mail.argilette.co/api/v1";
const POSTAL_API_KEY = process.env.POSTAL_API_KEY || "";

export interface EmailRecipient {
  address: string;
  name?: string;
}

export interface SendEmailOptions {
  to: string | EmailRecipient | (string | EmailRecipient)[];
  from?: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  htmlBody?: string;
  plainBody?: string;
  tag?: string; // for tracking/categorization e.g. "sequence", "navimed", "argiflow"
  attachments?: {
    name: string;
    content_type: string;
    data: string; // base64 encoded
  }[];
}

export interface PostalSendResult {
  success: boolean;
  messageId?: string;
  token?: string;
  error?: string;
}

export interface BulkSendResult {
  success: boolean;
  sent: number;
  failed: number;
  results: PostalSendResult[];
}

// ── CORE SEND FUNCTION ────────────────────────────────────────

export async function sendEmail(options: SendEmailOptions): Promise<PostalSendResult> {
  try {
    // Normalize recipients
    const toArray = Array.isArray(options.to) ? options.to : [options.to];
    const toAddresses = toArray.map(r => {
      if (typeof r === "string") return r;
      return r.name ? `${r.name} <${r.address}>` : r.address;
    });

    const fromAddress = options.fromName
      ? `${options.fromName} <${options.from || "partnerships@argilette.co"}>`
      : (options.from || "partnerships@argilette.co");

    const payload: Record<string, any> = {
      to: toAddresses,
      from: fromAddress,
      subject: options.subject,
    };

    if (options.htmlBody) payload.html_body = options.htmlBody;
    if (options.plainBody) payload.plain_body = options.plainBody;
    if (options.replyTo) payload.reply_to = options.replyTo;
    if (options.tag) payload.tag = options.tag;
    if (options.attachments) payload.attachments = options.attachments;

    const response = await fetch(`${POSTAL_API_URL}/send/message`, {
      method: "POST",
      headers: {
        "X-Server-API-Key": POSTAL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as any;

    if (data.status === "success") {
      const firstRecipient = Object.values(data.data?.messages || {})[0] as any;
      return {
        success: true,
        messageId: data.data?.message_id,
        token: firstRecipient?.token,
      };
    } else {
      console.error("[Postal] Send failed:", data);
      return {
        success: false,
        error: data.data?.message || "Unknown Postal error",
      };
    }
  } catch (err: any) {
    console.error("[Postal] Request error:", err.message);
    return { success: false, error: err.message };
  }
}

// ── BULK SEND (for sequences / campaigns) ─────────────────────

export async function sendBulkEmails(
  emails: SendEmailOptions[],
  delayMs: number = 500 // 500ms delay between sends to avoid rate limiting
): Promise<BulkSendResult> {
  const results: PostalSendResult[] = [];
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    const result = await sendEmail(email);
    results.push(result);

    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Delay between sends
    if (delayMs > 0 && emails.indexOf(email) < emails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { success: failed === 0, sent, failed, results };
}

// ── SEQUENCE EMAIL HELPER ─────────────────────────────────────
// Processes spintax and variable substitution before sending

export function processSpintax(text: string): string {
  return text.replace(/\{([^}]+)\}/g, (match, options) => {
    // Check if it looks like a spintax block (contains |)
    if (options.includes("|")) {
      const variants = options.split("|");
      return variants[Math.floor(Math.random() * variants.length)];
    }
    return match; // Return as-is if it's a variable placeholder
  });
}

export function substituteVariables(
  text: string,
  variables: Record<string, string>
): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "");
    result = result.replace(new RegExp(`{${key}}`, "g"), value || "");
  }
  return result;
}

export async function sendSequenceEmail(options: {
  to: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  subject: string;
  htmlBody: string;
  from?: string;
  fromName?: string;
  sequenceName?: string;
  stepNumber?: number;
}): Promise<PostalSendResult> {
  const variables = {
    firstName: options.firstName || "there",
    first_name: options.firstName || "there",
    lastName: options.lastName || "",
    last_name: options.lastName || "",
    company: options.company || "your company",
    fullName: `${options.firstName || ""} ${options.lastName || ""}`.trim() || "there",
  };

  const processedSubject = substituteVariables(
    processSpintax(options.subject),
    variables
  );

  const processedBody = substituteVariables(
    processSpintax(options.htmlBody),
    variables
  );

  return sendEmail({
    to: options.to,
    from: options.from,
    fromName: options.fromName || "Abel Nkawula",
    subject: processedSubject,
    htmlBody: processedBody,
    tag: options.sequenceName
      ? `sequence-${options.sequenceName}-step-${options.stepNumber || 1}`
      : "sequence",
  });
}

// ── TRANSACTIONAL EMAIL HELPERS ───────────────────────────────

export async function sendWelcomeEmail(to: string, name: string): Promise<PostalSendResult> {
  return sendEmail({
    to,
    fromName: "Abel at ArgiFlow",
    subject: `Welcome to ArgiFlow, ${name}!`,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Welcome to ArgiFlow, ${name}!</h2>
        <p>Your account is ready. Here's how to get started:</p>
        <ol>
          <li>Set up your first campaign</li>
          <li>Import or generate leads</li>
          <li>Launch your sequence</li>
        </ol>
        <a href="https://argilette.co/dashboard" 
           style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
          Go to Dashboard
        </a>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">
          — Abel Nkawula<br>
          Founder, ARGILETTE LLC
        </p>
      </div>
    `,
    tag: "transactional-welcome",
  });
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<PostalSendResult> {
  return sendEmail({
    to,
    fromName: "ArgiFlow Security",
    subject: "Reset your ArgiFlow password",
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetLink}"
           style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
          Reset Password
        </a>
        <p style="margin-top: 16px; color: #666; font-size: 14px;">
          If you didn't request this, ignore this email.
        </p>
      </div>
    `,
    tag: "transactional-password-reset",
  });
}

export async function sendLeadNotificationEmail(
  to: string,
  leadName: string,
  leadEmail: string,
  leadCompany: string
): Promise<PostalSendResult> {
  return sendEmail({
    to,
    fromName: "ArgiFlow Alerts",
    subject: `New lead: ${leadName} from ${leadCompany}`,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h3>🎯 New Lead Captured</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; color: #666;">Name</td><td style="padding: 8px;"><strong>${leadName}</strong></td></tr>
          <tr><td style="padding: 8px; color: #666;">Email</td><td style="padding: 8px;">${leadEmail}</td></tr>
          <tr><td style="padding: 8px; color: #666;">Company</td><td style="padding: 8px;">${leadCompany}</td></tr>
        </table>
        <a href="https://argilette.co/dashboard/leads"
           style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
          View in Dashboard
        </a>
      </div>
    `,
    tag: "transactional-lead-alert",
  });
}

// ── MESSAGE STATUS CHECK ──────────────────────────────────────

export async function getMessageStatus(messageId: string): Promise<any> {
  try {
    const response = await fetch(`${POSTAL_API_URL}/messages/${messageId}`, {
      headers: { "X-Server-API-Key": POSTAL_API_KEY },
    });
    return await response.json();
  } catch (err: any) {
    return { error: err.message };
  }
}

export default {
  sendEmail,
  sendBulkEmails,
  sendSequenceEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendLeadNotificationEmail,
  getMessageStatus,
  processSpintax,
  substituteVariables,
};
