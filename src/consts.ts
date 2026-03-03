import type { ExperienceLevel, GoalType, SessionType } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// DAYS
// ─────────────────────────────────────────────────────────────────────────────

export const DAYS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// UPPER CYCLE
// ─────────────────────────────────────────────────────────────────────────────

export const UPPER_CYCLE = ["A", "B", "C", "A", "D", "B"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// SESSION LABELS / ICONS
// ─────────────────────────────────────────────────────────────────────────────

export const SESSION_LABELS: Record<SessionType, string> = {
  upper: "Upper Body",
  front_lever: "Front Lever",
  quality_run: "Corrida",
  planche: "Planche",
  legs: "Pernas",
  handstand: "Handstand",
  long_run: "Long Run",
  fullbody: "Full Body",
  glutes_legs: "Glúteos & Pernas",
  hiit_cardio: "HIIT Cardio",
  fat_loss_circuit: "Circuito Metabólico",
};

export const SESSION_ICONS: Record<SessionType, string> = {
  upper: "🏋️",
  front_lever: "💪",
  planche: "✊",
  handstand: "🤸",
  legs: "🦵",
  quality_run: "🏃",
  long_run: "🏃‍♂️",
  fullbody: "⚡",
  glutes_legs: "🍑",
  hiit_cardio: "🔥",
  fat_loss_circuit: "🔋",
};

// ─────────────────────────────────────────────────────────────────────────────
// GOAL SCHEDULES
// ─────────────────────────────────────────────────────────────────────────────

export const GOAL_SCHEDULES: Record<GoalType, SessionType[]> = {
  hybrid_strength: ["upper", "legs", "front_lever", "planche", "handstand"],
  calisthenics: ["front_lever", "planche", "handstand", "upper", "legs"],
  weight_loss: ["fat_loss_circuit", "quality_run", "fullbody", "long_run"],
  running: ["quality_run", "upper", "long_run", "fullbody"],
};

export const GOAL_NAMES: Record<GoalType, string> = {
  hybrid_strength: "Força Híbrida",
  calisthenics: "Calistenia",
  weight_loss: "Perda de peso",
  running: "Corrida",
};

export const GOAL_DESCS: Record<GoalType, string> = {
  hybrid_strength: "Força + skills de ginástica + corrida",
  calisthenics: "Skills GST: front lever, planche, handstand",
  weight_loss: "Circuitos metabólicos + corrida + força",
  running: "Performance de corrida + suporte de força",
};

export const GOAL_ICONS: Record<GoalType, string> = {
  hybrid_strength: "⚡",
  calisthenics: "🤸",
  weight_loss: "🔥",
  running: "🏃",
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPERIENCE
// ─────────────────────────────────────────────────────────────────────────────

export const EXP_NAMES: Record<ExperienceLevel, string> = {
  beginner: "Iniciante",
  intermediate: "Intermédio",
  advanced: "Avançado",
};

export const EXP_DESCS: Record<ExperienceLevel, string> = {
  beginner: "Menos de 1 ano de treino",
  intermediate: "1–3 anos de treino",
  advanced: "3+ anos, bases sólidas",
};

export const EXP_ICONS: Record<ExperienceLevel, string> = {
  beginner: "🌱",
  intermediate: "💪",
  advanced: "🏆",
};

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE EMOJIS & COLORS
// ─────────────────────────────────────────────────────────────────────────────

export const PROFILE_EMOJIS = [
  "🏋️",
  "🤸",
  "🏃",
  "⚡",
  "🔥",
  "💪",
  "🦾",
  "🎯",
  "🌟",
  "🏆",
  "🚀",
  "💥",
  "🦁",
  "🐉",
  "🌊",
  "🧗",
];

export const PROFILE_COLORS = [
  "#e8ff47",
  "#47c4ff",
  "#ff4747",
  "#47ff8a",
  "#ff9f47",
  "#bf47ff",
  "#ff47bf",
  "#47ffe8",
];

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE KEY PREFIXES
// ─────────────────────────────────────────────────────────────────────────────

export const APP_PREFIXES = [
  "log_",
  "done_",
  "session_complete_",
  "session_override_",
  "skill_",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// DURATION / WEEK OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const DURATION_OPTIONS = [45, 60, 75, 90] as const;
export const WEEK_OPTIONS = [8, 12, 16, 20] as const;
