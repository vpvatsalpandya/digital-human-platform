'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { useEngineStore, structureVisibility, isDefaultCamera, DEFAULT_CAMERA, type EngineState } from '@/store/engine';
import { type BodyManifest, type ManifestStructure, type SystemId } from './types';
import { tissueFor } from './tissue';
import { chooseLod, loadStructureGeometry, proceduralGeometry } from './loader';
import { CORE_LAYERS } from './layers';
import { DetailGroupMesh } from './DetailGroup';

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
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
          // Filmic tone mapping keeps the bright speculars on wet serosa from clipping to
          // flat white, which is the other half of the plastic look.
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <PerformanceMonitor onDecline={() => setDprCap((d) => Math.max(1, d - 0.25))} onIncline={() => qualityTier !== 'low' && setDprCap((d) => Math.min(2, d + 0.25))} />
        <AdaptiveDpr pixelated />
        {/*
          A three-point rig with a hemisphere bounce. A single flat ambient light removes the
          shading gradient that tells the eye an organ is a curved wet surface, which is most
          of why primitive-lit anatomy looks like a cartoon. The rim light behind separates
          overlapping viscera that share a colour.
        */}
        <hemisphereLight args={['#dfe6f2', '#4a3a33', 0.55]} />
        <directionalLight position={[2.2, 3.4, 2.8]} intensity={2.1} color="#fff4e8" />
        <directionalLight position={[-2.8, 0.6, 1.6]} intensity={0.55} color="#cfe0ff" />
        <directionalLight position={[0, 1.2, -3.2]} intensity={0.85} color="#ffd9c4" />
        <Suspense fallback={null}>
          <Body manifest={manifest} onSelect={onSelect} />
        </Suspense>
        <CameraRig manifest={manifest} />
      </Canvas>
    </div>
  );
}

/**
 * Distance and height that put the whole figure on screen with a margin, for this body and
 * this canvas. A fixed default cannot do it: the male body is 1.807 m and the female 1.723 m,
 * and a phone held upright is a different shape from a laptop window. Getting this wrong is
 * not subtle — at the previous fixed 2.6 m the skull and the feet were both cut off.
 */
export function fitToBody(manifest: BodyManifest, fovDeg: number, aspect: number) {
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (const s of manifest.structures) {
    box.expandByPoint(v.set(s.bounds[0], s.bounds[1], s.bounds[2]));
    box.expandByPoint(v.set(s.bounds[3], s.bounds[4], s.bounds[5]));
  }
  if (box.isEmpty()) return DEFAULT_CAMERA;
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const tanV = Math.tan((fovDeg * Math.PI) / 360);
  // Horizontal half-angle widens with the aspect ratio, so a narrow canvas is the binding
  // constraint on a figure with its arms out, and a wide one on a standing figure.
  const tanH = tanV * Math.max(aspect, 0.0001);
  // The 1.12 is breathing room; half the depth keeps the near face of the body off the lens.
  const distance = Math.max(size.y / 2 / tanV, size.x / 2 / tanH) * 1.12 + size.z / 2;
  return {
    position: [centre.x, centre.y, centre.z + distance] as [number, number, number],
    target: [centre.x, centre.y, centre.z] as [number, number, number],
  };
}

