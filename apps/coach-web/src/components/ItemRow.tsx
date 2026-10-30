import { useState } from "react";
import { fmtLoad, fmtRx } from "../lib/format";
import { parseItemLine } from "../lib/parser";
import { fmtNum, fmtSec, num } from "../lib/text";
import type { Item, LoadMode, SetRow } from "../lib/types";
import ExerciseInput from "./ExerciseInput";
import Stepper from "./Stepper";

interface Props {
  item: Item;
  onChange: (item: Item) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}

type Field = "reps" | "duration" | "load";

/** Change a value on every set, keeping pyramid differences (adds the delta). */
function setAll(item: Item, field: Field, v: number | null): Item {
  const first = item.sets[0]?.[field] ?? null;
  const sets = (item.sets.length ? item.sets : [{}]).map((s) => {
    if (v == null) return { ...s, [field]: null };
    const cur = s[field];
    return { ...s, [field]: cur == null || first == null ? v : Math.max(0, Math.round((cur + v - first) * 100) / 100) };
  });
  return { ...item, sets };
}

function setCount(item: Item, n: number | null): Item {
  const count = Math.max(0, Math.round(n ?? 0));
  const last: SetRow = item.sets[item.sets.length - 1] ?? { reps: null, duration: null, load: null };
  const sets = item.sets.slice(0, count);
  while (sets.length < count) sets.push({ ...last, done: false });
  return { ...item, sets };
}

function chipText(item: Item, s: SetRow): string {
  const vol = s.duration != null ? fmtSec(s.duration) : s.reps != null ? String(s.reps) : "";
  const load = fmtLoad({ ...item, loadMax: null }, s.load);
  return [vol, load].filter(Boolean).join(" · ") || "✓";
}

export default function ItemRow({ item, onChange, onDelete, onMove }: Props) {
  const [open, setOpen] = useState(false);
  const timed = item.sets.some((s) => s.duration != null);
  const filler = item.role === "filler";
  const rx = fmtRx(item);

  const toggleDone = (i: number) => onChange({ ...item, sets: item.sets.map((s, j) => (j === i ? { ...s, done: !s.done } : s)) });
  const setRow = (i: number, patch: Partial<SetRow>) => onChange({ ...item, sets: item.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  const retype = (text: string) => {
    const p = parseItemLine(text);
    // typed only a name → keep the current prescription
    const hasRx = p.sets.length > 0 || p.extraLeft || p.rmTest || p.note;
    onChange(hasRx ? { ...p, id: item.id, role: item.role, exerciseId: undefined } : { ...item, name: p.name, exerciseId: undefined });
  };

  return (
    <div className={`py-2 ${filler ? "pl-4 border-l-2 border-border ml-1" : ""}`}>
      <button type="button" className="w-full text-left flex flex-wrap items-baseline gap-x-2" onClick={() => setOpen(!open)}>
        <span className={`font-semibold ${filler ? "text-sm text-muted" : ""}`}>{item.name || "—"}</span>
        <span className="text-sm text-accent2">{rx}</span>
      </button>

      {item.sets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {item.sets.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDone(i)}
              className={`rounded-full px-2.5 h-8 text-xs font-semibold border transition ${
                s.done ? "bg-success/20 border-success text-success" : "border-border bg-card2 text-muted"
              }`}
            >
              {s.done ? "✓ " : ""}
              {chipText(item, s)}
            </button>
          ))}
          {!!item.extraLeft && <span className="rounded-full px-2 h-8 inline-flex items-center text-xs text-accent border border-accent/40">E +{item.extraLeft}</span>}
        </div>
      )}

      {open && (
        <div className="mt-3 p-3 rounded-lg bg-bg border border-border flex flex-col gap-3">
          <ExerciseInput initial={item.name} placeholder="Nome (ou reescreve tudo: 3x10 12kg…)" onSubmit={retype} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stepper label="Séries" value={item.sets.length} step={1} onChange={(v) => onChange(setCount(item, v))} />
            {timed ? (
              <Stepper label="Tempo" suffix="s" value={item.sets[0]?.duration} step={5} onChange={(v) => onChange(setAll(item, "duration", v))} />
            ) : (
              <Stepper
                label={item.repsUnit === "passos" ? "Passos" : item.repsUnit === "m" ? "Metros" : "Reps"}
                value={item.sets[0]?.reps}
                step={1}
                onChange={(v) => onChange(setAll(item, "reps", v))}
              />
            )}
            <Stepper label="Carga" suffix="kg" value={item.sets[0]?.load} step={item.loadMode === "dual" ? 2 : 2.5} onChange={(v) => onChange(setAll(item, "load", v))} />
            <Stepper label="Extra esq." value={item.extraLeft ?? 0} step={1} onChange={(v) => onChange({ ...item, extraLeft: v || undefined })} />
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

          {item.sets.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="label text-left">
                  <th className="font-normal py-1">#</th>
                  <th className="font-normal">{timed ? "Seg" : "Reps"}</th>
                  <th className="font-normal">Kg</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {item.sets.map((s, i) => (
                  <tr key={i}>
                    <td className="text-muted w-6">{i + 1}</td>
                    <td className="pr-2 py-1">
                      <NumCell value={timed ? s.duration : s.reps} onChange={(v) => setRow(i, timed ? { duration: v } : { reps: v })} />
                    </td>
                    <td className="pr-2">
                      <NumCell value={s.load} onChange={(v) => setRow(i, { load: v })} />
                    </td>
                    <td className="w-10">
                      <button
                        type="button"
                        className={`w-9 h-9 rounded-lg border ${s.done ? "bg-success/20 border-success text-success" : "border-border text-muted"}`}
                        onClick={() => toggleDone(i)}
                      >
                        ✓
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Stepper label="Isometria" suffix="s" value={item.holdSec} step={1} onChange={(v) => onChange({ ...item, holdSec: v || null })} />
            <Stepper label="Teste RM" value={item.rmTest} step={1} onChange={(v) => onChange({ ...item, rmTest: v || null })} />
          </div>

          <label className="flex flex-col gap-1">
            <span className="label">Nota</span>
            <input className="input" value={item.note} placeholder="ex: calcanhares no chão, 4-5s excêntrica" onChange={(e) => onChange({ ...item, note: e.target.value })} />
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => onMove(-1)}>
              ↑
            </button>
            <button type="button" className="btn" onClick={() => onMove(1)}>
              ↓
            </button>
            <button type="button" className="btn" onClick={() => onChange({ ...item, role: filler ? "main" : "filler" })}>
              {filler ? "Tornar principal" : "Intercalado ( )"}
            </button>
            <button type="button" className="btn text-danger" onClick={onDelete}>
              Apagar
            </button>
            <button type="button" className="btn-accent ml-auto" onClick={() => setOpen(false)}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NumCell({ value, onChange }: { value: number | null | undefined; onChange: (v: number | null) => void }) {
  return (
    <input
      key={String(value)}
      className="input min-h-[36px] text-center"
      inputMode="decimal"
      defaultValue={fmtNum(value)}
      onBlur={(e) => {
        const v = num(e.target.value);
        if (v !== (value ?? null)) onChange(v);
      }}
    />
  );
}

export function Seg({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border overflow-hidden">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          className={`px-3 h-9 text-sm ${value === v ? "bg-accent text-black font-semibold" : "bg-card2 text-muted"}`}
          onClick={() => onChange(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
