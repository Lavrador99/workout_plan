import { useMemo } from "react";
import LineChart, { type Point } from "../components/LineChart";
import { fmtRx } from "../lib/format";
import { history, topSet } from "../lib/history";
import { go, useClient, useExercises, useSessions } from "../lib/hooks";
import { fmtDate } from "../lib/text";

/** One exercise for one client: evolution chart + every time it was done. */
export default function HistoryPage({ clientId, exKey }: { clientId: string; exKey: string }) {
  const client = useClient(clientId);
  const sessions = useSessions(clientId);
  const exercises = useExercises();

  const target = useMemo(() => {
    if (exKey.startsWith("n:")) return { name: exKey.slice(2) };
    const ex = exercises?.find((e) => e.id === exKey);
    return { exerciseId: exKey, name: ex?.name ?? "" };
  }, [exKey, exercises]);

  const occ = useMemo(() => history(sessions ?? [], target), [sessions, target]);

  const { points, unit } = useMemo(() => {
    // only sessions that were actually done (some set ticked), unless none were
    const doneOcc = occ.filter((o) => o.item.sets.some((s) => s.done));
    const chrono = [...(doneOcc.length ? doneOcc : occ)].reverse();
    const tops = chrono.map((o) => ({ o, s: topSet(o.item) }));
    const kind = tops.some((t) => t.s?.load != null) ? "load" : tops.some((t) => t.s?.duration != null) ? "duration" : "reps";
    const pts: Point[] = [];
    for (const { o, s } of tops) {
      const v = kind === "load" ? s?.load : kind === "duration" ? s?.duration : s?.reps;
      if (v != null) pts.push({ date: o.session.date, value: v, detail: fmtRx(o.item) });
    }
    return { points: pts, unit: kind === "load" ? "kg" : kind === "duration" ? "s" : "reps" };
  }, [occ]);

  return (
    <div className="flex flex-col gap-3 p-3 pb-28">
      <button type="button" className="btn-ghost -ml-2 self-start" onClick={() => goBack(clientId)}>
        ← {client?.name}
      </button>
      <h1 className="text-xl font-bold">{target.name}</h1>

      {points.length >= 2 ? (
        <section className="card p-3">
          <div className="label mb-2">Melhor série por sessão ({unit})</div>
          <LineChart points={points} unit={unit} />
        </section>
      ) : (
        <p className="text-sm text-muted">O gráfico aparece a partir de duas sessões com este exercício.</p>
      )}

      <ul className="card divide-y divide-border">
        {occ.map((o, i) => {
          const done = o.item.sets.filter((s) => s.done).length;
          return (
            <li key={i}>
              <button type="button" className="w-full text-left px-3 py-2.5 flex gap-3 items-baseline" onClick={() => go("session", o.session.id)}>
                <span className="text-sm font-semibold w-24 shrink-0">{fmtDate(o.session.date)}</span>
                <span className="flex-1 text-sm">
                  {o.item.name !== target.name && <span className="text-muted">{o.item.name} · </span>}
                  {fmtRx(o.item)}
                </span>
                <span className={`text-xs tabular-nums ${done === o.item.sets.length ? "text-success" : "text-muted"}`}>
                  {done}/{o.item.sets.length}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function goBack(clientId: string) {
  if (window.history.length > 1) window.history.back();
  else go("client", clientId);
}