function CameraRig({ manifest }: { manifest: BodyManifest }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, invalidate, size } = useThree();
  const cameraEpoch = useEngineStore((s) => s.cameraEpoch);
  const target = useEngineStore((s) => s.camera);
  const setCamera = useEngineStore((s) => s.setCamera);
  const fittedTo = useRef<string | null>(null);

  useEffect(() => {
    camera.position.set(...target.position);
    controls.current?.target.set(...target.target);
    controls.current?.update();
    invalidate();
    // only when a view is applied, not on every drag
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraEpoch]);

  // Fit once per body, and only while the camera is still the untouched default: a deep link
  // or a saved view has already said where to look, and so has a student who dragged.
  useEffect(() => {
    if (fittedTo.current === manifest.body || size.width === 0 || size.height === 0) return;
    if (!isDefaultCamera(useEngineStore.getState().camera)) { fittedTo.current = manifest.body; return; }
    const view = fitToBody(manifest, (camera as THREE.PerspectiveCamera).fov, size.width / size.height);
    fittedTo.current = manifest.body;
    camera.position.set(...view.position);
    controls.current?.target.set(...view.target);
    controls.current?.update();
    setCamera(view.position, view.target);
    invalidate();
  }, [manifest, size.width, size.height, camera, invalidate, setCamera]);

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
  const enabled = useEngineStore((s) => s.groups);
  const groups = useMemo(() => manifest.groups ?? [], [manifest.groups]);
  // Detail groups that redraw a core structure in finer parts hide the coarse version.
  const replaced = useMemo(() => new Set(groups.filter((g) => enabled.includes(g.id) || g.auto).flatMap((g) => (enabled.includes(g.id) ? g.replaces ?? [] : []))), [groups, enabled]);
  const drawn = useMemo(() => manifest.structures.filter((s) => !s.packed && !replaced.has(s.id)), [manifest, replaced]);
  const autoIds = useMemo(() => groups.filter((g) => g.auto).map((g) => g.id), [groups]);
  const enableGroups = useEngineStore((s) => s.enableGroups);
  useEffect(() => { if (autoIds.length) enableGroups(autoIds); }, [autoIds, enableGroups]);
  return (
    <group onPointerMissed={() => { select(null); onSelect?.(null); }}>
      {drawn.map((s) => (
        <StructureMesh key={s.id} structure={s} systemCentroid={systemCentroids.get(s.systems[0]!) ?? new THREE.Vector3()} onSelect={onSelect} />
      ))}
      {groups.filter((g) => enabled.includes(g.id)).map((g) => (
        <DetailGroupMesh key={`${manifest.body}:${g.id}`} group={g} structures={manifest.structures} onSelect={onSelect} />
      ))}
    </group>
  );
}

