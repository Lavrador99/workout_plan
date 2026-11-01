import { useEffect, useState } from "react";
import type { BlockKind, Section, Template } from "../lib/types";
import { SECTIONS } from "./BlockCard";

// Everything beyond adding exercises one after the other: grouped blocks,
// sections, templates, typed text and the session note.

const GROUPS: [BlockKind, string, string][] = [
  ["superset", "Superset / Triset", "2+ exercícios seguidos, descanso no fim"],
  ["circuit", "Circuito / HIIT", "trabalho e pausa por tempo, rondas, timer"],
  ["emom", "EMOM", "um exercício no início de cada minuto"],
  ["amrap", "AMRAP", "máximo de rondas no tempo limite"],
];

interface Props {
  days: Template[];
  blocks: Template[];
  onGroup: (kind: BlockKind) => void;
  onSection: (s: Section) => void;
  onTemplate: (t: Template) => void;
  onText: (text: string) => void;
  onNote: () => void;
  onClose: () => void;
}

export default function ExtrasSheet({ days, blocks, onGroup, onSection, onTemplate, onText, onNote, onClose }: Props) {
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", f);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const pick = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div className="max-w-2xl w-full mx-auto max-h-[85vh] overflow-y-auto overscroll-contain bg-card rounded-t-2xl border-t border-border safe-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-card flex items-center px-4 pt-3 pb-2">
          <span className="mx-auto w-10 h-1 rounded-full bg-border absolute left-1/2 -translate-x-1/2 top-1.5" />
          <span className="font-bold flex-1">Blocos e extras</span>
          <button type="button" className="btn-ghost text-muted" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 px-4 pb-6">
          <div className="grid grid-cols-2 gap-2">
            {GROUPS.map(([kind, label, hint]) => (
              <button key={kind} type="button" className="card bg-card2 p-3 text-left active:border-accent" onClick={() => pick(() => onGroup(kind))}>
                <div className="font-semibold">{label}</div>
                <div className="text-xs text-muted leading-snug">{hint}</div>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="label">Começar secção</span>
            <div className="flex flex-wrap gap-1.5">
              {SECTIONS.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => pick(() => onSection(s))}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {(days.length > 0 || blocks.length > 0) && (
            <div className="flex flex-col gap-1.5">
              <span className="label">Templates</span>
              <div className="flex flex-wrap gap-1.5">
                {days.map((t) => (
                  <button key={t.id} type="button" className="chip" onClick={() => pick(() => onTemplate(t))}>
                    📅 {t.name}
                  </button>
                ))}
                {blocks.map((t) => (
                  <button key={t.id} type="button" className="chip" onClick={() => pick(() => onTemplate(t))}>
                    ☆ {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={`btn ${paste ? "border-accent text-accent" : ""}`} onClick={() => setPaste(!paste)}>
                ✎ Escrever / colar
              </button>
              <button type="button" className="btn" onClick={() => pick(onNote)}>
                📝 Nota da sessão
              </button>
            </div>
            {paste && (
              <>
                <textarea
                  className="input min-h-[200px] py-2 font-mono text-sm"
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={"Back squat 4x8 47,5kg RIR 2\n(Russian twist, side bends)\nStep up 3x8 2x8kg E+1\n\n40\"/20\" x3 | 1:30 rest\nDevil press\nWall ball"}
                />
                <p className="text-xs text-muted">Uma linha por exercício. Linha em branco = novo bloco. (entre parênteses) = intercalado.</p>
                <button type="button" className="btn-accent" disabled={!text.trim()} onClick={() => pick(() => onText(text))}>
                  Adicionar à sessão
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
