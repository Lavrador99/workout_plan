import { SetButton } from "@/components/SetButton";
import type { Exercise } from "@/types";
import {
  getLastWeight,
  getLog,
  isDone,
  markDone,
  saveLastWeight,
  saveLog,
} from "@/utils/storage";
import { useCallback, useRef, useState } from "react";

interface ExerciseCardProps {
  exercise: Exercise;
  exerciseIdx: number;
  date: Date;
  profilePrefix: string;
  isAccessory?: boolean;
  onTimerStart: (seconds: number) => void;
  onDemoOpen: (key: string, name: string, tip: string) => void;
  onEditOpen: (
    exercise: Exercise,
    exerciseIdx: number,
    setIdx: number,
    isAccessory: boolean,
  ) => void;
}

export function ExerciseCard({
  exercise: ex,
  exerciseIdx: eIdx,
  date,
  profilePrefix,
  isAccessory = false,
  onTimerStart,
  onDemoOpen,
  onEditOpen,
}: ExerciseCardProps) {
  const lastW = ex.weight ? getLastWeight(profilePrefix, ex.key) : "";
  const [weight, setWeight] = useState<string>(lastW);
  const [done, setDone] = useState(() =>
    Array.from({ length: ex.sets }, (_, i) =>
      isDone(profilePrefix, date, ex.key, i),
    ),
  );

  // hold timer for isHold exercises
  const holdRef = useRef<{
    start: number | null;
    interval: ReturnType<typeof setInterval> | null;
  }>({
    start: null,
    interval: null,
  });
  const [holdSeconds, setHoldSeconds] = useState(0);
  const [holding, setHolding] = useState(false);

  const handleSet = useCallback(
    (sIdx: number) => {
      const w = ex.weight ? parseFloat(weight) || null : null;
      const log = getLog(profilePrefix, date, ex.key, sIdx);
      const reps = log ? log.reps : ex.reps;
      markDone(profilePrefix, date, ex.key, sIdx, true);
      saveLog(profilePrefix, date, ex.key, sIdx, { reps, weight: w });
      if (w && ex.weight) saveLastWeight(profilePrefix, ex.key, w);
      setDone((prev) => {
        const next = [...prev];
        next[sIdx] = true;
        return next;
      });
      if (ex.rest) onTimerStart(ex.rest);
    },
    [profilePrefix, date, ex, weight, onTimerStart],
  );

  const handleLongPress = useCallback(
    (sIdx: number) => {
      onEditOpen(ex, eIdx, sIdx, isAccessory);
    },
    [ex.key, eIdx, isAccessory, onEditOpen],
  );

  const startHold = () => {
    if (holding) {
      // stop
      if (holdRef.current.interval) clearInterval(holdRef.current.interval);
      setHolding(false);
      holdRef.current.start = null;
      holdRef.current.interval = null;
    } else {
      holdRef.current.start = Date.now();
      setHoldSeconds(0);
      setHolding(true);
      holdRef.current.interval = setInterval(() => {
        if (holdRef.current.start) {
          setHoldSeconds(
            Math.floor((Date.now() - holdRef.current.start) / 1000),
          );
        }
      }, 100);
    }
  };

  const setDisplay = (sIdx: number) => {
    const log = getLog(profilePrefix, date, ex.key, sIdx);
    if (log) {
      if (ex.isHold) return `${log.reps}s`;
      return (log.weight ? `${log.weight}kg×` : "") + log.reps;
    }
    if (ex.isHold) return `${ex.reps}s`;
    return String(ex.reps);
  };

  return (
    <div className="bg-card rounded-xl border border-border px-4 py-3 mb-3">
      {/* Name row */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-[15px]">{ex.name}</span>
        <button
          onClick={() => onDemoOpen(ex.key, ex.name, ex.tip || "")}
          className="text-accent2 text-[11px] border border-accent2 rounded px-2 py-0.5 hover:bg-accent2/10 transition-colors"
        >
          ▶ Demo
        </button>
      </div>

      {/* Detail */}
      {ex.detail && (
        <div className="text-muted text-[12px] mb-1">{ex.detail}</div>
      )}

      {/* Tip */}
      {ex.tip && (
        <div className="bg-accent/5 border border-accent/20 text-[11px] text-muted px-2.5 py-1.5 rounded-lg mb-2">
          💡 {ex.tip}
        </div>
      )}

      {/* Weight input */}
      {ex.weight && (
        <div className="flex items-center gap-2 mb-2 text-[12px] text-muted">
          <span>Carga atual:</span>
          <input
            type="number"
            value={weight}
            placeholder={lastW || "kg"}
            onChange={(e) => setWeight(e.target.value)}
            className="w-16 bg-card2 border border-border rounded text-center text-[13px] py-1 px-2 text-white focus:outline-none focus:border-accent"
          />
          <span>kg</span>
        </div>
      )}

      {/* Sets */}
      <div className="flex flex-wrap gap-2 mt-1">
        {Array.from({ length: ex.sets }, (_, sIdx) => (
          <SetButton
            key={sIdx}
            setNum={sIdx + 1}
            displayVal={setDisplay(sIdx)}
            done={done[sIdx]}
            isAccessory={isAccessory}
            onTap={() => handleSet(sIdx)}
            onLongPress={() => handleLongPress(sIdx)}
          />
        ))}
      </div>

      {/* Hold timer */}
      {ex.isHold && (
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={startHold}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold border transition-colors ${
              holding
                ? "border-danger text-danger hover:bg-danger/10"
                : "border-accent2 text-accent2 hover:bg-accent2/10"
            }`}
          >
            {holding ? "■ Parar" : "▶ Segurar"}
          </button>
          {(holding || holdSeconds > 0) && (
            <span className="text-[20px] font-bold text-accent tabular-nums">
              {holdSeconds}s
            </span>
          )}
        </div>
      )}
    </div>
  );
}
