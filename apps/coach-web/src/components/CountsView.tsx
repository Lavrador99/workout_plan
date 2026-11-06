import { useMemo, useState } from "react";
import { canonPatterns, FOCUS_KINDS, groupByPeriod, tally, type Period } from "../lib/movement";
import type { Exercise, Focus, Session } from "../lib/types";
import Seg from "./Seg";

const PERIODS: [Period, string][] = [
  ["session", "Sessão"],
  ["week", "Semana"],
  ["month", "Mês"],
  ["year", "Ano"],
  ["all", "Total"],
];

/** Sets per movement pattern, grip, stance and client focus, for one session / week / month / year, or all time. */
export default function CountsView({ sessions, exercises, focuses }: { sessions: Session[]; exercises: Exercise[]; focuses: Focus[] }) {
  const [period, setPeriod] = useState<Period>("week");
  const [at, setAt] = useState(0);
  const groups = useMemo(() => groupByPeriod(sessions, period), [sessions, period]);
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const group = groups[Math.min(at, groups.length - 1)];
  const t = useMemo(() => (group ? tally(group.sessions, byId, focuses) : null), [group, byId, focuses]);

  if (!group || !t) return <p className="text-sm text-muted">As contagens aparecem quando o cliente tiver sessões.</p>;

  // patterns the client's focuses ask for but this period did not train
  const wanted = canonPatterns(focuses.flatMap((f) => f.patterns));
  const patterns = [...t.patterns.entries(), ...wanted.filter((p) => !t.patterns.has(p)).map((p) => [p, 0] as [string, number])];

  return (
    <div className="flex flex-col gap-3">
      <Seg
        options={PERIODS}
        value={period}
        onChange={(p) => {
          setPeriod(p as Period);
          setAt(0);
        }}
      />
      <div className="flex items-center gap-2">
        <button type="button" className="btn" disabled={at >= groups.length - 1} onClick={() => setAt(at + 1)}>
          ←
        </button>
        <div className="flex-1 text-center">
          <div className="font-semibold capitalize">{group.label}</div>
          <div className="text-xs text-muted">
            {period !== "session" && `${t.sessions} sessão(ões) · `}
            {t.sets} séries
          </div>
        </div>
        <button type="button" className="btn" disabled={at === 0} onClick={() => setAt(at - 1)}>
          →
        </button>
      </div>

      {focuses.length > 0 && (
        <Section title="Perfis do cliente">
          {focuses.map((f) => {
            const hit = t.focus.get(f.id);
            return (
              <div key={f.id} className="flex flex-col gap-0.5">
                <Bar label={`${f.name} · ${FOCUS_KINDS.find(([k]) => k === f.kind)?.[2]}`} n={hit?.sets ?? 0} total={t.sets} />
                {hit && <span className="text-xs text-muted truncate">{[...hit.exercises].join(" · ")}</span>}
              </div>
            );
          })}
        </Section>
      )}

      <Section title="Padrões de movimento">
        <Bars entries={patterns} total={t.sets} wanted={wanted} />
      </Section>
      <Section title="Pegas">
        <Bars entries={[...t.grips.entries()]} total={t.sets} empty="Escolhe a pega no exercício (toca no nome)." />
      </Section>
      <Section title="Posição dos pés">
        <Bars entries={[...t.stances.entries()]} total={t.sets} empty="Escolhe a posição dos pés no exercício (toca no nome)." />
      </Section>
      {t.extraLeft > 0 && <p className="text-sm text-muted">Séries com extra do lado esquerdo: <b className="text-accent">{t.extraLeft}</b></p>}
      <p className="text-xs text-muted">Conta as séries feitas (✓); numa sessão ainda sem nada marcado, as prescritas. Circuitos contam uma série por ronda.</p>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-3 flex flex-col gap-2">
      <span className="label">{title}</span>
      {children}
    </div>
  );
}

export function Bars({ entries, total, wanted = [], empty }: { entries: [string, number][]; total: number; wanted?: string[]; empty?: string }) {
  if (!entries.length) return <p className="text-xs text-muted">{empty ?? "Nada neste período."}</p>;
  return (
    <>
      {[...entries]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt"))
        .map(([k, n]) => (
          <Bar key={k} label={k} n={n} total={total} wanted={wanted.includes(k)} />
        ))}
    </>
  );
}

function Bar({ label, n, total, wanted }: { label: string; n: number; total: number; wanted?: boolean }) {
  const pct = total ? Math.round((n / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-40 shrink-0 truncate ${n === 0 ? "text-danger" : ""}`}>
        {wanted && "🎯 "}
        {label}
      </span>
      <span className="flex-1 h-2 rounded-full bg-card2 overflow-hidden">
        <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-14 text-right tabular-nums text-xs">
        {n} <span className="text-muted">{pct}%</span>
      </span>
    </div>
  );
}
