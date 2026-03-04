import type { Exercise, Session } from "@/types";
import { wavePct } from "@/utils/date";

export function buildFullbody(week: number, b: number, dl: boolean): Session {
  const pct = wavePct(week);

  // 4-version rotation per week (independent of block)
  const v = ((week - 1) % 4) + 1; // 1 | 2 | 3 | 4

  // Leg / knee-dominant primary
  const legPrimary: Record<number, Exercise> = {
    1: {
      name: "Goblet Squat",
      detail: `${dl ? "3x8" : "4x10"} — descanso 90s`,
      sets: dl ? 3 : 4,
      reps: 10,
      weight: true,
      rest: 90,
      key: "goblet_squat",
      tip: "Cotovelos altos. Profundidade máxima.",
    },
    2: {
      name: "Front Squat",
      detail: `${dl ? "3x6" : "4x8"} — descanso 2min`,
      sets: dl ? 3 : 4,
      reps: 8,
      weight: true,
      rest: 120,
      key: "front_squat",
      tip: "Cotovelos altos. Core rígido. Vídeo lateral.",
    },
    3: {
      name: "Goblet Squat (pausa 2s fundo)",
      detail: `${dl ? "3x6" : "4x8"} — descanso 90s`,
      sets: dl ? 3 : 4,
      reps: 8,
      weight: true,
      rest: 90,
      key: "goblet_squat",
      tip: "Pausa 2s fundo. Não relaxar lombares.",
    },
    4: {
      name: "Landmine Squat",
      detail: `${dl ? "3x8" : "4x10"} — descanso 90s`,
      sets: dl ? 3 : 4,
      reps: 10,
      weight: true,
      rest: 90,
      key: "goblet_squat",
      tip: "Segurar barra ao peito. Profundidade máxima.",
    },
  };

  // Hip-dominant / posterior
  const hipExercise: Record<number, Exercise> = {
    1: {
      name: "Hip Thrust",
      detail: `${dl ? "3x10" : `${2 + b}x${10 + b * 2}`} — descanso 90s`,
      sets: dl ? 3 : 2 + b,
      reps: 10 + b * 2,
      weight: true,
      rest: 90,
      key: "hip_thrust",
      tip: "Espremendo glúteo máximo no topo.",
    },
    2: {
      name: "Romanian Deadlift",
      detail: `${dl ? "3x8" : "4x10"} — descanso 2min`,
      sets: dl ? 3 : 4,
      reps: 10,
      weight: true,
      rest: 120,
      key: "rdl",
      tip: "Quadril para trás. Joelhos ligeiramente fletidos.",
    },
    3: {
      name: "Hip Thrust pausa 2s topo",
      detail: `${dl ? "3x10" : `${2 + b}x${8 + b}`} — descanso 90s`,
      sets: dl ? 3 : 2 + b,
      reps: 8 + b,
      weight: true,
      rest: 90,
      key: "hip_thrust",
      tip: "Pausa 2s no topo. Máxima contracção glútea.",
    },
    4: {
      name: "Sumo Deadlift",
      detail: `${dl ? "3x6" : "4x8"} @ ${pct} — descanso 2min`,
      sets: dl ? 3 : 4,
      reps: 8,
      weight: true,
      rest: 120,
      key: "sumo_deadlift",
      tip: "Pés abertos 45°. Coluna neutra. Quadril conduz.",
    },
  };

  // Secondary posterior / row variation
  const rowVariant: Record<number, Exercise> = {
    1: {
      name: "DB Row unilateral",
      detail: `${dl ? "3x8" : "3x12"}/lado — descanso 90s`,
      sets: dl ? 3 : 3,
      reps: 12,
      weight: true,
      rest: 90,
      key: "db_row",
      tip: "Cotovelo perto do corpo. Puxar até anca.",
    },
    2: {
      name: "Chest-supported DB Row",
      detail: `${dl ? "3x10" : "4x12"} — descanso 90s`,
      sets: dl ? 3 : 4,
      reps: 12,
      weight: true,
      rest: 90,
      key: "db_row",
      tip: "Peito no banco. Cotovelos 45°. Full ROM.",
    },
    3: {
      name: "Seated Cable Row / Band Row",
      detail: `${dl ? "3x10" : "4x12"} — descanso 90s`,
      sets: dl ? 3 : 4,
      reps: 12,
      weight: true,
      rest: 90,
      key: "db_row",
      tip: "Puxar ao umbigo. Escápulas juntas no topo.",
    },
    4: {
      name: "Meadows Row",
      detail: `${dl ? "3x8" : "3x10"}/lado — descanso 90s`,
      sets: dl ? 3 : 3,
      reps: 10,
      weight: true,
      rest: 90,
      key: "db_row",
      tip: "Rotação do tronco. Puxar ao lado do quadril.",
    },
  };

  // Accessory / finisher
  const finisher: Record<number, Exercise> = {
    1: {
      name: "Rear Delt Raises",
      detail: "3x15 — descanso 60s",
      sets: 3,
      reps: 15,
      rest: 60,
      key: "rear_delt",
    },
    2: {
      name: "Face Pulls (banda/cabo)",
      detail: "3x20 — descanso 45s",
      sets: 3,
      reps: 20,
      rest: 45,
      key: "rear_delt",
      tip: "Puxar para rosto. Rotação externa máxima.",
    },
    3: {
      name: "Band Pull-apart",
      detail: "3x20 — descanso 30s",
      sets: 3,
      reps: 20,
      rest: 30,
      key: "rear_delt",
      tip: "Braços retos. Esticar banda ao peito.",
    },
    4: {
      name: "Y/T/W Raises (haltere leve)",
      detail: "3x10 cada — descanso 60s",
      sets: 3,
      reps: 10,
      rest: 60,
      key: "rear_delt",
      tip: "Posição Y + T + W consecutivas. Pesos leves.",
    },
  };

  const vTitles: Record<number, string> = {
    1: "Força Integrada A",
    2: "Força Integrada B",
    3: "Força Integrada C",
    4: "Força Integrada D",
  };

  return {
    title: "Full Body",
    sub: `Bloco ${b} · ${dl ? "Deload" : vTitles[v]}`,
    deload: dl,
    warmup:
      "Air squats 2x8 · Hip circles 2x10 · Arm circles 2x10 · World's greatest stretch 2x3/lado",
    exercises: [
      legPrimary[v],
      {
        name: [
          "Push-up Standard",
          "Dumbbell Bench Press",
          "Push-up com carga",
          "DB Press inclinado",
        ][b - 1],
        detail: `${dl ? "3x8" : "3x12"} — descanso 90s`,
        sets: dl ? 3 : 3,
        reps: 12,
        weight: b >= 2,
        rest: 90,
        key: b >= 2 ? "db_bench" : "pushup_std",
        tip: "Corpo rígido. Peito toca na superfície.",
      },
      {
        name: ["Assisted Pull-up", "Chin-ups", "Pull-ups", "Weighted Pull-ups"][
          b - 1
        ],
        detail: `${dl ? "3x6" : "4x8"} — descanso 2min`,
        sets: dl ? 3 : 4,
        reps: 8,
        weight: b === 4,
        rest: 120,
        key: b === 1 ? "assisted_pullup" : "weighted_pullup",
      },
      rowVariant[v],
      hipExercise[v],
      finisher[v],
    ],
    accessories: [],
  };
}

