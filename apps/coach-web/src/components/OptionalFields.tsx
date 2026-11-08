import { Plus, X } from "lucide-react";
import { useState } from "react";
import { GRIPS, STANCES } from "../lib/movement";
import type { Item } from "@treino/core/types";
import { ChipPick } from "./Chips";
import MethodFields from "./MethodFields";
import { TempoField } from "./RxFields";
import Stepper from "./Stepper";

type Key = "tempo" | "method" | "hold" | "rm" | "extra" | "grip" | "stance";

/** In the order the chips show. */
const LABELS: Record<Key, string> = {
  extra: "Séries extra",
  grip: "Pega",
  stance: "Pés",
  tempo: "Cadência",
  method: "Método",
  hold: "Isometria",
  rm: "Teste RM",
};

/** Clears the field so removing it leaves no trace in the item. */
const CLEAR: Record<Key, Partial<Item>> = {
  tempo: { tempo: undefined },
  method: { method: undefined },
  hold: { holdSec: null },
  rm: { rmTest: null },
  extra: { extraLeft: undefined, extraRight: undefined },
  grip: { grip: undefined },
  stance: { stance: undefined },
};

function hasValue(item: Item, k: Key): boolean {
  switch (k) {
    case "tempo":
      return !!item.tempo;
    case "method":
      return !!item.method;
    case "hold":
      return !!item.holdSec;
    case "rm":
      return !!item.rmTest;
    case "extra":
      return !!item.extraLeft || !!item.extraRight;
    case "grip":
      return !!item.grip;
    case "stance":
      return !!item.stance;
  }
}

/** Rarely-used prescription details: shown when set, otherwise added with a tap. */
export default function OptionalFields({ item, onChange, keys }: { item: Item; onChange: (i: Item) => void; keys?: Key[] }) {
  const all = keys ?? (Object.keys(LABELS) as Key[]);
  const [added, setAdded] = useState<Set<Key>>(new Set());
  const shown = all.filter((k) => added.has(k) || hasValue(item, k));
  const hidden = all.filter((k) => !shown.includes(k));

  const remove = (k: Key) => {
    setAdded((s) => {
      const n = new Set(s);
      n.delete(k);
      return n;
    });
    onChange({ ...item, ...CLEAR[k] });
  };

  const field = (k: Key) => {
    switch (k) {
      case "tempo":
        return <TempoField value={item.tempo ?? ""} onChange={(t) => onChange({ ...item, tempo: t || undefined })} />;
      case "method":
        return <MethodFields item={item} onChange={onChange} />;
      case "hold":
        return <Stepper label="Isometria" suffix="s" value={item.holdSec} step={1} onChange={(v) => onChange({ ...item, holdSec: v || null })} />;
      case "rm":
        return <Stepper label="Teste RM" value={item.rmTest} step={1} onChange={(v) => onChange({ ...item, rmTest: v || null })} />;
      case "extra":
        return (
          <div className="grid grid-cols-2 gap-2">
            <Stepper label="Séries extra esq." value={item.extraLeft ?? 0} step={1} onChange={(v) => onChange({ ...item, extraLeft: v || undefined })} />
            <Stepper label="Séries extra dir." value={item.extraRight ?? 0} step={1} onChange={(v) => onChange({ ...item, extraRight: v || undefined })} />
          </div>
        );
      case "grip":
        return (
          <div className="flex flex-col gap-1">
            <span className="label">Pega</span>
            <ChipPick options={GRIPS} value={item.grip} onChange={(grip) => onChange({ ...item, grip })} />
          </div>
        );
      case "stance":
        return (
          <div className="flex flex-col gap-1">
            <span className="label">Pés</span>
            <ChipPick options={STANCES} value={item.stance} onChange={(stance) => onChange({ ...item, stance })} />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {shown.map((k) => (
        <div key={k} className="relative pr-9">
          {field(k)}
          <button type="button" className="absolute top-0 right-0 w-8 h-8 inline-flex items-center justify-center text-muted" aria-label={`Remover ${LABELS[k]}`} onClick={() => remove(k)}>
            <X size={16} />
          </button>
        </div>
      ))}
      {hidden.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {hidden.map((k) => (
            <button key={k} type="button" className="chip text-muted" onClick={() => setAdded((s) => new Set(s).add(k))}>
              <Plus size={14} className="inline -mt-0.5" /> {LABELS[k]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
