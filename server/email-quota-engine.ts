import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import {
  emailQuotas,
  emailSendsLog,
  EMAIL_PLAN_LIMITS,
  type EmailQuota,
} from "../shared/email-quota-schema";
import postalService from "./postal";

export async function getOrCreateQuota(userId: string): Promise<EmailQuota> {
  const [existing] = await db
    .select()
    .from(emailQuotas)
    .where(eq(emailQuotas.userId, userId));

  if (existing) {
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

export interface QuotaSendOptions {
  userId: string;
  to: string | string[];
  from?: string;
  fromName?: string;
  subject: string;
  htmlBody?: string;
  plainBody?: string;
  tag?: string;
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
  const quotaCheck = await checkQuota(options.userId);

  if (!quotaCheck.allowed) {
    return {
      success: false,
      quotaError: true,
      remaining: 0,
      error: `Monthly email limit reached (${quotaCheck.limit.toLocaleString()} emails). Upgrade your plan to send more.`,
    };
  }

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

  const toList = (Array.isArray(options.to) ? options.to : [options.to])
    .map(a => a.trim().replace(/[^a-zA-Z0-9@._+\-]/g, ""))
    .filter(a => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a));

  if (toList.length === 0) {
    return { success: false, error: "No valid email address provided" };
  }

  const toAddresses = toList.join(", ");

  const fromAddr = options.from || process.env.SES_FROM_EMAIL || "partnerships@argilette.co";
  console.log(`[EmailQuota] Sending email — to: ${toAddresses}, from: ${fromAddr}, fromName: ${options.fromName}, subject: ${subject}`);

  let sendResult: any;
  try {
    // Always use SES (reliable delivery)
    sendResult = await postalService.sendEmail({
      to: toAddresses,
      from: fromAddr,
      fromName: options.fromName || "ArgiFlow",
      subject,
      htmlBody: htmlBody || undefined,
      plainBody: options.plainBody || undefined,
      tag: options.tag || "argiflow",
    });
  } catch (err: any) {
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

  const success = sendResult.success;

  await db.insert(emailSendsLog).values({
    userId: options.userId,
    to: toAddresses,
    subject: options.subject,
    tag: options.tag,
    postalMsgId: sendResult.messageId,
    postalToken: sendResult.token,
    status: success ? "sent" : "failed",
    errorMsg: success ? null : (sendResult.error || "Unknown error"),
  });

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
    messageId: sendResult.messageId,
    token: sendResult.token,
    remaining: quotaCheck.remaining - (success ? 1 : 0),
    error: success ? undefined : sendResult.error,
  };
}

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

function getNextResetDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
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
