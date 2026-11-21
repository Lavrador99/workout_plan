# Fase 8 — Simplificação

Desenho técnico para a app `coach-web`. Estado: implementado (ver §13 para o que mudou em relação ao desenho), validado com o treinador (36 decisões, Q1–Q36). As baterias de Hyrox, ATHX e jovens passam para a [Fase 9](fase-9-baterias.md).

Objetivo: cada dado escreve-se num só sítio, cada pergunta tem uma só resposta na app, e sai o que ninguém usa. Os termos seguem o [glossário](../GLOSSARY.md): Balanço, Marca, Objetivo, Motivo, Perfil, Assimetria, Antagonista, músculo principal/secundário.

**Regra para tudo o que sai:** os dados já guardados passam para o sítio novo antes de o campo deixar de ser usado. Nada se perde em silêncio.

## 1. O que sai

| O quê | Onde está | Decisão |
|---|---|---|
| App antiga (`apps/treino-web`, `apps/treino-api`) | Independente da `coach-web` (verificado: sem imports, sem chamadas) | Q4, Q17 |
| `docker/`, `docker-compose.yml`, `treino_autosave.json`, `_index_backup.html`, `make_icons.py`, scripts `dev`/`build:api`/`serve:api`/`preview`/`docker:*` do `package.json` | Raiz | Q17. Cada ficheiro só sai depois de confirmar que a `coach-web` não depende dele |
| Índice de progresso (IPI) | `lib/ipi.ts`, `ProgressCard`, `ProgressPage`, `ProgressSheet`, `PRIMARY_GOALS` e pesos em `lib/progress.ts`, registo `snapshot` | Q6. Ver §2 |
| Secção Volume do Balanço | `BalanceTab.tsx` | Q15. As Contagens mostram o mesmo |
| Pegas e posição dos pés nas Contagens | `CountsView.tsx` | Q23. Os campos continuam no exercício da sessão |
| Campos do cliente que nada lê | `birthYear` editável (fica a data), `heightCm`, `dominantHand`, `dominantFoot`, `sportYears`, `position`, `goals` (chips) | Q9 |
| `Guardian.consentAt` (nunca recebe valor) | `types.ts` | Inventário |
| Contador da Biblioteca na navegação | `App.tsx` (`toReview`) | Q24. O filtro "Por rever" fica |
| Módulos sem ficha no passo "Perfil e módulos" | `MODULE_NAMES` | Q8. Só aparece o que está em `MODULES` |
| Código sem uso | `useScreening`, `nameSimilarity` | Inventário. O `nextScreening` passa a ser usado (§4.4) |

Os campos que saem do formulário ficam no tipo, marcados como antigos e só lidos por migrações, como já se faz com `targets` e `consentAt`.

## 2. Índice de progresso

Sai por inteiro.

- O Balanço passa a ser o único resumo de progresso: período, ganhos e perdas, marcas de treino, adesão e objetivos.
- A Evolução de um teste e Comparar ficam.
- O registo `snapshot` deixa de ser escrito e lido:
  - sai de `TABLES` no `sync.ts`;
  - a tabela local `snapshots` é removida numa versão nova do Dexie;
  - na API, `KINDS` continua a aceitar `snapshot`, para um aparelho desatualizado não ver o envio rejeitado;
  - as linhas no servidor ficam, sem uso.
- `Client.primaryGoal`, `weights` e `weightLog` passam a campos antigos.
- O `CountsView`, o `BalanceTab` e os objetivos (`testGoal`, `targetsOf`, `metricProgress`) não dependem do IPI e ficam.

## 3. Uma só fonte para cada dado

O onboarding é a única entrada para os dados das Fichas 1 e 2 (Q2). A ficha do cliente mostra e liga.

### 3.1 Ficha do cliente (Q9, Q21)

| Linha | Passa a |
|---|---|
| Dados pessoais | Resumo: idade, sexo, telefone, email. "Editar" abre o passo 1 do onboarding |
| Pagamentos | Fica como está |
| Treino e objetivos | Dias planeados, o que conta para a adesão, nível e perfis. Saem os anos de prática, a posição e os chips de objetivo |
| Índice de progresso | Sai (§2) |
| Ficha geral | Decisão e data; abre a triagem |
| Saúde e cuidados | FC máx e ritmo de limiar. A FC de repouso passa a vir da última medição em repouso do onboarding |
| Notas e records | Passa a "Notas" (Q7) |
| Consentimento e dados | Fica como está |

