import type { Barrier, Client, ConsentKey, Decision, Disease, MedFlag, Referral, ReferralCriterion, Screening, Stage } from "@treino/core/types";

// The general intake (Ficha 1): health screening, history, lifestyle, goals
// and behaviour. The coach decides; the app deduces what it can and warns.

/** How long a general intake holds before it should be done again. */
export const VALID_MONTHS = 12;

/** The 8 quick questions; the last one is only asked to women. */
export const QUICK = [
  "Algum médico disse que tem um problema cardíaco ou tensão arterial alta?",
  "Sente dor no peito em repouso, no dia a dia ou a fazer exercício?",
  "Perdeu o equilíbrio por tonturas ou perdeu a consciência nos últimos 12 meses?",
  "Tem outra doença crónica diagnosticada (além de coração e tensão)?",
  "Toma medicação para alguma doença crónica?",
  "Tem problema de ossos, articulações ou músculos que possa piorar com exercício?",
  "Algum médico disse que só deve fazer exercício com supervisão médica?",
  "Está grávida ou teve um bebé nos últimos 12 meses?",
];
export const WOMEN_ONLY_QUICK = 7;

export const REFERRAL_CRITERIA: [ReferralCriterion, string][] = [
  ["chronic_pain", "Dor crónica (> 3 meses) ou que piora com o movimento → fisioterapeuta ou médico"],
  ["cardiac_signs", "Dor no peito, tonturas, desmaios ou falta de ar desproporcionada → médico, avaliação suspensa"],
  ["pregnancy_surgery_injury", "Gravidez de risco, cirurgia recente ou lesão aguda → autorização do profissional de saúde"],
  ["nutrition", "Plano alimentar ou dúvida nutricional específica → nutricionista"],
  ["mental_health", "Sinais de perturbação alimentar ou de saúde mental → encaminhar com cuidado, sem diagnosticar"],
];

export const DECISIONS: [Decision, string][] = [
  ["fit", "Apto para avaliação completa"],
  ["fit_restricted", "Apto com restrições"],
  ["awaiting", "Aguarda autorização"],
  ["referred", "Encaminhado"],
];

export const DISEASES: [Disease, string][] = [
  ["hypertension", "Hipertensão"],
  ["heart", "Doença cardíaca"],
  ["diabetes", "Diabetes"],
  ["cholesterol", "Colesterol elevado"],
  ["respiratory", "Asma / doença respiratória"],
  ["osteoporosis", "Osteoporose / osteopenia"],
  ["arthrosis", "Artrose / artrite"],
  ["thyroid", "Doença da tiroide"],
  ["epilepsy", "Epilepsia"],
  ["anxiety_depression", "Ansiedade / depressão"],
  ["other", "Outra"],
];

export const MED_FLAGS: [MedFlag, string][] = [
  ["betablocker", "Betabloqueante"],
  ["hypoglycemic", "Hipoglicemiante / insulina"],
  ["antihypertensive", "Anti-hipertensor / diurético"],
  ["anticoagulant", "Anticoagulante"],
];

export const STAGES: [Stage, string][] = [
  ["precontemplation", "Pré-contemplação — não treina e não pensa começar nos próximos 6 meses"],
  ["contemplation", "Contemplação — não treina, pensa começar nos próximos 6 meses"],
  ["preparation", "Preparação — treina pouco ou quer começar nos próximos 30 dias"],
  ["action", "Ação — treina regularmente há menos de 6 meses"],
  ["maintenance", "Manutenção — treina regularmente há mais de 6 meses"],
];

export const BARRIERS: [Barrier, string][] = [
  ["time", "Tempo"],
  ["money", "Dinheiro"],
  ["pain", "Dor"],
  ["shame", "Vergonha"],
  ["tiredness", "Cansaço"],
  ["support", "Falta de apoio"],
  ["other", "Outra"],
];

export const EXPERIENCE: [NonNullable<Screening["strengthExperience"]>, string][] = [
  ["none", "Nenhuma"],
  ["basic", "Básica"],
  ["intermediate", "Intermédia"],
  ["advanced", "Avançada"],
];

export const REFERRALS: [Referral, string][] = [
  ["social", "Redes sociais"],
  ["referral", "Indicação"],
  ["gym", "Ginásio"],
  ["other", "Outro"],
];

export const CONSENTS: [ConsentKey, string][] = [
  ["data_health", "Autorizo o tratamento dos meus dados pessoais e de saúde para avaliação, prescrição e acompanhamento do treino."],
  ["media_internal", "Autorizo fotografias e vídeos para análise técnica (uso interno)."],
  ["social_face", "Autorizo o uso de imagens nas redes sociais e materiais de divulgação — com rosto visível."],
  ["social_no_face", "Autorizo o uso de imagens nas redes sociais e materiais de divulgação — só sem rosto visível."],
  ["share_professionals", "Autorizo a partilha de informação com os profissionais indicados."],
];

export const SUMMARY_CHECKLIST = [
  "PAR-Q+ oficial anexado",
  "Consentimentos assinados",
  "Ficha do módulo seguinte preparada",
  "Relatório entregue ao cliente",
];

export const INJURY_REGIONS = ["Pescoço", "Ombro", "Cotovelo", "Punho e mão", "Coluna dorsal", "Lombar", "Anca", "Virilha", "Coxa", "Joelho", "Perna", "Tornozelo e pé", "Outra"];

