import { useState } from "react";
import { fmtDate, fmtNum } from "../lib/text";

export interface Point {
  date: string; // YYYY-MM-DD
  value: number;
  detail: string; // tooltip line, e.g. "4x8 47,5kg"
}

interface Props {
  points: Point[];
  unit: string;
  /** Second line (dashed, so it does not rely on colour), e.g. the other side. */
  second?: Point[];
  /** Tooltip names of the two lines. */
  names?: [string, string];
  goal?: number | null;
}

const LINES = [
  { color: "#e8ff47", dash: undefined },
  { color: "#47c4ff", dash: "5 4" },
];

/** Line over time, with an optional second line and goal: 2px line, 8px markers, tap/hover tooltip. */
export default function LineChart({ points, unit, second = [], names, goal }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const dates = [...new Set([...points, ...second].map((p) => p.date))].sort();
  if (dates.length < 2) return null;

  const W = 340;
  const H = 170;
  const pad = { l: 34, r: 12, t: 14, b: 22 };
  const vals = [...points, ...second].map((p) => p.value);
  if (goal != null) vals.push(goal);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const span = hi - lo;
  lo = Math.max(0, lo - span * 0.15);
  hi += span * 0.15;
  const t0 = Date.parse(dates[0]);
  const t1 = Date.parse(dates[dates.length - 1]);
  const x = (d: string) => pad.l + ((Date.parse(d) - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  // half units read well on loads; a small range (sprint times) needs the decimals
  const ticks = [lo, (lo + hi) / 2, hi].map((v) => (hi - lo >= 5 ? Math.round(v * 2) / 2 : Math.round(v * 100) / 100));
  const pathOf = (list: Point[]) => list.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  const nearest = (clientX: number, rect: DOMRect) => {
    const vx = ((clientX - rect.left) / rect.width) * W;
    setActive(dates.reduce((best, d) => (Math.abs(x(d) - vx) < Math.abs(x(best) - vx) ? d : best), dates[0]));
  };

  const series = second.length ? [points, second] : [points];
  const shown = active ? series.flatMap((list, i) => list.filter((p) => p.date === active).map((p) => ({ ...p, name: names?.[i] }))) : [];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none select-none"
        role="img"
        aria-label={`Evolução em ${unit}`}
        onPointerMove={(e) => nearest(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerDown={(e) => nearest(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#2a2a2a" strokeWidth="1" />
            <text x={pad.l - 6} y={y(v) + 4} fontSize="10" textAnchor="end" fill="#888">
              {fmtNum(v)}
            </text>
          </g>
        ))}
        <text x={pad.l} y={H - 6} fontSize="10" fill="#888">
          {fmtDate(dates[0]).slice(0, 5)}
        </text>
        <text x={W - pad.r} y={H - 6} fontSize="10" textAnchor="end" fill="#888">
          {fmtDate(dates[dates.length - 1]).slice(0, 5)}
        </text>
        {goal != null && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="#47ff8a" strokeWidth="1" strokeDasharray="2 3" />
            <text x={W - pad.r} y={y(goal) - 4} fontSize="10" textAnchor="end" fill="#47ff8a">
              objetivo
            </text>
          </g>
        )}
        {active && <line x1={x(active)} x2={x(active)} y1={pad.t} y2={H - pad.b} stroke="#888" strokeWidth="1" strokeDasharray="3 3" />}
        {series.map((list, i) => (
          <g key={i}>
            <path d={pathOf(list)} fill="none" stroke={LINES[i].color} strokeWidth="2" strokeDasharray={LINES[i].dash} strokeLinejoin="round" strokeLinecap="round" />
            {list.map((p, j) => (
              <circle key={j} cx={x(p.date)} cy={y(p.value)} r={active === p.date ? 5 : 4} fill={LINES[i].color} stroke="#1a1a1a" strokeWidth="2" />
            ))}
          </g>
        ))}
      </svg>
      {active && shown.length > 0 && (
        <div
          className="absolute top-0 pointer-events-none card px-2 py-1 text-xs shadow-lg whitespace-nowrap"
          style={{ left: `${(x(active) / W) * 100}%`, transform: `translateX(${x(active) > W / 2 ? "-105%" : "5%"})` }}
        >
          <div className="text-muted">{fmtDate(active)}</div>
          {shown.map((p) => (
            <div key={p.name ?? ""}>
              <div className="font-semibold">
                {p.name ? `${p.name} ` : ""}
                {fmtNum(p.value)} {unit}
              </div>
              {p.detail && <div className="text-muted">{p.detail}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
