import { ArrowDown, ArrowUp, Copy, Ellipsis, Play, Star } from "lucide-react";
import { ask, askText } from "./Dialogs";
import { useRef, useState } from "react";
import { clearViewState, useViewState } from "../lib/hooks";
import { copyBlock, save } from "../lib/db";
import { fmtCircuitHeader } from "../lib/format";
import { itemsFromLine } from "../lib/parser";
import { useReorder } from "../lib/reorder";
import { uid } from "../lib/text";
import type { Block, BlockKind, Item, Section, Template } from "../lib/types";
import BlockDiagram, { kindLabel } from "./BlockDiagram";
import DragHandle from "./DragHandle";
import CircuitTimer from "./CircuitTimer";
import ItemRow from "./ItemRow";
import PrescribeSheet, { sheetKey } from "./PrescribeSheet";
import Seg from "./Seg";
import Sheet from "./Sheet";
import Stepper from "./Stepper";

interface Props {
  block: Block;
  onChange: (b: Block) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  /** Drag handle (SessionPage's reorder). */
  handle?: React.ReactNode;
  /** Open the exercise picker straight away (block just created). */
  autoPick?: boolean;
  /** Plain exercises in sequence: no block header, exercises are added from the session. */
  plain?: boolean;
}

const KINDS: [BlockKind, string][] = [
  ["list", "Lista"],
  ["sets", "Séries"],
  ["superset", "Superset"],
  ["circuit", "Circuito"],
  ["emom", "EMOM"],
  ["amrap", "AMRAP"],
];

export const SECTIONS: Section[] = ["aquecimento", "ativação", "mobilidade", "principal", "condicionamento", "retorno à calma"];

const PRESETS: [string, Partial<Block>][] = [
  ["Tabata 20/10 ×8", { work: 20, rest: 10, rounds: 8, roundRest: 60 }],
  ["HIIT 40/20", { work: 40, rest: 20, rounds: 3, roundRest: 90 }],
  ["30/30", { work: 30, rest: 30, rounds: 4, roundRest: 60 }],
  ["45/15", { work: 45, rest: 15, rounds: 3, roundRest: 90 }],
];

/** Sensible numbers when switching to a timed block. */
export const KIND_DEFAULTS: Partial<Record<BlockKind, Partial<Block>>> = {
  circuit: { work: 40, rest: 20, rounds: 3, roundRest: 90 },
  emom: { work: 60, rest: null, rounds: 10, roundRest: null },
  amrap: { work: 600, rest: null, rounds: null, roundRest: null },
};

