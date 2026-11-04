import { changeTone, compare, fmtChange, SIDE_SHORT, testMdc, type CompareRow } from "../lib/assessment";
import { TONE_CLASS } from "../components/ResultCard";
import { go, useAssessment, useClient, useTests } from "../lib/hooks";
import { fmtDate, fmtNum } from "../lib/text";

const NOTE: Partial<Record<CompareRow["status"], string>> = { "different-protocol": "Protocolo diferente: não comparável" };

function Row({ row }: { row: CompareRow }) {
  const c = row.change;
  return (
    <tr>
      <td className="py-1 text-muted font-semibold">{row.side ? SIDE_SHORT[row.side] : ""}</td>
      <td className="py-1 pr-2 text-right whitespace-nowrap">{fmtNum(row.older) || "—"}</td>
      <td className="py-1 pr-2 text-right whitespace-nowrap font-semibold">{fmtNum(row.newer) || "—"}</td>
      <td className={`py-1 text-right ${c ? TONE_CLASS[changeTone(c)] : ""}`}>{c ? fmtChange(c, row.unit) : ""}</td>
    </tr>
  );
}

/** Two assessments side by side: the older one first, whatever order they were picked in. */
export default function ComparePage({ clientId, a, b }: { clientId: string; a: string; b: string }) {
  const client = useClient(clientId);
  const first = useAssessment(a);
  const second = useAssessment(b);
  const library = useTests() ?? [];
  if (first === null || second === null) return <p className="p-4 text-muted">Avaliação não encontrada.</p>;
  if (!first || !second) return null;

  const [older, newer] = first.date < second.date || (first.date === second.date && first.updatedAt <= second.updatedAt) ? [first, second] : [second, first];
  const rows = compare(older, newer, (r) => testMdc(library.find((t) => t.id === r.testId), r.version));
  const tests = [...new Map(rows.map((r) => [r.testId, rows.filter((x) => x.testId === r.testId)])).values()];

  return (
    <div className="flex flex-col gap-3 p-3 pb-28">
      <div className="flex items-center gap-2">
        <button type="button" className="btn-ghost -ml-2" onClick={() => go("client", clientId, "assessments")}>
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">Comparação</h1>
          <p className="text-xs text-muted truncate">{client?.name}</p>
        </div>
      </div>
      <p className="text-sm">
        {fmtDate(older.date)}
        {older.title ? ` · ${older.title}` : ""} → <span className="font-semibold">{fmtDate(newer.date)}</span>
        {newer.title ? ` · ${newer.title}` : ""}
      </p>

      {rows.some((r) => r.change?.improved != null && r.change.confirmed == null) && <p className="text-xs text-muted">Sem cor: o erro de medição do teste não está definido, ou a mudança não o ultrapassa.</p>}

      {tests.length === 0 ? (
        <p className="text-sm text-muted">Estas avaliações ainda não têm testes.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tests.map((list) => {
            const r = list[0];
            const note = r.status === "only-older" ? `Só em ${fmtDate(older.date)}` : r.status === "only-newer" ? `Só em ${fmtDate(newer.date)}` : NOTE[r.status];
            return (
              <li key={r.testId}>
                <button type="button" className="card w-full text-left p-3 flex flex-col gap-1" onClick={() => go("evolution", clientId, r.testId)}>
                  <span className="flex items-baseline gap-2">
                    <span className="font-semibold flex-1 min-w-0 truncate">{r.name}</span>
                    <span className="text-xs text-muted shrink-0">{r.unit}</span>
                  </span>
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col className="w-6" />
                      <col className="w-14" />
                      <col className="w-14" />
                      <col />
                    </colgroup>
                    <tbody>
                      {list.map((row) => (
                        <Row key={row.side ?? "both"} row={row} />
                      ))}
                    </tbody>
                  </table>
                  {note && <span className="text-xs text-warn">{note}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
