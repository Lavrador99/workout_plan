import { useMemo, useState } from "react";
import { matchExercise, mergeExercises, remove, save, templateBlocks } from "../lib/db";
import { findDuplicates, type DuplicatePair } from "../lib/duplicates";
import { fmtBlock } from "../lib/format";
import { useExerciseIndex, useExercises, useTemplates, useUsage } from "../lib/hooks";
import { inferMuscles, inferPatterns, missingInfo, MUSCLE_CHIP_GROUPS, MUSCLES, musclesOf, PATTERN_GROUPS, PATTERNS, patternsOf } from "../lib/movement";
import { seedLibrary } from "../lib/seed";
import { uid } from "../lib/text";
import { ChipGroups } from "../components/Chips";
import { CATEGORIES, levelDots } from "../components/PrescribeSheet";
import type { Exercise, Template } from "../lib/types";

type View = "all" | "review" | "dups";

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export default function LibraryPage() {
  const exercises = useExercises() ?? [];
  const usage = useUsage();
  const templates = useTemplates() ?? [];
  const days = templates.filter((t) => t.blocks?.length);
  const blocks = templates.filter((t) => !t.blocks?.length);
  const index = useExerciseIndex();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const [view, setView] = useState<View>("all");
  const [selected, setSelected] = useState<string[] | null>(null);

  const missing = useMemo(() => new Map(exercises.map((e) => [e.id, missingInfo(e)] as const).filter(([, m]) => m.length)), [exercises]);
  const dups = useMemo(() => findDuplicates(exercises), [exercises]);

  const list = useMemo(() => {
    const found = q.trim() ? index.search(q, tag || view === "review" ? 300 : 50) : exercises;
    return found.filter((e) => (!tag || e.tags.includes(tag)) && (view !== "review" || missing.has(e.id)));
  }, [q, tag, view, index, exercises, missing]);
  const exact = q.trim() ? matchExercise(exercises, q) : undefined;

  const create = async () => {
    const ex = await save<Exercise>("exercises", { id: uid(), updatedAt: 0, name: q.trim(), aliases: [], tags: [] });
    setQ("");
    setView("all");
    setEditing(ex.id);
  };

  const toggle = (id: string) => setSelected((sel) => (sel?.includes(id) ? sel.filter((x) => x !== id) : [...(sel ?? []), id]));

  return (
    <div className="flex flex-col gap-3 p-3 pb-28">
      <div className="flex gap-2">
        <input className="input" placeholder={`Procurar em ${exercises.length} exercícios (PT/EN)…`} value={q} onChange={(e) => setQ(e.target.value)} />
        {q.trim() && !exact && (
          <button type="button" className="btn-accent shrink-0" onClick={create}>
            + Criar
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ViewTab on={view === "all"} onClick={() => setView("all")} n={exercises.length} label="Todos" />
        <ViewTab on={view === "review"} onClick={() => setView("review")} n={missing.size} label="Por rever" warn />
        <ViewTab on={view === "dups"} onClick={() => setView("dups")} n={dups.length} label="Duplicados" warn />
      </div>

      {view === "dups" ? (
        <Duplicates pairs={dups} usage={usage} />
      ) : (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3">
            <button type="button" className={`chip ${!tag ? "chip-on" : ""}`} onClick={() => setTag("")}>
              Todos
            </button>
            {CATEGORIES.map((c) => (
              <button key={c} type="button" className={`chip ${tag === c ? "chip-on" : ""}`} onClick={() => setTag(tag === c ? "" : c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted flex-1">
              {view === "review"
                ? "Sem padrão de movimento ou sem músculos, não contam bem nas contagens. Toca para completar."
                : "Entram aqui sozinhos quando os prescreves. Seleciona vários para os juntar num só."}
            </p>
            <button type="button" className={`btn shrink-0 ${selected ? "text-accent border-accent" : ""}`} onClick={() => setSelected(selected ? null : [])}>
              {selected ? "Cancelar" : "☑ Selecionar"}
            </button>
          </div>
          {list.length === 0 ? (
            <p className="text-sm text-muted">{view === "review" ? "✓ Está tudo completo." : "Nada encontrado."}</p>
          ) : (
            <ul className="card divide-y divide-border">
              {list.map((ex) => {
                const miss = missing.get(ex.id);
                return (
                  <li key={ex.id}>
                    {editing === ex.id && !selected ? (
                      <Editor ex={ex} all={exercises} onClose={() => setEditing(null)} />
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2.5 flex items-center gap-2"
                        onClick={() => (selected ? toggle(ex.id) : setEditing(ex.id))}
                      >
                        {selected && <span className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center text-xs ${selected.includes(ex.id) ? "bg-accent border-accent text-black" : "border-border"}`}>{selected.includes(ex.id) && "✓"}</span>}
                        <span className="flex-1 min-w-0">
                          <span className="font-medium">{ex.name}</span>
                          <span className="block text-xs text-muted truncate">{[ex.pt, ...ex.aliases].filter(Boolean).join(" · ")}</span>
                          {miss && <span className="block text-xs text-warn">⚠ sem {miss.join(" nem ")}</span>}
                        </span>
                        <span className="text-xs">{levelDots(ex)}</span>
                        <span className="text-xs text-muted tabular-nums">{usage.get(ex.id) ?? 0}×</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {selected && selected.length > 1 && (
            <MergeBar
              list={selected.map((id) => exercises.find((e) => e.id === id)).filter((e): e is Exercise => !!e)}
              usage={usage}
              onDone={() => setSelected(null)}
            />
          )}
        </>
      )}

      <button
        type="button"
        className="btn-ghost text-xs text-muted self-start"
        onClick={async () => {
          const n = await seedLibrary(true);
          alert(n ? `${n} exercícios/templates da biblioteca base adicionados ou completados.` : "A biblioteca base já está toda cá.");
        }}
      >
        ↻ Repor exercícios e templates base
      </button>

      <h2 className="font-bold mt-4">Templates de dias</h2>
      {days.length === 0 ? (
        <p className="text-xs text-muted">Numa sessão, toca em ⋯ → ☆ Template de dia para guardar a sessão inteira.</p>
      ) : (
        <TemplateList list={days} />
      )}

      <h2 className="font-bold mt-4">Templates de blocos</h2>
      {blocks.length === 0 ? (
        <p className="text-xs text-muted">Numa sessão, abre as opções de um bloco (⋯) e toca em ☆ Template para o reutilizar.</p>
      ) : (
        <TemplateList list={blocks} />
      )}
    </div>
  );
}

function ViewTab({ on, onClick, n, label, warn }: { on: boolean; onClick: () => void; n: number; label: string; warn?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`card px-2 py-2 flex flex-col items-center ${on ? "border-accent" : ""}`}>
      <span className={`text-lg font-bold tabular-nums leading-tight ${warn && n > 0 ? "text-warn" : on ? "text-accent" : ""}`}>{n}</span>
      <span className="text-xs text-muted">{label}</span>
    </button>
  );
}

const subtitle = (e: Exercise) => [e.pt, ...e.aliases].filter(Boolean).join(" · ");

/** Pick which of the selected exercises stays; the others become its synonyms. */
function MergeBar({ list, usage, onDone }: { list: Exercise[]; usage: Map<string, number>; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const merge = async (keep: Exercise) => {
    const others = list.filter((e) => e.id !== keep.id);
    if (!confirm(`Juntar ${others.map((e) => `«${e.name}»`).join(", ")} em «${keep.name}»?\nOs nomes passam a sinónimos e as sessões ficam ligadas a «${keep.name}».`)) return;
    setBusy(true);
    for (const o of others) await mergeExercises(o.id, keep.id);
    onDone();
  };
  return (
    <div className="sticky bottom-20 card p-3 flex flex-col gap-2 border-accent shadow-lg">
      <span className="label">Juntar {list.length} num só · qual fica?</span>
      {list.map((e) => (
        <button key={e.id} type="button" className="btn justify-start text-left" disabled={busy} onClick={() => merge(e)}>
          <span className="flex-1 min-w-0 truncate">
            Manter <b>{e.name}</b>
          </span>
          <span className="text-xs text-muted tabular-nums">{usage.get(e.id) ?? 0}×</span>
        </button>
      ))}
    </div>
  );
}

function Duplicates({ pairs, usage }: { pairs: DuplicatePair[]; usage: Map<string, number> }) {
  if (!pairs.length) return <p className="text-sm text-muted">✓ Sem duplicados à vista.</p>;
  const keep = async (keep: Exercise, drop: Exercise) => {
    if (confirm(`Juntar «${drop.name}» em «${keep.name}»? O nome fica como sinónimo e as sessões passam para «${keep.name}».`)) await mergeExercises(drop.id, keep.id);
  };
  const distinct = async ({ a, b }: DuplicatePair) => {
    await save("exercises", { ...a, distinct: [...new Set([...(a.distinct ?? []), b.id])] });
  };
  return (
    <>
      <p className="text-xs text-muted">Nomes iguais escritos de outra forma (ordem, plural, hífen, gralha). Escolhe o que fica; o outro passa a sinónimo e as sessões são religadas.</p>
      <ul className="flex flex-col gap-2">
        {pairs.map((p) => (
          <li key={`${p.a.id}-${p.b.id}`} className="card p-3 flex flex-col gap-2">
            {[p.a, p.b].map((e, i) => (
              <div key={e.id} className="flex items-center gap-2">
                <span className="flex-1 min-w-0">
                  <span className="font-medium">{e.name}</span>
                  <span className="block text-xs text-muted truncate">{subtitle(e)}</span>
                </span>
                <span className="text-xs text-muted tabular-nums">{usage.get(e.id) ?? 0}×</span>
                <button type="button" className="btn shrink-0" onClick={() => keep(e, i ? p.a : p.b)}>
                  Manter
                </button>
              </div>
            ))}
            <button type="button" className="btn-ghost text-xs text-muted self-start" onClick={() => distinct(p)}>
              São exercícios diferentes
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function TemplateList({ list }: { list: Template[] }) {
  return (
    <ul className="card divide-y divide-border">
      {list.map((t) => (
        <li key={t.id} className="p-3 flex gap-2 items-start">
          <details className="flex-1 min-w-0">
            <summary className="font-semibold cursor-pointer">
              ☆ {t.name} <span className="text-xs text-muted font-normal">· {templateBlocks(t).length} bloco(s)</span>
            </summary>
            <pre className="text-xs text-muted whitespace-pre-wrap font-sans mt-2">{templateBlocks(t).map(fmtBlock).join("\n\n")}</pre>
          </details>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              const name = prompt("Nome do template", t.name)?.trim();
              if (name) await save("templates", { ...t, name });
            }}
          >
            ✎
          </button>
          <button type="button" className="btn text-danger" onClick={async () => confirm(`Apagar o template «${t.name}»?`) && (await remove("templates", t.id))}>
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}

function Editor({ ex, all, onClose }: { ex: Exercise; all: Exercise[]; onClose: () => void }) {
  const [name, setName] = useState(ex.name);
  const [pt, setPt] = useState(ex.pt ?? "");
  const [aliases, setAliases] = useState(ex.aliases.join(", "));
  const [tags, setTags] = useState(ex.tags.join(", "));
  const [demo, setDemo] = useState(ex.demoUrl ?? "");
  const [patterns, setPatterns] = useState(() => patternsOf(ex));
  const [muscles, setMuscles] = useState(() => musclesOf(ex));
  const [mergeQ, setMergeQ] = useState("");
  const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const others = useMemo(() => {
    const n = mergeQ.trim().toLowerCase();
    return n ? all.filter((e) => e.id !== ex.id && (e.name.toLowerCase().includes(n) || e.pt?.toLowerCase().includes(n) || e.aliases.some((a) => a.toLowerCase().includes(n)))).slice(0, 6) : [];
  }, [mergeQ, all, ex.id]);

  const submit = async () => {
    const next = { ...ex, name: name.trim() || ex.name, pt: pt.trim() || undefined, aliases: split(aliases), tags: split(tags), demoUrl: demo.trim() || undefined };
    // keep guessing while the coach agrees with the guess, so better rules still reach it
    const p = sameSet(inferPatterns(next), patterns) ? undefined : PATTERNS.filter((x) => patterns.includes(x));
    const withP = { ...next, patterns: p };
    const m = sameSet(inferMuscles(withP), muscles) ? undefined : MUSCLES.filter((x) => muscles.includes(x));
    await save("exercises", { ...withP, muscles: m });
    onClose();
  };

  const video = demo.trim() || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name} exercise`)}`;

  return (
    <div className="p-3 flex flex-col gap-2 bg-bg">
      <input className="input font-semibold" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" value={pt} placeholder="Nome em português" onChange={(e) => setPt(e.target.value)} />
      <input className="input" value={aliases} placeholder="Sinónimos, separados por vírgula" onChange={(e) => setAliases(e.target.value)} />
      <input className="input" value={tags} placeholder="Etiquetas: core, pliometria, kettlebell…" onChange={(e) => setTags(e.target.value)} />
      <span className={`label ${patterns.length ? "" : "text-warn"}`}>
        Padrões de movimento{!patterns.length ? " · ⚠ escolhe pelo menos um" : ex.patterns ? "" : " (sugeridos pelo nome)"}
      </span>
      <ChipGroups groups={PATTERN_GROUPS} value={patterns} onChange={setPatterns} />
      <span className={`label ${muscles.length ? "" : "text-warn"}`}>
        Músculos{!muscles.length ? " · ⚠ escolhe pelo menos um" : ex.muscles ? "" : " (sugeridos)"}
      </span>
      <ChipGroups groups={MUSCLE_CHIP_GROUPS} value={muscles} onChange={setMuscles} />
      <input className="input" value={demo} placeholder="Link de vídeo (opcional)" onChange={(e) => setDemo(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-accent" onClick={submit}>
          Guardar
        </button>
        <a className="btn" href={video} target="_blank" rel="noreferrer">
          ▶ Vídeo
        </a>
        <button type="button" className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn text-danger ml-auto"
          onClick={async () => {
            if (confirm(`Apagar «${ex.name}» da biblioteca? As sessões antigas mantêm o nome.`)) await remove("exercises", ex.id);
          }}
        >
          Apagar
        </button>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        <span className="label">Juntar este exercício a outro (fica como sinónimo)</span>
        <input className="input" value={mergeQ} placeholder="Procurar o exercício principal…" onChange={(e) => setMergeQ(e.target.value)} />
        {others.map((o) => (
          <button
            key={o.id}
            type="button"
            className="btn justify-start"
            onClick={async () => {
              if (!confirm(`Juntar «${ex.name}» a «${o.name}»?`)) return;
              await mergeExercises(ex.id, o.id);
              onClose();
            }}
          >
            → {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}
