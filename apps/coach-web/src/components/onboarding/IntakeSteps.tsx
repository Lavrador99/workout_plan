import { TriangleAlert, X } from "lucide-react";
import ConditionsFields from "../ConditionsFields";
import SignaturePad from "../SignaturePad";
import { Checks, Info, Multi, Num, Pick, Section, Text, YesNo } from "./fields";
import { finalValue, newResult } from "../../lib/assessment";
import { emptyConsents } from "../../lib/db";
import { MODULES, MODULE_NAMES, activeModules, reassessWeeks, strengthBalanceReasons, suggestedModules } from "../../lib/modules";
import { addWeeks } from "../../lib/report";
import { changeSchedule, currentDays, WEEKDAYS } from "../../lib/balance";
import {
  BARRIERS,
  CONSENTS,
  DECISIONS,
  DISEASES,
  EXPERIENCE,
  INJURY_REGIONS,
  INJURY_STATUS,
  MED_FLAGS,
  QUICK,
  REFERRAL_CRITERIA,
  REFERRALS,
  STAGES,
  SUMMARY_CHECKLIST,
  WOMEN_ONLY_QUICK,
  ageOf,
  bpStops,
  healthAlerts,
  isMinor,
  labelOf,
  suggestedDecision,
} from "../../lib/screening";
import { fmtDate, fmtNum, uid } from "@treino/core/text";
import type { Assessment, Client, ConsentKey, Injury, Screening, Side, TestDef, Vitals } from "@treino/core/types";

// Only the modules that already have their steps.
const READY_MODULES = MODULE_NAMES.filter(([id]) => MODULES[id]);

export interface IntakeCtx {
  client: Client;
  setClient: (patch: Partial<Client>) => void;
  s: Screening;
  setS: (patch: Partial<Screening>) => void;
  /** The general assessment of the intake: conditions, vitals and anthropometry. */
  intake: Assessment | null;
  setIntake: (patch: Partial<Assessment> | ((cur: Assessment) => Partial<Assessment>)) => void;
  tests: TestDef[];
  today: string;
}

const SEXES = [
  ["female", "Feminino"],
  ["male", "Masculino"],
] as const;
const FORMATS = [
  ["in_person", "Presencial"],
  ["online", "Online"],
] as const;
const SIDES_PICK: [Side | "both", string][] = [
  ["left", "Esquerdo"],
  ["right", "Direito"],
  ["both", "Ambos"],
];
const PARQ = [
  ["all_no", "Todas as respostas Não"],
  ["followup_done", "Alguma Sim → páginas de seguimento preenchidas"],
] as const;


/** The resting values taken in the anthropometry step. */
export const restOf = (a: Assessment | null | undefined): Vitals | null => a?.vitals?.find((v) => v.moment === "rest") ?? null;

/** A single number for a test of the intake: one trial, no sides. */
function useSimple(ctx: IntakeCtx) {
  const value = (testId: string) => {
    const r = ctx.intake?.results.find((x) => x.testId === testId);
    return r ? finalValue(r) : null;
  };
  const set = (testId: string, v: number | null) => {
    const t = ctx.tests.find((x) => x.id === testId);
    if (!t) return;
    ctx.setIntake((a) => {
      const cur = a.results.find((x) => x.testId === testId);
      const r = cur ?? newResult(t);
      const next = { ...r, trials: [{ value: v }] };
      return { results: cur ? a.results.map((x) => (x.testId === testId ? next : x)) : [...a.results, next] };
    });
  };
  return { value, set };
}