export default function BlockCard({ block, onChange, onDelete, onMove, onDuplicate, handle, autoPick, plain }: Props) {
  const [settings, setSettings] = useState(false);
  const [picking, setPicking] = useViewState(`pick:${block.id}`, !!autoPick);
  const [timer, setTimer] = useState(false);
  const [diagram, setDiagram] = useState(false);
  const isCircuit = block.kind === "circuit" || block.kind === "emom" || block.kind === "amrap";
  const doneSets = block.items.reduce((n, i) => n + i.sets.filter((s) => s.done).length, 0);
  const totalSets = block.items.reduce((n, i) => n + i.sets.length, 0);

  const setItems = (items: Item[]) => onChange({ ...block, items });
  const reorder = useReorder(block.items, setItems);
  const duplicateItem = (it: Item) => {
    const i = block.items.findIndex((x) => x.id === it.id);
    const copy = { ...it, id: uid(), sets: it.sets.map((r) => ({ ...r, done: false })) };
    setItems([...block.items.slice(0, i + 1), copy, ...block.items.slice(i + 1)]);
  };
  const moveItem = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= block.items.length) return;
    const items = [...block.items];
    [items[i], items[j]] = [items[j], items[i]];
    setItems(items);
  };

  // The picker adds several items in a row before this block re-renders,
  // so additions go onto the latest block, not the one from the last render.
  const latest = useRef(block);
  latest.current = block;

  const addItems = (items: Item[]) => {
    const b = latest.current;
    const kind = b.kind === "list" && items.some((i) => i.sets.length) ? "sets" : b.kind;
    latest.current = { ...b, kind, items: [...b.items, ...items] };
    onChange(latest.current);
  };

  if (plain && !block.items.length && !block.title) return null;

  return (
    <section className={plain ? "card px-3 py-1" : "card p-3"}>
      {plain ? (
        block.title && (
          <header className="flex items-center gap-2 pt-2">
            <span className="label flex-1">{block.title}</span>
            <button type="button" className="btn-ghost text-muted" onClick={() => setSettings(true)} aria-label="Opções do bloco">
              <Ellipsis />
            </button>
          </header>
        )
      ) : (
      <header className="flex items-center gap-2 mb-1">
        {handle}
        <button type="button" className="flex-1 min-w-0 text-left" onClick={() => setSettings(true)}>
          <span className="label">{kindLabel(block)}</span>
          <div className="font-bold">
            {isCircuit ? fmtCircuitHeader(block) : block.title || (block.kind === "superset" ? kindLabel(block) : "")}
            {isCircuit && block.title && block.title !== "Circuito" && <span className="text-muted font-normal"> · {block.title}</span>}
          </div>
        </button>
        <button type="button" className={`btn-ghost px-2 ${diagram ? "text-accent" : "text-muted"}`} onClick={() => setDiagram(!diagram)} aria-label="Ver estrutura">
          ◫
        </button>
        {totalSets > 0 && (
          <span className={`text-xs tabular-nums ${doneSets === totalSets ? "text-success" : "text-muted"}`}>
            {doneSets}/{totalSets}
          </span>
        )}
        {isCircuit && (
          <button type="button" className="btn-accent" onClick={() => setTimer(true)}>
            <Play /> Timer
          </button>
        )}
        <button type="button" className="btn-ghost text-muted" onClick={() => setSettings(true)} aria-label="Opções do bloco">
          <Ellipsis />
        </button>
      </header>
      )}

      {settings && (
        <Sheet title="Opções do bloco" subtitle={block.title || kindLabel(block)} onClose={() => setSettings(false)}>
          <input className="input" value={block.title} placeholder="Título do bloco (opcional)" onChange={(e) => onChange({ ...block, title: e.target.value })} />
          <div className="flex flex-col gap-1">
            <span className="label">Secção</span>
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((sec) => (
                <button key={sec} type="button" className={`chip ${block.section === sec ? "chip-on" : ""}`} onClick={() => onChange({ ...block, section: block.section === sec ? undefined : sec })}>
                  {sec}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto -mx-1 px-1">
            <Seg options={KINDS} value={block.kind} onChange={(k) => k !== block.kind && onChange({ ...block, kind: k as BlockKind, ...KIND_DEFAULTS[k as BlockKind] })} />
          </div>
          {block.kind === "emom" && (
            <div className="grid grid-cols-2 gap-3">
              <Stepper label="Intervalo" suffix="s" value={block.work} step={15} onChange={(v) => onChange({ ...block, work: v })} />
              <Stepper label="Intervalos" value={block.rounds} step={1} onChange={(v) => onChange({ ...block, rounds: v })} />
            </div>
          )}
          {block.kind === "amrap" && <Stepper label="Tempo limite" suffix="s" value={block.work} step={60} onChange={(v) => onChange({ ...block, work: v })} />}
          {block.kind === "circuit" && (
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(([label, p]) => (
                <button key={label} type="button" className="chip" onClick={() => onChange({ ...block, ...p })}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {block.kind === "circuit" && (
            <div className="grid grid-cols-2 gap-3">
              <Stepper label="Trabalho" suffix="s" value={block.work} step={5} onChange={(v) => onChange({ ...block, work: v })} />
              <Stepper label="Pausa" suffix="s" value={block.rest} step={5} onChange={(v) => onChange({ ...block, rest: v })} />
              <Stepper label="Rondas" value={block.rounds} step={1} onChange={(v) => onChange({ ...block, rounds: v })} />
              <Stepper label="Desc. ronda" suffix="s" value={block.roundRest} step={15} onChange={(v) => onChange({ ...block, roundRest: v })} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => onMove(-1)}>
              <ArrowUp /> Subir
            </button>
            <button type="button" className="btn" onClick={() => onMove(1)}>
              <ArrowDown /> Descer
            </button>
            <button
              type="button"
              className="btn"
              onClick={async () => {
                const name = (await askText("Nome do template", block.title || ""))?.trim();
                if (name) await save<Template>("templates", { id: uid(), updatedAt: 0, name, block: copyBlock(block) });
              }}
            >
              <Star /> Template
            </button>
            <button type="button" className="btn" onClick={onDuplicate}>
              <Copy /> Duplicar
            </button>
            <button type="button" className="btn text-danger ml-auto" onClick={async () => (await ask("Apagar este bloco?")) && onDelete()}>
              Apagar bloco
            </button>
          </div>
        </Sheet>
      )}

      {diagram && <BlockDiagram block={block} />}

      <div className="divide-y divide-border">
        {reorder.ordered.map((it, i) => (
          <div key={it.id} ref={reorder.ref(it.id)} className={reorder.dragging === it.id ? "opacity-60 bg-card2 rounded-lg" : ""}>
            <ItemRow
              item={it}
              onChange={(n) => setItems(block.items.map((x) => (x.id === it.id ? n : x)))}
              onDelete={() => setItems(block.items.filter((x) => x.id !== it.id))}
              onMove={(d) => moveItem(i, d)}
              onDuplicate={() => duplicateItem(it)}
              handle={block.items.length > 1 ? <DragHandle {...reorder.handle(it.id)} /> : undefined}
            />
          </div>
        ))}
      </div>

      {!plain && (
        <button type="button" className="btn w-full mt-2 border-dashed text-accent" onClick={() => {
          clearViewState(sheetKey(block.id));
          setPicking(true);
        }}>
          + Exercício
        </button>
      )}

      {picking && <PrescribeSheet block={block} onAddText={(t) => addItems(itemsFromLine(t))} onAdd={(it) => addItems([it])} onClose={() => setPicking(false)} />}

      {timer && <CircuitTimer block={block} onClose={() => setTimer(false)} />}
    </section>
  );
}
