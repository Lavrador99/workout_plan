// The exercise CSV read back: names translated and classifications filled in
// outside the app. Rows find their exercise by id. It only fills: a new name
// keeps the old one as an alias, and nothing is ever removed.

import { canonMuscles, canonPatterns, MAX_PRIMARY_MUSCLES, MUSCLES, musclesOf, PATTERNS, patternsOf, primaryMusclesOf, primaryPatternOf } from "./movement";
import { norm } from "@treino/core/text";
import type { Exercise } from "@treino/core/types";

/** Rows of a ";" or "," separated file, with quoted cells and a BOM. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const sep = (src.split(/\r?\n/)[0].match(/;/g)?.length ?? 0) >= (src.split(/\r?\n/)[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

const list = (s: string | undefined) =>
  (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export interface ImportPlan {
  changes: Exercise[];
  /** Names in the file that are in no catalog: left out, so nothing wrong gets in. */
  unknown: string[];
  /** Rows whose id is not in this library. */
  notFound: number;
}

export function planImport(exercises: Exercise[], text: string): ImportPlan {
  const [header, ...rows] = parseCsv(text);
  const col = (name: string) => header?.findIndex((h) => norm(h) === norm(name)) ?? -1;
  const at = { id: col("id"), name: col("Nome"), aliases: col("Sinónimos"), main: col("Padrão principal"), patterns: col("Outros padrões"), mainMuscles: col("Músculos principais"), muscles: col("Músculos secundários") };
  if (at.id < 0) return { changes: [], unknown: [], notFound: rows.length };
  const unknown = new Set<string>();
  const known = (names: string[], catalog: string[], canon: (l: string[]) => string[]) =>
    canon(names).filter((n) => {
      if (catalog.includes(n)) return true;
      unknown.add(n);
      return false;
    });
  const changes: Exercise[] = [];
  let notFound = 0;
  for (const r of rows) {
    const ex = exercises.find((e) => e.id === r[at.id]?.trim() && !e.deleted);
    if (!ex) {
      notFound++;
      continue;
    }
    const name = at.name >= 0 ? r[at.name]?.trim() : "";
    const newName = name && norm(name) !== norm(ex.name) ? name : ex.name;
    const aliases = [...new Set([...ex.aliases, ...(newName !== ex.name ? [ex.name] : []), ...list(at.aliases >= 0 ? r[at.aliases] : "")])].filter((a) => norm(a) !== norm(newName));
    const main = known(list(at.main >= 0 ? r[at.main] : ""), PATTERNS, canonPatterns)[0];
    const others = known(list(at.patterns >= 0 ? r[at.patterns] : ""), PATTERNS, canonPatterns);
    const mainMuscles = known(list(at.mainMuscles >= 0 ? r[at.mainMuscles] : ""), MUSCLES, canonMuscles).slice(0, MAX_PRIMARY_MUSCLES);
    const secondary = known(list(at.muscles >= 0 ? r[at.muscles] : ""), MUSCLES, canonMuscles);
    const patterns = [...new Set([main, ...others])];
    const muscles = [...new Set([...mainMuscles, ...secondary])];
    // set when not yet confirmed or different from what holds now; the same again changes nothing
    const newPatterns = !!main && (!ex.patterns || !same(patterns, patternsOf(ex)) || main !== primaryPatternOf(ex));
    const newMuscles = mainMuscles.length > 0 && (!ex.muscles || !same(muscles, musclesOf(ex)) || !same(mainMuscles, primaryMusclesOf(ex)));
    const next: Exercise = {
      ...ex,
      name: newName,
      aliases,
      ...(newPatterns ? { patterns, primaryPattern: main } : {}),
      ...(newMuscles ? { muscles, primaryMuscles: mainMuscles } : {}),
    };
    if (JSON.stringify(next) !== JSON.stringify(ex)) changes.push(next);
  }
  return { changes, unknown: [...unknown], notFound };
}
