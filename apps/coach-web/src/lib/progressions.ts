// Progressions: a base exercise and its harder versions, in order
// (Bird dog → em cima da caixa → … → c/ elástico). Stored on the base as an
// ordered list of exercise ids, so the whole family is one record.

import { matchExercise, save } from "./db";
import { norm, uid } from "@treino/core/text";
import type { Exercise } from "@treino/core/types";

export interface Family {
  base: Exercise;
  /** Base first, then easiest to hardest. */
  chain: Exercise[];
}

/** The family an exercise belongs to: as the base, or as one of its levels. */
export function familyOf(id: string | undefined, exercises: Exercise[]): Family | null {
  if (!id) return null;
  const byId = new Map(exercises.filter((e) => !e.deleted).map((e) => [e.id, e]));
  const self = byId.get(id);
  const base = self?.progressions?.length ? self : exercises.find((e) => !e.deleted && e.progressions?.includes(id));
  if (!base) return null;
  const chain = [base, ...(base.progressions ?? []).map((p) => byId.get(p)).filter((e): e is Exercise => !!e && e.id !== base.id)];
  return chain.length > 1 ? { base, chain } : null;
}

/** Every family in the library, by base name. */
export function families(exercises: Exercise[]): Family[] {
  return exercises
    .filter((e) => !e.deleted && e.progressions?.length)
    .map((e) => familyOf(e.id, exercises))
    .filter((f): f is Family => !!f)
    .sort((a, b) => a.base.name.localeCompare(b.base.name, "pt"));
}

/** One pasted line: the library exercise it names, or a new one to create. */
export interface FamilyLine {
  name: string;
  ex?: Exercise;
}

/**
 * Pasted lists, one exercise per line, a blank line between families; the
 * first line of each is the base:
 *   BIRD dog
 *   BIRD dog em cima da caixa
 */
export function parseFamilies(text: string, exercises: Exercise[]): FamilyLine[][] {
  return text
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((l) => l.replace(/^[\s•*\-–\d.)]+/, "").trim())
        .filter(Boolean)
        .map((name) => ({ name, ex: matchExercise(exercises, name) })),
    )
    .filter((f) => f.length > 1);
}

/** The next level up (+1) or down (−1) from this exercise, if any. */
export function step(family: Family, id: string, d: -1 | 1): Exercise | undefined {
  const i = family.chain.findIndex((e) => e.id === id);
  return i < 0 ? undefined : family.chain[i + d];
}

/**
 * Save a family from pasted lines: exercises not in the library are created.
 * `made` carries the ones created so far, so a name pasted twice is created once.
 */
export async function saveFamily(lines: FamilyLine[], made = new Map<string, Exercise>()): Promise<Exercise> {
  const exs: Exercise[] = [];
  for (const l of lines) {
    let ex = l.ex ?? made.get(norm(l.name));
    if (!ex) made.set(norm(l.name), (ex = await save<Exercise>("exercises", { id: uid(), updatedAt: 0, name: l.name, aliases: [], tags: [] })));
    exs.push(ex);
  }
  const [base, ...rest] = exs;
  return save("exercises", { ...base, progressions: [...new Set(rest.map((e) => e.id))].filter((id) => id !== base.id) });
}

export function setProgressions(base: Exercise, ids: string[]): Promise<Exercise> {
  return save("exercises", { ...base, progressions: [...new Set(ids)].filter((id) => id !== base.id) });
}

const bigrams = (s: string) => {
  const t = norm(s).replace(/ /g, "");
  return Array.from({ length: Math.max(0, t.length - 1) }, (_, i) => t.slice(i, i + 2));
};

/** 0..1, how alike two names are (typos score high: "Walnking lunge" ≈ "Walking lunge"). */
export function similarity(a: string, b: string): number {
  const x = bigrams(a);
  const y = bigrams(b);
  if (!x.length || !y.length) return 0;
  const pool = [...y];
  let hits = 0;
  for (const g of x) {
    const i = pool.indexOf(g);
    if (i >= 0) {
      hits++;
      pool.splice(i, 1);
    }
  }
  return (2 * hits) / (x.length + y.length);
}

/** A library exercise this unmatched name is probably a typo of. */
export function likelyMeant(name: string, candidates: Exercise[]): Exercise | undefined {
  let best: Exercise | undefined;
  let score = 0.8;
  for (const e of candidates)
    for (const n of [e.name, e.pt ?? "", ...e.aliases]) {
      const s = similarity(name, n);
      if (s >= score) [best, score] = [e, s];
    }
  return best;
}
