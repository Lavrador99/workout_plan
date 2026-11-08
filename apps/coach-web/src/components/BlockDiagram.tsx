import { fmtMethod, SET_TYPE } from "@treino/core/format";
import { fmtNum, fmtSec } from "@treino/core/text";
import type { Block, Item } from "@treino/core/types";

// The structure of a block at a glance: execution order, sets (bar height =
// load), rests, rounds and intra-set methods.

const letter = (i: number) => String.fromCharCode(65 + i);

export function kindLabel(b: Block): string {
  if (b.kind !== "superset") return { list: "Lista", sets: "Séries", circuit: "Circuito", emom: "EMOM", amrap: "AMRAP", superset: "" }[b.kind];
  const n = b.items.filter((i) => i.role === "main").length;
  return n >= 4 ? "Giant set" : n === 3 ? "Triset" : "Superset";
}

export default function BlockDiagram({ block }: { block: Block }) {
  const main = block.items.filter((i) => i.role === "main" && i.name.trim());
  if (!main.length) return null;
  const k = block.kind;
  return (
    <div className="rounded-lg border border-border bg-bg p-2 flex flex-col gap-2 text-xs">
      {(k === "superset" || k === "circuit") && <Flow block={block} items={main} />}
      {k === "emom" && <Emom block={block} items={main} />}
      {k === "amrap" && (
        <div className="flex flex-col gap-1">
          <div className="h-2 rounded-full bg-accent/60" />
          <div className="flex justify-between text-muted">
            <span>0</span>
            <span>{fmtSec(block.work) || "?"} · o máximo de rondas</span>
          </div>
          <Flow block={block} items={main} loop />
        </div>
      )}
      {(k === "sets" || k === "list" || k === "superset") && main.some((i) => i.sets.length) && (
        <div className="flex flex-col gap-2">
          {main.map((it, i) => (
            <SetBars key={it.id} item={it} tag={k === "superset" ? `${letter(0)}${i + 1}` : letter(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

/** A1 → A2 → A3 ↺ ×rounds, with the rests. */
function Flow({ block, items, loop }: { block: Block; items: Item[]; loop?: boolean }) {
  const circuit = block.kind === "circuit";
  const rounds = circuit ? block.rounds : Math.max(...items.map((i) => i.sets.filter((s) => s.type !== "warmup").length));
  const lastRest = items[items.length - 1].sets.find((s) => s.rest)?.rest;
  const roundRest = circuit ? block.roundRest : lastRest;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.map((it, i) => (
        <span key={it.id} className="contents">
          {i > 0 && <span className="text-muted">{circuit && block.rest ? `→ ${block.rest}s →` : "→"}</span>}
          <span className="rounded-md border border-accent/50 bg-accent/10 px-2 py-0.5 max-w-[9rem] truncate">
            <b>{circuit ? i + 1 : `${letter(0)}${i + 1}`}</b> {it.name}
            {circuit && block.work ? <span className="text-muted"> {block.work}s</span> : null}
          </span>
        </span>
      ))}
      {!loop && (
        <span className="text-accent font-semibold">
          ↺ {roundRest ? `${fmtSec(roundRest)} ` : ""}×{rounds || "?"}
        </span>
      )}
      {loop && <span className="text-accent font-semibold">↺</span>}
    </div>
  );
}

function Emom({ block, items }: { block: Block; items: Item[] }) {
  const n = block.rounds ?? 0;
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: Math.min(n, 40) }, (_, r) => (
        <span key={r} className="w-9 h-9 rounded-md border border-border bg-card2 flex flex-col items-center justify-center leading-none">
          <span className="text-[10px] text-muted">{fmtSec((block.work ?? 60) * (r + 1))}</span>
          <b>{letter(r % items.length)}</b>
        </span>
      ))}
      <span className="w-full text-muted">{items.map((it, i) => `${letter(i)} ${it.name}`).join(" · ")}</span>
    </div>
  );
}

/** One bar per set: height = load, label = reps, colour = set type. */
function SetBars({ item, tag }: { item: Item; tag: string }) {
  const max = Math.max(...item.sets.map((s) => s.load ?? 0), 1);
  const timed = item.sets.some((s) => s.duration != null);
  return (
    <div className="flex items-end gap-2">
      <span className="w-20 shrink-0 truncate self-center">
        <b>{tag}</b> {item.name}
      </span>
      <div className="flex items-end gap-1 min-w-0 overflow-x-auto">
        {item.sets.map((s, i) => {
          const h = s.load != null ? 10 + (s.load / max) * 26 : 18;
          const color = s.type === "warmup" ? "bg-border" : s.type === "failure" ? "bg-danger/70" : s.type === "drop" ? "bg-accent2/70" : "bg-accent/70";
          return (
            <span key={i} className="w-7 shrink-0 flex flex-col items-center gap-1 text-[10px]" title={s.type ? SET_TYPE[s.type].label : "efetiva"}>
              <span className={`w-5 rounded-sm ${color}`} style={{ height: h }} />
              <span className="tabular-nums leading-none">{timed ? fmtSec(s.duration) : s.reps ?? "–"}</span>
              <span className="tabular-nums leading-none text-muted">{s.rest != null ? fmtSec(s.rest) : ""}</span>
            </span>
          );
        })}
      </div>
      {item.method && <span className="text-accent self-center">{fmtMethod(item.method)}</span>}
      {!item.method && item.sets.every((s) => s.load == null) ? null : (
        <span className="text-muted self-center tabular-nums whitespace-nowrap">{fmtNum(max)}kg</span>
      )}
    </div>
  );
}
