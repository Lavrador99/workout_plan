import { useEffect, useMemo, useState } from "react";
import { exportClient, purgeClient, remove, save } from "../lib/db";
import { downloadText } from "../lib/exportExercises";
import { fmtLoad } from "../lib/format";
import AssessmentsTab from "../components/AssessmentsTab";
import Chips, { ChipPick } from "../components/Chips";
import CountsView from "../components/CountsView";
import { go, useClient, useExercises, useFocuses, useSessions } from "../lib/hooks";
import { FOCUS_KINDS } from "../lib/movement";
import { fmtDate, num, todayISO } from "../lib/text";
import type { Client, Item, Session, Side } from "../lib/types";
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

type Tab = "sessions" | "info" | "records" | "counts" | "assessments";
type Handed = Side | "both";

const GOALS = ["Saúde", "Força", "Performance", "Reabilitação"];
const LEVELS = ["recreativo", "competitivo", "elite"] as const;
const HANDED: [Handed, string][] = [
  ["right", "Direita"],
  ["left", "Esquerda"],
  ["both", "Ambas"],
];
const handedLabel = (v: Handed | null | undefined) => HANDED.find(([k]) => k === v)?.[1];
const handedValue = (label: string | undefined) => HANDED.find(([, l]) => l === label)?.[0] ?? null;

