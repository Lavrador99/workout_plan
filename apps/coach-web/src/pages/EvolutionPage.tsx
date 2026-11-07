import { PageLoading } from "../components/States";
import BenchmarkCard from "../components/BenchmarkCard";
import LineChart, { type Point } from "../components/LineChart";
import PageHeader from "../components/PageHeader";
import { fmtRelative, NumberField, TONE_CLASS } from "../components/ResultCard";
import { averageSpeed, bodyMassAt, change, changeTone, fmtAsymmetry, fmtChange, goalProgress, series, testMdc, type SeriesPoint, type VersionSeries } from "../lib/assessment";
import { newGoal, remove, save } from "../lib/db";
import { go, useAssessments, useClient, useGoals, useTests } from "../lib/hooks";
import { fmtDate, fmtNum } from "../lib/text";
import type { Assessment, Client, TestDef } from "../lib/types";

const toPoints = (list: SeriesPoint[]): Point[] => list.map((p) => ({ date: p.date, value: p.value, detail: "" }));

/** First to latest value, what changed, and how far along the goal. */
function Summary({ label, list, v, target, mdc }: { label?: string; list: SeriesPoint[]; v: VersionSeries; target: number | null; mdc: number | null }) {
  if (!list.length) return null;
  const first = list[0].value;
  const last = list[list.length - 1].value;
  const c = change(first, last, v.direction, v.scale, mdc);
  const progress = target == null ? null : goalProgress(first, last, target);
  return (
    <div className="flex flex-col text-sm">
      <div className="flex items-baseline gap-2">
        {label && <span className="w-16 shrink-0 text-muted">{label}</span>}
        <span className="font-semibold">
          {list.length > 1 ? `${fmtNum(first)} → ` : ""}
          {fmtNum(last)} {v.unit}
        </span>
        {list.length > 1 && <span className={TONE_CLASS[changeTone(c)]}>{fmtChange(c, v.unit)}</span>}
      </div>
      {progress != null && list.length > 1 && <span className="text-xs text-muted">{progress < 0 ? "Mais longe do objetivo do que no início" : `${Math.round(progress)}% do caminho até ao objetivo`}</span>}
    </div>
  );
}

