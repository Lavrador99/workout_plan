import type { ReferenceDataset, ReferenceSource } from "../benchmark";

// Table 2 of the paper (absolute handgrip strength in kg), copied from the
// publisher's text. Percentiles are as published, not derived from a mean and SD.

export const TOMKINSON_2025: ReferenceSource = {
  id: "tomkinson-2025",
  citation: "Tomkinson et al. (2025), Journal of Sport and Health Science 14:101014",
  doi: "10.1016/j.jshs.2024.101014",
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11863340/",
  license: "CC BY 4.0",
};

const LIMITS =
  "Adultos da população geral, sem grupos de atletas. Valores ajustados ao protocolo de Southampton: sentado, cotovelo fletido, antebraço neutro, 3 tentativas por mão e o melhor valor das duas mãos, com dinamómetro hidráulico. Medir de outra forma afasta o resultado da referência. O número de pessoas é o total do estudo, não o desta faixa etária.";

const PERCENTILES = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95];

type Row = [minAge: number, maxAge: number | null, ...values: number[]];

const TABLE: Record<"female" | "male", Row[]> = {
  male: [
    [20, 24, 33.9, 36.8, 40.5, 43.2, 45.7, 48.0, 50.4, 52.9, 56.0, 60.1, 63.6],
    [25, 29, 35.5, 38.5, 42.1, 44.8, 47.1, 49.3, 51.5, 53.9, 56.7, 60.7, 64.0],
    [30, 34, 35.0, 38.3, 42.2, 45.0, 47.4, 49.7, 52.0, 54.4, 57.4, 61.5, 64.9],
    [35, 39, 33.8, 37.3, 41.5, 44.5, 47.1, 49.5, 51.9, 54.4, 57.5, 61.8, 65.3],
    [40, 44, 32.3, 36.0, 40.4, 43.6, 46.3, 48.8, 51.2, 53.9, 57.1, 61.5, 65.1],
    [45, 49, 30.6, 34.4, 39.0, 42.3, 45.1, 47.6, 50.2, 52.9, 56.2, 60.7, 64.4],
    [50, 54, 28.9, 32.8, 37.4, 40.7, 43.5, 46.2, 48.8, 51.6, 54.8, 59.4, 63.1],
    [55, 59, 27.2, 31.0, 35.6, 38.9, 41.7, 44.4, 47.0, 49.8, 53.1, 57.7, 61.4],
    [60, 64, 25.5, 29.1, 33.6, 36.9, 39.7, 42.4, 45.0, 47.8, 51.1, 55.6, 59.3],
    [65, 69, 23.7, 27.2, 31.5, 34.7, 37.5, 40.1, 42.8, 45.6, 48.8, 53.2, 56.8],
    [70, 74, 21.9, 25.2, 29.3, 32.4, 35.1, 37.7, 40.3, 43.1, 46.3, 50.6, 54.1],
    [75, 79, 20.0, 23.1, 27.0, 29.9, 32.5, 35.1, 37.6, 40.3, 43.5, 47.7, 51.1],
    [80, 84, 18.0, 20.8, 24.5, 27.3, 29.8, 32.3, 34.8, 37.5, 40.5, 44.7, 48.0],
    [85, 89, 15.9, 18.5, 21.9, 24.6, 27.0, 29.4, 31.8, 34.4, 37.4, 41.5, 44.6],
    [90, 94, 13.7, 16.1, 19.2, 21.7, 24.0, 26.3, 28.7, 31.2, 34.2, 38.1, 41.2],
    [95, 99, 11.3, 13.5, 16.4, 18.8, 20.9, 23.1, 25.4, 27.9, 30.8, 34.6, 37.5],
    [100, null, 8.8, 10.8, 13.5, 15.7, 17.8, 19.8, 22.0, 24.5, 27.2, 30.9, 33.8],
  ],
  female: [
    [20, 24, 19.7, 21.7, 24.0, 25.7, 27.2, 28.6, 30.0, 31.6, 33.6, 36.6, 39.1],
    [25, 29, 20.0, 22.0, 24.5, 26.3, 27.9, 29.4, 30.9, 32.6, 34.6, 37.4, 39.7],
    [30, 34, 19.6, 21.8, 24.4, 26.4, 28.1, 29.7, 31.3, 33.1, 35.2, 38.0, 40.4],
    [35, 39, 19.0, 21.3, 24.1, 26.2, 28.0, 29.7, 31.4, 33.2, 35.4, 38.4, 40.8],
    [40, 44, 18.3, 20.7, 23.7, 25.8, 27.6, 29.4, 31.1, 33.0, 35.2, 38.3, 40.8],
    [45, 49, 17.6, 20.1, 23.1, 25.2, 27.1, 28.9, 30.6, 32.5, 34.8, 37.9, 40.4],
    [50, 54, 16.9, 19.4, 22.4, 24.5, 26.4, 28.2, 29.9, 31.8, 34.0, 37.1, 39.7],
    [55, 59, 16.1, 18.5, 21.5, 23.7, 25.5, 27.3, 29.0, 30.9, 33.0, 36.1, 38.6],
    [60, 64, 15.2, 17.6, 20.6, 22.7, 24.5, 26.2, 27.9, 29.7, 31.8, 34.9, 37.4],
    [65, 69, 14.3, 16.6, 19.5, 21.6, 23.3, 25.0, 26.6, 28.4, 30.5, 33.4, 35.8],
    [70, 74, 13.2, 15.5, 18.3, 20.3, 22.0, 23.6, 25.2, 26.9, 28.9, 31.8, 34.1],
    [75, 79, 12.0, 14.3, 17.0, 18.9, 20.5, 22.1, 23.6, 25.2, 27.2, 29.9, 32.2],
    [80, 84, 10.7, 12.9, 15.5, 17.4, 18.9, 20.4, 21.9, 23.5, 25.3, 28.0, 30.2],
    [85, 89, 9.3, 11.4, 13.9, 15.7, 17.2, 18.6, 20.0, 21.5, 23.3, 25.9, 28.0],
    [90, 94, 7.8, 9.8, 12.2, 13.9, 15.3, 16.7, 18.0, 19.5, 21.2, 23.6, 25.7],
    [95, 99, 6.1, 8.0, 10.3, 11.9, 13.3, 14.6, 15.9, 17.3, 18.9, 21.2, 23.2],
    [100, null, 4.2, 6.1, 8.3, 9.8, 11.2, 12.4, 13.6, 14.9, 16.5, 18.7, 20.6],
  ],
};

const WHO = { female: "mulheres", male: "homens" };

export const TOMKINSON_2025_DATASETS: ReferenceDataset[] = (["male", "female"] as const).flatMap((sex) =>
  TABLE[sex].map(([minAge, maxAge, ...values]) => ({
    id: `tomkinson-2025-${sex}-${minAge}`,
    sourceId: TOMKINSON_2025.id,
    testId: "seed-test-handgrip",
    version: 1,
    group: "general" as const,
    sex,
    levels: [],
    label: `População geral, ${WHO[sex]} ${maxAge ? `${minAge}–${maxAge}` : `${minAge}+`} anos`,
    studies: 100,
    subjects: 2405863,
    minAge,
    maxAge: maxAge ?? undefined,
    percentiles: PERCENTILES.map((p, i): [number, number] => [p, values[i]]),
    sides: "best" as const,
    limitations: LIMITS,
  })),
);
