/** Wrapping chip toggles: several values (multi) or one value that a second tap clears. */
export default function Chips({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" className={`chip ${on ? "chip-on" : ""}`} onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** Chips under a small heading per group (body region). */
export function ChipGroups({ groups, value, onChange }: { groups: [string, string[]][]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {groups.map(([label, options]) => (
        <div key={label} className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">{label}</span>
          <Chips options={options} value={value} onChange={onChange} />
        </div>
      ))}
    </div>
  );
}

export function ChipPick({ options, value, onChange }: { options: string[]; value?: string; onChange: (v: string | undefined) => void }) {
  return <Chips options={options} value={value ? [value] : []} onChange={(v) => onChange(v.find((x) => x !== value))} />;
}
