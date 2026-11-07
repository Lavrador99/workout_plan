import { PageLoading } from "../components/States";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { ask } from "../components/Dialogs";
import { useEffect, useRef, useState } from "react";
import PageHeader, { NotFound } from "../components/PageHeader";
import ResultCard, { fmtFinal } from "../components/ResultCard";
import Sheet, { SheetFooter } from "../components/Sheet";
import TestPicker from "../components/TestPicker";
import { bodyMassAt, newResult, previousResult } from "../lib/assessment";
import { remove, save } from "../lib/db";
import { back, go, useAssessment, useAssessments, useClient, useTests } from "../lib/hooks";
import { fmtDate } from "../lib/text";
import type { Assessment, TestDef, TestResult } from "../lib/types";

/** Recording an assessment, usually on the phone in the gym. */
export default function AssessmentPage({ id }: { id: string }) {
  const stored = useAssessment(id);
  const clientId = stored?.clientId ?? "";
  const client = useClient(clientId);
  const assessments = useAssessments(clientId);
  const tests = useTests() ?? [];
  const [a, setA] = useState<Assessment | null>(null);
  const [picking, setPicking] = useState(false);
  const [details, setDetails] = useState(false);
  /** The test being recorded; until one is chosen, the first still empty. */
  const [chosen, setChosen] = useState<string | null | undefined>();
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef<Assessment | null>(null);

  // Local copy for instant edits; DB updates from sync are taken when not mid-edit.
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

  if (stored === null || (stored?.deleted && !a)) return <NotFound title="Avaliação" back={["clients"]} />;
  if (!a) return <PageLoading title="Avaliação" back={["clients"]} />;

  const update = (next: Assessment) => {
    setA(next);
    latest.current = next;
    clearTimeout(pending.current);
    pending.current = setTimeout(() => void flush(), 400);
  };

  const setResult = (r: TestResult) => update({ ...a, results: a.results.map((x) => (x.id === r.id ? r : x)) });
  const addTests = (list: TestDef[]) => {
    const added = list.map(newResult);
    update({ ...a, results: [...a.results, ...added] });
    setChosen(added[0]?.id);
  };
  const removeResult = async (r: TestResult) => {
    if (r.trials.some((t) => t.value != null) && !(await ask(`Tirar ${r.name} desta avaliação? Os valores registados perdem-se.`))) return;
    update({ ...a, results: a.results.filter((x) => x.id !== r.id) });
  };

  const openId = chosen === undefined ? (a.results.find((r) => !fmtFinal(r))?.id ?? null) : chosen;
  const filled = a.results.filter((r) => fmtFinal(r)).length;

  return (
    <>
    <PageHeader
      title={a.title || "Avaliação"}
      subtitle={[client?.name, fmtDate(a.date)].filter(Boolean).join(" · ")}
      back={["client", a.clientId, "assessments"]}
      actions={
        <button type="button" className="btn shrink-0" onClick={() => setDetails(true)}>
          Detalhes
        </button>
      }
    />
    <div className="page">
      {client && !client.consentAt && (
        <button type="button" className="text-xs text-warn text-left" onClick={() => go("client", a.clientId, "info")}>
          <TriangleAlert /> Sem consentimento registado na ficha. Registar <ChevronRight />
        </button>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted flex-1">{a.results.length ? `${filled} de ${a.results.length} testes registados` : ""}</span>
        <button type="button" className="btn-accent" onClick={() => setPicking(true)}>
          + Testes
        </button>
      </div>

      {a.results.length === 0 ? (
        <p className="text-sm text-muted">Adiciona testes para começar a registar.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {a.results.map((r, i) => (
            <ResultCard
              key={r.id}
              result={r}
              open={r.id === openId}
              onToggle={() => setChosen(r.id === openId ? null : r.id)}
              onNext={a.results[i + 1] ? () => setChosen(a.results[i + 1].id) : undefined}
              previous={previousResult(assessments ?? [], a, r.testId)}
              date={a.date}
              test={tests.find((t) => t.id === r.testId)}
              bodyMass={bodyMassAt(assessments ?? [], a)}
              onChange={setResult}
              onRemove={() => void removeResult(r)}
            />
          ))}
        </ul>
      )}

      {picking && <TestPicker tests={tests} picked={new Set(a.results.map((r) => r.testId))} onAdd={addTests} onClose={() => setPicking(false)} />}

      {details && (
        <Sheet title="Detalhes da avaliação" onClose={() => setDetails(false)}>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="label">Data</span>
              <input className="input" type="date" value={a.date} onChange={(e) => e.target.value && update({ ...a, date: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label">Título</span>
              <input className="input" value={a.title} placeholder="Pré-época" onChange={(e) => update({ ...a, title: e.target.value })} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="label">Condições</span>
            <input className="input" value={a.conditions} placeholder="Hora, piso, fadiga, quem avaliou" onChange={(e) => update({ ...a, conditions: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Notas</span>
            <textarea className="input py-2 min-h-[100px]" value={a.notes} onChange={(e) => update({ ...a, notes: e.target.value })} />
          </label>
          <SheetFooter>
            <button type="button" className="btn-accent flex-1" onClick={() => setDetails(false)}>
              Concluir
            </button>
            <button
              type="button"
              className="btn text-danger"
              onClick={async () => {
                if (!(await ask("Apagar esta avaliação?"))) return;
                latest.current = null;
                clearTimeout(pending.current);
                await remove("assessments", a.id);
                back("client", a.clientId, "assessments");
              }}
            >
              Apagar
            </button>
          </SheetFooter>
        </Sheet>
      )}
    </div>
    </>
  );
}
