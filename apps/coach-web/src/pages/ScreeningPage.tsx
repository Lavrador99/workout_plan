import { PageLoading } from "../components/States";
import { ChevronRight, TriangleAlert, X } from "lucide-react";
import { ask } from "../components/Dialogs";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Chips, { ChipPick } from "../components/Chips";
import Field from "../components/Field";
import PageHeader, { NotFound } from "../components/PageHeader";
import { remove, save } from "../lib/db";
import { back, go, useClient, useScreening, useScreenings } from "../lib/hooks";
import {
  CONDITIONS,
  DISEASES,
  INJURY_REGIONS,
  INJURY_STATUS,
  INTENSITIES,
  MED_FLAGS,
  OCCUPATIONS,
  SYMPTOMS,
  cautions,
  clearanceNeeded,
  isMinor,
  nextScreening,
  outcome,
  OUTCOME_TEXT,
  reasons,
} from "../lib/screening";
import { fmtDate, num, todayISO, uid } from "@treino/core/text";
import type { Injury, Screening, Side } from "@treino/core/types";

const YES_NO = ["Sim", "Não"];
const yesNo = (v: boolean | null | undefined) => (v == null ? undefined : v ? "Sim" : "Não");
const fromYesNo = (v: string | undefined) => (v == null ? null : v === "Sim");

const SIDES: [Side | "both", string][] = [
  ["left", "Esquerdo"],
  ["right", "Direito"],
  ["both", "Ambos"],
];
const SCALE = ["1", "2", "3", "4", "5"];

/** Picks a key from [key, label] pairs by its label. */
const keyOf = <K,>(pairs: readonly (readonly [K, string, ...unknown[]])[], label: string | undefined): K | null => pairs.find((p) => p[1] === label)?.[0] ?? null;
const labelOf = <K,>(pairs: readonly (readonly [K, string, ...unknown[]])[], key: K | null | undefined) => pairs.find((p) => p[0] === key)?.[1];

