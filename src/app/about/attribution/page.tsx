import { SOURCES } from '@/knowledge/sources';
import manifests from '../../../../content/manifests/index.json';

/** Licence obligation page (A-05 §4). Cannot be disabled by white-label configuration. */
export default function AttributionPage() {
  return (
    <div className="mx-auto max-w-3xl p-4 text-sm">
      <h1 className="text-xl font-bold">Open data and software attribution</h1>
      <p className="mt-2 text-muted">This platform builds on openly licensed anatomical data. Attribution below is required by the respective licences and is preserved in every deployment.</p>
      <h2 className="label mt-4">Asset packs</h2>
      <ul className="mt-1 flex flex-col gap-2">{manifests.packs.map((p) => <li key={p.pack} className="card"><b>{p.title}</b> — {p.licence}<div className="text-xs text-muted">{p.attribution}</div>{p.url && <a className="text-xs underline" href={p.url}>{p.url}</a>}</li>)}</ul>
      <h2 className="label mt-4">Knowledge sources</h2>
      <ul className="mt-1 flex flex-col gap-1">{Object.values(SOURCES).map((s) => <li key={s.id}>{s.title}{s.edition ? `, ${s.edition} ed.` : ''}{s.year ? ` (${s.year})` : ''} — {s.licence}{s.attributionText ? `. ${s.attributionText}` : ''}</li>)}</ul>
      <h2 className="label mt-4">Software</h2>
      <p>Three.js, React Three Fiber, drei, three-mesh-bvh, meshoptimizer, Draco, KTX-Software (MIT / Apache 2.0); Next.js, Prisma, Zustand, Tailwind (MIT / Apache 2.0). Full notices: THIRD_PARTY_NOTICES.md.</p>
    </div>
  );
}
