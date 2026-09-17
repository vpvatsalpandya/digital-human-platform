import { NextResponse } from 'next/server';
import { z } from 'zod';
import { audienceMode } from '@/knowledge/schema';
import { answer } from '@/modules/tutor/service';

const body = z.object({ question: z.string().min(2).max(1000), mode: audienceMode.default('mbbs'), structureId: z.string().optional() });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ type: 'about:blank', title: 'Invalid request', detail: parsed.error.flatten() }, { status: 400 });
  // Entitlement + per-seat quota checks (Redis) are enforced here once auth lands (Sprint 3).
  const result = await answer(parsed.data.question, parsed.data.mode, parsed.data.structureId);
  return NextResponse.json(result);
}
