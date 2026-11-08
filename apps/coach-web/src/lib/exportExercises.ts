// The exercise library as a spreadsheet (CSV), for reviewing names outside the app.

import { musclesOf, patternsOf } from "./movement";
import type { Exercise } from "@treino/core/types";

const COLUMNS = ["Nome", "Nome PT", "Sinónimos", "Etiquetas", "Padrões", "Padrões definidos", "Músculos", "Músculos definidos", "Vezes prescrito", "Vídeo", "id"];

/** ";" between columns and a BOM, so Excel in Portuguese opens it with accents and columns right. */
const cell = (v: string | number) => {
  const s = String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exercisesCsv(exercises: Exercise[], usage: Map<string, number>): string {
  const rows = exercises
    .filter((e) => !e.deleted)
    .sort((a, b) => a.name.localeCompare(b.name, "pt"))
    .map((e) => [
      e.name,
      e.pt ?? "",
      e.aliases.join(", "),
      e.tags.join(", "),
      patternsOf(e).join(", "),
      e.patterns ? "sim" : "sugeridos",
      musclesOf(e).join(", "),
      e.muscles ? "sim" : "sugeridos",
      usage.get(e.id) ?? 0,
      e.demoUrl ?? "",
      e.id,
    ]);
  return "﻿" + [COLUMNS, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}

export function downloadText(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
