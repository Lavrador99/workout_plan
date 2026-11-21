// The exercise library as a spreadsheet (CSV), for reviewing names outside the app.

import { musclesOf, patternsOf, primaryMusclesOf, primaryPatternOf } from "./movement";
import type { Exercise } from "@treino/core/types";

/** The columns the import reads back (by name), the id first so the rows find their exercise. */
export const COLUMNS = ["id", "Nome", "Sinónimos", "Padrão principal", "Outros padrões", "Músculos principais", "Músculos secundários", "Confirmado", "Etiquetas", "Vezes prescrito", "Vídeo"];

/** ";" between columns and a BOM, so Excel in Portuguese opens it with accents and columns right. */
const cell = (v: string | number) => {
  const s = String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exercisesCsv(exercises: Exercise[], usage: Map<string, number>): string {
  const rows = exercises
    .filter((e) => !e.deleted)
    .sort((a, b) => a.name.localeCompare(b.name, "pt"))
    .map((e) => {
      const main = primaryPatternOf(e);
      const mainMuscles = primaryMusclesOf(e);
      return [
        e.id,
        e.name,
        e.aliases.join(", "),
        main ?? "",
        patternsOf(e).filter((p) => p !== main).join(", "),
        mainMuscles.join(", "),
        musclesOf(e).filter((m) => !mainMuscles.includes(m)).join(", "),
        e.patterns && e.muscles ? "sim" : "não",
        e.tags.join(", "),
        usage.get(e.id) ?? 0,
        e.demoUrl ?? "",
      ];
    });
  return "\ufeff" + [COLUMNS, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}

/** Words of exercise names in English: a name with any of them and no Portuguese one is probably not translated. */
const ENGLISH = /\b(squat|press|row|curl|raise|lunge|deadlift|pull|push|jump|walk|hold|stretch|bridge|plank|carry|thrust|swing|fly|flye|extension|kickback|step|up|down|with|and|single|leg|arm|band|cable|dumbbell|barbell|kettlebell|bench|incline|decline|reverse|lateral|front|back|side|hip|split|bulgarian|romanian|good morning|crunch|twist|chop|lift)\b/i;
const PORTUGUESE = /\b(agachamento|afundo|remada|elevação|elevações|peso morto|flexão|flexões|extensão|prancha|ponte|salto|saltos|transporte|abdominal|rotação|com|de|do|da|em|na|no|unilateral|halteres|barra|polia|banco)\b|[ãõçáéíóúâêô]/i;

export const looksEnglish = (name: string) => ENGLISH.test(name) && !PORTUGUESE.test(name);

export function downloadText(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
