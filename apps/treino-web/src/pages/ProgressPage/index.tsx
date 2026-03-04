import type { PlanConfig } from "@/types";
import {
  getCompletedDates,
  getLog,
  getRepsPR,
  getStreak,
  getTotalSessions,
  getTotalVolume,
  getWeeklyVolumes,
} from "@/utils/storage";
import { useEffect, useMemo, useRef } from "react";

interface ProgressPageProps {
  profilePrefix: string;
  config: PlanConfig;
}

// ─── Tracked weighted lifts ──────────────────────────────────────────────────
const TRACKED_LIFTS = [
  { key: "weighted_pullup", label: "Weighted Pull-up", unit: "kg" },
  { key: "weighted_dips", label: "Weighted Dips", unit: "kg" },
  { key: "back_squat", label: "Back Squat", unit: "kg" },
  { key: "rdl", label: "RDL / Deadlift", unit: "kg" },
  { key: "front_squat", label: "Front Squat", unit: "kg" },
  { key: "hip_thrust", label: "Hip Thrust", unit: "kg" },
  { key: "overhead_press", label: "Overhead Press", unit: "kg" },
  { key: "barbell_row", label: "Barbell Row", unit: "kg" },
];

// ─── Tracked bodyweight PRs ──────────────────────────────────────────────────
const TRACKED_BW = [
  { key: "pullup_var", label: "Pull-ups (reps)", icon: "🔝" },
  { key: "chinup_var", label: "Chin-ups (reps)", icon: "💪" },
  { key: "dip_var", label: "Dips (reps)", icon: "🤸" },
  { key: "pushup_std", label: "Push-ups (reps)", icon: "⬆️" },
];

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useChartData(
  key: string,
  config: PlanConfig,
  profilePrefix: string,
): {
  weekNums: number[];
  byWeek: Record<number, number>;
  pr: number;
  trend: "up" | "down" | "flat" | "none";
} {
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

  let trend: "up" | "down" | "flat" | "none" = "none";
  if (weekNums.length >= 2) {
    const last = byWeek[weekNums[weekNums.length - 1]];
    const prev = byWeek[weekNums[weekNums.length - 2]];
    trend = last > prev ? "up" : last < prev ? "down" : "flat";
  }

  return { weekNums, byWeek, pr, trend };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ChartProps {
  canvasId: string;
  weekNums: number[];
  byWeek: Record<number, number>;
  pr: number;
  accentColor?: string;
}

function Chart({
  canvasId,
  weekNums,
  byWeek,
  pr,
  accentColor = "#e8ff47",
}: ChartProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || weekNums.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth || canvas.clientWidth || 300;
    const H = 100;
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

    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1;
    [0, 0.5, 1].forEach((t) => {
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
      ctx.fillStyle = accentColor;
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${byWeek[weekNums[0]]}kg`, W / 2, H / 2);
      return;
    }

    const xScale = chartW / Math.max(20 - 1, weekNums.length - 1);
    const pts = weekNums.map((w) => ({
      x: pad.l + (w - 1) * xScale,
      y: pad.t + chartH * (1 - (byWeek[w] - minW) / range),
    }));

    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + chartH);
    grad.addColorStop(
      0,
      accentColor
        .replace(")", ",0.25)")
        .replace("rgb", "rgba")
        .replace("#", "rgba(")
        .replace("rgba(e8ff47", "rgba(232,255,71") + "",
    );
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pad.t + chartH);
    pts.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, pad.t + chartH);
    ctx.closePath();
    ctx.fillStyle = `${accentColor}33`;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    pts.forEach((p, i) =>
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
    );
    ctx.stroke();

    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.fill();
    });
  }, [weekNums, byWeek, pr, accentColor]);

  return (
    <canvas
      ref={ref}
      id={canvasId}
      height={100}
      className="w-full"
      style={{ display: "block" }}
    />
  );
}

interface BarChartProps {
  values: number[];
  labels: string[];
}

function BarChart({ values, labels }: BarChartProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth || 300;
    const H = 100;
    canvas.width = W;
    canvas.height = H;

    const pad = { l: 36, r: 8, t: 10, b: 20 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;
    const max = Math.max(...values, 1);

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, W, H);

    const n = values.length;
    const barW = (chartW / n) * 0.7;
    const gap = (chartW / n) * 0.3;

    values.forEach((v, i) => {
      const x = pad.l + i * (chartW / n) + gap / 2;
      const bH = (v / max) * chartH;
      const y = pad.t + chartH - bH;
      ctx.fillStyle = v > 0 ? "#e8ff47" : "#2a2a2a";
      ctx.beginPath();
      ctx.roundRect?.(x, y, barW, bH, 2) ?? ctx.rect(x, y, barW, bH);
      ctx.fill();

      if (labels[i] && i % Math.ceil(n / 8) === 0) {
        ctx.fillStyle = "#555";
        ctx.font = "8px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(labels[i], x + barW / 2, H - 5);
      }
    });

    [0.5, 1].forEach((t) => {
      const y = pad.t + chartH * (1 - t);
      ctx.fillStyle = "#555";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "right";
      const val = Math.round((max * t) / 1000);
      ctx.fillText(`${val}t`, pad.l - 3, y + 3);
    });
  }, [values, labels]);

  return (
    <canvas
      ref={ref}
      height={100}
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
  const { weekNums, byWeek, pr, trend } = useChartData(
    exKey,
    config,
    profilePrefix,
  );

  const trendIcon =
    trend === "up" ? "↑" : trend === "down" ? "↓" : trend === "flat" ? "→" : "";
  const trendColor =
    trend === "up"
      ? "text-success"
      : trend === "down"
        ? "text-danger"
        : "text-muted";

  return (
    <div className="bg-card rounded-xl border border-border px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-[14px]">{label}</div>
        <div className="flex items-center gap-2">
          {trendIcon && (
            <span className={`text-sm font-bold ${trendColor}`}>
              {trendIcon}
            </span>
          )}
          <div className="text-2xl font-black text-accent">
            {pr > 0 ? `${pr}${unit}` : "—"}
          </div>
        </div>
      </div>
      {weekNums.length === 0 ? (
        <p className="text-muted text-[13px]">Sem dados ainda</p>
      ) : (
        <>
          <Chart
            canvasId={`canvas_${exKey}`}
            weekNums={weekNums}
            byWeek={byWeek}
            pr={pr}
          />
          {weekNums.length >= 2 && (
            <p className="text-muted text-[11px] mt-1">
              {weekNums.length} semanas registadas · início{" "}
              {byWeek[weekNums[0]]}kg → última{" "}
              {byWeek[weekNums[weekNums.length - 1]]}kg
              {pr > byWeek[weekNums[0]] && (
                <span className="text-success ml-1">
                  +{(pr - byWeek[weekNums[0]]).toFixed(1)}kg total
                </span>
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color = "text-accent",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border px-3 py-3">
      <p className="text-muted text-[11px] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-muted text-[11px] mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Activity Heatmap ────────────────────────────────────────────────────────

function ActivityHeatmap({
  completedDates,
  startDate,
  weeks,
}: {
  completedDates: Date[];
  startDate: Date;
  weeks: number;
}) {
  const completedSet = useMemo(() => {
    const s = new Set<string>();
    completedDates.forEach((d) => {
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      s.add(key);
    });
    return s;
  }, [completedDates]);

  const dayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];
  const displayWeeks = Math.min(weeks, 20);

  return (
    <div className="bg-card rounded-xl border border-border px-4 py-3">
      <h3 className="font-bold text-[13px] mb-3">Actividade de Treino</h3>
      <div className="overflow-x-auto">
        <div className="flex gap-1" style={{ minWidth: displayWeeks * 20 }}>
          <div className="flex flex-col gap-1 mr-1">
            {dayLabels.map((d, i) => (
              <div
                key={i}
                className="w-4 h-4 text-[10px] text-muted flex items-center justify-center"
              >
                {d}
              </div>
            ))}
          </div>
          {Array.from({ length: displayWeeks }, (_, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {Array.from({ length: 7 }, (_, di) => {
                const day = new Date(startDate);
                day.setDate(day.getDate() + wi * 7 + di);
                const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                const done = completedSet.has(key);
                const future = day > new Date();
                return (
                  <div
                    key={di}
                    className={`w-4 h-4 rounded-sm ${
                      future
                        ? "bg-border opacity-30"
                        : done
                          ? "bg-accent"
                          : "bg-border"
                    }`}
                    title={day.toLocaleDateString("pt-PT")}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-2 items-center">
          <div className="flex items-center gap-1 text-[10px] text-muted">
            <div className="w-3 h-3 rounded-sm bg-accent" /> Treino feito
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted">
            <div className="w-3 h-3 rounded-sm bg-border" /> Sem treino
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bodyweight PR Section ────────────────────────────────────────────────────

interface BWRepsPRProps {
  exKey: string;
  label: string;
  icon: string;
  config: PlanConfig;
  profilePrefix: string;
}

function BWRepsPR({
  exKey,
  label,
  icon,
  config,
  profilePrefix,
}: BWRepsPRProps) {
  const start = new Date(config.startDate);
  const totalDays = config.weeks * 7;
  const pr = getRepsPR(profilePrefix, exKey, start, totalDays);

  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-[13px]">{label}</span>
      </div>
      <div className="text-lg font-black text-accent2">
        {pr > 0 ? `${pr} reps` : "—"}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProgressPage({ profilePrefix, config }: ProgressPageProps) {
  const startDate = useMemo(() => {
    const d = new Date(config.startDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [config.startDate]);

  const totalDays = config.weeks * 7;

  const totalSessions = useMemo(
    () => getTotalSessions(profilePrefix, startDate, totalDays),
    [profilePrefix, startDate, totalDays],
  );
  const streak = useMemo(() => getStreak(profilePrefix), [profilePrefix]);
  const totalVolumeKg = useMemo(
    () => getTotalVolume(profilePrefix, startDate, totalDays),
    [profilePrefix, startDate, totalDays],
  );
  const weeklyVolumes = useMemo(
    () => getWeeklyVolumes(profilePrefix, startDate, config.weeks),
    [profilePrefix, startDate, config.weeks],
  );
  const completedDates = useMemo(
    () => getCompletedDates(profilePrefix, startDate, totalDays),
    [profilePrefix, startDate, totalDays],
  );

  // Completion rate: sessions done vs planned (estimate 4 per week)
  const now = new Date();
  const daysPassed = Math.max(
    0,
    Math.floor((now.getTime() - startDate.getTime()) / 86400000),
  );
  const weeksPassed = Math.ceil(daysPassed / 7);
  const estPlanned = Math.min(
    weeksPassed * (config.trainingDays?.length ?? 4),
    totalDays,
  );
  const completionPct =
    estPlanned > 0
      ? Math.min(100, Math.round((totalSessions / estPlanned) * 100))
      : 0;

  const weekLabels = weeklyVolumes.map((_, i) => `S${i + 1}`);

  const volumeTons = (totalVolumeKg / 1000).toFixed(1);
  const hasAnyVolume = totalVolumeKg > 0;

  return (
    <div className="pb-6">
      <h2 className="text-2xl font-black mb-1">Progresso</h2>
      <p className="text-muted text-[13px] mb-5">
        Análise completa do teu desempenho.
      </p>

      {/* ── Overview Stats ── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard
          label="Treinos Feitos"
          value={String(totalSessions)}
          sub={`de ${estPlanned} planeados`}
        />
        <StatCard
          label="Streak Atual"
          value={streak > 0 ? `${streak}d` : "0"}
          sub={streak > 0 ? "dias consecutivos" : "começa hoje!"}
          color={streak >= 7 ? "text-success" : "text-accent"}
        />
        <StatCard
          label="Volume Total"
          value={hasAnyVolume ? `${volumeTons}t` : "—"}
          sub="peso × reps acumulado"
          color="text-accent2"
        />
        <StatCard
          label="Consistência"
          value={estPlanned > 0 ? `${completionPct}%` : "—"}
          sub="sessões completadas"
          color={
            completionPct >= 80
              ? "text-success"
              : completionPct >= 50
                ? "text-accent"
                : "text-danger"
          }
        />
      </div>

      {/* ── Activity Heatmap ── */}
      <ActivityHeatmap
        completedDates={completedDates}
        startDate={startDate}
        weeks={config.weeks}
      />

      {/* ── Weekly Volume Bar Chart ── */}
      {hasAnyVolume && (
        <div className="bg-card rounded-xl border border-border px-4 py-3 mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-[13px]">Volume Semanal</h3>
            <span className="text-muted text-[11px]">kg × reps por semana</span>
          </div>
          <BarChart values={weeklyVolumes} labels={weekLabels} />
        </div>
      )}

      {/* ── Weighted Lift Progress ── */}
      <h3 className="font-bold text-[15px] mt-5 mb-3">
        📈 PRs — Exercícios com Carga
      </h3>
      <div className="space-y-4">
        {TRACKED_LIFTS.map((ex) => (
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

      {/* ── Bodyweight PRs ── */}
      <h3 className="font-bold text-[15px] mt-6 mb-3">
        🏆 PRs — Peso Corporal (reps)
      </h3>
      <div className="bg-card rounded-xl border border-border px-4 py-2">
        {TRACKED_BW.map((ex) => (
          <BWRepsPR
            key={ex.key}
            exKey={ex.key}
            label={ex.label}
            icon={ex.icon}
            config={config}
            profilePrefix={profilePrefix}
          />
        ))}
      </div>
    </div>
  );
}
