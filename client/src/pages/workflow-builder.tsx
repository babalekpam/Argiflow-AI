import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Play, Pause, Trash2, Zap, Brain, Mail, MessageSquare,
  Phone, Clock, GitBranch, Target, BarChart3, Calendar, UserCheck,
  FileText, DollarSign, Bell, Search, ChevronRight, ChevronDown,
  Workflow, ArrowRight, CheckCircle2, XCircle, Loader2, Copy,
  Sparkles, MousePointerClick, X, LayoutGrid, List,
  Activity, TrendingUp, Timer, Bot, Globe, Webhook,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";

interface WorkflowNode {
  id: string;
  workflowId: string;
  nodeType: string;
  actionType: string;
  label: string;
  config: string;
  positionX: number;
  positionY: number;
  sortOrder: number;
}

interface WorkflowEdge {
  id: string;
  workflowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition: string;
  label?: string;
}

interface WorkflowData {
  id: string;
  userId: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig: string;
  status: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRunAt?: string;
  category?: string;
  version: number;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: string;
  stepsCompleted: number;
  totalSteps: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

interface WorkflowTemplate {
  key: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  nodeCount: number;
}

async function apiGet(path: string) {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiPost(path: string, data?: any) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiPatch(path: string, data: any) {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiDelete(path: string) {
  const res = await fetch(path, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

const ACTION_ICONS: Record<string, any> = {
  trigger_event: Zap,
  trigger_schedule: Timer,
  trigger_webhook: Webhook,
  trigger_manual: MousePointerClick,
  condition_if: GitBranch,
  condition_switch: GitBranch,
  delay_wait: Clock,
  delay_wait_until: Clock,
  splitter_ab: Target,
  ai_classify: Brain,
  ai_score_lead: Brain,
  ai_generate_content: Sparkles,
  ai_summarize: Brain,
  ai_extract: Brain,
  create_lead: UserCheck,
  update_lead: UserCheck,
  create_appointment: Calendar,
  move_deal: ArrowRight,
  create_funnel_deal: DollarSign,
  update_stats: BarChart3,
  send_email: Mail,
  send_sms: MessageSquare,
  make_voice_call: Phone,
  send_notification: Bell,
  run_agent: Bot,
  trigger_lead_gen: Search,
  call_webhook: Globe,
  log_to_crm: FileText,
  create_task: FileText,
  trigger_workflow: Workflow,
};

const ACTION_CATEGORY_COLORS: Record<string, string> = {
  trigger_event: "#ef4444",
  trigger_schedule: "#ef4444",
  trigger_webhook: "#ef4444",
  trigger_manual: "#ef4444",
  condition_if: "#f59e0b",
  condition_switch: "#f59e0b",
  delay_wait: "#06b6d4",
  delay_wait_until: "#06b6d4",
  splitter_ab: "#f97316",
  ai_classify: "#8b5cf6",
  ai_score_lead: "#8b5cf6",
  ai_generate_content: "#8b5cf6",
  ai_summarize: "#8b5cf6",
  ai_extract: "#8b5cf6",
  create_lead: "#3b82f6",
  update_lead: "#3b82f6",
  create_appointment: "#3b82f6",
  move_deal: "#3b82f6",
  create_funnel_deal: "#3b82f6",
  send_email: "#22c55e",
  send_sms: "#22c55e",
  make_voice_call: "#22c55e",
  send_notification: "#22c55e",
  run_agent: "#ec4899",
  trigger_lead_gen: "#ec4899",
  call_webhook: "#6366f1",
  log_to_crm: "#6366f1",
  create_task: "#6366f1",
  trigger_workflow: "#6366f1",
};

const NODE_PALETTE = [
  {
    category: "Triggers",
    color: "#ef4444",
    items: [
      { actionType: "trigger_event", nodeType: "trigger", label: "Event Trigger", desc: "Fires on platform events" },
      { actionType: "trigger_schedule", nodeType: "trigger", label: "Schedule", desc: "Runs on a cron schedule" },
      { actionType: "trigger_webhook", nodeType: "trigger", label: "Webhook", desc: "Fires on incoming webhook" },
      { actionType: "trigger_manual", nodeType: "trigger", label: "Manual Trigger", desc: "Start manually" },
    ],
  },
  {
    category: "AI Brain",
    color: "#8b5cf6",
    items: [
      { actionType: "ai_classify", nodeType: "action", label: "AI Classify", desc: "Classify text into categories" },
      { actionType: "ai_score_lead", nodeType: "action", label: "AI Lead Score", desc: "Score leads 0-100" },
      { actionType: "ai_generate_content", nodeType: "action", label: "AI Generate", desc: "Create content with Claude" },
      { actionType: "ai_summarize", nodeType: "action", label: "AI Summarize", desc: "Summarize text" },
    ],
  },
  {
    category: "Flow Control",
    color: "#f59e0b",
    items: [
      { actionType: "condition_if", nodeType: "condition", label: "If/Then", desc: "Branch on condition" },
      { actionType: "condition_switch", nodeType: "condition", label: "Switch", desc: "Multi-branch routing" },
      { actionType: "delay_wait", nodeType: "delay", label: "Wait", desc: "Delay execution" },
      { actionType: "splitter_ab", nodeType: "splitter", label: "A/B Split", desc: "Random split test" },
    ],
  },
  {
    category: "CRM Actions",
    color: "#3b82f6",
    items: [
      { actionType: "create_lead", nodeType: "action", label: "Create Lead", desc: "Add to CRM" },
      { actionType: "update_lead", nodeType: "action", label: "Update Lead", desc: "Change status/score" },
      { actionType: "create_appointment", nodeType: "action", label: "Book Appointment", desc: "Schedule meeting" },
      { actionType: "move_deal", nodeType: "action", label: "Move Deal", desc: "Change funnel stage" },
    ],
  },
  {
    category: "Communication",
    color: "#22c55e",
    items: [
      { actionType: "send_email", nodeType: "action", label: "Send Email", desc: "Via SMTP/SendGrid" },
      { actionType: "send_sms", nodeType: "action", label: "Send SMS", desc: "Via Twilio" },
      { actionType: "make_voice_call", nodeType: "action", label: "Voice Call", desc: "AI phone call" },
      { actionType: "send_notification", nodeType: "action", label: "Notify", desc: "In-app notification" },
    ],
  },
  {
    category: "Integrations",
    color: "#6366f1",
    items: [
      { actionType: "run_agent", nodeType: "action", label: "Run Agent", desc: "Trigger AI agent" },
      { actionType: "call_webhook", nodeType: "action", label: "Call Webhook", desc: "POST to external URL" },
      { actionType: "trigger_workflow", nodeType: "action", label: "Trigger Workflow", desc: "Chain workflows" },
      { actionType: "log_to_crm", nodeType: "action", label: "Log Activity", desc: "Record in CRM" },
    ],
  },
];

interface CanvasNodeProps {
  node: WorkflowNode;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onStartConnect: (nodeId: string) => void;
  onEndConnect: (nodeId: string) => void;
  isConnecting: boolean;
}

function CanvasNode({ node, isSelected, onSelect, onDragEnd, onStartConnect, onEndConnect, isConnecting }: CanvasNodeProps) {
  const color = ACTION_CATEGORY_COLORS[node.actionType] || "#8b5cf6";
  const Icon = ACTION_ICONS[node.actionType] || Zap;

  return (
    <motion.div
      data-testid={`canvas-node-${node.id}`}
      className="absolute cursor-grab active:cursor-grabbing group"
      style={{ left: node.positionX, top: node.positionY }}
      drag
      dragMomentum={false}
      onDragEnd={(_, info) => {
        onDragEnd(
          node.positionX + info.offset.x,
          node.positionY + info.offset.y
        );
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div
        className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
          filter: "blur(8px)",
        }}
      />

      {isSelected && (
        <motion.div
          className="absolute -inset-1 rounded-xl"
          style={{ border: `2px solid ${color}`, boxShadow: `0 0 20px ${color}40` }}
          layoutId="selectedRing"
          initial={false}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div
        className="relative w-[180px] rounded-xl border backdrop-blur-sm"
        style={{
          background: `linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%)`,
          borderColor: isSelected ? color : "hsl(var(--border))",
        }}
      >
        <div className="h-1 rounded-t-xl" style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }} />

        <div className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
              <Icon size={14} style={{ color }} />
            </div>
            <span className="text-xs font-semibold truncate flex-1" style={{ color: "hsl(var(--foreground))" }}>{node.label}</span>
          </div>
          <div className="text-[10px] font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>{node.actionType}</div>
        </div>

        {node.nodeType !== "trigger" && (
          <div
            data-testid={`node-input-${node.id}`}
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 cursor-crosshair hover:scale-150 transition-transform"
            style={{ borderColor: color, background: isConnecting ? color : "hsl(var(--card))" }}
            onClick={(e) => { e.stopPropagation(); onEndConnect(node.id); }}
          />
        )}

        <div
          data-testid={`node-output-${node.id}`}
          className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 cursor-crosshair hover:scale-150 transition-transform"
          style={{ borderColor: color, background: "hsl(var(--card))" }}
          onClick={(e) => { e.stopPropagation(); onStartConnect(node.id); }}
        />
      </div>

      {node.nodeType === "trigger" && (
        <motion.div
          className="absolute -inset-3 rounded-xl pointer-events-none"
          style={{ border: `1px solid ${color}20` }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

function CanvasEdge({ edge, nodes }: { edge: WorkflowEdge; nodes: WorkflowNode[] }) {
  const source = nodes.find(n => n.id === edge.sourceNodeId);
  const target = nodes.find(n => n.id === edge.targetNodeId);

  if (!source || !target) return null;

  const sx = source.positionX + 180;
  const sy = source.positionY + 35;
  const tx = target.positionX;
  const ty = target.positionY + 35;

  const dx = Math.abs(tx - sx);
  const cx1 = sx + Math.min(dx * 0.5, 80);
  const cy1 = sy;
  const cx2 = tx - Math.min(dx * 0.5, 80);
  const cy2 = ty;

  const path = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;
  const sourceColor = ACTION_CATEGORY_COLORS[source.actionType] || "#8b5cf6";
  const gradientId = `grad-${edge.id}`;

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={sourceColor} stopOpacity="0.6" />
          <stop offset="100%" stopColor={sourceColor} stopOpacity="0.2" />
        </linearGradient>
      </defs>

      <path d={path} fill="none" stroke={sourceColor} strokeWidth="3" strokeOpacity="0.08" />

      <path
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
        strokeLinecap="round"
      />

      <circle r="3" fill={sourceColor} opacity="0.9">
        <animateMotion dur="3s" repeatCount="indefinite" path={path} />
      </circle>
      <circle r="6" fill={sourceColor} opacity="0.15">
        <animateMotion dur="3s" repeatCount="indefinite" path={path} />
      </circle>

      {edge.condition && edge.condition !== "default" && (
        <text
          x={(sx + tx) / 2}
          y={(sy + ty) / 2 - 10}
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          fontSize="10"
          fontFamily="monospace"
        >
          {edge.condition}
        </text>
      )}
    </g>
  );
}

interface CanvasProps {
  workflow: WorkflowData;
  onUpdate: () => void;
}

function WorkflowCanvas({ workflow, onUpdate }: CanvasProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Triggers"]));
  const canvasRef = useRef<HTMLDivElement>(null);

  const nodes = workflow.nodes || [];
  const edges = workflow.edges || [];

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const addNode = async (item: typeof NODE_PALETTE[0]["items"][0]) => {
    const x = 200 + Math.random() * 400;
    const y = 100 + Math.random() * 300;
    await apiPost(`/api/workflows/${workflow.id}/nodes`, {
      nodeType: item.nodeType,
      actionType: item.actionType,
      label: item.label,
      config: "{}",
      positionX: Math.round(x),
      positionY: Math.round(y),
      sortOrder: nodes.length,
    });
    onUpdate();
  };

  const updateNodePosition = async (nodeId: string, x: number, y: number) => {
    await apiPatch(`/api/workflow-nodes/${nodeId}`, {
      positionX: Math.max(0, Math.round(x)),
      positionY: Math.max(0, Math.round(y)),
    });
    onUpdate();
  };

  const deleteNode = async () => {
    if (!selectedNode) return;
    await apiDelete(`/api/workflow-nodes/${selectedNode}`);
    setSelectedNode(null);
    onUpdate();
  };

  const startConnect = (nodeId: string) => {
    setConnectingFrom(nodeId);
  };

  const endConnect = async (targetId: string) => {
    if (!connectingFrom || connectingFrom === targetId) {
      setConnectingFrom(null);
      return;
    }
    await apiPost(`/api/workflows/${workflow.id}/edges`, {
      sourceNodeId: connectingFrom,
      targetNodeId: targetId,
      condition: "default",
    });
    setConnectingFrom(null);
    onUpdate();
  };

  const canvasWidth = Math.max(1200, ...nodes.map(n => n.positionX + 250));
  const canvasHeight = Math.max(800, ...nodes.map(n => n.positionY + 150));

  return (
    <div className="flex h-full">
      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full border-r overflow-y-auto flex-shrink-0"
            style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between gap-1 mb-4">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
                  <LayoutGrid size={14} className="text-purple-400" />
                  Node Palette
                </h3>
                <button data-testid="button-close-palette" onClick={() => setPaletteOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              </div>

              {NODE_PALETTE.map((category) => (
                <div key={category.category} className="mb-2">
                  <button
                    data-testid={`button-category-${category.category.toLowerCase().replace(/\s/g, "-")}`}
                    onClick={() => toggleCategory(category.category)}
                    className="flex items-center gap-2 w-full py-2 px-2 rounded-lg hover-elevate transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: category.color }} />
                    <span className="text-xs font-semibold flex-1 text-left" style={{ color: "hsl(var(--foreground))" }}>{category.category}</span>
                    {expandedCategories.has(category.category)
                      ? <ChevronDown size={12} className="text-muted-foreground" />
                      : <ChevronRight size={12} className="text-muted-foreground" />
                    }
                  </button>

                  <AnimatePresence>
                    {expandedCategories.has(category.category) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        {category.items.map((item) => {
                          const Icon = ACTION_ICONS[item.actionType] || Zap;
                          return (
                            <motion.button
                              key={item.actionType}
                              data-testid={`button-add-node-${item.actionType}`}
                              onClick={() => addNode(item)}
                              className="flex items-center gap-2 w-full py-2 px-3 ml-2 rounded-lg hover-elevate transition-all group"
                              whileHover={{ x: 2 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              <div
                                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                                style={{ background: `${category.color}15` }}
                              >
                                <Icon size={12} style={{ color: category.color }} />
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <div className="text-[11px] font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>{item.label}</div>
                                <div className="text-[9px] truncate" style={{ color: "hsl(var(--muted-foreground))" }}>{item.desc}</div>
                              </div>
                              <Plus size={10} className="text-muted-foreground flex-shrink-0" />
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 relative overflow-auto" ref={canvasRef} style={{ background: "hsl(var(--background))" }}>
        <div className="sticky top-0 z-20 flex items-center gap-2 p-3 backdrop-blur-sm border-b" style={{ background: "hsl(var(--card) / 0.8)", borderColor: "hsl(var(--border))" }}>
          {!paletteOpen && (
            <button
              data-testid="button-open-palette"
              onClick={() => setPaletteOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 hover-elevate"
              style={{ color: "hsl(var(--foreground))" }}
            >
              <LayoutGrid size={12} /> Nodes
            </button>
          )}

          <div className="flex-1 text-center">
            <span className="text-xs font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
              {nodes.length} nodes · {edges.length} connections
              {connectingFrom && <span className="text-cyan-400 ml-2">Click target node to connect</span>}
            </span>
          </div>

          {selectedNode && (
            <button
              data-testid="button-delete-node"
              onClick={deleteNode}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs text-red-400 flex items-center gap-1.5"
            >
              <Trash2 size={12} /> Delete Node
            </button>
          )}
        </div>

        <div
          className="relative"
          style={{ width: canvasWidth, height: canvasHeight, minHeight: "100%" }}
          onClick={() => { setSelectedNode(null); setConnectingFrom(null); }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            <defs>
              <pattern id="dotGrid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.5" fill="rgba(139,92,246,0.08)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotGrid)" />
          </svg>

          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {edges.map(edge => (
              <CanvasEdge key={edge.id} edge={edge} nodes={nodes} />
            ))}
          </svg>

          <div className="absolute inset-0" style={{ zIndex: 2 }}>
            <AnimatePresence>
              {nodes.map(node => (
                <CanvasNode
                  key={node.id}
                  node={node}
                  isSelected={selectedNode === node.id}
                  onSelect={() => setSelectedNode(node.id)}
                  onDragEnd={(x, y) => updateNodePosition(node.id, x, y)}
                  onStartConnect={startConnect}
                  onEndConnect={endConnect}
                  isConnecting={!!connectingFrom}
                />
              ))}
            </AnimatePresence>
          </div>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                  <Workflow size={28} className="text-purple-400" />
                </div>
                <p className="text-sm mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Empty canvas</p>
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Add nodes from the palette to build your workflow</p>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkflowCard({ workflow, onClick }: { workflow: WorkflowData; onClick: () => void }) {
  const queryClient = useQueryClient();
  const statusColors: Record<string, string> = {
    active: "#22c55e",
    draft: "#6b7280",
    paused: "#f59e0b",
  };
  const color = statusColors[workflow.status] || "#6b7280";

  const toggleStatus = useMutation({
    mutationFn: () => apiPatch(`/api/workflows/${workflow.id}`, {
      status: workflow.status === "active" ? "paused" : "active",
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });

  const deleteWorkflow = useMutation({
    mutationFn: () => apiDelete(`/api/workflows/${workflow.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });

  const executeWorkflow = useMutation({
    mutationFn: () => apiPost(`/api/workflows/${workflow.id}/execute`, { data: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });

  const successRate = workflow.totalRuns > 0
    ? Math.round((workflow.successfulRuns / workflow.totalRuns) * 100)
    : 0;

  return (
    <motion.div
      data-testid={`card-workflow-${workflow.id}`}
      className="group rounded-xl border transition-all cursor-pointer relative overflow-visible"
      style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}
      whileHover={{ y: -2 }}
      onClick={onClick}
    >
      <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${color}, ${color}40)` }} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-1 mb-3">
          <div className="flex-1 min-w-0">
            <h3 data-testid={`text-workflow-name-${workflow.id}`} className="text-sm font-bold truncate" style={{ color: "hsl(var(--foreground))" }}>{workflow.name}</h3>
            <p className="text-[10px] mt-0.5 truncate" style={{ color: "hsl(var(--muted-foreground))" }}>{workflow.description || workflow.triggerType}</p>
          </div>
          <div
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
            style={{ background: `${color}15`, color }}
          >
            {workflow.status}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <div className="flex items-center gap-1 text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
            <Activity size={10} /> {workflow.totalRuns} runs
          </div>
          <div className="flex items-center gap-1 text-[10px] text-green-400/60">
            <CheckCircle2 size={10} /> {successRate}%
          </div>
          {workflow.category && (
            <div className="flex items-center gap-1 text-[10px] text-purple-400/60">
              <FileText size={10} /> {workflow.category}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
          <button
            data-testid={`button-run-workflow-${workflow.id}`}
            onClick={() => executeWorkflow.mutate()}
            disabled={executeWorkflow.isPending}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[10px] font-medium transition-colors"
          >
            {executeWorkflow.isPending ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
            Run
          </button>
          <button
            data-testid={`button-toggle-workflow-${workflow.id}`}
            onClick={() => toggleStatus.mutate()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors hover-elevate"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            {workflow.status === "active" ? <Pause size={10} /> : <Play size={10} />}
            {workflow.status === "active" ? "Pause" : "Activate"}
          </button>
          <button
            data-testid={`button-delete-workflow-${workflow.id}`}
            onClick={() => { if (confirm("Delete this workflow?")) deleteWorkflow.mutate(); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-500/10 text-[10px] transition-colors ml-auto"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function TemplateCard({ template, onCreate }: { template: WorkflowTemplate; onCreate: () => void }) {
  const categoryColors: Record<string, string> = {
    "Lead Management": "#3b82f6",
    "Email Automation": "#22c55e",
    "Client Onboarding": "#f59e0b",
    "Revenue": "#ef4444",
    "Marketing": "#8b5cf6",
    "Reputation": "#ec4899",
  };
  const color = categoryColors[template.category] || "#8b5cf6";

  return (
    <motion.div
      data-testid={`card-template-${template.key}`}
      className="rounded-xl border p-4 transition-all"
      style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}
      whileHover={{ y: -1 }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
          <Sparkles size={16} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 data-testid={`text-template-name-${template.key}`} className="text-xs font-bold" style={{ color: "hsl(var(--foreground))" }}>{template.name}</h4>
          <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{template.description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${color}10`, color }}>{template.category}</span>
          <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{template.nodeCount} nodes</span>
        </div>
        <button
          data-testid={`button-use-template-${template.key}`}
          onClick={onCreate}
          className="flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold transition-colors"
          style={{ background: `${color}15`, color }}
        >
          <Copy size={10} /> Use Template
        </button>
      </div>
    </motion.div>
  );
}

function ExecutionRow({ exec }: { exec: WorkflowExecution }) {
  const statusConfig: Record<string, { color: string; icon: any }> = {
    completed: { color: "#22c55e", icon: CheckCircle2 },
    running: { color: "#3b82f6", icon: Loader2 },
    failed: { color: "#ef4444", icon: XCircle },
    waiting: { color: "#f59e0b", icon: Clock },
    cancelled: { color: "#6b7280", icon: XCircle },
  };
  const { color, icon: StatusIcon } = statusConfig[exec.status] || statusConfig.cancelled;

  return (
    <div data-testid={`row-execution-${exec.id}`} className="flex items-center gap-3 py-2 px-3 rounded-lg hover-elevate transition-colors">
      <StatusIcon
        size={14}
        style={{ color }}
        className={exec.status === "running" ? "animate-spin" : ""}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-mono truncate" style={{ color: "hsl(var(--foreground))" }}>{exec.id.slice(0, 8)}...</div>
        <div className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>
          {exec.stepsCompleted}/{exec.totalSteps} steps ·{" "}
          {new Date(exec.startedAt).toLocaleTimeString()}
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase" style={{ color }}>{exec.status}</span>
    </div>
  );
}

type ViewMode = "list" | "editor" | "templates";

export default function WorkflowBuilder() {
  usePageTitle("Workflow Builder");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState("lead_created");
  const queryClient = useQueryClient();

  const { data: workflowList = [], isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => apiGet("/api/workflows"),
  });

  const { data: selectedWorkflow, refetch: refetchWorkflow } = useQuery({
    queryKey: ["workflow", selectedWorkflowId],
    queryFn: () => apiGet(`/api/workflows/${selectedWorkflowId}`),
    enabled: !!selectedWorkflowId && viewMode === "editor",
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["workflow-templates"],
    queryFn: () => apiGet("/api/workflow-templates"),
    enabled: viewMode === "templates",
  });

  const { data: analytics } = useQuery({
    queryKey: ["workflow-analytics"],
    queryFn: () => apiGet("/api/workflow-analytics"),
  });

  const { data: executions = [] } = useQuery({
    queryKey: ["workflow-executions"],
    queryFn: () => apiGet("/api/workflow-executions?limit=20"),
  });

  const createWorkflow = useMutation({
    mutationFn: (data: any) => apiPost("/api/workflows", data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      setSelectedWorkflowId(data.id);
      setViewMode("editor");
      setShowCreateModal(false);
      setNewName("");
    },
  });

  const createFromTemplate = useMutation({
    mutationFn: (key: string) => apiPost(`/api/workflow-templates/${key}/create`, {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      setSelectedWorkflowId(data.id);
      setViewMode("editor");
    },
  });

  const openWorkflow = (id: string) => {
    setSelectedWorkflowId(id);
    setViewMode("editor");
  };

  const backToList = () => {
    setViewMode("list");
    setSelectedWorkflowId(null);
  };

  return (
    <div className="h-full flex flex-col" style={{ color: "hsl(var(--foreground))" }}>
      <motion.header
        className="border-b flex-shrink-0"
        style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card) / 0.8)" }}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="px-6 py-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-4">
            {viewMode === "editor" && (
              <button data-testid="button-back-to-list" onClick={backToList} className="text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight size={16} className="rotate-180" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-red-500 flex items-center justify-center">
                <Workflow size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold">
                  {viewMode === "editor" && selectedWorkflow ? selectedWorkflow.name : "Workflow Automations"}
                </h1>
                <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {viewMode === "editor" ? "Visual Editor" : "Build, automate, scale"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {viewMode !== "editor" && (
              <>
                <div className="flex items-center rounded-lg p-0.5" style={{ background: "hsl(var(--muted) / 0.3)" }}>
                  <button
                    data-testid="button-view-workflows"
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-1 rounded-md text-[10px] font-medium transition-all ${
                      viewMode === "list" ? "bg-purple-500/20 text-purple-400" : "text-muted-foreground"
                    }`}
                  >
                    <List size={12} className="inline mr-1" /> Workflows
                  </button>
                  <button
                    data-testid="button-view-templates"
                    onClick={() => setViewMode("templates")}
                    className={`px-3 py-1 rounded-md text-[10px] font-medium transition-all ${
                      viewMode === "templates" ? "bg-purple-500/20 text-purple-400" : "text-muted-foreground"
                    }`}
                  >
                    <Sparkles size={12} className="inline mr-1" /> Templates
                  </button>
                </div>

                <button
                  data-testid="button-new-workflow"
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-500 hover:to-red-500 text-white text-xs font-bold transition-all"
                >
                  <Plus size={14} /> New Workflow
                </button>
              </>
            )}

            {viewMode === "editor" && selectedWorkflow && (
              <div className="flex items-center gap-2">
                <span
                  data-testid="text-workflow-status"
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                  style={{
                    background: selectedWorkflow.status === "active" ? "#22c55e15" : "#6b728015",
                    color: selectedWorkflow.status === "active" ? "#22c55e" : "#6b7280",
                  }}
                >
                  {selectedWorkflow.status}
                </span>
                <button
                  data-testid="button-toggle-status"
                  onClick={async () => {
                    await apiPatch(`/api/workflows/${selectedWorkflow.id}`, {
                      status: selectedWorkflow.status === "active" ? "paused" : "active",
                    });
                    refetchWorkflow();
                    queryClient.invalidateQueries({ queryKey: ["workflows"] });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-bold flex items-center gap-1"
                >
                  {selectedWorkflow.status === "active" ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Activate</>}
                </button>
                <button
                  data-testid="button-test-run"
                  onClick={async () => {
                    await apiPost(`/api/workflows/${selectedWorkflow.id}/execute`, { data: {} });
                    queryClient.invalidateQueries({ queryKey: ["workflow-executions"] });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center gap-1"
                >
                  <Zap size={12} /> Test Run
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {viewMode === "list" && analytics && (
        <motion.div
          className="px-6 py-4 grid grid-cols-2 md:grid-cols-5 gap-3 flex-shrink-0"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {[
            { label: "Active Workflows", value: analytics.activeWorkflows, icon: Workflow, color: "#8b5cf6" },
            { label: "Total Runs", value: analytics.totalRuns, icon: Activity, color: "#3b82f6" },
            { label: "Success Rate", value: `${analytics.successRate}%`, icon: TrendingUp, color: "#22c55e" },
            { label: "Running Now", value: analytics.runningExecutions, icon: Loader2, color: "#f59e0b" },
            { label: "Waiting", value: analytics.waitingExecutions, icon: Clock, color: "#06b6d4" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}
              className="rounded-xl border backdrop-blur-sm p-3"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon size={12} style={{ color: stat.color }} />
                <span className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{stat.label}</span>
              </div>
              <div className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="flex-1 overflow-auto px-6">
        {viewMode === "list" && (
          <div className="flex gap-6 py-4">
            <div className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="text-purple-400 animate-spin" />
                </div>
              ) : workflowList.length === 0 ? (
                <motion.div
                  className="text-center py-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                    <Workflow size={28} className="text-purple-400" />
                  </div>
                  <h3 className="text-sm font-bold mb-2">No workflows yet</h3>
                  <p className="text-xs mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>Create your first workflow or start from a template</p>
                  <div className="flex items-center gap-2 justify-center flex-wrap">
                    <button
                      data-testid="button-create-blank"
                      onClick={() => setShowCreateModal(true)}
                      className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-bold"
                    >
                      <Plus size={12} className="inline mr-1" /> Create Blank
                    </button>
                    <button
                      data-testid="button-browse-templates"
                      onClick={() => setViewMode("templates")}
                      className="px-4 py-2 rounded-lg text-xs font-bold hover-elevate"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    >
                      <Sparkles size={12} className="inline mr-1" /> Browse Templates
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {workflowList.map((wf: WorkflowData, i: number) => (
                    <motion.div
                      key={wf.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <WorkflowCard workflow={wf} onClick={() => openWorkflow(wf.id)} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="w-72 flex-shrink-0 hidden xl:block">
              <div className="sticky top-4">
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}>
                  <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: "hsl(var(--border))" }}>
                    <Activity size={12} className="text-purple-400" />
                    <span className="text-xs font-bold">Recent Executions</span>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto">
                    {executions.length === 0 ? (
                      <div className="p-6 text-center text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>No executions yet</div>
                    ) : (
                      executions.slice(0, 15).map((exec: WorkflowExecution) => (
                        <ExecutionRow key={exec.id} exec={exec} />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === "editor" && selectedWorkflow && (
          <motion.div
            className="py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="rounded-xl border overflow-hidden" style={{ height: "calc(100vh - 240px)", borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}>
              <WorkflowCanvas
                workflow={selectedWorkflow}
                onUpdate={() => refetchWorkflow()}
              />
            </div>
          </motion.div>
        )}

        {viewMode === "templates" && (
          <motion.div
            className="py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-1">Workflow Templates</h2>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Pre-built automations — activate with one click</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {templates.map((template: WorkflowTemplate, i: number) => (
                <motion.div
                  key={template.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <TemplateCard
                    template={template}
                    onCreate={() => createFromTemplate.mutate(template.key)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl border p-6"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-base font-bold mb-4">Create New Workflow</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-medium mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>Workflow Name</label>
                  <input
                    data-testid="input-workflow-name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Lead Nurture Sequence"
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                    style={{
                      background: "hsl(var(--background))",
                      borderColor: "hsl(var(--border))",
                      color: "hsl(var(--foreground))",
                    }}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium mb-1 block" style={{ color: "hsl(var(--muted-foreground))" }}>Trigger Event</label>
                  <select
                    data-testid="select-trigger-type"
                    value={newTrigger}
                    onChange={(e) => setNewTrigger(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                    style={{
                      background: "hsl(var(--background))",
                      borderColor: "hsl(var(--border))",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    <optgroup label="Lead Events">
                      <option value="lead_created">Lead Created</option>
                      <option value="lead_status_changed">Lead Status Changed</option>
                      <option value="lead_score_threshold">Lead Score Threshold</option>
                      <option value="lead_email_opened">Email Opened</option>
                      <option value="lead_email_clicked">Email Clicked</option>
                    </optgroup>
                    <optgroup label="Appointments">
                      <option value="appointment_booked">Appointment Booked</option>
                      <option value="appointment_completed">Appointment Completed</option>
                    </optgroup>
                    <optgroup label="Deals">
                      <option value="deal_created">Deal Created</option>
                      <option value="deal_stage_changed">Deal Stage Changed</option>
                      <option value="deal_won">Deal Won</option>
                    </optgroup>
                    <optgroup label="System">
                      <option value="scheduled">Scheduled</option>
                      <option value="webhook_received">Webhook Received</option>
                      <option value="manual">Manual</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <button
                  data-testid="button-cancel-create"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium hover-elevate"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  Cancel
                </button>
                <button
                  data-testid="button-submit-create"
                  onClick={() => createWorkflow.mutate({
                    name: newName || "Untitled Workflow",
                    triggerType: newTrigger,
                    status: "draft",
                  })}
                  disabled={createWorkflow.isPending}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-red-600 text-white text-xs font-bold flex items-center justify-center gap-1"
                >
                  {createWorkflow.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