function VersionSection({ v, showVersion, assessments, target, test, testId, client, latest }: { v: VersionSeries; showVersion: boolean; assessments: Assessment[]; target: number | null; test: TestDef | undefined; testId: string; client: Client; latest: boolean }) {
  const mdc = testMdc(test, v.version);
  const distance = test?.version === v.version ? test.distanceM : null;
  const ids = new Set([...v.both, ...v.left, ...v.right].map((p) => p.assessmentId));
  const rows = assessments.filter((a) => ids.has(a.id)); // newest first, as the list comes
  const valueAt = (list: SeriesPoint[], id: string) => fmtNum(list.find((p) => p.assessmentId === id)?.value) || "—";
  const dates = new Set([...v.both, ...v.left, ...v.right].map((p) => p.date));

  return (
    <section className="flex flex-col gap-3">
      {showVersion && <h2 className="label">Protocolo · versão {v.version}</h2>}
      <div className="card p-3 flex flex-col gap-2">
        {v.sided ? (
          <>
            <Summary label="Esquerdo" list={v.left} v={v} target={target} mdc={mdc} />
            <Summary label="Direito" list={v.right} v={v} target={target} mdc={mdc} />
          </>
        ) : (
          <Summary list={v.both} v={v} target={target} mdc={mdc} />
        )}
        {v.strength === "estimated" && <p className="text-xs text-warn">Valores estimados, não medidos.</p>}
        {v.direction !== "neutral" && (mdc == null ? <p className="text-xs text-muted">Erro de medição por definir: não dá para saber se a mudança é real.</p> : <p className="text-xs text-muted">Mudança mínima detetável (MDC95): {fmtNum(mdc)} {v.unit}</p>)}
      </div>

      {latest && <BenchmarkCard client={client} testId={testId} v={v} />}

      {dates.size >= 2 ? (
        <div className="card p-3 flex flex-col gap-1">
          <LineChart points={toPoints(v.sided ? v.left : v.both)} second={v.sided ? toPoints(v.right) : undefined} names={v.sided ? ["Esquerdo", "Direito"] : undefined} unit={v.unit} goal={target} />
          {v.sided && <p className="text-xs text-muted">Linha contínua: esquerdo · Tracejado: direito</p>}
        </div>
      ) : (
        <p className="text-sm text-muted">O gráfico aparece com pelo menos duas avaliações em datas diferentes.</p>
      )}

      <ul className="card divide-y divide-border">
        {rows.map((a) => {
          const asym = v.asymmetries.find((p) => p.assessmentId === a.id);
          const result = a.results.find((r) => r.testId === testId && r.version === v.version);
          const relative = result ? fmtRelative(result, bodyMassAt(assessments, a)?.value) : "";
          const speed = averageSpeed(distance, v.both.find((p) => p.assessmentId === a.id)?.value ?? null);
          return (
            <li key={a.id}>
              <button type="button" className="w-full text-left px-3 py-2 flex flex-col gap-1" onClick={() => go("assessment", a.id)}>
                <span className="flex items-baseline gap-2">
                  <span className="text-sm">{fmtDate(a.date)}</span>
                  <span className="flex-1 min-w-0 truncate text-xs text-muted">{a.title}</span>
                  <span className="font-semibold text-sm shrink-0">{v.sided ? `E ${valueAt(v.left, a.id)}  D ${valueAt(v.right, a.id)}` : valueAt(v.both, a.id)}</span>
                </span>
                {asym && <span className="text-xs text-muted">{fmtAsymmetry(asym, v.unit)}</span>}
                {relative && <span className="text-xs text-muted">{relative}</span>}
                {speed != null && <span className="text-xs text-muted">{fmtNum(speed)} m/s</span>}
                {a.conditions && <span className="text-xs text-muted truncate">{a.conditions}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** One test over time for one client, newest protocol version first. */
export default function EvolutionPage({ clientId, testId }: { clientId: string; testId: string }) {
  const client = useClient(clientId);
  const assessments = useAssessments(clientId);
  const tests = useTests();
  const goals = useGoals(clientId);
  if (!assessments || !tests || !client || !goals) return <PageLoading title="Evolução" back={["clients"]} />;

  const versions = series(assessments, testId).reverse();
  const test = tests.find((t) => t.id === testId);
  const name = test?.name ?? assessments.flatMap((a) => a.results).find((r) => r.testId === testId)?.name ?? "Teste";
  const goal = goals.find((g) => g.testId === testId && g.status !== "dropped");
  const target = goal?.target ?? null;

  const setTarget = (value: number | null) => {
    // a date or criteria survive clearing the value, which may just be retyping it
    if (value == null && goal && !goal.dueDate && !goal.criteria) return void remove("goals", goal.id);
    void save("goals", { ...(goal ?? newGoal(clientId, testId)), target: value });
  };

  return (
    <>
    <PageHeader title={name} subtitle={client.name} back={["client", clientId, "assessments"]} />
    <div className="page">

      {versions.length === 0 ? (
        <p className="text-sm text-muted">Ainda sem resultados neste teste.</p>
      ) : (
        <>
          {versions[0].direction !== "neutral" || target != null ? (
            <label className="flex items-center gap-2">
              <span className="label flex-1">Objetivo ({versions[0].unit})</span>
              <span className="w-28">
                <NumberField value={target} label={`Objetivo de ${name}`} onChange={setTarget} />
              </span>
            </label>
          ) : null}
          {versions.length > 1 && <p className="text-xs text-warn">Este teste mudou de protocolo. As versões ficam separadas e o objetivo aplica-se à mais recente.</p>}
          {versions.map((v, i) => (
            <VersionSection key={v.version} v={v} showVersion={versions.length > 1} assessments={assessments} target={i === 0 ? target : null} test={test} testId={testId} client={client} latest={i === 0} />
          ))}
        </>
      )}
    </div>
    </>
  );
}
