# Fase 1 — Avaliação e histórico

Desenho técnico para a app `coach-web`. Estado: passos 1 a 7 implementados e por publicar.

## 1. Pressupostos

- **Só o treinador usa a app.** Mantém-se a chave única e o sync atual.
- **Não há plano formal.** Adesão e versões de plano ficam fora desta fase.
- **Tudo corre no dispositivo.** Os cálculos são funções puras e funcionam sem rede.

Se o primeiro pressuposto mudar, a autenticação e o sync têm de ser redesenhados antes disto.

## 2. Âmbito

**Entra:** ficha do atleta alargada, biblioteca de testes editável, avaliações com lateralidade e tentativas, comparação entre datas, gráficos de evolução, objetivos por teste e mínimos de RGPD.

**Fica de fora:** mapa corporal, ênfase de treino, radar e índice global (precisam de normalização), valores de referência, recomendações, PDF, vídeo e fotografia.

Os valores de referência ficam de fora de propósito: dependem da população e do protocolo, e valores errados são piores do que nenhum. Nesta fase, a referência é o objetivo individual definido pelo treinador.

## 3. Pré-requisitos: sync e API

Têm de ser feitos antes de qualquer tipo de registo novo.

### 3.1 Registos perdidos em dispositivos desatualizados

Em `sync.ts`, um `kind` desconhecido é ignorado, mas `lastSeq` avança. Um dispositivo com a versão antiga nunca recebe esses registos, mesmo depois de atualizar.

**Correção:** cada tipo novo já obriga a uma versão nova do Dexie, por isso essa versão repõe `lastSeq`. O pull seguinte é completo. É seguro repetir, porque `local.updatedAt <= row.updated_at` protege as edições locais mais recentes.

```ts
this.version(4)
  .stores({
    tests: "id, name, category, updatedAt, dirty",
    assessments: "id, clientId, date, updatedAt, dirty",
  })
  // Regra: qualquer novo kind faz isto, para recuperar o que uma versão antiga ignorou.
  .upgrade((tx) => tx.table("meta").delete("lastSeq"));
```

### 3.2 Migração da API

A migração `0003` reconstrói `records` **sem a `CHECK` em `kind`**. A validação fica só em `KINDS`, no Worker, e os próximos tipos deixam de exigir reconstrução da tabela.

### 3.3 Ordem de publicação

1. Exportar a base de dados: `npx wrangler d1 export coach-db --remote --output backup.sql`.
2. `npm run deploy:api`, com a migração e `KINDS` a aceitar `test` e `assessment`.
3. Só depois, push para `main` com a app nova. Na ordem inversa, a API rejeita o envio com erro 400.

## 4. Modelo de dados

São **dois tipos de registo novos**, com o mesmo mecanismo de sync (JSON + last-write-wins).

| Proposta original | Aqui |
|---|---|
| `athletes` | `Client`, alargado |
| `sport_profiles` | `Focus` com `kind: "sport"`, sem alterações |
| `assessment_tests` | `TestDef` (novo) |
| `assessment_protocols` | `TestDef.groups` + `TestDef.version` |
| `assessment_sessions` | `Assessment` (novo) |
| `assessment_results` | `Assessment.results`, dentro do registo |
| `performance_metrics` | Calculado, nunca guardado |

### 4.1 Teste

```ts
export type TestCategory =
  | "antropometria" | "mobilidade" | "estabilidade" | "movimento" | "força"
  | "potência" | "velocidade" | "agilidade" | "resistência" | "controlo motor";

/** Qual é o melhor resultado. neutral = sem melhor nem pior (peso, perímetros). */
export type Direction = "higher" | "lower" | "neutral";

/** Como as tentativas válidas dão o valor final. */
export type Aggregate = "best" | "mean" | "last";

export interface TestDef extends SyncMeta {
  name: string;
  category: TestCategory;
  unit: string; // "cm", "kg", "s", "°", "pts"
  direction: Direction;
  sided: boolean; // medido por lado
  /** Escala ordinal (FMS 0–3, qualidade 1–5). Assimetria em pontos, não em %. */
  scale?: { min: number; max: number } | null;
  trials: number; // tentativas por defeito
  aggregate: Aggregate;
  version: number; // sobe quando o protocolo muda
  groups: string[]; // baterias: "FMS", "Y-Balance", "Pré-época futebol"
  purpose: string;
  equipment: string;
  instructions: string;
  validity: string; // critérios de validade
  demoUrl?: string;
  /** Preparação da Fase 2. Editáveis, ainda sem uso nos cálculos. */
  muscles?: string[];
  patterns?: string[];
}
```

