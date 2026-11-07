// Movement patterns, grips and stances, and how sets are counted against them
// and against a client's sports, pathologies and asymmetries (Focus).

import type { Block, Exercise, Focus, FocusKind, Item, Session, Side } from "./types";
import { norm } from "./text";

/** Movement patterns by body region (the region is only for showing them). */
export const PATTERN_GROUPS: [string, string[]][] = [
  [
    "Membro inferior",
    [
      "agachamento",
      "afundo / unilateral",
      "dobradiça da anca",
      "elevação pélvica",
      "flexão do joelho",
      "extensão do joelho",
      "flexão da anca",
      "adução da anca",
      "abdução da anca",
      "rotação interna da anca",
      "rotação externa da anca",
      "flexão plantar",
      "dorsiflexão",
      "inversão do pé",
      "eversão do pé",
    ],
  ],
  ["Membro superior", ["empurrar horizontal", "empurrar vertical", "puxar horizontal", "puxar vertical", "rotação do ombro"]],
  [
    "Tronco e core",
    ["transporte", "rotação do tronco", "anti-rotação", "anti-extensão", "flexão lateral do tronco", "anti-flexão lateral", "flexão do tronco", "extensão do tronco"],
  ],
  ["Global e condicionamento", ["salto / pliometria", "agilidade / mudança de direção", "locomoção / cardio", "mobilidade / controlo motor"]],
];

export const PATTERNS = PATTERN_GROUPS.flatMap(([, p]) => p);

// Older names, still in exercises and profiles saved (and synced) before the rename.
const OLD_PATTERNS: Record<string, string> = {
  adução: "adução da anca",
  abdução: "abdução da anca",
  rotação: "rotação do tronco",
  "flexão lateral": "flexão lateral do tronco",
  "lateral / mudança de direção": "agilidade / mudança de direção",
  mobilidade: "mobilidade / controlo motor",
};

/** Stored patterns under their current names. */
export function canonPatterns(list: string[]): string[] {
  return [...new Set(list.map((p) => OLD_PATTERNS[p] ?? p))];
}

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
  ["dobradiça da anca", /\b(deadlift|rdl|peso morto|good morning|bom dia|hinge|dobradica|swings?|pull through|back extension|extensao lombar|cleans?|snatch\w*)\b/],
  ["elevação pélvica", /\b(hip thrusts?|glute bridges?|ponte( gluteo| glutea| de gluteos?)?|elevacao pelvica|frog pumps?)\b/],
  ["flexão do joelho", /\b(leg curl|hamstring curl|nordic\w*|nordico|curl de (pernas|posteriores)|glute ham|razor curl)\b/],
  ["extensão do joelho", /\b(leg extensions?|extensao de pernas|cadeira extensora|spanish squat)\b/],
  ["flexão da anca", /\b(hip flexion|hip flexor\w*|flexao da anca|psoas march\w*)\b/],
  ["adução da anca", /\b(copenhag\w*|adductor\w*|adutor\w*|aducao)\b/],
  ["abdução da anca", /\b(band walks?|lateral band|abducao|abduction|clam\w*|side lying lateral raise|hip hike|glute med\w*|fire hydrants?)\b/],
  ["rotação interna da anca", /\b(hip internal rotation|rotacao interna da anca|90 90)\b/],
  ["rotação externa da anca", /\b(hip external rotation|rotacao externa da anca|90 90|clam\w*)\b/],
  ["flexão plantar", /\b(calf|calves|gemeos?|solear|soleo)\b/],
  ["dorsiflexão", /\b(tibialis|tibial raises?|dorsiflex\w*|knee to wall)\b/],
  ["inversão do pé", /\b(inversao|ankle inversion|inversion)\b/],
  ["eversão do pé", /\b(eversao|ankle eversion|eversion)\b/],
  ["empurrar horizontal", /\b(bench press|supino|push ups?|pushups?|flexoes?( de bracos)?|dips|chest press)\b/],
  ["empurrar vertical", /\b(overhead press|ohp|press militar|shoulder press|landmine press|push press|handstand|pino|pike push|kettlebell press|kb press)\b/],
  ["puxar horizontal", /\b(rows?|remadas?|face pulls?|reverse fly|band pull apart)\b/],
  ["puxar vertical", /\b(pull ups?|pullups?|chin ups?|pulldown|puxada|elevacoes)\b/],
  ["rotação do ombro", /\b(external rotation|internal rotation|rotator cuff|coifa)\b(?! (da|de) anca)|\brotacao (externa|interna)\b(?! da anca)/],
  ["transporte", /\b(carry|carries|farmer|suitcase|transporte|mala)\b/],
  ["rotação do tronco", /\bcore rotacao\b|\b(russian twist|woodchop|rotacao de joelho)\b/],
  ["anti-rotação", /\bcore anti rotacao\b|\b(pallof|chop|bird dog|shoulder taps?|renegade)\b/],
  ["anti-extensão", /\bcore anti extensao\b|\b(dead bug|rollout|ab wheel)\b|(?<!(side|copenhagen) )\bplank\b|\bprancha\b(?! (lateral|copenhaga))/],
  ["flexão lateral do tronco", /\bcore flexao lateral\b|\bside bends?\b/],
  ["anti-flexão lateral", /\bcore anti flexao lateral\b|\b(side plank|prancha lateral|windmill)\b/],
  ["flexão do tronco", /\bcore flexao\b(?! lateral)|\b(crunch|sit ups?|leg raise|knee raise|v ups?|toes to bar|slams?|jefferson curl)\b/],
  ["extensão do tronco", /\bcore extensao\b|\b(superman|reverse hyper|sorensen)\b/],
  ["salto / pliometria", /\bpliometria\b|\b(jumps?|hops?|bounds?|bounding|pogos?|saltos?|skips?|multissaltos)\b/],
  ["agilidade / mudança de direção", /\bpotencia lateral\b|\b(shuffle|lateral bound|lateral glide|cod|mudanca de direcao|change of direction|agilidade|agility)\b/],
  ["locomoção / cardio", /\bcardio\b|\b(run|running|sprints?|corrida|bike|rower|remo|incline walk|caminhada|passadeira|ski erg)\b/],
  ["mobilidade / controlo motor", /\bmobilidade\b|\b(stretch\w*|alongamento|mobiliza\w*|mobility|cars|breathing|respiracao|thread the needle|cobra|downward dog|controlo motor)\b/],
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
  return ex.patterns ? canonPatterns(ex.patterns) : inferPatterns(ex);
}

