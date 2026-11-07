import { ArrowDown, ArrowUp, Check, Copy } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { fmtLoad, fmtRx, SET_TYPE } from "../lib/format";
import { history, suggest } from "../lib/history";
import { GRIPS, STANCES } from "../lib/movement";
import { go } from "../lib/hooks";
import { SessionCtx } from "../lib/sessionContext";
import { parseItemLine } from "../lib/parser";
import { addBackoff, addDrop, addWarmups, cycleType, pyramid } from "../lib/rx";
import { fmtDate, fmtNum, fmtSec, num } from "../lib/text";
import { fmtSegment } from "../lib/run";
import type { Item, SetRow } from "../lib/types";
import { ChipPick } from "./Chips";
import ExerciseInput from "./ExerciseInput";
import MethodFields from "./MethodFields";
import { LevelPicker } from "./Progressions";
import RunFields from "./RunFields";
import RxFields from "./RxFields";
import Stepper from "./Stepper";

interface Props {
  item: Item;
  onChange: (item: Item) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate?: () => void;
  /** Drag handle (BlockCard's reorder). */
  handle?: React.ReactNode;
}

function chipText(item: Item, s: SetRow): string {
  if (item.run) return fmtSegment(s) || "✓";
  const vol = s.duration != null ? fmtSec(s.duration) : s.reps != null ? String(s.reps) : s.type === "drop" || s.type === "failure" ? "falha" : "";
  const load = fmtLoad({ ...item, loadMax: null }, s.load);
  const effort = s.rir != null ? `${item.effort === "rpe" ? "@" : "RIR "}${fmtNum(s.rir)}` : "";
  const mark = s.type && s.type !== "work" ? SET_TYPE[s.type].short + " " : "";
  return mark + ([vol, load, effort].filter(Boolean).join(" · ") || "✓");
}

