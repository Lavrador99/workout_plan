// ─────────────────────────────────────────────────────────────────────────────
// Live sessions changed by several people at once (coach, client, screen).
// Instead of the whole session, each change travels as a small op. Applying
// an op is idempotent and per field: of two changes to the same field of the
// same set, the one with the later `at` wins; changes to different fields or
// sets never undo each other. Items are found by id, so an op still lands on
// the right exercise if blocks were reordered meanwhile.
// ─────────────────────────────────────────────────────────────────────────────

import type { Item, Session, SetField, SetRow, Step } from "./types";

interface OpBase {
  sessionId: string;
  at: number; // ms, when it happened on the device
}

export type LiveOp = OpBase &
  (
    | { op: "set"; item: string; si: number; field: SetField; value: number | boolean | null }
    /** One more set, copied from the last; `si` is the index it gets (two "one more" at once add one). */
    | { op: "addSet"; item: string; si: number }
    | { op: "cursor"; step: Step | null; restUntil: number | null }
    | { op: "start" }
    | { op: "end" }
  );

const FIELDS: readonly SetField[] = ["done", "reps", "load", "rir", "duration"];

/** Upper bounds, to refuse nonsense from outside (a typo, a bad client). */
const MAX: Record<Exclude<SetField, "done">, number> = { reps: 10_000, load: 2_000, rir: 10, duration: 86_400 };

function findItem(s: Session, id: string): [number, number] | null {
  for (let bi = 0; bi < s.blocks.length; bi++) {
    const ii = s.blocks[bi].items.findIndex((it) => it.id === id);
    if (ii >= 0) return [bi, ii];
  }
  return null;
}

function mapItem(s: Session, id: string, f: (it: Item) => Item): Session {
  const pos = findItem(s, id);
  if (!pos) return s;
  const [bi, ii] = pos;
  const it = s.blocks[bi].items[ii];
  const next = f(it);
  if (next === it) return s;
  return { ...s, blocks: s.blocks.map((b, j) => (j === bi ? { ...b, items: b.items.map((x, k) => (k === ii ? next : x)) } : b)) };
}

/** Apply one op. Returns the same object when the op changes nothing (older, unknown item, already applied). */
export function applyOp(s: Session, op: LiveOp): Session {
  switch (op.op) {
    case "set":
      return mapItem(s, op.item, (it) => {
        // an item with no sets (mobility) is ticked by creating its one set
        if (it.sets.length === 0 && op.si === 0 && op.field === "done")
          return { ...it, sets: [{ done: op.value === true, at: { done: op.at } }] };
        const cur = it.sets[op.si];
        if (!cur || (cur.at?.[op.field] ?? 0) > op.at) return it;
        if (cur[op.field] === op.value && cur.at?.[op.field] === op.at) return it;
        const set: SetRow = { ...cur, [op.field]: op.value, at: { ...cur.at, [op.field]: op.at } };
        return { ...it, sets: it.sets.map((x, k) => (k === op.si ? set : x)) };
      });
    case "addSet":
      return mapItem(s, op.item, (it) => {
        if (it.sets.length !== op.si) return it;
        const last: SetRow = it.sets[it.sets.length - 1] ?? {};
        return { ...it, sets: [...it.sets, { ...last, done: false, at: null }] };
      });
    case "cursor":
      if ((s.live?.at ?? 0) > op.at) return s;
      return { ...s, live: { step: op.step, restUntil: op.restUntil, at: op.at } };
    case "start":
      return s.startedAt ? s : { ...s, startedAt: op.at };
    case "end":
      return s.endedAt ? s : { ...s, endedAt: op.at };
  }
}

export const applyOps = (s: Session, ops: readonly LiveOp[]) => ops.reduce(applyOp, s);

const strip = <T extends object>(o: T, ...keys: (keyof T)[]) => {
  const c = { ...o };
  for (const k of keys) delete c[k];
  return JSON.stringify(c);
};

/**
 * The ops that turn `before` into `after`, all stamped `at`. null when the
 * change is not only sets/cursor/start/end (an exercise swapped, a block
 * edited, a set removed): that one has to be saved as a whole session.
 */
