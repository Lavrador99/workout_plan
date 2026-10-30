import { changed, db, matchExercise, save } from "./db";
import { parseItemLine } from "./parser";
import { SEED_GROUPS } from "./seedData";
import { SEED_DAYS } from "./seedTemplates";
import { norm } from "./text";
import type { Block, Exercise, Template } from "./types";

// Base library, merged once per device. Seed records get a fixed id
// ("seed-back-squat") and updatedAt 1, so every device creates the same
// record and any real edit (or deletion) synced from elsewhere wins.

const SEED_VERSION = 2; // 2: the 4-day templates

export interface SeedExercise {
  id: string;
  name: string;
  pt: string;
  aliases: string[];
  tags: string[];
}

const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const list = (s: string | undefined) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const uniq = (a: string[]) => [...new Set(a)];

/** All seed exercises, one per English name, with the tags of every group it is in. */
export function seedExercises(): SeedExercise[] {
  const byKey = new Map<string, SeedExercise>();
  for (const g of SEED_GROUPS) {
    for (const line of g.items) {
      const [name, pt = "", aliases, extra] = line.split("|").map((x) => x.trim());
      const key = norm(name);
      const cur = byKey.get(key) ?? { id: `seed-${slug(name)}`, name, pt, aliases: [], tags: [] };
      cur.pt ||= pt;
      cur.aliases = uniq([...cur.aliases, ...list(aliases)]).filter((a) => norm(a) !== key && norm(a) !== norm(cur.pt));
      cur.tags = uniq([...cur.tags, ...g.tags, ...list(extra)]);
      byKey.set(key, cur);
    }
  }
  return [...byKey.values()];
}

/** Add the base library (once per SEED_VERSION). Returns how many were added or completed. */
export async function seedLibrary(force = false): Promise<number> {
  if (!force && (await db.meta.get("seedVersion"))?.value === SEED_VERSION) return 0;
  const all = await db.exercises.toArray();
  let n = 0;
  for (const s of seedExercises()) {
    if (all.some((e) => e.id === s.id)) continue; // already here (or deleted on purpose)
    const mine = matchExercise(all, s.name) ?? matchExercise(all, s.pt) ?? s.aliases.map((a) => matchExercise(all, a)).find(Boolean);
    if (mine) {
      // the coach already has it: just complete translation, aliases and tags
      const aliases = uniq([...mine.aliases, ...(norm(mine.name) === norm(s.name) ? [] : [s.name]), ...s.aliases]).filter(
        (a) => norm(a) !== norm(mine.name) && norm(a) !== norm(mine.pt || s.pt),
      );
      const next = { ...mine, pt: mine.pt || s.pt, aliases, tags: uniq([...mine.tags, ...s.tags]) };
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
