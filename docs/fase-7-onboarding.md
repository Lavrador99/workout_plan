# Fase 7 — Onboarding da avaliação inicial e módulo Força e Equilíbrio

Desenho técnico para a app `coach-web`. Estado: implementada e por publicar (ver §10, o que mudou na implementação). Substitui a triagem ACSM da Fase 5. As baterias de Hyrox, ATHX e jovens passam para a [Fase 9](fase-9-baterias.md).

Fontes do conteúdo, todas do treinador:
- Ficha 1 — Dados Pessoais e Gerais (Claude Docs);
- Ficha 2 — Módulo Força e Equilíbrio (Claude Docs);
- "Idosos: dados dos testes de Fullerton e planeamento do treino" (Claude Docs).

Os termos seguem o [glossário](../GLOSSARY.md). O desenho foi testado num protótipo com quatro casos (saudável, dois intermédios, todos alterados).

## 1. Decisões já tomadas

| # | Decisão |
|---|---|
| 1 | Dois caminhos para criar: **+ Cliente** (só o nome) e **+ Avaliação inicial** (cria e abre o onboarding). O onboarding também se abre a partir da ficha. |
| 2 | O onboarding é por passos. Cada passo grava logo, retoma-se onde parou e pode ser saltado. |
| 4 | A triagem passa a ser a da Ficha 1: 8 perguntas, critérios de encaminhamento e uma **decisão** com 4 estados. Os testes só abrem com Apto ou Apto com restrições. O ACSM sai. |
| 5 | São os **módulos** que decidem os testes. A modalidade é só contexto. |
| 6 | Força e Equilíbrio ativa-se pelos 5 critérios da Ficha 2, deduzidos quando possível, com confirmação do treinador. |
| 7 | Tudo o que se pode deduzir é deduzido (§6). |
| 8 | Há 5 autorizações, cada uma com data, e a assinatura é desenhada no ecrã. |
| 9 | As condições da avaliação passam a ser campos, comparados lado a lado na reavaliação. |
| 11 | As tabelas do documento Fullerton são a referência. A posição dá-se sempre em relação a P25, P50 e P75. |
| 12 | Os testes são os da Ficha 2, mais o "2,44 m e voltar" e a FAB, que é opcional. |
| 13 | O corte do TUG é 12 s. |
| 14 | A marcha de 6 minutos regista o percurso, e só o retângulo de 45,7 m tem referência. |
| 15 | Nos testes por lado, a referência usa o melhor lado. A assimetria aparece à parte. |
| 16 | O semáforo é calculado por teste. Cada área fica na cor do pior teste, e o treinador pode ajustá-la. |
| 17 | A zona de risco é só para o técnico, marcada como aproximada, e nunca entra no relatório. |
| 18 | A reavaliação deste módulo é a 8 semanas. |
| 19 | O relatório usa a linguagem do cliente; o ecrã do técnico usa a técnica. |
| — | O radar tem 7 áreas. O relatório leva radar, mapa do corpo e as prioridades. |

## 2. Estado de partida

As Fases 5 e 6 estão em dois commits locais ainda sem push (`main` está 2 à frente de `origin/main`). O registo `screening` nunca chegou à API publicada, por isso muda de forma sem migração de dados. Só o cliente de demonstração tem triagens.

## 3. Modelo de dados

### 3.1 Ficha (`Client`), campos novos

```ts
birthDate?: string | null;        // YYYY-MM-DD; when set, birthYear follows it
clientNumber?: number;            // sequential, given on creation
address?: string;
profession?: string;
workRoutine?: string;             // hours seated, standing, physical effort
referral?: "social" | "referral" | "gym" | "other" | null;
referralNote?: string;            // who referred them
emergency?: { name: string; relation: string; phone: string } | null;
guardian?: Guardian | null;       // gains email
consents?: Consents;              // replaces consentAt, healthConsentAt, imageConsentAt
moduleIds?: ModuleId[];           // active modules; unset = suggested ones
format?: "in_person" | "online" | null;
```

