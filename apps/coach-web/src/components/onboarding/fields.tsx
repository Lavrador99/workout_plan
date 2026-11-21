import { useState, type ReactNode } from "react";
import Field from "../Field";
import { fmtNum, num } from "@treino/core/text";

// Small form fields for the onboarding: each one reads a value and reports a new one.

export function Text({ label, value, onChange, placeholder, area, type }: { label: string; value: string | null | undefined; onChange: (v: string) => void; placeholder?: string; area?: boolean; type?: string }) {
  return (
    <Field label={label}>
      {area ? (
        <textarea className="input py-2 min-h-[72px]" value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" type={type ?? "text"} autoComplete="off" value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

/** Keeps what is typed ("7,") while the stored value is already a number. */
export function Num({ label, value, onChange, placeholder }: { label: string; value: number | null | undefined; onChange: (v: number | null) => void; placeholder?: string }) {
  const [text, setText] = useState(value == null ? "" : fmtNum(value));
  const shown = num(text) === (value ?? null) ? text : value == null ? "" : fmtNum(value);
  return (
    <Field label={label}>
      <input
        className="input"
        inputMode="decimal"
        value={shown}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          onChange(num(e.target.value));
        }}
      />
    </Field>
  );
}

export function Pick<K extends string | number>({ label, options, value, onChange }: { label?: string; options: readonly (readonly [K, string])[]; value: K | null | undefined; onChange: (v: K | null) => void }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="label">{label}</span>}
      <div className="flex flex-wrap gap-2">
        {options.map(([k, l]) => (
          <button key={String(k)} type="button" className={`chip whitespace-normal h-auto min-h-10 py-2 text-left ${value === k ? "chip-on" : ""}`} aria-pressed={value === k} onClick={() => onChange(value === k ? null : k)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Multi<K extends string>({ label, options, value, onChange }: { label?: string; options: readonly (readonly [K, string])[]; value: K[] | undefined; onChange: (v: K[]) => void }) {
  const on = new Set(value ?? []);
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="label">{label}</span>}
      <div className="flex flex-wrap gap-2">
        {options.map(([k, l]) => (
          <button key={k} type="button" className={`chip whitespace-normal h-auto min-h-10 py-2 text-left ${on.has(k) ? "chip-on" : ""}`} aria-pressed={on.has(k)} onClick={() => onChange(on.has(k) ? [...on].filter((x) => x !== k) : [...on, k])}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

const YES_NO = [
  [1, "Sim"],
  [0, "Não"],
] as const;

export function YesNo({ label, value, onChange }: { label: string; value: boolean | null | undefined; onChange: (v: boolean | null) => void }) {
  return <Pick label={label} options={YES_NO} value={value == null ? null : value ? 1 : 0} onChange={(v) => onChange(v == null ? null : v === 1)} />;
}

/** A list of checkboxes for long labels. */
export function Checks({ label, options, value, onChange }: { label?: string; options: readonly string[]; value: string[] | undefined; onChange: (v: string[]) => void }) {
  const on = new Set(value ?? []);
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="label">{label}</span>}
      {options.map((o) => (
        <label key={o} className="flex gap-2 items-start text-sm py-1">
          <input type="checkbox" className="mt-1" checked={on.has(o)} onChange={() => onChange(on.has(o) ? [...on].filter((x) => x !== o) : [...on, o])} />
          <span>{o}</span>
        </label>
      ))}
    </div>
  );
}

/** A questionnaire: one choice per item. `locked` items are deduced and shown, not chosen. */
export function Grid({ items, options, value, onChange, locked }: { items: string[]; options: readonly (readonly [number, string])[]; value: (number | null)[] | undefined; onChange: (v: (number | null)[]) => void; locked?: Set<number> }) {
  const answers = items.map((_, i) => value?.[i] ?? null);
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={item} className="flex flex-col gap-1">
          <span className="text-sm">{item}</span>
          {locked?.has(i) ? (
            <span className="text-xs text-muted">{answers[i] == null ? "Deduzido quando houver dados." : `${options.find(([v]) => v === answers[i])?.[1]} (deduzido)`}</span>
          ) : (
            <Pick options={options} value={answers[i]} onChange={(v) => onChange(answers.map((a, j) => (j === i ? v : a)))} />
          )}
        </div>
      ))}
    </div>
  );
}

export function Info({ children, tone }: { children: ReactNode; tone?: "warn" }) {
  return <div className={`text-sm rounded-lg bg-card2 px-3 py-2 ${tone === "warn" ? "text-warn" : ""}`}>{children}</div>;
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card p-3 flex flex-col gap-3">
      {title && <h2 className="font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
