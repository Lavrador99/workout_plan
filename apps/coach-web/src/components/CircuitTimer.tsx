import { useEffect, useMemo, useRef, useState } from "react";
import type { Block } from "../lib/types";

interface Phase {
  kind: "prep" | "work" | "rest" | "roundRest";
  sec: number;
  label: string;
  round: number;
}

function buildPhases(b: Block): Phase[] {
  const names = b.items.filter((i) => i.role === "main").map((i) => i.name);
  const ex = names.length ? names : ["Trabalho"];
  const rounds = b.rounds ?? 1;
  const out: Phase[] = [{ kind: "prep", sec: 10, label: "Preparar", round: 1 }];
  for (let r = 1; r <= rounds; r++) {
    ex.forEach((name, i) => {
      out.push({ kind: "work", sec: b.work ?? 30, label: name, round: r });
      const last = i === ex.length - 1;
      if (!last && b.rest) out.push({ kind: "rest", sec: b.rest, label: `Próximo: ${ex[i + 1]}`, round: r });
      if (last && r < rounds && (b.roundRest || b.rest))
        out.push({ kind: "roundRest", sec: b.roundRest ?? b.rest ?? 0, label: `Descanso · próximo: ${ex[0]}`, round: r });
    });
  }
  return out;
}

function beep(freq: number, ms = 180) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    o.frequency.value = freq;
    o.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      void ctx.close();
    }, ms);
  } catch {
    /* no audio */
  }
  navigator.vibrate?.(ms);
}

/** Full-screen interval timer for 40"/20" style circuits. */
export default function CircuitTimer({ block, onClose }: { block: Block; onClose: () => void }) {
  const phases = useMemo(() => buildPhases(block), [block]);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(phases[0].sec);
  const [paused, setPaused] = useState(false);
  const endAt = useRef(Date.now() + phases[0].sec * 1000);

  useEffect(() => {
    if (paused) return;
    endAt.current = Date.now() + left * 1000;
    const t = setInterval(() => {
      const remain = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft((prev) => {
        if (remain !== prev && remain <= 3 && remain > 0) beep(660, 90);
        return remain;
      });
      if (remain === 0) {
        setIdx((i) => {
          const next = i + 1;
          if (next < phases.length) {
            beep(phases[next].kind === "work" ? 990 : 440, 300);
            endAt.current = Date.now() + phases[next].sec * 1000;
            setLeft(phases[next].sec);
          } else {
            beep(1200, 600);
            clearInterval(t);
          }
          return Math.min(next, phases.length);
        });
      }
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, phases]);

  const done = idx >= phases.length;
  const p = phases[Math.min(idx, phases.length - 1)];
  const bg = done ? "bg-card" : p.kind === "work" ? "bg-accent text-black" : p.kind === "prep" ? "bg-accent2 text-black" : "bg-card2";

  const jump = (d: number) => {
    const n = Math.max(0, Math.min(phases.length - 1, idx + d));
    setIdx(n);
    setLeft(phases[n].sec);
    endAt.current = Date.now() + phases[n].sec * 1000;
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col safe-top safe-bottom ${bg}`}>
      <div className="flex justify-between items-center p-4">
        <span className="font-semibold">{done ? "Terminado" : `Ronda ${p.round}/${block.rounds ?? 1}`}</span>
        <button type="button" className="btn" onClick={onClose}>
          Fechar
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-2xl font-bold uppercase opacity-80">{done ? "Bom trabalho" : p.kind === "work" ? "Trabalho" : p.kind === "prep" ? "Prepara" : "Descanso"}</div>
        <div className="text-[28vw] sm:text-[160px] leading-none font-black tabular-nums">{done ? "✓" : left}</div>
        <div className="text-2xl font-semibold">{done ? "" : p.label}</div>
      </div>
      {!done && (
        <div className="flex gap-3 p-4">
          <button type="button" className="btn flex-1 h-14 text-black/80 bg-white/70" onClick={() => jump(-1)}>
            ◀
          </button>
          <button type="button" className="btn flex-[2] h-14 text-lg bg-black text-white border-black" onClick={() => setPaused(!paused)}>
            {paused ? "Continuar" : "Pausa"}
          </button>
          <button type="button" className="btn flex-1 h-14 text-black/80 bg-white/70" onClick={() => jump(1)}>
            ▶
          </button>
        </div>
      )}
    </div>
  );
}
