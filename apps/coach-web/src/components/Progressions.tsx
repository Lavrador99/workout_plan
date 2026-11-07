import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMemo, useState } from "react";
import { matchExercise, save } from "../lib/db";
import { useExerciseIndex, useExercises } from "../lib/hooks";
import { parseItemLine } from "../lib/parser";
import { families, familyOf, likelyMeant, parseFamilies, saveFamily, setProgressions, step, type Family } from "../lib/progressions";
import { uid } from "../lib/text";
import type { Exercise, Item } from "../lib/types";
import ExerciseInput from "./ExerciseInput";
import Sheet from "./Sheet";

/** Library tab: every family, and pasting new ones. */
export function ProgressionsView({ exercises }: { exercises: Exercise[] }) {
  const list = useMemo(() => families(exercises), [exercises]);
  const [open, setOpen] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const family = list.find((f) => f.base.id === open);
  return (
    <>
      <button type="button" className="btn-accent" onClick={() => setPasting(true)}>
        + Colar progressões
      </button>
      {list.length === 0 ? (
        <p className="text-sm text-muted">Ainda não há progressões. Cola uma lista, ou abre um exercício e junta-lhe as versões mais difíceis.</p>
      ) : (
        <ul className="card divide-y divide-border">
          {list.map((f) => (
            <li key={f.base.id}>
              <button type="button" className="row py-3" onClick={() => setOpen(f.base.id)}>
                <span className="flex-1 min-w-0">
                  <span className="font-medium">{f.base.name}</span>
                  <span className="block text-xs text-muted truncate">até {f.chain[f.chain.length - 1].name}</span>
                </span>
                <span className="text-xs text-muted tabular-nums shrink-0">{f.chain.length} níveis</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {family && (
        <Sheet title={family.base.name} subtitle={`${family.chain.length} níveis`} onClose={() => setOpen(null)}>
          <FamilyEditor base={family.base} exercises={exercises} />
        </Sheet>
      )}
      {pasting && (
        <Sheet title="Colar progressões" persistent onClose={() => setPasting(false)}>
          <PasteFamilies exercises={exercises} onDone={() => setPasting(false)} />
        </Sheet>
      )}
    </>
  );
}

function ChainLine({ family, current }: { family: Family; current?: string }) {
  return (
    <ol className="flex flex-col gap-1 mt-1">
      {family.chain.map((e, i) => (
        <li key={e.id} className={`text-sm flex gap-2 ${e.id === current ? "text-accent font-semibold" : ""}`}>
          <span className="text-muted tabular-nums w-4 text-right">{i + 1}</span>
          {e.name}
        </li>
      ))}
    </ol>
  );
}

/** Paste lists: one exercise per line, blank line between families, first line = base. */
function PasteFamilies({ exercises, onDone }: { exercises: Exercise[]; onDone: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const index = useExerciseIndex();
  const parsed = useMemo(() => parseFamilies(text, exercises), [text, exercises]);
  const created = parsed.flat().filter((l) => !l.ex).length;

  const fix = (from: string, to: string) => setText((t) => t.replace(from, to));

  const submit = async () => {
    setBusy(true);
    const made = new Map<string, Exercise>();
    for (const f of parsed) await saveFamily(f, made);
    setBusy(false);
    onDone();
  };

  return (
    <>
      <textarea
        className="input py-2 min-h-[150px] font-mono text-sm"
        aria-label="Progressões"
        value={text}
        placeholder={"Uma por linha, da mais fácil à mais difícil.\nLinha em branco = nova família.\n\nBird dog\nBird dog em cima da caixa\nBird dog em cima da caixa c/ peso row"}
        onChange={(e) => setText(e.target.value)}
      />
      {parsed.map((f, fi) => (
        <ol key={fi} className="flex flex-col gap-1 text-sm">
          {f.map((l, i) => {
            const guess = !l.ex ? likelyMeant(l.name, index.search(l.name, 5)) : undefined;
            return (
              <li key={i} className="flex items-baseline gap-2">
                <span className="text-muted tabular-nums w-4 text-right shrink-0">{i + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className={i === 0 ? "font-semibold" : ""}>{l.name}</span>{" "}
                  {l.ex ? (
                    <span className="text-xs text-success whitespace-nowrap"><Check /> {l.ex.name !== l.name ? l.ex.name : "existe"}</span>
                  ) : (
                    <span className="text-xs text-warn whitespace-nowrap">+ novo</span>
                  )}
                  {guess && (
                    <button type="button" className="block text-xs underline text-accent text-left" onClick={() => fix(l.name, guess.name)}>
                      Querias dizer «{guess.name}»?
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      ))}
      {parsed.length > 0 && (
        <button type="button" className="btn-accent" disabled={busy} onClick={submit}>
          Guardar {parsed.length} família(s){created ? ` · cria ${created} exercício(s)` : ""}
        </button>
      )}
    </>
  );
}

/** The levels of a base exercise: reorder, remove, add (new names are created). */
export function FamilyEditor({ base, exercises }: { base: Exercise; exercises: Exercise[] }) {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const ids = (base.progressions ?? []).filter((id) => byId.get(id) && !byId.get(id)?.deleted);
  const set = (next: string[]) => void setProgressions(base, next);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };
  const add = async (text: string) => {
    const name = parseItemLine(text).name || text.trim();
    if (!name) return;
    const ex = matchExercise(exercises, name) ?? (await save<Exercise>("exercises", { id: uid(), updatedAt: 0, name, aliases: [], tags: [] }));
    set([...ids, ex.id]);
  };
  return (
    <div className="flex flex-col gap-1">
      <ol className="flex flex-col">
        <li className="flex items-center gap-2 py-1 text-sm">
          <span className="text-muted tabular-nums w-4 text-right">1</span>
          <span className="flex-1 font-semibold">{base.name}</span>
          <span className="text-xs text-muted">base</span>
        </li>
        {ids.map((id, i) => (
          <li key={id} className="flex items-center gap-1 py-0.5 text-sm">
            <span className="text-muted tabular-nums w-4 text-right mr-1">{i + 2}</span>
            <span className="flex-1 min-w-0 truncate">{byId.get(id)?.name}</span>
            <button type="button" className="btn-ghost px-2 min-h-[40px]" onClick={() => move(i, -1)} aria-label="Mais fácil">
              <ArrowUp />
            </button>
            <button type="button" className="btn-ghost px-2 min-h-[40px]" onClick={() => move(i, 1)} aria-label="Mais difícil">
              <ArrowDown />
            </button>
            <button type="button" className="btn-ghost px-2 min-h-[40px] text-muted" onClick={() => set(ids.filter((x) => x !== id))} aria-label="Tirar">
              <X />
            </button>
          </li>
        ))}
      </ol>
      <ExerciseInput key={ids.length} placeholder="+ Nível seguinte (mais difícil)…" onSubmit={(t) => void add(t)} />
    </div>
  );
}

/** In the exercise editor: its levels, or which family it is a level of. */
export function FamilySection({ ex, exercises, onOpen }: { ex: Exercise; exercises: Exercise[]; onOpen: (id: string) => void }) {
  const fam = familyOf(ex.id, exercises);
  if (fam && fam.base.id !== ex.id) {
    const level = fam.chain.findIndex((e) => e.id === ex.id) + 1;
    return (
      <div className="flex flex-col gap-1">
        <span className="label">Progressões</span>
        <div className="flex items-center gap-2 text-sm">
          <span className="flex-1">
            Nível {level} de {fam.chain.length} de <b>{fam.base.name}</b>
          </span>
          <button type="button" className="btn" onClick={() => onOpen(fam.base.id)}>
            Ver família
          </button>
        </div>
        <ChainLine family={fam} current={ex.id} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="label">Progressões (da mais fácil à mais difícil)</span>
      <FamilyEditor base={ex} exercises={exercises} />
    </div>
  );
}

/** The item as another level of its family: same sets, other exercise. */
const asLevel = (item: Item, ex: Exercise): Item => ({ ...item, name: ex.name, exerciseId: ex.id });

/** In the item editor: every level of the family, tap to switch. */
export function LevelPicker({ item, onChange }: { item: Item; onChange: (i: Item) => void }) {
  const exercises = useExercises() ?? [];
  const fam = familyOf(item.exerciseId, exercises);
  if (!fam) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="label">Progressão · {fam.base.name}</span>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {fam.chain.map((e, i) => (
          <button key={e.id} type="button" className={`chip ${e.id === item.exerciseId ? "chip-on" : ""}`} onClick={() => onChange(asLevel(item, e))}>
            {i + 1}. {e.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Live session: one tap to the easier or harder level. */
export function EasierHarder({ item, onChange }: { item: Item; onChange: (i: Item) => void }) {
  const exercises = useExercises() ?? [];
  const fam = familyOf(item.exerciseId, exercises);
  if (!fam || !item.exerciseId) return null;
  const level = fam.chain.findIndex((e) => e.id === item.exerciseId);
  const down = step(fam, item.exerciseId, -1);
  const up = step(fam, item.exerciseId, 1);
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <button type="button" className="btn justify-start min-w-0" disabled={!down} onClick={() => down && onChange(asLevel(item, down))}>
        <span className="truncate"><ChevronLeft /> {down ? "Mais fácil" : "—"}</span>
      </button>
      <span className="text-xs text-muted tabular-nums">
        nível {level + 1}/{fam.chain.length}
      </span>
      <button type="button" className="btn justify-end min-w-0" disabled={!up} onClick={() => up && onChange(asLevel(item, up))}>
        <span className="truncate">{up ? "Mais difícil" : "—"} <ChevronRight /></span>
      </button>
    </div>
  );
}
