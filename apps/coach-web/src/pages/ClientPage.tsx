import { PageLoading } from "../components/States";
import { ChevronRight, Copy, TriangleAlert, X } from "lucide-react";
import { ask, askText } from "../components/Dialogs";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { exportClient, purgeClient, remove, save } from "../lib/db";
import { registerPayment } from "../lib/agendaActions";
import { fmtMoney, fmtMonth, monthKey, owedMonths, setFee } from "../lib/payments";
import { downloadText } from "../lib/exportExercises";
import { fmtLoad } from "@treino/core/format";
import AssessmentsTab from "../components/AssessmentsTab";
import BalanceTab from "../components/BalanceTab";
import Chips, { ChipPick } from "../components/Chips";
import { restOf } from "../components/onboarding/IntakeSteps";
import Field from "../components/Field";
import CountsView from "../components/CountsView";
import PageHeader, { NotFound } from "../components/PageHeader";
import Sheet, { SheetFooter } from "../components/Sheet";
import Tabs from "../components/Tabs";
import { back, go, replaceRoute, useAssessments, useClient, useExercises, useFocuses, useScreenings, useSessions, useTests, useViewState } from "../lib/hooks";
import { startReassessment } from "../lib/reassess";
import { ageOf, CONSENTS, DECISIONS, injuryText, isMinor, labelOf, screeningState, STATE_TEXT } from "../lib/screening";
import { ACTIVITIES, changeSchedule, currentDays, WEEKDAYS } from "../lib/balance";
import { FOCUS_KINDS } from "../lib/movement";
import { fmtPace, parsePace } from "@treino/core/run";
import { fmtDate, fmtNum, num, todayISO } from "@treino/core/text";
import type { Client, Item, Session } from "@treino/core/types";
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
type Section = "payments" | "training" | "health" | "notes" | "data";
/** Rows that open the initial assessment at a step instead of a sheet. */
type Row = Section | "person" | "screening";

/** Sessions shown at first; a long history opens on demand. */
const PAGE = 20;
/** How far the list was opened, so coming back from a session lands in the same place. */
const shownOf = new Map<string, number>();

const monthOf = (iso: string) => new Date(`${iso.slice(0, 7)}-01T12:00:00`).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

const LEVELS = ["recreativo", "competitivo", "elite"] as const;
const SEX_WORD = { female: "feminino", male: "masculino" } as const;

