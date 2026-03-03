import type { PlanConfig } from "@/types";
import { getLog } from "@/utils/storage";
import { useEffect, useRef } from "react";

interface ProgressPageProps {
  profilePrefix: string;
  config: PlanConfig;
}

const TRACKED = [
  { key: "weighted_pullup", label: "Weighted Pull-up", unit: "kg" },
  { key: "weighted_dips", label: "Weighted Dips", unit: "kg" },
  { key: "back_squat", label: "Back Squat", unit: "kg" },
  { key: "rdl", label: "RDL / Deadlift", unit: "kg" },
  { key: "front_squat", label: "Front Squat", unit: "kg" },
];

function useChartData(
  key: string,
  config: PlanConfig,
  profilePrefix: string,
): { weekNums: number[]; byWeek: Record<number, number>; pr: number } {
  const byWeek: Record<number, number> = {};
  const totalWeeks = config.weeks;
  const start = new Date(config.startDate);
  start.setHours(0, 0, 0, 0);

  for (let w = 1; w <= totalWeeks; w++) {
    for (let dow = 0; dow < 7; dow++) {
      const d = new Date(start);
      d.setDate(d.getDate() + (w - 1) * 7 + dow);
      for (let s = 0; s < 6; s++) {
        const log = getLog(profilePrefix, d, key, s);
        if (log?.weight) {
          byWeek[w] = Math.max(byWeek[w] ?? 0, log.weight);
        }
      }
    }
  }

  const weekNums = Object.keys(byWeek)
    .map(Number)
    .sort((a, b) => a - b);
  const pr =
    weekNums.length > 0 ? Math.max(...weekNums.map((w) => byWeek[w])) : 0;
  return { weekNums, byWeek, pr };
}

interface ChartProps {
  canvasId: string;
  weekNums: number[];
  byWeek: Record<number, number>;
  pr: number;
}

function Chart({ canvasId, weekNums, byWeek, pr }: ChartProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || weekNums.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth || canvas.clientWidth || 300;
    const H = 120;
    canvas.width = W;
    canvas.height = H;

    const pad = { l: 36, r: 10, t: 10, b: 20 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;
    const minW = Math.min(...weekNums.map((w) => byWeek[w])) * 0.95;
    const maxW = pr;
    const range = maxW - minW || 1;

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, W, H);

    // grid lines
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1;
    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      const y = pad.t + chartH * (1 - t);
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + chartW, y);
      ctx.stroke();
      ctx.fillStyle = "#555";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(String(Math.round(minW + range * t)), pad.l - 3, y + 3);
    });

    if (weekNums.length < 2) {
      ctx.fillStyle = "#e8ff47";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${byWeek[weekNums[0]]}kg`, W / 2, H / 2);
      return;
    }

    const xScale = chartW / (20 - 1);
    const pts = weekNums.map((w) => ({
      x: pad.l + (w - 1) * xScale,
      y: pad.t + chartH * (1 - (byWeek[w] - minW) / range),
    }));

    // gradient fill
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + chartH);
    grad.addColorStop(0, "rgba(232,255,71,0.3)");
    grad.addColorStop(1, "rgba(232,255,71,0)");
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pad.t + chartH);
    pts.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, pad.t + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // line
    ctx.beginPath();
    ctx.strokeStyle = "#e8ff47";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    pts.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
    );
    ctx.stroke();

    // dots
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#e8ff47";
      ctx.fill();
    });
  }, [weekNums, byWeek, pr]);

  return (
    <canvas
      ref={ref}
      id={canvasId}
      height={120}
      className="w-full"
      style={{ display: "block" }}
    />
  );
}

interface ExerciseCardProgressProps {
  exKey: string;
  label: string;
  unit: string;
  config: PlanConfig;
  profilePrefix: string;
}

function ExerciseCardProgress({
  exKey,
  label,
  unit,
  config,
  profilePrefix,
}: ExerciseCardProgressProps) {
  const { weekNums, byWeek, pr } = useChartData(exKey, config, profilePrefix);

  return (
    <div className="bg-card rounded-xl border border-border px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-[14px]">{label}</div>
        <div className="text-2xl font-black text-accent">
          {pr > 0 ? `${pr}${unit}` : "—"}
        </div>
      </div>
      {weekNums.length === 0 ? (
        <p className="text-muted text-[13px]">Sem dados ainda</p>
      ) : (
        <Chart
          canvasId={`canvas_${exKey}`}
          weekNums={weekNums}
          byWeek={byWeek}
          pr={pr}
        />
      )}
    </div>
  );
}

export function ProgressPage({ profilePrefix, config }: ProgressPageProps) {
  return (
    <div className="pb-6">
      <h2 className="text-2xl font-black mb-1">Progresso</h2>
      <p className="text-muted text-[13px] mb-5">
        Evolução dos principais exercícios.
      </p>

      <div className="space-y-4">
        {TRACKED.map((ex) => (
          <ExerciseCardProgress
            key={ex.key}
            exKey={ex.key}
            label={ex.label}
            unit={ex.unit}
            config={config}
            profilePrefix={profilePrefix}
          />
        ))}
      </div>
    </div>
  );
}
