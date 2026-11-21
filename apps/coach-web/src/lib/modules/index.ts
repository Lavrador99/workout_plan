import { finalValue, SIDES } from "../assessment";
import { benchmark, clientContext } from "../benchmark";
import { REASSESS_WEEKS } from "../report";
import { ageOf, isMinor } from "../screening";
import { fmtNum } from "@treino/core/text";
import type { Assessment, Client, Focus, Light, ModuleId, Screening, TestDef, TestResult } from "@treino/core/types";
import { STRENGTH_BALANCE } from "./strengthBalance";

// Assessment modules: a focus with its own anamnesis, tests, areas and report.
// Configuration lives here, versioned with the code, like the references.

/** A cut written in the module's form: "X or worse = priority". `female` overrides the value for women. */
export interface Cut {
  when: "below" | "at_most" | "at_least" | "above";
  value: number;
  female?: number;
  /** On tests with sides: which side the cut reads. Unset = the best. */
  side?: "best" | "worst";
  text: string;
}

export type BodyZone = "feet" | "legs" | "thighs" | "arms" | "shoulders" | "hips" | "chest";

export interface AreaDef {
  id: string;
  coach: string; // as the coach calls it
  client: string; // as the report says it
  zones: BodyZone[];
  /** What the plan does about it, in the client's words. */
  plan: string;
}

export interface ModuleTest {
  testId: string;
  area: string;
  step: string;
  /** Priority cut from the module's form. */
  cut?: Cut;
  /** Coach only, approximate: never in the report. */
  risk?: Cut;
  /** Scale tests that read their own colour. */
  lightOf?: (value: number) => Light;
}

export interface Questionnaire {
  id: string;
  title: string;
  step: string;
  items: string[];
  options: [value: number, label: string][];
  area?: string;
  /** Unset = no colour, only the total. */
  light?: (answers: (number | null)[]) => Light | null;
  risk?: { atMost: number; text: string };
  /** Coach only: a total from which something is a priority. */
  alert?: { atLeast: number; text: string };
  /** Shown only when the module's data says so (e.g. an optional battery). */
  when?: string;
}

export interface ModuleStep {
  id: string;
  title: string;
  sub: string;
}

export interface ModuleDef {
  id: ModuleId;
  name: string;
  steps: ModuleStep[];
  tests: ModuleTest[];
  questionnaires: Questionnaire[];
  areas: AreaDef[];
  /** The order priorities are suggested in, from the module's material. */
  priorityOrder: string[];
  reassessWeeks: number;
  /** Rows that come from the module's own data, not from tests or questionnaires. */
  observations?: (a: Assessment) => Row[];
}

export const MODULE_NAMES: [ModuleId, string][] = [
  ["strength_balance", "Força e Equilíbrio"],
  ["motor_development", "Desenvolvimento Motor"],
  ["health_performance", "Saúde e Performance"],
  ["women", "Mulher: ciclo, gravidez/pós-parto, menopausa"],
  ["clinical", "Condição clínica"],
  ["calisthenics", "Calistenia"],
  ["sports_performance", "Performance Desportiva"],
  ["hybrid_hyrox", "Treino Híbrido — Hyrox"],
  ["hybrid_athx", "Treino Híbrido — ATHX"],
];

/** Modules with an onboarding of their own; the others are only a label for now. */
export const MODULES: Partial<Record<ModuleId, ModuleDef>> = { strength_balance: STRENGTH_BALANCE };


/** Why Força e Equilíbrio is suggested: by function, never by age alone. Empty = not suggested. */
export function strengthBalanceReasons(client: Client, s: Screening | undefined, today: string): string[] {
  const age = ageOf(client, today);
  return [
    age != null && age >= 65 ? "65 anos ou mais" : "",
    s?.fallOrFear ? "queda no último ano ou medo de cair" : "",
    s?.risesWithoutHands === false ? "dificuldade em levantar-se sem as mãos" : "",
    s?.longInactivity || s?.surgeries.trim() ? "inatividade, internamento ou cirurgia" : "",
    s?.diseaseLimits ? "doença crónica que limita o dia a dia" : "",
  ].filter(Boolean);
}

/** The modules the app proposes from what it knows; the coach confirms. */
export function suggestedModules(client: Client, s: Screening | undefined, today: string): ModuleId[] {
  const out: ModuleId[] = [];
  const sb = strengthBalanceReasons(client, s, today).length > 0;
  if (sb) out.push("strength_balance");
  if (isMinor(client, today)) out.push("motor_development");
  if (!sb && !isMinor(client, today)) out.push("health_performance");
  if (s?.diseases.some((d) => d !== "other")) out.push("clinical");
  return out;
}

export const activeModules = (client: Client, s: Screening | undefined, today: string) => client.moduleIds ?? suggestedModules(client, s, today);

// ── Evaluating a module assessment ──────────────────────────────────────────

export interface Row {
  key: string;
  area: string;
  name: string;
  value: string;
  light: Light | null;
  /** 0–100, for the radar: the percentile where there is one. */
  score: number | null;
  detail: string;
  risk: string | null;
}

export interface AreaResult extends AreaDef {
  light: Light | null;
  calculated: Light | null;
  score: number | null;
  overridden: boolean;
}

export interface Evaluation {
  rows: Row[];
  areas: AreaResult[];
  risks: string[];
  /** Totals of questionnaires with no colour, and other notes for the coach. */
  notes: string[];
}

const RANK: Record<Light, number> = { red: 3, yellow: 2, green: 1 };
const LIGHT_SCORE: Record<Light, number> = { red: 15, yellow: 40, green: 70 };

export function hits(cut: Cut, value: number, female: boolean): boolean {
  const v = female && cut.female != null ? cut.female : cut.value;
  return cut.when === "below" ? value < v : cut.when === "at_most" ? value <= v : cut.when === "at_least" ? value >= v : value > v;
}

