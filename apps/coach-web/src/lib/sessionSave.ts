// ─────────────────────────────────────────────────────────────────────────────
// Saving a change to a session. A change made only of sets, the live cursor,
// start or end goes as live ops (libs/training-core/src/ops.ts): the API applies
// them field by field, so a client ticking the same session at the same time
// keeps what they did. Anything else (an exercise swapped, a block edited) is
// saved as the whole session, as before.
//
// With ops, the local copy keeps the server's updatedAt: a newer version from
// the server still replaces it on pull, with the ops not yet sent on top.
// ─────────────────────────────────────────────────────────────────────────────

import { applyOps, diffOps } from "@treino/core/ops";
import type { Session } from "@treino/core/types";
import { changed, db, save } from "./db";
import { getConfig, requestOpsPush } from "./sync";

/**
 * Save `next`, made on this device from `prev`. Only what changed between the
 * two is written, onto the stored session: a change that came from the server
 * meanwhile is kept. `whole` prepares the session when it has to go whole
 * (linking new exercise names to the library, say).
 */
export async function saveSessionChange(prev: Session, next: Session, whole: (s: Session) => Promise<Session> = async (s) => s): Promise<void> {
  const ops = diffOps(prev, next, Date.now());
  if (ops?.length === 0) return;
  if (ops) {
    const queued = await db.transaction("rw", db.sessions, db.ops, async () => {
      const cur = await db.sessions.get(next.id);
      if (!cur || cur.deleted) return null;
      const applied = applyOps(cur, ops);
      // not on the server yet, or no server: the whole session goes, as before
      if (cur.dirty || !getConfig()) {
        await db.sessions.put({ ...applied, updatedAt: Date.now(), dirty: 1 });
        return false;
      }
      await db.sessions.put(applied);
      await db.ops.bulkAdd(ops.map((op) => ({ sessionId: op.sessionId, op })));
      return true;
    });
    if (queued !== null) {
      changed();
      if (queued) requestOpsPush();
      return;
    }
  }
  await save("sessions", await whole(next));
}
