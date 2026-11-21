import { Checks, Num, Text } from "./onboarding/fields";
import { fmtNum } from "@treino/core/text";
import type { Assessment, AssessmentConditions } from "@treino/core/types";

// The conditions of an assessment day: what decides whether two assessments compare.

const BIA = ["Jejum de 3–4 h", "Bexiga vazia", "Sem exercício nas últimas 12 h", "Sem álcool nas últimas 24 h", "Sem objetos metálicos; pés limpos e secos", "Mesma balança e mesma hora da avaliação anterior"];
const BIA_DEVICE = "Sem pacemaker nem dispositivo eletrónico implantado";
const BIA_PREGNANCY = "Sem pacemaker nem dispositivo implantado; não está grávida";

export const EMPTY_CONDITIONS: AssessmentConditions = { startTime: "", place: "", surface: "", shoes: "", sleep: "", lastMeal: "", caffeine: "", lastHardSession: "", soreness: null, wellbeing: null, bia: [], notes: "" };

/** Short summary for lists: "18:30 · Ginásio X · piso de borracha · ténis · estado 7/10". The older free text when there is no data. */
export function fmtConditions(a: Pick<Assessment, "conditions" | "conditionsData">): string {
  const c = a.conditionsData;
  if (!c) return a.conditions;
  return [c.startTime, c.place, c.surface, c.shoes, c.wellbeing != null && `estado ${fmtNum(c.wellbeing)}/10`, c.soreness ? `dores ${fmtNum(c.soreness)}/10` : ""].filter(Boolean).join(" · ") || a.conditions;
}

export default function ConditionsFields({ value, onChange, sex, older }: { value: AssessmentConditions | null | undefined; onChange: (next: AssessmentConditions) => void; sex: "female" | "male" | null | undefined; older?: string }) {
  const cd = { ...EMPTY_CONDITIONS, ...value };
  const set = (patch: Partial<AssessmentConditions>) => onChange({ ...cd, ...patch });
  return (
    <div className="flex flex-col gap-3">
      {older && <p className="text-xs text-muted">Registado antes: {older}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Text label="Hora de início" type="time" value={cd.startTime} onChange={(startTime) => set({ startTime })} />
        <Text label="Local" value={cd.place} onChange={(place) => set({ place })} />
        <Text label="Superfície" value={cd.surface} onChange={(surface) => set({ surface })} />
        <Text label="Calçado" value={cd.shoes} onChange={(shoes) => set({ shoes })} />
      </div>
      <Text label="Sono na noite anterior (horas, qualidade, acordou descansado?)" value={cd.sleep} onChange={(sleep) => set({ sleep })} />
      <Text label="Última refeição (hora e o que comeu)" value={cd.lastMeal} onChange={(lastMeal) => set({ lastMeal })} />
      <Text label="Cafeína nas últimas 3 h" value={cd.caffeine} onChange={(caffeine) => set({ caffeine })} />
      <Text label="Último treino intenso (data e o que fez)" value={cd.lastHardSession} onChange={(lastHardSession) => set({ lastHardSession })} />
      <div className="grid grid-cols-2 gap-2">
        <Num label="Dores musculares hoje (0–10)" value={cd.soreness} onChange={(soreness) => set({ soreness })} />
        <Num label="Estado geral hoje (1–10)" value={cd.wellbeing} onChange={(wellbeing) => set({ wellbeing })} />
      </div>
      <Checks label="Checklist antes da bioimpedância" options={[...BIA, sex === "male" ? BIA_DEVICE : BIA_PREGNANCY]} value={cd.bia} onChange={(bia) => set({ bia })} />
      <Text label="Observações (condições que não se cumpriram e porquê)" area value={cd.notes} onChange={(notes) => set({ notes })} />
    </div>
  );
}
