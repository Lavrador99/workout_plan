import type { Light } from "@treino/core/types";

export const LIGHT_TEXT: Record<Light, string> = { green: "Verde", yellow: "Amarelo", red: "Vermelho" };
export const LIGHT_CLASS: Record<Light, string> = { green: "bg-success/15 text-success", yellow: "bg-warn/15 text-warn", red: "bg-danger/15 text-danger" };

/** A traffic-light colour as a small badge; no colour reads "por classificar". */
export default function LightBadge({ light, children }: { light: Light | null; children?: string }) {
  return <span className={`inline-block shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${light ? LIGHT_CLASS[light] : "bg-card2 text-muted"}`}>{children ?? (light ? LIGHT_TEXT[light] : "Por classificar")}</span>;
}
