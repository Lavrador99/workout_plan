# Fase 4 — Ecrã de grupo e app do cliente

Desenho técnico. Estado: **4.0 publicada** (lib partilhada, ops ao vivo, `POST /live/ops`, migração 0004). **4.1a implementada** (sessão de grupo na `coach-web`, gravação por ops), por publicar. 4.1b em diante por fazer.

Duas funcionalidades novas sobre a mesma base:

1. **Ecrã de grupo** — o PT treina 4 pessoas ao mesmo tempo, cada uma com o seu plano, e envia os 4 planos para um ecrã (TV, tablet, PC do ginásio), com os dados de cada um em tempo real.
2. **App do cliente** — cada cliente tem o seu espaço para ver e seguir o plano, e marcar o que fez.

As duas obrigam a mudar a mesma coisa: hoje a API tem **um só utilizador** (o coach, com uma chave) e grava **sessões inteiras** (o último a escrever ganha). Com o ecrã e os clientes há vários leitores e vários escritores na mesma sessão. Por isso a Fase 4 começa pela base (4.0) e só depois faz as duas funcionalidades.

---

## 1. Aplicações

| App | Para quem | Onde | Novo? |
|---|---|---|---|
| `coach-web` | PT | `/coach/` | Já existe. Ganha "Sessão de grupo", "Enviar para ecrã" e "Convidar cliente". |
| `client-web` | Clientes **e** ecrã | `/cliente/` | **Novo.** PWA com dois modos: Atleta (`#/`) e Ecrã (`#/ecra`). |
| `coach-api` | Todas | Cloudflare Worker + D1 | Já existe. Ganha papéis, acessos por cliente e rotas de ao vivo. |
| `libs/training-core` | Código partilhado | — | **Novo.** Tipos e lógica pura usados pelas duas apps. |

**Porquê o ecrã dentro da `client-web` e não numa terceira app:** os dois são "o lado de fora" — leem dados limitados com uma chave limitada, mostram o plano de forma grande e simples, e usam os mesmos componentes de leitura. Uma app a menos para publicar. O modo Ecrã não pede instalação (funciona no browser de uma TV).

**Porquê não juntar tudo na `coach-web`:** a app do coach tem finanças, notas privadas, avaliações e a biblioteca toda. Separar as apps reduz o que o cliente descarrega e, sobretudo, garante que o código do cliente nunca tem acesso a esses dados.

### 1.1 Código partilhado (`libs/training-core`)

Passam da `coach-web` para a lib, sem alterações de comportamento (só imports):

- `types.ts` (Session, Block, Item, SetRow…)
- `live.ts` (ordem dos passos, marcar, editar sets, descanso)
- `format.ts`, `text.ts`, `run.ts`, `rx.ts`

Alias `@treino/core` em `tsconfig.base.json` e no `vite.config.ts` das duas apps. Os testes destes ficheiros vão com eles. Os componentes React (LiveView, CircuitTimer) ficam na `coach-web` por agora; a `client-web` tem a sua versão, mais simples. Só se partilham se ficarem iguais.

---

## 2. Base (4.0)

### 2.1 Papéis e chaves

Três tipos de chave, todas guardadas na D1 **apenas como hash** (SHA-256); a chave em claro só existe no dispositivo.

| Papel | Como obtém a chave | Vê | Escreve |
|---|---|---|---|
| `coach` | A `SYNC_TOKEN` atual (sem mudanças para o coach) | Tudo | Tudo |
| `client` | Convite do coach (link/QR) trocado por chave de dispositivo | Só os seus registos, filtrados | Só o progresso das suas sessões |
| `screen` | Emparelhamento com código no ecrã | Só o estado ao vivo do grupo que lhe foi enviado | Nada |

Nova tabela:

```sql
CREATE TABLE access (
  token_hash  TEXT PRIMARY KEY,
  role        TEXT NOT NULL,          -- 'client' | 'screen'
  client_id   TEXT,                   -- role = client
  screen_id   TEXT,                   -- role = screen
  label       TEXT NOT NULL,          -- "iPhone da Ana", "TV sala 2"
  created_at  INTEGER NOT NULL,
  last_seen   INTEGER,
  revoked     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE invites (
  code_hash   TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,       -- 7 dias
  used_at     INTEGER
);
```

O coach vê na ficha do cliente os dispositivos ligados e pode **revogar** cada um.

### 2.2 Registos por cliente

