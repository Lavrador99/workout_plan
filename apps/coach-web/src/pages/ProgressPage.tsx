import { PageLoading } from "../components/States";
import { useMemo } from "react";
import { Section } from "../components/CountsView";
import LineChart, { type Point } from "../components/LineChart";
import PageHeader, { NotFound } from "../components/PageHeader";
import { CompareBars, MonthBars } from "../components/ProgressBars";
import Seg from "../components/Seg";
import { monthlyAdherence, PERIODS, presetRange, type Preset } from "../lib/balance";
import { useAssessments, useClient, useGoals, useSessions, useSnapshots, useTests, useViewState } from "../lib/hooks";
import { comparableHistory, compareRows, highlights } from "../lib/ipi";
import { DIMENSIONS, IMPORTANCE } from "../lib/progress";
import { fmtDate, fmtNum, todayISO } from "../lib/text";
import type { DimensionId, DimensionState, ProgressSnapshot, SnapshotDimension, SnapshotIndicator, TestDef } from "../lib/types";

type Period = Exclude<Preset, "custom">;

const dimensionName = (id: DimensionId) => DIMENSIONS.find((d) => d.id === id)?.label ?? id;
const STATE: Record<DimensionState, string> = { improving: "Melhoria", stable: "Sem mudança", regressing: "Regressão" };
const chain = (names: string[]) => names.join(" · ");

/** A line over time, or why there is none. */
function Trend({ points, unit }: { points: Point[]; unit: string }) {
  return new Set(points.map((p) => p.date)).size >= 2 ? <LineChart points={points} unit={unit} /> : <p className="text-xs text-muted">O gráfico aparece com dois valores neste período.</p>;
}

function Indicator({ i, test }: { i: SnapshotIndicator; test: TestDef | undefined }) {
  const reading = i.confirmed === false ? "Dentro do erro de medição" : i.confirmed == null ? "Por confirmar" : "Confirmado";
  return (
    <li className="py-2 flex flex-col">
      <span className="flex items-baseline gap-2 text-sm">
        <span className="flex-1 min-w-0">
          {i.name}
          {i.side && <span className="text-muted"> · {i.side === "left" ? "E" : "D"}</span>}
        </span>
        <span className="shrink-0 font-semibold tabular-nums">{Math.round(i.score)}</span>
      </span>
      <span className="text-xs text-muted">
        {fmtNum(i.first)} → {fmtNum(i.current)} {i.unit} · objetivo {fmtNum(i.target)} · {i.origin === "estimated" ? "estimado" : "medido"} · {reading}
        {i.importance > 1 && ` · importância ${IMPORTANCE.find(([v]) => v === i.importance)?.[1].toLowerCase()}`}
      </span>
      {test?.semSource && <span className="text-xs text-muted">Erro de medição: {test.semSource}</span>}
      {test?.references && <span className="text-xs text-muted">Referências: {test.references}</span>}
    </li>
  );
}

