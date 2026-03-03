interface NavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  profileEmoji: string;
  onProfileClick: () => void;
}

const TABS = [
  { id: "today", icon: "🏠", label: "Hoje" },
  { id: "skills", icon: "⚡", label: "Skills" },
  { id: "history", icon: "📅", label: "Histórico" },
  { id: "progress", icon: "📈", label: "Progresso" },
];

export function Nav({
  activeTab,
  onTabChange,
  profileEmoji,
  onProfileClick,
}: NavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around bg-card/90 backdrop-blur-md border-t border-border pb-safe pt-1 h-16">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative"
          >
            {isActive && (
              <span className="absolute top-0 inset-x-3 h-0.5 rounded-full bg-accent" />
            )}
            <span
              className={`text-xl transition-transform duration-150 ${isActive ? "scale-110" : ""}`}
            >
              {tab.icon}
            </span>
            <span
              className={`text-[10px] font-semibold transition-colors ${
                isActive ? "text-accent" : "text-muted"
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
      {/* Profile tab */}
      <button
        onClick={onProfileClick}
        className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 relative"
      >
        {activeTab === "profile" && (
          <span className="absolute top-0 inset-x-3 h-0.5 rounded-full bg-accent" />
        )}
        <span
          className={`text-xl transition-transform duration-150 ${activeTab === "profile" ? "scale-110" : ""}`}
        >
          {profileEmoji}
        </span>
        <span
          className={`text-[10px] font-semibold transition-colors ${
            activeTab === "profile" ? "text-accent" : "text-muted"
          }`}
        >
          Perfil
        </span>
      </button>
    </nav>
  );
}
