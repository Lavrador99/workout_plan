import { useState } from "react";
import { copyBlock, save } from "../lib/db";
import { fmtCircuitHeader } from "../lib/format";
import { parseItemLine } from "../lib/parser";
import { uid } from "../lib/text";
import type { Block, BlockKind, Item, Template } from "../lib/types";
import CircuitTimer from "./CircuitTimer";
import ExerciseInput from "./ExerciseInput";
import ItemRow, { Seg } from "./ItemRow";
import Stepper from "./Stepper";

interface Props {
  block: Block;
  onChange: (b: Block) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}

const KINDS: [BlockKind, string][] = [
  ["list", "Lista"],
  ["sets", "Séries"],
  ["superset", "Superset"],
  ["circuit", "Circuito"],
];

export default function BlockCard({ block, onChange, onDelete, onMove }: Props) {
  const [settings, setSettings] = useState(false);
  const [timer, setTimer] = useState(false);
  const isCircuit = block.kind === "circuit";
  const doneSets = block.items.reduce((n, i) => n + i.sets.filter((s) => s.done).length, 0);
  const totalSets = block.items.reduce((n, i) => n + i.sets.length, 0);

  const setItems = (items: Item[]) => onChange({ ...block, items });
  const moveItem = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= block.items.length) return;
    const items = [...block.items];
    [items[i], items[j]] = [items[j], items[i]];
    setItems(items);
  };

  const add = (text: string) => {
    // "(Russian twist, side bends)" → fillers
    const paren = text.match(/^\((.*)\)$/);
    const parts = paren ? paren[1].split(/\s*[,;]\s*/) : [text];
    const items = parts.filter(Boolean).map((t) => {
      const it = parseItemLine(t);
      if (paren) it.role = "filler";
      return it;
    });
    const kind = block.kind === "list" && items.some((i) => i.sets.length) ? "sets" : block.kind;
    onChange({ ...block, kind, items: [...block.items, ...items] });
  };

  return (
    <section className="card p-3">
      <header className="flex items-center gap-2 mb-1">
        <button type="button" className="flex-1 text-left" onClick={() => setSettings(!settings)}>
          <span className="label">{KINDS.find(([k]) => k === block.kind)?.[1]}</span>
          <div className="font-bold">
            {isCircuit ? fmtCircuitHeader(block) : block.title || (block.kind === "superset" ? "Superset" : "")}
            {isCircuit && block.title && block.title !== "Circuito" && <span className="text-muted font-normal"> · {block.title}</span>}
          </div>
        </button>
        {totalSets > 0 && (
          <span className={`text-xs tabular-nums ${doneSets === totalSets ? "text-success" : "text-muted"}`}>
            {doneSets}/{totalSets}
          </span>
        )}
        {isCircuit && (
          <button type="button" className="btn-accent" onClick={() => setTimer(true)}>
            ▶ Timer
          </button>
        )}
        <button type="button" className="btn-ghost text-muted" onClick={() => setSettings(!settings)} aria-label="Opções do bloco">
          ⋯
        </button>
      </header>

      {settings && (
        <div className="flex flex-col gap-3 p-3 mb-2 rounded-lg bg-bg border border-border">
          <input className="input" value={block.title} placeholder="Título do bloco (opcional)" onChange={(e) => onChange({ ...block, title: e.target.value })} />
          <Seg options={KINDS} value={block.kind} onChange={(k) => onChange({ ...block, kind: k as BlockKind })} />
          {isCircuit && (
            <div className="grid grid-cols-2 gap-3">
              <Stepper label="Trabalho" suffix="s" value={block.work} step={5} onChange={(v) => onChange({ ...block, work: v })} />
              <Stepper label="Pausa" suffix="s" value={block.rest} step={5} onChange={(v) => onChange({ ...block, rest: v })} />
              <Stepper label="Rondas" value={block.rounds} step={1} onChange={(v) => onChange({ ...block, rounds: v })} />
              <Stepper label="Desc. ronda" suffix="s" value={block.roundRest} step={15} onChange={(v) => onChange({ ...block, roundRest: v })} />
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={() => onMove(-1)}>
              ↑ Subir
            </button>
            <button type="button" className="btn" onClick={() => onMove(1)}>
              ↓ Descer
            </button>
            <button
              type="button"
              className="btn"
              onClick={async () => {
                const name = prompt("Nome do template", block.title || "")?.trim();
                if (name) await save<Template>("templates", { id: uid(), updatedAt: 0, name, block: copyBlock(block) });
              }}
            >
              ☆ Template
            </button>
            <button type="button" className="btn text-danger ml-auto" onClick={() => confirm("Apagar este bloco?") && onDelete()}>
              Apagar bloco
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border">
        {block.items.map((it, i) => (
          <ItemRow
            key={it.id}
            item={it}
            onChange={(n) => setItems(block.items.map((x) => (x.id === it.id ? n : x)))}
            onDelete={() => setItems(block.items.filter((x) => x.id !== it.id))}
            onMove={(d) => moveItem(i, d)}
          />
        ))}
      </div>

      <div className="mt-2">
        <ExerciseInput onSubmit={add} placeholder="+ exercício (ex: Hip hike 2x12 E+1)" />
      </div>

      {timer && <CircuitTimer block={block} onClose={() => setTimer(false)} />}
    </section>
  );
}
