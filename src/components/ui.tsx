'use client';
import { useState, type ReactNode } from 'react';

export function Slider({ label, value, min = 0, max = 1, step = 0.01, onChange, format }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className="flex shrink-0 flex-col gap-1 text-xs">
      <span className="flex justify-between"><span className="label">{label}</span><span className="tabular-nums text-muted">{format ? format(value) : value.toFixed(2)}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-11 w-full accent-[var(--color-primary)]" aria-label={label} />
    </label>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" className="flex shrink-0 gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={`chip ${value === t.id ? 'chip-on' : ''}`}>{t.label}</button>
      ))}
    </div>
  );
}

export function Sheet({ title, children, defaultOpen = true, right }: { title: string; children: ReactNode; defaultOpen?: boolean; right?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`sheet ${open ? 'max-h-[70vh]' : 'max-h-14'} flex flex-col overflow-hidden md:max-h-none`} aria-label={title}>
      <header className="flex items-center justify-between px-4 py-2">
        <button className="flex items-center gap-2 text-sm font-semibold min-h-[44px]" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className="md:hidden h-1.5 w-8 rounded bg-border" aria-hidden />
          {title}
        </button>
        {right}
      </header>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
    </section>
  );
}

export function Citations({ items, sources }: { items: { sourceId: string; locator: string; quote?: string }[]; sources: Record<string, { title: string; edition?: string; year?: number; licence: string; url?: string }> }) {
  if (!items.length) return <span className="text-[11px] text-danger">No citation — cannot be published</span>;
  return (
    <ul className="mt-1 flex flex-wrap gap-1">
      {items.map((c, i) => {
        const s = sources[c.sourceId];
        const label = s ? `${s.title}${s.edition ? ` ${s.edition} ed.` : ''}${s.year ? ` (${s.year})` : ''}` : c.sourceId;
        return (
          <li key={i} className="chip !min-h-0 !py-1 text-[11px]" title={`${label} — ${c.locator}${c.quote ? `\n"${c.quote}"` : ''}`}>
            {s?.url ? <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-dotted">{label}</a> : label}
            <span className="text-muted">· {c.locator}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="card !p-3"><div className="label">{label}</div><div className="text-lg font-semibold tabular-nums">{value}<span className="ml-1 text-xs text-muted">{unit}</span></div></div>
  );
}
