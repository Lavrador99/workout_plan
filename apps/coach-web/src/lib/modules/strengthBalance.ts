import type { Light } from "@treino/core/types";
import type { ModuleDef } from "./index";

// Força e Equilíbrio (Ficha 2 of the coach, with the Fullerton material for the
// references and the order of priorities). Cuts are the form's own; the risk
// ones are approximate and for the coach only.

const worstItem = (answers: (number | null)[]): Light | null => {
  const v = answers.filter((x): x is number => x != null);
  if (!v.length) return null;
  const max = Math.max(...v);
  return max >= 2 ? "red" : max === 1 ? "yellow" : "green";
};

export const GAIT_SIGNS = ["Passos curtos ou arrastados", "Base de apoio larga", "Procura apoio nas paredes ou móveis", "Desequilíbrio na volta", "Olha para o chão constantemente", "Assimetria entre lados"];

export const SAFETY_CHECKLIST = [
  "Ficha geral concluída com decisão apto",
  "Tomou a medicação habitual do dia",
  "Comeu nas últimas 3 h",
  "Calçado fechado e estável, roupa confortável",
  "Óculos postos, se usa",
  "Espaço livre de obstáculos, sem tapetes, cadeira encostada à parede",
  "Água e algo com açúcar à mão",
];

export const STOP_CRITERIA = [
  "Dor ou aperto no peito",
  "Falta de ar desproporcionada, tonturas, confusão, palidez ou suores frios",
  "Perda de equilíbrio que obrigue a segurar a pessoa",
  "Dor articular aguda",
  "A pessoa pede para parar",
];

export const AEROBIC_TESTS = ["seed-test-6mwt-rect", "seed-test-6mwt-out-back", "seed-test-step-2min"];

/** Falls in the last year → the SARC-F falls item: none 0, 1 to 3 → 1, 4 or more → 2. */
export const fallsItem = (falls: number | null | undefined) => (falls == null ? null : falls === 0 ? 0 : falls <= 3 ? 1 : 2);

/** Arm curl load by sex, as in the form (2,3 / 3,6 kg). */
export const curlLoad = (sex: "female" | "male" | null | undefined) => (sex === "female" ? "Halter 2,3 kg" : sex === "male" ? "Halter 3,6 kg" : "");

