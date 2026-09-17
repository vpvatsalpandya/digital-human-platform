import 'server-only';

/**
 * Tenant resolution (A-10 §5). Production reads TenantDomain from Redis with DB fallback;
 * development resolves from DEFAULT_TENANT_SLUG. Theme tokens map to CSS variables (ADR-014).
 */
export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  productName: string;
  plan: 'STARTER' | 'PRO' | 'ENTERPRISE';
  countryCode: string;
  entitlements: Record<string, unknown> | null;
  tokens: ThemeTokens;
  hidePlatformBrand: boolean;
}

export interface ThemeTokens {
  colorPrimary: string; colorPrimaryFg: string; colorAccent: string; colorBg: string; colorSurface: string;
  colorSurface2: string; colorText: string; colorMuted: string; colorBorder: string; radius: string; fontSans: string;
}

export const DEFAULT_TOKENS: ThemeTokens = {
  colorPrimary: '#0f766e', colorPrimaryFg: '#ffffff', colorAccent: '#f59e0b', colorBg: '#0b1020', colorSurface: '#121a2e',
  colorSurface2: '#1a2440', colorText: '#e6ebf5', colorMuted: '#94a3b8', colorBorder: '#26304d', radius: '14px', fontSans: 'Inter, system-ui, sans-serif',
};

const DEMO_TENANTS: Record<string, TenantContext> = {
  demo: { id: '00000000-0000-0000-0000-000000000001', slug: 'demo', name: 'Demo Medical College', productName: 'Vesalia', plan: 'PRO', countryCode: 'IN', entitlements: null, tokens: DEFAULT_TOKENS, hidePlatformBrand: false },
  nursing: { id: '00000000-0000-0000-0000-000000000002', slug: 'nursing', name: 'Demo College of Nursing', productName: 'CareAnatomy', plan: 'STARTER', countryCode: 'IN', entitlements: null, tokens: { ...DEFAULT_TOKENS, colorPrimary: '#7c3aed', colorAccent: '#22d3ee' }, hidePlatformBrand: true },
};

export async function resolveTenant(host: string | null): Promise<TenantContext> {
  const sub = host?.split(':')[0]?.split('.')[0] ?? '';
  const slug = DEMO_TENANTS[sub] ? sub : (process.env.DEFAULT_TENANT_SLUG ?? 'demo');
  return DEMO_TENANTS[slug] ?? DEMO_TENANTS.demo!;
}

export function tokensToCss(t: ThemeTokens): string {
  return `:root{--color-primary:${t.colorPrimary};--color-primary-fg:${t.colorPrimaryFg};--color-accent:${t.colorAccent};--color-bg:${t.colorBg};--color-surface:${t.colorSurface};--color-surface-2:${t.colorSurface2};--color-text:${t.colorText};--color-muted:${t.colorMuted};--color-border:${t.colorBorder};--color-danger:#ef4444;--color-success:#22c55e;--radius:${t.radius};--font-sans:${t.fontSans}}`;
}
