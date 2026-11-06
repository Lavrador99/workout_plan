import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { exportClient, purgeClient, remove, save } from "../lib/db";
import { downloadText } from "../lib/exportExercises";
import { fmtLoad } from "../lib/format";
import AssessmentsTab from "../components/AssessmentsTab";
import BalanceTab from "../components/BalanceTab";
import Chips, { ChipPick } from "../components/Chips";
import CountsView from "../components/CountsView";
import PageHeader, { NotFound } from "../components/PageHeader";
import Sheet, { SheetFooter } from "../components/Sheet";
import Tabs from "../components/Tabs";
import { back, go, replaceRoute, useClient, useExercises, useFocuses, useSessions } from "../lib/hooks";
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

const TABS = [
  ["sessions", "Sessões"],
  ["records", "Marcas"],
  ["balance", "Balanço"],
  ["counts", "Contagens"],
  ["assessments", "Avaliações"],
  ["info", "Ficha"],
] as const;
type Tab = (typeof TABS)[number][0];
type Section = "person" | "training" | "health" | "notes" | "data";

/** Sessions shown at first; a long history opens on demand. */
const PAGE = 20;
/** How far the list was opened, so coming back from a session lands in the same place. */
const shownOf = new Map<string, number>();

const monthOf = (iso: string) => new Date(`${iso.slice(0, 7)}-01T12:00:00`).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

type Handed = Side | "both";

const GOALS = ["Saúde", "Força", "Performance", "Reabilitação"];
const LEVELS = ["recreativo", "competitivo", "elite"] as const;
const HANDED: [Handed, string][] = [
  ["right", "Direita"],
  ["left", "Esquerda"],
  ["both", "Ambas"],
];
const SEXES: ["female" | "male", string][] = [
  ["female", "Feminino"],
  ["male", "Masculino"],
];
const handedLabel = (v: Handed | null | undefined) => HANDED.find(([k]) => k === v)?.[1];
const handedValue = (label: string | undefined) => HANDED.find(([, l]) => l === label)?.[0] ?? null;

