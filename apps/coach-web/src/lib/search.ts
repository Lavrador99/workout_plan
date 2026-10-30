import Fuse from "fuse.js";
import type { Exercise } from "./types";
import { norm } from "./text";

interface Doc {
  ex: Exercise;
  name: string;
  pt: string;
  aliases: string[];
}

/** Fuzzy, accent-insensitive exercise search over names and aliases. */
export class ExerciseIndex {
  private fuse: Fuse<Doc>;

  constructor(private list: Exercise[], private usage: Map<string, number> = new Map()) {
    const docs = list.filter((e) => !e.deleted).map((ex) => ({ ex, name: norm(ex.name), pt: norm(ex.pt ?? ""), aliases: ex.aliases.map(norm) }));
    this.fuse = new Fuse(docs, {
      keys: [
        { name: "name", weight: 2 },
        { name: "pt", weight: 2 },
        { name: "aliases", weight: 1 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      includeScore: true,
    });
  }

  search(query: string, limit = 8): Exercise[] {
    const q = norm(query);
    if (!q) {
      // most used first when nothing is typed
      return this.list
        .filter((e) => !e.deleted)
        .sort((a, b) => (this.usage.get(b.id) ?? 0) - (this.usage.get(a.id) ?? 0))
        .slice(0, limit);
    }
    const words = q.split(" ");
    return this.fuse
      .search(q)
      .map((r) => {
        // every typed word appearing literally is a strong signal: "gemeo uni"
        const hay = `${r.item.name} ${r.item.pt} ${r.item.aliases.join(" ")}`;
        const literal = words.every((w) => hay.includes(w)) ? -0.3 : 0;
        const used = Math.min(this.usage.get(r.item.ex.id) ?? 0, 20) * -0.005;
        return { ex: r.item.ex, score: (r.score ?? 1) + literal + used };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, limit)
      .map((r) => r.ex);
  }
}
