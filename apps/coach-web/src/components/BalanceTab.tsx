import { useMemo, useState, type ReactNode } from "react";
import { changeTone, fmtChange, SIDE_SHORT } from "../lib/assessment";
import { adherence, customRange, doneIn, goalBalance, markBalance, metricRow, pendingMarks, PERIODS, presetRange, testBalance, type GoalRow, type MarkPoint, type MarkRow, type Preset, type Range, type SingleRow, type TestRow } from "../lib/balance";
import { fmtLoad } from "../lib/format";
import { go, useAssessments, useGoals, useTests } from "../lib/hooks";
import { tally } from "../lib/movement";
import { targetsOf } from "../lib/progress";
import { fmtDate, fmtNum, todayISO } from "../lib/text";
import type { Client, Exercise, Focus, Goal, GoalStatus, Session, Side } from "../lib/types";
import { Bars, Section } from "./CountsView";
import GoalSheet from "./GoalSheet";
import ProgressCard from "./ProgressCard";
import { TONE_CLASS } from "./ResultCard";
import Seg from "./Seg";

const PRESETS: [Preset, string][] = [...PERIODS, ["custom", "Datas"]];

interface Choice {
  preset: Preset;
  from: string;
  to: string;
}

/** The period picked per client, so coming back from a test lands on the same view. */
const chosen = new Map<string, Choice>();

const SIDE_LONG: Record<Side, string> = { left: "Esquerdo", right: "Direito" };

/** The name gives way on a narrow screen; the side never does. */
function Name({ row, className = "" }: { row: { name: string; side?: Side }; className?: string }) {
  return (
    <span className="flex-1 min-w-0 flex gap-1 text-sm">
      <span className={`truncate ${className}`}>{row.name}</span>
      {row.side && <span className="shrink-0 text-muted">· {SIDE_SHORT[row.side]}</span>}
    </span>
  );
}

function Tile({ label, value, detail, tone = "" }: { label: string; value: string | number; detail: string; tone?: string }) {
  return (
    <div className="card p-3 flex flex-col min-w-0">
      <span className="label">{label}</span>
      <span className={`text-2xl font-bold ${tone}`}>{value}</span>
      <span className="text-xs text-muted">{detail}</span>
    </div>
  );
}

function RowButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <li>
      <button type="button" className="w-full text-left py-2 flex flex-col gap-1" onClick={onClick}>
        {children}
      </button>
    </li>
  );
}

function TestList({ title, rows, clientId }: { title: string; rows: TestRow[]; clientId: string }) {
  if (!rows.length) return null;
  return (
    <div className="flex flex-col">
      <span className="label">
        {title} · {rows.length}
      </span>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <RowButton key={`${r.testId}-${r.version}-${r.side ?? ""}`} onClick={() => go("evolution", clientId, r.testId)}>
            <span className="flex items-baseline gap-2">
              <Name row={r} className="text-accent" />
              <span className={`text-sm font-semibold shrink-0 ${TONE_CLASS[changeTone(r.change)]}`}>{fmtChange(r.change, r.unit)}</span>
            </span>
            <span className="text-xs text-muted">
              {fmtNum(r.base.value)} → {fmtNum(r.last.value)} {r.unit} · {fmtDate(r.base.date)} a {fmtDate(r.last.date)}
              {r.showVersion && ` · protocolo ${r.version}`}
              {r.estimated && " · estimado"}
              {r.change.confirmed == null && r.change.improved != null && " · por confirmar"}
            </span>
          </RowButton>
        ))}
      </ul>
    </div>
  );
}

function SingleList({ rows, clientId }: { rows: SingleRow[]; clientId: string }) {
  if (!rows.length) return null;
  return (
    <details>
      <summary className="label cursor-pointer">Só uma medição · {rows.length}</summary>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <RowButton key={`${r.testId}-${r.last.assessmentId}-${r.side ?? ""}`} onClick={() => go("evolution", clientId, r.testId)}>
            <span className="flex items-baseline gap-2">
              <Name row={r} />
              <span className="text-sm shrink-0">
                {fmtNum(r.last.value)} {r.unit}
              </span>
            </span>
            <span className="text-xs text-muted">{fmtDate(r.last.date)}</span>
          </RowButton>
        ))}
      </ul>
    </details>
  );
}