// ── Muscles ─────────────────────────────────────────────────────────────────

const NECK = "neck|pescoco|cervica\\w*";

/** Muscle → what names and tags say it (accent-free, lowercase), by body region. */
const MUSCLE_GROUPS: [string, [string, RegExp][]][] = [
  [
    "Membro inferior",
    [
      ["glúteo máximo", /\b(gluteo maximo|gluteos|glutes?|hip thrusts?|glute bridges?)\b/],
      ["glúteo médio", /\b(gluteo medio|glute med\w*)\b/],
      ["glúteo mínimo", /\bgluteo minimo\b/],
      ["tensor da fáscia lata", /\b(tensor da fascia lata|tfl)\b/],
      ["quadríceps", /\b(quadriceps|quads?|leg extensions?|reto femoral|vasto \w+)\b/],
      ["isquiotibiais", /\b(isquiotibiais|posteriores|hamstrings?|biceps femoral|semitendinoso|semimembranoso)\b/],
      ["adutores", /\b(adutor\w*|adductor\w*|copenhag\w*|gracil|pectineo)\b/],
      ["ílio-psoas", /\b(ilio psoas|iliopsoas|psoas|iliaco|flexores da anca|hip flexor\w*|couch stretch)\b/],
      ["gémeos", /\b(gemeos?|gastrocnemio|calf|calves|ankle|tornozelo)\b/],
      ["sóleo", /\b(soleo|solear|seated calf)\b/],
      ["tibial anterior", /\b(tibial anterior|tibialis( anterior)?|tibial raises?)\b|\btibial\b(?! posterior)/],
      ["tibial posterior", /\btibial posterior\b/],
      ["fibulares", /\b(fibulares|peroneus|peroneais|peroneal|eversao|eversion)\b/],
      ["intrínsecos do pé", /\b(intrinsecos do pe|short foot|pe curto|towel curl|arco plantar)\b/],
    ],
  ],
  [
    "Tronco e core",
    [
      ["reto do abdómen", /\b(reto do abdomen|rectus abdominis|abdominais|abs)\b/],
      ["oblíquo externo", /\b(obliquo externo|obliquos?|obliques?)\b/],
      ["oblíquo interno", /\b(obliquo interno|obliquos?|obliques?)\b/],
      ["transverso do abdómen", /\b(transverso( do abdomen)?|transverse abdominis|vacuum|hollow\w*)\b/],
      ["eretores da espinha", /\b(eretores( da espinha)?|erector\w*|lombar\w*|lower back)\b/],
      ["quadrado lombar", /\b(quadrado lombar|quadratus lumborum)\b/],
      ["multífidos", /\b(multifidos?|multifidus)\b/],
    ],
  ],
  [
    "Membro superior",
    [
      ["peitoral maior", /\b(peitoral( maior)?|peito|chest|pecs?)\b(?! menor)/],
      ["peitoral menor", /\bpeitoral menor\b/],
      ["serrátil anterior", /\b(serratil( anterior)?|serratus|scap push ups?)\b/],
      ["grande dorsal", /\b(grande dorsal|dorsal|lats?|latissimo)\b/],
      ["redondo maior", /\b(redondo maior|teres major)\b/],
      ["coifa dos rotadores", /\b(coifa|rotadores|rotator cuff|external rotation|rotacao externa|supra espinhoso|infra espinhoso|redondo menor|subescapular)\b(?! da anca)/],
      ["deltoides", /\b(deltoides?|delts?|ombros?|shoulders?)\b/],
      ["trapézio", /\b(trapezio|traps?|shrugs?)\b/],
      ["romboides", /\b(romboides|rhomboids?)\b/],
      ["levantador da escápula", /\b(levantador da escapula|levator scapulae)\b/],
      ["bíceps braquial", /\b(biceps( braquial)?|bicep curl)\b(?! femoral)/],
      ["braquial", /(?<!(biceps|triceps) )\b(braquial|brachialis)\b/],
      ["braquiorradial", /\b(braquiorradial|brachioradialis|hammer curl|curl martelo)\b/],
      ["tríceps braquial", /\b(triceps( braquial)?)\b/],
      ["coracobraquial", /\bcoracobraquial\b/],
      ["flexores do antebraço", /\b(antebracos?|forearms?|grip|preensao|wrist curl|flexores do (antebraco|punho)|dead hang)\b/],
      ["extensores do antebraço", /\b(extensores do (antebraco|punho)|wrist extension|reverse curl)\b/],
    ],
  ],
  [
    "Pescoço",
    [
      ["esternocleidomastóideo", new RegExp(`\\b(esternocleidomastoideo|ecom|scm|${NECK})\\b`)],
      ["escalenos", new RegExp(`\\b(escalenos|scalenes|${NECK})\\b`)],
      ["esplénio", new RegExp(`\\b(esplenio|splenius|${NECK})\\b`)],
    ],
  ],
];

