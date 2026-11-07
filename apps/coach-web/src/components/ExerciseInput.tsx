import { useMemo, useRef, useState } from "react";
import { matchExercise } from "../lib/db";
import { useExerciseIndex, useExercises } from "../lib/hooks";
import { parseItemLine } from "../lib/parser";
import type { Exercise } from "../lib/types";

interface Props {
  placeholder?: string;
  initial?: string;
  autoFocus?: boolean;
  /** Text as typed (name + optional prescription). */
  onSubmit: (text: string) => void;
  onCancel?: () => void;
}

/**
 * One line: "Step up 3x8 2x8kg E+1". Suggests library exercises for the name
 * part as you type; picking one replaces the name and keeps the numbers.
 */
export default function ExerciseInput({ placeholder, initial = "", autoFocus, onSubmit, onCancel }: Props) {
  const [text, setText] = useState(initial);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const index = useExerciseIndex();
  const exercises = useExercises() ?? [];

  const namePart = useMemo(() => parseItemLine(text).name, [text]);
  const suggestions = useMemo(() => (open ? index.search(namePart, 6) : []), [index, namePart, open]);
  const exact = namePart ? matchExercise(exercises, namePart) : undefined;

  const pick = (ex: Exercise) => {
    const at = namePart ? text.indexOf(namePart) : -1;
    const rest = at >= 0 ? text.slice(at + namePart.length).trim() : "";
    const next = rest ? `${ex.name} ${rest}` : `${ex.name} `;
    setText(next);
    ref.current?.focus();
  };

  const submit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          ref={ref}
          className="input"
          value={text}
          autoFocus={autoFocus}
          placeholder={placeholder ?? "Exercício + séries, ex: Step up 3x8 2x8kg E+1"}
          autoCapitalize="sentences"
          autoComplete="off"
          enterKeyHint="done"
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel?.();
          }}
        />
        <button type="button" className="btn-accent shrink-0" onMouseDown={(e) => e.preventDefault()} onClick={submit} disabled={!text.trim()}>
          OK
        </button>
      </div>
      {open && (suggestions.length > 0 || (namePart && !exact)) && (
        <ul className="absolute z-30 left-0 right-0 mt-1 card shadow-xl max-h-72 overflow-auto">
          {suggestions.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-3 active:bg-card2 border-b border-border last:border-0"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(ex)}
              >
                <span className="font-medium">{ex.name}</span>
                {ex.aliases.length > 0 && <span className="text-xs text-muted"> · {ex.aliases.slice(0, 3).join(", ")}</span>}
              </button>
            </li>
          ))}
          {namePart && !exact && (
            <li className="px-3 py-3 text-sm text-accent">
              + Novo na biblioteca: <b>«{namePart}»</b> <span className="text-muted">(Enter para criar)</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
