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

## Ligar a sincronização (uma vez)

1. Criar conta e projeto em [supabase.com](https://supabase.com) (Free, região Europa).
2. SQL Editor → colar e correr [`supabase.sql`](./supabase.sql).
3. Authentication → Sign In / Providers → Email: desligar "Confirm email" (opcional, evita o email de confirmação).
4. Settings → API: copiar **Project URL** e a chave **anon public**.
5. Na app: Definições → colar URL e chave → Criar conta → repetir "Entrar" no outro dispositivo com o mesmo email.

A chave "anon" pode estar no browser: o acesso aos dados é protegido pelo login e pelas regras RLS do `supabase.sql`. O plano gratuito pausa o projeto após 7 dias sem uso; reativa-se no painel do Supabase e os dados locais nunca se perdem.
