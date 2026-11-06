// Per-client exercise history and the progression suggestion built on it.

import type { Item, Session, SetRow } from "./types";
import { fmtNum, norm } from "./text";

export interface Occurrence {
  session: Session;
  item: Item;
}

/** Same exercise: linked library id, or the same written name. */
export function sameExercise(a: Pick<Item, "exerciseId" | "name">, b: Pick<Item, "exerciseId" | "name">): boolean {
  if (a.exerciseId && b.exerciseId) return a.exerciseId === b.exerciseId;
  return norm(a.name) === norm(b.name);
}

/** Times this exercise appears in the sessions, newest first. */
export function history(sessions: Session[], target: Pick<Item, "exerciseId" | "name">, opts: { before?: string; excludeId?: string } = {}): Occurrence[] {
  const out: Occurrence[] = [];
  for (const s of sessions) {
    if (s.deleted || s.id === opts.excludeId) continue;
    if (opts.before && s.date > opts.before) continue;
    for (const b of s.blocks) for (const item of b.items) if (item.sets.length && sameExercise(item, target)) out.push({ session: s, item });
  }
  return out.sort((a, b) => b.session.date.localeCompare(a.session.date) || b.session.updatedAt - a.session.updatedAt);
}

/** Heaviest set (ticked sets only, if any were ticked). */
export function topSet(item: Item): SetRow | null {
  const pool = item.sets.some((s) => s.done) ? item.sets.filter((s) => s.done) : item.sets;
  let best: SetRow | null = null;
  for (const s of pool) {
    if (!best) best = s;
    else if ((s.load ?? -1) > (best.load ?? -1)) best = s;
    else if ((s.load ?? -1) === (best.load ?? -1) && ((s.reps ?? s.duration ?? 0) > (best.reps ?? best.duration ?? 0))) best = s;
  }
  return best;
}

export function loadStep(item: Item): number {
  return item.loadMode === "dual" ? 2 : 2.5;
}

export interface Suggestion {
  kind: "progress" | "repeat";
  label: string;
  /** The item rewritten with the suggested sets (current name, note, role kept). */
  apply: (current: Item) => Item;
}

/**
 * Last time all sets were ticked → add load (or a rep / 5s without load).
 * Otherwise → repeat what was done.
 */
export function suggest(prev: Occurrence | undefined): Suggestion | null {
  if (prev?.item.run) return null; // a run progresses by its segments, the coach's call
  if (!prev || !prev.item.sets.length) return null;
  const p = prev.item;
  const allDone = p.sets.every((s) => s.done);
  const hasLoad = p.sets.some((s) => s.load != null);
  const timed = p.sets.some((s) => s.duration != null);
  const step = loadStep(p);

  const sets: SetRow[] = p.sets.map((s) => {
    const r: SetRow = { ...s, reps: s.reps ?? null, duration: s.duration ?? null, load: s.load ?? null, done: false };
    if (!allDone || s.type === "warmup") return r;
    if (hasLoad) r.load = s.load != null ? s.load + step : null;
    else if (timed) r.duration = (s.duration ?? 0) + 5;
    else if (r.reps != null) r.reps += 1;
    return r;
  });

  const what = !allDone ? "" : hasLoad ? `+${fmtNum(step)}kg` : timed ? "+5s" : "+1 rep";
  return {
    kind: allDone ? "progress" : "repeat",
    label: allDone ? `Progredir (${what})` : "Repetir a última",
    apply: (cur) => ({
      ...cur,
      loadMode: p.loadMode,
      repsUnit: p.repsUnit,
      repsMax: p.repsMax,
      durationMax: p.durationMax,
      loadMax: allDone && p.loadMax != null ? p.loadMax + step : p.loadMax,
      sets,
    }),
  };
}
