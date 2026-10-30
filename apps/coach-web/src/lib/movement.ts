// Movement patterns, grips and stances, and how sets are counted against them
// and against a client's sports, pathologies and asymmetries (Focus).

import type { Block, Exercise, Focus, FocusKind, Item, Session } from "./types";
import { norm } from "./text";

export const PATTERNS = [
  "agachamento",
  "afundo / unilateral",
  "dobradiça da anca",
  "flexão do joelho",
  "flexão da anca",
  "adução",
  "abdução",
  "flexão plantar",
  "empurrar horizontal",
  "empurrar vertical",
  "puxar horizontal",
  "puxar vertical",
  "transporte",
  "rotação",
  "anti-rotação",
  "anti-extensão",
  "flexão lateral",
  "anti-flexão lateral",
  "flexão do tronco",
  "extensão do tronco",
  "salto / pliometria",
  "lateral / mudança de direção",
  "locomoção / cardio",
];

export const GRIPS = ["pronada", "supinada", "neutra", "mista", "larga", "estreita"];
export const STANCES = ["pés juntos", "largura da anca", "largura dos ombros", "afastados", "dividida", "unipodal"];

export const FOCUS_KINDS: [FocusKind, string, string][] = [
  ["sport", "Modalidades", "Modalidade"],
  ["pathology", "Patologias", "Patologia"],
  ["asymmetry", "Assimetrias", "Assimetria"],
];

// Guessed from name + Portuguese name + aliases + tags (accent-free, lowercase).
const RULES: [string, RegExp][] = [
  ["afundo / unilateral", /\b(lunges?|split squat|bulgar\w*|afundos?|step ups?|step downs?|pistol|single leg squat|agachamento (dividido|bulgaro|unilateral)|skater squat)\b/],
  ["agachamento", /\b(squats?|agachamento|leg press|goblet|sissy|wall sit)\b/],
  ["dobradiça da anca", /\b(deadlift|rdl|peso morto|good morning|bom dia|hinge|dobradica|hip thrusts?|glute bridge|ponte|swings?|pull through|back extension|extensao lombar|cleans?|snatch\w*)\b/],
  ["flexão do joelho", /\b(leg curl|hamstring curl|nordic\w*|nordico|curl de (pernas|posteriores)|glute ham|razor curl)\b/],
  ["flexão da anca", /\b(hip flexion|hip flexor\w*|flexao da anca)\b/],
  ["adução", /\b(copenhag\w*|adductor\w*|adutor\w*|aducao)\b/],
  ["abdução", /\b(band walks?|lateral band|abducao|abduction|clam\w*|side lying lateral raise|hip hike|glute med\w*)\b/],
  ["flexão plantar", /\b(calf|calves|gemeos?|tibialis|tibial)\b/],
  ["empurrar horizontal", /\b(bench press|supino|push ups?|pushups?|flexoes?( de bracos)?|dips|chest press)\b/],
  ["empurrar vertical", /\b(overhead press|ohp|press militar|shoulder press|landmine press|push press|handstand|pino|pike push|kettlebell press|kb press)\b/],
  ["puxar horizontal", /\b(rows?|remadas?|face pulls?|reverse fly|band pull apart)\b/],
  ["puxar vertical", /\b(pull ups?|pullups?|chin ups?|pulldown|puxada|elevacoes)\b/],
  ["transporte", /\b(carry|carries|farmer|suitcase|transporte|mala)\b/],
  ["rotação", /\bcore rotacao\b|\b(russian twist|woodchop|rotacao de joelho)\b/],
  ["anti-rotação", /\bcore anti rotacao\b|\b(pallof|chop|bird dog)\b/],
  ["anti-extensão", /\bcore anti extensao\b|\b(dead bug|rollout|ab wheel)\b|(?<!(side|copenhagen) )\bplank\b|\bprancha\b(?! (lateral|copenhaga))/],
  ["flexão lateral", /\bcore flexao lateral\b|\bside bends?\b/],
  ["anti-flexão lateral", /\bcore anti flexao lateral\b|\b(side plank|prancha lateral|windmill)\b/],
  ["flexão do tronco", /\bcore flexao\b(?! lateral)|\b(crunch|sit ups?|leg raise|knee raise|v ups?|toes to bar)\b/],
  ["extensão do tronco", /\bcore extensao\b|\b(superman|reverse hyper|sorensen)\b/],
  ["salto / pliometria", /\bpliometria\b|\b(jumps?|hops?|bounds?|bounding|pogos?|saltos?|skips?|multissaltos)\b/],
  ["lateral / mudança de direção", /\bpotencia lateral\b|\b(shuffle|lateral bound|lateral glide|cod|mudanca de direcao|change of direction)\b/],
  ["locomoção / cardio", /\bcardio\b|\b(run|running|sprints?|corrida|bike|rower|remo|incline walk|caminhada|passadeira|ski erg)\b/],
];

/** Movement patterns guessed from the exercise's names and tags. */
export function inferPatterns(ex: Pick<Exercise, "name" | "pt" | "aliases" | "tags">): string[] {
  const text = [ex.name, ex.pt ?? "", ...ex.aliases, ...ex.tags].map(norm).join(" | ");
  const found = RULES.filter(([, re]) => re.test(text)).map(([p]) => p);
  // a split squat is a squat too, but it counts as the unilateral pattern
  return found.includes("afundo / unilateral") ? found.filter((p) => p !== "agachamento") : found;
}

