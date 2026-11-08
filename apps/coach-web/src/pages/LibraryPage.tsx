import { Check, ChevronRight, Play, Star, TriangleAlert, X } from "lucide-react";
import { ask, askText } from "../components/Dialogs";
import { toast } from "../components/Toast";
import { useMemo, useState } from "react";
import { matchExercise, mergeExercises, remove, save, templateBlocks } from "../lib/db";
import { findDuplicates, type DuplicatePair } from "../lib/duplicates";
import { downloadText, exercisesCsv } from "../lib/exportExercises";
import { fmtBlock } from "@treino/core/format";
import { go, replaceRoute, useExerciseIndex, useExercises, useTemplates, useUsage, useViewState } from "../lib/hooks";
import { inferMuscles, inferPatterns, missingInfo, MUSCLE_CHIP_GROUPS, MUSCLES, musclesOf, PATTERN_GROUPS, PATTERNS, patternsOf } from "../lib/movement";
import { seedLibrary } from "../lib/seed";
import { todayISO, uid } from "@treino/core/text";
import { ChipGroups } from "../components/Chips";
import PageHeader from "../components/PageHeader";
import { FamilySection, ProgressionsView } from "../components/Progressions";
import Seg from "../components/Seg";
import Sheet, { Menu, SheetFooter, SheetTabs } from "../components/Sheet";
import Tabs from "../components/Tabs";
import TestsView from "./TestsPage";
import { CATEGORIES, levelDots } from "../components/PrescribeSheet";
import type { Exercise, Template } from "@treino/core/types";

const VIEWS = [
  ["exercises", "Exercícios"],
  ["progressions", "Progressões"],
  ["tests", "Testes"],
  ["templates", "Templates"],
] as const;
type View = (typeof VIEWS)[number][0];
type Filter = "all" | "review" | "dups";

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Exercises shown at first: the search is the fast way in, the list a fallback. */
const PAGE = 50;

export default function LibraryPage({ view: routeView }: { view?: string }) {
  const view: View = VIEWS.find(([k]) => k === routeView)?.[0] ?? "exercises";
  const exercises = useExercises() ?? [];
  return (
    <>
      <PageHeader title="Biblioteca" actions={<button type="button" className="btn shrink-0" onClick={() => go("focus")}>Perfis <ChevronRight /></button>}>
        <Tabs options={VIEWS} value={view} onChange={(v) => replaceRoute("library", v)} />
      </PageHeader>
      <div className="page">
        {view === "exercises" && <ExercisesView exercises={exercises} />}
        {view === "progressions" && <ProgressionsView exercises={exercises} />}
        {view === "tests" && <TestsView />}
        {view === "templates" && <TemplatesView />}
      </div>
    </>
  );
}

