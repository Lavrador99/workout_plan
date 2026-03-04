import type { Session } from "@/types";

export function buildHandstand(week: number, b: number, dl: boolean): Session {
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
        name: "Wall Handstand (peito p/ parede)",
        detail: `${dl ? "4x20s" : "5x30-45s"} — descanso 90s`,
        sets: dl ? 4 : 5,
        reps: 37,
        isHold: true,
        rest: 90,
        key: "wall_hs",
        tip: "Corpo rígido, linha perfeita. Olhos para o chão.",
      },
      {
        name: "Kick-up para parede",
        detail: `${dl ? "4x5" : "5x8"} tentativas — descanso 60s`,
        sets: dl ? 4 : 5,
        reps: 8,
        rest: 60,
        key: "kickup",
        tip: "Controlar kick-up. Não bater na parede com força.",
      },
      {
        name: "Tuck Handstand balance",
        detail: `${dl ? "4x10s" : "5x15s"} — descanso 2min`,
        sets: dl ? 3 : 5,
        reps: 15,
        isHold: true,
        rest: 120,
        key: "tuck_hs",
      },
      {
        name: "Handstand Shoulder Shrugs",
        detail: "3x10 — descanso 60s",
        sets: 3,
        reps: 10,
        rest: 60,
        key: "hs_shrugs",
        tip: "Serratus anterior. Empurrar chão activamente.",
      },
      {
        name: "Pike Push-ups",
        detail: "3x8 — descanso 90s",
        sets: 3,
        reps: 8,
        rest: 90,
        key: "pike_pushup",
      },
    ],
    2: [
      {
        name: "Wall Handstand (costas p/ parede)",
        detail: `${dl ? "4x25s" : "5x40-60s"} — descanso 90s`,
        sets: dl ? 4 : 5,
        reps: 50,
        isHold: true,
        rest: 90,
        key: "wall_hs_back",
        tip: "Construção de corpo rígido e linha. Base para freestanding.",
      },
      {
        name: "Tuck HS → Extend tentativas",
        detail: `${dl ? "4x5" : "5x8"} — descanso 2min`,
        sets: dl ? 4 : 5,
        reps: 8,
        rest: 120,
        key: "tuck_hs_extend",
        tip: "Extensão das pernas devagar, manter equilíbrio.",
      },
      {
        name: "Freestanding HS tentativas",
        detail: `${dl ? "4x20s" : "6x30s"} total — descanso 90s`,
        sets: dl ? 4 : 6,
        reps: 30,
        isHold: true,
        rest: 90,
        key: "freestanding_hs",
        tip: "Usar fingertips para ajuste. Bail para cartwheel.",
      },
      {
        name: "HSPU na parede",
        detail: `${dl ? "3x4" : "4x6"} — descanso 2min`,
        sets: dl ? 3 : 4,
        reps: 6,
        rest: 120,
        key: "wall_hspu",
        tip: "Topo da cabeça não chega ao chão. Full ROM.",
      },
      {
        name: "Pike Push-ups pesados",
        detail: "3x6 — descanso 2min",
        sets: 3,
        reps: 6,
        rest: 120,
        key: "pike_pushup_heavy",
      },
    ],
    3: [
      {
        name: "Freestanding HS (consistência)",
        detail: `${dl ? "4x25s" : "8x30s"} total — descanso 60s`,
        sets: dl ? 4 : 8,
        reps: 30,
        isHold: true,
        rest: 60,
        key: "freestanding_hs",
        tip: "Meta: 8s cada tentativa. Registar melhor do dia.",
      },
      {
        name: "HS Walk tentativas",
        detail: `${dl ? "4x5" : "5x10"} passos — descanso 2min`,
        sets: dl ? 4 : 5,
        reps: 10,
        rest: 120,
        key: "hs_walk",
      },
      {
        name: "HSPU na parede",
        detail: `${dl ? "3x5" : "4x8"} — descanso 2min`,
        sets: dl ? 3 : 4,
        reps: 8,
        rest: 120,
        key: "wall_hspu",
      },
      {
        name: "One-arm HS tentativas (parede)",
        detail: "3x8s/lado — descanso 2min",
        sets: 3,
        reps: 8,
        isHold: true,
        rest: 120,
        key: "one_arm_hs",
        tip: "Mão afastada 10cm da parede. Apoio mínimo.",
      },
    ],
    4: [
      {
        name: "Freestanding HS (volume)",
        detail: `${dl ? "5x25s" : "10x30s"} total — descanso 45s`,
        sets: dl ? 5 : 10,
        reps: 30,
        isHold: true,
        rest: 45,
        key: "freestanding_hs",
      },
      {
        name: "One-arm HS (parede)",
        detail: `${dl ? "3x8s" : "4x12s"}/lado — descanso 2min`,
        sets: dl ? 3 : 4,
        reps: 12,
        isHold: true,
        rest: 120,
        key: "one_arm_hs",
      },
      {
        name: "HS Walk distância",
        detail: `${dl ? "3x10" : "4x20"} passos — descanso 2min`,
        sets: dl ? 3 : 4,
        reps: 20,
        rest: 120,
        key: "hs_walk",
      },
      {
        name: "HSPU freestanding tentativas",
        detail: "3x3 — descanso 3min",
        sets: 3,
        reps: 3,
        rest: 180,
        key: "wall_hspu",
        tip: "Se ainda não tens: HSPU parede com máximo ROM.",
      },
    ],
  };

  return {
    title: "Handstand",
    sub: `Bloco ${b} · Progressão GST`,
    deload: dl,
    warmup:
      "Wrist flexibility 2min · Shoulder CARs 2x5 · Wall handstand 2x20s · Pike PU 2x6",
    exercises: prog[b] ?? prog[1],
    accessories: [],
  };
}
