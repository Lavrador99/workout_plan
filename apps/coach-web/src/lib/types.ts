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
  sex?: "female" | "male" | null; // only for choosing reference populations
  heightCm?: number | null;
  dominantHand?: Side | "both" | null;
  dominantFoot?: Side | "both" | null;
  position?: string; // in the sport, when it has one
  level?: "recreativo" | "competitivo" | "elite" | null;
  sportYears?: number | null;
  weeklyFrequency?: number | null;
  /** The planned week over time, oldest first. Each entry holds until the next one. */
  schedule?: ScheduleChange[];
  /** Kinds of session left out of adherence. */
  adherenceSkips?: Activity[];
  goals?: string[]; // saúde, força, performance, reabilitação
  /** Replaced by Goal records: only read to move what older versions left here. */
  targets?: Record<string, number>;
  primaryGoal?: PrimaryGoal | null;
  /** The coach's own weights; unset = those of the main goal (progress.ts). */
  weights?: Weights | null;
  /** Every change of weights, oldest first. */
  weightLog?: WeightChange[];
  consentAt?: string | null; // YYYY-MM-DD, when the client consented to their data being kept
}

/** What a session is. Unset = treino. */
export type Activity = "treino" | "cardio" | "mobilidade" | "avaliacao" | "outro";

export interface ScheduleChange {
  from: string; // YYYY-MM-DD
  days: number[]; // 0 = Monday … 6 = Sunday; empty = a planned break
}

/** The six dimensions of the Individual Progress Index. */
export type DimensionId = "geral" | "forca" | "mobilidade" | "composicao" | "cardio" | "adesao";

/** % per dimension, adding up to 100. */
export type Weights = Record<DimensionId, number>;

export type PrimaryGoal = "saude" | "hipertrofia" | "gordura" | "desporto" | "funcional" | "longevidade";