```ts
type ConsentKey = "data_health" | "media_internal" | "social_face" | "social_no_face" | "share_professionals";

interface Consents {
  given: Partial<Record<ConsentKey, string>>; // date each one was given
  professionals: string;                      // who information may go to
  signature: string | null;                   // client's, PNG data URL
  guardianSignature: string | null;
  signedAt: string | null;
}
```

- O `birthYear` continua a ser o que o resto da app lê. Quando há `birthDate`, o ano é sempre tirado da data.
- O `clientNumber` é o maior número existente mais 1, atribuído ao criar. Dois aparelhos sem sync podem dar o mesmo número. Em caso de colisão, o número é atribuído de novo no pull seguinte; o que fica é o do cliente criado primeiro.
- `consentAt`, `healthConsentAt` e `imageConsentAt` passam para `consents` no arranque (`migrateConsents`), como o `migrateTargets`.

### 3.2 Ficha geral (`Screening`), nova forma

O registo datado da Fase 5 passa a guardar os separadores 3 e 6 a 10 da Ficha 1. Mantém o kind `screening`.

```ts
interface Screening extends SyncMeta {
  clientId: string;
  date: string;

  // 3. Triagem
  quick: (boolean | null)[];          // the 8 questions, in order; 8 only for women
  quickDetails: string;
  parq: "all_no" | "followup_done" | null;
  referralCriteria: ReferralKey[];
  decision: "fit" | "fit_restricted" | "awaiting" | "referred" | null;
  restrictions: string;
  clearanceRequested: string;         // who and when
  referredTo: string;                 // who, why, when

  // 6. Histórico clínico
  diseases: DiseaseKey[];             // the 11 of the Ficha
  diseaseDetails: string;
  diseaseLimits: boolean | null;      // a chronic disease limits daily life
  medication: string;
  medicationCount: number | null;
  medicationFlags: MedFlag[];         // betablocker, hypoglycemic, antihypertensive_diuretic, anticoagulant
  surgeries: string;
  injuries: Injury[];                 // as in Phase 5
  pain: { zone: string; intensity: number | null; since: string; triggers: string } | null;
  familyHistory: boolean | null;
  healthProfessionals: string;

  // 7. Treino e estilo de vida
  training: { current: string; past: string; bestPhase: string; strengthExperience: Experience | null; competitions: string; ptBefore: string; trainingInjuries: string };
  lifestyle: { sleepHours: number | null; sleepQuality: number | null; stress: number | null; steps: number | null; stressSource: string; food: string; water: string; alcohol: string; tobacco: string; supplements: string };

  // 8. Objetivos e logística
  goals: { main: string; why: string; secondary: string; deadline: string; targetEvent: string; success: string };
  logistics: { availability: string; sessionsPerWeek: number | null; place: string; homeEquipment: string; budget: string; likes: string; dislikes: string };

  // 9. Comportamental
  behaviour: { stage: Stage | null; confidence: number | null; reason: string; motivation: string; barriers: BarrierKey[]; barrierDetails: string; pastDropout: string; support: string; followUp: string };

  // Perfil e módulos: the two quick questions behind Força e Equilíbrio
  fallOrFear: boolean | null;
  risesWithoutHands: boolean | null;
  longInactivity: boolean | null;

  // 10. Resumo do técnico
  summary: { impressions: string; referralsMade: string; package: string; nextSession: string | null; checklist: SummaryStep[] };
}
```

- Os alertas do separador 10 ("Alertas de saúde e restrições") são calculados, nunca escritos (§6).
- A qualidade do sono e o stress passam a ser de 1 a 10, como na Ficha 1. A Fase 5 usava de 1 a 5.

### 3.3 Avaliação (`Assessment`), campos novos

```ts
conditionsData?: AssessmentConditions;  // tab 4; the old text field `conditions` stays for older ones
vitals?: Vitals[];                      // before, after strength, after aerobic, 5 min after
moduleId?: ModuleId | null;             // the module this assessment belongs to
questionnaires?: Record<QuestionnaireId, (number | null)[]>; // answers, item by item
safety?: { checklist: string[]; stops: string[]; incidents: string };
observations?: Record<string, string[]>;  // e.g. gait signs
report?: AssessmentReport & { areaOverrides?: Partial<Record<AreaId, Light>>; message?: string };
```

