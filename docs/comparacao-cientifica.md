# Comparação científica

Módulo para comparar cada atleta com referências publicadas, sem perder a evolução individual.

## Regras

- Sem referência compatível, a app diz isso e não mostra percentil.
- Valores estimados ficam sempre identificados e nunca se misturam com medidos.
- Uma mudança só fica verde ou vermelha se ultrapassar o erro de medição conhecido.
- Não há limites automáticos de assimetria, nem índices de capacidade 0–100.
- As referências ficam em ficheiros versionados no código, com fonte e população. Não dependem de pesquisas em tempo real.

## Passo 1: base sem dados externos (feito)

- `Client.sex`, usado apenas para escolher populações de referência.
- `TestDef.strength`: 1RM medido e e1RM são testes separados, por isso nunca partilham série.
- e1RM por Epley, até 10 repetições.
- Força relativa: carga / peso do dia, ou o peso mais recente até 60 dias antes.
- Velocidade média: `TestDef.distanceM` / tempo.
- Erro de medição: `TestDef.sem` e fonte, editáveis, com MDC95 = 1,96 × √2 × SEM. Vale só para a versão atual do protocolo.
- Nenhum teste de base traz SEM: tem de vir de fonte compatível (passo 4).

## Próximos passos

2. Motor de referências: hierarquia, percentis publicados, valor z, `no_compatible_reference`, níveis A a D.
3. Primeiros dados: Yo-Yo, depois handgrip e WBLT, se a licença permitir.
4. SEM e MDC por teste.
5. Powerlifting, sempre com a população visível.
6. Alometria, massa magra, potência e referências de futebol.