/** Health screening and history, filled in with the client at the first meeting. */
export default function ScreeningPage({ id }: { id: string }) {
  const stored = useScreening(id);
  const clientId = stored?.clientId ?? "";
  const client = useClient(clientId);
  const all = useScreenings(clientId);
  const [s, setS] = useState<Screening | null>(null);
  const [condition, setCondition] = useState("");
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef<Screening | null>(null);

  useEffect(() => {
    if (stored && !pending.current) setS(stored);
  }, [stored]);

  const flush = async () => {
    clearTimeout(pending.current);
    pending.current = undefined;
    const next = latest.current;
    latest.current = null;
    if (next) await save("screenings", next);
  };
  useEffect(() => () => void flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (stored === null || (stored?.deleted && !s)) return <NotFound title="Triagem" back={["clients"]} />;
  if (!s) return <PageLoading title="Triagem" back={["clients"]} />;

  const update = (patch: Partial<Screening>) => {
    const next = { ...s, ...patch };
    setS(next);
    latest.current = next;
    clearTimeout(pending.current);
    pending.current = setTimeout(() => void flush(), 400);
  };
  const setInjury = (i: Injury) => update({ injuries: s.injuries.map((x) => (x.id === i.id ? i : x)) });

  const today = todayISO();
  const result = outcome(s);
  const needed = clearanceNeeded(s);
  const list = cautions(s);
  const minor = client ? isMinor(client, today) : false;
  const others = (all ?? []).filter((x) => x.id !== s.id);
  const conditions = [...CONDITIONS, ...s.conditions.filter((c) => !CONDITIONS.includes(c))];

  const startNew = async () => {
    await flush();
    const saved = await save("screenings", nextScreening(s, uid(), today));
    go("screening", saved.id);
  };

  return (
    <>
      <PageHeader
        title="Triagem e anamnese"
        subtitle={[client?.name, fmtDate(s.date)].filter(Boolean).join(" · ")}
        back={["client", s.clientId, "info"]}
        actions={
          <button type="button" className="btn shrink-0" onClick={() => void startNew()}>
            Nova
          </button>
        }
      />
      <div className="page">
        {client && !client.healthConsentAt && (
          <button type="button" className="text-xs text-warn text-left" onClick={() => go("client", s.clientId, "info")}>
            <TriangleAlert /> Sem consentimento para dados de saúde na ficha. Registar <ChevronRight />
          </button>
        )}
        {client && minor && !client.guardian?.consentAt && (
          <button type="button" className="text-xs text-warn text-left" onClick={() => go("client", s.clientId, "info")}>
            <TriangleAlert /> Menor sem consentimento do encarregado de educação. Registar <ChevronRight />
          </button>
        )}

        <div className={`card p-3 flex flex-col gap-2 ${needed && !s.clearance ? "border-warn" : ""}`}>
          <span className="label">Recomendação (ACSM)</span>
          {result == null ? (
            <p className="text-sm text-muted">Responde se pratica exercício regular para ver a recomendação.</p>
          ) : (
            <>
              <p className={`text-sm font-medium ${needed && !s.clearance ? "text-warn" : ""}`}>{OUTCOME_TEXT[result]}</p>
              <ul className="text-xs text-muted list-disc pl-4">
                {reasons(s).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          )}
          {needed &&
            (s.clearance ? (
              <div className="flex flex-col gap-2 border-t border-border pt-2">
                <span className="label">Autorização médica</span>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Data">
                    <input className="input" type="date" value={s.clearance.date} onChange={(e) => update({ clearance: { ...s.clearance!, date: e.target.value } })} />
                  </Field>
                  <Field label="Quem autorizou">
                    <input className="input" value={s.clearance.by} placeholder="Médico, especialidade" onChange={(e) => update({ clearance: { ...s.clearance!, by: e.target.value } })} />
                  </Field>
                </div>
                <Field label="Restrições">
                  <input className="input" value={s.clearance.restrictions} placeholder="ex: FC até 140, sem isometria máxima" onChange={(e) => update({ clearance: { ...s.clearance!, restrictions: e.target.value } })} />
                </Field>
                <button type="button" className="btn-ghost text-muted self-start -ml-3 text-sm" onClick={() => update({ clearance: null })}>
                  Tirar autorização
                </button>
              </div>
            ) : (
              <button type="button" className="btn self-start" onClick={() => update({ clearance: { date: today, by: "", restrictions: "" } })}>
                Registar autorização médica
              </button>
            ))}
          {list.length > 0 && (
            <ul className="flex flex-col gap-1 border-t border-border pt-2 text-sm">
              {list.map((c) => (
                <li key={c} className="text-warn">
                  <TriangleAlert /> {c}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Section title="Saúde">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Data">
              <input className="input" type="date" value={s.date} onChange={(e) => e.target.value && update({ date: e.target.value })} />
            </Field>
            {(minor || s.answeredBy === "guardian") && (
              <div className="flex flex-col gap-1">
                <span className="label">Respondido por</span>
                <ChipPick options={["Cliente", "Encarregado"]} value={s.answeredBy === "guardian" ? "Encarregado" : "Cliente"} onChange={(v) => update({ answeredBy: v === "Encarregado" ? "guardian" : "client" })} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Pratica exercício regular?</span>
            <ChipPick options={YES_NO} value={yesNo(s.regularExercise)} onChange={(v) => update({ regularExercise: fromYesNo(v) })} />
            <span className="text-xs text-muted">Pelo menos 30 min de intensidade moderada, 3 dias por semana, nos últimos 3 meses.</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Doença diagnosticada</span>
            <Chips options={DISEASES.map(([, l]) => l)} value={DISEASES.filter(([k]) => s.diseases.includes(k)).map(([, l]) => l)} onChange={(v) => update({ diseases: DISEASES.filter(([, l]) => v.includes(l)).map(([k]) => k) })} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Sinais ou sintomas</span>
            <Chips options={SYMPTOMS.map(([, l]) => l)} value={SYMPTOMS.filter(([k]) => s.symptoms.includes(k)).map(([, l]) => l)} onChange={(v) => update({ symptoms: SYMPTOMS.filter(([, l]) => v.includes(l)).map(([k]) => k) })} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Intensidade pretendida</span>
            <ChipPick options={INTENSITIES.map(([, l]) => l)} value={labelOf(INTENSITIES, s.wantedIntensity)} onChange={(v) => update({ wantedIntensity: keyOf(INTENSITIES, v) })} />
            {s.wantedIntensity && <span className="text-xs text-muted">{INTENSITIES.find(([k]) => k === s.wantedIntensity)?.[2]}</span>}
          </div>
        </Section>

        <Section title="Clínica e medicação">
          <div className="flex flex-col gap-1">
            <span className="label">Condições</span>
            <Chips options={conditions} value={s.conditions} onChange={(v) => update({ conditions: v })} />
            <div className="flex gap-2">
              <input className="input" value={condition} placeholder="Outra condição" onChange={(e) => setCondition(e.target.value)} />
              <button
                type="button"
                className="btn shrink-0"
                disabled={!condition.trim()}
                onClick={() => {
                  if (!s.conditions.includes(condition.trim())) update({ conditions: [...s.conditions, condition.trim()] });
                  setCondition("");
                }}
              >
                Adicionar
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="label">Medicação</span>
            {s.medications.map((m, i) => (
              <div key={i} className="flex flex-col gap-1 border-b border-border pb-2">
                <div className="flex gap-2">
                  <input className="input" value={m.name} placeholder="Nome e dose" aria-label="Medicamento" onChange={(e) => update({ medications: s.medications.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                  <button type="button" className="btn-ghost w-10 px-0 text-muted shrink-0" aria-label="Tirar medicamento" onClick={() => update({ medications: s.medications.filter((_, j) => j !== i) })}>
                    <X />
                  </button>
                </div>
                <Chips
                  options={MED_FLAGS.map(([, l]) => l)}
                  value={MED_FLAGS.filter(([k]) => m.flags.includes(k)).map(([, l]) => l)}
                  onChange={(v) => update({ medications: s.medications.map((x, j) => (j === i ? { ...x, flags: MED_FLAGS.filter(([, l]) => v.includes(l)).map(([k]) => k) } : x)) })}
                />
              </div>
            ))}
            <button type="button" className="btn self-start" onClick={() => update({ medications: [...s.medications, { name: "", flags: [] }] })}>
              + Medicamento
            </button>
          </div>
          <Field label="Cirurgias">
            <textarea className="input py-2 min-h-[60px]" value={s.surgeries} placeholder="O quê e quando" onChange={(e) => update({ surgeries: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Tensão sistólica">
              <input className="input" inputMode="numeric" value={s.restingBp?.sys ?? ""} placeholder="mmHg" onChange={(e) => update({ restingBp: { sys: num(e.target.value), dia: s.restingBp?.dia ?? null } })} />
            </Field>
            <Field label="Tensão diastólica">
              <input className="input" inputMode="numeric" value={s.restingBp?.dia ?? ""} placeholder="mmHg" onChange={(e) => update({ restingBp: { sys: s.restingBp?.sys ?? null, dia: num(e.target.value) } })} />
            </Field>
          </div>
        </Section>

        <Section title="Lesões e dor">
          {s.injuries.map((i) => (
            <div key={i.id} className="flex flex-col gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="font-medium flex-1">{i.region || "Lesão"}</span>
                <button type="button" className="btn-ghost w-10 px-0 text-muted" aria-label="Tirar lesão" onClick={() => update({ injuries: s.injuries.filter((x) => x.id !== i.id) })}>
                  <X />
                </button>
              </div>
              <ChipPick options={INJURY_REGIONS} value={i.region || undefined} onChange={(v) => setInjury({ ...i, region: v ?? "" })} />
              <ChipPick options={SIDES.map(([, l]) => l)} value={labelOf(SIDES, i.side)} onChange={(v) => setInjury({ ...i, side: keyOf(SIDES, v) })} />
              <ChipPick options={INJURY_STATUS.map(([, l]) => l)} value={labelOf(INJURY_STATUS, i.status)} onChange={(v) => setInjury({ ...i, status: keyOf(INJURY_STATUS, v) ?? "active" })} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Desde">
                  <input className="input" value={i.since} placeholder="ex: março 2026" onChange={(e) => setInjury({ ...i, since: e.target.value })} />
                </Field>
                <Field label="Dor agora (0–10)">
                  <input className="input" inputMode="numeric" value={i.pain ?? ""} onChange={(e) => setInjury({ ...i, pain: clamp(num(e.target.value), 0, 10) })} />
                </Field>
              </div>
              <Field label="O que agrava">
                <input className="input" value={i.aggravates} placeholder="Movimentos ou posições" onChange={(e) => setInjury({ ...i, aggravates: e.target.value })} />
              </Field>
              <Field label="Acompanhado por">
                <input className="input" value={i.followedBy} placeholder="Fisioterapeuta, médico, ninguém" onChange={(e) => setInjury({ ...i, followedBy: e.target.value })} />
              </Field>
            </div>
          ))}
          <button type="button" className="btn self-start" onClick={() => update({ injuries: [...s.injuries, { id: uid(), region: "", side: null, status: "active", since: "", pain: null, aggravates: "", followedBy: "" }] })}>
            + Lesão
          </button>
        </Section>

        <Section title="Estilo de vida">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Horas de sono">
              <input className="input" inputMode="decimal" value={s.sleepHours ?? ""} onChange={(e) => update({ sleepHours: num(e.target.value) })} />
            </Field>
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Qualidade do sono (1 má · 5 ótima)</span>
            <ChipPick options={SCALE} value={s.sleepQuality?.toString()} onChange={(v) => update({ sleepQuality: v ? Number(v) : null })} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Stress (1 baixo · 5 muito alto)</span>
            <ChipPick options={SCALE} value={s.stress?.toString()} onChange={(v) => update({ stress: v ? Number(v) : null })} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Profissão</span>
            <ChipPick options={OCCUPATIONS.map(([, l]) => l)} value={labelOf(OCCUPATIONS, s.occupation)} onChange={(v) => update({ occupation: keyOf(OCCUPATIONS, v) })} />
          </div>
          <Field label="Atividade atual">
            <textarea className="input py-2 min-h-[60px]" value={s.activity} placeholder="O que faz, quantas vezes, há quanto tempo" onChange={(e) => update({ activity: e.target.value })} />
          </Field>
          <Field label="Historial de treino e desporto">
            <textarea className="input py-2 min-h-[60px]" value={s.history} onChange={(e) => update({ history: e.target.value })} />
          </Field>
          <Field label="Motivação">
            <textarea className="input py-2 min-h-[60px]" value={s.motivation} placeholder="A razão real, nas palavras do cliente" onChange={(e) => update({ motivation: e.target.value })} />
          </Field>
        </Section>

        {client?.sex !== "male" && (
          <Section title="Gravidez e pós-parto">
            <div className="flex flex-col gap-1">
              <span className="label">Grávida?</span>
              <ChipPick options={YES_NO} value={yesNo(s.pregnancy ? true : null)} onChange={(v) => update({ pregnancy: v === "Sim" ? { weeks: null, obstetricianOk: false } : null })} />
            </div>
            {s.pregnancy && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Semanas">
                  <input className="input" inputMode="numeric" value={s.pregnancy.weeks ?? ""} onChange={(e) => update({ pregnancy: { ...s.pregnancy!, weeks: num(e.target.value) } })} />
                </Field>
                <div className="flex flex-col gap-1">
                  <span className="label">Acordo do obstetra</span>
                  <ChipPick options={YES_NO} value={yesNo(s.pregnancy.obstetricianOk)} onChange={(v) => update({ pregnancy: { ...s.pregnancy!, obstetricianOk: v === "Sim" } })} />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="label">Pós-parto (último ano)?</span>
              <ChipPick options={YES_NO} value={yesNo(s.postpartum ? true : null)} onChange={(v) => update({ postpartum: v === "Sim" ? { weeks: null, delivery: null, pelvicSymptoms: false } : null })} />
            </div>
            {s.postpartum && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Semanas desde o parto">
                    <input className="input" inputMode="numeric" value={s.postpartum.weeks ?? ""} onChange={(e) => update({ postpartum: { ...s.postpartum!, weeks: num(e.target.value) } })} />
                  </Field>
                  <div className="flex flex-col gap-1">
                    <span className="label">Parto</span>
                    <ChipPick
                      options={["Vaginal", "Cesariana"]}
                      value={s.postpartum.delivery === "vaginal" ? "Vaginal" : s.postpartum.delivery === "cesarean" ? "Cesariana" : undefined}
                      onChange={(v) => update({ postpartum: { ...s.postpartum!, delivery: v === "Vaginal" ? "vaginal" : v === "Cesariana" ? "cesarean" : null } })}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="label">Perdas de urina, sensação de peso ou dor pélvica?</span>
                  <ChipPick options={YES_NO} value={yesNo(s.postpartum.pelvicSymptoms)} onChange={(v) => update({ postpartum: { ...s.postpartum!, pelvicSymptoms: v === "Sim" } })} />
                </div>
              </>
            )}
          </Section>
        )}

        <Section title="Notas">
          <textarea className="input py-2 min-h-[80px]" aria-label="Notas" value={s.notes} onChange={(e) => update({ notes: e.target.value })} />
        </Section>

        {others.length > 0 && (
          <Section title="Outras triagens">
            <ul className="flex flex-col divide-y divide-border">
              {others.map((o) => (
                <li key={o.id}>
                  <button type="button" className="row" onClick={() => go("screening", o.id)}>
                    <span className="flex-1">{fmtDate(o.date)}</span>
                    <ChevronRight />
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <button
          type="button"
          className="btn text-danger self-start"
          onClick={async () => {
            if (!(await ask("Apagar esta triagem?"))) return;
            latest.current = null;
            clearTimeout(pending.current);
            await remove("screenings", s.id);
            back("client", s.clientId, "info");
          }}
        >
          Apagar triagem
        </button>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-3 flex flex-col gap-3">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const clamp = (v: number | null, min: number, max: number) => (v == null ? null : Math.min(max, Math.max(min, v)));
