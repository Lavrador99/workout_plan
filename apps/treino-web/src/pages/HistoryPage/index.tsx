import { DAYS } from "@/consts";
import { getSessionForDate } from "@/data/workouts";
import type { PlanConfig } from "@/types";
import { dateKey, getWeekMonday } from "@/utils/date";
import { getLog, isSessionComplete } from "@/utils/storage";
import { useMemo, useState } from "react";

interface HistoryPageProps {
  profilePrefix: string;
  config: PlanConfig;
}

export function HistoryPage({ profilePrefix, config }: HistoryPageProps) {
  const [offset, setOffset] = useState(0);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekStart = useMemo(() => {
    const ref = new Date(today);
    ref.setDate(today.getDate() + offset * 7);
    return getWeekMonday(ref);
  }, [today, offset]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const weekLabel = useMemo(
    () =>
      weekStart.toLocaleDateString("pt-PT", {
        day: "numeric",
        month: "short",
      }) +
      " – " +
      weekEnd.toLocaleDateString("pt-PT", { day: "numeric", month: "short" }),
    [weekStart, weekEnd],
  );

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const getAllTimeMax = (exKey: string, isHold: boolean): number => {
    let max = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.includes(`_${exKey}_`)) continue;
      if (!k.includes("log_")) continue;
      const pKey = profilePrefix ? `${profilePrefix}_` : "";
      if (profilePrefix && !k.startsWith(pKey)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const v = isHold ? parsed.reps : parsed.weight;
        if (typeof v === "number" && v > max) max = v;
      } catch {
        // skip
      }
    }
    return max;
  };

  return (
    <div className="pb-6">
      <h2 className="text-2xl font-black mb-1">Histórico</h2>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <button
          onClick={() => setOffset((o) => o - 1)}
          className="text-[20px] text-muted hover:text-white transition-colors px-2"
        >
          ‹
        </button>
        <span className="text-[13px] font-semibold">{weekLabel}</span>
        <button
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          className="text-[20px] text-muted hover:text-white transition-colors px-2"
          disabled={offset >= 0}
        >
          ›
        </button>
      </div>

      {/* Days */}
      <div className="space-y-3">
        {days.map((d, i) => {
          const dk = dateKey(d);
          const session = getSessionForDate(d, config, profilePrefix);
          if (!session) return null;

          const complete = isSessionComplete(profilePrefix, d);
          const dayLabel = DAYS[d.getDay()];
          const dateLabel = d.toLocaleDateString("pt-PT", {
            day: "numeric",
            month: "short",
          });

          const trackedExercises = session.exercises.filter(
            (e) => e.weight || e.isHold,
          );

          return (
            <div
              key={dk}
              className="bg-card rounded-xl border border-border px-4 py-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-bold text-[14px]">
                    {dayLabel} · {dateLabel}
                  </div>
                  <div className="text-muted text-[12px]">{session.title}</div>
                </div>
                {complete ? (
                  <span className="text-success text-[18px]">✓</span>
                ) : (
                  <span className="text-border text-[14px]">○</span>
                )}
              </div>

              {trackedExercises.map((ex) => {
                const setLogs = Array.from({ length: ex.sets }, (_, s) =>
                  getLog(profilePrefix, d, ex.key, s),
                ).filter(Boolean) as { reps: number; weight?: number | null }[];

                if (setLogs.length === 0) return null;

                if (ex.weight) {
                  const weights = setLogs
                    .map((l) => l.weight)
                    .filter((w): w is number => typeof w === "number" && w > 0);
                  if (weights.length === 0) return null;
                  const maxW = Math.max(...weights);
                  const allMax = getAllTimeMax(ex.key, false);
                  const isPR = maxW > 0 && maxW >= allMax;
                  return (
                    <div
                      key={ex.key}
                      className="flex items-center justify-between text-[12px] py-0.5 border-t border-border/40 first:border-0"
                    >
                      <span className="text-muted truncate pr-2">
                        {ex.name}
                      </span>
                      <span className="font-semibold shrink-0">
                        {maxW}kg
                        {isPR && (
                          <span className="ml-1 text-[10px] bg-accent text-black rounded px-1 py-0.5 font-bold">
                            PR
                          </span>
                        )}
                      </span>
                    </div>
                  );
                }

                if (ex.isHold) {
                  const times = setLogs
                    .map((l) => l.reps)
                    .filter((r): r is number => typeof r === "number" && r > 0);
                  if (times.length === 0) return null;
                  const maxT = Math.max(...times);
                  const allMax = getAllTimeMax(ex.key, true);
                  const isPR = maxT > 0 && maxT >= allMax;
                  return (
                    <div
                      key={ex.key}
                      className="flex items-center justify-between text-[12px] py-0.5 border-t border-border/40 first:border-0"
                    >
                      <span className="text-muted truncate pr-2">
                        {ex.name}
                      </span>
                      <span className="font-semibold shrink-0">
                        {maxT}s
                        {isPR && (
                          <span className="ml-1 text-[10px] bg-accent text-black rounded px-1 py-0.5 font-bold">
                            PR
                          </span>
                        )}
                      </span>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          );
        })}

        {days.every((d) => !getSessionForDate(d, config, profilePrefix)) && (
          <div className="text-center text-muted py-12">
            Sem dados para esta semana
          </div>
        )}
      </div>
    </div>
  );
}
