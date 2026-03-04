import { Badge } from "@/components/Badge";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ProgressBar } from "@/components/ProgressBar";
import { SwapModal } from "@/components/SwapModal";
import { DAYS } from "@/consts";
import { WARMUP_DEMOS } from "@/data/warmup";
import { getScheduledTypeForDate, getSessionForDate } from "@/data/workouts";
import type {
  Exercise,
  PlanConfig,
  Session,
  SessionType,
  SwapOption,
} from "@/types";
import { formatDate, getBlock, getWeek, isDeload } from "@/utils/date";
import {
  getSessionOverride,
  getStreak,
  isDone,
  isSessionComplete,
  markSessionComplete,
  setSessionOverride,
} from "@/utils/storage";
import { useCallback, useMemo, useState } from "react";

interface DemoInfo {
  key: string;
  name: string;
  tip: string;
}
export interface EditInfo {
  exercise: Exercise;
  setIdx: number;
  date: Date;
  profilePrefix: string;
}

interface TodayPageProps {
  profilePrefix: string;
  config: PlanConfig;
  onTimerStart: (seconds: number) => void;
  onDemoOpen: (info: DemoInfo) => void;
  onEditOpen: (info: EditInfo) => void;
}

function countTotalSets(session: Session): number {
  return [...session.exercises, ...(session.accessories ?? [])].reduce(
    (s, e) => s + e.sets,
    0,
  );
}

function countDoneSets(session: Session, date: Date, prefix: string): number {
  let count = 0;
  for (const ex of [...session.exercises, ...(session.accessories ?? [])]) {
    for (let i = 0; i < ex.sets; i++) {
      if (isDone(prefix, date, ex.key, i)) count++;
    }
  }
  return count;
}

