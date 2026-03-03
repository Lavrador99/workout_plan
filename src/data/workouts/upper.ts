import { UPPER_CYCLE } from "@/consts";
import type { Exercise, Session } from "@/types";
import { wavePct } from "@/utils/date";

function upperVersion(week: number): string {
  return UPPER_CYCLE[(week - 1) % UPPER_CYCLE.length];
}

export function buildUpper(week: number, b: number, dl: boolean): Session {
  const pct = wavePct(week);
  const v = upperVersion(week);

  const vLabels: Record<string, string> = {
    A: "FORÇA MÁXIMA",
    B: "RESISTÊNCIA",
    C: "ESTRUTURAL",
    D: "TRANSFERÊNCIA",
  };

  const exerciseMap: Record<string, Exercise[]> = {
    A: [
      {
        name: "Weighted Pull-ups",
        detail: `${dl ? "3x3" : "5x3"} @ ${pct} — descanso 3min`,
        sets: dl ? 3 : 5,
        reps: 3,
        weight: true,
        rest: 180,
        key: "weighted_pullup",
        tip: "Cinto de lastro, sem kipping. Pausa 1s no topo.",
      },
      {
        name: "Weighted Dips",
        detail: `${dl ? "3x3" : "5x3"} @ ${pct} — descanso 3min`,
        sets: dl ? 3 : 5,
        reps: 3,
        weight: true,
        rest: 180,
        key: "weighted_dips",
        tip: "Descer até braço paralelo ao chão.",
      },
      {
        name: "Barbell Row",
        detail: "4x5 @ 80% — descanso 2min",
        sets: 4,
        reps: 5,
        weight: true,
        rest: 120,
        key: "barbell_row",
        tip: "Pendlay Row. Costas paralelas ao chão.",
      },
      {
        name: "Pike Push-ups elevados",
        detail: "4x5 — descanso 90s",
        sets: 4,
        reps: 5,
        rest: 90,
        key: "pike_pushup_elevated",
        tip: "Pés em caixa 60cm.",
      },
      {
        name: "Rear Delt Raises",
        detail: "3x15 — descanso 60s",
        sets: 3,
        reps: 15,
        rest: 60,
        key: "rear_delt",
      },
      {
        name: "Hollow Body Hold",
        detail: "3x30s — descanso 30s",
        sets: 3,
        reps: 30,
        isHold: true,
        rest: 30,
        key: "hollow_body",
      },
    ],
    B: [
      {
        name: (
          {
            1: "Pull-ups grip largo",
            2: "Chin-ups supinação",
            3: "Mixed grip pull-ups",
            4: "Ring pull-ups",
          } as Record<number, string>
        )[b],
        detail: `${dl ? "3x8-10" : "4x10-15"} — descanso 90s`,
        sets: dl ? 3 : 4,
        reps: 12,
        rest: 90,
        key: "pullup_var",
      },
      {
        name: (
          {
            1: "Dips paralelas",
            2: "Ring dips (assistência)",
            3: "Ring dips rigorosos",
            4: "Dips pausa 2s",
          } as Record<number, string>
        )[b],
        detail: `${dl ? "3x8-10" : "4x10-15"} — descanso 90s`,
        sets: dl ? 3 : 4,
        reps: 12,
        rest: 90,
        key: "dip_var",
      },
      {
        name: "Australian Pull-ups",
        detail: "4x12-15 — descanso 90s",
        sets: 4,
        reps: 13,
        rest: 90,
        key: "australian_pullup",
      },
      {
        name: "Decline Push-ups",
        detail: "3x15 — descanso 60s",
        sets: 3,
        reps: 15,
        rest: 60,
        key: "decline_pushup",
      },
      {
        name: "Pike Push-ups",
        detail: "3x12 — descanso 60s",
        sets: 3,
        reps: 12,
        rest: 60,
        key: "pike_pushup",
      },
      {
        name: "Dead hang",
        detail: "3x30-45s — descanso 60s",
        sets: 3,
        reps: 40,
        isHold: true,
        rest: 60,
        key: "dead_hang",
      },
    ],
    C: [
      {
        name: (
          {
            1: "Chin-ups pausa 1s topo",
            2: "Chin-ups excêntrica 4s",
            3: "L-sit Chin-ups",
            4: "Ring Chin-ups",
          } as Record<number, string>
        )[b],
        detail: "4x8 — descanso 2min",
        sets: 4,
        reps: 8,
        rest: 120,
        key: "chinup_var",
      },
      {
        name: "Australian Pull-ups",
        detail: "4x12 — descanso 90s",
        sets: 4,
        reps: 12,
        rest: 90,
        key: "australian_pullup",
      },
      {
        name: "Pseudo Planche Push-ups",
        detail: "4x6 — descanso 2min",
        sets: 4,
        reps: 6,
        rest: 120,
        key: "pseudo_planche_pu",
        tip: "Dedos para trás, cotovelos junto ao corpo.",
      },
      {
        name: (
          {
            1: "DB Shoulder Press",
            2: "DB Arnold Press",
            3: "Landmine Press",
            4: "1-arm DB Press",
          } as Record<number, string>
        )[b],
        detail: "3x10 — descanso 90s",
        sets: 3,
        reps: 10,
        weight: true,
        rest: 90,
        key: "shoulder_press_var",
      },
      {
        name: "Rear Delt Raises",
        detail: "3x15 — descanso 60s",
        sets: 3,
        reps: 15,
        rest: 60,
        key: "rear_delt",
      },
      {
        name: "L-sit Hold",
        detail: "3x15-25s — descanso 60s",
        sets: 3,
        reps: 20,
        isHold: true,
        rest: 60,
        key: "lsit_hold",
      },
    ],
    D: [
      {
        name: "Pull-ups excêntrica 5s",
        detail: `${dl ? "3x4" : "4x5"} — descanso 2min`,
        sets: dl ? 3 : 4,
        reps: 5,
        rest: 120,
        key: "pullup_eccentric",
        tip: "5s descida controlada. Usar lastro se necessário.",
      },
      {
        name: "Dips excêntrica 5s",
        detail: `${dl ? "3x4" : "4x5"} — descanso 2min`,
        sets: dl ? 3 : 4,
        reps: 5,
        rest: 120,
        key: "dip_eccentric",
        tip: "5s descida. Sem bounce. Pausa 1s baixo.",
      },
      {
        name: "Front Support Hold (paralelas)",
        detail: "4x20-30s — descanso 90s",
        sets: 4,
        reps: 25,
        isHold: true,
        rest: 90,
        key: "front_support_hold",
        tip: "Depressão escapular total. Braços retos.",
      },
      {
        name: "Diamond Push-ups",
        detail: "3x12 — descanso 60s",
        sets: 3,
        reps: 12,
        rest: 60,
        key: "diamond_pushup",
      },
      {
        name: "Australian Pull-ups (4s excêntrica)",
        detail: "3x10 — descanso 90s",
        sets: 3,
        reps: 10,
        rest: 90,
        key: "australian_tempo",
      },
      {
        name: "Hollow Body Hold",
        detail: "3x30s — descanso 30s",
        sets: 3,
        reps: 30,
        isHold: true,
        rest: 30,
        key: "hollow_body",
      },
    ],
  };

  return {
    title: `Upper Body — ${vLabels[v]}`,
    sub: `Bloco ${b} · ${dl ? "Deload" : "Semana " + week}`,
    deload: dl,
    warmup:
      "Arm circles 2x10 · Dead hang 2x20s · Pike push-ups 2x5 · Hollow body 1x20s",
    exercises: exerciseMap[v] ?? [],
    accessories: [],
  };
}
