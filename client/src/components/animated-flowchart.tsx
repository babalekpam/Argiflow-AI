import { useState, useEffect, useMemo } from "react";
import {
  Globe,
  Target,
  Bot,
  Calendar,
  Phone,
  TrendingUp,
  Users,
  Mail,
  MessageSquare,
  BarChart3,
  CheckCircle,
  XCircle,
  Zap,
  Sparkles,
  Clock,
  Bell,
  FileText,
  GitBranch,
  Webhook,
  Star,
  Send,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FlowNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  sublabel?: string;
  type: "process" | "decision" | "start" | "end";
  icon: LucideIcon;
  color: string;
  glow: string;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  type?: "yes" | "no" | "default";
  path?: string;
}

export interface WorkflowNodeData {
  id: string;
  nodeType: string;
  actionType: string;
  label: string;
  config: string;
  positionX: number;
  positionY: number;
  sortOrder: number;
}

export interface WorkflowEdgeData {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;
  label?: string | null;
}

export interface WorkflowData {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  nodes: WorkflowNodeData[];
  edges: WorkflowEdgeData[];
}

const ACTION_VISUAL: Record<string, { icon: LucideIcon; color: string; glow: string }> = {
  trigger_event: { icon: Zap, color: "#38bdf8", glow: "rgba(56,189,248,0.3)" },
  trigger_schedule: { icon: Clock, color: "#38bdf8", glow: "rgba(56,189,248,0.3)" },
  trigger_webhook: { icon: Webhook, color: "#38bdf8", glow: "rgba(56,189,248,0.3)" },
  ai_score_lead: { icon: Star, color: "#a78bfa", glow: "rgba(167,139,250,0.2)" },
  ai_classify_lead: { icon: Bot, color: "#a78bfa", glow: "rgba(167,139,250,0.2)" },
  ai_generate_content: { icon: Sparkles, color: "#a78bfa", glow: "rgba(167,139,250,0.2)" },
  ai_generate_email: { icon: Bot, color: "#a78bfa", glow: "rgba(167,139,250,0.2)" },
  send_email: { icon: Mail, color: "#34d399", glow: "rgba(52,211,153,0.2)" },
  send_sms: { icon: MessageSquare, color: "#34d399", glow: "rgba(52,211,153,0.2)" },
  send_notification: { icon: Bell, color: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
  condition_switch: { icon: GitBranch, color: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
  condition_if: { icon: GitBranch, color: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
  delay_wait: { icon: Clock, color: "#94a3b8", glow: "rgba(148,163,184,0.2)" },
  update_lead: { icon: Users, color: "#38bdf8", glow: "rgba(56,189,248,0.2)" },
  create_task: { icon: FileText, color: "#38bdf8", glow: "rgba(56,189,248,0.2)" },
  log_to_crm: { icon: BarChart3, color: "#38bdf8", glow: "rgba(56,189,248,0.2)" },
  voice_call: { icon: Phone, color: "#34d399", glow: "rgba(52,211,153,0.2)" },
  make_voice_call: { icon: Phone, color: "#34d399", glow: "rgba(52,211,153,0.2)" },
  create_lead: { icon: Users, color: "#38bdf8", glow: "rgba(56,189,248,0.2)" },
  create_appointment: { icon: Calendar, color: "#34d399", glow: "rgba(52,211,153,0.2)" },
  book_appointment: { icon: Calendar, color: "#34d399", glow: "rgba(52,211,153,0.2)" },
  webhook_call: { icon: Webhook, color: "#a78bfa", glow: "rgba(167,139,250,0.2)" },
  ab_split: { icon: GitBranch, color: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
};

const NODE_TYPE_VISUAL: Record<string, { icon: LucideIcon; color: string; glow: string }> = {
  trigger: { icon: Zap, color: "#38bdf8", glow: "rgba(56,189,248,0.3)" },
  action: { icon: Send, color: "#34d399", glow: "rgba(52,211,153,0.2)" },
  condition: { icon: GitBranch, color: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
  delay: { icon: Clock, color: "#94a3b8", glow: "rgba(148,163,184,0.2)" },
};

function getVisualForNode(nodeType: string, actionType: string) {
  return ACTION_VISUAL[actionType] || NODE_TYPE_VISUAL[nodeType] || { icon: Zap, color: "#38bdf8", glow: "rgba(56,189,248,0.2)" };
}

function getFlowNodeType(nodeType: string, index: number, total: number): "start" | "end" | "decision" | "process" {
  if (nodeType === "trigger") return "start";
  if (nodeType === "condition") return "decision";
  if (index === total - 1) return "end";
  return "process";
}

function convertWorkflowToFlowData(data: WorkflowData): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const sorted = [...data.nodes].sort((a, b) => a.sortOrder - b.sortOrder);
  const mainColumn: WorkflowNodeData[] = [];
  const branchColumn: WorkflowNodeData[] = [];

  const edgeTargets = new Map<string, string[]>();
  for (const e of data.edges) {
    const existing = edgeTargets.get(e.sourceNodeId) || [];
    existing.push(e.targetNodeId);
    edgeTargets.set(e.sourceNodeId, existing);
  }

  const conditionNodes = new Set(sorted.filter(n => n.nodeType === "condition").map(n => n.id));
  const branchTargets = new Set<string>();

  for (const condId of Array.from(conditionNodes)) {
    const targets = edgeTargets.get(condId) || [];
    const condNode = sorted.find(n => n.id === condId);
    if (!condNode) continue;
    const mainNext = sorted.find(n => n.sortOrder === condNode.sortOrder + 1);
    for (const t of targets) {
      if (mainNext && t !== mainNext.id) {
        branchTargets.add(t);
      }
    }
  }

  for (const node of sorted) {
    if (branchTargets.has(node.id)) {
      branchColumn.push(node);
    } else {
      mainColumn.push(node);
    }
  }

  const nodeWidth = 170;
  const nodeHeight = 60;
  const decisionHeight = 70;
  const decisionWidth = 150;
  const startY = 40;
  const ySpacing = 120;
  const mainX = 80;
  const branchX = 340;

  const flowNodes: FlowNode[] = [];

  for (let i = 0; i < mainColumn.length; i++) {
    const n = mainColumn[i];
    const visual = getVisualForNode(n.nodeType, n.actionType);
    const flowType = getFlowNodeType(n.nodeType, i, mainColumn.length);
    const isDecision = flowType === "decision";
    const w = isDecision ? decisionWidth : nodeWidth;
    const h = isDecision ? decisionHeight : nodeHeight;

    let configHint = "";
    try {
      const cfg = JSON.parse(n.config || "{}");
      if (cfg.template) configHint = cfg.template;
      else if (cfg.hours) configHint = `${cfg.hours}h delay`;
      else if (cfg.priority) configHint = cfg.priority + " priority";
    } catch {}

    flowNodes.push({
      id: n.id,
      x: mainX,
      y: startY + i * ySpacing,
      width: w,
      height: h,
      label: n.label,
      sublabel: configHint || undefined,
      type: flowType,
      icon: visual.icon,
      color: visual.color,
      glow: visual.glow,
    });
  }

  for (let i = 0; i < branchColumn.length; i++) {
    const n = branchColumn[i];
    const visual = getVisualForNode(n.nodeType, n.actionType);
    const parentEdge = data.edges.find(e => e.targetNodeId === n.id);
    const parentNode = parentEdge ? flowNodes.find(fn => fn.id === parentEdge.sourceNodeId) : null;
    const yPos = parentNode ? parentNode.y : startY + (mainColumn.length + i) * ySpacing;

    flowNodes.push({
      id: n.id,
      x: branchX,
      y: yPos,
      width: nodeWidth,
      height: nodeHeight,
      label: n.label,
      sublabel: undefined,
      type: "process",
      icon: visual.icon,
      color: visual.color,
      glow: visual.glow,
    });
  }

  const flowEdges: FlowEdge[] = data.edges.map(e => {
    let edgeType: "yes" | "no" | "default" = "default";
    if (e.edgeType === "condition_true" || e.label === "Yes") edgeType = "yes";
    else if (e.edgeType === "condition_false" || e.label === "No") edgeType = "no";
    else if (branchTargets.has(e.targetNodeId)) edgeType = "no";
    else if (conditionNodes.has(e.sourceNodeId) && !branchTargets.has(e.targetNodeId)) edgeType = "yes";

    return {
      from: e.sourceNodeId,
      to: e.targetNodeId,
      label: e.label || undefined,
      type: edgeType,
    };
  });

  return { nodes: flowNodes, edges: flowEdges };
}

const DEFAULT_NODES: FlowNode[] = [
  { id: "traffic", x: 80, y: 40, width: 160, height: 60, label: "Traffic Sources", sublabel: "Ads, SEO, Social, Cold Outreach", type: "start", icon: Globe, color: "#38bdf8", glow: "rgba(56,189,248,0.3)" },
  { id: "landing", x: 80, y: 150, width: 160, height: 60, label: "Landing Page", sublabel: "Lead capture form & chatbot", type: "process", icon: Target, color: "#38bdf8", glow: "rgba(56,189,248,0.2)" },
  { id: "qualified", x: 80, y: 260, width: 140, height: 70, label: "Lead\nQualified?", sublabel: "", type: "decision", icon: Users, color: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
  { id: "nurture", x: 340, y: 150, width: 160, height: 60, label: "AI Nurturing", sublabel: "Email, SMS, Voice follow-ups", type: "process", icon: Bot, color: "#a78bfa", glow: "rgba(167,139,250,0.2)" },
  { id: "ai_engage", x: 80, y: 380, width: 160, height: 60, label: "AI Agent Engages", sublabel: "Voice AI calls & qualifies", type: "process", icon: Phone, color: "#34d399", glow: "rgba(52,211,153,0.2)" },
  { id: "interested", x: 80, y: 490, width: 140, height: 70, label: "Books\nAppt?", sublabel: "", type: "decision", icon: Calendar, color: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
  { id: "booked", x: 80, y: 610, width: 160, height: 60, label: "Appointment Booked", sublabel: "Auto-scheduled on calendar", type: "process", icon: Calendar, color: "#38bdf8", glow: "rgba(56,189,248,0.2)" },
  { id: "followup", x: 340, y: 490, width: 160, height: 60, label: "Re-engage Sequence", sublabel: "Automated follow-up drips", type: "process", icon: Mail, color: "#a78bfa", glow: "rgba(167,139,250,0.2)" },
  { id: "sales", x: 80, y: 720, width: 160, height: 60, label: "Sales Handoff", sublabel: "Hot lead + full context score", type: "process", icon: MessageSquare, color: "#38bdf8", glow: "rgba(56,189,248,0.2)" },
  { id: "close", x: 80, y: 830, width: 140, height: 70, label: "Deal\nClosed?", sublabel: "", type: "decision", icon: BarChart3, color: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
  { id: "won", x: 80, y: 950, width: 160, height: 60, label: "Closed Won", sublabel: "Revenue + AI onboarding", type: "end", icon: CheckCircle, color: "#34d399", glow: "rgba(52,211,153,0.4)" },
  { id: "lost", x: 340, y: 830, width: 160, height: 60, label: "Back to Nurture", sublabel: "Re-enter pipeline", type: "process", icon: TrendingUp, color: "#f87171", glow: "rgba(248,113,113,0.2)" },
];

const DEFAULT_EDGES: FlowEdge[] = [
  { from: "traffic", to: "landing", type: "default" },
  { from: "landing", to: "qualified", type: "default" },
  { from: "qualified", to: "ai_engage", type: "yes" },
  { from: "qualified", to: "nurture", type: "no" },
  { from: "nurture", to: "qualified", type: "default" },
  { from: "ai_engage", to: "interested", type: "default" },
  { from: "interested", to: "booked", type: "yes" },
  { from: "interested", to: "followup", type: "no" },
  { from: "followup", to: "interested", type: "default" },
  { from: "booked", to: "sales", type: "default" },
  { from: "sales", to: "close", type: "default" },
  { from: "close", to: "won", type: "yes" },
  { from: "close", to: "lost", type: "no" },
  { from: "lost", to: "nurture", type: "default" },
];

function getNodeCenter(node: FlowNode) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function buildEdgePath(from: FlowNode, to: FlowNode, _edgeType?: string): string {
  const fc = getNodeCenter(from);
  const tc = getNodeCenter(to);

  const isHorizontalBranch = Math.abs(from.x - to.x) > 100;
  const isBackward = to.y < from.y;

  if (isHorizontalBranch && !isBackward) {
    const startX = from.x + from.width;
    const startY = fc.y;
    const endX = to.x;
    const endY = tc.y;
    return `M ${startX} ${startY} C ${startX + 60} ${startY}, ${endX - 60} ${endY}, ${endX} ${endY}`;
  }

  if (isBackward && isHorizontalBranch) {
    const startX = from.x + from.width / 2;
    const startY = from.y;
    const endX = to.x + to.width / 2;
    const endY = to.y + to.height;
    return `M ${startX} ${startY} C ${startX} ${startY - 40}, ${endX + 40} ${endY + 40}, ${endX} ${endY}`;
  }

  if (isBackward) {
    const startX = fc.x + 20;
    const startY = from.y;
    const endX = tc.x + 20;
    const endY = to.y + to.height;
    return `M ${startX} ${startY} C ${startX + 40} ${startY - 30}, ${endX + 40} ${endY + 30}, ${endX} ${endY}`;
  }

  return `M ${fc.x} ${from.y + from.height} L ${tc.x} ${to.y}`;
}

function DiamondShape({ node, isActive, onClick }: { node: FlowNode; isActive: boolean; onClick: () => void }) {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const rx = node.width / 2;
  const ry = node.height / 2;

  return (
    <g
      className="cursor-pointer"
      onClick={onClick}
      data-testid={`flownode-${node.id}`}
    >
      {isActive && (
        <polygon
          points={`${cx},${cy - ry - 6} ${cx + rx + 6},${cy} ${cx},${cy + ry + 6} ${cx - rx - 6},${cy}`}
          fill="none"
          stroke={node.color}
          strokeWidth="1"
          opacity="0.3"
          className="animate-pulse"
        />
      )}
      <polygon
        points={`${cx},${cy - ry} ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}`}
        fill={isActive ? node.glow : "rgba(30,35,50,0.9)"}
        stroke={node.color}
        strokeWidth={isActive ? "2" : "1.5"}
        className="transition-all duration-500"
      />
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fill={isActive ? "#fff" : "#ccc"}
        fontSize="11"
        fontWeight="600"
        className="pointer-events-none select-none"
      >
        {node.label.split("\n").map((line, i) => (
          <tspan key={i} x={cx} dy={i === 0 ? 0 : 14}>{line}</tspan>
        ))}
      </text>
    </g>
  );
}

function RectNode({ node, isActive, onClick }: { node: FlowNode; isActive: boolean; onClick: () => void }) {
  const isEnd = node.type === "end";
  const isStart = node.type === "start";

  return (
    <g
      className="cursor-pointer"
      onClick={onClick}
      data-testid={`flownode-${node.id}`}
    >
      {isActive && (
        <rect
          x={node.x - 4}
          y={node.y - 4}
          width={node.width + 8}
          height={node.height + 8}
          rx="10"
          fill="none"
          stroke={node.color}
          strokeWidth="1"
          opacity="0.3"
          className="animate-pulse"
        />
      )}
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx="8"
        fill={isActive ? node.glow : isEnd ? "rgba(52,211,153,0.08)" : isStart ? "rgba(56,189,248,0.08)" : "rgba(30,35,50,0.9)"}
        stroke={node.color}
        strokeWidth={isActive ? "2" : isEnd ? "2" : "1"}
        className="transition-all duration-500"
      />
      <text
        x={node.x + 36}
        y={node.y + (node.sublabel ? 22 : node.height / 2 + 4)}
        fill={isActive ? "#fff" : "#e2e8f0"}
        fontSize="12"
        fontWeight="600"
        className="pointer-events-none select-none"
      >
        {node.label.length > 20 ? node.label.slice(0, 18) + "..." : node.label}
      </text>
      {node.sublabel && (
        <text
          x={node.x + 36}
          y={node.y + 38}
          fill="#94a3b8"
          fontSize="9.5"
          className="pointer-events-none select-none"
        >
          {node.sublabel.length > 28 ? node.sublabel.slice(0, 26) + "..." : node.sublabel}
        </text>
      )}
      <circle
        cx={node.x + 20}
        cy={node.y + (node.sublabel ? 28 : node.height / 2)}
        r="10"
        fill={`${node.color}22`}
        stroke="none"
      />
    </g>
  );
}

function AnimatedParticle({ path, delay, color }: { path: string; delay: number; color: string }) {
  return (
    <>
      <circle r="3" fill={color} opacity="0.9">
        <animateMotion
          dur="3s"
          repeatCount="indefinite"
          begin={`${delay}s`}
          path={path}
        />
      </circle>
      <circle r="6" fill={color} opacity="0.2">
        <animateMotion
          dur="3s"
          repeatCount="indefinite"
          begin={`${delay}s`}
          path={path}
        />
      </circle>
    </>
  );
}

function EdgeLabel({ x, y, text, type }: { x: number; y: number; text: string; type: string }) {
  const bgColor = type === "yes" ? "#059669" : type === "no" ? "#dc2626" : "#475569";
  const textColor = "#fff";

  return (
    <g>
      <rect
        x={x - 14}
        y={y - 8}
        width="28"
        height="16"
        rx="4"
        fill={bgColor}
        opacity="0.9"
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fill={textColor}
        fontSize="9"
        fontWeight="700"
        className="pointer-events-none select-none"
      >
        {text}
      </text>
    </g>
  );
}

interface AnimatedFlowchartProps {
  compact?: boolean;
  workflowData?: WorkflowData | null;
}

export function AnimatedFlowchart({ compact = false, workflowData }: AnimatedFlowchartProps) {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());

  const { nodes: displayNodes, edges: displayEdges, title, subtitle, statusLabel } = useMemo(() => {
    if (workflowData && workflowData.nodes.length > 0) {
      const converted = convertWorkflowToFlowData(workflowData);
      return {
        nodes: converted.nodes,
        edges: converted.edges,
        title: workflowData.name,
        subtitle: workflowData.description || "Your custom automation workflow",
        statusLabel: workflowData.status === "active" ? "Live" : workflowData.status === "draft" ? "Draft" : workflowData.status,
      };
    }
    return {
      nodes: DEFAULT_NODES,
      edges: DEFAULT_EDGES,
      title: "AI Client Acquisition Pipeline",
      subtitle: "Click any step to learn more",
      statusLabel: "Live",
    };
  }, [workflowData]);

  useEffect(() => {
    setVisibleNodes(new Set());
    setActiveNode(null);
    const nodeIds = displayNodes.map(n => n.id);
    let i = 0;
    const timer = setInterval(() => {
      if (i < nodeIds.length) {
        setVisibleNodes(prev => new Set([...Array.from(prev), nodeIds[i]]));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 120);
    return () => clearInterval(timer);
  }, [displayNodes]);

  const nodeMap = Object.fromEntries(displayNodes.map(n => [n.id, n]));

  const maxY = displayNodes.reduce((max, n) => Math.max(max, n.y + n.height), 0);
  const maxX = displayNodes.reduce((max, n) => Math.max(max, n.x + n.width), 0);
  const svgWidth = Math.max(560, maxX + 40);
  const svgHeight = compact ? Math.min(maxY + 60, 700) : maxY + 60;

  const getEdgeLabelPos = (edge: FlowEdge): { x: number; y: number } | null => {
    if (!edge.type || edge.type === "default") return null;
    const from = nodeMap[edge.from];
    const to = nodeMap[edge.to];
    if (!from || !to) return null;
    const fc = getNodeCenter(from);

    if (edge.type === "yes" && from.type === "decision") {
      return { x: fc.x - 20, y: from.y + from.height + 14 };
    }
    if (edge.type === "no" && from.type === "decision") {
      return { x: from.x + from.width + 20, y: fc.y - 2 };
    }
    return null;
  };

  const handleNodeClick = (id: string) => {
    setActiveNode(prev => prev === id ? null : id);
  };

  const activeNodeData = activeNode ? nodeMap[activeNode] : null;

  const statusColor = statusLabel === "Live" || statusLabel === "active" ? "text-emerald-400" : "text-amber-400";

  return (
    <Card className="p-0 overflow-visible relative" data-testid="card-animated-flowchart">
      <div className="p-4 pb-2 flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate" data-testid="text-flowchart-title">{title}</h3>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0 no-default-hover-elevate no-default-active-elevate">
          <Sparkles className={`w-3 h-3 mr-1 ${statusColor}`} />
          {statusLabel}
        </Badge>
      </div>

      <div
        className="w-full overflow-x-auto overflow-y-visible pb-4"
        style={{ minHeight: compact ? 480 : Math.min(svgHeight, 700) }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          height="100%"
          style={{ minWidth: compact ? 340 : 520, maxHeight: compact ? 480 : 700 }}
          className="block mx-auto"
          data-testid="svg-flowchart"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#475569" />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {displayEdges.map((edge, i) => {
            const from = nodeMap[edge.from];
            const to = nodeMap[edge.to];
            if (!from || !to) return null;
            const path = buildEdgePath(from, to, edge.type);
            const isHighlighted = activeNode === edge.from || activeNode === edge.to;
            const edgeColor = edge.type === "yes" ? "#34d399" : edge.type === "no" ? "#f87171" : "#475569";

            return (
              <g key={`edge-${i}`}>
                <path
                  d={path}
                  fill="none"
                  stroke={isHighlighted ? edgeColor : `${edgeColor}88`}
                  strokeWidth={isHighlighted ? "2" : "1.2"}
                  strokeDasharray={edge.type === "no" ? "4 3" : "none"}
                  markerEnd={isHighlighted ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                  className="transition-all duration-500"
                />
                <AnimatedParticle path={path} delay={i * 0.5} color={edgeColor} />
                {(() => {
                  const labelPos = getEdgeLabelPos(edge);
                  if (labelPos && edge.type) {
                    return (
                      <EdgeLabel
                        x={labelPos.x}
                        y={labelPos.y}
                        text={edge.type === "yes" ? "Yes" : "No"}
                        type={edge.type}
                      />
                    );
                  }
                  return null;
                })()}
              </g>
            );
          })}

          {displayNodes.map((node, i) => {
            const isVisible = visibleNodes.has(node.id);
            const isActive = activeNode === node.id;

            return (
              <g
                key={node.id}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateY(0)" : "translateY(10px)",
                  transition: `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s`,
                }}
              >
                {node.type === "decision" ? (
                  <DiamondShape
                    node={node}
                    isActive={isActive}
                    onClick={() => handleNodeClick(node.id)}
                  />
                ) : (
                  <RectNode
                    node={node}
                    isActive={isActive}
                    onClick={() => handleNodeClick(node.id)}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {activeNodeData && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border p-4 z-10 rounded-b-md"
          data-testid="flowchart-detail-panel"
        >
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${activeNodeData.color}15` }}
            >
              <activeNodeData.icon className="w-4 h-4" style={{ color: activeNodeData.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: activeNodeData.color }}>{activeNodeData.label.replace("\n", " ")}</p>
              {activeNodeData.sublabel && (
                <p className="text-xs text-muted-foreground mt-0.5">{activeNodeData.sublabel}</p>
              )}
              {!workflowData && (
                <p className="text-xs text-muted-foreground mt-1">
                  {getNodeDescription(activeNodeData.id)}
                </p>
              )}
            </div>
            <button
              onClick={() => setActiveNode(null)}
              className="text-muted-foreground hover:text-foreground shrink-0"
              data-testid="button-close-detail"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pb-4 pt-2 grid grid-cols-3 gap-3 text-center border-t border-border/30">
        <div>
          <p className="text-base font-bold text-primary">{displayNodes.length}</p>
          <p className="text-[10px] text-muted-foreground">Steps</p>
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: "#34d399" }}>{displayEdges.length}</p>
          <p className="text-[10px] text-muted-foreground">Connections</p>
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: "#a78bfa" }}>
            {workflowData ? (workflowData.status === "active" ? "ON" : "OFF") : "24/7"}
          </p>
          <p className="text-[10px] text-muted-foreground">{workflowData ? "Status" : "Always Active"}</p>
        </div>
      </div>
    </Card>
  );
}

function getNodeDescription(id: string): string {
  const descriptions: Record<string, string> = {
    traffic: "Multi-channel traffic generation through paid ads (Google, Meta), SEO content marketing, social media campaigns, and targeted cold email outreach to drive high-quality prospects into your funnel.",
    landing: "High-converting landing pages with embedded AI chatbots capture visitor information, qualify interest level, and begin the engagement process automatically the moment someone arrives.",
    qualified: "AI scoring algorithms evaluate each lead based on engagement, demographics, and behavioral signals to determine if they meet your ideal customer profile.",
    nurture: "Automated multi-channel nurturing sequences via email, SMS, and voice messages keep unqualified leads warm until they're ready to engage, using personalized AI-generated content.",
    ai_engage: "Your Voice AI agent proactively reaches out to qualified leads, handles objections, answers questions about your services, and guides them toward booking an appointment.",
    interested: "The AI evaluates the conversation outcome to determine if the lead is ready to book an appointment or needs additional nurturing before committing.",
    booked: "Confirmed appointments are automatically added to your calendar with full lead context, reminders are sent to both parties, and your sales team is notified instantly.",
    followup: "Leads who aren't ready yet receive an intelligent re-engagement sequence with varied messaging, offers, and timing optimized by AI to maximize future conversion.",
    sales: "Your sales team receives warm, pre-qualified leads with complete interaction history, lead score, key interests, and recommended talking points for maximum close rate.",
    close: "Final sales stage where your team presents the proposal. AI provides real-time coaching suggestions and handles post-meeting follow-up automatically.",
    won: "Deal closed successfully. AI triggers automated onboarding, welcome sequences, review requests, and identifies upsell opportunities to maximize customer lifetime value.",
    lost: "Lost deals are automatically tagged with loss reasons, re-entered into the nurturing pipeline, and targeted with win-back campaigns at optimal intervals.",
  };
  return descriptions[id] || "";
}

export function CompactFlowchart() {
  const [activeStep, setActiveStep] = useState(0);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    { icon: Globe, label: "Traffic", sublabel: "Multi-channel acquisition", color: "#38bdf8" },
    { icon: Target, label: "Capture", sublabel: "AI-powered lead capture", color: "#38bdf8" },
    { icon: Bot, label: "AI Nurture", sublabel: "24/7 automated follow-up", color: "#a78bfa" },
    { icon: Calendar, label: "Book", sublabel: "Auto appointment setting", color: "#34d399" },
    { icon: Phone, label: "Handoff", sublabel: "Warm lead to sales team", color: "#f59e0b" },
    { icon: TrendingUp, label: "Close", sublabel: "Revenue & retention", color: "#34d399" },
  ];

  return (
    <div className="relative" data-testid="compact-flowchart">
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border/50 -translate-y-1/2 hidden lg:block" />

      <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 hidden lg:block overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary via-chart-4 to-chart-3 rounded-full"
          style={{
            width: `${((activeStep + 1) / steps.length) * 100}%`,
            transition: "width 1s ease-in-out",
          }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 relative z-10">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === activeStep;
          const isPast = i < activeStep;
          const isHovered = hoveredStep === i;

          return (
            <div
              key={i}
              className="flex flex-col items-center text-center cursor-pointer group"
              onMouseEnter={() => setHoveredStep(i)}
              onMouseLeave={() => setHoveredStep(null)}
              data-testid={`flow-step-${i}`}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-2 transition-all duration-500 relative"
                style={{
                  backgroundColor: isActive || isHovered ? `${step.color}20` : isPast ? `${step.color}10` : "rgba(30,35,50,0.6)",
                  border: `2px solid ${isActive || isHovered ? step.color : isPast ? `${step.color}60` : "rgba(100,116,139,0.3)"}`,
                  transform: isActive || isHovered ? "scale(1.1)" : "scale(1)",
                  boxShadow: isActive ? `0 0 20px ${step.color}30` : "none",
                }}
              >
                {isActive && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ backgroundColor: `${step.color}10`, border: `1px solid ${step.color}30` }}
                  />
                )}
                <Icon
                  className="w-6 h-6 transition-colors duration-500"
                  style={{ color: isActive || isHovered || isPast ? step.color : "#64748b" }}
                />
              </div>
              <p
                className="text-xs font-semibold transition-colors duration-300"
                style={{ color: isActive || isHovered ? step.color : isPast ? "#e2e8f0" : "#94a3b8" }}
              >
                {step.label}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight max-w-[100px]">
                {step.sublabel}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
