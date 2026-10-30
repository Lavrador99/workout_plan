import { createContext } from "react";
import type { Session } from "./types";

/** What an item editor needs to look up the client's history. */
export interface SessionCtxValue {
  clientId: string;
  sessionId: string;
  date: string;
  sessions: Session[];
}

export const SessionCtx = createContext<SessionCtxValue | null>(null);
