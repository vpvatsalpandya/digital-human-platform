'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  ['/', 'Home'], ['/atlas', 'Atlas'], ['/physiology', 'Physiology'], ['/histology', 'Histology'], ['/embryology', 'Embryology'],
  ['/pathology', 'Pathology'], ['/radiology', 'Radiology'], ['/assess', 'Assess'], ['/tutor', 'Tutor'], ['/me', 'Me'], ['/faculty', 'Faculty'], ['/admin', 'Admin'],
] as const;

export function Nav({ productName }: { productName: string }) {
  const path = usePathname();
  return (
    <nav className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-surface px-3 py-2 backdrop-blur" aria-label="Primary">
      <Link href="/" className="mr-2 whitespace-nowrap text-sm font-bold text-primary-fg"><span className="rounded bg-primary px-2 py-1">{productName}</span></Link>
      <div className="flex gap-1 overflow-x-auto">
        {ITEMS.map(([href, label]) => (
          <Link key={href} href={href} className={`chip ${path === href || (href !== '/' && path.startsWith(href)) ? 'chip-on' : ''}`}>{label}</Link>
        ))}
      </div>
    </nav>
  );
}