export function Identification({ client: c, setClient, today }: IntakeCtx) {
  const age = ageOf(c, today);
  const minor = isMinor(c, today);
  const guardian = c.guardian ?? { name: "", relation: "", phone: "", email: "" };
  const emergency = c.emergency ?? { name: "", relation: "", phone: "" };
  return (
    <>
      <Section>
        <Info>
          Cliente n.º <b>{c.clientNumber ?? "—"}</b> · {age == null ? "a idade vem da data de nascimento" : <><b>{age} anos</b>{minor ? " · menor: aparecem os dados do encarregado de educação" : ""}</>}
        </Info>
        <Text label="Nome completo" value={c.name} onChange={(name) => setClient({ name })} />
        <div className="grid grid-cols-2 gap-2">
          <Text label="Data de nascimento" type="date" value={c.birthDate} onChange={(v) => setClient({ birthDate: v || null, birthYear: v ? Number(v.slice(0, 4)) : c.birthYear })} />
          <Pick label="Sexo" options={SEXES} value={c.sex} onChange={(sex) => setClient({ sex })} />
        </div>
        <Pick label="Formato" options={FORMATS} value={c.format} onChange={(format) => setClient({ format })} />
        <div className="grid grid-cols-2 gap-2">
          <Text label="Telemóvel" type="tel" value={c.phone} onChange={(phone) => setClient({ phone })} />
          <Text label="Email" type="email" value={c.email} onChange={(email) => setClient({ email })} />
        </div>
        <Text label="Morada / localidade" value={c.address} onChange={(address) => setClient({ address })} />
        <Text label="Profissão" value={c.profession} onChange={(profession) => setClient({ profession })} />
        <Text label="Rotina de trabalho: horas por dia sentado, de pé e em esforço físico" area value={c.workRoutine} onChange={(workRoutine) => setClient({ workRoutine })} />
        <Pick label="Como chegou até mim" options={REFERRALS} value={c.referral} onChange={(referral) => setClient({ referral })} />
        {c.referral === "referral" && <Text label="Indicação de quem" value={c.referralNote} onChange={(referralNote) => setClient({ referralNote })} />}
      </Section>
      <Section title="Contacto de emergência">
        <Text label="Nome completo" value={emergency.name} onChange={(name) => setClient({ emergency: { ...emergency, name } })} />
        <div className="grid grid-cols-2 gap-2">
          <Text label="Relação" value={emergency.relation} onChange={(relation) => setClient({ emergency: { ...emergency, relation } })} />
          <Text label="Telemóvel" type="tel" value={emergency.phone} onChange={(phone) => setClient({ emergency: { ...emergency, phone } })} />
        </div>
      </Section>
      {minor && (
        <Section title="Encarregado de educação">
          <Text label="Nome completo" value={guardian.name} onChange={(name) => setClient({ guardian: { ...guardian, name } })} />
          <div className="grid grid-cols-2 gap-2">
            <Text label="Relação" value={guardian.relation} onChange={(relation) => setClient({ guardian: { ...guardian, relation } })} />
            <Text label="Telemóvel" type="tel" value={guardian.phone} onChange={(phone) => setClient({ guardian: { ...guardian, phone } })} />
          </div>
          <Text label="Email" type="email" value={guardian.email} onChange={(email) => setClient({ guardian: { ...guardian, email } })} />
        </Section>
      )}
    </>
  );
}

export function Consent({ client: c, setClient, today }: IntakeCtx) {
  const consents = c.consents ?? emptyConsents();
  const minor = isMinor(c, today);
  const set = (patch: Partial<typeof consents>) => setClient({ consents: { ...consents, ...patch } });
  const toggle = (k: ConsentKey) => {
    const given = { ...consents.given };
    if (given[k]) delete given[k];
    else given[k] = today;
    set({ given });
  };
  return (
    <Section>
      <Info>Sem estas autorizações não se faz nenhum teste. Texto a rever com um jurista antes de usar.</Info>
      {CONSENTS.map(([k, label]) => (
        <label key={k} className="flex gap-2 items-start text-sm py-1">
          <input type="checkbox" className="mt-1" checked={!!consents.given[k]} onChange={() => toggle(k)} />
          <span>
            {label}
            {consents.given[k] && <span className="text-muted"> · {fmtDate(consents.given[k]!)}</span>}
          </span>
        </label>
      ))}
      {consents.given.share_professionals && <Text label="Profissionais com quem posso partilhar informação (nome, área, contacto)" area value={consents.professionals} onChange={(professionals) => set({ professionals })} />}
      <SignaturePad label="Assinatura do cliente" value={consents.signature} onChange={(signature) => set({ signature, signedAt: signature ? today : consents.guardianSignature ? consents.signedAt : null })} />
      {minor && <SignaturePad label="Assinatura do encarregado de educação" value={consents.guardianSignature} onChange={(guardianSignature) => set({ guardianSignature, signedAt: guardianSignature ? today : consents.signedAt })} />}
    </Section>
  );
}

