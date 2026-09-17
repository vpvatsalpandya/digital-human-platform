# Phase G · Rendering Architecture

## 1. Targets

| Tier | Example devices | Budget |
|---|---|---|
| Mobile-low | Snapdragon 6xx / Helio G8x, 4 GB RAM, Adreno 610 | ≤ 300k triangles on screen, ≤ 150 draw calls, DPR ≤ 1.5, 30 fps, GPU memory ≤ 200 MB |
| Mobile-mid/high | Snapdragon 7/8, Apple A13+ | ≤ 1.2M tris, ≤ 400 draw calls, DPR ≤ 2, 60 fps |
| Desktop | Integrated GPU laptop | ≤ 3M tris, ≤ 800 draw calls |

Budgets are enforced at runtime by a quality governor (§7), not by hoping.

## 2. Asset format and pipeline (ADR-007)

```
source (Blender .blend / OBJ / GLB from HRA, Open Anatomy NRRD→mesh)
  → glTF 2.0 export (Y-up, metres, one node per structure, name = structureId)
  → gltf-transform: dedup, weld, prune, quantize
  → LOD generation: meshopt simplify to 100% (LOD0), 35% (LOD1), 12% (LOD2), error-bounded
  → meshopt compression (EXT_meshopt_compression) + Draco fallback for LOD0 where smaller
  → textures: KTX2 (UASTC for normals, ETC1S for albedo), 1024 max on mobile packs
  → split: one GLB per structure per LOD; system-level packed GLB for LOD2 ("pack")
  → manifest.json: { structureId, fmaId, system, bounds, centroid, lods: [{url, bytes, tris}] }
  → immutable hashed paths on CDN, `Cache-Control: immutable`
```

Why per-structure files: mobile memory and partial loading; a learner viewing the forearm
should not download the pelvis. Why system packs for LOD2: request count on initial load
(≤ 20 requests to first render). Alternative considered: a single monolithic GLB per body
(~150 MB) — impossible on the low tier.

## 3. Scene graph and loading

- `BodyRoot` → `SystemGroup` (14) → `StructureMesh` (one `Mesh` per structure; merged
  sub-meshes at export).
- Loader: priority queue keyed by (visible system, distance to camera, LOD needed); concurrent
  fetch limit 6; `GLTFLoader` with `MeshoptDecoder`, `DRACOLoader` (WASM, lazy), `KTX2Loader`.
- Progressive: LOD2 pack for requested systems → visible structures upgrade to LOD1 → LOD0
  only when a structure is selected/focused or on desktop.
- Memory governor: dispose LOD0 geometries of structures not visible for 60 s; cap GPU
  memory by estimating buffer sizes.

## 4. Materials and visual states

- Standard PBR (MeshStandardMaterial) with per-system base colours; textures only on skin
  and select organs in v1.
- Visual states are per-mesh uniforms, not material clones: `uOpacity`, `uHighlight`,
  `uFade`, `uSelected`; implemented via `onBeforeCompile` (WebGL) and TSL nodes (WebGPU)
  from one source of truth in `engine/materials`.
- Transparency ordering: faded structures render in a second pass with depth write off and
  `renderOrder`; selection outline via a post-process only on desktop; on mobile, emissive
  rim highlight (no post-processing).
- Clipping: renderer `localClippingEnabled`; per-mesh `clippingPlanes`; capped section faces
  via stencil pass (desktop) or simple back-face colour (mobile).

## 5. Interaction

- Picking: `three-mesh-bvh` accelerated raycast on the visible set; GPU picking (ID buffer)
  used when > 500 visible meshes for constant-time selection.
- Camera: orbit controls with damping, touch gestures, focus-on-structure with bounds fit,
  saved camera states; auto-rotate off by default (battery).
- Explode: per-structure offset = k · (centroid − systemCentroid), animated with a spring;
  regional explode uses region centroids.
- Compare: split-screen dual scenes sharing geometry, or overlay with independent visibility
  sets; both use one renderer with scissor regions.

## 6. Level of detail (runtime)

Screen-space error metric: choose LOD such that projected geometric error < 1.5 px at
current DPR; hysteresis to avoid popping; force LOD2 in low-bandwidth or battery-saver mode.

## 7. Quality governor

Sampling frame times (drei `PerformanceMonitor` pattern): if p90 frame time > 33 ms for 2 s →
step down (DPR 2 → 1.5 → 1.25 → 1; shadows off; MSAA off; LOD bias +1; fade pass off). Step
up after 10 s of headroom. Persist the chosen tier per device in localStorage.

## 8. Mobile-specific measures

- `powerPreference: 'high-performance'` on desktop, `'default'` on mobile; `antialias` only
  when DPR ≤ 1.5; `preserveDrawingBuffer` off; frameloop `demand` when idle (render on
  interaction only) — halves battery use in study sessions.
- Texture memory: KTX2 GPU-compressed formats (ETC2/ASTC) decoded by Basis transcoder;
  no PNG/JPEG textures at runtime.
- WebGL context loss handling: rebuild scene from store state.
- No shadows on low tier; a baked ambient occlusion vertex channel replaces SSAO.

## 9. Device verification matrix
Redmi Note-class (Adreno 610), Samsung A-series (Mali-G52), Pixel 6a, iPhone SE 2/3,
iPhone 13, iPad 9th gen, Chromebook, Windows laptop with Intel Iris Xe, MacBook Air M1.
CI runs Playwright + WebGL software render for smoke; device lab weekly for budgets.

## 10. WebGPU migration strategy (ADR-011)

1. Materials authored as TSL node materials for the states in §4 so they compile on both
   renderers.
2. `engine/renderer.ts` selects `WebGPURenderer` when `navigator.gpu` is present, the device
   is not on a denylist, and the tenant/user flag is on; falls back to WebGL 2.
3. Rollout: desktop Chrome first → Android Chrome → Safari when stable; metrics compare frame
   times per cohort; promote when p90 frame time improves and error rate is equal.
4. Compute-shader wins to pursue after migration: GPU skinning for animated physiology,
   GPU-based LOD selection, volume rendering for radiology.

## 11. Radiology and histology rendering

- Slices: pre-tiled PNG/WebP pyramids per plane (axial/coronal/sagittal) generated from
  NIfTI/DICOM by the worker; masks as indexed PNG overlays coloured on the client.
- 3D↔slice synchronisation: structure centroid in volume space → slice index; the mask ID
  ↔ structureId table from segmentation labels.
- Volume rendering (ray-marched) is desktop/WebGPU-only, later.
- Histology: DZI/IIIF tile pyramids (256 px tiles, WebP), viewer with tile cache and
  pinch-zoom; annotations as normalised-coordinate polygons.

## 12. Compression and CDN
Brotli for JSON/manifests; GLB already compressed; `immutable` cache; HTTP/3; regional CDN
PoPs (India: Mumbai/Chennai); manifest versioning to prefetch upgrades.

## 13. Alternatives considered
- Babylon.js: comparable; R3F ecosystem and team familiarity decided.
- Server-side/pixel streaming: latency and cost; no offline.
- Nanite-style virtualised geometry in web: research-grade; revisit on WebGPU.

## 14. Risks
- Draco/KTX2 WASM decode time on slow CPUs — mitigated with meshopt (fast decode) as
  primary and worker-thread decoding.
- iOS Safari memory limits (~1–1.5 GB) — governor caps at 400 MB total.
- Context loss on Android when backgrounded — state restore path tested in CI.