export default function ClientPage({ id, initialTab }: { id: string; initialTab?: string }) {
  const stored = useClient(id);
  const sessions = useSessions(id);
  const exercises = useExercises();
  const focuses = useFocuses();
  const [c, setC] = useState<Client | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab === "assessments" || initialTab === "info" ? initialTab : "sessions");

  useEffect(() => {
    if (stored) setC(stored);
  }, [stored]);

  const names = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e.name])), [exercises]);
  const marks = useMemo(() => bestMarks(sessions ?? [], names), [sessions, names]);
  const focusIds = stored?.focusIds;
  const mine = useMemo(() => (focuses ?? []).filter((f) => focusIds?.includes(f.id)), [focuses, focusIds]);

  if (stored === null) return <p className="p-4 text-muted">Cliente não encontrado.</p>;
  if (!c) return null;

  const edit = (patch: Partial<Client>) => setC({ ...c, ...patch });
  const persist = () => void save("clients", c);
  /** Choices are stored straight away, typed fields when they lose focus. */
  const choose = (patch: Partial<Client>) => {
    const next = { ...c, ...patch };
    setC(next);
    void save("clients", next);
  };
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
            ["counts", "Contagens"],
            ["assessments", "Avaliar"],
            ["info", "Ficha"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" className={`flex-auto px-1 py-2 text-sm font-semibold whitespace-nowrap border-b-2 ${tab === k ? "border-accent text-accent" : "border-transparent text-muted"}`} onClick={() => setTab(k)}>
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
            <p className="text-sm text-muted">As marcas aparecem aqui quando marcas séries com carga como feitas (✓). Toca num exercício para ver a evolução.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {marks.map((m) => (
                  <tr key={m.name} className="border-b border-border last:border-0 cursor-pointer" onClick={() => go("history", id, m.item.exerciseId ?? `n:${m.item.name}`)}>
                    <td className="py-2 text-accent2">{m.name}</td>
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

      {tab === "counts" && <CountsView sessions={sessions ?? []} exercises={exercises ?? []} focuses={mine} />}

      {tab === "assessments" && <AssessmentsTab clientId={id} />}

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
          <div className="grid grid-cols-3 gap-2">
            <Field label="Altura (cm)">
              <input className="input" inputMode="numeric" value={c.heightCm ?? ""} onChange={(e) => edit({ heightCm: num(e.target.value) })} />
            </Field>
            <Field label="Anos de prática">
              <input className="input" inputMode="numeric" value={c.sportYears ?? ""} onChange={(e) => edit({ sportYears: num(e.target.value) })} />
            </Field>
            <Field label="Treinos / sem.">
              <input className="input" inputMode="numeric" value={c.weeklyFrequency ?? ""} onChange={(e) => edit({ weeklyFrequency: num(e.target.value) })} />
            </Field>
          </div>
          <Field label="Posição">
            <input className="input" value={c.position ?? ""} placeholder="ex: Lateral direito" onChange={(e) => edit({ position: e.target.value })} />
          </Field>
          <div className="flex flex-col gap-1">
            <span className="label">Nível</span>
            <ChipPick options={[...LEVELS]} value={c.level ?? undefined} onChange={(v) => choose({ level: (v as Client["level"]) ?? null })} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Mão dominante</span>
            <ChipPick options={HANDED.map(([, l]) => l)} value={handedLabel(c.dominantHand)} onChange={(v) => choose({ dominantHand: handedValue(v) })} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Pé dominante</span>
            <ChipPick options={HANDED.map(([, l]) => l)} value={handedLabel(c.dominantFoot)} onChange={(v) => choose({ dominantFoot: handedValue(v) })} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Objetivos</span>
            <Chips options={GOALS} value={c.goals ?? []} onChange={(goals) => choose({ goals })} />
          </div>
          <Field label="Lesões / cuidados">
            <input className="input" value={c.injuries} placeholder="ex: Glúteo médio esquerdo" onChange={(e) => edit({ injuries: e.target.value })} />
          </Field>
          {FOCUS_KINDS.map(([kind, label]) => {
            const options = (focuses ?? []).filter((f) => f.kind === kind);
            const labels = options.map((f) => f.name);
            const picked = options.filter((f) => c.focusIds?.includes(f.id)).map((f) => f.name);
            return (
              <div key={kind} className="flex flex-col gap-1">
                <span className="label">{label}</span>
                {options.length ? (
                  <Chips
                    options={labels}
                    value={picked}
                    onChange={(v) => {
                      const other = (c.focusIds ?? []).filter((id) => !options.some((f) => f.id === id));
                      const next = { ...c, focusIds: [...other, ...options.filter((f) => v.includes(f.name)).map((f) => f.id)] };
                      setC(next);
                      void save("clients", next);
                    }}
                  />
                ) : (
                  <button type="button" className="btn-ghost text-accent2 self-start -ml-3" onClick={() => go("focus")}>
                    Criar em Perfis →
                  </button>
                )}
              </div>
            );
          })}
          <Field label="Notas e records">
            <textarea className="input py-2 min-h-[180px]" value={c.notes} placeholder={"Front Squat - 8x50kg\nDeadlift - 20x50kg"} onChange={(e) => edit({ notes: e.target.value })} />
          </Field>
          <div className="flex flex-col gap-1">
            <span className="label">Consentimento para guardar os dados</span>
            <div className="flex gap-2">
              <input className="input" type="date" value={c.consentAt ?? ""} aria-label="Data do consentimento" onChange={(e) => choose({ consentAt: e.target.value || null })} />
              {!c.consentAt && (
                <button type="button" className="btn shrink-0" onClick={() => choose({ consentAt: todayISO() })}>
                  Dado hoje
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn"
              onClick={async () => {
                downloadText(JSON.stringify(await exportClient(c.id), null, 2), `atleta-${todayISO()}.json`, "application/json");
              }}
            >
              Exportar dados
            </button>
            <button
              type="button"
              className="btn text-danger"
              onClick={async () => {
                if (!confirm(`Apagar ${c.name}? As sessões ficam guardadas mas escondidas.`)) return;
                await remove("clients", c.id);
                go("");
              }}
            >
              Apagar cliente
            </button>
            <button
              type="button"
              className="btn text-danger"
              onClick={async () => {
                const typed = prompt(`Apagar definitivamente ${c.name}, com todas as sessões e avaliações? Não dá para desfazer. Escreve o nome para confirmar.`);
                if (typed?.trim() !== c.name.trim()) return;
                await purgeClient(c.id);
                go("");
              }}
            >
              Apagar definitivamente
            </button>
          </div>
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
