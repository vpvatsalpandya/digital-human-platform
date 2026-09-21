# Digital Human Learning Platform (codename Vesalia)

Mobile-first medical education platform: a 3D digital human with cited, faculty-reviewed
knowledge, real physiology simulations, a virtual microscope, an embryology timeline,
pathology comparison, radiology synchronised with the atlas, six assessment modes, a
retrieval-only AI tutor, and multi-tenant white-label SaaS plumbing.

This repository is the platform. It was developed briefly inside another project and was
split out with `git subtree split`, so the commit history below predates this repository.

## Planning documents (Phases A–J)

All planning output is under [`docs/`](docs/00-index.md): executive vision, PRD, market and
competitor analysis, **licensing audit** (which sources are commercially usable and which are
excluded), personas, journeys, revenue and SaaS models, white-label strategy, go-to-market,
educational architecture, technical architecture, database schema, knowledge schema, UX
specification, rendering architecture, roadmap, sprint plan, code-generation strategy, and
architecture decision records. Implementation started only after those were written.

## Quick start

```bash
npm install
cp .env.example .env         # DATABASE_URL optional for the demo; ANTHROPIC_API_KEY optional
npm run dev                   # http://localhost:3000
```

Second white-labelled tenant for local testing: open `http://nursing.localhost:3000`.

Verification commands (all green at the time of writing):

```bash
npm run typecheck && npm run lint && npm test && npm run build
npm run manifest:validate     # blocks NonCommercial / NoDerivatives asset packs
npx prisma validate           # DATABASE_URL must be set (any value)
```

## What is real and what is scaffolded (Sprint 0 of Phase I)

| Area | Real now | Scaffolded / next sprint |
|---|---|---|
| Digital Human Engine (`src/engine`, `src/store/engine.ts`) | R3F viewer; male/female bodies; 14 system toggles; search (name/alias/Latin/FMA, fuzzy); select, multi-select, isolate, isolate-with-region, hide, fade, explode, global transparency, axial/coronal/sagittal clipping, saved views, bookmarks, deep links, accessible list view; BVH picking; adaptive DPR and demand-driven frameloop; **streams real anatomical meshes** with level of detail chosen by camera distance | 43 of 57 male structures (43 of 59 female) are real anatomy; the rest are generated stand-ins, hidden by default and labelled. Compare mode UI is not wired yet. |
| Knowledge Engine (`src/knowledge`) | Zod schema for the 20 fields with per-field citations and audience-mode overrides; publishability rule (non-empty ⇒ cited) enforced in Zod and in a DB trigger; review state machine; 6 seed records (10 structure ids) citing OpenStax A&P 2e and standard textbooks | Seed records are `in_review`, not published. Authoring UI with source picker (Sprint 2). |
| Physiology (`src/simulations`) | Time-varying elastance LV + Windkessel cardiac model (RK4), Hodgkin–Huxley action potential, alveolar gas equation; unit tests assert textbook ranges | Nephron, synaptic transmission, endocrine axes (Sprint 6). |
| Histology (`src/modules/histology`) | Deep-zoom tile viewer with pyramid levels, pinch/wheel zoom, pan, minimap, scale bar, annotation layers, guided/self/assessment modes; DZI tile source | Slides are procedural schematics; partner whole-slide images (Sprint 5). |
| Embryology (`src/modules/embryology`) | Week-by-week and Carnegie-stage timeline with cited events, anomaly branches, lineage links into the atlas | Stage models are commissioned assets (open sets are NonCommercial). |
| Pathology (`src/modules/pathology`) | Swipe and side-by-side comparator with three pairs | Images are schematic; specimen photos and lesion meshes from partners. |
| Radiology (`src/modules/radiology`) | Label volume rasterised from the body manifest; axial/coronal/sagittal slices; window/level; mask overlays; click-to-select in 3D and 3D-to-slice jump; identify mode | Volume is a synthetic phantom; TotalSegmentator/Visible Human cases (Sprint 5). |
| Assessment (`src/modules/assessment`) | Spotter (3D station, timer, synonym- and laterality-aware scoring), quiz (MCQ, multi-select, short answer), item analysis, BKT mastery, spaced-repetition intervals; item bank seed | Viva, OSPE, OSCE runners and examiner app; persistence (Sprint 4). |
| AI Tutor (`src/modules/tutor`) | BM25 retrieval over record chunks per audience mode; refusal below threshold; Claude call with citation validator; extracts-only fallback with no key | pgvector hybrid retrieval, per-seat quotas, conversation logging (Sprint 7). |
| Faculty portal | Lesson builder with "capture atlas view", assessment builder from the bank, review queue enforcing citations, example item analysis | Persistence and cohorts (Sprint 3–4). |
| Dashboards | Student page from the event queue; admin page with entitlements and branding | Server roll-ups (Sprint 7). |
| Tenancy | Host-based tenant resolution, CSS-variable theming, plan/entitlement engine with SNOMED country gating, Prisma schema with RLS migration SQL | Auth.js, SSO, LTI, billing (Sprint 3, 11). |
| Infra | Dockerfile (standalone), docker-compose, Kubernetes manifests (web, worker, HPA, PDB, ingress), Vercel config, CI workflow | Worker process, asset CDN upload. |