/** The exercise's patterns: set by the coach, else guessed. */
export function patternsOf(ex: Pick<Exercise, "name" | "pt" | "aliases" | "tags" | "patterns">): string[] {
  return ex.patterns ?? inferPatterns(ex);
}

/** Does this exercise count for the focus: key exercise, shared pattern or worked muscle. */
export function hitsFocus(f: Focus, ex: Exercise | undefined, patterns: string[]): boolean {
  if (ex && f.exerciseIds.includes(ex.id)) return true;
  if (patterns.some((p) => f.patterns.includes(p))) return true;
  if (!ex || !f.muscles.length) return false;
  const text = [ex.name, ex.pt ?? "", ...ex.tags.map((t) => t.replace(/#\d+$/, ""))].map(norm).join(" | ");
  return f.muscles.some((m) => {
    const n = norm(m);
    return n && text.includes(n);
  });
}

// ── Counting ────────────────────────────────────────────────────────────────

/**
 * Sets an item counts for. Once anything in the session is ticked only ticked
 * sets count (what was done); before that, what was prescribed. A circuit
 * item counts one per round; an item without sets counts once.
 */
export function countedSets(block: Block, item: Item, ticked: boolean): number {
  if (block.kind === "circuit" && item.sets.length <= 1) return block.rounds ?? 1;
  if (!item.sets.length) return 1;
  return ticked ? item.sets.filter((s) => s.done).length : item.sets.length;
}

export interface Tally {
  sessions: number;
  sets: number;
  patterns: Map<string, number>;
  grips: Map<string, number>;
  stances: Map<string, number>;
  /** Sets per focus id, and how many distinct exercises gave them. */
  focus: Map<string, { sets: number; exercises: Set<string> }>;
  /** Sets with extra reps on the left side ("E +1"). */
  extraLeft: number;
}

const add = (m: Map<string, number>, k: string, n: number) => m.set(k, (m.get(k) ?? 0) + n);

export function tally(sessions: Session[], exercises: Map<string, Exercise>, focuses: Focus[]): Tally {
  const t: Tally = { sessions: 0, sets: 0, patterns: new Map(), grips: new Map(), stances: new Map(), focus: new Map(), extraLeft: 0 };
  const patternCache = new Map<string, string[]>();
  for (const s of sessions) {
    if (s.deleted) continue;
    t.sessions++;
    const ticked = s.blocks.some((b) => b.items.some((i) => i.sets.some((x) => x.done)));
    for (const b of s.blocks)
      for (const it of b.items) {
        if (!it.name.trim()) continue;
        const n = countedSets(b, it, ticked);
        if (!n) continue;
        const ex = it.exerciseId ? exercises.get(it.exerciseId) : undefined;
        const key = ex?.id ?? `n:${norm(it.name)}`;
        let patterns = patternCache.get(key);
        if (!patterns) patternCache.set(key, (patterns = patternsOf(ex ?? { name: it.name, aliases: [], tags: [] })));
        t.sets += n;
        for (const p of patterns) add(t.patterns, p, n);
        if (it.grip) add(t.grips, it.grip, n);
        if (it.stance) add(t.stances, it.stance, n);
        if (it.extraLeft) t.extraLeft += n;
        for (const f of focuses) {
          if (!hitsFocus(f, ex, patterns)) continue;
          const cur = t.focus.get(f.id) ?? { sets: 0, exercises: new Set<string>() };
          cur.sets += n;
          cur.exercises.add(ex?.name ?? it.name);
          t.focus.set(f.id, cur);
        }
      }
  }
  return t;
}

// ── Periods ─────────────────────────────────────────────────────────────────

export type Period = "session" | "week" | "month";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Monday of the date's week, as YYYY-MM-DD. */
export function weekStart(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

export interface PeriodGroup {
  key: string;
  label: string;
  sessions: Session[];
}

/** Sessions grouped by session / week / month, newest first. */
export function groupByPeriod(sessions: Session[], period: Period): PeriodGroup[] {
  const groups = new Map<string, PeriodGroup>();
  for (const s of sessions) {
    if (s.deleted) continue;
    const key = period === "session" ? s.id : period === "week" ? weekStart(s.date) : s.date.slice(0, 7);
    const [y, m, d] = (period === "session" ? s.date : key).split("-");
    const label =
      period === "session" ? `${d}/${m}/${y}${s.title ? ` · ${s.title}` : ""}` : period === "week" ? `Semana de ${d}/${m}/${y}` : `${MONTHS[Number(m) - 1]} ${y}`;
    const g = groups.get(key) ?? { key, label, sessions: [] };
    g.sessions.push(s);
    groups.set(key, g);
  }
  const sortKey = (g: PeriodGroup) => (period === "session" ? g.sessions[0].date : g.key);
  return [...groups.values()].sort((a, b) => sortKey(b).localeCompare(sortKey(a)) || b.sessions[0].updatedAt - a.sessions[0].updatedAt);
}
