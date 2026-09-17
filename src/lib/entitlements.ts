/** Plan templates and the single entitlement check used by every server handler (A-09 §1). */
export type Plan = 'STARTER' | 'PRO' | 'ENTERPRISE';

export const FEATURES = [
  'atlas', 'knowledge', 'quiz', 'physiology', 'histology', 'embryology', 'pathology', 'radiology',
  'spotter', 'practical', 'viva', 'ospe', 'osce', 'authoring', 'analytics.student', 'analytics.faculty',
  'analytics.admin', 'analytics.benchmark', 'tutor', 'sso.oidc', 'sso.saml', 'lti', 'branding.basic',
  'branding.full', 'overlays', 'residency', 'api', 'offlineExam', 'snomed',
] as const;
export type Feature = (typeof FEATURES)[number];

export interface Entitlements { features: Partial<Record<Feature, boolean>>; tutorQuotaPerSeat: number }

export const PLAN_TEMPLATES: Record<Plan, Entitlements> = {
  STARTER: { features: on(['atlas', 'knowledge', 'quiz', 'analytics.student', 'tutor']), tutorQuotaPerSeat: 30 },
  PRO: {
    features: on(['atlas', 'knowledge', 'quiz', 'physiology', 'histology', 'embryology', 'pathology', 'radiology', 'spotter', 'practical', 'viva', 'ospe', 'osce', 'authoring', 'analytics.student', 'analytics.faculty', 'analytics.admin', 'tutor', 'sso.oidc', 'branding.basic', 'overlays', 'offlineExam']),
    tutorQuotaPerSeat: 150,
  },
  ENTERPRISE: { features: on([...FEATURES]), tutorQuotaPerSeat: 1000 },
};

function on(list: readonly Feature[]): Partial<Record<Feature, boolean>> {
  return Object.fromEntries(list.map((f) => [f, true]));
}

export interface TenantLike { plan: Plan; entitlements?: Partial<Entitlements> | null; countryCode?: string }

/** Plan template merged with per-tenant overrides. SNOMED is additionally gated by country (A-05 §2.9). */
export function resolveEntitlements(t: TenantLike): Entitlements {
  const base = PLAN_TEMPLATES[t.plan];
  const merged: Entitlements = { features: { ...base.features, ...(t.entitlements?.features ?? {}) }, tutorQuotaPerSeat: t.entitlements?.tutorQuotaPerSeat ?? base.tutorQuotaPerSeat };
  if (merged.features.snomed && t.countryCode && !SNOMED_MEMBER_COUNTRIES.has(t.countryCode)) {
    merged.features.snomed = false;
  }
  return merged;
}

export function can(t: TenantLike, feature: Feature): boolean {
  return resolveEntitlements(t).features[feature] === true;
}

/** SNOMED International member countries where affiliate use carries no fee (subset; keep in sync with snomed.org). */
export const SNOMED_MEMBER_COUNTRIES = new Set(['IN', 'GB', 'US', 'AU', 'CA', 'NZ', 'SG', 'MY', 'DK', 'SE', 'NL', 'BE', 'ES', 'PT', 'EE', 'LT', 'IE', 'IL', 'AE', 'CL', 'UY', 'AR', 'BR', 'KR', 'HK', 'NO', 'FI', 'CH', 'AT', 'DE', 'FR', 'IT', 'PL', 'CZ', 'SK', 'HU', 'IS', 'LU', 'MT']);
