// Editing helpers for an item's sets, shared by the row editor and the prescribe sheet.

import { loadStep } from "./history";
import type { Item, SetRow } from "@treino/core/types";

type Field = "reps" | "duration" | "load" | "rir" | "rest";

const isWork = (s: SetRow) => s.type !== "warmup" && s.type !== "drop";

/** The set the steppers show and edit: first working set (or the first set). */
export function firstWork(item: Item): SetRow | undefined {
  return item.sets.find(isWork) ?? item.sets[0];
}

/** Change a value on every set, keeping pyramid differences (adds the delta). */
export function setAll(item: Item, field: Field, v: number | null): Item {
  // the first working set is the reference; warm-ups keep their own numbers
  const ref = firstWork(item);
  const first = ref?.[field] ?? null;
  const sets = (item.sets.length ? item.sets : [{}]).map((s: SetRow) => {
    if (item.sets.length && s.type === "warmup" && ref?.type !== "warmup") return s;
    if (v == null) return { ...s, [field]: null };
    const cur = s[field];
    return { ...s, [field]: cur == null || first == null ? v : Math.max(0, Math.round((cur + v - first) * 100) / 100) };
  });
  return { ...item, sets };
}

export function setCount(item: Item, n: number | null): Item {
  const count = Math.max(0, Math.round(n ?? 0));
  const last: SetRow = item.sets[item.sets.length - 1] ?? { reps: null, duration: null, load: null };
  const sets = item.sets.slice(0, count);
  while (sets.length < count) sets.push({ ...last, done: false });
  return { ...item, sets };
}



function roundLoad(item: Item, v: number): number {
  const step = loadStep(item);
  return Math.max(0, Math.round(v / step) * step);
}

/** First working set, the reference for the generators below. */
function base(item: Item): SetRow {
  return item.sets.find(isWork) ?? item.sets[0] ?? { reps: 10, load: null };
}

/**
 * Pyramid from the first working set: each set adds load and takes reps
 * (12/10/8/6). Reverse: heaviest first, then lighter with more reps.
 */
export function pyramid(item: Item, reverse = false): Item {
  const b = base(item);
  const n = Math.max(3, item.sets.filter(isWork).length);
  const load = b.load ?? null;
  const pct = 0.075; // ~7.5% load per step
  const sets: SetRow[] = Array.from({ length: n }, (_, i) => {
    const k = reverse ? -i : i;
    return {
      ...b,
      type: "work",
      reps: b.reps != null ? Math.max(1, b.reps - 2 * k) : null,
      load: load != null ? roundLoad(item, load * (1 + pct * k)) : null,
      rir: b.rir != null ? Math.max(0, b.rir - (reverse ? 0 : i)) : null,
      done: false,
    };
  });
  return { ...item, sets: [...item.sets.filter((s) => s.type === "warmup"), ...sets] };
}

/** Two ramp-up sets before the first working set (~50% and ~75% of its load). */
export function addWarmups(item: Item): Item {
  const b = base(item);
  if (b.load == null) return item;
  const reps = b.reps ?? 8;
  const warm: SetRow[] = [
    { reps: Math.max(reps, 8), load: roundLoad(item, b.load * 0.5), type: "warmup", rest: 60 },
    { reps: Math.max(3, Math.round(reps / 2)), load: roundLoad(item, b.load * 0.75), type: "warmup", rest: 90 },
  ];
  return { ...item, sets: [...warm, ...item.sets.filter((s) => s.type !== "warmup")] };
}

/** One lighter set (−15%, +2 reps) after the heaviest. */
export function addBackoff(item: Item): Item {
  const work = item.sets.filter(isWork);
  const top = work.reduce<SetRow | undefined>((a, s) => (!a || (s.load ?? 0) > (a.load ?? 0) ? s : a), undefined) ?? base(item);
  const set: SetRow = {
    ...top,
    type: "work",
    reps: top.reps != null ? top.reps + 2 : null,
    load: top.load != null ? roundLoad(item, top.load * 0.85) : null,
    done: false,
  };
  return { ...item, sets: [...item.sets, set] };
}

/** A drop right after the last set: −20% load, reps open (to failure), no rest before it. */
export function addDrop(item: Item): Item {
  const last = item.sets[item.sets.length - 1] ?? base(item);
  const sets = item.sets.map((s, i) => (i === item.sets.length - 1 ? { ...s, rest: 0 } : s));
  const drop: SetRow = { ...last, type: "drop", reps: null, rir: 0, load: last.load != null ? roundLoad(item, last.load * 0.8) : null, done: false };
  return { ...item, sets: [...sets, drop] };
}

const NEXT_TYPE: Record<string, SetRow["type"]> = { work: "warmup", warmup: "failure", failure: "drop", drop: "work" };

export function cycleType(s: SetRow): SetRow {
  return { ...s, type: NEXT_TYPE[s.type ?? "work"] };
}
