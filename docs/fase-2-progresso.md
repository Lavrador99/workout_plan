# Fase 2 — Dados do Índice de Progresso Individual

Desenho técnico para a app `coach-web`. Estado: implementada e por publicar. O cálculo do IPI é a Fase 3.

## 1. Registos

Dois tipos novos, com o mecanismo de sync habitual (JSON + last-write-wins).

| Tabela do pedido | Aqui |
|---|---|
| `individual_progress_indices`, `progress_dimension_scores`, `progress_assessments`, `progress_history`, `progress_interpretations` | `ProgressSnapshot` (`snapshot`), imutável: recalcular acrescenta outro |
| `progress_targets` | `Goal` (`goal`) |
| `progress_weights` | `Client.primaryGoal`, `Client.weights`, `Client.weightLog` |
| `progress_dimensions`, `progress_calculation_versions` | Constantes em `progress.ts`; a versão fica copiada em cada snapshot |

Nesta fase, nada escreve `ProgressSnapshot` ainda. O tipo já existe para a Fase 3 não obrigar a nova publicação da API, e pode mudar enquanto não houver registos.

## 2. Objetivos

`Goal` substitui `Client.targets`, para haver uma só fonte.

- Um objetivo de teste tem id fixo (`goal-<cliente>-<teste>`), por isso há no máximo um por teste e todos os dispositivos chegam ao mesmo registo.
- `migrateTargets()` move o que estiver em `Client.targets`. Corre no arranque e depois de cada pull, porque um dispositivo desatualizado ainda pode enviar valores antigos. Um objetivo que já exista, ou apagado de propósito, não é alterado.
- Um objetivo abandonado deixa de contar como referência no Balanço.

## 3. Pesos

Os 6 perfis em `PRIMARY_GOALS` somam 100 e são valores iniciais de configuração. Só o perfil de condição física geral vem do pedido; os outros 5 são proposta e devem ser revistos pelo treinador.

Cada alteração acrescenta uma entrada a `Client.weightLog`, com data, objetivo principal e pesos.

## 4. Ordem de publicação

1. Exportar a base de dados: `npx wrangler d1 export coach-db --remote --output backup.sql`.
2. `npm run deploy:api`, com `KINDS` a aceitar `goal` e `snapshot`. Não há migração SQL.
3. Só depois, push para `main` com a app nova.

Na ordem inversa, a API rejeita o envio com erro 400 e o sync para: a migração cria objetivos assim que a app arranca, por isso o erro é imediato em qualquer cliente com objetivos.
