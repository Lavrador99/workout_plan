import type { Session } from "@/types";

export function buildFrontLever(week: number, b: number, dl: boolean): Session {
  const prog: Record<number, string[]> = {
    1: [
      "Tuck FL Hold 4x15s",
      "Tuck FL Raises 4x6",
      "Ring Row (rígido) 4x8",
      "Dragon Flag eccêntrica 4x4",
    ],
    2: [
      "Adv Tuck FL Hold 4x12s",
      "Tuck FL Raises 4x8",
      "Adv Tuck FL Raise 3x5",
      "Ring Row lastro 4x8",
      "Dragon Flag ecc 3x5",
    ],
    3: [
      "Adv Tuck FL Hold 4x15s",
      "One-leg FL Hold 4x8s/lado",
      "Adv Tuck Raise 4x6",
      "Ring Row lastro 4x10",
      "Dragon Flag 3x4",
    ],
    4: [
      "One-leg FL Hold 4x10s",
      "Straddle FL tentativa 3x5s",
      "One-leg FL Raise 4x5",
      "Inverted Row (rígido) 4x10",
    ],
  };
  const names: Record<number, string[]> = {
    1: ["tuck_fl", "tuck_fl_raise", "ring_row", "dragon_flag_ecc"],
    2: [
      "adv_tuck_fl",
      "tuck_fl_raise",
      "adv_tuck_fl_raise",
      "ring_row_weighted",
      "dragon_flag_ecc",
    ],
    3: [
      "adv_tuck_fl_hold",
      "one_leg_fl",
      "adv_tuck_fl_raise",
      "ring_row_weighted",
      "dragon_flag",
    ],
    4: ["one_leg_fl", "straddle_fl", "one_leg_fl_raise", "inverted_row"],
  };
  const blockExs = (prog[b] ?? prog[1]).map((detail, i) => {
    const sets = dl ? 3 : parseInt(detail.match(/(\d+)x/)?.[1] ?? "3");
    const reps = parseInt(detail.match(/x(\d+)/)?.[1] ?? "6");
    return {
      name: detail.replace(/\d+x/, "").trim(),
      detail: dl ? detail.replace(/\d+x/, `${Math.max(2, sets - 1)}x`) : detail,
      sets,
      reps,
      isHold: detail.includes("s"),
      rest: detail.includes("s") ? 90 : 120,
      key: (names[b] ?? names[1])[i] ?? "tuck_fl",
    };
  });

  return {
    title: "Front Lever",
    sub: `Bloco ${b} · Progressão GST`,
    deload: dl,
    warmup:
      "Dead hang 2x20s · Hollow body 1x30s · Australian pull-ups 2x8 · Scapula pull 2x10",
    exercises: blockExs,
    accessories: [],
  };
}
