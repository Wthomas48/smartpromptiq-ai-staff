import { useMemo } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type AvatarStyle = "modern" | "illustrated" | "minimal" | "geometric" | "cosmic";
export type AvatarColorTheme = "purple" | "blue" | "green" | "orange" | "pink" | "cyan";

interface AvatarGeneratorProps {
  name: string;
  role: string;
  style?: AvatarStyle;
  colorTheme?: AvatarColorTheme;
  size?: number;
}

// ─── Color Themes ───────────────────────────────────────────────────────────

const COLOR_THEMES: Record<AvatarColorTheme, [string, string]> = {
  purple: ["#8B5CF6", "#6D28D9"],
  blue: ["#3B82F6", "#1D4ED8"],
  green: ["#10B981", "#059669"],
  orange: ["#F59E0B", "#D97706"],
  pink: ["#EC4899", "#BE185D"],
  cyan: ["#06B6D4", "#0891B2"],
};

// ─── Exported Helpers ───────────────────────────────────────────────────────

export function getAvatarGradient(colorTheme: string): string {
  const colors = COLOR_THEMES[colorTheme as AvatarColorTheme] ?? COLOR_THEMES.purple;
  return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
}

// ─── Utility: deterministic hash from string ────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

// ─── Role Accent SVG Elements ───────────────────────────────────────────────