export function Triage({ client: c, s, setS, intake }: IntakeCtx) {
  const rest = restOf(intake);
  const stops = bpStops(rest?.sys, rest?.dia);
  const suggested = suggestedDecision(s, stops);
  const anyYes = s.quick.some((q) => q === true);
  return (
    <>
      <Section title="Triagem rápida">
        <Info>O cliente preenche também o PAR-Q+ oficial (versão portuguesa, gratuita em eparmedx.com), que fica anexo.</Info>
        {QUICK.map((q, i) =>
          i === WOMEN_ONLY_QUICK && c.sex === "male" ? null : (
            <YesNo key={q} label={`${i + 1}. ${q}`} value={s.quick[i]} onChange={(v) => setS({ quick: QUICK.map((_, j) => (j === i ? v : (s.quick[j] ?? null))) })} />
          ),
        )}
        {anyYes && <Text label="Detalhes das respostas Sim (n.º da pergunta e explicação)" area value={s.quickDetails} onChange={(quickDetails) => setS({ quickDetails })} />}
        <Pick label="PAR-Q+ oficial" options={PARQ} value={s.parq} onChange={(parq) => setS({ parq })} />
      </Section>
      <Section title="Critérios de encaminhamento">
        <Multi options={REFERRAL_CRITERIA} value={s.referralCriteria} onChange={(referralCriteria) => setS({ referralCriteria })} />
      </Section>
      <Section title="Decisão">
        <Info tone={suggested === "referred" ? "warn" : undefined}>
          Sugestão: <b>{labelOf(DECISIONS, suggested)}</b>
          {stops ? " · tensão em repouso ≥ 160/100 (passo da antropometria)" : ""}
        </Info>
        <Pick options={DECISIONS} value={s.decision} onChange={(decision) => setS({ decision })} />
        {s.decision === "fit_restricted" && <Text label="Restrições a respeitar" area value={s.restrictions} onChange={(restrictions) => setS({ restrictions })} />}
        {s.decision === "awaiting" && <Text label="Autorização pedida a (profissional e data do pedido)" value={s.clearanceRequested} onChange={(clearanceRequested) => setS({ clearanceRequested })} />}
        {s.decision === "referred" && <Text label="Encaminhado para (profissional, motivo, data)" value={s.referredTo} onChange={(referredTo) => setS({ referredTo })} />}
      </Section>
    </>
  );
}

export function Conditions({ client: c, intake, setIntake }: IntakeCtx) {
  return (
    <Section>
      <Info>Registar sempre: só assim a reavaliação é comparável com esta.</Info>
      <ConditionsFields value={intake?.conditionsData} sex={c.sex} onChange={(conditionsData) => setIntake({ conditionsData })} />
    </Section>
  );
}

