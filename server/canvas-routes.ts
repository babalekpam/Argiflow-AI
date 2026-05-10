// ============================================================
// CANVAS SYSTEM — API ROUTES
// Cloned from workflow-routes.ts for independent canvas rebuild
//
// In routes.ts, add:
//   import { registerCanvasRoutes } from "./canvas-routes";
//   registerCanvasRoutes(app);
// ============================================================

import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import {
  canvases,
  canvasNodes,
  canvasEdges,
  canvasExecutions,
  canvasExecutionSteps,
  CANVAS_TRIGGER_TYPES,
  CANVAS_ACTION_TYPES,
  CANVAS_TEMPLATES,
  type InsertCanvas,
  type InsertCanvasNode,
  type InsertCanvasEdge,
} from "@shared/canvas-schema";
import { canvasEventBus, executeCanvas, type CanvasEvent } from "./canvas-engine";
import { storage } from "./storage";
import { marketingStrategies, websiteProfiles, userSettings, businesses } from "@shared/schema";

// ============================================================
// AUTH MIDDLEWARE
// ============================================================

const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// ============================================================
// AI CLIENT HELPER
// ============================================================

const isValidAnthropicKey = (key?: string) => key && key.startsWith("sk-ant-");

const cvAnthropicConfig: { apiKey: string; baseURL: string } = (() => {
  if (isValidAnthropicKey(process.env.ANTHROPIC_API_KEY)) {
    return { apiKey: process.env.ANTHROPIC_API_KEY!, baseURL: "https://api.anthropic.com" };
  }
  return { apiKey: "", baseURL: "https://api.anthropic.com" };
})();

const cvAnthropic = cvAnthropicConfig.apiKey
  ? new Anthropic({ apiKey: cvAnthropicConfig.apiKey, baseURL: cvAnthropicConfig.baseURL })
  : null;

async function getAIForUser(userId: string): Promise<{ client: Anthropic; model: string }> {
  const settings = await storage.getSettingsByUser(userId);
  const userKey = settings?.anthropicApiKey;
  if (userKey && userKey.startsWith("sk-ant-")) {
    return {
      client: new Anthropic({ apiKey: userKey, baseURL: "https://api.anthropic.com" }),
      model: "claude-sonnet-4-20250514",
    };
  }
  if (cvAnthropic) {
    return { client: cvAnthropic, model: "claude-sonnet-4-20250514" };
  }
  throw new Error("AI_NOT_CONFIGURED");
}

// ============================================================
// REGISTER ALL CANVAS ROUTES
// ============================================================