export function diffOps(before: Session, after: Session, at: number): LiveOp[] | null {
  const sessionId = after.id;
  if (before.id !== after.id || before.blocks.length !== after.blocks.length) return null;
  if (strip(before, "blocks", "startedAt", "endedAt", "live", "updatedAt", "dirty") !== strip(after, "blocks", "startedAt", "endedAt", "live", "updatedAt", "dirty"))
    return null;

  const ops: LiveOp[] = [];
  if (!before.startedAt && after.startedAt) ops.push({ op: "start", sessionId, at });
  else if (before.startedAt !== after.startedAt) return null;
  if (!before.endedAt && after.endedAt) ops.push({ op: "end", sessionId, at });
  else if (before.endedAt !== after.endedAt) return null;

  for (let bi = 0; bi < after.blocks.length; bi++) {
    const b0 = before.blocks[bi];
    const b1 = after.blocks[bi];
    if (b0.items.length !== b1.items.length || strip(b0, "items") !== strip(b1, "items")) return null;
    for (let ii = 0; ii < b1.items.length; ii++) {
      const i0 = b0.items[ii];
      const i1 = b1.items[ii];
      if (i0.id !== i1.id || strip(i0, "sets") !== strip(i1, "sets") || i1.sets.length < i0.sets.length) return null;
      for (let si = 0; si < i1.sets.length; si++) {
        let base = i0.sets[si];
        if (!base) {
          if (i0.sets.length === 0 && si === 0 && i1.sets.length === 1) base = {}; // ticking an item with no sets
          else {
            ops.push({ op: "addSet", sessionId, at, item: i1.id, si });
            base = { ...(i1.sets[si - 1] ?? {}), done: false };
          }
        }
        const s1 = i1.sets[si];
        if (strip(base, ...FIELDS, "at") !== strip(s1, ...FIELDS, "at")) return null; // type, rest, zone: not live
        for (const field of FIELDS)
          if ((base[field] ?? null) !== (s1[field] ?? null)) ops.push({ op: "set", sessionId, at, item: i1.id, si, field, value: s1[field] ?? null });
      }
    }
  }

  const c0 = before.live ?? null;
  const c1 = after.live ?? null;
  if (JSON.stringify(c0?.step ?? null) !== JSON.stringify(c1?.step ?? null) || (c0?.restUntil ?? null) !== (c1?.restUntil ?? null))
    ops.push({ op: "cursor", sessionId, at, step: c1?.step ?? null, restUntil: c1?.restUntil ?? null });
  return ops;
}

// ── validation of ops from outside (the API) ────────────────────────────────

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isIndex = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0 && (x as number) < 1000;
const isTime = (x: unknown): x is number => Number.isInteger(x) && (x as number) > 0;
const isId = (x: unknown): x is string => typeof x === "string" && x.length > 0 && x.length <= 100;

function parseStep(x: unknown): Step | null | undefined {
  if (x === null) return null;
  if (!isObj(x) || typeof x.group !== "string" || x.group.length > 50 || !isIndex(x.bi)) return undefined;
  if (x.kind === "block") return { kind: "block", bi: x.bi, group: x.group };
  if (!isIndex(x.ii)) return undefined;
  if (x.kind === "item") return { kind: "item", bi: x.bi, ii: x.ii, group: x.group };
  if (x.kind === "set" && isIndex(x.si)) return { kind: "set", bi: x.bi, ii: x.ii, si: x.si, group: x.group };
  return undefined;
}

/** A well-formed op rebuilt from untrusted input (only known keys kept), or null. */
export function parseOp(x: unknown): LiveOp | null {
  if (!isObj(x) || !isId(x.sessionId) || !isTime(x.at)) return null;
  const base = { sessionId: x.sessionId, at: x.at };
  switch (x.op) {
    case "set": {
      if (!isId(x.item) || !isIndex(x.si) || !FIELDS.includes(x.field as SetField)) return null;
      const field = x.field as SetField;
      const v = x.value;
      if (field === "done") {
        if (typeof v !== "boolean") return null;
      } else if (v !== null && !(typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= MAX[field])) return null;
      return { ...base, op: "set", item: x.item, si: x.si, field, value: v as number | boolean | null };
    }
    case "addSet":
      return isId(x.item) && isIndex(x.si) ? { ...base, op: "addSet", item: x.item, si: x.si } : null;
    case "cursor": {
      const step = parseStep(x.step);
      if (step === undefined || !(x.restUntil === null || isTime(x.restUntil))) return null;
      return { ...base, op: "cursor", step, restUntil: x.restUntil };
    }
    case "start":
    case "end":
      return { ...base, op: x.op };
    default:
      return null;
  }
}
