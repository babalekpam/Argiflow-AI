import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import nodemailer from "nodemailer";

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function getSesClient(): SESClient | null {
  const accessKeyId = process.env.AWS_API_KEY;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;
  return new SESClient({
    region: "us-east-2",
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function sendEmailViaSES(options: {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  fromName?: string;
  fromEmail?: string;
}): Promise<SendEmailResult> {
  const fromEmail = options.fromEmail || process.env.SES_FROM_EMAIL || "partnerships@argilette.co";
  const fromName = options.fromName || "Abel";
  const fromFull = `${fromName} <${fromEmail}>`;

  const sesClient = getSesClient();
  if (sesClient) {
    try {
      const command = new SendEmailCommand({
        Source: fromFull,
        Destination: {
          ToAddresses: [options.toName ? `${options.toName} <${options.to}>` : options.to],
        },
        Message: {
          Subject: { Data: options.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: options.body, Charset: "UTF-8" },
          },
        },
      });
      const result = await sesClient.send(command);
      console.log(`[Aria] Email sent via SES API to ${options.to} — MessageId: ${result.MessageId}`);
      return { success: true, messageId: result.MessageId };
    } catch (err: any) {
      console.error(`[Aria] SES API send failed: ${err.message}`);
    }
  }

  try {
    const host = process.env.SES_SMTP_HOST || process.env.SMTP_HOST;
    const port = parseInt(process.env.SES_SMTP_PORT || process.env.SMTP_PORT || "587");
    const user = process.env.SES_SMTP_USER || process.env.SMTP_USERNAME;
    const pass = process.env.SES_SMTP_PASS || process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
      return { success: false, error: "No email credentials configured (SES API and SMTP both unavailable)" };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const result = await transporter.sendMail({
      from: fromFull,
      to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
      subject: options.subject,
      html: options.body,
    });

    console.log(`[Aria] Email sent via SMTP to ${options.to} — MessageId: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendSMS(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return { success: false, error: "Twilio credentials not configured" };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: body }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export interface ConnectorStatus {
  name: string;
  id: string;
  connected: boolean;
  description: string;
}

export function getAvailableConnectors(): ConnectorStatus[] {
  return [
    {
      name: "Email (AWS SES)",
      id: "ses",
      connected: !!(process.env.AWS_API_KEY && process.env.AWS_SECRET_ACCESS_KEY),
      description: "Send outreach emails and follow-ups via Amazon SES",
    },
    {
      name: "Twilio SMS",
      id: "twilio",
      connected: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      description: "Send SMS reminders and notifications",
    },
    {
      name: "Stripe",
      id: "stripe",
      connected: !!process.env.STRIPE_SECRET_KEY,
      description: "Track revenue and invoice status",
    },
  ];
}

export async function getStripeRevenue(): Promise<{ mtdRevenue: number; overdueInvoices: number } | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const chargesUrl = `https://api.stripe.com/v1/charges?created[gte]=${Math.floor(startOfMonth.getTime() / 1000)}&limit=100`;
    const resp = await fetch(chargesUrl, {
      headers: { "Authorization": `Bearer ${key}` },
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const mtdRevenue = (data.data || [])
      .filter((c: any) => c.paid && !c.refunded)
      .reduce((sum: number, c: any) => sum + (c.amount / 100), 0);

    const invoicesUrl = `https://api.stripe.com/v1/invoices?status=open&limit=100`;
    const invResp = await fetch(invoicesUrl, {
      headers: { "Authorization": `Bearer ${key}` },
    });

    let overdueInvoices = 0;
    if (invResp.ok) {
      const invData = await invResp.json();
      overdueInvoices = (invData.data || []).filter((i: any) => i.due_date && i.due_date * 1000 < Date.now()).length;
    }

    return { mtdRevenue, overdueInvoices };
  } catch {
    return null;
  }
}
