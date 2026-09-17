import { headers } from 'next/headers';
import { resolveTenant } from '@/lib/tenant';
import { FEATURES, resolveEntitlements } from '@/lib/entitlements';

/** Admin overview (FR-An3, FR-Te1). Role gating arrives with Auth.js (Sprint 3). */
export default async function AdminPage() {
  const tenant = await resolveTenant((await headers()).get('host'));
  const ent = resolveEntitlements(tenant);
  return (
    <div className="mx-auto grid max-w-5xl gap-3 p-4 md:grid-cols-2">
      <section className="card text-sm"><div className="label">Tenant</div><p className="text-lg font-semibold">{tenant.name}</p><p>Slug <code>{tenant.slug}</code> · Plan <b>{tenant.plan}</b> · Country {tenant.countryCode}</p><p className="text-xs text-muted">Try host <code>nursing.localhost:3000</code> for a second white-labelled tenant.</p></section>
      <section className="card text-sm"><div className="label">Branding</div><p>Product name: <b>{tenant.productName}</b></p><div className="mt-2 flex gap-2">{Object.entries(tenant.tokens).filter(([k]) => k.startsWith('color')).map(([k, v]) => <span key={k} title={k} className="h-6 w-6 rounded border border-border" style={{ background: v }} />)}</div><p className="mt-1 text-xs text-muted">Tokens are CSS variables (ADR-014); contrast validated on save.</p></section>
      <section className="card text-sm md:col-span-2"><div className="label">Entitlements</div><ul className="mt-1 flex flex-wrap gap-1">{FEATURES.map((f) => <li key={f} className={`chip ${ent.features[f] ? 'chip-on' : 'opacity-50'}`}>{f}</li>)}</ul><p className="mt-1 text-xs text-muted">Tutor quota: {ent.tutorQuotaPerSeat} questions per seat per month.</p></section>
      <section className="card text-sm"><div className="label">Usage</div><p className="text-xs text-muted">Activation, seat utilisation and department comparison render from LearningEvent roll-ups (Sprint 7).</p></section>
      <section className="card text-sm"><div className="label">Integrations</div><p className="text-xs text-muted">SSO (OIDC/SAML), LTI 1.3, roster CSV — Sprint 3 and 11.</p></section>
    </div>
  );
}
