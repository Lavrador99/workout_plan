import type { ReactNode } from "react";

/** Switch between views of one page. Same look on every page and sheet. */
export default function Tabs<T extends string>({ options, value, onChange }: { options: readonly (readonly [T, ReactNode])[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex overflow-x-auto no-scrollbar -mb-px">
      {options.map(([k, label]) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} className={`flex-auto px-1 py-2 text-sm font-semibold whitespace-nowrap border-b-2 ${value === k ? "border-accent text-accent" : "border-transparent text-muted"}`} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  );
}
