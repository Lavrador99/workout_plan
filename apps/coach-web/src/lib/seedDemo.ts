import { newResult } from "./assessment";
import { matchExercise } from "./db";
import { parseItemLine } from "./parser";
import { PRIMARY_GOALS, testGoal } from "./progress";
import type { Activity, Assessment, Block, Client, Exercise, Goal, Item, RunZone, Session, SetRow, TestDef, TestResult, Trial, Weights } from "@treino/core/types";

// A made-up client called "Teste", to see the assessments with real-looking
// history: 14 months of a footballer who sprains the left ankle in March 2026,
// comes back, and keeps the left hip abductors weaker throughout. Fixed dates
// and ids, so every device builds the same records. All the numbers are fiction.

export const DEMO_CLIENT_ID = "seed-demo-teste";

const VISITS: [date: string, title: string, conditions: string][] = [
  ["2025-09-08", "Avaliação inicial", "Fim do dia, relvado sintético, sem jogo nas 48h anteriores"],
  ["2025-12-01", "Meio da época", "Fim do dia, relvado sintético, 3 dias depois do jogo"],
  ["2026-02-16", "Antes da 2.ª volta", "Fim do dia, relvado sintético"],
  ["2026-04-20", "Regresso após entorse", "Primeira semana de treino completo depois da lesão"],
  ["2026-06-29", "Fim de época", "Manhã, relvado sintético, pós-período de transição"],
  ["2026-09-07", "Pré-época", "Fim do dia, relvado sintético"],
  ["2026-11-02", "Início de época", "Fim do dia, relvado sintético, 3 dias depois do jogo"],
];

type Values = (number | null)[];

