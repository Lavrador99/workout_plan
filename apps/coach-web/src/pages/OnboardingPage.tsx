import { PageLoading } from "../components/States";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useMemo, type ComponentType } from "react";
import PageHeader, { NotFound } from "../components/PageHeader";
import * as Intake from "../components/onboarding/IntakeSteps";
import * as Mod from "../components/onboarding/ModuleSteps";
import { Info } from "../components/onboarding/fields";
import { newAssessment, newScreening } from "../lib/db";
import { replaceRoute, useAssessments, useClient, useFocuses, useScreenings, useTests } from "../lib/hooks";
import { MODULES, activeModules } from "../lib/modules";
import { canTest, DECISIONS, labelOf } from "../lib/screening";
import { useDraft } from "../lib/useDraft";
import { todayISO } from "@treino/core/text";
import type { Assessment, Client, ModuleId, Screening } from "@treino/core/types";

const INTAKE: [id: string, title: string, step: ComponentType<Intake.IntakeCtx>][] = [
  ["id", "1. Identificação", Intake.Identification],
  ["consent", "2. Consentimento", Intake.Consent],
  ["triage", "3. Triagem de saúde", Intake.Triage],
  ["conditions", "4. Condições da avaliação", Intake.Conditions],
  ["anthro", "5. Antropometria e sinais vitais", Intake.Anthropometry],
  ["clinical", "6. Histórico clínico", Intake.Clinical],
  ["lifestyle", "7. Treino e estilo de vida", Intake.Lifestyle],
  ["goals", "8. Objetivos e logística", Intake.Goals],
  ["behaviour", "9. Comportamental", Intake.Behaviour],
  ["modules", "10. Perfil e módulos", Intake.Modules],
  ["summary", "11. Resumo do técnico", Intake.Summary],
];

const MODULE_STEPS: Record<string, ComponentType<Mod.ModuleCtx>> = {
  anamnesis: Mod.Anamnesis,
  safety: Mod.Safety,
  balance: Mod.Balance,
  strength: Mod.Strength,
  mobility: Mod.Mobility,
  aerobic: Mod.Aerobic,
  result: Mod.Result,
};

interface Step {
  id: string;
  title: string;
  module?: ModuleId;
}

/** The latest assessment that is the intake's own (conditions, vitals, anthropometry). */
const isIntake = (a: Assessment) => a.moduleData?.intake === true;

/** The initial assessment, step by step: the general intake, then each active module. Every step saves as it goes. */
export default function OnboardingPage({ clientId, step: routeStep }: { clientId: string; step?: string }) {
  const stored = useClient(clientId);
  const screenings = useScreenings(clientId);
  const assessments = useAssessments(clientId);
  const tests = useTests();
  const focuses = useFocuses();
  const today = todayISO();

  const [client, setClient] = useDraft<Client>("clients", stored);
  const [s, setS] = useDraft<Screening>("screenings", screenings === undefined ? undefined : (screenings[0] ?? null), () => newScreening(clientId));
  const intakeStored = assessments === undefined ? undefined : (assessments.find(isIntake) ?? null);
  const [intake, setIntake] = useDraft<Assessment>("assessments", intakeStored, () => ({ ...newAssessment(clientId), title: "Ficha geral", moduleData: { intake: true } }));

  const screening = s ?? newScreening(clientId);
  const modules = client ? activeModules(client, s ?? undefined, today).filter((m) => MODULES[m]) : [];
  const steps: Step[] = useMemo(
    () => [...INTAKE.map(([id, title]) => ({ id, title })), ...modules.flatMap((m) => MODULES[m]!.steps.map((st) => ({ id: `${m}.${st.id}`, title: `${MODULES[m]!.name} · ${st.title}`, module: m })))],
    [modules.join(",")], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const current = steps.find((x) => x.id === routeStep) ?? steps[0];
  const moduleId = current.module ?? null;
  const moduleStored = assessments === undefined ? undefined : moduleId ? (assessments.find((a) => a.moduleId === moduleId) ?? null) : null;
  const [moduleA, setModuleA] = useDraft<Assessment>("assessments", moduleStored, () => ({ ...newAssessment(clientId), title: moduleId ? (MODULES[moduleId]?.name ?? "") : "", moduleId }));

  if (stored === null) return <NotFound title="Avaliação inicial" back={["clients"]} />;
  if (!client || !tests || !focuses || !assessments || screenings === undefined) return <PageLoading title="Avaliação inicial" back={["client", clientId]} />;

  const index = steps.indexOf(current);
  const goTo = (st: Step) => {
    replaceRoute("onboarding", clientId, st.id);
    window.scrollTo({ top: 0 });
  };
  const locked = !!current.module && !canTest(screening);
  const intakeCtx: Intake.IntakeCtx = { client, setClient, s: screening, setS, intake, setIntake, tests, today };
  const IntakeStep = INTAKE.find(([id]) => id === current.id)?.[2];
  const mod = current.module ? MODULES[current.module] : undefined;
  const ModStep = mod ? MODULE_STEPS[current.id.split(".")[1]] : undefined;
  const sub = mod?.steps.find((x) => `${mod.id}.${x.id}` === current.id)?.sub;

  return (
    <>
      <PageHeader title="Avaliação inicial" subtitle={`${client.name}${client.clientNumber ? ` · n.º ${client.clientNumber}` : ""}`} back={["client", clientId, "info"]} />
      <div className="page">
        <div className="flex items-center gap-2">
          <select className="input flex-1" aria-label="Passo" value={current.id} onChange={(e) => goTo(steps.find((x) => x.id === e.target.value)!)}>
            {steps.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title}
                {x.module && !canTest(screening) ? " (bloqueado)" : ""}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted whitespace-nowrap">
            {index + 1} de {steps.length}
          </span>
        </div>
        <div>
          <h2 className="text-lg font-semibold">{current.title}</h2>
          {sub && <p className="text-sm text-muted">{sub}</p>}
        </div>

        {locked ? (
          <Info>
            <Lock /> Os testes só abrem com a decisão da triagem "Apto" ou "Apto com restrições". Decisão atual: <b>{labelOf(DECISIONS, screening.decision) ?? "por tomar"}</b>.
          </Info>
        ) : IntakeStep ? (
          <IntakeStep {...intakeCtx} />
        ) : mod && ModStep ? (
          <ModStep mod={mod} client={client} s={screening} a={moduleA} setA={setModuleA} tests={tests} assessments={assessments} focuses={focuses} />
        ) : null}

        <div className="flex gap-2 border-t border-border pt-3">
          <button type="button" className="btn" disabled={index === 0} onClick={() => goTo(steps[index - 1])}>
            <ChevronLeft /> Anterior
          </button>
          <span className="flex-1" />
          {index < steps.length - 1 && (
            <button type="button" className="btn-accent" onClick={() => goTo(steps[index + 1])}>
              Seguinte <ChevronRight />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
