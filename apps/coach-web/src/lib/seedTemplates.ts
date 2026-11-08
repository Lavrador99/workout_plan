// The 4-day template: WARM UP → PREHAB → POWER → STRENGTH → FINISHER → COOL DOWN.
// Lines use the quick-entry format; after "|" comes the note (alternatives,
// rest). Exercise names match the base library so history links up.

import type { BlockKind } from "@treino/core/types";

export interface SeedBlock {
  kind: BlockKind;
  title: string;
  items: string[];
  work?: number;
  rest?: number;
  rounds?: number;
  roundRest?: number;
}

export interface SeedDay {
  id: string;
  name: string;
  title: string;
  blocks: SeedBlock[];
}

const warmUp = (upper: string, lower: string, integrated: string): SeedBlock => ({
  kind: "list",
  title: "Warm up — 5'",
  items: ["Breathing Drill", `${upper} | upper body`, `${lower} | lower body`, `${integrated} | integrado`],
});
const prehab = (a: string, b: string): SeedBlock => ({ kind: "sets", title: "Prehab — 5'", items: [a, b] });
const power = (line: string): SeedBlock => ({ kind: "sets", title: "Power — 5'", items: [line] });
const strength = (...items: string[]): SeedBlock => ({ kind: "sets", title: "Strength — 30-45'", items });
const coolDown = (...items: string[]): SeedBlock => ({ kind: "list", title: "Cool down — 5'", items });

export const SEED_DAYS: SeedDay[] = [
  {
    id: "seed-tpl-day1",
    name: "Dia 1 · Lower 1",
    title: "Lower 1",
    blocks: [
      warmUp("Shoulder CARs", "Couch Stretch", "Spiderman Lunge with Rotation"),
      prehab("Copenhagen Plank 2x20s | áreas que precisam de atenção", "Deficit Calf Raise 2x12"),
      power("Box Jump 3x5 | vertical · desc. 45s · ou Squat Jump / Pogo Hops"),
      strength(
        "Back Squat 4x6 | joelho dominante bilateral pesado",
        "Bulgarian Split Squat 3x8 | joelho dominante unilateral",
        "Leg Extension 3x12 | isolamento quadríceps",
        "V-Up 3x10 | core flexão · ou Reverse Crunch",
      ),
      { kind: "sets", title: "Finisher — 5'", items: ["Bike 1x5min | cardio leve · ou Rower / Incline Walk"] },
      coolDown("Couch Stretch", "90/90 Hip Switch", "Lateral Line Stretch"),
    ],
  },
  {
    id: "seed-tpl-day2",
    name: "Dia 2 · Upper 1",
    title: "Upper 1",
    blocks: [
      warmUp("Thread the Needle", "90/90 Hip Switch", "Inchworm to Cobra"),
      prehab("Rotator Cuff Drill 2x12 | áreas que precisam de atenção", "90/90 External Rotation 2x8"),
      power("Plyo Push-up 3x5 | explosivo superior · desc. 45s · ou Push Press / Med Ball Chest Throw"),
      strength(
        "Bench Press 4x6 | supino pesado",
        "Bent-Over Row 3x10 | puxar horizontal · ou Reverse Fly",
        "Pallof Press 3x10 | core anti-rotação · ou Cable Chop",
      ),
      { kind: "sets", title: "Finisher — 5' · Core", items: ["Plank 2x40s", "Cable Chop 2x10", "Hanging Leg Raise 2x10"] },
      coolDown("Thread the Needle", "Cobra to Downward Dog", "Neck Rotations"),
    ],
  },
  {
    id: "seed-tpl-day3",
    name: "Dia 3 · Lower 2",
    title: "Lower 2",
    blocks: [
      warmUp("Shoulder CARs", "1/2 Kneeling Ankle Mobilization", "Walking Lunge w/ Rotation"),
      prehab("Hip Hike 2x12 | áreas que precisam de atenção", "Lateral Band Walk 2x10passos"),
      power("Broad Jump 3x5 | horizontal · desc. 45s · ou Kettlebell Swing / Horizontal Bound"),
      strength(
        "Deadlift 4x5 | anca dominante bilateral",
        "Single Leg RDL 3x8 | anca dominante multiplanar",
        "Leg Curl 3x12 | isolamento posteriores",
        "Side Plank 3x30s | core anti-flexão lateral · ou Suitcase Carry",
      ),
      { kind: "sets", title: "Finisher — 5' · Pliometria extensiva", items: ["Pogo Hops 2x20", "Bounding 2x20m", "Depth Jump 2x5"] },
      coolDown("Spiderman Lunge with Rotation", "Lateral Line Stretch", "1/2 Kneeling Ankle Mobilization"),
    ],
  },
  {
    id: "seed-tpl-day4",
    name: "Dia 4 · Upper 2",
    title: "Upper 2",
    blocks: [
      warmUp("Shoulder CARs", "ATG Split Squat", "Cobra to Downward Dog"),
      prehab("Rotator Cuff Drill 2x12 | áreas que precisam de atenção", "Step Down 2x10"),
      power("Continuous Speed Skater 3x5 | lateral · desc. 45s · ou Lateral Bound / Lateral Plate Hop"),
      strength(
        "Overhead Press 4x6 | press militar pesado",
        "Pull-up 3x6 | puxar vertical · ou Lat Pulldown",
        "Dead Bug 3x10 | core anti-extensão · ou Ab Rollout",
      ),
      {
        kind: "superset",
        title: "Finisher — 5' · KB Complex",
        items: ["Kettlebell Swing 3x5", "Kettlebell Clean 3x5", "Kettlebell Snatch 3x5", "Kettlebell Press 3x5"],
      },
      coolDown("Thread the Needle", "Lateral Line Stretch", "Neck Nods"),
    ],
  },
];
