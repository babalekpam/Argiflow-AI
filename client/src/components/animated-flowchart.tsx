import { useState, useEffect } from "react";
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
  icon: any;
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

const NODES: FlowNode[] = [
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

const EDGES: FlowEdge[] = [
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

function buildEdgePath(from: FlowNode, to: FlowNode, edgeType?: string): string {
  const fc = getNodeCenter(from);
  const tc = getNodeCenter(to);

  if (from.id === "qualified" && to.id === "nurture") {
    const startX = from.x + from.width;
    const startY = fc.y;
    const endX = to.x;
    const endY = tc.y;
    return `M ${startX} ${startY} C ${startX + 60} ${startY}, ${endX - 60} ${endY}, ${endX} ${endY}`;
  }

  if (from.id === "nurture" && to.id === "qualified") {
    const startX = tc.x + from.width / 2 + 20;
    const startY = to.y + to.height / 2;
    const endX = from.x + from.width / 2;
    const endY = from.y + from.height;
    return `M ${endX} ${endY} L ${endX} ${endY + 20} C ${endX} ${startY - 40}, ${startX + 40} ${startY - 40}, ${startX} ${startY}`;
  }

  if (from.id === "interested" && to.id === "followup") {
    const startX = from.x + from.width;
    const startY = fc.y;
    const endX = to.x;
    const endY = tc.y;
    return `M ${startX} ${startY} C ${startX + 60} ${startY}, ${endX - 60} ${endY}, ${endX} ${endY}`;
  }

  if (from.id === "followup" && to.id === "interested") {
    const startX = to.x + to.width / 2 + 20;
    const startY = to.y + to.height / 2;
    const endX = from.x + from.width / 2;
    const endY = from.y + from.height;
    return `M ${endX} ${endY} L ${endX} ${endY + 20} C ${endX} ${startY - 40}, ${startX + 40} ${startY - 40}, ${startX} ${startY}`;
  }

  if (from.id === "close" && to.id === "lost") {
    const startX = from.x + from.width;
    const startY = fc.y;
    const endX = to.x;
    const endY = tc.y;
    return `M ${startX} ${startY} C ${startX + 60} ${startY}, ${endX - 60} ${endY}, ${endX} ${endY}`;
  }

  if (from.id === "lost" && to.id === "nurture") {
    const startX = tc.x;
    const startY = to.y;
    const endX = from.x + from.width / 2;
    const endY = from.y;
    return `M ${endX} ${endY} L ${endX} ${startY}`;
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
  const Icon = node.icon;
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
        {node.label}
      </text>
      {node.sublabel && (
        <text
          x={node.x + 36}
          y={node.y + 38}
          fill="#94a3b8"
          fontSize="9.5"
          className="pointer-events-none select-none"
        >
          {node.sublabel}
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

export function AnimatedFlowchart({ compact = false }: { compact?: boolean }) {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const nodeIds = NODES.map(n => n.id);
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
  }, []);

  const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));
  const svgWidth = 560;
  const svgHeight = compact ? 700 : 1050;

  const getEdgeLabelPos = (edge: FlowEdge): { x: number; y: number } | null => {
    if (!edge.label && !edge.type) return null;
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

  return (
    <Card className="p-0 overflow-visible relative" data-testid="card-animated-flowchart">
      <div className="p-4 pb-2 flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold" data-testid="text-flowchart-title">AI Client Acquisition Pipeline</h3>
          <p className="text-xs text-muted-foreground">Click any step to learn more</p>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0 no-default-hover-elevate no-default-active-elevate">
          <Sparkles className="w-3 h-3 mr-1" />
          Live
        </Badge>
      </div>

      <div
        className="w-full overflow-x-auto overflow-y-visible pb-4"
        style={{ minHeight: compact ? 480 : 700 }}
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

          {EDGES.map((edge, i) => {
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

          {NODES.map((node, i) => {
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
              <p className="text-xs text-muted-foreground mt-1">
                {getNodeDescription(activeNodeData.id)}
              </p>
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
          <p className="text-base font-bold text-primary">24/7</p>
          <p className="text-[10px] text-muted-foreground">Always Active</p>
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: "#34d399" }}>5x</p>
          <p className="text-[10px] text-muted-foreground">More Appointments</p>
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: "#a78bfa" }}>80%</p>
          <p className="text-[10px] text-muted-foreground">Less Manual Work</p>
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
