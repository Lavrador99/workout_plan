import { createContext } from "react";
import type { Client, Session } from "@treino/core/types";

/** What an item editor needs to look up the client's history. */
export interface SessionCtxValue {
  clientId: string;
  sessionId: string;
  date: string;
  sessions: Session[];
  /** For what a run's zones mean for this client. */
  client?: Client | null;
}

export const SessionCtx = createContext<SessionCtxValue | null>(null);
