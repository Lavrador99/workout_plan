import type { Session } from "@/types";
import { wavePct } from "@/utils/date";

export function buildLegs(week: number, b: number, dl: boolean): Session {
  const pct = wavePct(week);
  const force = week % 2 === 1;

  const exercises = force
    ? [
        {
          name: "Back Squat",
          detail: `${dl ? "3x3" : "5x3"} @ ${pct} — descanso 3min`,
          sets: dl ? 3 : 5,
          reps: 3,
          weight: true,
          rest: 180,
          key: "back_squat",
          tip: "Break paralelo. Joelhos sobre pés. Vídeo lateral.",
        },
        {
          name: "RDL",
          detail: `${dl ? "3x5" : "4x5"} @ 75% — descanso 2min`,
          sets: dl ? 3 : 4,
          reps: 5,
          weight: true,
          rest: 120,
          key: "rdl",
          tip: "Quadril para trás. Sentir isquiotibiais.",
        },
        {
          name: "Bulgarian Split Squat",
          detail: `${dl ? "2x6" : "3x8"}/lado — descanso 90s`,
          sets: dl ? 2 : 3,
          reps: 8,
          weight: true,
          rest: 90,
          key: "bulgarian_squat",
        },
        {
          name: "Nordic Curl",
          detail: `${dl ? "2x4" : "3x5"} — descanso 2min`,
          sets: dl ? 2 : 3,
          reps: 5,
          rest: 120,
          key: "nordic_curl",
          tip: "Excêntrica máxima. Usar mãos para subir.",
        },
        {
          name: "Single-leg Calf Raises",
          detail: `${dl ? "2x12" : "3x15-20"} — descanso 45s`,
          sets: dl ? 2 : 3,
          reps: 17,
          rest: 45,
          key: "calf_raises",
        },
        {
          name: "Pogo Jumps",
          detail: "3x20 — descanso 60s",
          sets: 3,
          reps: 20,
          rest: 60,
          key: "pogo_jumps",
          tip: "Contacto mínimo com o chão. Tornozelo rígido.",
        },
      ]
    : [
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
          name: "Hip Thrust",
          detail: `${dl ? "3x10" : `${3 + b}x${8 + b * 2}`} — descanso 90s`,
          sets: dl ? 3 : 3 + b,
          reps: 8 + b * 2,
          weight: true,
          rest: 90,
          key: "hip_thrust",
          tip: "Espremendo glúteo no topo. Queixo dentro.",
        },
        {
          name: "Front Squat",
          detail: `${dl ? "2x6" : "3x8"} — descanso 2min`,
          sets: dl ? 2 : 3,
          reps: 8,
          weight: true,
          rest: 120,
          key: "front_squat",
          tip: "Cotovelos altos. Vídeo lateral.",
        },
        {
          name: "Walking Lunges",
          detail: `${dl ? "2x8" : "3x12"}/lado — descanso 90s`,
          sets: dl ? 2 : 3,
          reps: 12,
          rest: 90,
          key: "lunges_var",
        },
        {
          name: "Step-ups",
          detail: `${dl ? "2x8" : "3x10"}/lado — descanso 60s`,
          sets: dl ? 2 : 3,
          reps: 10,
          rest: 60,
          key: "step_ups",
        },
        {
          name: "Tibialis Raises",
          detail: "3x15 — descanso 30s",
          sets: 3,
          reps: 15,
          rest: 30,
          key: "tibialis_raises",
        },
        {
          name: "Single-leg Step-down",
          detail: "3x10/lado — descanso 60s",
          sets: 3,
          reps: 10,
          rest: 60,
          key: "step_down",
        },
      ];

  return {
    title: `Pernas — ${force ? "Força" : "Volume"}`,
    sub: `Bloco ${b} · ${dl ? "Deload" : "Semana " + week}`,
    deload: dl,
    warmup:
      "Air squats 2x10 · Hip circles 2x10 · Cossack squat 2x5/lado · Hip 90/90 2x30s",
    exercises,
    accessories: [],
  };
}
