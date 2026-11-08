// Library exercises that are probably the same one under different names
// ("Back Squat" / "Back squat", "Pull-up" / "Pullup", "Agachamento búlgaro" / "Agachamento bulgaro c/ halteres"…).

import type { Exercise } from "@treino/core/types";
import { norm } from "@treino/core/text";

const STOP = new Set(["com", "c", "de", "da", "do", "das", "dos", "em", "no", "na", "the", "with", "w", "and", "of", "on"]);

function tokens(name: string): string[] {
  return norm(name)
    .split(/[\s/+]+/)
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
}

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

interface Name {
  tokens: string[];
  /** Words sorted and joined: order, spacing and hyphens stop mattering. */
  key: string;
}

function prep(name: string): Name | null {
  const t = tokens(name);
  return t.length ? { tokens: t, key: [...t].sort().join("") } : null;
}

/**
 * 1 when the names have the same words (any order, plural, "Pull-up" = "Pullup"),
 * 0.9 when one word has a one-letter typo, else 0. Words added or swapped
 * ("Low" / "High Box Jump", "ATG Split Squat") are variations, not duplicates.
 */
function similarity(a: Name, b: Name): number {
  if (a.key === b.key || a.tokens.join("") === b.tokens.join("")) return 1;
  if (a.tokens.length !== b.tokens.length) return 0;
  const onlyA = a.tokens.filter((t) => !b.tokens.includes(t));
  const onlyB = b.tokens.filter((t) => !a.tokens.includes(t));
  if (onlyA.length !== 1 || onlyB.length !== 1) return 0;
  const [x, y] = [onlyA[0], onlyB[0]];
  return Math.min(x.length, y.length) >= 4 && levenshtein(x, y) <= 1 ? 0.9 : 0;
}

/** 0..1: how alike two names are. */
export function nameSimilarity(a: string, b: string): number {
  const pa = prep(a);
  const pb = prep(b);
  return pa && pb ? similarity(pa, pb) : 0;
}

export interface DuplicatePair {
  a: Exercise;
  b: Exercise;
  score: number;
}

/** Pairs that look like the same exercise, most alike first; pairs marked distinct are left out. */
export function findDuplicates(list: Exercise[], threshold = 0.8): DuplicatePair[] {
  const all = list
    .filter((e) => !e.deleted)
    .map((e) => ({ e, n: [e.name, e.pt ?? "", ...e.aliases].map(prep).filter((x): x is Name => !!x) }));
  const out: DuplicatePair[] = [];
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) {
      const { e: a, n: na } = all[i];
      const { e: b, n: nb } = all[j];
      if (a.distinct?.includes(b.id) || b.distinct?.includes(a.id)) continue;
      let score = 0;
      for (const x of na) for (const y of nb) score = Math.max(score, similarity(x, y));
      if (score >= threshold) out.push({ a, b, score });
    }
  return out.sort((x, y) => y.score - x.score || x.a.name.localeCompare(y.a.name, "pt"));
}
