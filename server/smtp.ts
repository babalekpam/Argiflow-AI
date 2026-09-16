import nodemailer from "nodemailer";

export interface SmtpSendParams {
  to: string;
  toName?: string;
  from: string;
  fromName?: string;
  subject: string;
  html?: string;
  plainText?: string;
  headers?: Record<string, string>;
  inReplyTo?: string;
  references?: string;
}

export interface SmtpResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export function getSmtpConfig(userSettings?: any): {
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  hasSmtp: boolean;
} {
  const host = userSettings?.smtpHost || process.env.SMTP_HOST;
  const user = userSettings?.smtpUsername || process.env.SMTP_USERNAME;
  const pass = userSettings?.smtpPassword || process.env.SMTP_PASSWORD;
  const port = Number(userSettings?.smtpPort || process.env.SMTP_PORT || 465);
  const secure = userSettings?.smtpSecure ?? port === 465;
  return { host, port, secure, user, pass, hasSmtp: !!(host && user && pass) };
}

export async function sendViaSmtp(params: SmtpSendParams, userSettings?: any): Promise<SmtpResult> {
  const cfg = getSmtpConfig(userSettings);
  if (!cfg.hasSmtp) {
    return { success: false, error: "No SMTP configured (set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD)" };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    const fromHeader = params.fromName ? `"${params.fromName}" <${params.from}>` : params.from;
    const toHeader = params.toName ? `"${params.toName}" <${params.to}>` : params.to;
    const info = await transporter.sendMail({
      from: fromHeader,
      to: toHeader,
      subject: params.subject,
      text: params.plainText,
      html: params.html,
      headers: params.headers,
      inReplyTo: params.inReplyTo,
      references: params.references,
    });
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    return { success: false, error: err?.message || "SMTP send failed" };
  }
}
