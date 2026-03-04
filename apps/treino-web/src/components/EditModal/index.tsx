import type { Exercise } from "@/types";
import { useEffect, useState } from "react";

export interface EditCtx {
  exercise: Exercise;
  setIdx: number;
  initialReps?: number;
  initialWeight?: number | null;
}

interface EditModalProps {
  ctx: EditCtx | null;
  onSave: (reps: number, weight: number | null) => void;
  onClear: () => void;
  onClose: () => void;
}

export function EditModal({ ctx, onSave, onClear, onClose }: EditModalProps) {
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");

  useEffect(() => {
    if (ctx) {
      setReps(
        ctx.initialReps != null
          ? String(ctx.initialReps)
          : String(ctx.exercise.reps),
      );
      setWeight(ctx.initialWeight != null ? String(ctx.initialWeight) : "");
    }
  }, [ctx]);

  if (!ctx) return null;

  const { exercise, setIdx } = ctx;
  const isHold = exercise.isHold;

  const handleSave = () => {
    const repsVal = parseFloat(reps);
    if (isNaN(repsVal) || repsVal < 0) return;
    const weightVal = exercise.weight ? parseFloat(weight) || null : null;
    onSave(repsVal, weightVal);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[500] flex items-end justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-card border border-border rounded-t-2xl w-full max-w-lg shadow-[0_-8px_40px_#0009] animate-slide-up"
        style={{
          padding: "24px 20px",
          paddingBottom: "max(32px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="text-[13px] font-bold text-muted uppercase tracking-widest mb-4">
          Editar S{setIdx + 1} — {exercise.name}
        </div>

        <div className="flex gap-3 mb-4">
          {exercise.weight && (
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-[11px] text-muted font-semibold tracking-wide">
                CARGA (kg)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="kg"
                className="bg-card2 border border-border rounded-lg text-text text-2xl font-extrabold p-2.5 text-center w-full outline-none focus:border-accent"
              />
            </div>
          )}
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-[11px] text-muted font-semibold tracking-wide">
              {isHold ? "TEMPO (s)" : "REPS"}
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="0"
              className="bg-card2 border border-border rounded-lg text-text text-2xl font-extrabold p-2.5 text-center w-full outline-none focus:border-accent"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              autoFocus
            />
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg bg-card2 border border-border text-text font-bold"
          >
            Cancelar
          </button>
          <button
            onClick={onClear}
            className="flex-1 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger font-bold"
          >
            Apagar
          </button>
          <button
            onClick={handleSave}
            className="flex-[2] py-3 rounded-lg bg-accent text-bg font-bold text-[15px]"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