export const STRENGTH_BALANCE: ModuleDef = {
  id: "strength_balance",
  name: "Força e Equilíbrio",
  reassessWeeks: 8,
  steps: [
    { id: "anamnesis", title: "Anamnese específica", sub: "Conversa, não interrogatório: começar pelo que a pessoa quer voltar a fazer." },
    { id: "safety", title: "Segurança antes dos testes", sub: "Nenhum teste começa sem esta lista. Ficar sempre ao lado nos testes de equilíbrio e de levantar." },
    { id: "balance", title: "Equilíbrio", sub: "O técnico fica ao lado, com a mão pronta mas sem tocar." },
    { id: "strength", title: "Força e funcionalidade", sub: "A força das pernas é o melhor indicador de autonomia: começar por aqui." },
    { id: "mobility", title: "Mobilidade", sub: "Sem dor, sem balanço: 2 tentativas, fica a melhor. Negativo = não chega." },
    { id: "aerobic", title: "Capacidade aeróbia", sub: "Último teste. Escolher um e repetir sempre o mesmo nas reavaliações." },
    { id: "result", title: "Resultado", sub: "Semáforo calculado por área; podes ajustar cada uma." },
  ],
  tests: [
    { testId: "seed-test-4-posicoes", area: "balance", step: "balance", cut: { when: "below", value: 3, text: "não aguenta 10 s em tandem" } },
    { testId: "seed-test-unipodal-30", area: "balance", step: "balance", cut: { when: "below", value: 10, side: "worst", text: "menos de 10 s numa perna" } },
    { testId: "seed-test-tug", area: "balance", step: "balance", cut: { when: "at_least", value: 12, text: "12 s ou mais" } },
    { testId: "seed-test-8ft-up-go", area: "balance", step: "balance", risk: { when: "above", value: 9, text: "acima de 9 s" } },
    { testId: "seed-test-sts-30", area: "legs", step: "strength", risk: { when: "below", value: 8, text: "abaixo de 8 repetições" } },
    { testId: "seed-test-sts-5", area: "legs", step: "strength", cut: { when: "above", value: 15, text: "mais de 15 s" } },
    { testId: "seed-test-arm-curl", area: "arms", step: "strength", risk: { when: "below", value: 11, text: "abaixo de 11 repetições" } },
    { testId: "seed-test-handgrip", area: "arms", step: "strength", cut: { when: "below", value: 27, female: 16, text: "abaixo de 27 kg (homens) ou 16 kg (mulheres)" } },
    { testId: "seed-test-gait-4m", area: "gait", step: "strength", cut: { when: "at_least", value: 5, text: "0,8 m/s ou menos" } },
    { testId: "seed-test-floor-rise", area: "daily", step: "strength", lightOf: (v) => (v <= 0 ? "red" : v < 2 ? "yellow" : "green") },
    { testId: "seed-test-chair-sit-reach", area: "mobility", step: "mobility" },
    { testId: "seed-test-back-scratch", area: "mobility", step: "mobility" },
    { testId: "seed-test-knee-to-wall", area: "mobility", step: "mobility" },
    { testId: "seed-test-6mwt-rect", area: "endurance", step: "aerobic", risk: { when: "below", value: 320, text: "abaixo de 320 m" } },
    { testId: "seed-test-6mwt-out-back", area: "endurance", step: "aerobic" },
    { testId: "seed-test-step-2min", area: "endurance", step: "aerobic", risk: { when: "below", value: 65, text: "abaixo de 65 passos" } },
  ],
  questionnaires: [
    {
      id: "fall_concern",
      title: "Preocupação em cair",
      step: "anamnesis",
      items: ["Tomar banho", "Subir ou descer escadas", "Caminhar na rua em piso irregular", "Pegar em algo no chão ou numa prateleira alta", "Andar em sítios com muita gente", "Sair de casa sozinho(a)"],
      options: [[0, "Nada"], [1, "Alguma"], [2, "Muita"]],
    },
    {
      id: "autonomy",
      title: "Autonomia no dia a dia",
      step: "anamnesis",
      area: "daily",
      items: ["Levantar-se de uma cadeira", "Subir um lanço de escadas (10 degraus)", "Levantar-se do chão", "Carregar as compras (cerca de 5 kg)", "Vestir-se e calçar-se", "Caminhar 500 m", "Usar transportes públicos"],
      options: [[0, "Sem dificuldade"], [1, "Com dificuldade"], [2, "Precisa de ajuda / não faz"]],
      light: worstItem,
    },
    {
      id: "sarc_f",
      title: "Questionário de força (SARC-F)",
      step: "anamnesis",
      items: ["Levantar e carregar cerca de 4,5 kg", "Atravessar uma divisão a pé", "Passar da cadeira ou da cama para de pé", "Subir 10 degraus", "Quedas no último ano"],
      options: [[0, "Nenhuma"], [1, "Alguma"], [2, "Muita / não consegue"]],
      alert: { atLeast: 4, text: "prioridade de força" },
    },
    {
      id: "daily_moves",
      title: "Movimentos do dia a dia",
      step: "mobility",
      area: "mobility",
      items: ["Levar as mãos à nuca (pentear)", "Levar a mão ao bolso de trás", "Rodar o tronco para olhar para trás", "Agachar para apanhar algo do chão", "Calçar meias sentado"],
      options: [[0, "Sem dificuldade"], [1, "Com dificuldade / dor"], [2, "Não consegue"]],
      light: worstItem,
    },
    {
      id: "fab",
      title: "Equilíbrio avançado (FAB)",
      step: "balance",
      area: "balance",
      when: "fabDone",
      items: ["Pés juntos, olhos fechados", "Alcançar um lápis à frente", "Rodar 360º", "Transpor um banco de 15 cm", "10 passos em linha", "Apoio unipodal", "Pés juntos em espuma, olhos fechados", "Salto a dois pés", "Marcha com rotação da cabeça", "Reação postural"],
      options: [[0, "0"], [1, "1"], [2, "2"], [3, "3"], [4, "4"]],
      light: (answers) => (answers.some((a) => a != null && a <= 2) ? "yellow" : answers.every((a) => a != null) ? "green" : null),
      risk: { atMost: 25, text: "25 pontos ou menos" },
    },
  ],
  areas: [
    { id: "balance", coach: "Equilíbrio", client: "Equilíbrio", zones: ["feet"], plan: "Treino de equilíbrio junto à parede, a reduzir a base aos poucos" },
    { id: "legs", coach: "Força das pernas", client: "Força das pernas", zones: ["thighs"], plan: "Levantar e sentar da cadeira em todas as sessões" },
    { id: "arms", coach: "Força dos braços e mãos", client: "Força dos braços", zones: ["arms"], plan: "Puxar e empurrar com elásticos e treino de pega" },
    { id: "gait", coach: "Marcha", client: "Caminhar com confiança", zones: ["legs"], plan: "Caminhar com passos mais firmes e mudanças de direção" },
    { id: "mobility", coach: "Mobilidade", client: "Mobilidade", zones: ["shoulders", "hips"], plan: "Alongamentos no fim de cada sessão e em casa" },
    { id: "endurance", coach: "Resistência", client: "Fôlego", zones: ["chest"], plan: "Caminhadas em blocos de 10 minutos, a aumentar a duração" },
    { id: "daily", coach: "Autonomia", client: "Dia a dia", zones: [], plan: "Treinar as tarefas do dia a dia que hoje custam mais" },
  ],
  priorityOrder: ["balance", "gait", "legs", "endurance", "mobility", "arms", "daily"],
  observations: (a) => {
    const signs = a.moduleData?.gaitSigns;
    return Array.isArray(signs) && signs.length
      ? [{ key: "gaitSigns", area: "gait", name: "Observação da marcha", value: `${signs.length} ${signs.length === 1 ? "sinal" : "sinais"}`, light: "yellow", score: 40, detail: signs.join("; "), risk: null }]
      : [];
  },
};
