interface TimerProps {
  seconds: number;
  running: boolean;
  warning: boolean;
  formatted: string;
  onStop: () => void;
  onAddTime: (s: number) => void;
  onSetTimer: (s: number) => void;
}

const PRESETS = [60, 90, 120, 180] as const;

export function Timer({
  seconds,
  running,
  warning,
  formatted,
  onStop,
  onAddTime,
  onSetTimer,
}: TimerProps) {
  if (!running && seconds === 0) return null;

  return (
    <div
      className={`
        fixed right-4 bottom-[calc(80px+env(safe-area-inset-bottom))]
        bg-card border border-border rounded-xl p-4 z-50 min-w-[180px]
        shadow-[0_8px_32px_#0008]
        md:right-4
        max-sm:right-0 max-sm:left-0 max-sm:mx-3 max-sm:bottom-[calc(4px+env(safe-area-inset-bottom))]
      `}
    >
      <div className="text-[11px] text-muted font-semibold tracking-widest mb-1">
        DESCANSO
      </div>
      <div
        className={`text-4xl font-extrabold tabular-nums ${warning ? "text-danger" : "text-accent"}`}
      >
        {formatted}
      </div>

      <div className="flex gap-1.5 mt-2">
        {PRESETS.map((s) => (
          <button
            key={s}
            onClick={() => onSetTimer(s)}
            className="flex-1 py-1 rounded-md border border-border text-muted text-[11px] font-semibold hover:text-text hover:border-text transition-colors"
          >
            {s < 60
              ? `${s}s`
              : `${s / 60}${s % 60 ? ":" + String(s % 60).padStart(2, "0") : "min"}`}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={onStop}
          className="flex-1 py-1.5 rounded-md bg-border text-text text-xs font-bold"
        >
          ✕ Fechar
        </button>
        <button
          onClick={() => onAddTime(30)}
          className="flex-1 py-1.5 rounded-md bg-accent/10 border border-accent/30 text-accent text-xs font-bold"
        >
          +30s
        </button>
      </div>
    </div>
  );
}
