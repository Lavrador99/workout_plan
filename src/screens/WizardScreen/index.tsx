import {
  DAYS,
  DURATION_OPTIONS,
  EXP_DESCS,
  EXP_ICONS,
  EXP_NAMES,
  GOAL_DESCS,
  GOAL_ICONS,
  GOAL_NAMES,
  GOAL_SCHEDULES,
  PROFILE_COLORS,
  PROFILE_EMOJIS,
  WEEK_OPTIONS,
} from "@/consts";
import type { ExperienceLevel, GoalType, PlanConfig, Profile } from "@/types";
import { useState } from "react";

interface WizardState {
  name: string;
  emoji: string;
  color: string;
  goal: GoalType;
  experience: ExperienceLevel;
  trainingDays: number[];
  sessionDuration: number;
  weeks: number;
}

const DEFAULT: WizardState = {
  name: "",
  emoji: "🏋️",
  color: "#e8ff47",
  goal: "hybrid_strength",
  experience: "intermediate",
  trainingDays: [1, 3, 5],
  sessionDuration: 60,
  weeks: 12,
};

const GOALS: GoalType[] = [
  "hybrid_strength",
  "calisthenics",
  "weight_loss",
  "running",
];

const EXP_LEVELS: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]; // Sun=0 … Sat=6

interface WizardScreenProps {
  onComplete: (profile: Profile) => void;
  onClose: () => void;
}

