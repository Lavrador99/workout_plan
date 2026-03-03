import { SESSION_ICONS, SESSION_LABELS } from "@/consts";
import type { SessionType, SwapOption } from "@/types";

interface SwapModalProps {
  options: SwapOption[];
  currentType: SessionType | null;
  onSelect: (type: SessionType) => void;
  onClose: () => void;
}

export function SwapModal({ options, onSelect, onClose }: SwapModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/55 z-[300] flex items-end justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-card rounded-t-2xl w-full max-w-xl overflow-y-auto animate-slide-up"
        style={{
          padding: "16px 16px",
          paddingBottom: "max(36px, env(safe-area-inset-bottom))",
          maxHeight: "80vh",
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[16px] font-bold">🔄 Trocar Treino</span>
          <button
            onClick={onClose}
            className="text-muted text-2xl leading-none p-1"
          >
            ✕
          </button>
        </div>
        <p className="text-[12px] text-muted mb-3.5">
          Treinos disponíveis nesta semana. Seleciona o que queres fazer hoje.
        </p>

        {options.length === 0 ? (
          <p className="text-center text-muted py-6 text-sm">
            🎉 Todos os treinos desta semana já foram concluídos!
          </p>
        ) : (
          options.map((opt) => (
            <button
              key={opt.type}
              onClick={() => onSelect(opt.type)}
              className={`
                flex items-center gap-3 w-full px-3.5 py-3 mb-2 rounded-xl border-[1.5px] text-left
                transition-all duration-150 cursor-pointer
                ${
                  opt.isCurrent
                    ? "border-accent bg-card"
                    : "border-border bg-bg hover:border-accent hover:bg-card"
                }
              `}
            >
              <span className="text-2xl flex-shrink-0">
                {SESSION_ICONS[opt.type]}
              </span>
              <span className="flex-1 text-[14px] font-semibold text-text">
                {SESSION_LABELS[opt.type]}
              </span>
              {opt.isCurrent && (
                <span className="text-[10px] px-2 py-0.5 rounded-2xl bg-accent text-bg font-bold">
                  Atual
                </span>
              )}
              {!opt.isCurrent && opt.doneCount > 0 && opt.totalCount > 1 && (
                <span className="text-[10px] px-2 py-0.5 rounded-2xl bg-border text-muted font-bold">
                  {opt.doneCount}/{opt.totalCount}
                </span>
              )}
              {opt.allDone && opt.isCurrent && (
                <span className="text-[10px] px-2 py-0.5 rounded-2xl bg-success text-bg font-bold">
                  feito
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
