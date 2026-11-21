import type { AreaResult, BodyZone, ModuleDef } from "../lib/modules";
import type { Light } from "@treino/core/types";

// The visual part of a module report: a radar of the areas and a body map with
// the zones to work on. Fixed colours: the report is a sheet of paper in any theme.

const INK: Record<Light, string> = { red: "#be1e1e", yellow: "#a15c00", green: "#0f733a" };
const FILL: Record<Light, string> = { red: "#fbe4e4", yellow: "#fcefd6", green: "#e3f2e8" };
const NEUTRAL_FILL = "#f1efe8";
const NEUTRAL_LINE = "#c3c2b7";
const MUTED = "#64645e";

export const CLIENT_WORDS: Record<Light, string> = { red: "É aqui que vamos trabalhar", yellow: "Vamos reforçar", green: "Ponto forte" };

/** One axis per area; the dashed ring is the middle of the reference group (P50). */
export function RadarChart({ areas }: { areas: AreaResult[] }) {
  const cx = 160;
  const cy = 150;
  const R = 100;
  const n = areas.length;
  const at = (i: number, r: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
  };
  const ring = (level: number) => areas.map((_, i) => at(i, (R * level) / 100).join(",")).join(" ");
  const value = (a: AreaResult) => Math.max(8, a.score ?? 0);
  return (
    <svg viewBox="-40 0 400 300" className="w-full max-w-[360px]" role="img" aria-label={`Radar das áreas: ${areas.map((a) => `${a.client} ${a.light ? CLIENT_WORDS[a.light].toLowerCase() : "sem dados"}`).join(", ")}`}>
      {[25, 50, 75, 100].map((l) => (
        <polygon key={l} points={ring(l)} fill="none" stroke={NEUTRAL_LINE} strokeWidth={l === 50 ? 1 : 0.5} strokeDasharray={l === 50 ? "4 3" : undefined} />
      ))}
      {areas.map((_, i) => {
        const [x, y] = at(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={NEUTRAL_LINE} strokeWidth={0.5} />;
      })}
      <polygon points={areas.map((a, i) => at(i, (R * value(a)) / 100).join(",")).join(" ")} fill="#2a78d6" fillOpacity={0.15} stroke="#2a78d6" strokeWidth={2} strokeLinejoin="round" />
      {areas.map((a, i) => {
        const [x, y] = at(i, (R * value(a)) / 100);
        const [lx, ly] = at(i, R + 24);
        const anchor = Math.abs(lx - cx) < 8 ? "middle" : lx < cx ? "end" : "start";
        const words = a.client.split(" ");
        const lines = a.client.length > 14 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [a.client];
        return (
          <g key={a.id}>
            <circle cx={x} cy={y} r={5} fill={a.light ? INK[a.light] : NEUTRAL_LINE} stroke="#fff" strokeWidth={2} />
            {lines.map((line, j) => (
              <text key={j} x={lx} y={ly + 4 + (j - (lines.length - 1) / 2) * 13} textAnchor={anchor} fontSize={11} fill={MUTED}>
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

const ZONE_SHAPES: Record<BodyZone, string[]> = {
  chest: ["ellipse:110,84,20,16"],
  shoulders: ["circle:76,62,12", "circle:144,62,12"],
  arms: ["rect:56,68,16,58", "rect:148,68,16,58", "rect:52,128,14,50", "rect:154,128,14,50", "circle:59,186,8", "circle:161,186,8"],
  hips: ["ellipse:110,152,32,12"],
  thighs: ["rect:82,164,26,82", "rect:112,164,26,82"],
  legs: ["rect:85,250,20,70", "rect:115,250,20,70"],
  feet: ["ellipse:92,330,15,7", "ellipse:128,330,15,7"],
};

/** Where each zone's number goes: x, y and the side it points out to (1 right, -1 left). */
const MARKS: [BodyZone, number, number, 1 | -1][] = [
  ["chest", 110, 84, 1],
  ["shoulders", 144, 62, 1],
  ["arms", 161, 150, 1],
  ["hips", 80, 152, -1],
  ["thighs", 125, 205, 1],
  ["legs", 125, 285, 1],
  ["feet", 128, 330, 1],
];

export const ZONE_NAMES: Record<BodyZone, string> = {
  chest: "Coração e pulmões",
  shoulders: "Ombros",
  arms: "Braços e mãos",
  hips: "Anca e parte de trás das pernas",
  thighs: "Coxas e glúteos",
  legs: "Pernas a caminhar",
  feet: "Pés e tornozelos (equilíbrio)",
};

function Shape({ spec, light }: { spec: string; light: Light | null }) {
  const [kind, raw] = spec.split(":");
  const n = raw.split(",").map(Number);
  const props = { fill: light && light !== "green" ? FILL[light] : NEUTRAL_FILL, stroke: light && light !== "green" ? INK[light] : NEUTRAL_LINE, strokeWidth: light && light !== "green" ? 1.5 : 0.5 };
  if (kind === "circle") return <circle cx={n[0]} cy={n[1]} r={n[2]} {...props} />;
  if (kind === "ellipse") return <ellipse cx={n[0]} cy={n[1]} rx={n[2]} ry={n[3]} {...props} />;
  return <rect x={n[0]} y={n[1]} width={n[2]} height={n[3]} rx={Math.min(n[2], n[3]) / 2} {...props} />;
}

/** The zones of yellow and red areas, coloured and numbered; the legend says them in plain words. */
export function BodyMap({ areas }: { areas: AreaResult[] }) {
  const lightOf = (z: BodyZone): Light | null => {
    const lights = areas.filter((a) => a.zones.includes(z)).map((a) => a.light);
    return lights.includes("red") ? "red" : lights.includes("yellow") ? "yellow" : lights.includes("green") ? "green" : null;
  };
  const marked = MARKS.filter(([z]) => {
    const l = lightOf(z);
    return l === "red" || l === "yellow";
  });
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 220 350" className="w-full max-w-[220px]" role="img" aria-label={marked.length ? `Zonas a trabalhar: ${marked.map(([z]) => ZONE_NAMES[z]).join(", ")}` : "Sem zonas a trabalhar"}>
        <circle cx={110} cy={30} r={18} fill={NEUTRAL_FILL} stroke={NEUTRAL_LINE} strokeWidth={0.5} />
        <rect x={102} y={46} width={16} height={10} fill={NEUTRAL_FILL} />
        <rect x={80} y={54} width={60} height={96} rx={14} fill={NEUTRAL_FILL} stroke={NEUTRAL_LINE} strokeWidth={0.5} />
        {(Object.keys(ZONE_SHAPES) as BodyZone[]).flatMap((z) => ZONE_SHAPES[z].map((spec) => <Shape key={`${z}-${spec}`} spec={spec} light={lightOf(z)} />))}
        {marked.map(([z, x, y, dir], i) => {
          const l = lightOf(z)!;
          return (
            <g key={z}>
              <line x1={x + 6 * dir} y1={y} x2={x + 21 * dir} y2={y} stroke={INK[l]} strokeWidth={1} />
              <circle cx={x + 30 * dir} cy={y} r={9} fill={INK[l]} />
              <text x={x + 30 * dir} y={y + 4} textAnchor="middle" fontSize={11} fill="#fff">
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      {marked.length > 0 && (
        <ol className="text-[12px] flex flex-col gap-0.5 self-stretch">
          {marked.map(([z], i) => {
            const l = lightOf(z)!;
            return (
              <li key={z} className="flex items-center gap-2">
                <span className="inline-flex w-5 h-5 rounded-full items-center justify-center text-[11px] text-white" style={{ background: INK[l] }}>
                  {i + 1}
                </span>
                {ZONE_NAMES[z]}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Radar, body and the list of areas in the client's words. */
export function ModuleVisual({ mod, areas }: { mod: ModuleDef; areas: AreaResult[] }) {
  return (
    <section className="report-block flex flex-col gap-3">
      <h2 className="report-h2">{mod.name}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center justify-items-center print:grid-cols-2">
        <RadarChart areas={areas} />
        <BodyMap areas={areas} />
      </div>
      <ul className="flex flex-col">
        {areas.map((a) => (
          <li key={a.id} className="flex items-center gap-2 py-1 border-b border-[#edede6] last:border-0">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: a.light ? INK[a.light] : NEUTRAL_LINE }} />
            <span className="flex-1">{a.client}</span>
            <span className="report-muted text-[12px]">{a.light ? CLIENT_WORDS[a.light] : "Sem dados"}</span>
          </li>
        ))}
      </ul>
      <p className="report-note">A linha tracejada é o meio do grupo de referência para a tua idade e sexo.</p>
    </section>
  );
}
