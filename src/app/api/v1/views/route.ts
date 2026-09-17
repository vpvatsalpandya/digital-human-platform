import { NextResponse } from 'next/server';
import { z } from 'zod';

const view = z.object({ name: z.string().min(1).max(80), state: z.record(z.unknown()) });

/** Saved views sync (FR-E9). Local persistence is the source until sign-in; then merged server-side. */
export async function POST(req: Request) {
  const parsed = view.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ title: 'Invalid request' }, { status: 400 });
  return NextResponse.json({ id: crypto.randomUUID(), ...parsed.data });
}
