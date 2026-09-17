'use client';
import { useEffect } from 'react';
import { useEngineStore } from '@/store/engine';
import { demoManifest } from '@/engine/demo-manifest';
import { focusOn } from '@/engine/Viewer';

/** `/atlas?structure=<id>` selects, reveals and frames a structure (Phase F §1 rule 4). */
export function AtlasDeepLink({ structureId }: { structureId?: string }) {
  useEffect(() => {
    if (!structureId) return;
    const st = useEngineStore.getState();
    const s = demoManifest(st.body).structures.find((x) => x.id === structureId) ?? demoManifest(st.body === 'male' ? 'female' : 'male').structures.find((x) => x.id === structureId);
    if (!s) return;
    st.setVisibleSystems([...new Set([...st.visibleSystems, ...s.systems])]);
    st.select(s.id);
    setTimeout(() => focusOn(s), 50);
  }, [structureId]);
  return null;
}
