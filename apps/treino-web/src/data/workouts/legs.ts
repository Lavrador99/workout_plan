import type { Exercise, Session } from "@/types";
import { wavePct } from "@/utils/date";

/**
 * 4-rotation cycle within each force / volume pattern.
 * r = 1..4 cycles every 4 weeks → 8 distinct leg workouts before repeating.
 */
function legRot(week: number): 1 | 2 | 3 | 4 {
  return (((week - 1) % 4) + 1) as 1 | 2 | 3 | 4;
}

// ─── FORCE DAYS (odd weeks) ──────────────────────────────────────────────────

function forceExercises(week: number, b: number, dl: boolean): Exercise[] {
  const pct = wavePct(week);
  const r = legRot(week);

  const posterior: Record<1 | 2 | 3 | 4, Exercise> = {
    1: {
      name: "RDL",
      detail: `${dl ? "3x5" : "4x5"} @ 75% — descanso 2min`,
      sets: dl ? 3 : 4,
      reps: 5,
      weight: true,
      rest: 120,
      key: "rdl",
      tip: "Quadril para trás. Sentir isquiotibiais. Coluna neutra.",
    },
    2: {
      name: "Good Mornings",
      detail: `${dl ? "3x6" : "4x6"} @ moderado — descanso 2min`,
      sets: dl ? 3 : 4,
      reps: 6,
      weight: true,
      rest: 120,
      key: "good_mornings",
      tip: "Barra nos trapézios, joelhos ligeiramente fletidos. Quadril para trás.",
    },
    3: {
      name: "Pause RDL (2s fundo)",
      detail: `${dl ? "3x5" : "4x5"} @ 70% — descanso 2min`,
      sets: dl ? 3 : 4,
      reps: 5,
      weight: true,
      rest: 120,
      key: "rdl",
      tip: "Pausa 2s no fundo. Máxima tensão isquiotibiais.",
    },
    4: {
      name: "Stiff-leg Deadlift",
      detail: `${dl ? "3x6" : "4x6"} @ 70% — descanso 2min`,
      sets: dl ? 3 : 4,
      reps: 6,
      weight: true,
      rest: 120,
      key: "rdl",
      tip: "Pernas praticamente retas. Barra próxima das pernas.",
    },
  };

  const unilateral: Record<1 | 2 | 3 | 4, Exercise> = {
    1: {
      name: "Bulgarian Split Squat",
      detail: `${dl ? "2x6" : "3x8"}/lado — descanso 90s`,
      sets: dl ? 2 : 3,
      reps: 8,
      weight: true,
      rest: 90,
      key: "bulgarian_squat",
      tip: "Joelho traseiro apontar ao chão. Tronco perpendicular.",
    },
    2: {
      name: "Pause Split Squat (2s fundo)",
      detail: `${dl ? "2x6" : "3x6"}/lado — descanso 90s`,
      sets: dl ? 2 : 3,
      reps: 6,
      weight: true,
      rest: 90,
      key: "bulgarian_squat",
      tip: "Pausa 2s fundo. Joelhos sobre dedos.",
    },
    3: {
      name: "Front-foot Elevated Split Squat",
      detail: `${dl ? "2x6" : "3x8"}/lado — descanso 90s`,
      sets: dl ? 2 : 3,
      reps: 8,
      weight: true,
      rest: 90,
      key: "split_squat_elevated",
      tip: "Pé da frente elevado 10-15cm. ROM máximo.",
    },
    4: {
      name: "Rear-foot Elevated (KB)",
      detail: `${dl ? "2x8" : "3x10"}/lado — descanso 90s`,
      sets: dl ? 2 : 3,
      reps: 10,
      weight: true,
      rest: 90,
      key: "bulgarian_squat",
      tip: "Kettlebell em cada mão. Amplitude completa.",
    },
  };

  const hamstring: Record<1 | 2 | 3 | 4, Exercise> = {
    1: {
      name: "Nordic Curl",
      detail: `${dl ? "2x4" : "3x5"} — descanso 2min`,
      sets: dl ? 2 : 3,
      reps: 5,
      rest: 120,
      key: "nordic_curl",
      tip: "Excêntrica máxima. Usar mãos para subir.",
    },
    2: {
      name: "Hamstring Walkout",
      detail: `${dl ? "2x6" : "3x8"} — descanso 90s`,
      sets: dl ? 2 : 3,
      reps: 8,
      rest: 90,
      key: "hamstring_walkout",
      tip: "Core activado. Caminhar com calcanhares para fora e voltar.",
    },
    3: {
      name: "Nordic Curl excêntrica",
      detail: `${dl ? "2x5" : "3x6"} — descanso 2min`,
      sets: dl ? 2 : 3,
      reps: 6,
      rest: 120,
      key: "nordic_curl",
      tip: "Só descida. 4-5s a descer. Usar mãos no solo.",
    },
    4: {
      name: "Sliding Leg Curl",
      detail: `${dl ? "2x8" : "3x10"} — descanso 90s`,
      sets: dl ? 2 : 3,
      reps: 10,
      rest: 90,
      key: "leg_curl_sliding",
      tip: "Meias num chão liso. Quadril elevado. Core rígido.",
    },
  };

  const plyoFinisher: Record<1 | 2 | 3 | 4, Exercise> = {
    1: {
      name: "Pogo Jumps",
      detail: "3x20 — descanso 60s",
      sets: 3,
      reps: 20,
      rest: 60,
      key: "pogo_jumps",
      tip: "Contacto mínimo com o chão. Tornozelo rígido.",
    },
    2: {
      name: "Box Jump",
      detail: `${dl ? "3x3" : "4x5"} — descanso 90s`,
      sets: dl ? 3 : 4,
      reps: 5,
      rest: 90,
      key: "box_jump",
      tip: "Aterrar suavemente. Descer ao lado da caixa.",
    },
    3: {
      name: "Broad Jump",
      detail: "3x5 — descanso 90s",
      sets: 3,
      reps: 5,
      rest: 90,
      key: "broad_jump",
      tip: "Salto em comprimento máximo. Aterrar com joelhos fletidos.",
    },
    4: {
      name: "Depth Drop",
      detail: "3x5 — descanso 90s",
      sets: 3,
      reps: 5,
      rest: 90,
      key: "depth_drop",
      tip: "Cair da caixa e absorver contacto silenciosamente.",
    },
  };

  return [
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
    posterior[r],
    unilateral[r],
    hamstring[r],
    {
      name: "Single-leg Calf Raises",
      detail: `${dl ? "2x12" : "3x15-20"} — descanso 45s`,
      sets: dl ? 2 : 3,
      reps: 17,
      rest: 45,
      key: "calf_raises",
    },
    plyoFinisher[r],
  ];
}

