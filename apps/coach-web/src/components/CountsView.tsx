import { useViewState } from "../lib/hooks";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { fmtAsymmetry } from "../lib/assessment";
import { sideTests, strengthRatio, volumeRatio } from "../lib/asymmetries";
import { antagonistOf, canonMuscles, canonPatterns, FOCUS_KINDS, focusSide, groupByPeriod, tally, type FocusHit, type Period, type Tally } from "../lib/movement";
import { fmtNum } from "@treino/core/text";
import type { Assessment, Exercise, Focus, Session, Side, TestDef } from "@treino/core/types";
import Seg from "./Seg";

const SIDE_TO: Record<Side, string> = { left: "à esq.", right: "à dir." };
const SIDE_NAME: Record<Side, string> = { left: "Esquerdo", right: "Direito" };
const SIDES = ["left", "right"] as const;
const fmtRatio = (r: number | null) => (r == null ? "–" : fmtNum(Math.round(r * 100) / 100));

const PERIODS: [Period, string][] = [
  ["session", "Sessão"],
  ["week", "Semana"],
  ["month", "Mês"],
  ["year", "Ano"],
  ["all", "Total"],
];

/** Sets per movement pattern and client focus, for one session / week / month / year, or all time; asymmetries against their antagonists. */
export default function CountsView({ sessions, exercises, focuses, assessments, tests }: { sessions: Session[]; exercises: Exercise[]; focuses: Focus[]; assessments: Assessment[]; tests: TestDef[] }) {
  const [period, setPeriod] = useViewState<Period>("counts:period", "week");
  const [at, setAt] = useViewState("counts:at", 0);
  const groups = useMemo(() => groupByPeriod(sessions, period), [sessions, period]);
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const group = groups[Math.min(at, groups.length - 1)];
  const t = useMemo(() => (group ? tally(group.sessions, byId, focuses) : null), [group, byId, focuses]);

  if (!group || !t) return <p className="text-sm text-muted">As contagens aparecem quando o cliente tiver sessões.</p>;

  // patterns the client's focuses ask for but this period did not train
  const wanted = canonPatterns(focuses.flatMap((f) => f.patterns));
  const patterns = [...t.patterns.entries(), ...wanted.filter((p) => !t.patterns.has(p)).map((p) => [p, 0] as [string, number])];
  const profiles = focuses.filter((f) => f.kind !== "asymmetry");
  const asymmetries = focuses.filter((f) => f.kind === "asymmetry");

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
          <ArrowLeft />
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

      {profiles.length > 0 && (
        <Section title="Perfis do cliente">
          {profiles.map((f) => {
            const hit = t.focus.get(f.id);
            return (
              <div key={f.id} className="flex flex-col gap-1">
                <Bar label={`${f.name} · ${FOCUS_KINDS.find(([k]) => k === f.kind)?.[2]}`} n={hit?.sets ?? 0} total={t.sets} />
                {hit && <span className="text-xs text-muted truncate">{[...hit.exercises].join(" · ")}</span>}
              </div>
            );
          })}
        </Section>
      )}

      {asymmetries.map((f) => (
        <AsymmetryCard key={f.id} focus={f} hit={t.focus.get(f.id)} extra={t.extra} assessments={assessments} tests={tests} />
      ))}

      <Section title="Padrões de movimento">
        <Bars entries={patterns} total={t.sets} wanted={wanted} />
      </Section>
      {!asymmetries.length && (t.extra.left.sets > 0 || t.extra.right.sets > 0) && (
        <Section title="Correção por lado">
          {(["left", "right"] as const).map((side) => (
            <div key={side} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-sm">
                <span>{side === "left" ? "Esquerdo" : "Direito"}</span>
                <span className="tabular-nums">
                  <b className={t.extra[side].sets ? "text-accent" : ""}>{t.extra[side].sets}</b> <span className="text-xs text-muted">séries extra</span>
                </span>
              </div>
              {t.extra[side].sets > 0 && (
                <span className="text-xs text-muted">
                  {[...t.extra[side].exercises].map(([name, n]) => `${name} +${n}`).join(" · ")}
                </span>
              )}
            </div>
          ))}
          <p className="text-xs text-muted">Escreve E+1 ou D+1 na linha do exercício, ou usa “Séries extra” ao tocar no nome.</p>
        </Section>
      )}
      <p className="text-xs text-muted">Conta as séries feitas (✓); numa sessão ainda sem nada marcado, as prescritas. Circuitos contam uma série por ronda. As séries extra de um lado contam em todos os totais.</p>
    </div>
  );
}