const MUSCLE_RULES = MUSCLE_GROUPS.flatMap(([, r]) => r);

export const MUSCLES = [...MUSCLE_RULES.map(([m]) => m), "corpo inteiro"];

/** Muscle chips by body region. */
export const MUSCLE_CHIP_GROUPS: [string, string[]][] = [...MUSCLE_GROUPS.map(([g, r]): [string, string[]] => [g, r.map(([m]) => m)]), ["Global", ["corpo inteiro"]]];

// Older names, still in exercises and profiles saved (and synced) before the rename.
const OLD_MUSCLES: Record<string, string[]> = {
  posteriores: ["isquiotibiais"],
  "flexores da anca": ["ílio-psoas"],
  tibial: ["tibial anterior"],
  abdominais: ["reto do abdómen"],
  oblíquos: ["oblíquo externo", "oblíquo interno"],
  lombares: ["eretores da espinha"],
  peitoral: ["peitoral maior"],
  bíceps: ["bíceps braquial"],
  tríceps: ["tríceps braquial"],
  antebraços: ["flexores do antebraço"],
  pescoço: ["esternocleidomastóideo", "escalenos", "esplénio"],
};

/** Stored muscles under their current names. */
export function canonMuscles(list: string[]): string[] {
  return [...new Set(list.flatMap((m) => OLD_MUSCLES[m] ?? [m]))];
}

