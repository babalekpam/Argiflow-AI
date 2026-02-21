import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { eq, and, sql, count, desc } from "drizzle-orm";
import { teamMembers, leadAssignments, leads } from "@shared/schema";

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
