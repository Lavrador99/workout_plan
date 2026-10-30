import { useMemo, useState } from "react";
import { matchExercise, mergeExercises, remove, save, templateBlocks } from "../lib/db";
import { fmtBlock } from "../lib/format";
import { useExerciseIndex, useExercises, useTemplates, useUsage } from "../lib/hooks";
import { inferPatterns, PATTERNS, patternsOf } from "../lib/movement";
import { seedLibrary } from "../lib/seed";
import { uid } from "../lib/text";
import Chips from "../components/Chips";
import { CATEGORIES, levelDots } from "../components/PrescribeSheet";
import type { Exercise, Template } from "../lib/types";

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

  const list = useMemo(() => {
    const found = q.trim() ? index.search(q, tag ? 300 : 50) : exercises;
    return tag ? found.filter((e) => e.tags.includes(tag)) : found;
  }, [q, tag, index, exercises]);
  const exact = q.trim() ? matchExercise(exercises, q) : undefined;

  const create = async () => {
    const ex = await save<Exercise>("exercises", { id: uid(), updatedAt: 0, name: q.trim(), aliases: [], tags: [] });
    setQ("");
    setEditing(ex.id);
  };

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
      <p className="text-xs text-muted">
        Os exercícios entram aqui sozinhos quando os prescreves. Junta duplicados ("Gémeo" e "Calf raise") com <b>Juntar</b> e o nome passa a sinónimo.
      </p>
      <ul className="card divide-y divide-border">
        {list.map((ex) => (
          <li key={ex.id}>
            {editing === ex.id ? (
              <Editor ex={ex} all={exercises} onClose={() => setEditing(null)} />
            ) : (
              <button type="button" className="w-full text-left px-3 py-2.5 flex items-center gap-2" onClick={() => setEditing(ex.id)}>
                <span className="flex-1 min-w-0">
                  <span className="font-medium">{ex.name}</span>
                  <span className="block text-xs text-muted truncate">{[ex.pt, ...ex.aliases].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="text-xs">{levelDots(ex)}</span>
                <span className="text-xs text-muted tabular-nums">{usage.get(ex.id) ?? 0}×</span>
              </button>
            )}
          </li>
        ))}
      </ul>
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
        <p className="text-xs text-muted">Numa sessão, toca em ☆ Template de dia para guardar a sessão inteira.</p>
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
  const [mergeQ, setMergeQ] = useState("");
  const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const others = useMemo(() => {
    const n = mergeQ.trim().toLowerCase();
    return n ? all.filter((e) => e.id !== ex.id && (e.name.toLowerCase().includes(n) || e.pt?.toLowerCase().includes(n) || e.aliases.some((a) => a.toLowerCase().includes(n)))).slice(0, 6) : [];
  }, [mergeQ, all, ex.id]);

  const submit = async () => {
    const next = { ...ex, name: name.trim() || ex.name, pt: pt.trim() || undefined, aliases: split(aliases), tags: split(tags), demoUrl: demo.trim() || undefined };
    // keep guessing while the coach agrees with the guess, so better rules still reach it
    const guessed = inferPatterns(next);
    const same = guessed.length === patterns.length && guessed.every((p) => patterns.includes(p));
    await save("exercises", { ...next, patterns: same ? undefined : PATTERNS.filter((p) => patterns.includes(p)) });
    onClose();
  };

  const video = demo.trim() || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name} exercise`)}`;

  return (
    <div className="p-3 flex flex-col gap-2 bg-bg">
      <input className="input font-semibold" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" value={pt} placeholder="Nome em português" onChange={(e) => setPt(e.target.value)} />
      <input className="input" value={aliases} placeholder="Sinónimos, separados por vírgula" onChange={(e) => setAliases(e.target.value)} />
      <input className="input" value={tags} placeholder="Etiquetas e músculos: core, glúteo médio, adutores…" onChange={(e) => setTags(e.target.value)} />
      <span className="label">Padrões de movimento{ex.patterns ? "" : " (sugeridos pelo nome)"}</span>
      <Chips options={PATTERNS} value={patterns} onChange={setPatterns} />
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