export function WizardScreen({ onComplete, onClose }: WizardScreenProps) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(DEFAULT);
  const TOTAL_STEPS = 6;

  const update = (patch: Partial<WizardState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const toggleDay = (d: number) => {
    setState((prev) => {
      const days = prev.trainingDays.includes(d)
        ? prev.trainingDays.filter((x) => x !== d)
        : [...prev.trainingDays, d].sort((a, b) => a - b);
      return { ...prev, trainingDays: days };
    });
  };

  const handleFinish = () => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const schedule = GOAL_SCHEDULES[state.goal];
    const planConfig: PlanConfig = {
      startDate: new Date().toISOString().split("T")[0],
      weeks: state.weeks,
      trainingDays: state.trainingDays,
      schedule,
      goal: state.goal,
      experience: state.experience,
      sessionDuration: state.sessionDuration,
      name: state.name,
      emoji: state.emoji,
      color: state.color,
    };
    const profile: Profile = {
      id,
      name: state.name,
      emoji: state.emoji,
      color: state.color,
      planConfig,
    };
    onComplete(profile);
  };

  const canNext = step !== 1 || state.name.trim().length > 0;
  const canFinish =
    state.name.trim().length > 0 && state.trainingDays.length > 0;

  return (
    <div className="fixed inset-0 z-[110] bg-bg flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4">
        <button
          onClick={onClose}
          className="text-muted hover:text-white text-[20px]"
        >
          ✕
        </button>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i + 1 < step
                  ? "w-4 bg-accent"
                  : i + 1 === step
                    ? "w-6 bg-accent"
                    : "w-3 bg-border"
              }`}
            />
          ))}
        </div>
        <div className="text-muted text-[12px]">
          {step}/{TOTAL_STEPS}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {step === 1 && <StepProfile state={state} update={update} />}
        {step === 2 && <StepGoal state={state} update={update} />}
        {step === 3 && <StepExperience state={state} update={update} />}
        {step === 4 && <StepDays state={state} toggleDay={toggleDay} />}
        {step === 5 && <StepDuration state={state} update={update} />}
        {step === 6 && <StepSummary state={state} />}
      </div>

      {/* Navigation */}
      <div className="px-5 pb-safe pb-6 pt-2 flex gap-3">
        {step > 1 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 py-3 rounded-xl border border-border text-muted font-semibold hover:border-accent2 hover:text-white transition-colors"
          >
            ← Voltar
          </button>
        )}
        {step < TOTAL_STEPS ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              canNext
                ? "bg-accent text-black hover:bg-accent/90"
                : "bg-border text-muted cursor-not-allowed"
            }`}
          >
            Continuar →
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={!canFinish}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              canFinish
                ? "bg-accent text-black hover:bg-accent/90"
                : "bg-border text-muted cursor-not-allowed"
            }`}
          >
            ✓ Começar
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Profile info ──────────────────────────────────────────────────

function StepProfile({
  state,
  update,
}: {
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-black mb-1">Quem vai treinar?</h2>
      <p className="text-muted text-[13px] mb-5">
        Nome, emoji e cor do perfil.
      </p>

      <input
        autoFocus
        type="text"
        maxLength={20}
        placeholder="Nome do perfil"
        value={state.name}
        onChange={(e) => update({ name: e.target.value })}
        className="w-full bg-card border border-border rounded-xl px-4 py-3 text-white text-[15px] focus:outline-none focus:border-accent mb-5"
      />

      <p className="text-muted text-[12px] mb-2">Emoji</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {PROFILE_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => update({ emoji: e })}
            className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border transition-all ${
              state.emoji === e
                ? "border-accent bg-accent/10 scale-110"
                : "border-border hover:border-accent2"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      <p className="text-muted text-[12px] mb-2">Cor</p>
      <div className="flex flex-wrap gap-2">
        {PROFILE_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => update({ color: c })}
            className={`w-8 h-8 rounded-full border-2 transition-all ${
              state.color === c
                ? "border-white scale-110"
                : "border-transparent"
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Goal ─────────────────────────────────────────────────────────

function StepGoal({
  state,
  update,
}: {
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-black mb-1">Qual é o teu objetivo?</h2>
      <p className="text-muted text-[13px] mb-5">
        Isto define o teu plano de treino.
      </p>

      <div className="space-y-2">
        {GOALS.map((g) => (
          <button
            key={g}
            onClick={() => update({ goal: g })}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
              state.goal === g
                ? "border-accent bg-accent/10"
                : "border-border hover:border-accent2/50"
            }`}
          >
            <span className="text-2xl">{GOAL_ICONS[g]}</span>
            <div>
              <div className="font-semibold text-[14px]">{GOAL_NAMES[g]}</div>
              <div className="text-muted text-[12px]">{GOAL_DESCS[g]}</div>
            </div>
            {state.goal === g && <span className="ml-auto text-accent">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3: Experience ───────────────────────────────────────────────────

function StepExperience({
  state,
  update,
}: {
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-black mb-1">Nível de experiência</h2>
      <p className="text-muted text-[13px] mb-5">
        Adaptamos as cargas e o volume.
      </p>

      <div className="space-y-2">
        {EXP_LEVELS.map((lvl) => (
          <button
            key={lvl}
            onClick={() => update({ experience: lvl })}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
              state.experience === lvl
                ? "border-accent bg-accent/10"
                : "border-border hover:border-accent2/50"
            }`}
          >
            <span className="text-2xl">{EXP_ICONS[lvl]}</span>
            <div>
              <div className="font-semibold text-[14px]">{EXP_NAMES[lvl]}</div>
              <div className="text-muted text-[12px]">{EXP_DESCS[lvl]}</div>
            </div>
            {state.experience === lvl && (
              <span className="ml-auto text-accent">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 4: Training days ────────────────────────────────────────────────

function StepDays({
  state,
  toggleDay,
}: {
  state: WizardState;
  toggleDay: (d: number) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-black mb-1">Dias de treino</h2>
      <p className="text-muted text-[13px] mb-5">
        Seleciona os dias em que treinas ({state.trainingDays.length}{" "}
        selecionados)
      </p>

      <div className="grid grid-cols-2 gap-2">
        {ALL_DAYS.map((d) => {
          const selected = state.trainingDays.includes(d);
          return (
            <button
              key={d}
              onClick={() => toggleDay(d)}
              className={`py-3 rounded-xl border font-semibold text-[14px] transition-all ${
                selected
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-accent2/50 text-muted"
              }`}
            >
              {DAYS[d]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 5: Duration + Weeks ─────────────────────────────────────────────

function StepDuration({
  state,
  update,
}: {
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-black mb-1">Duração do plano</h2>
      <p className="text-muted text-[13px] mb-5">
        Quanto tempo tens por sessão e em semanas.
      </p>

      <p className="text-muted text-[12px] mb-2 font-semibold">
        Duração da sessão
      </p>
      <div className="flex gap-2 mb-6">
        {DURATION_OPTIONS.map((d) => (
          <button
            key={d}
            onClick={() => update({ sessionDuration: d })}
            className={`flex-1 py-2.5 rounded-lg border font-semibold text-[13px] transition-all ${
              state.sessionDuration === d
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted"
            }`}
          >
            {d}min
          </button>
        ))}
      </div>

      <p className="text-muted text-[12px] mb-2 font-semibold">
        Número de semanas
      </p>
      <div className="flex gap-2">
        {WEEK_OPTIONS.map((w) => (
          <button
            key={w}
            onClick={() => update({ weeks: w })}
            className={`flex-1 py-2.5 rounded-lg border font-semibold text-[13px] transition-all ${
              state.weeks === w
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted"
            }`}
          >
            {w}sem
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 6: Summary ──────────────────────────────────────────────────────

function StepSummary({ state }: { state: WizardState }) {
  const schedule = GOAL_SCHEDULES[state.goal];
  const dayNames = state.trainingDays.map((d) => DAYS[d]).join(" · ");

  return (
    <div>
      <h2 className="text-2xl font-black mb-1">Resumo</h2>
      <p className="text-muted text-[13px] mb-5">Confirma antes de começar.</p>

      {/* Profile preview */}
      <div className="flex items-center gap-4 bg-card rounded-xl border border-border p-4 mb-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
          style={{ background: state.color }}
        >
          {state.emoji}
        </div>
        <div>
          <div className="font-bold text-lg">{state.name}</div>
          <div className="text-muted text-[12px]">
            {GOAL_NAMES[state.goal]} · {EXP_NAMES[state.experience]}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        {[
          { label: "Duração", value: `${state.weeks} semanas` },
          { label: "Sessão", value: `${state.sessionDuration} min` },
          { label: "Dias", value: dayNames },
          {
            label: "Sessões / semana",
            value: String(state.trainingDays.length),
          },
          {
            label: "Tipos de treino",
            value:
              [...new Set(schedule)].slice(0, 3).join(", ") +
              (schedule.length > 3 ? "…" : ""),
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between px-4 py-2.5 bg-card rounded-lg border border-border text-[13px]"
          >
            <span className="text-muted">{label}</span>
            <span className="font-semibold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
