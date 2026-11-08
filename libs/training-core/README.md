# training-core

Tipos e lógica pura do treino, partilhados pela `coach-web`, pela `coach-api` e pela futura `client-web` (ver [docs/fase-4-ecra-e-app-cliente.md](../../docs/fase-4-ecra-e-app-cliente.md)).

Importa-se por ficheiro: `@treino/core/live`, `@treino/core/types`… Sem React, sem Dexie, sem `window`: tudo aqui tem de correr num Worker.

Testes: `npx vitest run` nesta pasta (ou `npm run test:coach` na raiz).