/** One asymmetry: sets per side against the antagonists, the extra sets on the weaker side, and what the tests say. */
function AsymmetryCard({ focus, hit, extra, assessments, tests }: { focus: Focus; hit: FocusHit | undefined; extra: Tally["extra"]; assessments: Assessment[]; tests: TestDef[] }) {
  const muscles = canonMuscles(focus.muscles);
  const side = focusSide(focus);
  const anta = antagonistOf(muscles);
  const own = sideTests(muscles, assessments, tests);
  const other = anta && !anta.crossed ? sideTests(anta.muscles, assessments, tests) : [];
  const strength = strengthRatio(own, other);
  const vol = hit?.own && hit.antagonist ? { own: hit.own, antagonist: hit.antagonist } : { own: { left: 0, right: 0 }, antagonist: { left: 0, right: 0 } };
  const ratio = volumeRatio(vol.own, vol.antagonist);
  const opposite: Side | null = side && (side === "left" ? "right" : "left");

  return (
    <Section title={`Assimetria · ${focus.name}`}>
      {!muscles.length || !side ? (
        <p className="text-xs text-danger">Escolhe os músculos e o lado mais fraco no perfil (Biblioteca → Perfis).</p>
      ) : (
        <p className="text-xs text-muted">
          {muscles.join(", ")} · mais fraco {SIDE_TO[side]}
          {anta && ` · antagonista: ${anta.crossed ? "o mesmo músculo do outro lado" : anta.muscles.join(", ")}`}
        </p>
      )}

      {muscles.length > 0 && (
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-xs text-muted text-left">
              <th className="font-normal">Séries</th>
              <th className="font-normal text-right">Músculo</th>
              {anta && !anta.crossed && (
                <>
                  <th className="font-normal text-right">Antagonista</th>
                  <th className="font-normal text-right">Razão</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {SIDES.map((s) => (
              <tr key={s} className={s === side ? "font-semibold" : ""}>
                <td>{SIDE_NAME[s]}</td>
                <td className="text-right">{fmtNum(vol.own[s])}</td>
                {anta && !anta.crossed && (
                  <>
                    <td className="text-right">{fmtNum(vol.antagonist[s])}</td>
                    <td className="text-right">{fmtRatio(ratio[s])}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {anta?.crossed && side && opposite && <p className="text-xs text-muted">Razão {SIDE_TO[side]} ÷ outro lado: {fmtRatio(vol.own[opposite] ? vol.own[side] / vol.own[opposite] : null)}</p>}

      {side && (
        <span className={`text-xs ${hit?.extra ? "text-accent" : "text-muted"}`}>
          {hit?.extra ? `${hit.extra} série${hit.extra === 1 ? "" : "s"} extra ${SIDE_TO[side]}: ${[...extra[side].exercises].map(([name, n]) => `${name} +${n}`).join(" · ")}` : `Sem séries extra ${SIDE_TO[side]} (escreve ${side === "left" ? "E" : "D"}+1 na linha do exercício).`}
        </span>
      )}

      {strength && (
        <div className="text-xs">
          <span className="text-muted">Força ({strength.own.test.name} ÷ {strength.antagonist.test.name}): </span>
          {SIDES.map((s) => `${SIDE_TO[s].replace("à ", "")} ${fmtRatio(strength.ratio[s])}`).join(" · ")}
        </div>
      )}

      {own.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted">Testes destes músculos (último)</span>
          {own.map((x) => (
            <div key={x.test.id} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate">{x.test.name}</span>
              <span className="text-xs text-right shrink-0">
                {x.asym ? fmtAsymmetry(x.asym, x.test.unit) : "–"}
                {x.before && <span className="text-muted"> · antes {fmtAsymmetry(x.before, x.test.unit).toLowerCase()}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </Section>
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
