import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { resolveTenant, tokensToCss } from '@/lib/tenant';
import { Nav } from '@/components/Nav';
import { StoreHydration } from '@/components/StoreHydration';
import { HEAD_CLEAN_SCRIPT } from '@/lib/head-clean';

export const metadata: Metadata = { title: 'Digital Human Learning Platform', description: 'Mobile-first medical education platform' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0b1020' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const tenant = await resolveTenant(h.get('host'));
  return (
    <html lang="en" data-tenant={tenant.slug}>
      <head>
        {/* strips the whitespace node Netlify injects into <head> (hydration error #418 on *.netlify.app), see lib/head-clean.ts */}
        <script dangerouslySetInnerHTML={{ __html: HEAD_CLEAN_SCRIPT }} />
        <style dangerouslySetInnerHTML={{ __html: tokensToCss(tenant.tokens) }} />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="flex min-h-full flex-col">
        <StoreHydration />
        <Nav productName={tenant.productName} />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border px-4 py-3 text-[11px] text-muted">
          For education only — not for clinical use. {tenant.hidePlatformBrand ? '' : 'Powered by Vesalia. '}
          <a href="/about/attribution" className="underline">Open data attribution</a>
        </footer>
      </body>
    </html>
  );
}