## Verified

`npm run typecheck`, `npm run lint`, `npm test` (85 tests) and `npm run build` pass. The built
app was driven in headless Chromium at a 390x844 mobile viewport: the 3D canvas renders, the
the atlas streams its mesh files with every request returning 200, search
selects and frames a structure and opens its cited record, and every route returns 200 with
no console or hydration errors. Tenant resolution was checked by requesting the same build with a
second `Host` header and getting the second tenant's brand back.

Known gaps, tracked in the roadmap:

- **CDN upload, KTX2 textures and a physical device-lab baseline** are the parts of Sprint 1
  still outstanding. Nothing is textured yet, so KTX2 has nothing to compress.
- **Shapes are still stand-ins.** The baked pack is real GLB geometry streamed over real
  level-of-detail selection, but it is baked from the procedural body. Real anatomy arrives by
  pointing the pipeline at a Z-Anatomy or Human Reference Atlas export.
- **Compare mode** (two systems or states side by side) is specified but not wired.

The atlas bundle is no longer listed as a gap because the target was wrong rather than the
code: three.js is ~230 kB gzipped and the React reconciler ~110 kB, so no route that renders
the digital human can fit the original 250 kB budget. Moving the Draco, KTX2 and meshopt
decoders off the critical path took the atlas from 464 kB to 407 kB; the budget is now split
per route type with the reasoning recorded in the PRD, and non-3D routes sit at 103–129 kB.

## Where the anatomy comes from

Two openly licensed sources, both cleared for commercial use by the licensing audit, carried
into one body space.

**HuBMAP Human Reference Atlas** (CC BY 4.0), with brain regions from the Allen Human
Reference Atlas: the viscera, brain, skin, pelvis, femur, tibia and great vessels — 21
structures. The library models these in one coordinate space in metres, so organs from
separate files line up without per-organ fitting.

**BodyParts3D** (© The Database Center for Life Science, CC BY-SA 2.1 Japan): everything the
reference atlas does not model — skull, rib cage, vertebral column, arm bones, the skeletal
muscles, stomach and adrenal glands — 22 structures. Its meshes come from a different subject
in millimetres and Z-up, so they are carried across by a transform whose axis mapping was
fitted by least squares over nine organs present in both sources, with scale and offset
derived per body from that body's own skin envelope. Organ centroids agree to about 39 mm
root-mean-square, which is the genuine difference between two human beings rather than an
error in the fit.

That is 43 of 57 structures in the male body, 43 of 59 in the female, drawn from real
anatomical data. The remaining 14 keep generated stand-ins, hidden by default and labelled in
the interface:

