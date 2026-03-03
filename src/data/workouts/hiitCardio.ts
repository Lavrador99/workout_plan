import type { Session } from "@/types";

export function buildHiitCardio(
  _week: number,
  b: number,
  dl: boolean,
): Session {
  const rounds = dl ? 3 : 3 + b;
  const rest = dl ? 45 : Math.max(20, 45 - b * 5);

  return {
    title: "HIIT Cardio",
    sub: `${rounds} rounds · ${rest}s descanso`,
    type: "circuit",
    deload: dl,
    info: `${rounds} rounds completos · ${rest}s descanso entre exercícios`,
    warmup:
      "Air squats 2x10 · High knees 1x30s · Arm circles 1x20 · Light jog 3min",
    exercises: [
      {
        name: "Jump Squats",
        detail: `${rounds}x20 — descanso ${rest}s`,
        sets: rounds,
        reps: 20,
        rest,
        key: "jump_squats",
        tip: "Aterrar suavemente. Joelhos sobre dedos.",
      },
      {
        name: "Mountain Climbers",
        detail: `${rounds}x30 — descanso ${rest}s`,
        sets: rounds,
        reps: 30,
        rest,
        key: "mountain_climbers",
        tip: "Core activado. Cadência constante.",
      },
      {
        name: "Burpees",
        detail: `${rounds}x10 — descanso ${rest}s`,
        sets: rounds,
        reps: 10,
        rest,
        key: "burpees",
        tip: "Full squat para baixo. Salto com palmas.",
      },
      {
        name: "High Knees",
        detail: `${rounds}x40 — descanso ${rest}s`,
        sets: rounds,
        reps: 40,
        rest,
        key: "high_knees",
        tip: "Joelhos acima do quadril. Cotovelos 90°.",
      },
      {
        name: "Lateral Skaters",
        detail: `${rounds}x20/lado — descanso ${rest}s`,
        sets: rounds,
        reps: 20,
        rest,
        key: "lateral_skaters",
      },
    ],
    accessories: [],
  };
}

export function buildFatLossCircuit(
  _week: number,
  b: number,
  dl: boolean,
): Session {
  const rounds = dl ? 3 : 3 + Math.min(b - 1, 2);
  const rest = dl ? 40 : Math.max(20, 40 - b * 5);

  return {
    title: "Circuito Metabólico",
    sub: `${rounds} rounds · Queima de gordura`,
    type: "circuit",
    deload: dl,
    info: `${rounds} rounds · Descanso ${rest}s entre exercícios · 2-3min entre rounds`,
    warmup:
      "Air squats 2x8 · Hip circles 2x8 · Arm circles 1x15 · Light jog 5min",
    exercises: [
      {
        name: "Goblet Squat",
        detail: `${rounds}x${10 + b * 2} — descanso ${rest}s`,
        sets: rounds,
        reps: 10 + b * 2,
        weight: true,
        rest,
        key: "goblet_squat",
        tip: "Carga moderada. Cadência controlada.",
      },
      {
        name: "Push-up",
        detail: `${rounds}x${8 + b * 2} — descanso ${rest}s`,
        sets: rounds,
        reps: 8 + b * 2,
        rest,
        key: "pushup_std",
      },
      {
        name: "DB Row",
        detail: `${rounds}x${10 + b * 2}/lado — descanso ${rest}s`,
        sets: rounds,
        reps: 10 + b * 2,
        weight: true,
        rest,
        key: "db_row",
      },
      {
        name: "Hip Thrust",
        detail: `${rounds}x${12 + b * 2} — descanso ${rest}s`,
        sets: rounds,
        reps: 12 + b * 2,
        weight: true,
        rest,
        key: "hip_thrust",
      },
      {
        name: "Overhead Press",
        detail: `${rounds}x${10 + b * 2} — descanso ${rest}s`,
        sets: rounds,
        reps: 10 + b * 2,
        weight: true,
        rest,
        key: "overhead_press",
        tip: "Núcleo activado. Não arquear lombares.",
      },
      {
        name: "Mountain Climbers",
        detail: `${rounds}x${20 + b * 5} — descanso ${rest}s`,
        sets: rounds,
        reps: 20 + b * 5,
        rest,
        key: "mountain_climbers",
      },
      {
        name: "Lateral Skaters",
        detail: `${rounds}x${12 + b * 2}/lado — descanso ${rest}s`,
        sets: rounds,
        reps: 12 + b * 2,
        rest,
        key: "lateral_skaters",
      },
    ],
    accessories: [],
  };
}
