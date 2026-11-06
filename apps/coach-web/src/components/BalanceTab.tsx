import { useMemo, useState, type ReactNode } from "react";
import { changeTone, fmtChange, SIDE_SHORT } from "../lib/assessment";
import { adherence, customRange, doneIn, goalBalance, markBalance, presetRange, testBalance, type MarkPoint, type MarkRow, type Preset, type Range, type SingleRow, type TestRow } from "../lib/balance";
import { fmtLoad } from "../lib/format";
import { go, useAssessments, useTests } from "../lib/hooks";
import { tally } from "../lib/movement";
import { fmtDate, fmtNum, todayISO } from "../lib/text";
import type { Client, Exercise, Focus, Session, Side } from "../lib/types";
import { Bars, Section } from "./CountsView";
import { TONE_CLASS } from "./ResultCard";
import Seg from "./Seg";

const PRESETS: [Preset, string][] = [
  ["30d", "30 dias"],
  ["3m", "3 m"],
  ["6m", "6 m"],
  ["12m", "12 m"],
  ["all", "Tudo"],
  ["custom", "Datas"],
];

interface Choice {
  preset: Preset;
  from: string;
  to: string;
}

/** The period picked per client, so coming back from a test lands on the same view. */
const chosen = new Map<string, Choice>();

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
      <button type="button" className="w-full text-left py-2 flex flex-col gap-0.5" onClick={onClick}>
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
              <Name row={r} className="text-accent2" />
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

const fmtMark = (p: MarkPoint) => `${p.reps} × ${fmtLoad({ ...p.item, loadMax: null }, p.load)}`;

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
              <span className="flex-1 min-w-0 truncate text-sm text-accent2">{m.name}</span>
              <span className="text-sm font-semibold shrink-0">{m.status === "same" ? "=" : `${m.pct > 0 ? "+" : ""}${fmtNum(Math.round(m.pct * 10) / 10)}%`}</span>
            </span>
            <span className="text-xs text-muted">
              {fmtMark(m.base)} ({fmtDate(m.base.date)}) → {fmtMark(m.best)} ({fmtDate(m.best.date)})
            </span>
          </RowButton>
        ))}
      </ul>
    </div>
  );
}

/** Everything a client gained and lost in a chosen period. */
export default function BalanceTab({ client, sessions, exercises, focuses }: { client: Client; sessions: Session[]; exercises: Exercise[]; focuses: Focus[] }) {
  const assessments = useAssessments(client.id);
  const tests = useTests();
  const today = todayISO();
  const [choice, setChoice] = useState<Choice>(() => chosen.get(client.id) ?? { preset: "3m", from: presetRange("3m", today).from as string, to: today });

  const pick = (next: Choice) => {
    chosen.set(client.id, next);
    setChoice(next);
  };

  const range: Range = choice.preset === "custom" ? customRange(choice.from, choice.to, today) : presetRange(choice.preset, today);

  const data = useMemo(() => {
    if (!assessments || !tests) return null;
    const names = new Map(exercises.map((e) => [e.id, e.name]));
    const done = doneIn(sessions, range);
    return {
      tests: testBalance(assessments, tests, client.targets, range),
      marks: markBalance(sessions, names, range),
      adherence: adherence(sessions, assessments, client.weeklyFrequency, range),
      goals: goalBalance(assessments, tests, client.targets, range),
      volume: tally(done, new Map(exercises.map((e) => [e.id, e])), focuses),
    };
    // range is rebuilt on every render; its two dates are what matter
  }, [assessments, tests, sessions, exercises, focuses, client.targets, client.weeklyFrequency, range.from, range.to]);

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
  const empty = !rows.length && !singles.length && !data.marks.length && !a.done && !a.unticked;

  return (
    <div className="flex flex-col gap-3">
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
            <Tile label="Ganhos" value={gains.length + markGains.length} detail={`${gains.length} em testes · ${markGains.length} em marcas`} tone="text-success" />
            <Tile label="Perdas" value={losses.length + markBelow.length} detail={`${losses.length} em testes · ${markBelow.length} em marcas`} tone="text-danger" />
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
            {data.marks.length === 0 && <p className="text-xs text-muted">Nada para comparar neste período.</p>}
            <MarkList title="Acima da melhor anterior" rows={markGains} clientId={client.id} />
            <MarkList title="Abaixo da melhor anterior" rows={markBelow} clientId={client.id} />
            <MarkList title="Iguais" rows={markSame} clientId={client.id} />
            <p className="text-xs text-muted">Indicativo: compara o e1RM da melhor série. Uma fase mais leve ou um deload também ficam abaixo. Só conta exercícios com carga, até 10 repetições.</p>
          </Section>

          <Section title="Adesão">
            <p className="text-sm">
              <b>{a.done}</b> {a.done === 1 ? "sessão feita" : "sessões feitas"}
              {a.expected != null && ` de cerca de ${a.expected} esperadas`}
            </p>
            {a.unticked > 0 && <p className="text-xs text-warn">{a.unticked === 1 ? "1 sessão sem nada marcado" : `${a.unticked} sessões sem nada marcado`}: não conta como feita.</p>}
            <p className="text-xs text-muted">{client.weeklyFrequency ? `Estimativa: ${client.weeklyFrequency}×/semana da ficha${a.from && a.from !== range.from ? `, desde ${fmtDate(a.from)}` : ""}. Não há plano de sessões para comparar.` : "Preenche a frequência semanal na ficha para estimar a adesão."}</p>
          </Section>

          <Section title="Objetivos">
            {data.goals.length === 0 ? (
              <p className="text-xs text-muted">Sem objetivos com resultados. Define-os na evolução de cada teste.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.goals.map((g) => {
                  const pct = g.progress == null ? 0 : Math.max(0, Math.min(100, g.progress));
                  return (
                    <li key={`${g.testId}-${g.side ?? ""}`} className="flex flex-col gap-1">
                      <span className="flex items-baseline gap-2 text-sm">
                        <Name row={g} />
                        <span className="shrink-0 tabular-nums text-xs">
                          {fmtNum(g.current)} / {fmtNum(g.target)} {g.unit}
                        </span>
                      </span>
                      <span className="h-2 rounded-full bg-card2 overflow-hidden">
                        <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="text-xs text-muted">{g.progress == null ? "Já estava no objetivo" : g.progress < 0 ? "Mais longe do objetivo do que no início" : `${Math.round(g.progress)}% do caminho desde ${fmtNum(g.start)} ${g.unit}`}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title={`Volume · ${data.volume.sets} séries em ${data.volume.sessions} sessões`}>
            <Bars entries={[...data.volume.patterns.entries()]} total={data.volume.sets} />
          </Section>
        </>
      )}
    </div>
  );
}