`records` ganha `client_id` (lido de `data.clientId` ao gravar; `NULL` em exercícios, testes, templates) e um índice `(client_id, seq)`. Assim `GET /me/sync` filtra no SQL, sem ler JSON.

Migração `0004_client_access.sql`: adiciona a coluna, preenche com `json_extract(data, '$.clientId')`, cria o índice e a tabela `access`. A tabela `invites` entra com as rotas de convite, na 4.2.

### 2.3 O que o cliente pode ver (projeção)

O servidor nunca envia o registo inteiro ao cliente. Envia uma projeção:

| Registo | O cliente recebe | Fica de fora |
|---|---|---|
| `client` (a sua ficha) | nome, `schedule`, objetivo principal | notas, lesões, pagamentos, mensalidade, contactos, pesos do IPI |
| `session` | tudo exceto `privateNotes` | `privateNotes` (campo novo, ver §7) |
| `goal` | título, alvo, estado, prazo | — |
| `exercise` | só os usados nas suas sessões: nome, `pt`, `demoUrl` | aliases, tags, padrões |
| `assessment`, `snapshot` | na Fase 4.3, a decidir (§7) | — |

A projeção vive numa função da API (`project(kind, data)`), com teste próprio. É aqui que se garante a privacidade, não na app.

### 2.4 Progresso por set, não por sessão

**O problema:** hoje, se o coach marca o set 2 no telemóvel e a cliente marca o set 3 no dela ao mesmo tempo, cada um grava a sessão inteira e uma das marcações perde-se. Com 4 pessoas e um ecrã isto acontece todos os treinos.

**A solução:** durante o treino, o que se envia são **operações pequenas**, não a sessão (`libs/training-core/src/ops.ts`):

```ts
type LiveOp = { sessionId: string; at: number } & (
  | { op: "set"; item: string; si: number; field: "done" | "reps" | "load" | "rir" | "duration"; value: number | boolean | null }
  | { op: "addSet"; item: string; si: number }        // si = índice que o set novo fica a ter
  | { op: "cursor"; step: Step | null; restUntil: number | null }
  | { op: "start" } | { op: "end" });
```

- O exercício é encontrado pelo **id do item**, não pela posição: se o coach reordenar blocos a meio, a op cai no exercício certo.
- Cada `SetRow` guarda `at` **por campo** (`{ done: t1, load: t2 }`). Uma op mais antiga do que o `at` desse campo é ignorada. O coach a mudar a carga e a cliente a marcar "feito" no mesmo set ficam os dois.
- Aplicar uma op é **idempotente** (a mesma op duas vezes não muda nada; dois "mais um set" ao mesmo tempo acrescentam um), por isso não é preciso id por op nem quem a fez — o autor sai da chave.
- `diffOps(antes, depois, at)` gera as ops a partir do que as funções de `live.ts` já fazem; devolve `null` quando a mudança não é só de sets (trocar exercício, apagar set, editar notas) — essa grava-se como sessão inteira, só pelo coach.
- `POST /live/ops` valida cada op (`parseOp`, só campos conhecidos e valores com limites), aplica à sessão guardada no servidor e grava com `seq` e `updated_at` novos — a sincronização normal da `coach-web` recebe o resultado. A escrita é otimista: só grava se ninguém escreveu a sessão desde que a leu; senão lê de novo (3 tentativas).

**Na `coach-web` (4.1a):** `lib/sessionSave.ts` grava cada alteração de uma sessão já no servidor como ops (fila `ops` na IndexedDB), que saem 300 ms depois, antes do pull. A cópia local mantém o `updatedAt` do servidor: no pull, a versão do servidor substitui-a e as ops ainda por enviar são aplicadas por cima. Uma sessão ainda não enviada (`dirty`), uma mudança que não é só de sets, ou sincronização desligada → sessão inteira, como antes. Op recusada pela API (sessão em falta, op inválida) → a sessão vai inteira no push seguinte.

Fora do treino ao vivo (o coach a editar o plano), continua a gravação da sessão inteira. Enquanto uma sessão tem `startedAt` e não tem `endedAt`, a `coach-web` usa ops para os sets.

**Cursor no registo:** o set atual e o fim do descanso deixam de ser só estado do ecrã do telemóvel (`useState` em `LiveView`) e passam a `Session.live = { step, restUntil, updatedAt }`, para o ecrã e a cliente verem o mesmo.

---

## 3. Ecrã de grupo (4.1)

Não precisa de contas de clientes: só o coach escreve. É a parte que dá valor mais depressa.

