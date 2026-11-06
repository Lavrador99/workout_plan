import { useContext } from "react";
import { fmtRunTotal, newSegment, zoneName, zoneRange, ZONES } from "../lib/run";
import { SessionCtx } from "../lib/sessionContext";
import type { Item, RunZone, SetRow } from "../lib/types";
import { NumberField } from "./ResultCard";
import Seg from "./Seg";

const BY: [string, string][] = [
  ["distance", "Km"],
  ["time", "Min"],
];
const GOAL: [string, string][] = [
  ["hr", "FC"],
  ["pace", "Ritmo"],
  ["none", "Sem meta"],
];

function Segment({ s, index, onChange, onRemove, onCopy, only }: { s: SetRow; index: number; onChange: (s: SetRow) => void; onRemove: () => void; onCopy: () => void; only: boolean }) {
  const client = useContext(SessionCtx)?.client;
  const timed = s.duration != null;
  const range = s.zone ? zoneRange(s.zone, client) : null;
  const pickGoal = (kind: string) => onChange({ ...s, zone: kind === "none" ? null : { kind: kind as RunZone["kind"], zone: s.zone?.zone ?? 2 } });

  return (
    <li className="card p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="label flex-1">Segmento {index + 1}</span>
        <button type="button" className="btn-ghost text-xs" onClick={onCopy}>
          Duplicar
        </button>
        {!only && (
          <button type="button" className="btn-ghost text-xs text-danger" onClick={onRemove}>
            Remover
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Seg options={BY} value={timed ? "time" : "distance"} onChange={(v) => onChange(v === "time" ? { ...s, reps: null, duration: 300 } : { ...s, reps: 1000, duration: null })} />
        <span className="flex-1 min-w-0">
          <NumberField
            key={timed ? "time" : "distance"}
            value={timed ? (s.duration as number) / 60 : s.reps == null ? null : s.reps / 1000}
            label={timed ? "Minutos" : "Quilómetros"}
            onChange={(v) => onChange(timed ? { ...s, duration: Math.round((v ?? 0) * 60) } : { ...s, reps: Math.round((v ?? 0) * 1000) })}
          />
        </span>
      </div>
      <Seg options={GOAL} value={s.zone?.kind ?? "none"} onChange={pickGoal} />
      {s.zone && (
        <>
          <Seg options={ZONES.map((z) => [String(z), `Z${z}`])} value={String(s.zone.zone)} onChange={(z) => onChange({ ...s, zone: { kind: (s.zone as RunZone).kind, zone: Number(z) as RunZone["zone"] } })} />
          <p className="text-xs text-muted">
            {zoneName(s.zone)}
            {range ? ` · ${range}` : ` · ${s.zone.kind === "hr" ? "preenche a FC máx na ficha" : "preenche o ritmo de limiar na ficha"} para ver os valores`}
          </p>
        </>
      )}
    </li>
  );
}

/** A run as a list of segments, each one set of the item. */
export default function RunFields({ item, onChange }: { item: Item; onChange: (item: Item) => void }) {
  const sets = (next: SetRow[]) => onChange({ ...item, sets: next });
  const total = fmtRunTotal(item);
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {item.sets.map((s, i) => (
          <Segment
            key={i}
            s={s}
            index={i}
            only={item.sets.length === 1}
            onChange={(x) => sets(item.sets.map((y, j) => (j === i ? x : y)))}
            onRemove={() => sets(item.sets.filter((_, j) => j !== i))}
            onCopy={() => sets([...item.sets.slice(0, i + 1), { ...s, done: false }, ...item.sets.slice(i + 1)])}
          />
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <button type="button" className="btn" onClick={() => sets([...item.sets, newSegment()])}>
          + Segmento
        </button>
        {total && <span className="text-sm text-muted">Total: {total}</span>}
      </div>
    </div>
  );
}
