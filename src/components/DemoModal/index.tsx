import { EXERCISE_DEMOS } from "@/data/exercises";

export interface DemoInfo {
  key: string;
  name: string;
  tip?: string;
}

interface DemoModalProps {
  demo: DemoInfo | null;
  onClose: () => void;
}

export function DemoModal({ demo, onClose }: DemoModalProps) {
  if (!demo) return null;

  const term = EXERCISE_DEMOS[demo.key] ?? `${demo.name} exercise tutorial`;
  const ytURL = `https://www.youtube.com/results?search_query=${encodeURIComponent(term)}`;
  const gURL = `https://www.google.com/search?q=${encodeURIComponent(demo.name + " exercise gif")}&tbm=isch`;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[600] flex items-end justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-card border border-border rounded-t-2xl p-6 w-full max-w-lg animate-slide-up"
        style={{ paddingBottom: "max(36px, env(safe-area-inset-bottom))" }}
      >
        <div className="text-[10px] font-bold tracking-widest text-muted uppercase mb-1.5">
          Como fazer
        </div>
        <div className="text-xl font-extrabold mb-3 leading-snug">
          {demo.name}
        </div>

        {demo.tip && (
          <div className="text-xs text-accent2 bg-accent2/5 border-l-2 border-accent2/30 rounded-r pl-3 py-1.5 mb-4 leading-relaxed">
            💡 {demo.tip}
          </div>
        )}

        <a
          href={ytURL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-[#ff6060] text-[15px] font-bold mb-2 hover:bg-red-500/20 transition-colors no-underline"
        >
          <span className="text-lg">▶</span> Ver no YouTube
        </a>

        <a
          href={gURL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl border border-border text-muted text-[13px] font-semibold mb-3 hover:text-text hover:border-text transition-colors no-underline"
        >
          🔍 Pesquisar GIF / imagens
        </a>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-border text-muted text-[13px] font-bold"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