export default function ClientPage({ id, tab: routeTab }: { id: string; tab?: string }) {
  const stored = useClient(id);
  const sessions = useSessions(id);
  const exercises = useExercises();
  const focuses = useFocuses();
  const [c, setC] = useState<Client | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [shown, setShown] = useState(() => shownOf.get(id) ?? PAGE);
  const gone = useRef(false);
  const tab: Tab = TABS.find(([k]) => k === routeTab)?.[0] ?? "sessions";

  useEffect(() => {
    if (stored) setC(stored);
  }, [stored]);

  const names = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e.name])), [exercises]);
  const marks = useMemo(() => bestMarks(sessions ?? [], names), [sessions, names]);
  const focusIds = stored?.focusIds;
  const mine = useMemo(() => (focuses ?? []).filter((f) => focusIds?.includes(f.id)), [focuses, focusIds]);

  if (stored === null) return <NotFound title="Cliente" back={[""]} />;
  if (!c) return null;

  const edit = (patch: Partial<Client>) => setC({ ...c, ...patch });
  const persist = () => {
    if (!gone.current && JSON.stringify(c) !== JSON.stringify(stored)) void save("clients", c);
  };
  /** Choices are stored straight away, typed fields when they lose focus. */
  const choose = (patch: Partial<Client>) => {
    const next = { ...c, ...patch };
    setC(next);
    void save("clients", next);
  };
  const closeSection = () => {
    persist();
    setSection(null);
  };
  const age = c.birthYear ? new Date().getFullYear() - c.birthYear : null;
  const focusNames = (focuses ?? []).filter((f) => c.focusIds?.includes(f.id)).map((f) => f.name);
  const list = sessions ?? [];

  const sectionRows: [Section, string, string, string?][] = [
    ["person", "Dados pessoais", [age && `${age} anos`, c.sex && SEXES.find(([k]) => k === c.sex)?.[1], c.heightCm && `${c.heightCm} cm`, handedLabel(c.dominantHand) && `mão ${handedLabel(c.dominantHand)?.toLowerCase()}`].filter(Boolean).join(" · ") || "Por preencher"],
    ["training", "Treino e objetivos", [c.level, c.position, c.weeklyFrequency && `${c.weeklyFrequency}×/sem`, ...(c.goals ?? []), ...focusNames].filter(Boolean).join(" · ") || "Por preencher"],
    ["health", "Saúde e cuidados", [c.injuries, c.hrMax && `FC máx ${c.hrMax}`, c.hrRest && `repouso ${c.hrRest}`].filter(Boolean).join(" · ") || "Sem lesões registadas"],
    ["notes", "Notas e records", c.notes.split("\n")[0] || "Sem notas"],
    ["data", "Consentimento e dados", c.consentAt ? `Consentimento em ${fmtDate(c.consentAt)}` : "⚠ Sem consentimento registado", c.consentAt ? undefined : "text-warn"],
  ];

  return (
    <>
      <PageHeader title={c.name} back={[""]}>
        <Tabs options={TABS} value={tab} onChange={(t) => replaceRoute("client", id, t)} />
      </PageHeader>
      <div className="page">
        {c.injuries && <div className="text-sm text-danger">⚠ {c.injuries}</div>}

        {tab === "sessions" && (
          <>
            <div className="flex gap-2">
              <button type="button" className="btn-accent flex-1" onClick={() => void openNewSession(id, list[0])} disabled={!list.length}>
                ⧉ Duplicar último
              </button>
              <button type="button" className="btn flex-1" onClick={() => void openNewSession(id)}>
                + Sessão em branco
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{list.length === 1 ? "1 sessão" : `${list.length} sessões`}</span>
              <button type="button" className="text-xs text-accent2" onClick={() => go("import", id)}>
                Importar treinos antigos ›
              </button>
            </div>
            <ul className="flex flex-col gap-2">
              {list.slice(0, shown).map((s, i, all) => {
                const ex = s.blocks.flatMap((b) => b.items.filter((i) => i.role === "main" && i.sets.length)).map((i) => i.name);
                const newMonth = s.date.slice(0, 7) !== all[i - 1]?.date.slice(0, 7);
                return (
                  <li key={s.id} className="flex flex-col gap-2">
                    {newMonth && <h2 className="label capitalize mt-1">{monthOf(s.date)}</h2>}
                    <div className="card flex items-stretch">
                      <button type="button" className="flex-1 text-left p-3 min-w-0" onClick={() => go("session", s.id)}>
                        <div className="flex gap-2 items-baseline">
                          <span className="font-semibold">{fmtDate(s.date)}</span>
                          <span className="text-accent text-sm">{s.title}</span>
                        </div>
                        <div className="text-xs text-muted truncate">{ex.slice(0, 6).join(" · ")}</div>
                      </button>
                      <button type="button" className="px-3 text-muted border-l border-border text-sm" onClick={() => void openNewSession(id, s)} title="Duplicar para hoje" aria-label={`Duplicar sessão de ${fmtDate(s.date)} para hoje`}>
                        ⧉
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {list.length > shown && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  shownOf.set(id, shown + PAGE);
                  setShown(shown + PAGE);
                }}
              >
                Ver mais ({list.length - shown})
              </button>
            )}
          </>
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

        {tab === "balance" && <BalanceTab client={c} sessions={sessions ?? []} exercises={exercises ?? []} focuses={mine} />}

        {tab === "counts" && <CountsView sessions={list} exercises={exercises ?? []} focuses={mine} />}

        {tab === "assessments" && <AssessmentsTab clientId={id} />}

        {tab === "info" && (
          <ul className="card divide-y divide-border">
            {sectionRows.map(([k, title, summary, tone]) => (
              <li key={k}>
                <button type="button" className="row" onClick={() => setSection(k)}>
                  <span className="flex-1 min-w-0">
                    <span className="font-medium block">{title}</span>
                    <span className={`block text-xs truncate ${tone ?? "text-muted"}`}>{summary}</span>
                  </span>
                  <span className="text-muted">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {section === "person" && (
        <FichaSheet title="Dados pessoais" onClose={closeSection} onBlur={persist}>
          <Field label="Nome">
            <input className="input" value={c.name} onChange={(e) => edit({ name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={`Ano nasc.${age ? ` (${age})` : ""}`}>
              <input className="input" inputMode="numeric" value={c.birthYear ?? ""} onChange={(e) => edit({ birthYear: num(e.target.value) })} />
            </Field>
            <Field label="Altura (cm)">
              <input className="input" inputMode="numeric" value={c.heightCm ?? ""} onChange={(e) => edit({ heightCm: num(e.target.value) })} />
            </Field>
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Sexo (para as referências científicas)</span>
            <ChipPick options={SEXES.map(([, l]) => l)} value={SEXES.find(([k]) => k === c.sex)?.[1]} onChange={(v) => choose({ sex: SEXES.find(([, l]) => l === v)?.[0] ?? null })} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Mão dominante</span>
            <ChipPick options={HANDED.map(([, l]) => l)} value={handedLabel(c.dominantHand)} onChange={(v) => choose({ dominantHand: handedValue(v) })} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Pé dominante</span>
            <ChipPick options={HANDED.map(([, l]) => l)} value={handedLabel(c.dominantFoot)} onChange={(v) => choose({ dominantFoot: handedValue(v) })} />
          </div>
        </FichaSheet>
      )}

      {section === "training" && (
        <FichaSheet title="Treino e objetivos" onClose={closeSection} onBlur={persist}>
          <div className="grid grid-cols-2 gap-2">
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
            <span className="label">Objetivos</span>
            <Chips options={GOALS} value={c.goals ?? []} onChange={(goals) => choose({ goals })} />
          </div>
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
        </FichaSheet>
      )}

      {section === "health" && (
        <FichaSheet title="Saúde e cuidados" onClose={closeSection} onBlur={persist}>
          <Field label="Lesões / cuidados">
            <input className="input" value={c.injuries} placeholder="ex: Glúteo médio esquerdo" onChange={(e) => edit({ injuries: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="FC máx">
              <input className="input" inputMode="decimal" value={c.hrMax ?? ""} placeholder={age ? String(Math.round(208 - 0.7 * age)) : ""} onChange={(e) => edit({ hrMax: num(e.target.value) })} />
            </Field>
            <Field label="FC repouso">
              <input className="input" inputMode="numeric" value={c.hrRest ?? ""} onChange={(e) => edit({ hrRest: num(e.target.value) })} />
            </Field>
          </div>
        </FichaSheet>
      )}

      {section === "notes" && (
        <FichaSheet title="Notas e records" onClose={closeSection} onBlur={persist}>
          <textarea className="input py-2 min-h-[240px]" aria-label="Notas e records" value={c.notes} placeholder={"Front Squat - 8x50kg\nDeadlift - 20x50kg"} onChange={(e) => edit({ notes: e.target.value })} />
        </FichaSheet>
      )}

      {section === "data" && (
        <FichaSheet title="Consentimento e dados" onClose={closeSection} onBlur={persist}>
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
          <button
            type="button"
            className="btn self-start"
            onClick={async () => {
              downloadText(JSON.stringify(await exportClient(c.id), null, 2), `cliente-${todayISO()}.json`, "application/json");
            }}
          >
            Exportar dados
          </button>
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <span className="label text-danger">Zona de perigo</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn text-danger"
                onClick={async () => {
                  if (!confirm(`Apagar ${c.name}? As sessões ficam guardadas mas escondidas.`)) return;
                  gone.current = true;
                  await remove("clients", c.id);
                  back("");
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
                  gone.current = true;
                  await purgeClient(c.id);
                  back("");
                }}
              >
                Apagar definitivamente
              </button>
            </div>
          </div>
        </FichaSheet>
      )}
    </>
  );
}

/** One section of the client's file. Everything is saved as it changes, so closing is all it takes. */
function FichaSheet({ title, onClose, onBlur, children }: { title: string; onClose: () => void; onBlur: () => void; children: ReactNode }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="flex flex-col gap-3 flex-1" onBlur={onBlur}>
        {children}
      </div>
      <SheetFooter>
        <button type="button" className="btn-accent flex-1" onClick={onClose}>
          Concluir
        </button>
      </SheetFooter>
    </Sheet>
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
