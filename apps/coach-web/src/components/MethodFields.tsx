import type { Item, ItemMethod } from "../lib/types";
import Stepper from "./Stepper";

const METHODS: [ItemMethod["type"] | "", string][] = [
  ["", "Normal"],
  ["restpause", "Rest-pause"],
  ["cluster", "Cluster"],
  ["myo", "Myo-reps"],
  ["mechdrop", "Drop mecânico"],
];

const DEFAULTS: Record<ItemMethod["type"], ItemMethod> = {
  restpause: { type: "restpause", miniSets: 2, pause: 15 },
  cluster: { type: "cluster", clusters: 4, reps: 2, pause: 20 },
  myo: { type: "myo", activation: 15, miniSets: 4, miniReps: 4, pause: 5 },
  mechdrop: { type: "mechdrop", variants: "" },
};

/** How each set is executed. Drop sets are separate "D" sets in the table. */
export default function MethodFields({ item, onChange }: { item: Item; onChange: (i: Item) => void }) {
  const m = item.method;
  const set = (patch: Partial<ItemMethod>) => m && onChange({ ...item, method: { ...m, ...patch } as ItemMethod });
  const n = (v: number | null) => Math.max(0, v ?? 0);

  return (
    <div className="flex flex-col gap-2">
      <span className="label">Método da série</span>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {METHODS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`chip ${(m?.type ?? "") === k ? "chip-on" : ""}`}
            onClick={() => onChange({ ...item, method: k ? (m?.type === k ? m : DEFAULTS[k]) : undefined })}
          >
            {label}
          </button>
        ))}
      </div>
      {m?.type === "restpause" && (
        <div className="grid grid-cols-2 gap-2">
          <Stepper label="Mini-séries" value={m.miniSets} step={1} onChange={(v) => set({ miniSets: n(v) })} />
          <Stepper label="Pausa" suffix="s" value={m.pause} step={5} onChange={(v) => set({ pause: n(v) })} />
        </div>
      )}
      {m?.type === "cluster" && (
        <div className="grid grid-cols-3 gap-2">
          <Stepper label="Clusters" value={m.clusters} step={1} onChange={(v) => set({ clusters: n(v) })} />
          <Stepper label="Reps" value={m.reps} step={1} onChange={(v) => set({ reps: n(v) })} />
          <Stepper label="Pausa" suffix="s" value={m.pause} step={5} onChange={(v) => set({ pause: n(v) })} />
        </div>
      )}
      {m?.type === "myo" && (
        <div className="grid grid-cols-2 gap-2">
          <Stepper label="Ativação" value={m.activation} step={1} onChange={(v) => set({ activation: n(v) })} />
          <Stepper label="Mini-séries" value={m.miniSets} step={1} onChange={(v) => set({ miniSets: n(v) })} />
          <Stepper label="Reps mini" value={m.miniReps} step={1} onChange={(v) => set({ miniReps: n(v) })} />
          <Stepper label="Pausa" suffix="s" value={m.pause} step={5} onChange={(v) => set({ pause: n(v) })} />
        </div>
      )}
      {m?.type === "mechdrop" && (
        <input
          className="input"
          value={m.variants}
          placeholder="ex: inclinado → plano → declinado"
          onChange={(e) => set({ variants: e.target.value })}
        />
      )}
    </div>
  );
}