export const INJURY_STATUS: [Screening["injuries"][number]["status"], string][] = [
  ["active", "Ativa"],
  ["recovering", "Em recuperação"],
  ["recovered", "Recuperada"],
];

export const labelOf = <K,>(pairs: readonly (readonly [K, string])[], key: K | null | undefined) => pairs.find((p) => p[0] === key)?.[1];

/** Age on a date: exact with a birth date, from the year otherwise. */
export function ageOf(client: Pick<Client, "birthYear" | "birthDate">, today: string): number | null {
  if (client.birthDate) {
    const [y, m, d] = client.birthDate.split("-").map(Number);
    const [ty, tm, td] = today.split("-").map(Number);
    return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
  }
  return client.birthYear ? Number(today.slice(0, 4)) - client.birthYear : null;
}

export function isMinor(client: Pick<Client, "birthYear" | "birthDate">, today: string): boolean {
  const age = ageOf(client, today);
  return age != null && age < 18;
}

/** Resting blood pressure that suspends the assessment. */
export const bpStops = (sys: number | null | undefined, dia: number | null | undefined) => (sys ?? 0) >= 160 || (dia ?? 0) >= 100;

/** What the answers point to; the decision is the coach's. */
export function suggestedDecision(s: Pick<Screening, "quick" | "referralCriteria">, restingBpStops: boolean): Decision {
  if (restingBpStops || s.referralCriteria.includes("cardiac_signs")) return "referred";
  if (s.quick.some((q) => q === true) || s.referralCriteria.length) return "fit_restricted";
  return "fit";
}

/** Tests only happen after a decision that lets them. */
export const canTest = (s: Pick<Screening, "decision"> | undefined) => s?.decision === "fit" || s?.decision === "fit_restricted";

/** Months from one YYYY-MM-DD to another, counting only whole months. */
export function monthsBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
}

export type ScreeningState = "none" | "open" | "awaiting" | "referred" | "expired" | "ok";

/** The latest general intake is what counts. */
export function screeningState(latest: Screening | undefined, today: string): ScreeningState {
  if (!latest) return "none";
  if (!latest.decision) return "open";
  if (latest.decision === "awaiting") return "awaiting";
  if (latest.decision === "referred") return "referred";
  if (monthsBetween(latest.date, today) >= VALID_MONTHS) return "expired";
  return "ok";
}

export const STATE_TEXT: Record<ScreeningState, string> = {
  none: "Sem ficha geral",
  open: "Ficha geral sem decisão",
  awaiting: "Aguarda autorização",
  referred: "Encaminhado",
  expired: `Ficha geral com mais de ${VALID_MONTHS} meses`,
  ok: "Apto",
};

/** Health alerts and restrictions for the coach (tab 10). Never shown to the client. */
export function healthAlerts(s: Screening, restingBp: { sys: number | null; dia: number | null } | null): string[] {
  const flags = new Set(s.medicationFlags);
  return [
    restingBp && bpStops(restingBp.sys, restingBp.dia) ? "Tensão em repouso ≥ 160/100: avaliação suspensa, encaminhar ao médico." : "",
    s.quick.some((q) => q === true) ? "Triagem com respostas Sim: ver os detalhes e o PAR-Q+." : "",
    flags.has("betablocker") ? "Betabloqueante: usar a perceção de esforço (0–10) em vez da FC." : "",
    flags.has("hypoglycemic") ? "Hipoglicemiante: medir a glicemia antes dos testes e ter açúcar à mão." : "",
    flags.has("antihypertensive") ? "Anti-hipertensor ou diurético: atenção a tonturas ao levantar e no retorno à calma." : "",
    flags.has("anticoagulant") ? "Anticoagulante: evitar impacto e risco de queda." : "",
    (s.medicationCount ?? 0) >= 5 ? "5 ou mais medicamentos diários: atenção a tonturas e quedas de tensão." : "",
    s.confidence != null && s.confidence < 7 ? `Confiança ${s.confidence}/10: baixar a meta até chegar a 7.` : "",
    s.familyHistory ? "Morte súbita ou doença cardíaca precoce na família." : "",
    s.painIntensity ? `Dor atual ${s.painIntensity}/10${s.painZone ? ` (${s.painZone})` : ""}.` : "",
    s.restrictions.trim() ? `Restrições: ${s.restrictions.trim()}` : "",
  ].filter(Boolean);
}

/** A new intake from the last one: same answers, today's date, no decision (it was for that day). */
export function nextScreening(last: Screening, id: string, today: string): Screening {
  const { deleted: _deleted, dirty: _dirty, ...answers } = last;
  return { ...answers, id, updatedAt: 0, date: today, decision: null, restrictions: "", clearanceRequested: "", referredTo: "", checklist: [] };
}

/** The injuries still there in the latest intake (active or recovering). */
export function activeInjuries(latest: Pick<Screening, "injuries"> | undefined): Screening["injuries"] {
  return (latest?.injuries ?? []).filter((i) => i.status !== "recovered" && (i.region || i.aggravates));
}

const SIDE_WORD = { left: "esq.", right: "dir.", both: "ambos" } as const;

/** "Joelho esq., Lombar" — short, for warnings and lists. */
export function injuryText(latest: Pick<Screening, "injuries"> | undefined): string {
  return activeInjuries(latest)
    .map((i) => (i.region === "Outra" || !i.region ? i.aggravates : `${i.region}${i.side ? ` ${SIDE_WORD[i.side]}` : ""}`))
    .filter(Boolean)
    .join(", ");
}
