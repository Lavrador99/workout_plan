import type { TestDef } from "../types";

// Standard error of measurement per test, in its unit. Only values checked against
// the source, each with the population it comes from: an error only really holds
// for a similar protocol and people. Tests without a compatible source stay out on
// purpose, as a wrong error is worse than none. The coach can replace any of them.

type MeasurementError = Required<Pick<TestDef, "sem" | "semSource">>;

const YBT = "Plisky et al. 2009, entre sessões com o mesmo avaliador, melhor alcance, 15 futebolistas universitários. Valor citado na ficha do Shirley Ryan AbilityLab.";

export const MEASUREMENT_ERRORS: Record<string, MeasurementError> = {
  "seed-test-knee-to-wall": {
    sem: 0.7,
    semSource: "Powden et al. 2015 (revisão sistemática, 12 estudos), doi:10.1016/j.math.2015.01.004. Publica MDC de 1,9 cm com o mesmo avaliador; o SEM é derivado dessa MDC.",
  },
  "seed-test-y-anterior": { sem: 2.01, semSource: YBT },
  "seed-test-y-posteromedial": { sem: 2.83, semSource: YBT },
  "seed-test-y-posterolateral": { sem: 3.11, semSource: YBT },
  "seed-test-handgrip": {
    sem: 1.8,
    semSource: "Horn et al. 2024 (resumo), Jamar, 30 adultos saudáveis, sessões a 1–3 dias, média de 3 tentativas: 1,69 kg na mão dominante, 1,79 kg na outra. Arredondado para cima.",
  },
  "seed-test-cmj": {
    sem: 1.5,
    semSource: "Springham et al. 2024, 36 futebolistas de academia da Premier League (sub-18 e sub-23), melhor de 3, altura por tempo de voo. Por impulso, em plataforma, foi 2,06 cm.",
  },
  "seed-test-sprint-10": {
    sem: 0.016,
    semSource: "Estudo em Sensors 2025, 25(7):2077, 30 atletas de equipa muito treinados, células fotoelétricas, partida a 2 apoios. Publica erro típico de 0,012 s e MDC de 0,044 s, que não batem certo; usa o SEM que dá essa MDC. Não vale para cronómetro manual.",
  },
  "seed-test-yoyo-ir1": {
    sem: 149,
    semSource: "Deprez et al. 2014, Biol Sport, doi:10.5604/20831862.1127284, 22 futebolistas sub-15: erro típico de 137 a 149 m. É o maior grupo do estudo; sub-17 teve 77 a 126 m com 10 jogadores. Sem valor em metros para adultos.",
  },
};

/** The test with its published error, if it has none yet and is still on the seeded protocol. */
export function withMeasurementError(cur: TestDef, seeded: TestDef): TestDef | null {
  return seeded.sem != null && cur.sem == null && !cur.deleted && cur.version === seeded.version ? { ...cur, sem: seeded.sem, semSource: seeded.semSource } : null;
}