export function Anthropometry(ctx: IntakeCtx) {
  const { client: c, intake, setIntake, setClient, today } = ctx;
  const simple = useSimple(ctx);
  const rest = restOf(intake) ?? { moment: "rest" as const, sys: null, dia: null, hr: null, feeling: null };
  const setRest = (patch: Partial<Vitals>) => {
    setIntake((a) => ({ vitals: [...(a.vitals ?? []).filter((v) => v.moment !== "rest"), { ...rest, ...patch }] }));
    // the client's resting heart rate (running zones) is the one measured here
    if ("hr" in patch) setClient({ hrRest: patch.hr ?? null });
  };
  const height = simple.value("seed-test-altura");
  const weight = simple.value("seed-test-peso");
  const waist = simple.value("seed-test-cintura");
  const bmi = height && weight ? weight / (height / 100) ** 2 : null;
  const ratio = height && waist ? waist / height : null;
  return (
    <>
      <Section title="Sinais vitais">
        <div className="grid grid-cols-3 gap-2">
          <Num label="FC repouso" value={rest.hr} onChange={(hr) => setRest({ hr })} />
          <Num label="TA sistólica" value={rest.sys} onChange={(sys) => setRest({ sys })} />
          <Num label="TA diastólica" value={rest.dia} onChange={(dia) => setRest({ dia })} />
        </div>
        {(rest.sys != null || rest.dia != null) &&
          (bpStops(rest.sys, rest.dia) ? (
            <Info tone="warn"><TriangleAlert /> ≥ 160/100: avaliação suspensa. A decisão da triagem passa a sugerir Encaminhado.</Info>
          ) : (
            <Info>{(rest.sys ?? 0) < 130 && (rest.dia ?? 0) < 85 ? "Tensão normal (< 130/85)." : "Tensão acima de 130/85: registar e vigiar."}</Info>
          ))}
      </Section>
      <Section title="Medidas corporais">
        <div className="grid grid-cols-2 gap-2">
          <Num
            label="Altura (cm)"
            value={height}
            onChange={(v) => {
              simple.set("seed-test-altura", v);
              setClient({ heightCm: v });
            }}
          />
          <Num label="Peso (kg)" value={weight} onChange={(v) => simple.set("seed-test-peso", v)} />
          {isMinor(c, today) && <Num label="Altura sentado (cm)" value={simple.value("seed-test-altura-sentado")} onChange={(v) => simple.set("seed-test-altura-sentado", v)} />}
          <Num label="Cintura (cm)" value={waist} onChange={(v) => simple.set("seed-test-cintura", v)} />
          <Num label="Anca (cm)" value={simple.value("seed-test-anca")} onChange={(v) => simple.set("seed-test-anca", v)} />
          <Num label="Massa gorda (%)" value={simple.value("seed-test-massa-gorda")} onChange={(v) => simple.set("seed-test-massa-gorda", v)} />
        </div>
        {bmi != null && <Info>IMC <b>{fmtNum(Math.round(bmi * 10) / 10)}</b> kg/m² · ler com a cintura e a % de gordura</Info>}
        {ratio != null && (
          <Info tone={ratio >= 0.5 ? "warn" : undefined}>
            Relação cintura-altura <b>{fmtNum(Math.round(ratio * 100) / 100)}</b> {ratio < 0.5 ? "(abaixo de 0,5)" : "(0,5 ou mais)"}
          </Info>
        )}
      </Section>
    </>
  );
}

function InjuryEditor({ injury: i, onChange, onRemove }: { injury: Injury; onChange: (i: Injury) => void; onRemove: () => void }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border pb-3">
      <div className="flex items-center gap-2">
        <span className="font-medium flex-1">{i.region || "Lesão"}</span>
        <button type="button" className="btn-ghost w-10 px-0 text-muted" aria-label="Tirar lesão" onClick={onRemove}>
          <X />
        </button>
      </div>
      <Pick options={INJURY_REGIONS.map((r) => [r, r] as const)} value={i.region || null} onChange={(region) => onChange({ ...i, region: region ?? "" })} />
      <Pick options={SIDES_PICK} value={i.side} onChange={(side) => onChange({ ...i, side })} />
      <Pick options={INJURY_STATUS} value={i.status} onChange={(status) => onChange({ ...i, status: status ?? "active" })} />
      <div className="grid grid-cols-2 gap-2">
        <Text label="Quando e como aconteceu" value={i.since} onChange={(since) => onChange({ ...i, since })} />
        <Num label="Dor agora (0–10)" value={i.pain} onChange={(pain) => onChange({ ...i, pain: pain == null ? null : Math.min(10, Math.max(0, pain)) })} />
      </div>
      <Text label="O que agrava / ainda limita" value={i.aggravates} onChange={(aggravates) => onChange({ ...i, aggravates })} />
      <Text label="Tratamento e quem acompanha" value={i.followedBy} onChange={(followedBy) => onChange({ ...i, followedBy })} />
    </div>
  );
}