```ts
interface AssessmentConditions {
  startTime: string; place: string; surface: string; shoes: string;
  sleep: string; lastMeal: string; caffeine: string; lastHardSession: string;
  soreness: number | null; wellbeing: number | null;
  bia: string[]; notes: string;
}
interface Vitals { moment: "before" | "after_strength" | "after_aerobic" | "after_5min"; sys: number | null; dia: number | null; hr: number | null; feeling: number | null }
```

- **Questionários** (preocupação em cair, autonomia, SARC-F, movimentos do dia a dia, FAB): guardam-se as respostas item a item. Os totais e as cores são calculados.
- **Item das quedas do SARC-F:** vem do n.º de quedas: 0 → 0, 1 a 3 → 1, 4 ou mais → 2.

### 3.4 Testes, campos novos (`TestDef`)

```ts
priorityCut?: Cut | null;   // Ficha 2: "X or worse = priority"
riskCut?: Cut | null;       // coach only, approximate
area?: AreaId | null;       // where the test counts in its module

interface Cut { when: "below" | "at_most" | "at_least" | "above"; value: number; female?: number }
```

O `area` fica no teste, e não no módulo, para o treinador o poder mudar na biblioteca.

## 4. Módulo Força e Equilíbrio

Os módulos são configuração versionada no código, em `lib/modules/`, como as referências. Este é o primeiro.

```ts
interface ModuleDef {
  id: ModuleId;               // "strength_balance"
  name: string;               // "Força e Equilíbrio"
  activation: (ctx) => string[]; // reasons it is suggested; empty = not suggested
  steps: ModuleStep[];        // anamnese, segurança, equilíbrio, força, mobilidade, aeróbio, resultado
  areas: { id: AreaId; coach: string; client: string; body?: BodyZone[] }[];
  reassessWeeks: number;      // 8
}
```

### 4.1 Testes (bateria funcional)

| Teste | Unidade | Melhor | Lados | Referência | Corte de prioridade | Zona de risco |
|---|---|---|---|---|---|---|
| Equilíbrio em 4 posições | posição (0–4) | mais | — | — | não chega ao tandem | — |
| Apoio unipodal (máx. 30 s) | s | mais | sim | — | < 10 s | — |
| Timed Up and Go (3 m) | s | menos | — | — | ≥ 12 s | — |
| Sentado, 2,44 m e voltar | s | menos | — | Fullerton | — | > 9 s |
| Levantar e sentar 30 s | reps | mais | — | Fullerton | (pela referência) | < 8 |
| Levantar e sentar 5 vezes | s | menos | — | — | > 15 s | — |
| Flexão do braço 30 s | reps | mais | — | Fullerton | (pela referência) | < 11 |
| Handgrip (existe) | kg | mais | sim | Tomkinson | < 27 kg H / < 16 kg M | — |
| Velocidade de marcha 4 m | s, dá m/s | menos | — | — | ≤ 0,8 m/s | — |
| Sentar e levantar do chão | apoios | menos | — | — | não consegue sem ajuda | — |
| Sentado e alcançar (cadeira) | cm | mais | sim | Fullerton, melhor lado | (pela referência) | — |
| Alcançar atrás das costas | cm | mais | sim | Fullerton, melhor lado | (pela referência) | — |
| Knee to Wall (existe) | cm | mais | sim | — | — | — |
| Marcha 6 min · retângulo 45,7 m | m | mais | — | Fullerton | (pela referência) | < 320 |
| Marcha 6 min · ida e volta | m | mais | — | — | — | — |
| Step 2 min | passos | mais | — | Fullerton | (pela referência) | < 65 |

