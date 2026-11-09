import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export type OrchestrationIconKind = "zap" | "branch" | "bot" | "plug" | "badge";

export interface OrchestrationNode {
  id: string;
  label: string;
  sub: string;
  /** Relative position, 0..1 across the canvas. */
  x: number;
  y: number;
  /** Tile size driver (preview used 28-42). */
  r: number;
  color: string;
  icon: OrchestrationIconKind;
  count: number;
}

export interface OrchestrationGraphHandle {
  /** Flare a node (activity pulse ring) as if work just happened there. */
  flare: (nodeId: string) => void;
  /** Send a burst of work particles along every edge that ends at a node. */
  burstInto: (nodeId: string) => void;
}

interface OrchestrationGraphProps {
  nodes: OrchestrationNode[];
  edges: [string, string][];
  selectedId: string | null;
  onSelect: (nodeId: string) => void;
  /** 0..1 — how busy the ambient particle flow should look. */
  activityLevel: number;
  playing: boolean;
}

/**
 * Icon geometry on a 24-unit grid, one realistic icon per object.
 * Copied in style from the approved orchestration preview so the live
 * product matches the design the owner signed off on.
 */
type GeoOp = (string | number)[];
const ICON_GEO: Record<OrchestrationIconKind, GeoOp[]> = {
  zap: [["p", "M13 2L4.5 13.5H11L9.8 22 19 10h-6.5z", "f"]],
  branch: [
    ["c", 6, 5.5, 2.3, "s"],
    ["c", 6, 18.5, 2.3, "s"],
    ["c", 18, 8, 2.3, "s"],
    ["p", "M6 7.8v8.4M18 10.3c0 4.6-5.2 4.3-8.7 5.7", "s"],
  ],
  bot: [
    ["p", "M12 5.5V4", "s"],
    ["c", 12, 3.2, 1.2, "f"],
    ["r", 5, 7, 14, 11, 3, "s"],
    ["c", 9.5, 12, 1.1, "f"],
    ["c", 14.5, 12, 1.1, "f"],
    ["p", "M9.5 15.5h5", "s"],
  ],
  plug: [
    ["p", "M9 2.8V8M15 2.8V8", "s"],
    ["p", "M6 8h12v3.2a6 6 0 0 1-12 0z", "s"],
    ["p", "M12 17.2V21", "s"],
  ],
  badge: [
    ["c", 12, 12, 8.5, "s"],
    ["p", "M8.5 12.4l2.4 2.4 4.6-5", "s"],
  ],
};

/** Same icons as inline SVG, for the detail panel next to the canvas. */
export const ORCHESTRATION_ICON_SVG: Record<OrchestrationIconKind, string> = {
  zap: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.5 13.5H11L9.8 22 19 10h-6.5z"/></svg>',
  branch:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5.5" r="2.3"/><circle cx="6" cy="18.5" r="2.3"/><circle cx="18" cy="8" r="2.3"/><path d="M6 7.8v8.4M18 10.3c0 4.6-5.2 4.3-8.7 5.7"/></svg>',
  bot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5V4"/><circle cx="12" cy="3.2" r="1.2" fill="currentColor"/><rect x="5" y="7" width="14" height="11" rx="3"/><circle cx="9.5" cy="12" r="1.1" fill="currentColor"/><circle cx="14.5" cy="12" r="1.1" fill="currentColor"/><path d="M9.5 15.5h5"/></svg>',
  plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2.8V8M15 2.8V8"/><path d="M6 8h12v3.2a6 6 0 0 1-12 0z"/><path d="M12 17.2V21"/></svg>',
  badge:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.4l2.4 2.4 4.6-5"/></svg>',
};

interface Particle {
  a: string;
  b: string;
  t: number;
  sp: number;
}

const MAX_PARTICLES = 120;

export const OrchestrationGraph = forwardRef<
  OrchestrationGraphHandle,
  OrchestrationGraphProps