const fmtRm = (p: MarkPoint) => fmtLoad({ ...p.item, loadMax: null }, Math.round((p.e1rm as number) * 10) / 10);

const fmtMark = (p: MarkPoint) => `${p.reps != null ? `${p.reps} × ` : ""}${fmtLoad({ ...p.item, loadMax: null }, p.load)}`;

function MarkList({ title, rows, clientId }: { title: string; rows: MarkRow[]; clientId: string }) {
  if (!rows.length) return null;
  return (
    <div className="flex flex-col">
      <span className="label">
        {title} · {rows.length}
      </span>
      <ul className="divide-y divide-border">
        {rows.map((m) => (
          <RowButton key={`${m.key}-${m.base.item.loadMode}`} onClick={() => go("history", clientId, m.key)}>
            <span className="flex items-baseline gap-2">
              <span className="flex-1 min-w-0 truncate text-sm text-accent">{m.name}</span>
              <span className="text-sm font-semibold shrink-0">{m.status === "same" ? "=" : `${m.pct > 0 ? "+" : ""}${fmtNum(Math.round(m.pct * 10) / 10)}%`}</span>
            </span>
            <span className="text-xs text-muted">
              {fmtMark(m.base)} ({fmtDate(m.base.date)}) → {fmtMark(m.best)} ({fmtDate(m.best.date)}) · {m.basis === "rm" ? `RM ${fmtRm(m.base)} → ${fmtRm(m.best)}` : "só pela carga"}
            </span>
          </RowButton>
        ))}
      </ul>
    </div>
  );
}

const STATUS_ORDER: Record<GoalStatus, number> = { active: 0, achieved: 1, dropped: 2 };
const STATUS_LABEL: Record<GoalStatus, string> = { active: "Em curso", achieved: "Atingido", dropped: "Abandonado" };

function GoalProgress({ row }: { row: GoalRow }) {
  const pct = row.progress == null ? 100 : Math.max(0, Math.min(100, row.progress));
  return (
    <span className="flex flex-col gap-1">
      <span className="flex items-baseline gap-2">
        <span className="flex-1 text-xs text-muted">{row.side ? SIDE_LONG[row.side] : ""}</span>
        <span className="shrink-0 tabular-nums text-xs">
          {fmtNum(row.current)} / {fmtNum(row.target)} {row.unit}
        </span>
      </span>
      <span className="h-2 rounded-full bg-card2 overflow-hidden">
        <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs text-muted">{row.progress == null ? "Já estava no objetivo" : row.progress < 0 ? "Mais longe do objetivo do que no início" : `${Math.round(row.progress)}% do caminho desde ${fmtNum(row.start)} ${row.unit}`}</span>
    </span>
  );
}

function GoalItem({ goal, rows, name, today, onOpen }: { goal: Goal; rows: GoalRow[]; name: string | undefined; today: string; onOpen: () => void }) {
  const late = goal.status === "active" && goal.dueDate != null && goal.dueDate < today;
  const facts = [goal.status !== "active" && STATUS_LABEL[goal.status], goal.dueDate && `Até ${fmtDate(goal.dueDate)}`].filter(Boolean).join(" · ");
  return (
    <li>
      <button type="button" className={`w-full text-left flex flex-col gap-1 ${goal.status === "dropped" ? "opacity-60" : ""}`} onClick={onOpen}>
        <span className="text-sm text-accent">{goal.title || name || rows[0]?.name || "Teste"}</span>
        {facts && <span className={`text-xs ${late ? "text-warn" : "text-muted"}`}>{late ? `${facts} · prazo ultrapassado` : facts}</span>}
        {goal.criteria && <span className="text-xs text-muted">{goal.criteria}</span>}
        {(goal.testId || rows.length > 0) && goal.status !== "dropped" && (rows.length ? rows.map((r) => <GoalProgress key={r.side ?? "both"} row={r} />) : <span className="text-xs text-muted">{goal.target == null ? "Sem valor definido" : `Objetivo: ${fmtNum(goal.target)} · ainda sem resultados`}</span>)}
      </button>
    </li>
  );
}

