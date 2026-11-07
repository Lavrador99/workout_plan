import { useState } from "react";
import { TEST_CATEGORIES } from "../lib/assessment";
import { go } from "../lib/hooks";
import { norm } from "../lib/text";
import type { TestDef } from "../lib/types";
import { testGroups } from "../pages/TestsPage";
import Sheet, { SheetFooter } from "./Sheet";

interface Props {
  tests: TestDef[];
  picked: Set<string>; // ids already in the assessment
  onAdd: (tests: TestDef[]) => void;
  onClose: () => void;
}

/** Add tests to an assessment, one at a time or a whole battery. */
export default function TestPicker({ tests, picked, onAdd, onClose }: Props) {
  const [q, setQ] = useState("");
  const free = tests.filter((t) => !picked.has(t.id));
  const list = free.filter((t) => !q.trim() || norm(t.name).includes(norm(q)));

  return (
    <Sheet title="Adicionar testes" tall onClose={onClose}>
      <input className="input" placeholder="Procurar teste…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {testGroups(tests).map((g) => {
          const missing = free.filter((t) => t.groups.includes(g));
          return (
            <button key={g} type="button" className="chip disabled:opacity-40" disabled={!missing.length} onClick={() => onAdd(missing)}>
              + {g}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2">
        {TEST_CATEGORIES.map((category) => {
          const inCategory = list.filter((t) => t.category === category);
          if (!inCategory.length) return null;
          return (
            <section key={category}>
              <h3 className="label capitalize pb-1">{category}</h3>
              <ul className="flex flex-col">
                {inCategory.map((t) => (
                  <li key={t.id}>
                    <button type="button" className="w-full text-left py-2 flex items-center gap-2 border-b border-border" onClick={() => onAdd([t])}>
                      <span className="flex-1 min-w-0 truncate">{t.name}</span>
                      <span className="text-xs text-muted shrink-0">
                        {t.unit}
                        {t.sided ? " · E/D" : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {list.length === 0 && <p className="text-sm text-muted">Nenhum teste por adicionar.</p>}
      </div>
      <button type="button" className="btn-ghost text-accent self-start -ml-3" onClick={() => go("library", "tests")}>
        Gerir testes →
      </button>
      <SheetFooter>
        <button type="button" className="btn-accent flex-1" onClick={onClose}>
          Concluir
        </button>
      </SheetFooter>
    </Sheet>
  );
}
