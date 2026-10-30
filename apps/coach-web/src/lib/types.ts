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
}

export interface Exercise extends SyncMeta {
  name: string;
  aliases: string[]; // other names (PT/EN, typos, short forms)
  tags: string[];
  demoUrl?: string;
}

/** How the load number should be read. */
export type LoadMode =
  | "abs" //   10kg
  | "dual" //  2x8kg (one dumbbell per hand)
  | "added"; // +10kg (added on smith, belt, etc.)

/** What the reps number counts. */
export type RepsUnit = "r" | "passos" | "m";

/** One set. Edited in place during the session, so it ends up as what was done. */
export interface SetRow {
  reps?: number | null;
  duration?: number | null; // seconds
  load?: number | null;
  done?: boolean;
}

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
  extraLeft?: number; // E +1
  rmTest?: number | null; // "8RM: ___"
  note: string;
  sets: SetRow[];
}

export type BlockKind = "list" | "sets" | "superset" | "circuit";

export interface Block {
  id: string;
  kind: BlockKind;
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

export type TableName = "clients" | "exercises" | "sessions";
