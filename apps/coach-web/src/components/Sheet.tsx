import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBackClose } from "../lib/hooks";

let open = 0;

/** Everything behind a sheet is out of reach of the keyboard and screen readers. */
function useModal(onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  const latest = useRef(onClose);
  latest.current = onClose;

  useEffect(() => {
    const root = document.getElementById("root");
    const before = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && latest.current();
    if (!panel.current?.contains(before)) panel.current?.focus();
    window.addEventListener("keydown", onKey);
    open++;
    document.body.style.overflow = "hidden";
    root?.setAttribute("inert", "");
    return () => {
      window.removeEventListener("keydown", onKey);
      if (--open) return;
      document.body.style.overflow = "";
      root?.removeAttribute("inert");
      before?.focus?.({ preventScroll: true });
    };
  }, []);
  return panel;
}

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Full height, for forms with tabs: the sheet does not jump between them. */
  tall?: boolean;
  /** Has unsaved edits: a stray tap outside must not close it. */
  persistent?: boolean;
  /** Short-lived (a menu): the back button leaves the page rather than closing it. */
  transient?: boolean;
}

/** All secondary content opens here: from below on the phone, centred on the PC. */
export default function Sheet({ title, subtitle, onClose, children, tall, persistent, transient }: Props) {
  const heading = useId();
  const panel = useModal(onClose);
  useBackClose(onClose, !transient);

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:p-6 bg-black/60 sheet-fade" onClick={persistent ? undefined : onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={heading}
        tabIndex={-1}
        className={`max-w-2xl w-full mx-auto flex flex-col bg-card rounded-t-2xl sm:rounded-2xl border-t sm:border border-border outline-none sheet-rise ${tall ? "h-[92dvh] sm:h-[80dvh]" : "max-h-[92dvh] sm:max-h-[80dvh]"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 flex items-center gap-2 pl-4 pr-2 pt-3 pb-2 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 id={heading} className="font-bold truncate">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
          </div>
          <button type="button" className="btn-ghost w-10 px-0 text-muted" aria-label="Fechar" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="min-h-full flex flex-col gap-3 p-4 safe-bottom">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The sheet's actions: always in view, at the bottom. */
export function SheetFooter({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-0 mt-auto -mx-4 -mb-4 px-4 py-3 bg-card border-t border-border safe-bottom flex flex-wrap gap-2">{children}</div>;
}

/** The sheet's tabs: stay in view while its content scrolls. */
export function SheetTabs({ children }: { children: ReactNode }) {
  return <div className="sticky top-0 z-10 -mx-4 -mt-4 px-2 bg-card border-b border-border">{children}</div>;
}

export interface MenuItem {
  label: ReactNode;
  onClick: () => void;
  danger?: boolean;
  /** Stays open after the tap, to show the result ("✓ Copiado"). */
  keepOpen?: boolean;
}

/** The ⋯ button of a page and the options behind it. */
export function Menu({ title, items, label = "Mais opções" }: { title: string; items: (MenuItem | false | null | undefined)[]; label?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <>
      <button type="button" className="btn-ghost w-10 px-0 text-muted shrink-0" aria-label={label} aria-haspopup="dialog" onClick={() => setShown(true)}>
        ⋯
      </button>
      {shown && (
        <Sheet title={title} transient onClose={() => setShown(false)}>
          <ul className="flex flex-col -my-2 divide-y divide-border">
            {items.filter((i): i is MenuItem => !!i).map((item, i) => (
              <li key={i}>
                <button
                  type="button"
                  className={`w-full text-left py-3 font-medium ${item.danger ? "text-danger" : ""}`}
                  onClick={() => {
                    if (!item.keepOpen) setShown(false);
                    item.onClick();
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </>
  );
}
