# Fase 5 — Triagem e anamnese

Desenho técnico para a app `coach-web`. Estado: implementada e por publicar. A tabela do §3 continua por confirmar contra a fonte.

## 1. Pressupostos

- **Quem preenche é o treinador**, na entrevista inicial. O cliente responder na própria app fica para depois da Fase 4.2.
- **A app recomenda, não decide.** Diz se o algoritmo recomenda autorização médica e porquê. A decisão é do treinador e fica registada.
- **Só o coach vê a triagem.** Nunca entra na projeção da app do cliente (Fase 4, §2.3).

## 2. Âmbito

**Entra:** triagem de pré-participação pelo algoritmo do ACSM, condições clínicas e medicação, lesões e dor estruturadas, estilo de vida, gravidez e pós-parto, menores (encarregado de educação), consentimentos de saúde e de imagem.

**Fica de fora:** PAR-Q+ (o texto oficial não pode ser alterado e não o temos), questionário de gravidez da CSEP, limites automáticos de tensão arterial, aviso nas zonas de FC para quem toma betabloqueantes (passo seguinte, §8), relatório em PDF.

## 3. Regra de decisão: algoritmo ACSM

Fonte: Riebe et al. (2015), *Updating ACSM's Recommendations for Exercise Preparticipation Health Screening*, Med Sci Sports Exerc 47(11):2473–2479. Mantido nas edições seguintes das ACSM's Guidelines. **A tabela abaixo foi escrita de memória e tem de ser confirmada contra a fonte antes de publicar.**

Três perguntas:

1. **Pratica exercício regular?** Pelo menos 30 min de intensidade moderada, 3 ou mais dias por semana, nos últimos 3 meses.
2. **Doença conhecida:** cardiovascular (cardíaca, vascular periférica ou cerebrovascular), metabólica (diabetes tipo 1 ou 2) ou renal.
3. **Sinais ou sintomas** sugestivos dessas doenças:
   - dor ou desconforto no peito, pescoço, maxilar ou braços, possivelmente de origem isquémica;
   - falta de ar em repouso ou com esforço ligeiro;
   - tonturas ou desmaio;
   - ortopneia ou dispneia paroxística noturna;
   - edema dos tornozelos;
   - palpitações ou taquicardia;
   - claudicação intermitente;
   - sopro cardíaco conhecido;
   - fadiga ou falta de ar invulgares nas atividades do dia a dia.

| Exercício regular | Doença | Sintomas | Resultado |
|---|---|---|---|
| Não | Não | Não | Sem autorização. Começar leve a moderado e progredir. |
| Não | Sim | Não | Autorização médica recomendada. Depois, leve a moderado. |
| Não | — | Sim | Autorização médica recomendada. |
| Sim | Não | Não | Sem autorização. Continuar moderado ou vigoroso. |
| Sim | Sim | Não | Moderado sem autorização. Vigoroso: autorização recomendada. |
| Sim | — | Sim | Parar e pedir autorização médica antes de voltar. |

Intensidades, para o texto da app: ligeira 30–39% da FC de reserva, PSE 9–11; moderada 40–59%, PSE 12–13; vigorosa ≥ 60%, PSE ≥ 14.

O cálculo vive em `lib/screening.ts`, em funções puras e com testes. Cada triagem guarda `method` (ex. `acsm-2015`): mudar a regra obriga a subir o método, e as triagens antigas continuam a ler-se com o seu.

**Autorização médica:** quando é recomendada, a triagem mostra o estado `pendente` até o treinador registar a data, quem a deu e as restrições. Enquanto estiver pendente, a ficha do cliente mostra um aviso no topo, ao lado das lesões.

## 4. Modelo de dados

Um tipo de registo novo, `screening` (tabela `screenings`), com o mecanismo de sync habitual. Uma triagem por data, como as avaliações: o que o cliente declarou em cada momento fica guardado.