function sideValue(r: TestResult, side: "best" | "worst"): number | null {
  if (!r.sided) return finalValue(r);
  const v = SIDES.map((s) => finalValue(r, s)).filter((x): x is number => x != null);
  if (!v.length) return null;
  const better = r.direction === "lower" ? Math.min(...v) : Math.max(...v);
  const worse = r.direction === "lower" ? Math.max(...v) : Math.min(...v);
  return side === "best" ? better : worse;
}

const fmtValue = (r: TestResult) =>
  r.sided
    ? SIDES.map((s) => `${s === "left" ? "E" : "D"} ${fmtNum(finalValue(r, s)) || "—"}`).join(" · ") + ` ${r.unit}`
    : `${fmtNum(finalValue(r))} ${r.unit}`;

const lightOfPercentile = (p: number): Light => (p < 25 ? "red" : p < 50 ? "yellow" : "green");

export interface EvalContext {
  client: Client;
  tests: TestDef[];
  focuses: Focus[];
}

export function questionnaireTotal(answers: (number | null)[] | undefined): number | null {
  if (!answers?.length || answers.some((a) => a == null)) return null;
  return answers.reduce<number>((sum, a) => sum + (a ?? 0), 0);
}

export function evaluate(mod: ModuleDef, a: Assessment, ctx: EvalContext): Evaluation {
  const female = ctx.client.sex === "female";
  const rows: Row[] = [];
  const risks: string[] = [];
  const notes: string[] = [];

  for (const mt of mod.tests) {
    const r = a.results.find((x) => x.testId === mt.testId);
    if (!r) continue;
    const best = sideValue(r, "best");
    if (best == null) continue;
    let light: Light | null = null;
    let score: number | null = null;
    const detail: string[] = [];
    const cutValue = mt.cut ? sideValue(r, mt.cut.side ?? "best") : null;
    const cutHit = mt.cut != null && cutValue != null && hits(mt.cut, cutValue, female);
    const outcome = benchmark(r, best, clientContext(ctx.client, ctx.focuses, a.date));
    if (outcome.status === "ok") {
      const pos = outcome.benchmarks[0].position;
      score = pos.beyond === "below" ? 12 : pos.beyond === "above" ? 90 : pos.percentile;
      light = lightOfPercentile(score);
      const p = outcome.benchmarks[0].dataset.percentiles ?? [];
      detail.push(`${pos.beyond === "below" ? "abaixo de P25" : pos.beyond === "above" ? "acima de P75" : `P${Math.round(pos.percentile)}`}${r.sided ? " (melhor lado)" : ""}`, p.filter(([q]) => q === 25 || q === 50 || q === 75).map(([q, v]) => `P${q} ${fmtNum(v)}`).join(" · "));
    }
    if (mt.lightOf) light = mt.lightOf(best);
    if (mt.cut) {
      if (cutHit) {
        light = "red";
        detail.push(mt.cut.text);
      } else if (!light) light = "green";
    }
    if (score == null && light) score = LIGHT_SCORE[light];
    const riskValue = mt.risk ? sideValue(r, mt.risk.side ?? "best") : null;
    const risk = mt.risk && riskValue != null && hits(mt.risk, riskValue, female) ? mt.risk.text : null;
    if (risk) risks.push(`${r.name}: ${risk}`);
    rows.push({ key: r.testId, area: mt.area, name: r.name, value: fmtValue(r), light, score, detail: detail.filter(Boolean).join(" · "), risk });
  }

  for (const q of mod.questionnaires) {
    const answers = a.questionnaires?.[q.id];
    if (!answers?.some((x) => x != null)) continue;
    if (q.when && !a.moduleData?.[q.when]) continue;
    const total = questionnaireTotal(answers);
    const light = q.light ? q.light(answers) : null;
    if (q.risk && total != null && total <= q.risk.atMost) risks.push(`${q.title}: ${q.risk.text}`);
    if (!q.area) {
      if (total != null) notes.push(`${q.title}: ${total}${q.alert && total >= q.alert.atLeast ? ` — ${q.alert.text}` : ""}`);
      continue;
    }
    rows.push({ key: q.id, area: q.area, name: q.title, value: total != null ? `${total} pts` : "incompleto", light, score: light ? (light === "green" ? 80 : LIGHT_SCORE[light]) : null, detail: "", risk: null });
  }
  rows.push(...(mod.observations?.(a) ?? []));

  const overrides = a.report?.areaOverrides ?? {};
  const areas = mod.areas.map((area): AreaResult => {
    const mine = rows.filter((r) => r.area === area.id);
    const lights = mine.map((r) => r.light).filter((l): l is Light => l != null);
    const calculated = lights.length ? lights.sort((x, y) => RANK[y] - RANK[x])[0] : null;
    const scores = mine.map((r) => r.score).filter((s): s is number => s != null);
    const light = overrides[area.id] ?? calculated;
    return { ...area, calculated, light, overridden: !!overrides[area.id], score: scores.length ? Math.min(...scores) : light ? LIGHT_SCORE[light] : null };
  });
  return { rows, areas, risks, notes };
}

/** Red areas first, then yellow, in the module's order; at most three. */
export function suggestedPriorities(mod: ModuleDef, areas: AreaResult[]): AreaResult[] {
  const by = (l: Light) => mod.priorityOrder.map((id) => areas.find((a) => a.id === id)).filter((a): a is AreaResult => !!a && a.light === l);
  return [...by("red"), ...by("yellow")].slice(0, 3);
}

export const reassessWeeks = (moduleId: ModuleId | null | undefined) => (moduleId && MODULES[moduleId]?.reassessWeeks) || REASSESS_WEEKS;
