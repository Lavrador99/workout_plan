/** Segmented control: one of a few options. */
export default function Seg({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex self-start max-w-full rounded-lg border border-border overflow-hidden">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          className={`px-3 h-10 text-sm ${value === v ? "bg-accent text-on-accent font-semibold" : "bg-card2 text-muted"}`}
          onClick={() => onChange(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
