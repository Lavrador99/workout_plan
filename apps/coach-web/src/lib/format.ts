// Structured session → the coach's own text format (for WhatsApp, print, notes).

import type { Block, Item, SetRow, Session } from "./types";
import { fmtDate, fmtNum, fmtSec } from "./text";

export function fmtLoad(item: Item, load: number | null | undefined): string {
  if (load == null) return "";
  const range = item.loadMax != null ? `-${fmtNum(item.loadMax)}` : "";
  const v = `${fmtNum(load)}${range}kg`;
  if (item.loadMode === "dual") return `2x${v}`;
  if (item.loadMode === "added") return `+${v}`;
  return v;
}

function fmtVolume(item: Item, s: SetRow): string {
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

const same = (a: SetRow, b: SetRow) => a.reps === b.reps && a.duration === b.duration && a.load === b.load;

/** Prescription only, e.g. "3x8 2x8kg (E +1)". */
export function fmtRx(item: Item): string {
  const parts: string[] = [];
  const sets = item.sets;
  if (sets.length) {
    const uniform = sets.every((s) => same(s, sets[0]));
    if (uniform) {
      const vol = fmtVolume(item, sets[0]);
      const timed = sets[0].duration != null;
      if (vol) parts.push(sets.length > 1 ? `${sets.length}x${timed ? " " : ""}${vol}` : timed ? vol : `x${vol}`);
      else if (sets.length > 1) parts.push(`${sets.length} séries`);
      const load = fmtLoad(item, sets[0].load);
      if (load) parts.push(load);
    } else {
      parts.push(
        sets
          .map((s) => {
            const vol = fmtVolume(item, s);
            const load = fmtLoad(item, s.load);
            return vol && load ? `${vol}x${load}` : vol || load;
          })
          .join(" / "),
      );
    }
  }
  if (item.holdSec) parts.push(`iso ${item.holdSec}s`);
  if (item.rmTest) parts.push(`${item.rmTest}RM: ___`);
  if (item.extraLeft) parts.push(`(E +${item.extraLeft})`);
  if (item.note) parts.push(item.note);
  return parts.join(" ");
}

export function fmtItem(item: Item): string {
  const rx = fmtRx(item);
  const line = rx ? `${item.name} - ${rx}` : item.name;
  return item.role === "filler" ? `(${line})` : line;
}

export function fmtCircuitHeader(b: Block): string {
  let s = `${b.work ?? ""}"/${b.rest ?? ""}"`;
  if (b.rounds) s += ` x${b.rounds}`;
  if (b.roundRest) s += ` | ${fmtSec(b.roundRest)} rest`;
  return s;
}

export function fmtBlock(b: Block): string {
  const lines: string[] = [];
  if (b.kind === "circuit") lines.push(`**${fmtCircuitHeader(b)}**`);
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