| Stand-in | Why |
|---|---|
| Both lungs | Neither source models lung parenchyma. BodyParts3D files a lung as its airway and vessel trees — a "bronchopulmonary segment" there is that segment's bronchus and vessels, not a wedge of tissue — and the reference atlas models only the airway. A branching tree labelled "right lung" would teach the wrong thing. |
| Spinal cord | BodyParts3D's spinal cord concept is a single four-centimetre fragment at neck level. |
| Thyroid gland, median and sciatic nerves, rectus abdominis, thoracolumbar fascia, patellar ligaments | Not modelled by either source. |
| Jugular notch, umbilicus | Surface landmarks, which are markers rather than meshes. |

### Checked, not assumed

`tests/anatomy.test.ts` asserts what a demonstrator would check, on every build:

- Body height is between 1.5 and 2.0 m, and **no structure escapes the skin envelope** — the
  check that caught the BodyParts3D skull standing 4.7 cm proud of the scalp.
- Every organ measures inside adult reference ranges: liver 15–30 cm, heart 9–17 cm, kidney
  9–14 cm, femur 38–52 cm, skull 17–26 cm.
- Every organ sits at the right level, as a fraction of body height: heart 68–80%, liver
  60–73%, bladder 44–54%.
- The liver is right of the midline and the spleen left of it.
- Paired structures are mirrored and level with each other.

## Asset pipeline

`npm run assets:build` turns source geometry into a deployable pack:

```
source geometry -> weld/dedupe/prune -> 3 levels of detail (100% / 35% / 12%)
 -> quantise + meshopt compression -> one GLB per structure per level
 -> one LOD2 bundle per system -> a manifest with licence, attribution,
    byte counts, triangle counts and content hashes
```

The committed `hra-v1` pack is 9.4 MB for both bodies: 638,516 triangles at full detail
falling to about 8,000 per organ and then 2,400, with the largest per-system first-paint
bundle well inside the 8 MB budget. The engine picks a level from the camera distance, so a
phone downloads coarse meshes first and refines only what is looked at.

Real organs are decimated to absolute triangle budgets rather than proportional ratios,
because the library ships some organs at 300,000 triangles and others at 3,000, and a ratio
would leave the first unusable and destroy the second.

Three source kinds are supported. `--source hra --in <dir>` reads the reference atlas files
and is what the committed pack was built with. `--source procedural` bakes the development
body. `--source gltf-dir --in <dir>` reads `<structureId>.glb` plus a `<body>.structures.json`
sidecar, which is how a Z-Anatomy export enters:

```bash
npx tsx scripts/assets/build.ts --source gltf-dir --in ../exports/z-anatomy \
  --pack z-anatomy-male --licence CC-BY-SA-4.0 \
  --attribution "Z-Anatomy, CC BY-SA 4.0, derived from BodyParts3D (DBCLS), CC BY-SA 2.1 JP"
```

The manifest schema rejects any licence that is not on the commercially usable list, so a
NonCommercial pack cannot be baked, let alone shipped. The atlas shows the pack name and
licence on screen, and says "procedural stand-ins" when no pack is loaded.

## Content policy in code

- `src/knowledge/schema.ts` refuses to approve or publish any record with an uncited
  non-empty field; `prisma/migrations/0001_init_rls/README.md` carries the same rule as a
  Postgres trigger.
- `scripts/validate-manifests.ts` fails CI if an asset pack declares a NonCommercial or
  NoDerivatives licence.
- `src/modules/tutor/service.ts` only answers from retrieved chunks and validates every
  citation marker; uncited model output never reaches a learner.
- Placeholder imagery (procedural meshes, schematic slides, synthetic phantom) is labelled as
  such in the UI.

## Layout

See `docs/phase-c/technical-architecture.md` §2. Routes in `src/app` compose modules in
`src/modules`; modules depend on `src/engine`, `src/knowledge`, `src/simulations`, `src/lib`;
never the reverse.
