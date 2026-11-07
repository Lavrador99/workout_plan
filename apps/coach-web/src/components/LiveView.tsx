import { Check, Play, X } from "lucide-react";
import { ask } from "./Dialogs";
import { fmtSegment, fmtZone, zoneName, zoneRange } from "../lib/run";
import { useContext, useEffect, useMemo, useState } from "react";
import { fmtCircuitHeader, fmtLoad, fmtRx, SET_TYPE } from "../lib/format";
import { history, loadStep } from "../lib/history";
import { useBackClose } from "../lib/hooks";
import { addSet, buildSteps, editSet, isDone, nextOpen, restAfter, sameStep, setDone, setItem, type Step } from "../lib/live";
import { SessionCtx } from "../lib/sessionContext";
import { fmtNum, fmtSec, num } from "../lib/text";
import type { Item, Session, SetRow, RunZone } from "../lib/types";
import CircuitTimer, { beep } from "./CircuitTimer";
import { EasierHarder } from "./Progressions";

/** 754000 → "12:34", 3754000 → "1:02:34" */
export function fmtClock(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const mm = String(Math.floor((t % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const ss = String(t % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Keep the screen on while the session runs (where the browser allows it). */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const take = () => {
      if (document.visibilityState === "visible") navigator.wakeLock?.request("screen").then((l) => (lock = l), () => {});
    };
    take();
    document.addEventListener("visibilitychange", take);
    return () => {
      document.removeEventListener("visibilitychange", take);
      void lock?.release();
    };
  }, []);
}

interface Props {
  session: Session;
  onChange: (s: Session) => void;
  /** Back to the plan; the session keeps running. */
  onMinimize: () => void;
}

/** Full-screen live session: one set at a time, big numbers, edited as it happens. */
export default function LiveView({ session: s, onChange, onMinimize }: Props) {
  useWakeLock();
  const now = useNow();
  const steps = useMemo(() => buildSteps(s), [s]);
  const [cursor, setCursor] = useState<Step | undefined>(() => nextOpen(s, steps));
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [timer, setTimer] = useState(false);
  useBackClose(onMinimize);

  const idx = steps.findIndex((x) => sameStep(x, cursor));
  const cur = idx >= 0 ? steps[idx] : nextOpen(s, steps);
  const curIdx = idx >= 0 ? idx : steps.findIndex((x) => sameStep(x, cur));
  const doneCount = steps.filter((st) => isDone(s, st)).length;
  const restLeft = restEnd == null ? null : Math.ceil((restEnd - now) / 1000);

  // end of rest: beep once, keep "Vai!" for a moment
  useEffect(() => {
    if (restLeft === 0) beep(990, 400);
    if (restLeft != null && restLeft < -3) setRestEnd(null);
  }, [restLeft]);

  const tick = () => {
    if (!cur) return;
    if (isDone(s, cur)) {
      onChange(setDone(s, cur, false));
      return;
    }
    const next = setDone(s, cur, true);
    onChange(next);
    const rest = restAfter(s, steps, cur);
    setRestEnd(rest > 0 ? Date.now() + rest * 1000 : null);
    setCursor(nextOpen(next, buildSteps(next), curIdx));
  };

  const skip = () => setCursor(nextOpen(s, steps, curIdx) ?? cur);

  /** A dot of the plan: the current set is ticked like "Feito" (rest included), any other just flips. */
  const toggle = (st: Step) => {
    if (sameStep(st, cur)) return tick();
    onChange(setDone(s, st, !isDone(s, st)));
  };

  const finish = async () => {
    const left = steps.length - doneCount;
    if (!(await ask(left ? `Terminar o treino? Ficam ${left} por fazer.` : "Terminar o treino?"))) return;
    onChange({ ...s, endedAt: Date.now() });
    onMinimize();
  };

  const block = cur ? s.blocks[cur.bi] : undefined;
  const item = cur && cur.kind !== "block" ? block?.items[cur.ii] : undefined;
  const nextStep = cur ? nextOpen(s, steps, curIdx) : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col safe-top">
      <div className="max-w-2xl w-full mx-auto flex flex-col flex-1 min-h-0">
        <header className="flex items-center gap-2 px-3 py-2">
          <span className="flex items-center gap-2 font-bold tabular-nums">
            <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
            {fmtClock(now - (s.startedAt ?? now))}
          </span>
          <span className="text-sm text-muted tabular-nums">
            {doneCount}/{steps.length}
          </span>
          <button type="button" className="btn ml-auto" onClick={onMinimize}>
            Plano
          </button>
          <button type="button" className="btn text-danger" onClick={finish}>
            Terminar
          </button>
        </header>
        <div className="h-1 bg-card2">
          <div className="h-full bg-accent transition-all" style={{ width: `${steps.length ? (100 * doneCount) / steps.length : 0}%` }} />
        </div>

        {restLeft != null && (
          <div className={`flex items-center gap-2 px-3 py-2 ${restLeft > 0 ? "bg-accent2 text-on-accent" : "bg-success text-on-accent"}`}>
            <span className="text-sm font-semibold uppercase">{restLeft > 0 ? "Descanso" : "Vai!"}</span>
            <span className="text-3xl font-black tabular-nums">{restLeft > 0 ? fmtClock(restLeft * 1000) : "✓"}</span>
            {restLeft > 0 && (
              <div className="ml-auto flex gap-2">
                <button type="button" className="btn bg-black/15 border-transparent text-on-accent" onClick={() => setRestEnd((e) => (e ?? 0) - 15000)}>
                  −15
                </button>
                <button type="button" className="btn bg-black/15 border-transparent text-on-accent" onClick={() => setRestEnd((e) => (e ?? 0) + 15000)}>
                  +15
                </button>
                <button type="button" className="btn bg-black/15 border-transparent text-on-accent" onClick={() => setRestEnd(null)} aria-label="Acabar descanso">
                  <X />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain p-3 flex flex-col gap-4 safe-bottom">
          {!cur || !block ? (
            <div className="card p-6 flex flex-col items-center gap-3 text-center">
              <span className="text-5xl"><Check /></span>
              <span className="text-xl font-bold">Tudo feito</span>
              <button type="button" className="btn-accent h-14 w-full text-lg" onClick={finish}>
                Terminar treino
              </button>
            </div>
          ) : cur.kind === "block" ? (
            <section className="card p-4 flex flex-col gap-3">
              <span className="label">{[block.section, block.title].filter(Boolean).join(" · ") || "Bloco"}</span>
              <h1 className="text-3xl font-black">{fmtCircuitHeader(block)}</h1>
              <ul className="flex flex-col gap-1">
                {block.items.map((it) => (
                  <li key={it.id} className="text-lg">
                    <span className="font-semibold">{it.name}</span> <span className="text-accent text-base">{fmtRx(it)}</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn h-14 text-lg" onClick={() => setTimer(true)}>
                <Play /> Timer
              </button>
              <DoneButton done={isDone(s, cur)} label="Bloco feito" onClick={tick} />
            </section>
          ) : (
            item && (
              <SetCard
                key={`${cur.bi}:${cur.ii}:${cur.kind === "set" ? cur.si : ""}`}
                item={item}
                step={cur}
                session={s}
                onEdit={(field, v) => cur.kind === "set" && onChange(editSet(s, cur.bi, cur.ii, cur.si, field, v))}
                onTick={tick}
                onSkip={skip}
                onAddSet={() => onChange(addSet(s, cur.bi, cur.ii))}
                onItem={(it) => onChange(setItem(s, cur.bi, cur.ii, it))}
              />
            )
          )}

          {nextStep && !sameStep(nextStep, cur) && <NextUp session={s} step={nextStep} />}

          <Overview session={s} steps={steps} current={cur} onJump={setCursor} onToggle={toggle} />
        </div>
      </div>
      {timer && block && <CircuitTimer block={block} onClose={() => setTimer(false)} />}
    </div>
  );
}

function DoneButton({ done, label, onClick }: { done: boolean; label: string; onClick: () => void }) {
  return done ? (
    <button type="button" className="btn h-14 text-success border-success/50" onClick={onClick}>
      <Check /> Feito · desfazer
    </button>
  ) : (
    <button type="button" className="btn-accent h-16 text-xl" onClick={onClick}>
      <Check /> {label}
    </button>
  );
}

function setLabel(item: Item, si: number): string {
  const s = item.sets[si];
  const work = item.sets.filter((x) => x.type !== "warmup");
  if (s.type === "warmup") return "Aquecimento";
  const n = work.indexOf(s) + 1;
  const kind = s.type && s.type !== "work" ? ` · ${SET_TYPE[s.type].label}` : "";
  return `${item.run ? "Segmento" : "Série"} ${n} de ${work.length}${kind}`;
}

function SetCard({
  item,
  step,
  session,
  onEdit,
  onTick,
  onSkip,
  onAddSet,
  onItem,
}: {
  item: Item;
  step: Step;
  session: Session;
  onEdit: (field: "reps" | "duration" | "load" | "rir", v: number | null) => void;
  onTick: () => void;
  onSkip: () => void;
  onAddSet: () => void;
  onItem: (item: Item) => void;
}) {
  const set: SetRow | undefined = step.kind === "set" ? item.sets[step.si] : undefined;
  const timed = set?.duration != null;
  const rpe = item.effort === "rpe";
  const details = [item.tempo && `tempo ${item.tempo}`, item.holdSec && `iso ${item.holdSec}s`, item.grip && `pega ${item.grip}`, item.stance && `pés ${item.stance}`, item.note]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="card p-4 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="label">{set ? setLabel(item, (step as Extract<Step, { kind: "set" }>).si) : item.role === "filler" ? "Intercalado" : "Exercício"}</span>
        <h1 className="text-3xl font-black leading-tight">{item.name || "—"}</h1>
        {!set && fmtRx(item) && <span className="text-accent">{fmtRx(item)}</span>}
        {details && <span className="text-sm text-muted">{details}</span>}
        {set?.zone && <ZoneGoal zone={set.zone} />}
        {set && <LastTime item={item} si={(step as Extract<Step, { kind: "set" }>).si} session={session} />}
      </div>

      <EasierHarder item={item} onChange={onItem} />

      {set && (
        <>
          <div className={`grid gap-3 ${item.run ? "grid-cols-1" : "grid-cols-2"}`}>
            <BigStepper
              label={timed ? "Segundos" : item.repsUnit === "passos" ? "Passos" : item.repsUnit === "m" ? "Metros" : "Reps"}
              value={timed ? set.duration : set.reps}
              step={item.run ? (timed ? 30 : 100) : timed ? 5 : 1}
              onChange={(v) => onEdit(timed ? "duration" : "reps", v)}
            />
            {!item.run && (
              <BigStepper
                label={item.loadMode === "dual" ? "Kg (cada)" : item.loadMode === "added" ? "Kg (+)" : "Kg"}
                value={set.load}
                step={loadStep(item)}
                onChange={(v) => onEdit("load", v)}
              />
            )}
          </div>
          {!item.run && (
            <div className="flex items-center gap-2">
              <span className="label w-10">{rpe ? "RPE" : "RIR"}</span>
              {(rpe ? [6, 7, 8, 9, 10] : [0, 1, 2, 3, 4]).map((v) => (
                <button key={v} type="button" className={`flex-1 h-10 rounded-lg border text-sm font-semibold ${set.rir === v ? "bg-accent/20 border-accent text-accent" : "border-border bg-card2 text-muted"}`} onClick={() => onEdit("rir", set.rir === v ? null : v)}>
                  {v}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <DoneButton done={step.kind === "set" ? !!set?.done : item.sets.length > 0 && item.sets.every((x) => x.done)} label="Feito" onClick={onTick} />
      <div className="grid grid-cols-2 gap-2 -mt-1">
        <button type="button" className="btn" onClick={onSkip}>
          Saltar →
        </button>
        {set && (
          <button type="button" className="btn" onClick={onAddSet}>
            {item.run ? "+ Segmento" : "+ Série"}
          </button>
        )}
      </div>
    </section>
  );
}

/** What this client did on the same set last time. */
function LastTime({ item, si, session }: { item: Item; si: number; session: Session }) {
  const ctx = useContext(SessionCtx);
  const prev = useMemo(
    () => (ctx ? history(ctx.sessions, item, { before: session.date, excludeId: session.id })[0] : undefined),
    [ctx, item.exerciseId, item.name, session.date, session.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  if (!prev) return null;
  const p = prev.item.sets[si] ?? prev.item.sets[prev.item.sets.length - 1];
  const vol = prev.item.run ? fmtSegment(p) : p.duration != null ? fmtSec(p.duration) : p.reps != null ? `${p.reps}` : "";
  const load = fmtLoad({ ...prev.item, loadMax: null }, p.load);
  return (
    <span className="text-sm text-muted">
      Última vez: <span className="font-semibold text-fg">{[vol, load].filter(Boolean).join(" × ") || fmtRx(prev.item)}</span>
      {p.done === false && " (não feita)"}
    </span>
  );
}

function BigStepper({ label, value, step, onChange }: { label: string; value: number | null | undefined; step: number; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(fmtNum(value));
  useEffect(() => setText(fmtNum(value)), [value]);
  const bump = (d: number) => onChange(Math.max(0, Math.round(((value ?? 0) + d) * 100) / 100));
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-card2 border border-border p-2">
      <span className="label">{label}</span>
      <input
        className="w-full bg-transparent text-center text-5xl font-black tabular-nums outline-none"
        inputMode="decimal"
        value={text}
        placeholder="–"
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => num(text) !== (value ?? null) && onChange(num(text))}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      <div className="grid grid-cols-2 gap-2 w-full">
        <button type="button" className="h-12 rounded-lg bg-card border border-border text-2xl text-muted active:bg-border" onClick={() => bump(-step)} aria-label={`menos ${label}`}>
          −
        </button>
        <button type="button" className="h-12 rounded-lg bg-card border border-border text-2xl text-accent active:bg-border" onClick={() => bump(step)} aria-label={`mais ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

function stepText(s: Session, st: Step): string {
  const b = s.blocks[st.bi];
  if (st.kind === "block") return fmtCircuitHeader(b);
  const it = b.items[st.ii];
  if (st.kind === "item") return it.name;
  const x = it.sets[st.si];
  const vol = it.run ? fmtSegment(x) : x.duration != null ? fmtSec(x.duration) : x.reps != null ? `${x.reps}` : "";
  return `${it.name} · ${[vol, fmtLoad({ ...it, loadMax: null }, x.load)].filter(Boolean).join(" × ")}`;
}

/** What this segment of a run should feel like, in this client's numbers when known. */
function ZoneGoal({ zone }: { zone: RunZone }) {
  const client = useContext(SessionCtx)?.client;
  const range = zoneRange(zone, client);
  return <span className="text-accent font-semibold">{[fmtZone(zone), zoneName(zone), range].filter(Boolean).join(" · ")}</span>;
}

function NextUp({ session, step }: { session: Session; step: Step }) {
  return (
    <div className="flex items-baseline gap-2 px-1 text-sm">
      <span className="label shrink-0">A seguir</span>
      <span className="truncate">{stepText(session, step)}</span>
    </div>
  );
}

/** Every exercise with a dot per set: tap a dot to mark it done or not, the name to go there. */
function Overview({
  session: s,
  steps,
  current,
  onJump,
  onToggle,
}: {
  session: Session;
  steps: Step[];
  current?: Step;
  onJump: (st: Step) => void;
  onToggle: (st: Step) => void;
}) {
  const rows: { key: string; name: string; steps: Step[] }[] = [];
  for (const st of steps) {
    const key = st.kind === "block" ? `b${st.bi}` : `i${st.bi}:${st.ii}`;
    let row = rows.find((r) => r.key === key);
    if (!row) {
      row = { key, name: st.kind === "block" ? fmtCircuitHeader(s.blocks[st.bi]) : s.blocks[st.bi].items[st.ii].name, steps: [] };
      rows.push(row);
    }
    row.steps.push(st);
  }
  return (
    <div className="flex flex-col">
      <span className="label px-1 pb-1">Plano</span>
      {rows.map((r) => {
        const here = r.steps.some((st) => sameStep(st, current));
        const all = r.steps.every((st) => isDone(s, st));
        return (
          <div key={r.key} className={`flex items-center gap-2 py-2 px-1 border-b border-border ${here ? "text-accent" : all ? "text-muted" : ""}`}>
            <button type="button" className="flex-1 min-w-0 text-left truncate font-semibold" onClick={() => onJump(r.steps.find((st) => !isDone(s, st)) ?? r.steps[0])}>
              {all && "✓ "}
              {r.name}
            </button>
            <div className="flex gap-1 shrink-0">
              {r.steps.map((st, i) => {
                const done = isDone(s, st);
                const here = sameStep(st, current);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Série ${i + 1}: ${done ? "feita" : "por fazer"}`}
                    aria-pressed={done}
                    className={`w-10 h-10 rounded-full border text-xs font-bold transition active:scale-90 ${
                      done ? "bg-success/20 border-success text-success" : here ? "border-accent text-accent" : "border-border text-muted"
                    } ${here ? "ring-2 ring-accent ring-offset-1 ring-offset-bg" : ""}`}
                    onClick={() => onToggle(st)}
                  >
                    {done ? "✓" : i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
