// ─────────────────────────────────────────────────────────────────────────────
// CORE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Exercise {
  name: string;
  detail: string;
  sets: number;
  reps: number;
  weight?: boolean;
  isHold?: boolean;
  rest?: number;
  key: string;
  tip?: string;
}

export interface Session {
  title: string;
  sub?: string;
  type?: "run" | "strength" | "circuit";
  deload?: boolean;
  info?: string;
  warmup?: string;
  runNote?: string;
  exercises: Exercise[];
  accessories: Exercise[];
}

export type SessionType =
  | "upper"
  | "front_lever"
  | "quality_run"
  | "planche"
  | "legs"
  | "handstand"
  | "long_run"
  | "fullbody"
  | "glutes_legs"
  | "hiit_cardio"
  | "fat_loss_circuit";

export type GoalType =
  | "hybrid_strength"
  | "calisthenics"
  | "weight_loss"
  | "running";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface PlanConfig {
  startDate: string; // ISO date string
  weeks: number;
  trainingDays: number[]; // 0=Sun 1=Mon … 6=Sat
  schedule: SessionType[];
  goal: GoalType;
  experience: ExperienceLevel;
  sessionDuration: number; // minutes
  name: string;
  emoji: string;
  color: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string;
  emoji: string;
  color: string;
  planConfig: PlanConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGGED DATA
// ─────────────────────────────────────────────────────────────────────────────

export interface SetLog {
  reps: number;
  weight?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILL TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Skill {
  key: string;
  label: string;
  unit: "s" | "reps" | "kg";
  icon: string;
  goal: string;
}

export interface SkillEntry {
  value: number;
  date: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SWAP MODAL
// ─────────────────────────────────────────────────────────────────────────────

export interface SwapOption {
  type: SessionType;
  label: string;
  icon: string;
  isCurrent: boolean;
  allDone: boolean;
  doneCount: number;
  totalCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// WIZARD
// ─────────────────────────────────────────────────────────────────────────────

export interface WizardState {
  step: number;
  name: string;
  emoji: string;
  color: string;
  goal: GoalType | "";
  experience: ExperienceLevel | "";
  days: number[];
  duration: number;
  weeks: number;
}
