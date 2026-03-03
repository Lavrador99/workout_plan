interface BadgeProps {
  variant: "deload" | "run" | "normal" | "circuit";
  children: React.ReactNode;
}

const BADGE_STYLES: Record<BadgeProps["variant"], string> = {
  deload: "bg-orange-500/10 text-orange-400 border border-orange-500/25",
  run: "bg-[#47c4ff]/10  text-[#47c4ff] border border-[#47c4ff]/25",
  normal: "bg-accent/10     text-accent     border border-accent/25",
  circuit: "bg-[#ff4747]/10  text-[#ff6060] border border-[#ff4747]/25",
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-2xl text-[11px] font-bold tracking-wider ${BADGE_STYLES[variant]}`}
    >
      {children}
    </span>
  );
}
