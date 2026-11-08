import { ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { asymmetry, averageSpeed, finalValue, fmtAsymmetry, MAX_E1RM_REPS, relativeStrength, SIDE_SHORT, SIDES, type changeTone } from "../lib/assessment";
import { fmtDate, fmtNum, num } from "@treino/core/text";
import type { Assessment, Side, TestDef, TestResult, Trial } from "@treino/core/types";

export const TONE_CLASS: Record<ReturnType<typeof changeTone>, string> = { good: "text-success", bad: "text-danger", neutral: "text-muted" };

/** Keeps what is typed ("10,") while the stored value is already 10. */
export function NumberField({ value, disabled, onChange, label }: { value: number | null; disabled?: boolean; onChange: (v: number | null) => void; label: string }) {
  const [text, setText] = useState(fmtNum(value));
  useEffect(() => {
    if (num(text) !== value) setText(fmtNum(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <input
      className={`input text-center px-1 ${disabled ? "line-through text-muted" : ""}`}
      inputMode="decimal"
      aria-label={label}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(num(e.target.value));
      }}
    />
  );
}

function TrialCell({ trial, label, estimated, onChange }: { trial: Trial; label: string; estimated: boolean; onChange: (t: Trial) => void }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      {estimated ? (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          <NumberField value={trial.value} disabled={trial.invalid} label={`${label}, carga`} onChange={(value) => onChange({ ...trial, value })} />
          <span className="text-xs text-muted">kg ×</span>
          <NumberField value={trial.reps ?? null} disabled={trial.invalid} label={`${label}, repetições`} onChange={(reps) => onChange({ ...trial, reps })} />
        </div>
      ) : (
        <NumberField value={trial.value} disabled={trial.invalid} label={label} onChange={(value) => onChange({ ...trial, value })} />
      )}
      <button
        type="button"
        className={`text-[11px] leading-5 ${trial.invalid ? "text-danger font-semibold" : "text-muted"}`}
        aria-pressed={!!trial.invalid}
        onClick={() => {
          const { invalid, ...rest } = trial;
          onChange(invalid ? rest : { ...rest, invalid: true });
        }}
      >
        {trial.invalid ? "inválida" : "válida"}
      </button>
    </div>
  );
}

function ScoreCell({ trial, label, min, max, onChange }: { trial: Trial; label: string; min: number; max: number; onChange: (t: Trial) => void }) {
  const scores = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
  return (
    <div className="flex gap-1" role="group" aria-label={label}>
      {scores.map((n) => (
        <button key={n} type="button" className={`chip flex-1 justify-center h-10 ${trial.value === n ? "chip-on" : ""}`} aria-pressed={trial.value === n} onClick={() => onChange({ ...trial, value: trial.value === n ? null : n })}>
          {n}
        </button>
      ))}
    </div>
  );
}

const fmtSide = (r: TestResult, side: Side) => `${SIDE_SHORT[side]} ${fmtNum(finalValue(r, side)) || "—"}`;

/** "E 8,5  D 10,5 cm" or "34,5 cm"; empty when nothing was recorded. */
export function fmtFinal(r: TestResult): string {
  const tag = r.strength === "estimated" ? " (estimado)" : "";
  if (r.sided) return SIDES.some((s) => finalValue(r, s) != null) ? `${fmtSide(r, "left")}  ${fmtSide(r, "right")} ${r.unit}${tag}` : "";
  const v = finalValue(r);
  return v == null ? "" : `${fmtNum(v)} ${r.unit}${tag}`;
}

/** "1,6 × peso" or "E 0,5  D 0,6 × peso"; empty with no result or no weight. */
export function fmtRelative(r: TestResult, bodyMass: number | null | undefined): string {
  if (!r.strength) return "";
  const rel = (side?: Side) => relativeStrength(finalValue(r, side), bodyMass);
  if (r.sided) return SIDES.some((s) => rel(s) != null) ? `${SIDES.map((s) => `${SIDE_SHORT[s]} ${fmtNum(rel(s)) || "—"}`).join("  ")} × peso` : "";
  const v = rel();
  return v == null ? "" : `${fmtNum(v)} × peso`;
}

interface Props {
  result: TestResult;
  previous: { assessment: Assessment; result: TestResult } | null;
  date: string; // of this assessment
  test?: TestDef;
  bodyMass: { value: number; date: string } | null;
  /** Only one test is open at a time; the rest stay a line with their result. */
  open: boolean;
  onToggle: () => void;
  /** Move on to the next test. */
  onNext?: () => void;
  onChange: (r: TestResult) => void;
  onRemove: () => void;
}

/** One test in an assessment: its trials per side, the final values and the last result. */
export default function ResultCard({ result: r, previous, date, test, bodyMass, open, onToggle, onNext, onChange, onRemove }: Props) {
  const [info, setInfo] = useState(false);
  const card = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (open) card.current?.scrollIntoView({ block: "nearest" });
  }, [open]);

  const setTrial = (i: number, t: Trial) => onChange({ ...r, trials: r.trials.map((x, j) => (j === i ? t : x)) });
  const addTrial = () => {
    const added: Trial[] = r.sided ? SIDES.map((side) => ({ side, value: null })) : [{ value: null }];
    onChange({ ...r, trials: [...r.trials, ...added] });
  };

  const indexed = r.trials.map((t, i) => [t, i] as const);
  const rows: [Side | undefined, (typeof indexed)[number][]][] = r.sided ? SIDES.map((s) => [s, indexed.filter(([t]) => t.side === s)]) : [[undefined, indexed]];
  const columns = Math.max(...rows.map(([, cells]) => cells.length), 1);
  const final = fmtFinal(r);
  const asym = asymmetry(r);
  const sameProtocol = previous?.result.version === r.version;
  const estimated = r.strength === "estimated";
  const tooManyReps = estimated && r.trials.some((t) => (t.reps ?? 0) > MAX_E1RM_REPS);
  const relative = fmtRelative(r, bodyMass?.value);
  const speed = averageSpeed(test?.version === r.version ? test.distanceM : null, finalValue(r));

  if (!open)
    return (
      <li className="card">
        <button type="button" className="w-full text-left px-3 py-3 flex items-center gap-2" aria-expanded={false} onClick={onToggle}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${final ? "bg-success" : "bg-border"}`} />
          <span className="font-medium flex-1 min-w-0 truncate">{r.name}</span>
          <span className={`text-sm shrink-0 ${final ? "font-semibold" : "text-muted"}`}>{final || "—"}</span>
        </button>
      </li>
    );

  return (
    <li ref={card} className="card border-accent/50 p-3 flex flex-col gap-2 scroll-mt-20 scroll-mb-24">
      <div className="flex items-center gap-1">
        <button type="button" className="flex-1 min-w-0 flex items-baseline gap-2 text-left" aria-expanded onClick={onToggle}>
          <h3 className="font-semibold min-w-0 truncate">{r.name}</h3>
          <span className="text-xs text-muted shrink-0">{r.unit}</span>
        </button>
        <button type="button" className="btn-ghost min-h-[40px] px-2 text-muted" aria-label={`Ficha de ${r.name}`} aria-expanded={info} onClick={() => setInfo(!info)}>
          ⓘ
        </button>
        <button type="button" className="btn-ghost min-h-[40px] px-2 text-muted" aria-label={`Tirar ${r.name}`} onClick={onRemove}>
          <X />
        </button>
      </div>

      {info && (
        <dl className="text-sm flex flex-col gap-2 bg-card2 rounded-lg p-2">
          {test ? (
            (
              [
                ["Objetivo", test.purpose],
                ["Material", test.equipment],
                ["Instruções", test.instructions],
                ["Validade", test.validity],
              ] as const
            )
              .filter(([, text]) => text)
              .map(([label, text]) => (
                <div key={label}>
                  <dt className="label">{label}</dt>
                  <dd>{text}</dd>
                </div>
              ))
          ) : (
            <dd className="text-muted">Este teste foi apagado da biblioteca.</dd>
          )}
          {test && test.version !== r.version && <dd className="text-warn">Este resultado é da versão {r.version}. A ficha mostra a versão {test.version}.</dd>}
        </dl>
      )}

      {rows.map(([side, cells]) => (
        <div key={side ?? "both"} className="flex items-start gap-2">
          {side && <span className="w-4 shrink-0 text-sm font-semibold text-muted leading-10">{SIDE_SHORT[side]}</span>}
          <div className="grid gap-2 flex-1 min-w-0" style={{ gridTemplateColumns: `repeat(${r.scale ? 1 : columns}, minmax(0, 1fr))` }}>
            {cells.map(([trial, i], n) => {
              const label = `${r.name}${side ? ` ${SIDE_SHORT[side]}` : ""}, tentativa ${n + 1}`;
              return r.scale ? (
                <ScoreCell key={i} trial={trial} label={label} min={r.scale.min} max={r.scale.max} onChange={(t) => setTrial(i, t)} />
              ) : (
                <TrialCell key={i} trial={trial} label={label} estimated={estimated} onChange={(t) => setTrial(i, t)} />
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 text-sm">
        <span className="flex-1 min-w-0">
          {final ? (
            <>
              <span className="text-muted">Final </span>
              <span className="font-semibold">{final}</span>
            </>
          ) : (
            <span className="text-muted">Sem resultado</span>
          )}
        </span>
        {!r.scale && (
          <button type="button" className="text-xs text-accent shrink-0" onClick={addTrial}>
            + tentativa
          </button>
        )}
      </div>
      {tooManyReps && <p className="text-xs text-warn">Sem estimativa acima de {MAX_E1RM_REPS} repetições.</p>}
      {relative && (
        <p className="text-sm">
          Força relativa: {relative}
          {bodyMass?.date !== date && <span className="text-xs text-muted"> (peso de {fmtDate(bodyMass?.date ?? "")})</span>}
        </p>
      )}
      {r.strength && final && !bodyMass && <p className="text-xs text-muted">Sem peso recente para calcular a força relativa.</p>}
      {speed != null && <p className="text-sm">Velocidade média: {fmtNum(speed)} m/s</p>}
      {asym && <p className="text-sm">Assimetria: {fmtAsymmetry(asym, r.unit)}</p>}
      {previous && (
        <p className="text-xs text-muted">
          Anterior ({fmtDate(previous.assessment.date)}): {sameProtocol ? fmtFinal(previous.result) : "protocolo diferente"}
        </p>
      )}
      {onNext && (
        <button type="button" className="btn self-end" onClick={onNext}>
          Seguinte <ChevronRight />
        </button>
      )}
    </li>
  );
}
