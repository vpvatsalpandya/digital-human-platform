import Link from 'next/link';
import { headers } from 'next/headers';
import { resolveTenant } from '@/lib/tenant';
import { can } from '@/lib/entitlements';

const MODULES = [
  ['atlas', '/atlas', 'Atlas', '3D male and female body, 14 systems, isolate · hide · fade · explode · clip · save views'],
  ['physiology', '/physiology', 'Physiology', 'Runnable models: cardiac cycle, action potential, gas exchange'],
  ['histology', '/histology', 'Histology', 'Virtual microscope with guided, self-study and assessment modes'],
  ['embryology', '/embryology', 'Embryology', 'Week-by-week timeline with Carnegie stages and anomaly branches'],
  ['pathology', '/pathology', 'Pathology', 'Normal vs disease comparison'],
  ['radiology', '/radiology', 'Radiology', 'Slices synchronised with the 3D body'],
  ['spotter', '/assess', 'Assess', 'Spotter, quiz, viva, OSPE/OSCE'],
  ['tutor', '/tutor', 'AI Tutor', 'Citation-only answers from reviewed records'],
] as const;

export default async function Home() {
  const tenant = await resolveTenant((await headers()).get('host'));
  return (
    <div className="mx-auto max-w-5xl p-4">
      <section className="card mb-4">
        <div className="label">{tenant.name} · {tenant.plan}</div>
        <h1 className="mt-1 text-2xl font-bold">{tenant.productName}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">A digital human that runs on the phone you already own. Every structure links to cited, faculty-reviewed knowledge, its histology, embryology, physiology, pathology and imaging, and can be examined.</p>
        <p className="mt-2 text-xs text-muted">Sprint 0 build: procedural demo body, seed records (in review), three real simulations, schematic slides and a synthetic imaging phantom. See <code>digital-human/README.md</code> for what is real and what is scaffolded.</p>
      </section>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MODULES.map(([feature, href, title, desc]) => {
          const enabled = can(tenant, feature as never);
          return (
            <li key={href} className={`card ${enabled ? '' : 'opacity-50'}`}>
              <Link href={enabled ? href : '#'} className="block min-h-[44px]"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-muted">{desc}</p>{!enabled && <span className="mt-2 inline-block text-[11px] text-danger">Not in {tenant.plan} plan</span>}</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
