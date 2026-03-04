import type { Session } from "@/types";

export function buildHiitCardio(week: number, b: number, dl: boolean): Session {
  const rounds = dl ? 3 : 3 + b;
  const rest = dl ? 45 : Math.max(20, 45 - b * 5);

  // 3 distinct circuit rotations — cycle every 3 weeks
  const v = ((week - 1) % 3) + 1; // 1 | 2 | 3

  const circuitTitles: Record<number, string> = {
    1: "HIIT — Potência",
    2: "HIIT — Velocidade",
    3: "HIIT — Resistência",
  };

  const circuits: Record<
    number,
    { name: string; reps: number; key: string; tip?: string }[]
  > = {
    1: [
      {
        name: "Jump Squats",
        reps: 20,
        key: "jump_squats",
        tip: "Aterrar suavemente. Joelhos sobre dedos.",
      },
      {
        name: "Mountain Climbers",
        reps: 30,
        key: "mountain_climbers",
        tip: "Core activado. Cadência constante.",
      },
      {
        name: "Burpees",
        reps: 10,
        key: "burpees",
        tip: "Full squat para baixo. Salto com palmas.",
      },
      {
        name: "High Knees",
        reps: 40,
        key: "high_knees",
        tip: "Joelhos acima do quadril. Cotovelos 90°.",
      },
      { name: "Lateral Skaters", reps: 20, key: "lateral_skaters" },
    ],
    2: [
      {
        name: "Box Jumps",
        reps: 10,
        key: "box_jump",
        tip: "Aterrar silenciosamente. Descer ao lado da caixa.",
      },
      {
        name: "Speed Skaters",
        reps: 20,
        key: "lateral_skaters",
        tip: "Amplitude máxima. Braço oposto ao pé.",
      },
      {
        name: "Jumping Lunges",
        reps: 16,
        key: "lunges_var",
        tip: "Alternar pernas no ar. Aterrar suavemente.",
      },
      {
        name: "Sprint (in-place)",
        reps: 40,
        key: "high_knees",
        tip: "Velocidade máxima 10s. Braços ativos.",
      },
      {
        name: "Plyo Push-ups",
        reps: 10,
        key: "plyo_pushup",
        tip: "Mãos saem do chão no topo. Atelagem controlada.",
      },
    ],
    3: [
      {
        name: "Broad Jumps",
        reps: 8,
        key: "broad_jump",
        tip: "Salto em comprimento. Joelhos fletidos ao aterrar.",
      },
      {
        name: "Bear Crawl",
        reps: 20,
        key: "bear_crawl",
        tip: "Joelhos 2cm do chão. Core neutro. 10m frente/trás.",
      },
      {
        name: "Tuck Jumps",
        reps: 12,
        key: "jump_squats",
        tip: "Joelhos ao peito no ponto mais alto.",
      },
      {
        name: "Burpee + Broad Jump",
        reps: 8,
        key: "burpees",
        tip: "Burpee completo + salto em comprimento.",
      },
      {
        name: "Jumping Jacks + Sprint Finish",
        reps: 30,
        key: "high_knees",
        tip: "20 jacks depois 10 sprints.",
      },
    ],
  };

  const exerciseList = circuits[v].map((ex) => ({
    name: ex.name,
    detail: `${rounds}x${ex.reps} — descanso ${rest}s`,
    sets: rounds,
    reps: ex.reps,
    rest,
    key: ex.key,
    ...(ex.tip ? { tip: ex.tip } : {}),
  }));

  return {
    title: circuitTitles[v],
    sub: `${rounds} rounds · Bloco ${b}`,
    type: "circuit" as const,
    deload: dl,
    info: `${rounds} rounds completos · ${rest}s descanso entre exercícios`,
    warmup:
      "Air squats 2x10 · High knees 1x30s · Arm circles 1x20 · Light jog 3min",
    exercises: exerciseList,
    accessories: [],
  };
}