export function buildGlutesLegs(week: number, b: number, dl: boolean): Session {
  // 3-rotation cycle: different secondary exercises each week
  const r = ((week - 1) % 3) + 1; // 1 | 2 | 3

  const rTitles: Record<number, string> = {
    1: "Volume/Hipertrofia A",
    2: "Volume/Hipertrofia B",
    3: "Volume/Hipertrofia C",
  };

  type ExDef = {
    name: string;
    detail: string;
    sets: number;
    reps: number;
    weight?: boolean;
    rest: number;
    key: string;
    tip?: string;
  };

  // Main hip thrust (always present, intensity varies)
  const mainHip: ExDef = {
    name:
      r === 1
        ? "Hip Thrust (band + barra)"
        : r === 2
          ? "Hip Thrust pausa 3s topo"
          : "Hip Thrust americano unilateral",
    detail: `${dl ? "3x12" : `${3 + b}x${12 + b * 2}`} — descanso 90s`,
    sets: dl ? 3 : 3 + b,
    reps: 12 + b * 2,
    weight: true,
    rest: 90,
    key: "hip_thrust",
    tip:
      r === 1
        ? "Banda acima joelhos. Quadril completo. Pausa 1s topo."
        : r === 2
          ? "Pausa 3s no ponto mais alto. Espremar glúteo máximo."
          : "Uma perna esticada. Quadril nivelado. Core rígido.",
  };

  // Hinge variation per rotation
  const hinge: ExDef =
    r === 1
      ? {
          name: "Sumo Deadlift",
          detail: `${dl ? "3x8" : "4x10"} — descanso 2min`,
          sets: dl ? 3 : 4,
          reps: 10,
          weight: true,
          rest: 120,
          key: "sumo_deadlift",
          tip: "Pés abertos 45°. Coluna neutra. Quadril conduz.",
        }
      : r === 2
        ? {
            name: "Romanian Deadlift (volume)",
            detail: `${dl ? "3x10" : "4x12"} — descanso 2min`,
            sets: dl ? 3 : 4,
            reps: 12,
            weight: true,
            rest: 120,
            key: "rdl",
            tip: "Quadril para trás até sentir isquiotibiais. Joelhos ligeiramente fletidos.",
          }
        : {
            name: "Cable Pull-through",
            detail: `${dl ? "3x12" : "4x15"} — descanso 90s`,
            sets: dl ? 3 : 4,
            reps: 15,
            weight: true,
            rest: 90,
            key: "cable_pull_through",
            tip: "Cabo entre as pernas. Quadril conduz. Extensão completa.",
          };

  // Unilateral leg variation per rotation
  const unilateral: ExDef =
    r === 1
      ? {
          name: "Bulgarian Split Squat",
          detail: `${dl ? "2x8" : "3x12"}/lado — descanso 2min`,
          sets: dl ? 2 : 3,
          reps: 12,
          weight: true,
          rest: 120,
          key: "bulgarian_squat",
          tip: "Joelho traseiro quase no chão. Tronco erecto.",
        }
      : r === 2
        ? {
            name: "Reverse Lunge (halteres)",
            detail: `${dl ? "2x10" : "3x12"}/lado — descanso 90s`,
            sets: dl ? 2 : 3,
            reps: 12,
            weight: true,
            rest: 90,
            key: "lunges_var",
            tip: "Passo para trás largo. Joelho dianteiro 90°.",
          }
        : {
            name: "Step-up glúteo (caixa 50cm)",
            detail: `${dl ? "2x10" : "3x12"}/lado — descanso 90s`,
            sets: dl ? 2 : 3,
            reps: 12,
            weight: true,
            rest: 90,
            key: "step_ups",
            tip: "Calcâneo empurra a caixa. Tronco ligeiramente inclinado à frente.",
          };

  // Abduction/isolation per rotation
  const isolation: ExDef =
    r === 1
      ? {
          name: "Hip Abduction (máquina/banda)",
          detail: `${dl ? "2x15" : "3x20"} — descanso 60s`,
          sets: dl ? 2 : 3,
          reps: 20,
          rest: 60,
          key: "hip_abduction",
        }
      : r === 2
        ? {
            name: "Clamshell c/ banda (3s pausa)",
            detail: `${dl ? "2x15" : "3x20"}/lado — descanso 45s`,
            sets: dl ? 2 : 3,
            reps: 20,
            rest: 45,
            key: "hip_abduction",
            tip: "Pausa 3s no topo. Quadril estável.",
          }
        : {
            name: "Side-lying Hip Abduction (tornozeiros)",
            detail: `${dl ? "2x15" : "3x20"}/lado — descanso 45s`,
            sets: dl ? 2 : 3,
            reps: 20,
            rest: 45,
            key: "hip_abduction_side",
          };

  // Glute kickback variation per rotation
  const kickback: ExDef =
    r === 1
      ? {
          name: "Donkey Kicks (banda)",
          detail: `${dl ? "2x12" : "3x15"}/lado — descanso 45s`,
          sets: dl ? 2 : 3,
          reps: 15,
          rest: 45,
          key: "donkey_kicks",
          tip: "Core estável. Não rotacionar o quadril.",
        }
      : r === 2
        ? {
            name: "Cable Kickback",
            detail: `${dl ? "2x15" : "3x15"}/lado — descanso 45s`,
            sets: dl ? 2 : 3,
            reps: 15,
            rest: 45,
            key: "donkey_kicks",
            tip: "Extensão completa da anca. Glúteo contraído.",
          }
        : {
            name: "Prone Hip Extension (GHD/banco)",
            detail: `${dl ? "2x12" : "3x15"} — descanso 60s`,
            sets: dl ? 2 : 3,
            reps: 15,
            rest: 60,
            key: "donkey_kicks",
            tip: "Estender pernas para trás. Core activado.",
          };

  // Compound finisher per rotation
  const finisher: ExDef =
    r === 1
      ? {
          name: "Leg Press pés altos",
          detail: `${dl ? "3x12" : "4x15"} — descanso 90s`,
          sets: dl ? 3 : 4,
          reps: 15,
          weight: true,
          rest: 90,
          key: "leg_press",
          tip: "Pés altos na plataforma para ativar glúteos.",
        }
      : r === 2
        ? {
            name: "Leg Curl (máquina)",
            detail: `${dl ? "3x12" : "4x15"} — descanso 60s`,
            sets: dl ? 3 : 4,
            reps: 15,
            weight: true,
            rest: 60,
            key: "leg_curl",
            tip: "Controlo excêntrico. 2s a descer.",
          }
        : {
            name: "Sumo Squat c/ pausa 2s fundo",
            detail: `${dl ? "3x10" : "4x12"} — descanso 90s`,
            sets: dl ? 3 : 4,
            reps: 12,
            weight: true,
            rest: 90,
            key: "goblet_squat",
            tip: "Pausa 2s fundo. Joelhos sobre dedos. Pés abertos 45°.",
          };

  return {
    title: "Glúteos & Pernas",
    sub: `Bloco ${b} · ${dl ? "Deload" : rTitles[r]}`,
    deload: dl,
    warmup:
      "Clamshell 2x12 · Hip circle 2x10 · Air squat 2x10 · Glute bridge 2x10",
    exercises: [mainHip, hinge, unilateral, isolation, kickback, finisher],
    accessories: [],
  };
}
