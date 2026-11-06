import { useState } from "react";
import { newGoal, remove, save } from "../lib/db";
import { IMPORTANCE } from "../lib/progress";
import { todayISO } from "../lib/text";
import type { Goal, GoalStatus, Importance, TestDef } from "../lib/types";
import { NumberField } from "./ResultCard";
import Seg from "./Seg";
import Sheet, { SheetFooter } from "./Sheet";

const KINDS: [string, string][] = [
  ["qualitative", "Qualitativo"],
  ["test", "Teste"],
];
const STATUSES: [GoalStatus, string][] = [
  ["active", "Em curso"],
  ["achieved", "Atingido"],
  ["dropped", "Abandonado"],
];

/** Add or edit one goal. A test can only have one, so the ones taken are not offered. */
export default function GoalSheet({ clientId, goal, goals, tests, onClose }: { clientId: string; goal: Goal | null; goals: Goal[]; tests: TestDef[]; onClose: () => void }) {
  const [kind, setKind] = useState(goal?.testId ? "test" : "qualitative");
  const [title, setTitle] = useState(goal?.title ?? "");
  const [testId, setTestId] = useState(goal?.testId ?? "");
  const [target, setTarget] = useState<number | null>(goal?.target ?? null);
  const [dueDate, setDueDate] = useState(goal?.dueDate ?? "");
  const [criteria, setCriteria] = useState(goal?.criteria ?? "");
  const [importance, setImportance] = useState<Importance>(goal?.importance ?? 1);
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? "active");

  const isTest = kind === "test";
  const taken = new Set(goals.map((g) => g.testId));
  const free = tests.filter((t) => t.id === goal?.testId || !taken.has(t.id));
  const unit = tests.find((t) => t.id === testId)?.unit;
  const ready = isTest ? !!testId && target != null : !!title.trim();

  const submit = () => {
    const base = goal ?? newGoal(clientId, isTest ? testId : undefined);
    const achievedAt = status !== "achieved" ? null : (base.achievedAt ?? todayISO());
    void save("goals", { ...base, title: isTest ? "" : title.trim(), target: isTest ? target : null, dueDate: dueDate || null, criteria: criteria.trim(), importance, status, achievedAt });
    onClose();
  };

  return (
    <Sheet title={goal ? "Objetivo" : "Novo objetivo"} onClose={onClose} persistent>
      {!goal && <Seg options={KINDS} value={kind} onChange={setKind} />}

      {isTest ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="label">Teste</span>
            <select className="input" value={testId} disabled={!!goal} onChange={(e) => setTestId(e.target.value)}>
              <option value="">Escolher…</option>
              {free.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Valor-alvo{unit ? ` (${unit})` : ""}</span>
            <NumberField value={target} label="Valor-alvo" onChange={setTarget} />
          </label>
        </>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="label">Objetivo</span>
          <input className="input" value={title} placeholder="ex: Correr 30 minutos sem dor" onChange={(e) => setTitle(e.target.value)} />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="label">Data limite</span>
        <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">Critério de conclusão</span>
        <textarea className="input min-h-20" value={criteria} onChange={(e) => setCriteria(e.target.value)} />
      </label>

      <div className="flex flex-col gap-1">
        <span className="label">Importância</span>
        <Seg options={IMPORTANCE.map(([v, label]) => [String(v), label])} value={String(importance)} onChange={(v) => setImportance(Number(v) as Importance)} />
      </div>

      {goal && (
        <div className="flex flex-col gap-1">
          <span className="label">Estado</span>
          <Seg options={STATUSES} value={status} onChange={(s) => setStatus(s as GoalStatus)} />
        </div>
      )}

      <SheetFooter>
        {goal && (
          <button
            type="button"
            className="btn text-danger"
            onClick={() => {
              void remove("goals", goal.id);
              onClose();
            }}
          >
            Apagar
          </button>
        )}
        <button type="button" className="btn-accent flex-1" disabled={!ready} onClick={submit}>
          Guardar
        </button>
      </SheetFooter>
    </Sheet>
  );
}
