import { describe, expect, it } from 'vitest';
import { can, resolveEntitlements } from '@/lib/entitlements';

describe('entitlements', () => {
  it('plans gate modules', () => {
    expect(can({ plan: 'STARTER' }, 'histology')).toBe(false);
    expect(can({ plan: 'PRO' }, 'histology')).toBe(true);
    expect(can({ plan: 'PRO' }, 'sso.saml')).toBe(false);
    expect(can({ plan: 'ENTERPRISE' }, 'sso.saml')).toBe(true);
  });
  it('per-tenant overrides win', () => { expect(can({ plan: 'STARTER', entitlements: { features: { histology: true } } }, 'histology')).toBe(true); });
  it('SNOMED is gated by member country', () => {
    expect(can({ plan: 'ENTERPRISE', countryCode: 'IN' }, 'snomed')).toBe(true);
    expect(can({ plan: 'ENTERPRISE', countryCode: 'NP' }, 'snomed')).toBe(false);
    expect(resolveEntitlements({ plan: 'PRO' }).tutorQuotaPerSeat).toBe(150);
  });
});