function ExercisesView({ exercises }: { exercises: Exercise[] }) {
  const usage = useUsage();
  const index = useExerciseIndex();
  const [q, setQ] = useViewState("q", "");
  const [editing, setEditing] = useState<string | null>(null);
  const [tag, setTag] = useViewState("tag", "");
  const [filter, setFilter] = useViewState<Filter>("filter", "all");
  const [selected, setSelected] = useState<string[] | null>(null);
  const [shown, setShown] = useViewState("shown", PAGE);

  const missing = useMemo(() => new Map(exercises.map((e) => [e.id, missingInfo(e)] as const).filter(([, m]) => m.length)), [exercises]);
  const dups = useMemo(() => findDuplicates(exercises), [exercises]);

  const list = useMemo(() => {
    const found = q.trim() ? index.search(q, tag || filter === "review" ? 300 : 50) : exercises;
    return found.filter((e) => (!tag || e.tags.includes(tag)) && (filter !== "review" || missing.has(e.id)));
  }, [q, tag, filter, index, exercises, missing]);
  const exact = q.trim() ? matchExercise(exercises, q) : undefined;
  const open = exercises.find((e) => e.id === editing);

  const create = async () => {
    const ex = await save<Exercise>("exercises", { id: uid(), updatedAt: 0, name: q.trim(), aliases: [], tags: [] });
    setQ("");
    setFilter("all");
    setEditing(ex.id);
  };
  const restore = async () => {
    const n = await seedLibrary(true);
    toast(n ? `${n} exercícios/templates da biblioteca base adicionados ou completados.` : "A biblioteca base já está toda cá.");
  };

  const toggle = (id: string) => setSelected((sel) => (sel?.includes(id) ? sel.filter((x) => x !== id) : [...(sel ?? []), id]));

  return (
    <>
      <div className="flex gap-2">
        <input className="input" placeholder={`Procurar em ${exercises.length} exercícios (PT/EN)…`} value={q} onChange={(e) => setQ(e.target.value)} />
        {q.trim() && !exact && (
          <button type="button" className="btn-accent shrink-0" onClick={create}>
            + Criar
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
          <Seg
            options={[
              ["all", "Todos"],
              ["review", `Por rever · ${missing.size}`],
              ["dups", `Duplicados · ${dups.length}`],
            ]}
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
          />
        </div>
        <Menu
          title="Exercícios"
          items={[
            { label: "☑ Selecionar para juntar", onClick: () => setSelected([]) },
            { label: "⤓ Exportar para folha de cálculo (CSV)", onClick: () => downloadText(exercisesCsv(exercises, usage), `exercicios-${todayISO()}.csv`, "text/csv") },
            { label: "↻ Repor exercícios e templates base", onClick: () => void restore() },
          ]}
        />
      </div>

      {filter === "dups" ? (
        <Duplicates pairs={dups} usage={usage} />
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3">
            <button type="button" className={`chip ${!tag ? "chip-on" : ""}`} onClick={() => setTag("")}>
              Todos
            </button>
            {CATEGORIES.map((c) => (
              <button key={c} type="button" className={`chip ${tag === c ? "chip-on" : ""}`} onClick={() => setTag(tag === c ? "" : c)}>
                {c}
              </button>
            ))}
          </div>
          {filter === "review" && <p className="text-xs text-muted">Sem padrão de movimento ou sem músculos não contam bem nas contagens. Toca para completar.</p>}
          {selected && (
            <div className="flex items-center gap-2">
              <span className="text-sm flex-1">{selected.length ? `${selected.length} selecionados` : "Toca nos exercícios a juntar num só"}</span>
              <button type="button" className="btn shrink-0" onClick={() => setSelected(null)}>
                Cancelar
              </button>
            </div>
          )}
          {list.length === 0 ? (
            <p className="text-sm text-muted">{filter === "review" ? "Está tudo completo." : "Nada encontrado."}</p>
          ) : (
            <ul className="card divide-y divide-border">
              {list.slice(0, shown).map((ex) => {
                const miss = missing.get(ex.id);
                return (
                  <li key={ex.id}>
                    <button type="button" className="row py-3" onClick={() => (selected ? toggle(ex.id) : setEditing(ex.id))}>
                      {selected && <span className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center text-xs ${selected.includes(ex.id) ? "bg-accent border-accent text-on-accent" : "border-border"}`}>{selected.includes(ex.id) && "✓"}</span>}
                      <span className="flex-1 min-w-0">
                        <span className="font-medium">{ex.name}</span>
                        <span className="block text-xs text-muted truncate">{[ex.pt, ...ex.aliases].filter(Boolean).join(" · ")}</span>
                        {miss && <span className="block text-xs text-warn"><TriangleAlert /> sem {miss.join(" nem ")}</span>}
                      </span>
                      <span className="text-xs text-muted">{levelDots(ex)}</span>
                      <span className="text-xs text-muted tabular-nums">{usage.get(ex.id) ?? 0}×</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {list.length > shown && (
            <button type="button" className="btn" onClick={() => setShown(shown + PAGE)}>
              Ver mais ({list.length - shown})
            </button>
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

      {open && (
        <Sheet title={open.name} subtitle={open.pt} tall persistent onClose={() => setEditing(null)}>
          <Editor key={open.id} ex={open} all={exercises} onClose={() => setEditing(null)} onOpen={setEditing} />
        </Sheet>
      )}
    </>
  );
}

function TemplatesView() {
  const templates = useTemplates() ?? [];
  const days = templates.filter((t) => t.blocks?.length);
  const blocks = templates.filter((t) => !t.blocks?.length);
  return (
    <>
      <h2 className="label">Dias</h2>
      {days.length === 0 ? <p className="text-xs text-muted">Numa sessão, toca em ⋯ → Guardar como template de dia para guardar a sessão inteira.</p> : <TemplateList list={days} />}
      <h2 className="label mt-2">Blocos</h2>
      {blocks.length === 0 ? <p className="text-xs text-muted">Numa sessão, abre as opções de um bloco (⋯) e toca em ☆ Template para o reutilizar.</p> : <TemplateList list={blocks} />}
    </>
  );
}

const subtitle = (e: Exercise) => [e.pt, ...e.aliases].filter(Boolean).join(" · ");

/** Pick which of the selected exercises stays; the others become its synonyms. */
function MergeBar({ list, usage, onDone }: { list: Exercise[]; usage: Map<string, number>; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const merge = async (keep: Exercise) => {
    const others = list.filter((e) => e.id !== keep.id);
    if (!(await ask(`Juntar ${others.map((e) => `«${e.name}»`).join(", ")} em «${keep.name}»?\nOs nomes passam a sinónimos e as sessões ficam ligadas a «${keep.name}».`))) return;
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
  if (!pairs.length) return <p className="text-sm text-muted"><Check /> Sem duplicados à vista.</p>;
  const keep = async (keep: Exercise, drop: Exercise) => {
    if ((await ask(`Juntar «${drop.name}» em «${keep.name}»? O nome fica como sinónimo e as sessões passam para «${keep.name}».`))) await mergeExercises(drop.id, keep.id);
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
              <Star /> {t.name} <span className="text-xs text-muted font-normal">· {templateBlocks(t).length} bloco(s)</span>
            </summary>
            <pre className="text-xs text-muted whitespace-pre-wrap font-sans mt-2">{templateBlocks(t).map(fmtBlock).join("\n\n")}</pre>
          </details>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              const name = (await askText("Nome do template", t.name))?.trim();
              if (name) await save("templates", { ...t, name });
            }}
          >
            ✎
          </button>
          <button type="button" className="btn text-danger" onClick={async () => (await ask(`Apagar o template «${t.name}»?`)) && (await remove("templates", t.id))}>
            <X />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Editor({ ex, all, onClose, onOpen }: { ex: Exercise; all: Exercise[]; onClose: () => void; onOpen: (id: string) => void }) {
  const [name, setName] = useState(ex.name);
  const [pt, setPt] = useState(ex.pt ?? "");
  const [aliases, setAliases] = useState(ex.aliases.join(", "));
  const [tags, setTags] = useState(ex.tags.join(", "));
  const [demo, setDemo] = useState(ex.demoUrl ?? "");
  const [patterns, setPatterns] = useState(() => patternsOf(ex));
  const [muscles, setMuscles] = useState(() => musclesOf(ex));
  const [mergeQ, setMergeQ] = useState("");
  const [tab, setTab] = useState<"info" | "patterns" | "muscles" | "levels" | "more">("info");
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
  const warn = (ok: boolean) => (ok ? "" : " (em falta)");

  return (
    <>
      <SheetTabs>
        <Tabs
          options={[
            ["info", "Geral"],
            ["patterns", `Padrões${warn(patterns.length > 0)}`],
            ["muscles", `Músculos${warn(muscles.length > 0)}`],
            ["levels", "Progressões"],
            ["more", "Mais"],
          ]}
          value={tab}
          onChange={setTab}
        />
      </SheetTabs>

      {tab === "info" && (
        <>
          <Labelled label="Nome">
            <input className="input font-semibold" value={name} onChange={(e) => setName(e.target.value)} />
          </Labelled>
          <Labelled label="Nome em português">
            <input className="input" value={pt} onChange={(e) => setPt(e.target.value)} />
          </Labelled>
          <Labelled label="Sinónimos">
            <input className="input" value={aliases} placeholder="Separados por vírgula" onChange={(e) => setAliases(e.target.value)} />
          </Labelled>
          <Labelled label="Etiquetas">
            <input className="input" value={tags} placeholder="core, pliometria, kettlebell…" onChange={(e) => setTags(e.target.value)} />
          </Labelled>
          <Labelled label="Link de vídeo (opcional)">
            <input className="input" inputMode="url" value={demo} onChange={(e) => setDemo(e.target.value)} />
          </Labelled>
          <a className="btn self-start" href={video} target="_blank" rel="noreferrer">
            <Play /> Ver vídeo
          </a>
        </>
      )}

      {tab === "patterns" && (
        <>
          <span className={`label ${patterns.length ? "" : "text-warn"}`}>{!patterns.length ? "Escolhe pelo menos um" : ex.patterns ? "Padrões de movimento" : "Sugeridos pelo nome"}</span>
          <ChipGroups groups={PATTERN_GROUPS} value={patterns} onChange={setPatterns} />
        </>
      )}

      {tab === "muscles" && (
        <>
          <span className={`label ${muscles.length ? "" : "text-warn"}`}>{!muscles.length ? "Escolhe pelo menos um" : ex.muscles ? "Músculos" : "Sugeridos"}</span>
          <ChipGroups groups={MUSCLE_CHIP_GROUPS} value={muscles} onChange={setMuscles} />
        </>
      )}

      {tab === "levels" && <FamilySection ex={ex} exercises={all} onOpen={onOpen} />}

      {tab === "more" && (
        <>
          <div className="flex flex-col gap-1">
            <span className="label">Juntar este exercício a outro (fica como sinónimo)</span>
            <input className="input" value={mergeQ} placeholder="Procurar o exercício principal…" onChange={(e) => setMergeQ(e.target.value)} />
            {others.map((o) => (
              <button
                key={o.id}
                type="button"
                className="btn justify-start"
                onClick={async () => {
                  if (!(await ask(`Juntar «${ex.name}» a «${o.name}»?`))) return;
                  await mergeExercises(ex.id, o.id);
                  onClose();
                }}
              >
                → {o.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn text-danger self-start"
            onClick={async () => {
              if (!(await ask(`Apagar «${ex.name}» da biblioteca? As sessões antigas mantêm o nome.`))) return;
              await remove("exercises", ex.id);
              onClose();
            }}
          >
            Apagar exercício
          </button>
        </>
      )}

      <SheetFooter>
        <button type="button" className="btn-accent flex-1" onClick={submit}>
          Guardar
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Cancelar
        </button>
      </SheetFooter>
    </>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