**Baterias sem tabela própria:** um grupo é uma etiqueta. Escolher "FMS" adiciona todos os testes com essa etiqueta, e o treinador cria grupos escrevendo um nome novo.

### 4.2 Avaliação

```ts
export type Side = "left" | "right";

export interface Trial {
  side?: Side; // ausente em testes sem lado
  value: number | null;
  invalid?: boolean; // fica guardada, não conta para o resultado
}

/** Cópia da definição à data: editar o teste depois não reescreve o histórico. */
export interface TestResult {
  id: string;
  testId: string;
  version: number;
  name: string;
  unit: string;
  direction: Direction;
  sided: boolean;
  scale?: { min: number; max: number } | null;
  aggregate: Aggregate;
  trials: Trial[];
  instrument?: string;
  note?: string;
}

export interface Assessment extends SyncMeta {
  clientId: string;
  date: string; // YYYY-MM-DD
  title: string;
  conditions: string; // hora, piso, fadiga, quem avaliou
  notes: string;
  results: TestResult[];
}
```

### 4.3 Atleta

Campos opcionais novos em `Client`. A modalidade continua a vir de `Focus`. O peso é um teste, para ter histórico.

```ts
heightCm?: number | null;
dominantHand?: Side | "both" | null;
dominantFoot?: Side | "both" | null;
position?: string;
level?: "recreativo" | "competitivo" | "elite" | null;
sportYears?: number | null;
weeklyFrequency?: number | null;
goals?: string[]; // saúde, força, performance, reabilitação
/** Objetivo por teste, no sentido dado por TestDef.direction. */
targets?: Record<string, number>; // testId → valor
consentAt?: string | null; // data do consentimento (YYYY-MM-DD)
```

Não pedimos sexo nesta fase: só seria útil para valores de referência, e estes ficam de fora.

## 5. Comparabilidade de protocolos

Regra da proposta: resultados de protocolos diferentes não são comparáveis.

- A **comparabilidade** é dada pelo par `testId + version`.
- Com resultados guardados, `unit`, `direction`, `sided`, `scale` e `aggregate` ficam bloqueados.
- O botão **Nova versão do protocolo** sobe `version` e desbloqueia esses campos.
- As instruções continuam editáveis, porque corrigir um texto não muda o protocolo. Se a execução mudar, cabe ao treinador criar uma versão nova.
- Os gráficos mostram uma linha por versão, separadas. A comparação marca "protocolo diferente" e não calcula a diferença.

## 6. Cálculos: `lib/assessment.ts`

Funções puras, sem Dexie nem React.

```ts
finalValue(result, side?)        // number | null
asymmetry(result)                // { pct, points, better } | null
change(first, last, direction)   // { delta, pct, improved }
goalProgress(first, cur, target) // number | null
series(assessments, testId)      // pontos por versão e por lado
compare(older, newer)            // linhas, com estado "protocolo diferente"
```

| Regra | Comportamento |
|---|---|
| Valor final | Só tentativas válidas e não nulas; `null` se não houver nenhuma |
| `best` | Máximo em `higher`, mínimo em `lower` |
| `best` em `neutral` | Usa a média, porque não há melhor |
| Assimetria | `|D − E| / melhor lado × 100`; o melhor lado depende de `direction` |
| Assimetria em escala | Só diferença em pontos: uma % sobre escala ordinal não tem significado |
| Assimetria em `neutral` | Mostra a diferença, sem indicar "melhor" |
| Assimetria sem dados | `null` com um lado em falta ou com valores negativos |
| Assimetria com 0 nos dois lados | 0% |
| Evolução % | `null` se o valor inicial for 0; o `delta` continua disponível |
| Objetivo | `(atual − inicial) / (objetivo − inicial)`; `null` se objetivo = inicial |

A fórmula de objetivo serve para os dois sentidos: com sinal, não precisa de inversão. Exemplo: 3,0 s → 2,8 s com objetivo 2,6 s dá 50%. Pode ser negativa, o que indica regressão.