export function Clinical({ s, setS }: IntakeCtx) {
  return (
    <>
      <Section title="Doenças diagnosticadas">
        <Multi options={DISEASES} value={s.diseases} onChange={(diseases) => setS({ diseases })} />
        {s.diseases.length > 0 && (
          <>
            <Text label="Detalhes (tipo, desde quando, se está controlada)" area value={s.diseaseDetails} onChange={(diseaseDetails) => setS({ diseaseDetails })} />
            <YesNo label="Alguma limita o dia a dia?" value={s.diseaseLimits} onChange={(diseaseLimits) => setS({ diseaseLimits })} />
          </>
        )}
      </Section>
      <Section title="Medicação">
        <Text label="Medicamento, para quê, dose e horário" area value={s.medication} onChange={(medication) => setS({ medication })} />
        <Num label="N.º de medicamentos diários" value={s.medicationCount} onChange={(medicationCount) => setS({ medicationCount })} />
        <Multi label="Mexe com o esforço" options={MED_FLAGS} value={s.medicationFlags} onChange={(medicationFlags) => setS({ medicationFlags })} />
        <Text label="Cirurgias (data e se tem alta para exercício)" area value={s.surgeries} onChange={(surgeries) => setS({ surgeries })} />
      </Section>
      <Section title="Lesões (atuais e passadas)">
        {s.injuries.map((i) => (
          <InjuryEditor key={i.id} injury={i} onChange={(n) => setS({ injuries: s.injuries.map((x) => (x.id === n.id ? n : x)) })} onRemove={() => setS({ injuries: s.injuries.filter((x) => x.id !== i.id) })} />
        ))}
        <button type="button" className="btn self-start" onClick={() => setS({ injuries: [...s.injuries, { id: uid(), region: "", side: null, status: "active", since: "", pain: null, aggravates: "", followedBy: "" }] })}>
          + Lesão
        </button>
      </Section>
      <Section title="Dor atual">
        <div className="grid grid-cols-2 gap-2">
          <Text label="Zona" value={s.painZone} onChange={(painZone) => setS({ painZone })} />
          <Num label="Intensidade (0–10)" value={s.painIntensity} onChange={(painIntensity) => setS({ painIntensity })} />
        </div>
        <Text label="Há quanto tempo" value={s.painSince} onChange={(painSince) => setS({ painSince })} />
        <Text label="Em que movimentos ou posições dói, e o que alivia" area value={s.painTriggers} onChange={(painTriggers) => setS({ painTriggers })} />
      </Section>
      <Section title="História familiar e acompanhamento">
        <YesNo label="Morte súbita ou doença cardíaca em familiar direto antes dos 55 (homens) ou 65 anos (mulheres)?" value={s.familyHistory} onChange={(familyHistory) => setS({ familyHistory })} />
        <Text label="Profissionais de saúde que o acompanham" value={s.healthProfessionals} onChange={(healthProfessionals) => setS({ healthProfessionals })} />
      </Section>
    </>
  );
}

const SCALE_10 = Array.from({ length: 10 }, (_, i) => [i + 1, String(i + 1)] as const);

export function Lifestyle({ s, setS }: IntakeCtx) {
  return (
    <>
      <Section title="Historial de treino">
        <Text label="Pratica exercício atualmente? Qual, quantas vezes por semana, há quanto tempo" area value={s.exerciseNow} onChange={(exerciseNow) => setS({ exerciseNow })} />
        <Text label="Modalidades praticadas no passado (anos, nível)" area value={s.pastSports} onChange={(pastSports) => setS({ pastSports })} />
        <Text label="Melhor fase física (quando e o que fazia)" value={s.bestPhase} onChange={(bestPhase) => setS({ bestPhase })} />
        <Pick label="Experiência com treino de força" options={EXPERIENCE} value={s.strengthExperience} onChange={(strengthExperience) => setS({ strengthExperience })} />
        <Text label="Provas ou competições e resultados" value={s.competitions} onChange={(competitions) => setS({ competitions })} />
        <Text label="Já treinou com PT? O que gostou e o que não gostou" area value={s.ptBefore} onChange={(ptBefore) => setS({ ptBefore })} />
        <Text label="Lesões ligadas ao treino" value={s.trainingInjuries} onChange={(trainingInjuries) => setS({ trainingInjuries })} />
      </Section>
      <Section title="Estilo de vida">
        <div className="grid grid-cols-2 gap-2">
          <Num label="Sono (horas por noite)" value={s.sleepHours} onChange={(sleepHours) => setS({ sleepHours })} />
          <Num label="Passos por dia" value={s.steps} onChange={(steps) => setS({ steps })} />
        </div>
        <Pick label="Qualidade do sono (1–10)" options={SCALE_10} value={s.sleepQuality} onChange={(sleepQuality) => setS({ sleepQuality })} />
        <Pick label="Stress (1–10)" options={SCALE_10} value={s.stress} onChange={(stress) => setS({ stress })} />
        <Text label="Principal fonte de stress" value={s.stressSource} onChange={(stressSource) => setS({ stressSource })} />
        <Text label="Alimentação: refeições por dia, pequeno-almoço, padrão geral" area value={s.food} onChange={(food) => setS({ food })} />
        <div className="grid grid-cols-2 gap-2">
          <Text label="Água por dia" value={s.water} onChange={(water) => setS({ water })} />
          <Text label="Álcool por semana" value={s.alcohol} onChange={(alcohol) => setS({ alcohol })} />
          <Text label="Tabaco" value={s.tobacco} onChange={(tobacco) => setS({ tobacco })} />
          <Text label="Suplementos" value={s.supplements} onChange={(supplements) => setS({ supplements })} />
        </div>
      </Section>
    </>
  );
}

