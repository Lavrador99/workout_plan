import { benchmark, clientContext, fmtPosition, latestComparable, type Benchmark, type Tier } from "../lib/benchmark";
import type { VersionSeries } from "../lib/assessment";
import { go, useFocuses } from "../lib/hooks";
import { fmtDate, fmtNum } from "../lib/text";
import type { Client } from "../lib/types";

const TIER: Record<Tier, string> = {
  1: "Mesma modalidade, sexo e nível",
  2: "Mesma modalidade e sexo, outro nível",
  3: "Pessoas ativas",
  4: "População geral",
};

function Row({ b, unit }: { b: Benchmark; unit: string }) {
  const d = b.dataset;
  const median = d.percentiles?.find(([p]) => p === 50)?.[1];
  return (
    <li className="flex flex-col gap-0.5">
      <div className="flex items-baseline gap-2">
        <span className="font-bold text-lg shrink-0">{fmtPosition(b.position)}</span>
        <span className="text-sm flex-1 min-w-0">{d.label}</span>
      </div>
      <p className="text-xs text-muted">
        {TIER[b.tier]} · evidência {b.evidence}
        {b.evidence === "D" ? " (só indicativa)" : ""}
      </p>
      <p className="text-xs text-muted">
        {d.mean != null ? `Média ${fmtNum(d.mean)} ${unit}${d.sd ? `, desvio-padrão ${fmtNum(d.sd)}` : ""} · ` : median != null ? `Mediana ${fmtNum(median)} ${unit} · ` : ""}
        {d.subjects.toLocaleString("pt-PT")} pessoas, {d.studies} {d.studies === 1 ? "estudo" : "estudos"}
      </p>
    </li>
  );
}

/** The latest result against published references, or why there is no comparison. */
export default function BenchmarkCard({ client, testId, v }: { client: Client; testId: string; v: VersionSeries }) {
  const focuses = useFocuses() ?? [];
  const last = latestComparable(v);

  if (!last) return <NoReference />;
  const outcome = benchmark({ testId, version: v.version, direction: v.direction, sided: v.sided, strength: v.strength }, last.value, clientContext(client, focuses, last.date));

  if (outcome.status === "no_compatible_reference") return <NoReference />;
  if (outcome.status === "missing_data")
    return (
      <button type="button" className="card p-3 text-left text-sm" onClick={() => go("client", client.id, "info")}>
        <span className="label block">Comparação científica</span>
        Para comparar, falta preencher na ficha: {outcome.missing.join(" e ")}. <span className="text-accent2">Abrir ficha ›</span>
      </button>
    );

  return (
    <section className="card p-3 flex flex-col gap-3">
      <h2 className="label">
        Comparação científica · {fmtDate(last.date)} · {fmtNum(last.value)} {v.unit}
        {v.sided ? ", melhor lado" : ""}
      </h2>
      <ul className="flex flex-col gap-3">
        {outcome.benchmarks.map((b) => (
          <Row key={b.dataset.id} b={b} unit={v.unit} />
        ))}
      </ul>
      <div className="flex flex-col gap-1 text-xs text-muted border-t border-border pt-2">
        {outcome.benchmarks.some((b) => b.position.estimated) && <p>Percentil estimado da média e do desvio-padrão, assumindo distribuição normal.</p>}
        {[...new Set(outcome.benchmarks.map((b) => b.dataset.limitations))].filter(Boolean).map((text) => (
          <p key={text}>{text}</p>
        ))}
        {[...new Map(outcome.benchmarks.flatMap((b) => (b.source ? [[b.source.id, b.source] as const] : []))).values()].map((source) => (
          <a key={source.id} className="text-accent2" href={source.url} target="_blank" rel="noreferrer">
            {source.citation}
          </a>
        ))}
        <p>Compara com grupos publicados. Não é um diagnóstico nem uma nota do atleta.</p>
      </div>
    </section>
  );
}

function NoReference() {
  return (
    <p className="text-xs text-muted">
      <span className="label block">Comparação científica</span>
      Sem referência compatível para este teste. Fica só a evolução individual.
    </p>
  );
}
