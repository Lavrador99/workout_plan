// Running a session live: the order sets are done in, ticking them and
// editing the numbers as the athlete goes.

import type { Block, Item, Session, SetRow } from "./types";

/**
 * One thing to tick. "set" = one set of an item; "item" = an item with no
 * sets (mobility, "Elephant wall"); "block" = a whole circuit/EMOM/AMRAP.
 * `group` ties together what is done in turns (superset, main + fillers).
 */
export type Step =
  | { kind: "set"; bi: number; ii: number; si: number; group: string }
  | { kind: "item"; bi: number; ii: number; group: string }
  | { kind: "block"; bi: number; group: string };

export const isTimed = (b: Block) => b.kind === "circuit" || b.kind === "emom" || b.kind === "amrap";

/** Items done in turns: the whole superset, or each main with the fillers after it. */
function groups(b: Block): number[][] {
  if (b.kind === "superset") return [b.items.map((_, i) => i)];
  const out: number[][] = [];
  b.items.forEach((it, i) => {
    if (it.role === "filler" && out.length) out[out.length - 1].push(i);
    else out.push([i]);
  });
  return out;
}

/** Every step of the session, in the order they are done (supersets alternate set by set). */
export function buildSteps(s: Session): Step[] {
  const out: Step[] = [];
  s.blocks.forEach((b, bi) => {
    if (!b.items.length) return;
    if (isTimed(b)) return void out.push({ kind: "block", bi, group: `${bi}` });
    groups(b).forEach((g, gi) => {
      const group = `${bi}:${gi}`;
      const rounds = Math.max(1, ...g.map((ii) => b.items[ii].sets.length));
      for (let si = 0; si < rounds; si++)
        for (const ii of g) {
          const it = b.items[ii];
          if (!it.sets.length) si === 0 && out.push({ kind: "item", bi, ii, group });
          else if (it.sets[si]) out.push({ kind: "set", bi, ii, si, group });
        }
    });
  });
  return out;
}

const allDone = (it: Item) => it.sets.length > 0 && it.sets.every((x) => x.done);

export function isDone(s: Session, st: Step): boolean {
  const b = s.blocks[st.bi];
  if (!b) return false;
  if (st.kind === "block") return b.items.every(allDone);
  const it = b.items[st.ii];
  if (!it) return false;
  return st.kind === "set" ? !!it.sets[st.si]?.done : allDone(it);
}

export const sameStep = (a: Step | undefined, b: Step | undefined) =>
  !!a && !!b && a.kind === b.kind && a.bi === b.bi && (a.kind === "block" || (b.kind !== "block" && a.ii === b.ii && (a.kind !== "set" || (b.kind === "set" && a.si === b.si))));

function mapItem(s: Session, bi: number, ii: number, f: (it: Item) => Item): Session {
  return { ...s, blocks: s.blocks.map((b, j) => (j === bi ? { ...b, items: b.items.map((it, k) => (k === ii ? f(it) : it)) } : b)) };
}

/** Item with no sets gets one ticked set, so "done" is kept (and syncs). */
const tickAll = (it: Item, done: boolean): Item => ({ ...it, sets: it.sets.length ? it.sets.map((x) => ({ ...x, done })) : done ? [{ done: true }] : [] });

export function setDone(s: Session, st: Step, done: boolean): Session {
  if (st.kind === "block") return { ...s, blocks: s.blocks.map((b, j) => (j === st.bi ? { ...b, items: b.items.map((it) => tickAll(it, done)) } : b)) };
  if (st.kind === "item") return mapItem(s, st.bi, st.ii, (it) => tickAll(it, done));
  return mapItem(s, st.bi, st.ii, (it) => ({ ...it, sets: it.sets.map((x, k) => (k === st.si ? { ...x, done } : x)) }));
}

type Field = "reps" | "duration" | "load" | "rir";

/**
 * Change one set. The sets still to do that had the same number follow,
 * so going up 2.5kg on set 2 also raises sets 3 and 4 (a different number
 * there, e.g. a pyramid, is left alone).
 */
export function editSet(s: Session, bi: number, ii: number, si: number, field: Field, v: number | null): Session {
  return mapItem(s, bi, ii, (it) => {
    const cur = it.sets[si];
    if (!cur) return it;
    const old = cur[field] ?? null;
    const type = cur.type ?? "work";
    return {
      ...it,
      sets: it.sets.map((x, k) => (k === si || (k > si && !x.done && (x.type ?? "work") === type && (x[field] ?? null) === old) ? { ...x, [field]: v } : x)),
    };
  });
}

/** One more set like the last one, after it. */
export function addSet(s: Session, bi: number, ii: number): Session {
  return mapItem(s, bi, ii, (it) => {
    const last: SetRow = it.sets[it.sets.length - 1] ?? {};
    return { ...it, sets: [...it.sets, { ...last, done: false }] };
  });
}

export const DEFAULT_REST = 90;

/**
 * Seconds of rest after ticking a step: the set's own rest; none when the
 * next step is the other exercise of the same superset/filler pair.
 */
export function restAfter(s: Session, steps: Step[], st: Step): number {
  if (st.kind !== "set") return 0;
  const set = s.blocks[st.bi]?.items[st.ii]?.sets[st.si];
  if (set?.rest != null) return set.rest;
  const i = steps.findIndex((x) => sameStep(x, st));
  const next = steps[i + 1];
  if (!next) return 0;
  // later in the same turn (items of a turn go in order); back to the first = end of the turn
  if (next.group === st.group && next.kind !== "block" && next.ii > st.ii) return 0;
  return DEFAULT_REST;
}

/**
 * The first step not done after position `from` (wrapping round), or the first
 * not done at all. A position, not a step: ticking an item with no sets turns
 * its step into a "set" step at the same place.
 */
export function nextOpen(s: Session, steps: Step[], from = -1): Step | undefined {
  for (let k = 1; k <= steps.length; k++) {
    const st = steps[(from + k + steps.length) % steps.length];
    if (!isDone(s, st)) return st;
  }
  return undefined;
}
