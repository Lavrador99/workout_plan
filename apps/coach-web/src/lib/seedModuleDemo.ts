import { newResult } from "./assessment";
import { DEFAULTS } from "./db";
import { fallsItem } from "./modules/strengthBalance";
import type { Assessment, Client, Screening, TestDef, Trial } from "@treino/core/types";

// Four made-up clients of the Força e Equilíbrio module, from healthy to all
// tests altered. Same records on every device: fixed ids, updatedAt 1.

const DATE = "2026-11-02";

type Value = number | [number, number] | { left: [number, number]; right: [number, number] };

interface Case {
  id: string;
  name: string;
  sex: "female" | "male";
  birthDate: string;
  values: Record<string, Value>;
  questionnaires: Record<string, (number | null)[]>;
  moduleData: Record<string, string | number | boolean | string[]>;
  screening: Partial<Screening>;
  priorities: string[];
  message: string;
}

const CASES: Case[] = [
  {
    id: "seed-fe-ana",
    name: "Ana (exemplo)",
    sex: "female",
    birthDate: "1958-05-12",
    values: {
      "seed-test-4-posicoes": 4,
      "seed-test-unipodal-30": { left: [25, 24], right: [22, 20] },
      "seed-test-tug": [7.2, 7.0],
      "seed-test-8ft-up-go": [4.8, 4.6],
      "seed-test-sts-30": 17,
      "seed-test-sts-5": 9,
      "seed-test-arm-curl": 19,
      "seed-test-handgrip": { left: [24, 25], right: [26, 25] },
      "seed-test-gait-4m": 3.1,
      "seed-test-floor-rise": 2,
      "seed-test-chair-sit-reach": { left: [7, 8], right: [6, 6] },
      "seed-test-back-scratch": { left: [-3, -2], right: [0, 1] },
      "seed-test-knee-to-wall": { left: [10, 11], right: [11, 11] },
      "seed-test-6mwt-rect": 600,
    },
    questionnaires: { autonomy: [0, 0, 0, 0, 0, 0, 0], daily_moves: [0, 0, 0, 0, 0], fall_concern: [0, 0, 1, 0, 0, 0], sarc_f: [0, 0, 0, 0, 0] },
    moduleData: { falls: 0, wants: "continuar a fazer caminhadas longas com as amigas", aerobicTest: "seed-test-6mwt-rect", dynamometer: true, floorSafe: true },
    screening: { exerciseNow: "Caminhadas 4×/semana, hidroginástica 1×", stage: "maintenance", confidence: 9, sessionsPerWeek: 2 },
    priorities: ["Manter o treino de força 2 vezes por semana", "Desafiar o equilíbrio com tarefas novas"],
    message: "Vamos manter-te forte para continuares a fazer caminhadas longas com as amigas.",
  },
  {
    id: "seed-fe-manuel",
    name: "Manuel (exemplo)",
    sex: "male",
    birthDate: "1949-03-20",
    values: {
      "seed-test-4-posicoes": 2,
      "seed-test-unipodal-30": { left: [6, 7], right: [12, 10] },
      "seed-test-tug": [11.4, 11.0],
      "seed-test-8ft-up-go": [7.0, 6.8],
      "seed-test-sts-30": 12,
      "seed-test-sts-5": 14,
      "seed-test-arm-curl": 17,
      "seed-test-handgrip": { left: [28, 29], right: [30, 29] },
      "seed-test-gait-4m": 4.2,
      "seed-test-floor-rise": 1,
      "seed-test-chair-sit-reach": { left: [-2, -1], right: [0, -1] },
      "seed-test-back-scratch": { left: [-12, -12], right: [-10, -11] },
      "seed-test-knee-to-wall": { left: [6, 7], right: [8, 8] },
      "seed-test-6mwt-rect": 480,
    },
    questionnaires: { autonomy: [0, 1, 1, 0, 0, 1, 0], daily_moves: [0, 0, 0, 0, 0], fall_concern: [1, 1, 2, 1, 1, 0], sarc_f: [1, 0, 0, 1, fallsItem(2)] },
    moduleData: { falls: 2, fallInjured: false, fallHelp: false, wants: "voltar a pescar no paredão sem medo de cair", aerobicTest: "seed-test-6mwt-rect", dynamometer: true, floorSafe: true, gaitSigns: ["Desequilíbrio na volta"] },
    screening: { fallOrFear: true, risesWithoutHands: true, diseases: ["hypertension"], medicationCount: 3, medicationFlags: ["antihypertensive"], stage: "preparation", confidence: 7, sessionsPerWeek: 2 },
    priorities: [],
    message: "Vamos trabalhar para voltares a pescar no paredão sem medo de cair.",
  },
  {
    id: "seed-fe-rosa",
    name: "Rosa (exemplo)",
    sex: "female",
    birthDate: "1954-09-02",
    values: {
      "seed-test-4-posicoes": 4,
      "seed-test-unipodal-30": { left: [15, 13], right: [14, 12] },
      "seed-test-tug": [8.7, 8.5],
      "seed-test-8ft-up-go": [5.7, 5.5],
      "seed-test-sts-30": 14,
      "seed-test-sts-5": 11,
      "seed-test-arm-curl": 16,
      "seed-test-handgrip": { left: [19, 20], right: [20, 20] },
      "seed-test-gait-4m": 4.0,
      "seed-test-floor-rise": 2,
      "seed-test-chair-sit-reach": { left: [-7, -6], right: [-8, -7] },
      "seed-test-back-scratch": { left: [-16, -15], right: [-14, -15] },
      "seed-test-knee-to-wall": { left: [7, 8], right: [8, 8] },
      "seed-test-6mwt-rect": 400,
    },
    questionnaires: { autonomy: [0, 1, 0, 0, 0, 0, 0], daily_moves: [1, 1, 0, 0, 0], fall_concern: [0, 1, 0, 0, 0, 0], sarc_f: [0, 0, 0, 1, 0] },
    moduleData: { falls: 0, wants: "subir a rua até à igreja sem parar", aerobicTest: "seed-test-6mwt-rect", dynamometer: true, floorSafe: true },
    screening: { diseases: ["arthrosis"], stage: "contemplation", confidence: 8, sessionsPerWeek: 2 },
    priorities: [],
    message: "Vamos trabalhar para subires a rua até à igreja sem parar.",
  },
  {
    id: "seed-fe-joaquim",
    name: "Joaquim (exemplo)",
    sex: "male",
    birthDate: "1942-06-15",
    values: {
      "seed-test-4-posicoes": 1,
      "seed-test-unipodal-30": { left: [2, 1], right: [3, 2] },
      "seed-test-tug": [15.8, 15.0],
      "seed-test-8ft-up-go": [11.0, 10.5],
      "seed-test-sts-30": 6,
      "seed-test-sts-5": 19,
      "seed-test-arm-curl": 9,
      "seed-test-handgrip": { left: [20, 21], right: [22, 21] },
      "seed-test-gait-4m": 6.7,
      "seed-test-floor-rise": 0,
      "seed-test-chair-sit-reach": { left: [-20, -19], right: [-18, -19] },
      "seed-test-back-scratch": { left: [-30, -31], right: [-28, -30] },
      "seed-test-knee-to-wall": { left: [2, 3], right: [3, 3] },
      "seed-test-step-2min": 50,
    },
    questionnaires: {
      autonomy: [1, 2, 2, 1, 2, 1, 2],
      daily_moves: [1, 2, 1, 2, 2],
      fall_concern: [2, 2, 2, 2, 2, 1],
      sarc_f: [2, 1, 2, 2, fallsItem(2)],
      fab: [1, 2, 0, 1, 1, 1, 0, 0, 2, 1],
    },
    moduleData: { falls: 2, fallInjured: true, fallHelp: true, wants: "tomar banho e vestir-se sem ajuda", aerobicTest: "seed-test-step-2min", dynamometer: true, floorSafe: true, fabDone: true, gaitSigns: ["Passos curtos ou arrastados", "Procura apoio nas paredes ou móveis", "Olha para o chão constantemente"] },
    screening: {
      fallOrFear: true,
      risesWithoutHands: false,
      diseases: ["heart", "hypertension", "osteoporosis"],
      diseaseLimits: true,
      medicationCount: 6,
      medicationFlags: ["betablocker", "antihypertensive"],
      decision: "fit_restricted",
      restrictions: "Sem saltos nem flexão do tronco com carga (osteoporose); sempre junto à parede ou barra",
      stage: "preparation",
      confidence: 6,
      sessionsPerWeek: 2,
    },
    priorities: [],
    message: "Vamos trabalhar para tomares banho e te vestires sem ajuda.",
  },
];