export function Goals({ client: c, setClient, s, setS, today }: IntakeCtx) {
  return (
    <>
      <Section title="Objetivos">
        <Text label="O que quer conseguir (nas palavras do cliente)" area value={s.mainGoal} onChange={(mainGoal) => setS({ mainGoal })} />
        <Text label="Porquê? (perguntar até 3 vezes e anotar cada resposta)" area value={s.why} onChange={(why) => setS({ why })} />
        <Text label="Objetivos secundários" value={s.secondaryGoals} onChange={(secondaryGoals) => setS({ secondaryGoals })} />
        <div className="grid grid-cols-2 gap-2">
          <Text label="Prazo" value={s.deadline} onChange={(deadline) => setS({ deadline })} />
          <Text label="Prova-alvo e data" value={s.targetEvent} onChange={(targetEvent) => setS({ targetEvent })} />
        </div>
        <Text label="Como vai saber que teve sucesso?" value={s.success} onChange={(success) => setS({ success })} />
      </Section>
      <Section title="Logística">
        <Text label="Dias e horas disponíveis" value={s.availability} onChange={(availability) => setS({ availability })} />
        <Num label="Treinos por semana" value={c.weeklyFrequency} onChange={(weeklyFrequency) => setClient({ weeklyFrequency })} />
        <Multi
          label="Dias planeados"
          options={WEEKDAYS.map((d, i) => [String(i), d] as const)}
          value={currentDays(c, today).map(String)}
          onChange={(v) => setClient(changeSchedule(c, v.map(Number).sort(), today))}
        />
        <Text label="Local de treino (ginásio, casa, ar livre)" value={s.place} onChange={(place) => setS({ place })} />
        <Text label="Material disponível em casa" value={s.homeEquipment} onChange={(homeEquipment) => setS({ homeEquipment })} />
        <Text label="Orçamento mensal" value={s.budget} onChange={(budget) => setS({ budget })} />
        <Text label="Exercícios ou atividades de que gosta" value={s.likes} onChange={(likes) => setS({ likes })} />
        <Text label="Exercícios ou atividades que detesta" value={s.dislikes} onChange={(dislikes) => setS({ dislikes })} />
      </Section>
    </>
  );
}

const CONFIDENCE = Array.from({ length: 11 }, (_, i) => [i, String(i)] as const);

export function Behaviour({ client: c, s, setS }: IntakeCtx) {
  return (
    <>
      <Section title="Fase de mudança">
        <Pick options={STAGES} value={s.stage} onChange={(stage) => setS({ stage })} />
      </Section>
      <Section title="Confiança e motivação">
        <Pick label={`Quão confiante está em treinar ${c.weeklyFrequency ?? "___"} vezes por semana durante 3 meses? (0–10)`} options={CONFIDENCE} value={s.confidence} onChange={(confidence) => setS({ confidence })} />
        {s.confidence != null && s.confidence < 7 && <Info tone="warn">Abaixo de 7: baixar a meta até a confiança chegar a 7.</Info>}
        <Text label="O que o trouxe aqui agora?" value={s.reason} onChange={(reason) => setS({ reason })} />
        <Text label="Motivação principal: interna ou externa (nas palavras do cliente)" area value={s.motivation} onChange={(motivation) => setS({ motivation })} />
      </Section>
      <Section title="Barreiras e apoio">
        <Multi options={BARRIERS} value={s.barriers} onChange={(barriers) => setS({ barriers })} />
        {s.barriers.length > 0 && <Text label="Detalhe das barreiras" area value={s.barrierDetails} onChange={(barrierDetails) => setS({ barrierDetails })} />}
        <Text label="O que o fez desistir no passado?" value={s.pastDropout} onChange={(pastDropout) => setS({ pastDropout })} />
        <Text label="Quem o apoia? Alguém pode treinar consigo?" value={s.support} onChange={(support) => setS({ support })} />
        <Text label="Como prefere ser acompanhado (mensagens, frequência, tom)" value={s.followUp} onChange={(followUp) => setS({ followUp })} />
      </Section>
    </>
  );
}

