import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const SES_HOST = process.env.SES_SMTP_HOST || "email-smtp.us-east-2.amazonaws.com";
const SES_PORT = parseInt(process.env.SES_SMTP_PORT || "587", 10);
const SES_USER = process.env.SES_SMTP_USER || "";
const SES_PASS = process.env.SES_SMTP_PASS || "";
const SES_FROM = process.env.SES_FROM_EMAIL || "partnerships@argilette.co";

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!_transporter) {
    if (!SES_USER || !SES_PASS) {
      throw new Error("SES_SMTP_USER and SES_SMTP_PASS must be configured");
    }
    _transporter = nodemailer.createTransport({
      host: SES_HOST,
      port: SES_PORT,
      secure: false,
      auth: { user: SES_USER, pass: SES_PASS },
    });
    console.log(`[Email] SES SMTP configured via ${SES_HOST}:${SES_PORT}`);
  }
  return _transporter;
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
}

export interface BulkSendResult {
  success: boolean;
  sent: number;
  failed: number;
  results: PostalSendResult[];
}

export async function sendEmail(options: SendEmailOptions): Promise<PostalSendResult> {
  try {
    const transporter = getTransporter();

    const toArray = Array.isArray(options.to) ? options.to : [options.to];
    const toAddresses = toArray.map(r => {
      if (typeof r === "string") return r;
      return r.name ? `${r.name} <${r.address}>` : r.address;
    });

    const fromAddress = options.fromName
      ? `${options.fromName} <${options.from || SES_FROM}>`
      : (options.from || SES_FROM);

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
    };
  } catch (err: any) {
    console.error("[Email] SES send failed:", err.message);
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
  return { messageId, status: "Message status tracking via SES CloudWatch" };
}

export function getSesTransporter(): Transporter {
  return getTransporter();
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
  getSesTransporter,
};