export interface WeightChange {
  at: number; // ms
  primaryGoal: PrimaryGoal;
  weights: Weights;
  custom: boolean; // changed by hand, not the main goal's own
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
  /** Harder versions of this exercise, easiest first (this one is the base). */
  progressions?: string[];
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
  activity?: Activity;
  /** Left out of adherence, e.g. an extra or an assessment day. Volume still counts it. */
  noAdherence?: boolean;
  /** Live session: when the coach started and finished it (ms). */
  startedAt?: number | null;
  endedAt?: number | null;
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

export type TestCategory =
  | "antropometria"
  | "mobilidade"
  | "estabilidade"
  | "movimento"
  | "força"
  | "potência"
  | "velocidade"
  | "agilidade"
  | "resistência"
  | "controlo motor";

/** Which result is better. neutral = neither (body weight, girths). */
export type Direction = "higher" | "lower" | "neutral";

/** How the valid trials become the final value. */
export type Aggregate = "best" | "mean" | "last";

/** Ordinal score (FMS 0–3, quality 1–5): differences are points, never a %. */
export interface Scale {
  min: number;
  max: number;
}

/** Maximal strength: measured directly, or estimated from a set of several reps. Never mixed. */
export type Strength = "direct" | "estimated";

/** A test the coach can use in assessments. testId + version say what is comparable. */
export interface TestDef extends SyncMeta {
  name: string;
  category: TestCategory;
  unit: string; // "cm", "kg", "s", "°", "pts"
  direction: Direction;
  sided: boolean; // measured on each side
  scale?: Scale | null;
  strength?: Strength | null;
  distanceM?: number | null; // timed distance, for the average speed
  trials: number; // default number of trials
  aggregate: Aggregate;
  version: number; // goes up when the protocol changes
  groups: string[]; // batteries: "FMS", "Y-Balance", "Pré-época futebol"
  purpose: string;
  equipment: string;
  instructions: string;
  validity: string; // what makes a trial valid
  /** Standard error of measurement, in the test's unit, for this protocol and a similar population. */
  sem?: number | null;
  semSource?: string; // where it comes from
  /** Scientific references behind the test, in the coach's words. */
  references?: string;
  demoUrl?: string;
  /** For the body map (phase 2): not used in any calculation yet. */
  muscles?: string[];
  patterns?: string[];
}

export type Side = "left" | "right";

export interface Trial {
  side?: Side; // unset on tests without sides
  value: number | null; // on estimated strength tests, the load lifted
  reps?: number | null; // estimated strength tests only
  invalid?: boolean; // kept, but does not count towards the result
}

/** A copy of the test as it was that day: editing the test never rewrites history. */
export interface TestResult {
  id: string;
  testId: string;
  version: number;
  name: string;
  unit: string;
  direction: Direction;
  sided: boolean;
  scale?: Scale | null;
  strength?: Strength | null;
  aggregate: Aggregate;
  trials: Trial[];
  instrument?: string;
  note?: string;
}

export interface Assessment extends SyncMeta {
  clientId: string;
  date: string; // YYYY-MM-DD
  title: string;
  conditions: string; // time of day, surface, fatigue, who assessed
  notes: string;
  results: TestResult[];
}

export type GoalStatus = "active" | "achieved" | "dropped";

/** How much a goal counts against the others of its dimension, and in the goals met. */
export type Importance = 1 | 2 | 3;

/** On a test it is read against the results; a metric of its own, against the values the coach types; otherwise the coach settles it. */
export interface Goal extends SyncMeta {
  clientId: string;
  title: string; // empty on a test: the test's name is shown
  testId?: string | null;
  target?: number | null; // in the test's or the metric's unit
  /** Set on a metric with no test: "treinos/mês", "dias sem dor". */
  unit?: string | null;
  startValue?: number | null;
  currentValue?: number | null;
  dueDate?: string | null; // YYYY-MM-DD
  criteria: string; // what counts as done
  importance?: Importance; // unset = 1
  status: GoalStatus;
  achievedAt?: string | null; // YYYY-MM-DD
}

/** One indicator behind a score, as it was that day. */
export interface SnapshotIndicator {
  testId: string;
  name: string;
  unit: string;
  side?: Side;
  version: number;
  importance: Importance;
  origin: "measured" | "calculated" | "estimated";
  first: number;
  current: number;
  target: number;
  improved: boolean | null;
  mdc?: number | null; // the error used: scores made with another one do not compare
  confirmed: boolean | null; // beyond the measurement error; null = that error is unknown
  score: number;
}

export type DimensionState = "improving" | "stable" | "regressing";

export interface SnapshotDimension {
  id: DimensionId;
  score: number | null; // null = no data, its weight went to the others
  weight: number; // as used, after that
  state: DimensionState | null; // null = no results to read it from
  provisional: boolean; // read from changes with no known measurement error
  indicators: SnapshotIndicator[];
}

export type ProgressStatus = "positive" | "moderate" | "reduced" | "stagnant" | "regression" | "insufficient";

/** An index as calculated that day, with all it was made from. Never edited: recalculating adds another. */
export interface ProgressSnapshot extends SyncMeta {
  clientId: string;
  date: string; // YYYY-MM-DD, of the data
  method: number; // version of the calculation
  primaryGoal: PrimaryGoal;
  weights: Weights;
  ipi: number | null;
  coverage: number; // % of the weight with data
  icc: number | null;
  iccTests: number; // how many tests it rests on
  ia: number | null;
  iaSource?: "plan" | "estimate" | null; // estimate = some of it comes from the weekly frequency
  io: number | null;
  ioGoals: number; // how many goals it rests on
  status: ProgressStatus;
  provisional: boolean;
  dimensions: SnapshotDimension[];
  interpretation: string;
  /** Made by recalculating the history; the original stays alongside it. */
  recalculated?: boolean;
}

export type TableName = "clients" | "exercises" | "sessions" | "templates" | "focuses" | "tests" | "assessments" | "goals" | "snapshots";
