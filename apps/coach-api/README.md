# coach-api

API de sincronização da app Coach — Cloudflare Workers + D1 (SQLite), plano grátis.

- `GET /sync?since=<seq>` — registos escritos depois de `seq`, por ordem (páginas de 500)
- `POST /sync` `{ rows: [{ id, kind, data, updated_at, deleted }] }` — grava até 200 registos; só substitui se `updated_at` for igual ou mais recente

Todas as rotas `/sync` pedem `Authorization: Bearer <SYNC_TOKEN>`.

Deploy: `npm run deploy:api` na raiz do repo (ver [apps/coach-web/README.md](../coach-web/README.md)).
Exportar a base de dados: `npx wrangler d1 export coach-db --remote --output backup.sql` (dentro desta pasta).
