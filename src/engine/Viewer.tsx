'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, PerformanceMonitor, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { useEngineStore, structureVisibility } from '@/store/engine';
import { SYSTEM_META, type BodyManifest, type ManifestStructure, type SystemId } from './types';
import { chooseLod, loadStructureGeometry, proceduralGeometry } from './loader';

// BVH-accelerated raycasting for picking (Phase G §5).
const geomProto = THREE.BufferGeometry.prototype as unknown as Record<string, unknown>;
geomProto.computeBoundsTree = computeBoundsTree;
geomProto.disposeBoundsTree = disposeBoundsTree;
(THREE.Mesh.prototype as unknown as Record<string, unknown>).raycast = acceleratedRaycast;

export interface ViewerProps { manifest: BodyManifest; className?: string; onSelect?: (id: string | null) => void }

/**
 * Digital Human Engine viewer. Mobile budgets: adaptive DPR, demand-driven frameloop when
 * idle, no shadows/post-processing on low tier, local clipping, BVH picking.
 */
export function Viewer({ manifest, className, onSelect }: ViewerProps) {
  const qualityTier = useEngineStore((s) => s.qualityTier);
  const [dprCap, setDprCap] = useState(qualityTier === 'low' ? 1 : 1.75);
  return (
    <div className={className ?? 'h-full w-full'} role="img" aria-label={`3D ${manifest.body} body`}>
      <Canvas
        dpr={[1, dprCap]}
        frameloop="demand"
        gl={{ antialias: dprCap <= 1.5, powerPreference: 'default', localClippingEnabled: true, alpha: true }}
        camera={{ fov: 40, near: 0.05, far: 50 }}
        onCreated={({ gl }) => { gl.localClippingEnabled = true; }}
      >
        <PerformanceMonitor onDecline={() => setDprCap((d) => Math.max(1, d - 0.25))} onIncline={() => qualityTier !== 'low' && setDprCap((d) => Math.min(2, d + 0.25))} />
        <AdaptiveDpr pixelated />
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 4, 3]} intensity={1.6} />
        <directionalLight position={[-3, -1, -2]} intensity={0.4} />
        <Suspense fallback={<Html center><span className="text-xs text-muted">Loading body…</span></Html>}>
          <Body manifest={manifest} onSelect={onSelect} />
        </Suspense>
        <CameraRig />
      </Canvas>
    </div>
  );
}

function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, invalidate } = useThree();
  const cameraEpoch = useEngineStore((s) => s.cameraEpoch);
  const target = useEngineStore((s) => s.camera);
  const setCamera = useEngineStore((s) => s.setCamera);

  useEffect(() => {
    camera.position.set(...target.position);
    controls.current?.target.set(...target.target);
    controls.current?.update();
    invalidate();
    // only when a view is applied, not on every drag
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraEpoch]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minDistance={0.2}
      maxDistance={8}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      onEnd={() => {
        const c = controls.current; if (!c) return;
        setCamera([camera.position.x, camera.position.y, camera.position.z], [c.target.x, c.target.y, c.target.z]);
      }}
    />
  );
}

function Body({ manifest, onSelect }: { manifest: BodyManifest; onSelect?: (id: string | null) => void }) {
  const systemCentroids = useMemo(() => {
    const acc = new Map<SystemId, THREE.Vector3>(), n = new Map<SystemId, number>();
    for (const s of manifest.structures) for (const sys of s.systems) {
      acc.set(sys, (acc.get(sys) ?? new THREE.Vector3()).add(new THREE.Vector3(...s.centroid)));
      n.set(sys, (n.get(sys) ?? 0) + 1);
    }
    for (const [k, v] of acc) v.divideScalar(n.get(k) ?? 1);
    return acc;
  }, [manifest]);
  const select = useEngineStore((s) => s.select);
  return (
    <group onPointerMissed={() => { select(null); onSelect?.(null); }}>
      {manifest.structures.map((s) => (
        <StructureMesh key={s.id} structure={s} systemCentroid={systemCentroids.get(s.systems[0]!) ?? new THREE.Vector3()} onSelect={onSelect} />
      ))}
    </group>
  );
}