// What a movement pattern works, when names and tags say nothing.
const PATTERN_MUSCLES: Record<string, string[]> = {
  agachamento: ["quadríceps", "glúteo máximo"],
  "afundo / unilateral": ["quadríceps", "glúteo máximo", "glúteo médio"],
  "dobradiça da anca": ["isquiotibiais", "glúteo máximo", "eretores da espinha"],
  "elevação pélvica": ["glúteo máximo", "isquiotibiais"],
  "flexão do joelho": ["isquiotibiais"],
  "extensão do joelho": ["quadríceps"],
  "flexão da anca": ["ílio-psoas"],
  "adução da anca": ["adutores"],
  "abdução da anca": ["glúteo médio", "glúteo mínimo", "tensor da fáscia lata"],
  "rotação interna da anca": ["glúteo mínimo", "tensor da fáscia lata"],
  "rotação externa da anca": ["glúteo máximo"],
  "flexão plantar": ["gémeos", "sóleo"],
  dorsiflexão: ["tibial anterior"],
  "inversão do pé": ["tibial posterior", "tibial anterior"],
  "eversão do pé": ["fibulares"],
  "empurrar horizontal": ["peitoral maior", "tríceps braquial", "deltoides"],
  "empurrar vertical": ["deltoides", "tríceps braquial", "trapézio"],
  "puxar horizontal": ["grande dorsal", "romboides", "trapézio", "deltoides"],
  "puxar vertical": ["grande dorsal", "bíceps braquial", "redondo maior"],
  "rotação do ombro": ["coifa dos rotadores"],
  transporte: ["flexores do antebraço", "trapézio", "quadrado lombar"],
  "rotação do tronco": ["oblíquo externo", "oblíquo interno"],
  "anti-rotação": ["oblíquo externo", "oblíquo interno", "transverso do abdómen"],
  "anti-extensão": ["reto do abdómen", "transverso do abdómen"],
  "flexão lateral do tronco": ["oblíquo externo", "oblíquo interno", "quadrado lombar"],
  "anti-flexão lateral": ["quadrado lombar", "oblíquo externo", "oblíquo interno"],
  "flexão do tronco": ["reto do abdómen"],
  "extensão do tronco": ["eretores da espinha", "multífidos"],
  "salto / pliometria": ["quadríceps", "glúteo máximo", "gémeos"],
  "agilidade / mudança de direção": ["glúteo médio", "adutores"],
  "locomoção / cardio": ["corpo inteiro"],
};

