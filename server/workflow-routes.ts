// ============================================================
// ARGILETTE WORKFLOW ENGINE — API ROUTES
// Drop this into: server/workflow-routes.ts
//
// Then in routes.ts, add:
//   import { registerWorkflowRoutes } from "./workflow-routes";
//   // After all existing routes, before return:
//   registerWorkflowRoutes(app);
// ============================================================

import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";
import { z } from "zod";
import {
  workflows,
  workflowNodes,
  workflowEdges,
  workflowExecutions,
  workflowExecutionSteps,
  TRIGGER_TYPES,
  ACTION_TYPES,
  WORKFLOW_TEMPLATES,
  type InsertWorkflow,
  type InsertWorkflowNode,
  type InsertWorkflowEdge,
} from "@shared/workflow-schema";
import { eventBus, executeWorkflow, type WorkflowEvent } from "./workflow-engine";

// ============================================================
// AUTH MIDDLEWARE (same as existing)
// ============================================================

const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// ============================================================
// REGISTER ALL WORKFLOW ROUTES
// ============================================================

export function registerWorkflowRoutes(app: Express) {
  // ========================================
  // WORKFLOW CRUD
  // ========================================

  // List all workflows for the user
  app.get("/api/workflows", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const category = req.query.category as string | undefined;

      let query = db
        .select()
        .from(workflows)
        .where(eq(workflows.userId, userId))
        .orderBy(desc(workflows.updatedAt));

      const results = await query;

      // Filter by category if specified
      const filtered = category
        ? results.filter(w => w.category === category)
        : results;

      res.json(filtered);
    } catch (error: any) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ message: "Failed to fetch workflows" });
    }
  });

  // Get single workflow with nodes and edges
  app.get("/api/workflows/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, req.params.id), eq(workflows.userId, userId)));

      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      const nodes = await db
        .select()
        .from(workflowNodes)
        .where(eq(workflowNodes.workflowId, workflow.id))
        .orderBy(asc(workflowNodes.sortOrder));

      const edges = await db
        .select()
        .from(workflowEdges)
        .where(eq(workflowEdges.workflowId, workflow.id));

      res.json({ ...workflow, nodes, edges });
    } catch (error: any) {
      console.error("Error fetching workflow:", error);
      res.status(500).json({ message: "Failed to fetch workflow" });
    }
  });

  // Create workflow
  app.post("/api/workflows", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const schema = z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        triggerType: z.string().min(1),
        triggerConfig: z.string().optional(),
        status: z.enum(["draft", "active", "paused"]).optional(),
        category: z.string().max(50).optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }

      const [workflow] = await db
        .insert(workflows)
        .values({
          userId,
          name: parsed.data.name,
          description: parsed.data.description || null,
          triggerType: parsed.data.triggerType,
          triggerConfig: parsed.data.triggerConfig || "{}",
          status: parsed.data.status || "draft",
          category: parsed.data.category || null,
        })
        .returning();

      res.json(workflow);
    } catch (error: any) {
      console.error("Error creating workflow:", error);
      res.status(500).json({ message: "Failed to create workflow" });
    }
  });

  // Update workflow
  app.patch("/api/workflows/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { name, description, triggerType, triggerConfig, status, category } = req.body;

      const data: Record<string, any> = { updatedAt: new Date() };
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (triggerType !== undefined) data.triggerType = triggerType;
      if (triggerConfig !== undefined) data.triggerConfig = triggerConfig;
      if (status !== undefined) data.status = status;
      if (category !== undefined) data.category = category;

      const [updated] = await db
        .update(workflows)
        .set(data)
        .where(and(eq(workflows.id, req.params.id), eq(workflows.userId, userId)))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating workflow:", error);
      res.status(500).json({ message: "Failed to update workflow" });
    }
  });

  // Delete workflow (cascades to nodes, edges, executions)
  app.delete("/api/workflows/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const workflowId = req.params.id;

      // Verify ownership
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)));

      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      // Delete in order: steps → executions → edges → nodes → workflow
      const executions = await db
        .select({ id: workflowExecutions.id })
        .from(workflowExecutions)
        .where(eq(workflowExecutions.workflowId, workflowId));

      for (const exec of executions) {
        await db.delete(workflowExecutionSteps).where(eq(workflowExecutionSteps.executionId, exec.id));
      }

      await db.delete(workflowExecutions).where(eq(workflowExecutions.workflowId, workflowId));
      await db.delete(workflowEdges).where(eq(workflowEdges.workflowId, workflowId));
      await db.delete(workflowNodes).where(eq(workflowNodes.workflowId, workflowId));
      await db.delete(workflows).where(eq(workflows.id, workflowId));

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting workflow:", error);
      res.status(500).json({ message: "Failed to delete workflow" });
    }
  });

  // ========================================
  // WORKFLOW NODES
  // ========================================

  // Add node to workflow
  app.post("/api/workflows/:id/nodes", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const workflowId = req.params.id;

      // Verify ownership
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)));

      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      const schema = z.object({
        nodeType: z.string().min(1),
        actionType: z.string().min(1),
        label: z.string().min(1).max(200),
        config: z.string().optional(),
        positionX: z.number().optional(),
        positionY: z.number().optional(),
        sortOrder: z.number().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }

      const [node] = await db
        .insert(workflowNodes)
        .values({
          workflowId,
          nodeType: parsed.data.nodeType,
          actionType: parsed.data.actionType,
          label: parsed.data.label,
          config: parsed.data.config || "{}",
          positionX: parsed.data.positionX || 0,
          positionY: parsed.data.positionY || 0,
          sortOrder: parsed.data.sortOrder || 0,
        })
        .returning();

      // Bump workflow version
      await db
        .update(workflows)
        .set({ version: sql`${workflows.version} + 1`, updatedAt: new Date() })
        .where(eq(workflows.id, workflowId));

      res.json(node);
    } catch (error: any) {
      console.error("Error creating node:", error);
      res.status(500).json({ message: "Failed to create node" });
    }
  });

  // Update node
  app.patch("/api/workflow-nodes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [node] = await db.select().from(workflowNodes).where(eq(workflowNodes.id, req.params.id));
      if (!node) return res.status(404).json({ message: "Node not found" });
      const [wf] = await db.select().from(workflows).where(and(eq(workflows.id, node.workflowId), eq(workflows.userId, userId)));
      if (!wf) return res.status(404).json({ message: "Node not found" });

      const { label, config, positionX, positionY, sortOrder, actionType } = req.body;
      const data: Record<string, any> = {};
      if (label !== undefined) data.label = label;
      if (config !== undefined) data.config = config;
      if (positionX !== undefined) data.positionX = positionX;
      if (positionY !== undefined) data.positionY = positionY;
      if (sortOrder !== undefined) data.sortOrder = sortOrder;
      if (actionType !== undefined) data.actionType = actionType;

      const [updated] = await db
        .update(workflowNodes)
        .set(data)
        .where(eq(workflowNodes.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating node:", error);
      res.status(500).json({ message: "Failed to update node" });
    }
  });

  app.delete("/api/workflow-nodes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const nodeId = req.params.id;
      const [node] = await db.select().from(workflowNodes).where(eq(workflowNodes.id, nodeId));
      if (!node) return res.status(404).json({ message: "Node not found" });
      const [wf] = await db.select().from(workflows).where(and(eq(workflows.id, node.workflowId), eq(workflows.userId, userId)));
      if (!wf) return res.status(404).json({ message: "Node not found" });

      await db.delete(workflowEdges).where(eq(workflowEdges.sourceNodeId, nodeId));
      await db.delete(workflowEdges).where(eq(workflowEdges.targetNodeId, nodeId));
      await db.delete(workflowNodes).where(eq(workflowNodes.id, nodeId));

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting node:", error);
      res.status(500).json({ message: "Failed to delete node" });
    }
  });

  // Bulk update nodes (for drag-and-drop position changes)
  app.put("/api/workflows/:id/nodes/bulk", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const workflowId = req.params.id;

      const [workflow] = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)));

      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      const { nodes: nodeUpdates } = req.body;
      if (!Array.isArray(nodeUpdates)) {
        return res.status(400).json({ message: "nodes array is required" });
      }

      for (const update of nodeUpdates) {
        if (update.id) {
          const data: Record<string, any> = {};
          if (update.positionX !== undefined) data.positionX = update.positionX;
          if (update.positionY !== undefined) data.positionY = update.positionY;
          if (update.sortOrder !== undefined) data.sortOrder = update.sortOrder;
          if (Object.keys(data).length > 0) {
            await db.update(workflowNodes).set(data).where(eq(workflowNodes.id, update.id));
          }
        }
      }

      res.json({ success: true, updated: nodeUpdates.length });
    } catch (error: any) {
      console.error("Error bulk updating nodes:", error);
      res.status(500).json({ message: "Failed to update nodes" });
    }
  });

  // ========================================
  // WORKFLOW EDGES
  // ========================================

  // Add edge
  app.post("/api/workflows/:id/edges", isAuthenticated, async (req, res) => {
    try {
      const workflowId = req.params.id;
      const schema = z.object({
        sourceNodeId: z.string().min(1),
        targetNodeId: z.string().min(1),
        condition: z.string().optional(),
        label: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }

      const [edge] = await db
        .insert(workflowEdges)
        .values({
          workflowId,
          sourceNodeId: parsed.data.sourceNodeId,
          targetNodeId: parsed.data.targetNodeId,
          condition: parsed.data.condition || "default",
          label: parsed.data.label || null,
        })
        .returning();

      res.json(edge);
    } catch (error: any) {
      console.error("Error creating edge:", error);
      res.status(500).json({ message: "Failed to create edge" });
    }
  });

  app.delete("/api/workflow-edges/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [edge] = await db.select().from(workflowEdges).where(eq(workflowEdges.id, req.params.id));
      if (!edge) return res.status(404).json({ message: "Edge not found" });
      const [wf] = await db.select().from(workflows).where(and(eq(workflows.id, edge.workflowId), eq(workflows.userId, userId)));
      if (!wf) return res.status(404).json({ message: "Edge not found" });

      await db.delete(workflowEdges).where(eq(workflowEdges.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting edge:", error);
      res.status(500).json({ message: "Failed to delete edge" });
    }
  });

  // ========================================
  // WORKFLOW EXECUTION
  // ========================================

  // Manually trigger a workflow
  app.post("/api/workflows/:id/execute", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(and(eq(workflows.id, req.params.id), eq(workflows.userId, userId)));

      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      if (workflow.status === "paused") {
        return res.status(400).json({ message: "Workflow is paused. Activate it first." });
      }

      // Build event from request body or use defaults
      const event: WorkflowEvent = {
        type: workflow.triggerType as any,
        userId,
        entityId: req.body.entityId,
        entityType: req.body.entityType,
        data: req.body.data || req.body || {},
        timestamp: new Date(),
      };

      // Execute async — return immediately
      const executionId = await executeWorkflow(workflow, event);

      res.json({
        success: true,
        executionId,
        message: `Workflow "${workflow.name}" triggered`,
      });
    } catch (error: any) {
      console.error("Error executing workflow:", error);
      res.status(500).json({ message: "Failed to execute workflow" });
    }
  });

  // Get executions for a workflow
  app.get("/api/workflows/:id/executions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const workflowId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 20;

      const executions = await db
        .select()
        .from(workflowExecutions)
        .where(
          and(
            eq(workflowExecutions.workflowId, workflowId),
            eq(workflowExecutions.userId, userId)
          )
        )
        .orderBy(desc(workflowExecutions.startedAt))
        .limit(limit);

      res.json(executions);
    } catch (error: any) {
      console.error("Error fetching executions:", error);
      res.status(500).json({ message: "Failed to fetch executions" });
    }
  });

  // Get execution details (with steps)
  app.get("/api/workflow-executions/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [execution] = await db
        .select()
        .from(workflowExecutions)
        .where(
          and(
            eq(workflowExecutions.id, req.params.id),
            eq(workflowExecutions.userId, userId)
          )
        );

      if (!execution) {
        return res.status(404).json({ message: "Execution not found" });
      }

      const steps = await db
        .select()
        .from(workflowExecutionSteps)
        .where(eq(workflowExecutionSteps.executionId, execution.id))
        .orderBy(asc(workflowExecutionSteps.createdAt));

      // Enrich steps with node labels
      const nodeIds = [...new Set(steps.map(s => s.nodeId))];
      const nodeMap = new Map<string, string>();
      if (nodeIds.length > 0) {
        const nodeRecords = await db
          .select({ id: workflowNodes.id, label: workflowNodes.label })
          .from(workflowNodes)
          .where(sql`${workflowNodes.id} = ANY(ARRAY[${sql.raw(nodeIds.map(id => `'${id}'`).join(","))}]::varchar[])`);
        nodeRecords.forEach(n => nodeMap.set(n.id, n.label));
      }

      const enrichedSteps = steps.map(s => ({
        ...s,
        nodeLabel: nodeMap.get(s.nodeId) || "Unknown",
      }));

      res.json({ ...execution, steps: enrichedSteps });
    } catch (error: any) {
      console.error("Error fetching execution details:", error);
      res.status(500).json({ message: "Failed to fetch execution details" });
    }
  });

  // Cancel a running/waiting execution
  app.post("/api/workflow-executions/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [updated] = await db
        .update(workflowExecutions)
        .set({
          status: "cancelled",
          completedAt: new Date(),
          errorMessage: "Manually cancelled by user",
        })
        .where(
          and(
            eq(workflowExecutions.id, req.params.id),
            eq(workflowExecutions.userId, userId)
          )
        )
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Execution not found" });
      }

      res.json({ success: true, execution: updated });
    } catch (error: any) {
      console.error("Error cancelling execution:", error);
      res.status(500).json({ message: "Failed to cancel execution" });
    }
  });

  // ========================================
  // ALL EXECUTIONS (across all workflows)
  // ========================================

  app.get("/api/workflow-executions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;

      let results;
      if (status) {
        results = await db
          .select()
          .from(workflowExecutions)
          .where(
            and(
              eq(workflowExecutions.userId, userId),
              eq(workflowExecutions.status, status)
            )
          )
          .orderBy(desc(workflowExecutions.startedAt))
          .limit(limit);
      } else {
        results = await db
          .select()
          .from(workflowExecutions)
          .where(eq(workflowExecutions.userId, userId))
          .orderBy(desc(workflowExecutions.startedAt))
          .limit(limit);
      }

      res.json(results);
    } catch (error: any) {
      console.error("Error fetching all executions:", error);
      res.status(500).json({ message: "Failed to fetch executions" });
    }
  });

  // ========================================
  // WORKFLOW TEMPLATES
  // ========================================

  // List available templates
  app.get("/api/workflow-templates", isAuthenticated, async (_req, res) => {
    try {
      const templates = WORKFLOW_TEMPLATES.map(t => ({
        key: t.key,
        name: t.name,
        description: t.description,
        category: t.category,
        triggerType: t.triggerType,
        nodeCount: t.nodes.length,
        edgeCount: t.edges.length,
      }));
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  // Create workflow from template
  app.post("/api/workflow-templates/:key/create", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const templateKey = req.params.key;
      const template = WORKFLOW_TEMPLATES.find(t => t.key === templateKey);

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Create the workflow
      const [workflow] = await db
        .insert(workflows)
        .values({
          userId,
          name: req.body.name || template.name,
          description: template.description,
          triggerType: template.triggerType,
          triggerConfig: "{}",
          status: "draft",
          category: template.category,
        })
        .returning();

      // Create nodes
      const createdNodes: { id: string }[] = [];
      for (const nodeTemplate of template.nodes) {
        const [node] = await db
          .insert(workflowNodes)
          .values({
            workflowId: workflow.id,
            ...nodeTemplate,
          })
          .returning();
        createdNodes.push(node);
      }

      // Create edges (mapping template indices to real node IDs)
      for (const edgeTemplate of template.edges) {
        const sourceNode = createdNodes[edgeTemplate.sourceIndex];
        const targetNode = createdNodes[edgeTemplate.targetIndex];
        if (sourceNode && targetNode) {
          await db.insert(workflowEdges).values({
            workflowId: workflow.id,
            sourceNodeId: sourceNode.id,
            targetNodeId: targetNode.id,
            condition: edgeTemplate.condition || "default",
          });
        }
      }

      // Return full workflow
      const nodes = await db
        .select()
        .from(workflowNodes)
        .where(eq(workflowNodes.workflowId, workflow.id));

      const edges = await db
        .select()
        .from(workflowEdges)
        .where(eq(workflowEdges.workflowId, workflow.id));

      res.json({ ...workflow, nodes, edges });
    } catch (error: any) {
      console.error("Error creating from template:", error);
      res.status(500).json({ message: "Failed to create workflow from template" });
    }
  });

  // ========================================
  // WORKFLOW ANALYTICS / DASHBOARD
  // ========================================

  app.get("/api/workflow-analytics", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;

      const allWorkflows = await db
        .select()
        .from(workflows)
        .where(eq(workflows.userId, userId));

      const activeCount = allWorkflows.filter(w => w.status === "active").length;
      const totalRuns = allWorkflows.reduce((sum, w) => sum + (w.totalRuns || 0), 0);
      const successfulRuns = allWorkflows.reduce((sum, w) => sum + (w.successfulRuns || 0), 0);
      const failedRuns = allWorkflows.reduce((sum, w) => sum + (w.failedRuns || 0), 0);

      // Recent executions
      const recentExecutions = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.userId, userId))
        .orderBy(desc(workflowExecutions.startedAt))
        .limit(10);

      // Count by status
      const runningCount = recentExecutions.filter(e => e.status === "running").length;
      const waitingCount = recentExecutions.filter(e => e.status === "waiting").length;

      res.json({
        totalWorkflows: allWorkflows.length,
        activeWorkflows: activeCount,
        totalRuns,
        successfulRuns,
        failedRuns,
        successRate: totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0,
        runningExecutions: runningCount,
        waitingExecutions: waitingCount,
        recentExecutions,
      });
    } catch (error: any) {
      console.error("Error fetching workflow analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ========================================
  // REFERENCE DATA (trigger types, action types)
  // ========================================

  app.get("/api/workflow-config", isAuthenticated, async (_req, res) => {
    res.json({
      triggerTypes: TRIGGER_TYPES,
      actionTypes: ACTION_TYPES,
      templateCount: WORKFLOW_TEMPLATES.length,
    });
  });

  // ========================================
  // EVENT LOG (recent events for debugging)
  // ========================================

  app.get("/api/workflow-events", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const events = eventBus.getRecentEvents(50).filter(e => e.userId === userId);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Manually emit an event (for testing)
  app.post("/api/workflow-events/emit", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { type, entityId, entityType, data } = req.body;

      if (!type) {
        return res.status(400).json({ message: "Event type is required" });
      }

      const event: WorkflowEvent = {
        type,
        userId,
        entityId,
        entityType,
        data: data || {},
        timestamp: new Date(),
      };

      await eventBus.emit(event);

      res.json({ success: true, message: `Event "${type}" emitted` });
    } catch (error: any) {
      console.error("Error emitting event:", error);
      res.status(500).json({ message: "Failed to emit event" });
    }
  });

  console.log("[Workflow Routes] ✅ All workflow API routes registered");
}