### 3.1 Fluxo

1. **No ecrã** (TV/tablet): abre `…/cliente/#/ecra`. Mostra um código de 6 caracteres e um QR. O ecrã fica à espera (pergunta à API a cada 3 s).
2. **No telemóvel do coach**, em Hoje: seleciona várias pessoas (ou "Sessão de grupo" → escolhe clientes) → abre a **sessão de grupo** com a sessão de hoje de cada uma (cria a partir do template/plano se não houver).
3. "Enviar para ecrã" → lê o QR ou escreve o código. A API liga o ecrã a um registo `screen`:

```ts
interface Screen extends SyncMeta {
  name: string;              // "Sala 2"
  sessionIds: string[];      // 1 a 6, por ordem
  layout: "auto" | "focus";  // grelha, ou uma pessoa em grande
  focusId?: string | null;
  endedAt?: number | null;
}
```

4. O ecrã fica emparelhado (guarda a chave). Da próxima vez, o coach só escolhe o ecrã na lista ("TV sala 2"), sem código.

### 3.2 O que o ecrã mostra

Grelha automática: 1 pessoa = ecrã inteiro, 2 = colunas, 3–4 = 2×2, 5–6 = 3×2. Por pessoa:

- Nome e cor (para se encontrar de longe)
- Exercício atual, em grande; o seguinte, pequeno
- Set X de Y, reps, carga, RIR/RPE, tempo
- Descanso: contagem decrescente grande, a partir de `live.restUntil`
- Circuito/EMOM/AMRAP: o temporizador do bloco
- Barra de progresso da sessão (sets feitos / total)
- Ao terminar: "Concluído" com o volume da sessão

Regras de leitura à distância: texto mínimo 32 px em 1080p, alto contraste, sem nada clicável, ecrã sempre ligado (Wake Lock, como já faz a `LiveView`). O relógio vem do servidor (`serverTime` em cada resposta) para os descansos baterem certo entre o telemóvel e a TV.

### 3.3 Sessão de grupo na `coach-web`

A `LiveView` atual passa a aceitar várias sessões:

- No topo, uma fila de "chips" — uma por pessoa, com o próximo set e o descanso a contar. Tocar troca de pessoa.
- Ao marcar um set, a app passa sozinha à pessoa que vai acabar o descanso primeiro (opcional, ligado por defeito).
- Por baixo, a vista atual, igual, para a pessoa escolhida.
- O estado de cada sessão continua a ser a `Session`; a sessão de grupo é só uma lista de ids (o registo `screen`, mesmo sem ecrã ligado).

### 3.4 Tempo real

| Opção | Atraso | Custo | Complexidade |
|---|---|---|---|
| **A. Pergunta a cada 2 s** (`GET /screen/state`) | ≤ 2 s | 1 800 leituras/hora por ecrã — cabe com folga no plano grátis da D1 (5 M/dia) | Baixa, igual ao que já existe |
| B. Durable Object por ecrã com WebSocket | ~100 ms | Grátis até ao limite do plano | Média: novo binding, ligação a manter |

**Escolha: A** para começar. `GET /screen/state` responde com a projeção pronta a mostrar (não as sessões inteiras), com `ETag`: se nada mudou devolve `304` e o ecrã não redesenha. Passar para B só se 2 s se notar no treino; a resposta mantém o mesmo formato, só muda o transporte.

Do lado do coach, as ops saem logo (sem os 3 s de espera da sincronização atual), em fila local: sem rede ficam guardadas e seguem quando voltar.

---

## 4. App do cliente (4.2 e 4.3)

### 4.1 Entrada

1. Na ficha do cliente (`coach-web`): "Convidar para a app" → link `…/cliente/#/entrar?c=<código>` + QR, válido 7 dias, uma só utilização. Partilha por WhatsApp/SMS com o botão de partilha do sistema.
2. O cliente abre, vê "Olá, Ana — o teu treinador é …", confirma. A API troca o código por uma chave de dispositivo. Sem palavras-passe, sem email.
3. Perdeu o telemóvel → o coach revoga e envia novo convite.

Exige `consentAt` preenchido na ficha (o consentimento de dados já existe).

### 4.2 Ecrãs (4.2 — só leitura)

| Ecrã | Conteúdo |
|---|---|
| **Hoje** | Treino de hoje (ou o próximo), com dias da semana do `schedule`. Botão "Começar". |
| **Plano** | Sessões futuras e da semana. |
| **Histórico** | Sessões feitas; por exercício, a evolução da carga (reutiliza `history.ts`). |
| **Objetivos** | Os seus objetivos e estado. |

