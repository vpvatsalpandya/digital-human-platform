'use client';
import { useEffect, useMemo, useState } from 'react';
import { demoManifest } from './demo-manifest';
import { fetchManifest } from './manifest';
import type { BodyId, BodyManifest } from './types';

/**
 * Resolve the body to render: a baked asset pack when one is deployed, otherwise the
 * procedural stand-ins. Structure ids are identical in both, so selection, saved views,
 * bookmarks, assessment items and radiology synchronisation keep working either way.
 */
export function useBodyManifest(body: BodyId): { manifest: BodyManifest; baked: boolean } {
  const fallback = useMemo(() => demoManifest(body), [body]);
  const [baked, setBaked] = useState<BodyManifest | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBaked(null);
    fetchManifest(body).then((m) => { if (!cancelled && m) setBaked(m); });
    return () => { cancelled = true; };
  }, [body]);

  return baked && baked.body === body ? { manifest: baked, baked: true } : { manifest: fallback, baked: false };
}
