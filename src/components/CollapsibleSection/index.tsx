import { useState, type ReactNode } from "react";

interface CollapsibleSectionProps {
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  label,
  defaultOpen = false,
  children,
  className = "",
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`
          w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg
          border text-accent2 text-[12px] font-bold tracking-wide cursor-pointer
          mt-4 transition-all duration-150
          ${open ? "border-accent2 bg-accent2/5" : "border-border hover:border-accent2 hover:bg-accent2/5"}
        `}
      >
        <span>{label}</span>
        <span
          className="text-base leading-none transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          ▾
        </span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