/** A test's values per visit: one list, or left and right. null = not done that day. */
const RESULTS: [testId: string, values: Values, right?: Values][] = [
  ["seed-test-peso", [78.4, 78.9, 79.6, 80.2, 79.1, 78.5, 78.2]],
  ["seed-test-cintura", [82, 82.5, 83, 84, 82.5, 81.5, 80.5]],
  ["seed-test-massa-gorda", [14.8, 15, 15.3, 16.1, 15.2, 13.9, 13.1]],
  ["seed-test-knee-to-wall", [8.5, 9, 9.5, 6.5, 8, 9.5, 10], [10.5, 10.5, 11, 11, 11, 11.5, 11.5]],
  ["seed-test-thomas", [0, 0, 1, 0, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1]],
  ["seed-test-ri-anca", [32, 33, 34, 30, 33, 35, 36], [36, 36, 37, 37, 37, 38, 38]],
  ["seed-test-flexao-ombro", [168, 170, 171, 171, 172, 174, 175], [170, 171, 172, 172, 173, 174, 176]],
  ["seed-test-single-leg-balance", [22, 26, 30, 14, 24, 34, 38], [32, 34, 36, 36, 38, 42, 45]],
  ["seed-test-y-anterior", [58, 60, 61, 54, 58, 62, 63], [62, 63, 64, 64, 65, 65, 66]],
  ["seed-test-y-posteromedial", [96, 98, 100, 90, 96, 102, 104], [102, 103, 104, 104, 105, 106, 107]],
  ["seed-test-y-posterolateral", [90, 92, 94, 84, 90, 96, 98], [96, 97, 98, 98, 99, 100, 101]],
  ["seed-test-overhead-squat", [3, 3, 3, 3, 3, 4, 4]],
  ["seed-test-single-leg-squat", [2, 3, 3, 2, 3, 3, 4], [3, 3, 4, 4, 4, 4, 4]],
  ["seed-test-lunge", [3, 3, 4, 2, 3, 4, 4], [4, 4, 4, 4, 4, 4, 5]],
  ["seed-test-handgrip", [46, 47, 48, 48, 49, 50, 50], [50, 51, 52, 52, 53, 53, 54]],
  ["seed-test-dinamometria-abducao", [18, 19, 19.5, 18, 20, 21.5, 22.5], [23, 23.5, 24, 24, 24.5, 25, 25]],
  ["seed-test-1rm-agachamento", [100, null, 110, null, 105, null, 120]],
  ["seed-test-1rm-supino", [72.5, null, 77.5, null, 75, null, 85]],
  ["seed-test-1rm-peso-morto", [130, null, 140, null, 135, null, 150]],
  ["seed-test-1rm-press", [47.5, null, 50, null, 50, null, 55]],
  ["seed-test-e1rm-agachamento", [85, 87.5, 90, 85, 87.5, 92.5, 97.5]],
  ["seed-test-e1rm-supino", [60, 62.5, 65, 62.5, 65, 70, 72.5]],
  ["seed-test-e1rm-peso-morto", [100, 105, 107.5, 100, 107.5, 112.5, 117.5]],
  ["seed-test-e1rm-press", [40, 41, 42.5, 40, 42.5, 45, 47.5]],
  ["seed-test-e1rm-bulgaro", [20, 22, 24, 18, 22, 26, 28], [24, 26, 28, 28, 28, 30, 32]],
  ["seed-test-cmj", [33.2, 34.5, 35.6, 32.1, 34.8, 37, 38.4]],
  ["seed-test-cmj-unilateral", [15.1, 15.8, 16.2, 13.4, 15.2, 17, 17.6], [17.4, 17.8, 18.4, 18.5, 18.6, 19.1, 19.3]],
  ["seed-test-squat-jump", [30.5, 31.2, 32, 29.4, 31.5, 33.8, 34.6]],
  ["seed-test-salto-horizontal", [228, 232, 236, 218, 230, 242, 248]],
  ["seed-test-sprint-5", [1.08, 1.07, 1.05, 1.11, 1.08, 1.03, 1.01]],
  ["seed-test-sprint-10", [1.92, 1.9, 1.87, 1.96, 1.91, 1.84, 1.81]],
  ["seed-test-sprint-20", [3.12, 3.09, 3.05, 3.2, 3.11, 3.02, 2.97]],
  ["seed-test-505", [2.62, 2.6, 2.57, 2.74, 2.66, 2.55, 2.52], [2.54, 2.52, 2.5, 2.5, 2.49, 2.47, 2.46]],
  ["seed-test-t-test", [10.2, 10.1, 10, 10.6, 10.2, 9.85, 9.7]],
  ["seed-test-yoyo-ir1", [1040, null, 1240, null, 1120, 1360, 1480]],
  ["seed-test-cooper", [2650, null, 2780, null, 2680, 2860, 2950]],
  ["seed-test-fms-deep-squat", [2, 2, 2, 2, 2, 3, 3]],
  ["seed-test-fms-hurdle-step", [2, 2, 2, 1, 2, 2, 3], [2, 2, 3, 3, 3, 3, 3]],
  ["seed-test-fms-inline-lunge", [2, 2, 2, 2, 2, 3, 3], [2, 3, 3, 3, 3, 3, 3]],
  ["seed-test-fms-shoulder-mobility", [2, 2, 3, 3, 3, 3, 3], [3, 3, 3, 3, 3, 3, 3]],
  ["seed-test-fms-aslr", [2, 2, 2, 2, 2, 2, 3], [2, 2, 2, 3, 3, 3, 3]],
  ["seed-test-fms-push-up", [2, 2, 2, 2, 2, 3, 3]],
  ["seed-test-fms-rotary", [2, 2, 2, 1, 2, 2, 2], [2, 2, 2, 2, 2, 2, 2]],
];

/** How some of the tests were measured, so that field is filled in too. */
const INSTRUMENT: Record<string, string> = {
  "seed-test-massa-gorda": "Bioimpedância",
  "seed-test-cmj": "Tapete de contacto",
  "seed-test-handgrip": "Dinamómetro Jamar",
  "seed-test-sprint-10": "Células fotoelétricas",
};

const round = (n: number) => Math.round(n * 100) / 100;

/** The best trial is the given value; the others are a little worse. */
function trialsOf(t: TestDef, value: number, side?: "left" | "right"): Trial[] {
  const base = side ? { side } : {};
  if (t.strength === "estimated") return [{ ...base, value, reps: 5 }]; // the load of a set of 5
  return Array.from({ length: t.trials }, (_, i) => ({ ...base, value: round(value * (t.direction === "lower" ? 1 + i * 0.015 : 1 - i * 0.015)) }));
}