function DimensionCard({ d, history, tests }: { d: SnapshotDimension; history: ProgressSnapshot[]; tests: TestDef[] }) {
  const points = history.flatMap((s): Point[] => {
    const score = s.dimensions.find((x) => x.id === d.id)?.score;
    return score == null ? [] : [{ date: s.date, value: score, detail: "" }];
  });
  return (
    <div className="card p-3 flex flex-col gap-2 min-w-0">
      <div className="flex items-baseline gap-2">
        <span className="flex-1 min-w-0 text-sm font-semibold">{dimensionName(d.id)}</span>
        <span className="shrink-0 font-bold tabular-nums">{d.score == null ? "—" : Math.round(d.score)}</span>
      </div>
      <p className="text-xs text-muted">
        {d.score == null ? "Sem dados" : `Peso ${fmtNum(d.weight)}%`}
        {d.state && ` · ${STATE[d.state]}${d.provisional ? " por confirmar" : ""}`}
      </p>
      {d.score != null && <Trend points={points} unit="pts" />}
      {d.indicators.length > 0 && (
        <details>
          <summary className="label cursor-pointer">Indicadores · {d.indicators.length}</summary>
          <ul className="divide-y divide-border">
            {d.indicators.map((i) => (
              <Indicator key={`${i.testId}-${i.side ?? ""}`} i={i} test={tests.find((t) => t.id === i.testId)} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** The index over time: how each part got here, and where to look next. */
export default function ProgressPage({ clientId }: { clientId: string }) {
  const client = useClient(clientId);
  const snapshots = useSnapshots(clientId);
  const sessions = useSessions(clientId);
  const assessments = useAssessments(clientId);
  const goals = useGoals(clientId);
  const tests = useTests();
  const [period, setPeriod] = useViewState<Period>("period", "all");
  const range = presetRange(period, todayISO());

  const { list, sameMethod, left } = useMemo(() => comparableHistory(snapshots ?? []), [snapshots]);
  const inPeriod = (s: ProgressSnapshot) => s.date <= range.to && (range.from == null || s.date >= range.from);
  const shown = useMemo(() => list.filter(inPeriod), [list, range.from, range.to]);
  const scored = useMemo(() => sameMethod.filter(inPeriod), [sameMethod, range.from, range.to]);
  const rows = useMemo(() => compareRows(snapshots ?? []), [snapshots]);
  const months = useMemo(() => monthlyAdherence(sessions ?? [], assessments ?? [], client ?? {}, range), [sessions, assessments, client, range.from, range.to]);

  if (client === null) return <NotFound title="Cliente" back={["clients"]} />;
  if (!client || !snapshots || !sessions || !assessments || !goals) return <PageLoading title="Progresso" back={["clients"]} />;

  const current = list[list.length - 1];
  const header = <PageHeader title="Evolução do índice" subtitle={client.name} back={["client", clientId, "balance"]} />;
  if (!current) {
    return (
      <>
        {header}
        <div className="page">
          <p className="text-sm text-muted">Aparece depois da primeira avaliação, ao abrir o Balanço do cliente.</p>
        </div>
      </>
    );
  }

  const seen = highlights(scored.length ? scored : [current]);
  const line = (from: ProgressSnapshot[], value: (s: ProgressSnapshot) => number | null): Point[] => from.flatMap((s) => (value(s) == null ? [] : [{ date: s.date, value: value(s) as number, detail: "" }]));
  const live = goals.filter((g) => g.status !== "dropped");
  const achieved = live.filter((g) => g.status === "achieved").length;

  return (
    <>
      {header}
      <div className="page">
        <Seg options={PERIODS} value={period} onChange={(p) => setPeriod(p as Period)} />
        {left > 0 && <p className="text-xs text-warn">{left === 1 ? "1 índice ficou" : `${left} índices ficaram`} de fora: {left === 1 ? "foi calculado" : "foram calculados"} com outros pesos, método ou erro de medição. Recalcula o histórico para os incluir.</p>}

        <Section title="IPI">
          <Trend points={line(shown, (s) => s.ipi)} unit="pts" />
        </Section>

        {seen && (
          <Section title="Onde olhar">
            {seen.gained.length > 0 && <p className="text-sm"><b>Mais evolução:</b> {chain(seen.gained.map((g) => `${dimensionName(g.id)} (+${fmtNum(g.points)})`))}</p>}
            {seen.regressing.length > 0 && <p className="text-sm"><b>Em regressão:</b> {chain(seen.regressing.map(dimensionName))}</p>}
            {seen.stable.length > 0 && <p className="text-sm"><b>Sem evolução:</b> {chain(seen.stable.map(dimensionName))}</p>}
            {seen.reached.length > 0 && <p className="text-sm"><b>Objetivos atingidos:</b> {chain(seen.reached)}</p>}
            {seen.furthest.length > 0 && <p className="text-sm"><b>Mais longe do objetivo:</b> {chain(seen.furthest.map((f) => `${f.name} (${Math.round(f.score)}%)`))}</p>}
            <p className="text-xs text-muted">Informativo: não altera o plano de treino.</p>
          </Section>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {current.dimensions.map((d) => (
            <DimensionCard key={d.id} d={d} history={scored} tests={tests ?? []} />
          ))}
        </div>

        <Section title="Inicial, atual e objetivo">
          {rows.length ? <CompareBars rows={rows} /> : <p className="text-xs text-muted">Precisa de objetivos e de duas avaliações do mesmo teste.</p>}
        </Section>

        <Section title="Adesão mensal">{months.length ? <MonthBars months={months} /> : <p className="text-xs text-muted">Sem sessões neste período.</p>}</Section>

        <Section title="Cumprimento dos objetivos">
          <Trend points={line(scored, (s) => s.io)} unit="%" />
          <p className="text-xs text-muted">
            {achieved} de {live.length} {live.length === 1 ? "objetivo marcado" : "objetivos marcados"} como atingidos. Os abandonados não contam.
          </p>
        </Section>

        <p className="text-xs text-muted">
          Calculado a {fmtDate(current.date)} · método {current.method}
          {current.recalculated ? " · recalculado" : ""} · pesos {DIMENSIONS.map((d) => current.weights[d.id]).join(" / ")}
        </p>
      </div>
    </>
  );
}