export default function ItemRow({ item, onChange, onDelete, onMove, onDuplicate, handle }: Props) {
  const [open, setOpen] = useState(false);
  const timed = item.sets.some((s) => s.duration != null);
  const filler = item.role === "filler";
  const rx = fmtRx(item);

  const toggleDone = (i: number) => onChange({ ...item, sets: item.sets.map((s, j) => (j === i ? { ...s, done: !s.done } : s)) });
  const setRow = (i: number, patch: Partial<SetRow>) => onChange({ ...item, sets: item.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  const retype = (text: string) => {
    const p = parseItemLine(text);
    // typed only a name → keep the current prescription
    const hasRx = p.sets.length > 0 || p.extraLeft || p.extraRight || p.rmTest || p.note;
    onChange(hasRx ? { ...p, id: item.id, role: item.role, exerciseId: undefined } : { ...item, name: p.name, exerciseId: undefined });
  };

  return (
    <div className={`py-2 ${filler ? "pl-4 border-l-2 border-border ml-1" : ""}`}>
      <div className="flex items-start gap-1">
      {handle}
      <button type="button" className="flex-1 min-w-0 text-left flex flex-wrap items-baseline gap-x-2" onClick={() => setOpen(!open)}>
        <span className={`font-semibold ${filler ? "text-sm text-muted" : ""}`}>{item.name || "—"}</span>
        <span className="text-sm text-accent">{rx}</span>
        {(item.grip || item.stance) && <span className="text-xs text-muted">{[item.grip && `pega ${item.grip}`, item.stance && `pés ${item.stance}`].filter(Boolean).join(" · ")}</span>}
      </button>
      </div>

      {item.sets.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {item.sets.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDone(i)}
              className={`rounded-full px-3 h-10 text-xs font-semibold border transition ${
                s.done ? "bg-success/20 border-success text-success" : s.type === "warmup" ? "border-dashed border-border bg-transparent text-muted" : "border-border bg-card2 text-muted"
              }`}
            >
              {s.done && chipText(item, s) !== "✓" ? "✓ " : ""}
              {chipText(item, s)}
            </button>
          ))}
          {!!item.extraLeft && <span className="rounded-full px-2 h-10 inline-flex items-center text-xs text-accent border border-accent/40">E +{item.extraLeft}</span>}
          {!!item.extraRight && <span className="rounded-full px-2 h-10 inline-flex items-center text-xs text-accent border border-accent/40">D +{item.extraRight}</span>}
        </div>
      )}

      {open && (
        <div className="mt-3 p-3 rounded-lg bg-bg border border-border flex flex-col gap-3">
          <ExerciseInput initial={item.name} placeholder="Nome (ou reescreve tudo: 3x10 12kg…)" onSubmit={retype} />
          <LastTime item={item} onApply={onChange} />
          <LevelPicker item={item} onChange={onChange} />

          {item.run ? <RunFields item={item} onChange={onChange} /> : <RxFields item={item} onChange={onChange} />}

          {item.sets.length > 0 && !item.run && (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="label text-left">
                    <th className="font-normal py-1" title="Toca para mudar o tipo">Tipo</th>
                    <th className="font-normal">{timed ? "Seg" : "Reps"}</th>
                    <th className="font-normal">Kg</th>
                    <th className="font-normal">
                      <button type="button" className="underline decoration-dotted" onClick={() => onChange({ ...item, effort: item.effort === "rpe" ? "rir" : "rpe" })}>
                        {item.effort === "rpe" ? "RPE" : "RIR"}
                      </button>
                    </th>
                    <th className="font-normal">Desc.</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {item.sets.map((s, i) => (
                    <tr key={i} className={s.type === "warmup" ? "text-muted" : ""}>
                      <td className="w-12 pr-1">
                        <button type="button" className="w-11 h-10 rounded-lg border border-border text-xs font-semibold" onClick={() => setRow(i, cycleType(s))}>
                          {s.type && s.type !== "work" ? SET_TYPE[s.type].short : i + 1 - item.sets.slice(0, i).filter((x) => x.type === "warmup").length}
                        </button>
                      </td>
                      <td className="pr-1 py-1">
                        <NumCell value={timed ? s.duration : s.reps} onChange={(v) => setRow(i, timed ? { duration: v } : { reps: v })} />
                      </td>
                      <td className="pr-1">
                        <NumCell value={s.load} onChange={(v) => setRow(i, { load: v })} />
                      </td>
                      <td className="pr-1">
                        <NumCell value={s.rir} onChange={(v) => setRow(i, { rir: v })} />
                      </td>
                      <td className="pr-1">
                        <NumCell value={s.rest} onChange={(v) => setRow(i, { rest: v })} />
                      </td>
                      <td className="w-10">
                        <button
                          type="button"
                          className={`w-9 h-9 rounded-lg border ${s.done ? "bg-success/20 border-success text-success" : "border-border text-muted"}`}
                          onClick={() => toggleDone(i)}
                        >
                          <Check />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted -mt-2">
                Tipo: nº = efetiva · A aquecimento · F até à falha · D drop. Desc. em segundos. Deixa vazio para o atleta escolher.
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <button type="button" className="chip" onClick={() => onChange(pyramid(item))}>
                  ↗ Pirâmide
                </button>
                <button type="button" className="chip" onClick={() => onChange(pyramid(item, true))}>
                  ↘ Pirâmide inversa
                </button>
                <button type="button" className="chip" onClick={() => onChange(addWarmups(item))}>
                  + Aquecimento
                </button>
                <button type="button" className="chip" onClick={() => onChange(addBackoff(item))}>
                  + Back-off
                </button>
                <button type="button" className="chip" onClick={() => onChange(addDrop(item))}>
                  + Drop
                </button>
              </div>
            </>
          )}

          <MethodFields item={item} onChange={onChange} />

          <div className="grid grid-cols-2 gap-2">
            <Stepper label="Séries extra esq." value={item.extraLeft ?? 0} step={1} onChange={(v) => onChange({ ...item, extraLeft: v || undefined })} />
            <Stepper label="Séries extra dir." value={item.extraRight ?? 0} step={1} onChange={(v) => onChange({ ...item, extraRight: v || undefined })} />
            <Stepper label="Isometria" suffix="s" value={item.holdSec} step={1} onChange={(v) => onChange({ ...item, holdSec: v || null })} />
            <Stepper label="Teste RM" value={item.rmTest} step={1} onChange={(v) => onChange({ ...item, rmTest: v || null })} />
          </div>

          <div className="flex flex-col gap-1">
            <span className="label">Pega</span>
            <ChipPick options={GRIPS} value={item.grip} onChange={(grip) => onChange({ ...item, grip })} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Pés</span>
            <ChipPick options={STANCES} value={item.stance} onChange={(stance) => onChange({ ...item, stance })} />
          </div>

          <label className="flex flex-col gap-1">
            <span className="label">Nota</span>
            <input className="input" value={item.note} placeholder="ex: calcanhares no chão, 4-5s excêntrica" onChange={(e) => onChange({ ...item, note: e.target.value })} />
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => onMove(-1)}>
              <ArrowUp />
            </button>
            <button type="button" className="btn" onClick={() => onMove(1)}>
              <ArrowDown />
            </button>
            <button type="button" className="btn" onClick={() => onChange({ ...item, role: filler ? "main" : "filler" })}>
              {filler ? "Tornar principal" : "Intercalado ( )"}
            </button>
            {onDuplicate && (
              <button type="button" className="btn" onClick={onDuplicate}>
                <Copy /> Duplicar
              </button>
            )}
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
        <button type="button" className="btn-ghost text-accent" onClick={() => go("history", ctx.clientId, item.exerciseId ?? `n:${item.name}`)}>
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
      className="input min-h-[40px] text-center px-1"
      inputMode="decimal"
      defaultValue={fmtNum(value)}
      onBlur={(e) => {
        const v = num(e.target.value);
        if (v !== (value ?? null)) onChange(v);
      }}
    />
  );
}
