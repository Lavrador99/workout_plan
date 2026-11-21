import { changed, db, matchExercise, save } from "./db";
import { parseItemLine } from "./parser";
import { SEED_GROUPS } from "./seedData";
import { SEED_CLASSIFICATION } from "./seedClassification";
import { MEASUREMENT_ERRORS, withMeasurementError } from "./references/measurementError";
import { SEED_DAYS } from "./seedTemplates";
import { SEED_TESTS } from "./seedTests";
import { norm } from "@treino/core/text";
import type { Block, Exercise, Focus, Template, TestDef } from "@treino/core/types";

// Base library, merged once per device. Seed records get a fixed id
// ("seed-back-squat") and updatedAt 1, so every device creates the same
// record and any real edit (or deletion) synced from elsewhere wins.

const SEED_VERSION = 12; // 2: the 4-day templates, 3: the football profile, 4: the assessment tests, 5: the made-up client "Teste", 6: strength tests, 7: measurement errors, 8: the whole of "Teste", 9: the run, 10: Força e Equilíbrio, 11: names in Portuguese and classified by hand, 12: muscles of the sided tests

export interface SeedExercise {
  id: string;
  name: string; // in Portuguese
  aliases: string[]; // the English name first
  tags: string[];
  patterns?: string[];
  primaryPattern?: string;
  muscles?: string[];
  primaryMuscles?: string[];
}

const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const list = (s: string | undefined) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const uniq = (a: string[]) => [...new Set(a)];

/** All seed exercises, one per English name (the id comes from it), named in Portuguese, with the tags of every group it is in. */
export function seedExercises(): SeedExercise[] {
  const byKey = new Map<string, SeedExercise & { en: string }>();
  for (const g of SEED_GROUPS) {
    for (const line of g.items) {
      const [en, pt = "", aliases, extra] = line.split("|").map((x) => x.trim());
      const key = norm(en);
      const cur = byKey.get(key) ?? { id: `seed-${slug(en)}`, en, name: pt || en, aliases: [], tags: [] };
      if (pt && cur.name === en) cur.name = pt;
      cur.aliases = uniq([en, ...cur.aliases, ...list(aliases)]).filter((a) => norm(a) !== norm(cur.name));
      cur.tags = uniq([...cur.tags, ...g.tags, ...list(extra)]);
      byKey.set(key, cur);
    }
  }
  return [...byKey.values()].map(({ en: _en, ...s }) => {
    const c = SEED_CLASSIFICATION.get(s.name.toLowerCase());
    return c ? { ...s, patterns: c.patterns, primaryPattern: c.primaryPattern, muscles: c.muscles, primaryMuscles: c.primaryMuscles } : s;
  });
}

/** The hand classification where the exercise still had only a guess; what the coach set stays. */
function withClassification(mine: Exercise, s: SeedExercise): Exercise {
  if (!s.patterns || !s.muscles) return mine;
  return {
    ...mine,
    ...(mine.patterns ? {} : { patterns: s.patterns, primaryPattern: s.primaryPattern }),
    ...(mine.muscles ? {} : { muscles: s.muscles, primaryMuscles: s.primaryMuscles }),
  };
}

/** Add the base library (once per SEED_VERSION). Returns how many were added or completed. */
export async function seedLibrary(force = false): Promise<number> {
  if (!force && (await db.meta.get("seedVersion"))?.value === SEED_VERSION) return 0;
  const all = await db.exercises.toArray();
  let n = 0;
  for (const s of seedExercises()) {
    const same = all.find((e) => e.id === s.id);
    const mine = same ?? matchExercise(all, s.name) ?? s.aliases.map((a) => matchExercise(all, a)).find(Boolean);
    if (same?.deleted) continue; // deleted on purpose
    if (mine) {
      // the coach already has it: complete names, tags and the classification, keep the rest
      const aliases = uniq([...mine.aliases, ...(norm(mine.name) === norm(s.name) ? [] : [s.name]), ...s.aliases]).filter((a) => norm(a) !== norm(mine.name) && norm(a) !== norm(mine.pt ?? ""));
      const next = withClassification({ ...mine, aliases, tags: uniq([...mine.tags, ...s.tags]) }, s);
      if (JSON.stringify(next) !== JSON.stringify(mine)) {
        await save("exercises", next);
        n++;
      }
      continue;
    }
    const ex: Exercise = { ...s, updatedAt: 1, dirty: 1 };
    await db.exercises.put(ex);
    all.push(ex);
    n++;
  }
  n += await seedTemplates(all);
  n += await seedFocuses(all);
  n += await seedTestLibrary();
  await db.meta.put({ key: "seedVersion", value: SEED_VERSION });
  if (n) changed();
  return n;
}

