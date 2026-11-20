import type { Client, Disease, Intensity, MedFlag, Screening, Symptom } from "@treino/core/types";

// Preparticipation health screening: Riebe et al. (2015), Med Sci Sports Exerc
// 47(11):2473–2479, kept in later editions of ACSM's Guidelines. The app
// recommends; the coach decides and records the medical clearance.

/** Changing the rule below means a new method: older screenings keep theirs. */
export const METHOD = "acsm-2015";

/** How long a screening holds before it should be done again. */
export const VALID_MONTHS = 12;

export const DISEASES: [Disease, string][] = [
  ["cardiovascular", "Cardiovascular (cardíaca, vascular periférica, AVC)"],
  ["metabolic", "Metabólica (diabetes tipo 1 ou 2)"],
  ["renal", "Renal"],
];

export const SYMPTOMS: [Symptom, string][] = [
  ["chest", "Dor ou desconforto no peito, pescoço, maxilar ou braços"],
  ["breath", "Falta de ar em repouso ou com esforço ligeiro"],
  ["dizziness", "Tonturas ou desmaios"],
  ["orthopnea", "Falta de ar deitado ou a meio da noite"],
  ["edema", "Inchaço dos tornozelos"],
  ["palpitations", "Palpitações ou coração acelerado"],
  ["claudication", "Dor nas pernas a andar, que passa em repouso"],
  ["murmur", "Sopro cardíaco conhecido"],
  ["fatigue", "Cansaço ou falta de ar invulgares no dia a dia"],
];

export const INTENSITIES: [Intensity, string, string][] = [
  ["light", "Ligeira", "30–39% FC de reserva · PSE 9–11"],
  ["moderate", "Moderada", "40–59% FC de reserva · PSE 12–13"],
  ["vigorous", "Vigorosa", "≥ 60% FC de reserva · PSE ≥ 14"],
];

export const CONDITIONS = [
  "Hipertensão",
  "Colesterol alto",
  "Asma",
  "DPOC",
  "Osteoporose",
  "Artrose",
  "Lombalgia crónica",
  "Hérnia discal",
  "Epilepsia",
  "Cancro",
  "Doença autoimune",
  "Ansiedade ou depressão",
];

export const MED_FLAGS: [MedFlag, string][] = [
  ["betablocker", "Betabloqueante"],
  ["insulin", "Insulina ou hipoglicemiante"],
  ["anticoagulant", "Anticoagulante"],
];

export const INJURY_REGIONS = ["Pescoço", "Ombro", "Cotovelo", "Punho e mão", "Coluna dorsal", "Lombar", "Anca", "Virilha", "Coxa", "Joelho", "Perna", "Tornozelo e pé", "Outra"];

export const INJURY_STATUS: [Screening["injuries"][number]["status"], string][] = [
  ["active", "Ativa"],
  ["recovering", "Em recuperação"],
  ["recovered", "Recuperada"],
];

export const OCCUPATIONS: [NonNullable<Screening["occupation"]>, string][] = [
  ["seated", "Sentado"],
  ["standing", "De pé"],
  ["physical", "Física"],
];

/**
 * The ACSM outcome:
 * - start: not exercising, no disease, no symptoms → no clearance, light to moderate
 * - clearance: not exercising, with disease or symptoms → clearance before starting
 * - continue: exercising, no disease, no symptoms → no clearance, moderate or vigorous
 * - vigorous: exercising, disease, no symptoms → moderate without clearance, vigorous with it
 * - stop: exercising, with symptoms → stop until cleared
 */
export type Outcome = "start" | "clearance" | "continue" | "vigorous" | "stop";

/** null until the three questions are answered (regular exercise is the only one that can be blank). */
export function outcome(s: Pick<Screening, "regularExercise" | "diseases" | "symptoms">): Outcome | null {
  if (s.regularExercise == null) return null;
  const symptoms = s.symptoms.length > 0;
  const disease = s.diseases.length > 0;
  if (!s.regularExercise) return symptoms || disease ? "clearance" : "start";
  if (symptoms) return "stop";
  return disease ? "vigorous" : "continue";
}

