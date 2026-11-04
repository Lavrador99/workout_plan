import { useMemo, useState } from "react";
import Chips, { ChipGroups, ChipPick } from "../components/Chips";
import Seg from "../components/Seg";
import { TEST_CATEGORIES } from "../lib/assessment";
import { newTest, remove, save } from "../lib/db";
import { go, useTests, useUsedVersions } from "../lib/hooks";
import { canonMuscles, canonPatterns, MUSCLE_CHIP_GROUPS, PATTERN_GROUPS } from "../lib/movement";
import { norm, num, uid } from "../lib/text";
import type { Aggregate, Direction, TestCategory, TestDef } from "../lib/types";

export const DIRECTIONS: [Direction, string][] = [
  ["higher", "Mais é melhor"],
  ["lower", "Menos é melhor"],
  ["neutral", "Neutro"],
];

const AGGREGATES: [Aggregate, string][] = [
  ["best", "Melhor"],
  ["mean", "Média"],
  ["last", "Última"],
];

/** Batteries, from the tests' group labels. */
export function testGroups(tests: TestDef[]): string[] {
  return [...new Set(tests.flatMap((t) => t.groups))].sort((a, b) => a.localeCompare(b, "pt"));
}

/** Tests that can be used in assessments: base ones and the coach's own. */
export default function TestsPage() {
  const tests = useTests() ?? [];
  const used = useUsedVersions();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | undefined>();
  const [editing, setEditing] = useState<string | null>(null);

  const groups = useMemo(() => testGroups(tests), [tests]);
  const list = tests.filter((t) => (!group || t.groups.includes(group)) && (!q.trim() || norm(t.name).includes(norm(q))));
  const exact = tests.some((t) => norm(t.name) === norm(q));

  const create = async () => {
    const t = await save("tests", newTest(q.trim()));
    setQ("");
    setGroup(undefined);
    setEditing(t.id);
  };

  return (
    <div className="flex flex-col gap-3 p-3 pb-28">
      <div className="flex items-center gap-2">
        <button type="button" className="btn-ghost -ml-2" onClick={() => go("library")}>
          ←
        </button>
        <h1 className="text-xl font-bold flex-1">Testes de avaliação</h1>
      </div>
      <div className="flex gap-2">
        <input className="input" placeholder={`Procurar em ${tests.length} testes ou criar um novo…`} value={q} onChange={(e) => setQ(e.target.value)} />
        {q.trim() && !exact && (
          <button type="button" className="btn-accent shrink-0" onClick={create}>
            + Criar
          </button>
        )}
      </div>
      {groups.length > 0 && <ChipPick options={groups} value={group} onChange={setGroup} />}

      {TEST_CATEGORIES.map((category) => {
        const inCategory = list.filter((t) => t.category === category);
        if (!inCategory.length) return null;
        return (
          <section key={category} className="flex flex-col gap-1">
            <h2 className="label capitalize">{category}</h2>
            <ul className="card divide-y divide-border">
              {inCategory.map((t) => (
                <li key={t.id}>
                  {editing === t.id ? (
                    <TestEditor test={t} tests={tests} locked={!!used.get(t.id)?.has(t.version)} onClose={() => setEditing(null)} />
                  ) : (
                    <button type="button" className="w-full text-left px-3 py-2 flex items-center gap-2" onClick={() => setEditing(t.id)}>
                      <span className="flex-1 min-w-0 truncate">{t.name}</span>
                      <span className="text-xs text-muted shrink-0">
                        {t.unit}
                        {t.sided ? " · E/D" : ""}
                        {t.version > 1 ? ` · v${t.version}` : ""}
                      </span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {list.length === 0 && <p className="text-sm text-muted">Nenhum teste encontrado.</p>}
    </div>
  );
}

function TestEditor({ test, tests, locked, onClose }: { test: TestDef; tests: TestDef[]; locked: boolean; onClose: () => void }) {
  const [t, setT] = useState(test);
  const [newGroup, setNewGroup] = useState("");

  /** Text fields are stored when they lose focus, choices straight away. */
  const edit = (patch: Partial<TestDef>) => setT({ ...t, ...patch });
  const choose = (patch: Partial<TestDef>) => {
    const next = { ...t, ...patch };
    setT(next);
    void save("tests", next);
  };
  const persist = () => void save("tests", t);

  const addGroup = () => {
    const g = newGroup.trim();
    if (g && !t.groups.includes(g)) choose({ groups: [...t.groups, g] });
    setNewGroup("");
  };
  const newVersion = () => {
    if (confirm(`Criar a versão ${t.version + 1} do protocolo? Os resultados antigos ficam guardados, mas deixam de ser comparados com os novos.`)) choose({ version: t.version + 1 });
  };
  const duplicate = async () => {
    const copy = await save("tests", { ...t, id: uid(), name: `${t.name} (cópia)`, version: 1, updatedAt: 0 });
    setT(copy);
  };

  return (
    <div className="p-3 flex flex-col gap-3" onBlur={persist}>
      <Field label="Nome">
        <input className="input" value={t.name} onChange={(e) => edit({ name: e.target.value })} />
      </Field>
      <div className="flex flex-col gap-1">
        <span className="label">Categoria</span>
        <ChipPick options={TEST_CATEGORIES} value={t.category} onChange={(c) => c && choose({ category: c as TestCategory })} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="label">Protocolo · versão {t.version}</span>
        {locked && <p className="text-xs text-warn">Já tem resultados nesta versão. Para mudar estes campos, cria uma versão nova.</p>}
        <fieldset disabled={locked} className={`flex flex-col gap-2 ${locked ? "opacity-50" : ""}`}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Unidade">
              <input className="input" value={t.unit} placeholder="cm, kg, s, °" onChange={(e) => edit({ unit: e.target.value })} />
            </Field>
            <Field label="Tentativas">
              <input className="input" inputMode="numeric" value={t.trials || ""} onChange={(e) => edit({ trials: num(e.target.value) ?? 0 })} />
            </Field>
          </div>
          <Seg options={DIRECTIONS} value={t.direction} onChange={(v) => choose({ direction: v as Direction })} />
          <div className="flex flex-wrap gap-2">
            <Seg
              options={[
                ["no", "Sem lado"],
                ["yes", "Por lado"],
              ]}
              value={t.sided ? "yes" : "no"}
              onChange={(v) => choose({ sided: v === "yes" })}
            />
            <Seg options={AGGREGATES} value={t.aggregate} onChange={(v) => choose({ aggregate: v as Aggregate })} />
          </div>
          <Seg
            options={[
              ["measure", "Medida"],
              ["scale", "Escala"],
            ]}
            value={t.scale ? "scale" : "measure"}
            onChange={(v) => choose(v === "scale" ? { scale: { min: 1, max: 5 }, unit: "pts", trials: 1 } : { scale: null })}
          />
          {t.scale && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Mínimo">
                <input className="input" inputMode="numeric" value={t.scale.min} onChange={(e) => edit({ scale: { ...t.scale!, min: num(e.target.value) ?? 0 } })} />
              </Field>
              <Field label="Máximo">
                <input className="input" inputMode="numeric" value={t.scale.max} onChange={(e) => edit({ scale: { ...t.scale!, max: num(e.target.value) ?? 0 } })} />
              </Field>
            </div>
          )}
        </fieldset>
        {locked && (
          <button type="button" className="btn self-start" onClick={newVersion}>
            Nova versão do protocolo
          </button>
        )}
      </div>

      <Field label="Objetivo do teste">
        <textarea className="input py-2" rows={2} value={t.purpose} onChange={(e) => edit({ purpose: e.target.value })} />
      </Field>
      <Field label="Material">
        <input className="input" value={t.equipment} onChange={(e) => edit({ equipment: e.target.value })} />
      </Field>
      <Field label="Instruções">
        <textarea className="input py-2" rows={3} value={t.instructions} onChange={(e) => edit({ instructions: e.target.value })} />
      </Field>
      <Field label="Critérios de validade">
        <textarea className="input py-2" rows={2} value={t.validity} onChange={(e) => edit({ validity: e.target.value })} />
      </Field>
      <Field label="Link de demonstração">
        <input className="input" inputMode="url" value={t.demoUrl ?? ""} onChange={(e) => edit({ demoUrl: e.target.value })} />
      </Field>

      <div className="flex flex-col gap-1">
        <span className="label">Baterias</span>
        <Chips options={[...new Set([...testGroups(tests), ...t.groups])]} value={t.groups} onChange={(groups) => choose({ groups })} />
        <div className="flex gap-2">
          <input className="input" placeholder="Nova bateria (ex: Pré-época futebol)" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGroup()} />
          <button type="button" className="btn shrink-0" onClick={addGroup} disabled={!newGroup.trim()}>
            + Adicionar
          </button>
        </div>
      </div>

      <details>
        <summary className="label cursor-pointer">Músculos e padrões (para o mapa corporal)</summary>
        <div className="flex flex-col gap-3 pt-2">
          <ChipGroups groups={MUSCLE_CHIP_GROUPS} value={canonMuscles(t.muscles ?? [])} onChange={(muscles) => choose({ muscles })} />
          <ChipGroups groups={PATTERN_GROUPS} value={canonPatterns(t.patterns ?? [])} onChange={(patterns) => choose({ patterns })} />
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-accent" onClick={onClose}>
          Fechar
        </button>
        <button type="button" className="btn" onClick={duplicate}>
          Copiar teste
        </button>
        <button
          type="button"
          className="btn text-danger"
          onClick={async () => {
            if (!confirm(`Apagar ${t.name}? Os resultados já registados ficam guardados.`)) return;
            await remove("tests", t.id);
            onClose();
          }}
        >
          Apagar
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
