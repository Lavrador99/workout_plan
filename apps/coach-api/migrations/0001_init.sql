-- One row per client / exercise / session / template, stored as JSON.
-- seq increases on every write, so devices pull "everything after seq N"
-- without depending on their clocks.
CREATE TABLE IF NOT EXISTS records (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL CHECK (kind IN ('client', 'exercise', 'session', 'template')),
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted    INTEGER NOT NULL DEFAULT 0,
  seq        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS records_seq ON records (seq);
