import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { eq, and, sql, count, desc } from "drizzle-orm";
import { teamMembers, leadAssignments, leads, users } from "@shared/schema";
import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";

async function sendTeamInviteEmail(
  toEmail: string,
  inviteeName: string | null,
  inviterName: string,
  inviterCompany: string,
  role: string,
) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USERNAME;
  const smtpPass = process.env.SMTP_PASSWORD;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const sgKey = process.env.SENDGRID_API_KEY;

  const appUrl = "https://argilette.co";
  const greeting = inviteeName ? `Hi ${inviteeName}` : "Hi there";
  const subject = `${inviterName} invited you to join their team on Argilette`;
  const from = { email: smtpUser || "noreply@argilette.co", name: "Argilette" };
  const signupUrl = `${appUrl}/signup`;

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d1119; color: #e2e8f0; padding: 40px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="background: linear-gradient(135deg, #00E5FF, #004E8C); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px; margin: 0;">ARGILETTE</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">AI Automation Platform</p>
      </div>
      <h2 style="color: #f1f5f9; font-size: 22px; margin-bottom: 16px;">You're Invited!</h2>
      <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">
        ${greeting},
      </p>
      <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">
        <strong style="color: #f1f5f9;">${inviterName}</strong> from <strong style="color: #f1f5f9;">${inviterCompany}</strong> has invited you to join their team as a <strong style="color: #00E5FF;">${role}</strong>.
      </p>
      <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">
        With Argilette, you'll have access to powerful AI-driven tools for lead generation, sales intelligence, and client acquisition.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #00E5FF, #0090C8); color: #0d1119; font-weight: 700; font-size: 16px; padding: 14px 36px; border-radius: 8px; text-decoration: none;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 20px;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;

  try {
    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: `"${from.name}" <${from.email}>`,
        to: toEmail,
        subject,
        html,
      });
      console.log(`[Team] Invitation email sent via SMTP to ${toEmail}`);
    } else if (sgKey) {
      sgMail.setApiKey(sgKey);
      await sgMail.send({ to: toEmail, from, subject, html });
      console.log(`[Team] Invitation email sent via SendGrid to ${toEmail}`);
    } else {
      console.warn("[Team] No email provider configured — invitation email NOT sent to", toEmail);
    }
  } catch (err: any) {
    console.error(`[Team] Failed to send invitation email to ${toEmail}:`, err.message);
  }
}

const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

export function registerTeamRoutes(app: Express) {
  app.get("/api/team/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      const members = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.ownerId, userId));

      const total = members.length;
      const active = members.filter((m) => m.status === "active").length;
      const pending = members.filter((m) => m.status === "invited").length;

      res.json({ total, active, pending });
    } catch (error: any) {
      console.error("[Team] Stats error:", error);
      res.status(500).json({ message: "Failed to fetch team stats" });
    }
  });

  app.get("/api/team/members", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      const members = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.ownerId, userId))
        .orderBy(desc(teamMembers.invitedAt));

      res.json(members);
    } catch (error: any) {
      console.error("[Team] List members error:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post("/api/team/members", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { email, name, role } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const validRoles = ["admin", "manager", "member"];
      const memberRole = validRoles.includes(role) ? role : "member";

      const existing = await db
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.ownerId, userId), eq(teamMembers.email, email)));

      if (existing.length > 0) {
        return res.status(400).json({ message: "This email is already on your team" });
      }

      const [member] = await db
        .insert(teamMembers)
        .values({
          ownerId: userId,
          email,
          name: name || null,
          role: memberRole,
          status: "invited",
        })
        .returning();

      const [inviter] = await db.select().from(users).where(eq(users.id, userId));
      const inviterName = inviter
        ? `${inviter.firstName || ""} ${inviter.lastName || ""}`.trim() || inviter.email
        : "Your colleague";
      const inviterCompany = inviter?.companyName || "Argilette";

      sendTeamInviteEmail(email, name || null, inviterName, inviterCompany, memberRole);

      res.json(member);
    } catch (error: any) {
      console.error("[Team] Invite member error:", error);
      res.status(500).json({ message: "Failed to invite team member" });
    }
  });

  app.put("/api/team/members/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;
      const { role, status } = req.body;

      const updates: Record<string, any> = {};
      if (role) {
        const validRoles = ["admin", "manager", "member"];
        if (validRoles.includes(role)) updates.role = role;
      }
      if (status) {
        const validStatuses = ["invited", "active", "disabled"];
        if (validStatuses.includes(status)) {
          updates.status = status;
          if (status === "active") {
            updates.joinedAt = new Date();
          }
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid updates provided" });
      }

      const [updated] = await db
        .update(teamMembers)
        .set(updates)
        .where(sql`${teamMembers.id} = ${id} AND ${teamMembers.ownerId} = ${userId}`)
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Team member not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("[Team] Update member error:", error);
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  app.post("/api/team/members/:id/resend", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;

      const [member] = await db
        .select()
        .from(teamMembers)
        .where(sql`${teamMembers.id} = ${id} AND ${teamMembers.ownerId} = ${userId}`);

      if (!member) {
        return res.status(404).json({ message: "Team member not found" });
      }
      if (member.status !== "invited") {
        return res.status(400).json({ message: "This member has already joined" });
      }

      const [inviter] = await db.select().from(users).where(eq(users.id, userId));
      const inviterName = inviter
        ? `${inviter.firstName || ""} ${inviter.lastName || ""}`.trim() || inviter.email
        : "Your colleague";
      const inviterCompany = inviter?.companyName || "Argilette";

      await sendTeamInviteEmail(member.email, member.name, inviterName, inviterCompany, member.role);

      res.json({ success: true, message: "Invitation email resent" });
    } catch (error: any) {
      console.error("[Team] Resend invite error:", error);
      res.status(500).json({ message: "Failed to resend invitation" });
    }
  });

  app.delete("/api/team/members/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;

      const [deleted] = await db
        .delete(teamMembers)
        .where(sql`${teamMembers.id} = ${id} AND ${teamMembers.ownerId} = ${userId}`)
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Team member not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Team] Delete member error:", error);
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  app.get("/api/team/assignments", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      const assignments = await db
        .select()
        .from(leadAssignments)
        .where(eq(leadAssignments.assignedBy, userId))
        .orderBy(desc(leadAssignments.createdAt));

      res.json(assignments);
    } catch (error: any) {
      console.error("[Team] List assignments error:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.post("/api/team/assignments", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { leadId, assignedTo, notes } = req.body;

      if (!leadId || !assignedTo) {
        return res.status(400).json({ message: "Lead and team member are required" });
      }

      const [assignment] = await db
        .insert(leadAssignments)
        .values({
          leadId,
          assignedTo,
          assignedBy: userId,
          notes: notes || null,
        })
        .returning();

      res.json(assignment);
    } catch (error: any) {
      console.error("[Team] Create assignment error:", error);
      res.status(500).json({ message: "Failed to assign lead" });
    }
  });

  app.delete("/api/team/assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { id } = req.params;

      const [deleted] = await db
        .delete(leadAssignments)
        .where(sql`${leadAssignments.id} = ${id} AND ${leadAssignments.assignedBy} = ${userId}`)
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Team] Delete assignment error:", error);
      res.status(500).json({ message: "Failed to remove assignment" });
    }
  });
}