export function buildFatLossCircuit(
  week: number,
  b: number,
  dl: boolean,
): Session {
  const rounds = dl ? 3 : 3 + Math.min(b - 1, 2);
  const rest = dl ? 40 : Math.max(20, 40 - b * 5);
  const reps = (base: number) => base + b * 2;

  // 3 distinct metabolic circuit rotations
  const v = ((week - 1) % 3) + 1;

  type ExDef = {
    name: string;
    reps: number;
    weight?: boolean;
    key: string;
    tip?: string;
  };

  const circuits: Record<number, ExDef[]> = {
    1: [
      {
        name: "Goblet Squat",
        reps: reps(10),
        weight: true,
        key: "goblet_squat",
        tip: "Carga moderada. Cadência controlada.",
      },
      { name: "Push-up", reps: reps(8), key: "pushup_std" },
      { name: "DB Row", reps: reps(10), weight: true, key: "db_row" },
      {
        name: "Hip Thrust",
        reps: reps(12),
        weight: true,
        key: "hip_thrust",
        tip: "Pausa 1s no topo.",
      },
      {
        name: "Overhead Press",
        reps: reps(10),
        weight: true,
        key: "overhead_press",
        tip: "Núcleo activado. Não arquear lombares.",
      },
      { name: "Mountain Climbers", reps: 20 + b * 5, key: "mountain_climbers" },
      { name: "Lateral Skaters", reps: reps(12), key: "lateral_skaters" },
    ],
    2: [
      {
        name: "Sumo Squat (haltere)",
        reps: reps(10),
        weight: true,
        key: "goblet_squat",
        tip: "Pés abertos 45°. Profundidade máxima.",
      },
      {
        name: "Wide Push-up",
        reps: reps(8),
        key: "pushup_std",
        tip: "Mãos 1,5x largura ombros. Peito ao chão.",
      },
      {
        name: "Renegade Row",
        reps: reps(8),
        weight: true,
        key: "db_row",
        tip: "Core activo. Não rodar a anca.",
      },
      {
        name: "Glute Bridge (banda)",
        reps: reps(15),
        key: "hip_thrust",
        tip: "Banda acima joelhos. Espremar glúteo.",
      },
      {
        name: "DB Shoulder Press",
        reps: reps(10),
        weight: true,
        key: "overhead_press",
      },
      {
        name: "Jump Rope / High Knees",
        reps: 30 + b * 5,
        key: "high_knees",
        tip: "Manter cadência constante 20-30s.",
      },
      { name: "Jumping Jacks", reps: reps(15), key: "lateral_skaters" },
    ],
    3: [
      {
        name: "Romanian Deadlift",
        reps: reps(10),
        weight: true,
        key: "rdl",
        tip: "Quadril para trás. Isquiotibiais a trabalhar.",
      },
      {
        name: "Incline Push-up (pausa 1s fundo)",
        reps: reps(8),
        key: "pushup_std",
        tip: "Pausa 1s no peito. Explodir para cima.",
      },
      {
        name: "Chest-supported DB Row",
        reps: reps(10),
        weight: true,
        key: "db_row",
        tip: "Peito no banco. Cotovelos a 45°.",
      },
      {
        name: "Single-leg Hip Thrust",
        reps: reps(10),
        weight: true,
        key: "hip_thrust",
        tip: "Uma perna esticada. Quadril nivelado.",
      },
      {
        name: "Lateral Raise",
        reps: reps(12),
        weight: true,
        key: "rear_delt",
        tip: "Ligeira inclinação à frente. Controlo.",
      },
      {
        name: "Box Jumps",
        reps: 8 + b * 2,
        key: "box_jump",
        tip: "Aterrar suavemente. Joelhos fletidos.",
      },
      {
        name: "Donkey Kicks (banda)",
        reps: reps(15),
        key: "donkey_kicks",
        tip: "Core neutro. Não rodar o quadril.",
      },
    ],
  };

  const circuitTitles: Record<number, string> = {
    1: "Circuito Metabólico A",
    2: "Circuito Metabólico B",
    3: "Circuito Metabólico C",
  };

  const exerciseList = circuits[v].map((ex) => ({
    name: ex.name,
    detail: `${rounds}x${ex.reps}${ex.weight ? " (carga)" : ""} — descanso ${rest}s`,
    sets: rounds,
    reps: ex.reps,
    ...(ex.weight ? { weight: true } : {}),
    rest,
    key: ex.key,
    ...(ex.tip ? { tip: ex.tip } : {}),
  }));

  return {
    title: circuitTitles[v],
    sub: `${rounds} rounds · Queima de gordura`,
    type: "circuit" as const,
    deload: dl,
    info: `${rounds} rounds · Descanso ${rest}s entre exercícios · 2-3min entre rounds`,
    warmup:
      "Air squats 2x8 · Hip circles 2x8 · Arm circles 1x15 · Light jog 5min",
    exercises: exerciseList,
    accessories: [],
  };
}