- No topo do separador Ficha há **um botão**: "Avaliação inicial", ou "Reavaliação" depois da primeira (§4.4).
- `Client.hrRest` continua a alimentar as zonas de corrida. Passa a ser **deduzido** da última `Vitals` em repouso, quando existe.
- A **altura** vem do último resultado do teste Altura. O `heightCm` passa a antigo.

### 3.2 Lesões (Q10)

- Fica só `Screening.injuries`, a lista estruturada.
- O aviso da ficha, a Home, a lista de clientes e o filtro "Com lesão" passam a ler as lesões ativas ou em recuperação da última ficha geral. A função partilhada é `activeInjuries(screenings)`.
- **Migração:** o `Client.injuries` de cada cliente passa para a última ficha geral (criada se não houver) como uma lesão `{ region: "Outra", status: "active", aggravates: <texto> }`. Depois disso, o campo passa a antigo.

### 3.3 Frequência e dias (Q9)

- O passo 8 do onboarding deixa de ter "Sessões por semana" e passa a escrever `Client.weeklyFrequency` e `Client.schedule`, os que a adesão, a agenda e as Finanças já usam.
- O `Screening.sessionsPerWeek` passa a antigo. A pergunta de confiança lê o `weeklyFrequency`.

### 3.4 Objetivo e Motivo (Q11, Q20)

- **Objetivo:** os registos `Goal`. Criam-se e editam-se só no Balanço ("+ Objetivo").
  - A Evolução de um teste mostra o objetivo, com uma ligação para o Balanço.
  - O "+ Objetivo" aparece sempre, mesmo num período sem dados.
- **Motivo:** o `Screening.mainGoal`, que no onboarding passa a ter a etiqueta "O que quer conseguir (nas palavras do cliente)", e o "o que quer voltar a fazer" da Ficha 2.
- Os chips `Client.goals` saem (§1).

### 3.5 Relatório (Q19)

- O texto (prioridades, plano, mensagem) escreve-se só na página do relatório.
- O passo Resultado do módulo mostra o semáforo, "Só para ti" e as prioridades sugeridas, com um botão "Escrever relatório". As sugestões passam para o relatório quando ele ainda não tem prioridades.

## 4. Avaliações

### 4.1 Condições estruturadas (Q13)

- O editor de qualquer avaliação usa os campos do passo 4 do onboarding (componente partilhado).
- A Evolução de um teste mostra um resumo das condições: hora, local, superfície, calçado e estado geral.
- O texto antigo de `conditions` fica como nota, só de leitura, nas avaliações que o têm.

### 4.2 Lista com o tipo (Q14)

- Cada avaliação mostra uma etiqueta: **Ficha geral**, **o nome do módulo** ou **Livre**.
- "Repetir última" mantém o `moduleId` e o `moduleData.intake` da original.

### 4.3 Uma entrada (Q21)

Ver §3.1. A ligação "Autorização médica pendente" e o "Editar autorizações" continuam a abrir os seus passos.

### 4.4 Reavaliação cria registos novos (Q12)

O botão "Reavaliação":
- cria uma ficha geral nova com `nextScreening`: as mesmas respostas, sem decisão;
- cria uma avaliação "Ficha geral" nova, vazia;
- cria uma avaliação nova por módulo ativo, com os mesmos testes, vazios (`repeatResults`).

O onboarding edita sempre os registos **mais recentes**, e os antigos ficam intactos para o Balanço e para Comparar.

## 5. Clientes de exemplo (Q5, Q18)

- **Desligados por omissão:** os 5 clientes de exemplo ("Teste" e os 4 de Força e Equilíbrio) só existem com a opção "Mostrar clientes de exemplo" das Definições ligada. É uma preferência local, do aparelho.
- **Nunca sincronizam:** os registos de exemplo são os do cliente e os que lhe pertencem, por `clientId`. Os ids têm o prefixo `seed-demo` ou `seed-fe`. O `sync.ts` não os envia nem os recebe.
- **Limpeza no servidor:** na primeira sincronização depois da atualização, os registos de exemplo que lá estejam recebem um apagamento (o mesmo do "Apagar definitivamente"). A partir daí passam a ser ignorados.
- **Ligar e desligar:** ligar cria-os localmente, mesmo que antes tenham sido apagados. Desligar apaga-os localmente.
- O "Repor exercícios e templates base" deixa de mexer nos clientes de exemplo.