export function Modules({ client: c, setClient, s, setS, today }: IntakeCtx) {
  const reasons = strengthBalanceReasons(c, s, today);
  const active = activeModules(c, s, today).filter((m) => MODULES[m]);
  const suggested = suggestedModules(c, s, today).filter((m) => MODULES[m]);
  return (
    <Section>
      <YesNo label="Caiu no último ano ou tem medo de cair?" value={s.fallOrFear} onChange={(fallOrFear) => setS({ fallOrFear })} />
      <YesNo label="Levanta-se de uma cadeira sem usar as mãos?" value={s.risesWithoutHands} onChange={(risesWithoutHands) => setS({ risesWithoutHands })} />
      <YesNo label="Longo período de inatividade ou internamento recente?" value={s.longInactivity} onChange={(longInactivity) => setS({ longInactivity })} />
      <Info>{reasons.length ? <>Força e Equilíbrio sugerido por: <b>{reasons.join(", ")}</b>.</> : "Nenhum critério de Força e Equilíbrio até agora."}</Info>
      <Multi label="Módulos a ativar" options={READY_MODULES} value={active} onChange={(moduleIds) => setClient({ moduleIds })} />
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="flex-1">{c.moduleIds ? "Seleção tua." : "Pré-seleção automática pelo que já sabes do cliente."}</span>
        {c.moduleIds && JSON.stringify(c.moduleIds.filter((m) => MODULES[m])) !== JSON.stringify(suggested) && (
          <button type="button" className="text-accent" onClick={() => setClient({ moduleIds: undefined })}>
            Voltar à sugestão
          </button>
        )}
      </div>
    </Section>
  );
}

export function Summary({ client: c, s, setS, intake, today }: IntakeCtx) {
  const alerts = healthAlerts(s, restOf(intake));
  const modules = activeModules(c, s, today);
  const weeks = Math.max(reassessWeeks(null), ...modules.map(reassessWeeks));
  return (
    <>
      <Section title="Alertas de saúde e restrições">
        {alerts.length ? (
          <ul className="flex flex-col gap-1 text-sm">
            {alerts.map((a) => (
              <li key={a} className="text-warn">
                <TriangleAlert /> {a}
              </li>
            ))}
          </ul>
        ) : (
          <Info>Sem alertas.</Info>
        )}
        <Info>Decisão: <b>{labelOf(DECISIONS, s.decision) ?? "por tomar"}</b> · módulos: {modules.map((m) => labelOf(MODULE_NAMES, m)).join(", ") || "nenhum"}</Info>
      </Section>
      <Section title="Resumo do técnico">
        <Text label="Encaminhamentos feitos" value={s.referralsMade} onChange={(referralsMade) => setS({ referralsMade })} />
        <Text label="Primeiras impressões (postura, movimento, atitude)" area value={s.impressions} onChange={(impressions) => setS({ impressions })} />
        <Text label="Pacote e preço acordados" value={s.package} onChange={(pkg) => setS({ package: pkg })} />
        <Text label="Próxima sessão de avaliação" type="date" value={s.nextSession} onChange={(v) => setS({ nextSession: v || null })} />
        <Info>Reavaliação prevista: <b>{fmtDate(addWeeks(today, weeks))}</b> ({weeks} semanas)</Info>
        <Checks label="Próximos passos" options={SUMMARY_CHECKLIST} value={s.checklist} onChange={(checklist) => setS({ checklist })} />
      </Section>
    </>
  );
}

