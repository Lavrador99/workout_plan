import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { matchExercise } from "../lib/db";
import { fmtRx } from "../lib/format";
import { history } from "../lib/history";
import { useExerciseIndex, useExercises, useUsage } from "../lib/hooks";
import { emptyItem, parseItemLine } from "../lib/parser";
import { SessionCtx } from "../lib/sessionContext";
import type { Block, Exercise, Item } from "../lib/types";
import { LastTime } from "./ItemRow";
import RxFields from "./RxFields";

// Prescribing in three steps, repeated: 1) pick or create the exercise,
// 2) sets / reps / load / cadence, 3) add and go straight to the next one.

/** Filter chips: the main library categories. */
export const CATEGORIES = [
  "glúteos",
  "posteriores",
  "core",
  "pliometria",
  "puxar",
  "força: empurrar",
  "força: joelho dominante",
  "força: anca dominante",
  "prehab",
  "mobilidade",
  "kettlebell",
  "cardio",
];

const KIND_LABEL: Record<Block["kind"], string> = { list: "Lista", sets: "Séries", superset: "Superset", circuit: "Circuito" };

const LEVEL: Record<string, string> = { fácil: "🟢", médio: "🟡", difícil: "🔴" };

export function levelDots(ex: Exercise): string {
  return Object.keys(LEVEL)
    .filter((l) => ex.tags.includes(l))
    .map((l) => LEVEL[l])
    .join("");
}

interface Props {
  block: Block;
  /** A typed line, e.g. "Hip hike 2x12 E+1" or "(Russian twist, side bends)". */
  onAddText: (text: string) => void;
  onAdd: (item: Item) => void;
  onClose: () => void;
}

