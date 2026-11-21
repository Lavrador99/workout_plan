import { PageLoading } from "../components/States";
import { ChevronRight, Printer, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Field from "../components/Field";
import PageHeader, { NotFound } from "../components/PageHeader";
import { changeTone, fmtChange, SIDE_SHORT } from "../lib/assessment";
import { save } from "../lib/db";
import { go, useAssessment, useAssessments, useClient, useFocuses, useGoals, useProfile, useScreenings, useTests } from "../lib/hooks";
import { addWeeks, baselines, buildReport, emptyReport, MAX_PRIORITIES, type Report, type ReportRow } from "../lib/report";
import { evaluate, MODULES, reassessWeeks, type Evaluation, type ModuleDef } from "../lib/modules";
import { ModuleVisual } from "../components/ModuleReport";
import { ageOf } from "../lib/screening";
import { fmtDate, fmtNum } from "@treino/core/text";
import type { Assessment, AssessmentReport, Client, CoachProfile } from "@treino/core/types";

/** The client's assessment report: the coach's text on top, the page as it prints below. */
export default function ReportPage({ id }: { id: string }) {
  const stored = useAssessment(id);
  const clientId = stored?.clientId ?? "";
  const client = useClient(clientId);
  const assessments = useAssessments(clientId);
  const tests = useTests();
  const focuses = useFocuses();
  const goals = useGoals(clientId);
  const screenings = useScreenings(clientId);
  const profile = useProfile();
  const [a, setA] = useState<Assessment | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef<Assessment | null>(null);

  useEffect(() => {
    if (stored && !pending.current) setA(stored);
  }, [stored]);

  const flush = async () => {
    clearTimeout(pending.current);
    pending.current = undefined;
    const next = latest.current;
    latest.current = null;
    if (next) await save("assessments", next);
  };
  useEffect(() => () => void flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const report = useMemo(
    () => (a && client && assessments && tests && focuses && goals && screenings ? buildReport({ client, assessment: a, assessments, tests, focuses, goals, screenings }) : null),
    [a, client, assessments, tests, focuses, goals, screenings],
  );
  const mod = a?.moduleId ? MODULES[a.moduleId] : undefined;
  const evaluation = useMemo(() => (mod && a && client && tests && focuses ? evaluate(mod, a, { client, tests, focuses }) : null), [mod, a, client, tests, focuses]);

  if (stored === null || (stored?.deleted && !a)) return <NotFound title="Relatório" back={["clients"]} />;
  if (!a || !client || !report || !assessments || profile === undefined) return <PageLoading title="Relatório" back={["clients"]} />;

  const text = a.report ?? emptyReport();
  const write = (patch: Partial<AssessmentReport>) => {
    const next = { ...a, report: { ...text, ...patch } };
    setA(next);
    latest.current = next;
    clearTimeout(pending.current);
    pending.current = setTimeout(() => void flush(), 400);
  };
  const options = baselines(assessments, a);
  const priorities = Array.from({ length: MAX_PRIORITIES }, (_, i) => text.priorities[i] ?? "");

  return (
    <>
      <PageHeader
        title="Relatório"
        subtitle={[client.name, fmtDate(a.date)].join(" · ")}
        back={["assessment", a.id]}
        actions={
          <button
            type="button"
            className="btn-accent shrink-0"
            onClick={async () => {
              await flush();
              window.print();
            }}
          >
            <Printer /> PDF
          </button>
        }
      />
      <div className="page">
        <div className="no-print flex flex-col gap-3">
          {!profile?.name && (
            <button type="button" className="text-xs text-warn text-left" onClick={() => go("settings")}>
              <TriangleAlert /> Sem perfil profissional: o relatório sai sem o teu nome. Preencher nas Definições <ChevronRight />
            </button>
          )}
          <section className="card p-3 flex flex-col gap-3">
            <h2 className="font-semibold">O teu texto</h2>
            {options.length > 0 && (
              <Field label="Comparar com">
                <select className="input" value={report.baseline?.id ?? ""} onChange={(e) => write({ compareWith: e.target.value || null })}>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {fmtDate(o.date)}
                      {o.title ? ` · ${o.title}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="O que encontrei">
              <textarea className="input py-2 min-h-[120px]" value={text.findings} placeholder="O que viste na avaliação, em linguagem do cliente" onChange={(e) => write({ findings: e.target.value })} />
            </Field>
            <div className="flex flex-col gap-2">
              <span className="label">Prioridades</span>
              {priorities.map((p, i) => (
                <input
                  key={i}
                  className="input"
                  value={p}
                  aria-label={`Prioridade ${i + 1}`}
                  placeholder={`${i + 1}.`}
                  onChange={(e) => write({ priorities: priorities.map((x, j) => (j === i ? e.target.value : x)) })}
                />
              ))}
            </div>
            <Field label="Plano">
              <textarea className="input py-2 min-h-[120px]" value={text.plan} placeholder="O que vamos fazer nas próximas semanas" onChange={(e) => write({ plan: e.target.value })} />
            </Field>
            {mod && (
              <Field label="Mensagem para o cliente">
                <textarea className="input py-2 min-h-[72px]" value={text.message ?? ""} placeholder="Uma frase curta e positiva, ligada ao que a pessoa quer voltar a fazer" onChange={(e) => write({ message: e.target.value })} />
              </Field>
            )}
            <Field label="Próxima reavaliação">
              <input className="input" type="date" value={text.nextDate ?? addWeeks(a.date, reassessWeeks(a.moduleId))} onChange={(e) => write({ nextDate: e.target.value || null })} />
            </Field>
          </section>
          <p className="text-xs text-muted">Pré-visualização. No botão PDF escolhe "Guardar como PDF" (no iPhone: Partilhar → Imprimir → Partilhar).</p>
        </div>

        <ReportSheet client={client} assessment={a} text={text} report={report} profile={profile} module={mod && evaluation ? { mod, evaluation } : undefined} />
      </div>
    </>
  );
}

/** A module report shows the areas as a radar and a body map instead of the table of tests. */
function ReportSheet({ client, assessment, text, report, profile, module }: { client: Client; assessment: Assessment; text: AssessmentReport; report: Report; profile: CoachProfile | null; module?: { mod: ModuleDef; evaluation: Evaluation } }) {
  const age = ageOf(client, assessment.date);
  const priorities = text.priorities.filter((p) => p.trim());
  const contacts = [profile?.phone, profile?.email, profile?.instagram].filter(Boolean);
  const nextDate = text.nextDate ?? addWeeks(assessment.date, reassessWeeks(assessment.moduleId));

  return (
    <article className="report">
      <header className="report-head">
        {profile?.logo && <img src={profile.logo} alt="" className="report-logo" />}
        <div className="flex-1 min-w-0">
          {profile?.name && <p className="font-bold">{profile.name}</p>}
          <p className="report-muted">{[profile?.title, profile?.licence && `Título profissional n.º ${profile.licence}`].filter(Boolean).join(" · ")}</p>
        </div>
      </header>

      <div className="report-block">
        <h1 className="report-title">Relatório de avaliação</h1>
        <p>
          <strong>{client.name}</strong>
          {age != null ? `, ${age} anos` : ""} · {fmtDate(assessment.date)}
          {assessment.title ? ` · ${assessment.title}` : ""}
        </p>
        {report.baseline && <p className="report-muted">Comparado com a avaliação de {fmtDate(report.baseline.date)}{report.baseline.title ? ` (${report.baseline.title})` : ""}.</p>}
      </div>

      {report.cautions.length > 0 && (
        <section className="report-block report-box">
          <h2 className="report-h2">Cuidados no treino</h2>
          <ul className="report-list">
            {report.cautions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      {text.findings.trim() && (
        <section className="report-block">
          <h2 className="report-h2">O que encontrei</h2>
          <p className="whitespace-pre-line">{text.findings}</p>
        </section>
      )}

      {module && <ModuleVisual mod={module.mod} areas={module.evaluation.areas} />}

      {!module && report.groups.length > 0 && (
        <section>
          <h2 className="report-h2">Resultados</h2>
          <table className="report-table">
            <thead>
              <tr>
                <th>Teste</th>
                {report.baseline && <th className="num">{fmtDate(report.baseline.date)}</th>}
                <th className="num">{fmtDate(assessment.date)}</th>
                {report.baseline && <th className="num">Mudança</th>}
                <th>Referência</th>
              </tr>
            </thead>
            {report.groups.map((g) => (
              <tbody key={g.category ?? "outros"} className="report-group">
                <tr>
                  <th colSpan={5} className="report-category">
                    {g.category ?? "Outros"}
                  </th>
                </tr>
                {g.rows.map((row) => (
                  <ResultRows key={row.testId} row={row} withBaseline={!!report.baseline} />
                ))}
              </tbody>
            ))}
          </table>
          <p className="report-note">
            {report.baseline && "As mudanças só têm cor quando ultrapassam o erro de medição do teste. "}
            {report.uncoloured && "Sem cor: dentro do erro, ou erro do teste por definir. "}
            A referência é a posição num grupo publicado (P50 = a meio do grupo), não uma nota.
          </p>
        </section>
      )}

      {(report.goals.length > 0 || report.otherGoals.length > 0) && (
        <section className="report-block">
          <h2 className="report-h2">Objetivos</h2>
          <ul className="report-list">
            {report.goals.map((g) => (
              <li key={g.testId + (g.side ?? "")}>
                <strong>{g.name}</strong>
                {g.side ? ` (${SIDE_SHORT[g.side]})` : ""}: {fmtNum(g.start)} → {fmtNum(g.current)} {g.unit}, objetivo {fmtNum(g.target)} {g.unit}
                {g.progress != null ? ` · ${Math.round(Math.max(0, Math.min(100, g.progress)))}% do caminho` : ""}
              </li>
            ))}
            {report.otherGoals.map((g) => (
              <li key={g.id}>
                <strong>{g.title}</strong>
                {g.status === "achieved" ? " · alcançado" : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {priorities.length > 0 && (
        <section className="report-block">
          <h2 className="report-h2">Prioridades</h2>
          <ol className="report-list list-decimal">
            {priorities.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </section>
      )}

      {text.plan.trim() && (
        <section className="report-block">
          <h2 className="report-h2">Plano</h2>
          <p className="whitespace-pre-line">{text.plan}</p>
        </section>
      )}

      {module && text.message?.trim() && <p className="report-block report-message">{text.message}</p>}

      <p className="report-block">
        <strong>Próxima reavaliação:</strong> {fmtDate(nextDate)}
      </p>

      <footer className="report-foot">
        {contacts.length > 0 && <p>{contacts.join(" · ")}</p>}
        {report.sources.length > 0 && (
          <p>
            Referências:{" "}
            {report.sources.map((s, i) => (
              <span key={s.id}>
                {i > 0 ? "; " : ""}
                {s.citation}
              </span>
            ))}
          </p>
        )}
      </footer>
    </article>
  );
}

const TONE: Record<ReturnType<typeof changeTone>, string> = { good: "report-good", bad: "report-bad", neutral: "" };

function ResultRows({ row, withBaseline }: { row: ReportRow; withBaseline: boolean }) {
  const name = `${row.name}${row.estimated ? " (estimado)" : ""}`;
  return (
    <>
      {row.sides.map((s, i) => (
        <tr key={s.side ?? "both"} className={i === row.sides.length - 1 ? "report-last" : ""}>
          <td>
            {i === 0 ? name : ""}
            {s.side ? <span className="report-muted"> {i === 0 ? " · " : ""}{SIDE_SHORT[s.side]}</span> : null}
            {i === row.sides.length - 1 && row.asymmetry && <div className="report-muted text-[11px]">Assimetria: {row.asymmetry}</div>}
          </td>
          {withBaseline && <td className="num">{fmtNum(s.before) || "—"}</td>}
          <td className="num font-semibold">
            {fmtNum(s.now) || "—"} <span className="report-muted">{s.now != null ? row.unit : ""}</span>
          </td>
          {withBaseline && <td className={`num ${s.change ? TONE[changeTone(s.change)] : ""}`}>{s.change ? fmtChange(s.change, row.unit) : row.differentProtocol ? "protocolo novo" : ""}</td>}
          <td>{i === 0 && row.reference ? `${row.reference.position} · ${row.reference.label}${row.reference.estimated ? " (estimado)" : ""}` : ""}</td>
        </tr>
      ))}
    </>
  );
}
