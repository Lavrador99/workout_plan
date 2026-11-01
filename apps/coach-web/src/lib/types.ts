// ─────────────────────────────────────────────────────────────────────────────
// Every stored record carries sync metadata: updatedAt (ms) decides
// last-write-wins, deleted keeps tombstones so deletions sync too.
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncMeta {
  id: string;
  updatedAt: number;
  deleted?: boolean;
  dirty?: 0 | 1; // 1 = changed locally, not yet pushed
}

export interface Client extends SyncMeta {
  name: string;
  birthYear?: number | null;
  hrMax?: number | null;
  hrRest?: number | null;
  injuries: string; // "Glúteo médio esquerdo"
  notes: string; // free text, e.g. records copied from the old notes
  /** Sports, pathologies and asymmetries (Focus ids) this client works on. */
  focusIds?: string[];
}

export interface Exercise extends SyncMeta {
  name: string;
  pt?: string; // Portuguese name, shown under the main one
  aliases: string[]; // other names (PT/EN, typos, short forms)
  tags: string[];
  /** Movement patterns; unset = guessed from the name (movement.ts). */
  patterns?: string[];
  /** Muscles worked; unset = guessed from the tags, names and patterns (movement.ts). */
  muscles?: string[];
  /** Exercises the coach said are not duplicates of this one. */
  distinct?: string[];
  demoUrl?: string;
}

/** How the load number should be read. */
export type LoadMode =
  | "abs" //   10kg
  | "dual" //  2x8kg (one dumbbell per hand)
  | "added"; // +10kg (added on smith, belt, etc.)

/** What the reps number counts. */
export type RepsUnit = "r" | "passos" | "m";

/** warmup = aquecimento, work = efetiva, failure = até à falha, drop = redução logo a seguir à anterior. */
export type SetType = "warmup" | "work" | "failure" | "drop";

/**
 * One set, prescribed on its own (load, reps, effort and rest can all differ).
 * Edited in place during the session, so it ends up as what was done.
 * An empty reps/load is left open for the athlete to choose (autoregulation).
 */
export interface SetRow {
  reps?: number | null;
  duration?: number | null; // seconds
  load?: number | null;
  type?: SetType; // unset = work
  rir?: number | null; // or RPE, as the item's `effort` says
  rest?: number | null; // seconds after this set
  done?: boolean;
}

/** How each set is done, beyond plain reps (drops are separate "drop" sets). */
export type ItemMethod =
  | { type: "restpause"; miniSets: number; pause: number } //   set to near failure, pause, mini-sets
  | { type: "cluster"; clusters: number; reps: number; pause: number } // e.g. 4 × 2 reps, 20s between
  | { type: "myo"; activation: number; miniSets: number; miniReps: number; pause: number }
  | { type: "mechdrop"; variants: string }; // harder → easier variants, no rest

export interface Item {
  id: string;
  exerciseId?: string;
  name: string; // as written for this session (may be a variant)
  /** "filler" = the exercises in parentheses, done during the rest. */
  role: "main" | "filler";
  repsUnit: RepsUnit;
  repsMax?: number | null; // range 12-15
  durationMax?: number | null; // range 20-25s
  loadMax?: number | null; // range 12-15kg
  loadMode: LoadMode;
  holdSec?: number | null; // isometric hold per rep (iso 10s)
  tempo?: string; // cadence "3-1-1-0" (eccentric-pause-concentric-pause)
  extraLeft?: number; // E +1
  effort?: "rir" | "rpe"; // what SetRow.rir holds (default RIR)
  method?: ItemMethod;
  rmTest?: number | null; // "8RM: ___"
  note: string;
  grip?: string; // hand position: "pronada", "neutra"…
  stance?: string; // feet: "largura da anca", "afastados"…
  sets: SetRow[];
}

/**
 * superset = 2+ exercises in a row then rest (3 = triset, 4+ = giant set).
 * emom: `work` = interval (s), `rounds` = intervals, items rotate each interval.
 * amrap: `work` = time cap (s), as many rounds as possible.
 */
export type BlockKind = "list" | "sets" | "superset" | "circuit" | "emom" | "amrap";

export type Section = "aquecimento" | "ativação" | "mobilidade" | "principal" | "condicionamento" | "retorno à calma";

export interface Block {
  id: string;
  kind: BlockKind;
  section?: Section;
  title: string;
  /** Circuits: work/rest seconds, rounds, rest between rounds. */
  work?: number | null;
  rest?: number | null;
  rounds?: number | null;
  roundRest?: number | null;
  items: Item[];
}

export interface Session extends SyncMeta {
  clientId: string;
  date: string; // YYYY-MM-DD
  title: string;
  notes: string;
  blocks: Block[];
}

/**
 * A reusable block (e.g. the usual core finisher or Hyrox circuit), or a whole
 * day when `blocks` is set (then `block` is its first block, for older apps).
 */
export interface Template extends SyncMeta {
  name: string;
  block: Block;
  blocks?: Block[];
  /** Session title used when the day is applied ("Lower 1"). */
  title?: string;
}

export type FocusKind = "sport" | "pathology" | "asymmetry";

/**
 * A sport, pathology or asymmetry the coach works with: the movement patterns,
 * muscles and key exercises that matter for it. Sets of a client's sessions
 * that hit any of these count towards it.
 */
export interface Focus extends SyncMeta {
  kind: FocusKind;
  name: string;
  patterns: string[];
  muscles: string[]; // matched against the exercise tags ("glúteo médio")
  exerciseIds: string[];
  notes: string;
}

export type TableName = "clients" | "exercises" | "sessions" | "templates" | "focuses";