- **4 posições:** o resultado é a última posição aguentada 10 s. O passo do onboarding regista os segundos de cada posição e mostra a seguinte só quando a anterior chega aos 10 s.
- **Apoio unipodal:** é um teste novo, porque o "Single Leg Balance" que já existe tem outro protocolo (mãos na cintura, sem máximo).
- **Marcha de 6 minutos:** os dois percursos são testes separados, para nunca se misturarem na evolução.
- **Halter da flexão do braço:** 2,3 kg para mulheres e 3,6 kg para homens, pré-preenchido em "Instrumento" pelo sexo.
- **Levantar e sentar 30 s:** quando precisa das mãos, o resultado é 0 e fica anotado.
- **Velocidade de marcha:** usa o `distanceM` = 4 que já existe, e a velocidade aparece como métrica derivada.
- **Questionários do módulo:**
  - preocupação em cair (6 itens, 0–2);
  - autonomia no dia a dia (7 itens, 3 níveis);
  - SARC-F (5 itens; ≥ 4 = prioridade de força, só técnico);
  - movimentos do dia a dia (5 itens, 3 níveis);
  - FAB (10 itens, 0–4; opcional; ≤ 25 = zona de risco).

### 4.2 Referências

`references/fullerton.ts`, com o mesmo formato das outras e a fonte "Materiais MAFPE (Rikli & Jones, Senior Fitness Test)".

- Percentis P25, P50 e P75 por sexo e por faixa de 5 anos (60–94), para 8 testes. O IMC só tem P25 e P75.
- `group: "general"`, população: adultos de 60 a 94 anos a viver na comunidade.
- `sides: "best"` no sentado e alcançar e no alcançar atrás das costas.
- O motor de referências (`benchmark.ts`) já interpola sem extrapolar. Abaixo de P25 dá "abaixo de P25" e acima de P75 dá "acima de P75".
- **Por confirmar antes de publicar:** o número de pessoas e de estudos (para o nível de evidência), e se os PDFs do curso permitem este uso. A decisão foi do treinador (Q11).

### 4.3 Semáforo e áreas

Por teste:
- **vermelho:** abaixo de P25, corte de prioridade atingido, ou não conseguiu;
- **amarelo:** entre P25 e P50, ou "com dificuldade";
- **verde:** P50 ou acima;
- **sem cor:** testes sem referência nem corte. O treinador classifica.

A área fica na cor do pior teste que tem cor. O ajuste do treinador fica em `report.areaOverrides`.

| Área (técnico) | Testes | No relatório | Zona do corpo |
|---|---|---|---|
| Equilíbrio | 4 posições, unipodal, TUG, 2,44 m, FAB | Equilíbrio | pés e tornozelos |
| Força das pernas | levantar e sentar 30 s e 5× | Força das pernas | coxas e glúteos |
| Força dos braços e mãos | flexão do braço, handgrip | Força dos braços | braços e mãos |
| Marcha | velocidade, observação | Caminhar com confiança | pernas |
| Mobilidade | sentado e alcançar, atrás das costas, tornozelo, movimentos do dia a dia | Mobilidade | ombros, anca e parte de trás das pernas |
| Resistência | marcha de 6 min ou step | Fôlego | coração e pulmões |
| Autonomia | questionário do dia a dia, levantar do chão | Dia a dia | — |

### 4.4 Relatório do módulo

É o relatório da Fase 6 com uma variante para módulos:
- **Radar de 7 lados.** Cada eixo mostra a pontuação da área (a do pior teste), e a linha tracejada é P50.
- **Pontuação para o radar,** que é uma escolha de desenho e não uma escala validada:
  - percentil interpolado entre P25 e P75;
  - abaixo de P25 vale 12, acima de P75 vale 90;
  - nos cortes, verde vale 70 e vermelho 15;
  - nos questionários, verde vale 80, amarelo 40 e vermelho 15.
