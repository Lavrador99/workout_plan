import type { Exercise, SessionType } from "@/types";

export function getAccessories(
  type: SessionType,
  b: number,
  dl: boolean,
): Exercise[] {
  const map: Record<string, () => Exercise[]> = {
    upper: () => {
      if (dl)
        return [
          {
            name: "Wall Slides",
            detail: "2x10 — descanso 30s",
            sets: 2,
            reps: 10,
            rest: 30,
            key: "acc_wall_slides",
            tip: "Serratus + rotadores externos. Pressão mínima na parede.",
          },
          {
            name: "Pec Stretch (parede)",
            detail: "2x60s/lado",
            sets: 2,
            reps: 60,
            isHold: true,
            rest: 10,
            key: "acc_pec_stretch",
          },
          {
            name: "Thoracic Extension (foam roller)",
            detail: "2x60s — 5 segmentos",
            sets: 2,
            reps: 60,
            isHold: true,
            rest: 15,
            key: "acc_thoracic_ext",
            tip: "10 extensões por posição. Não forçar.",
          },
        ];
      return [
        {
          name: "Face Pull (banda)",
          detail: `3x${12 + b * 2} — descanso 45s`,
          sets: 3,
          reps: 12 + b * 2,
          rest: 45,
          key: "acc_face_pull",
          tip: "Cotovelos altos. Rotação externa máxima. Saúde do ombro!",
        },
        {
          name: "Ab Wheel Rollout",
          detail: `3x${6 + b * 2} — descanso 60s`,
          sets: 3,
          reps: 6 + b * 2,
          rest: 60,
          key: "acc_ab_wheel",
          tip: "Lombar colada. Parar antes de perder tensão.",
        },
        {
          name: "Copenhagen Plank",
          detail: `3x${15 + b * 5}s/lado — descanso 45s`,
          sets: 3,
          reps: 15 + b * 5,
          isHold: true,
          rest: 45,
          key: "acc_cph_plank",
          tip: "Adutores e estabilidade pélvica lateral.",
        },
        {
          name: "L-sit Hold",
          detail: `3x${8 + b * 4}s — descanso 60s`,
          sets: 3,
          reps: 8 + b * 4,
          isHold: true,
          rest: 60,
          key: "acc_lsit",
          tip: "Dedo indicador para dentro, afastar escápulas.",
        },
        {
          name: "Wrist Flexibility Routine",
          detail: "5min — 8 exercícios",
          sets: 1,
          reps: 1,
          rest: 10,
          key: "acc_wrist_flex",
          tip: "Obrigatório. Protege os pulsos a longo prazo.",
        },
      ];
    },

    front_lever: () => {
      if (dl)
        return [
          {
            name: "Thoracic CARs",
            detail: "2x5/lado — mobilidade activa",
            sets: 2,
            reps: 5,
            rest: 15,
            key: "acc_thoracic_cars",
          },
          {
            name: "Shoulder Extension Stretch",
            detail: "2x60s — pec + coracobraquial",
            sets: 2,
            reps: 60,
            isHold: true,
            rest: 10,
            key: "acc_shoulder_ext",
          },
        ];
      return [
        {
          name: "Ab Wheel Rollout",
          detail: `3x${6 + b * 2} — descanso 60s`,
          sets: 3,
          reps: 6 + b * 2,
          rest: 60,
          key: "acc_ab_wheel",
        },
        {
          name: "Pallof Press (banda)",
          detail: `3x${10 + b * 2}/lado — descanso 45s`,
          sets: 3,
          reps: 10 + b * 2,
          rest: 45,
          key: "acc_pallof_press",
          tip: "Anti-rotação. Braços retos na extensão.",
        },
        {
          name: "L-sit / Tuck L-sit",
          detail: `3x${10 + b * 5}s — descanso 60s`,
          sets: 3,
          reps: 10 + b * 5,
          isHold: true,
          rest: 60,
          key: b < 3 ? "acc_lsit_tuck" : "acc_lsit",
        },
        {
          name: "Jefferson Curl",
          detail: `3x6 @ carga leve — descanso 60s`,
          sets: 3,
          reps: 6,
          weight: true,
          rest: 60,
          key: "acc_jefferson_curl",
          tip: "Vértebra a vértebra. Desdramaticamente lento. Peso leve!",
        },
        {
          name: "Wrist Flexibility Routine",
          detail: "5min circular",
          sets: 1,
          reps: 1,
          rest: 10,
          key: "acc_wrist_flex",
        },
      ];
    },

    planche: () => {
      if (dl)
        return [
          {
            name: "Wrist Flexibility Routine",
            detail: "5min — recuperação activa",
            sets: 1,
            reps: 1,
            rest: 10,
            key: "acc_wrist_flex",
          },
          {
            name: "Thoracic Extension",
            detail: "2x60s foam roller",
            sets: 2,
            reps: 60,
            isHold: true,
            rest: 10,
            key: "acc_thoracic_ext",
          },
        ];
      return [
        {
          name: "Wrist Flexibility Routine",
          detail: "5min obrigatório",
          sets: 1,
          reps: 1,
          rest: 10,
          key: "acc_wrist_flex",
          tip: "Pré E pós treino. Progressão lenta.",
        },
        {
          name: "L-sit Hold",
          detail: `3x${10 + b * 5}s — descanso 60s`,
          sets: 3,
          reps: 10 + b * 5,
          isHold: true,
          rest: 60,
          key: "acc_lsit",
        },
        {
          name: "Hollow Body Hold",
          detail: `3x${20 + b * 5}s — descanso 45s`,
          sets: 3,
          reps: 20 + b * 5,
          isHold: true,
          rest: 45,
          key: "hollow_body",
        },
        {
          name: "Face Pull",
          detail: `3x${12 + b * 2} — descanso 45s`,
          sets: 3,
          reps: 12 + b * 2,
          rest: 45,
          key: "acc_face_pull",
        },
        {
          name: "Shoulder Extension Stretch",
          detail: "3x60s — pecs e torac",
          sets: 3,
          reps: 60,
          isHold: true,
          rest: 10,
          key: "acc_shoulder_ext",
          tip: "Essencial para amplitude de planche.",
        },
      ];
    },

    handstand: () => {
      if (dl)
        return [
          {
            name: "Wrist Flexibility Routine",
            detail: "5min mobilidade wrist",
            sets: 1,
            reps: 1,
            rest: 10,
            key: "acc_wrist_flex",
          },
          {
            name: "Wall Slides",
            detail: "2x10 — serratus",
            sets: 2,
            reps: 10,
            rest: 30,
            key: "acc_wall_slides",
          },
        ];
      return [
        {
          name: "Wrist Flexibility Routine",
          detail: "5min — antes e depois",
          sets: 1,
          reps: 1,
          rest: 10,
          key: "acc_wrist_flex",
          tip: "Extensão, flexão, círculos, dedos. 30s cada.",
        },
        {
          name: "Thoracic Extension (foam roller)",
          detail: `2x60s — ${5 + b} pontos`,
          sets: 2,
          reps: 60,
          isHold: true,
          rest: 15,
          key: "acc_thoracic_ext",
          tip: "Extensão torácica = topo do handstand.",
        },
        {
          name: "Shoulder Extension Passive Stretch",
          detail: `3x${45 + b * 5}s — descanso 10s`,
          sets: 3,
          reps: 45 + b * 5,
          isHold: true,
          rest: 10,
          key: "acc_shoulder_ext",
          tip: "Linha overhead perfeita = ombros completamente abertos.",
        },
        {
          name: "Ab Wheel Rollout",
          detail: `3x${5 + b * 2} — descanso 60s`,
          sets: 3,
          reps: 5 + b * 2,
          rest: 60,
          key: "acc_ab_wheel",
          tip: "Core compacto = handstand estável.",
        },
      ];
    },

    legs: () => {
      if (dl)
        return [
          {
            name: "Hip 90/90 Mobility",
            detail: "2x60s/lado",
            sets: 2,
            reps: 60,
            isHold: true,
            rest: 10,
            key: "acc_hip_90_90",
          },
          {
            name: "Pigeon Pose",
            detail: "2x90s/lado",
            sets: 2,
            reps: 90,
            isHold: true,
            rest: 10,
            key: "acc_pigeon",
          },
          {
            name: "Calf Stretch (mural)",
            detail: "2x60s/lado",
            sets: 2,
            reps: 60,
            isHold: true,
            rest: 10,
            key: "acc_calf_stretch",
          },
        ];
      return [
        {
          name: "Copenhagen Plank",
          detail: `3x${15 + b * 5}s/lado — descanso 45s`,
          sets: 3,
          reps: 15 + b * 5,
          isHold: true,
          rest: 45,
          key: "acc_cph_plank",
        },
        {
          name: "Ankle Mobility (wall drill)",
          detail: `3x${8 + b * 2}/lado — descanso 30s`,
          sets: 3,
          reps: 8 + b * 2,
          rest: 30,
          key: "acc_ankle_wall",
          tip: "Joelho sobre 5º dedo. Calcâneio no chão.",
        },
        {
          name: "Cossack Squat",
          detail: `3x${5 + b * 2}/lado — descanso 60s`,
          sets: 3,
          reps: 5 + b * 2,
          rest: 60,
          key: "acc_cossack_squat",
          tip: "Progressão: mão no chão → DB → barra.",
        },
        {
          name: "Pigeon Pose",
          detail: `${b >= 3 ? 3 : 2}x${60 + b * 10}s/lado`,
          sets: b >= 3 ? 3 : 2,
          reps: 60 + b * 10,
          isHold: true,
          rest: 10,
          key: "acc_pigeon",
          tip: "Quadril frontal horizontal. Respiração profunda.",
        },
        {
          name: "Ankle CARs",
          detail: `2x${5 + b}/lado — descanso 15s`,
          sets: 2,
          reps: 5 + b,
          rest: 15,
          key: "acc_ankle_cars",
          tip: "Articulação completa. Isolar tornozelo.",
        },
      ];
    },

    long_run: () => {
      const sets = dl ? 2 : 2;
      return [
        {
          name: "Pigeon Pose",
          detail: `${sets}x90s/lado — ainda quente pós-corrida`,
          sets,
          reps: 90,
          isHold: true,
          rest: 10,
          key: "acc_pigeon",
          tip: "Quadril frontal horizontal ao chão. Respiração diafragmática.",
        },
        {
          name: "Hip Flexor Stretch (meia-lunge)",
          detail: `${sets}x60s/lado`,
          sets,
          reps: 60,
          isHold: true,
          rest: 10,
          key: "acc_hip_flexor",
          tip: "Pelvis retrovertida activamente. Braço oposto levantado.",
        },
        {
          name: "Rotação Torácica (deitado)",
          detail: `${sets}x8/lado`,
          sets,
          reps: 8,
          rest: 15,
          key: "acc_thoracic_rot",
        },
        {
          name: "Calf Stretch (mural)",
          detail: `${sets}x60s/lado — joelho recto + fletido`,
          sets,
          reps: 60,
          isHold: true,
          rest: 10,
          key: "acc_calf_stretch",
          tip: "Gastrocnémio e Sóleo. Ambos.",
        },
      ];
    },

    quality_run: () => {
      if (dl) return [];
      return [
        {
          name: "Worlds Greatest Stretch",
          detail: "2x5/lado — antes de correr",
          sets: 2,
          reps: 5,
          rest: 10,
          key: "acc_worlds_greatest",
        },
        {
          name: "Leg Swings (frente/trás + lateral)",
          detail: "2x10/sentido/lado",
          sets: 2,
          reps: 10,
          rest: 10,
          key: "acc_leg_swings",
        },
        {
          name: "Pigeon Pose",
          detail: "2x60s/lado — pós-corrida",
          sets: 2,
          reps: 60,
          isHold: true,
          rest: 10,
          key: "acc_pigeon",
        },
      ];
    },

    fullbody: () => {
      if (dl)
        return [
          {
            name: "Hip 90/90 Mobility",
            detail: "2x60s/lado",
            sets: 2,
            reps: 60,
            isHold: true,
            rest: 10,
            key: "acc_hip_90_90",
          },
          {
            name: "Pigeon Pose",
            detail: "2x60s/lado",
            sets: 2,
            reps: 60,
            isHold: true,
            rest: 10,
            key: "acc_pigeon",
          },
        ];
      return [
        {
          name: "Side-lying Clam (banda)",
          detail: `3x${10 + b * 2}/lado — descanso 30s`,
          sets: 3,
          reps: 10 + b * 2,
          rest: 30,
          key: "acc_clamshell",
        },
        {
          name: "Dead Bug",
          detail: `3x${6 + b * 2}/lado — descanso 30s`,
          sets: 3,
          reps: 6 + b * 2,
          rest: 30,
          key: "acc_dead_bug",
          tip: "Lombar colada ao chão. Expirar no alongamento.",
        },
        {
          name: "Glute Stretch 90/90",
          detail: "2x60s/lado",
          sets: 2,
          reps: 60,
          isHold: true,
          rest: 10,
          key: "acc_hip_90_90",
        },
      ];
    },

    glutes_legs: () => {
      if (dl)
        return [
          {
            name: "Pigeon Pose",
            detail: "2x90s/lado",
            sets: 2,
            reps: 90,
            isHold: true,
            rest: 10,
            key: "acc_pigeon",
          },
          {
            name: "Hip 90/90 Mobility",
            detail: "2x60s/lado",
            sets: 2,
            reps: 60,
            isHold: true,
            rest: 10,
            key: "acc_hip_90_90",
          },
        ];
      return [
        {
          name: "Side-lying Clam (banda longa)",
          detail: `3x${12 + b * 2}/lado — descanso 30s`,
          sets: 3,
          reps: 12 + b * 2,
          rest: 30,
          key: "acc_clamshell",
        },
        {
          name: "Couch Stretch",
          detail: "2x60s/lado — quadriceps e flexores",
          sets: 2,
          reps: 60,
          isHold: true,
          rest: 10,
          key: "acc_couch_stretch",
        },
        {
          name: "Pigeon Pose",
          detail: `${b >= 3 ? 3 : 2}x90s/lado`,
          sets: b >= 3 ? 3 : 2,
          reps: 90,
          isHold: true,
          rest: 10,
          key: "acc_pigeon",
          tip: "Essencial após hip thrust alto volume.",
        },
      ];
    },

    hiit_cardio: () => [
      {
        name: "Hip Flexor Stretch (meia-lunge)",
        detail: "2x60s/lado — pós-HIIT",
        sets: 2,
        reps: 60,
        isHold: true,
        rest: 10,
        key: "acc_hip_flexor",
      },
      {
        name: "Pigeon Pose",
        detail: "2x60s/lado",
        sets: 2,
        reps: 60,
        isHold: true,
        rest: 10,
        key: "acc_pigeon",
      },
    ],

    fat_loss_circuit: () => [
      {
        name: "Hip Flexor Stretch (meia-lunge)",
        detail: "2x60s/lado — pós-circuito",
        sets: 2,
        reps: 60,
        isHold: true,
        rest: 10,
        key: "acc_hip_flexor",
      },
      {
        name: "Pigeon Pose",
        detail: "2x60s/lado",
        sets: 2,
        reps: 60,
        isHold: true,
        rest: 10,
        key: "acc_pigeon",
      },
      {
        name: "Dead Bug",
        detail: `3x${6 + b * 2}/lado — descanso 30s`,
        sets: 3,
        reps: 6 + b * 2,
        rest: 30,
        key: "acc_dead_bug",
      },
    ],
  };

  return map[type]?.() ?? [];
}
