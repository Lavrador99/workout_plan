import { useEffect, useRef } from "react";

/** A signature drawn with a finger, pen or mouse, kept as a small PNG. */
export default function SignaturePad({ label, value, onChange }: { label: string; value: string | null; onChange: (png: string | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!value) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = value;
  }, [value]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height] as const;
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="label">{label}</span>
      <canvas
        ref={canvas}
        width={600}
        height={160}
        aria-label={label}
        className="w-full h-32 rounded-lg border border-dashed border-border bg-white touch-none"
        onPointerDown={(e) => {
          const ctx = e.currentTarget.getContext("2d");
          if (!ctx) return;
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.strokeStyle = "#1c1c1a";
          ctx.beginPath();
          ctx.moveTo(...point(e));
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext("2d");
          ctx?.lineTo(...point(e));
          ctx?.stroke();
        }}
        onPointerUp={(e) => {
          if (!drawing.current) return;
          drawing.current = false;
          onChange(e.currentTarget.toDataURL("image/png"));
        }}
      />
      {value && (
        <button type="button" className="btn-ghost self-start -ml-3 text-sm text-muted" onClick={() => onChange(null)}>
          Limpar assinatura
        </button>
      )}
    </div>
  );
}
