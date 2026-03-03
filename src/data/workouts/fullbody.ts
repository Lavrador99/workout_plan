import type { Session } from "@/types";
import { wavePct } from "@/utils/date";

export function buildFullbody(week: number, b: number, dl: boolean): Session {
  const pct = wavePct(week);
  return {
    title: "Full Body",
    sub: `Bloco ${b} · Força integrada`,
    deload: dl,
    warmup:
      "Air squats 2x8 · Hip circles 2x10 · Arm circles 2x10 · World's greatest stretch 2x3/lado",
    exercises: [
      {
        name: "Goblet Squat",
        detail: `${dl ? "3x8" : "4x10"} — descanso 90s`,
        sets: dl ? 3 : 4,
        reps: 10,
        weight: true,
        rest: 90,
        key: "goblet_squat",
      },
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
      {
        name: "DB Row unilateral",
        detail: `${dl ? "3x8" : "3x12"}/lado — descanso 90s`,
        sets: dl ? 3 : 3,
        reps: 12,
        weight: true,
        rest: 90,
        key: "db_row",
      },
      {
        name: "Hip Thrust",
        detail: `${dl ? "3x10" : `${2 + b}x${10 + b * 2}`} — descanso 90s`,
        sets: dl ? 3 : 2 + b,
        reps: 10 + b * 2,
        weight: true,
        rest: 90,
        key: "hip_thrust",
        tip: "Espremendo glúteo máximo no topo.",
      },
      {
        name:
          [
            { sets: `${dl ? "3x8" : "4x10"}`, key: "sumo_squat" },
            { sets: `${dl ? "3x10" : "4x12"}`, key: "sumo_squat" },
            { sets: `${dl ? "3x10" : "4x12"}`, key: "sumo_deadlift" },
            { sets: `${dl ? "3x8" : "4x10"}`, key: "sumo_deadlift" },
          ][b - 1].key === "sumo_deadlift"
            ? "Sumo Deadlift"
            : "Sumo Squat",
        detail: `${dl ? "3x8" : "3x12"} — descanso 90s`,
        sets: dl ? 3 : 3,
        reps: 12,
        weight: true,
        rest: 90,
        key: b >= 3 ? "sumo_deadlift" : "sumo_squat",
      },
      {
        name: "Rear Delt Raises",
        detail: "3x15 — descanso 60s",
        sets: 3,
        reps: 15,
        rest: 60,
        key: "rear_delt",
      },
    ],
    accessories: [],
  };
}

export function buildGlutesLegs(week: number, b: number, dl: boolean): Session {
  return {
    title: "Glúteos & Pernas",
    sub: `Bloco ${b} · Volume/Hipertrofia`,
    deload: dl,
    warmup:
      "Clamshell 2x12 · Hip circle 2x10 · Air squat 2x10 · Glute bridge 2x10",
    exercises: [
      {
        name: "Hip Thrust (band + carga)",
        detail: `${dl ? "3x12" : `${3 + b}x${12 + b * 2}`} — descanso 90s`,
        sets: dl ? 3 : 3 + b,
        reps: 12 + b * 2,
        weight: true,
        rest: 90,
        key: "hip_thrust",
        tip: "Banda acima joelhos. Quadril completo. Pausa 1s topo.",
      },
      {
        name: "Sumo Deadlift",
        detail: `${dl ? "3x8" : "4x10"} — descanso 2min`,
        sets: dl ? 3 : 4,
        reps: 10,
        weight: true,
        rest: 120,
        key: "sumo_deadlift",
        tip: "Pés abertos 45°. Coluna neutra. Quadril conduz.",
      },
      {
        name: "Bulgarian Split Squat",
        detail: `${dl ? "2x8" : "3x12"}/lado — descanso 2min`,
        sets: dl ? 2 : 3,
        reps: 12,
        weight: true,
        rest: 120,
        key: "bulgarian_squat",
        tip: "Joelho traseiro quase no chão. Tronco erecto.",
      },
      {
        name: "Hip Abduction (máquina/banda)",
        detail: `${dl ? "2x15" : "3x20"} — descanso 60s`,
        sets: dl ? 2 : 3,
        reps: 20,
        rest: 60,
        key: "hip_abduction",
      },
      {
        name: "Donkey Kicks (banda)",
        detail: `${dl ? "2x12" : "3x15"}/lado — descanso 45s`,
        sets: dl ? 2 : 3,
        reps: 15,
        rest: 45,
        key: "donkey_kicks",
        tip: "Core estável. Não rotacionar o quadril.",
      },
      {
        name: "Leg Press pés altos",
        detail: `${dl ? "3x12" : "4x15"} — descanso 90s`,
        sets: dl ? 3 : 4,
        reps: 15,
        weight: true,
        rest: 90,
        key: "leg_press",
        tip: "Pés altos na plataforma para ativar glúteos.",
      },
      {
        name: "Glute Bridge c/ pausa (banda)",
        detail: `${dl ? "2x15" : "3x20"} — descanso 60s`,
        sets: dl ? 2 : 3,
        reps: 20,
        rest: 60,
        key: "glute_bridge",
        tip: "Pausa 2s no topo. Banda acima joelhos. Core activo.",
      },
    ],
    accessories: [],
  };
}
