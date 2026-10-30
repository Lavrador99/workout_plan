import { useMemo, useState } from "react";
import { matchExercise, mergeExercises, remove, save } from "../lib/db";
import { fmtBlock } from "../lib/format";
import { useExerciseIndex, useExercises, useTemplates, useUsage } from "../lib/hooks";
import { uid } from "../lib/text";
import type { Exercise } from "../lib/types";

export default function LibraryPage() {
  const exercises = useExercises() ?? [];
  const usage = useUsage();
  const templates = useTemplates() ?? [];
  const index = useExerciseIndex();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const list = useMemo(() => (q.trim() ? index.search(q, 50) : exercises), [q, index, exercises]);
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
      <p className="text-xs text-muted">
        Os exercícios entram aqui sozinhos quando os prescreves. Junta duplicados ("Gémeo" e "Calf raise") com <b>Juntar</b> e o nome passa a sinónimo.
      </p>
      <ul className="card divide-y divide-border">
        {list.map((ex) => (
          <li key={ex.id}>
            {editing === ex.id ? (
              <Editor ex={ex} all={exercises} onClose={() => setEditing(null)} />
            ) : (
              <button type="button" className="w-full text-left px-3 py-2.5 flex items-baseline gap-2" onClick={() => setEditing(ex.id)}>
                <span className="font-medium">{ex.name}</span>
                <span className="text-xs text-muted truncate flex-1">{ex.aliases.join(", ")}</span>
                <span className="text-xs text-muted tabular-nums">{usage.get(ex.id) ?? 0}×</span>
              </button>
            )}
          </li>
        ))}
      </ul>

      <h2 className="font-bold mt-4">Templates de blocos</h2>
      {templates.length === 0 ? (
        <p className="text-xs text-muted">Numa sessão, abre as opções de um bloco (⋯) e toca em ☆ Template para o reutilizar.</p>
      ) : (
        <ul className="card divide-y divide-border">
          {templates.map((t) => (
            <li key={t.id} className="p-3 flex gap-2 items-start">
              <div className="flex-1 min-w-0">
                <div className="font-semibold">☆ {t.name}</div>
                <pre className="text-xs text-muted whitespace-pre-wrap font-sans">{fmtBlock(t.block)}</pre>
              </div>
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
      )}
    </div>
  );
}

function Editor({ ex, all, onClose }: { ex: Exercise; all: Exercise[]; onClose: () => void }) {
  const [name, setName] = useState(ex.name);
  const [aliases, setAliases] = useState(ex.aliases.join(", "));
  const [tags, setTags] = useState(ex.tags.join(", "));
  const [demo, setDemo] = useState(ex.demoUrl ?? "");
  const [mergeQ, setMergeQ] = useState("");
  const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const others = useMemo(() => {
    const n = mergeQ.trim().toLowerCase();
    return n ? all.filter((e) => e.id !== ex.id && (e.name.toLowerCase().includes(n) || e.aliases.some((a) => a.toLowerCase().includes(n)))).slice(0, 6) : [];
  }, [mergeQ, all, ex.id]);

  const submit = async () => {
    await save("exercises", { ...ex, name: name.trim() || ex.name, aliases: split(aliases), tags: split(tags), demoUrl: demo.trim() || undefined });
    onClose();
  };

  const video = demo.trim() || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name} exercise`)}`;

  return (
    <div className="p-3 flex flex-col gap-2 bg-bg">
      <input className="input font-semibold" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" value={aliases} placeholder="Sinónimos, separados por vírgula" onChange={(e) => setAliases(e.target.value)} />
      <input className="input" value={tags} placeholder="Etiquetas: core, unilateral, anti-rotação…" onChange={(e) => setTags(e.target.value)} />
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