function StructureMesh({ structure: s, systemCentroid, onSelect }: { structure: ManifestStructure; systemCentroid: THREE.Vector3; onSelect?: (id: string | null) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl, invalidate } = useThree();
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(() => (s.lods ? null : proceduralGeometry(s)));
  const lodRef = useRef(-1);

  /**
   * Stream the right level of detail for the current camera (Phase G §3, §6).
   *
   * This deliberately does not run per frame: the canvas uses `frameloop="demand"` to save
   * battery, so a per-frame hook would never tick on a still scene and nothing would ever
   * load. Instead it runs once on mount — giving a fast coarse first paint — and again
   * whenever the camera settles or the quality setting changes.
   */
  useEffect(() => {
    if (!s.lods?.length) return;
    let cancelled = false;
    const radius = Math.max(s.bounds[3] - s.bounds[0], s.bounds[4] - s.bounds[1], s.bounds[5] - s.bounds[2]) / 2;

    const resolve = (st: EngineState) => {
      const c = st.camera.position;
      const distance = Math.hypot(c[0] - s.centroid[0], c[1] - s.centroid[1], c[2] - s.centroid[2]);
      const want = chooseLod(distance, radius, s.lods!.length, st.lowBandwidth || st.qualityTier === 'low');
      if (want === lodRef.current) return;
      lodRef.current = want;
      loadStructureGeometry(s.lods![want]!.url, gl).then((g) => {
        if (cancelled || lodRef.current !== want) return;
        g.computeBoundsTree();
        setGeometry(g);
        invalidate();
      }).catch(() => { if (lodRef.current === want) lodRef.current = -1; });
    };

    resolve(useEngineStore.getState());
    const unsub = useEngineStore.subscribe((st, prev) => {
      if (st.camera !== prev.camera || st.lowBandwidth !== prev.lowBandwidth || st.qualityTier !== prev.qualityTier) resolve(st);
    });
    return () => { cancelled = true; unsub(); };
  }, [s, gl, invalidate]);

  useEffect(() => { if (geometry && !geometry.boundsTree) geometry.computeBoundsTree(); }, [geometry]);

  const tissue = useMemo(() => tissueFor(s.id, s.systems), [s.id, s.systems]);
  const material = useMemo(() => {
    const color = new THREE.Color(tissue.color);
    // Nudge lightness per structure so adjacent organs of one system are distinguishable
    // without departing from the tissue's real colour.
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    color.setHSL(hsl.h, hsl.s, Math.min(0.92, Math.max(0.08, hsl.l + tissue.shade)));
    const m = new THREE.MeshPhysicalMaterial({
      color,
      roughness: tissue.roughness,
      metalness: 0.0,
      sheen: tissue.sheen,
      sheenColor: new THREE.Color('#ffd8cf'),
      sheenRoughness: 0.75,
      clearcoat: tissue.sheen * 0.35,
      clearcoatRoughness: 0.55,
      flatShading: false,
    });
    return m;
  }, [tissue]);

  // Apply visual state transiently (no React re-render per structure per change).
  useEffect(() => {
    const apply = (st: EngineState) => {
    const m = meshRef.current; if (!m) return;
    const { visible, opacity: rawOpacity } = structureVisibility(st, s.id, s.systems, s.provenance, s.layer ?? CORE_LAYERS[s.id]);
    const opacity = rawOpacity * (tissue.baseOpacity ?? 1);
    m.visible = visible;
    const selected = st.selected.includes(s.id), hovered = st.hoverId === s.id;
    material.opacity = opacity;
    material.transparent = opacity < 1;
    material.depthWrite = opacity >= 0.5;
    // A selection highlight has to survive being looked at by someone who knows what a liver
    // looks like: flooding the mesh with yellow emissive announces the selection and destroys
    // the tissue colour that makes the organ recognisable. Lift it gently instead, and let
    // the raised clearcoat do most of the work.
    material.emissive.set(selected ? '#ffb703' : hovered ? '#66d9ef' : '#000000');
    material.emissiveIntensity = selected ? 0.16 : hovered ? 0.1 : 0;
    material.clearcoat = (tissue.sheen * 0.35) + (selected ? 0.35 : 0);
    material.clippingPlanes = st.clip?.enabled ? [new THREE.Plane(new THREE.Vector3(...st.clip.normal), st.clip.constant)] : [];
    material.clipShadows = false;
    material.needsUpdate = true;
    const c = new THREE.Vector3(...s.centroid);
    const offset = c.clone().sub(systemCentroid).multiplyScalar(st.explode * 1.2);
    m.position.copy(c.add(offset));
    invalidate();
    };
    apply(useEngineStore.getState());
    return useEngineStore.subscribe(apply);
    // `geometry` is a dependency because the mesh does not exist until its level of detail
    // has downloaded. Without it the first pass runs against a null ref, returns early, and
    // the structure renders with default visibility — showing systems the user switched off.
  }, [s, material, systemCentroid, invalidate, tissue, geometry]);

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

/**
 * Frame a structure (FR-E11 double-tap focus).
 *
 * `ghostOthers` matters for anything deep: moving the camera close to a kidney puts it
 * inside the liver and bowel, so the student sees the inside of whatever is in front. Fading
 * the rest to a ghost keeps the target readable while preserving spatial context, which is
 * what isolate-with-context is for.
 */
export function focusOn(s: ManifestStructure, ghostOthers = false) {
  const st = useEngineStore.getState();
  const size = Math.max(s.bounds[3] - s.bounds[0], s.bounds[4] - s.bounds[1], s.bounds[5] - s.bounds[2]);
  const dist = Math.max(0.45, size * 4);
  const dir = new THREE.Vector3(...st.camera.position).sub(new THREE.Vector3(...st.camera.target));
  if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
  dir.normalize();
  const pos = new THREE.Vector3(...s.centroid).add(dir.multiplyScalar(dist));
  st.applyViewState({
    ...st.snapshot(),
    isolated: ghostOthers ? [s.id] : st.isolated,
    camera: { position: [pos.x, pos.y, pos.z], target: s.centroid },
  });
}