/** Everything a client gained and lost in a chosen period. */
export default function BalanceTab({ client, sessions, exercises, focuses }: { client: Client; sessions: Session[]; exercises: Exercise[]; focuses: Focus[] }) {
  const assessments = useAssessments(client.id);
  const tests = useTests();
  const goals = useGoals(client.id);
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  const today = todayISO();
  const [choice, setChoice] = useState<Choice>(() => chosen.get(client.id) ?? { preset: "all", from: presetRange("3m", today).from as string, to: today });

  const pick = (next: Choice) => {
    chosen.set(client.id, next);
    setChoice(next);
  };

  const range: Range = choice.preset === "custom" ? customRange(choice.from, choice.to, today) : presetRange(choice.preset, today);

  const data = useMemo(() => {
    if (!assessments || !tests || !goals) return null;
    const targets = targetsOf(goals);
    const names = new Map(exercises.map((e) => [e.id, e.name]));
    const done = doneIn(sessions, range);
    return {
      tests: testBalance(assessments, tests, targets, range),
      marks: markBalance(sessions, names, range),
      pending: pendingMarks(sessions, names, range),
      adherence: adherence(sessions, assessments, client, range),
      goals: goalBalance(assessments, tests, targets, range),
      volume: tally(done, new Map(exercises.map((e) => [e.id, e])), focuses),
    };
    // range is rebuilt on every render; its two dates are what matter
  }, [assessments, tests, goals, sessions, exercises, focuses, client.weeklyFrequency, client.schedule, client.adherenceSkips, range.from, range.to]);

  if (!data) return null;

  const { rows, singles } = data.tests;
  const of = (status: TestRow["status"]) => rows.filter((r) => r.status === status);
  const gains = of("gain");
  const losses = of("loss");
  const unconfirmed = [...gains, ...losses].filter((r) => r.change.confirmed == null).length;
  const markGains = data.marks.filter((m) => m.status === "gain");
  const markBelow = data.marks.filter((m) => m.status === "below");
  const markSame = data.marks.filter((m) => m.status === "same");
  const a = data.adherence;
  const ordered = [...(goals ?? [])].sort((x, y) => STATUS_ORDER[x.status] - STATUS_ORDER[y.status] || (x.dueDate ?? "9").localeCompare(y.dueDate ?? "9") || x.id.localeCompare(y.id));
  const empty = !rows.length && !singles.length && !data.marks.length && !data.pending.length && !a.done && !a.unticked;

  return (
    <div className="flex flex-col gap-3">
      <ProgressCard client={client} />

      <Seg options={PRESETS} value={choice.preset} onChange={(p) => pick({ ...choice, preset: p as Preset })} />

      {choice.preset === "custom" ? (
        <div className="flex gap-2">
          <label className="flex-1 min-w-0 flex flex-col gap-1">
            <span className="label">De</span>
            <input className="input" type="date" max={today} value={choice.from} onChange={(e) => e.target.value && pick({ ...choice, from: e.target.value })} />
          </label>
          <label className="flex-1 min-w-0 flex flex-col gap-1">
            <span className="label">Até</span>
            <input className="input" type="date" max={today} value={choice.to} onChange={(e) => e.target.value && pick({ ...choice, to: e.target.value })} />
          </label>
        </div>
      ) : (
        <p className="text-sm text-muted">{range.from ? `${fmtDate(range.from)} a ${fmtDate(range.to)}` : `Até ${fmtDate(range.to)}`}</p>
      )}

      {empty ? (
        <p className="text-sm text-muted">Sem sessões nem avaliações neste período.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Tile label="Ganhos" value={gains.length} detail={`Em testes · ${markGains.length} ${markGains.length === 1 ? "marca acima" : "marcas acima"}`} tone="text-success" />
            <Tile label="Perdas" value={losses.length} detail={`Em testes · ${markBelow.length} ${markBelow.length === 1 ? "marca abaixo" : "marcas abaixo"}`} tone="text-danger" />
            <Tile label="Adesão" value={a.pct == null ? "—" : `${Math.round(a.pct)}%`} detail={a.expected == null ? `${a.done} sessões` : `${a.done} de ${a.expected} sessões`} />
          </div>

          <Section title="Testes">
            {rows.length === 0 && singles.length === 0 && <p className="text-xs text-muted">Sem testes neste período.</p>}
            <TestList title="Ganhos" rows={gains} clientId={client.id} />
            <TestList title="Perdas" rows={losses} clientId={client.id} />
            <TestList title="Dentro do erro de medição" rows={of("within")} clientId={client.id} />
            <TestList title="Sem melhor nem pior" rows={of("flat")} clientId={client.id} />
            <SingleList rows={singles} clientId={client.id} />
            {unconfirmed > 0 && <p className="text-xs text-warn">{unconfirmed === 1 ? "1 mudança por confirmar" : `${unconfirmed} mudanças por confirmar`}: sem erro de medição definido no teste, não dá para saber se é real.</p>}
          </Section>

          <Section title="Marcas de treino">
            {data.marks.length === 0 && data.pending.length === 0 && <p className="text-xs text-muted">Nada para comparar neste período.</p>}
            <MarkList title="Acima da melhor anterior" rows={markGains} clientId={client.id} />
            <MarkList title="Abaixo da melhor anterior" rows={markBelow} clientId={client.id} />
            <MarkList title="Iguais" rows={markSame} clientId={client.id} />
            {data.pending.length > 0 && (
              <div className="flex flex-col">
                <span className="label">Por marcar como feito · {data.pending.length}</span>
                <ul className="divide-y divide-border">
                  {data.pending.map((p) => (
                    <RowButton key={`${p.sessionId}-${p.name}`} onClick={() => go("session", p.sessionId)}>
                      <span className="text-sm text-accent">{p.name}</span>
                      <span className="text-xs text-muted">
                        {fmtMark(p.point)} ({fmtDate(p.point.date)}) · não conta até marcares a série como feita
                      </span>
                    </RowButton>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted">Indicativo: compara o RM estimado da melhor série (Epley). Sem repetições registadas ou com carga adicionada, compara só a carga. Com muitas repetições é menos preciso, e uma fase mais leve ou um deload também ficam abaixo. Precisa de pelo menos 2 sessões feitas.</p>
          </Section>

          <Section title="Adesão">
            <p className="text-sm">
              <b>{a.done}</b> {a.done === 1 ? "sessão feita" : "sessões feitas"}
              {a.expected != null && ` de ${a.source === "plan" ? "" : "cerca de "}${a.expected} ${a.source === "plan" ? "planeadas" : "esperadas"}`}
            </p>
            {a.unticked > 0 && <p className="text-xs text-warn">{a.unticked === 1 ? "1 sessão sem nada marcado" : `${a.unticked} sessões sem nada marcado`}: não conta como feita.</p>}
            <p className="text-xs text-muted">{a.source === "plan" ? `Pelo plano semanal da ficha${a.from && a.from !== range.from ? `, desde ${fmtDate(a.from)}` : ""}.` : a.source === "estimate" ? `Estimativa com ${client.weeklyFrequency}×/semana da ficha para os dias sem plano${a.from && a.from !== range.from ? `, desde ${fmtDate(a.from)}` : ""}. Define os dias planeados para a tornar real.` : "Define os dias planeados na ficha para calcular a adesão."}</p>
          </Section>

          <Section title="Objetivos">
            {!goals?.length && <p className="text-xs text-muted">Sem objetivos definidos.</p>}
            <ul className="flex flex-col gap-3">
              {ordered.map((g) => (
                <GoalItem key={g.id} goal={g} rows={g.testId ? data.goals.filter((r) => r.testId === g.testId) : [metricRow(g)].filter((r): r is GoalRow => r != null)} name={tests?.find((t) => t.id === g.testId)?.name} today={today} onOpen={() => setEditing(g)} />
              ))}
            </ul>
            <button type="button" className="btn self-start" onClick={() => setEditing("new")}>
              + Objetivo
            </button>
          </Section>

          <Section title={`Volume · ${data.volume.sets} séries em ${data.volume.sessions} sessões`}>
            <Bars entries={[...data.volume.patterns.entries()]} total={data.volume.sets} />
          </Section>
        </>
      )}

      {editing && <GoalSheet clientId={client.id} goal={editing === "new" ? null : editing} goals={goals ?? []} tests={tests ?? []} onClose={() => setEditing(null)} />}
    </div>
  );
}