A app **não classifica nenhuma assimetria como risco**: mostra magnitude, lado e evolução, sem limiares automáticos.

## 7. Ecrãs

### 7.1 Navegação

| Rota | Ecrã | Entrada |
|---|---|---|
| `#/client/:id/assessments` | Avaliações do atleta | Novo separador "Avaliar" |
| `#/assessment/:id` | Registo da avaliação | Lista do atleta |
| `#/compare/:clientId/:a/:b` | Comparação | Escolher duas avaliações |
| `#/evolution/:clientId/:testId` | Evolução de um teste | Tocar num teste |
| `#/tests` | Biblioteca de testes | Link no topo da Biblioteca |

O `TABS` de `App.tsx` mantém-se; só o mapeamento do separador ativo é alargado.

### 7.2 Separador "Avaliar"

```text
[ + Nova avaliação ]  [ ⧉ Repetir última ]

Última avaliação · 04/11/2026
 CMJ                 34,5 cm   ▲ +2,1
 Knee to Wall   E 8,5  D 10,5  19% ▲
 Sprint 10 m          1,84 s   ▲ −0,06

Avaliações
 ☐ 04/11/2026  Pré-época         12 testes
 ☐ 02/09/2026  Inicial            9 testes
[ Comparar selecionadas ]
```

"Repetir última" copia a lista de testes **sem valores**, usando as versões atuais.

### 7.3 Registo no ginásio

```text
← 04/11/2026 · Pré-época                  guardado ✓
[ Bateria ▾ ]  [ + Teste ]

Knee to Wall · cm                              ⓘ
        1      2      3
 E    [8,5]  [8,0]  [   ]     final 8,5
 D   [10,5] [10,0]  [   ]     final 10,5
 Assimetria 19% · direito melhor
 Anterior: E 8,0  D 10,0
```

- Os campos usam `inputMode="decimal"`, com `num()` para aceitar vírgula.
- O botão "válida" por baixo de cada campo marca a tentativa como inválida. Um toque longo chocaria com a seleção de texto do telemóvel.
- `ⓘ` abre a ficha técnica do teste.
- Em escala, os campos são botões (0, 1, 2, 3).
- Guarda ao sair do campo, como a ficha do atleta.

### 7.4 Evolução e comparação

**Evolução:** `LineChart` com esquerda e direita sobrepostas, valor inicial, atual e objetivo, progresso e assimetria por data. Abaixo, a lista de avaliações com condições.

**`LineChart`:** ganha `second?: Point[]` opcional. A escala passa a considerar as duas séries. Hoje devolve `null` com menos de dois pontos, por isso o ecrã mostra texto nesse caso.

**Comparação:** uma linha por teste, com valores das duas datas, diferença e indicação de melhoria. Os testes só de uma das avaliações aparecem no fim.

### 7.5 Biblioteca de testes

Lista por categoria com pesquisa, grupos em chips e editor com a ficha técnica completa. Nos testes de base, a edição fica no registo do próprio utilizador, como acontece com os exercícios.

## 8. Testes de base

Seguem o padrão de `seed.ts`: id fixo (`seed-test-…`), `updatedAt: 1`, `SEED_VERSION` 4.

| Categoria | Testes |
|---|---|
| Antropometria | Peso, perímetro da cintura, % de massa gorda |
| Mobilidade | Knee to Wall\*, Thomas Test\*, rotação interna da anca\*, flexão do ombro\* |
| Estabilidade | Single Leg Balance\*, Y-Balance anterior\*, posteromedial\*, posterolateral\* |
| Movimento | Overhead Squat, Single Leg Squat\*, Lunge\* |
| Força | Handgrip\*, dinamometria unilateral\* |
| Potência | CMJ, CMJ unilateral\*, Squat Jump, salto horizontal |
| Velocidade | Sprint 5 m, 10 m, 20 m |
| Agilidade | 505\*, T-Test |
| Resistência | Yo-Yo IR1, Cooper |
| Grupo "FMS" | Os 7 padrões, escala 0–3, 5 deles por lado |

\* Medido por lado.

Os textos são escritos por nós e curtos. FMS é um sistema proprietário: guardamos os nomes dos padrões e a pontuação, sem reproduzir o manual. Convém rever a licença antes de a app ser usada comercialmente, e o conteúdo técnico deve ser validado pelo treinador.

