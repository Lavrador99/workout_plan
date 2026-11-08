import { useLiveQuery } from "dexie-react-hooks";
import { Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import LiveView, { fmtClock, useNow } from "../components/LiveView";
import { NotFound } from "../components/PageHeader";
import { PageLoading } from "../components/States";
import { db } from "../lib/db";
import { athleteState, groupIds, nextAthlete } from "../lib/group";
import { back, useClients, useSession, useSessions, useViewState } from "../lib/hooks";
import { SessionCtx } from "../lib/sessionContext";
import { saveSessionChange } from "../lib/sessionSave";
import type { Client, Session } from "@treino/core/types";

/**
 * Group session: several athletes, each on their own session, followed from
 * one live view. The bar on top shows everyone (sets done, rest left) and
 * switches between them; after a tick it turns to whoever is ready first.
 */
export default function GroupPage({ ids: key }: { ids: string }) {
  const ids = useMemo(() => groupIds(key), [key]);
  const sessions = useLiveQuery(async () => (await db.sessions.bulkGet(ids)).filter((s): s is Session => !!s && !s.deleted), [ids]);
  const clients = useClients();
  const [active, setActive] = useViewState("athlete", ids[0] ?? "");
  const [auto, setAuto] = useViewState("auto", true);

  if (!sessions || !clients) return <PageLoading title="Treino de grupo" back={[""]} />;
  if (!sessions.length) return <NotFound title="Treino de grupo" back={[""]} />;

  const byId = new Map(clients.map((c) => [c.id, c]));
  const current = sessions.find((s) => s.id === active) ?? sessions[0];
  const turnFrom = (id: string) => {
    const next = nextAthlete(sessions, id, Date.now());
    if (next) setActive(next);
    return next;
  };

  return (
    <Athlete
      key={current.id}
      id={current.id}
      top={<Athletes sessions={sessions} clients={byId} active={current.id} onPick={setActive} auto={auto} onAuto={() => setAuto(!auto)} />}
      onTicked={() => auto && turnFrom(current.id)}
      onFinished={() => turnFrom(current.id) ?? back("")}
    />
  );
}

/** The live view of one athlete. Every change is saved straight away (only what changed: sessionSave.ts). */
function Athlete({ id, top, onTicked, onFinished }: { id: string; top: ReactNode; onTicked: () => void; onFinished: () => void }) {
  const stored = useSession(id);
  const client = useClients()?.find((c) => c.id === stored?.clientId);
  const clientSessions = useSessions(stored?.clientId ?? "");
  // shown until the stored copy catches up, so a tap never flickers back
  const [draft, setDraft] = useState<Session | null>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => setDraft(null), [stored]);

  if (stored === null) return <NotFound title="Sessão" back={[""]} />;
  const s = draft ?? stored;
  if (!s) return <PageLoading title="Treino de grupo" back={[""]} />;

  const update = (next: Session) => {
    setDraft(next);
    saving.current = saving.current.then(() => saveSessionChange(s, next)).catch(() => undefined);
  };

  return (
    <SessionCtx.Provider value={{ clientId: s.clientId, sessionId: s.id, date: s.date, sessions: clientSessions ?? [], client }}>
      <LiveView session={s} onChange={update} onMinimize={() => back("")} closeOnBack={false} top={top} onTicked={onTicked} onFinished={onFinished} />
    </SessionCtx.Provider>
  );
}

function Athletes({
  sessions,
  clients,
  active,
  onPick,
  auto,
  onAuto,
}: {
  sessions: Session[];
  clients: Map<string, Client>;
  active: string;
  onPick: (id: string) => void;
  auto: boolean;
  onAuto: () => void;
}) {
  const now = useNow();
  return (
    <nav aria-label="Atletas" className="flex gap-2 px-3 py-2 overflow-x-auto border-b border-border">
      {sessions.map((s) => {
        const st = athleteState(s, now);
        const on = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            aria-current={on ? "true" : undefined}
            onClick={() => onPick(s.id)}
            className={`shrink-0 min-w-[6.5rem] rounded-lg border px-2.5 py-1.5 text-left ${on ? "border-accent bg-accent/10" : "border-border"}`}
          >
            <span className="block text-sm font-semibold truncate max-w-[9rem]">{clients.get(s.clientId)?.name ?? "—"}</span>
            <span className="flex items-center gap-1.5 text-xs tabular-nums">
              {st.finished ? (
                <span className="text-success flex items-center gap-1">
                  <Check /> feito
                </span>
              ) : (
                <>
                  <span className="text-muted">
                    {st.done}/{st.total}
                  </span>
                  {st.restUntil != null ? <span className="text-accent2 font-semibold">{fmtClock(st.restUntil - now)}</span> : <span className="text-success font-semibold">pronto</span>}
                </>
              )}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        aria-pressed={auto}
        title="Depois de marcar, passar a quem está pronto primeiro"
        onClick={onAuto}
        className={`shrink-0 ml-auto self-center rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${auto ? "border-accent text-accent" : "border-border text-muted"}`}
      >
        Auto
      </button>
    </nav>
  );
}
