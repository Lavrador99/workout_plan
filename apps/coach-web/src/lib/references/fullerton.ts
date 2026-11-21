import type { ReferenceDataset, ReferenceSource } from "../benchmark";

// P25, P50 and P75 of the functional fitness battery (Rikli & Jones) by sex and
// 5-year band, as written in the coach's course materials (MAFPE, "Bateria de
// Fullerton"). On times, P25 is the slowest of the three. The coach chose to use
// them; the number of people and the terms of use are still to be confirmed.

export const FULLERTON: ReferenceSource = {
  id: "fullerton-mafpe",
  citation: "Rikli & Jones, Senior Fitness Test — tabelas de percentis dos materiais MAFPE (Bateria de Fullerton)",
  doi: "",
  url: "",
  license: "Uso do treinador; a confirmar",
};

const LIMITS =
  "Adultos de 60 a 94 anos a viver na comunidade. Só P25, P50 e P75: fora deles a posição é só abaixo de P25 ou acima de P75. Protocolo original: cadeira de 43 cm, percurso retangular de 45,7 m na marcha de 6 minutos. O número de pessoas está por confirmar na fonte.";

const BANDS = [60, 65, 70, 75, 80, 85, 90];

type Table = Record<"female" | "male", [p25: number, p50: number, p75: number][]>;

/** Keyed by test id; each row is one age band, oldest last. */
const TABLES: Record<string, { table: Table; sides?: "best" }> = {
  "seed-test-sts-30": {
    table: {
      female: [[12, 15, 17], [11, 14, 16], [10, 13, 15], [10, 12, 15], [9, 11, 14], [8, 10, 13], [4, 8, 11]],
      male: [[14, 16, 19], [12, 15, 18], [12, 15, 17], [11, 14, 17], [10, 12, 15], [8, 11, 14], [7, 10, 12]],
    },
  },
  "seed-test-arm-curl": {
    table: {
      female: [[13, 16, 19], [12, 15, 18], [12, 15, 17], [11, 14, 17], [10, 13, 16], [10, 12, 15], [8, 11, 13]],
      male: [[16, 19, 22], [15, 18, 21], [14, 17, 21], [13, 16, 19], [13, 16, 19], [11, 14, 17], [10, 12, 14]],
    },
  },
  "seed-test-chair-sit-reach": {
    sides: "best",
    table: {
      female: [[-1.3, 5.1, 12.7], [-1.3, 5.1, 11.4], [-2.5, 3.8, 10.2], [-3.8, 2.5, 8.9], [-5.1, 1.3, 7.6], [-6.4, -1.3, 6.4], [-11.4, -5.1, 2.5]],
      male: [[-6.4, 1.3, 10.2], [-7.6, 0, 7.6], [-8.9, -1.3, 6.4], [-10.2, -2.5, 5.1], [-14.0, -5.1, 3.8], [-14.0, -6.4, 1.3], [-16.5, -8.9, 1.3]],
    },
  },
  "seed-test-8ft-up-go": {
    table: {
      female: [[6.0, 5.2, 4.4], [6.4, 5.6, 4.8], [7.1, 6.0, 4.9], [7.4, 6.3, 5.2], [8.7, 7.2, 5.7], [9.6, 7.9, 6.2], [11.5, 9.4, 7.3]],
      male: [[5.6, 4.7, 3.8], [5.7, 5.1, 4.3], [6.0, 5.3, 4.2], [7.2, 5.9, 4.6], [7.6, 6.4, 5.2], [8.9, 7.2, 5.3], [10.0, 8.1, 6.2]],
    },
  },
  "seed-test-back-scratch": {
    sides: "best",
    table: {
      female: [[-7.6, -1.3, 3.8], [-8.9, -2.5, 3.8], [-10.2, -3.8, 2.5], [-12.7, -5.1, 1.3], [-14.0, -6.4, 0], [-17.8, -10.2, -2.5], [-20.3, -11.4, -2.5]],
      male: [[-16.5, -8.9, 0], [-19.1, -10.2, -2.5], [-20.3, -11.4, -2.5], [-22.9, -14.0, -5.1], [-24.1, -14.0, -5.1], [-25.4, -15.2, -7.6], [-26.7, -17.8, -10.2]],
    },
  },
  "seed-test-6mwt-rect": {
    table: {
      female: [[498, 553, 604], [457, 521, 581], [439, 503, 562], [393, 466, 535], [352, 421, 494], [311, 389, 466], [251, 320, 402]],
      male: [[558, 617, 672], [512, 576, 640], [498, 558, 622], [430, 507, 585], [407, 480, 553], [347, 434, 521], [279, 370, 457]],
    },
  },
  "seed-test-step-2min": {
    table: {
      female: [[75, 91, 107], [73, 90, 107], [68, 84, 101], [68, 84, 100], [60, 75, 91], [55, 70, 85], [44, 58, 72]],
      male: [[87, 101, 115], [86, 101, 116], [80, 95, 110], [73, 91, 109], [71, 87, 103], [59, 75, 91], [52, 69, 86]],
    },
  },
};

const WHO = { female: "mulheres", male: "homens" };

export const FULLERTON_DATASETS: ReferenceDataset[] = Object.entries(TABLES).flatMap(([testId, { table, sides }]) =>
  (["female", "male"] as const).flatMap((sex) =>
    table[sex].map(([p25, p50, p75], i): ReferenceDataset => ({
      id: `fullerton-${testId}-${sex}-${BANDS[i]}`,
      sourceId: FULLERTON.id,
      testId,
      version: 1,
      group: "general",
      sex,
      levels: [],
      label: `Adultos na comunidade, ${WHO[sex]} ${BANDS[i]}–${BANDS[i] + 4} anos`,
      studies: 1,
      subjects: 0,
      minAge: BANDS[i],
      maxAge: BANDS[i] + 4,
      percentiles: [
        [25, p25],
        [50, p50],
        [75, p75],
      ],
      ...(sides ? { sides } : {}),
      limitations: LIMITS,
    })),
  ),
);