function resultOf(t: TestDef, assessmentId: string, values: Values, right: Values | undefined, visit: number): TestResult | null {
  const value = values[visit];
  if (value == null) return null;
  const trials = right ? [...trialsOf(t, value, "left"), ...trialsOf(t, right[visit] as number, "right")] : trialsOf(t, value);
  const instrument = INSTRUMENT[t.id];
  return { ...newResult(t), id: `${assessmentId}-${t.id}`, trials, ...(instrument ? { instrument } : {}) };
}

function assessments(tests: TestDef[]): Assessment[] {
  return VISITS.map(([date, title, conditions], visit) => {
    const id = `seed-demo-a-${date}`;
    const results = RESULTS.flatMap(([testId, values, right]) => {
      const t = tests.find((x) => x.id === testId);
      const r = t && resultOf(t, id, values, right, visit);
      return r ? [r] : [];
    });
    // a jump that did not count: hands left the hips
    const cmj = results.find((r) => r.testId === "seed-test-cmj");
    if (visit === 2 && cmj) cmj.trials.push({ value: 39.2, invalid: true });
    return { id, updatedAt: 1, clientId: DEMO_CLIENT_ID, date, title, conditions, notes: visit === 3 ? "Dorsiflexão esquerda ainda limitada depois da entorse." : "", results };
  });
}

const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);

/** Weeks with no training: the ankle sprain. */
const INJURY = ["2026-03-16", "2026-04-13"];
const LAST_DAY = "2026-11-05";
/** A session of mobility a week joins the plan here. */
const PRESEASON = "2026-09-07";

function lines(kind: "lower" | "upper", week: number, back: boolean): string[] {
  const step = Math.floor(week / 8) * 2.5 - (back ? 10 : 0); // slowly up, down after the injury
  if (kind === "lower")
    return [`Back Squat 4x6 ${70 + step}kg`.replace(".", ","), `Romanian Deadlift 3x8 ${60 + step}kg`.replace(".", ","), "Single Leg RDL 3x8 2x12kg E+1", "Nordic Hamstring Curl 3x5"];
  return [`Bench Press 4x6 ${50 + step}kg`.replace(".", ","), `Overhead Press 3x8 ${30 + step / 2}kg`.replace(".", ","), `Hip Thrust 3x10 ${80 + step}kg`.replace(".", ","), "Calf Raise 3x12 40kg"];
}

/** The two strength days a week from the first assessment on, all ticked as done. */
function sessions(library: Exercise[]): Session[] {
  const out: Session[] = [];
  const firstDay = VISITS[0][0];
  for (let week = 0; addDays(firstDay, week * 7) <= LAST_DAY; week++) {
    const monday = addDays(firstDay, week * 7);
    if (monday >= INJURY[0] && monday < INJURY[1]) continue;
    (
      [
        ["lower", "Inferiores", 0],
        ["upper", "Superiores", 3],
      ] as const
    ).forEach(([kind, title, day]) => {
      const date = addDays(monday, day);
      if (date > LAST_DAY) return;
      const id = `seed-demo-s-${date}`;
      const items: Item[] = lines(kind, week, monday >= INJURY[1] && monday < "2026-07-01").map((line, i) => {
        const item = parseItemLine(line);
        return { ...item, id: `${id}-i${i}`, exerciseId: matchExercise(library, item.name)?.id, sets: item.sets.map((s) => ({ ...s, done: true })) };
      });
      const block: Block = { id: `${id}-b`, kind: "sets", section: "principal", title: "", items };
      const startedAt = Date.parse(`${date}T18:30:00Z`);
      out.push({ id, updatedAt: 1, clientId: DEMO_CLIENT_ID, date, title, notes: "", blocks: [block], activity: "treino", startedAt, endedAt: startedAt + 3_600_000 });
    });
  }
  return out;
}

