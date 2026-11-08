// Compares a result with published reference data. When no population fits, it
// says so: a percentile is only ever shown with the group it refers to.

import type { VersionSeries } from "./assessment";
import { SCHMITZ_2018, SCHMITZ_2018_DATASETS } from "./references/schmitz2018";
import { TOMKINSON_2025, TOMKINSON_2025_DATASETS } from "./references/tomkinson2025";
import { norm } from "@treino/core/text";
import type { Client, Direction, Focus, Strength } from "@treino/core/types";

export type ReferenceLevel = "top-elite" | "elite" | "sub-elite" | "amateur";

export interface ReferenceSource {
  id: string;
  citation: string;
  doi: string;
  url: string;
  license: string;
}

export interface ReferenceDataset {
  id: string;
  sourceId: string;
  /** Only this test at this protocol version is comparable. */
  testId: string;
  version: number;
  group: "sport" | "active" | "general";
  sport?: string;
  sex: "female" | "male";
  levels: ReferenceLevel[];
  label: string;
  studies: number;
  subjects: number;
  minAge?: number;
  maxAge?: number;
  mean?: number;
  sd?: number;
  /** Published percentiles, [percentile, value]: preferred over mean and SD. */
  percentiles?: [number, number][];
  /** Tests measured per side: the best of both sides is the value the reference uses. */
  sides?: "best";
  limitations: string;
}

export const SOURCES: ReferenceSource[] = [SCHMITZ_2018, TOMKINSON_2025];
export const DATASETS: ReferenceDataset[] = [...SCHMITZ_2018_DATASETS, ...TOMKINSON_2025_DATASETS];

/** Our own rating of how much a dataset can bear, not a universal scientific scale. */
export type Evidence = "A" | "B" | "C" | "D";

export function evidenceOf(d: Pick<ReferenceDataset, "studies" | "subjects">): Evidence {
  if (d.studies >= 10 && d.subjects >= 200) return "A";
  if (d.studies >= 3 && d.subjects >= 50) return "B";
  if (d.subjects >= 30) return "C";
  return "D";
}

export interface ClientContext {
  sex: Client["sex"];
  age: number | null;
  level: Client["level"];
  sports: string[];
}

export function clientContext(client: Client, focuses: Focus[], date: string): ClientContext {
  const sports = focuses.filter((f) => f.kind === "sport" && client.focusIds?.includes(f.id)).map((f) => f.name);
  return { sex: client.sex, age: client.birthYear ? Number(date.slice(0, 4)) - client.birthYear : null, level: client.level, sports };
}

const LEVEL_MATCH: Record<NonNullable<Client["level"]>, ReferenceLevel> = { elite: "elite", competitivo: "sub-elite", recreativo: "amateur" };

/** 1 same sport and level, 2 same sport at another level, 3 active people, 4 general population. */
export type Tier = 1 | 2 | 3 | 4;