function StructureMesh({ structure: s, systemCentroid, onSelect }: { structure: ManifestStructure; systemCentroid: THREE.Vector3; onSelect?: (id: string | null) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl, camera, invalidate } = useThree();
  const lowBandwidth = useEngineStore((st) => st.lowBandwidth);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(() => (s.lods ? null : proceduralGeometry(s)));
  const lodRef = useRef(-1);

  // Real assets: choose LOD by distance and stream it (Phase G §3).
  useFrame(() => {
    if (!s.lods?.length || !meshRef.current) return;
    const d = camera.position.distanceTo(meshRef.current.position);
    const r = Math.max(s.bounds[3] - s.bounds[0], s.bounds[4] - s.bounds[1], s.bounds[5] - s.bounds[2]) / 2;
    const want = chooseLod(d, r, s.lods.length, lowBandwidth);
    if (want !== lodRef.current) {
      lodRef.current = want;
      loadStructureGeometry(s.lods[want]!.url, gl).then((g) => { if (lodRef.current === want) { g.computeBoundsTree(); setGeometry(g); invalidate(); } });
    }
  });

  useEffect(() => { if (geometry && !geometry.boundsTree) geometry.computeBoundsTree(); }, [geometry]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color(SYSTEM_META[s.systems[0]!].color), roughness: 0.6, metalness: 0.05 }), [s.systems]);

  // Apply visual state transiently (no React re-render per structure per change).
  useEffect(() => useEngineStore.subscribe((st) => {
    const m = meshRef.current; if (!m) return;
    const { visible, opacity } = structureVisibility(st, s.id, s.systems);
    m.visible = visible;
    const selected = st.selected.includes(s.id), hovered = st.hoverId === s.id;
    material.opacity = opacity;
    material.transparent = opacity < 1;
    material.depthWrite = opacity >= 0.5;
    material.emissive.set(selected ? '#ffd166' : hovered ? '#66d9ef' : '#000000');
    material.emissiveIntensity = selected ? 0.55 : hovered ? 0.35 : 0;
    material.clippingPlanes = st.clip?.enabled ? [new THREE.Plane(new THREE.Vector3(...st.clip.normal), st.clip.constant)] : [];
    material.clipShadows = false;
    material.needsUpdate = true;
    const c = new THREE.Vector3(...s.centroid);
    const offset = c.clone().sub(systemCentroid).multiplyScalar(st.explode * 1.2);
    m.position.copy(c.add(offset));
    invalidate();
  }), [s, material, systemCentroid, invalidate]);

  // Initial state
  useEffect(() => { useEngineStore.setState({}); }, []);

  const select = useEngineStore((st) => st.select);
  const setHover = useEngineStore((st) => st.setHover);
  const onClick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); select(s.id, e.shiftKey || e.ctrlKey); onSelect?.(s.id); };

  if (!geometry) return null;
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={s.centroid}
      name={s.id}
      onClick={onClick}
      onPointerOver={(e) => { e.stopPropagation(); setHover(s.id); }}
      onPointerOut={() => setHover(null)}
      onDoubleClick={(e) => { e.stopPropagation(); focusOn(s); }}
    />
  );
}

/** Move the camera to frame a structure (FR-E11 double-tap focus). */
export function focusOn(s: ManifestStructure) {
  const st = useEngineStore.getState();
  const size = Math.max(s.bounds[3] - s.bounds[0], s.bounds[4] - s.bounds[1], s.bounds[5] - s.bounds[2]);
  const dist = Math.max(0.35, size * 3);
  const dir = new THREE.Vector3(...st.camera.position).sub(new THREE.Vector3(...st.camera.target)).normalize();
  const pos = new THREE.Vector3(...s.centroid).add(dir.multiplyScalar(dist));
  st.applyViewState({ ...st.snapshot(), camera: { position: [pos.x, pos.y, pos.z], target: s.centroid } });
}
