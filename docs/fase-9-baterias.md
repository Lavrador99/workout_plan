# Fase 9 — Baterias por população

Desenho técnico para a app `coach-web`. Estado: desenho, por validar. Fica à espera das fichas de cada módulo (Treino Híbrido, Desenvolvimento Motor), como a Ficha 2 fez para Força e Equilíbrio na [Fase 7](fase-7-onboarding.md).

## 1. Pressupostos

- **São dados, quase sem lógica nova.** Os testes entram na biblioteca base (`seedTests.ts`), agrupados em baterias (`TestDef.groups`), e o treinador pode editá-los como os outros.
- **Textos próprios.** Como no resto da biblioteca, as instruções são notas curtas nossas, não cópias dos manuais.
- **Sem referências por agora.** Nenhuma destas baterias tem tabela normativa com licença aberta verificada. Seguindo a regra da comparação científica, a app não mostra percentil e compara o cliente consigo próprio.
- **Cargas e formatos de competição mudam todas as épocas.** A app não os fixa: o treinador escreve-os no protocolo do teste, a partir do regulamento em vigor.

## 2. Âmbito

**Entra:** baterias para Hyrox, ATHX, e crianças e jovens (com a maturação); variantes de protocolo (divisão ou época) guardadas em cada resultado; data de nascimento opcional na ficha.

**Fica de fora:** tabelas normativas (Rikli & Jones, Hyrox, ALPHA-Fitness), cargas oficiais de cada divisão, simulações de prova cronometradas por estação na sessão ao vivo.

## 3. Baterias

### 3.1 Força e Equilíbrio

Passou para a [Fase 7](fase-7-onboarding.md), com os testes da Ficha 2 e as referências do documento Fullerton.

### 3.2 Hyrox

Uma prova por estação, com tempo (s, menos é melhor), e a corrida:

SkiErg 1000 m · Sled push 50 m · Sled pull 50 m · Burpee broad jumps 80 m · Remo 1000 m · Farmers carry 200 m · Sandbag lunges 100 m · Wall balls 100 reps · Corrida 1 km · Simulação completa.

Variantes: Open, Pro e Doubles, femininas e masculinas. As cargas ficam no protocolo de cada teste, escritas pelo treinador.

### 3.3 ATHX

Pesquisa de 20/11/2026 em guias de terceiros (não no regulamento oficial): seis zonas, três pontuadas — Força, Endurance e MetCon X. Em 2026, a força é 1RM de strict press, 3RM de back squat e 5RM de deadlift (soma da carga). A endurance alterna corrida e remo para distância máxima. O MetCon X muda todas as épocas, e os treinos de 2027 já foram publicados.

| Teste | Unidade | Melhor |
|---|---|---|
| Strict press 1RM | kg | mais (força medida) |
| Back squat 3RM | kg | mais |
| Deadlift 5RM | kg | mais |
| Endurance (corrida + remo) | m | mais |
| MetCon X | reps | mais |

Variantes: a época e o nível (ex. "2026 · Open"). Os testes de 3RM e 5RM registam a carga levantada nessas repetições. Não são e1RM e nunca se misturam com eles.

**O formato tem de ser confirmado no site oficial da ATHX antes de publicar.**

### 3.4 Crianças e jovens — "ALPHA-Fitness" e maturação

- A bateria ALPHA-Fitness junta testes que já existem (peso, perímetro da cintura, handgrip, salto horizontal) e dois novos: **vaivém de 20 m** (patamares, mais é melhor) e **4 × 10 m** (s, menos é melhor).
- Dois testes de antropometria novos: **altura** e **altura sentado** (cm, neutros).
- **Maturação** (anos até ao pico de velocidade de crescimento, Mirwald et al., 2002, Med Sci Sports Exerc 34(4):689–694): calculada, nunca guardada, como a força relativa. Precisa de sexo, data de nascimento, altura, altura sentado e peso na mesma avaliação. Aparece no resultado da altura, identificada como estimativa, com o aviso de que o erro aumenta longe do pico. **Os coeficientes da equação foram escritos de memória e têm de ser confirmados no artigo antes de publicar.**
- **Data de nascimento:** `Client.birthDate` (YYYY-MM-DD), opcional. Quando existe, dá o ano de nascimento (`birthYear` continua a ser o que o resto da app lê) e a idade decimal da maturação.

## 4. Variantes de protocolo

Hoje, dois resultados comparam-se quando são do mesmo teste e da mesma versão do protocolo. Passa a ser **teste + versão + variante**.

```ts
// TestDef
variants?: string[]; // "Open feminino", "Pro masculino", "2026 · Open"

// TestResult
variant?: string | null; // copied when recorded; null = the test has no variants
```

- **Ao registar:** num teste com variantes, o resultado mostra-as em chips. Uma nova avaliação herda a variante do último resultado desse teste.
- **`series()`:** agrupa por versão e variante. A evolução, o balanço, o IPI e os objetivos já trabalham sobre `VersionSeries`, por isso herdam a separação. `VersionSeries` ganha `variant`.
- **`compare()`:** variantes diferentes dão `different-protocol`, com o texto "Divisão diferente".
- **IPI:** o indicador guarda a variante e só compara índices com a mesma. Isto muda o resultado em testes com variantes, por isso sobe `METHOD`.
- **Objetivos:** um objetivo de teste vale para a variante do resultado mais recente.
- **Referências:** um teste com variante nunca é comparado com referências (não há nenhuma por agora).

## 5. Biblioteca base

- Sobe `SEED_VERSION`. Os testes novos entram como os outros; os que já existem só ganham o grupo novo (ex. "ALPHA-Fitness" no handgrip) se ainda não o tiverem, sem mexer no resto do que o treinador editou.
- O teste "o cliente Teste usa todos os testes base" passa a ignorar as baterias de população: o Teste é um futebolista.

## 6. Sync e API

- Só campos novos em registos que já existem (`TestDef`, `TestResult`, `Client`). Não há tipo novo, nem versão do Dexie, nem publicação da API.

## 7. Passos

1. Variantes: tipos, `series()`, `compare()`, IPI (`METHOD`), registo na avaliação, com testes.
2. Data de nascimento na ficha.
3. Maturação (Mirwald), com testes, no resultado da altura.
4. Baterias na biblioteca base e o grupo novo nos testes existentes.
5. Typecheck, testes e build.
