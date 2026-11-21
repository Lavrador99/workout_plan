import { ChevronRight, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import LightBadge, { LIGHT_TEXT } from "../LightBadge";
import ResultCard from "../ResultCard";
import { Checks, Grid, Info, Multi, Num, Pick, Section, Text, YesNo } from "./fields";
import { bodyMassAt, newResult, previousResult } from "../../lib/assessment";
import { evaluate, questionnaireTotal, suggestedPriorities, type Evaluation, type ModuleDef, type Questionnaire } from "../../lib/modules";
import { AEROBIC_TESTS, GAIT_SIGNS, SAFETY_CHECKLIST, STOP_CRITERIA, curlLoad, fallsItem } from "../../lib/modules/strengthBalance";
import { go } from "../../lib/hooks";
import type { Assessment, Client, Focus, Light, ModuleValue, Screening, TestDef, Vitals, VitalsMoment } from "@treino/core/types";

export interface ModuleCtx {
  mod: ModuleDef;
  client: Client;
  s: Screening;
  /** The module's assessment; null until something is recorded. */
  a: Assessment | null;
  setA: (patch: Partial<Assessment> | ((cur: Assessment) => Partial<Assessment>)) => void;
  tests: TestDef[];
  assessments: Assessment[];
  focuses: Focus[];
}

const data = (a: Assessment | null, key: string) => a?.moduleData?.[key] ?? null;
const str = (v: ModuleValue) => (typeof v === "string" ? v : "");
const numOf = (v: ModuleValue) => (typeof v === "number" ? v : null);
const boolOf = (v: ModuleValue) => (typeof v === "boolean" ? v : null);
const listOf = (v: ModuleValue) => (Array.isArray(v) ? v : []);

function useData(ctx: ModuleCtx) {
  const set = (key: string, value: ModuleValue) => ctx.setA((a) => ({ moduleData: { ...a.moduleData, [key]: value } }));
  const text = (key: string, label: string, area?: boolean) => <Text key={key} label={label} area={area} value={str(data(ctx.a, key))} onChange={(v) => set(key, v)} />;
  return { set, text };
}

function setAnswers(ctx: ModuleCtx, id: string, answers: (number | null)[]) {
  ctx.setA((a) => ({ questionnaires: { ...a.questionnaires, [id]: answers } }));
}

function QuestionnaireBlock({ ctx, q, locked }: { ctx: ModuleCtx; q: Questionnaire; locked?: Set<number> }) {
  const answers = ctx.a?.questionnaires?.[q.id];
  const total = questionnaireTotal(answers);
  const light = q.light && answers ? q.light(answers) : null;
  return (
    <Section title={q.title}>
      <Grid items={q.items} options={q.options} value={answers} locked={locked} onChange={(v) => setAnswers(ctx, q.id, v)} />
      {(total != null || light) && (
        <div className="flex items-center gap-2 text-sm">
          {total != null && <span className="flex-1">Total <b>{total}</b></span>}
          {q.area && <LightBadge light={light} />}
          {q.alert && total != null && total >= q.alert.atLeast && <span className="text-warn text-xs">{q.alert.text} (só técnico)</span>}
          {q.risk && total != null && total <= q.risk.atMost && <span className="text-warn text-xs">zona de risco: {q.risk.text} (aproximado)</span>}
        </div>
      )}
    </Section>
  );
}

/** The step's tests, recorded with the same cards as any assessment, each with its colour. */
function TestsBlock({ ctx, testIds, evaluation }: { ctx: ModuleCtx; testIds: string[]; evaluation: Evaluation | null }) {
  const [open, setOpen] = useState<string | null>(null);
  const key = testIds.join(",");

  useEffect(() => {
    const have = new Set(ctx.a?.results.map((r) => r.testId));
    const missing = testIds.map((id) => ctx.tests.find((t) => t.id === id)).filter((t): t is TestDef => !!t && !have.has(t.id));
    if (!missing.length) return;
    ctx.setA((a) => ({
      results: [...a.results, ...missing.filter((t) => !a.results.some((r) => r.testId === t.id)).map((t) => ({ ...newResult(t), ...(t.id === "seed-test-arm-curl" && curlLoad(ctx.client.sex) ? { instrument: curlLoad(ctx.client.sex) } : {}) }))],
    }));
  }, [key, ctx.a?.id, ctx.tests.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const a = ctx.a;
  if (!a) return null;
  const results = testIds.map((id) => a.results.find((r) => r.testId === id)).filter((r) => !!r);
  return (
    <ul className="flex flex-col gap-2">
      {results.map((r) => {
        const row = evaluation?.rows.find((x) => x.key === r.testId);
        return (
          <li key={r.id} className="flex flex-col gap-1">
            <ul>
              <ResultCard
                result={r}
                open={open === r.id}
                onToggle={() => setOpen(open === r.id ? null : r.id)}
                previous={previousResult(ctx.assessments, a, r.testId)}
                date={a.date}
                test={ctx.tests.find((t) => t.id === r.testId)}
                bodyMass={bodyMassAt(ctx.assessments, a)}
                onChange={(next) => ctx.setA((cur) => ({ results: cur.results.map((x) => (x.id === next.id ? next : x)) }))}
                onRemove={() => ctx.setA((cur) => ({ results: cur.results.filter((x) => x.id !== r.id) }))}
              />
            </ul>
            {row && (
              <div className="flex items-start gap-2 px-1 text-xs">
                <LightBadge light={row.light} />
                <span className="text-muted flex-1">
                  {row.detail}
                  {row.risk && <span className="text-warn"> · zona de risco: {row.risk} (aproximado, só técnico)</span>}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function useEvaluation(ctx: ModuleCtx): Evaluation | null {
  return useMemo(() => (ctx.a ? evaluate(ctx.mod, ctx.a, { client: ctx.client, tests: ctx.tests, focuses: ctx.focuses }) : null), [ctx.a, ctx.mod, ctx.client, ctx.tests, ctx.focuses]);
}

const q = (mod: ModuleDef, id: string) => mod.questionnaires.find((x) => x.id === id)!;

export function Anamnesis(ctx: ModuleCtx) {
  const d = useData(ctx);
  const falls = numOf(data(ctx.a, "falls"));
  return (
    <>
      <Section title="O que quer conseguir">
        {d.text("wants", "Atividades que quer fazer ou voltar a fazer (brincar com os netos, viajar, jardinagem, caminhadas…)", true)}
        {d.text("hardest", "O que hoje lhe custa mais no dia a dia", true)}
      </Section>
      <Section title="Quedas e confiança">
        <Num
          label="Quedas no último ano (n.º)"
          value={falls}
          onChange={(v) =>
            ctx.setA((a) => {
              const sarc = [...(a.questionnaires?.sarc_f ?? [null, null, null, null, null])];
              sarc[4] = fallsItem(v);
              return { moduleData: { ...a.moduleData, falls: v }, questionnaires: { ...a.questionnaires, sarc_f: sarc } };
            })
          }
        />
        {(falls ?? 0) > 0 && (
          <>
            <YesNo label="Lesionou-se?" value={boolOf(data(ctx.a, "fallInjured"))} onChange={(v) => d.set("fallInjured", v)} />
            <YesNo label="Precisou de ajuda para se levantar?" value={boolOf(data(ctx.a, "fallHelp"))} onChange={(v) => d.set("fallHelp", v)} />
            {d.text("fallHow", "Como e onde aconteceram", true)}
          </>
        )}
      </Section>
      <QuestionnaireBlock ctx={ctx} q={q(ctx.mod, "fall_concern")} />
      <QuestionnaireBlock ctx={ctx} q={q(ctx.mod, "autonomy")} />
      <QuestionnaireBlock ctx={ctx} q={q(ctx.mod, "sarc_f")} locked={new Set([4])} />
      <Section title="Saúde específica">
        <Info tone={(ctx.s.medicationCount ?? 0) >= 5 ? "warn" : undefined}>
          N.º de medicamentos diários: <b>{ctx.s.medicationCount ?? "—"}</b> (da ficha geral){(ctx.s.medicationCount ?? 0) >= 5 ? " · atenção a tonturas e quedas de tensão" : ""}
        </Info>
        {d.text("vision", "Visão (usa óculos? para perto, longe?) e audição")}
        {d.text("dizziness", "Tonturas ao levantar-se, perdas de urina, dores nos pés, calçado habitual", true)}
        {d.text("memory", "Memória e concentração (da própria pessoa e da família)")}
      </Section>
      <Section title="Vida social e apoio">
        {d.text("livesWith", "Com quem vive, quem o apoia, quem pode acompanhar nos treinos", true)}
        {d.text("social", "Atividades sociais atuais (grupos, igreja, associações, voluntariado)")}
      </Section>
    </>
  );
}

const MOMENTS: [VitalsMoment, string][] = [
  ["before", "Antes dos testes"],
  ["after_strength", "Depois da força"],
  ["after_aerobic", "Depois do aeróbio"],
  ["after_5min", "5 min após terminar"],
];

export function Safety(ctx: ModuleCtx) {
  const d = useData(ctx);
  const beta = ctx.s.medicationFlags.includes("betablocker");
  const diabetes = ctx.s.diseases.includes("diabetes");
  const checklist = SAFETY_CHECKLIST.map((c) => (diabetes && c === "Comeu nas últimas 3 h" ? "Comeu nas últimas 3 h e glicemia medida" : c));
  const vitals = ctx.a?.vitals ?? [];
  const setVital = (moment: VitalsMoment, patch: Partial<Vitals>) =>
    ctx.setA((a) => {
      const cur = a.vitals?.find((v) => v.moment === moment) ?? { moment, sys: null, dia: null, hr: null, feeling: null };
      return { vitals: [...(a.vitals ?? []).filter((v) => v.moment !== moment), { ...cur, ...patch }] };
    });
  return (
    <>
      <Section title="Antes de começar">
        <Checks options={checklist} value={listOf(data(ctx.a, "safety"))} onChange={(v) => d.set("safety", v)} />
        {beta && <Info tone="warn"><TriangleAlert /> Toma betabloqueante: registar a perceção de esforço (0–10) em vez da FC.</Info>}
      </Section>
      <Section title="Sinais vitais">
        {MOMENTS.map(([m, label]) => {
          const v = vitals.find((x) => x.moment === m);
          return (
            <div key={m} className="flex flex-col gap-1">
              <span className="text-sm font-medium">{label}</span>
              <div className="grid grid-cols-4 gap-2">
                <Num label="TA sist." value={v?.sys} onChange={(sys) => setVital(m, { sys })} />
                <Num label="TA diast." value={v?.dia} onChange={(dia) => setVital(m, { dia })} />
                {!beta && <Num label="FC" value={v?.hr} onChange={(hr) => setVital(m, { hr })} />}
                <Num label={beta ? "Esforço" : "Sente-se"} value={v?.feeling} onChange={(feeling) => setVital(m, { feeling })} />
              </div>
            </div>
          );
        })}
      </Section>
      <Section title="Parar o teste de imediato se">
        <Checks options={STOP_CRITERIA} value={listOf(data(ctx.a, "stops"))} onChange={(v) => d.set("stops", v)} />
        {d.text("incidents", "Ocorrências durante a sessão (o que aconteceu, em que teste, o que foi feito)", true)}
      </Section>
    </>
  );
}

export function Balance(ctx: ModuleCtx) {
  const d = useData(ctx);
  const evaluation = useEvaluation(ctx);
  const fab = boolOf(data(ctx.a, "fabDone"));
  return (
    <>
      <TestsBlock ctx={ctx} testIds={["seed-test-4-posicoes", "seed-test-unipodal-30", "seed-test-tug", "seed-test-8ft-up-go"]} evaluation={evaluation} />
      <Section title="Observação da marcha">
        <Multi options={GAIT_SIGNS.map((g) => [g, g] as const)} value={listOf(data(ctx.a, "gaitSigns"))} onChange={(v) => d.set("gaitSigns", v)} />
        {d.text("balanceNotes", "Notas sobre o equilíbrio e a marcha", true)}
      </Section>
      <Section>
        <YesNo label="Fazer a bateria de equilíbrio avançado (FAB)?" value={fab} onChange={(v) => d.set("fabDone", v)} />
      </Section>
      {fab && <QuestionnaireBlock ctx={ctx} q={q(ctx.mod, "fab")} />}
    </>
  );
}

export function Strength(ctx: ModuleCtx) {
  const d = useData(ctx);
  const evaluation = useEvaluation(ctx);
  const grip = boolOf(data(ctx.a, "dynamometer"));
  const floor = boolOf(data(ctx.a, "floorSafe"));
  return (
    <>
      <TestsBlock ctx={ctx} testIds={["seed-test-sts-30", "seed-test-sts-5", "seed-test-arm-curl", "seed-test-gait-4m"]} evaluation={evaluation} />
      <Section>
        <YesNo label="Há dinamómetro de mão?" value={grip} onChange={(v) => d.set("dynamometer", v)} />
        {grip && <TestsBlock ctx={ctx} testIds={["seed-test-handgrip"]} evaluation={evaluation} />}
        <YesNo label="Os testes anteriores e a pessoa indicam que é seguro ir ao chão?" value={floor} onChange={(v) => d.set("floorSafe", v)} />
        {floor && <TestsBlock ctx={ctx} testIds={["seed-test-floor-rise"]} evaluation={evaluation} />}
        {d.text("strengthNotes", "Notas sobre força e técnica (joelhos para dentro, impulso com o tronco, assimetrias)", true)}
      </Section>
    </>
  );
}

export function Mobility(ctx: ModuleCtx) {
  const d = useData(ctx);
  const evaluation = useEvaluation(ctx);
  return (
    <>
      <TestsBlock ctx={ctx} testIds={["seed-test-chair-sit-reach", "seed-test-back-scratch", "seed-test-knee-to-wall"]} evaluation={evaluation} />
      <QuestionnaireBlock ctx={ctx} q={q(ctx.mod, "daily_moves")} />
      <Section>{d.text("mobilityNotes", "Notas sobre mobilidade (dor, compensações, diferenças entre lados)", true)}</Section>
    </>
  );
}

export function Aerobic(ctx: ModuleCtx) {
  const d = useData(ctx);
  const evaluation = useEvaluation(ctx);
  const chosen = str(data(ctx.a, "aerobicTest"));
  const options = AEROBIC_TESTS.map((id) => [id, ctx.tests.find((t) => t.id === id)?.name ?? id] as const);
  return (
    <>
      <Section>
        <Pick label="Teste aeróbio (sempre o mesmo nas reavaliações)" options={options} value={chosen || null} onChange={(v) => d.set("aerobicTest", v)} />
        {chosen === "seed-test-6mwt-out-back" && <Info>Percurso de ida e volta: sem referência, só a evolução individual.</Info>}
      </Section>
      {chosen && <TestsBlock ctx={ctx} testIds={[chosen]} evaluation={evaluation} />}
      {chosen && <Section>{d.text("aerobicNotes", "Paragens, sintomas e como recuperou", true)}</Section>}
    </>
  );
}

const LIGHTS: [Light, string][] = [
  ["green", LIGHT_TEXT.green],
  ["yellow", LIGHT_TEXT.yellow],
  ["red", LIGHT_TEXT.red],
];

export function Result(ctx: ModuleCtx) {
  const evaluation = useEvaluation(ctx);
  if (!ctx.a || !evaluation) return <Info>Ainda sem testes registados.</Info>;
  const a = ctx.a;
  const report = a.report ?? { compareWith: null, findings: "", priorities: [], plan: "", nextDate: null };
  const setReport = (patch: Partial<typeof report>) => ctx.setA((cur) => ({ report: { ...report, ...cur.report, ...patch } }));
  const suggested = suggestedPriorities(ctx.mod, evaluation.areas);
  return (
    <>
      <Section title="Resultados">
        {evaluation.rows.length === 0 && <Info>Ainda sem testes registados.</Info>}
        <ul className="flex flex-col divide-y divide-border">
          {evaluation.rows.map((r) => (
            <li key={r.key} className="py-2 flex flex-col gap-0.5">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="flex-1 min-w-0">{r.name}</span>
                <span className="font-semibold whitespace-nowrap">{r.value}</span>
                <LightBadge light={r.light} />
              </div>
              {r.detail && <span className="text-xs text-muted">{r.detail}</span>}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Semáforo por área">
        {evaluation.areas.map((area) => (
          <div key={area.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 min-w-0">
              {area.coach} <span className="text-xs text-muted">· no relatório: {area.client}</span>
            </span>
            <select
              className="input w-36 min-h-[36px]"
              aria-label={`Cor de ${area.coach}`}
              value={area.overridden ? area.light! : ""}
              onChange={(e) => {
                const overrides = { ...report.areaOverrides };
                if (e.target.value) overrides[area.id] = e.target.value as Light;
                else delete overrides[area.id];
                setReport({ areaOverrides: overrides });
              }}
            >
              <option value="">Automático{area.calculated ? ` (${LIGHT_TEXT[area.calculated]})` : ""}</option>
              {LIGHTS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
            <LightBadge light={area.light}>{area.light ? undefined : "Sem dados"}</LightBadge>
          </div>
        ))}
      </Section>
      <Section title="Só para ti">
        {evaluation.risks.length ? (
          <ul className="text-sm text-warn flex flex-col gap-1">
            {evaluation.risks.map((r) => (
              <li key={r}>
                <TriangleAlert /> Zona de risco (aproximado): {r}
              </li>
            ))}
          </ul>
        ) : (
          <Info>Nenhum resultado na zona de risco.</Info>
        )}
        {evaluation.notes.map((n) => (
          <Info key={n}>{n}</Info>
        ))}
      </Section>
      <Section title="Relatório">
        {suggested.length > 0 && <Info>Prioridades sugeridas: {suggested.map((x) => x.client).join(", ")}.</Info>}
        <button
          type="button"
          className="btn-accent self-start"
          onClick={() => {
            // the suggestions go in only when the report has no priorities yet
            if (!report.priorities.some((p) => p.trim()) && suggested.length) setReport({ priorities: suggested.map((x) => x.plan) });
            go("report", a.id);
          }}
        >
          Escrever relatório <ChevronRight />
        </button>
      </Section>
    </>
  );
}