function sessionOf(library: Exercise[], id: string, date: string, title: string, activity: Activity, rows: string[], done: boolean, over: Partial<Session> = {}): Session {
  const items: Item[] = rows.map((line, i) => {
    const item = parseItemLine(line);
    return { ...item, id: `${id}-i${i}`, exerciseId: matchExercise(library, item.name)?.id, sets: item.sets.map((s) => ({ ...s, done })) };
  });
  return { id, updatedAt: 1, clientId: DEMO_CLIENT_ID, date, title, notes: "", blocks: [{ id: `${id}-b`, kind: "sets", section: "principal", title: "", items }], activity, ...over };
}

interface Segment {
  km?: number;
  min?: number;
  kind?: RunZone["kind"];
  zone?: RunZone["zone"];
}

function runItem(library: Exercise[], id: string, segments: Segment[]): Item {
  const sets = segments.map((s): SetRow => ({ reps: s.km ? s.km * 1000 : null, duration: s.min ? s.min * 60 : null, load: null, done: true, zone: s.kind && s.zone ? { kind: s.kind, zone: s.zone } : null }));
  return { ...parseItemLine("Corrida"), id: `${id}-i0`, exerciseId: matchExercise(library, "Corrida")?.id, run: true, repsUnit: "m", sets };
}

const MOBILITY = ["1/2 Kneeling Ankle Mobilization 3x10", "Couch Stretch 2x10", "90/90 Hip Switch 2x10"];

/** Everything beyond the two strength days: what does and does not count for adherence. */
function otherSessions(library: Exercise[]): Session[] {
  const out: Session[] = [];
  // mobility on Wednesdays since pre-season: two were never ticked
  for (let day = addDays(PRESEASON, 2); day <= LAST_DAY; day = addDays(day, 7)) {
    const done = day !== "2026-10-07" && day !== "2026-10-21";
    out.push(sessionOf(library, `seed-demo-m-${day}`, day, "Mobilidade", "mobilidade", MOBILITY, done, done ? {} : { notes: "Faltou: marcada e não feita." }));
  }
  // a run every other Saturday, off the plan, by distance or time, on a heart rate or pace goal
  const shapes: Segment[][] = [
    [{ km: 1.5, kind: "hr", zone: 1 }, { km: 5, kind: "hr", zone: 2 }, { km: 1, kind: "hr", zone: 1 }],
    [{ km: 2, kind: "hr", zone: 2 }, ...Array.from({ length: 4 }, (_, i) => [{ min: 3, kind: "pace", zone: 5 } as const, { min: 2, kind: "hr", zone: 1 } as const]).flat(), { km: 1 }],
    [{ km: 2, kind: "hr", zone: 2 }, { min: 20, kind: "pace", zone: 4 }, { km: 1.5, kind: "hr", zone: 1 }],
  ];
  let turn = 0;
  for (let day = "2026-06-06"; day <= LAST_DAY; day = addDays(day, 14)) {
    const id = `seed-demo-c-${day}`;
    const session = sessionOf(library, id, day, "Corrida", "cardio", [], true);
    session.blocks[0].items = [runItem(library, id, shapes[turn++ % shapes.length])];
    out.push(session);
  }
  // assessment days
  for (const day of ["2026-09-07", "2026-11-02"]) out.push(sessionOf(library, `seed-demo-av-${day}`, day, "Avaliação", "avaliacao", ["Spiderman Lunge with Rotation 2x6"], true));
  // an extra the coach set aside
  out.push(sessionOf(library, "seed-demo-x-2026-10-11", "2026-10-11", "Extra com a equipa", "outro", ["Copenhagen Plank 3x5"], true, { noAdherence: true, notes: "Fora do plano, a pedido do clube." }));
  return out;
}

const PRESET = PRIMARY_GOALS.find((g) => g.id === "desporto")!.weights;
const OWN_WEIGHTS: Weights = { geral: 25, forca: 25, mobilidade: 20, composicao: 5, cardio: 20, adesao: 5 };
const timeOf = (iso: string) => Date.parse(`${iso}T09:00:00Z`);

