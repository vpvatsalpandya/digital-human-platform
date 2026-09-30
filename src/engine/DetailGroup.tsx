'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useEngineStore, structureVisibility, type EngineState } from '@/store/engine';
import { CORE_LAYERS } from './layers';
import { categoryColor } from './detail-colors';
import { loadGroupGeometry, type GroupGeometry } from './loader';
import type { DetailGroup as DetailGroupMeta, ManifestStructure } from './types';

/** State values written to the per-vertex `aState` attribute. */
const SOLID = 0, GHOST = 1, HIDDEN = 2, SELECTED = 3, HOVER = 4;

function shade(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h % 1000) / 1000 - 0.5) * 0.08;
}

/**
 * Material patched to read the per-vertex state: hidden vertices are discarded, ghosted ones
 * are drawn by a second, translucent pass, and selected or hovered ones get a gentle emissive
 * lift (a flood of colour would destroy the tissue colour that identifies the structure).
 */
function patch(material: THREE.MeshStandardMaterial, pass: 'solid' | 'ghost') {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aState;\nvarying float vState;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvState = aState;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vState;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${
        pass === 'solid' ? 'if (vState > 1.5 && vState < 2.5) discard; if (vState > 0.5 && vState < 1.5) discard;'
          : 'if (vState < 0.5 || vState > 1.5) discard;'}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\nif (vState > 2.5 && vState < 3.5) totalEmissiveRadiance += vec3(1.0, 0.72, 0.01) * 0.16;\nif (vState > 3.5) totalEmissiveRadiance += vec3(0.4, 0.85, 0.94) * 0.1;`);
  };
  material.customProgramCacheKey = () => `detail-${pass}`;
}

/** Ray test against every triangle the viewer is currently drawing solid. */
function makeRaycast(getState: () => Float32Array | null, gg: GroupGeometry) {
  return function raycast(this: THREE.Mesh, raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    const tree = (this.geometry as THREE.BufferGeometry & { boundsTree?: { raycast: (r: THREE.Ray, m: THREE.Material | number, n: number, f: number) => THREE.Intersection[] } }).boundsTree;
    const st = getState();
    if (!tree || !st) return;
    const hits = tree.raycast(raycaster.ray, THREE.DoubleSide, raycaster.near, raycaster.far);
    const idx = gg.geometry.index!;
    for (const h of hits) {
      const v = idx.getX((h.faceIndex ?? 0) * 3);
      const s = st[v]!;
      if (s === HIDDEN || s === GHOST) continue;
      intersects.push({ ...h, object: this });
    }
  };
}

function structureAt(gg: GroupGeometry, face: number): number {
  let lo = 0, hi = gg.ids.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (gg.triStart[mid]! <= face) lo = mid; else hi = mid - 1; }
  return lo;
}

export function DetailGroupMesh({ group, structures, onSelect }: { group: DetailGroupMeta; structures: ManifestStructure[]; onSelect?: (id: string | null) => void }) {
  const { invalidate } = useThree();
  const [gg, setGg] = useState<GroupGeometry | null>(null);
  const stateRef = useRef<Float32Array | null>(null);
  const items = useMemo(() => structures.filter((s) => s.group === group.id && s.packed), [structures, group.id]);

  useEffect(() => {
    let cancelled = false;
    loadGroupGeometry(group.url, items as never, (s) => {
      const c = new THREE.Color(categoryColor(s.category));
      const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl);
      return c.setHSL(hsl.h, hsl.s, Math.min(0.92, Math.max(0.08, hsl.l + shade(s.id))));
    }).then((g) => {
      if (cancelled) return;
      // Build the BVH once, off the critical path: it is what makes picking a triangle out of
      // half a million cheap, and the group is already visible without it.
      (g.geometry as unknown as { computeBoundsTree: () => void }).computeBoundsTree();
      stateRef.current = g.geometry.getAttribute('aState').array as Float32Array;
      setGg(g); invalidate();
    }).catch((e) => console.warn(`detail group ${group.id} failed to load`, e));
    return () => { cancelled = true; };
  }, [group.url, items, invalidate, group.id]);

  const solid = useMemo(() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, side: THREE.DoubleSide }); patch(m, 'solid'); return m; }, []);
  const ghost = useMemo(() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }); patch(m, 'ghost'); return m; }, []);

  // Push store state into the per-vertex attribute; no React render per change.
  useEffect(() => {
    if (!gg) return;
    const attr = gg.geometry.getAttribute('aState') as THREE.BufferAttribute;
    const apply = (st: EngineState) => {
      const arr = attr.array as Float32Array;
      items.forEach((s, k) => {
        const layer = s.layer ?? CORE_LAYERS[s.id];
        const vis = structureVisibility(st, s.id, s.systems, s.provenance, layer);
        let value: number;
        if (!vis.visible) value = HIDDEN;
        else if (vis.opacity < 0.5) value = GHOST;
        else if (st.selected.includes(s.id)) value = SELECTED;
        else if (st.hoverId === s.id) value = HOVER;
        else value = SOLID;
        arr.fill(value, gg.vertexStart[k], gg.vertexStart[k + 1]);
      });
      attr.needsUpdate = true;
      solid.opacity = 1 - st.transparency * 0.85; solid.transparent = st.transparency > 0.02; solid.depthWrite = st.transparency < 0.5;
      const planes = st.clip?.enabled ? [new THREE.Plane(new THREE.Vector3(...st.clip.normal), st.clip.constant)] : [];
      solid.clippingPlanes = planes; ghost.clippingPlanes = planes;
      invalidate();
    };
    apply(useEngineStore.getState());
    return useEngineStore.subscribe((st, prev) => {
      if (st.hidden !== prev.hidden || st.faded !== prev.faded || st.isolated !== prev.isolated || st.visibleSystems !== prev.visibleSystems
        || st.transparency !== prev.transparency || st.showStandIns !== prev.showStandIns || st.peel !== prev.peel || st.selected !== prev.selected
        || st.hoverId !== prev.hoverId || st.clip !== prev.clip) apply(st);
    });
  }, [gg, items, solid, ghost, invalidate]);

  const meshes = useMemo(() => {
    if (!gg) return null;
    const a = new THREE.Mesh(gg.geometry, solid); a.raycast = makeRaycast(() => stateRef.current, gg); a.frustumCulled = false; a.name = `group:${group.id}`;
    const b = new THREE.Mesh(gg.geometry, ghost); b.raycast = () => undefined; b.frustumCulled = false; b.renderOrder = 2;
    return { a, b };
  }, [gg, solid, ghost, group.id]);

  const select = useEngineStore((s) => s.select);
  const setHover = useEngineStore((s) => s.setHover);
  if (!gg || !meshes) return null;
  const idFor = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.faceIndex == null ? null : gg.ids[structureAt(gg, e.faceIndex)] ?? null);
  return (
    <>
      <primitive
        object={meshes.a}
        onClick={(e: ThreeEvent<MouseEvent>) => { const id = idFor(e); if (!id) return; e.stopPropagation(); select(id, e.shiftKey || e.ctrlKey); onSelect?.(id); }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => { const id = idFor(e); if (id) { e.stopPropagation(); if (useEngineStore.getState().hoverId !== id) setHover(id); } }}
        onPointerOut={() => setHover(null)}
        onDoubleClick={(e: ThreeEvent<MouseEvent>) => { const id = idFor(e); const s = id ? items.find((x) => x.id === id) : undefined; if (!s) return; e.stopPropagation(); void import('./Viewer').then((m) => m.focusOn(s)); }}
      />
      <primitive object={meshes.b} />
    </>
  );
}
