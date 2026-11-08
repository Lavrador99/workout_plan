// A group session: several athletes training at once, each on their own
// session, followed by the coach from one live view.

import { buildSteps, isDone, nextOpen } from "@treino/core/live";
import type { Session } from "@treino/core/types";

export interface AthleteState {
  done: number;
  total: number;
  /** Nothing left to do, or the session was ended. */
  finished: boolean;
  /** Resting until then (ms); null when not resting. */
  restUntil: number | null;
}

export function athleteState(s: Session, now: number): AthleteState {
  const steps = buildSteps(s);
  const done = steps.filter((st) => isDone(s, st)).length;
  const restUntil = s.live?.restUntil ?? null;
  return {
    done,
    total: steps.length,
    finished: s.endedAt != null || !nextOpen(s, steps),
    restUntil: restUntil != null && restUntil > now ? restUntil : null,
  };
}

/**
 * Who the coach should turn to after ticking `fromId`'s set: of the others
 * still training, the one whose rest ends first (not resting = ready now);
 * a tie goes to the next one in order. null = nobody else, stay.
 */
export function nextAthlete(sessions: Session[], fromId: string, now: number): string | null {
  const from = sessions.findIndex((s) => s.id === fromId);
  let best: { id: string; at: number } | null = null;
  for (let k = 1; k < sessions.length; k++) {
    const s = sessions[(from + k + sessions.length) % sessions.length];
    const st = athleteState(s, now);
    if (st.finished) continue;
    const at = st.restUntil ?? now;
    if (!best || at < best.at) best = { id: s.id, at };
  }
  return best?.id ?? null;
}

/** Route part for a group: the session ids, in order. */
export const groupKey = (ids: string[]) => ids.join(",");
export const groupIds = (key: string) => key.split(",").filter(Boolean);