export const OUTCOME_TEXT: Record<Outcome, string> = {
  start: "Sem autorização médica. Começar com intensidade ligeira a moderada e progredir.",
  clearance: "Autorização médica recomendada antes de começar. Depois, ligeira a moderada e progredir.",
  continue: "Sem autorização médica. Pode continuar com intensidade moderada ou vigorosa e progredir.",
  vigorous: "Moderada sem autorização médica. Para intensidade vigorosa, autorização médica recomendada.",
  stop: "Parar o exercício e pedir autorização médica antes de voltar.",
};

/** Why: the answers that led to the outcome. */
export function reasons(s: Pick<Screening, "regularExercise" | "diseases" | "symptoms">): string[] {
  return [
    s.regularExercise == null ? "" : s.regularExercise ? "Pratica exercício regular" : "Não pratica exercício regular",
    ...DISEASES.filter(([k]) => s.diseases.includes(k)).map(([, l]) => `Doença: ${l.split(" (")[0].toLowerCase()}`),
    ...SYMPTOMS.filter(([k]) => s.symptoms.includes(k)).map(([, l]) => `Sintoma: ${l.toLowerCase()}`),
  ].filter(Boolean);
}

/** Whether medical clearance is recommended for what the client wants to do. Unknown intensity counts as vigorous. */
export function clearanceNeeded(s: Pick<Screening, "regularExercise" | "diseases" | "symptoms" | "wantedIntensity">): boolean {
  const o = outcome(s);
  if (o === "clearance" || o === "stop") return true;
  return o === "vigorous" && s.wantedIntensity !== "light" && s.wantedIntensity !== "moderate";
}

export const clearancePending = (s: Screening) => clearanceNeeded(s) && !s.clearance;

export function ageOf(client: Pick<Client, "birthYear">, today: string): number | null {
  return client.birthYear ? Number(today.slice(0, 4)) - client.birthYear : null;
}

export function isMinor(client: Pick<Client, "birthYear">, today: string): boolean {
  const age = ageOf(client, today);
  return age != null && age < 18;
}

/** Months from one YYYY-MM-DD to another, counting only whole months. */
export function monthsBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
}

export type ScreeningState = "none" | "incomplete" | "pending" | "expired" | "ok";

/** The latest screening is what counts. */
export function screeningState(latest: Screening | undefined, today: string): ScreeningState {
  if (!latest) return "none";
  if (outcome(latest) == null) return "incomplete";
  if (clearancePending(latest)) return "pending";
  if (monthsBetween(latest.date, today) >= VALID_MONTHS) return "expired";
  return "ok";
}

export const STATE_TEXT: Record<ScreeningState, string> = {
  none: "Sem triagem",
  incomplete: "Triagem por completar",
  pending: "Autorização médica pendente",
  expired: `Triagem com mais de ${VALID_MONTHS} meses`,
  ok: "Triagem em dia",
};

/** Things to keep in mind when training: from medication, injuries, pregnancy. */
export function cautions(s: Screening): string[] {
  const flags = new Set(s.medications.flatMap((m) => m.flags));
  return [
    flags.has("betablocker") ? "Betabloqueante: a FC não reflete o esforço. Usar a PSE em vez das zonas de FC." : "",
    flags.has("insulin") ? "Insulina ou hipoglicemiante: atenção a hipoglicemias. Ter hidratos à mão." : "",
    flags.has("anticoagulant") ? "Anticoagulante: evitar risco de impacto e queda." : "",
    s.pregnancy ? `Grávida${s.pregnancy.weeks ? ` (${s.pregnancy.weeks} semanas)` : ""}${s.pregnancy.obstetricianOk ? "" : ": falta o acordo do obstetra"}.` : "",
    s.postpartum?.pelvicSymptoms ? "Sintomas do pavimento pélvico no pós-parto: encaminhar para fisioterapia especializada." : "",
    ...s.injuries.filter((i) => i.status !== "recovered").map((i) => `Lesão ${i.status === "active" ? "ativa" : "em recuperação"}: ${[i.region, i.side === "left" ? "esquerdo" : i.side === "right" ? "direito" : i.side === "both" ? "ambos os lados" : ""].filter(Boolean).join(" ")}${i.pain != null ? `, dor ${i.pain}/10` : ""}.`),
  ].filter(Boolean);
}

/** A new screening from the last one: same answers, today's date, no clearance (it was for that screening). */
export function nextScreening(last: Screening, id: string, today: string): Screening {
  const { deleted: _deleted, dirty: _dirty, ...answers } = last;
  return { ...answers, id, updatedAt: 0, date: today, method: METHOD, clearance: null };
}
