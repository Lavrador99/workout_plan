import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { back as goBack } from "../lib/hooks";

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  /** The page above this one, used when it was opened directly. Leave out on the main tabs. */
  back?: string[];
  actions?: ReactNode;
  /** Tabs of the page: they stay in view with the header. */
  children?: ReactNode;
}

/** The top of every page, always the same: back, title, its context, its actions. */
export default function PageHeader({ title, subtitle, back, actions, children }: Props) {
  return (
    <header className="sticky sticky-top z-30 bg-bg/95 backdrop-blur border-b border-border px-4 pt-2">
      <div className="flex items-center gap-1 min-h-[48px] pb-2">
        {back && (
          <button type="button" className="btn-ghost -ml-2 w-10 px-0 text-lg shrink-0" aria-label="Voltar" onClick={() => goBack(...back)}>
            <ArrowLeft />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </header>
  );
}

/** A page whose record is gone (deleted, or from an old link). */
export function NotFound({ title, back }: { title: string; back: string[] }) {
  return (
    <>
      <PageHeader title={title} back={back} />
      <p className="p-4 text-muted">Não encontrado. Pode ter sido apagado.</p>
    </>
  );
}
