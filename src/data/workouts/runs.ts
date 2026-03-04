import type { Session } from "@/types";

export function buildQualityRun(week: number, b: number, dl: boolean): Session {
  // Alternate between 2 formats every week within each block
  const alt = week % 2 === 1; // odd = intervals, even = sustained effort

  type RunFormat = {
    title: string;
    info: string;
    name: string;
    detail: string;
    sets: number;
    reps: number;
    rest: number;
  };

  const formats: Record<number, [RunFormat, RunFormat]> = {
    1: [
      {
        title: "Intervalos 5K",
        info: "4x1200m @ 5K pace — descanso 90s",
        name: "Intervalos 1200m",
        detail: "4x1200m @ 5K pace — 90s descanso",
        sets: 4,
        reps: 1200,
        rest: 90,
      },
      {
        title: "Tempo Run",
        info: "20min @ 10K pace contínuo (z3 alto)",
        name: "Tempo Run",
        detail: "20min @ 10K pace — sem paragens",
        sets: 1,
        reps: 1,
        rest: 0,
      },
    ],
    2: [
      {
        title: "Intervalos 5K",
        info: "5x1000m @ 5K pace — descanso 2min",
        name: "Intervalos 1000m",
        detail: "5x1000m @ 5K pace — 2min descanso",
        sets: 5,
        reps: 1000,
        rest: 120,
      },
      {
        title: "Hill Repeats",
        info: "8x200m : colina a 8-10% declive @ esforço máximo — 90s descanso",
        name: "Hill Repeats",
        detail: "8x200m :colina esforço máximo — 90s descanso",
        sets: 8,
        reps: 200,
        rest: 90,
      },
    ],
    3: [
      {
        title: "Intervalos 5K-10K",
        info: "6x800m @ 5K-10K pace — descanso 90s",
        name: "Intervalos 800m",
        detail: "6x800m @ 5K pace — 90s descanso",
        sets: 6,
        reps: 800,
        rest: 90,
      },
      {
        title: "Intervalos curtos",
        info: "10x400m @ 3K-5K pace — descanso 75s",
        name: "Intervalos 400m",
        detail: "10x400m @ 3K pace — 75s descanso",
        sets: 10,
        reps: 400,
        rest: 75,
      },
    ],
    4: [
      {
        title: "Intervalos de Milha",
        info: "4x1600m @ 10K pace — descanso 2min",
        name: "Intervalos 1600m",
        detail: "4x1600m @ 10K pace — 2min descanso",
        sets: 4,
        reps: 1600,
        rest: 120,
      },
      {
        title: "Threshold Run",
        info: "30min @ Limiar Láctico (z4) contínuo",
        name: "Threshold Run",
        detail: "30min @ z4 contínuo — FCmax 85-90%",
        sets: 1,
        reps: 1,
        rest: 0,
      },
    ],
  };

  const fmtAlt = alt ? formats[b][0] : formats[b][1];

  return {
    title: "Corrida de Qualidade",
    sub: `Bloco ${b} · ${dl ? "Deload" : fmtAlt.title}`,
    type: "run",
    deload: dl,
    info: dl
      ? "🔻 DELOAD — Reduz volume 40%. Manter cadência mas menos séries."
      : fmtAlt.info,
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
        name: dl ? "Corrida contínua moderada" : fmtAlt.name,
        detail: dl ? "20-25min @ z2 (conversação fácil)" : fmtAlt.detail,
        sets: dl ? 1 : fmtAlt.sets,
        reps: dl ? 1 : fmtAlt.reps,
        rest: dl ? 0 : fmtAlt.rest,
        key: "quality_run",
        tip: "Cadência 170-180 spm. Respiração rítmica.",
      },
    ],
    runNote: "Arrefecer 10min @ corrida muito leve. Alongamentos dinâmicos.",
    accessories: [],
  };
}

export function buildLongRun(week: number, b: number, dl: boolean): Session {
  // Alternate between steady-state and progressive long run
  const alt = week % 2 === 1; // odd = steady z2, even = progressive

  const steadyDistances: Record<number, string> = {
    1: "12-14km @ z2 (70% FCmax)",
    2: "14-16km @ z2 (70% FCmax)",
    3: "16-18km @ z2 (70% FCmax)",
    4: "18-22km @ z2 (70% FCmax)",
  };

  const progressiveDistances: Record<number, string> = {
    1: "12km progressivo (6km z2 + 4km z3 + 2km z4)",
    2: "14km progressivo (6km z2 + 6km z3 + 2km z4)",
    3: "16km progressivo (8km z2 + 6km z3 + 2km ritmo meta)",
    4: "20km progressivo (10km z2 + 8km z3 + 2km ritmo meta)",
  };

  const desc = alt ? steadyDistances[b] : progressiveDistances[b];
  const subTitle = alt ? "Base aeróbica" : "Long Run progressivo";

  return {
    title: "Long Run",
    sub: `Bloco ${b} · ${dl ? "Deload" : subTitle}`,
    type: "run",
    deload: dl,
    info: dl ? "🔻 DELOAD — Long run 8-10km leve. Recuperação activa." : desc,
    warmup: "Leg swings 2x10 · Hip circles 1x10 · 5min caminhada rápida",
    exercises: [
      {
        name: dl
          ? "Corrida leve"
          : alt
            ? "Long Run Steady"
            : "Long Run Progressivo",
        detail: dl ? "8-10km @ z1/z2 muito fácil" : desc,
        sets: 1,
        reps: 1,
        rest: 0,
        key: "long_run",
        tip: alt
          ? "Podes falar confortavelmente durante toda a corrida."
          : "Começo fácil! Últimos 2km a ritmo meta meia-maratona.",
      },
    ],
    runNote: "Comer antes (2h) e hidratação durante. Foam roller pós-corrida.",
    accessories: [],
  };
}
