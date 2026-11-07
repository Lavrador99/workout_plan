import { useEffect, useState } from "react";
import { firstWork, setAll, setCount } from "../lib/rx";
import type { Item, LoadMode } from "../lib/types";
import Seg from "./Seg";
import Stepper from "./Stepper";

const TEMPOS = ["2-0-1-0", "3-0-1-0", "3-1-1-0", "4-0-1-0", "3-0-X-0", "2-2-2-0"];

/** "3110" / "3.1.1.0" / "30x0" → "3-1-1-0"; anything else is kept as typed. */
export function normTempo(s: string): string {
  const t = s.trim().toUpperCase();
  const m = t.match(/^([0-9X])[-. ]?([0-9X])[-. ]?([0-9X])[-. ]?([0-9X])$/);
  return m ? m.slice(1).join("-") : t;
}

/** Sets, volume, load and cadence: the prescription of one exercise. */
export default function RxFields({ item, onChange }: { item: Item; onChange: (i: Item) => void }) {
  const timed = item.sets.some((s) => s.duration != null);
  const ref = firstWork(item);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <Stepper label="Séries" value={item.sets.length} step={1} onChange={(v) => onChange(setCount(item, v))} />
        {timed ? (
          <Stepper label="Tempo" suffix="s" value={ref?.duration} step={5} onChange={(v) => onChange(setAll(item, "duration", v))} />
        ) : (
          <Stepper
            label={item.repsUnit === "passos" ? "Passos" : item.repsUnit === "m" ? "Metros" : "Reps"}
            value={ref?.reps}
            step={1}
            onChange={(v) => onChange(setAll(item, "reps", v))}
          />
        )}
        <Stepper label="Carga" suffix="kg" value={ref?.load} step={item.loadMode === "dual" ? 2 : 2.5} onChange={(v) => onChange(setAll(item, "load", v))} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Seg
          options={[
            ["r", "Reps"],
            ["passos", "Passos"],
            ["s", "Tempo"],
          ]}
          value={timed ? "s" : item.repsUnit}
          onChange={(v) => {
            if (v === "s") onChange({ ...item, sets: item.sets.map((s) => ({ ...s, duration: s.duration ?? s.reps ?? 30, reps: null })) });
            else
              onChange({
                ...item,
                repsUnit: v as Item["repsUnit"],
                sets: item.sets.map((s) => ({ ...s, reps: s.reps ?? s.duration ?? 10, duration: null })),
              });
          }}
        />
        <Seg
          options={[
            ["abs", "kg"],
            ["dual", "2× kg"],
            ["added", "+kg"],
          ]}
          value={item.loadMode}
          onChange={(v) => onChange({ ...item, loadMode: v as LoadMode })}
        />
      </div>

      <TempoField value={item.tempo ?? ""} onChange={(t) => onChange({ ...item, tempo: t || undefined })} />
    </div>
  );
}

function TempoField({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="flex flex-col gap-1">
      <span className="label">Cadência (excêntrica-pausa-concêntrica-pausa)</span>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button type="button" className={`chip ${!value ? "chip-on" : ""}`} onClick={() => onChange("")}>
          —
        </button>
        {TEMPOS.map((t) => (
          <button key={t} type="button" className={`chip tabular-nums ${value === t ? "chip-on" : ""}`} onClick={() => onChange(value === t ? "" : t)}>
            {t}
          </button>
        ))}
        <input
          className="input min-h-[40px] h-10 w-24 shrink-0 text-sm text-center"
          placeholder="outra"
          value={TEMPOS.includes(text) ? "" : text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => text !== value && onChange(normTempo(text))}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      </div>
    </div>
  );
}
