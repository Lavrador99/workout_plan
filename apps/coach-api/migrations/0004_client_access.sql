-- Phase 4 (docs/fase-4-ecra-e-app-cliente.md): records by client, and keys
-- for clients and screens besides the coach's SYNC_TOKEN.

-- Which client a record belongs to (data.clientId), so a client's own records
-- are filtered in SQL. NULL on records of no client (exercises, tests…).
ALTER TABLE records ADD COLUMN client_id TEXT;
UPDATE records SET client_id = json_extract(data, '$.clientId') WHERE json_type(data, '$.clientId') = 'text';
CREATE INDEX IF NOT EXISTS records_client_seq ON records (client_id, seq);

-- One row per device given access. Only the SHA-256 of the key is kept; the
-- key itself lives on the device. Revoking keeps the row, for the history.
CREATE TABLE IF NOT EXISTS access (
  token_hash  TEXT PRIMARY KEY,
  role        TEXT NOT NULL,          -- 'client' | 'screen' (checked by the Worker)
  client_id   TEXT,                   -- role = client
  screen_id   TEXT,                   -- role = screen
  label       TEXT NOT NULL,          -- "iPhone da Ana", "TV sala 2"
  created_at  INTEGER NOT NULL,
  last_seen   INTEGER,
  revoked     INTEGER NOT NULL DEFAULT 0
);