>(function OrchestrationGraph(
  { nodes, edges, selectedId, onSelect, activityLevel, playing },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    nodes,
    edges,
    selectedId,
    activityLevel,
    playing,
    particles: [] as Particle[],
    pulses: {} as Record<string, number>,
    frame: 0,
    inView: true,
  });
  stateRef.current.nodes = nodes;
  stateRef.current.edges = edges;
  stateRef.current.selectedId = selectedId;
  stateRef.current.activityLevel = activityLevel;
  stateRef.current.playing = playing;

  const spawn = (a: string, b: string, n: number) => {
    const s = stateRef.current;
    for (let i = 0; i < n; i++) {
      s.particles.push({ a, b, t: Math.random() * 0.25, sp: 0.0035 + Math.random() * 0.004 });
    }
    if (s.particles.length > MAX_PARTICLES) {
      s.particles.splice(0, s.particles.length - MAX_PARTICLES);
    }
  };

  useImperativeHandle(ref, () => ({
    flare: (nodeId: string) => {
      stateRef.current.pulses[nodeId] = 1;
    },
    burstInto: (nodeId: string) => {
      stateRef.current.pulses[nodeId] = 1;
      for (const [a, b] of stateRef.current.edges) {
        if (b === nodeId) spawn(a, b, 4);
      }
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let W = 0;
    let H = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const io = new IntersectionObserver(
      (entries) => {
        stateRef.current.inView = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    io.observe(canvas);

    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    const drawIcon = (kind: OrchestrationIconKind, x: number, y: number, s: number, color: string) => {
      const ops = ICON_GEO[kind] || ICON_GEO.bot;
      ctx.save();
      ctx.translate(x - s, y - s);
      ctx.scale(s / 12, s / 12);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.9;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const op of ops) {
        const mode = op[op.length - 1] as string;
        if (op[0] === "p") {
          const path = new Path2D(op[1] as string);
          if (mode === "f") ctx.fill(path);
          else ctx.stroke(path);
        } else if (op[0] === "c") {
          ctx.beginPath();
          ctx.arc(op[1] as number, op[2] as number, op[3] as number, 0, Math.PI * 2);
          if (mode === "f") ctx.fill();
          else ctx.stroke();
        } else if (op[0] === "r") {
          const rx = op[1] as number, ry = op[2] as number, rw = op[3] as number, rh = op[4] as number, rad = op[5] as number;
          ctx.beginPath();
          ctx.moveTo(rx + rad, ry);
          ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, rad);
          ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, rad);
          ctx.arcTo(rx, ry + rh, rx, ry, rad);
          ctx.arcTo(rx, ry, rx + rw, ry, rad);
          ctx.closePath();
          if (mode === "f") ctx.fill();
          else ctx.stroke();
        }
      }
      ctx.restore();
    };

    const draw = () => {
      const s = stateRef.current;
      s.frame++;
      ctx.clearRect(0, 0, W, H);

      // faint grid dots
      ctx.fillStyle = "rgba(148,163,184,.10)";
      for (let gx = 22; gx < W; gx += 34) {
        for (let gy = 22; gy < H; gy += 34) ctx.fillRect(gx, gy, 2, 2);
      }

      const byId = new Map(s.nodes.map((n) => [n.id, n]));
      const pos = (n: OrchestrationNode) => ({ x: n.x * W, y: n.y * H });

      // edges + ambient flow
      for (const [aId, bId] of s.edges) {
        const a = byId.get(aId);
        const b = byId.get(bId);
        if (!a || !b) continue;
        const pa = pos(a);
        const pb = pos(b);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.strokeStyle = "rgba(100,116,139,.45)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        if (s.playing && s.frame % 22 === 0 && Math.random() < 0.4 * s.activityLevel) {
          spawn(aId, bId, 1);
        }
      }

      // particles (work travelling between stages)
      s.particles = s.particles.filter((p) => p.t <= 1);
      for (const p of s.particles) {
        if (s.playing) p.t += p.sp * 3;
        const na = byId.get(p.a);
        const nb = byId.get(p.b);
        if (!na || !nb) {
          p.t = 2;
          continue;
        }
        const pa = pos(na);
        const pb = pos(nb);
        const x = pa.x + (pb.x - pa.x) * p.t;
        const y = pa.y + (pb.y - pa.y) * p.t;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#7ee2c0";
        ctx.shadowColor = "#34d399";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // nodes: realistic icon tiles with a live count badge
      for (const n of s.nodes) {
        const p = pos(n);
        const pulse = s.pulses[n.id] || 0;
        if (pulse > 0) s.pulses[n.id] = Math.max(0, pulse - 0.012);
        const breathe = s.playing ? Math.sin(s.frame * 0.03 + n.x * 8) * 1.2 : 0;
        const tile = n.r * 1.85 + breathe + pulse * 9;
        const half = tile / 2;
        const rad = Math.min(17, tile * 0.26);

        if (pulse > 0) {
          const ex = half + 16 * pulse;
          rr(p.x - ex, p.y - ex, ex * 2, ex * 2, rad + 8 * pulse);
          ctx.strokeStyle = `rgba(251,191,36,${0.55 * pulse})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,.55)";
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 7;
        const g = ctx.createLinearGradient(p.x - half, p.y - half, p.x + half, p.y + half);
        g.addColorStop(0, "#2a364a");
        g.addColorStop(0.55, "#182233");
        g.addColorStop(1, "#101825");
        rr(p.x - half, p.y - half, tile, tile, rad);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();

        rr(p.x - half, p.y - half, tile, tile, rad);
        ctx.lineWidth = s.selectedId === n.id ? 3 : 2;
        ctx.strokeStyle = n.color;
        ctx.stroke();
        rr(p.x - half + 4, p.y - half + 4, tile - 8, tile * 0.42, rad - 4);
        ctx.strokeStyle = "rgba(255,255,255,.10)";
        ctx.lineWidth = 1;
        ctx.stroke();

        drawIcon(n.icon, p.x, p.y + 1, tile * 0.4, n.color);

        // live status dot, like a real app icon badge
        ctx.beginPath();
        ctx.arc(p.x + half - 9, p.y - half + 9, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = "#34d399";
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "#0d1117";
        ctx.stroke();

        // live count badge on the tile's top-left corner
        const countText = String(n.count);
        ctx.font = "700 11px Inter, system-ui, sans-serif";
        const tw = ctx.measureText(countText).width;
        const bw = tw + 12;
        const bh = 17;
        const bx = p.x - half - 2;
        const by = p.y - half - bh + 6;
        rr(bx, by, bw, bh, bh / 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        ctx.fillStyle = "#0d1117";
        ctx.textAlign = "center";
        ctx.fillText(countText, bx + bw / 2, by + bh / 2 + 3.5);

        ctx.fillStyle = "#e8edf0";
        ctx.font = "600 12px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(n.label, p.x, p.y + half + 18);
        ctx.fillStyle = "#7d8b98";
        ctx.font = "11px ui-monospace, SFMono-Regular, monospace";
        ctx.fillText(n.sub.toUpperCase(), p.x, p.y + half + 33);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const handleClick = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    let best: OrchestrationNode | null = null;
    let bd = Infinity;
    for (const n of stateRef.current.nodes) {
      const px = n.x * rect.width;
      const py = n.y * rect.height;
      const d = Math.max(Math.abs(px - x), Math.abs(py - y));
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    if (best && bd < best.r * 0.95 + 16) onSelect(best.id);
  };

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full cursor-pointer"
      onClick={handleClick}
      data-testid="canvas-orchestration-graph"
      role="img"
      aria-label="Live orchestration graph of your lead pipeline stages"
    />
  );
});
