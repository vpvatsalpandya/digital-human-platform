'use client';
import { useMemo, useState } from 'react';
import { Microscope } from '@/modules/histology/Microscope';
import { DEMO_ANNOTATIONS, DEMO_SLIDES } from '@/modules/histology/demo-slides';
import { proceduralSource } from '@/modules/histology/tiles';

export default function HistologyPage() {
  const [id, setId] = useState(DEMO_SLIDES[0]!.id);
  const slide = DEMO_SLIDES.find((s) => s.id === id)!;
  const source = useMemo(() => proceduralSource(slide.kind, slide.id, slide.title), [slide]);
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">{DEMO_SLIDES.map((s) => <button key={s.id} className={`chip ${s.id === id ? 'chip-on' : ''}`} onClick={() => setId(s.id)}>{s.isPathology ? '⚠ ' : ''}{s.title}</button>)}</div>
      <Microscope source={source} annotations={DEMO_ANNOTATIONS[id] ?? []} />
    </div>
  );
}
