import type { Session } from "@/types";

export function buildPlanche(week: number, b: number, dl: boolean): Session {
  const prog: Record<
    number,
    Array<{
      name: string;
      detail: string;
      sets: number;
      reps: number;
      isHold?: boolean;
      rest: number;
      key: string;
      tip?: string;
    }>
  > = {
    1: [
      {
        name: "Planche Lean",
        detail: `${dl ? "4x20s" : "5x20-30s"} — descanso 90s`,
        sets: dl ? 4 : 5,
        reps: 25,
        isHold: true,
        rest: 90,
        key: "planche_lean",
        tip: "Ombros à frente dos pulsos. Corpo rígido.",
      },
      {
        name: "Tuck Planche Hold",
        detail: `${dl ? "4x8s" : "5x8-12s"} — descanso 2min`,
        sets: dl ? 4 : 5,
        reps: 10,
        isHold: true,
        rest: 120,
        key: "tuck_planche",
        tip: "Quadril ao nível dos ombros. Costas arredondadas.",
      },
      {
        name: "Pseudo Planche Push-ups",
        detail: `${dl ? "3x6" : "4x8"} — descanso 2min`,
        sets: dl ? 3 : 4,
        reps: 8,
        rest: 120,
        key: "pseudo_planche_pu",
      },
      {
        name: "Hollow Body Rocks",
        detail: "3x10 — descanso 60s",
        sets: 3,
        reps: 10,
        rest: 60,
        key: "hollow_body_rocks",
      },
      {
        name: "Scapula Protraction Push-ups",
        detail: "3x10 — descanso 60s",
        sets: 3,
        reps: 10,
        rest: 60,
        key: "scapula_protraction",
      },
    ],
    2: [
      {
        name: "Adv Tuck Planche Hold",
        detail: `${dl ? "4x8s" : "5x10-15s"} — descanso 2min`,
        sets: dl ? 4 : 5,
        reps: 12,
        isHold: true,
        rest: 120,
        key: "adv_tuck_planche",
        tip: "Joelhos afastados do peito. Quadil alto.",
      },
      {
        name: "Planche Negativa",
        detail: `${dl ? "4x4" : "5x5"} 4s ecc — descanso 2min`,
        sets: dl ? 4 : 5,
        reps: 5,
        rest: 120,
        key: "planche_negative",
        tip: "4s descida de tuck para planche lean.",
      },
      {
        name: "Pseudo Planche PU elevados",
        detail: `${dl ? "3x6" : "4x8"} — descanso 90s`,
        sets: dl ? 3 : 4,
        reps: 8,
        rest: 90,
        key: "pseudo_planche_pu_elevated",
      },
      {
        name: "Maltese Protraction (argolas)",
        detail: "3x10 — descanso 90s",
        sets: 3,
        reps: 10,
        rest: 90,
        key: "maltese_protraction",
      },
      {
        name: "Ring Support Hold",
        detail: "4x20-30s — descanso 90s",
        sets: 4,
        reps: 25,
        isHold: true,
        rest: 90,
        key: "ring_support_hold",
      },
    ],
    3: [
      {
        name: "Straddle Planche tentativa",
        detail: `${dl ? "3x5s" : "4x6-10s"} — descanso 2min`,
        sets: dl ? 3 : 4,
        reps: 8,
        isHold: true,
        rest: 120,
        key: "straddle_planche",
      },
      {
        name: "Adv Tuck Negativa",
        detail: `${dl ? "4x4" : "5x5"} 5s ecc — descanso 2min`,
        sets: dl ? 4 : 5,
        reps: 5,
        rest: 120,
        key: "adv_tuck_negative",
      },
      {
        name: "Pseudo Planche Deficit",
        detail: `${dl ? "3x5" : "4x6"} — descanso 90s`,
        sets: dl ? 3 : 4,
        reps: 6,
        rest: 90,
        key: "pseudo_planche_deficit",
      },
      {
        name: "Planche Press Negativa (mural)",
        detail: "3x4 — descanso 2min",
        sets: 3,
        reps: 4,
        rest: 120,
        key: "planche_press_neg",
      },
    ],
    4: [
      {
        name: "Straddle Planche Hold",
        detail: `${dl ? "3x6s" : "4x8-12s"} — descanso 2min`,
        sets: dl ? 3 : 4,
        reps: 10,
        isHold: true,
        rest: 120,
        key: "straddle_planche",
      },
      {
        name: "Straddle Negativa mural",
        detail: `${dl ? "3x4" : "4x5"} 6s ecc — descanso 2min`,
        sets: dl ? 3 : 4,
        reps: 5,
        rest: 120,
        key: "straddle_neg_wall",
      },
      {
        name: "Ring Support Inclinado",
        detail: "4x25-35s — descanso 90s",
        sets: 4,
        reps: 30,
        isHold: true,
        rest: 90,
        key: "support_hold_inclined",
      },
    ],
  };

  return {
    title: "Planche",
    sub: `Bloco ${b} · Progressão GST`,
    deload: dl,
    warmup:
      "Wrist flexibility 3min · Planche lean passivo 2x20s · Pseudo planche PU 2x6 · Hollow body 1x30s",
    exercises: prog[b] ?? prog[1],
    accessories: [],
  };
}
