import { useEffect, useMemo, useState } from "react";
import { remove, save } from "../lib/db";
import { fmtLoad } from "../lib/format";
import { go, useClient, useExercises, useSessions } from "../lib/hooks";
import { fmtDate, num } from "../lib/text";
import type { Client, Item, Session } from "../lib/types";
import { openNewSession } from "./SessionPage";

interface Best {
  name: string;
  load: number;
  reps: number | null;
  date: string;
  item: Item;
}

/** Heaviest ticked set per exercise. */
function bestMarks(sessions: Session[], names: Map<string, string>): Best[] {
  const best = new Map<string, Best>();
  for (const s of sessions)
    for (const b of s.blocks)
      for (const it of b.items) {
        const key = it.exerciseId ?? it.name;
        for (const set of it.sets) {
          if (!set.done || set.load == null || it.loadMode === "added") continue;
          const cur = best.get(key);
          if (!cur || set.load > cur.load || (set.load === cur.load && (set.reps ?? 0) > (cur.reps ?? 0)))
            best.set(key, { name: names.get(key) ?? it.name, load: set.load, reps: set.reps ?? null, date: s.date, item: it });
        }
      }
  return [...best.values()].sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

export default function ClientPage({ id }: { id: string }) {
  const stored = useClient(id);
  const sessions = useSessions(id);
  const exercises = useExercises();
  const [c, setC] = useState<Client | null>(null);
  const [tab, setTab] = useState<"sessions" | "info" | "records">("sessions");

  useEffect(() => {
    if (stored) setC(stored);
  }, [stored]);

  const names = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e.name])), [exercises]);
  const marks = useMemo(() => bestMarks(sessions ?? [], names), [sessions, names]);

  if (stored === null) return <p className="p-4 text-muted">Cliente não encontrado.</p>;
  if (!c) return null;

  const edit = (patch: Partial<Client>) => setC({ ...c, ...patch });
  const persist = () => void save("clients", c);
  const age = c.birthYear ? new Date().getFullYear() - c.birthYear : null;

  return (
    <div className="flex flex-col gap-3 p-3 pb-28">
      <div className="flex items-center gap-2">
        <button type="button" className="btn-ghost -ml-2" onClick={() => go("")}>
          ←
        </button>
        <h1 className="text-xl font-bold flex-1 truncate">{c.name}</h1>
      </div>
      {c.injuries && <div className="text-sm text-danger">⚠ {c.injuries}</div>}

      <div className="flex gap-2">
        <button type="button" className="btn-accent flex-1" onClick={() => void openNewSession(id, sessions?.[0])} disabled={!sessions?.length}>
          ⧉ Duplicar último
        </button>
        <button type="button" className="btn flex-1" onClick={() => void openNewSession(id)}>
          + Sessão em branco
        </button>
      </div>

      <div className="flex border-b border-border">
        {(
          [
            ["sessions", `Sessões (${sessions?.length ?? 0})`],
            ["records", "Marcas"],
            ["info", "Ficha"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" className={`flex-1 py-2 text-sm font-semibold border-b-2 ${tab === k ? "border-accent text-accent" : "border-transparent text-muted"}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "sessions" && (
        <ul className="flex flex-col gap-2">
          {sessions?.map((s) => {
            const ex = s.blocks.flatMap((b) => b.items.filter((i) => i.role === "main" && i.sets.length)).map((i) => i.name);
            return (
              <li key={s.id} className="card flex items-stretch">
                <button type="button" className="flex-1 text-left p-3 min-w-0" onClick={() => go("session", s.id)}>
                  <div className="flex gap-2 items-baseline">
                    <span className="font-semibold">{fmtDate(s.date)}</span>
                    <span className="text-accent text-sm">{s.title}</span>
                  </div>
                  <div className="text-xs text-muted truncate">{ex.slice(0, 6).join(" · ")}</div>
                </button>
                <button type="button" className="px-3 text-muted border-l border-border text-sm" onClick={() => void openNewSession(id, s)} title="Duplicar para hoje">
                  ⧉
                </button>
              </li>
            );
          })}
          <li>
            <button type="button" className="btn w-full" onClick={() => go("import", id)}>
              Importar treinos antigos (colar texto)
            </button>
          </li>
        </ul>
      )}

      {tab === "records" && (
        <div className="card p-3">
          {marks.length === 0 ? (
            <p className="text-sm text-muted">As marcas aparecem aqui quando marcas séries com carga como feitas (✓).</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {marks.map((m) => (
                  <tr key={m.name} className="border-b border-border last:border-0">
                    <td className="py-2">{m.name}</td>
                    <td className="text-right font-semibold whitespace-nowrap">
                      {m.reps != null ? `${m.reps} × ` : ""}
                      {fmtLoad({ ...m.item, loadMax: null }, m.load)}
                    </td>
                    <td className="text-right text-xs text-muted pl-2 whitespace-nowrap">{fmtDate(m.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "info" && (
        <div className="card p-3 flex flex-col gap-3" onBlur={persist}>
          <Field label="Nome">
            <input className="input" value={c.name} onChange={(e) => edit({ name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label={`Ano nasc.${age ? ` (${age})` : ""}`}>
              <input className="input" inputMode="numeric" value={c.birthYear ?? ""} onChange={(e) => edit({ birthYear: num(e.target.value) })} />
            </Field>
            <Field label="FC máx">
              <input className="input" inputMode="decimal" value={c.hrMax ?? ""} placeholder={age ? String(Math.round(208 - 0.7 * age)) : ""} onChange={(e) => edit({ hrMax: num(e.target.value) })} />
            </Field>
            <Field label="FC repouso">
              <input className="input" inputMode="numeric" value={c.hrRest ?? ""} onChange={(e) => edit({ hrRest: num(e.target.value) })} />
            </Field>
          </div>
          <Field label="Lesões / cuidados">
            <input className="input" value={c.injuries} placeholder="ex: Glúteo médio esquerdo" onChange={(e) => edit({ injuries: e.target.value })} />
          </Field>
          <Field label="Notas e records">
            <textarea className="input py-2 min-h-[180px]" value={c.notes} placeholder={"Front Squat - 8x50kg\nDeadlift - 20x50kg"} onChange={(e) => edit({ notes: e.target.value })} />
          </Field>
          <button
            type="button"
            className="btn text-danger self-start"
            onClick={async () => {
              if (!confirm(`Apagar ${c.name}? As sessões ficam guardadas mas escondidas.`)) return;
              await remove("clients", c.id);
              go("");
            }}
          >
            Apagar cliente
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