export function registerCanvasRoutes(app: Express) {
  // ========================================
  // CANVAS CRUD
  // ========================================

  app.get("/api/canvases", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const category = req.query.category as string | undefined;

      const results = await db
        .select()
        .from(canvases)
        .where(eq(canvases.userId, userId))
        .orderBy(desc(canvases.updatedAt));

      const filtered = category ? results.filter(c => c.category === category) : results;
      res.json(filtered);
    } catch (error: any) {
      console.error("Error fetching canvases:", error);
      res.status(500).json({ message: "Failed to fetch canvases" });
    }
  });

  app.get("/api/canvases/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [canvas] = await db
        .select()
        .from(canvases)
        .where(and(eq(canvases.id, req.params.id), eq(canvases.userId, userId)));

      if (!canvas) return res.status(404).json({ message: "Canvas not found" });

      const nodes = await db
        .select()
        .from(canvasNodes)
        .where(eq(canvasNodes.canvasId, canvas.id))
        .orderBy(asc(canvasNodes.sortOrder));

      const edges = await db
        .select()
        .from(canvasEdges)
        .where(eq(canvasEdges.canvasId, canvas.id));

      res.json({ ...canvas, nodes, edges });
    } catch (error: any) {
      console.error("Error fetching canvas:", error);
      res.status(500).json({ message: "Failed to fetch canvas" });
    }
  });

  app.post("/api/canvases", isAuthenticated, async (req, res) => {
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

      const [canvas] = await db
        .insert(canvases)
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

      res.json(canvas);
    } catch (error: any) {
      console.error("Error creating canvas:", error);
      res.status(500).json({ message: "Failed to create canvas" });
    }
  });

  app.patch("/api/canvases/:id", isAuthenticated, async (req, res) => {
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
        .update(canvases)
        .set(data)
        .where(and(eq(canvases.id, req.params.id), eq(canvases.userId, userId)))
        .returning();

      if (!updated) return res.status(404).json({ message: "Canvas not found" });
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating canvas:", error);
      res.status(500).json({ message: "Failed to update canvas" });
    }
  });

  app.delete("/api/canvases/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const canvasId = req.params.id;

      const [canvas] = await db
        .select()
        .from(canvases)
        .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)));

      if (!canvas) return res.status(404).json({ message: "Canvas not found" });

      const executions = await db
        .select({ id: canvasExecutions.id })
        .from(canvasExecutions)
        .where(eq(canvasExecutions.canvasId, canvasId));

      for (const exec of executions) {
        await db.delete(canvasExecutionSteps).where(eq(canvasExecutionSteps.executionId, exec.id));
      }

      await db.delete(canvasExecutions).where(eq(canvasExecutions.canvasId, canvasId));
      await db.delete(canvasEdges).where(eq(canvasEdges.canvasId, canvasId));
      await db.delete(canvasNodes).where(eq(canvasNodes.canvasId, canvasId));
      await db.delete(canvases).where(eq(canvases.id, canvasId));

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting canvas:", error);
      res.status(500).json({ message: "Failed to delete canvas" });
    }
  });

  // ========================================
  // CANVAS NODES
  // ========================================

  app.post("/api/canvases/:id/nodes", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const canvasId = req.params.id;

      const [canvas] = await db
        .select()
        .from(canvases)
        .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)));

      if (!canvas) return res.status(404).json({ message: "Canvas not found" });

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
        .insert(canvasNodes)
        .values({
          canvasId,
          nodeType: parsed.data.nodeType,
          actionType: parsed.data.actionType,
          label: parsed.data.label,
          config: parsed.data.config || "{}",
          positionX: parsed.data.positionX || 0,
          positionY: parsed.data.positionY || 0,
          sortOrder: parsed.data.sortOrder || 0,
        })
        .returning();

      await db
        .update(canvases)
        .set({ version: sql`${canvases.version} + 1`, updatedAt: new Date() })
        .where(eq(canvases.id, canvasId));

      res.json(node);
    } catch (error: any) {
      console.error("Error creating node:", error);
      res.status(500).json({ message: "Failed to create node" });
    }
  });

  app.patch("/api/canvas-nodes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [node] = await db.select().from(canvasNodes).where(eq(canvasNodes.id, req.params.id));
      if (!node) return res.status(404).json({ message: "Node not found" });
      const [cv] = await db.select().from(canvases).where(and(eq(canvases.id, node.canvasId), eq(canvases.userId, userId)));
      if (!cv) return res.status(404).json({ message: "Node not found" });

      const { label, config, positionX, positionY, sortOrder, actionType } = req.body;
      const data: Record<string, any> = {};
      if (label !== undefined) data.label = label;
      if (config !== undefined) data.config = config;
      if (positionX !== undefined) data.positionX = positionX;
      if (positionY !== undefined) data.positionY = positionY;
      if (sortOrder !== undefined) data.sortOrder = sortOrder;
      if (actionType !== undefined) data.actionType = actionType;

      const [updated] = await db
        .update(canvasNodes)
        .set(data)
        .where(eq(canvasNodes.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating node:", error);
      res.status(500).json({ message: "Failed to update node" });
    }
  });

  app.delete("/api/canvas-nodes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const nodeId = req.params.id;
      const [node] = await db.select().from(canvasNodes).where(eq(canvasNodes.id, nodeId));
      if (!node) return res.status(404).json({ message: "Node not found" });
      const [cv] = await db.select().from(canvases).where(and(eq(canvases.id, node.canvasId), eq(canvases.userId, userId)));
      if (!cv) return res.status(404).json({ message: "Node not found" });

      await db.delete(canvasEdges).where(eq(canvasEdges.sourceNodeId, nodeId));
      await db.delete(canvasEdges).where(eq(canvasEdges.targetNodeId, nodeId));
      await db.delete(canvasNodes).where(eq(canvasNodes.id, nodeId));

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting node:", error);
      res.status(500).json({ message: "Failed to delete node" });
    }
  });

  app.put("/api/canvases/:id/nodes/bulk", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const canvasId = req.params.id;

      const [canvas] = await db
        .select()
        .from(canvases)
        .where(and(eq(canvases.id, canvasId), eq(canvases.userId, userId)));

      if (!canvas) return res.status(404).json({ message: "Canvas not found" });

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
            await db.update(canvasNodes).set(data).where(eq(canvasNodes.id, update.id));
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
  // CANVAS EDGES
  // ========================================

  app.post("/api/canvases/:id/edges", isAuthenticated, async (req, res) => {
    try {
      const canvasId = req.params.id;
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
        .insert(canvasEdges)
        .values({
          canvasId,
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

  app.delete("/api/canvas-edges/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [edge] = await db.select().from(canvasEdges).where(eq(canvasEdges.id, req.params.id));
      if (!edge) return res.status(404).json({ message: "Edge not found" });
      const [cv] = await db.select().from(canvases).where(and(eq(canvases.id, edge.canvasId), eq(canvases.userId, userId)));
      if (!cv) return res.status(404).json({ message: "Edge not found" });

      await db.delete(canvasEdges).where(eq(canvasEdges.id, req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting edge:", error);
      res.status(500).json({ message: "Failed to delete edge" });
    }
  });

  // ========================================
  // CANVAS EXECUTION
  // ========================================

  app.post("/api/canvases/:id/execute", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [canvas] = await db
        .select()
        .from(canvases)
        .where(and(eq(canvases.id, req.params.id), eq(canvases.userId, userId)));

      if (!canvas) return res.status(404).json({ message: "Canvas not found" });
      if (canvas.status === "paused") {
        return res.status(400).json({ message: "Canvas is paused. Activate it first." });
      }

      const event: CanvasEvent = {
        type: canvas.triggerType as any,
        userId,
        entityId: req.body.entityId,
        entityType: req.body.entityType,
        data: req.body.data || req.body || {},
        timestamp: new Date(),
      };

      const executionId = await executeCanvas(canvas, event);

      res.json({
        success: true,
        executionId,
        message: `Canvas "${canvas.name}" triggered`,
      });
    } catch (error: any) {
      console.error("Error executing canvas:", error);
      res.status(500).json({ message: "Failed to execute canvas" });
    }
  });

  app.get("/api/canvases/:id/executions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const canvasId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 20;

      const executions = await db
        .select()
        .from(canvasExecutions)
        .where(and(eq(canvasExecutions.canvasId, canvasId), eq(canvasExecutions.userId, userId)))
        .orderBy(desc(canvasExecutions.startedAt))
        .limit(limit);

      res.json(executions);
    } catch (error: any) {
      console.error("Error fetching executions:", error);
      res.status(500).json({ message: "Failed to fetch executions" });
    }
  });

  app.get("/api/canvas-executions/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [execution] = await db
        .select()
        .from(canvasExecutions)
        .where(and(eq(canvasExecutions.id, req.params.id), eq(canvasExecutions.userId, userId)));

      if (!execution) return res.status(404).json({ message: "Execution not found" });

      const steps = await db
        .select()
        .from(canvasExecutionSteps)
        .where(eq(canvasExecutionSteps.executionId, execution.id))
        .orderBy(asc(canvasExecutionSteps.createdAt));

      const nodeIds = [...new Set(steps.map(s => s.nodeId))];
      const nodeMap = new Map<string, string>();
      if (nodeIds.length > 0) {
        const nodeRecords = await db
          .select({ id: canvasNodes.id, label: canvasNodes.label })
          .from(canvasNodes)
          .where(sql`${canvasNodes.id} = ANY(ARRAY[${sql.raw(nodeIds.map(id => `'${id}'`).join(","))}]::varchar[])`);
        nodeRecords.forEach(n => nodeMap.set(n.id, n.label));
      }

      const enrichedSteps = steps.map(s => ({ ...s, nodeLabel: nodeMap.get(s.nodeId) || "Unknown" }));
      res.json({ ...execution, steps: enrichedSteps });
    } catch (error: any) {
      console.error("Error fetching execution details:", error);
      res.status(500).json({ message: "Failed to fetch execution details" });
    }
  });

  app.post("/api/canvas-executions/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [updated] = await db
        .update(canvasExecutions)
        .set({ status: "cancelled", completedAt: new Date(), errorMessage: "Manually cancelled by user" })
        .where(and(eq(canvasExecutions.id, req.params.id), eq(canvasExecutions.userId, userId)))
        .returning();

      if (!updated) return res.status(404).json({ message: "Execution not found" });
      res.json({ success: true, execution: updated });
    } catch (error: any) {
      console.error("Error cancelling execution:", error);
      res.status(500).json({ message: "Failed to cancel execution" });
    }
  });

  // ========================================
  // ALL EXECUTIONS (across all canvases)
  // ========================================

  app.get("/api/canvas-executions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;

      let results;
      if (status) {
        results = await db
          .select()
          .from(canvasExecutions)
          .where(and(eq(canvasExecutions.userId, userId), eq(canvasExecutions.status, status)))
          .orderBy(desc(canvasExecutions.startedAt))
          .limit(limit);
      } else {
        results = await db
          .select()
          .from(canvasExecutions)
          .where(eq(canvasExecutions.userId, userId))
          .orderBy(desc(canvasExecutions.startedAt))
          .limit(limit);
      }

      res.json(results);
    } catch (error: any) {
      console.error("Error fetching all executions:", error);
      res.status(500).json({ message: "Failed to fetch executions" });
    }
  });

  // ========================================
  // CANVAS TEMPLATES
  // ========================================

  app.get("/api/canvas-templates", isAuthenticated, async (_req, res) => {
    try {
      const templates = CANVAS_TEMPLATES.map(t => ({
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

  app.post("/api/canvas-templates/:key/create", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const templateKey = req.params.key;
      const template = CANVAS_TEMPLATES.find(t => t.key === templateKey);

      if (!template) return res.status(404).json({ message: "Template not found" });

      const [canvas] = await db
        .insert(canvases)
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

      const createdNodes: { id: string }[] = [];
      for (const nodeTemplate of template.nodes) {
        const [node] = await db
          .insert(canvasNodes)
          .values({ canvasId: canvas.id, ...nodeTemplate })
          .returning();
        createdNodes.push(node);
      }

      for (const edgeTemplate of template.edges) {
        const sourceNode = createdNodes[edgeTemplate.sourceIndex];
        const targetNode = createdNodes[edgeTemplate.targetIndex];
        if (sourceNode && targetNode) {
          await db.insert(canvasEdges).values({
            canvasId: canvas.id,
            sourceNodeId: sourceNode.id,
            targetNodeId: targetNode.id,
            condition: edgeTemplate.condition || "default",
          });
        }
      }

      const nodes = await db.select().from(canvasNodes).where(eq(canvasNodes.canvasId, canvas.id));
      const edges = await db.select().from(canvasEdges).where(eq(canvasEdges.canvasId, canvas.id));

      res.json({ ...canvas, nodes, edges });
    } catch (error: any) {
      console.error("Error creating from template:", error);
      res.status(500).json({ message: "Failed to create canvas from template" });
    }
  });

  app.post("/api/canvas-templates/:key/ai-generate", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const templateKey = req.params.key;
      const template = CANVAS_TEMPLATES.find(t => t.key === templateKey);

      if (!template) return res.status(404).json({ message: "Template not found" });

      const ai = await getAIForUser(userId);

      const user = await storage.getUserById(userId);
      const [strategy] = await db.select().from(marketingStrategies).where(eq(marketingStrategies.userId, userId)).limit(1);
      const [website] = await db.select().from(websiteProfiles).where(eq(websiteProfiles.userId, userId)).limit(1);
      const userBusinesses = await db.select().from(businesses).where(eq(businesses.userId, userId));

      const companyContext = [
        user?.companyName ? `Company: ${user.companyName}` : "",
        user?.industry ? `Industry: ${user.industry}` : "",
        user?.companyDescription ? `Description: ${user.companyDescription}` : "",
        user?.website ? `Website: ${user.website}` : "",
        strategy?.companyName ? `Strategy Company: ${strategy.companyName}` : "",
        strategy?.industry ? `Strategy Industry: ${strategy.industry}` : "",
        strategy?.strategy ? `Marketing Strategy:\n${strategy.strategy.substring(0, 2000)}` : "",
        website?.services ? `Services: ${website.services}` : "",
        website?.valuePropositions ? `Value Props: ${website.valuePropositions}` : "",
        website?.targetAudience ? `Target Audience: ${website.targetAudience}` : "",
        website?.pricing ? `Pricing: ${website.pricing}` : "",
        website?.contactInfo ? `Contact: ${website.contactInfo}` : "",
        userBusinesses.length > 0 ? `Business Lines: ${userBusinesses.map(b => `${b.name} (${b.industry || "general"})`).join(", ")}` : "",
      ].filter(Boolean).join("\n");

      const templateNodesJson = JSON.stringify(template.nodes.map((n, i) => ({
        index: i,
        nodeType: n.nodeType,
        actionType: n.actionType,
        label: n.label,
        config: n.config,
      })), null, 2);

      const prompt = `You are an AI canvas automation expert. A user wants to create a "${template.name}" canvas for their business.

COMPANY CONTEXT:
${companyContext || "No company information available — use generic professional defaults."}

TEMPLATE STRUCTURE (${template.nodes.length} nodes):
${templateNodesJson}

TEMPLATE DESCRIPTION: ${template.description}

YOUR TASK:
Customize each node's "label" and "config" to be specific to THIS company. Keep the same node structure, types, and action types — only personalize the labels and config values.

For email nodes: Write actual subject lines and short email body snippets relevant to their industry/services.
For SMS nodes: Write actual SMS message text.
For AI nodes: Customize scoring criteria or content topics for their industry.
For condition nodes: Adjust thresholds if appropriate.
For delay nodes: Adjust timing if appropriate for their industry.
For notification nodes: Write specific alert messages.
For CRM/task nodes: Use industry-specific terminology.

Also generate a personalized canvas name and description.

Respond ONLY with valid JSON in this exact format:
{
  "name": "Personalized canvas name",
  "description": "Personalized description",
  "nodes": [
    { "index": 0, "label": "Customized Label", "config": "{...customized config JSON string...}" },
    { "index": 1, "label": "Customized Label", "config": "{...}" }
  ]
}

IMPORTANT:
- Return one entry per node, matching the index from the template.
- The "config" value must be a valid JSON string (escaped properly).
- Keep it professional and specific to the company's industry/services.`;

      const response = await ai.client.messages.create({
        model: ai.model,
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      });

      const aiText = response.content[0]?.type === "text" ? response.content[0].text : "";
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI did not return valid JSON");

      let aiResult: { name: string; description: string; nodes: Array<{ index: number; label: string; config: string }> };
      try {
        aiResult = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error("Failed to parse AI response as JSON");
      }

      const [canvas] = await db
        .insert(canvases)
        .values({
          userId,
          name: aiResult.name || template.name,
          description: aiResult.description || template.description,
          triggerType: template.triggerType,
          triggerConfig: "{}",
          status: "draft",
          category: template.category,
        })
        .returning();

      const createdNodes: { id: string }[] = [];
      for (let i = 0; i < template.nodes.length; i++) {
        const nodeTemplate = template.nodes[i];
        const aiNode = aiResult.nodes?.find(n => n.index === i);

        let safeConfig = nodeTemplate.config;
        if (aiNode?.config) {
          try {
            JSON.parse(aiNode.config);
            safeConfig = aiNode.config;
          } catch {
            console.warn(`[Canvas AI] Invalid config JSON for node ${i}, using template default`);
          }
        }

        const [node] = await db
          .insert(canvasNodes)
          .values({
            canvasId: canvas.id,
            nodeType: nodeTemplate.nodeType,
            actionType: nodeTemplate.actionType,
            label: aiNode?.label || nodeTemplate.label,
            config: safeConfig,
            positionX: nodeTemplate.positionX,
            positionY: nodeTemplate.positionY,
            sortOrder: nodeTemplate.sortOrder,
          })
          .returning();
        createdNodes.push(node);
      }

      for (const edgeTemplate of template.edges) {
        const sourceNode = createdNodes[edgeTemplate.sourceIndex];
        const targetNode = createdNodes[edgeTemplate.targetIndex];
        if (sourceNode && targetNode) {
          await db.insert(canvasEdges).values({
            canvasId: canvas.id,
            sourceNodeId: sourceNode.id,
            targetNodeId: targetNode.id,
            condition: edgeTemplate.condition || "default",
          });
        }
      }

      const nodes = await db.select().from(canvasNodes).where(eq(canvasNodes.canvasId, canvas.id));
      const edges = await db.select().from(canvasEdges).where(eq(canvasEdges.canvasId, canvas.id));

      console.log(`[Canvas AI] Generated personalized canvas "${aiResult.name}" for user ${userId}`);
      res.json({ ...canvas, nodes, edges });
    } catch (error: any) {
      console.error("Error in AI canvas generation:", error);
      if (error.message === "AI_NOT_CONFIGURED") {
        return res.status(400).json({ message: "AI is not configured. Please add your Anthropic API key in Settings." });
      }
      res.status(500).json({ message: "Failed to generate AI canvas. Please try again." });
    }
  });

  // ========================================
  // CANVAS ANALYTICS
  // ========================================

  app.get("/api/canvas-analytics", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;

      const allCanvases = await db.select().from(canvases).where(eq(canvases.userId, userId));

      const activeCount = allCanvases.filter(c => c.status === "active").length;
      const totalRuns = allCanvases.reduce((sum, c) => sum + (c.totalRuns || 0), 0);
      const successfulRuns = allCanvases.reduce((sum, c) => sum + (c.successfulRuns || 0), 0);
      const failedRuns = allCanvases.reduce((sum, c) => sum + (c.failedRuns || 0), 0);

      const recentExecutions = await db
        .select()
        .from(canvasExecutions)
        .where(eq(canvasExecutions.userId, userId))
        .orderBy(desc(canvasExecutions.startedAt))
        .limit(10);

      const runningCount = recentExecutions.filter(e => e.status === "running").length;
      const waitingCount = recentExecutions.filter(e => e.status === "waiting").length;

      res.json({
        totalCanvases: allCanvases.length,
        activeCanvases: activeCount,
        totalRuns,
        successfulRuns,
        failedRuns,
        successRate: totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0,
        runningExecutions: runningCount,
        waitingExecutions: waitingCount,
        recentExecutions,
      });
    } catch (error: any) {
      console.error("Error fetching canvas analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ========================================
  // REFERENCE DATA
  // ========================================

  app.get("/api/canvas-config", isAuthenticated, async (_req, res) => {
    res.json({
      triggerTypes: CANVAS_TRIGGER_TYPES,
      actionTypes: CANVAS_ACTION_TYPES,
      templateCount: CANVAS_TEMPLATES.length,
    });
  });

  // ========================================
  // EVENT LOG
  // ========================================

  app.get("/api/canvas-events", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const events = canvasEventBus.getRecentEvents(50).filter(e => e.userId === userId);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post("/api/canvas-events/emit", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { type, entityId, entityType, data } = req.body;

      if (!type) return res.status(400).json({ message: "Event type is required" });

      const event: CanvasEvent = {
        type,
        userId,
        entityId,
        entityType,
        data: data || {},
        timestamp: new Date(),
      };

      await canvasEventBus.emit(event);
      res.json({ success: true, message: `Event "${type}" emitted` });
    } catch (error: any) {
      console.error("Error emitting event:", error);
      res.status(500).json({ message: "Failed to emit event" });
    }
  });

  console.log("[Canvas Routes] ✅ All canvas API routes registered");
}
