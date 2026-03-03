import type { Profile } from "@/types";

interface ProfilesScreenProps {
  profiles: Profile[];
  activeProfileId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRestored?: () => void;
}

export function ProfilesScreen({
  profiles,
  activeProfileId,
  onSelect,
  onAdd,
  onDelete,
}: ProfilesScreenProps) {
  const handleLongPress = (id: string) => {
    if (confirm("Eliminar este perfil e todos os dados associados?")) {
      onDelete(id);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4">
        <h1 className="text-[28px] font-black tracking-tight">
          <span className="text-accent">treino</span>.app
        </h1>
        <p className="text-muted text-[13px]">Seleciona o teu perfil</p>
      </div>

      {/* Profile grid */}
      <div className="flex-1 overflow-y-auto px-5">
        <div className="grid grid-cols-2 gap-3 pb-8">
          {profiles.map((p) => {
            const isActive = p.id === activeProfileId;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleLongPress(p.id);
                }}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                  isActive
                    ? "border-accent bg-accent/10 shadow-lg shadow-accent/10"
                    : "border-border bg-card hover:border-accent2/50"
                }`}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow"
                  style={{ background: p.color ?? "#444" }}
                >
                  {p.emoji ?? "👤"}
                </div>
                <div className="font-bold text-[14px] text-center truncate w-full">
                  {p.name}
                </div>
                <div className="text-muted text-[11px]">
                  {p.planConfig.weeks}sem · {p.planConfig.trainingDays.length}
                  d/sem
                </div>
                {isActive && (
                  <span className="text-accent text-[11px] font-semibold">
                    ● Ativo
                  </span>
                )}
              </button>
            );
          })}

          {/* Add new */}
          <button
            onClick={onAdd}
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card hover:border-accent/50 p-4 transition-all"
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-card2 border-2 border-dashed border-border text-muted">
              +
            </div>
            <div className="text-muted text-[13px] font-semibold">
              Novo Perfil
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