```ts
export interface Screening extends SyncMeta {
  clientId: string;
  date: string; // YYYY-MM-DD
  method: string; // "acsm-2015"
  answeredBy: "client" | "guardian";

  // ACSM
  regularExercise: boolean | null;
  diseases: ("cardiovascular" | "metabolic" | "renal")[];
  symptoms: Symptom[]; // keys of the list in §3
  wantedIntensity: "light" | "moderate" | "vigorous" | null;
  clearance: { date: string; by: string; restrictions: string } | null;

  // Clinical
  conditions: string[]; // chips + free text
  medications: { name: string; flags: MedFlag[] }[];
  surgeries: string;
  restingBp: { sys: number; dia: number } | null;

  // Injuries and pain
  injuries: Injury[];

  // Lifestyle
  sleepHours: number | null;
  sleepQuality: 1 | 2 | 3 | 4 | 5 | null;
  stress: 1 | 2 | 3 | 4 | 5 | null;
  occupation: "seated" | "standing" | "physical" | null;
  activity: string; // what they do now
  history: string; // past training and sport
  motivation: string; // the real reason, in their words

  // Pregnancy and postpartum (shown when sex is not "male")
  pregnancy: { weeks: number; obstetricianOk: boolean } | null;
  postpartum: { weeks: number; delivery: "vaginal" | "cesarean"; pelvicSymptoms: boolean } | null;

  notes: string;
}

export type MedFlag = "betablocker" | "insulin" | "anticoagulant" | "other";

export interface Injury {
  id: string;
  region: string; // INJURY_REGIONS in screening.ts
  side: Side | "both" | null;
  status: "active" | "recovering" | "recovered";
  since: string; // free text: "março 2026"
  pain: number | null; // 0–10, now
  aggravates: string; // movements or positions that make it worse
  followedBy: string; // physio, doctor, none
}
```

**Na ficha (`Client`), porque não mudam com cada triagem:**

```ts
healthConsentAt?: string | null; // explicit consent for health data (RGPD art. 9)
imageConsentAt?: string | null; // photos and video, including social media
guardian?: { name: string; relation: string; phone: string; consentAt: string | null } | null;
```

- `consentAt` mantém-se como está (consentimento para guardar os dados).
- O campo `injuries` mantém-se como aviso curto para o treino, escrito pelo treinador. As lesões da triagem são o registo detalhado. Não há migração automática, porque o texto livre não se lê com fiabilidade.
- Um menor é quem tem menos de 18 anos pelo `birthYear`. Sem encarregado de educação com consentimento, a ficha mostra um aviso.

## 5. Ecrãs

- **Ficha → Informação:** linha nova "Triagem e anamnese", com o resumo: "Sem triagem" (aviso), "Autorização médica pendente" (aviso) ou "Feita em 12/11 · sem restrições". Mostra também um aviso quando a última triagem tem mais de 12 meses.
- **Página da triagem** (`#/screening/<id>`), longa e por secções: Resultado (no topo, com o porquê), Saúde (ACSM), Clínica e medicação, Lesões e dor, Estilo de vida, Gravidez e pós-parto, Encarregado de educação (só para menores).
- **Nova triagem** copia a anterior, com a data de hoje e a autorização limpa: na maior parte das vezes só muda uma ou duas respostas.
- **Consentimento e dados:** ganha os consentimentos de saúde e de imagem, e o encarregado de educação.
- **Topo da ficha:** além das lesões, avisa quando há autorização médica pendente.

## 6. Sync e API

- `TableName`, `TABLES` e `KIND` em `sync.ts` ganham `screenings` / `screening`. `DEFAULTS` também.
- Dexie versão 7 com a tabela `screenings: "id, clientId, date, updatedAt, dirty"` e o `delete("lastSeq")` habitual.
- `exportClient` e `purgeClient` passam a incluir as triagens.
- Na API, `KINDS` aceita `screening`. Não há migração SQL: o `client_id` já vem de `data.clientId`.
- Na Fase 4.2, a projeção para o papel `client` exclui `screening` e os campos novos da ficha (`guardian`, consentimentos).

## 7. Ordem de publicação

1. Exportar a base de dados: `npx wrangler d1 export coach-db --remote --output backup.sql`.
2. `npm run deploy:api`, com `KINDS` a aceitar `screening`.
3. Só depois, push para `main` com a app nova. Na ordem inversa, a API rejeita o envio com erro 400.

## 8. Passos

1. Tipos e `lib/screening.ts` (regra ACSM), com testes de cada linha da tabela do §3.
2. Sync, Dexie, API, exportação e eliminação.
3. Página da triagem, linha na ficha e aviso no topo.
4. Consentimentos e encarregado de educação.
5. Triagem no cliente de demonstração "Teste".

**A seguir, fora desta fase:** aviso nas zonas de FC quando há betabloqueantes (usar a PSE), aviso de hipoglicemia com insulina, triagem no relatório do cliente.
