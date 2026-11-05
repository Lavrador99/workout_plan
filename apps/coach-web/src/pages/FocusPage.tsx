import { useState } from "react";
import { ChipGroups } from "../components/Chips";
import ExerciseInput from "../components/ExerciseInput";
import PageHeader from "../components/PageHeader";
import Sheet, { SheetFooter } from "../components/Sheet";
import Tabs from "../components/Tabs";
import { matchExercise, newFocus, remove, save } from "../lib/db";
import { go, useClients, useExercises, useFocuses } from "../lib/hooks";
import { canonMuscles, canonPatterns, FOCUS_KINDS, PATTERN_GROUPS } from "../lib/movement";
import { parseItemLine } from "../lib/parser";
import type { Client, Exercise, Focus, FocusKind } from "../lib/types";

const PLACEHOLDER: Record<FocusKind, string> = {
  sport: "Nova modalidade (ex: Futebol, Padel)…",
  pathology: "Nova patologia (ex: Tendinopatia rotuliana)…",
  asymmetry: "Nova assimetria (ex: Glúteo médio esq. fraco)…",
};

const HINT: Record<FocusKind, string> = {
  sport: "Os padrões, músculos e exercícios mais recrutados e importantes na modalidade.",
  pathology: "Os padrões, músculos e exercícios mais importantes para a resolver.",
  asymmetry: "Os padrões, músculos e exercícios para a corrigir (usa Extra esq. nos exercícios unilaterais).",
};

/** The coach's sports, pathologies and asymmetries, which clients are linked to in their file. */
export default function FocusPage() {
  const focuses = useFocuses() ?? [];
  const clients = useClients() ?? [];
  const exercises = useExercises() ?? [];
  const [kind, setKind] = useState<FocusKind>("sport");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const list = focuses.filter((f) => f.kind === kind);
  const open = focuses.find((f) => f.id === editing);
  const add = async () => {
    if (!name.trim()) return;
    const f = await save("focuses", newFocus(kind, name.trim()));
    setName("");
    setEditing(f.id);
  };

  return (
    <>
    <PageHeader title="Perfis">
      <Tabs options={FOCUS_KINDS.map(([k, label]) => [k, label] as const)} value={kind} onChange={setKind} />
    </PageHeader>
    <div className="page">
      <p className="text-xs text-muted">{HINT[kind]} Liga-os a cada cliente na ficha; as contagens aparecem no separador Contagens.</p>
      <div className="flex gap-2">
        <input className="input" placeholder={PLACEHOLDER[kind]} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button type="button" className="btn-accent shrink-0" onClick={add} disabled={!name.trim()}>
          + Criar
        </button>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-muted">Ainda nada aqui.</p>
      ) : (
        <ul className="card divide-y divide-border">
          {list.map((f) => {
            const linked = clients.filter((c) => c.focusIds?.includes(f.id));
            return (
              <li key={f.id}>
                <button type="button" className="row" onClick={() => setEditing(f.id)}>
                  <span className="flex-1 min-w-0">
                    <span className="font-medium">{f.name}</span>
                    <span className="block text-xs text-muted truncate">{[...f.patterns, ...f.muscles].join(" · ") || "sem padrões nem músculos"}</span>
                  </span>
                  <span className="text-xs text-muted tabular-nums">{linked.length === 1 ? "1 cliente" : `${linked.length} clientes`}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && <Editor key={open.id} focus={open} exercises={exercises} clients={clients.filter((c) => c.focusIds?.includes(open.id))} onClose={() => setEditing(null)} />}
    </div>
    </>
  );
}

function Editor({ focus, exercises, clients, onClose }: { focus: Focus; exercises: Exercise[]; clients: Client[]; onClose: () => void }) {
  const [f, setF] = useState(() => ({ ...focus, patterns: canonPatterns(focus.patterns) }));
  const [muscles, setMuscles] = useState(canonMuscles(focus.muscles).join(", "));
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const label = FOCUS_KINDS.find(([k]) => k === f.kind)?.[2] ?? "";

  const addExercise = (text: string) => {
    const ex = matchExercise(exercises, parseItemLine(text).name);
    if (!ex) return alert("Esse exercício não está na biblioteca.");
    if (!f.exerciseIds.includes(ex.id)) setF({ ...f, exerciseIds: [...f.exerciseIds, ex.id] });
  };

  const submit = async () => {
    const m = muscles.split(",").map((x) => x.trim()).filter(Boolean);
    await save("focuses", { ...f, name: f.name.trim() || focus.name, muscles: m });
    onClose();
  };

  return (
    <Sheet title={focus.name} subtitle={label} tall persistent onClose={onClose}>
      <input className="input font-semibold" aria-label="Nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <div className="flex flex-col gap-1">
        <span className="label">Padrões de movimento</span>
        <ChipGroups groups={PATTERN_GROUPS} value={f.patterns} onChange={(patterns) => setF({ ...f, patterns })} />
      </div>
      <label className="flex flex-col gap-1">
        <span className="label">Músculos (separados por vírgula)</span>
        <input className="input" value={muscles} placeholder="isquiotibiais, adutores, glúteo médio" onChange={(e) => setMuscles(e.target.value)} />
        <span className="text-xs text-muted">Contam os exercícios com estes músculos nas etiquetas ou no nome.</span>
      </label>
      <div className="flex flex-col gap-1">
        <span className="label">Exercícios-chave</span>
        {f.exerciseIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {f.exerciseIds.map((id) => (
              <button key={id} type="button" className="chip chip-on" onClick={() => setF({ ...f, exerciseIds: f.exerciseIds.filter((x) => x !== id) })}>
                {byId.get(id)?.name ?? "(apagado)"} ✕
              </button>
            ))}
          </div>
        )}
        <ExerciseInput key={f.exerciseIds.length} placeholder="Adicionar exercício…" onSubmit={addExercise} />
      </div>
      <label className="flex flex-col gap-1">
        <span className="label">Notas</span>
        <textarea className="input py-2 min-h-[80px]" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      </label>
      {clients.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="label mr-1">Clientes</span>
          {clients.map((c) => (
            <button key={c.id} type="button" className="chip" onClick={() => go("client", c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      <SheetFooter>
        <button type="button" className="btn-accent flex-1" onClick={submit}>
          Guardar
        </button>
        <button
          type="button"
          className="btn text-danger"
          onClick={async () => {
            if (!confirm(`Apagar a ${label.toLowerCase()} «${focus.name}»?`)) return;
            await remove("focuses", focus.id);
            onClose();
          }}
        >
          Apagar
        </button>
      </SheetFooter>
    </Sheet>
  );
}