function trialsOf(value: Value): Trial[] {
  if (typeof value === "number") return [{ value }];
  if (Array.isArray(value)) return value.map((v) => ({ value: v }));
  return [...value.left.map((v): Trial => ({ side: "left", value: v })), ...value.right.map((v): Trial => ({ side: "right", value: v }))];
}

export interface ModuleDemo {
  client: Client;
  screening: Screening;
  assessment: Assessment;
}

export function moduleDemos(tests: TestDef[]): ModuleDemo[] {
  return CASES.map((c) => {
    const client: Client = {
      id: c.id,
      updatedAt: 1,
      name: c.name,
      injuries: "",
      notes: "Cliente fictício do módulo Força e Equilíbrio, com dados inventados para demonstração.",
      sex: c.sex,
      birthDate: c.birthDate,
      birthYear: Number(c.birthDate.slice(0, 4)),
      moduleIds: ["strength_balance"],
      consents: { given: { data_health: DATE }, professionals: "", signature: null, guardianSignature: null, signedAt: DATE },
    };
    const screening: Screening = {
      ...(DEFAULTS.screenings as Omit<Screening, "id" | "updatedAt" | "clientId" | "date">),
      id: `${c.id}-s`,
      updatedAt: 1,
      clientId: c.id,
      date: DATE,
      quick: [false, false, false, false, false, false, false, null],
      parq: "all_no",
      decision: "fit",
      ...c.screening,
    };
    const id = `${c.id}-a`;
    const results = Object.entries(c.values).flatMap(([testId, value]) => {
      const t = tests.find((x) => x.id === testId);
      return t ? [{ ...newResult(t), id: `${id}-${testId}`, trials: trialsOf(value) }] : [];
    });
    const assessment: Assessment = {
      id,
      updatedAt: 1,
      clientId: c.id,
      date: DATE,
      title: "Força e Equilíbrio",
      conditions: "",
      notes: "",
      results,
      moduleId: "strength_balance",
      questionnaires: c.questionnaires,
      moduleData: c.moduleData,
      report: { compareWith: null, findings: "", priorities: c.priorities, plan: "", nextDate: null, message: c.message },
    };
    return { client, screening, assessment };
  });
}
