// Structured session → the coach's own text format (for WhatsApp, print, notes).

import { fmtDistanceOrTime, fmtZone } from "./run";
import type { Block, Item, ItemMethod, SetRow, SetType, Session } from "./types";
import { fmtDate, fmtNum, fmtSec } from "./text";

export const SET_TYPE: Record<SetType, { short: string; label: string }> = {
  warmup: { short: "A", label: "aquecimento" },
  work: { short: "", label: "efetiva" },
  failure: { short: "F", label: "até à falha" },
  drop: { short: "D", label: "drop" },
};

export function fmtMethod(m: ItemMethod): string {
  switch (m.type) {
    case "restpause":
      return `rest-pause +${m.miniSets} (${m.pause}s)`;
    case "cluster":
      return `cluster ${m.clusters}×${m.reps} (${m.pause}s)`;
    case "myo":
      return `myo-reps ${m.activation} + ${m.miniSets}×${m.miniReps} (${m.pause}s)`;
    case "mechdrop":
      return `drop mecânico: ${m.variants}`;
  }
}

function fmtEffort(item: Item, v: number | null | undefined): string {
  if (v == null) return "";
  return item.effort === "rpe" ? `@${fmtNum(v)}` : `RIR ${fmtNum(v)}`;
}

export function fmtLoad(item: Item, load: number | null | undefined): string {
  if (load == null) return "";
  const range = item.loadMax != null ? `-${fmtNum(item.loadMax)}` : "";
  const v = `${fmtNum(load)}${range}kg`;
  if (item.loadMode === "dual") return `2x${v}`;
  if (item.loadMode === "added") return `+${v}`;
  return v;
}

function fmtVolume(item: Item, s: SetRow): string {
  if (item.run) return fmtDistanceOrTime(s);
  if (s.duration != null) {
    const max = item.durationMax != null ? `-${item.durationMax}` : "";
    return s.duration >= 60 && !max ? fmtSec(s.duration) : `${s.duration}${max}s`;
  }
  if (s.reps != null) {
    const max = item.repsMax != null ? `-${item.repsMax}` : "";
    const unit = item.repsUnit === "passos" ? " passos" : item.repsUnit === "m" ? "m" : "";
    return `${s.reps}${max}${unit}`;
  }
  return "";
}

const same = (a: SetRow, b: SetRow) =>
  a.reps === b.reps && a.duration === b.duration && a.load === b.load && (a.rir ?? null) === (b.rir ?? null) && (a.type ?? "work") === (b.type ?? "work") && a.zone?.kind === b.zone?.kind && a.zone?.zone === b.zone?.zone;

/** Prescription only, e.g. "3x8 2x8kg (E +1)". */
export function fmtRx(item: Item): string {
  const parts: string[] = [];
  const sets = item.sets;
  if (sets.length) {
    const uniform = sets.every((s) => same(s, sets[0]));
    if (uniform) {
      const vol = fmtVolume(item, sets[0]);
      const timed = sets[0].duration != null;
      if (item.run) parts.push(`${sets.length > 1 ? `${sets.length}x` : ""}${vol}`);
      else if (vol) parts.push(sets.length > 1 ? `${sets.length}x${timed ? " " : ""}${vol}` : timed ? vol : `x${vol}`);
      else if (sets.length > 1) parts.push(`${sets.length} séries`);
      if (sets[0].zone) parts.push(fmtZone(sets[0].zone));
      const load = fmtLoad(item, sets[0].load);
      if (load) parts.push(load);
      const effort = fmtEffort(item, sets[0].rir);
      if (effort) parts.push(effort);
    } else {
      parts.push(
        sets
          .map((s) => {
            const vol = fmtVolume(item, s) || (s.type === "drop" || s.type === "failure" ? "falha" : "");
            const load = fmtLoad(item, s.load);
            const mark = s.type && s.type !== "work" ? `${SET_TYPE[s.type].short}:` : "";
            return mark + [vol && load ? `${vol}x${load}` : vol || load, s.zone && fmtZone(s.zone), fmtEffort(item, s.rir)].filter(Boolean).join(" ");
          })
          .join(" / "),
      );
    }
    const rests = [...new Set(sets.filter((s) => s.rest).map((s) => s.rest as number))];
    if (rests.length === 1) parts.push(`desc. ${fmtSec(rests[0])}`);
  }
  if (item.method) parts.push(fmtMethod(item.method));
  if (item.tempo) parts.push(`tempo ${item.tempo}`);
  if (item.holdSec) parts.push(`iso ${item.holdSec}s`);
  if (item.rmTest) parts.push(`${item.rmTest}RM: ___`);
  if (item.extraLeft) parts.push(`(E +${item.extraLeft})`);
  if (item.extraRight) parts.push(`(D +${item.extraRight})`);
  if (item.note) parts.push(item.note);
  return parts.join(" ");
}

export function fmtItem(item: Item): string {
  const rx = fmtRx(item);
  const line = rx ? `${item.name} - ${rx}` : item.name;
  return item.role === "filler" ? `(${line})` : line;
}

export function fmtCircuitHeader(b: Block): string {
  if (b.kind === "emom") return `EMOM ${b.work && b.work !== 60 ? `${fmtSec(b.work)} ` : ""}x${b.rounds ?? "?"}`;
  if (b.kind === "amrap") return `AMRAP ${fmtSec(b.work) || "?"}`;
  let s = `${b.work ?? ""}"/${b.rest ?? ""}"`;
  if (b.rounds) s += ` x${b.rounds}`;
  if (b.roundRest) s += ` | ${fmtSec(b.roundRest)} rest`;
  return s;
}

export function fmtBlock(b: Block): string {
  const lines: string[] = [];
  if (b.kind === "circuit" || b.kind === "emom" || b.kind === "amrap") lines.push(`**${fmtCircuitHeader(b)}**`);
  else if (b.title) lines.push(b.title);
  // consecutive fillers are written together: (Russian twist, side bends)
  for (let i = 0; i < b.items.length; i++) {
    const it = b.items[i];
    if (it.role === "filler") {
      const group = [it];
      while (b.items[i + 1]?.role === "filler") group.push(b.items[++i]);
      lines.push(`(${group.map((g) => fmtItem({ ...g, role: "main" })).join(", ")})`);
    } else lines.push(fmtItem(it));
  }
  return lines.join("\n");
}

export function fmtSession(s: Session): string {
  const head = [`**${fmtDate(s.date)}**`];
  if (s.title) head.push(`**${s.title}**`);
  const body = s.blocks.map(fmtBlock).filter(Boolean);
  return [head.join("\n"), ...body, s.notes].filter(Boolean).join("\n\n");
}