function goals(): Goal[] {
  const test = (testId: string, target: number, over: Partial<Goal> = {}): Goal => ({ ...testGoal(DEMO_CLIENT_ID, testId, target), updatedAt: 1, importance: 1, ...over });
  const own = (id: string, title: string, over: Partial<Goal>): Goal => ({ id: `seed-demo-g-${id}`, updatedAt: 1, clientId: DEMO_CLIENT_ID, title, criteria: "", status: "active", importance: 1, ...over });
  return [
    test("seed-test-sprint-10", 1.76, { importance: 3, dueDate: "2027-03-01", criteria: "Melhor tentativa em células, com partida a 2 apoios." }),
    test("seed-test-yoyo-ir1", 1600, { importance: 3, dueDate: "2027-01-15" }),
    test("seed-test-cmj", 40, { importance: 2, dueDate: "2027-03-01" }),
    test("seed-test-knee-to-wall", 12, { importance: 2, criteria: "Sem dor e com os dois lados a menos de 1 cm." }),
    test("seed-test-1rm-agachamento", 130, { dueDate: "2027-06-01" }),
    test("seed-test-dinamometria-abducao", 26, { importance: 2, criteria: "Reduzir a diferença entre lados." }),
    test("seed-test-massa-gorda", 12, { dueDate: "2027-01-15" }),
    test("seed-test-overhead-squat", 4, { status: "achieved", achievedAt: "2026-09-07" }),
    test("seed-test-cooper", 3200, { status: "dropped", criteria: "Substituído pelo Yo-Yo IR1." }),
    own("dor", "Correr 30 minutos sem dor no tornozelo", { status: "achieved", achievedAt: "2026-06-15", importance: 3, criteria: "Duas corridas seguidas sem dor." }),
    own("jogo", "Voltar a jogar 90 minutos", { dueDate: "2026-12-15", importance: 3, criteria: "Dois jogos completos sem desconforto." }),
    own("sono", "Dormir 8 horas antes dos jogos", { status: "dropped" }),
    own("treinos", "Treinos por mês", { unit: "treinos", startValue: 6, currentValue: 11, target: 12, dueDate: "2026-12-31" }),
    own("semanas", "Semanas seguidas sem dor", { unit: "semanas", startValue: 0, currentValue: 14, target: 20, dueDate: "2026-10-31", criteria: "Registado pelo cliente." }),
  ];
}

/** What an older copy of a record lacks. What is already there stays. */
export function fillMissing<T extends object>(cur: T, demo: T): T {
  const out = { ...cur } as Record<string, unknown>;
  for (const [k, v] of Object.entries(demo)) if (out[k] == null || out[k] === "") out[k] = v;
  return out as T;
}

export function demoData(tests: TestDef[], library: Exercise[]): { client: Client; assessments: Assessment[]; sessions: Session[]; goals: Goal[] } {
  const client: Client = {
    id: DEMO_CLIENT_ID,
    updatedAt: 1,
    name: "Teste",
    sex: "male",
    birthYear: 2001,
    hrMax: 192,
    hrRest: 54,
    injuries: "Entorse do tornozelo esquerdo (março de 2026)",
    notes: "Atleta fictício, com dados inventados para demonstração.",
    focusIds: ["seed-focus-futebol"],
    heightCm: 178,
    dominantHand: "right",
    dominantFoot: "right",
    position: "Lateral",
    level: "competitivo",
    sportYears: 12,
    thresholdPace: 270,
    weeklyFrequency: 3,
    schedule: [
      { from: VISITS[0][0], days: [0, 3] },
      { from: INJURY[0], days: [] },
      { from: INJURY[1], days: [0, 3] },
      { from: PRESEASON, days: [0, 2, 3] },
    ],
    adherenceSkips: ["cardio", "avaliacao"],
    goals: ["Performance", "Força"],
    primaryGoal: "desporto",
    weights: OWN_WEIGHTS,
    weightLog: [
      { at: timeOf(VISITS[0][0]), primaryGoal: "desporto", weights: PRESET, custom: false },
      { at: timeOf(VISITS[3][0]), primaryGoal: "desporto", weights: OWN_WEIGHTS, custom: true },
    ],
    consentAt: VISITS[0][0],
  };
  return { client, assessments: assessments(tests), sessions: [...sessions(library), ...otherSessions(library)], goals: goals() };
}