function standardNormal(z: number): number {
  // Zelen & Severo, enough for whole percentiles
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

export interface Position {
  percentile: number; // 0–100, higher is always better
  z: number | null;
  /** From mean and SD assuming normality, not from published percentiles. */
  estimated: boolean;
  /** Beyond the published percentiles: only known to be below or above the last one. */
  beyond: "below" | "above" | null;
}

/** Linear between published percentiles; never extrapolated past them. */
function fromPercentiles(table: [number, number][], value: number, direction: Direction): Position {
  // best-to-worst values become ascending, so a lower time reads as a higher percentile
  const flip = direction === "lower";
  const rows = [...table].sort((a, b) => a[0] - b[0]);
  const at = (i: number) => (flip ? -rows[i][1] : rows[i][1]);
  const v = flip ? -value : value;
  const last = rows.length - 1;
  if (v < at(0)) return { percentile: rows[0][0], z: null, estimated: false, beyond: "below" };
  if (v > at(last)) return { percentile: rows[last][0], z: null, estimated: false, beyond: "above" };
  for (let i = 0; i < last; i++) {
    if (v <= at(i + 1)) {
      const span = at(i + 1) - at(i);
      const share = span === 0 ? 0 : (v - at(i)) / span;
      return { percentile: rows[i][0] + share * (rows[i + 1][0] - rows[i][0]), z: null, estimated: false, beyond: null };
    }
  }
  return { percentile: rows[last][0], z: null, estimated: false, beyond: null };
}

export function positionIn(d: ReferenceDataset, value: number, direction: Direction): Position | null {
  if (direction === "neutral") return null;
  if (d.percentiles?.length) return fromPercentiles(d.percentiles, value, direction);
  if (d.mean == null || !d.sd) return null;
  const raw = (value - d.mean) / d.sd;
  const z = direction === "lower" ? -raw : raw;
  return { percentile: standardNormal(z) * 100, z, estimated: true, beyond: null };
}

export function fmtPosition(p: Position): string {
  if (p.beyond === "below") return `abaixo de P${p.percentile}`;
  if (p.beyond === "above") return `acima de P${p.percentile}`;
  if (p.percentile < 1) return "abaixo de P1";
  if (p.percentile > 99) return "acima de P99";
  return `P${Math.round(p.percentile)}`;
}

export interface Benchmark {
  dataset: ReferenceDataset;
  source: ReferenceSource | undefined;
  tier: Tier;
  evidence: Evidence;
  position: Position;
}

export type BenchmarkOutcome =
  | { status: "ok"; benchmarks: Benchmark[] }
  | { status: "missing_data"; missing: ("sexo" | "idade")[] }
  | { status: "no_compatible_reference" };

interface Measured {
  testId: string;
  version: number;
  direction: Direction;
  sided?: boolean;
  strength?: Strength | null;
}

const PROFESSIONAL: ReferenceLevel[] = ["top-elite", "elite"];

/** The latest value to compare: on sided tests, the best side of the last assessment with both. */
export function latestComparable(v: VersionSeries): { date: string; value: number } | null {
  if (!v.sided) return v.both[v.both.length - 1] ?? null;
  for (const left of [...v.left].reverse()) {
    const right = v.right.find((p) => p.assessmentId === left.assessmentId);
    if (right) return { date: left.date, value: v.direction === "lower" ? Math.min(left.value, right.value) : Math.max(left.value, right.value) };
  }
  return null;
}

/** The closest athlete group and, if there is one, the closest non-athlete group. */
export function benchmark(result: Measured, value: number, ctx: ClientContext, datasets: ReferenceDataset[] = DATASETS): BenchmarkOutcome {
  const none = { status: "no_compatible_reference" } as const;
  // estimates are not comparable with measured references
  const forTest = result.strength === "estimated" ? [] : datasets.filter((d) => d.testId === result.testId && d.version === result.version && !!d.sides === !!result.sided);
  if (!forTest.length) return none;

  const missing = [...(ctx.sex ? [] : (["sexo"] as const)), ...(ctx.age == null ? (["idade"] as const) : [])];
  if (missing.length) return { status: "missing_data", missing };

  const age = ctx.age as number;
  const fits = forTest.filter((d) => d.sex === ctx.sex && age >= (d.minAge ?? 0) && age <= (d.maxAge ?? Infinity));
  const wanted = ctx.level ? LEVEL_MATCH[ctx.level] : null;
  const sports = ctx.sports.map(norm);
  const sameSport = fits.filter((d) => d.group === "sport" && d.sport && sports.includes(norm(d.sport)));

  const largest = (list: ReferenceDataset[]) => [...list].sort((a, b) => b.subjects - a.subjects)[0];
  const exact = wanted ? sameSport.find((d) => d.levels.includes(wanted)) : undefined;
  // professionals are never the automatic yardstick for someone who is not one
  const other = exact ? undefined : largest(sameSport.filter((d) => ctx.level === "elite" || !d.levels.some((l) => PROFESSIONAL.includes(l))));

  const picked: [ReferenceDataset, Tier][] = [];
  if (exact) picked.push([exact, 1]);
  else if (other) picked.push([other, 2]);
  const active = largest(fits.filter((d) => d.group === "active"));
  const general = largest(fits.filter((d) => d.group === "general"));
  if (active) picked.push([active, 3]);
  // when the athlete group and active people are already shown, this adds little
  if (general && picked.length < 2) picked.push([general, 4]);

  const benchmarks = picked.flatMap(([dataset, tier]): Benchmark[] => {
    const position = positionIn(dataset, value, result.direction);
    return position ? [{ dataset, source: SOURCES.find((s) => s.id === dataset.sourceId), tier, evidence: evidenceOf(dataset), position }] : [];
  });
  return benchmarks.length ? { status: "ok", benchmarks } : none;
}