/** The 4 days as whole-day templates, items linked to the library by name. */
export function seedDays(library: Exercise[]): Template[] {
  return SEED_DAYS.map((d) => {
    const blocks: Block[] = d.blocks.map(({ items, ...b }, i) => ({
      ...b,
      id: `${d.id}-b${i}`,
      items: items.map((line, j) => {
        const [rx, note = ""] = line.split("|").map((x) => x.trim());
        const it = parseItemLine(rx);
        return { ...it, id: `${d.id}-b${i}-i${j}`, exerciseId: matchExercise(library, it.name)?.id, note: [it.note, note].filter(Boolean).join(" · ") };
      }),
    }));
    return { id: d.id, updatedAt: 1, name: d.name, title: d.title, block: blocks[0], blocks };
  });
}

async function seedTemplates(library: Exercise[]): Promise<number> {
  let n = 0;
  for (const t of seedDays(library)) {
    if (await db.templates.get(t.id)) continue; // already here (or deleted on purpose)
    await db.templates.put({ ...t, dirty: 1 });
    n++;
  }
  return n;
}

/** Starting profiles; the coach adds their own pathologies and asymmetries. */
export function seedProfiles(library: Exercise[]): Focus[] {
  const ids = (names: string[]) => names.map((n) => matchExercise(library, n)?.id).filter((id): id is string => !!id);
  return [
    {
      id: "seed-focus-futebol",
      updatedAt: 1,
      kind: "sport",
      name: "Futebol",
      patterns: ["afundo / unilateral", "flexão do joelho", "adução da anca", "flexão da anca", "flexão plantar", "salto / pliometria", "agilidade / mudança de direção", "anti-rotação"],
      muscles: ["isquiotibiais", "adutores", "glúteo médio", "gémeos", "sóleo", "quadríceps", "ílio-psoas"],
      exerciseIds: ids(["Nordic Hamstring Curl", "Copenhagen Plank", "Single Leg RDL", "Bulgarian Split Squat", "Lateral Bound", "Calf Raise"]),
      notes: "Sprint, mudanças de direção, remate. Prevenção: posteriores (nórdico), adutores (Copenhaga), gémeos/tendão de Aquiles.",
    },
  ];
}

async function seedFocuses(library: Exercise[]): Promise<number> {
  let n = 0;
  for (const f of seedProfiles(library)) {
    if (await db.focuses.get(f.id)) continue; // already here (or deleted on purpose)
    await db.focuses.put({ ...f, dirty: 1 });
    n++;
  }
  return n;
}

/** The base assessment tests, ready to store. */
export function seedTests(): TestDef[] {
  return SEED_TESTS.map((t) => ({ direction: "higher", sided: false, scale: null, trials: 3, aggregate: "best", groups: [], ...t, ...MEASUREMENT_ERRORS[t.id], version: 1, updatedAt: 1 }));
}

async function seedTestLibrary(): Promise<number> {
  let n = 0;
  for (const t of seedTests()) {
    const cur = await db.tests.get(t.id);
    if (cur) {
      // already here (or deleted on purpose): only give the sprints their distance, the muscles, and fill in a missing error
      if (t.distanceM && cur.distanceM == null && !cur.deleted) await save("tests", { ...cur, distanceM: t.distanceM });
      const now = (await db.tests.get(t.id)) as TestDef;
      if (t.muscles?.length && !now.muscles?.length && !now.deleted) await save("tests", { ...now, muscles: t.muscles });
      const measured = withMeasurementError((await db.tests.get(t.id)) as TestDef, t);
      if (measured) await save("tests", measured);
      continue;
    }
    await db.tests.put({ ...t, dirty: 1 });
    n++;
  }
  return n;
}

