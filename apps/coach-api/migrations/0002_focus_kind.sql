-- Allow 'focus' records (sports, pathologies, asymmetries). SQLite cannot
-- change a CHECK constraint, so the table is rebuilt with the same rows.
CREATE TABLE records_new (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL CHECK (kind IN ('client', 'exercise', 'session', 'template', 'focus')),
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted    INTEGER NOT NULL DEFAULT 0,
  seq        INTEGER NOT NULL
);

INSERT INTO records_new (id, kind, data, updated_at, deleted, seq)
  SELECT id, kind, data, updated_at, deleted, seq FROM records;

DROP TABLE records;
ALTER TABLE records_new RENAME TO records;

CREATE INDEX IF NOT EXISTS records_seq ON records (seq);
