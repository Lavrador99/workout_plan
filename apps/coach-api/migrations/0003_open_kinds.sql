-- Drop the CHECK on kind: the Worker validates it (KINDS in src/index.ts), so
-- new record kinds no longer need this table rebuilt. Same rows, same indexes.
CREATE TABLE records_new (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,
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
