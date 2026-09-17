import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge middleware (Phase C §4): tags every request with the resolved host so server
 * components and handlers can resolve the tenant without re-parsing. Auth cookie checks
 * for /faculty and /admin are added in Sprint 3 with Auth.js.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set('x-tenant-host', req.headers.get('host') ?? '');
  return res;
}

export const config = { matcher: ['/((?!_next|assets|decoders|manifest.webmanifest|favicon.ico).*)'] };
