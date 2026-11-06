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
- SEM dos testes de base: ver passo 4.

## Passo 2: motor de referências (feito)

`lib/benchmark.ts` compara um resultado com `references/*.ts`:

- **Hierarquia:** 1 mesma modalidade, sexo e nível; 2 mesma modalidade e sexo, outro nível; 3 pessoas ativas; 4 fora do desporto. Mostra o melhor grupo de atletas e um grupo de não atletas.
- **Sem adivinhar:** falta de sexo ou idade dá `missing_data`; sem grupo compatível dá `no_compatible_reference`.
- **Compatibilidade:** cada conjunto vale para um teste numa versão do protocolo. Uma versão nova perde a referência.
- **Estimados:** um e1RM nunca é comparado com referências medidas.
- **Profissionais:** quem não é de elite nunca é comparado automaticamente com elite ou top elite.
- **Percentis:** publicados têm prioridade, interpolados sem extrapolar. Com média e desvio-padrão, o valor fica identificado como estimado.
- **Nível da ficha:** `elite` corresponde a elite, `competitivo` a sub-elite e `recreativo` a amador. É uma correspondência nossa.
- **Evidência:** A (10 ou mais estudos e 200 ou mais pessoas), B (3 e 50), C (30 pessoas), D (o resto). É uma escala operacional da app.

## Passo 3: dados

- **Yo-Yo IR1 (feito):** Schmitz et al. 2018, Figura 2, CC BY 4.0. Lido duas vezes do PDF da editora. Publica média e desvio-padrão; não há percentis reais. Ficaram de fora grupos pouco relevantes (árbitros, críquete, râguebi misturado com futebol gaélico).
- **Handgrip feito:** Tomkinson et al. (2025), CC BY 4.0, Tabela 2 completa, com percentis publicados por sexo e idade a partir dos 20 anos. É população geral, sem atletas, por isso aparece como "População geral".
- **Regra dos testes por lado:** cada referência diz que valor usa. No handgrip é o melhor valor das duas mãos, e por isso só compara avaliações com os dois lados medidos. Um teste por lado sem esta regra fica sem referência.
- **Protocolo do handgrip:** a referência assume o protocolo de Southampton. O cartão diz isto, mas o texto do teste na app ainda não o pede.
- **Por fazer, WBLT:** McBride et al. (2026), DOI 10.1016/j.msksp.2026.103525, CC BY 4.0 segundo a Crossref. O ScienceDirect recusa o acesso automático e o Europe PMC só tem o resumo. Falta a tabela original, a partir do PDF. O resumo diz que não há diferença relevante entre pernas, mas não indica que valor usar em cada lado: isso tem de vir da tabela.

## Passo 4: SEM (parcial)

Em `references/measurementError.ts`, cada valor com a sua fonte e população. Só entra o que foi confirmado na fonte. Os testes que já existem recebem o valor se não tiverem nenhum e continuarem no protocolo de base; um valor do treinador nunca é substituído.

| Teste | SEM | Fonte e limite |
|---|---|---|
| Knee to Wall | 0,7 cm | Powden 2015. Derivado da MDC de 1,9 cm |
| Y-Balance anterior / posteromedial / posterolateral | 2,01 / 2,83 / 3,11 cm | Plisky 2009, 15 futebolistas universitários. Citado por fonte secundária, sem acesso ao original |
| Handgrip | 1,8 kg | Horn 2024, 30 adultos, Jamar. Só resumo de conferência |
| Countermovement Jump | 1,5 cm | Springham 2024, academia da Premier League. Tempo de voo |
| Sprint 10 m | 0,016 s | Sensors 2025, atletas muito treinados, células. O artigo traz erro típico e MDC incoerentes; usa-se o SEM da MDC publicada |
| Yo-Yo IR1 | 149 m | Deprez 2014, sub-15. Não há valor em metros para adultos |

**Sem SEM, de propósito:** 1RM e e1RM (só havia Smith machine ou mulheres destreinadas), 505 (só em percentagem), Sprint 5 e 20 m, composição corporal, mobilidade em graus, testes de pontuação e o resto. Quase todos os valores vêm de populações jovens ou atletas: com clientes de outro perfil, o treinador deve ajustá-los.

## Próximos passos

5. Powerlifting, sempre com a população visível.
6. Alometria, massa magra, potência e referências de futebol.