## 9. Mínimos de RGPD

Isto reduz riscos, mas não substitui validação jurídica.

- **Consentimento:** `consentAt` na ficha, com aviso visível ao criar uma avaliação sem consentimento. Não bloqueia.
- **Apagamento:** hoje `remove()` mantém os dados no tombstone, tanto no dispositivo como no D1, e apagar o cliente deixa as sessões guardadas. Novo `purgeClient(id)` substitui cliente, sessões e avaliações por tombstones vazios. Tem de manter os `DEFAULTS` da tabela, porque `mergeExercises` percorre sessões apagadas e `s.blocks` não pode faltar. Os `DEFAULTS` passam de `sync.ts` para `db.ts`.
- **Portabilidade:** exportar um atleta em JSON, a partir da ficha.
- **Sem multimédia:** não há upload de fotografias nem vídeo. `demoUrl` é só um link.
- **Limites conhecidos:** o apagamento não chega aos backups em `exports/` nem à recuperação do próprio D1. Com um único utilizador, não há registo de acessos.

O botão "Apagar cliente" mantém-se e não apaga conteúdo. Clientes apagados assim antes de existir `purgeClient` deixam de ter ecrã, por isso os dados deles só saem por intervenção direta na base de dados.

## 10. Plano de implementação

Cada passo pode ser publicado sozinho.

| # | Passo | Ficheiros principais |
|---|---|---|
| 1 | Migração e `KINDS`; publicar a API | `migrations/0003_*.sql`, `coach-api/src/index.ts` |
| 2 | Tipos, Dexie v4, sync, backup, hooks | `types.ts`, `db.ts`, `sync.ts`, `hooks.ts` |
| 3 | Cálculos com testes | `lib/assessment.ts`, `assessment.test.ts` |
| 4 | Testes de base e biblioteca | `seed.ts`, `seedTests.ts`, `TestsPage.tsx` |
| 5 | Registo e separador "Avaliar" | `AssessmentPage.tsx`, `AssessmentsTab.tsx`, `ClientPage.tsx` |
| 6 | Evolução e comparação | `EvolutionPage.tsx`, `ComparePage.tsx`, `LineChart.tsx` |
| 7 | Ficha alargada, RGPD (o objetivo por teste ficou no ecrã de evolução) | `ClientPage.tsx`, `db.ts` |

## 10.1 Atleta fictício "Teste"

`seedDemo.ts` cria um futebolista inventado, igual em todos os dispositivos: 7 avaliações entre setembro de 2025 e novembro de 2026 e duas sessões por semana, com uma entorse em março de 2026 e assimetria persistente na abdução da anca. Depois de publicado, sincroniza como qualquer cliente. Para o remover, usa "Apagar definitivamente": não volta a ser criado.

## 11. Verificação

**Automática (`assessment.test.ts`):**

- `best` em `higher`, `lower` e `neutral`; tentativas inválidas e vazias.
- Assimetria com tempos: o lado mais rápido é o melhor.
- Escala ordinal sem %, um lado em falta, valores negativos, zeros.
- Evolução com inicial 0; objetivo igual ao inicial; objetivo nos dois sentidos.
- Mudança de versão separa séries e impede a diferença na comparação.
- Editar um teste não altera resultados antigos.

**Manual, com API local e base de dados temporária:** feito em 04/11/2026, à exceção do telemóvel físico.

- Com a app antiga aberta, criar avaliações no outro perfil, atualizar e confirmar que chegam.
- Criar uma avaliação offline, voltar a ligar e confirmar a sincronização.
- Fazer `purgeClient` e confirmar no D1 que os dados saíram e que `mergeExercises` continua a funcionar.
- Registar uma avaliação num telemóvel a 375 px.

## 12. Critérios de conclusão

- [ ] Criar um teste novo sem intervenção de programadores.
- [ ] Registar resultados bilaterais, com várias tentativas e tentativas inválidas.
- [ ] Comparar avaliações de duas datas.
- [ ] Calcular assimetrias de acordo com o tipo de teste.
- [ ] Ver a evolução por lado, com objetivo.
- [ ] Nunca comparar versões diferentes de um protocolo como se fossem iguais.
- [ ] Funcionar sem rede e sincronizar depois.
- [ ] Apagar e exportar os dados de um atleta.
