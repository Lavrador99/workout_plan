# Fase 3 — Cálculo do Índice de Progresso Individual

Desenho técnico para a app `coach-web`. Estado: implementada e por publicar. Não precisa de nova publicação da API além da Fase 2.

O cálculo está em `apps/coach-web/src/lib/ipi.ts`, em funções puras. Alterar fórmulas ou limites obriga a subir `METHOD`.

## 1. Regras

- **Indicador:** teste com objetivo e pelo menos duas avaliações do mesmo protocolo.
- **Pontuação:** % do caminho até ao objetivo, entre 0 e 100. Uma mudança dentro do erro de medição vale 0.
- **Dimensão:** média dos testes. Os dois lados de um teste contam como um só.
- **IPI:** média ponderada das dimensões com dados, com os pesos redistribuídos entre elas. Só com adesão não há IPI.
- **Cobertura:** soma dos pesos com dados. Abaixo de `MIN_COVERAGE` (50%), o estado é "dados insuficientes".
- **ICC:** média dos percentis nos testes com referência compatível. Nunca entra no IPI.
- **IA:** sessões feitas / (frequência semanal × semanas), desde o início. É uma estimativa.
- **IO:** média dos objetivos. Qualitativos valem 0 ou 100; os de teste valem a sua pontuação; os abandonados não contam.

| Categoria do teste | Dimensão |
|---|---|
| velocidade, agilidade | Condição física geral |
| força, potência | Força e capacidade muscular |
| mobilidade, estabilidade, movimento, controlo motor | Mobilidade, estabilidade e controlo motor |
| antropometria | Composição corporal |
| resistência | Resistência cardiovascular |

## 2. Interpretação

Cada dimensão melhora, regride ou mantém-se pelas mudanças confirmadas. Sem nenhuma confirmada, usa as de erro desconhecido e fica "por confirmar".

O estado global conta dimensões, não o valor do IPI:

| Estado | Regra |
|---|---|
| Regressão | Mais dimensões a regredir do que a melhorar |
| Estagnação | Nenhuma a mudar |
| Positiva | Pelo menos 2/3 a melhorar e nenhuma a regredir |
| Moderada | Pelo menos 1/3 a melhorar |
| Reduzida | O resto |

Estes cortes são uma escolha inicial, não limites validados.

## 3. Histórico

- Cada data com resultados tem um `ProgressSnapshot`. O id depende do conteúdo, por isso dois dispositivos chegam ao mesmo registo.
- Só a data mais recente se atualiza sozinha, acrescentando um registo novo. As anteriores ficam como estavam.
- "Recalcular histórico" acrescenta registos com `recalculated`, sem apagar os originais.
- As comparações do IPI só usam índices com o mesmo método e os mesmos pesos, e a app avisa quando há outros de fora.

## 4. Página de evolução

`ProgressPage`, aberta em "Ver evolução" no Balanço, com filtro de 30 dias, 3, 6 e 12 meses e histórico completo.

- A linha do IPI só junta índices com os mesmos pesos e método.
- As linhas das dimensões e dos objetivos atravessam mudanças de pesos, porque não dependem deles, mas não de método.
- Cada dimensão lista os indicadores que a compõem.
- Nas barras de inicial, atual e objetivo, cada teste tem a sua escala a partir de 0, porque as unidades diferem.

## 5. Limitações

- A importância por indicador não está implementada: todos os testes de uma dimensão pesam o mesmo.
- O IPI compara cada data com o objetivo atual, por isso um histórico recalculado usa os objetivos de hoje.
