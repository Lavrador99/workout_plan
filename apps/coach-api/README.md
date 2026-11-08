# coach-api

API de sincronização da app Coach — Cloudflare Workers + D1 (SQLite), plano grátis.

- `GET /sync?since=<seq>` — registos escritos depois de `seq`, por ordem (páginas de 500)
- `POST /sync` `{ rows: [{ id, kind, data, updated_at, deleted }] }` — grava até 200 registos; só substitui se `updated_at` for igual ou mais recente

- `POST /live/ops` `{ ops: LiveOp[] }` — alterações pequenas a sessões a decorrer (marcar set, mudar carga, mais um set, onde vai o treino). Aplicadas set a set, campo a campo, por isso o coach e o cliente podem mexer na mesma sessão ao mesmo tempo. Formato e regras em [`libs/training-core/src/ops.ts`](../../libs/training-core/src/ops.ts). Resposta: `{ sessions: [{ id, updated_at }], rejected: [{ id, error }] }`.

As rotas `/sync` pedem `Authorization: Bearer <SYNC_TOKEN>` (só o coach). `/live/ops` aceita também a chave de um cliente (tabela `access`, só o hash), que só mexe nas suas próprias sessões. Ver [docs/fase-4-ecra-e-app-cliente.md](../../docs/fase-4-ecra-e-app-cliente.md).

Deploy: `npm run deploy:api` na raiz do repo (ver [apps/coach-web/README.md](../coach-web/README.md)).
Exportar a base de dados: `npx wrangler d1 export coach-db --remote --output backup.sql` (dentro desta pasta).
