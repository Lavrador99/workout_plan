import { useState } from "react";
import { asymmetry, change, changeTone, finalValue, fmtAsymmetry, previousResult, repeatResults, testMdc } from "../lib/assessment";
import { newAssessment, save } from "../lib/db";
import { go, useAssessments, useTests } from "../lib/hooks";
import { fmtDate, fmtNum } from "../lib/text";
import type { Assessment, TestDef, TestResult } from "../lib/types";
import { fmtFinal, TONE_CLASS } from "./ResultCard";

async function open(a: Assessment) {
  const saved = await save("assessments", a);
  go("assessment", saved.id);
}

/** What moved since the last result of a test without sides: "+2,1", coloured only beyond the measurement error. */
function Change({ result, previous, test }: { result: TestResult; previous: TestResult | undefined; test: TestDef | undefined }) {
  if (result.sided || !previous || previous.version !== result.version) return null;
  const [before, now] = [finalValue(previous), finalValue(result)];
  if (before == null || now == null) return null;
  const c = change(before, now, result.direction, result.scale, testMdc(test, result.version));
  return <span className={TONE_CLASS[changeTone(c)]}>{`${c.delta > 0 ? "+" : ""}${fmtNum(c.delta)}`}</span>;
}

/** The client's assessments: the latest one at a glance, then all of them. */
export default function AssessmentsTab({ clientId }: { clientId: string }) {
  const assessments = useAssessments(clientId);
  const tests = useTests() ?? [];
  const list = assessments ?? [];
  const last = list.find((a) => a.results.some((r) => fmtFinal(r))) ?? list[0]; // a new one is empty until filled in
  const results = last?.results.filter((r) => fmtFinal(r)) ?? [];
  const [picked, setPicked] = useState<string[]>([]);
  /** Two at most: a third tick replaces the first one. */
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button type="button" className="btn-accent flex-1" onClick={() => void open(newAssessment(clientId))}>
          + Nova avaliação
        </button>
        <button type="button" className="btn flex-1" disabled={!last} onClick={() => last && void open({ ...newAssessment(clientId), title: last.title, results: repeatResults(last.results, tests) })}>
          ⧉ Repetir última
        </button>
      </div>

      {results.length > 0 && (
        <section className="card p-3 flex flex-col gap-2">
          <h2 className="label">Última avaliação · {fmtDate(last.date)}</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {results.map((r) => {
              const asym = asymmetry(r);
              return (
                <li key={r.id}>
                  <button type="button" className="w-full text-left flex flex-col" onClick={() => go("evolution", clientId, r.testId)}>
                    <span className="flex items-baseline gap-2 w-full">
                      <span className="flex-1 min-w-0 truncate">{r.name}</span>
                      <span className="font-semibold shrink-0">{fmtFinal(r)}</span>
                      <Change result={r} previous={previousResult(list, last, r.testId)?.result} test={tests.find((t) => t.id === r.testId)} />
                    </span>
                    {asym && <span className="text-xs text-muted">{fmtAsymmetry(asym, r.unit)}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {list.length === 0 ? (
        <p className="text-sm text-muted">Ainda não há avaliações.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((a) => (
            <li key={a.id} className="card flex items-stretch">
              <label className="flex items-center px-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-accent" aria-label={`Comparar ${fmtDate(a.date)}`} checked={picked.includes(a.id)} onChange={() => toggle(a.id)} />
              </label>
              <button type="button" className="flex-1 min-w-0 text-left pr-3 py-2 flex items-center gap-2" onClick={() => go("assessment", a.id)}>
                <span className="font-semibold shrink-0">{fmtDate(a.date)}</span>
                <span className="flex-1 min-w-0 truncate text-muted">{a.title}</span>
                <span className="text-xs text-muted shrink-0">
                  {a.results.length} {a.results.length === 1 ? "teste" : "testes"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {list.length > 1 && (
        <button type="button" className="btn" disabled={picked.length !== 2} onClick={() => go("compare", clientId, picked[0], picked[1])}>
          {picked.length === 2 ? "Comparar selecionadas" : "Escolhe duas avaliações para comparar"}
        </button>
      )}
    </div>
  );
}
