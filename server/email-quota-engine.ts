// ============================================================
// EMAIL QUOTA ENGINE — ArgiFlow Mailing Service
// Handles quota checks, usage tracking, plan management
// ============================================================

import { db } from "./db"; // your existing db import
import { eq, and, sql } from "drizzle-orm";
import {
  emailQuotas,
  emailSendsLog,
  EMAIL_PLAN_LIMITS,
  type EmailQuota,
} from "../shared/email-quota-schema";

// Postal config
const POSTAL_API_URL = "https://mail.argilette.co/api/v1";
const POSTAL_API_KEY = process.env.POSTAL_API_KEY || "";

// ── QUOTA MANAGEMENT ──────────────────────────────────────────

export async function getOrCreateQuota(userId: string): Promise<EmailQuota> {
  const [existing] = await db
    .select()
    .from(emailQuotas)
    .where(eq(emailQuotas.userId, userId));

  if (existing) {
    // Check if reset date has passed — reset counter if new month
    const now = new Date();
    if (now >= existing.resetDate) {
      const nextReset = getNextResetDate();
      const [updated] = await db
        .update(emailQuotas)
        .set({ sentThisMonth: 0, resetDate: nextReset, updatedAt: new Date() })
        .where(eq(emailQuotas.userId, userId))
        .returning();
      return updated;
    }
    return existing;
  }

  // Create new quota with starter plan
  const [created] = await db
    .insert(emailQuotas)
    .values({
      userId,
      plan: "starter",
      monthlyLimit: EMAIL_PLAN_LIMITS.starter,
      sentThisMonth: 0,
      sentAllTime: 0,
      resetDate: getNextResetDate(),
      isActive: true,
    })
    .returning();

  return created;
}

export async function checkQuota(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
  plan: string;
  resetDate: Date;
}> {
  const quota = await getOrCreateQuota(userId);
  const remaining = quota.monthlyLimit - quota.sentThisMonth;

  return {
    allowed: quota.isActive && remaining > 0,
    remaining: Math.max(0, remaining),
    used: quota.sentThisMonth,
    limit: quota.monthlyLimit,
    plan: quota.plan,
    resetDate: quota.resetDate,
  };
}

export async function upgradePlan(userId: string, newPlan: "starter" | "growth" | "pro" | "agency"): Promise<EmailQuota> {
  const quota = await getOrCreateQuota(userId);

  const [updated] = await db
    .update(emailQuotas)
    .set({
      plan: newPlan,
      monthlyLimit: EMAIL_PLAN_LIMITS[newPlan],
      updatedAt: new Date(),
    })
    .where(eq(emailQuotas.userId, userId))
    .returning();

  return updated;
}

// ── CORE SEND WITH QUOTA ──────────────────────────────────────

export interface QuotaSendOptions {
  userId: string;
  to: string | string[];
  from?: string;
  fromName?: string;
  subject: string;
  htmlBody?: string;
  plainBody?: string;
  tag?: string;
  // Variable substitution
  firstName?: string;
  lastName?: string;
  company?: string;
}

export interface QuotaSendResult {
  success: boolean;
  messageId?: string;
  token?: string;
  error?: string;
  quotaError?: boolean;
  remaining?: number;
}