function roleAccent(role: string, size: number, accent: string): JSX.Element | null {
  const s = size;
  const r = role.toLowerCase();
  const strokeW = Math.max(1, s * 0.015);

  // Marketing: small bar chart
  if (r.includes("market")) {
    const bx = s * 0.68;
    const by = s * 0.7;
    const bw = s * 0.05;
    return (
      <g opacity={0.45}>
        <rect x={bx} y={by} width={bw} height={s * 0.1} rx={1} fill={accent} />
        <rect x={bx + bw * 1.4} y={by - s * 0.05} width={bw} height={s * 0.15} rx={1} fill={accent} />
        <rect x={bx + bw * 2.8} y={by - s * 0.12} width={bw} height={s * 0.22} rx={1} fill={accent} />
      </g>
    );
  }

  // Sales: upward trending arrow
  if (r.includes("sales") || r.includes("representative")) {
    const ox = s * 0.68;
    const oy = s * 0.78;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polyline points={`${ox},${oy} ${ox + s * 0.08},${oy - s * 0.12} ${ox + s * 0.16},${oy - s * 0.06} ${ox + s * 0.22},${oy - s * 0.18}`} />
        <polyline points={`${ox + s * 0.17},${oy - s * 0.18} ${ox + s * 0.22},${oy - s * 0.18} ${ox + s * 0.22},${oy - s * 0.13}`} />
      </g>
    );
  }

  // Content: pen nib
  if (r.includes("content") || r.includes("writer")) {
    const px = s * 0.72;
    const py = s * 0.62;
    const pl = s * 0.18;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round" strokeLinejoin="round"
        transform={`rotate(-45, ${px}, ${py})`}>
        <line x1={px} y1={py} x2={px} y2={py + pl} />
        <polyline points={`${px - s * 0.025},${py + s * 0.02} ${px},${py} ${px + s * 0.025},${py + s * 0.02}`} />
        <circle cx={px} cy={py + pl} r={s * 0.01} fill={accent} />
      </g>
    );
  }

  // Admin: clipboard
  if (r.includes("admin") || r.includes("assistant")) {
    const cx = s * 0.7;
    const cy = s * 0.64;
    const cw = s * 0.16;
    const ch = s * 0.2;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round">
        <rect x={cx} y={cy} width={cw} height={ch} rx={s * 0.015} />
        <rect x={cx + cw * 0.25} y={cy - s * 0.02} width={cw * 0.5} height={s * 0.04} rx={s * 0.01} fill={accent} />
        <line x1={cx + cw * 0.2} y1={cy + ch * 0.35} x2={cx + cw * 0.8} y2={cy + ch * 0.35} />
        <line x1={cx + cw * 0.2} y1={cy + ch * 0.55} x2={cx + cw * 0.8} y2={cy + ch * 0.55} />
        <line x1={cx + cw * 0.2} y1={cy + ch * 0.75} x2={cx + cw * 0.6} y2={cy + ch * 0.75} />
      </g>
    );
  }

  // Product: kanban cards
  if (r.includes("product") || r.includes("roadmap") || r.includes("kanban")) {
    const kx = s * 0.68;
    const ky = s * 0.62;
    const kw = s * 0.07;
    const kh = s * 0.05;
    const gap = s * 0.02;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW} fill="none" strokeLinecap="round">
        <rect x={kx} y={ky} width={kw} height={kh} rx={2} fill={accent} opacity={0.5} />
        <rect x={kx} y={ky + kh + gap} width={kw} height={kh} rx={2} fill={accent} opacity={0.35} />
        <rect x={kx + kw + gap} y={ky} width={kw} height={kh * 1.5 + gap} rx={2} fill={accent} opacity={0.4} />
        <rect x={kx + (kw + gap) * 2} y={ky} width={kw} height={kh} rx={2} fill={accent} opacity={0.3} />
        <rect x={kx + (kw + gap) * 2} y={ky + kh + gap} width={kw} height={kh * 0.7} rx={2} fill={accent} opacity={0.2} />
      </g>
    );
  }

  // Community: hearts / chat bubbles
  if (r.includes("community") || r.includes("engagement")) {
    const cx = s * 0.73;
    const cy = s * 0.65;
    const hs = s * 0.04;
    return (
      <g opacity={0.45} fill={accent}>
        <path d={`M${cx},${cy + hs * 0.3} C${cx},${cy - hs * 0.5} ${cx - hs * 1.2},${cy - hs * 0.5} ${cx - hs * 1.2},${cy + hs * 0.2} C${cx - hs * 1.2},${cy + hs * 0.8} ${cx},${cy + hs * 1.5} ${cx},${cy + hs * 1.5} C${cx},${cy + hs * 1.5} ${cx + hs * 1.2},${cy + hs * 0.8} ${cx + hs * 1.2},${cy + hs * 0.2} C${cx + hs * 1.2},${cy - hs * 0.5} ${cx},${cy - hs * 0.5} ${cx},${cy + hs * 0.3}Z`} />
        <circle cx={cx + s * 0.1} cy={cy + s * 0.12} r={s * 0.02} opacity={0.5} />
        <circle cx={cx - s * 0.1} cy={cy + s * 0.14} r={s * 0.015} opacity={0.4} />
        <circle cx={cx + s * 0.06} cy={cy + s * 0.18} r={s * 0.012} opacity={0.3} />
      </g>
    );
  }

  // Strategy: compass
  if (r.includes("strateg") || r.includes("advisor") || r.includes("executive")) {
    const cx = s * 0.74;
    const cy = s * 0.68;
    const cr = s * 0.08;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round">
        <circle cx={cx} cy={cy} r={cr} />
        <line x1={cx} y1={cy - cr * 0.7} x2={cx} y2={cy - cr * 1.15} />
        <line x1={cx} y1={cy + cr * 0.7} x2={cx} y2={cy + cr * 1.15} />
        <line x1={cx - cr * 0.7} y1={cy} x2={cx - cr * 1.15} y2={cy} />
        <line x1={cx + cr * 0.7} y1={cy} x2={cx + cr * 1.15} y2={cy} />
        <polygon points={`${cx},${cy - cr * 0.5} ${cx + cr * 0.15},${cy} ${cx},${cy + cr * 0.5} ${cx - cr * 0.15},${cy}`} fill={accent} opacity={0.5} />
      </g>
    );
  }

  // Funnel: funnel/filter shape
  if (r.includes("funnel") || r.includes("conversion") || r.includes("landing")) {
    const fx = s * 0.7;
    const fy = s * 0.6;
    const fw = s * 0.2;
    const fh = s * 0.24;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polyline points={`${fx},${fy} ${fx + fw},${fy} ${fx + fw * 0.62},${fy + fh * 0.55} ${fx + fw * 0.62},${fy + fh} ${fx + fw * 0.38},${fy + fh} ${fx + fw * 0.38},${fy + fh * 0.55} ${fx},${fy}`} />
        <line x1={fx + fw * 0.15} y1={fy + fh * 0.22} x2={fx + fw * 0.85} y2={fy + fh * 0.22} opacity={0.4} />
        <circle cx={fx + fw * 0.5} cy={fy + fh + s * 0.03} r={s * 0.015} fill={accent} opacity={0.6} />
      </g>
    );
  }

  // Support: headset / chat bubble
  if (r.includes("support") || r.includes("customer") || r.includes("helpdesk")) {
    const cx = s * 0.73;
    const cy = s * 0.67;
    const cr = s * 0.07;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round">
        <ellipse cx={cx} cy={cy} rx={cr} ry={cr * 0.8} />
        <path d={`M${cx - cr * 0.4},${cy + cr * 0.8} Q${cx - cr * 0.8},${cy + cr * 1.4} ${cx - cr * 1.2},${cy + cr * 1.1}`} />
        <circle cx={cx - cr * 0.25} cy={cy} r={s * 0.008} fill={accent} />
        <circle cx={cx + cr * 0.25} cy={cy} r={s * 0.008} fill={accent} />
        <circle cx={cx} cy={cy} r={s * 0.008} fill={accent} />
        <path d={`M${cx + cr * 1.3},${cy - cr * 0.3} A${cr * 1.1},${cr * 1.1} 0 0 0 ${cx - cr * 1.3},${cy - cr * 0.3}`} />
        <line x1={cx - cr * 1.3} y1={cy - cr * 0.3} x2={cx - cr * 1.3} y2={cy + cr * 0.2} />
        <line x1={cx + cr * 1.3} y1={cy - cr * 0.3} x2={cx + cr * 1.3} y2={cy + cr * 0.2} />
      </g>
    );
  }

  // Media: play button / film
  if (r.includes("media") || r.includes("video") || r.includes("podcast") || r.includes("creator")) {
    const px = s * 0.72;
    const py = s * 0.66;
    const ps = s * 0.1;
    return (
      <g opacity={0.45}>
        <circle cx={px} cy={py} r={ps} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" />
        <polygon points={`${px - ps * 0.3},${py - ps * 0.5} ${px - ps * 0.3},${py + ps * 0.5} ${px + ps * 0.5},${py}`} fill={accent} opacity={0.7} />
        <rect x={px + ps * 1.2} y={py - ps * 0.6} width={s * 0.04} height={ps * 1.2} rx={1} fill={accent} opacity={0.3} />
        <rect x={px + ps * 1.5} y={py - ps * 0.4} width={s * 0.04} height={ps * 0.8} rx={1} fill={accent} opacity={0.2} />
      </g>
    );
  }

  // Technical: terminal/code brackets
  if (r.includes("technical") || r.includes("developer") || r.includes("devops") || r.includes("engineer")) {
    const tx = s * 0.68;
    const ty = s * 0.65;
    const tw = s * 0.22;
    const th = s * 0.15;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x={tx} y={ty} width={tw} height={th} rx={s * 0.015} />
        <text x={tx + tw * 0.12} y={ty + th * 0.7} fontSize={s * 0.07} fontFamily="monospace" fill={accent} stroke="none" opacity={0.7}>&gt;_</text>
        <line x1={tx + tw * 0.55} y1={ty + th * 0.35} x2={tx + tw * 0.85} y2={ty + th * 0.35} opacity={0.4} />
        <line x1={tx + tw * 0.55} y1={ty + th * 0.65} x2={tx + tw * 0.75} y2={ty + th * 0.65} opacity={0.3} />
      </g>
    );
  }

  // Brand: star / palette
  if (r.includes("brand") || r.includes("strategist") || r.includes("creative director")) {
    const bx = s * 0.73;
    const by = s * 0.67;
    const br = s * 0.08;
    const points = 5;
    const starPoints: string[] = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r2 = i % 2 === 0 ? br : br * 0.4;
      starPoints.push(`${bx + Math.cos(angle) * r2},${by + Math.sin(angle) * r2}`);
    }
    return (
      <g opacity={0.45}>
        <polygon points={starPoints.join(" ")} fill={accent} stroke="none" />
        <circle cx={bx - s * 0.12} cy={by + s * 0.08} r={s * 0.025} fill={accent} opacity={0.6} />
        <circle cx={bx + s * 0.1} cy={by + s * 0.1} r={s * 0.018} fill={accent} opacity={0.4} />
      </g>
    );
  }

  // Finance: dollar sign / chart
  if (r.includes("finance") || r.includes("accounting") || r.includes("budget")) {
    const fx = s * 0.72;
    const fy = s * 0.62;
    const fh = s * 0.2;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <text x={fx} y={fy + fh * 0.5} fontSize={s * 0.14} fontWeight="bold" fill={accent} stroke="none" opacity={0.5}>$</text>
        <polyline points={`${fx + s * 0.12},${fy + fh} ${fx + s * 0.17},${fy + fh * 0.5} ${fx + s * 0.22},${fy + fh * 0.7} ${fx + s * 0.27},${fy + fh * 0.15}`} />
      </g>
    );
  }

  // Operations: gear/cog
  if (r.includes("operation") || r.includes("ops")) {
    const gx = s * 0.74;
    const gy = s * 0.68;
    const gr = s * 0.07;
    const teeth = 6;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round">
        <circle cx={gx} cy={gy} r={gr * 0.5} />
        {Array.from({ length: teeth }).map((_, i) => {
          const angle = (i * 360) / teeth * (Math.PI / 180);
          return (
            <line
              key={i}
              x1={gx + Math.cos(angle) * gr * 0.6}
              y1={gy + Math.sin(angle) * gr * 0.6}
              x2={gx + Math.cos(angle) * gr}
              y2={gy + Math.sin(angle) * gr}
            />
          );
        })}
      </g>
    );
  }

  // Automation Engineer: gears with flow arrows
  if (r.includes("automation") || r.includes("integration") || r.includes("workflow engineer")) {
    const ax = s * 0.7;
    const ay = s * 0.62;
    const ar = s * 0.06;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round">
        {/* Gear 1 */}
        <circle cx={ax} cy={ay} r={ar * 0.45} />
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i * 360) / 6 * (Math.PI / 180);
          return (
            <line key={i} x1={ax + Math.cos(angle) * ar * 0.55} y1={ay + Math.sin(angle) * ar * 0.55}
              x2={ax + Math.cos(angle) * ar} y2={ay + Math.sin(angle) * ar} />
          );
        })}
        {/* Arrow to gear 2 */}
        <line x1={ax + ar * 1.3} y1={ay + ar * 0.3} x2={ax + ar * 2.2} y2={ay + ar * 0.8} />
        <polyline points={`${ax + ar * 1.8},${ay + ar * 0.85} ${ax + ar * 2.2},${ay + ar * 0.8} ${ax + ar * 2.1},${ay + ar * 0.4}`} />
        {/* Gear 2 (smaller) */}
        <circle cx={ax + ar * 2.8} cy={ay + ar * 1.2} r={ar * 0.35} />
        {Array.from({ length: 5 }).map((_, i) => {
          const angle = (i * 360) / 5 * (Math.PI / 180);
          const cx = ax + ar * 2.8;
          const cy = ay + ar * 1.2;
          return (
            <line key={i} x1={cx + Math.cos(angle) * ar * 0.42} y1={cy + Math.sin(angle) * ar * 0.42}
              x2={cx + Math.cos(angle) * ar * 0.75} y2={cy + Math.sin(angle) * ar * 0.75} />
          );
        })}
      </g>
    );
  }

  // Knowledge Base Curator: folder with document and tag
  if (r.includes("knowledge") || r.includes("curator") || r.includes("kb") || r.includes("document organiz")) {
    const kx = s * 0.68;
    const ky = s * 0.6;
    const kw = s * 0.22;
    const kh = s * 0.2;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round">
        {/* Folder shape */}
        <path d={`M${kx},${ky + kh * 0.15} L${kx},${ky + kh} L${kx + kw},${ky + kh} L${kx + kw},${ky + kh * 0.15} L${kx + kw * 0.55},${ky + kh * 0.15} L${kx + kw * 0.45},${ky} L${kx},${ky} Z`} />
        {/* Document lines inside */}
        <line x1={kx + kw * 0.15} y1={ky + kh * 0.4} x2={kx + kw * 0.85} y2={ky + kh * 0.4} opacity={0.5} />
        <line x1={kx + kw * 0.15} y1={ky + kh * 0.58} x2={kx + kw * 0.7} y2={ky + kh * 0.58} opacity={0.4} />
        <line x1={kx + kw * 0.15} y1={ky + kh * 0.76} x2={kx + kw * 0.55} y2={ky + kh * 0.76} opacity={0.3} />
        {/* Tag */}
        <circle cx={kx + kw + s * 0.02} cy={ky + kh * 0.3} r={s * 0.02} fill={accent} opacity={0.5} />
      </g>
    );
  }

  // Lead Generation: magnet pulling dots
  if (r.includes("lead gen") || r.includes("lead generation") || r.includes("outreach") || r.includes("magnet")) {
    const mx = s * 0.72;
    const my = s * 0.62;
    const mw = s * 0.1;
    const mh = s * 0.14;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round">
        {/* U-shaped magnet */}
        <path d={`M${mx},${my} L${mx},${my + mh} A${mw * 0.5},${mw * 0.5} 0 0 0 ${mx + mw},${my + mh} L${mx + mw},${my}`} />
        {/* Magnet tips */}
        <line x1={mx - mw * 0.15} y1={my} x2={mx + mw * 0.15} y2={my} strokeWidth={strokeW * 2.5} />
        <line x1={mx + mw - mw * 0.15} y1={my} x2={mx + mw + mw * 0.15} y2={my} strokeWidth={strokeW * 2.5} />
        {/* Attracted dots */}
        <circle cx={mx + mw * 0.5} cy={my - s * 0.04} r={s * 0.012} fill={accent} opacity={0.6} />
        <circle cx={mx - mw * 0.3} cy={my - s * 0.06} r={s * 0.01} fill={accent} opacity={0.4} />
        <circle cx={mx + mw * 1.3} cy={my - s * 0.05} r={s * 0.01} fill={accent} opacity={0.4} />
        <circle cx={mx + mw * 0.5} cy={my - s * 0.09} r={s * 0.008} fill={accent} opacity={0.25} />
      </g>
    );
  }

  // Training/Onboarding: checklist with progress bar
  if (r.includes("training") || r.includes("onboarding") || r.includes("trainer")) {
    const tx = s * 0.68;
    const ty = s * 0.6;
    const tw = s * 0.22;
    const th = s * 0.24;
    const checkSize = s * 0.025;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round">
        {/* Checklist items */}
        <rect x={tx} y={ty} width={checkSize} height={checkSize} rx={2} />
        <polyline points={`${tx + checkSize * 0.2},${ty + checkSize * 0.5} ${tx + checkSize * 0.45},${ty + checkSize * 0.75} ${tx + checkSize * 0.85},${ty + checkSize * 0.2}`} fill="none" />
        <line x1={tx + checkSize * 1.5} y1={ty + checkSize * 0.5} x2={tx + tw} y2={ty + checkSize * 0.5} />

        <rect x={tx} y={ty + th * 0.35} width={checkSize} height={checkSize} rx={2} />
        <polyline points={`${tx + checkSize * 0.2},${ty + th * 0.35 + checkSize * 0.5} ${tx + checkSize * 0.45},${ty + th * 0.35 + checkSize * 0.75} ${tx + checkSize * 0.85},${ty + th * 0.35 + checkSize * 0.2}`} fill="none" />
        <line x1={tx + checkSize * 1.5} y1={ty + th * 0.35 + checkSize * 0.5} x2={tx + tw * 0.8} y2={ty + th * 0.35 + checkSize * 0.5} />

        <rect x={tx} y={ty + th * 0.7} width={checkSize} height={checkSize} rx={2} />
        <line x1={tx + checkSize * 1.5} y1={ty + th * 0.7 + checkSize * 0.5} x2={tx + tw * 0.65} y2={ty + th * 0.7 + checkSize * 0.5} opacity={0.4} />

        {/* Progress bar at bottom */}
        <rect x={tx} y={ty + th} width={tw} height={s * 0.025} rx={s * 0.012} opacity={0.3} />
        <rect x={tx} y={ty + th} width={tw * 0.65} height={s * 0.025} rx={s * 0.012} fill={accent} opacity={0.5} />
      </g>
    );
  }

  // Data Analyst: bar chart with trend line
  if (r.includes("data analyst") || r.includes("data analysis") || r.includes("analytics") || r.includes("dashboard")) {
    const bx = s * 0.68;
    const by = s * 0.6;
    const bw = s * 0.05;
    const bh = s * 0.22;
    return (
      <g opacity={0.45}>
        {/* Bar chart */}
        <rect x={bx} y={by + bh * 0.6} width={bw} height={bh * 0.4} rx={1} fill={accent} opacity={0.3} />
        <rect x={bx + bw * 1.5} y={by + bh * 0.3} width={bw} height={bh * 0.7} rx={1} fill={accent} opacity={0.4} />
        <rect x={bx + bw * 3} y={by + bh * 0.1} width={bw} height={bh * 0.9} rx={1} fill={accent} opacity={0.5} />
        <rect x={bx + bw * 4.5} y={by + bh * 0.4} width={bw} height={bh * 0.6} rx={1} fill={accent} opacity={0.35} />
        {/* Trend line overlay */}
        <polyline
          points={`${bx + bw * 0.5},${by + bh * 0.55} ${bx + bw * 2},${by + bh * 0.25} ${bx + bw * 3.5},${by + bh * 0.05} ${bx + bw * 5},${by + bh * 0.35}`}
          stroke={accent} strokeWidth={Math.max(1, s * 0.012)} fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
      </g>
    );
  }

  // E-commerce: shopping cart with star
  if (r.includes("commerce") || r.includes("ecommerce") || r.includes("store") || r.includes("product listing")) {
    const cx = s * 0.7;
    const cy = s * 0.62;
    const cw = s * 0.18;
    const ch = s * 0.14;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Cart body */}
        <polyline points={`${cx},${cy} ${cx + cw * 0.15},${cy} ${cx + cw * 0.3},${cy + ch} ${cx + cw * 0.9},${cy + ch} ${cx + cw},${cy + ch * 0.25} ${cx + cw * 0.25},${cy + ch * 0.25}`} />
        {/* Wheels */}
        <circle cx={cx + cw * 0.4} cy={cy + ch + s * 0.03} r={s * 0.015} fill={accent} />
        <circle cx={cx + cw * 0.8} cy={cy + ch + s * 0.03} r={s * 0.015} fill={accent} />
        {/* Star rating */}
        <g transform={`translate(${cx + cw * 0.3},${cy - s * 0.06})`}>
          <polygon points={`0,-${s * 0.02} ${s * 0.006},-${s * 0.007} ${s * 0.02},-${s * 0.007} ${s * 0.009},${s * 0.003} ${s * 0.013},${s * 0.018} 0,${s * 0.009} -${s * 0.013},${s * 0.018} -${s * 0.009},${s * 0.003} -${s * 0.02},-${s * 0.007} -${s * 0.006},-${s * 0.007}`} fill={accent} stroke="none" opacity={0.7} />
        </g>
      </g>
    );
  }

  // Copy Chief: pen with edit lines
  if (r.includes("copy") || r.includes("editor") || r.includes("chief") || r.includes("copywriter")) {
    const ex = s * 0.68;
    const ey = s * 0.6;
    const ew = s * 0.22;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round">
        {/* Text lines */}
        <line x1={ex} y1={ey} x2={ex + ew} y2={ey} />
        <line x1={ex} y1={ey + s * 0.05} x2={ex + ew * 0.75} y2={ey + s * 0.05} />
        <line x1={ex} y1={ey + s * 0.1} x2={ex + ew * 0.9} y2={ey + s * 0.1} />
        {/* Strikethrough on middle line */}
        <line x1={ex + ew * 0.1} y1={ey + s * 0.05} x2={ex + ew * 0.5} y2={ey + s * 0.05} strokeWidth={strokeW * 2.5} opacity={0.6} />
        {/* Pen icon */}
        <line x1={ex + ew * 0.85} y1={ey + s * 0.15} x2={ex + ew * 0.65} y2={ey + s * 0.25} />
        <circle cx={ex + ew * 0.65} cy={ey + s * 0.25} r={s * 0.008} fill={accent} />
        {/* Caret insertion mark */}
        <polyline points={`${ex + ew * 0.55},${ey + s * 0.17} ${ex + ew * 0.6},${ey + s * 0.13} ${ex + ew * 0.65},${ey + s * 0.17}`} />
      </g>
    );
  }

  // Graphic/Design: palette with color swatches
  if (r.includes("graphic") || r.includes("design") || r.includes("visual") || r.includes("concept designer")) {
    const dx = s * 0.68;
    const dy = s * 0.6;
    const dw = s * 0.22;
    const dh = s * 0.22;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round">
        {/* Canvas rectangle */}
        <rect x={dx} y={dy} width={dw} height={dh} rx={s * 0.015} />
        {/* Color swatches inside */}
        <circle cx={dx + dw * 0.25} cy={dy + dh * 0.35} r={s * 0.025} fill={accent} opacity={0.6} />
        <circle cx={dx + dw * 0.55} cy={dy + dh * 0.3} r={s * 0.02} fill={accent} opacity={0.4} />
        <circle cx={dx + dw * 0.8} cy={dy + dh * 0.35} r={s * 0.015} fill={accent} opacity={0.3} />
        {/* Pen/brush stroke */}
        <path d={`M${dx + dw * 0.15},${dy + dh * 0.7} Q${dx + dw * 0.4},${dy + dh * 0.55} ${dx + dw * 0.65},${dy + dh * 0.72} Q${dx + dw * 0.8},${dy + dh * 0.8} ${dx + dw * 0.9},${dy + dh * 0.65}`} />
      </g>
    );
  }

  // SEO: search bar with ranking bars
  if (r.includes("seo") || r.includes("search engine") || r.includes("keyword")) {
    const sx = s * 0.68;
    const sy = s * 0.62;
    const sw = s * 0.22;
    const sh = s * 0.06;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round">
        {/* Search bar */}
        <rect x={sx} y={sy} width={sw} height={sh} rx={sh * 0.5} />
        <circle cx={sx + sw * 0.15} cy={sy + sh * 0.5} r={sh * 0.25} />
        <line x1={sx + sw * 0.22} y1={sy + sh * 0.7} x2={sx + sw * 0.28} y2={sy + sh * 0.9} />
        {/* Ranking bars below */}
        <rect x={sx} y={sy + sh * 2} width={sw * 0.85} height={sh * 0.5} rx={1} fill={accent} opacity={0.5} />
        <rect x={sx} y={sy + sh * 3.2} width={sw * 0.6} height={sh * 0.5} rx={1} fill={accent} opacity={0.35} />
        <rect x={sx} y={sy + sh * 4.4} width={sw * 0.4} height={sh * 0.5} rx={1} fill={accent} opacity={0.2} />
      </g>
    );
  }

  // Legal: scales of justice
  if (r.includes("legal") || r.includes("compliance") || r.includes("contract")) {
    const lx = s * 0.74;
    const ly = s * 0.64;
    const lw = s * 0.18;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Vertical beam */}
        <line x1={lx} y1={ly} x2={lx} y2={ly + lw * 0.7} />
        {/* Horizontal beam */}
        <line x1={lx - lw * 0.5} y1={ly + lw * 0.1} x2={lx + lw * 0.5} y2={ly + lw * 0.1} />
        {/* Left pan */}
        <path d={`M${lx - lw * 0.5},${ly + lw * 0.1} Q${lx - lw * 0.55},${ly + lw * 0.4} ${lx - lw * 0.3},${ly + lw * 0.4} Q${lx - lw * 0.05},${ly + lw * 0.4} ${lx - lw * 0.1},${ly + lw * 0.1}`} fill={accent} opacity={0.3} />
        {/* Right pan */}
        <path d={`M${lx + lw * 0.1},${ly + lw * 0.1} Q${lx + lw * 0.05},${ly + lw * 0.4} ${lx + lw * 0.3},${ly + lw * 0.4} Q${lx + lw * 0.55},${ly + lw * 0.4} ${lx + lw * 0.5},${ly + lw * 0.1}`} fill={accent} opacity={0.3} />
        {/* Base */}
        <line x1={lx - lw * 0.2} y1={ly + lw * 0.7} x2={lx + lw * 0.2} y2={ly + lw * 0.7} />
      </g>
    );
  }

  // Researcher: magnifying glass
  if (r.includes("research")) {
    const mx = s * 0.74;
    const my = s * 0.68;
    const mr = s * 0.07;
    return (
      <g opacity={0.45} stroke={accent} strokeWidth={strokeW * 1.5} fill="none" strokeLinecap="round">
        <circle cx={mx} cy={my} r={mr} />
        <line x1={mx + mr * 0.7} y1={my + mr * 0.7} x2={mx + mr * 1.5} y2={my + mr * 1.5} />
      </g>
    );
  }

  return null;
}

