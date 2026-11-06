import { useEffect, useMemo, useState } from "react";
import { save } from "../lib/db";
import { go, useAssessments, useFocuses, useGoals, useSessions, useSnapshots, useTests } from "../lib/hooks";
import { evolution, pendingSnapshots, recalculate, STATUS_LABEL, type IpiInput } from "../lib/ipi";
import { DIMENSIONS } from "../lib/progress";
import { fmtDate, fmtNum } from "../lib/text";
import type { Client, DimensionState, ProgressSnapshot, ProgressStatus, SnapshotDimension } from "../lib/types";
import { Section } from "./CountsView";

const TONE: Record<ProgressStatus, string> = { positive: "text-success", moderate: "text-success", reduced: "text-warn", stagnant: "text-warn", regression: "text-danger", insufficient: "text-muted" };
const STATE: Record<DimensionState, [string, string]> = { improving: ["Melhoria", "text-success"], stable: ["Sem mudança", "text-muted"], regressing: ["Regressão", "text-danger"] };

const storeAll = async (list: ProgressSnapshot[]) => {
  for (const s of list) await save("snapshots", s);
};

const signed = (n: number) => `${n > 0 ? "+" : ""}${fmtNum(n)}`;

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="label">{label}</span>
      <span className="font-bold">{value}</span>
      {detail && <span className="text-xs text-muted">{detail}</span>}
    </div>
  );
}

function DimensionRow({ d }: { d: SnapshotDimension }) {
  const state = d.state && STATE[d.state];
  return (
    <li className="flex flex-col gap-1">
      <span className="flex items-baseline gap-2 text-sm">
        <span className="flex-1 min-w-0">{DIMENSIONS.find((x) => x.id === d.id)?.label}</span>
        <span className="shrink-0 font-semibold tabular-nums">{d.score == null ? "—" : fmtNum(Math.round(d.score))}</span>
      </span>
      <span className="h-2 rounded-full bg-card2 overflow-hidden">
        <span className="block h-full bg-accent" style={{ width: `${d.score ?? 0}%` }} />
      </span>
      <span className="text-xs text-muted">
        {d.score == null ? "Sem dados" : `Peso ${fmtNum(d.weight)}%`}
        {state && (
          <>
            {" · "}
            <span className={d.provisional ? "" : state[1]}>{state[0]}</span>
            {d.provisional && " por confirmar"}
          </>
        )}
      </span>
    </li>
  );
}

/** Where the client stands against their own goals. Stored the moment there is something new. */
export default function ProgressCard({ client }: { client: Client }) {
  const assessments = useAssessments(client.id);
  const tests = useTests();
  const goals = useGoals(client.id);
  const sessions = useSessions(client.id);
  const focuses = useFocuses();
  const snapshots = useSnapshots(client.id);
  const [busy, setBusy] = useState(false);

  const input: IpiInput | null = useMemo(() => (assessments && tests && goals && sessions && focuses ? { client, assessments, tests, goals, sessions, focuses } : null), [client, assessments, tests, goals, sessions, focuses]);
  const pending = useMemo(() => (input && snapshots ? pendingSnapshots(input, snapshots) : []), [input, snapshots]);

  useEffect(() => {
    if (pending.length) void storeAll(pending);
  }, [pending]);

  const evo = useMemo(() => evolution(snapshots ?? []), [snapshots]);
  if (!input || !snapshots) return null;

  if (!evo) return <Section title="Índice de progresso"><p className="text-xs text-muted">Aparece com a primeira avaliação.</p></Section>;

  const { current: s, sincePrevious, sinceFirst, weightsChanged } = evo;
  const redo = async () => {
    setBusy(true);
    await storeAll(recalculate(input, snapshots));
    setBusy(false);
  };

  return (
    <Section title={`Índice de progresso · ${fmtDate(s.date)}`}>
      <div className="flex items-end gap-3">
        <span className="text-4xl font-bold leading-none">{s.ipi == null ? "—" : Math.round(s.ipi)}</span>
        <span className="flex-1 min-w-0 flex flex-col">
          <span className={`text-sm font-semibold ${s.provisional ? "text-muted" : TONE[s.status]}`}>{STATUS_LABEL[s.status]}{s.provisional && " · por confirmar"}</span>
          <span className="text-xs text-muted">Cobertura de {fmtNum(s.coverage)}% dos pesos</span>
        </span>
      </div>

      {(sincePrevious != null || sinceFirst != null || weightsChanged) && (
        <p className="text-xs text-muted">
          {[sincePrevious != null && `${signed(sincePrevious)} desde a avaliação anterior`, sinceFirst != null && `${signed(sinceFirst)} desde o início`].filter(Boolean).join(" · ")}
          {weightsChanged && <span className="block text-warn">Há índices com outros pesos, método ou erro de medição: ficam de fora desta comparação. Recalcula o histórico para os incluir.</span>}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Condição" value={s.icc == null ? "—" : `P${Math.round(s.icc)}`} detail={s.iccTests ? `${s.iccTests} ${s.iccTests === 1 ? "teste" : "testes"}` : "Sem referências"} />
        <Stat label="Adesão" value={s.ia == null ? "—" : `${Math.round(s.ia)}%`} detail={s.iaSource === "plan" ? "Pelo plano" : "Estimada"} />
        <Stat label="Objetivos" value={s.io == null ? "—" : `${Math.round(s.io)}%`} detail={`${s.ioGoals} ${s.ioGoals === 1 ? "objetivo" : "objetivos"}`} />
      </div>

      <ul className="flex flex-col gap-2">
        {s.dimensions.map((d) => (
          <DimensionRow key={d.id} d={d} />
        ))}
      </ul>

      <p className="text-sm">{s.interpretation}</p>
      <p className="text-xs text-muted">Medida da evolução deste cliente até aos seus objetivos, não uma escala clínica. Só contam testes com objetivo e duas avaliações do mesmo protocolo.</p>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-accent" onClick={() => go("progress", client.id)}>
          Ver evolução
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => void redo()}>
          Recalcular histórico
        </button>
      </div>
    </Section>
  );
}
