import type { ReferenceDataset, ReferenceLevel, ReferenceSource } from "../benchmark";

// Read from Figure 2 of the paper (global mean and SD per group), twice, from the
// publisher's PDF. The paper gives means and SDs; its quantiles assume normality.

export const SCHMITZ_2018: ReferenceSource = {
  id: "schmitz-2018",
  citation: "Schmitz et al. (2018), Frontiers in Physiology 9:870",
  doi: "10.3389/fphys.2018.00870",
  url: "https://www.frontiersin.org/articles/10.3389/fphys.2018.00870/full",
  license: "CC BY 4.0",
};

const LIMITS = "Valores agregados de estudos com pessoas a partir dos 16 anos (idade mediana perto dos 21). Grande variação entre estudos.";

type Row = [label: string, sex: "female" | "male", levels: ReferenceLevel[], studies: number, subjects: number, mean: number, sd: number];

const SPORTS: [sport: string, rows: Row[]][] = [
  [
    "Futebol",
    [
      ["Futebol masculino, top elite", "male", ["top-elite"], 21, 288, 2302, 509],
      ["Futebol masculino, elite", "male", ["elite"], 22, 429, 2126, 456],
      ["Futebol masculino, sub-elite", "male", ["sub-elite"], 37, 802, 1891, 466],
      ["Futebol masculino, amador", "male", ["amateur"], 15, 340, 1743, 529],
      ["Futebol feminino, sub-elite e elite", "female", ["sub-elite", "elite"], 15, 212, 1197, 502],
      ["Futebol feminino, amador", "female", ["amateur"], 3, 19, 920, 322],
    ],
  ],
  [
    "Basquetebol",
    [
      ["Basquetebol masculino, elite", "male", ["elite"], 7, 109, 1891, 694],
      ["Basquetebol masculino, sub-elite", "male", ["sub-elite"], 5, 68, 1408, 514],
      ["Basquetebol masculino, amador", "male", ["amateur"], 1, 14, 996, 464],
      ["Basquetebol feminino, sub-elite e elite", "female", ["sub-elite", "elite"], 3, 44, 738, 255],
    ],
  ],
  [
    "Andebol",
    [
      ["Andebol masculino, elite", "male", ["elite"], 4, 89, 1845, 406],
      ["Andebol masculino, sub-elite", "male", ["sub-elite"], 3, 103, 1371, 401],
      ["Andebol feminino, elite", "female", ["elite"], 2, 47, 1576, 311],
    ],
  ],
  [
    "Futsal",
    [
      ["Futsal masculino, elite", "male", ["elite"], 7, 105, 1362, 366],
      ["Futsal feminino, amador", "female", ["amateur"], 1, 29, 1319, 249],
    ],
  ],
  [
    "Hóquei",
    [
      ["Hóquei feminino, elite", "female", ["elite"], 2, 44, 1255, 344],
      ["Hóquei feminino, sub-elite", "female", ["sub-elite"], 2, 40, 1140, 405],
    ],
  ],
  ["Ténis", [["Ténis masculino, elite", "male", ["elite"], 1, 14, 2216, 123]]],
  ["Voleibol", [["Voleibol feminino, elite", "female", ["elite"], 1, 13, 556, 206]]],
];

const common = { sourceId: SCHMITZ_2018.id, testId: "seed-test-yoyo-ir1", version: 1, minAge: 16, limitations: LIMITS };

export const SCHMITZ_2018_DATASETS: ReferenceDataset[] = [
  ...SPORTS.flatMap(([sport, rows]) =>
    rows.map(([label, sex, levels, studies, subjects, mean, sd]): ReferenceDataset => ({ ...common, id: `yyir1-${label}`, group: "sport", sport, sex, levels, label, studies, subjects, mean, sd })),
  ),
  { ...common, id: "yyir1-recreativo-m", group: "active", sex: "male", levels: [], label: "Praticantes recreativos, homens", studies: 13, subjects: 211, mean: 1339, sd: 534 },
  { ...common, id: "yyir1-recreativo-f", group: "active", sex: "female", levels: [], label: "Praticantes recreativas, mulheres", studies: 2, subjects: 47, mean: 864, sd: 298 },
  { ...common, id: "yyir1-inativo-m", group: "general", sex: "male", levels: [], label: "Homens inativos", studies: 4, subjects: 102, mean: 706, sd: 584 },
];
