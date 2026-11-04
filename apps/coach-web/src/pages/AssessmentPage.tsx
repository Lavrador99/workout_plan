import { useEffect, useRef, useState } from "react";
import ResultCard from "../components/ResultCard";
import TestPicker from "../components/TestPicker";
import { bodyMassAt, newResult, previousResult } from "../lib/assessment";
import { remove, save } from "../lib/db";
import { go, useAssessment, useAssessments, useClient, useTests } from "../lib/hooks";
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

  if (stored === null || (stored?.deleted && !a)) return <p className="p-4 text-muted">Avaliação não encontrada.</p>;
  if (!a) return null;

  const update = (next: Assessment) => {
    setA(next);
    latest.current = next;
    clearTimeout(pending.current);
    pending.current = setTimeout(() => void flush(), 400);
  };

  const setResult = (r: TestResult) => update({ ...a, results: a.results.map((x) => (x.id === r.id ? r : x)) });
  const addTests = (list: TestDef[]) => update({ ...a, results: [...a.results, ...list.map(newResult)] });
  const removeResult = (r: TestResult) => {
    if (r.trials.some((t) => t.value != null) && !confirm(`Tirar ${r.name} desta avaliação? Os valores registados perdem-se.`)) return;
    update({ ...a, results: a.results.filter((x) => x.id !== r.id) });
  };

  const back = () => go("client", a.clientId, "assessments");

  return (
    <div className="flex flex-col gap-3 p-3 pb-28">
      <div className="flex items-center gap-2">
        <button type="button" className="btn-ghost -ml-2" onClick={back}>
          ←
        </button>
        <h1 className="text-xl font-bold flex-1 truncate">{client?.name ?? "Avaliação"}</h1>
      </div>

      {client && !client.consentAt && (
        <button type="button" className="text-xs text-warn text-left" onClick={() => go("client", a.clientId, "info")}>
          ⚠ Sem consentimento registado na ficha. Registar ›
        </button>
      )}

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

      {picking ? (
        <TestPicker tests={tests} picked={new Set(a.results.map((r) => r.testId))} onAdd={addTests} onClose={() => setPicking(false)} />
      ) : (
        <button type="button" className="btn-accent" onClick={() => setPicking(true)}>
          + Testes
        </button>
      )}

      {a.results.length === 0 ? (
        <p className="text-sm text-muted">Adiciona testes para começar a registar.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {a.results.map((r) => (
            <ResultCard
              key={r.id}
              result={r}
              previous={previousResult(assessments ?? [], a, r.testId)}
              date={a.date}
              test={tests.find((t) => t.id === r.testId)}
              bodyMass={bodyMassAt(assessments ?? [], a)}
              onChange={setResult}
              onRemove={() => removeResult(r)}
            />
          ))}
        </ul>
      )}

      <label className="flex flex-col gap-1">
        <span className="label">Notas</span>
        <textarea className="input py-2 min-h-[80px]" value={a.notes} onChange={(e) => update({ ...a, notes: e.target.value })} />
      </label>

      <button
        type="button"
        className="btn text-danger self-start"
        onClick={async () => {
          if (!confirm("Apagar esta avaliação?")) return;
          latest.current = null;
          clearTimeout(pending.current);
          await remove("assessments", a.id);
          back();
        }}
      >
        Apagar avaliação
      </button>
    </div>
  );
}
