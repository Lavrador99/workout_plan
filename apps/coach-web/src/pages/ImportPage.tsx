import { toast } from "../components/Toast";
import { useMemo, useState } from "react";
import { linkItems, newSession, save } from "../lib/db";
import PageHeader from "../components/PageHeader";
import { fmtBlock } from "@treino/core/format";
import { back, useClient } from "../lib/hooks";
import { parseImport } from "../lib/parser";
import { fmtDate, todayISO } from "@treino/core/text";

/** Paste a client's old notes → sessions + library. */
export default function ImportPage({ clientId }: { clientId: string }) {
  const client = useClient(clientId);
  const [text, setText] = useState("");
  const [skip, setSkip] = useState<Set<number>>(new Set());
  const [markDone, setMarkDone] = useState(true);
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => parseImport(text), [text]);

  const run = async () => {
    setBusy(true);
    const today = todayISO();
    let n = 0;
    for (const [i, p] of parsed.entries()) {
      if (skip.has(i)) continue;
      const date = p.date ?? today;
      const blocks = [];
      for (const b of p.blocks) {
        const items = (await linkItems(b.items)).map((it) => ({ ...it, sets: it.sets.map((s) => ({ ...s, done: markDone && date < today })) }));
        blocks.push({ ...b, items });
      }
      await save("sessions", { ...newSession(clientId), date, title: p.title, blocks });
      n++;
    }
    setBusy(false);
    toast(`${n} sessões importadas.`);
    back("client", clientId);
  };

  return (
    <>
    <PageHeader title="Importar treinos" subtitle={client?.name} back={["client", clientId]} />
    <div className="page">
      <p className="text-sm text-muted">
        Cola aqui as notas antigas deste cliente. As sessões são separadas por datas (dd/mm/aaaa) ou linhas ———. Revê em baixo e desmarca o que não for treino.
      </p>
      <textarea className="input min-h-[200px] py-2 font-mono text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="30/10/2026&#10;Fullbody&#10;&#10;Step up - 3x8 2x8kg (E +1)&#10;…" />

      {parsed.length > 0 && (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={markDone} onChange={(e) => setMarkDone(e.target.checked)} />
            Marcar séries de datas passadas como feitas (conta para as marcas)
          </label>
          <ul className="flex flex-col gap-2">
            {parsed.map((p, i) => (
              <li key={i} className={`card p-3 ${skip.has(i) ? "opacity-40" : ""}`}>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={!skip.has(i)}
                    onChange={() => {
                      const s = new Set(skip);
                      if (s.has(i)) s.delete(i);
                      else s.add(i);
                      setSkip(s);
                    }}
                  />
                  <span className="font-semibold">{p.date ? fmtDate(p.date) : <span className="text-danger">sem data (fica hoje)</span>}</span>
                  <span className="text-accent text-sm">{p.title}</span>
                </label>
                <pre className="text-xs text-muted whitespace-pre-wrap font-sans">{p.blocks.map(fmtBlock).join("\n\n")}</pre>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-accent sticky bottom-20" disabled={busy} onClick={run}>
            {busy ? "A importar…" : `Importar ${parsed.length - skip.size} sessões`}
          </button>
        </>
      )}
    </div>
    </>
  );
}