- **Mapa do corpo** (SVG, de frente): as zonas das áreas amarelas e vermelhas ficam coloridas e numeradas, com legenda em linguagem simples.
- **Prioridades sugeridas** pela ordem do documento Fullerton: equilíbrio e marcha, força das pernas, fôlego, mobilidade, braços, dia a dia. Primeiro as vermelhas, depois as amarelas. O treinador reescreve-as.
- **Fim do relatório:** a mensagem ligada ao que o cliente quer voltar a fazer, e a reavaliação a 8 semanas.
- **Linguagem:** sem "risco", "idoso", "sénior" nem nomes de testes clínicos. O nível de cada área diz-se com estas frases: "Ponto forte", "Vamos reforçar" ou "É aqui que vamos trabalhar".

## 5. Ecrãs

- **Clientes:** botões "+ Cliente" e "+ Avaliação inicial".
- **Onboarding** (`#/onboarding/<clientId>`):
  - uma lista de passos no topo com o estado de cada um (feito, por fazer, bloqueado), e Anterior / Seguinte;
  - **Ficha 1:** Identificação, Consentimento, Triagem, Condições, Antropometria e sinais vitais, Histórico clínico, Treino e estilo de vida, Objetivos e logística, Comportamental, Perfil e módulos, Resumo do técnico;
  - **módulos ativos:** os passos de cada módulo ativo vêm a seguir, bloqueados até a decisão ser Apto ou Apto com restrições;
  - **o que o onboarding cria e preenche:** uma ficha geral (`Screening`), uma avaliação (`Assessment`) para a Ficha 1 (antropometria e sinais vitais) e uma avaliação por cada módulo;
  - **reavaliação:** usa os mesmos passos, a partir da última avaliação do módulo.
- **Ficha do cliente:**
  - a linha "Triagem e anamnese" passa a "Ficha geral" e mostra a decisão;
  - aparece um botão "Avaliação inicial" ou "Reavaliação";
  - a linha "Consentimento e dados" mostra as 5 autorizações.
- **Avaliação de módulo:**
  - mostra os resultados por área, com a posição na referência e a cor;
  - a zona de risco fica num bloco "só técnico";
  - o botão "Relatório" abre o relatório do módulo.
- **Assinatura:** canvas com toque e rato, guardado como PNG pequeno (com a mesma redução do logótipo).

## 6. Deduções e alertas

**Deduzido, nunca preenchido à mão:**
- **Na ficha:**
  - n.º de cliente;
  - tipo de avaliação (inicial, ou reavaliação n.º X);
  - idade, a partir da data de nascimento.
- **Na antropometria:** IMC e relação cintura-altura.
- **Campos que só aparecem às vezes:**
  - encarregado de educação, assinatura dele e altura sentado: só para menores;
  - pergunta 8 da triagem, módulo Mulher e checklist da bioimpedância sem gravidez: só para mulheres;
  - glicemia na segurança: só com diabetes;
  - FC trocada pela PSE: só com betabloqueante;
  - "Detalhes das respostas Sim": só com algum Sim.
- **Na triagem:** a sugestão de decisão. TA ≥ 160/100 ou o critério de dor no peito sugerem "Encaminhado".
- **Nos módulos:** a pré-seleção. Força e Equilíbrio pelos 5 critérios, Desenvolvimento Motor para menores, Condição clínica quando há doença diagnosticada, Saúde e Performance quando não há mais nenhum.
- **No módulo:**
  - a carga do halter, pelo sexo;
  - o item das quedas do SARC-F, pelo n.º de quedas;
  - o n.º de medicamentos, vindo da Ficha 1;
  - o melhor de 2 tentativas;
  - o melhor lado para a referência;
  - a velocidade de marcha;
  - os totais dos questionários.
- **Na confiança:** o "___ vezes por semana" vem das sessões pretendidas.
- **No resumo do técnico:** a reavaliação a 8 semanas (Força e Equilíbrio) ou a 6 (outros módulos).

**Alertas no resumo do técnico** (só técnico):
- TA ≥ 160/100: suspende a avaliação.
- Betabloqueante: usar a PSE.
- Hipoglicemiante: medir a glicemia.
- 5 ou mais medicamentos.
- Confiança < 7: baixar a meta.
- SARC-F ≥ 4.
- História familiar.
- Dor atual.
- Respostas Sim na triagem.

