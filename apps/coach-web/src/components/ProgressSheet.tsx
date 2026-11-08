import { useState } from "react";
import { changeWeights, DIMENSIONS, goalLabel, PRIMARY_GOALS, sameWeights, totalOf, weightsOf } from "../lib/progress";
import { fmtDate } from "@treino/core/text";
import type { Client, Weights } from "@treino/core/types";
import { ChipPick } from "./Chips";
import { NumberField } from "./ResultCard";
import Sheet, { SheetFooter } from "./Sheet";

const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Main goal and weights of the index. Every change stays in the log. */
export default function ProgressSheet({ client, onChange, onClose }: { client: Client; onChange: (patch: Partial<Client>) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Weights>(() => weightsOf(client));
  const current = weightsOf(client);
  const total = totalOf(draft);
  const goal = client.primaryGoal ?? "saude";
  const log = [...(client.weightLog ?? [])].reverse();

  const pickGoal = (label: string | undefined) => {
    const next = PRIMARY_GOALS.find((g) => g.label === label);
    if (!next) return;
    onChange(changeWeights(client, next.id, null, Date.now()));
    setDraft(next.weights);
  };

  return (
    <Sheet title="Índice de progresso" subtitle={client.name} onClose={onClose}>
      <div className="flex flex-col gap-1">
        <span className="label">Objetivo principal</span>
        <div className="flex flex-col items-start">
          <ChipPick options={PRIMARY_GOALS.map((g) => g.label)} value={goalLabel(client.primaryGoal)} onChange={pickGoal} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="label">Pesos</span>
        {DIMENSIONS.map((d) => (
          <div key={d.id} className="flex items-center gap-2">
            <span className="flex-1 min-w-0 text-sm">{d.label}</span>
            <span className="w-20 shrink-0">
              <NumberField value={draft[d.id]} label={`Peso de ${d.label}`} onChange={(v) => setDraft({ ...draft, [d.id]: v ?? 0 })} />
            </span>
            <span className="text-xs text-muted">%</span>
          </div>
        ))}
        <p className={`text-sm ${total === 100 ? "text-muted" : "text-warn"}`}>Total: {total}%{total !== 100 && " · tem de dar 100%"}</p>
        <p className="text-xs text-muted">Valores iniciais de configuração, não ponderações científicas. Índices calculados com pesos diferentes ficam assinalados.</p>
      </div>

      {log.length > 0 && (
        <details>
          <summary className="label cursor-pointer">Histórico · {log.length}</summary>
          <ul className="divide-y divide-border">
            {log.map((l) => (
              <li key={l.at} className="py-2 flex flex-col">
                <span className="text-sm">
                  {fmtDate(dayOf(l.at))} · {goalLabel(l.primaryGoal)}
                  {l.custom && " · pesos próprios"}
                </span>
                <span className="text-xs text-muted">{DIMENSIONS.map((d) => l.weights[d.id]).join(" / ")}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <SheetFooter>
        {client.weights && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              onChange(changeWeights(client, goal, null, Date.now()));
              setDraft(PRIMARY_GOALS.find((g) => g.id === goal)!.weights);
            }}
          >
            Repor
          </button>
        )}
        <button type="button" className="btn-accent flex-1" disabled={total !== 100 || sameWeights(draft, current)} onClick={() => onChange(changeWeights(client, goal, draft, Date.now()))}>
          Guardar pesos
        </button>
      </SheetFooter>
    </Sheet>
  );
}
