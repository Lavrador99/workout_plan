import { useContext, useMemo, useState } from "react";
import { fmtLoad, fmtRx } from "../lib/format";
import { history, suggest } from "../lib/history";
import { go } from "../lib/hooks";
import { SessionCtx } from "../lib/sessionContext";
import { parseItemLine } from "../lib/parser";
import { fmtDate, fmtNum, fmtSec, num } from "../lib/text";
import type { Item, SetRow } from "../lib/types";
import ExerciseInput from "./ExerciseInput";
import RxFields from "./RxFields";
import Stepper from "./Stepper";

interface Props {
  item: Item;
  onChange: (item: Item) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
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
          <LastTime item={item} onApply={onChange} />

          <RxFields item={item} onChange={onChange} />

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

          <div className="grid grid-cols-3 gap-2">
            <Stepper label="Extra esq." value={item.extraLeft ?? 0} step={1} onChange={(v) => onChange({ ...item, extraLeft: v || undefined })} />
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

/** "Última vez" for this client + one-tap repeat / progress. */
export function LastTime({ item, onApply }: { item: Item; onApply: (i: Item) => void }) {
  const ctx = useContext(SessionCtx);
  const occ = useMemo(
    () => (ctx ? history(ctx.sessions, item, { before: ctx.date, excludeId: ctx.sessionId }) : []),
    [ctx, item.exerciseId, item.name], // eslint-disable-line react-hooks/exhaustive-deps
  );
  if (!ctx || !occ.length) return null;
  const prev = occ[0];
  const sg = suggest(prev);
  const allDone = prev.item.sets.every((s) => s.done);
  return (
    <div className="rounded-lg border border-border p-2 flex flex-col gap-2">
      <div className="text-sm">
        <span className="label">Última vez · {fmtDate(prev.session.date)} </span>
        <div>
          {fmtRx(prev.item) || "—"} <span className={allDone ? "text-success" : "text-muted"}>{allDone ? "✓ tudo feito" : "incompleto"}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {sg && (
          <button type="button" className={sg.kind === "progress" ? "btn-accent" : "btn"} onClick={() => onApply(sg.apply(item))}>
            {sg.kind === "progress" ? "↑ " : "↺ "}
            {sg.label}
          </button>
        )}
        <button type="button" className="btn-ghost text-accent2" onClick={() => go("history", ctx.clientId, item.exerciseId ?? `n:${item.name}`)}>
          Histórico ({occ.length}) →
        </button>
      </div>
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