export default function PrescribeSheet({ block, onAddText, onAdd, onClose }: Props) {
  const ctx = useContext(SessionCtx);
  const exercises = useExercises() ?? [];
  const usage = useUsage();
  const index = useExerciseIndex();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [draft, setDraft] = useState<Item | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", f);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const typed = useMemo(() => parseItemLine(q), [q]);
  const name = typed.name.trim();
  const exact = name ? matchExercise(exercises, name) : undefined;

  const results = useMemo(() => {
    if (!q.trim()) {
      const pool = tag ? exercises.filter((e) => e.tags.includes(tag)) : index.search("", 40);
      return tag ? [...pool].sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.name.localeCompare(b.name, "pt")) : pool;
    }
    const found = index.search(name || q, tag ? 300 : 40);
    return tag ? found.filter((e) => e.tags.includes(tag)) : found;
  }, [q, name, tag, exercises, index, usage]);

  /** Step 1 → 2: start from what this client did last time, else from the block. */
  const choose = (ex: Exercise | null, label: string) => {
    const base: Item = { ...emptyItem(ex?.name ?? label), exerciseId: ex?.id };
    const prev = ctx ? history(ctx.sessions, base, { before: ctx.date, excludeId: ctx.sessionId })[0] : undefined;
    const model = prev?.item ?? [...block.items].reverse().find((i) => i.role === "main" && i.sets.length);
    let d: Item;
    if (model) {
      d = {
        ...base,
        repsUnit: model.repsUnit,
        loadMode: prev ? model.loadMode : "abs",
        repsMax: model.repsMax,
        durationMax: model.durationMax,
        loadMax: prev ? model.loadMax : null,
        tempo: prev ? model.tempo : undefined,
        sets: model.sets.map((s) => ({ reps: s.reps ?? null, duration: s.duration ?? null, load: prev ? (s.load ?? null) : null, done: false })),
      };
    } else if (block.kind === "list" || block.kind === "circuit") d = base;
    else d = { ...base, sets: Array.from({ length: 3 }, () => ({ reps: 10, duration: null, load: null, done: false })) };
    setDraft(d);
    window.scrollTo(0, 0);
  };

  const submitSearch = () => {
    if (!q.trim()) return;
    // a whole line with the prescription ("Step up 3x8 2x8kg") → straight in
    if (typed.sets.length || /^\(.*\)$/.test(q.trim())) {
      onAddText(q.trim());
      setAdded((a) => [...a, typed.name || q.trim()]);
      setQ("");
      return;
    }
    choose(exact ?? null, name);
  };

  const commit = (next: boolean) => {
    if (!draft) return;
    onAdd(draft);
    setAdded((a) => [...a, draft.name]);
    setDraft(null);
    setQ("");
    if (!next) onClose();
    else setTimeout(() => searchRef.current?.focus(), 0);
  };

  const ex = draft?.exerciseId ? exercises.find((e) => e.id === draft.exerciseId) : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-bg overflow-y-auto overscroll-contain">
      <div className="max-w-2xl mx-auto min-h-full flex flex-col safe-top">
        <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur px-3 pt-3 pb-2 flex items-center gap-2 border-b border-border">
          <Steps step={draft ? 2 : 1} />
          <span className="text-xs text-muted truncate flex-1 text-right">{block.title || KIND_LABEL[block.kind]}</span>
          <button type="button" className="btn" onClick={onClose}>
            {added.length ? "✓ Concluir" : "✕"}
          </button>
        </header>

        {added.length > 0 && (
          <div className="px-3 pt-2 text-xs text-success truncate">
            ✓ {added.length} adicionado{added.length > 1 ? "s" : ""}: {added.join(" · ")}
          </div>
        )}

        {!draft ? (
          <div className="flex flex-col gap-2 p-3 pb-10">
            <input
              ref={searchRef}
              className="input"
              autoFocus
              value={q}
              placeholder="Procurar ou criar exercício (PT/EN)…"
              autoCapitalize="sentences"
              autoComplete="off"
              enterKeyHint="next"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
            />
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3">
              <button type="button" className={`chip ${!tag ? "chip-on" : ""}`} onClick={() => setTag("")}>
                {q.trim() ? "Todos" : "Mais usados"}
              </button>
              {CATEGORIES.map((c) => (
                <button key={c} type="button" className={`chip ${tag === c ? "chip-on" : ""}`} onClick={() => setTag(tag === c ? "" : c)}>
                  {c}
                </button>
              ))}
            </div>

            <ul className="card divide-y divide-border">
              {name && !exact && (
                <li>
                  <button type="button" className="w-full text-left px-3 py-3 text-accent2" onClick={submitSearch}>
                    {typed.sets.length ? (
                      <>
                        + Adicionar já: <b>{q.trim()}</b>
                      </>
                    ) : (
                      <>
                        + Criar <b>«{name}»</b> <span className="text-muted text-xs">(novo na biblioteca)</span>
                      </>
                    )}
                  </button>
                </li>
              )}
              {results.map((e) => (
                <li key={e.id}>
                  <button type="button" className="w-full text-left px-3 py-2.5 active:bg-card2 flex items-center gap-2" onClick={() => choose(e, e.name)}>
                    <span className="flex-1 min-w-0">
                      <span className="font-medium">{e.name}</span>
                      {e.pt && <span className="block text-xs text-muted truncate">{e.pt}</span>}
                    </span>
                    <span className="text-xs">{levelDots(e)}</span>
                    {(usage.get(e.id) ?? 0) > 0 && <span className="text-xs text-muted tabular-nums">{usage.get(e.id)}×</span>}
                    <span className="text-muted">›</span>
                  </button>
                </li>
              ))}
              {!results.length && !name && <li className="px-3 py-3 text-sm text-muted">Nada nesta categoria.</li>}
            </ul>
            <p className="text-xs text-muted">
              Toca num exercício para prescrever. Também podes escrever a linha toda (ex: <i>Hip hike 2x12 E+1</i>) e carregar Enter.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-3 flex-1">
            <div className="flex items-start gap-2">
              <button type="button" className="btn-ghost -ml-2 text-accent2" onClick={() => setDraft(null)}>
                ← Trocar
              </button>
              <div className="flex-1 min-w-0">
                <input className="input font-bold text-lg" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                <div className="text-xs text-muted mt-1">{ex?.pt ?? (draft.exerciseId ? "" : "Novo — entra na biblioteca ao guardar")}</div>
              </div>
            </div>

            <LastTime item={draft} onApply={setDraft} />
            <RxFields item={draft} onChange={setDraft} />

            <label className="flex flex-col gap-1">
              <span className="label">Nota (opcional)</span>
              <input className="input" value={draft.note} placeholder="ex: calcanhares no chão, pausa em baixo" onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
            </label>
            {block.kind !== "circuit" && (
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={draft.role === "filler"} onChange={(e) => setDraft({ ...draft, role: e.target.checked ? "filler" : "main" })} />
                Intercalado (feito no descanso do anterior)
              </label>
            )}

            <div className="sticky bottom-0 -mx-3 mt-auto px-3 py-3 bg-bg/95 backdrop-blur border-t border-border safe-bottom flex flex-col gap-2">
              <div className="text-sm">
                <span className="font-semibold">{draft.name || "—"}</span> <span className="text-accent2">{fmtRx(draft)}</span>
              </div>
              <div className="grid grid-cols-[1fr_2fr] gap-2">
                <button type="button" className="btn" disabled={!draft.name.trim()} onClick={() => commit(false)}>
                  Adicionar e fechar
                </button>
                <button type="button" className="btn-accent text-base" disabled={!draft.name.trim()} onClick={() => commit(true)}>
                  Adicionar → próximo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Steps({ step }: { step: 1 | 2 }) {
  const s = (n: number, label: string) => (
    <span className={`flex items-center gap-1 ${step === n ? "text-accent font-semibold" : "text-muted"}`}>
      <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center border ${step === n ? "border-accent" : "border-border"}`}>{n}</span>
      {label}
    </span>
  );
  return (
    <div className="flex items-center gap-2 text-sm">
      {s(1, "Exercício")}
      <span className="text-muted">›</span>
      {s(2, "Prescrição")}
    </div>
  );
}