## 6. Exercícios

### 6.1 Português como nome principal (Q27)

- **Migração:** quando há `pt`, `name` passa a ser o português e o inglês entra em `aliases`. O `pt` passa a antigo.
- **Biblioteca base:** o `seedData.ts` passa a escrever "Português | English | sinónimos". Os exercícios base sem português são traduzidos no código.
- **Nome nas sessões:** o nome mostrado de um exercício numa sessão vem da biblioteca pelo `exerciseId`, com `displayName(item, exercises)`. Vale para a sessão, o treino ao vivo, o grupo, o histórico, as marcas, o texto copiado e partilhado e o relatório. O `item.name` só se mostra quando o item não está ligado à biblioteca.
- **Pesquisa e Importar:** continuam a reconhecer o inglês, pelos sinónimos.

### 6.2 Principais e secundários (Q29, Q30)

```ts
// Exercise
primaryMuscles?: string[];   // up to 3, from the muscle catalog
secondaryMuscles?: string[];
primaryPattern?: string | null;
patterns?: string[];         // secondary ones
confirmed?: boolean;         // the coach (or a classified import) settled them
```

- Sem valores escritos, a app deduz pelo nome, como hoje (`movement.ts`), e mostra "sugerido". O exercício fica no filtro **"Por rever"** até o treinador confirmar com um toque.
- **Biblioteca base:** classificada no código, já confirmada. As marcas `#1`–`#4` por músculo que o seed já tem ajudam a escolher os principais.
- **Migração:** os `muscles` e `patterns` escritos pelo treinador ficam confirmados. Os 3 primeiros músculos passam a principais. Com mais de 3, o exercício vai para "Por rever".
- **Contagens:** cada série conta **1** para os músculos e o padrão principais e **0,5** para os secundários.

### 6.3 Tradução por CSV (Q28)

- O "Exportar CSV" passa a incluir: `id`, nome, sinónimos, padrão principal, padrões secundários, músculos principais e músculos secundários.
- O treinador envia o CSV; o Claude devolve-o traduzido e classificado.
- **"Importar CSV"** (novo, na Biblioteca):
  - associa cada linha pelo `id`;
  - só preenche campos e nunca apaga nada;
  - mostra um resumo antes de gravar;
  - marca como confirmado o que vem classificado.
- Os exercícios que ficam sem nome português aparecem no filtro **"Sem português"**.

## 7. Assimetrias e antagonistas

- **Músculo e lado (Q32):** um perfil de Assimetria tem sempre músculos do catálogo e o lado mais fraco, escolhidos no editor. A dedução do lado pelo nome (`focusSide` a partir do nome) passa a ser só uma migração, que corre uma vez.
- **Testes com músculos (Q33):** o campo de músculos fica no editor de testes, e os testes base medidos por lado são classificados (abdução da anca, handgrip, Y-Balance, unipodal, sentado e alcançar…). A vista de cada assimetria mostra a última diferença entre lados de cada teste desses músculos, com a evolução, e sem limites automáticos.
- **Correção por lado (Q34):** as séries extra por lado ficam, dentro de cada assimetria nas Contagens.
- **Antagonistas (Q35, Q36):** lista fixa em `movement.ts`:

  | Músculo | Antagonista |
  |---|---|
  | Glúteo médio / glúteo mínimo | Adutores |
  | Quadríceps | Isquiotibiais |
  | Ílio-psoas | Glúteo máximo |
  | Tibial anterior | Gémeos e sóleo |
  | Fibulares | Tibial posterior |
  | Reto do abdómen | Eretores da espinha |
  | Peitoral maior | Grande dorsal e romboides |
  | Bíceps braquial | Tríceps braquial |
  | Flexores do antebraço | Extensores do antebraço |
  | Deltoides | Grande dorsal |
  | Serrátil anterior | Romboides |
  | Oblíquos | Oblíquos do outro lado |
  | Quadrado lombar | Quadrado lombar do outro lado |

