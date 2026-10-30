import { useEffect, useState } from "react";
import { fmtNum, num } from "../lib/text";

interface Props {
  label: string;
  value: number | null | undefined;
  step: number;
  min?: number;
  suffix?: string;
  onChange: (v: number | null) => void;
}

/** −  value  + with a typeable value; big enough to hit between sets. */
export default function Stepper({ label, value, step, min = 0, suffix, onChange }: Props) {
  const [text, setText] = useState(fmtNum(value));
  useEffect(() => setText(fmtNum(value)), [value]);

  const bump = (d: number) => {
    const v = Math.max(min, Math.round(((value ?? 0) + d) * 100) / 100);
    onChange(v);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="label">{label}</span>
      <div className="flex items-center rounded-lg border border-border bg-card2 overflow-hidden">
        <button type="button" className="w-10 h-10 text-xl text-muted active:bg-border" onClick={() => bump(-step)} aria-label={`menos ${label}`}>
          −
        </button>
        <input
          className="w-14 bg-transparent text-center font-semibold outline-none"
          inputMode="decimal"
          value={text}
          placeholder="–"
          onChange={(e) => setText(e.target.value)}
          onBlur={() => onChange(num(text))}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        {suffix && <span className="text-xs text-muted pr-1">{suffix}</span>}
        <button type="button" className="w-10 h-10 text-xl text-accent active:bg-border" onClick={() => bump(step)} aria-label={`mais ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}