// ─── VOLUME DAYS (even weeks) ────────────────────────────────────────────────

function volumeExercises(week: number, b: number, dl: boolean): Exercise[] {
  const r = legRot(week);

  const quad: Record<1 | 2 | 3 | 4, Exercise> = {
    1: {
      name: "Goblet Squat",
      detail: `${dl ? "3x8" : "4x10"} — descanso 90s`,
      sets: dl ? 3 : 4,
      reps: 10,
      weight: true,
      rest: 90,
      key: "goblet_squat",
      tip: "Cotovelos altos. Descer profundo.",
    },
    2: {
      name: "Front Squat",
      detail: `${dl ? "3x6" : "4x8"} — descanso 2min`,
      sets: dl ? 3 : 4,
      reps: 8,
      weight: true,
      rest: 120,
      key: "front_squat",
      tip: "Cotovelos altos. Vídeo lateral.",
    },
    3: {
      name: "Hack Squat / Leg Press",
      detail: `${dl ? "3x8" : "4x10"} — descanso 90s`,
      sets: dl ? 3 : 4,
      reps: 10,
      weight: true,
      rest: 90,
      key: "hack_squat",
      tip: "Pés na largura dos ombros. Descer profundo.",
    },
    4: {
      name: "Box Squat (pausa)",
      detail: `${dl ? "3x6" : "4x8"} @ 70% — descanso 2min`,
      sets: dl ? 3 : 4,
      reps: 8,
      weight: true,
      rest: 120,
      key: "box_squat",
      tip: "Sentar 1-2s. Explodir para cima sem bounce.",
    },
  };

  const hip: Record<1 | 2 | 3 | 4, Exercise> = {
    1: {
      name: "Hip Thrust",
      detail: `${dl ? "3x10" : `${3 + b}x${8 + b * 2}`} — descanso 90s`,
      sets: dl ? 3 : 3 + b,
      reps: 8 + b * 2,
      weight: true,
      rest: 90,
      key: "hip_thrust",
      tip: "Espremendo glúteo no topo. Queixo dentro.",
    },
    2: {
      name: "Hip Thrust pausa 2s topo",
      detail: `${dl ? "3x8" : `${2 + b}x${8 + b}`} — descanso 90s`,
      sets: dl ? 3 : 2 + b,
      reps: 8 + b,
      weight: true,
      rest: 90,
      key: "hip_thrust",
      tip: "Pausa 2s no topo! Máxima contracção glútea.",
    },
    3: {
      name: "Romanian Deadlift (volume)",
      detail: `${dl ? "3x8" : "4x10"} — descanso 2min`,
      sets: dl ? 3 : 4,
      reps: 10,
      weight: true,
      rest: 120,
      key: "rdl",
      tip: "Quadril para trás até sentir isquiotibiais.",
    },
    4: {
      name: "Sumo Deadlift",
      detail: `${dl ? "3x8" : "4x10"} — descanso 2min`,
      sets: dl ? 3 : 4,
      reps: 10,
      weight: true,
      rest: 120,
      key: "sumo_deadlift",
      tip: "Pés abertos 45°. Coluna neutra. Quadril conduz.",
    },
  };

  const uniLeg: Record<1 | 2 | 3 | 4, Exercise> = {
    1: {
      name: "Walking Lunges",
      detail: `${dl ? "2x8" : "3x12"}/lado — descanso 90s`,
      sets: dl ? 2 : 3,
      reps: 12,
      rest: 90,
      key: "lunges_var",
      tip: "Passo largo. Joelho da frente 90°.",
    },
    2: {
      name: "Reverse Lunges (halteres)",
      detail: `${dl ? "2x8" : "3x12"}/lado — descanso 90s`,
      sets: dl ? 2 : 3,
      reps: 12,
      weight: true,
      rest: 90,
      key: "lunges_var",
      tip: "Passo para trás. Joelho quase toca no chão.",
    },
    3: {
      name: "Step-ups caixa alta",
      detail: `${dl ? "2x8" : "3x10"}/lado — descanso 60s`,
      sets: dl ? 2 : 3,
      reps: 10,
      weight: true,
      rest: 60,
      key: "step_ups",
      tip: "Caixa 50-60cm. Calcâneo empurra. Tronco erecto.",
    },
    4: {
      name: "Single-leg Leg Press",
      detail: `${dl ? "2x10" : "3x12"}/lado — descanso 90s`,
      sets: dl ? 2 : 3,
      reps: 12,
      weight: true,
      rest: 90,
      key: "leg_press",
      tip: "Pé alto na plataforma. Amplitude máxima.",
    },
  };

  const isolation: Record<1 | 2 | 3 | 4, Exercise> = {
    1: {
      name: "Tibialis Raises",
      detail: "3x15 — descanso 30s",
      sets: 3,
      reps: 15,
      rest: 30,
      key: "tibialis_raises",
    },
    2: {
      name: "Leg Curl (máquina)",
      detail: `${dl ? "3x12" : "4x15"} — descanso 60s`,
      sets: dl ? 3 : 4,
      reps: 15,
      rest: 60,
      key: "leg_curl",
      tip: "Enrolar calcâneo ao glúteo. Controlo excêntrico.",
    },
    3: {
      name: "Hip Abduction (máquina/banda)",
      detail: `${dl ? "2x15" : "3x20"} — descanso 60s`,
      sets: dl ? 2 : 3,
      reps: 20,
      rest: 60,
      key: "hip_abduction",
    },
    4: {
      name: "Single-leg Step-down",
      detail: "3x10/lado — descanso 60s",
      sets: 3,
      reps: 10,
      rest: 60,
      key: "step_down",
      tip: "Controlo excêntrico. Joelho alinhado sobre pé.",
    },
  };

  return [
    quad[r],
    hip[r],
    uniLeg[r],
    isolation[r],
    {
      name: "Single-leg Calf Raise",
      detail: `${dl ? "2x12" : "3x15"} — descanso 45s`,
      sets: dl ? 2 : 3,
      reps: 15,
      rest: 45,
      key: "calf_raises",
    },
    r <= 2
      ? {
          name: "Donkey Kicks (banda)",
          detail: `${dl ? "2x12" : "3x15"}/lado — descanso 45s`,
          sets: dl ? 2 : 3,
          reps: 15,
          rest: 45,
          key: "donkey_kicks",
          tip: "Core estável. Não rotacionar o quadril.",
        }
      : {
          name: "Side-lying Hip Abduction",
          detail: `${dl ? "2x15" : "3x20"}/lado — descanso 30s`,
          sets: dl ? 2 : 3,
          reps: 20,
          rest: 30,
          key: "hip_abduction_side",
        },
  ];
}

// ─── MAIN BUILDER ────────────────────────────────────────────────────────────

export function buildLegs(week: number, b: number, dl: boolean): Session {
  const force = week % 2 === 1;
  const r = legRot(week);
  const vLabels = {
    force: { 1: "Força A", 2: "Força B", 3: "Força C", 4: "Força D" } as Record<
      number,
      string
    >,
    volume: {
      1: "Volume A",
      2: "Volume B",
      3: "Volume C",
      4: "Volume D",
    } as Record<number, string>,
  };
  const label = force ? vLabels.force[r] : vLabels.volume[r];

  return {
    title: `Pernas — ${force ? "Força" : "Volume"}`,
    sub: `Bloco ${b} · ${dl ? "Deload" : label}`,
    deload: dl,
    warmup:
      "Air squats 2x10 · Hip circles 2x10 · Cossack squat 2x5/lado · Hip 90/90 2x30s",
    exercises: force
      ? forceExercises(week, b, dl)
      : volumeExercises(week, b, dl),
    accessories: [],
  };
}
