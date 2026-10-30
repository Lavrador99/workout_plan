# Coach — prescrição de treino

PWA para prescrever e registar treinos personalizados. Funciona sem rede (dados em IndexedDB) e sincroniza entre telemóvel e PC via Supabase (opcional, plano gratuito).

- Produção: `https://<user>.github.io/workout_plan/coach/` (publicado pelo mesmo workflow do GitHub Pages)
- Dev: `npm run dev:coach` · Testes do parser: `npm run test:coach`

## Escrita rápida

Uma linha por exercício; linha em branco = novo bloco; `( )` = intercalado.

```
Flexibilidade e mobilidade
Elephant wall

Back squat 4x8 47,5kg
(Russian twist, side bends)
Step up 3x8 2x8kg E+1
Solear smith +10kg 12r 3s
Leg extension iso 10kg 10r 10s 4s
Hip thrust 12x40kg/12x40kg/11x50kg
Supino inclinado 8RM

40"/20" x3 | 1:30 rest
Devil press
Wall ball
```

## Sincronização (telemóvel ↔ PC)

A app guarda tudo no dispositivo e funciona sem rede. Para ter os mesmos dados em vários dispositivos, usa a API em [`apps/coach-api`](../coach-api) (Cloudflare Workers + D1, plano grátis).

Uma vez, no PC, na raiz do repo:

```bash
npm install
npm run deploy:api
```

O script abre o browser para entrares na Cloudflare (cria a conta se ainda não tiveres), cria a base de dados, publica a API e mostra no fim o **endereço** e a **chave**. Na app: Definições → Sincronização → cola os dois → Ligar. Repete no outro dispositivo com os mesmos valores.

- Faz commit do `apps/coach-api/wrangler.toml` depois do primeiro deploy (passa a ter o id da base de dados).
- A chave fica em `apps/coach-api/.coach-token` (fora do git). Se a perderes, apaga esse ficheiro e corre `npm run deploy:api` outra vez: é criada uma chave nova e colas a nova nos dispositivos.
- API local para desenvolvimento: `npm run dev:api:coach` (usa `apps/coach-api/.dev.vars` com `SYNC_TOKEN=...`).
