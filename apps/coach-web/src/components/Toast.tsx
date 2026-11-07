import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Shown {
  id: number;
  text: string;
  undo?: () => void;
}

const SHOWN_MS = 5000;

let next = 0;
let listener: ((t: Shown) => void) | null = null;

/** Confirm something already done, with a way back instead of a question before. */
export function toast(text: string, undo?: () => void) {
  listener?.({ id: ++next, text, undo });
}

export function Toaster() {
  const [t, setT] = useState<Shown | null>(null);

  useEffect(() => {
    listener = setT;
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (!t) return;
    const timer = setTimeout(() => setT(null), SHOWN_MS);
    return () => clearTimeout(timer);
  }, [t]);

  // on the body, as the page behind an open sheet cannot be clicked
  return createPortal(
    <div aria-live="polite" className="fixed inset-x-0 bottom-nav z-[60] px-4 pointer-events-none">
      {t && (
        <div className="max-w-2xl mx-auto flex items-center gap-2 pl-4 pr-1 min-h-[44px] rounded-xl bg-fg text-bg shadow-lg pointer-events-auto sheet-rise">
          <span className="flex-1 text-sm py-2">{t.text}</span>
          {t.undo && (
            <button
              type="button"
              className="px-3 min-h-[40px] text-sm font-bold"
              onClick={() => {
                t.undo?.();
                setT(null);
              }}
            >
              Anular
            </button>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}