export function TodayPage({
  profilePrefix,
  config,
  onTimerStart,
  onDemoOpen,
  onEditOpen,
}: TodayPageProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const session = useMemo<Session | null>(
    () => getSessionForDate(today, config, profilePrefix),
    [today, config, profilePrefix],
  );

  const week = useMemo(() => getWeek(today, config), [today, config]);
  const block = useMemo(() => getBlock(week), [week]);
  const deload = useMemo(() => isDeload(week), [week]);
  const streak = useMemo(() => getStreak(profilePrefix), [profilePrefix]);
  const dayName = DAYS[today.getDay()];

  const [sessionComplete, setSessionComplete] = useState(() =>
    isSessionComplete(profilePrefix, today),
  );

  const [doneCounts, setDoneCounts] = useState(0); // force re-render
  const totalSets = useMemo(
    () => (session ? countTotalSets(session) : 0),
    [session],
  );
  const doneSets = useMemo(
    () => (session ? countDoneSets(session, today, profilePrefix) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, today, profilePrefix, doneCounts],
  );

  const [showSwap, setShowSwap] = useState(false);

  const handleSetComplete = useCallback(() => {
    setDoneCounts((c) => c + 1);
  }, []);

  const handleComplete = () => {
    markSessionComplete(profilePrefix, today);
    setSessionComplete(true);
  };

  const swapOptions: SwapOption[] = useMemo(() => {
    const scheduled = getScheduledTypeForDate(today, config);
    const override = getSessionOverride(profilePrefix, today);
    return config.schedule
      .filter((v, i, a) => a.indexOf(v) === i)
      .map((type) => ({
        type,
        label: type,
        icon: "",
        isCurrent: type === (override ?? scheduled),
        allDone: false,
        doneCount: 0,
        totalCount: 1,
      }));
  }, [config, today, profilePrefix]);

  const handleSwap = (type: SessionType) => {
    setSessionOverride(profilePrefix, today, type);
    setShowSwap(false);
    window.location.reload();
  };

  const warmupSteps = useMemo(() => {
    if (!session?.warmup) return [];
    return session.warmup
      .split(/[·|\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [session]);

  const getWarmupDemoKey = (step: string) => {
    const lower = step.toLowerCase();
    return (
      Object.entries(WARMUP_DEMOS).find(([k]) => lower.includes(k))?.[1] ?? null
    );
  };

  if (!session || week < 1 || week > config.weeks) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted gap-2">
        <span className="text-4xl">🏁</span>
        <span className="font-semibold text-white">Fora do plano</span>
        <span className="text-sm">
          {week > config.weeks
            ? `O plano de ${config.weeks} semanas terminou`
            : "Configura um perfil para começar"}
        </span>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-2xl font-black">{dayName}</h2>
          <p className="text-muted text-[13px]">{formatDate(today)}</p>
        </div>
        <div className="flex flex-col items-end gap-1 mt-1">
          {streak > 0 ? (
            <span className="text-[12px] bg-accent/10 text-accent border border-accent/30 rounded-full px-2.5 py-0.5 font-semibold">
              🔥 {streak} dia{streak !== 1 ? "s" : ""} seguido
              {streak !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-[12px] text-muted border border-border rounded-full px-2.5 py-0.5">
              Sem streak
            </span>
          )}
        </div>
      </div>

      {/* Week info chips */}
      <div className="flex items-center gap-2 flex-wrap mb-3 mt-2">
        {deload ? (
          <Badge variant="deload">DELOAD</Badge>
        ) : session.type === "run" ? (
          <Badge variant="run">CORRIDA</Badge>
        ) : (
          <Badge variant="normal">SEMANA {week}</Badge>
        )}
        <span className="text-[11px] text-muted border border-border rounded-full px-2.5 py-0.5">
          Semana {week}/{config.weeks}
        </span>
        <span className="text-[11px] text-muted border border-border rounded-full px-2.5 py-0.5">
          Bloco {block}
        </span>
        {deload && (
          <span className="text-[11px] text-orange-400 border border-orange-400/30 rounded-full px-2.5 py-0.5">
            🔻 Deload
          </span>
        )}
      </div>

      {/* Session title + swap */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-lg font-bold leading-tight">{session.title}</h3>
          {session.sub && (
            <p className="text-muted text-[12px]">{session.sub}</p>
          )}
        </div>
        {!sessionComplete && (
          <button
            onClick={() => setShowSwap(true)}
            className="text-[11px] border border-border text-muted rounded px-2.5 py-1.5 hover:border-accent2 hover:text-accent2 transition-colors shrink-0"
          >
            🔄 Trocar
          </button>
        )}
      </div>

      {/* Info box */}
      {(session.info || deload) && (
        <div className="bg-accent2/5 border border-accent2/20 rounded-lg px-3 py-2 text-[12px] text-muted mb-3">
          {session.info && <p>{session.info}</p>}
          {deload && (
            <p className="text-orange-400">
              ⚠️ DELOAD — Volume -40%. Execução técnica. Não falhar reps.
            </p>
          )}
        </div>
      )}

      {/* Progress bar */}
      {totalSets > 0 && (
        <div className="mb-4">
          <ProgressBar done={doneSets} total={totalSets} />
        </div>
      )}

      {/* Warmup */}
      {warmupSteps.length > 0 && (
        <CollapsibleSection label="🔥 Aquecimento" defaultOpen={false}>
          <div className="space-y-1.5 px-1">
            {warmupSteps.map((step, i) => {
              const demoKey = getWarmupDemoKey(step);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between text-[13px]"
                >
                  <span className="text-muted">{step}</span>
                  {demoKey && (
                    <button
                      onClick={() =>
                        onDemoOpen({ key: demoKey, name: step, tip: "" })
                      }
                      className="text-accent2 text-[10px] border border-accent2 rounded px-1.5 py-0.5 ml-2 shrink-0 hover:bg-accent2/10 transition-colors"
                    >
                      ▶
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Main exercises */}
      {session.exercises.length > 0 && (
        <CollapsibleSection
          label={`📋 Treino Principal (${session.exercises.length} exercício${session.exercises.length !== 1 ? "s" : ""})`}
          defaultOpen={true}
        >
          {session.exercises.map((ex: Exercise, eIdx: number) => (
            <ExerciseCard
              key={ex.key + eIdx}
              exercise={ex}
              exerciseIdx={eIdx}
              date={today}
              profilePrefix={profilePrefix}
              onTimerStart={onTimerStart}
              onDemoOpen={(k, n, t) => {
                onDemoOpen({ key: k, name: n, tip: t });
                handleSetComplete();
              }}
              onEditOpen={(exercise, _ei, si, _acc) =>
                onEditOpen({ exercise, setIdx: si, date: today, profilePrefix })
              }
            />
          ))}
          {session.runNote && (
            <div className="bg-accent2/5 border border-accent2/20 rounded-lg px-3 py-2 text-[12px] text-muted mb-2">
              🏃 {session.runNote}
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Accessories */}
      {session.accessories && session.accessories.length > 0 && (
        <CollapsibleSection
          label={`🔧 Acessórios (${session.accessories.length})`}
          defaultOpen={false}
        >
          {session.accessories.map((ex: Exercise, eIdx: number) => (
            <ExerciseCard
              key={`acc_${ex.key}_${eIdx}`}
              exercise={ex}
              exerciseIdx={eIdx + 1000}
              date={today}
              profilePrefix={profilePrefix}
              isAccessory
              onTimerStart={onTimerStart}
              onDemoOpen={(k, n, t) => {
                onDemoOpen({ key: k, name: n, tip: t });
                handleSetComplete();
              }}
              onEditOpen={(exercise, _ei, si, _acc) =>
                onEditOpen({ exercise, setIdx: si, date: today, profilePrefix })
              }
            />
          ))}
        </CollapsibleSection>
      )}

      {/* Complete session */}
      {totalSets > 0 && (
        <div className="mt-6">
          <button
            onClick={handleComplete}
            disabled={sessionComplete}
            className={`w-full py-3.5 rounded-xl font-bold text-[15px] transition-all ${
              sessionComplete
                ? "bg-success text-black cursor-default"
                : "bg-accent text-black hover:bg-accent/90 active:scale-98"
            }`}
          >
            {sessionComplete ? "✓ Sessão já concluída" : "✓ Treino Completo"}
          </button>
          <p className="text-center text-muted text-[11px] mt-2">
            Dados guardados localmente no teu dispositivo
          </p>
        </div>
      )}

      {/* Swap modal */}
      {showSwap && (
        <SwapModal
          options={swapOptions}
          currentType={getScheduledTypeForDate(today, config)}
          onSelect={handleSwap}
          onClose={() => setShowSwap(false)}
        />
      )}
    </div>
  );
}
