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
export function useBodyManifest(body: BodyId): { manifest: BodyManifest; baked: boolean; detailLoading: boolean } {
  const fallback = useMemo(() => demoManifest(body), [body]);
  const [core, setCore] = useState<BodyManifest | null>(null);
  const [detail, setDetail] = useState<BodyManifest | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCore(null); setDetail(null);
    fetchManifest(body).then((m) => {
      if (cancelled || !m) return;
      setCore(m);
      // The detail manifest (every named structure) is fetched after the core body is on
      // screen, so the first paint never waits for it; its meshes load per group on demand.
      fetchManifest(body, 'anatomy-v2').then((d) => { if (!cancelled && d) setDetail(d); });
    });
    return () => { cancelled = true; };
  }, [body]);

  const merged = useMemo(() => (core && core.body === body ? mergeManifests(core, detail && detail.body === body ? detail : null) : null), [core, detail, body]);
  return merged
    ? { manifest: merged, baked: true, detailLoading: !detail }
    : { manifest: fallback, baked: false, detailLoading: false };
}

/**
 * Combine the core pack with the detail pack. A detail structure with the same id as a core
 * one is an upgrade of it (the former stand-ins) and replaces it; everything else is added.
 */
export function mergeManifests(core: BodyManifest, detail: BodyManifest | null): BodyManifest {
  if (!detail) return core;
  const upgraded = new Set(detail.structures.filter((s) => core.structures.some((c) => c.id === s.id)).map((s) => s.id));
  return {
    ...core,
    pack: `${core.pack}+${detail.pack}`,
    attribution: `${core.attribution} ${detail.attribution}`,
    groups: detail.groups,
    structures: [...core.structures.filter((s) => !upgraded.has(s.id)), ...detail.structures],
  };
}