export default function ClientPage({ id, tab: routeTab }: { id: string; tab?: string }) {
  const stored = useClient(id);
  const sessions = useSessions(id);
  const exercises = useExercises();
  const focuses = useFocuses();
  const screenings = useScreenings(id);
  const assessments = useAssessments(id);
  const tests = useTests();
  const [c, setC] = useState<Client | null>(null);
  const [section, setSection] = useViewState<Section | null>("section", null);
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

  if (stored === null) return <NotFound title="Cliente" back={["clients"]} />;
  if (!c) return <PageLoading title="Cliente" back={["clients"]} />;

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
  const today = todayISO();
  const age = ageOf(c, today);
  const focusNames = (focuses ?? []).filter((f) => c.focusIds?.includes(f.id)).map((f) => f.name);
  const list = sessions ?? [];
  const owed = owedMonths(c, today);
  const lastScreening = screenings?.[0];
  const screening = screeningState(lastScreening, today);
  const minor = isMinor(c, today);
  const given = c.consents?.given ?? {};
  const consentMissing = !given.data_health || (minor && !c.consents?.guardianSignature);
  const openOnboarding = (step?: string) => go("onboarding", id, ...(step ? [step] : []));
  const injuries = injuryText(lastScreening);
  const restHr = restOf((assessments ?? []).find((a) => a.moduleData?.intake === true && restOf(a)?.hr != null))?.hr ?? null;

  const sectionRows: [Row, string, string, string?][] = [
    ["person", "Dados pessoais", [age != null && `${age} anos`, c.sex && SEX_WORD[c.sex], c.phone, c.email].filter(Boolean).join(" · ") || "Por preencher"],
    ["payments", "Pagamentos", !c.monthlyFee ? "Sem mensalidade" : owed.length ? `Por pagar: ${fmtMoney(owed.length * c.monthlyFee)}` : `${fmtMoney(c.monthlyFee)}/mês · em dia`, owed.length ? "text-warn" : undefined],
    ["training", "Treino e perfis", [c.level, c.weeklyFrequency && `${c.weeklyFrequency}×/sem`, ...focusNames].filter(Boolean).join(" · ") || "Por preencher"],
    ["screening", "Ficha geral", lastScreening ? `${labelOf(DECISIONS, lastScreening.decision) ?? STATE_TEXT[screening]} · ${fmtDate(lastScreening.date)}` : STATE_TEXT[screening], screening === "ok" ? undefined : "text-warn"],
    ["health", "Saúde e cuidados", [injuries, c.hrMax && `FC máx ${c.hrMax}`, restHr && `repouso ${restHr}`].filter(Boolean).join(" · ") || "Sem lesões registadas"],
    ["notes", "Notas", c.notes.split("\n")[0] || "Sem notas"],
    ["data", "Consentimento e dados", !given.data_health ? "Sem consentimento registado" : consentMissing ? "Falta a assinatura do encarregado" : `${Object.keys(given).length} de ${CONSENTS.length} autorizações`, consentMissing ? "text-warn" : undefined],
  ];

  return (
    <>
      <PageHeader title={c.name} back={["clients"]}>
        <Tabs options={TABS} value={tab} onChange={(t) => replaceRoute("client", id, t)} />
      </PageHeader>
      <div className="page">
        {injuries && <div className="text-sm text-danger"><TriangleAlert /> {injuries}</div>}
        {(screening === "awaiting" || screening === "referred") && (
          <button type="button" className="text-sm text-warn text-left" onClick={() => openOnboarding("triage")}>
            <TriangleAlert /> Autorização médica pendente <ChevronRight />
          </button>
        )}

        {tab === "sessions" && (
          <>
            <div className="flex gap-2">
              <button type="button" className="btn-accent flex-1" onClick={() => void openNewSession(id, list[0])} disabled={!list.length}>
                <Copy /> Duplicar último
              </button>
              <button type="button" className="btn flex-1" onClick={() => void openNewSession(id)}>
                + Sessão em branco
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{list.length === 1 ? "1 sessão" : `${list.length} sessões`}</span>
              <button type="button" className="text-xs text-accent" onClick={() => go("import", id)}>
                Importar treinos antigos <ChevronRight />
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
                        <Copy />
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
                      <td className="py-2 text-accent">{m.name}</td>
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

        {tab === "balance" && <BalanceTab client={c} sessions={sessions ?? []} exercises={exercises ?? []} />}

        {tab === "counts" && <CountsView sessions={list} exercises={exercises ?? []} focuses={mine} assessments={assessments ?? []} tests={tests ?? []} />}

        {tab === "assessments" && <AssessmentsTab clientId={id} />}

        {tab === "info" && (
          <>
          <button
            type="button"
            className="btn-accent"
            onClick={async () => {
              if (lastScreening?.decision && lastScreening.date !== today) await startReassessment(id, today, tests ?? []);
              openOnboarding();
            }}
          >
            {!lastScreening ? "Avaliação inicial" : lastScreening.decision && lastScreening.date !== today ? "Reavaliação" : "Continuar avaliação"} <ChevronRight />
          </button>
          <ul className="card divide-y divide-border">
            {sectionRows.map(([k, title, summary, tone]) => (
              <li key={k}>
                <button type="button" className="row" onClick={() => (k === "person" ? openOnboarding("id") : k === "screening" ? openOnboarding("triage") : setSection(k))}>
                  <span className="flex-1 min-w-0">
                    <span className="font-medium block">{title}</span>
                    <span className={`block text-xs truncate ${tone ?? "text-muted"}`}>{summary}</span>
                  </span>
                  <span className="text-muted"><ChevronRight /></span>
                </button>
              </li>
            ))}
          </ul>
          </>
        )}
      </div>


      {section === "payments" && (
        <FichaSheet title="Pagamentos" onClose={closeSection} onBlur={persist}>
          <Field label="Mensalidade (€)">
            <input className="input" inputMode="decimal" defaultValue={c.monthlyFee ?? ""} onChange={(e) => edit(setFee(c, num(e.target.value), today))} />
          </Field>
          {c.monthlyFee ? (
            <button type="button" className="btn-accent" onClick={() => void registerPayment(c.id, c.name, owed[0] ?? monthKey(today))}>
              Registar pagamento de <span className="capitalize">{fmtMonth(owed[0] ?? monthKey(today))}</span>
            </button>
          ) : null}
          {owed.length > 0 && <p className="text-sm text-warn">Por pagar: <span className="capitalize">{owed.map(fmtMonth).join(", ")}</span></p>}
          <ul className="flex flex-col divide-y divide-border">
            {[...(c.payments ?? [])].reverse().map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-1 text-sm">
                <span className="flex-1 capitalize">{fmtMonth(p.month)} {p.month.slice(0, 4)}</span>
                <span className="text-muted">{fmtDate(p.date)}</span>
                <span className="font-semibold">{fmtMoney(p.amount)}</span>
                <button type="button" className="btn-ghost w-10 px-0 text-muted" aria-label={`Apagar pagamento de ${fmtMonth(p.month)}`} onClick={() => choose({ payments: c.payments?.filter((x) => x.id !== p.id) })}>
                  <X />
                </button>
              </li>
            ))}
          </ul>
        </FichaSheet>
      )}

      {section === "training" && (
        <FichaSheet title="Treino e perfis" onClose={closeSection} onBlur={persist}>
          <Field label="Treinos por semana">
            <input className="input" inputMode="numeric" value={c.weeklyFrequency ?? ""} onChange={(e) => edit({ weeklyFrequency: num(e.target.value) })} />
          </Field>
          <div className="flex flex-col gap-1">
            <span className="label">Dias planeados</span>
            <Chips options={WEEKDAYS} value={currentDays(c, todayISO()).map((d) => WEEKDAYS[d])} onChange={(v) => choose(changeSchedule(c, v.map((d) => WEEKDAYS.indexOf(d)), todayISO()))} />
            <span className="text-xs text-muted">A adesão usa estes dias a partir de hoje. Antes disso, usa os treinos por semana.</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Contam para a adesão</span>
            <Chips options={ACTIVITIES.map(([, l]) => l)} value={ACTIVITIES.filter(([k]) => !c.adherenceSkips?.includes(k)).map(([, l]) => l)} onChange={(v) => choose({ adherenceSkips: ACTIVITIES.filter(([, l]) => !v.includes(l)).map(([k]) => k) })} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Nível</span>
            <ChipPick options={[...LEVELS]} value={c.level ?? undefined} onChange={(v) => choose({ level: (v as Client["level"]) ?? null })} />
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
                  <button type="button" className="btn-ghost text-accent self-start -ml-3" onClick={() => go("focus")}>
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
          <div className="flex flex-col gap-1">
            <span className="label">Lesões e cuidados</span>
            <span className="text-sm">{injuries || "Sem lesões ativas."}</span>
            <button type="button" className="btn-ghost text-accent self-start -ml-3" onClick={() => openOnboarding("clinical")}>
              Editar no histórico clínico <ChevronRight />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="FC máx">
              <input className="input" inputMode="decimal" value={c.hrMax ?? ""} placeholder={age ? String(Math.round(208 - 0.7 * age)) : ""} onChange={(e) => edit({ hrMax: num(e.target.value) })} />
            </Field>
            <div className="flex flex-col gap-1">
              <span className="label">FC repouso</span>
              <span className="text-sm py-2">{restHr != null ? `${fmtNum(restHr)} bpm (da antropometria)` : "Mede-se na antropometria."}</span>
            </div>
          </div>
          <PaceField value={c.thresholdPace ?? null} onChange={(thresholdPace) => edit({ thresholdPace })} />
        </FichaSheet>
      )}

      {section === "notes" && (
        <FichaSheet title="Notas" onClose={closeSection} onBlur={persist}>
          <textarea className="input py-2 min-h-[240px]" aria-label="Notas" value={c.notes} onChange={(e) => edit({ notes: e.target.value })} />
        </FichaSheet>
      )}

      {section === "data" && (
        <FichaSheet title="Consentimento e dados" onClose={closeSection} onBlur={persist}>
          <ul className="flex flex-col gap-1 text-sm">
            {CONSENTS.map(([k, label]) => (
              <li key={k} className={given[k] ? "" : "text-muted"}>
                {given[k] ? `✓ ${fmtDate(given[k]!)}` : "✗"} · {label}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{c.consents?.signature ? `Assinado em ${fmtDate(c.consents.signedAt ?? "")}.` : "Sem assinatura."}</p>
          <button type="button" className="btn self-start" onClick={() => openOnboarding("consent")}>
            Editar autorizações e assinatura
          </button>
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
                  if (!(await ask(`Apagar ${c.name}? As sessões ficam guardadas mas escondidas.`))) return;
                  gone.current = true;
                  await remove("clients", c.id);
                  back("clients");
                }}
              >
                Apagar cliente
              </button>
              <button
                type="button"
                className="btn text-danger"
                onClick={async () => {
                  const typed = (await askText(`Apagar definitivamente ${c.name}, com todas as sessões e avaliações? Não dá para desfazer. Escreve o nome para confirmar.`));
                  if (typed?.trim() !== c.name.trim()) return;
                  gone.current = true;
                  await purgeClient(c.id);
                  back("clients");
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

/** Keeps what is typed ("4:") until it is a whole pace. */
function PaceField({ value, onChange }: { value: number | null; onChange: (seconds: number | null) => void }) {
  const [text, setText] = useState(value == null ? "" : fmtPace(value));
  const bad = !!text.trim() && parsePace(text) == null;
  return (
    <Field label="Ritmo de limiar (min/km)">
      <input
        className="input"
        inputMode="numeric"
        value={text}
        placeholder="ex: 4:30"
        aria-invalid={bad}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parsePace(e.target.value));
        }}
      />
      <span className={`text-xs ${bad ? "text-warn" : "text-muted"}`}>{bad ? "Escreve minutos:segundos, como 4:30." : "Base das zonas de ritmo da corrida."}</span>
    </Field>
  );
}