- **Vista da assimetria nas Contagens:**
  - **Volume (sempre):** séries por semana do músculo e do antagonista, por lado, com a razão. As séries bilaterais contam para os dois lados e as séries extra só para o seu. Aplica-se o peso de principal e secundário (§6.2).
  - **Força (quando há testes dos dois, medidos por lado):** a razão entre o último teste do músculo e o do antagonista, por lado. Por exemplo, abdução:adução da anca.

## 8. Pequenas mudanças

- **"Progressão" na sessão** passa a **"Subir cargas"** (Q15).
- **✓ da Home:** a sessão fechada sem séries mostra "Feito, sem séries registadas" (Q16).
- **Ficam como estão:**
  - o Importar (Q22);
  - os três tipos de Perfil (Q26);
  - a base da app do cliente e do ecrã (Q25);
  - "Registar pagamento" em 3 sítios, o cartão de instalação em 2 e os 5 caminhos para copiar sessões (Q15).

## 9. Erros a corrigir

1. **Séries extra no treino ao vivo:** não se selecionam ao tocar.
2. **Ano de nascimento:** a migração volta a pôr o ano pela data de nascimento, desfazendo a mudança feita na ficha. Fica resolvido com §3.1, porque o ano deixa de ser editável, mas a migração passa a correr uma só vez.
3. **"Repor exercícios":** recria os clientes de exemplo (§5).
4. **Migrações:** `migrateTargets`, `migrateSideNotes` e `migrateClients` correm em cada arranque e depois de cada sincronização. Passam a correr uma vez, com uma versão guardada em `meta`, como o `seedVersion`. Voltam a correr depois de um pull que traga registos de uma versão antiga.

## 10. Publicação e endereço

- **Build:** o `npm run build` passa a construir só a `coach-web` (para `dist/coach`) e a copiar um `index.html` de redireccionamento para `dist/`. Esse ficheiro está versionado na pasta `site/`. Assim a raiz do GitHub Pages (`/workout_plan/`) leva para `/workout_plan/coach/`.
- **Workflow:** o `.github/workflows/deploy.yml` não muda: continua a publicar `dist`.
- **API:** não há tipos de registo novos nem migrações SQL. A remoção dos exemplos no servidor usa os apagamentos normais da sincronização.

## 11. Passos

Um commit por passo, com typecheck e testes em cada um:

1. **Erros:** §9.
2. **App antiga:** sai, com o redireccionamento (§1, §10).
3. **IPI:** sai (§2).
4. **Uma só fonte:** ficha do cliente, lesões, frequência, FC, objetivos, relatório e entradas (§3).
5. **Avaliações:** condições estruturadas, tipo, reavaliação (§4).
6. **Clientes de exemplo:** fora da sincronização (§5).
7. **Exercícios:** português, principais e secundários, sugestões, CSV (§6).
8. **Assimetrias e antagonistas:** nas Contagens (§7).
9. **Pequenas mudanças:** §8 e o resto do §1.

## 12. Por confirmar

- A tradução e a classificação dos exercícios do treinador dependem do CSV que ele enviar (§6.3).
- A lista de antagonistas é fixa no código. Pares novos entram por pedido do treinador.

## 13. Notas da implementação

- **Nome nas sessões (§6):** em vez de um `displayName` em cada ecrã, uma migração muda o nome dos itens ligados à biblioteca (sessões e modelos) quando estavam escritos com um dos nomes do exercício. Uma variante escrita de outra forma fica como estava.
- **Filtro "Sem português":** é uma heurística por palavras, não uma deteção de língua; pode deixar passar ou marcar a mais.
- **Dependências da app antiga:** as do NestJS ficam no `package.json` para não regenerar o lockfile, que já partiu a CI antes. Saem quando se regenerar com calma.
- **Service worker da raiz:** o `site/sw.js` substitui o da app antiga, apaga as caches que não são da `/coach/` e desregista-se.
- **`nameSimilarity`:** fica. Só o teste o usa, mas é por ele que se testa a regra dos nomes iguais.
- **Volume nas Assimetrias:** as séries são as do período escolhido nas Contagens (por semana quando o período é a semana); a razão não depende do período.
- **Força nas Assimetrias:** só compara testes da categoria força com a mesma unidade, do mesmo dia ou não; o primeiro teste do músculo que tem par no antagonista é o usado.
- **Testes base classificados:** além dos que já tinham músculos, rotação interna da anca, Lunge, CMJ unilateral, 505, FMS por lado, apoio unipodal, sentado e alcançar e alcançar atrás das costas.
