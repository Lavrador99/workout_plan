// Extra sets on one side (E +1 / D +1) are sets like any other, marked with the
// side, so they can be ticked live, sync as ops and count where sets count.
// Older items kept only a number (extraLeft / extraRight): read it, and turn it
// into sets with withSidedExtras.

import type { Item, SetRow, Side } from "./types";

export const SIDE_LETTER: Record<Side, string> = { left: "E", right: "D" };

/** The sets for both sides: what the prescription line and the plain count read. */
export const mainSets = (it: Item): SetRow[] => it.sets.filter((s) => !s.side);

export function extraCount(it: Item, side: Side): number {
  const n = it.sets.filter((s) => s.side === side).length;
  if (n) return n;
  return (side === "left" ? it.extraLeft : it.extraRight) ?? 0;
}

/** A new extra set copies the last work set of both sides. */
function extraSet(it: Item, side: Side, done = false): SetRow {
  const main = mainSets(it).filter((s) => s.type !== "warmup");
  const { done: _done, at: _at, ...base } = main[main.length - 1] ?? {};
  return { ...base, side, done };
}

/** The legacy numbers as sets; the item as it was when there are none. */
export function withSidedExtras(it: Item): Item {
  if (!it.extraLeft && !it.extraRight) return it;
  const { extraLeft, extraRight, ...rest } = it;
  // in a session already done, the extra sets were done with the rest
  const ticked = it.sets.some((s) => s.done);
  let out: Item = rest;
  for (const [side, n] of [
    ["left", extraLeft ?? 0],
    ["right", extraRight ?? 0],
  ] as const) {
    if (!n || out.sets.some((s) => s.side === side)) continue;
    out = { ...out, sets: [...out.sets, ...Array.from({ length: n }, () => extraSet(out, side, ticked))] };
  }
  return out;
}

/** Set how many extra sets one side has: new ones go after the others, the last ones go first. */
export function setExtras(it: Item, side: Side, n: number): Item {
  let out = withSidedExtras(it);
  const have = out.sets.filter((s) => s.side === side).length;
  if (n > have) return { ...out, sets: [...out.sets, ...Array.from({ length: n - have }, () => extraSet(out, side))] };
  let drop = have - n;
  const sets = [...out.sets];
  for (let i = sets.length - 1; i >= 0 && drop > 0; i--)
    if (sets[i].side === side) {
      sets.splice(i, 1);
      drop--;
    }
  out = { ...out, sets };
  return out;
}
