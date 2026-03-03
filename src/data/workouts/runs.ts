import type { Session } from "@/types";

export function buildQualityRun(week: number, b: number, dl: boolean): Session {
  const descriptions: Record<number, string> = {
    1: "4x1200m @ 5K pace — descanso 90s entre repetições",
    2: "5x1000m @ 5K pace — descanso 2min entre repetições",
    3: "6x800m @ 5K-10K pace — descanso 90s entre repetições",
    4: "4x1600m @ 10K pace — descanso 2min entre repetições",
  };

  return {
    title: "Corrida de Qualidade",
    sub: `Bloco ${b} · Trabalho de velocidade`,
    type: "run",
    deload: dl,
    info: dl
      ? "🔻 DELOAD — Reduz volume 40%. Manter cadência mas menos séries."
      : descriptions[b],
    warmup: "Leg swings 2x10 · Air squats 2x10 · Progressive run 10min",
    exercises: [
      {
        name: "Aquecimento ativo",
        detail: "10-15min @ corrida fácil — z1/z2",
        sets: 1,
        reps: 1,
        rest: 0,
        key: "quality_run",
      },
      {
        name: dl ? "Corrida contínua moderada" : "Intervalos de Corrida",
        detail: dl ? "20-25min @ z2 (conversação fácil)" : descriptions[b],
        sets: dl ? 1 : b === 1 ? 4 : b === 2 ? 5 : b === 3 ? 6 : 4,
        reps: dl ? 1 : b === 1 ? 1200 : b === 2 ? 1000 : b === 3 ? 800 : 1600,
        rest: dl ? 0 : b % 2 === 0 ? 120 : 90,
        key: "quality_run",
        tip: "Cadência 170-180 spm. Respiração ritiada.",
      },
    ],
    runNote: "Arrefecer 10min @ corrida muito leve. Alongamentos dinâmicos.",
    accessories: [],
  };
}

export function buildLongRun(week: number, b: number, dl: boolean): Session {
  const distances: Record<number, string> = {
    1: "12-14km @ z2 (70% FCmax)",
    2: "14-16km @ z2 (70% FCmax)",
    3: "16-18km @ z2 (70% FCmax)",
    4: "18-22km @ z2 (70% FCmax)",
  };

  return {
    title: "Long Run",
    sub: `Bloco ${b} · Base aeróbica`,
    type: "run",
    deload: dl,
    info: dl
      ? "🔻 DELOAD — Long run 8-10km leve. Recuperação activa."
      : distances[b],
    warmup: "Leg swings 2x10 · Hip circles 1x10 · 5min caminhada rápida",
    exercises: [
      {
        name: dl ? "Corrida leve" : "Long Run",
        detail: dl ? "8-10km @ z1/z2 muito fácil" : distances[b],
        sets: 1,
        reps: 1,
        rest: 0,
        key: "long_run",
        tip: "Podes falar confortavelmente durante toda a corrida.",
      },
    ],
    runNote: "Comer antes (2h) e hidratação durante. Foam roller pós-corrida.",
    accessories: [],
  };
}