// ─── Style Overlay Patterns ─────────────────────────────────────────────────

function stylePattern(style: AvatarStyle, size: number, seed: number, accent: string): JSX.Element | null {
  const s = size;

  switch (style) {
    case "modern":
      // Subtle corner arcs
      return (
        <g opacity={0.12} stroke={accent} strokeWidth={Math.max(1, s * 0.01)} fill="none">
          <path d={`M ${s * 0.05} ${s * 0.3} Q ${s * 0.05} ${s * 0.05} ${s * 0.3} ${s * 0.05}`} />
          <path d={`M ${s * 0.95} ${s * 0.7} Q ${s * 0.95} ${s * 0.95} ${s * 0.7} ${s * 0.95}`} />
        </g>
      );

    case "illustrated": {
      // Decorative dots and small shapes
      const dots: JSX.Element[] = [];
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const radius = s * 0.42 + ((seed + i * 7) % 5) * s * 0.01;
        const cx = s / 2 + Math.cos(angle) * radius;
        const cy = s / 2 + Math.sin(angle) * radius;
        const r = s * 0.008 + ((seed + i) % 3) * s * 0.004;
        dots.push(<circle key={i} cx={cx} cy={cy} r={r} fill={accent} opacity={0.2} />);
      }
      return <g>{dots}</g>;
    }

    case "minimal":
      // Simple bottom accent line
      return (
        <g opacity={0.15}>
          <rect x={s * 0.3} y={s * 0.88} width={s * 0.4} height={s * 0.02} rx={s * 0.01} fill={accent} />
        </g>
      );

    case "geometric": {
      // Angular triangles
      const tris: JSX.Element[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + (seed % 10) * 0.1;
        const r1 = s * 0.44;
        const ts = s * 0.04;
        const cx = s / 2 + Math.cos(angle) * r1;
        const cy = s / 2 + Math.sin(angle) * r1;
        tris.push(
          <polygon
            key={i}
            points={`${cx},${cy - ts} ${cx - ts * 0.866},${cy + ts * 0.5} ${cx + ts * 0.866},${cy + ts * 0.5}`}
            fill={accent}
            opacity={0.12}
            transform={`rotate(${(seed + i * 60) % 360}, ${cx}, ${cy})`}
          />
        );
      }
      return <g>{tris}</g>;
    }

    case "cosmic": {
      // Stars and small dots
      const stars: JSX.Element[] = [];
      for (let i = 0; i < 18; i++) {
        const x = ((seed * (i + 1) * 17) % (s * 0.8)) + s * 0.1;
        const y = ((seed * (i + 1) * 23) % (s * 0.8)) + s * 0.1;
        const dist = Math.sqrt((x - s / 2) ** 2 + (y - s / 2) ** 2);
        if (dist < s * 0.25) continue; // avoid center
        const r = s * 0.004 + ((seed + i) % 4) * s * 0.003;
        stars.push(<circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.3 + ((seed + i) % 3) * 0.1} />);
      }
      return <g>{stars}</g>;
    }

    default:
      return null;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AvatarGenerator({
  name,
  role,
  style = "modern",
  colorTheme = "purple",
  size = 64,
}: AvatarGeneratorProps) {
  const seed = useMemo(() => hashStr(name + role), [name, role]);
  const initials = useMemo(() => getInitials(name), [name]);
  const colors = COLOR_THEMES[colorTheme] ?? COLOR_THEMES.purple;
  const accent = "#ffffff";

  const isCosmic = style === "cosmic";
  const bgFrom = isCosmic ? "#0f0b1e" : colors[0];
  const bgTo = isCosmic ? "#1a1035" : colors[1];

  const gradId = `av-grad-${seed}`;
  const glowId = `av-glow-${seed}`;
  const borderRadius = style === "geometric" ? size * 0.12 : size * 0.5;

  const fontSize = size * 0.32;
  const fontWeight = style === "minimal" ? 400 : 600;

  return (
    <div
      className="group relative inline-block"
      style={{ width: size, height: size }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md"
        style={{
          background: getAvatarGradient(colorTheme),
          borderRadius,
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative z-10 transition-transform duration-300 group-hover:scale-105"
        style={{ borderRadius, overflow: "hidden" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={bgFrom} />
            <stop offset="100%" stopColor={bgTo} />
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width={size} height={size} fill={`url(#${gradId})`} />

        {/* Inner glow */}
        <rect width={size} height={size} fill={`url(#${glowId})`} />

        {/* Cosmic extra: subtle nebula ring */}
        {isCosmic && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size * 0.38}
            fill="none"
            stroke={colors[0]}
            strokeWidth={size * 0.015}
            opacity={0.25}
          />
        )}

        {/* Style overlay pattern */}
        {stylePattern(style, size, seed, accent)}

        {/* Initials */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={accent}
          fontSize={fontSize}
          fontWeight={fontWeight}
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing={size * 0.02}
        >
          {initials}
        </text>

        {/* Role accent */}
        {roleAccent(role, size, accent)}
      </svg>
    </div>
  );
}
