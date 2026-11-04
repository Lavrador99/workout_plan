import { newResult } from "./assessment";
import { matchExercise } from "./db";
import { parseItemLine } from "./parser";
import type { Assessment, Block, Client, Exercise, Item, Session, TestDef, TestResult, Trial } from "./types";

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
  ["seed-test-knee-to-wall", [8.5, 9, 9.5, 6.5, 8, 9.5, 10], [10.5, 10.5, 11, 11, 11, 11.5, 11.5]],
  ["seed-test-y-anterior", [58, 60, 61, 54, 58, 62, 63], [62, 63, 64, 64, 65, 65, 66]],
  ["seed-test-single-leg-squat", [2, 3, 3, 2, 3, 3, 4], [3, 3, 4, 4, 4, 4, 4]],
  ["seed-test-handgrip", [46, 47, 48, 48, 49, 50, 50], [50, 51, 52, 52, 53, 53, 54]],
  ["seed-test-dinamometria-abducao", [18, 19, 19.5, 18, 20, 21.5, 22.5], [23, 23.5, 24, 24, 24.5, 25, 25]],
  ["seed-test-1rm-agachamento", [100, null, 110, null, 105, null, 120]],
  ["seed-test-e1rm-supino", [60, 62.5, 65, 62.5, 65, 70, 72.5]],
  ["seed-test-e1rm-bulgaro", [20, 22, 24, 18, 22, 26, 28], [24, 26, 28, 28, 28, 30, 32]],
  ["seed-test-cmj", [33.2, 34.5, 35.6, 32.1, 34.8, 37, 38.4]],
  ["seed-test-cmj-unilateral", [15.1, 15.8, 16.2, 13.4, 15.2, 17, 17.6], [17.4, 17.8, 18.4, 18.5, 18.6, 19.1, 19.3]],
  ["seed-test-sprint-10", [1.92, 1.9, 1.87, 1.96, 1.91, 1.84, 1.81]],
  ["seed-test-505", [2.62, 2.6, 2.57, 2.74, 2.66, 2.55, 2.52], [2.54, 2.52, 2.5, 2.5, 2.49, 2.47, 2.46]],
  ["seed-test-yoyo-ir1", [1040, null, 1240, null, 1120, 1360, 1480]],
];

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
  return { ...newResult(t), id: `${assessmentId}-${t.id}`, trials };
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
const LAST_DAY = "2026-11-02";

function lines(kind: "lower" | "upper", week: number, back: boolean): string[] {
  const step = Math.floor(week / 8) * 2.5 - (back ? 10 : 0); // slowly up, down after the injury
  if (kind === "lower")
    return [`Back Squat 4x6 ${70 + step}kg`.replace(".", ","), `Romanian Deadlift 3x8 ${60 + step}kg`.replace(".", ","), "Single Leg RDL 3x8 2x12kg E+1", "Nordic Hamstring Curl 3x5"];
  return [`Bench Press 4x6 ${50 + step}kg`.replace(".", ","), `Overhead Press 3x8 ${30 + step / 2}kg`.replace(".", ","), `Hip Thrust 3x10 ${80 + step}kg`.replace(".", ","), "Calf Raise 3x12 40kg"];
}

/** Two sessions a week from the first assessment on, all ticked as done. */
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
      out.push({ id, updatedAt: 1, clientId: DEMO_CLIENT_ID, date, title, notes: "", blocks: [block], startedAt, endedAt: startedAt + 3_600_000 });
    });
  }
  return out;
}

export function demoData(tests: TestDef[], library: Exercise[]): { client: Client; assessments: Assessment[]; sessions: Session[] } {
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
    weeklyFrequency: 4,
    goals: ["Performance", "Força"],
    targets: { "seed-test-sprint-10": 1.76, "seed-test-cmj": 40, "seed-test-yoyo-ir1": 1600, "seed-test-knee-to-wall": 12 },
    consentAt: VISITS[0][0],
  };
  return { client, assessments: assessments(tests), sessions: sessions(library) };
}
