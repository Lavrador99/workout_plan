import { useState } from "react";
import { fmtDate, fmtNum } from "../lib/text";

export interface Point {
  date: string; // YYYY-MM-DD
  value: number;
  detail: string; // tooltip line, e.g. "4x8 47,5kg"
}

/** Single-series line over time: 2px line, 8px markers, tap/hover tooltip. */
export default function LineChart({ points, unit }: { points: Point[]; unit: string }) {
  const [active, setActive] = useState<number | null>(null);
  if (points.length < 2) return null;

  const W = 340;
  const H = 170;
  const pad = { l: 34, r: 12, t: 14, b: 22 };
  const vals = points.map((p) => p.value);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const span = hi - lo;
  lo = Math.max(0, lo - span * 0.15);
  hi += span * 0.15;
  const t0 = Date.parse(points[0].date);
  const t1 = Date.parse(points[points.length - 1].date);
  const x = (d: string) => pad.l + ((Date.parse(d) - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks = [lo, (lo + hi) / 2, hi].map((v) => Math.round(v * 2) / 2);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  const nearest = (clientX: number, rect: DOMRect) => {
    const vx = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - vx) < Math.abs(x(points[best].date) - vx)) best = i;
    });
    setActive(best);
  };

  const a = active != null ? points[active] : null;

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
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#2a2a2a" strokeWidth="1" />
            <text x={pad.l - 6} y={y(v) + 4} fontSize="10" textAnchor="end" fill="#888">
              {fmtNum(v)}
            </text>
          </g>
        ))}
        <text x={pad.l} y={H - 6} fontSize="10" fill="#888">
          {fmtDate(points[0].date).slice(0, 5)}
        </text>
        <text x={W - pad.r} y={H - 6} fontSize="10" textAnchor="end" fill="#888">
          {fmtDate(points[points.length - 1].date).slice(0, 5)}
        </text>
        {a && <line x1={x(a.date)} x2={x(a.date)} y1={pad.t} y2={H - pad.b} stroke="#888" strokeWidth="1" strokeDasharray="3 3" />}
        <path d={path} fill="none" stroke="#e8ff47" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(p.date)} cy={y(p.value)} r={active === i ? 5 : 4} fill="#e8ff47" stroke="#1a1a1a" strokeWidth="2" />
        ))}
      </svg>
      {a && (
        <div
          className="absolute top-0 pointer-events-none card px-2 py-1 text-xs shadow-lg whitespace-nowrap"
          style={{ left: `${(x(a.date) / W) * 100}%`, transform: `translateX(${x(a.date) > W / 2 ? "-105%" : "5%"})` }}
        >
          <div className="text-muted">{fmtDate(a.date)}</div>
          <div className="font-semibold">
            {fmtNum(a.value)} {unit}
          </div>
          <div className="text-muted">{a.detail}</div>
        </div>
      )}
    </div>
  );
}
