import { db } from "./db";
import { eq, and, sql, lte, desc } from "drizzle-orm";
import {
  sequences, sequenceSteps, sequenceEnrollments, leads,
  notifications, funnelDeals,
} from "@shared/schema";
import { storage } from "./storage";
import nodemailer from "nodemailer";

const automationStatus = {
  running: false,
  lastRun: null as Date | null,
  enrollmentsProcessed: 0,
  stepsSent: 0,
  sequencesStopped: 0,
  errors: 0,
};

async function sendSequenceEmail(
  userId: string,
  leadRecord: any,
  subject: string,
  content: string
): Promise<boolean> {
  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USERNAME;
    const smtpPass = process.env.SMTP_PASSWORD;

    if (!smtpHost || !smtpUser || !smtpPass || !leadRecord.email) {
      console.log(`[SeqAuto] SMTP not configured or lead has no email, skipping send`);
      return false;
    }

    const user = await storage.getUserById(userId);
    const senderName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Team";

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"${senderName}" <${smtpUser}>`,
      to: leadRecord.email,
      subject: subject || "Following up",
      html: content,
    });

    console.log(`[SeqAuto] Email sent to ${leadRecord.email} (${leadRecord.name})`);
    return true;
  } catch (err: any) {
    console.error(`[SeqAuto] Email send error: ${err.message}`);
    return false;
  }
}

async function notify(userId: string, title: string, message: string) {
  try {
    await db.insert(notifications).values({
      userId,
      title,
      message,
      type: "automation",
      read: false,
    });
  } catch {}
}

export async function processSequenceAutomation(): Promise<void> {
  if (automationStatus.running) return;
  automationStatus.running = true;

  try {
    const now = new Date();
    automationStatus.lastRun = now;

    const activeEnrollments = await db
      .select()
      .from(sequenceEnrollments)
      .where(
        sql`${sequenceEnrollments.status} = 'active' AND ${sequenceEnrollments.nextSendAt} IS NOT NULL AND ${sequenceEnrollments.nextSendAt} <= ${now}`
      );

    if (activeEnrollments.length === 0) {
      automationStatus.running = false;
      return;
    }

    console.log(`[SeqAuto] Processing ${activeEnrollments.length} due enrollments`);

    for (const enrollment of activeEnrollments) {
      try {
        const [seq] = await db.select().from(sequences)
          .where(eq(sequences.id, enrollment.sequenceId));

        if (!seq || seq.status !== "active") {
          await db.update(sequenceEnrollments)
            .set({ status: "paused" })
            .where(eq(sequenceEnrollments.id, enrollment.id));
          continue;
        }

        const [leadRecord] = await db.select().from(leads)
          .where(eq(leads.id, enrollment.leadId));

        if (!leadRecord) {
          await db.update(sequenceEnrollments)
            .set({ status: "completed", completedAt: now })
            .where(eq(sequenceEnrollments.id, enrollment.id));
          continue;
        }

        if (
          leadRecord.followUpStatus === "completed" ||
          leadRecord.engagementLevel === "hot" ||
          leadRecord.status === "contacted"
        ) {
          await db.update(sequenceEnrollments)
            .set({ status: "replied", completedAt: now })
            .where(eq(sequenceEnrollments.id, enrollment.id));
          automationStatus.sequencesStopped++;
          console.log(`[SeqAuto] Stopped sequence for ${leadRecord.name} — lead replied/engaged`);
          continue;
        }

        const nextStepNumber = (enrollment.currentStep || 0) + 1;

        const [step] = await db.select().from(sequenceSteps)
          .where(
            sql`${sequenceSteps.sequenceId} = ${enrollment.sequenceId} AND ${sequenceSteps.stepNumber} = ${nextStepNumber}`
          );

        if (!step) {
          await db.update(sequenceEnrollments)
            .set({ status: "completed", completedAt: now })
            .where(eq(sequenceEnrollments.id, enrollment.id));

          await db.update(sequences)
            .set({ totalCompleted: sql`COALESCE(${sequences.totalCompleted}, 0) + 1` })
            .where(eq(sequences.id, enrollment.sequenceId));

          automationStatus.enrollmentsProcessed++;
          console.log(`[SeqAuto] ${leadRecord.name} completed all steps in "${seq.name}"`);
          continue;
        }

        let sent = false;

        if (step.channel === "email") {
          const subject = step.subject || `Re: ${seq.name}`;
          const personalizedContent = step.content
            .replace(/\{\{name\}\}/gi, leadRecord.name || "there")
            .replace(/\{\{company\}\}/gi, leadRecord.company || "your company")
            .replace(/\{\{email\}\}/gi, leadRecord.email || "");
          sent = await sendSequenceEmail(seq.userId, leadRecord, subject, personalizedContent);
        } else if (step.channel === "sms") {
          console.log(`[SeqAuto] SMS step for ${leadRecord.name} — would send via Twilio`);
          sent = true;
        } else if (step.channel === "linkedin") {
          console.log(`[SeqAuto] LinkedIn step for ${leadRecord.name} — logged for manual action`);
          sent = true;
        } else if (step.channel === "call") {
          console.log(`[SeqAuto] Call step for ${leadRecord.name} — queued for Voice AI`);
          sent = true;
        }

        if (sent) {
          const nextStep = await db.select().from(sequenceSteps)
            .where(
              sql`${sequenceSteps.sequenceId} = ${enrollment.sequenceId} AND ${sequenceSteps.stepNumber} = ${nextStepNumber + 1}`
            );

          let nextSendAt: Date | null = null;
          if (nextStep.length > 0) {
            const dMs =
              ((nextStep[0].delayDays ?? 1) * 86400000) +
              ((nextStep[0].delayHours ?? 0) * 3600000);
            nextSendAt = new Date(now.getTime() + (dMs > 0 ? dMs : 3600000));
          }

          await db.update(sequenceEnrollments)
            .set({
              currentStep: nextStepNumber,
              nextSendAt,
              status: nextSendAt ? "active" : "completed",
              completedAt: nextSendAt ? null : now,
            })
            .where(eq(sequenceEnrollments.id, enrollment.id));

          automationStatus.stepsSent++;
          console.log(`[SeqAuto] Executed step ${nextStepNumber} (${step.channel}) for ${leadRecord.name} in "${seq.name}"`);
        }
      } catch (err: any) {
        console.error(`[SeqAuto] Enrollment ${enrollment.id} error: ${err.message}`);
        automationStatus.errors++;
      }
    }

  } catch (err: any) {
    console.error(`[SeqAuto] Main process error: ${err.message}`);
    automationStatus.errors++;
  } finally {
    automationStatus.running = false;
  }
}

export async function autoEnrollLeadInSequence(
  userId: string,
  leadId: string,
  sequenceId?: string
): Promise<boolean> {
  try {
    const [leadRecord] = await db.select().from(leads)
      .where(sql`${leads.id} = ${leadId} AND ${leads.userId} = ${userId}`);
    if (!leadRecord) {
      console.warn(`[SeqAuto] Lead ${leadId} not found or not owned by user ${userId}`);
      return false;
    }

    let targetSeqId = sequenceId;

    if (!targetSeqId) {
      const [activeSeq] = await db.select().from(sequences)
        .where(sql`${sequences.userId} = ${userId} AND ${sequences.status} = 'active'`)
        .orderBy(desc(sequences.createdAt))
        .limit(1);

      if (!activeSeq) return false;
      targetSeqId = activeSeq.id;
    } else {
      const [seq] = await db.select().from(sequences)
        .where(sql`${sequences.id} = ${targetSeqId} AND ${sequences.userId} = ${userId}`);
      if (!seq) {
        console.warn(`[SeqAuto] Sequence ${targetSeqId} not found or not owned by user ${userId}`);
        return false;
      }
    }

    const existing = await db.select().from(sequenceEnrollments)
      .where(
        sql`${sequenceEnrollments.sequenceId} = ${targetSeqId} AND ${sequenceEnrollments.leadId} = ${leadId}`
      );

    if (existing.length > 0) return false;

    const [firstStep] = await db.select().from(sequenceSteps)
      .where(
        sql`${sequenceSteps.sequenceId} = ${targetSeqId} AND ${sequenceSteps.stepNumber} = 1`
      );

    const delayMs =
      ((firstStep?.delayDays ?? 0) * 86400000) +
      ((firstStep?.delayHours ?? 1) * 3600000);
    const nextSendAt = new Date(Date.now() + (delayMs > 0 ? delayMs : 3600000));

    await db.insert(sequenceEnrollments).values({
      sequenceId: targetSeqId,
      leadId,
      userId,
      currentStep: 0,
      status: "active",
      nextSendAt,
    });

    await db.update(sequences)
      .set({ totalEnrolled: sql`COALESCE(${sequences.totalEnrolled}, 0) + 1` })
      .where(eq(sequences.id, targetSeqId));

    console.log(`[SeqAuto] Auto-enrolled lead ${leadId} in sequence ${targetSeqId}`);
    return true;
  } catch (err: any) {
    console.error(`[SeqAuto] Auto-enroll error: ${err.message}`);
    return false;
  }
}

export async function stopSequencesForLead(
  leadId: string,
  reason: string = "replied"
): Promise<number> {
  try {
    const active = await db.select().from(sequenceEnrollments)
      .where(
        sql`${sequenceEnrollments.leadId} = ${leadId} AND ${sequenceEnrollments.status} = 'active'`
      );

    if (active.length === 0) return 0;

    const now = new Date();
    for (const enrollment of active) {
      await db.update(sequenceEnrollments)
        .set({ status: reason, completedAt: now, nextSendAt: null })
        .where(eq(sequenceEnrollments.id, enrollment.id));

      await db.update(sequences)
        .set({ totalReplied: sql`COALESCE(${sequences.totalReplied}, 0) + 1` })
        .where(eq(sequences.id, enrollment.sequenceId));
    }

    console.log(`[SeqAuto] Stopped ${active.length} active sequences for lead ${leadId} — reason: ${reason}`);
    return active.length;
  } catch (err: any) {
    console.error(`[SeqAuto] Stop sequences error: ${err.message}`);
    return 0;
  }
}

export async function stopSequencesForDeal(
  dealId: string,
  userId: string,
  status: string
): Promise<void> {
  if (status !== "won" && status !== "lost") return;

  try {
    const [deal] = await db.select().from(funnelDeals)
      .where(eq(funnelDeals.id, dealId));

    if (!deal || !deal.contactName) return;

    const matchingLeads = await db.select().from(leads)
      .where(
        sql`${leads.userId} = ${userId} AND (${leads.name} ILIKE ${deal.contactName} OR ${leads.email} ILIKE ${deal.contactEmail || "___NO_MATCH___"})`
      );

    for (const lead of matchingLeads) {
      const stopped = await stopSequencesForLead(lead.id, status === "won" ? "deal_won" : "deal_lost");
      if (stopped > 0) {
        await notify(
          userId,
          `Sequences stopped — Deal ${status}`,
          `${stopped} active sequence(s) stopped for ${lead.name} because the deal was marked as ${status}.`
        );
      }
    }
  } catch (err: any) {
    console.error(`[SeqAuto] Stop for deal error: ${err.message}`);
  }
}

let automationInterval: NodeJS.Timeout | null = null;

export function startSequenceAutomationEngine(): void {
  if (automationInterval) return;

  console.log("[SeqAuto] Sequence automation engine started — checking every 2 minutes");

  processSequenceAutomation().catch(err =>
    console.error("[SeqAuto] Initial run error:", err.message)
  );

  automationInterval = setInterval(() => {
    processSequenceAutomation().catch(err =>
      console.error("[SeqAuto] Interval run error:", err.message)
    );
  }, 2 * 60 * 1000);
}

export function getAutomationStatus() {
  return automationStatus;
}