**No relatório da Fase 6:** os cuidados de treino passam a vir das restrições da decisão e das lesões ativas, sem o ACSM.

## 7. Sync e API

- Não há tipos de registo novos: `client`, `screening` e `assessment` ganham campos.
- Como a forma do `screening` muda e nunca foi publicada, não precisa de migração. As triagens antigas do cliente de demonstração são substituídas pelas novas.
- As migrações no arranque (`migrateConsents`, `birthYear` a partir de `birthDate`) correm como o `migrateTargets`: são seguras de repetir.
- Na Fase 4.2, a projeção para o papel `client` exclui `screening`, `consents.signature`, os questionários e a zona de risco.
- A ordem de publicação é a mesma das Fases 5 e 6. Nenhuma migração SQL.

## 8. Passos

1. **Modelo:** tipos novos (cliente, ficha geral, avaliação, cortes), migrações e remoção do ACSM (`screening.ts`, testes e cuidados do relatório).
2. **Módulo como configuração:** `lib/modules/strengthBalance.ts`, os testes novos na biblioteca base, `references/fullerton.ts` e os cortes, com testes de cada percentil, de cada corte e do semáforo. Os quatro casos do protótipo entram como testes.
3. **Onboarding, Ficha 1:** criar cliente pelos dois caminhos, os 11 passos, as deduções, a assinatura e a decisão com o bloqueio dos testes.
4. **Onboarding do módulo:** anamnese e questionários, segurança, os testes por passo com a referência e a cor em direto, e o resultado com o semáforo e o ajuste.
5. **Relatório do módulo:** radar, mapa do corpo, prioridades e mensagem, na impressão A4 da Fase 6.
6. **Dados de demonstração:** os quatro casos (Ana, Manuel, Rosa, Joaquim) como clientes fictícios.
7. Typecheck, testes e build.

## 9. Por confirmar fora da app

- O número de pessoas e de estudos das tabelas Fullerton (nível de evidência), e a autorização de uso dos PDFs do curso.
- O halter de 2,27 kg ou de 2,77 kg para mulheres (o documento Fullerton diz que os slides e o protocolo original divergem). A Ficha 2 diz 2,3 kg.
- O texto do consentimento, a rever por um jurista (nota da própria Ficha 1).

## 10. O que mudou na implementação

- **Cortes e áreas na configuração do módulo**, e não no `TestDef`: `lib/modules/strengthBalance.ts` diz, por teste, a área, o corte de prioridade, a zona de risco e o passo. Assim ficam versionados com o código, como as referências.
- **Respostas do módulo** em `Assessment.moduleData`, que guarda a anamnese, a segurança, a observação da marcha, o teste aeróbio escolhido e se fez a FAB. Os questionários ficam em `Assessment.questionnaires`. Não há `safety` nem `observations` à parte.
- **Ficha geral (`Screening`)**: campos planos em vez de objetos aninhados. O conteúdo é o do §3.2.
- **4 posições**: regista-se a última posição aguentada 10 s (0–4). Os segundos de cada posição não ficam guardados.
- **Avaliação da ficha geral**: é uma avaliação com `moduleData.intake = true` e título "Ficha geral". Guarda as condições, os sinais vitais em repouso e a antropometria. A altura também atualiza `Client.heightCm`.
- **Handgrip**: a referência Tomkinson (população geral) já existia e pesa no semáforo. Por isso uma preensão acima do corte da Ficha 2 pode ficar amarela, se estiver abaixo de P50 da população.
- **Números de cliente**: a migração dá número aos clientes que não têm, por ordem alfabética. Não há resolução automática de números repetidos entre aparelhos.
- **Relatório do módulo**: o mesmo relatório da Fase 6, com o bloco visual (radar, mapa do corpo, áreas) no lugar da tabela de testes, e a mensagem ao cliente.
- **Clientes de demonstração**: "Ana (exemplo)", "Manuel (exemplo)", "Rosa (exemplo)" e "Joaquim (exemplo)", com as cores de cada área verificadas em `modules.test.ts`.