/** Muscles guessed from the names and tags, else from the movement patterns. */
export function inferMuscles(ex: Pick<Exercise, "name" | "pt" | "aliases" | "tags" | "patterns">): string[] {
  const text = [ex.name, ex.pt ?? "", ...ex.aliases, ...ex.tags.map((t) => t.replace(/#\d+$/, ""))].map(norm).join(" | ");
  const found = new Set(MUSCLE_RULES.filter(([, re]) => re.test(text)).map(([m]) => m));
  if (!found.size) for (const p of patternsOf(ex)) for (const m of PATTERN_MUSCLES[p] ?? []) found.add(m);
  return MUSCLES.filter((m) => found.has(m));
}

/** The exercise's muscles: set by the coach, else guessed. */
export function musclesOf(ex: Pick<Exercise, "name" | "pt" | "aliases" | "tags" | "patterns" | "muscles">): string[] {
  return ex.muscles ? canonMuscles(ex.muscles) : inferMuscles(ex);
}

/** What the exercise is missing for the counts to work: no patterns, no muscles. */
export function missingInfo(ex: Exercise): ("padrão" | "músculos")[] {
  const out: ("padrão" | "músculos")[] = [];
  if (!patternsOf(ex).length) out.push("padrão");
  if (!musclesOf(ex).length) out.push("músculos");
  return out;
}

/** Does this exercise count for the focus: key exercise, shared pattern or worked muscle. */
export function hitsFocus(f: Focus, ex: Exercise | undefined, patterns: string[]): boolean {
  if (ex && f.exerciseIds.includes(ex.id)) return true;
  if (canonPatterns(f.patterns).some((p) => patterns.includes(p))) return true;
  if (!ex || !f.muscles.length) return false;
  const text = [ex.name, ex.pt ?? "", ...ex.tags.map((t) => t.replace(/#\d+$/, "")), ...musclesOf(ex)].map(norm).join(" | ");
  // a muscle typed under an older name ("posteriores") still finds the new one
  return [...f.muscles, ...canonMuscles(f.muscles)].some((m) => {
    const n = norm(m);
    return n && text.includes(n);
  });
}

// ── Counting ────────────────────────────────────────────────────────────────

/**
 * Sets an item counts for. Once anything in the session is ticked only ticked
 * sets count (what was done); before that, what was prescribed. A circuit
 * item counts one per round; an item without sets counts once. Warm-up sets never count.
 */
export function countedSets(block: Block, item: Item, ticked: boolean): number {
  if (block.kind === "circuit" && item.sets.length <= 1) return block.rounds ?? 1;
  // EMOM: the intervals are shared out between the exercises; AMRAP: rounds unknown, one each
  if (block.kind === "emom") return Math.max(1, Math.round((block.rounds ?? 1) / Math.max(1, block.items.filter((i) => i.role === "main").length)));
  if (block.kind === "amrap") return 1;
  if (!item.sets.length) return 1;
  const sets = item.sets.filter((s) => s.type !== "warmup");
  return ticked ? sets.filter((s) => s.done).length : sets.length;
}

export interface Tally {
  sessions: number;
  sets: number;
  patterns: Map<string, number>;
  grips: Map<string, number>;
  stances: Map<string, number>;
  /** Sets per focus id, how many distinct exercises gave them, and the extra sets on the focus's side. */
  focus: Map<string, { sets: number; exercises: Set<string>; extra: number }>;
  /** Extra sets on one side ("E +1" / "D +1"), per exercise. */
  extra: Record<Side, { sets: number; exercises: Map<string, number> }>;
}

/** The side a focus works on: set on the focus, or read from its name ("Glúteo direito"). */
export function focusSide(f: Focus): Side | null {
  if (f.side !== undefined) return f.side;
  const n = norm(f.name);
  return /\bdireit/.test(n) ? "right" : /\besquerd/.test(n) ? "left" : null;
}

const add = (m: Map<string, number>, k: string, n: number) => m.set(k, (m.get(k) ?? 0) + n);

export function tally(sessions: Session[], exercises: Map<string, Exercise>, focuses: Focus[]): Tally {
  const t: Tally = { sessions: 0, sets: 0, patterns: new Map(), grips: new Map(), stances: new Map(), focus: new Map(), extra: { left: { sets: 0, exercises: new Map() }, right: { sets: 0, exercises: new Map() } } };
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
        // the extra sets on one side are sets too, so they count everywhere
        const extra: Record<Side, number> = { left: it.extraLeft ?? 0, right: it.extraRight ?? 0 };
        const all = n + extra.left + extra.right;
        const exName = ex?.name ?? it.name;
        t.sets += all;
        for (const p of patterns) add(t.patterns, p, all);
        if (it.grip) add(t.grips, it.grip, all);
        if (it.stance) add(t.stances, it.stance, all);
        for (const side of ["left", "right"] as const) {
          if (!extra[side]) continue;
          t.extra[side].sets += extra[side];
          add(t.extra[side].exercises, exName, extra[side]);
        }
        for (const f of focuses) {
          if (!hitsFocus(f, ex, patterns)) continue;
          const cur = t.focus.get(f.id) ?? { sets: 0, exercises: new Set<string>(), extra: 0 };
          cur.sets += all;
          const side = focusSide(f);
          if (side) cur.extra += extra[side];
          cur.exercises.add(exName);
          t.focus.set(f.id, cur);
        }
      }
  }
  return t;
}

// ── Periods ─────────────────────────────────────────────────────────────────

export type Period = "session" | "week" | "month" | "year" | "all";

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

function periodOf(s: Session, period: Period): [key: string, label: string] {
  const [y, m, d] = s.date.split("-");
  switch (period) {
    case "session":
      return [s.id, `${d}/${m}/${y}${s.title ? ` · ${s.title}` : ""}`];
    case "week": {
      const key = weekStart(s.date);
      const [wy, wm, wd] = key.split("-");
      return [key, `Semana de ${wd}/${wm}/${wy}`];
    }
    case "month":
      return [`${y}-${m}`, `${MONTHS[Number(m) - 1]} ${y}`];
    case "year":
      return [y, y];
    case "all":
      return ["all", "Total"];
  }
}

/** Sessions grouped by session / week / month / year (or all together), newest first. */
export function groupByPeriod(sessions: Session[], period: Period): PeriodGroup[] {
  const groups = new Map<string, PeriodGroup>();
  for (const s of sessions) {
    if (s.deleted) continue;
    const [key, label] = periodOf(s, period);
    const g = groups.get(key) ?? { key, label, sessions: [] };
    g.sessions.push(s);
    groups.set(key, g);
  }
  const sortKey = (g: PeriodGroup) => (period === "session" ? g.sessions[0].date : g.key);
  return [...groups.values()].sort((a, b) => sortKey(b).localeCompare(sortKey(a)) || b.sessions[0].updatedAt - a.sessions[0].updatedAt);
}
