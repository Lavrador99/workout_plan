import { SKILLS } from "@/data/skills";
import { getSkillEntries, saveSkillEntry } from "@/utils/storage";
import { useState } from "react";

interface SkillsPageProps {
  profilePrefix: string;
}

export function SkillsPage({ profilePrefix }: SkillsPageProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [, setRefresh] = useState(0);

  const handleLog = (key: string) => {
    const val = parseFloat(inputs[key] ?? "");
    if (!val || isNaN(val)) return;
    saveSkillEntry(profilePrefix, key, val);
    setInputs((prev) => ({ ...prev, [key]: "" }));
    setRefresh((r) => r + 1);
  };

  return (
    <div className="pb-6">
      <h2 className="text-2xl font-black mb-1">Skills</h2>
      <p className="text-muted text-[13px] mb-5">
        Regista os teus progressos em isometrias e skills.
      </p>

      <div className="space-y-4">
        {SKILLS.map((skill) => {
          const entries = getSkillEntries(profilePrefix, skill.key);
          const pr =
            entries.length > 0 ? Math.max(...entries.map((e) => e.value)) : 0;
          const recent = [...entries]
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            )
            .slice(0, 12);

          return (
            <div
              key={skill.key}
              className="bg-card rounded-xl border border-border px-4 py-3"
            >
              <div className="text-[13px] font-bold mb-2">
                {skill.icon} {skill.label}
              </div>

              {/* PR row */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[11px] text-muted">PR</div>
                  <div className="text-2xl font-black text-accent">
                    {pr > 0 ? `${pr}${skill.unit}` : "—"}
                  </div>
                </div>
                <div className="text-[12px] text-muted text-right">
                  {skill.goal}
                </div>
              </div>

              {/* Log row */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="number"
                  placeholder={`Valor (${skill.unit})`}
                  value={inputs[skill.key] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({
                      ...prev,
                      [skill.key]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleLog(skill.key)}
                  className="flex-1 bg-card2 border border-border rounded text-center text-[13px] py-1.5 px-3 text-white focus:outline-none focus:border-accent"
                />
                <button
                  onClick={() => handleLog(skill.key)}
                  className="bg-accent text-black rounded px-3 py-1.5 text-[13px] font-semibold hover:bg-accent/90 transition-colors"
                >
                  Log hoje
                </button>
              </div>

              {/* History dots */}
              <div className="flex flex-wrap gap-1.5">
                {recent.length === 0 ? (
                  <span className="text-muted text-[12px]">
                    Sem registos ainda
                  </span>
                ) : (
                  recent.map((entry, i) => {
                    const isPR = entry.value === pr && pr > 0;
                    const d = new Date(entry.date);
                    const label = d.toLocaleDateString("pt-PT", {
                      day: "numeric",
                      month: "numeric",
                    });
                    return (
                      <span
                        key={i}
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          isPR
                            ? "border-accent text-accent bg-accent/10"
                            : "border-border text-muted"
                        }`}
                      >
                        {entry.value}
                        {skill.unit} <span className="opacity-60">{label}</span>
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
