import { NextResponse } from 'next/server';
import { z } from 'zod';

const body = z.object({ events: z.array(z.object({ type: z.string(), payload: z.record(z.unknown()), at: z.number() })).max(500) });

/** LearningEvent ingestion (append-only; persisted via forTenant(tenantId).learningEvent.createMany once auth lands). */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ title: 'Invalid request' }, { status: 400 });
  return NextResponse.json({ accepted: parsed.data.events.length });
}