export async function sendEmailWithQuota(options: QuotaSendOptions): Promise<QuotaSendResult> {
  // 1. Check quota
  const quotaCheck = await checkQuota(options.userId);

  if (!quotaCheck.allowed) {
    return {
      success: false,
      quotaError: true,
      remaining: 0,
      error: `Monthly email limit reached (${quotaCheck.limit.toLocaleString()} emails). Upgrade your plan to send more.`,
    };
  }

  // 2. Process variables
  const variables: Record<string, string> = {
    firstName: options.firstName || "there",
    first_name: options.firstName || "there",
    lastName: options.lastName || "",
    company: options.company || "",
  };

  let subject = options.subject;
  let htmlBody = options.htmlBody || "";

  for (const [key, val] of Object.entries(variables)) {
    subject = subject.replace(new RegExp(`{{${key}}}`, "g"), val).replace(new RegExp(`{${key}}`, "g"), val);
    htmlBody = htmlBody.replace(new RegExp(`{{${key}}}`, "g"), val).replace(new RegExp(`{${key}}`, "g"), val);
  }

  // 3. Build recipient list
  const toList = Array.isArray(options.to) ? options.to : [options.to];
  const toAddresses = toList.join(", ");

  const fromAddress = options.fromName
    ? `${options.fromName} <${options.from || "partnerships@argilette.co"}>`
    : (options.from || "partnerships@argilette.co");

  // 4. Send via Postal
  let postalResult: any;
  try {
    const response = await fetch(`${POSTAL_API_URL}/send/message`, {
      method: "POST",
      headers: {
        "X-Server-API-Key": POSTAL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: toAddresses,
        from: fromAddress,
        subject,
        html_body: htmlBody || undefined,
        plain_body: options.plainBody || undefined,
        tag: options.tag || "argiflow",
      }),
    });
    postalResult = await response.json();
  } catch (err: any) {
    // Log failed send
    await db.insert(emailSendsLog).values({
      userId: options.userId,
      to: toAddresses,
      subject: options.subject,
      tag: options.tag,
      status: "failed",
      errorMsg: err.message,
    });
    return { success: false, error: err.message };
  }

  const success = postalResult.status === "success";
  const firstMsg = Object.values(postalResult.data?.messages || {})[0] as any;

  // 5. Log the send
  await db.insert(emailSendsLog).values({
    userId: options.userId,
    to: toAddresses,
    subject: options.subject,
    tag: options.tag,
    postalMsgId: postalResult.data?.message_id,
    postalToken: firstMsg?.token,
    status: success ? "sent" : "failed",
    errorMsg: success ? null : (postalResult.data?.message || "Unknown error"),
  });

  // 6. Increment quota counter
  if (success) {
    await db
      .update(emailQuotas)
      .set({
        sentThisMonth: sql`${emailQuotas.sentThisMonth} + 1`,
        sentAllTime: sql`${emailQuotas.sentAllTime} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(emailQuotas.userId, options.userId));
  }

  return {
    success,
    messageId: postalResult.data?.message_id,
    token: firstMsg?.token,
    remaining: quotaCheck.remaining - (success ? 1 : 0),
    error: success ? undefined : postalResult.data?.message,
  };
}

// ── BULK SEND WITH QUOTA ──────────────────────────────────────

export async function sendBulkWithQuota(
  userId: string,
  emails: Omit<QuotaSendOptions, "userId">[],
  delayMs: number = 500
): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  quotaExceeded: boolean;
  remaining: number;
}> {
  const quotaCheck = await checkQuota(userId);

  if (!quotaCheck.allowed) {
    return { success: false, sent: 0, failed: emails.length, quotaExceeded: true, remaining: 0 };
  }

  // Only send up to remaining quota
  const sendable = emails.slice(0, quotaCheck.remaining);
  let sent = 0;
  let failed = 0;

  for (const email of sendable) {
    const result = await sendEmailWithQuota({ ...email, userId });
    if (result.success) sent++;
    else failed++;

    if (delayMs > 0 && sendable.indexOf(email) < sendable.length - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  const finalQuota = await checkQuota(userId);

  return {
    success: failed === 0,
    sent,
    failed,
    quotaExceeded: emails.length > quotaCheck.remaining,
    remaining: finalQuota.remaining,
  };
}

// ── ADMIN FUNCTIONS ───────────────────────────────────────────

export async function getAllUsersQuotaStats() {
  return db.select().from(emailQuotas).orderBy(emailQuotas.sentThisMonth);
}

export async function getUserEmailHistory(userId: string, limit = 50) {
  return db
    .select()
    .from(emailSendsLog)
    .where(eq(emailSendsLog.userId, userId))
    .orderBy(sql`${emailSendsLog.sentAt} DESC`)
    .limit(limit);
}

// ── HELPERS ───────────────────────────────────────────────────

function getNextResetDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1); // 1st of next month
}

export default {
  getOrCreateQuota,
  checkQuota,
  upgradePlan,
  sendEmailWithQuota,
  sendBulkWithQuota,
  getAllUsersQuotaStats,
  getUserEmailHistory,
};
