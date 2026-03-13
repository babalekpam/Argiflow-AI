import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const POSTAL_API_URL = "https://mail.argilette.co/api/v1";
const POSTAL_API_KEY = process.env.POSTAL_API_KEY || "";
const DEFAULT_FROM = process.env.SES_FROM_EMAIL || "partnerships@argilette.co";

const SES_HOST = process.env.SES_SMTP_HOST || "";
const SES_PORT = parseInt(process.env.SES_SMTP_PORT || "587", 10);
const SES_USER = process.env.SES_SMTP_USER || "";
const SES_PASS = process.env.SES_SMTP_PASS || "";

function getSesTransporter(): Transporter | null {
  if (!SES_USER || !SES_PASS || !SES_HOST) return null;
  // Create a fresh transporter per send — avoids stale connection pool / "Greeting never received"
  return nodemailer.createTransport({
    host: SES_HOST,
    port: SES_PORT,
    secure: false,
    auth: { user: SES_USER, pass: SES_PASS },
    requireTLS: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

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
  tag?: string;
  attachments?: {
    name: string;
    content_type: string;
    data: string;
  }[];
}

export interface PostalSendResult {
  success: boolean;
  messageId?: string;
  token?: string;
  error?: string;
  provider?: string;
}

export interface BulkSendResult {
  success: boolean;
  sent: number;
  failed: number;
  results: PostalSendResult[];
}

function normalizeRecipients(to: SendEmailOptions["to"]): string[] {
  const toArray = Array.isArray(to) ? to : [to];
  return toArray.map(r => {
    if (typeof r === "string") return r.trim();
    return r.name ? `${r.name} <${r.address.trim()}>` : r.address.trim();
  });
}

function buildFromAddress(fromName?: string, from?: string): string {
  return fromName
    ? `${fromName} <${from || DEFAULT_FROM}>`
    : (from || DEFAULT_FROM);
}

async function checkPostalDeliveryStatus(messageId: number): Promise<{ held: boolean; reason?: string }> {
  try {
    const response = await fetch(`${POSTAL_API_URL}/messages/deliveries`, {
      method: "POST",
      headers: { "X-Server-API-Key": POSTAL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ id: messageId }),
    });
    const data = await response.json() as any;
    if (data.status === "success" && Array.isArray(data.data)) {
      const held = data.data.find((d: any) => d.status === "Held");
      if (held) return { held: true, reason: held.details || "Unknown" };
    }
    return { held: false };
  } catch {
    return { held: false };
  }
}

async function sendViaPostalApi(options: SendEmailOptions): Promise<PostalSendResult> {
  if (!POSTAL_API_KEY) return { success: false, error: "POSTAL_API_KEY not configured" };

  const toAddresses = normalizeRecipients(options.to);
  const fromAddress = buildFromAddress(options.fromName, options.from);

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
    const recipientId = firstRecipient?.id;
    console.log(`[Postal API] Accepted — msgId: ${data.data?.message_id}, token: ${firstRecipient?.token}, recipient: ${JSON.stringify(Object.keys(data.data?.messages || {}))}`);

    if (recipientId) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const deliveryCheck = await checkPostalDeliveryStatus(recipientId);
      if (deliveryCheck.held) {
        console.warn(`[Postal API] Message HELD — ${deliveryCheck.reason}. Will try SES fallback.`);
        return {
          success: false,
          error: `Postal held: ${deliveryCheck.reason}`,
          provider: "postal",
        };
      }
    }

    return {
      success: true,
      messageId: data.data?.message_id,
      token: firstRecipient?.token,
      provider: "postal",
    };
  } else {
    console.error(`[Postal API] Rejected — status: ${data.status}, error: ${data.data?.message || JSON.stringify(data)}`);
    return {
      success: false,
      error: data.data?.message || "Unknown Postal error",
      provider: "postal",
    };
  }
}

async function sendViaSes(options: SendEmailOptions): Promise<PostalSendResult> {
  const transporter = getSesTransporter();
  if (!transporter) return { success: false, error: "SES SMTP not configured" };

  const toAddresses = normalizeRecipients(options.to);
  const fromAddress = buildFromAddress(options.fromName, options.from);

  const mailOptions: any = {
    from: fromAddress,
    to: toAddresses.join(", "),
    subject: options.subject,
  };

  if (options.htmlBody) mailOptions.html = options.htmlBody;
  if (options.plainBody) mailOptions.text = options.plainBody;
  if (options.replyTo) mailOptions.replyTo = options.replyTo;

  if (options.attachments?.length) {
    mailOptions.attachments = options.attachments.map(a => ({
      filename: a.name,
      content: Buffer.from(a.data, "base64"),
      contentType: a.content_type,
    }));
  }

  if (options.tag) {
    mailOptions.headers = { "X-ArgiFlow-Tag": options.tag };
  }

  const info = await transporter.sendMail(mailOptions);
  return {
    success: true,
    messageId: info.messageId,
    provider: "ses",
  };
}

export async function sendEmail(options: SendEmailOptions): Promise<PostalSendResult> {
  const isCustomDomain = options.from && options.from !== DEFAULT_FROM;

  // Always use SES for reliable delivery
  // For custom domains: keep the display name, use platform sender, set Reply-To to custom email
  const sesOptions = {
    ...options,
    from: DEFAULT_FROM,
    replyTo: isCustomDomain ? options.from : options.replyTo,
  };

  if (isCustomDomain) {
    console.log(`[Email] Custom domain (${options.from}) — sending via SES as ${DEFAULT_FROM}, Reply-To: ${options.from}, fromName: ${options.fromName}`);
  }

  try {
    const sesResult = await sendViaSes(sesOptions);
    if (sesResult.success) {
      console.log(`[Email] Sent via SES to ${JSON.stringify(options.to)} from ${DEFAULT_FROM} (display: ${options.fromName}) — msgId: ${sesResult.messageId}`);
      return sesResult;
    }
    console.warn(`[Email] SES failed: ${sesResult.error}, trying Postal fallback...`);
  } catch (err: any) {
    console.warn(`[Email] SES error: ${err.message}, trying Postal fallback...`);
  }

  // Postal fallback
  try {
    const postalResult = await sendViaPostalApi({ ...options, from: DEFAULT_FROM });
    if (postalResult.success) {
      console.log(`[Email] Sent via Postal to ${JSON.stringify(options.to)} from ${DEFAULT_FROM} — msgId: ${postalResult.messageId}`);
      return postalResult;
    }
    console.error(`[Email] Postal also failed: ${postalResult.error}`);
    return postalResult;
  } catch (err: any) {
    console.error(`[Email] All providers failed. Last error:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function sendBulkEmails(
  emails: SendEmailOptions[],
  delayMs: number = 500
): Promise<BulkSendResult> {
  const results: PostalSendResult[] = [];
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    const result = await sendEmail(email);
    results.push(result);
    if (result.success) sent++;
    else failed++;

    if (delayMs > 0 && emails.indexOf(email) < emails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return { success: failed === 0, sent, failed, results };
}

export function processSpintax(text: string): string {
  return text.replace(/\{([^}]+)\}/g, (match, options) => {
    if (options.includes("|")) {
      const variants = options.split("|");
      return variants[Math.floor(Math.random() * variants.length)];
    }
    return match;
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

  const processedSubject = substituteVariables(processSpintax(options.subject), variables);
  const processedBody = substituteVariables(processSpintax(options.htmlBody), variables);

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
        <h3>New Lead Captured</h3>
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

export async function getMessageStatus(messageId: string): Promise<any> {
  if (!POSTAL_API_KEY) return { error: "POSTAL_API_KEY not configured" };
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