Funciona sem rede como a `coach-web`: Dexie local + `GET /me/sync?since=` (o mesmo protocolo da sincronização atual, só com a projeção).

### 4.3 Seguir o treino (4.3 — escreve)

- "Começar" abre a vista ao vivo do cliente: um set de cada vez, botão grande "Feito", editar reps/carga/RIR, descanso com aviso sonoro/vibração. Reutiliza `live.ts`.
- Envia `LiveOp` para `POST /live/ops`. A API só aceita ops de sessões do próprio cliente, e só os campos da tabela em §2.4 — nunca muda exercícios, blocos ou notas.
- Se o coach estiver na mesma sessão (treino presencial), os dois veem as marcações um do outro em ≤ 2 s e o ecrã também.
- No fim: sensação geral (RPE da sessão 1–10) e nota livre para o coach → campo `clientFeedback` na sessão.
- Treino sozinho (sem o coach): o mesmo fluxo; o coach vê na `coach-web` quando sincronizar.

---

## 5. Rotas novas da API

| Rota | Papel | Função |
|---|---|---|
| `POST /invites` | coach | Cria convite → `{ code, url, expiresAt }` |
| `POST /join` | — | `{ code, label }` → `{ token, clientId }` |
| `GET /access` · `DELETE /access/:hash` | coach | Lista e revoga dispositivos |
| `GET /me/sync?since=` | client | Registos do próprio, projetados |
| `POST /live/ops` | coach, client | Aplica ops a sessões (validadas por papel) |
| `POST /screens/pair` | — (ecrã) | Pede código → `{ code, pairId }` |
| `GET /screens/pair/:pairId` | — (ecrã) | Espera emparelhamento → `{ token }` quando o coach confirmar |
| `POST /screens/claim` | coach | `{ code, screenId }` liga o ecrã ao grupo |
| `GET /screen/state` | screen | Estado pronto a mostrar, com `ETag` e `serverTime` |

As rotas `/sync` atuais não mudam. Limite de pedidos por chave nas rotas abertas (`/join`, `/screens/pair`): os códigos são curtos, por isso 10 tentativas/minuto por IP e códigos que expiram em 10 min (ecrã) / 7 dias (convite).

---

## 6. Ordem de implementação

| Passo | Entrega | Depende de |
|---|---|---|
| **4.0a** | `libs/training-core` (mover ficheiros, aliases, testes a passar) | — |
| **4.0b** | `SetRow.at`, `Session.live`, `LiveOp` e aplicação de ops na lib, com testes | 4.0a |
| **4.0c** | API: migração 0004, papéis, `POST /live/ops` | 4.0b |
| **4.1a** | `coach-web`: sessão de grupo (várias sessões na vista ao vivo), ops em vez de sessão inteira | 4.0c |
| **4.1b** | `client-web` esqueleto + modo Ecrã + emparelhamento | 4.0c |
| **4.2** | Convites, `GET /me/sync`, projeção, app do cliente só leitura | 4.0c |
| **4.3** | Cliente marca o treino, feedback no fim | 4.2, 4.1a |

4.1a e 4.1b podem avançar em paralelo. Deploy: o workflow do GitHub Pages passa a construir também a `client-web` para `dist/cliente/`; a API publica-se com `npm run deploy:api` (aplica a migração).

---

## 7. Decisões em aberto

1. **Notas privadas:** hoje `Session.notes` é uma só. Proposta: `notes` passa a ser visível ao cliente e nasce `privateNotes` só para o coach. As notas atuais ficam em `notes` — **o cliente passaria a vê-las**. Alternativa: mover as atuais para `privateNotes` na migração (mais seguro).
2. **Avaliações e IPI na app do cliente:** mostrar (motiva) ou não (exige explicar números)? Proposta: fora da 4.3; decidir depois de usar.
3. **Cliente pode editar o plano?** Proposta: não. Só marca o que fez e deixa feedback.
4. **Ecrã tátil:** no tablet, deixar os clientes marcarem os sets no ecrã? Proposta: não na 4.1 (o ecrã fica só leitura); fácil de juntar depois com uma chave de ecrã que escreve.
5. **Vários coaches** (ginásio com mais PTs): fora de âmbito. A API continua com um coach; o desenho de papéis não impede acrescentar um `coach_id` mais tarde.
