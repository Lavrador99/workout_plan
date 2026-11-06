import { changed, db, matchExercise, remove, save } from "./db";
import { parseItemLine } from "./parser";
import { SEED_GROUPS } from "./seedData";
import { MEASUREMENT_ERRORS, withMeasurementError } from "./references/measurementError";
import { DEMO_CLIENT_ID, demoData, fillMissing } from "./seedDemo";
import { SEED_DAYS } from "./seedTemplates";
import { SEED_TESTS } from "./seedTests";
import { norm } from "./text";
import type { Block, Exercise, Focus, Template, TestDef } from "./types";

// Base library, merged once per device. Seed records get a fixed id
// ("seed-back-squat") and updatedAt 1, so every device creates the same
// record and any real edit (or deletion) synced from elsewhere wins.

const SEED_VERSION = 8; // 2: the 4-day templates, 3: the football profile, 4: the assessment tests, 5: the made-up client "Teste", 6: strength tests, 7: measurement errors, 8: the whole of "Teste"

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
  n += await seedFocuses(all);
  n += await seedTestLibrary();
  n += await seedDemoClient(all);
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
      // already here (or deleted on purpose): only give the sprints their distance and fill in a missing error
      if (t.distanceM && cur.distanceM == null && !cur.deleted) await save("tests", { ...cur, distanceM: t.distanceM });
      const measured = withMeasurementError((await db.tests.get(t.id)) as TestDef, t);
      if (measured) await save("tests", measured);
      continue;
    }
    await db.tests.put({ ...t, dirty: 1 });
    n++;
  }
  return n;
}

/**
 * The made-up client with a long history. Once erased it stays erased: its
 * tombstone is still here. Records nobody edited (updatedAt 1) get newer data,
 * and the rest only what they lack, so what the coach changed stays.
 */
async function seedDemoClient(library: Exercise[]): Promise<number> {
  const cur = await db.clients.get(DEMO_CLIENT_ID);
  if (cur?.deleted) return 0;
  const { client, assessments, sessions, goals } = demoData(seedTests(), library);
  for (const s of sessions) if (!(await db.sessions.get(s.id))) await db.sessions.put({ ...s, dirty: 1 });
  for (const a of assessments) {
    const old = await db.assessments.get(a.id);
    if (!old || old.updatedAt === 1) await db.assessments.put({ ...a, dirty: 1 });
  }
  for (const g of goals) {
    const old = await db.goals.get(g.id);
    if (!old) await db.goals.put({ ...g, dirty: 1 });
    else if (!old.deleted && JSON.stringify(fillMissing(old, g)) !== JSON.stringify(old)) await save("goals", fillMissing(old, g));
  }
  if (!cur || cur.updatedAt === 1) await db.clients.put({ ...client, dirty: 1 });
  else if (JSON.stringify(fillMissing(cur, client)) !== JSON.stringify(cur)) await save("clients", fillMissing(cur, client));
  // made from less data: the Balanço works them out again
  if (cur) for (const id of await db.snapshots.where("clientId").equals(DEMO_CLIENT_ID).primaryKeys()) await remove("snapshots", id);
  return cur ? 0 : 1;
}
