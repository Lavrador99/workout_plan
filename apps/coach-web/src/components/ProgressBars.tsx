import { useState } from "react";
import type { MonthAdherence } from "../lib/balance";
import type { CompareRow } from "../lib/ipi";
import { fmtNum } from "@treino/core/text";

const SIDE = { left: "esquerdo", right: "direito" };

function Bar({ label, value, max, unit, tone }: { label: string; value: number; max: number; unit: string; tone: string }) {
  return (
    <div className="flex items-center gap-2 text-xs" title={`${label}: ${fmtNum(value)} ${unit}`}>
      <span className="w-14 shrink-0 text-muted">{label}</span>
      <span className="flex-1 min-w-0 h-2">
        <span className={`block h-full rounded-r ${tone}`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
      </span>
      <span className="w-20 shrink-0 text-right tabular-nums">
        {fmtNum(value)} {unit}
      </span>
    </div>
  );
}

/** Each test on its own scale from 0, as units differ. The values are always written out. */
export function CompareBars({ rows }: { rows: CompareRow[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((r) => {
        const max = Math.max(r.first, r.current, r.target, r.previous ?? 0);
        const showPrevious = r.previous != null && r.previous !== r.first;
        return (
          <li key={`${r.testId}-${r.side ?? ""}`} className="flex flex-col gap-1">
            <span className="text-sm">
              {r.name}
              {r.side && <span className="text-muted"> · {SIDE[r.side]}</span>}
              {r.origin === "estimated" && <span className="text-xs text-muted"> · estimado</span>}
            </span>
            <Bar label="Inicial" value={r.first} max={max} unit={r.unit} tone="bg-muted" />
            {showPrevious && <Bar label="Anterior" value={r.previous as number} max={max} unit={r.unit} tone="bg-muted/60" />}
            <Bar label="Atual" value={r.current} max={max} unit={r.unit} tone="bg-accent" />
            <Bar label="Objetivo" value={r.target} max={max} unit={r.unit} tone="bg-accent2" />
          </li>
        );
      })}
    </ul>
  );
}

const monthName = (month: string, form: "short" | "long") => new Date(`${month}-15T12:00:00`).toLocaleDateString("pt-PT", form === "short" ? { month: "short" } : { month: "long", year: "numeric" });

const fmtMonth = (m: MonthAdherence) => `${monthName(m.month, "long")}: ${m.done} ${m.done === 1 ? "sessão" : "sessões"}${m.expected != null ? ` de cerca de ${m.expected}` : ""}${m.pct != null ? ` (${Math.round(m.pct)}%)` : ""}`;

const PLOT = 104; // px of bar height at the top of the scale, leaving room for its line

/** % of the expected sessions per month; just the sessions when there is no frequency to expect from. */
export function MonthBars({ months }: { months: MonthAdherence[] }) {
  const [active, setActive] = useState<string | null>(null);
  const hasGoal = months.some((m) => m.pct != null);
  const value = (m: MonthAdherence) => (hasGoal ? (m.pct ?? 0) : m.done);
  const top = Math.max(hasGoal ? 100 : 1, ...months.map(value));
  const shown = months.find((m) => m.month === active) ?? months[months.length - 1];

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto no-scrollbar">
        <div className="relative flex items-end gap-1 h-32 min-w-full" style={{ width: months.length > 16 ? `${months.length * 22}px` : undefined }}>
          {hasGoal && <div className="absolute inset-x-0 border-t border-dashed border-muted pointer-events-none" style={{ bottom: `${16 + (100 / top) * PLOT}px` }} />}
          {months.map((m) => (
            <button key={m.month} type="button" className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1" aria-label={fmtMonth(m)} onPointerEnter={() => setActive(m.month)} onClick={() => setActive(m.month)}>
              <span className={`block w-full max-w-6 rounded-t ${m.month === shown?.month ? "bg-accent" : "bg-accent/60"}`} style={{ height: `${(value(m) / top) * PLOT}px` }} />
              <span className="h-3 text-[10px] leading-3 text-muted">{monthName(m.month, "short").replace(".", "").slice(0, 3)}</span>
            </button>
          ))}
        </div>
      </div>
      {shown && <p className="text-xs">{fmtMonth(shown)}</p>}
      {hasGoal && <p className="text-xs text-muted">Linha tracejada: 100% das sessões esperadas, pelo plano semanal ou, antes dele, pela frequência da ficha.</p>}
    </div>
  );
}
