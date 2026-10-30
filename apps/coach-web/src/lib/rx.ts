// Editing helpers for an item's sets, shared by the row editor and the prescribe sheet.

import type { Item, SetRow } from "./types";

type Field = "reps" | "duration" | "load";

/** Change a value on every set, keeping pyramid differences (adds the delta). */
export function setAll(item: Item, field: Field, v: number | null): Item {
  const first = item.sets[0]?.[field] ?? null;
  const sets = (item.sets.length ? item.sets : [{}]).map((s) => {
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
